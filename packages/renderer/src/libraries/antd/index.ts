/**
 * Ant Design 6.x 组件库定义
 *
 * 每个组件一个目录，包含：
 * - component.tsx  — withPlatform 包装
 * - schema.ts      — Props 接口（JSDoc 含 x-group/x-priority/中文标题）
 * - {type}.json    — 从 TS 类型自动生成的 JSON Schema
 *
 * 新增组件库只需实现同结构的目录并在 Designer 中传入 library 名即可。
 */
import type { JSONSchema7 } from '@low-code/shared';

// ─── 组件实现映射（从 components.ts 导出） ──────────────
export { antdPlatformComponents as antdComponentImpls } from './components';

// ─── BaseProps 定义 ─────────────────────────────────────
export type { BaseProps } from './base-props';

// ─── 组件清单（全量枚举，用于筛选适合设计器拖拽的组件） ──
export { ANTD_MANIFEST } from './manifest';
export type { AntdComponentMeta } from './manifest';

// ─── 组件分类映射（参照 antd 官方分类） ────────────────

export const antdCategoryMap: Record<string, { category: 'general' | 'layout' | 'navigation' | 'data-entry' | 'data-display' | 'feedback' | 'basic' | 'advanced' | 'custom' | 'business'; name: string }> = {
  // ── 通用 ──
  button: { category: 'general', name: '按钮' },
  text: { category: 'general', name: '文本' },
  // ── 布局 ──
  divider: { category: 'layout', name: '分割线' },
  flex: { category: 'layout', name: '弹性布局' },
  grid: { category: 'layout', name: '栅格' },
  layout: { category: 'layout', name: '布局' },
  sider: { category: 'layout', name: '侧边栏' },
  space: { category: 'layout', name: '间距' },
  splitter: { category: 'layout', name: '分隔面板' },
  // ── 导航 ──
  anchor: { category: 'navigation', name: '锚点' },
  breadcrumb: { category: 'navigation', name: '面包屑' },
  dropdown: { category: 'navigation', name: '下拉菜单' },
  menu: { category: 'navigation', name: '导航菜单' },
  pagination: { category: 'navigation', name: '分页' },
  steps: { category: 'navigation', name: '步骤条' },
  tabs: { category: 'navigation', name: '标签页' },
  // ── 数据录入 ──
  autocomplete: { category: 'data-entry', name: '自动完成' },
  cascader: { category: 'data-entry', name: '级联选择' },
  checkbox: { category: 'data-entry', name: '多选' },
  colorpicker: { category: 'data-entry', name: '颜色选择' },
  datepicker: { category: 'data-entry', name: '日期选择' },
  form: { category: 'data-entry', name: '表单' },
  input: { category: 'data-entry', name: '输入框' },
  textarea: { category: 'data-entry', name: '文本域' },
  number: { category: 'data-entry', name: '数字输入' },
  mentions: { category: 'data-entry', name: '提及' },
  radio: { category: 'data-entry', name: '单选' },
  rate: { category: 'data-entry', name: '评分' },
  select: { category: 'data-entry', name: '选择器' },
  slider: { category: 'data-entry', name: '滑动条' },
  switch: { category: 'data-entry', name: '开关' },
  timepicker: { category: 'data-entry', name: '时间选择' },
  transfer: { category: 'data-entry', name: '穿梭框' },
  treeselect: { category: 'data-entry', name: '树选择' },
  upload: { category: 'data-entry', name: '上传' },
  // ── 数据展示 ──
  avatar: { category: 'data-display', name: '头像' },
  badge: { category: 'data-display', name: '徽标' },
  calendar: { category: 'data-display', name: '日历' },
  card: { category: 'data-display', name: '卡片' },
  carousel: { category: 'data-display', name: '走马灯' },
  collapse: { category: 'data-display', name: '折叠面板' },
  descriptions: { category: 'data-display', name: '描述列表' },
  empty: { category: 'data-display', name: '空状态' },
  image: { category: 'data-display', name: '图片' },
  list: { category: 'data-display', name: '列表' },
  popover: { category: 'data-display', name: '气泡卡片' },
  qrcode: { category: 'data-display', name: '二维码' },
  segmented: { category: 'data-display', name: '分段器' },
  statistic: { category: 'data-display', name: '统计数值' },
  table: { category: 'data-display', name: '表格' },
  tag: { category: 'data-display', name: '标签' },
  timeline: { category: 'data-display', name: '时间轴' },
  tooltip: { category: 'data-display', name: '文字提示' },
  tour: { category: 'data-display', name: '漫游引导' },
  tree: { category: 'data-display', name: '树形控件' },
  // ── 反馈 ──
  alert: { category: 'feedback', name: '警告提示' },
  drawer: { category: 'feedback', name: '抽屉' },
  modal: { category: 'feedback', name: '对话框' },
  popconfirm: { category: 'feedback', name: '气泡确认' },
  progress: { category: 'feedback', name: '进度条' },
  result: { category: 'feedback', name: '结果' },
  skeleton: { category: 'feedback', name: '骨架屏' },
  spin: { category: 'feedback', name: '加载中' },
  // watermark 已集成到页面设置，不在设计器面板展示
  // ── 通用（补充） ──
  floatbutton: { category: 'general', name: '悬浮按钮' },
  affix: { category: 'general', name: '固钉' },
};

