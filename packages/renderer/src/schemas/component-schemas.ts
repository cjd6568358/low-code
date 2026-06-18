import type { JSONSchema7 } from '@low-code/shared';

/**
 * 组件属性 JSON Schema 定义
 *
 * 严格按文档要求：
 * - 每个组件的 propsSchema 包含完整的可配置属性
 * - x-group: 字段分组（基础属性/高级属性/样式/事件/校验规则）
 * - x-priority: 排序权重（数字越小越靠前）
 * - x-component: 自定义控件
 * - x-dictionary: 字典引用
 * - x-placeholder: 占位提示
 */

// ==================== 基础组件 ====================

export const InputPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    placeholder: { type: 'string', title: '占位提示', 'x-group': '基础属性', 'x-priority': 1, 'x-placeholder': '请输入' },
    maxLength: { type: 'number', title: '最大长度', 'x-group': '基础属性', 'x-priority': 2, minimum: 0 },
    allowClear: { type: 'boolean', title: '允许清除', 'x-group': '基础属性', 'x-priority': 3 },
    readOnly: { type: 'boolean', title: '只读', 'x-group': '基础属性', 'x-priority': 4 },
    type: {
      type: 'string', title: '输入类型', 'x-group': '基础属性', 'x-priority': 5,
      enum: ['text', 'password', 'email', 'url', 'tel', 'search', 'number'],
    },
    showCount: { type: 'boolean', title: '显示字数', 'x-group': '基础属性', 'x-priority': 6 },
    prefix: { type: 'string', title: '前缀', 'x-group': '高级属性', 'x-priority': 10 },
    suffix: { type: 'string', title: '后缀', 'x-group': '高级属性', 'x-priority': 11 },
    addonBefore: { type: 'string', title: '前置标签', 'x-group': '高级属性', 'x-priority': 12 },
    addonAfter: { type: 'string', title: '后置标签', 'x-group': '高级属性', 'x-priority': 13 },
    size: { type: 'string', title: '尺寸', 'x-group': '样式', 'x-priority': 20, enum: ['small', 'middle', 'large'] },
    variant: { type: 'string', title: '变体', 'x-group': '样式', 'x-priority': 21, enum: ['outlined', 'filled', 'borderless'] },
    status: { type: 'string', title: '状态', 'x-group': '样式', 'x-priority': 22, enum: ['error', 'warning'] },
  },
};

export const TextareaPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    placeholder: { type: 'string', title: '占位提示', 'x-group': '基础属性', 'x-priority': 1 },
    maxLength: { type: 'number', title: '最大长度', 'x-group': '基础属性', 'x-priority': 2, minimum: 0 },
    rows: { type: 'number', title: '行数', 'x-group': '基础属性', 'x-priority': 3, minimum: 1 },
    allowClear: { type: 'boolean', title: '允许清除', 'x-group': '基础属性', 'x-priority': 4 },
    readOnly: { type: 'boolean', title: '只读', 'x-group': '基础属性', 'x-priority': 5 },
    autoSize: { type: 'boolean', title: '自适应高度', 'x-group': '高级属性', 'x-priority': 10 },
    showCount: { type: 'boolean', title: '显示字数', 'x-group': '高级属性', 'x-priority': 11 },
    size: { type: 'string', title: '尺寸', 'x-group': '样式', 'x-priority': 20, enum: ['small', 'middle', 'large'] },
    variant: { type: 'string', title: '变体', 'x-group': '样式', 'x-priority': 21, enum: ['outlined', 'filled', 'borderless'] },
  },
};

