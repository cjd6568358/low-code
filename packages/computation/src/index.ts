/**
 * @low-code/computation — 条件运算符库
 *
 * 职责：提供结构化条件规则的比较运算符（eq/gt/contains/...）。
 * 表达式引擎（ExpressionEngine）已迁移至 @low-code/shared。
 */

export { evaluateCondition, getSupportedOperators } from './operators';
export type { ConditionOperator } from './operators';
