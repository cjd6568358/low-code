/**
 * antd 平台组件 — 统一注册
 *
 * 所有 antd 组件通过 withPlatform HOC 包装，
 * 注入平台能力（field/events/linkage）+ 设计态 props 过滤。
 *
 * 分类参照 antd 官方：通用/布局/导航/数据录入/数据展示/反馈
 *
 * 每个组件目录结构：
 * - component.tsx  — withPlatform 包装
 * - schema.ts      — TS 类型注解（x-group/x-priority）
 * - {type}.json    — 自动生成的 JSON Schema
 */
import React from 'react';
import {
  // 通用
  Typography,
  // 布局
  Divider, Row, Layout, Space, Splitter, Flex,
  // Layout 子组件
  // Sider 通过 Layout.Sider 访问
  // 导航
  Anchor, Breadcrumb, Dropdown, Menu, Pagination, Steps, Tabs,
  // 数据录入
  AutoComplete, Cascader, Checkbox, ColorPicker, DatePicker, Form,
  Input, InputNumber, Mentions, Radio, Rate, Select, Slider,
  Switch, TimePicker, Transfer, TreeSelect, Upload,
  // 数据展示
  Avatar, Badge, Calendar, Card, Carousel, Collapse, Descriptions,
  Empty, Image, List, Popover, QRCode, Segmented, Statistic,
  Table, Tag, Timeline, Tooltip, Tour, Tree,
  // 反馈
  Alert, Drawer, Modal, Popconfirm, Progress,
  Result, Skeleton, Spin, Watermark,
  // 通用（补充）
  FloatButton, Affix,
} from 'antd';
import { withPlatform } from '../../components/platform';

// 从组件目录导入（每个组件一个目录：component.tsx + schema.ts + {type}.json）
import { PlatformButton } from './button';
import { PlatformForm } from './form';
export { PlatformButton, PlatformForm };

const { Text } = Typography;
const { TextArea } = Input;

// ─── 通用 ──────────────────────────────────────────────

export const PlatformText = withPlatform(Text);

// ─── 布局 ──────────────────────────────────────────────

export const PlatformDivider = withPlatform(Divider);
export const PlatformFlex = withPlatform(Flex);
export const PlatformGrid = withPlatform(Row); // antd Grid (Row/Col)
export const PlatformLayout = withPlatform(Layout);
export const PlatformSider = withPlatform(Layout.Sider);
export const PlatformSpace = withPlatform(Space);
export const PlatformSplitter = withPlatform(Splitter);

// ─── 导航 ──────────────────────────────────────────────

export const PlatformAnchor = withPlatform(Anchor);
export const PlatformBreadcrumb = withPlatform(Breadcrumb);
export const PlatformDropdown = withPlatform(Dropdown);
export const PlatformMenu = withPlatform(Menu);
export const PlatformPagination = withPlatform(Pagination);
export const PlatformSteps = withPlatform(Steps);
export const PlatformTabs = withPlatform(Tabs);

// ─── 数据录入 ──────────────────────────────────────────

export const PlatformAutoComplete = withPlatform(AutoComplete);
export const PlatformCascader = withPlatform(Cascader);
export const PlatformCheckbox = withPlatform(Checkbox);
export const PlatformColorPicker = withPlatform(ColorPicker);
export const PlatformDatePicker = withPlatform(DatePicker);
export const PlatformInput = withPlatform(Input);
export const PlatformInputNumber = withPlatform(InputNumber);
export const PlatformMentions = withPlatform(Mentions);
export const PlatformRadio = withPlatform(Radio);
export const PlatformRate = withPlatform(Rate);
export const PlatformSelect = withPlatform(Select);
export const PlatformSlider = withPlatform(Slider);
export const PlatformSwitch = withPlatform(Switch);
export const PlatformTextarea = withPlatform(TextArea);
export const PlatformTimePicker = withPlatform(TimePicker);
export const PlatformTransfer = withPlatform(Transfer);
export const PlatformTreeSelect = withPlatform(TreeSelect);
export const PlatformUpload = withPlatform(Upload);

// ─── 数据展示 ──────────────────────────────────────────

