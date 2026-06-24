/** JSON Schema 类型定义（简化版，覆盖文档中使用的字段） */
export interface JSONSchema7 {
  type?: string | string[];
  title?: string;
  description?: string;
  default?: any;
  enum?: any[];
  const?: any;
  properties?: Record<string, JSONSchema7>;
  required?: string[];
  items?: JSONSchema7;
  additionalProperties?: boolean | JSONSchema7;
  oneOf?: JSONSchema7[];
  anyOf?: JSONSchema7[];
  allOf?: JSONSchema7[];
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  /** 扩展字段 — 组件 */
  'x-component'?: string;
  'x-component-props'?: Record<string, any>;
  /** 扩展字段 — 分组与排序 */
  'x-group'?: string;
  'x-priority'?: number;
  /** 扩展字段 — 布局 */
  'x-layout'?: string;
  'x-layout-mode'?: 'groups' | 'tabs' | 'steps' | 'sections';
  /** 扩展字段 — 条件 */
  'x-visible'?: string;
  'x-disabled'?: string;
  /** 扩展字段 — 数据 */
  'x-placeholder'?: string;
  'x-dictionary'?: string;
  'x-dataSource'?: string;
  /** 扩展字段 — 校验 */
  'x-validator'?: string;
  'x-validator-message'?: string;
  /** 扩展字段 — 联动 */
  'x-reactions'?: ReactionConfig[];
  /** 扩展字段 — 判别联合 */
  'x-discriminator'?: string;
  /** 扩展字段 — 装饰器 */
  'x-decorator'?: string;
  'x-decorator-props'?: Record<string, any>;
  /** 允许任意扩展字段 */
  [key: string]: any;
}

/** 联动配置 */
export interface ReactionConfig {
  target: string;
  type: 'value' | 'visible' | 'disabled' | 'enum' | 'schema';
  expression: string;
}