export const NumberPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    placeholder: { type: 'string', title: '占位提示', 'x-group': '基础属性', 'x-priority': 1 },
    min: { type: 'number', title: '最小值', 'x-group': '基础属性', 'x-priority': 2 },
    max: { type: 'number', title: '最大值', 'x-group': '基础属性', 'x-priority': 3 },
    step: { type: 'number', title: '步长', 'x-group': '基础属性', 'x-priority': 4 },
    precision: { type: 'number', title: '精度', 'x-group': '基础属性', 'x-priority': 5, minimum: 0 },
    controls: { type: 'boolean', title: '显示控制按钮', 'x-group': '基础属性', 'x-priority': 6 },
    keyboard: { type: 'boolean', title: '键盘快捷键', 'x-group': '高级属性', 'x-priority': 10 },
    stringMode: { type: 'boolean', title: '高精度模式', 'x-group': '高级属性', 'x-priority': 11 },
    changeOnWheel: { type: 'boolean', title: '滚轮触发变更', 'x-group': '高级属性', 'x-priority': 12 },
    prefix: { type: 'string', title: '前缀', 'x-group': '高级属性', 'x-priority': 13 },
    suffix: { type: 'string', title: '后缀', 'x-group': '高级属性', 'x-priority': 14 },
    size: { type: 'string', title: '尺寸', 'x-group': '样式', 'x-priority': 20, enum: ['small', 'middle', 'large'] },
    variant: { type: 'string', title: '变体', 'x-group': '样式', 'x-priority': 21, enum: ['outlined', 'filled', 'borderless'] },
  },
};

export const SelectPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    placeholder: { type: 'string', title: '占位提示', 'x-group': '基础属性', 'x-priority': 1 },
    options: {
      type: 'array', title: '选项列表', 'x-group': '基础属性', 'x-priority': 2,
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', title: '标签' },
          value: { title: '值' },
          disabled: { type: 'boolean', title: '禁用' },
        },
      },
    },
    mode: { type: 'string', title: '模式', 'x-group': '基础属性', 'x-priority': 3, enum: ['multiple', 'tags'] },
    showSearch: { type: 'boolean', title: '可搜索', 'x-group': '基础属性', 'x-priority': 4 },
    allowClear: { type: 'boolean', title: '允许清除', 'x-group': '基础属性', 'x-priority': 5 },
    optionFilterProp: { type: 'string', title: '搜索过滤字段', 'x-group': '高级属性', 'x-priority': 10 },
    popupMatchSelectWidth: { title: '弹窗宽度匹配', 'x-group': '高级属性', 'x-priority': 11 },
    size: { type: 'string', title: '尺寸', 'x-group': '样式', 'x-priority': 20, enum: ['small', 'middle', 'large'] },
    variant: { type: 'string', title: '变体', 'x-group': '样式', 'x-priority': 21, enum: ['outlined', 'filled', 'borderless'] },
    placement: { type: 'string', title: '弹出位置', 'x-group': '样式', 'x-priority': 22, enum: ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'] },
  },
};

export const RadioPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    options: {
      type: 'array', title: '选项列表', 'x-group': '基础属性', 'x-priority': 1,
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', title: '标签' },
          value: { title: '值' },
          disabled: { type: 'boolean', title: '禁用' },
        },
      },
    },
    optionType: { type: 'string', title: '选项类型', 'x-group': '基础属性', 'x-priority': 2, enum: ['default', 'button'] },
    buttonStyle: { type: 'string', title: '按钮样式', 'x-group': '基础属性', 'x-priority': 3, enum: ['outline', 'solid'] },
    block: { type: 'boolean', title: '撑满宽度', 'x-group': '样式', 'x-priority': 10 },
    size: { type: 'string', title: '尺寸', 'x-group': '样式', 'x-priority': 11, enum: ['small', 'middle', 'large'] },
  },
};

export const CheckboxPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    options: {
      type: 'array', title: '选项列表', 'x-group': '基础属性', 'x-priority': 1,
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', title: '标签' },
          value: { title: '值' },
          disabled: { type: 'boolean', title: '禁用' },
        },
      },
    },
    indeterminate: { type: 'boolean', title: '半选状态', 'x-group': '基础属性', 'x-priority': 2 },
  },
};

export const SwitchPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    checkedChildren: { type: 'string', title: '选中文案', 'x-group': '基础属性', 'x-priority': 1 },
    unCheckedChildren: { type: 'string', title: '非选中文案', 'x-group': '基础属性', 'x-priority': 2 },
    loading: { type: 'boolean', title: '加载中', 'x-group': '基础属性', 'x-priority': 3 },
    size: { type: 'string', title: '尺寸', 'x-group': '样式', 'x-priority': 10, enum: ['small', 'default'] },
  },
};

