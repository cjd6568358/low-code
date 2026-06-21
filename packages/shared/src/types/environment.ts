/**
 * 环境变量类型定义
 *
 * 定义页面运行时可用的环境变量体系，包括：
 * - $user: 当前用户信息
 * - $platform: 平台标识
 * - $route: 路由参数
 * - $component: 页面组件变量
 * - $data: 页面级数据源聚合
 * - $table: 服务端表查询（惰性求值，仅表达式）
 * - $computation: 运算引擎（仅表达式）
 * - $fetch: 第三方请求（仅表达式）
 * - $workflow: 流程上下文
 */

/** 变量可用模式 */
type VariableMode = 'variable' | 'expression';

/** 变量属性定义（用于代码提示） */
interface VariableProperty {
  /** 属性名 */
  name: string;
  /** 属性类型 */
  type: string;
  /** 属性描述 */
  description: string;
  /** 子属性（支持多层级提示） */
  properties?: VariableProperty[];
}

/** 环境变量定义 */
interface VariableDefinition {
  /** 变量名（如 $user、$platform） */
  name: string;
  /** 变量描述 */
  description: string;
  /** 可用模式 */
  modes: VariableMode[];
  /** 变量属性列表（用于代码提示） */
  properties: VariableProperty[];
  /** 是否为跨应用变量 */
  isCrossApp?: boolean;
  /** 所属应用名称（跨应用时展示） */
  appName?: string;
}

/** 用户信息（动态字段，从用户表读取） */
interface EnvUserInfo {
  id: string;
  name: string;
  roles: string[];
  department: string;
  departmentName: string;
  position: string;
  [key: string]: any; // 允许扩展字段
}

/** 平台标识 */
interface PlatformInfo {
  web: boolean;
  mobile: boolean;
  miniApp: boolean;
}

/** 路由信息 */
interface RouteInfo {
  params: Record<string, string>;
  query: Record<string, string>;
  path: string;
}

/** 组件实例状态 */
interface ComponentState {
  value: any;
  visible: boolean;
  disabled: boolean;
  loading: boolean;
  [key: string]: any;
}

/** 页面数据源项 */
interface DataSourceItem {
  data: any;
  loading: boolean;
  error: Error | null;
}

/** 服务端变量代理（惰性求值） */
interface ServerVariableProxy {
  [tableName: string]: {
    filter: (predicate: (record: any) => boolean) => ServerVariableProxy;
    select: (...fields: string[]) => ServerVariableProxy;
    sort: (field: string, order: 'asc' | 'desc') => ServerVariableProxy;
    limit: (count: number) => ServerVariableProxy;
    first: () => Promise<any>;
    count: () => Promise<number>;
    sum: (field: string) => Promise<number>;
    avg: (field: string) => Promise<number>;
    execute: () => Promise<any[]>;
  };
}

/** 运算引擎代理 */
interface ComputationEngine {
  evaluate: (expression: string, context?: Record<string, any>) => Promise<any>;
  [key: string]: any;
}

/** 请求代理 */
interface FetchProxy {
  get: (url: string, config?: any) => Promise<any>;
  post: (url: string, data?: any, config?: any) => Promise<any>;
  put: (url: string, data?: any, config?: any) => Promise<any>;
  delete: (url: string, config?: any) => Promise<any>;
}

/** 流程上下文 */
interface WorkflowContext {
  instanceId: string;
  nodeId: string;
  variables: Record<string, any>;
  snapshots: Record<string, any>;
  [key: string]: any;
}

/** 运行时环境变量上下文 */
interface EnvironmentContext {
  user: EnvUserInfo;
  platform: PlatformInfo;
  route: RouteInfo;
  component: Record<string, ComponentState>;
  data: Record<string, DataSourceItem>;
  table: ServerVariableProxy;
  computation: ComputationEngine;
  fetch: FetchProxy;
  workflow?: WorkflowContext;
}

export type {
  VariableMode,
  VariableProperty,
  VariableDefinition,
  EnvUserInfo,
  PlatformInfo,
  RouteInfo,
  ComponentState,
  DataSourceItem,
  ServerVariableProxy,
  ComputationEngine,
  FetchProxy,
  WorkflowContext,
  EnvironmentContext,
};
