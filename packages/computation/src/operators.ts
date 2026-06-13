/**
 * 条件运算符实现
 * 对应系统字典 condition_operators
 */

export type ConditionOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'in' | 'not_in'
  | 'is_empty' | 'is_not_empty'
  | 'between'
  | 'regex';

const operators: Record<ConditionOperator, (left: any, right?: any) => boolean> = {
  eq: (left, right) => left === right,
  neq: (left, right) => left !== right,
  gt: (left, right) => left > right,
  gte: (left, right) => left >= right,
  lt: (left, right) => left < right,
  lte: (left, right) => left <= right,
  contains: (left, right) => typeof left === 'string' && left.includes(right),
  not_contains: (left, right) => typeof left === 'string' && !left.includes(right),
  starts_with: (left, right) => typeof left === 'string' && left.startsWith(right),
  ends_with: (left, right) => typeof left === 'string' && left.endsWith(right),
  in: (left, right) => Array.isArray(right) && right.includes(left),
  not_in: (left, right) => Array.isArray(right) && !right.includes(left),
  is_empty: (left) => left == null || left === '' || (Array.isArray(left) && left.length === 0),
  is_not_empty: (left) => left != null && left !== '' && !(Array.isArray(left) && left.length === 0),
  between: (left, right) => {
    if (!Array.isArray(right) || right.length < 2) return false;
    return left >= right[0] && left <= right[1];
  },
  regex: (left, right) => {
    try {
      return new RegExp(right).test(String(left));
    } catch {
      return false;
    }
  },
};

/**
 * 执行条件运算
 */
export function evaluateCondition(
  operator: ConditionOperator,
  left: any,
  right?: any,
): boolean {
  const op = operators[operator];
  if (!op) {
    console.warn(`Unknown condition operator: ${operator}`);
    return false;
  }
  try {
    return op(left, right);
  } catch {
    return false;
  }
}

/**
 * 获取所有支持的运算符
 */
export function getSupportedOperators(): ConditionOperator[] {
  return Object.keys(operators) as ConditionOperator[];
}
