/**
 * 数据表 Schema 类型定义
 *
 * 描述数据表的 JSON 结构，存储在 tenants/{tenantId}/apps/{appId}/tables/ 目录下。
 * 支持空白创建和从页面组件快速创建，保留组件映射关系用于后续同步。
 */

/** 表字段类型 */
export type TableFieldType = 'string' | 'number' | 'boolean' | 'date' | 'json' | 'enum';

/** 字段来源映射 — 记录该字段由哪个页面组件属性创建 */
export interface FieldSourceMapping {
  /** 来源组件 ID */
  componentId: string;
  /** 映射的组件属性名（value/visible/disabled/loading） */
  componentProp: string;
}

/** 字符串字段约束 */
export interface StringFieldConstraints {
  /** 最大长度 */
  maxLength?: number;
  /** 最小长度 */
  minLength?: number;
  /** 正则校验模式 */
  pattern?: string;
  /** 格式化类型 */
  format?: 'email' | 'url' | 'phone' | 'idcard';
}

/** 数字字段约束 */
export interface NumberFieldConstraints {
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 小数精度（0 表示整数） */
  precision?: number;
  /** 是否强制整数 */
  integer?: boolean;
}

/** 日期字段约束 */
export interface DateFieldConstraints {
  /** 日期格式 */
  format?: 'date' | 'datetime';
  /** 最小日期（ISO8601） */
  min?: string;
  /** 最大日期（ISO8601） */
  max?: string;
}

/** 枚举字段约束 */
export interface EnumFieldConstraints {
  /** 枚举值列表 */
  values: Array<{ label: string; value: string }>;
}

/** 字段约束 — 按 fieldType 区分 */
export type FieldConstraints =
  | StringFieldConstraints
  | NumberFieldConstraints
  | DateFieldConstraints
  | EnumFieldConstraints;

/** 字段校验规则 */
export interface ValidationRule {
  /** 规则类型 */
  type: 'required' | 'pattern' | 'min' | 'max' | 'minLength' | 'maxLength' | 'custom';
  /** 规则值（pattern 为字符串，min/max/minLength/maxLength 为数字，custom 为表达式） */
  value?: string | number;
  /** 自定义错误消息 */
  message?: string;
}

/**
 * 外键引用 — 记录该字段引用了哪张表的哪个字段
 *
 * 两种来源：
 * - 自动推断：页面组件数据源绑定到某表的某字段时，同时填写 foreignKey + sourceMapping
 * - 手动新增：在数据表编辑器中手动设置外键关系，只填写 foreignKey
 */
export interface ForeignKeyReference {
  /** 引用的目标表 ID */
  targetTableId: string;
  /** 引用的目标字段名（通常是 'id'） */
  targetFieldName: string;
  /**
   * 删除策略
   * - RESTRICT: 有引用时禁止删除（默认，最安全）
   * - CASCADE: 删除主记录时级联删除引用记录
   * - SET NULL: 删除主记录时将外键设为 null
   *
   * 注：业务场景统一软删除，此规则主要用于前端提示校验
   */
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
}

/** 表字段定义 */
export interface TableColumn {
  /** 字段 ID（8位hex） */
  id: string;
  /** 字段名（英文标识，如 fieldName） */
  fieldName: string;
  /** 字段类型 */
  fieldType: TableFieldType;
  /** 是否必填 */
  required: boolean;
  /** 默认值 */
  defaultValue?: string;
  /** 字段说明 */
  description?: string;
  /** 是否为系统字段（不可删除，如主键 id） */
  system?: boolean;
  /** 来源映射（从页面创建时设置，用于后续同步） */
  sourceMapping?: FieldSourceMapping;
  /** 外键引用（自动推断或手动设置，设置后该字段为外键字段） */
  foreignKey?: ForeignKeyReference;
  /** 字段类型约束（按 fieldType 区分具体类型） */
  constraints?: FieldConstraints;
  /** 字段校验规则列表 */
  validations?: ValidationRule[];
}

/** 表索引定义 */
export interface TableIndex {
  /** 索引 ID（8位hex） */
  id: string;
  /** 索引名称 */
  name: string;
  /** 关联字段名列表 */
  columns: string[];
  /** 是否唯一索引 */
  unique: boolean;
}

/**
 * 数据表 Schema — 数据表的完整描述
 *
 * 由设计器消费，运行时引擎读取。
 * 从页面创建时保留 sourceMapping，支持后续增量同步。
 */
export interface TableSchema {
  /** 资源 ID（裸 8位hex） */
  tableId: string;
  /** 资源名称 */
  name: string;
  schemaVersion: number;
  version: number;
  /** 表字段列表 */
  columns: TableColumn[];
  /** 表索引列表 */
  indexes?: TableIndex[];
  /** 来源页面 ID（从页面创建时设置） */
  sourcePageId?: string;
  createdAt: number;
  updatedAt: number;
  /** 资源引用 */
  references?: Record<string, string[]>;
}

/**
 * 组件类型 → 表字段类型映射表
 *
 * 与 EnvironmentRegistry.extractValueType 保持一致。
 * 用于从页面组件自动推导表字段类型。
 */
export const COMPONENT_TYPE_TO_FIELD_TYPE: Record<string, TableFieldType> = {
  input: 'string',
  textarea: 'string',
  text: 'string',
  radio: 'string',
  datepicker: 'string',
  timepicker: 'string',
  colorpicker: 'string',
  autocomplete: 'string',
  mentions: 'string',
  select: 'string',
  treeselect: 'string',
  cascader: 'string',
  number: 'number',
  rate: 'number',
  slider: 'number',
  switch: 'boolean',
  checkbox: 'boolean',
  upload: 'json',
};

/** 数据录入类组件类型集合 — 用于过滤可映射的组件 */

/** 默认系统字段 — 主键 id（自增 INTEGER） */
export const SYSTEM_ID_COLUMN: TableColumn = {
  id: 'sys_id',
  fieldName: 'id',
  fieldType: 'number',
  required: true,
  description: '主键（自增）',
  system: true,
};
export const DATA_ENTRY_COMPONENT_TYPES = new Set([
  'input', 'textarea', 'number', 'select', 'radio',
  'checkbox', 'switch', 'datepicker', 'timepicker',
  'rate', 'slider', 'upload', 'treeselect', 'cascader',
  'colorpicker', 'mentions', 'autocomplete',
]);