// ─── 容器组件 ─────────────────────────────────────────

export const antdContainerTypes = new Set([
  'form', 'card', 'flex', 'grid', 'tabs',
  'layout', 'sider', 'space', 'splitter',
  'collapse', 'list', 'popover', 'modal', 'drawer',
]);

// ─── JSON Schema 映射 ─────────────────────────────────
// 每个组件的 JSON Schema 从组件目录直接导入（已包含 BaseProps + 注解）

import buttonSchema from './button/button.json';
import textSchema from './text/text.json';
import dividerSchema from './divider/divider.json';
import flexSchema from './flex/flex.json';
import gridSchema from './grid/grid.json';
import layoutSchema from './layout/layout.json';
import siderSchema from './sider/sider.json';
import spaceSchema from './space/space.json';
import splitterSchema from './splitter/splitter.json';
import anchorSchema from './anchor/anchor.json';
import breadcrumbSchema from './breadcrumb/breadcrumb.json';
import dropdownSchema from './dropdown/dropdown.json';
import menuSchema from './menu/menu.json';
import paginationSchema from './pagination/pagination.json';
import stepsSchema from './steps/steps.json';
import tabsSchema from './tabs/tabs.json';
import autocompleteSchema from './autocomplete/autocomplete.json';
import cascaderSchema from './cascader/cascader.json';
import checkboxSchema from './checkbox/checkbox.json';
import colorpickerSchema from './colorpicker/colorpicker.json';
import datepickerSchema from './datepicker/datepicker.json';
import formSchema from './form/form.json';
import inputSchema from './input/input.json';
import textareaSchema from './textarea/textarea.json';
import numberSchema from './number/number.json';
import mentionsSchema from './mentions/mentions.json';
import radioSchema from './radio/radio.json';
import rateSchema from './rate/rate.json';
import selectSchema from './select/select.json';
import sliderSchema from './slider/slider.json';
import switchSchema from './switch/switch.json';
import timepickerSchema from './timepicker/timepicker.json';
import transferSchema from './transfer/transfer.json';
import treeselectSchema from './treeselect/treeselect.json';
import uploadSchema from './upload/upload.json';
import avatarSchema from './avatar/avatar.json';
import badgeSchema from './badge/badge.json';
import calendarSchema from './calendar/calendar.json';
import cardSchema from './card/card.json';
import carouselSchema from './carousel/carousel.json';
import collapseSchema from './collapse/collapse.json';
import descriptionsSchema from './descriptions/descriptions.json';
import emptySchema from './empty/empty.json';
import imageSchema from './image/image.json';
import listSchema from './list/list.json';
import popoverSchema from './popover/popover.json';
import qrcodeSchema from './qrcode/qrcode.json';
import segmentedSchema from './segmented/segmented.json';
import statisticSchema from './statistic/statistic.json';
import tableSchema from './table/table.json';
import tagSchema from './tag/tag.json';
import timelineSchema from './timeline/timeline.json';
import tooltipSchema from './tooltip/tooltip.json';
import tourSchema from './tour/tour.json';
import treeSchema from './tree/tree.json';
import alertSchema from './alert/alert.json';
import drawerSchema from './drawer/drawer.json';
import modalSchema from './modal/modal.json';
import popconfirmSchema from './popconfirm/popconfirm.json';
import progressSchema from './progress/progress.json';
import resultSchema from './result/result.json';
import skeletonSchema from './skeleton/skeleton.json';
import spinSchema from './spin/spin.json';
import watermarkSchema from './watermark/watermark.json';
import floatbuttonSchema from './floatbutton/floatbutton.json';
import affixSchema from './affix/affix.json';

