/**
 * FormPreEvaluator — 表单预求值器
 *
 * 表单渲染前扫描所有子组件的 expression bindings，
 * 按依赖拓扑序批量求值，结果写入 BindingCache。
 * 子组件的 useBindings 命中缓存直接复用，避免重复计算。
 */

import type { ComponentNode } from '@low-code/shared';
import type { DefaultExpressionEngine } from '@low-code/shared';
import { extractDependencies } from './DependencyGraph';
import { bindingCache } from './BindingCache';
import { isExpressionBinding } from '../hooks/useExpressionValue';

/** 预求值结果 */
export interface FormPreEvaluateResult {
  /** 预求值的字段值（组件 ID → initialValue 求值结果） */
  fieldValues: Record<string, any>;
}

/** 待求值的表达式条目 */
interface PendingExpression {
  componentId: string;
  propKey: string;
  value: string;
  async: boolean;
  deps: string[];
}

/**
 * 递归收集表单内所有后代组件
 */
function collectDescendants(
  formId: string,
  componentMap: Map<string, ComponentNode>,
): ComponentNode[] {
  const result: ComponentNode[] = [];
  const formNode = componentMap.get(formId);
  if (!formNode?.children) return result;

  const traverse = (ids: string[]) => {
    for (const id of ids) {
      const node = componentMap.get(id);
      if (!node) continue;
      result.push(node);
      if (node.children) {
        traverse(node.children);
      }
    }
  };

  traverse(formNode.children);
  return result;
}

/**
 * 从组件 props 中提取所有 expression bindings
 */
function extractExpressionBindings(
  componentId: string,
  props: Record<string, any>,
): PendingExpression[] {
  const result: PendingExpression[] = [];

  for (const [key, value] of Object.entries(props)) {
    if (isExpressionBinding(value)) {
      result.push({
        componentId,
        propKey: key,
        value: value.value,
        async: value.async !== false,
        deps: extractDependencies(value.value),
      });
    }
  }

  return result;
}

/**
 * 简单拓扑排序：按依赖层数分组，返回二维数组（每层可并行求值）
 *
 * 对于表单内的表达式，依赖关系通常是：
 * - 依赖外部变量（$route、$user 等）→ 可以立即求值（第 0 层）
 * - 依赖其他组件的值（$component.xxx.value）→ 需要等依赖组件的表达式先求值（第 1 层）
 *
 * 同层内的表达式互不依赖，可并行求值。
 */
function topologicalSort(expressions: PendingExpression[]): PendingExpression[][] {
  // 无 $component 依赖的先求值，有 $component 依赖的后求值
  const noInternalDep: PendingExpression[] = [];
  const hasInternalDep: PendingExpression[] = [];

  for (const expr of expressions) {
    const hasComponentDep = expr.deps.some((dep) => dep.startsWith('$component.'));
    if (hasComponentDep) {
      hasInternalDep.push(expr);
    } else {
      noInternalDep.push(expr);
    }
  }

  const layers: PendingExpression[][] = [];
  if (noInternalDep.length > 0) layers.push(noInternalDep);
  if (hasInternalDep.length > 0) layers.push(hasInternalDep);
  return layers;
}

/**
 * 表单预求值器
 *
 * 扫描表单内所有子组件的 expression bindings，
 * 按依赖拓扑序批量求值，结果写入 BindingCache。
 */
export async function preEvaluateForm(
  formId: string,
  componentMap: Map<string, ComponentNode>,
  context: Record<string, any>,
  expressionEngine: DefaultExpressionEngine,
): Promise<FormPreEvaluateResult> {
  // 1. 收集所有后代组件
  const descendants = collectDescendants(formId, componentMap);

  // 2. 提取所有 expression bindings
  const allExpressions: PendingExpression[] = [];
  for (const node of descendants) {
    const bindings = extractExpressionBindings(node.id, node.props);
    allExpressions.push(...bindings);
  }

  if (allExpressions.length === 0) {
    return { fieldValues: {} };
  }

  // 3. 拓扑排序（分层，同层可并行）
  const layers = topologicalSort(allExpressions);

  // 4. 按层求值（同层内并行）
  const results: Array<{ componentId: string; propKey: string; value: any }> = [];

  for (const layer of layers) {
    const layerResults = await Promise.all(
      layer.map(async (expr) => {
        try {
          let result: any;

          if (expr.async) {
            result = await expressionEngine.evaluateAsync(
              { type: 'expression', value: expr.value, async: true },
              context,
            );
          } else {
            result = await expressionEngine.safeEvaluate(expr.value, context);
          }

          return {
            componentId: expr.componentId,
            propKey: expr.propKey,
            value: result,
          };
        } catch (e) {
          console.warn(
            `[FormPreEvaluator] ${expr.componentId}.${expr.propKey} 求值失败: ${e}`,
          );
          return null;
        }
      }),
    );

    for (const r of layerResults) {
      if (r) results.push(r);
    }
  }

  // 5. 批量写入缓存
  bindingCache.setAll(results);

  // 6. 收集 initialValue 结果用于 form.setFieldsValue
  const fieldValues: Record<string, any> = {};
  for (const { componentId, propKey, value } of results) {
    if (propKey === 'initialValue') {
      fieldValues[componentId] = value;
    }
  }

  return { fieldValues };
}
