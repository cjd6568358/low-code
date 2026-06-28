/**
 * 条件表达式类型定义
 */

/** 条件操作符 */
export type ConditionOperator =
  | '=='    // 等于
  | '!='    // 不等于
  | '>'     // 大于
  | '>='    // 大于等于
  | '<'     // 小于
  | '<='    // 小于等于
  | 'in'    // 包含
  | 'notIn' // 不包含
  | 'like'  // 模糊匹配
  | 'isNull'    // 为空
  | 'isNotNull' // 不为空
  | 'between'   // 区间
  | 'contains'; // 包含

/** 逻辑操作符 */
export type LogicalOperator = 'and' | 'or' | 'not';

/** 条件表达式 */
export interface ConditionExpr {
  /** 条件类型 */
  type: 'comparison' | 'logical' | 'function' | 'custom';
}

/** 比较条件 */
export interface ComparisonCondition extends ConditionExpr {
  type: 'comparison';
  /** 字段名 */
  field: string;
  /** 操作符 */
  operator: ConditionOperator;
  /** 值 */
  value: unknown;
  /** 描述 */
  description?: string;
}

/** 逻辑条件 */
export interface LogicalCondition extends ConditionExpr {
  type: 'logical';
  /** 逻辑操作符 */
  operator: LogicalOperator;
  /** 子条件 */
  conditions: ConditionExpr[];
  /** 描述 */
  description?: string;
}

/** 函数条件 */
export interface FunctionCondition extends ConditionExpr {
  type: 'function';
  /** 函数名 */
  name: string;
  /** 参数 */
  args: unknown[];
  /** 描述 */
  description?: string;
}

/** 自定义条件 */
export interface CustomCondition extends ConditionExpr {
  type: 'custom';
  /** 表达式字符串 */
  expression: string;
  /** 语言 */
  language?: string;
  /** 描述 */
  description?: string;
}

/** 条件求值上下文 */
export interface ConditionContext {
  /** 流程变量 */
  variables: Record<string, unknown>;
  /** 表单数据 */
  formData?: Record<string, unknown>;
  /** 当前节点 */
  currentNodeId?: string;
  /** 审批人 */
  operator?: {
    id: string;
    name: string;
    roles?: string[];
    departments?: string[];
  };
  /** 发起人 */
  initiator?: {
    id: string;
    name: string;
  };
}

/** 条件求值结果 */
export interface ConditionResult {
  /** 是否满足 */
  satisfied: boolean;
  /** 求值结果（用于调试） */
  value?: unknown;
  /** 错误信息 */
  error?: string;
  /** 求值耗时（毫秒） */
  duration?: number;
}

/** 条件解析器接口 */
export interface ConditionParser {
  /** 解析条件表达式 */
  parse(expression: string | ConditionExpr): ConditionExpr;
  /** 求值条件 */
  evaluate(condition: ConditionExpr, context: ConditionContext): ConditionResult;
  /** 校验条件语法 */
  validate(condition: ConditionExpr): ValidationResult;
}

/** 校验结果 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: ValidationError[];
  /** 警告列表 */
  warnings: ValidationWarning[];
}

/** 校验错误 */
export interface ValidationError {
  /** 错误路径 */
  path: string;
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code: string;
}

/** 校验警告 */
export interface ValidationWarning {
  /** 警告路径 */
  path: string;
  /** 警告消息 */
  message: string;
  /** 警告代码 */
  code: string;
}

/** 常量条件 */
export const ALWAYS_CONDITION: CustomCondition = {
  type: 'custom',
  expression: 'true',
  description: '始终为真',
};

/** 默认条件 */
export const DEFAULT_CONDITION: CustomCondition = {
  type: 'custom',
  expression: 'default',
  description: '默认分支',
};

/** 条件操作符描述 */
export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  '==': '等于',
  '!=': '不等于',
  '>': '大于',
  '>=': '大于等于',
  '<': '小于',
  '<=': '小于等于',
  'in': '包含在',
  'notIn': '不包含在',
  'like': '模糊匹配',
  'isNull': '为空',
  'isNotNull': '不为空',
  'between': '在区间内',
  'contains': '包含',
};

/** 逻辑操作符描述 */
export const LOGICAL_OPERATOR_LABELS: Record<LogicalOperator, string> = {
  'and': '并且',
  'or': '或者',
  'not': '非',
};
