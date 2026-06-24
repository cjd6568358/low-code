/**
 * 表单字段属性 Schema
 *
 * 当组件被拖入 Form 容器时，属性面板动态合并这些属性。
 * 录入型组件本身继承 BaseProps，只有在 Form 内才获得表单字段配置能力。
 *
 * 注意：name 已在 BaseProps 中定义（x-group: '基础属性'），此处不重复定义。
 */
import type { JSONSchema7 } from '@low-code/shared';

/** 校验规则类型的枚举值 */
const RULE_TYPE_ENUM = [
  'string', 'number', 'boolean', 'method', 'regexp',
  'integer', 'float', 'object', 'enum', 'date',
  'url', 'hex', 'email', 'tel',
];

/** 校验规则 Schema */
const VALIDATION_RULE_SCHEMA: JSONSchema7 = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      title: '规则类型',
      enum: RULE_TYPE_ENUM,
      'x-component': 'select',
    },
    required: {
      type: 'boolean',
      title: '必填',
    },
    message: {
      type: 'string',
      title: '提示信息',
    },
    min: {
      type: 'number',
      title: '最小值/长度',
    },
    max: {
      type: 'number',
      title: '最大值/长度',
    },
    len: {
      type: 'number',
      title: '固定长度',
    },
    pattern: {
      type: 'string',
      title: '正则表达式',
    },
    whitespace: {
      type: 'boolean',
      title: '不允许空白',
    },
    warningOnly: {
      type: 'boolean',
      title: '警告模式',
    },
  },
};

/**
 * 表单字段属性 Schema
 *
 * 当组件在 Form 内时，这些属性会动态合并到组件的 propsSchema 中。
 * name 不在此处，它已在 BaseProps 中定义（x-group: '基础属性'）。
 */
export const FORM_FIELD_SCHEMA_PROPERTIES: Record<string, JSONSchema7> = {
  label: {
    type: 'string',
    title: '标签',
    'x-group': '表单配置',
    'x-priority': 100,
  },
  required: {
    type: 'boolean',
    title: '是否必填',
    'x-group': '表单配置',
    'x-priority': 101,
    'x-no-binding': '',
  },
  rules: {
    type: 'array',
    title: '校验规则',
    'x-group': '表单配置',
    'x-priority': 102,
    'x-no-binding': '',
    items: VALIDATION_RULE_SCHEMA,
  },
  initialValue: {
    title: '初始值',
    'x-group': '表单配置',
    'x-priority': 103,
  },
  preserve: {
    type: 'boolean',
    title: '卸载时保留值',
    'x-group': '表单配置',
    'x-priority': 104,
    'x-no-binding': '',
  },
};
