/**
 * antd 组件清单 — 全量枚举
 *
 * 来源：antd 5.x index.d.ts 全部 export { default as XXX } 导出
 *
 * 使用方式：
 *   - 保留的组件：正常导出，必须在 antd-components.tsx 和 antd-library.ts 中实现
 *   - 注释掉的组件：不适合设计器拖拽，跳过注册
 *
 * 筛选标准：
 *   ✅ 适合拖拽：可在设计器画布中可视化编辑的组件
 *   ⚠️ 可选：有一定设计价值但使用场景较少
 *   ❌ 不适合：纯编程 API、全局配置、布局辅助、已废弃
 */

export interface AntdComponentMeta {
  /** antd 导出名（如 Input、DatePicker） */
  exportName: string;
  /** 组件库内部 type 标识（小写，如 input、datepicker） */
  type: string;
  /** 中文名称 */
  name: string;
  /** 分类 */
  category: "basic" | "advanced" | "layout" | "custom" | "business";
  /** 用途说明 */
  description: string;
  /** 是否适合设计器拖拽 */
  suitable: "✅" | "⚠️" | "❌";
  /** 不适合的原因（仅 suitable=❌ 时填写） */
  skipReason?: string;
}

/**
 * antd 全量组件清单
 *
 * 逐条注释后，注释掉 ❌ 的条目即可。
 * 剩余条目必须全部在 antd-components.tsx 中实现对应 wrapper。
 */