export const DatePickerPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    placeholder: { type: 'string', title: '占位提示', 'x-group': '基础属性', 'x-priority': 1 },
    format: { type: 'string', title: '日期格式', 'x-group': '基础属性', 'x-priority': 2, 'x-placeholder': 'YYYY-MM-DD' },
    picker: { type: 'string', title: '选择器类型', 'x-group': '基础属性', 'x-priority': 3, enum: ['date', 'week', 'month', 'quarter', 'year'] },
    showTime: { type: 'boolean', title: '显示时间', 'x-group': '基础属性', 'x-priority': 4 },
    allowClear: { type: 'boolean', title: '允许清除', 'x-group': '基础属性', 'x-priority': 5 },
    multiple: { type: 'boolean', title: '多选模式', 'x-group': '高级属性', 'x-priority': 10 },
    size: { type: 'string', title: '尺寸', 'x-group': '样式', 'x-priority': 20, enum: ['small', 'middle', 'large'] },
    variant: { type: 'string', title: '变体', 'x-group': '样式', 'x-priority': 21, enum: ['outlined', 'filled', 'borderless'] },
    placement: { type: 'string', title: '弹出位置', 'x-group': '样式', 'x-priority': 22, enum: ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'] },
  },
};

export const TimePickerPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    placeholder: { type: 'string', title: '占位提示', 'x-group': '基础属性', 'x-priority': 1 },
    format: { type: 'string', title: '时间格式', 'x-group': '基础属性', 'x-priority': 2, 'x-placeholder': 'HH:mm:ss' },
    hourStep: { type: 'number', title: '小时步长', 'x-group': '基础属性', 'x-priority': 3, minimum: 1, maximum: 24 },
    minuteStep: { type: 'number', title: '分钟步长', 'x-group': '基础属性', 'x-priority': 4, minimum: 1, maximum: 60 },
    secondStep: { type: 'number', title: '秒步长', 'x-group': '基础属性', 'x-priority': 5, minimum: 1, maximum: 60 },
    use12Hours: { type: 'boolean', title: '12小时制', 'x-group': '基础属性', 'x-priority': 6 },
    allowClear: { type: 'boolean', title: '允许清除', 'x-group': '基础属性', 'x-priority': 7 },
    size: { type: 'string', title: '尺寸', 'x-group': '样式', 'x-priority': 20, enum: ['small', 'middle', 'large'] },
  },
};

export const UploadPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    action: { type: 'string', title: '上传地址', 'x-group': '基础属性', 'x-priority': 1, 'x-placeholder': '/api/upload' },
    name: { type: 'string', title: '文件字段名', 'x-group': '基础属性', 'x-priority': 2 },
    accept: { type: 'string', title: '文件类型', 'x-group': '基础属性', 'x-priority': 3, 'x-placeholder': '.jpg,.png,.pdf' },
    multiple: { type: 'boolean', title: '多选', 'x-group': '基础属性', 'x-priority': 4 },
    maxCount: { type: 'number', title: '最大数量', 'x-group': '基础属性', 'x-priority': 5, minimum: 1 },
    listType: { type: 'string', title: '列表类型', 'x-group': '基础属性', 'x-priority': 6, enum: ['text', 'picture', 'picture-card', 'picture-circle'] },
    method: { type: 'string', title: '请求方法', 'x-group': '高级属性', 'x-priority': 10, enum: ['POST', 'PUT', 'PATCH'] },
    directory: { type: 'boolean', title: '支持目录', 'x-group': '高级属性', 'x-priority': 11 },
    withCredentials: { type: 'boolean', title: '携带凭证', 'x-group': '高级属性', 'x-priority': 12 },
  },
};

// ==================== 布局/高级组件 ====================

