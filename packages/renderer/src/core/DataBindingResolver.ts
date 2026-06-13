import { get, isValidPath } from '@low-code/shared';
import type { RenderContext } from '@low-code/shared';
import type { DefaultExpressionEngine } from '@low-code/computation';

/** 值绑定类型 */
export type BindingType = 'static' | 'variable' | 'expression';

/**
 * 数据绑定解析器
 * 解析组件 props 中的三种值形式：静态值、变量引用、表达式
 */
export class DataBindingResolver {
  constructor(private expressionEngine: DefaultExpressionEngine) {}

  /**
   * 解析单个值
   */
  resolveValue(value: any, context: RenderContext): any {
    const { type, raw } = this.detectBindingType(value);

    switch (type) {
      case 'variable':
        return this.resolveVariable(raw, context);
      case 'expression':
        return this.expressionEngine.safeEvaluate(raw, context);
      case 'static':
      default:
        return value;
    }
  }

  /**
   * 批量解析组件 props
   */
  resolveProps(
    props: Record<string, any>,
    context: RenderContext,
  ): Record<string, any> {
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(props)) {
      resolved[key] = this.resolveValue(value, context);
    }
    return resolved;
  }

  /**
   * 检测值的绑定类型
   */
  detectBindingType(value: any): { type: BindingType; raw: string } {
    // 1. 对象格式 { value, __binding }
    if (
      value != null &&
      typeof value === 'object' &&
      '__binding' in value
    ) {
      const binding = value as { value: string; __binding: string };
      if (binding.__binding === 'variable') {
        return { type: 'variable', raw: binding.value };
      }
      if (binding.__binding === 'expression') {
        return { type: 'expression', raw: binding.value };
      }
      return { type: 'static', raw: binding.value };
    }

    // 2. 字符串快捷检测
    if (typeof value === 'string') {
      // 以 $ 开头（非 ${} 模板）→ 变量引用
      if (value.startsWith('$') && !value.startsWith('${')) {
        return { type: 'variable', raw: value };
      }
      // 包含 ${} → 表达式/模板
      if (value.includes('${')) {
        return { type: 'expression', raw: value };
      }
    }

    // 3. 其他 → 静态值
    return { type: 'static', raw: String(value ?? '') };
  }

  /**
   * 从上下文中按路径解析变量
   */
  private resolveVariable(path: string, context: RenderContext): any {
    if (!isValidPath(path)) return undefined;

    // 去掉开头的 $
    const cleanPath = path.startsWith('$') ? path : `$${path}`;
    const segments = cleanPath.split('.');

    if (segments.length < 2) return undefined;

    const rootKey = segments[0]; // $context, $form, $api, $components
    const restPath = segments.slice(1).join('.');

    // 根据根键从 context 中取值
    const root = (context as any)[rootKey];
    if (root == null) return undefined;

    return get(root, restPath);
  }
}