export const ANTD_MANIFEST: AntdComponentMeta[] = [
  // ═══════════════════════════════════════════════════
  // 通用 (4)
  // ═══════════════════════════════════════════════════

  {
    exportName: "Button",
    type: "button",
    name: "按钮",
    category: "basic",
    description: "按钮组件，支持类型/大小/加载/禁用/图标等",
    suitable: "✅",
  },
  {
    exportName: "FloatButton",
    type: "floatbutton",
    name: "悬浮按钮",
    category: "layout",
    description: "悬浮操作按钮，支持图标/描述/分组/回到顶部",
    suitable: "✅",
  },
  {
    exportName: "Icon",
    type: "icon",
    name: "图标",
    category: "basic",
    description: "antd v5 已移除内置 Icon，推荐使用 @ant-design/icons",
    suitable: "❌",
    skipReason: "antd v5 已废弃，使用 @ant-design/icons 包",
  },
  {
    exportName: "Typography",
    type: "text",
    name: "排版",
    category: "basic",
    description:
      "文本排版组件（Text/Title/Paragraph），支持可复制/可编辑/省略等",
    suitable: "✅",
  },

  // ═══════════════════════════════════════════════════
  // 布局 (7)
  // ═══════════════════════════════════════════════════

  {
    exportName: "Divider",
    type: "divider",
    name: "分割线",
    category: "layout",
    description: "区域分割线，支持水平/垂直、文字位置",
    suitable: "✅",
  },
  {
    exportName: "Flex",
    type: "flex",
    name: "弹性布局",
    category: "layout",
    description: "Flex 弹性布局容器，支持方向/对齐/换行/间距",
    suitable: "✅",
  },
  {
    exportName: "Grid",
    type: "grid",
    name: "栅格",
    category: "layout",
    description: "24 栅格系统（Row + Col），支持响应式/偏移/排序",
    suitable: "✅",
  },
  {
    exportName: "Layout",
    type: "layout",
    name: "布局",
    category: "layout",
    description:
      "页面整体布局（Header/Footer/Sider/Content），常用于后台管理框架",
    suitable: "⚠️",
  },
  {
    exportName: "Layout.Sider",
    type: "sider",
    name: "侧边栏",
    category: "layout",
    description: "Layout 侧边栏，支持折叠/宽度/断点/主题",
    suitable: "✅",
  },
  {
    exportName: "Masonry",
    type: "masonry",
    name: "瀑布流",
    category: "layout",
    description: "瀑布流布局容器（antd 实际未导出此组件）",
    suitable: "❌",
    skipReason: "antd 不导出此组件",
  },
  {
    exportName: "Space",
    type: "space",
    name: "间距",
    category: "layout",
    description: "元素间距容器，支持方向/对齐/换行/分隔符",
    suitable: "✅",
  },
  {
    exportName: "Splitter",
    type: "splitter",
    name: "分隔面板",
    category: "layout",
    description: "可拖拽调整大小的分隔面板，支持折叠/懒加载",
    suitable: "✅",
  },

  // ═══════════════════════════════════════════════════
  // 导航 (7)
  // ═══════════════════════════════════════════════════

  {
    exportName: "Anchor",
    type: "anchor",
    name: "锚点",
    category: "advanced",
    description: "页面锚点链接，支持固定/方向/偏移",
    suitable: "⚠️",
  },
  {
    exportName: "Breadcrumb",
    type: "breadcrumb",
    name: "面包屑",
    category: "advanced",
    description: "面包屑导航，支持自定义分隔符/路由",
    suitable: "✅",
  },
  {
    exportName: "Dropdown",
    type: "dropdown",
    name: "下拉菜单",
    category: "advanced",
    description: "下拉菜单触发器，支持点击/悬停/右键触发",
    suitable: "✅",
  },
  {
    exportName: "Menu",
    type: "menu",
    name: "导航菜单",
    category: "advanced",
    description: "导航菜单，支持水平/垂直/内联模式，子菜单/分组/分割线",
    suitable: "✅",
  },
  {
    exportName: "Pagination",
    type: "pagination",
    name: "分页",
    category: "advanced",
    description: "分页器，支持页码/条数切换/快速跳转/总数显示",
    suitable: "✅",
  },
  {
    exportName: "Steps",
    type: "steps",
    name: "步骤条",
    category: "advanced",
    description: "步骤条引导，支持方向/类型/进度点/自定义图标",
    suitable: "✅",
  },
  {
    exportName: "Tabs",
    type: "tabs",
    name: "标签页",
    category: "layout",
    description: "标签页切换，支持位置/类型/可编辑/动画",
    suitable: "✅",
  },

  // ═══════════════════════════════════════════════════
  // 数据录入 (18)
  // ═══════════════════════════════════════════════════

  {
    exportName: "AutoComplete",
    type: "autocomplete",
    name: "自动完成",
    category: "basic",
    description: "自动完成输入框，支持远程搜索/自定义选项",
    suitable: "✅",
  },
  {
    exportName: "Cascader",
    type: "cascader",
    name: "级联选择",
    category: "basic",
    description: "级联选择器，支持多选/搜索/自定义字段名",
    suitable: "✅",
  },
  {
    exportName: "Checkbox",
    type: "checkbox",
    name: "多选框",
    category: "basic",
    description: "多选框组件，支持 Group 组合/禁用/半选",
    suitable: "✅",
  },
  {
    exportName: "ColorPicker",
    type: "colorpicker",
    name: "颜色选择",
    category: "basic",
    description: "颜色选择器，支持格式切换/预设/透明度",
    suitable: "✅",
  },
  {
    exportName: "DatePicker",
    type: "datepicker",
    name: "日期选择",
    category: "basic",
    description: "日期选择器，支持时间/周/月/季/年/范围选择",
    suitable: "✅",
  },
  {
    exportName: "Form",
    type: "form",
    name: "表单",
    category: "advanced",
    description: "表单容器，支持布局/校验/联动/动态字段",
    suitable: "✅",
  },
  {
    exportName: "Input",
    type: "input",
    name: "输入框",
    category: "basic",
    description: "文本输入框，支持前缀/后缀/前后标签/字数统计/清除",
    suitable: "✅",
  },
  {
    exportName: "Input.TextArea",
    type: "textarea",
    name: "文本域",
    category: "basic",
    description: "多行文本输入框，支持行数/自适应高度/字数统计",
    suitable: "✅",
  },
  {
    exportName: "InputNumber",
    type: "number",
    name: "数字输入",
    category: "basic",
    description: "数字输入框，支持步长/范围/精度/前后缀",
    suitable: "✅",
  },
  {
    exportName: "Mentions",
    type: "mentions",
    name: "提及",
    category: "basic",
    description: "提及输入框，支持 @ 某人/远程搜索",
    suitable: "⚠️",
  },
  {
    exportName: "Radio",
    type: "radio",
    name: "单选框",
    category: "basic",
    description: "单选框组件，支持 Group 组合/按钮样式",
    suitable: "✅",
  },
  {
    exportName: "Rate",
    type: "rate",
    name: "评分",
    category: "basic",
    description: "评分组件，支持半选/自定义字符/清除",
    suitable: "✅",
  },
  {
    exportName: "Select",
    type: "select",
    name: "选择器",
    category: "basic",
    description: "选择器，支持搜索/多选/标签/远程/自定义选项",
    suitable: "✅",
  },
  {
    exportName: "Slider",
    type: "slider",
    name: "滑动条",
    category: "basic",
    description: "滑动输入条，支持范围/标记/垂直/步长",
    suitable: "✅",
  },
  {
    exportName: "Switch",
    type: "switch",
    name: "开关",
    category: "basic",
    description: "开关组件，支持自定义选中/非选中文案",
    suitable: "✅",
  },
  {
    exportName: "TimePicker",
    type: "timepicker",
    name: "时间选择",
    category: "basic",
    description: "时间选择器，支持格式/步长/12小时制",
    suitable: "✅",
  },
  {
    exportName: "Transfer",
    type: "transfer",
    name: "穿梭框",
    category: "basic",
    description: "双栏穿梭选择框，支持搜索/分页/单向/自定义渲染",
    suitable: "✅",
  },
  {
    exportName: "TreeSelect",
    type: "treeselect",
    name: "树选择",
    category: "basic",
    description: "树形选择器，支持多选/可勾选/搜索",
    suitable: "✅",
  },
  {
    exportName: "Upload",
    type: "upload",
    name: "上传",
    category: "basic",
    description: "文件上传组件，支持拖拽/多选/目录/自定义列表",
    suitable: "✅",
  },

  // ═══════════════════════════════════════════════════
  // 数据展示 (20)
  // ═══════════════════════════════════════════════════

  {
    exportName: "Avatar",
    type: "avatar",
    name: "头像",
    category: "advanced",
    description: "头像组件，支持图片/图标/字符/形状/组合",
    suitable: "✅",
  },
  {
    exportName: "Badge",
    type: "badge",
    name: "徽标数",
    category: "advanced",
    description: "徽标数组件，支持红点/数字/封顶/状态点/颜色",
    suitable: "✅",
  },
  {
    exportName: "Calendar",
    type: "calendar",
    name: "日历",
    category: "advanced",
    description: "日历组件，支持月/年切换、自定义单元格",
    suitable: "✅",
  },
  {
    exportName: "Card",
    type: "card",
    name: "卡片",
    category: "layout",
    description: "卡片容器，支持标题/额外操作/悬浮效果/加载",
    suitable: "✅",
  },
  {
    exportName: "Carousel",
    type: "carousel",
    name: "走马灯",
    category: "advanced",
    description: "轮播走马灯，支持自动播放/方向/动效",
    suitable: "✅",
  },
  {
    exportName: "Collapse",
    type: "collapse",
    name: "折叠面板",
    category: "advanced",
    description: "折叠面板，支持手风琴/幽灵模式/图标位置",
    suitable: "✅",
  },
  {
    exportName: "Descriptions",
    type: "descriptions",
    name: "描述列表",
    category: "advanced",
    description: "描述列表，支持边框/列数/布局/冒号",
    suitable: "✅",
  },
  {
    exportName: "Empty",
    type: "empty",
    name: "空状态",
    category: "advanced",
    description: "空状态占位图，支持自定义图片/描述",
    suitable: "✅",
  },
  {
    exportName: "Image",
    type: "image",
    name: "图片",
    category: "advanced",
    description: "图片组件，支持预览/懒加载/兜底图",
    suitable: "✅",
  },
  {
    exportName: "List",
    type: "list",
    name: "列表",
    category: "advanced",
    description: "列表组件，支持分页/加载/栅格/头部/底部",
    suitable: "✅",
  },
  {
    exportName: "Popover",
    type: "popover",
    name: "气泡卡片",
    category: "advanced",
    description: "气泡卡片弹出层，支持标题/内容/触发方式/位置",
    suitable: "✅",
  },
  {
    exportName: "QRCode",
    type: "qrcode",
    name: "二维码",
    category: "advanced",
    description: "二维码组件，支持自定义图标/大小/状态/纠错级别",
    suitable: "✅",
  },
  {
    exportName: "Segmented",
    type: "segmented",
    name: "分段控制器",
    category: "advanced",
    description: "分段控制器，支持选项/块级/垂直/形状",
    suitable: "✅",
  },
  {
    exportName: "Statistic",
    type: "statistic",
    name: "统计数值",
    category: "advanced",
    description: "统计数值展示，支持前缀/后缀/精度/千分符/倒计时",
    suitable: "✅",
  },
  {
    exportName: "Table",
    type: "table",
    name: "表格",
    category: "advanced",
    description: "表格组件，支持排序/筛选/分页/虚拟滚动/展开行",
    suitable: "✅",
  },
  {
    exportName: "Tag",
    type: "tag",
    name: "标签",
    category: "advanced",
    description: "标签组件，支持颜色/可关闭/图标/边框/可选中",
    suitable: "✅",
  },
  {
    exportName: "Timeline",
    type: "timeline",
    name: "时间轴",
    category: "advanced",
    description: "时间轴组件，支持模式/颜色/自定义节点",
    suitable: "✅",
  },
  {
    exportName: "Tooltip",
    type: "tooltip",
    name: "文字提示",
    category: "advanced",
    description: "文字提示气泡，支持位置/颜色/箭头",
    suitable: "✅",
  },
  {
    exportName: "Tour",
    type: "tour",
    name: "漫游式引导",
    category: "advanced",
    description: "漫游式引导组件，支持步骤/类型/自定义操作",
    suitable: "⚠️",
  },
  {
    exportName: "Tree",
    type: "tree",
    name: "树形控件",
    category: "advanced",
    description: "树形控件，支持勾选/拖拽/展开/连接线/自定义图标",
    suitable: "✅",
  },

  // ═══════════════════════════════════════════════════
  // 反馈 (11)
  // ═══════════════════════════════════════════════════

  {
    exportName: "Alert",
    type: "alert",
    name: "警告提示",
    category: "advanced",
    description: "警告提示组件，支持类型/图标/可关闭/横幅/操作",
    suitable: "✅",
  },
  {
    exportName: "Drawer",
    type: "drawer",
    name: "抽屉",
    category: "advanced",
    description: "抽屉弹出层，支持方向/大小/标题/底部/加载",
    suitable: "✅",
  },
  {
    exportName: "Message",
    type: "message",
    name: "全局提示",
    category: "advanced",
    description:
      "全局提示（编程式 API：message.success/error/info），不适合拖拽",
    suitable: "❌",
    skipReason: "纯编程式 API，通过事件动作系统调用，不在画布中拖拽",
  },
  {
    exportName: "Modal",
    type: "modal",
    name: "对话框",
    category: "advanced",
    description: "对话框组件，支持标题/确认/取消/居中/加载/自定义底部",
    suitable: "✅",
  },
  {
    exportName: "Notification",
    type: "notification",
    name: "通知提醒框",
    category: "advanced",
    description: "通知提醒框（编程式 API：notification.open），不适合拖拽",
    suitable: "❌",
    skipReason: "纯编程式 API，通过事件动作系统调用，不在画布中拖拽",
  },
  {
    exportName: "Popconfirm",
    type: "popconfirm",
    name: "气泡确认框",
    category: "advanced",
    description: "气泡确认框，支持标题/描述/确认/取消",
    suitable: "✅",
  },
  {
    exportName: "Progress",
    type: "progress",
    name: "进度条",
    category: "advanced",
    description: "进度条组件，支持线/圈/仪表盘类型、颜色/步骤",
    suitable: "✅",
  },
  {
    exportName: "Result",
    type: "result",
    name: "结果",
    category: "advanced",
    description: "结果展示页，支持状态/标题/副标题/额外内容",
    suitable: "✅",
  },
  {
    exportName: "Skeleton",
    type: "skeleton",
    name: "骨架屏",
    category: "advanced",
    description: "骨架屏占位，支持动画/头像/标题/段落/圆角",
    suitable: "✅",
  },
  {
    exportName: "Spin",
    type: "spin",
    name: "加载中",
    category: "advanced",
    description: "加载中旋转指示器，支持大小/提示/延迟/全屏",
    suitable: "✅",
  },
  {
    exportName: "Watermark",
    type: "watermark",
    name: "水印",
    category: "advanced",
    description: "水印组件，支持文字/图片/旋转/间距/继承",
    suitable: "❌",
    skipReason: "水印功能已经集成到页面设置中，不需要在设计器中拖拽",
  },

  // ═══════════════════════════════════════════════════
  // 其他 (5)
  // ═══════════════════════════════════════════════════

  {
    exportName: "Affix",
    type: "affix",
    name: "固钉",
    category: "layout",
    description: "固钉组件，支持固定位置/偏移/目标容器",
    suitable: "⚠️",
  },
  {
    exportName: "App",
    type: "app",
    name: "包裹组件",
    category: "basic",
    description:
      "全局包裹组件，提供 message/notification/modal 的静态方法上下文",
    suitable: "❌",
    skipReason: "全局上下文容器，不需要在设计器中拖拽",
  },
  {
    exportName: "ConfigProvider",
    type: "configprovider",
    name: "全局化配置",
    category: "basic",
    description: "全局配置组件（主题/国际化/组件大小/波纹效果），不需要拖拽",
    suitable: "❌",
    skipReason: "全局配置，通过应用级设置控制，不在画布中拖拽",
  },
  {
    exportName: "Row",
    type: "row",
    name: "行容器",
    category: "layout",
    description: "Grid 栅格行容器（Row + Col 配合使用），已被 Grid 组件覆盖",
    suitable: "❌",
    skipReason: "Grid 组件已包含 Row/Col，不需要单独注册",
  },
  {
    exportName: "Col",
    type: "col",
    name: "列容器",
    category: "layout",
    description: "Grid 栅格列容器（Row + Col 配合使用），已被 Grid 组件覆盖",
    suitable: "❌",
    skipReason: "Grid 组件已包含 Row/Col，不需要单独注册",
  },
];
