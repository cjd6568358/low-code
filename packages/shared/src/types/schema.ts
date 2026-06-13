import type { ThemeConfig } from './theme';
import type { ActionChain } from './actions';

/**
 * 页面描述 JSON — 渲染器的消费契约
 */
export interface PageSchema {
  pageId: string;
  title: string;
  route: string;
  layout: LayoutConfig;
  components: ComponentNode[];
  rules?: PageRule[];
  dataSource?: DataSourceConfig[];
  theme?: ThemeConfig;
  meta?: Record<string, any>;
}

/** 组件节点 — 页面描述的基本单元 */
export interface ComponentNode {
  id: string;
  type: string;
  parentId?: string;
  props: Record<string, any>;
  events?: Record<string, ActionChain[]>;
  layout?: ComponentLayout;
  visible?: boolean | string;
  children?: string[];
  /** 权限配置（声明式，与 visible 表达式互补，AND 关系） */
  permission?: ComponentPermissionConfig;
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

/** 布局配置 */
export interface LayoutConfig {
  type: 'grid' | 'flex';
  columns?: number;
  gap?: number;
  direction?: 'row' | 'column';
  wrap?: boolean;
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

/** 数据源配置 — 页面级 API 声明 */
export interface DataSourceConfig {
  id: string;
  name: string;
  type: 'api' | 'static' | 'computed';
  config: ApiConfig | StaticConfig | ComputedConfig;
  autoLoad?: boolean;
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

/** 组件级权限配置（声明式） */
export interface ComponentPermissionConfig {
  /** 允许访问的角色 ID 列表（空 = 不限制） */
  allowedRoles?: string[];
  /** 允许访问的部门 ID 列表 */
  allowedDepartments?: string[];
  /** 允许访问的人员 ID 列表 */
  allowedUsers?: string[];
}
