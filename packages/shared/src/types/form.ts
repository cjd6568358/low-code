/** 表单运行时上下文 */
export interface FormDataContext {
  values: Record<string, any>;
  initialValues: Record<string, any>;
  source: 'new' | 'edit' | 'draft' | 'snapshot';
  meta: {
    recordId?: string;
    draftId?: string;
    snapshotId?: string;
    formId: string;
    loadedAt: number;
  };
}

/** 联动规则 */
export interface LinkageRule {
  id: string;
  triggerField: string;
  targetField: string;
  type: 'value' | 'options' | 'visible' | 'disabled' | 'required' | 'attribute';
  rule: ValueRule | OptionsRule | VisibleRule | DisabledRule | RequiredRule | AttributeRule;
}

export interface ValueRule {
  mode: 'map' | 'expression' | 'conditional' | 'query';
  map?: Record<string, any>;
  expression?: string;
  branches?: ConditionalBranch[];
  default?: any;
  queryConfig?: {
    api: string;
    params?: Record<string, string>;
    resultField?: string;
  };
}

export interface ConditionalBranch {
  condition: string;
  value: any;
  valueType?: 'literal' | 'expression' | 'variable';
}

/**
 * 选项联动 — 静态选项项
 *
 * `dependsOn` 用于 dependent（级联）模式：
 * 仅当触发字段的值等于 `dependsOn` 时该选项才出现；
 * 未设置 `dependsOn` 的选项在所有情况下都展示。
 */
export interface StaticOption {
  /** 选项显示文本 */
  label: string;
  /** 选项值 */
  value: unknown;
  /** 级联依赖值（对应触发字段的取值） */
  dependsOn?: string;
}

export interface OptionsRule {
  /** 选项来源：静态 / API / 级联（依赖触发字段取值过滤静态选项） */
  source: 'static' | 'api' | 'dependent';
  /** 静态选项列表 */
  staticOptions?: StaticOption[];
  /** API 地址（source='api'） */
  api?: string;
  /** 级联依赖的触发字段名（source='dependent'） */
  dependsOn?: string;
}

export interface VisibleRule {
  condition: string;
}

export interface DisabledRule {
  condition: string;
}

export interface RequiredRule {
  condition: string;
}

export interface AttributeRule {
  attribute: string;
  condition: string;
  value: any;
}

/** 校验器注册项 */
export interface FieldValidator {
  /** 校验器唯一名称 */
  name: string;
  /** 注册表中已注册的校验函数名 */
  validate: string;
  /** 校验失败提示 */
  message: string;
  /** 传给校验函数的参数 */
  params?: Record<string, any>;
}

/** 校验器注册表 */
export interface ValidatorRegistry {
  /** 注册校验器 */
  register(name: string, validator: FieldValidator): void;
  /** 按名称解析校验器 */
  resolve(name: string): FieldValidator | null;
}

// ─── 跨字段校验（Level 3） ──────────────────────────────

/**
 * 跨字段校验：内置校验类型
 *
 * - `dateRange`   日期区间（结束 ≥ 开始）
 * - `numberRange` 数值区间（结束 ≥ 开始）
 * - `sumEquals`   明细合计等于目标值
 * - `notEqual`    多字段互不相同
 * - `requiredAll` 多字段要么全填要么全空
 * - `requiredAny` 至少填写其中一个
 * - `expression`  自定义表达式（基于表单字段值求值，返回 falsy 即失败）
 */
export type CrossFieldValidatorType =
  | 'dateRange'
  | 'numberRange'
  | 'sumEquals'
  | 'notEqual'
  | 'requiredAll'
  | 'requiredAny'
  | 'expression';

/**
 * 跨字段校验规则
 *
 * 存储在 Form 组件的 `props.crossFieldRules` 中，提交时由
 * `ValidationEngine.validateLevel3` 求值。错误会挂到 `targetField`（缺省挂到首个字段）。
 */
export interface CrossFieldRule {
  /** 规则 ID（8 位 hex） */
  id: string;
  /** 规则名称（用于设计器展示与日志） */
  name: string;
  /** 内置校验类型（与 expression 二选一） */
  validator?: CrossFieldValidatorType;
  /** 参与校验的字段名列表（表单组件 ID） */
  fields: string[];
  /** 错误挂载的目标字段（缺省为 fields[0]） */
  targetField?: string;
  /** 校验失败提示 */
  message: string;
  /** 校验参数（按 validator 类型解释，见各内置校验器说明） */
  params?: CrossFieldParams;
  /** 自定义表达式（validator='expression' 时必填） */
  expression?: string;
}

/**
 * 跨字段校验参数
 *
 * | validator | 参数 |
 * |---|---|
 * | `dateRange` / `numberRange` | 无需参数，取 `fields[0]` 与 `fields[1]` 比较 |
 * | `sumEquals` | `sumField`：明细字段名；`itemField`：明细行内求和字段；`totalField`：目标合计字段 |
 * | `notEqual` | 无需参数，校验 `fields` 两两不相等 |
 * | `requiredAll` / `requiredAny` | 无需参数 |
 * | `expression` | 走 `CrossFieldRule.expression` |
 */
export interface CrossFieldParams {
  /** 求和场景：明细数组字段名（通常为子表单字段） */
  sumField?: string;
  /** 求和场景：明细行内的数值字段名 */
  itemField?: string;
  /** 求和场景：目标合计字段名 */
  totalField?: string;
  /** 数值容差（浮点比较，默认 1e-6） */
  tolerance?: number;
}

/**
 * 跨字段校验结果
 *
 * `errors` 以字段名为 key，便于直接回写到 antd Form 的字段错误。
 */
export interface CrossFieldValidationResult {
  /** 是否全部通过 */
  valid: boolean;
  /** 字段名 → 错误消息列表 */
  errors: Record<string, string[]>;
}
