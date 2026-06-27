import type { EnvironmentContext } from './environment';

/**
 * 运行时上下文 — 表达式/变量求值的数据源
 *
 * 等同于 EnvironmentContext，顶层 key 直接使用 $ 前缀：
 * - $user: 当前用户
 * - $platform: 平台标识
 * - $route: 路由信息
 * - $component: 组件状态
 * - $data: 页面数据源
 * - $table: 服务端表查询
 * - $computation: 运算引擎
 * - $fetch: 请求代理
 * - $workflow: 流程上下文
 */
export type RenderContext = EnvironmentContext;
