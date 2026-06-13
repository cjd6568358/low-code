import type { DictItem } from '@low-code/shared';

/**
 * 系统字典 Mock 数据
 * 对应文档 system-dictionaries.md 中的各字典
 */

/** 组件类型字典 */
export const COMPONENT_TYPES: DictItem[] = [
  { label: '输入框', value: 'input', extra: { category: 'basic' } },
  { label: '文本域', value: 'textarea', extra: { category: 'basic' } },
  { label: '数字输入', value: 'number', extra: { category: 'basic' } },
  { label: '选择器', value: 'select', extra: { category: 'basic' } },
  { label: '单选', value: 'radio', extra: { category: 'basic' } },
  { label: '多选', value: 'checkbox', extra: { category: 'basic' } },
  { label: '开关', value: 'switch', extra: { category: 'basic' } },
  { label: '日期选择', value: 'datepicker', extra: { category: 'basic' } },
  { label: '时间选择', value: 'timepicker', extra: { category: 'basic' } },
  { label: '上传', value: 'upload', extra: { category: 'basic' } },
  { label: '按钮', value: 'button', extra: { category: 'basic' } },
  { label: '表格', value: 'table', extra: { category: 'advanced' } },
  { label: '表单', value: 'form', extra: { category: 'advanced' } },
  { label: '图表', value: 'chart', extra: { category: 'advanced' } },
  { label: '日历', value: 'calendar', extra: { category: 'advanced' } },
  { label: '富文本编辑', value: 'richtext', extra: { category: 'advanced' } },
  { label: '树形控件', value: 'tree', extra: { category: 'advanced' } },
  { label: '标签页', value: 'tabs', extra: { category: 'layout' } },
  { label: '卡片', value: 'card', extra: { category: 'layout' } },
  { label: '分割线', value: 'divider', extra: { category: 'layout' } },
  { label: '栅格', value: 'grid', extra: { category: 'layout' } },
  { label: '弹性布局', value: 'flex', extra: { category: 'layout' } },
];

/** 组件库字典 */
export const COMPONENT_LIBRARIES: DictItem[] = [
  { label: 'Ant Design', value: 'antd', extra: { version: '5.x', default: true } },
  { label: 'Element Plus', value: 'element-plus', extra: { version: '2.x' } },
  { label: '自定义', value: 'custom' },
];

/** 布局类型字典 */
export const LAYOUT_TYPES: DictItem[] = [
  { label: 'Flex 弹性布局', value: 'flex' },
  { label: 'Grid 网格布局', value: 'grid' },
];

/** 设备类型字典 */
export const DEVICE_TYPES: DictItem[] = [
  { label: 'Web 端', value: 'web' },
  { label: 'Mobile 端', value: 'mobile' },
  { label: '小程序', value: 'miniapp' },
];

/** 动作类型字典 */
export const ACTION_TYPES: DictItem[] = [
  // Navigation
  { label: '页面跳转', value: 'navigate', extra: { category: 'navigation' } },
  { label: '打开新页面', value: 'openPage', extra: { category: 'navigation' } },
  { label: '返回上一页', value: 'goBack', extra: { category: 'navigation' } },
  { label: '刷新页面', value: 'refresh', extra: { category: 'navigation' } },
  // Data
  { label: '设置值', value: 'setValue', extra: { category: 'data' } },
  { label: '批量设值', value: 'setValues', extra: { category: 'data' } },
  { label: '重置值', value: 'resetValue', extra: { category: 'data' } },
  { label: '提交表单', value: 'submit', extra: { category: 'data' } },
  { label: '调用 API', value: 'apiCall', extra: { category: 'data' } },
  { label: '调用组件方法', value: 'invokeMethod', extra: { category: 'data' } },
  // UI
  { label: '打开弹窗', value: 'showModal', extra: { category: 'ui' } },
  { label: '关闭弹窗', value: 'closeModal', extra: { category: 'ui' } },
  { label: '消息提示', value: 'message', extra: { category: 'ui' } },
  { label: '通知提醒', value: 'notification', extra: { category: 'ui' } },
  { label: '刷新组件', value: 'refreshComponent', extra: { category: 'ui' } },
  { label: '显示加载', value: 'showLoading', extra: { category: 'ui' } },
  { label: '隐藏加载', value: 'hideLoading', extra: { category: 'ui' } },
  { label: '复制到剪贴板', value: 'copyToClipboard', extra: { category: 'ui' } },
  // Workflow
  { label: '触发流程', value: 'triggerWorkflow', extra: { category: 'workflow' } },
  { label: '执行脚本', value: 'executeScript', extra: { category: 'workflow' } },
  // Control
  { label: '条件分支', value: 'condition', extra: { category: 'control' } },
  { label: '循环', value: 'loop', extra: { category: 'control' } },
  { label: '延时', value: 'delay', extra: { category: 'control' } },
  { label: '并行执行', value: 'parallel', extra: { category: 'control' } },
];

