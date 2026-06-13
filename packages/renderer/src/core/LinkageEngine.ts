import type {
  LinkageRule,
  ConditionalBranch,
  ValueRule,
  OptionsRule,
  VisibleRule,
  DisabledRule,
  RequiredRule,
  AttributeRule,
} from '@low-code/shared';
import type { DefaultExpressionEngine } from '@low-code/computation';

/** 联动执行结果 */
export interface LinkageResult {
  /** 字段值变更 */
  valueUpdates: Record<string, any>;
  /** 字段状态变更（visible/disabled/required） */
  stateUpdates: Record<string, {
    visible?: boolean;
    disabled?: boolean;
    required?: boolean;
  }>;
  /** 字段选项变更 */
  optionsUpdates: Record<string, Array<{ label: string; value: any }>>;
  /** 字段属性变更 */
  attributeUpdates: Record<string, Record<string, any>>;
}

/**
 * DAG 联动引擎
 * 基于有向无环图的字段联动执行引擎
 * 支持文档定义的六种联动类型：value/options/visible/disabled/required/attribute
 */
export class LinkageEngine {
  private triggerIndex = new Map<string, LinkageRule[]>();
  private dependencyIndex = new Map<string, LinkageRule[]>();
  private executionOrder: string[] = [];
  private rules: LinkageRule[] = [];
  private pendingResult: LinkageResult = this.createEmptyResult();
  private updateScheduled = false;
  private onUpdate: ((result: LinkageResult) => void) | null = null;
  private apiRequest: ((config: any) => Promise<any>) | null = null;

  constructor(private expressionEngine: DefaultExpressionEngine) {}

  /**
   * 设置更新回调
   */
  setUpdateCallback(callback: (result: LinkageResult) => void): void {
    this.onUpdate = callback;
  }

  /**
   * 设置 API 请求函数（用于 query 联动）
   */
  setApiRequest(fn: (config: any) => Promise<any>): void {
    this.apiRequest = fn;
  }

  /**
   * 初始化联动规则
   */
  init(rules: LinkageRule[]): void {
    this.rules = rules;
    this.triggerIndex.clear();
    this.dependencyIndex.clear();

    for (const rule of rules) {
      const trigger = rule.triggerField;
      if (!this.triggerIndex.has(trigger)) {
        this.triggerIndex.set(trigger, []);
      }
      this.triggerIndex.get(trigger)!.push(rule);

      const target = rule.targetField;
      if (!this.dependencyIndex.has(target)) {
        this.dependencyIndex.set(target, []);
      }
      this.dependencyIndex.get(target)!.push(rule);
    }

    this.executionOrder = this.topologicalSort(rules);
  }

  /**
   * 获取受某个字段影响的所有字段
   */
  getAffectedFields(field: string): string[] {
    const rules = this.triggerIndex.get(field);
    if (!rules) return [];
    return [...new Set(rules.map((r) => r.targetField))];
  }

  /**
   * 字段值变更时触发联动（同步）
   */
  onFieldChange(
    fieldName: string,
    value: any,
    values: Record<string, any>,
    options?: { silent?: boolean },
  ): LinkageResult {
    const result = this.createEmptyResult();
    const rules = this.triggerIndex.get(fieldName);
    if (!rules || rules.length === 0) return result;

    const affectedFields = new Set<string>();
    this.collectAffectedFields(fieldName, affectedFields);
    const orderedAffected = this.executionOrder.filter((f) => affectedFields.has(f));

    for (const targetField of orderedAffected) {
      const targetRules = this.dependencyIndex.get(targetField);
      if (!targetRules) continue;

      for (const rule of targetRules) {
        if (affectedFields.has(rule.triggerField) || rule.triggerField === fieldName) {
          this.executeRule(rule, values, result);
        }
      }
    }

    if (!options?.silent) {
      this.onUpdate?.(result);
    }

    return result;
  }

  /**
   * 字段值变更时触发联动（含异步 query 联动）
   */
  async onFieldChangeAsync(
    fieldName: string,
    value: any,
    values: Record<string, any>,
  ): Promise<LinkageResult> {
    const result = await this.executeRulesForField(fieldName, values);
    this.onUpdate?.(result);
    return result;
  }

  /**
   * 初始化联动（页面加载时执行所有联动规则）
   */
  initLinkage(values: Record<string, any>): LinkageResult {
    const result = this.createEmptyResult();

    for (const field of this.executionOrder) {
      const rules = this.dependencyIndex.get(field);
      if (!rules) continue;

      for (const rule of rules) {
        this.executeRule(rule, values, result);
      }
    }

    // 将值更新写入 values
    for (const [field, val] of Object.entries(result.valueUpdates)) {
      values[field] = val;
    }

    return result;
  }

