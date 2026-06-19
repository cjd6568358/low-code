/**
 * 批量创建组件目录结构
 *
 * 为 antd 66 个组件创建：
 * - component.tsx  — withPlatform 包装
 * - schema.ts      — Props extends BaseProps（JSDoc 含中文标题 + x-group + x-priority）
 * - index.ts       — 统一导出
 *
 * 用法：npx tsx scripts/batch-create-components.ts
 */
import fs from 'fs';
import path from 'path';

const ANTD_DIR = path.resolve(__dirname, '../packages/renderer/src/libraries/antd');

// 组件配置：type → { antdImport, propName, name, category, props }
const COMPONENTS: Record<string, {
  antdImport: string;
  propName: string;
  name: string;
  category: string;
  baseType?: string;
  props: Array<{ name: string; type: string; title: string; group: string; priority: number; required?: boolean; enum?: string[] }>;
}> = {
  // ── 通用 ──
  text: {
    antdImport: 'Typography',
    propName: 'Text',
    name: '文本',
    category: 'general',
    props: [
      { name: 'children', type: 'React.ReactNode', title: '文本内容', group: '基础属性', priority: 10 },
      { name: 'type', type: 'string', title: '文本类型', group: '基础属性', priority: 11, enum: ['secondary', 'success', 'warning', 'danger'] },
      { name: 'code', type: 'boolean', title: '代码样式', group: '基础属性', priority: 12 },
      { name: 'mark', type: 'boolean', title: '标记样式', group: '基础属性', priority: 13 },
      { name: 'underline', type: 'boolean', title: '下划线', group: '基础属性', priority: 14 },
      { name: 'delete', type: 'boolean', title: '删除线', group: '基础属性', priority: 15 },
      { name: 'strong', type: 'boolean', title: '加粗', group: '基础属性', priority: 16 },
      { name: 'italic', type: 'boolean', title: '斜体', group: '基础属性', priority: 17 },
    ],
  },

  // ── 布局 ──
  divider: {
    antdImport: 'Divider',
    propName: 'Divider',
    name: '分割线',
    category: 'layout',
    props: [
      { name: 'type', type: 'string', title: '方向', group: '基础属性', priority: 10, enum: ['horizontal', 'vertical'] },
      { name: 'orientation', type: 'string', title: '文字位置', group: '基础属性', priority: 11, enum: ['left', 'center', 'right'] },
      { name: 'dashed', type: 'boolean', title: '虚线', group: '基础属性', priority: 12 },
      { name: 'plain', type: 'boolean', title: '纯文字', group: '基础属性', priority: 13 },
    ],
  },
  flex: {
    antdImport: 'Flex',
    propName: 'Flex',
    name: '弹性布局',
    category: 'layout',
    props: [
      { name: 'vertical', type: 'boolean', title: '垂直排列', group: '基础属性', priority: 10 },
      { name: 'wrap', type: 'string', title: '换行', group: '基础属性', priority: 11, enum: ['nowrap', 'wrap', 'wrap-reverse'] },
      { name: 'justify', type: 'string', title: '主轴对齐', group: '基础属性', priority: 12, enum: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'] },
      { name: 'align', type: 'string', title: '交叉轴对齐', group: '基础属性', priority: 13, enum: ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'] },
      { name: 'gap', type: 'number | string', title: '间距', group: '基础属性', priority: 14 },
    ],
  },
  grid: {
    antdImport: 'Row',
    propName: 'Row',
    name: '栅格',
    category: 'layout',
    props: [
      { name: 'gutter', type: 'number | [number, number]', title: '栅格间距', group: '基础属性', priority: 10 },
      { name: 'justify', type: 'string', title: '水平排列', group: '基础属性', priority: 11, enum: ['start', 'end', 'center', 'space-around', 'space-between', 'space-evenly'] },
      { name: 'align', type: 'string', title: '垂直对齐', group: '基础属性', priority: 12, enum: ['top', 'middle', 'bottom'] },
      { name: 'wrap', type: 'boolean', title: '自动换行', group: '基础属性', priority: 13 },
    ],
  },
  layout: {
    antdImport: 'Layout',
    propName: 'Layout',
    name: '布局',
    category: 'layout',
    props: [
      { name: 'hasSider', type: 'boolean', title: '包含侧边栏', group: '基础属性', priority: 10 },
    ],
  },
  sider: {
    antdImport: 'Layout.Sider',
    propName: 'Sider',
    name: '侧边栏',
    category: 'layout',
    props: [
      { name: 'collapsed', type: 'boolean', title: '是否折叠', group: '基础属性', priority: 10 },
      { name: 'collapsible', type: 'boolean', title: '可折叠', group: '基础属性', priority: 11 },
      { name: 'width', type: 'number', title: '宽度', group: '基础属性', priority: 12 },
      { name: 'collapsedWidth', type: 'number', title: '折叠宽度', group: '基础属性', priority: 13 },
      { name: 'reverseArrow', type: 'boolean', title: '翻转箭头', group: '基础属性', priority: 14 },
      { name: 'theme', type: 'string', title: '主题', group: '基础属性', priority: 15, enum: ['light', 'dark'] },
    ],
  },
  space: {
    antdImport: 'Space',
    propName: 'Space',
    name: '间距',
    category: 'layout',
    props: [
      { name: 'direction', type: 'string', title: '方向', group: '基础属性', priority: 10, enum: ['vertical', 'horizontal'] },
      { name: 'size', type: 'number | string', title: '间距大小', group: '基础属性', priority: 11 },
      { name: 'wrap', type: 'boolean', title: '自动换行', group: '基础属性', priority: 12 },
      { name: 'align', type: 'string', title: '对齐', group: '基础属性', priority: 13, enum: ['start', 'end', 'center', 'baseline'] },
      { name: 'split', type: 'React.ReactNode', title: '分隔符', group: '高级属性', priority: 20 },
    ],
  },
  splitter: {
    antdImport: 'Splitter',
    propName: 'Splitter',
    name: '分隔面板',
    category: 'layout',
    props: [
      { name: 'layout', type: 'string', title: '布局方向', group: '基础属性', priority: 10, enum: ['horizontal', 'vertical'] },
      { name: 'lazy', type: 'boolean', title: '懒加载', group: '高级属性', priority: 20 },
    ],
  },

  // ── 导航 ──
  anchor: {
    antdImport: 'Anchor',
    propName: 'Anchor',
    name: '锚点',
    category: 'navigation',
    props: [
      { name: 'items', type: 'AnchorItem[]', title: '锚点数据', group: '基础属性', priority: 10 },
      { name: 'direction', type: 'string', title: '方向', group: '基础属性', priority: 11, enum: ['vertical', 'horizontal'] },
      { name: 'affix', type: 'boolean', title: '固定模式', group: '基础属性', priority: 12 },
      { name: 'offsetTop', type: 'number', title: '偏移顶部', group: '基础属性', priority: 13 },
      { name: 'targetOffset', type: 'number', title: '锚点偏移', group: '基础属性', priority: 14 },
    ],
  },
  breadcrumb: {
    antdImport: 'Breadcrumb',
    propName: 'Breadcrumb',
    name: '面包屑',
    category: 'navigation',
    props: [
      { name: 'items', type: 'BreadcrumbItem[]', title: '面包屑数据', group: '基础属性', priority: 10 },
      { name: 'separator', type: 'React.ReactNode', title: '分隔符', group: '基础属性', priority: 11 },
    ],
  },
  dropdown: {
    antdImport: 'Dropdown',
    propName: 'Dropdown',
    name: '下拉菜单',
    category: 'navigation',
    props: [
      { name: 'menu', type: 'MenuProps', title: '菜单配置', group: '基础属性', priority: 10 },
      { name: 'placement', type: 'string', title: '弹出位置', group: '基础属性', priority: 11, enum: ['bottomLeft', 'bottomCenter', 'bottomRight', 'topLeft', 'topCenter', 'topRight'] },
      { name: 'trigger', type: 'string[]', title: '触发方式', group: '基础属性', priority: 12 },
      { name: 'arrow', type: 'boolean', title: '箭头', group: '基础属性', priority: 13 },
    ],
  },
  menu: {
    antdImport: 'Menu',
    propName: 'Menu',
    name: '导航菜单',
    category: 'navigation',
    props: [
      { name: 'items', type: 'MenuItem[]', title: '菜单数据', group: '基础属性', priority: 10 },
      { name: 'mode', type: 'string', title: '模式', group: '基础属性', priority: 11, enum: ['vertical', 'horizontal', 'inline'] },
      { name: 'theme', type: 'string', title: '主题', group: '基础属性', priority: 12, enum: ['light', 'dark'] },
      { name: 'defaultSelectedKeys', type: 'string[]', title: '默认选中', group: '基础属性', priority: 13 },
      { name: 'defaultOpenKeys', type: 'string[]', title: '默认展开', group: '基础属性', priority: 14 },
    ],
  },
  pagination: {
    antdImport: 'Pagination',
    propName: 'Pagination',
    name: '分页',
    category: 'navigation',
    props: [
      { name: 'total', type: 'number', title: '总数', group: '基础属性', priority: 10 },
      { name: 'current', type: 'number', title: '当前页', group: '基础属性', priority: 11 },
      { name: 'pageSize', type: 'number', title: '每页条数', group: '基础属性', priority: 12 },
      { name: 'showSizeChanger', type: 'boolean', title: '显示条数切换', group: '基础属性', priority: 13 },
      { name: 'showQuickJumper', type: 'boolean', title: '快速跳转', group: '基础属性', priority: 14 },
      { name: 'showTotal', type: 'boolean', title: '显示总数', group: '基础属性', priority: 15 },
      { name: 'simple', type: 'boolean', title: '简洁模式', group: '高级属性', priority: 20 },
      { name: 'size', type: 'string', title: '尺寸', group: '高级属性', priority: 21, enum: ['default', 'small'] },
    ],
  },
  steps: {
    antdImport: 'Steps',
    propName: 'Steps',
    name: '步骤条',
    category: 'navigation',
    props: [
      { name: 'items', type: 'StepItem[]', title: '步骤数据', group: '基础属性', priority: 10 },
      { name: 'current', type: 'number', title: '当前步骤', group: '基础属性', priority: 11 },
      { name: 'direction', type: 'string', title: '方向', group: '基础属性', priority: 12, enum: ['horizontal', 'vertical'] },
      { name: 'size', type: 'string', title: '尺寸', group: '基础属性', priority: 13, enum: ['default', 'small'] },
      { name: 'type', type: 'string', title: '类型', group: '基础属性', priority: 14, enum: ['default', 'navigation', 'inline'] },
      { name: 'status', type: 'string', title: '状态', group: '基础属性', priority: 15, enum: ['wait', 'process', 'finish', 'error'] },
      { name: 'progressDot', type: 'boolean', title: '点状步骤', group: '高级属性', priority: 20 },
    ],
  },
  tabs: {
    antdImport: 'Tabs',
    propName: 'Tabs',
    name: '标签页',
    category: 'navigation',
    props: [
      { name: 'items', type: 'TabItem[]', title: '标签数据', group: '基础属性', priority: 10 },
      { name: 'activeKey', type: 'string', title: '当前标签', group: '基础属性', priority: 11 },
      { name: 'tabPosition', type: 'string', title: '位置', group: '基础属性', priority: 12, enum: ['top', 'right', 'bottom', 'left'] },
      { name: 'type', type: 'string', title: '类型', group: '基础属性', priority: 13, enum: ['line', 'card', 'editable-card'] },
      { name: 'size', type: 'string', title: '尺寸', group: '基础属性', priority: 14, enum: ['large', 'middle', 'small'] },
      { name: 'centered', type: 'boolean', title: '居中', group: '基础属性', priority: 15 },
      { name: 'animated', type: 'boolean', title: '动画', group: '高级属性', priority: 20 },
    ],
  },

  // ── 数据录入 ──
  autocomplete: {
    antdImport: 'AutoComplete',
    propName: 'AutoComplete',
    name: '自动完成',
    category: 'data-entry',
    props: [
      { name: 'options', type: 'Option[]', title: '选项数据', group: '基础属性', priority: 10 },
      { name: 'placeholder', type: 'string', title: '占位提示', group: '基础属性', priority: 11 },
      { name: 'value', type: 'string', title: '值', group: '基础属性', priority: 12 },
      { name: 'allowClear', type: 'boolean', title: '允许清除', group: '基础属性', priority: 13 },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 14 },
    ],
  },
  cascader: {
    antdImport: 'Cascader',
    propName: 'Cascader',
    name: '级联选择',
    category: 'data-entry',
    props: [
      { name: 'options', type: 'Option[]', title: '选项数据', group: '基础属性', priority: 10 },
      { name: 'placeholder', type: 'string', title: '占位提示', group: '基础属性', priority: 11 },
      { name: 'value', type: 'string[]', title: '值', group: '基础属性', priority: 12 },
      { name: 'multiple', type: 'boolean', title: '多选', group: '基础属性', priority: 13 },
      { name: 'allowClear', type: 'boolean', title: '允许清除', group: '基础属性', priority: 14 },
      { name: 'showSearch', type: 'boolean', title: '可搜索', group: '高级属性', priority: 20 },
      { name: 'changeOnSelect', type: 'boolean', title: '选中即改变', group: '高级属性', priority: 21 },
    ],
  },
  checkbox: {
    antdImport: 'Checkbox',
    propName: 'Checkbox',
    name: '多选',
    category: 'data-entry',
    props: [
      { name: 'checked', type: 'boolean', title: '选中', group: '基础属性', priority: 10 },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 11 },
      { name: 'indeterminate', type: 'boolean', title: '半选', group: '基础属性', priority: 12 },
    ],
  },
  colorpicker: {
    antdImport: 'ColorPicker',
    propName: 'ColorPicker',
    name: '颜色选择',
    category: 'data-entry',
    props: [
      { name: 'value', type: 'string', title: '颜色值', group: '基础属性', priority: 10 },
      { name: 'defaultValue', type: 'string', title: '默认颜色', group: '基础属性', priority: 11 },
      { name: 'showText', type: 'boolean', title: '显示文字', group: '基础属性', priority: 12 },
      { name: 'size', type: 'string', title: '尺寸', group: '基础属性', priority: 13, enum: ['large', 'middle', 'small'] },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 14 },
    ],
  },
  datepicker: {
    antdImport: 'DatePicker',
    propName: 'DatePicker',
    name: '日期选择',
    category: 'data-entry',
    props: [
      { name: 'placeholder', type: 'string', title: '占位提示', group: '基础属性', priority: 10 },
      { name: 'format', type: 'string', title: '日期格式', group: '基础属性', priority: 11 },
      { name: 'showTime', type: 'boolean', title: '显示时间', group: '高级属性', priority: 20 },
      { name: 'allowClear', type: 'boolean', title: '允许清除', group: '基础属性', priority: 12 },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 13 },
      { name: 'size', type: 'string', title: '尺寸', group: '基础属性', priority: 14, enum: ['large', 'middle', 'small'] },
    ],
  },
  form: {
    antdImport: 'Form',
    propName: 'Form',
    name: '表单',
    category: 'data-entry',
    props: [
      { name: 'layout', type: 'string', title: '布局', group: '基础属性', priority: 10, enum: ['horizontal', 'vertical', 'inline'] },
      { name: 'labelCol', type: 'object', title: '标签列宽', group: '基础属性', priority: 11 },
      { name: 'wrapperCol', type: 'object', title: '内容列宽', group: '基础属性', priority: 12 },
      { name: 'labelAlign', type: 'string', title: '标签对齐', group: '基础属性', priority: 13, enum: ['left', 'right'] },
      { name: 'colon', type: 'boolean', title: '冒号', group: '基础属性', priority: 14 },
      { name: 'requiredMark', type: 'boolean', title: '必填标记', group: '基础属性', priority: 15 },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 16 },
    ],
  },
  input: {
    antdImport: 'Input',
    propName: 'Input',
    name: '输入框',
    category: 'data-entry',
    props: [
      { name: 'placeholder', type: 'string', title: '占位提示', group: '基础属性', priority: 10 },
      { name: 'maxLength', type: 'number', title: '最大长度', group: '基础属性', priority: 11 },
      { name: 'allowClear', type: 'boolean', title: '允许清除', group: '基础属性', priority: 12 },
      { name: 'showCount', type: 'boolean', title: '显示字数', group: '基础属性', priority: 13 },
      { name: 'prefix', type: 'React.ReactNode', title: '前缀', group: '高级属性', priority: 20 },
      { name: 'suffix', type: 'React.ReactNode', title: '后缀', group: '高级属性', priority: 21 },
      { name: 'addonBefore', type: 'React.ReactNode', title: '前置标签', group: '高级属性', priority: 22 },
      { name: 'addonAfter', type: 'React.ReactNode', title: '后置标签', group: '高级属性', priority: 23 },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 14 },
      { name: 'readOnly', type: 'boolean', title: '只读', group: '基础属性', priority: 15 },
    ],
  },
  textarea: {
    antdImport: 'Input.TextArea',
    propName: 'TextArea',
    name: '文本域',
    category: 'data-entry',
    props: [
      { name: 'placeholder', type: 'string', title: '占位提示', group: '基础属性', priority: 10 },
      { name: 'maxLength', type: 'number', title: '最大长度', group: '基础属性', priority: 11 },
      { name: 'rows', type: 'number', title: '行数', group: '基础属性', priority: 12 },
      { name: 'autoSize', type: 'boolean | { minRows?: number; maxRows?: number }', title: '自适应高度', group: '高级属性', priority: 20 },
      { name: 'showCount', type: 'boolean', title: '显示字数', group: '基础属性', priority: 13 },
      { name: 'allowClear', type: 'boolean', title: '允许清除', group: '基础属性', priority: 14 },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 15 },
      { name: 'readOnly', type: 'boolean', title: '只读', group: '基础属性', priority: 16 },
    ],
  },
  number: {
    antdImport: 'InputNumber',
    propName: 'InputNumber',
    name: '数字输入',
    category: 'data-entry',
    props: [
      { name: 'min', type: 'number', title: '最小值', group: '基础属性', priority: 10 },
      { name: 'max', type: 'number', title: '最大值', group: '基础属性', priority: 11 },
      { name: 'step', type: 'number', title: '步长', group: '基础属性', priority: 12 },
      { name: 'precision', type: 'number', title: '精度', group: '基础属性', priority: 13 },
      { name: 'prefix', type: 'React.ReactNode', title: '前缀', group: '高级属性', priority: 20 },
      { name: 'suffix', type: 'React.ReactNode', title: '后缀', group: '高级属性', priority: 21 },
      { name: 'addonBefore', type: 'React.ReactNode', title: '前置标签', group: '高级属性', priority: 22 },
      { name: 'addonAfter', type: 'React.ReactNode', title: '后置标签', group: '高级属性', priority: 23 },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 14 },
      { name: 'controls', type: 'boolean', title: '显示按钮', group: '基础属性', priority: 15 },
    ],
  },
  mentions: {
    antdImport: 'Mentions',
    propName: 'Mentions',
    name: '提及',
    category: 'data-entry',
    props: [
      { name: 'options', type: 'Option[]', title: '选项数据', group: '基础属性', priority: 10 },
      { name: 'placeholder', type: 'string', title: '占位提示', group: '基础属性', priority: 11 },
      { name: 'value', type: 'string', title: '值', group: '基础属性', priority: 12 },
      { name: 'prefix', type: 'string | string[]', title: '触发前缀', group: '基础属性', priority: 13 },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 14 },
      { name: 'rows', type: 'number', title: '行数', group: '基础属性', priority: 15 },
    ],
  },
  radio: {
    antdImport: 'Radio',
    propName: 'Radio',
    name: '单选',
    category: 'data-entry',
    props: [
      { name: 'checked', type: 'boolean', title: '选中', group: '基础属性', priority: 10 },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 11 },
    ],
  },
  rate: {
    antdImport: 'Rate',
    propName: 'Rate',
    name: '评分',
    category: 'data-entry',
    props: [
      { name: 'value', type: 'number', title: '值', group: '基础属性', priority: 10 },
      { name: 'count', type: 'number', title: '总数', group: '基础属性', priority: 11 },
      { name: 'allowHalf', type: 'boolean', title: '允许半选', group: '基础属性', priority: 12 },
      { name: 'allowClear', type: 'boolean', title: '允许清除', group: '基础属性', priority: 13 },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 14 },
      { name: 'character', type: 'React.ReactNode', title: '自定义字符', group: '高级属性', priority: 20 },
    ],
  },
  select: {
    antdImport: 'Select',
    propName: 'Select',
    name: '选择器',
    category: 'data-entry',
    props: [
      { name: 'options', type: 'Option[]', title: '选项数据', group: '基础属性', priority: 10 },
      { name: 'placeholder', type: 'string', title: '占位提示', group: '基础属性', priority: 11 },
      { name: 'mode', type: 'string', title: '模式', group: '基础属性', priority: 12, enum: ['multiple', 'tags'] },
      { name: 'allowClear', type: 'boolean', title: '允许清除', group: '基础属性', priority: 13 },
      { name: 'showSearch', type: 'boolean', title: '可搜索', group: '基础属性', priority: 14 },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 15 },
      { name: 'size', type: 'string', title: '尺寸', group: '基础属性', priority: 16, enum: ['large', 'middle', 'small'] },
    ],
  },
  slider: {
    antdImport: 'Slider',
    propName: 'Slider',
    name: '滑动条',
    category: 'data-entry',
    props: [
      { name: 'min', type: 'number', title: '最小值', group: '基础属性', priority: 10 },
      { name: 'max', type: 'number', title: '最大值', group: '基础属性', priority: 11 },
      { name: 'step', type: 'number', title: '步长', group: '基础属性', priority: 12 },
      { name: 'value', type: 'number | [number, number]', title: '值', group: '基础属性', priority: 13 },
      { name: 'range', type: 'boolean', title: '双滑块', group: '基础属性', priority: 14 },
      { name: 'vertical', type: 'boolean', title: '垂直', group: '基础属性', priority: 15 },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 16 },
      { name: 'marks', type: 'Record<number, string>', title: '刻度标记', group: '高级属性', priority: 20 },
    ],
  },
  switch: {
    antdImport: 'Switch',
    propName: 'Switch',
    name: '开关',
    category: 'data-entry',
    props: [
      { name: 'checked', type: 'boolean', title: '选中', group: '基础属性', priority: 10 },
      { name: 'checkedChildren', type: 'React.ReactNode', title: '选中文案', group: '基础属性', priority: 11 },
      { name: 'unCheckedChildren', type: 'React.ReactNode', title: '非选中文案', group: '基础属性', priority: 12 },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 13 },
      { name: 'size', type: 'string', title: '尺寸', group: '基础属性', priority: 14, enum: ['default', 'small'] },
      { name: 'loading', type: 'boolean', title: '加载中', group: '高级属性', priority: 20 },
    ],
  },
  timepicker: {
    antdImport: 'TimePicker',
    propName: 'TimePicker',
    name: '时间选择',
    category: 'data-entry',
    props: [
      { name: 'placeholder', type: 'string', title: '占位提示', group: '基础属性', priority: 10 },
      { name: 'format', type: 'string', title: '时间格式', group: '基础属性', priority: 11 },
      { name: 'use12Hours', type: 'boolean', title: '12小时制', group: '高级属性', priority: 20 },
      { name: 'allowClear', type: 'boolean', title: '允许清除', group: '基础属性', priority: 12 },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 13 },
      { name: 'size', type: 'string', title: '尺寸', group: '基础属性', priority: 14, enum: ['large', 'middle', 'small'] },
    ],
  },
  transfer: {
    antdImport: 'Transfer',
    propName: 'Transfer',
    name: '穿梭框',
    category: 'data-entry',
    props: [
      { name: 'dataSource', type: 'TransferItem[]', title: '数据源', group: '基础属性', priority: 10 },
      { name: 'titles', type: '[string, string]', title: '标题', group: '基础属性', priority: 11 },
      { name: 'targetKeys', type: 'string[]', title: '目标列表', group: '基础属性', priority: 12 },
      { name: 'showSearch', type: 'boolean', title: '可搜索', group: '基础属性', priority: 13 },
      { name: 'oneWay', type: 'boolean', title: '单向', group: '高级属性', priority: 20 },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 14 },
    ],
  },
  treeselect: {
    antdImport: 'TreeSelect',
    propName: 'TreeSelect',
    name: '树选择',
    category: 'data-entry',
    props: [
      { name: 'treeData', type: 'TreeNode[]', title: '树数据', group: '基础属性', priority: 10 },
      { name: 'placeholder', type: 'string', title: '占位提示', group: '基础属性', priority: 11 },
      { name: 'multiple', type: 'boolean', title: '多选', group: '基础属性', priority: 12 },
      { name: 'treeCheckable', type: 'boolean', title: '可勾选', group: '基础属性', priority: 13 },
      { name: 'allowClear', type: 'boolean', title: '允许清除', group: '基础属性', priority: 14 },
      { name: 'showSearch', type: 'boolean', title: '可搜索', group: '高级属性', priority: 20 },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 15 },
    ],
  },
  upload: {
    antdImport: 'Upload',
    propName: 'Upload',
    name: '上传',
    category: 'data-entry',
    props: [
      { name: 'action', type: 'string | ((file) => Promise<string>)', title: '上传地址', group: '基础属性', priority: 10 },
      { name: 'accept', type: 'string', title: '接受类型', group: '基础属性', priority: 11 },
      { name: 'multiple', type: 'boolean', title: '多选', group: '基础属性', priority: 12 },
      { name: 'maxCount', type: 'number', title: '最大数量', group: '基础属性', priority: 13 },
      { name: 'listType', type: 'string', title: '列表类型', group: '基础属性', priority: 14, enum: ['text', 'picture', 'picture-card'] },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 15 },
      { name: 'drag', type: 'boolean', title: '拖拽上传', group: '高级属性', priority: 20 },
    ],
  },

  // ── 数据展示 ──
  avatar: {
    antdImport: 'Avatar',
    propName: 'Avatar',
    name: '头像',
    category: 'data-display',
    props: [
      { name: 'src', type: 'string', title: '图片地址', group: '基础属性', priority: 10 },
      { name: 'size', type: 'number | string', title: '尺寸', group: '基础属性', priority: 11 },
      { name: 'shape', type: 'string', title: '形状', group: '基础属性', priority: 12, enum: ['circle', 'square'] },
      { name: 'icon', type: 'React.ReactNode', title: '图标', group: '基础属性', priority: 13 },
    ],
  },
  badge: {
    antdImport: 'Badge',
    propName: 'Badge',
    name: '徽标',
    category: 'data-display',
    props: [
      { name: 'count', type: 'number', title: '数量', group: '基础属性', priority: 10 },
      { name: 'dot', type: 'boolean', title: '红点', group: '基础属性', priority: 11 },
      { name: 'showZero', type: 'boolean', title: '显示零', group: '基础属性', priority: 12 },
      { name: 'overflowCount', type: 'number', title: '封顶值', group: '基础属性', priority: 13 },
      { name: 'color', type: 'string', title: '颜色', group: '基础属性', priority: 14 },
      { name: 'size', type: 'string', title: '尺寸', group: '基础属性', priority: 15, enum: ['default', 'small'] },
    ],
  },
  calendar: {
    antdImport: 'Calendar',
    propName: 'Calendar',
    name: '日历',
    category: 'data-display',
    props: [
      { name: 'mode', type: 'string', title: '模式', group: '基础属性', priority: 10, enum: ['month', 'year'] },
      { name: 'fullscreen', type: 'boolean', title: '全屏', group: '基础属性', priority: 11 },
    ],
  },
  card: {
    antdImport: 'Card',
    propName: 'Card',
    name: '卡片',
    category: 'data-display',
    props: [
      { name: 'title', type: 'React.ReactNode', title: '标题', group: '基础属性', priority: 10 },
      { name: 'extra', type: 'React.ReactNode', title: '额外操作', group: '基础属性', priority: 11 },
      { name: 'bordered', type: 'boolean', title: '边框', group: '基础属性', priority: 12 },
      { name: 'hoverable', type: 'boolean', title: '悬浮效果', group: '基础属性', priority: 13 },
      { name: 'loading', type: 'boolean', title: '加载中', group: '基础属性', priority: 14 },
      { name: 'size', type: 'string', title: '尺寸', group: '基础属性', priority: 15, enum: ['default', 'small'] },
      { name: 'type', type: 'string', title: '类型', group: '基础属性', priority: 16, enum: ['inner'] },
    ],
  },
  carousel: {
    antdImport: 'Carousel',
    propName: 'Carousel',
    name: '走马灯',
    category: 'data-display',
    props: [
      { name: 'autoplay', type: 'boolean', title: '自动播放', group: '基础属性', priority: 10 },
      { name: 'dots', type: 'boolean', title: '指示点', group: '基础属性', priority: 11 },
      { name: 'dotPosition', type: 'string', title: '指示点位置', group: '基础属性', priority: 12, enum: ['top', 'bottom', 'left', 'right'] },
      { name: 'effect', type: 'string', title: '动效', group: '基础属性', priority: 13, enum: ['scrollx', 'fade'] },
      { name: 'speed', type: 'number', title: '速度', group: '高级属性', priority: 20 },
    ],
  },
  collapse: {
    antdImport: 'Collapse',
    propName: 'Collapse',
    name: '折叠面板',
    category: 'data-display',
    props: [
      { name: 'items', type: 'CollapseItem[]', title: '面板数据', group: '基础属性', priority: 10 },
      { name: 'accordion', type: 'boolean', title: '手风琴', group: '基础属性', priority: 11 },
      { name: 'ghost', type: 'boolean', title: '幽灵模式', group: '基础属性', priority: 12 },
      { name: 'bordered', type: 'boolean', title: '边框', group: '基础属性', priority: 13 },
      { name: 'expandIconPosition', type: 'string', title: '图标位置', group: '基础属性', priority: 14, enum: ['left', 'right'] },
    ],
  },
  descriptions: {
    antdImport: 'Descriptions',
    propName: 'Descriptions',
    name: '描述列表',
    category: 'data-display',
    props: [
      { name: 'items', type: 'DescriptionsItem[]', title: '数据项', group: '基础属性', priority: 10 },
      { name: 'column', type: 'number', title: '列数', group: '基础属性', priority: 11 },
      { name: 'bordered', type: 'boolean', title: '边框', group: '基础属性', priority: 12 },
      { name: 'layout', type: 'string', title: '布局', group: '基础属性', priority: 13, enum: ['horizontal', 'vertical'] },
      { name: 'size', type: 'string', title: '尺寸', group: '基础属性', priority: 14, enum: ['default', 'middle', 'small'] },
      { name: 'title', type: 'React.ReactNode', title: '标题', group: '基础属性', priority: 15 },
    ],
  },
  empty: {
    antdImport: 'Empty',
    propName: 'Empty',
    name: '空状态',
    category: 'data-display',
    props: [
      { name: 'description', type: 'React.ReactNode', title: '描述', group: '基础属性', priority: 10 },
      { name: 'image', type: 'React.ReactNode', title: '图片', group: '基础属性', priority: 11 },
      { name: 'imageStyle', type: 'React.CSSProperties', title: '图片样式', group: '高级属性', priority: 20 },
    ],
  },
  image: {
    antdImport: 'Image',
    propName: 'Image',
    name: '图片',
    category: 'data-display',
    props: [
      { name: 'src', type: 'string', title: '图片地址', group: '基础属性', priority: 10 },
      { name: 'alt', type: 'string', title: '替代文本', group: '基础属性', priority: 11 },
      { name: 'width', type: 'number', title: '宽度', group: '基础属性', priority: 12 },
      { name: 'height', type: 'number', title: '高度', group: '基础属性', priority: 13 },
      { name: 'preview', type: 'boolean', title: '预览', group: '基础属性', priority: 14 },
      { name: 'fallback', type: 'string', title: '兜底图', group: '高级属性', priority: 20 },
    ],
  },
  list: {
    antdImport: 'List',
    propName: 'List',
    name: '列表',
    category: 'data-display',
    props: [
      { name: 'dataSource', type: 'any[]', title: '数据源', group: '基础属性', priority: 10 },
      { name: 'loading', type: 'boolean', title: '加载中', group: '基础属性', priority: 11 },
      { name: 'bordered', type: 'boolean', title: '边框', group: '基础属性', priority: 12 },
      { name: 'split', type: 'boolean', title: '分割线', group: '基础属性', priority: 13 },
      { name: 'size', type: 'string', title: '尺寸', group: '基础属性', priority: 14, enum: ['default', 'large', 'small'] },
      { name: 'header', type: 'React.ReactNode', title: '头部', group: '高级属性', priority: 20 },
      { name: 'footer', type: 'React.ReactNode', title: '底部', group: '高级属性', priority: 21 },
      { name: 'pagination', type: 'object', title: '分页', group: '高级属性', priority: 22 },
    ],
  },
  popover: {
    antdImport: 'Popover',
    propName: 'Popover',
    name: '气泡卡片',
    category: 'data-display',
    props: [
      { name: 'title', type: 'React.ReactNode', title: '标题', group: '基础属性', priority: 10 },
      { name: 'content', type: 'React.ReactNode', title: '内容', group: '基础属性', priority: 11 },
      { name: 'placement', type: 'string', title: '位置', group: '基础属性', priority: 12, enum: ['top', 'left', 'right', 'bottom', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'leftTop', 'leftBottom', 'rightTop', 'rightBottom'] },
      { name: 'trigger', type: 'string', title: '触发方式', group: '基础属性', priority: 13, enum: ['hover', 'focus', 'click', 'contextMenu'] },
      { name: 'arrow', type: 'boolean', title: '箭头', group: '基础属性', priority: 14 },
    ],
  },
  qrcode: {
    antdImport: 'QRCode',
    propName: 'QRCode',
    name: '二维码',
    category: 'data-display',
    props: [
      { name: 'value', type: 'string', title: '值', group: '基础属性', priority: 10 },
      { name: 'size', type: 'number', title: '尺寸', group: '基础属性', priority: 11 },
      { name: 'icon', type: 'string', title: '图标', group: '高级属性', priority: 20 },
      { name: 'color', type: 'string', title: '颜色', group: '高级属性', priority: 21 },
      { name: 'bgColor', type: 'string', title: '背景色', group: '高级属性', priority: 22 },
      { name: 'status', type: 'string', title: '状态', group: '基础属性', priority: 12, enum: ['active', 'expired', 'loading', 'scanned'] },
    ],
  },
  segmented: {
    antdImport: 'Segmented',
    propName: 'Segmented',
    name: '分段器',
    category: 'data-display',
    props: [
      { name: 'options', type: 'SegmentedOption[]', title: '选项', group: '基础属性', priority: 10 },
      { name: 'value', type: 'string | number', title: '值', group: '基础属性', priority: 11 },
      { name: 'block', type: 'boolean', title: '撑满', group: '基础属性', priority: 12 },
      { name: 'size', type: 'string', title: '尺寸', group: '基础属性', priority: 13, enum: ['large', 'middle', 'small'] },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 14 },
    ],
  },
  statistic: {
    antdImport: 'Statistic',
    propName: 'Statistic',
    name: '统计数值',
    category: 'data-display',
    props: [
      { name: 'title', type: 'React.ReactNode', title: '标题', group: '基础属性', priority: 10 },
      { name: 'value', type: 'number | string', title: '数值', group: '基础属性', priority: 11 },
      { name: 'prefix', type: 'React.ReactNode', title: '前缀', group: '基础属性', priority: 12 },
      { name: 'suffix', type: 'React.ReactNode', title: '后缀', group: '基础属性', priority: 13 },
      { name: 'precision', type: 'number', title: '精度', group: '基础属性', priority: 14 },
      { name: 'valueStyle', type: 'React.CSSProperties', title: '数值样式', group: '高级属性', priority: 20 },
      { name: 'groupSeparator', type: 'string', title: '千分符', group: '高级属性', priority: 21 },
    ],
  },
  table: {
    antdImport: 'Table',
    propName: 'Table',
    name: '表格',
    category: 'data-display',
    props: [
      { name: 'dataSource', type: 'any[]', title: '数据源', group: '基础属性', priority: 10 },
      { name: 'columns', type: 'ColumnType[]', title: '列配置', group: '基础属性', priority: 11 },
      { name: 'bordered', type: 'boolean', title: '边框', group: '基础属性', priority: 12 },
      { name: 'loading', type: 'boolean', title: '加载中', group: '基础属性', priority: 13 },
      { name: 'size', type: 'string', title: '尺寸', group: '基础属性', priority: 14, enum: ['large', 'middle', 'small'] },
      { name: 'pagination', type: 'object | false', title: '分页', group: '高级属性', priority: 20 },
      { name: 'scroll', type: '{ x?: number; y?: number }', title: '滚动', group: '高级属性', priority: 21 },
      { name: 'rowSelection', type: 'object', title: '行选择', group: '高级属性', priority: 22 },
    ],
  },
  tag: {
    antdImport: 'Tag',
    propName: 'Tag',
    name: '标签',
    category: 'data-display',
    props: [
      { name: 'color', type: 'string', title: '颜色', group: '基础属性', priority: 10 },
      { name: 'closable', type: 'boolean', title: '可关闭', group: '基础属性', priority: 11 },
      { name: 'icon', type: 'React.ReactNode', title: '图标', group: '基础属性', priority: 12 },
      { name: 'bordered', type: 'boolean', title: '边框', group: '基础属性', priority: 13 },
    ],
  },
  timeline: {
    antdImport: 'Timeline',
    propName: 'Timeline',
    name: '时间轴',
    category: 'data-display',
    props: [
      { name: 'items', type: 'TimelineItem[]', title: '数据项', group: '基础属性', priority: 10 },
      { name: 'mode', type: 'string', title: '模式', group: '基础属性', priority: 11, enum: ['left', 'alternate', 'right'] },
      { name: 'pending', type: 'boolean | React.ReactNode', title: '加载中', group: '高级属性', priority: 20 },
      { name: 'reverse', type: 'boolean', title: '反向', group: '高级属性', priority: 21 },
    ],
  },
  tooltip: {
    antdImport: 'Tooltip',
    propName: 'Tooltip',
    name: '文字提示',
    category: 'data-display',
    props: [
      { name: 'title', type: 'React.ReactNode', title: '提示内容', group: '基础属性', priority: 10 },
      { name: 'placement', type: 'string', title: '位置', group: '基础属性', priority: 11, enum: ['top', 'left', 'right', 'bottom', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'leftTop', 'leftBottom', 'rightTop', 'rightBottom'] },
      { name: 'color', type: 'string', title: '颜色', group: '基础属性', priority: 12 },
      { name: 'arrow', type: 'boolean', title: '箭头', group: '基础属性', priority: 13 },
    ],
  },
  tour: {
    antdImport: 'Tour',
    propName: 'Tour',
    name: '漫游引导',
    category: 'data-display',
    props: [
      { name: 'steps', type: 'TourStep[]', title: '步骤', group: '基础属性', priority: 10 },
      { name: 'current', type: 'number', title: '当前步骤', group: '基础属性', priority: 11 },
      { name: 'type', type: 'string', title: '类型', group: '基础属性', priority: 12, enum: ['default', 'primary'] },
      { name: 'mask', type: 'boolean', title: '遮罩', group: '基础属性', priority: 13 },
      { name: 'arrow', type: 'boolean', title: '箭头', group: '基础属性', priority: 14 },
    ],
  },
  tree: {
    antdImport: 'Tree',
    propName: 'Tree',
    name: '树形控件',
    category: 'data-display',
    props: [
      { name: 'treeData', type: 'TreeNode[]', title: '树数据', group: '基础属性', priority: 10 },
      { name: 'checkable', type: 'boolean', title: '可勾选', group: '基础属性', priority: 11 },
      { name: 'draggable', type: 'boolean', title: '可拖拽', group: '基础属性', priority: 12 },
      { name: 'showLine', type: 'boolean', title: '连接线', group: '基础属性', priority: 13 },
      { name: 'defaultExpandAll', type: 'boolean', title: '默认展开', group: '基础属性', priority: 14 },
      { name: 'multiple', type: 'boolean', title: '多选', group: '基础属性', priority: 15 },
      { name: 'disabled', type: 'boolean', title: '禁用', group: '基础属性', priority: 16 },
    ],
  },

  // ── 反馈 ──
  alert: {
    antdImport: 'Alert',
    propName: 'Alert',
    name: '警告提示',
    category: 'feedback',
    props: [
      { name: 'message', type: 'React.ReactNode', title: '提示内容', group: '基础属性', priority: 10 },
      { name: 'description', type: 'React.ReactNode', title: '描述', group: '基础属性', priority: 11 },
      { name: 'type', type: 'string', title: '类型', group: '基础属性', priority: 12, enum: ['success', 'info', 'warning', 'error'] },
      { name: 'showIcon', type: 'boolean', title: '显示图标', group: '基础属性', priority: 13 },
      { name: 'closable', type: 'boolean', title: '可关闭', group: '基础属性', priority: 14 },
      { name: 'banner', type: 'boolean', title: '横幅', group: '高级属性', priority: 20 },
    ],
  },
  drawer: {
    antdImport: 'Drawer',
    propName: 'Drawer',
    name: '抽屉',
    category: 'feedback',
    props: [
      { name: 'title', type: 'React.ReactNode', title: '标题', group: '基础属性', priority: 10 },
      { name: 'open', type: 'boolean', title: '打开', group: '基础属性', priority: 11 },
      { name: 'placement', type: 'string', title: '位置', group: '基础属性', priority: 12, enum: ['top', 'right', 'bottom', 'left'] },
      { name: 'width', type: 'number | string', title: '宽度', group: '基础属性', priority: 13 },
      { name: 'height', type: 'number | string', title: '高度', group: '基础属性', priority: 14 },
      { name: 'closable', type: 'boolean', title: '可关闭', group: '基础属性', priority: 15 },
      { name: 'mask', type: 'boolean', title: '遮罩', group: '基础属性', priority: 16 },
      { name: 'footer', type: 'React.ReactNode', title: '底部', group: '高级属性', priority: 20 },
      { name: 'loading', type: 'boolean', title: '加载中', group: '高级属性', priority: 21 },
    ],
  },
  modal: {
    antdImport: 'Modal',
    propName: 'Modal',
    name: '对话框',
    category: 'feedback',
    props: [
      { name: 'title', type: 'React.ReactNode', title: '标题', group: '基础属性', priority: 10 },
      { name: 'open', type: 'boolean', title: '打开', group: '基础属性', priority: 11 },
      { name: 'width', type: 'number | string', title: '宽度', group: '基础属性', priority: 12 },
      { name: 'centered', type: 'boolean', title: '居中', group: '基础属性', priority: 13 },
      { name: 'closable', type: 'boolean', title: '可关闭', group: '基础属性', priority: 14 },
      { name: 'mask', type: 'boolean', title: '遮罩', group: '基础属性', priority: 15 },
      { name: 'maskClosable', type: 'boolean', title: '点击遮罩关闭', group: '基础属性', priority: 16 },
      { name: 'footer', type: 'React.ReactNode', title: '底部', group: '高级属性', priority: 20 },
      { name: 'okText', type: 'string', title: '确认文案', group: '高级属性', priority: 21 },
      { name: 'cancelText', type: 'string', title: '取消文案', group: '高级属性', priority: 22 },
      { name: 'confirmLoading', type: 'boolean', title: '确认加载', group: '高级属性', priority: 23 },
      { name: 'destroyOnClose', type: 'boolean', title: '关闭销毁', group: '高级属性', priority: 24 },
    ],
  },
  popconfirm: {
    antdImport: 'Popconfirm',
    propName: 'Popconfirm',
    name: '气泡确认',
    category: 'feedback',
    props: [
      { name: 'title', type: 'React.ReactNode', title: '标题', group: '基础属性', priority: 10 },
      { name: 'description', type: 'React.ReactNode', title: '描述', group: '基础属性', priority: 11 },
      { name: 'okText', type: 'string', title: '确认文案', group: '基础属性', priority: 12 },
      { name: 'cancelText', type: 'string', title: '取消文案', group: '基础属性', priority: 13 },
      { name: 'placement', type: 'string', title: '位置', group: '基础属性', priority: 14, enum: ['top', 'left', 'right', 'bottom', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight'] },
      { name: 'okType', type: 'string', title: '确认类型', group: '高级属性', priority: 20, enum: ['primary', 'default', 'dashed', 'text', 'link'] },
    ],
  },
  progress: {
    antdImport: 'Progress',
    propName: 'Progress',
    name: '进度条',
    category: 'feedback',
    props: [
      { name: 'percent', type: 'number', title: '百分比', group: '基础属性', priority: 10 },
      { name: 'type', type: 'string', title: '类型', group: '基础属性', priority: 11, enum: ['line', 'circle', 'dashboard'] },
      { name: 'status', type: 'string', title: '状态', group: '基础属性', priority: 12, enum: ['success', 'exception', 'normal', 'active'] },
      { name: 'showInfo', type: 'boolean', title: '显示信息', group: '基础属性', priority: 13 },
      { name: 'strokeColor', type: 'string', title: '颜色', group: '高级属性', priority: 20 },
      { name: 'trailColor', type: 'string', title: '轨道颜色', group: '高级属性', priority: 21 },
      { name: 'size', type: 'number | [number, number]', title: '尺寸', group: '高级属性', priority: 22 },
    ],
  },
  result: {
    antdImport: 'Result',
    propName: 'Result',
    name: '结果',
    category: 'feedback',
    props: [
      { name: 'status', type: 'string', title: '状态', group: '基础属性', priority: 10, enum: ['success', 'error', 'info', 'warning', '404', '403', '500'] },
      { name: 'title', type: 'React.ReactNode', title: '标题', group: '基础属性', priority: 11 },
      { name: 'subTitle', type: 'React.ReactNode', title: '副标题', group: '基础属性', priority: 12 },
      { name: 'extra', type: 'React.ReactNode', title: '额外内容', group: '高级属性', priority: 20 },
      { name: 'icon', type: 'React.ReactNode', title: '图标', group: '高级属性', priority: 21 },
    ],
  },
  skeleton: {
    antdImport: 'Skeleton',
    propName: 'Skeleton',
    name: '骨架屏',
    category: 'feedback',
    props: [
      { name: 'active', type: 'boolean', title: '动画', group: '基础属性', priority: 10 },
      { name: 'loading', type: 'boolean', title: '加载中', group: '基础属性', priority: 11 },
      { name: 'avatar', type: 'boolean | object', title: '头像', group: '基础属性', priority: 12 },
      { name: 'title', type: 'boolean | object', title: '标题', group: '基础属性', priority: 13 },
      { name: 'paragraph', type: 'boolean | object', title: '段落', group: '基础属性', priority: 14 },
      { name: 'round', type: 'boolean', title: '圆角', group: '高级属性', priority: 20 },
    ],
  },
  spin: {
    antdImport: 'Spin',
    propName: 'Spin',
    name: '加载中',
    category: 'feedback',
    props: [
      { name: 'spinning', type: 'boolean', title: '加载中', group: '基础属性', priority: 10 },
      { name: 'size', type: 'string', title: '尺寸', group: '基础属性', priority: 11, enum: ['small', 'default', 'large'] },
      { name: 'tip', type: 'string', title: '提示', group: '基础属性', priority: 12 },
      { name: 'delay', type: 'number', title: '延迟', group: '高级属性', priority: 20 },
      { name: 'indicator', type: 'React.ReactNode', title: '指示器', group: '高级属性', priority: 21 },
    ],
  },
  watermark: {
    antdImport: 'Watermark',
    propName: 'Watermark',
    name: '水印',
    category: 'feedback',
    props: [
      { name: 'content', type: 'string | string[]', title: '文字', group: '基础属性', priority: 10 },
      { name: 'font', type: 'object', title: '字体', group: '高级属性', priority: 20 },
      { name: 'rotate', type: 'number', title: '旋转', group: '高级属性', priority: 21 },
      { name: 'zIndex', type: 'number', title: '层级', group: '高级属性', priority: 22 },
      { name: 'image', type: 'string', title: '图片', group: '高级属性', priority: 23 },
    ],
  },

  // ── 通用（补充） ──
  floatbutton: {
    antdImport: 'FloatButton',
    propName: 'FloatButton',
    name: '悬浮按钮',
    category: 'general',
    props: [
      { name: 'icon', type: 'React.ReactNode', title: '图标', group: '基础属性', priority: 10 },
      { name: 'description', type: 'React.ReactNode', title: '描述', group: '基础属性', priority: 11 },
      { name: 'type', type: 'string', title: '类型', group: '基础属性', priority: 12, enum: ['default', 'primary'] },
      { name: 'shape', type: 'string', title: '形状', group: '基础属性', priority: 13, enum: ['circle', 'square'] },
      { name: 'tooltip', type: 'string | React.ReactNode', title: '提示', group: '高级属性', priority: 20 },
      { name: 'badge', type: 'object', title: '徽标', group: '高级属性', priority: 21 },
    ],
  },
  affix: {
    antdImport: 'Affix',
    propName: 'Affix',
    name: '固钉',
    category: 'general',
    props: [
      { name: 'offsetTop', type: 'number', title: '偏移顶部', group: '基础属性', priority: 10 },
      { name: 'offsetBottom', type: 'number', title: '偏移底部', group: '基础属性', priority: 11 },
      { name: 'target', type: '() => HTMLElement', title: '目标容器', group: '高级属性', priority: 20 },
    ],
  },
};

// 生成 component.tsx
function generateComponentTsx(compName: string, config: typeof COMPONENTS[string]): string {
  const importPath = config.antdImport.includes('.')
    ? `antd` // Layout.Sider 等子组件
    : 'antd';

  const importName = config.antdImport.includes('.')
    ? config.antdImport.split('.')[0]
    : config.antdImport;

  const accessPath = config.antdImport.includes('.')
    ? config.antdImport
    : config.antdImport;

  return `/**
 * ${config.name} 组件 — withPlatform 包装
 *
 * 提供设计态能力（拖拽、选中、overlay 定位）
 * 和运行时平台能力（field/events/linkage）。
 */
import { ${importName} } from 'antd';
import { withPlatform } from '../../../components/platform';

/** ${config.name} 平台组件（设计态 + 运行时） */
export const Platform${config.propName} = withPlatform(${accessPath});
`;
}

// 生成 schema.ts
function generateSchemaTsx(compName: string, config: typeof COMPONENTS[string]): string {
  const propsLines = config.props.map((p) => {
    const enumLine = p.enum ? `   * @enum ${JSON.stringify(p.enum)}` : '';
    return `  /**
   * ${p.title}
   * @group ${p.group}
   * @priority ${p.priority}
${enumLine}
   */
  ${p.name}${p.required ? '' : '?'}: ${p.type};`;
  }).join('\n\n');

  return `/**
 * ${config.name} 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** ${config.name} 组件属性 */
export interface ${config.propName}Props extends BaseProps {
${propsLines}
}
`;
}

// 生成 index.ts
function generateIndexTs(compName: string, config: typeof COMPONENTS[string]): string {
  return `/**
 * ${config.name} 组件 — 统一导出
 *
 * 目录结构：
 * - component.tsx  — withPlatform 包装
 * - schema.ts      — Props 接口定义（JSDoc 含 x-group/x-priority/中文标题）
 * - ${compName}.json    — 从 TS 类型自动生成的 JSON Schema
 */
export { Platform${config.propName} } from './component';
export type { ${config.propName}Props } from './schema';
`;
}

// 生成 JSON Schema
function generateJsonSchema(compName: string, config: typeof COMPONENTS[string]): object {
  const properties: Record<string, any> = {};

  // BaseProps
  properties.name = { type: 'string', title: '字段名称', 'x-group': '基础属性', 'x-priority': 0 };
  properties.label = { type: 'string', title: '字段标签', 'x-group': '基础属性', 'x-priority': 1 };
  properties.visible = { type: 'boolean', title: '是否可见', 'x-group': '基础属性', 'x-priority': 2 };
  properties.style = { type: 'object', title: '内联样式', 'x-group': '样式', 'x-priority': 50 };

  // Component props
  for (const prop of config.props) {
    const propSchema: Record<string, any> = {
      title: prop.title,
      'x-group': prop.group,
      'x-priority': prop.priority,
    };

    // 推断 type
    if (prop.type === 'boolean') {
      propSchema.type = 'boolean';
    } else if (prop.type === 'number') {
      propSchema.type = 'number';
    } else if (prop.type === 'string') {
      propSchema.type = 'string';
    }

    if (prop.enum) {
      propSchema.enum = prop.enum;
    }

    properties[prop.name] = propSchema;
  }

  return { type: 'object', properties };
}

// ─── 执行 ──────────────────────────────────────────────

console.log('批量创建组件目录...\n');

let created = 0;
let skipped = 0;

for (const [compName, config] of Object.entries(COMPONENTS)) {
  const compDir = path.join(ANTD_DIR, compName);

  // 跳过已存在的目录（button 已创建）
  if (fs.existsSync(compDir)) {
    console.log(`  ⏭ ${compName} (已存在)`);
    skipped++;
    continue;
  }

  fs.mkdirSync(compDir, { recursive: true });

  // component.tsx
  fs.writeFileSync(
    path.join(compDir, 'component.tsx'),
    generateComponentTsx(compName, config),
    'utf-8',
  );

  // schema.ts
  fs.writeFileSync(
    path.join(compDir, 'schema.ts'),
    generateSchemaTsx(compName, config),
    'utf-8',
  );

  // index.ts
  fs.writeFileSync(
    path.join(compDir, 'index.ts'),
    generateIndexTs(compName, config),
    'utf-8',
  );

  // JSON Schema
  fs.writeFileSync(
    path.join(compDir, `${compName}.json`),
    JSON.stringify(generateJsonSchema(compName, config), null, 2),
    'utf-8',
  );

  console.log(`  ✅ ${compName} → ${config.name}`);
  created++;
}

console.log(`\n完成：创建 ${created} 个，跳过 ${skipped} 个`);
