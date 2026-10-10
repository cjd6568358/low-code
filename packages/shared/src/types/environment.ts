import type { FormDataContext } from './form';
import type { ExpressionEngine } from '../engine/expression.js';

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
 *
 * 命名约定：所有环境变量顶层 key 必须以 `$` 开头，因此禁止 `$` 前缀的 key
 * 在类型层面不可表达，表达式引擎可直接校验变量名合法性。
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
  /** 变量属性列表（用于代码提示，对象型变量使用；标量变量省略） */
  properties?: VariableProperty[];
  /** 变量本身的类型（标量型变量使用，如 $now 为 number） */
  type?: string;
  /** 是否为跨应用变量 */
  isCrossApp?: boolean;
  /** 所属应用名称（跨应用时展示） */
  appName?: string;
}

/** 用户信息（动态字段，从用户表读取） */
interface EnvUserInfo {
  /** 用户 ID */
  id: string;
  /** 用户姓名 */
  name: string;
  /** 角色 ID 列表 */
  roles: string[];
  /** 主部门 ID */
  department: string;
  /** 主部门名称 */
  departmentName: string;
  /** 岗位名称 */
  position: string;
  /** 头像地址 */
  avatar?: string;
  /** 扩展字段（租户可自定义用户属性） */
  [key: string]: unknown;
}

/** 平台标识 */
interface PlatformInfo {
  /** 是否 Web 端 */
  web: boolean;
  /** 是否移动端 */
  mobile: boolean;
  /** 是否小程序端 */
  miniApp: boolean;
}

/** 路由信息 */
interface RouteInfo {
  /** 路径参数 */
  params: Record<string, string>;
  /** 查询参数 */
  query: Record<string, string>;
  /** 当前路径 */
  path: string;
}

/** 组件实例状态 */
interface ComponentState {
  /** 组件当前值 */
  value: unknown;
  /** 是否可见 */
  visible: boolean;
  /** 是否禁用 */
  disabled: boolean;
  /** 是否加载中 */
  loading: boolean;
  /** 表单数据上下文（仅 Form 组件实例拥有） */
  $form?: FormDataContext;
  /** 组件自定义状态扩展 */
  [key: string]: unknown;
}

/** 页面数据源项 */
interface DataSourceItem {
  /** 数据源当前数据 */
  data: unknown;
  /** 是否加载中 */
  loading: boolean;
  /** 加载错误 */
  error: Error | null;
}

/** 服务端表查询结果（单条记录） */
type ServerRecord = Record<string, unknown>;

/** 服务端表查询链式代理（惰性求值） */
interface ServerTableQuery {
  /** 按谓词过滤（客户端条件） */
  filter: (predicate: (record: ServerRecord) => boolean) => ServerTableQuery;
  /** 选择返回字段 */
  select: (...fields: string[]) => ServerTableQuery;
  /** 排序 */
  sort: (field: string, order: 'asc' | 'desc') => ServerTableQuery;
  /** 限制返回条数 */
  limit: (count: number) => ServerTableQuery;
  /** 取第一条 */
  first: () => Promise<ServerRecord | undefined>;
  /** 统计条数 */
  count: () => Promise<number>;
  /** 求和 */
  sum: (field: string) => Promise<number>;
  /** 求平均 */
  avg: (field: string) => Promise<number>;
  /** 执行查询返回列表 */
  execute: () => Promise<ServerRecord[]>;
}

/** 服务端变量代理（按数据表名访问，惰性求值） */
type ServerVariableProxy = Record<string, ServerTableQuery>;

/** 请求代理配置 */
interface FetchConfig {
  /** 请求头 */
  headers?: Record<string, string>;
  /** 查询参数 */
  params?: Record<string, unknown>;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 其他透传配置 */
  [key: string]: unknown;
}

/** 请求代理（第三方 HTTP 调用） */
interface FetchProxy {
  /** GET 请求 */
  get: (url: string, config?: FetchConfig) => Promise<unknown>;
  /** POST 请求 */
  post: (url: string, data?: unknown, config?: FetchConfig) => Promise<unknown>;
  /** PUT 请求 */
  put: (url: string, data?: unknown, config?: FetchConfig) => Promise<unknown>;
  /** DELETE 请求 */
  delete: (url: string, config?: FetchConfig) => Promise<unknown>;
}

/** 流程上下文 */
interface WorkflowContext {
  /** 流程实例 ID */
  instanceId: string;
  /** 当前节点 ID */
  nodeId: string;
  /** 流程变量 */
  variables: Record<string, unknown>;
  /** 节点快照（节点 ID → 快照数据） */
  snapshots: Record<string, Record<string, unknown>>;
  /** 流程扩展字段 */
  [key: string]: unknown;
}

/**
 * 内置环境变量的类型契约
 *
 * 顶层 key 带 `$` 前缀，对应表达式中的 `$user` / `$fetch` 等引用。
 */
interface BuiltinEnvironmentVariables {
  /** 当前登录用户 */
  $user: EnvUserInfo;
  /** 平台标识 */
  $platform: PlatformInfo;
  /** 路由信息 */
  $route: RouteInfo;
  /** 页面组件状态（组件 ID → 状态） */
  $component: Record<string, ComponentState>;
  /** 页面级数据源（数据源 key → 状态） */
  $data: Record<string, DataSourceItem>;
  /** 服务端表查询代理 */
  $table: ServerVariableProxy;
  /** 运算引擎 */
  $computation: ExpressionEngine;
  /** 第三方请求代理 */
  $fetch: FetchProxy;
  /** 流程上下文（非流程页面为 undefined） */
  $workflow?: WorkflowContext;
}

/**
 * 运行时环境变量上下文
 *
 * 通过映射类型为每个内置变量生成动态属性，使上下文同时满足两种访问方式：
 * 1. 已知变量：`ctx.$user.name` 保持精确类型
 * 2. 动态变量：`ctx[path]` 返回 `unknown`，因为运行时可通过
 *    `ReactiveEnvContext` 注册 `$now`、`$env`、`$initiator` 等扩展变量
 *
 * 之所以需要动态访问能力，是因为表达式引擎的入参契约为
 * `Record<string, unknown>`（按变量名 → 值求值）。
 */
type EnvironmentContext = {
  [K in keyof BuiltinEnvironmentVariables]: BuiltinEnvironmentVariables[K];
} & {
  /**
   * 运行时注册的扩展环境变量（`$now`、`$env`、自定义变量等）
   *
   * key 必须以 `$` 开头；索引签名仅用于兼容表达式引擎的
   * `Record<string, unknown>` 入参契约。
   */
  readonly [variableName: `$${string}`]: unknown;
};

export type {
  VariableMode,
  VariableProperty,
  VariableDefinition,
  EnvUserInfo,
  PlatformInfo,
  RouteInfo,
  ComponentState,
  DataSourceItem,
  ServerRecord,
  ServerTableQuery,
  ServerVariableProxy,
  FetchConfig,
  FetchProxy,
  WorkflowContext,
  BuiltinEnvironmentVariables,
  EnvironmentContext,
};