  /**
   * 执行单条联动规则，结果写入 result
   */
  private executeRule(
    rule: LinkageRule,
    values: Record<string, any>,
    result: LinkageResult,
  ): void {
    const triggerValue = values[rule.triggerField];

    switch (rule.type) {
      case 'value':
        this.executeValueRule(rule.rule as ValueRule, triggerValue, values, rule.targetField, result);
        break;
      case 'options':
        this.executeOptionsRule(rule.rule as OptionsRule, triggerValue, values, rule.targetField, result);
        break;
      case 'visible':
        this.executeVisibleRule(rule.rule as VisibleRule, values, rule.targetField, result);
        break;
      case 'disabled':
        this.executeDisabledRule(rule.rule as DisabledRule, values, rule.targetField, result);
        break;
      case 'required':
        this.executeRequiredRule(rule.rule as RequiredRule, values, rule.targetField, result);
        break;
      case 'attribute':
        this.executeAttributeRule(rule.rule as AttributeRule, values, rule.targetField, result);
        break;
    }
  }

  /**
   * 执行值联动规则
   */
  private executeValueRule(
    rule: ValueRule,
    triggerValue: any,
    values: Record<string, any>,
    targetField: string,
    result: LinkageResult,
  ): void {
    let value: any;

    switch (rule.mode) {
      case 'map':
        value = rule.map?.[triggerValue];
        break;

      case 'expression':
        if (!rule.expression) return;
        value = this.expressionEngine.safeEvaluate(rule.expression, values);
        break;

      case 'conditional':
        value = this.evaluateConditionalBranches(rule.branches, rule.default, values);
        break;

      case 'query':
        // query 模式需要异步，同步模式下跳过
        return;

      default:
        return;
    }

    if (value !== undefined) {
      result.valueUpdates[targetField] = value;
    }
  }

  /**
   * 执行选项联动规则
   */
  private executeOptionsRule(
    rule: OptionsRule,
    triggerValue: any,
    values: Record<string, any>,
    targetField: string,
    result: LinkageResult,
  ): void {
    switch (rule.source) {
      case 'static':
        if (rule.staticOptions) {
          result.optionsUpdates[targetField] = rule.staticOptions;
        }
        break;

      case 'api':
        // API 选项需要异步，同步模式下跳过
        break;

      case 'dependent':
        // 依赖型选项：根据触发字段值过滤/生成选项
        if (rule.staticOptions) {
          result.optionsUpdates[targetField] = rule.staticOptions.filter(
            (opt: any) => opt.dependsOn === undefined || opt.dependsOn === triggerValue,
          );
        }
        break;
    }
  }

  /**
   * 执行显隐联动规则
   */
  private executeVisibleRule(
    rule: VisibleRule,
    values: Record<string, any>,
    targetField: string,
    result: LinkageResult,
  ): void {
    const visible = !!this.expressionEngine.safeEvaluate(rule.condition, values);
    if (!result.stateUpdates[targetField]) {
      result.stateUpdates[targetField] = {};
    }
    result.stateUpdates[targetField].visible = visible;
  }

  /**
   * 执行禁用联动规则
   */
  private executeDisabledRule(
    rule: DisabledRule,
    values: Record<string, any>,
    targetField: string,
    result: LinkageResult,
  ): void {
    const disabled = !!this.expressionEngine.safeEvaluate(rule.condition, values);
    if (!result.stateUpdates[targetField]) {
      result.stateUpdates[targetField] = {};
    }
    result.stateUpdates[targetField].disabled = disabled;
  }

  /**
   * 执行必填联动规则
   */
  private executeRequiredRule(
    rule: RequiredRule,
    values: Record<string, any>,
    targetField: string,
    result: LinkageResult,
  ): void {
    const required = !!this.expressionEngine.safeEvaluate(rule.condition, values);
    if (!result.stateUpdates[targetField]) {
      result.stateUpdates[targetField] = {};
    }
    result.stateUpdates[targetField].required = required;
  }

  /**
   * 执行属性联动规则
   */
  private executeAttributeRule(
    rule: AttributeRule,
    values: Record<string, any>,
    targetField: string,
    result: LinkageResult,
  ): void {
    const conditionMet = !!this.expressionEngine.safeEvaluate(rule.condition, values);
    if (conditionMet) {
      if (!result.attributeUpdates[targetField]) {
        result.attributeUpdates[targetField] = {};
      }
      result.attributeUpdates[targetField][rule.attribute] = rule.value;
    }
  }

