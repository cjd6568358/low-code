/**
 * Ant Design 组件库定义
 *
 * 从 antd 5.x TS 类型定义中提取 BaseProps 和各组件特有 props，
 * 生成含 BaseProps 继承的 JSON Schema。
 *
 * BaseProps（跨组件共享）：
 * - disabled, size, variant, status, className, style
 */
import type { JSONSchema7 } from '@low-code/shared';
import {
  // 原有
  AntdInput, AntdTextarea, AntdNumber, AntdSelect, AntdRadio, AntdCheckbox,
  AntdSwitch, AntdDatePicker, AntdTimePicker, AntdUpload, AntdButton,
  AntdTable, AntdForm, AntdCard, AntdFlex, AntdDivider, AntdTabs, AntdText,
  // 数据录入（补充）
  AntdAutoComplete, AntdCascader, AntdColorPicker, AntdMentions, AntdRate,
  AntdSlider, AntdTransfer, AntdTreeSelect,
  // 数据展示
  AntdAvatar, AntdBadge, AntdCalendar, AntdCarousel, AntdCollapse,
  AntdDescriptions, AntdEmpty, AntdImage, AntdList, AntdPopover, AntdQRCode,
  AntdSegmented, AntdStatistic, AntdTag, AntdTimeline, AntdTooltip, AntdTour, AntdTree,
  // 反馈
  AntdAlert, AntdDrawer, AntdModal, AntdPopconfirm, AntdProgress, AntdResult,
  AntdSkeleton, AntdSpin, AntdWatermark,
  // 导航
  AntdAnchor, AntdBreadcrumb, AntdDropdown, AntdMenu, AntdPagination, AntdSteps,
  // 布局（补充）
  AntdLayout, AntdSider, AntdSpace, AntdSplitter,
  // 通用（补充）
  AntdFloatButton, AntdAffix,
} from '../components/antd-components';

// ─── BaseProps JSON Schema ──────────────────────────────
// 从 antd 5.x 公共类型提取：SizeType, Variant, InputStatus, ComponentStyleConfig

/** antd BaseProps JSON Schema — 所有 antd 组件共享的公共属性 */
export const antdBasePropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    disabled: { type: 'boolean', title: '禁用', 'x-group': '基础属性', 'x-priority': 0 },
    size: {
      type: 'string', title: '尺寸', 'x-group': '样式', 'x-priority': 20,
      enum: ['small', 'middle', 'large'],
    },
    variant: {
      type: 'string', title: '变体', 'x-group': '样式', 'x-priority': 21,
      enum: ['outlined', 'borderless', 'filled', 'underlined'],
    },
    status: {
      type: 'string', title: '状态', 'x-group': '样式', 'x-priority': 22,
      enum: ['warning', 'error'],
    },
    className: { type: 'string', title: 'CSS 类名', 'x-group': '样式', 'x-priority': 23 },
    style: { type: 'object', title: '内联样式', 'x-group': '样式', 'x-priority': 24 },
  },
};

// ─── 各组件特有 props JSON Schema ────────────────────────

const inputProps: JSONSchema7 = {
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
    showCount: { type: 'boolean', title: '显示字数', 'x-group': '高级属性', 'x-priority': 10 },
    prefix: { type: 'string', title: '前缀', 'x-group': '高级属性', 'x-priority': 11 },
    suffix: { type: 'string', title: '后缀', 'x-group': '高级属性', 'x-priority': 12 },
    addonBefore: { type: 'string', title: '前置标签', 'x-group': '高级属性', 'x-priority': 13 },
    addonAfter: { type: 'string', title: '后置标签', 'x-group': '高级属性', 'x-priority': 14 },
  },
};

const textareaProps: JSONSchema7 = {
  type: 'object',
  properties: {
    placeholder: { type: 'string', title: '占位提示', 'x-group': '基础属性', 'x-priority': 1 },
    maxLength: { type: 'number', title: '最大长度', 'x-group': '基础属性', 'x-priority': 2, minimum: 0 },
    rows: { type: 'number', title: '行数', 'x-group': '基础属性', 'x-priority': 3, minimum: 1 },
    allowClear: { type: 'boolean', title: '允许清除', 'x-group': '基础属性', 'x-priority': 4 },
    readOnly: { type: 'boolean', title: '只读', 'x-group': '基础属性', 'x-priority': 5 },
    autoSize: { type: 'boolean', title: '自适应高度', 'x-group': '高级属性', 'x-priority': 10 },
    showCount: { type: 'boolean', title: '显示字数', 'x-group': '高级属性', 'x-priority': 11 },
  },
};

const numberProps: JSONSchema7 = {
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
  },
};

const selectProps: JSONSchema7 = {
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
    placement: { type: 'string', title: '弹出位置', 'x-group': '样式', 'x-priority': 20, enum: ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'] },
  },
};

const radioProps: JSONSchema7 = {
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
  },
};