export const antdSchemas: Record<string, JSONSchema7> = {
  button: buttonSchema as JSONSchema7,
  text: textSchema as JSONSchema7,
  divider: dividerSchema as JSONSchema7,
  flex: flexSchema as JSONSchema7,
  grid: gridSchema as JSONSchema7,
  layout: layoutSchema as JSONSchema7,
  sider: siderSchema as JSONSchema7,
  space: spaceSchema as JSONSchema7,
  splitter: splitterSchema as JSONSchema7,
  anchor: anchorSchema as JSONSchema7,
  breadcrumb: breadcrumbSchema as JSONSchema7,
  dropdown: dropdownSchema as JSONSchema7,
  menu: menuSchema as JSONSchema7,
  pagination: paginationSchema as JSONSchema7,
  steps: stepsSchema as JSONSchema7,
  tabs: tabsSchema as JSONSchema7,
  autocomplete: autocompleteSchema as JSONSchema7,
  cascader: cascaderSchema as JSONSchema7,
  checkbox: checkboxSchema as JSONSchema7,
  colorpicker: colorpickerSchema as JSONSchema7,
  datepicker: datepickerSchema as JSONSchema7,
  form: formSchema as JSONSchema7,
  input: inputSchema as JSONSchema7,
  textarea: textareaSchema as JSONSchema7,
  number: numberSchema as JSONSchema7,
  mentions: mentionsSchema as JSONSchema7,
  radio: radioSchema as JSONSchema7,
  rate: rateSchema as JSONSchema7,
  select: selectSchema as JSONSchema7,
  slider: sliderSchema as JSONSchema7,
  switch: switchSchema as JSONSchema7,
  timepicker: timepickerSchema as JSONSchema7,
  transfer: transferSchema as JSONSchema7,
  treeselect: treeselectSchema as JSONSchema7,
  upload: uploadSchema as JSONSchema7,
  avatar: avatarSchema as JSONSchema7,
  badge: badgeSchema as JSONSchema7,
  calendar: calendarSchema as JSONSchema7,
  card: cardSchema as JSONSchema7,
  carousel: carouselSchema as JSONSchema7,
  collapse: collapseSchema as JSONSchema7,
  descriptions: descriptionsSchema as JSONSchema7,
  empty: emptySchema as JSONSchema7,
  image: imageSchema as JSONSchema7,
  list: listSchema as JSONSchema7,
  popover: popoverSchema as JSONSchema7,
  qrcode: qrcodeSchema as JSONSchema7,
  segmented: segmentedSchema as JSONSchema7,
  statistic: statisticSchema as JSONSchema7,
  table: tableSchema as JSONSchema7,
  tag: tagSchema as JSONSchema7,
  timeline: timelineSchema as JSONSchema7,
  tooltip: tooltipSchema as JSONSchema7,
  tour: tourSchema as JSONSchema7,
  tree: treeSchema as JSONSchema7,
  alert: alertSchema as JSONSchema7,
  drawer: drawerSchema as JSONSchema7,
  modal: modalSchema as JSONSchema7,
  popconfirm: popconfirmSchema as JSONSchema7,
  progress: progressSchema as JSONSchema7,
  result: resultSchema as JSONSchema7,
  skeleton: skeletonSchema as JSONSchema7,
  spin: spinSchema as JSONSchema7,
  watermark: watermarkSchema as JSONSchema7,
  floatbutton: floatbuttonSchema as JSONSchema7,
  affix: affixSchema as JSONSchema7,
};
