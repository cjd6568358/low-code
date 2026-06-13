import type { DictItem } from '@low-code/shared';

/**
 * 系统字典 Mock 数据（auto-rendering 包内副本）
 */

const mockDictionaries: Record<string, DictItem[]> = {
  component_types: [
    { label: '输入框', value: 'input', extra: { category: 'basic' } },
    { label: '文本域', value: 'textarea', extra: { category: 'basic' } },
    { label: '数字输入', value: 'number', extra: { category: 'basic' } },
    { label: '选择器', value: 'select', extra: { category: 'basic' } },
    { label: '单选', value: 'radio', extra: { category: 'basic' } },
    { label: '多选', value: 'checkbox', extra: { category: 'basic' } },
    { label: '开关', value: 'switch', extra: { category: 'basic' } },
    { label: '日期选择', value: 'datepicker', extra: { category: 'basic' } },
    { label: '按钮', value: 'button', extra: { category: 'basic' } },
    { label: '表格', value: 'table', extra: { category: 'advanced' } },
    { label: '表单', value: 'form', extra: { category: 'advanced' } },
    { label: '卡片', value: 'card', extra: { category: 'layout' } },
    { label: '弹性布局', value: 'flex', extra: { category: 'layout' } },
  ],
  action_types: [
    { label: '页面跳转', value: 'navigate' },
    { label: '设置值', value: 'setValue' },
    { label: '调用 API', value: 'apiCall' },
    { label: '消息提示', value: 'message' },
    { label: '条件分支', value: 'condition' },
  ],
  condition_operators: [
    { label: '等于', value: 'eq' },
    { label: '不等于', value: 'neq' },
    { label: '大于', value: 'gt' },
    { label: '小于', value: 'lt' },
    { label: '包含', value: 'contains' },
    { label: '为空', value: 'is_empty' },
    { label: '不为空', value: 'is_not_empty' },
  ],
  field_types: [
    { label: '字符串', value: 'string' },
    { label: '数字', value: 'number' },
    { label: '布尔', value: 'boolean' },
    { label: '日期', value: 'date' },
    { label: '枚举', value: 'enum' },
  ],
};

export function getMockDictionary(dictCode: string): DictItem[] | null {
  return mockDictionaries[dictCode] || null;
}
