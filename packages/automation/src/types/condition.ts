/**
 * 自动化引擎 — 条件类型定义
 *
 * 定义条件规则和条件组合结构，支持 15 种运算符和嵌套 AND/OR 逻辑。
 */

/** 条件运算符 */
export type ConditionOperator =
  | 'eq' | 'ne'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'not_in'
  | 'contains' | 'not_contains'
  | 'is_empty' | 'is_not_empty'
  | 'between'
  | 'changed_to' | 'changed_from';

/** 值类型 */
export type ConditionValueType = 'literal' | 'expression' | 'variable';

/** 条件组合逻辑 */
export type ConditionLogic = 'and' | 'or';

/**
 * 单条条件规则
 *
 * 描述一个字段与值的比较关系。
 */
export interface ConditionRule {
  /** 字段路径（支持嵌套，如 "record.amount"） */
  field: string;

  /** 比较运算符 */
  operator: ConditionOperator;

  /** 比较值（支持变量插值 {{variable}}） */
  value?: unknown;

  /** 值类型 */
  valueType?: ConditionValueType;
}

/**
 * 条件配置
 *
 * 支持嵌套条件组，实现复杂的逻辑组合。
 */
export interface AutomationCondition {
  /** 条件组合逻辑 */
  logic: ConditionLogic;

  /** 条件列表 */
  rules: ConditionRule[];

  /** 嵌套条件组（支持多层嵌套） */
  groups?: AutomationCondition[];
}

/**
 * 条件求值结果
 *
 * 记录每条规则的求值详情。
 */
export interface ConditionEvaluationResult {
  /** 是否满足条件 */
  matched: boolean;

  /** 求值详情 */
  details: ConditionRuleResult[];

  /** 求值时间（ISO 8601） */
  evaluatedAt: string;

  /** 求值耗时（毫秒） */
  durationMs: number;
}

/**
 * 单条规则求值结果
 */
export interface ConditionRuleResult {
  /** 条件描述 */
  rule: string;

  /** 字段路径 */
  field: string;

  /** 运算符 */
  operator: ConditionOperator;

  /** 期望值 */
  expected: unknown;

  /** 实际值 */
  actual: unknown;

  /** 是否匹配 */
  matched: boolean;
}
