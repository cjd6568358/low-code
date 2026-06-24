/**
 * 数据表 Schema 类型定义
 *
 * 描述数据表的 JSON 结构，存储在 tenants/{tenantId}/apps/{appId}/tables/ 目录下。
 * 支持空白创建和从页面组件快速创建，保留组件映射关系用于后续同步。
 */

/** 表字段类型 */
export type TableFieldType = 'string' | 'number' | 'boolean' | 'date' | 'json';

/** 字段来源映射 — 记录该字段由哪个页面组件属性创建 */
export interface FieldSourceMapping {
  /** 来源组件 ID */
  componentId: string;
  /** 映射的组件属性名（value/visible/disabled/loading） */
  componentProp: string;
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
