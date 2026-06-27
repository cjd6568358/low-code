/**
 * FormPreEvaluator — 表单预求值器
 *
 * 表单渲染前扫描所有子组件的 expression bindings，
 * 按依赖拓扑序批量求值，结果写入 BindingCache。
 * 子组件的 useBindings 命中缓存直接复用，避免重复计算。
 */

import type { ComponentNode } from '@low-code/shared';
import type { DefaultExpressionEngine } from '@low-code/computation';
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
 * 简单拓扑排序：按依赖层数分组，无依赖的先求值
 *
 * 对于表单内的表达式，依赖关系通常是：
 * - 依赖外部变量（$route、$user 等）→ 可以立即求值
 * - 依赖其他组件的值（$component.xxx.value）→ 需要等依赖组件的表达式先求值
 *
 * 这里用简单的 BFS 分层：先求值无内部依赖的，再求值依赖已求值结果的。
 */
function topologicalSort(expressions: PendingExpression[]): PendingExpression[] {
  // 构建 componentId → 已求值的 propKey 集合
  // 初始时，所有字面量和变量引用的 prop 视为"已就绪"
  // 这里简化处理：只对 expression bindings 排序
  // 依赖外部变量（$route、$user 等）的表达式可以立即求值
  // 依赖 $component.xxx 的表达式需要等对应组件的表达式先求值

  // 提取所有 expression 的 componentId
  const expressionComponentIds = new Set(expressions.map((e) => e.componentId));

  // 分层：无 $component 依赖的先求值，有 $component 依赖的后求值
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

  return [...noInternalDep, ...hasInternalDep];
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

  // 3. 拓扑排序
  const sorted = topologicalSort(allExpressions);

  // 4. 依次求值
  const results: Array<{ componentId: string; propKey: string; value: any }> = [];

  for (const expr of sorted) {
    try {
      let result: any;

      if (expr.async) {
        // 异步表达式：await evaluateAsync
        result = await expressionEngine.evaluateAsync(
          { type: 'expression', value: expr.value, async: true },
          context,
        );
      } else {
        // 同步表达式：safeEvaluate
        result = expressionEngine.safeEvaluate(expr.value, context);
      }

      results.push({
        componentId: expr.componentId,
        propKey: expr.propKey,
        value: result,
      });
    } catch (e) {
      console.warn(
        `[FormPreEvaluator] ${expr.componentId}.${expr.propKey} 求值失败: ${e}`,
      );
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
