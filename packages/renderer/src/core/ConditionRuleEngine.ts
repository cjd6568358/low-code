import type { PageRule, RenderContext } from '@low-code/shared';
import type { DefaultExpressionEngine } from '@low-code/computation';

/** 条件规则求值结果 */
export interface RuleEvaluationResult {
  /** 组件可见性 */
  visible: boolean;
  /** 组件禁用状态 */
  disabled: boolean;
  /** 需要设置的值 */
  setValues: Record<string, any>;
  /** 需要设置的属性 */
  setProps: Record<string, Record<string, any>>;
}

/**
 * 条件规则引擎
 * 处理页面级 rules 和组件级 visible 的条件求值
 */
export class ConditionRuleEngine {
  private sortedRules: PageRule[] = [];

  constructor(private expressionEngine: DefaultExpressionEngine) {}

  /**
   * 初始化并排序规则
   */
  init(rules: PageRule[]): void {
    this.sortedRules = [...rules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  }

  /**
   * 评估某个组件的所有规则
   */
  evaluateComponent(
    componentId: string,
    componentVisible: boolean | string | undefined,
    context: RenderContext,
  ): RuleEvaluationResult {
    const result: RuleEvaluationResult = {
      visible: true,
      disabled: false,
      setValues: {},
      setProps: {},
    };

    // 1. 先处理组件级 visible
    if (componentVisible === false) {
      result.visible = false;
    } else if (typeof componentVisible === 'string') {
      result.visible = !!this.expressionEngine.safeEvaluate(componentVisible, context);
    }

    // 2. 再处理页面级规则
    const componentRules = this.sortedRules.filter((r) => r.targetId === componentId);
    for (const rule of componentRules) {
      const conditionMet = !!this.expressionEngine.safeEvaluate(rule.condition, context);

      switch (rule.action) {
        case 'visible':
          if (conditionMet) result.visible = true;
          break;
        case 'hidden':
          if (conditionMet) result.visible = false;
          break;
        case 'enabled':
          if (conditionMet) result.disabled = false;
          break;
        case 'disabled':
          if (conditionMet) result.disabled = true;
          break;
        case 'setValue':
          if (conditionMet && rule.value !== undefined) {
            result.setValues[componentId] = rule.value;
          }
          break;
        case 'setProp':
          if (conditionMet && rule.value !== undefined) {
            if (!result.setProps[componentId]) {
              result.setProps[componentId] = {};
            }
            Object.assign(result.setProps[componentId], rule.value);
          }
          break;
      }
    }

    return result;
  }

  /**
   * 批量评估所有组件的规则
   */
  evaluateAll(
    componentIds: string[],
    componentVisibleMap: Map<string, boolean | string | undefined>,
    context: RenderContext,
  ): Map<string, RuleEvaluationResult> {
    const results = new Map<string, RuleEvaluationResult>();
    for (const id of componentIds) {
      results.set(
        id,
        this.evaluateComponent(
          id,
          componentVisibleMap.get(id),
          context,
        ),
      );
    }
    return results;
  }

}