export const PlatformAvatar = withPlatform(Avatar);
export const PlatformBadge = withPlatform(Badge);
export const PlatformCalendar = withPlatform(Calendar);
export const PlatformCard = withPlatform(Card);
export const PlatformCarousel = withPlatform(Carousel);
export const PlatformCollapse = withPlatform(Collapse);
export const PlatformDescriptions = withPlatform(Descriptions);
export const PlatformEmpty = withPlatform(Empty);
export const PlatformImage = withPlatform(Image);
export const PlatformList = withPlatform(List);
export const PlatformPopover = withPlatform(Popover);
export const PlatformQRCode = withPlatform(QRCode);
export const PlatformSegmented = withPlatform(Segmented);
export const PlatformStatistic = withPlatform(Statistic) as React.ComponentType<any>;
export const PlatformTable = withPlatform(Table);
export const PlatformTag = withPlatform(Tag);
export const PlatformTimeline = withPlatform(Timeline);
export const PlatformTooltip = withPlatform(Tooltip) as React.ComponentType<any>;
export const PlatformTour = withPlatform(Tour);
export const PlatformTree = withPlatform(Tree);

// ─── 反馈 ──────────────────────────────────────────────

export const PlatformAlert = withPlatform(Alert);
export const PlatformDrawer = withPlatform(Drawer);
export const PlatformModal = withPlatform(Modal);
export const PlatformPopconfirm = withPlatform(Popconfirm);
export const PlatformProgress = withPlatform(Progress);
export const PlatformResult = withPlatform(Result);
export const PlatformSkeleton = withPlatform(Skeleton);
export const PlatformSpin = withPlatform(Spin);
export const PlatformWatermark = withPlatform(Watermark);

// ─── 通用（补充） ──────────────────────────────────────

export const PlatformFloatButton = withPlatform(FloatButton);
export const PlatformAffix = withPlatform(Affix) as React.ComponentType<any>;

// ─── 组件映射表（type → 平台组件） ─────────────────────

export const antdPlatformComponents: Record<string, React.ComponentType<any>> = {
  // 通用
  button: PlatformButton, text: PlatformText,
  // 布局
  divider: PlatformDivider, flex: PlatformFlex, grid: PlatformGrid,
  layout: PlatformLayout, sider: PlatformSider, space: PlatformSpace, splitter: PlatformSplitter,
  // 导航
  anchor: PlatformAnchor, breadcrumb: PlatformBreadcrumb, dropdown: PlatformDropdown,
  menu: PlatformMenu, pagination: PlatformPagination, steps: PlatformSteps, tabs: PlatformTabs,
  // 数据录入
  autocomplete: PlatformAutoComplete, cascader: PlatformCascader, checkbox: PlatformCheckbox,
  colorpicker: PlatformColorPicker, datepicker: PlatformDatePicker, form: PlatformForm,
  input: PlatformInput, number: PlatformInputNumber, mentions: PlatformMentions,
  radio: PlatformRadio, rate: PlatformRate, select: PlatformSelect, slider: PlatformSlider,
  switch: PlatformSwitch, textarea: PlatformTextarea, timepicker: PlatformTimePicker,
  transfer: PlatformTransfer, treeselect: PlatformTreeSelect, upload: PlatformUpload,
  // 数据展示
  avatar: PlatformAvatar, badge: PlatformBadge, calendar: PlatformCalendar, card: PlatformCard,
  carousel: PlatformCarousel, collapse: PlatformCollapse, descriptions: PlatformDescriptions,
  empty: PlatformEmpty, image: PlatformImage, list: PlatformList, popover: PlatformPopover,
  qrcode: PlatformQRCode, segmented: PlatformSegmented, statistic: PlatformStatistic,
  table: PlatformTable, tag: PlatformTag, timeline: PlatformTimeline, tooltip: PlatformTooltip,
  tour: PlatformTour, tree: PlatformTree,
  // 反馈
  alert: PlatformAlert, drawer: PlatformDrawer, modal: PlatformModal,
  popconfirm: PlatformPopconfirm, progress: PlatformProgress, result: PlatformResult,
  skeleton: PlatformSkeleton, spin: PlatformSpin, watermark: PlatformWatermark,
  // 通用（补充）
  floatbutton: PlatformFloatButton, affix: PlatformAffix,
};