export const ButtonPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    children: { type: 'string', title: '按钮文字', 'x-group': '基础属性', 'x-priority': 1 },
    type: { type: 'string', title: '类型', 'x-group': '基础属性', 'x-priority': 2, enum: ['default', 'primary', 'dashed', 'link', 'text'] },
    shape: { type: 'string', title: '形状', 'x-group': '基础属性', 'x-priority': 3, enum: ['default', 'circle', 'round'] },
    size: { type: 'string', title: '尺寸', 'x-group': '基础属性', 'x-priority': 4, enum: ['small', 'middle', 'large'] },
    ghost: { type: 'boolean', title: '幽灵按钮', 'x-group': '基础属性', 'x-priority': 5 },
    danger: { type: 'boolean', title: '危险按钮', 'x-group': '基础属性', 'x-priority': 6 },
    block: { type: 'boolean', title: '撑满宽度', 'x-group': '基础属性', 'x-priority': 7 },
    loading: { type: 'boolean', title: '加载中', 'x-group': '基础属性', 'x-priority': 8 },
    disabled: { type: 'boolean', title: '禁用', 'x-group': '基础属性', 'x-priority': 9 },
    htmlType: { type: 'string', title: 'HTML类型', 'x-group': '高级属性', 'x-priority': 10, enum: ['submit', 'button', 'reset'] },
    href: { type: 'string', title: '链接地址', 'x-group': '高级属性', 'x-priority': 11 },
    iconPosition: { type: 'string', title: '图标位置', 'x-group': '高级属性', 'x-priority': 12, enum: ['start', 'end'] },
  },
};

export const TablePropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    bordered: { type: 'boolean', title: '显示边框', 'x-group': '基础属性', 'x-priority': 1 },
    size: { type: 'string', title: '尺寸', 'x-group': '基础属性', 'x-priority': 2, enum: ['small', 'middle', 'large'] },
    loading: { type: 'boolean', title: '加载中', 'x-group': '基础属性', 'x-priority': 3 },
    pagination: { type: 'boolean', title: '显示分页', 'x-group': '基础属性', 'x-priority': 4 },
    virtual: { type: 'boolean', title: '虚拟滚动', 'x-group': '高级属性', 'x-priority': 10 },
  },
};

export const FormPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    layout: { type: 'string', title: '布局', 'x-group': '基础属性', 'x-priority': 1, enum: ['horizontal', 'vertical', 'inline'] },
    labelAlign: { type: 'string', title: '标签对齐', 'x-group': '基础属性', 'x-priority': 2, enum: ['left', 'right'] },
    colon: { type: 'boolean', title: '显示冒号', 'x-group': '基础属性', 'x-priority': 3 },
    size: { type: 'string', title: '尺寸', 'x-group': '基础属性', 'x-priority': 4, enum: ['small', 'middle', 'large'] },
    disabled: { type: 'boolean', title: '禁用', 'x-group': '基础属性', 'x-priority': 5 },
    requiredMark: { type: 'boolean', title: '必填标记', 'x-group': '基础属性', 'x-priority': 6 },
    scrollToFirstError: { type: 'boolean', title: '滚动到首个错误', 'x-group': '高级属性', 'x-priority': 10 },
    variant: { type: 'string', title: '变体', 'x-group': '高级属性', 'x-priority': 11, enum: ['outlined', 'filled', 'borderless'] },
  },
};

export const CardPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    title: { type: 'string', title: '标题', 'x-group': '基础属性', 'x-priority': 1 },
    bordered: { type: 'boolean', title: '显示边框', 'x-group': '基础属性', 'x-priority': 2 },
    hoverable: { type: 'boolean', title: '悬浮效果', 'x-group': '基础属性', 'x-priority': 3 },
    loading: { type: 'boolean', title: '加载中', 'x-group': '基础属性', 'x-priority': 4 },
    size: { type: 'string', title: '尺寸', 'x-group': '基础属性', 'x-priority': 5, enum: ['default', 'small'] },
    type: { type: 'string', title: '类型', 'x-group': '高级属性', 'x-priority': 10, enum: ['inner'] },
    variant: { type: 'string', title: '变体', 'x-group': '高级属性', 'x-priority': 11, enum: ['borderless', 'outlined'] },
  },
};