const checkboxProps: JSONSchema7 = {
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

const switchProps: JSONSchema7 = {
  type: 'object',
  properties: {
    checkedChildren: { type: 'string', title: '选中文案', 'x-group': '基础属性', 'x-priority': 1 },
    unCheckedChildren: { type: 'string', title: '非选中文案', 'x-group': '基础属性', 'x-priority': 2 },
    loading: { type: 'boolean', title: '加载中', 'x-group': '基础属性', 'x-priority': 3 },
    autoFocus: { type: 'boolean', title: '自动聚焦', 'x-group': '高级属性', 'x-priority': 10 },
  },
};

const datePickerProps: JSONSchema7 = {
  type: 'object',
  properties: {
    placeholder: { type: 'string', title: '占位提示', 'x-group': '基础属性', 'x-priority': 1 },
    format: { type: 'string', title: '日期格式', 'x-group': '基础属性', 'x-priority': 2, 'x-placeholder': 'YYYY-MM-DD' },
    picker: { type: 'string', title: '选择器类型', 'x-group': '基础属性', 'x-priority': 3, enum: ['date', 'week', 'month', 'quarter', 'year'] },
    showTime: { type: 'boolean', title: '显示时间', 'x-group': '基础属性', 'x-priority': 4 },
    allowClear: { type: 'boolean', title: '允许清除', 'x-group': '基础属性', 'x-priority': 5 },
    multiple: { type: 'boolean', title: '多选模式', 'x-group': '高级属性', 'x-priority': 10 },
    placement: { type: 'string', title: '弹出位置', 'x-group': '样式', 'x-priority': 20, enum: ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'] },
  },
};

const timePickerProps: JSONSchema7 = {
  type: 'object',
  properties: {
    placeholder: { type: 'string', title: '占位提示', 'x-group': '基础属性', 'x-priority': 1 },
    format: { type: 'string', title: '时间格式', 'x-group': '基础属性', 'x-priority': 2, 'x-placeholder': 'HH:mm:ss' },
    hourStep: { type: 'number', title: '小时步长', 'x-group': '基础属性', 'x-priority': 3, minimum: 1, maximum: 24 },
    minuteStep: { type: 'number', title: '分钟步长', 'x-group': '基础属性', 'x-priority': 4, minimum: 1, maximum: 60 },
    secondStep: { type: 'number', title: '秒步长', 'x-group': '基础属性', 'x-priority': 5, minimum: 1, maximum: 60 },
    use12Hours: { type: 'boolean', title: '12小时制', 'x-group': '基础属性', 'x-priority': 6 },
    allowClear: { type: 'boolean', title: '允许清除', 'x-group': '基础属性', 'x-priority': 7 },
    placement: { type: 'string', title: '弹出位置', 'x-group': '样式', 'x-priority': 20, enum: ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'] },
  },
};

const uploadProps: JSONSchema7 = {
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

const buttonProps: JSONSchema7 = {
  type: 'object',
  properties: {
    children: { type: 'string', title: '按钮文字', 'x-group': '基础属性', 'x-priority': 1 },
    type: { type: 'string', title: '类型', 'x-group': '基础属性', 'x-priority': 2, enum: ['default', 'primary', 'dashed', 'link', 'text'] },
    htmlType: { type: 'string', title: 'HTML类型', 'x-group': '基础属性', 'x-priority': 3, enum: ['submit', 'button', 'reset'] },
    shape: { type: 'string', title: '形状', 'x-group': '基础属性', 'x-priority': 4, enum: ['default', 'circle', 'round'] },
    ghost: { type: 'boolean', title: '幽灵按钮', 'x-group': '基础属性', 'x-priority': 5 },
    danger: { type: 'boolean', title: '危险按钮', 'x-group': '基础属性', 'x-priority': 6 },
    block: { type: 'boolean', title: '撑满宽度', 'x-group': '基础属性', 'x-priority': 7 },
    loading: { type: 'boolean', title: '加载中', 'x-group': '基础属性', 'x-priority': 8 },
    iconPosition: { type: 'string', title: '图标位置', 'x-group': '高级属性', 'x-priority': 10, enum: ['start', 'end'] },
    href: { type: 'string', title: '链接地址', 'x-group': '高级属性', 'x-priority': 11 },
  },
};

const tableProps: JSONSchema7 = {
  type: 'object',
  properties: {
    bordered: { type: 'boolean', title: '显示边框', 'x-group': '基础属性', 'x-priority': 1 },
    loading: { type: 'boolean', title: '加载中', 'x-group': '基础属性', 'x-priority': 2 },
    pagination: { type: 'boolean', title: '显示分页', 'x-group': '基础属性', 'x-priority': 3 },
    virtual: { type: 'boolean', title: '虚拟滚动', 'x-group': '高级属性', 'x-priority': 10 },
  },
};

const formProps: JSONSchema7 = {
  type: 'object',
  properties: {
    layout: { type: 'string', title: '布局', 'x-group': '基础属性', 'x-priority': 1, enum: ['horizontal', 'vertical', 'inline'] },
    labelAlign: { type: 'string', title: '标签对齐', 'x-group': '基础属性', 'x-priority': 2, enum: ['left', 'right'] },
    colon: { type: 'boolean', title: '显示冒号', 'x-group': '基础属性', 'x-priority': 3 },
    requiredMark: { type: 'boolean', title: '必填标记', 'x-group': '基础属性', 'x-priority': 4 },
    scrollToFirstError: { type: 'boolean', title: '滚动到首个错误', 'x-group': '高级属性', 'x-priority': 10 },
  },
};

const cardProps: JSONSchema7 = {
  type: 'object',
  properties: {
    title: { type: 'string', title: '标题', 'x-group': '基础属性', 'x-priority': 1 },
    bordered: { type: 'boolean', title: '显示边框', 'x-group': '基础属性', 'x-priority': 2 },
    hoverable: { type: 'boolean', title: '悬浮效果', 'x-group': '基础属性', 'x-priority': 3 },
    loading: { type: 'boolean', title: '加载中', 'x-group': '基础属性', 'x-priority': 4 },
    type: { type: 'string', title: '类型', 'x-group': '高级属性', 'x-priority': 10, enum: ['inner'] },
  },
};

const flexProps: JSONSchema7 = {
  type: 'object',
  properties: {
    vertical: { type: 'boolean', title: '垂直排列', 'x-group': '基础属性', 'x-priority': 1 },
    wrap: { type: 'boolean', title: '自动换行', 'x-group': '基础属性', 'x-priority': 2 },
    justify: {
      type: 'string', title: '水平对齐', 'x-group': '基础属性', 'x-priority': 3,
      enum: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
    },
    align: {
      type: 'string', title: '垂直对齐', 'x-group': '基础属性', 'x-priority': 4,
      enum: ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'],
    },
    gap: { type: 'string', title: '间距', 'x-group': '基础属性', 'x-priority': 5, 'x-placeholder': '如 8, 16, small, middle' },
  },
};

const dividerProps: JSONSchema7 = {
  type: 'object',
  properties: {
    type: { type: 'string', title: '方向', 'x-group': '基础属性', 'x-priority': 1, enum: ['horizontal', 'vertical'] },
    orientation: { type: 'string', title: '文字位置', 'x-group': '基础属性', 'x-priority': 2, enum: ['left', 'right', 'center'] },
    dashed: { type: 'boolean', title: '虚线', 'x-group': '基础属性', 'x-priority': 3 },
    plain: { type: 'boolean', title: '朴素文字', 'x-group': '基础属性', 'x-priority': 4 },
  },
};

const tabsProps: JSONSchema7 = {
  type: 'object',
  properties: {
    type: { type: 'string', title: '类型', 'x-group': '基础属性', 'x-priority': 1, enum: ['line', 'card', 'editable-card'] },
    tabPosition: { type: 'string', title: '位置', 'x-group': '基础属性', 'x-priority': 2, enum: ['top', 'right', 'bottom', 'left'] },
    centered: { type: 'boolean', title: '居中', 'x-group': '基础属性', 'x-priority': 3 },
    destroyOnHidden: { type: 'boolean', title: '销毁隐藏页', 'x-group': '高级属性', 'x-priority': 10 },
    animated: { type: 'boolean', title: '动画', 'x-group': '高级属性', 'x-priority': 11 },
  },
};

const textProps: JSONSchema7 = {
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

// ─── 数据录入（补充） ─────────────────────────────────

const autoCompleteProps: JSONSchema7 = {
  type: 'object',
  properties: {
    placeholder: { type: 'string', title: '占位提示', 'x-group': '基础属性', 'x-priority': 1 },
    options: { type: 'array', title: '选项列表', 'x-group': '基础属性', 'x-priority': 2, items: { type: 'object', properties: { label: { type: 'string' }, value: {} } } },
    allowClear: { type: 'boolean', title: '允许清除', 'x-group': '基础属性', 'x-priority': 3 },
    showSearch: { type: 'boolean', title: '可搜索', 'x-group': '基础属性', 'x-priority': 4 },
    popupMatchSelectWidth: { title: '弹窗宽度匹配', 'x-group': '高级属性', 'x-priority': 10 },
  },
};

const cascaderProps: JSONSchema7 = {
  type: 'object',
  properties: {
    placeholder: { type: 'string', title: '占位提示', 'x-group': '基础属性', 'x-priority': 1 },
    options: { type: 'array', title: '选项列表', 'x-group': '基础属性', 'x-priority': 2 },
    multiple: { type: 'boolean', title: '多选', 'x-group': '基础属性', 'x-priority': 3 },
    allowClear: { type: 'boolean', title: '允许清除', 'x-group': '基础属性', 'x-priority': 4 },
    showSearch: { type: 'boolean', title: '可搜索', 'x-group': '基础属性', 'x-priority': 5 },
    autoClearSearchValue: { type: 'boolean', title: '选中自动清空搜索', 'x-group': '高级属性', 'x-priority': 10 },
    placement: { type: 'string', title: '弹出位置', 'x-group': '样式', 'x-priority': 20, enum: ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'] },
  },
};

const colorPickerProps: JSONSchema7 = {
  type: 'object',
  properties: {
    format: { type: 'string', title: '颜色格式', 'x-group': '基础属性', 'x-priority': 1, enum: ['hex', 'rgb', 'hsb'] },
    mode: { type: 'string', title: '选择模式', 'x-group': '基础属性', 'x-priority': 2, enum: ['single', 'gradient'] },
    allowClear: { type: 'boolean', title: '允许清除', 'x-group': '基础属性', 'x-priority': 3 },
    trigger: { type: 'string', title: '触发方式', 'x-group': '基础属性', 'x-priority': 4, enum: ['click', 'hover'] },
    showText: { type: 'boolean', title: '显示文字', 'x-group': '高级属性', 'x-priority': 10 },
    disabledAlpha: { type: 'boolean', title: '禁用透明度', 'x-group': '高级属性', 'x-priority': 11 },
  },
};

const mentionsProps: JSONSchema7 = {
  type: 'object',
  properties: {
    placeholder: { type: 'string', title: '占位提示', 'x-group': '基础属性', 'x-priority': 1 },
    options: { type: 'array', title: '选项列表', 'x-group': '基础属性', 'x-priority': 2, items: { type: 'object', properties: { value: { type: 'string' }, label: { type: 'string' } } } },
    loading: { type: 'boolean', title: '加载中', 'x-group': '基础属性', 'x-priority': 3 },
    rows: { type: 'number', title: '行数', 'x-group': '基础属性', 'x-priority': 4, minimum: 1 },
  },
};

const rateProps: JSONSchema7 = {
  type: 'object',
  properties: {
    count: { type: 'number', title: '星数', 'x-group': '基础属性', 'x-priority': 1, minimum: 1 },
    allowClear: { type: 'boolean', title: '允许清除', 'x-group': '基础属性', 'x-priority': 2 },
    allowHalf: { type: 'boolean', title: '允许半选', 'x-group': '基础属性', 'x-priority': 3 },
    tooltips: { type: 'array', title: '提示文案', 'x-group': '高级属性', 'x-priority': 10, items: { type: 'string' } },
  },
};

const sliderProps: JSONSchema7 = {
  type: 'object',
  properties: {
    min: { type: 'number', title: '最小值', 'x-group': '基础属性', 'x-priority': 1 },
    max: { type: 'number', title: '最大值', 'x-group': '基础属性', 'x-priority': 2 },
    step: { type: 'number', title: '步长', 'x-group': '基础属性', 'x-priority': 3 },
    range: { type: 'boolean', title: '双滑块', 'x-group': '基础属性', 'x-priority': 4 },
    vertical: { type: 'boolean', title: '垂直', 'x-group': '基础属性', 'x-priority': 5 },
    reverse: { type: 'boolean', title: '反向', 'x-group': '基础属性', 'x-priority': 6 },
    dots: { type: 'boolean', title: '对齐刻度', 'x-group': '高级属性', 'x-priority': 10 },
    included: { type: 'boolean', title: '包含轨道', 'x-group': '高级属性', 'x-priority': 11 },
  },
};

const transferProps: JSONSchema7 = {
  type: 'object',
  properties: {
    dataSource: { type: 'array', title: '数据源', 'x-group': '基础属性', 'x-priority': 1 },
    titles: { type: 'array', title: '标题', 'x-group': '基础属性', 'x-priority': 2, items: { type: 'string' } },
    showSearch: { type: 'boolean', title: '可搜索', 'x-group': '基础属性', 'x-priority': 3 },
    oneWay: { type: 'boolean', title: '单向', 'x-group': '高级属性', 'x-priority': 10 },
    pagination: { type: 'boolean', title: '分页', 'x-group': '高级属性', 'x-priority': 11 },
  },
};

const treeSelectProps: JSONSchema7 = {
  type: 'object',
  properties: {
    placeholder: { type: 'string', title: '占位提示', 'x-group': '基础属性', 'x-priority': 1 },
    treeData: { type: 'array', title: '树数据', 'x-group': '基础属性', 'x-priority': 2 },
    multiple: { type: 'boolean', title: '多选', 'x-group': '基础属性', 'x-priority': 3 },
    allowClear: { type: 'boolean', title: '允许清除', 'x-group': '基础属性', 'x-priority': 4 },
    showSearch: { type: 'boolean', title: '可搜索', 'x-group': '基础属性', 'x-priority': 5 },
    treeCheckable: { type: 'boolean', title: '可勾选', 'x-group': '高级属性', 'x-priority': 10 },
    treeLine: { type: 'boolean', title: '连接线', 'x-group': '高级属性', 'x-priority': 11 },
    placement: { type: 'string', title: '弹出位置', 'x-group': '样式', 'x-priority': 20, enum: ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'] },
  },
};

// ─── 数据展示 ─────────────────────────────────────────

const avatarProps: JSONSchema7 = {
  type: 'object',
  properties: {
    src: { type: 'string', title: '图片地址', 'x-group': '基础属性', 'x-priority': 1 },
    icon: { type: 'string', title: '图标', 'x-group': '基础属性', 'x-priority': 2 },
    shape: { type: 'string', title: '形状', 'x-group': '基础属性', 'x-priority': 3, enum: ['circle', 'square'] },
    gap: { type: 'number', title: '字符间距', 'x-group': '高级属性', 'x-priority': 10 },
    alt: { type: 'string', title: '替代文本', 'x-group': '高级属性', 'x-priority': 11 },
  },
};

const badgeProps: JSONSchema7 = {
  type: 'object',
  properties: {
    count: { title: '徽标数', 'x-group': '基础属性', 'x-priority': 1 },
    showZero: { type: 'boolean', title: '显示零', 'x-group': '基础属性', 'x-priority': 2 },
    dot: { type: 'boolean', title: '圆点', 'x-group': '基础属性', 'x-priority': 3 },
    overflowCount: { type: 'number', title: '封顶值', 'x-group': '基础属性', 'x-priority': 4 },
    color: { type: 'string', title: '颜色', 'x-group': '样式', 'x-priority': 20 },
    text: { type: 'string', title: '文案', 'x-group': '基础属性', 'x-priority': 5 },
  },
};

const calendarProps: JSONSchema7 = {
  type: 'object',
  properties: {
    mode: { type: 'string', title: '模式', 'x-group': '基础属性', 'x-priority': 1, enum: ['year', 'month'] },
    fullscreen: { type: 'boolean', title: '全屏', 'x-group': '基础属性', 'x-priority': 2 },
    showWeek: { type: 'boolean', title: '显示周数', 'x-group': '高级属性', 'x-priority': 10 },
  },
};

const carouselProps: JSONSchema7 = {
  type: 'object',
  properties: {
    autoplay: { type: 'boolean', title: '自动播放', 'x-group': '基础属性', 'x-priority': 1 },
    dots: { type: 'boolean', title: '显示指示点', 'x-group': '基础属性', 'x-priority': 2 },
    dotPosition: { type: 'string', title: '指示点位置', 'x-group': '基础属性', 'x-priority': 3, enum: ['top', 'bottom', 'left', 'right'] },
    effect: { type: 'string', title: '动效', 'x-group': '基础属性', 'x-priority': 4, enum: ['scrollx', 'fade'] },
  },
};

const collapseProps: JSONSchema7 = {
  type: 'object',
  properties: {
    accordion: { type: 'boolean', title: '手风琴', 'x-group': '基础属性', 'x-priority': 1 },
    bordered: { type: 'boolean', title: '显示边框', 'x-group': '基础属性', 'x-priority': 2 },
    ghost: { type: 'boolean', title: '幽灵模式', 'x-group': '基础属性', 'x-priority': 3 },
    expandIconPosition: { type: 'string', title: '图标位置', 'x-group': '基础属性', 'x-priority': 4, enum: ['start', 'end'] },
    destroyOnHidden: { type: 'boolean', title: '销毁隐藏', 'x-group': '高级属性', 'x-priority': 10 },
  },
};

const descriptionsProps: JSONSchema7 = {
  type: 'object',
  properties: {
    title: { type: 'string', title: '标题', 'x-group': '基础属性', 'x-priority': 1 },
    bordered: { type: 'boolean', title: '显示边框', 'x-group': '基础属性', 'x-priority': 2 },
    column: { type: 'number', title: '列数', 'x-group': '基础属性', 'x-priority': 3 },
    layout: { type: 'string', title: '布局', 'x-group': '基础属性', 'x-priority': 4, enum: ['horizontal', 'vertical'] },
    colon: { type: 'boolean', title: '冒号', 'x-group': '基础属性', 'x-priority': 5 },
  },
};

const emptyProps: JSONSchema7 = {
  type: 'object',
  properties: {
    description: { type: 'string', title: '描述', 'x-group': '基础属性', 'x-priority': 1 },
    image: { type: 'string', title: '图片', 'x-group': '基础属性', 'x-priority': 2 },
  },
};

const imageProps: JSONSchema7 = {
  type: 'object',
  properties: {
    src: { type: 'string', title: '图片地址', 'x-group': '基础属性', 'x-priority': 1 },
    alt: { type: 'string', title: '替代文本', 'x-group': '基础属性', 'x-priority': 2 },
    width: { title: '宽度', 'x-group': '样式', 'x-priority': 20 },
    height: { title: '高度', 'x-group': '样式', 'x-priority': 21 },
    preview: { type: 'boolean', title: '预览', 'x-group': '基础属性', 'x-priority': 3 },
    fallback: { type: 'string', title: '失败兜底', 'x-group': '高级属性', 'x-priority': 10 },
  },
};

const listProps: JSONSchema7 = {
  type: 'object',
  properties: {
    bordered: { type: 'boolean', title: '显示边框', 'x-group': '基础属性', 'x-priority': 1 },
    itemLayout: { type: 'string', title: '布局', 'x-group': '基础属性', 'x-priority': 2, enum: ['horizontal', 'vertical'] },
    loading: { type: 'boolean', title: '加载中', 'x-group': '基础属性', 'x-priority': 3 },
    split: { type: 'boolean', title: '分割线', 'x-group': '基础属性', 'x-priority': 4 },
    header: { type: 'string', title: '头部', 'x-group': '高级属性', 'x-priority': 10 },
    footer: { type: 'string', title: '底部', 'x-group': '高级属性', 'x-priority': 11 },
    pagination: { type: 'boolean', title: '分页', 'x-group': '高级属性', 'x-priority': 12 },
  },
};

const popoverProps: JSONSchema7 = {
  type: 'object',
  properties: {
    title: { type: 'string', title: '标题', 'x-group': '基础属性', 'x-priority': 1 },
    content: { type: 'string', title: '内容', 'x-group': '基础属性', 'x-priority': 2 },
    trigger: { type: 'string', title: '触发方式', 'x-group': '基础属性', 'x-priority': 3, enum: ['click', 'hover', 'focus', 'contextMenu'] },
    placement: { type: 'string', title: '位置', 'x-group': '样式', 'x-priority': 20, enum: ['top', 'left', 'right', 'bottom', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'leftTop', 'leftBottom', 'rightTop', 'rightBottom'] },
  },
};

const qrCodeProps: JSONSchema7 = {
  type: 'object',
  properties: {
    value: { type: 'string', title: '值', 'x-group': '基础属性', 'x-priority': 1 },
    type: { type: 'string', title: '类型', 'x-group': '基础属性', 'x-priority': 2, enum: ['canvas', 'svg'] },
    icon: { type: 'string', title: '图标', 'x-group': '基础属性', 'x-priority': 3 },
    size: { type: 'number', title: '大小', 'x-group': '样式', 'x-priority': 20 },
    iconSize: { type: 'number', title: '图标大小', 'x-group': '样式', 'x-priority': 21 },
    bordered: { type: 'boolean', title: '边框', 'x-group': '基础属性', 'x-priority': 4 },
    errorLevel: { type: 'string', title: '纠错级别', 'x-group': '高级属性', 'x-priority': 10, enum: ['L', 'M', 'Q', 'H'] },
    status: { type: 'string', title: '状态', 'x-group': '基础属性', 'x-priority': 5, enum: ['active', 'expired', 'loading', 'scanned'] },
  },
};

const segmentedProps: JSONSchema7 = {
  type: 'object',
  properties: {
    options: { type: 'array', title: '选项', 'x-group': '基础属性', 'x-priority': 1 },
    block: { type: 'boolean', title: '撑满', 'x-group': '基础属性', 'x-priority': 2 },
    vertical: { type: 'boolean', title: '垂直', 'x-group': '基础属性', 'x-priority': 3 },
    shape: { type: 'string', title: '形状', 'x-group': '基础属性', 'x-priority': 4, enum: ['default', 'round'] },
  },
};

const statisticProps: JSONSchema7 = {
  type: 'object',
  properties: {
    title: { type: 'string', title: '标题', 'x-group': '基础属性', 'x-priority': 1 },
    value: { title: '数值', 'x-group': '基础属性', 'x-priority': 2 },
    precision: { type: 'number', title: '精度', 'x-group': '基础属性', 'x-priority': 3, minimum: 0 },
    prefix: { type: 'string', title: '前缀', 'x-group': '高级属性', 'x-priority': 10 },
    suffix: { type: 'string', title: '后缀', 'x-group': '高级属性', 'x-priority': 11 },
    loading: { type: 'boolean', title: '加载中', 'x-group': '基础属性', 'x-priority': 4 },
    groupSeparator: { type: 'string', title: '千分符', 'x-group': '高级属性', 'x-priority': 12 },
    decimalSeparator: { type: 'string', title: '小数点', 'x-group': '高级属性', 'x-priority': 13 },
  },
};

const tagProps: JSONSchema7 = {
  type: 'object',
  properties: {
    color: { type: 'string', title: '颜色', 'x-group': '基础属性', 'x-priority': 1 },
    closable: { type: 'boolean', title: '可关闭', 'x-group': '基础属性', 'x-priority': 2 },
    icon: { type: 'string', title: '图标', 'x-group': '基础属性', 'x-priority': 3 },
    bordered: { type: 'boolean', title: '边框', 'x-group': '基础属性', 'x-priority': 4 },
  },
};

const timelineProps: JSONSchema7 = {
  type: 'object',
  properties: {
    mode: { type: 'string', title: '模式', 'x-group': '基础属性', 'x-priority': 1, enum: ['left', 'alternate', 'right'] },
    pending: { type: 'string', title: '待定节点', 'x-group': '基础属性', 'x-priority': 2 },
    reverse: { type: 'boolean', title: '反序', 'x-group': '基础属性', 'x-priority': 3 },
  },
};

const tooltipProps: JSONSchema7 = {
  type: 'object',
  properties: {
    title: { type: 'string', title: '提示文字', 'x-group': '基础属性', 'x-priority': 1 },
    placement: { type: 'string', title: '位置', 'x-group': '样式', 'x-priority': 20, enum: ['top', 'left', 'right', 'bottom', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'leftTop', 'leftBottom', 'rightTop', 'rightBottom'] },
    color: { type: 'string', title: '颜色', 'x-group': '样式', 'x-priority': 21 },
    arrow: { title: '箭头', 'x-group': '高级属性', 'x-priority': 10 },
  },
};

const tourProps: JSONSchema7 = {
  type: 'object',
  properties: {
    type: { type: 'string', title: '类型', 'x-group': '基础属性', 'x-priority': 1, enum: ['default', 'primary'] },
    current: { type: 'number', title: '当前步', 'x-group': '基础属性', 'x-priority': 2 },
    steps: { type: 'array', title: '步骤', 'x-group': '基础属性', 'x-priority': 3 },
  },
};

const treeProps: JSONSchema7 = {
  type: 'object',
  properties: {
    treeData: { type: 'array', title: '树数据', 'x-group': '基础属性', 'x-priority': 1 },
    checkable: { type: 'boolean', title: '可勾选', 'x-group': '基础属性', 'x-priority': 2 },
    selectable: { type: 'boolean', title: '可选中', 'x-group': '基础属性', 'x-priority': 3 },
    showLine: { type: 'boolean', title: '连接线', 'x-group': '基础属性', 'x-priority': 4 },
    showIcon: { type: 'boolean', title: '显示图标', 'x-group': '基础属性', 'x-priority': 5 },
    draggable: { type: 'boolean', title: '可拖拽', 'x-group': '高级属性', 'x-priority': 10 },
    defaultExpandAll: { type: 'boolean', title: '默认展开', 'x-group': '高级属性', 'x-priority': 11 },
  },
};

// ─── 反馈 ─────────────────────────────────────────────

const alertProps: JSONSchema7 = {
  type: 'object',
  properties: {
    type: { type: 'string', title: '类型', 'x-group': '基础属性', 'x-priority': 1, enum: ['success', 'info', 'warning', 'error'] },
    message: { type: 'string', title: '标题', 'x-group': '基础属性', 'x-priority': 2 },
    description: { type: 'string', title: '描述', 'x-group': '基础属性', 'x-priority': 3 },
    showIcon: { type: 'boolean', title: '显示图标', 'x-group': '基础属性', 'x-priority': 4 },
    closable: { type: 'boolean', title: '可关闭', 'x-group': '基础属性', 'x-priority': 5 },
    banner: { type: 'boolean', title: '横幅', 'x-group': '基础属性', 'x-priority': 6 },
  },
};

const drawerProps: JSONSchema7 = {
  type: 'object',
  properties: {
    title: { type: 'string', title: '标题', 'x-group': '基础属性', 'x-priority': 1 },
    placement: { type: 'string', title: '位置', 'x-group': '基础属性', 'x-priority': 2, enum: ['top', 'right', 'bottom', 'left'] },
    width: { title: '宽度', 'x-group': '样式', 'x-priority': 20 },
    height: { title: '高度', 'x-group': '样式', 'x-priority': 21 },
    closable: { type: 'boolean', title: '可关闭', 'x-group': '基础属性', 'x-priority': 3 },
    destroyOnHidden: { type: 'boolean', title: '关闭销毁', 'x-group': '高级属性', 'x-priority': 10 },
    loading: { type: 'boolean', title: '加载中', 'x-group': '基础属性', 'x-priority': 4 },
  },
};

const modalProps: JSONSchema7 = {
  type: 'object',
  properties: {
    title: { type: 'string', title: '标题', 'x-group': '基础属性', 'x-priority': 1 },
    width: { title: '宽度', 'x-group': '样式', 'x-priority': 20 },
    centered: { type: 'boolean', title: '居中', 'x-group': '基础属性', 'x-priority': 2 },
    okText: { type: 'string', title: '确认文字', 'x-group': '基础属性', 'x-priority': 3 },
    cancelText: { type: 'string', title: '取消文字', 'x-group': '基础属性', 'x-priority': 4 },
    maskClosable: { type: 'boolean', title: '点击蒙层关闭', 'x-group': '基础属性', 'x-priority': 5 },
    closable: { type: 'boolean', title: '可关闭', 'x-group': '基础属性', 'x-priority': 6 },
    confirmLoading: { type: 'boolean', title: '确认加载', 'x-group': '高级属性', 'x-priority': 10 },
    destroyOnHidden: { type: 'boolean', title: '关闭销毁', 'x-group': '高级属性', 'x-priority': 11 },
    loading: { type: 'boolean', title: '加载中', 'x-group': '基础属性', 'x-priority': 7 },
  },
};

const popconfirmProps: JSONSchema7 = {
  type: 'object',
  properties: {
    title: { type: 'string', title: '标题', 'x-group': '基础属性', 'x-priority': 1 },
    description: { type: 'string', title: '描述', 'x-group': '基础属性', 'x-priority': 2 },
    okText: { type: 'string', title: '确认文字', 'x-group': '基础属性', 'x-priority': 3 },
    cancelText: { type: 'string', title: '取消文字', 'x-group': '基础属性', 'x-priority': 4 },
    showCancel: { type: 'boolean', title: '显示取消', 'x-group': '基础属性', 'x-priority': 5 },
  },
};

const progressProps: JSONSchema7 = {
  type: 'object',
  properties: {
    type: { type: 'string', title: '类型', 'x-group': '基础属性', 'x-priority': 1, enum: ['line', 'circle', 'dashboard'] },
    percent: { type: 'number', title: '百分比', 'x-group': '基础属性', 'x-priority': 2, minimum: 0, maximum: 100 },
    showInfo: { type: 'boolean', title: '显示数值', 'x-group': '基础属性', 'x-priority': 3 },
    strokeWidth: { type: 'number', title: '线宽', 'x-group': '样式', 'x-priority': 20 },
    strokeLinecap: { type: 'string', title: '线帽', 'x-group': '样式', 'x-priority': 21, enum: ['butt', 'square', 'round'] },
    strokeColor: { type: 'string', title: '颜色', 'x-group': '样式', 'x-priority': 22 },
    trailColor: { type: 'string', title: '轨道颜色', 'x-group': '样式', 'x-priority': 23 },
    gapDegree: { type: 'number', title: '缺口角度', 'x-group': '高级属性', 'x-priority': 10 },
    gapPosition: { type: 'string', title: '缺口位置', 'x-group': '高级属性', 'x-priority': 11, enum: ['top', 'bottom', 'left', 'right'] },
    steps: { type: 'number', title: '步骤数', 'x-group': '高级属性', 'x-priority': 12 },
  },
};

const resultProps: JSONSchema7 = {
  type: 'object',
  properties: {
    status: { type: 'string', title: '状态', 'x-group': '基础属性', 'x-priority': 1, enum: ['success', 'error', 'info', 'warning', '404', '403', '500'] },
    title: { type: 'string', title: '标题', 'x-group': '基础属性', 'x-priority': 2 },
    subTitle: { type: 'string', title: '副标题', 'x-group': '基础属性', 'x-priority': 3 },
    icon: { type: 'string', title: '图标', 'x-group': '基础属性', 'x-priority': 4 },
  },
};

const skeletonProps: JSONSchema7 = {
  type: 'object',
  properties: {
    active: { type: 'boolean', title: '动画', 'x-group': '基础属性', 'x-priority': 1 },
    loading: { type: 'boolean', title: '加载中', 'x-group': '基础属性', 'x-priority': 2 },
    avatar: { title: '头像', 'x-group': '基础属性', 'x-priority': 3 },
    title: { title: '标题', 'x-group': '基础属性', 'x-priority': 4 },
    paragraph: { title: '段落', 'x-group': '基础属性', 'x-priority': 5 },
    round: { type: 'boolean', title: '圆角', 'x-group': '基础属性', 'x-priority': 6 },
  },
};

const spinProps: JSONSchema7 = {
  type: 'object',
  properties: {
    spinning: { type: 'boolean', title: '旋转', 'x-group': '基础属性', 'x-priority': 1 },
    tip: { type: 'string', title: '提示', 'x-group': '基础属性', 'x-priority': 2 },
    delay: { type: 'number', title: '延迟', 'x-group': '高级属性', 'x-priority': 10 },
    fullscreen: { type: 'boolean', title: '全屏', 'x-group': '高级属性', 'x-priority': 11 },
  },
};

const watermarkProps: JSONSchema7 = {
  type: 'object',
  properties: {
    content: { type: 'string', title: '内容', 'x-group': '基础属性', 'x-priority': 1 },
    image: { type: 'string', title: '图片', 'x-group': '基础属性', 'x-priority': 2 },
    rotate: { type: 'number', title: '旋转角度', 'x-group': '基础属性', 'x-priority': 3 },
    zIndex: { type: 'number', title: '层级', 'x-group': '高级属性', 'x-priority': 10 },
    width: { type: 'number', title: '宽度', 'x-group': '样式', 'x-priority': 20 },
    height: { type: 'number', title: '高度', 'x-group': '样式', 'x-priority': 21 },
    gap: { type: 'array', title: '间距', 'x-group': '样式', 'x-priority': 22 },
    inherit: { type: 'boolean', title: '继承', 'x-group': '高级属性', 'x-priority': 11 },
  },
};

// ─── 导航 ─────────────────────────────────────────────

const anchorProps: JSONSchema7 = {
  type: 'object',
  properties: {
    direction: { type: 'string', title: '方向', 'x-group': '基础属性', 'x-priority': 1, enum: ['vertical', 'horizontal'] },
    offsetTop: { type: 'number', title: '偏移', 'x-group': '基础属性', 'x-priority': 2 },
    affix: { type: 'boolean', title: '固钉', 'x-group': '基础属性', 'x-priority': 3 },
    targetOffset: { type: 'number', title: '锚点偏移', 'x-group': '高级属性', 'x-priority': 10 },
    showInkInFixed: { type: 'boolean', title: '固定时显示墨点', 'x-group': '高级属性', 'x-priority': 11 },
    items: { type: 'array', title: '锚点项', 'x-group': '基础属性', 'x-priority': 4 },
  },
};

const breadcrumbProps: JSONSchema7 = {
  type: 'object',
  properties: {
    separator: { type: 'string', title: '分隔符', 'x-group': '基础属性', 'x-priority': 1 },
    items: { type: 'array', title: '面包屑项', 'x-group': '基础属性', 'x-priority': 2 },
  },
};

const dropdownProps: JSONSchema7 = {
  type: 'object',
  properties: {
    trigger: { type: 'array', title: '触发方式', 'x-group': '基础属性', 'x-priority': 1, items: { type: 'string', enum: ['click', 'hover', 'contextMenu'] } },
    placement: { type: 'string', title: '位置', 'x-group': '样式', 'x-priority': 20, enum: ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'] },
    arrow: { type: 'boolean', title: '箭头', 'x-group': '基础属性', 'x-priority': 2 },
  },
};

const menuProps: JSONSchema7 = {
  type: 'object',
  properties: {
    mode: { type: 'string', title: '模式', 'x-group': '基础属性', 'x-priority': 1, enum: ['horizontal', 'vertical', 'inline'] },
    theme: { type: 'string', title: '主题', 'x-group': '样式', 'x-priority': 20, enum: ['light', 'dark'] },
    inlineIndent: { type: 'number', title: '缩进', 'x-group': '基础属性', 'x-priority': 2 },
    items: { type: 'array', title: '菜单项', 'x-group': '基础属性', 'x-priority': 3 },
  },
};

const paginationProps: JSONSchema7 = {
  type: 'object',
  properties: {
    total: { type: 'number', title: '总数', 'x-group': '基础属性', 'x-priority': 1 },
    pageSize: { type: 'number', title: '每页条数', 'x-group': '基础属性', 'x-priority': 2 },
    current: { type: 'number', title: '当前页', 'x-group': '基础属性', 'x-priority': 3 },
    showSizeChanger: { type: 'boolean', title: '显示条数切换', 'x-group': '基础属性', 'x-priority': 4 },
    showQuickJumper: { type: 'boolean', title: '快速跳转', 'x-group': '基础属性', 'x-priority': 5 },
    showTotal: { type: 'boolean', title: '显示总数', 'x-group': '基础属性', 'x-priority': 6 },
    pageSizeOptions: { type: 'array', title: '条数选项', 'x-group': '高级属性', 'x-priority': 10, items: { type: 'string' } },
  },
};

const stepsProps: JSONSchema7 = {
  type: 'object',
  properties: {
    type: { type: 'string', title: '类型', 'x-group': '基础属性', 'x-priority': 1, enum: ['default', 'navigation', 'inline'] },
    direction: { type: 'string', title: '方向', 'x-group': '基础属性', 'x-priority': 2, enum: ['horizontal', 'vertical'] },
    current: { type: 'number', title: '当前步', 'x-group': '基础属性', 'x-priority': 3 },
    labelPlacement: { type: 'string', title: '标签位置', 'x-group': '基础属性', 'x-priority': 4, enum: ['horizontal', 'vertical'] },
    progressDot: { type: 'boolean', title: '点状', 'x-group': '基础属性', 'x-priority': 5 },
    percent: { type: 'number', title: '百分比', 'x-group': '高级属性', 'x-priority': 10 },
    initial: { type: 'number', title: '起始步', 'x-group': '高级属性', 'x-priority': 11 },
    items: { type: 'array', title: '步骤项', 'x-group': '基础属性', 'x-priority': 6 },
  },
};

// ─── 布局（补充） ─────────────────────────────────────

const layoutProps: JSONSchema7 = {
  type: 'object',
  properties: {
    hasSider: { type: 'boolean', title: '包含侧边栏', 'x-group': '基础属性', 'x-priority': 1 },
  },
};

const siderProps: JSONSchema7 = {
  type: 'object',
  properties: {
    collapsible: { type: 'boolean', title: '可折叠', 'x-group': '基础属性', 'x-priority': 1 },
    collapsed: { type: 'boolean', title: '折叠', 'x-group': '基础属性', 'x-priority': 2 },
    defaultCollapsed: { type: 'boolean', title: '默认折叠', 'x-group': '基础属性', 'x-priority': 3 },
    reverseArrow: { type: 'boolean', title: '翻转箭头', 'x-group': '基础属性', 'x-priority': 4 },
    width: { title: '宽度', 'x-group': '样式', 'x-priority': 20 },
    collapsedWidth: { title: '折叠宽度', 'x-group': '样式', 'x-priority': 21 },
    breakpoint: { type: 'string', title: '断点', 'x-group': '高级属性', 'x-priority': 10, enum: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'] },
    theme: { type: 'string', title: '主题', 'x-group': '样式', 'x-priority': 22, enum: ['light', 'dark'] },
  },
};

const spaceProps: JSONSchema7 = {
  type: 'object',
  properties: {
    direction: { type: 'string', title: '方向', 'x-group': '基础属性', 'x-priority': 1, enum: ['horizontal', 'vertical'] },
    align: { type: 'string', title: '对齐', 'x-group': '基础属性', 'x-priority': 2, enum: ['start', 'end', 'center', 'baseline'] },
    wrap: { type: 'boolean', title: '换行', 'x-group': '基础属性', 'x-priority': 3 },
    split: { type: 'string', title: '分隔符', 'x-group': '高级属性', 'x-priority': 10 },
  },
};

const splitterProps: JSONSchema7 = {
  type: 'object',
  properties: {
    layout: { type: 'string', title: '布局', 'x-group': '基础属性', 'x-priority': 1, enum: ['horizontal', 'vertical'] },
    lazy: { type: 'boolean', title: '懒加载', 'x-group': '高级属性', 'x-priority': 10 },
  },
};

// ─── 通用（补充） ─────────────────────────────────────

const floatButtonProps: JSONSchema7 = {
  type: 'object',
  properties: {
    icon: { type: 'string', title: '图标', 'x-group': '基础属性', 'x-priority': 1 },
    description: { type: 'string', title: '描述', 'x-group': '基础属性', 'x-priority': 2 },
    type: { type: 'string', title: '类型', 'x-group': '基础属性', 'x-priority': 3, enum: ['default', 'primary'] },
    shape: { type: 'string', title: '形状', 'x-group': '基础属性', 'x-priority': 4, enum: ['circle', 'square'] },
    href: { type: 'string', title: '链接', 'x-group': '高级属性', 'x-priority': 10 },
    tooltip: { type: 'string', title: '提示', 'x-group': '高级属性', 'x-priority': 11 },
  },
};

const affixProps: JSONSchema7 = {
  type: 'object',
  properties: {
    offsetTop: { type: 'number', title: '顶部偏移', 'x-group': '基础属性', 'x-priority': 1 },
    offsetBottom: { type: 'number', title: '底部偏移', 'x-group': '基础属性', 'x-priority': 2 },
  },
};

// ─── Schema 合并工具 ──────────────────────────────────

/** 合并 BaseProps 和组件特有 props（扁平结构，AutoFormRenderer 直接读 properties） */
function withBaseProps(componentSchema: JSONSchema7): JSONSchema7 {
  return {
    type: 'object',
    properties: {
      ...antdBasePropsSchema.properties,
      ...componentSchema.properties,
    },
  } as JSONSchema7;
}

// ─── 组件实现映射 ──────────────────────────────────────

/** antd 组件实现映射（type → React 组件） */
export const antdComponentImpls: Record<string, React.ComponentType<any>> = {
  // 原有
  input: AntdInput, textarea: AntdTextarea, number: AntdNumber, select: AntdSelect,
  radio: AntdRadio, checkbox: AntdCheckbox, switch: AntdSwitch,
  datepicker: AntdDatePicker, timepicker: AntdTimePicker, upload: AntdUpload,
  button: AntdButton, table: AntdTable, form: AntdForm, card: AntdCard,
  flex: AntdFlex, grid: AntdFlex, divider: AntdDivider, tabs: AntdTabs, text: AntdText,
  // 数据录入
  autocomplete: AntdAutoComplete, cascader: AntdCascader, colorpicker: AntdColorPicker,
  mentions: AntdMentions, rate: AntdRate, slider: AntdSlider,
  transfer: AntdTransfer, treeselect: AntdTreeSelect,
  // 数据展示
  avatar: AntdAvatar, badge: AntdBadge, calendar: AntdCalendar, carousel: AntdCarousel,
  collapse: AntdCollapse, descriptions: AntdDescriptions, empty: AntdEmpty,
  image: AntdImage, list: AntdList, popover: AntdPopover, qrcode: AntdQRCode,
  segmented: AntdSegmented, statistic: AntdStatistic, tag: AntdTag,
  timeline: AntdTimeline, tooltip: AntdTooltip, tour: AntdTour, tree: AntdTree,
  // 反馈
  alert: AntdAlert, drawer: AntdDrawer, modal: AntdModal, popconfirm: AntdPopconfirm,
  progress: AntdProgress, result: AntdResult, skeleton: AntdSkeleton,
  spin: AntdSpin, watermark: AntdWatermark,
  // 导航
  anchor: AntdAnchor, breadcrumb: AntdBreadcrumb, dropdown: AntdDropdown,
  menu: AntdMenu, pagination: AntdPagination, steps: AntdSteps,
  // 布局
  layout: AntdLayout, sider: AntdSider, space: AntdSpace, splitter: AntdSplitter,
  // 通用
  floatbutton: AntdFloatButton,
  affix: AntdAffix,
};

// ─── 组件分类映射 ──────────────────────────────────────

export const antdCategoryMap: Record<string, { category: 'basic' | 'advanced' | 'layout' | 'custom' | 'business'; name: string }> = {
  // 数据录入
  input: { category: 'basic', name: '输入框' },
  textarea: { category: 'basic', name: '文本域' },
  number: { category: 'basic', name: '数字输入' },
  select: { category: 'basic', name: '选择器' },
  radio: { category: 'basic', name: '单选' },
  checkbox: { category: 'basic', name: '多选' },
  switch: { category: 'basic', name: '开关' },
  datepicker: { category: 'basic', name: '日期选择' },
  timepicker: { category: 'basic', name: '时间选择' },
  upload: { category: 'basic', name: '上传' },
  button: { category: 'basic', name: '按钮' },
  autocomplete: { category: 'basic', name: '自动完成' },
  cascader: { category: 'basic', name: '级联选择' },
  colorpicker: { category: 'basic', name: '颜色选择' },
  mentions: { category: 'basic', name: '提及' },
  rate: { category: 'basic', name: '评分' },
  slider: { category: 'basic', name: '滑动条' },
  transfer: { category: 'basic', name: '穿梭框' },
  treeselect: { category: 'basic', name: '树选择' },
  // 数据展示
  table: { category: 'advanced', name: '表格' },
  form: { category: 'advanced', name: '表单' },
  avatar: { category: 'advanced', name: '头像' },
  badge: { category: 'advanced', name: '徽标' },
  calendar: { category: 'advanced', name: '日历' },
  carousel: { category: 'advanced', name: '走马灯' },
  collapse: { category: 'advanced', name: '折叠面板' },
  descriptions: { category: 'advanced', name: '描述列表' },
  empty: { category: 'advanced', name: '空状态' },
  image: { category: 'advanced', name: '图片' },
  list: { category: 'advanced', name: '列表' },
  popover: { category: 'advanced', name: '气泡卡片' },
  qrcode: { category: 'advanced', name: '二维码' },
  segmented: { category: 'advanced', name: '分段器' },
  statistic: { category: 'advanced', name: '统计数值' },
  tag: { category: 'advanced', name: '标签' },
  timeline: { category: 'advanced', name: '时间轴' },
  tooltip: { category: 'advanced', name: '文字提示' },
  tour: { category: 'advanced', name: '漫游引导' },
  tree: { category: 'advanced', name: '树形控件' },
  // 反馈
  alert: { category: 'advanced', name: '警告提示' },
  drawer: { category: 'advanced', name: '抽屉' },
  modal: { category: 'advanced', name: '对话框' },
  popconfirm: { category: 'advanced', name: '气泡确认' },
  progress: { category: 'advanced', name: '进度条' },
  result: { category: 'advanced', name: '结果' },
  skeleton: { category: 'advanced', name: '骨架屏' },
  spin: { category: 'advanced', name: '加载中' },
  watermark: { category: 'advanced', name: '水印' },
  // 导航
  anchor: { category: 'layout', name: '锚点' },
  breadcrumb: { category: 'layout', name: '面包屑' },
  dropdown: { category: 'layout', name: '下拉菜单' },
  menu: { category: 'layout', name: '导航菜单' },
  pagination: { category: 'layout', name: '分页' },
  steps: { category: 'layout', name: '步骤条' },
  tabs: { category: 'layout', name: '标签页' },
  // 布局
  card: { category: 'layout', name: '卡片' },
  flex: { category: 'layout', name: '弹性布局' },
  grid: { category: 'layout', name: '栅格' },
  divider: { category: 'layout', name: '分割线' },
  layout: { category: 'layout', name: '布局' },
  sider: { category: 'layout', name: '侧边栏' },
  space: { category: 'layout', name: '间距' },
  splitter: { category: 'layout', name: '分隔面板' },
  // 通用
  floatbutton: { category: 'layout', name: '悬浮按钮' },
  affix: { category: 'layout', name: '固钉' },
  text: { category: 'basic', name: '文本' },
};

// ─── 容器组件 ─────────────────────────────────────────

export const antdContainerTypes = new Set([
  'form', 'card', 'flex', 'grid', 'tabs',
  'layout', 'sider', 'space', 'splitter',
  'collapse', 'list', 'popover', 'modal', 'drawer',
]);

// ─── JSON Schema 映射（含 BaseProps 继承）──────────────

/** antd 组件 JSON Schema 映射（已合并 BaseProps） */
export const antdSchemas: Record<string, JSONSchema7> = {
  // 原有
  input: withBaseProps(inputProps), textarea: withBaseProps(textareaProps),
  number: withBaseProps(numberProps), select: withBaseProps(selectProps),
  radio: withBaseProps(radioProps), checkbox: withBaseProps(checkboxProps),
  switch: withBaseProps(switchProps), datepicker: withBaseProps(datePickerProps),
  timepicker: withBaseProps(timePickerProps), upload: withBaseProps(uploadProps),
  button: withBaseProps(buttonProps), table: withBaseProps(tableProps),
  form: withBaseProps(formProps), card: withBaseProps(cardProps),
  flex: withBaseProps(flexProps), grid: withBaseProps(flexProps),
  divider: withBaseProps(dividerProps), tabs: withBaseProps(tabsProps),
  text: withBaseProps(textProps),
  // 数据录入
  autocomplete: withBaseProps(autoCompleteProps), cascader: withBaseProps(cascaderProps),
  colorpicker: withBaseProps(colorPickerProps), mentions: withBaseProps(mentionsProps),
  rate: withBaseProps(rateProps), slider: withBaseProps(sliderProps),
  transfer: withBaseProps(transferProps), treeselect: withBaseProps(treeSelectProps),
  // 数据展示
  avatar: withBaseProps(avatarProps), badge: withBaseProps(badgeProps),
  calendar: withBaseProps(calendarProps), carousel: withBaseProps(carouselProps),
  collapse: withBaseProps(collapseProps), descriptions: withBaseProps(descriptionsProps),
  empty: withBaseProps(emptyProps), image: withBaseProps(imageProps),
  list: withBaseProps(listProps), popover: withBaseProps(popoverProps),
  qrcode: withBaseProps(qrCodeProps), segmented: withBaseProps(segmentedProps),
  statistic: withBaseProps(statisticProps), tag: withBaseProps(tagProps),
  timeline: withBaseProps(timelineProps), tooltip: withBaseProps(tooltipProps),
  tour: withBaseProps(tourProps), tree: withBaseProps(treeProps),
  // 反馈
  alert: withBaseProps(alertProps), drawer: withBaseProps(drawerProps),
  modal: withBaseProps(modalProps), popconfirm: withBaseProps(popconfirmProps),
  progress: withBaseProps(progressProps), result: withBaseProps(resultProps),
  skeleton: withBaseProps(skeletonProps), spin: withBaseProps(spinProps),
  watermark: withBaseProps(watermarkProps),
  // 导航
  anchor: withBaseProps(anchorProps), breadcrumb: withBaseProps(breadcrumbProps),
  dropdown: withBaseProps(dropdownProps), menu: withBaseProps(menuProps),
  pagination: withBaseProps(paginationProps), steps: withBaseProps(stepsProps),
  // 布局
  layout: withBaseProps(layoutProps), sider: withBaseProps(siderProps),
  space: withBaseProps(spaceProps), splitter: withBaseProps(splitterProps),
  // 通用
  floatbutton: withBaseProps(floatButtonProps),
  affix: withBaseProps(affixProps),
};