  /**
   * 异步执行规则（支持 query 联动）
   */
  private async executeRulesForField(
    fieldName: string,
    values: Record<string, any>,
  ): Promise<LinkageResult> {
    const result = this.createEmptyResult();
    const rules = this.triggerIndex.get(fieldName);
    if (!rules || rules.length === 0) return result;

    const affectedFields = new Set<string>();
    this.collectAffectedFields(fieldName, affectedFields);
    const orderedAffected = this.executionOrder.filter((f) => affectedFields.has(f));

    for (const targetField of orderedAffected) {
      const targetRules = this.dependencyIndex.get(targetField);
      if (!targetRules) continue;

      for (const rule of targetRules) {
        if (affectedFields.has(rule.triggerField) || rule.triggerField === fieldName) {
          if (rule.type === 'value' && (rule.rule as ValueRule).mode === 'query') {
            await this.executeQueryRule(rule.rule as ValueRule, values, targetField, result);
          } else if (rule.type === 'options' && (rule.rule as OptionsRule).source === 'api') {
            await this.executeApiOptionsRule(rule.rule as OptionsRule, values, targetField, result);
          } else {
            this.executeRule(rule, values, result);
          }
        }
      }
    }

    return result;
  }

  /**
   * 执行异步查询联动
   */
  private async executeQueryRule(
    rule: ValueRule,
    values: Record<string, any>,
    targetField: string,
    result: LinkageResult,
  ): Promise<void> {
    if (!rule.queryConfig || !this.apiRequest) return;

    try {
      // 解析参数中的变量引用
      const params: Record<string, any> = {};
      if (rule.queryConfig.params) {
        for (const [key, path] of Object.entries(rule.queryConfig.params)) {
          params[key] = this.expressionEngine.safeEvaluate(path, values);
        }
      }

      const response = await this.apiRequest({
        url: rule.queryConfig.api,
        method: 'GET',
        params,
      });

      let data = response?.data ?? response;
      if (rule.queryConfig.resultField) {
        data = data?.[rule.queryConfig.resultField];
      }

      result.valueUpdates[targetField] = data;
    } catch (e) {
      console.warn(`Query linkage failed for ${targetField}:`, e);
    }
  }

  /**
   * 执行 API 选项联动
   */
  private async executeApiOptionsRule(
    rule: OptionsRule,
    values: Record<string, any>,
    targetField: string,
    result: LinkageResult,
  ): Promise<void> {
    if (!rule.api || !this.apiRequest) return;

    try {
      const response = await this.apiRequest({
        url: rule.api,
        method: 'GET',
      });

      const data = response?.data ?? response;
      if (Array.isArray(data)) {
        result.optionsUpdates[targetField] = data;
      }
    } catch (e) {
      console.warn(`API options linkage failed for ${targetField}:`, e);
    }
  }

  /**
   * 评估条件分支
   */
  private evaluateConditionalBranches(
    branches: ConditionalBranch[] | undefined,
    defaultValue: any,
    values: Record<string, any>,
  ): any {
    if (!branches) return defaultValue;

    for (const branch of branches) {
      const conditionMet = this.expressionEngine.safeEvaluate(branch.condition, values);
      if (conditionMet) {
        switch (branch.valueType) {
          case 'expression':
            return this.expressionEngine.safeEvaluate(branch.value, values);
          case 'variable':
            return this.expressionEngine.safeEvaluate(branch.value, values);
          case 'literal':
          default:
            return branch.value;
        }
      }
    }

    return defaultValue;
  }

  /**
   * 收集所有受影响字段（递归）
   */
  private collectAffectedFields(field: string, affected: Set<string>): void {
    const rules = this.triggerIndex.get(field);
    if (!rules) return;

    for (const rule of rules) {
      if (!affected.has(rule.targetField)) {
        affected.add(rule.targetField);
        this.collectAffectedFields(rule.targetField, affected);
      }
    }
  }

  /**
   * 拓扑排序（Kahn 算法）— 检测循环依赖
   */
  private topologicalSort(rules: LinkageRule[]): string[] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, Set<string>>();
    const allNodes = new Set<string>();

    for (const rule of rules) {
      allNodes.add(rule.triggerField);
      allNodes.add(rule.targetField);

      if (!adjacency.has(rule.triggerField)) {
        adjacency.set(rule.triggerField, new Set());
      }
      adjacency.get(rule.triggerField)!.add(rule.targetField);

      inDegree.set(rule.targetField, (inDegree.get(rule.targetField) || 0) + 1);
      if (!inDegree.has(rule.triggerField)) {
        inDegree.set(rule.triggerField, 0);
      }
    }

    const queue: string[] = [];
    for (const [node, degree] of inDegree) {
      if (degree === 0) queue.push(node);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      sorted.push(node);

      const neighbors = adjacency.get(node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          const newDegree = (inDegree.get(neighbor) || 1) - 1;
          inDegree.set(neighbor, newDegree);
          if (newDegree === 0) {
            queue.push(neighbor);
          }
        }
      }
    }

    if (sorted.length < allNodes.size) {
      console.warn('Circular dependency detected in linkage rules');
      for (const node of allNodes) {
        if (!sorted.includes(node)) {
          sorted.push(node);
        }
      }
    }

    return sorted;
  }

  /**
   * 创建空结果
   */
  private createEmptyResult(): LinkageResult {
    return {
      valueUpdates: {},
      stateUpdates: {},
      optionsUpdates: {},
      attributeUpdates: {},
    };
  }
}