/** 条件运算符字典 */
export const CONDITION_OPERATORS: DictItem[] = [
  { label: '等于', value: 'eq', extra: { applicableType: 'all' } },
  { label: '不等于', value: 'neq', extra: { applicableType: 'all' } },
  { label: '大于', value: 'gt', extra: { applicableType: 'number/date' } },
  { label: '大于等于', value: 'gte', extra: { applicableType: 'number/date' } },
  { label: '小于', value: 'lt', extra: { applicableType: 'number/date' } },
  { label: '小于等于', value: 'lte', extra: { applicableType: 'number/date' } },
  { label: '包含', value: 'contains', extra: { applicableType: 'string' } },
  { label: '不包含', value: 'not_contains', extra: { applicableType: 'string' } },
  { label: '开头是', value: 'starts_with', extra: { applicableType: 'string' } },
  { label: '结尾是', value: 'ends_with', extra: { applicableType: 'string' } },
  { label: '在范围内', value: 'in', extra: { applicableType: 'array' } },
  { label: '不在范围内', value: 'not_in', extra: { applicableType: 'array' } },
  { label: '为空', value: 'is_empty', extra: { applicableType: 'all' } },
  { label: '不为空', value: 'is_not_empty', extra: { applicableType: 'all' } },
  { label: '区间', value: 'between', extra: { applicableType: 'number/date' } },
  { label: '正则匹配', value: 'regex', extra: { applicableType: 'string' } },
];

/** 联动类型字典 */
export const LINKAGE_TYPES: DictItem[] = [
  { label: '值联动', value: 'value' },
  { label: '选项联动', value: 'options' },
  { label: '显隐联动', value: 'visible' },
  { label: '禁用联动', value: 'disabled' },
  { label: '必填联动', value: 'required' },
  { label: '属性联动', value: 'attribute' },
];

/** 字段类型字典 */
export const FIELD_TYPES: DictItem[] = [
  { label: '字符串', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '布尔', value: 'boolean' },
  { label: '日期', value: 'date' },
  { label: '日期时间', value: 'datetime' },
  { label: 'JSON', value: 'json' },
  { label: '长文本', value: 'text' },
  { label: '枚举', value: 'enum' },
];

/** 格式化字段类型字典 */
export const FORMAT_FIELD_TYPES: DictItem[] = [
  { label: '邮箱', value: 'email', extra: { baseType: 'string' } },
  { label: '手机号', value: 'phone', extra: { baseType: 'string' } },
  { label: '身份证', value: 'idcard', extra: { baseType: 'string' } },
  { label: '地址', value: 'address', extra: { baseType: 'json' } },
  { label: '日期区间', value: 'daterange', extra: { baseType: 'json' } },
  { label: '金额', value: 'currency', extra: { baseType: 'decimal' } },
  { label: '百分比', value: 'percentage', extra: { baseType: 'number' } },
  { label: '链接', value: 'url', extra: { baseType: 'string' } },
  { label: '颜色', value: 'color', extra: { baseType: 'string' } },
  { label: '图片', value: 'image', extra: { baseType: 'string' } },
  { label: '文件', value: 'file', extra: { baseType: 'string' } },
  { label: '富文本', value: 'richtext', extra: { baseType: 'text' } },
];

/** 表单控件类型字典 */
export const FORM_CONTROL_TYPES: DictItem[] = [
  ...COMPONENT_TYPES,
  { label: '级联选择', value: 'cascader', extra: { category: 'advanced' } },
  { label: '穿梭框', value: 'transfer', extra: { category: 'advanced' } },
  { label: '滑块', value: 'slider', extra: { category: 'advanced' } },
  { label: '评分', value: 'rate', extra: { category: 'advanced' } },
  { label: '颜色', value: 'color', extra: { category: 'advanced' } },
  { label: '签名', value: 'signature', extra: { category: 'special' } },
  { label: '地理位置', value: 'location', extra: { category: 'special' } },
  { label: '扫码', value: 'barcode', extra: { category: 'special' } },
  { label: '子表单', value: 'subform', extra: { category: 'special' } },
  { label: '关联记录', value: 'relation', extra: { category: 'special' } },
];

/** 字典注册表 */
const mockDictionaries: Record<string, DictItem[]> = {
  component_types: COMPONENT_TYPES,
  component_libraries: COMPONENT_LIBRARIES,
  layout_types: LAYOUT_TYPES,
  device_types: DEVICE_TYPES,
  action_types: ACTION_TYPES,
  condition_operators: CONDITION_OPERATORS,
  linkage_types: LINKAGE_TYPES,
  field_types: FIELD_TYPES,
  format_field_types: FORMAT_FIELD_TYPES,
  form_control_types: FORM_CONTROL_TYPES,
};

/** 获取字典数据 */
export function getMockDictionary(dictCode: string): DictItem[] | null {
  return mockDictionaries[dictCode] || null;
}

/** 获取所有字典编码 */
export function getDictionaryCodes(): string[] {
  return Object.keys(mockDictionaries);
}
