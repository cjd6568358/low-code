import type { ThemeConfig } from './theme';
import type { ActionChain } from './actions';

/**
 * 属性值类型 — 支持字面量、变量引用、表达式
 *
 * 字面量：直接存储值（string/number/boolean/object）
 * 变量引用：{ type: 'var', value: '$platform.web' }
 * 表达式：{ type: 'express', value: 'async () => { return $user.name; }' }
 */
export type PropValue =
  | any
  | { type: 'variable'; value: string }
  | { type: 'expression'; value: string };

/**
 * 变量引用对象
 */
export interface VariableBinding {
  type: 'variable';
  value: string;  // 如 "$platform.web"、"$user.name"
}

/**
 * 表达式对象
 */
export interface ExpressionBinding {
  type: 'expression';
  value: string;  // 如 "async () => { return $user.name; }"
}

/**
 * 页面水印配置
 *
 * 每个属性支持 PropValue（字面量/变量引用/表达式），
 * 运行时通过表达式引擎解析后传给 antd Watermark 组件。
 */
export interface WatermarkConfig {
  /** 是否启用（禁用时保留配置，仅停止渲染） */
  enabled?: boolean;
  /** 水印文字（支持字符串或多行数组） */
  content?: PropValue;
  /** 水印图片（与 content 二选一） */
  image?: PropValue;
  /** 旋转角度 */
  rotate?: PropValue;
  /** 层级 */
  zIndex?: PropValue;
  /** 字体样式 */
  font?: PropValue;
}

/**
 * 页面描述 JSON — 渲染器的消费契约
 */
export interface PageSchema {
  pageId: string;
  /** 资源名称（业务标识，唯一可读字段） */
  name: string;
  layout: LayoutConfig;
  components: ComponentNode[];
  rules?: PageRule[];
  /** 页面数据源表达式（单个表达式，多个请求用 Promise.all，执行结果赋给 $data） */
  dataSource?: string;
  /** 页面水印配置 */
  watermark?: WatermarkConfig;
  theme?: ThemeConfig;
  meta?: Record<string, any>;
}

/** 组件节点 — 页面描述的基本单元 */
export interface ComponentNode {
  id: string;
  type: string;
  /** 字段名（用于表单绑定和变量引用，如 input_01、select_02） */
  name: string;
  parentId?: string;
  props: Record<string, any>;
  events?: Record<string, ActionChain[]>;
  layout?: ComponentLayout;
  visible?: boolean | string;
  children?: string[];
  /** 组件级数据源配置（可选） */
  dataSource?: ComponentDataSource;
}

/** 组件级数据源配置 */
export interface ComponentDataSource {
  /** 数据源类型 */
  type: 'api' | 'server-variable';
  /** API 类型配置 */
  api?: ComponentApiConfig;
  /** 服务端变量表达式（如 $table.user.filter(...)） */
  serverVariable?: string;
  /** 目标属性（数据源结果注入到哪个 props） */
  targetProp: string;
  /** 是否自动加载（默认 true） */
  autoLoad?: boolean;
  /** 依赖的变量路径列表（用于依赖分析） */
  dependencies?: string[];
}

/** 组件级 API 配置 */
export interface ComponentApiConfig {
  /** API 地址（支持变量模板） */
  url: string;
  /** 请求方法 */
  method?: string;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求参数（支持变量模板） */
  params?: Record<string, any>;
  /** 响应数据路径（如 data.list） */
  dataPath?: string;
}

/** 服务端变量查询描述 */
export interface ServerVariableQuery {
  /** 表名 */
  table: string;
  /** 选择的字段 */
  select?: string[];
  /** 过滤条件 */
  where?: Record<string, any>;
  /** 排序 */
  orderBy?: Record<string, 'asc' | 'desc'>;
  /** 限制数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 聚合函数 */
  aggregate?: {
    type: 'count' | 'sum' | 'avg' | 'min' | 'max';
    field?: string;
  };
}

/**
 * 页面根节点布局配置
 *
 * flex 模式直接复用 antd Flex props（vertical/wrap/justify/align/gap），
 * grid 模式使用 columns + CSS Grid 属性。
 */
export interface LayoutConfig {
  type: 'grid' | 'flex';
  /** grid 模式列数 */
  columns?: number;
  /** 间距（flex/grid 通用） */
  gap?: string | number;
  // ── antd Flex props ──
  /** 是否垂直排列（对应 antd Flex.vertical） */
  vertical?: boolean;
  /** 自动换行（对应 antd Flex.wrap） */
  wrap?: boolean;
  /** 主轴对齐（对应 antd Flex.justify） */
  justify?: string;
  /** 交叉轴对齐（对应 antd Flex.align） */
  align?: string;
}

/** 组件布局定位 */
export interface ComponentLayout {
  col?: number;
  row?: number;
  colSpan?: number;
  rowSpan?: number;
  order?: number;
  flex?: string;
  alignSelf?: string;
}

/** 数据源配置（已废弃，页面数据源改为单表达式，保留类型避免编译报错） */
export interface DataSourceConfig {
  id: string;
  name: string;
  expression: string;
  dependencies?: string[];
}

export interface ApiConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: Record<string, any>;
}

export interface StaticConfig {
  data: any;
}

export interface ComputedConfig {
  expression: string;
  dependencies: string[];
}

/** 页面条件规则 */
export interface PageRule {
  id: string;
  targetId: string;
  condition: string;
  action: 'visible' | 'hidden' | 'disabled' | 'enabled' | 'setValue' | 'setProp';
  value?: any;
  priority?: number;
}