export const FlexPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    vertical: { type: 'boolean', title: '垂直排列', 'x-group': '基础属性', 'x-priority': 1 },
    wrap: { type: 'boolean', title: '自动换行', 'x-group': '基础属性', 'x-priority': 2 },
    justify: {
      type: 'string', title: '主轴对齐', 'x-group': '基础属性', 'x-priority': 3,
      enum: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
    },
    align: {
      type: 'string', title: '交叉轴对齐', 'x-group': '基础属性', 'x-priority': 4,
      enum: ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'],
    },
    gap: { type: 'string', title: '间距', 'x-group': '基础属性', 'x-priority': 5, 'x-placeholder': '如 8, 16, small, middle' },
    // Grid 属性 — 当组件作为栅格容器时使用
    gridTemplateColumns: { type: 'string', title: 'Grid 列模板', 'x-group': 'Grid 属性', 'x-priority': 30, 'x-placeholder': '如 1fr 1fr 或 repeat(3, 1fr)' },
    gridTemplateRows: { type: 'string', title: 'Grid 行模板', 'x-group': 'Grid 属性', 'x-priority': 31, 'x-placeholder': '如 auto 1fr auto' },
  },
};

export const DividerPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    type: { type: 'string', title: '方向', 'x-group': '基础属性', 'x-priority': 1, enum: ['horizontal', 'vertical'] },
    orientation: { type: 'string', title: '文字位置', 'x-group': '基础属性', 'x-priority': 2, enum: ['left', 'right', 'center'] },
    dashed: { type: 'boolean', title: '虚线', 'x-group': '基础属性', 'x-priority': 3 },
    plain: { type: 'boolean', title: '朴素文字', 'x-group': '基础属性', 'x-priority': 4 },
    variant: { type: 'string', title: '样式', 'x-group': '基础属性', 'x-priority': 5, enum: ['solid', 'dashed', 'dotted'] },
  },
};

export const TabsPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    type: { type: 'string', title: '类型', 'x-group': '基础属性', 'x-priority': 1, enum: ['line', 'card', 'editable-card'] },
    tabPosition: { type: 'string', title: '位置', 'x-group': '基础属性', 'x-priority': 2, enum: ['top', 'right', 'bottom', 'left'] },
    centered: { type: 'boolean', title: '居中', 'x-group': '基础属性', 'x-priority': 3 },
    size: { type: 'string', title: '尺寸', 'x-group': '基础属性', 'x-priority': 4, enum: ['small', 'middle', 'large'] },
    destroyOnHidden: { type: 'boolean', title: '销毁隐藏页', 'x-group': '高级属性', 'x-priority': 10 },
  },
};

export const TextPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    children: { type: 'string', title: '文本内容', 'x-group': '基础属性', 'x-priority': 1 },
    strong: { type: 'boolean', title: '加粗', 'x-group': '基础属性', 'x-priority': 2 },
    italic: { type: 'boolean', title: '斜体', 'x-group': '基础属性', 'x-priority': 3 },
    underline: { type: 'boolean', title: '下划线', 'x-group': '基础属性', 'x-priority': 4 },
    type: { type: 'string', title: '类型', 'x-group': '基础属性', 'x-priority': 5, enum: ['secondary', 'success', 'warning', 'danger'] },
    copyable: { type: 'boolean', title: '可复制', 'x-group': '高级属性', 'x-priority': 10 },
  },
};

// ==================== Schema 映射表 ====================

export const componentSchemas: Record<string, JSONSchema7> = {
  input: InputPropsSchema,
  textarea: TextareaPropsSchema,
  number: NumberPropsSchema,
  select: SelectPropsSchema,
  radio: RadioPropsSchema,
  checkbox: CheckboxPropsSchema,
  switch: SwitchPropsSchema,
  datepicker: DatePickerPropsSchema,
  timepicker: TimePickerPropsSchema,
  upload: UploadPropsSchema,
  button: ButtonPropsSchema,
  table: TablePropsSchema,
  form: FormPropsSchema,
  card: CardPropsSchema,
  flex: FlexPropsSchema,
  grid: FlexPropsSchema,
  divider: DividerPropsSchema,
  tabs: TabsPropsSchema,
  text: TextPropsSchema,
};
