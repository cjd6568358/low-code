import type { EnvironmentContext } from './environment';

/**
 * 表达式作用域 — 表达式/变量求值的数据源
 *
 * 顶层 key 直接使用 `$` 前缀：
 * - $user: 当前用户
 * - $platform: 平台标识
 * - $route: 路由信息
 * - $component: 组件状态
 * - $data: 页面数据源
 * - $table: 服务端表查询
 * - $computation: 运算引擎
 * - $fetch: 请求代理
 * - $workflow: 流程上下文
 *
 * 该类型是表达式引擎的入参契约（`Record<string, unknown>`），
 * 也是渲染器各求值函数的最小上下文要求：可以只提供其中一部分变量
 * （如测试或局部求值场景），因此不强制要求全部内建变量存在。
 */
export type ExpressionScope = Record<string, unknown>;

/**
 * 运行时上下文 — 完整的环境变量集合
 *
 * 等同于 EnvironmentContext（所有内建变量齐备），
 * 供需要完整变量的运行时组件使用。
 */
export type RenderContext = EnvironmentContext;
