import type { EnvironmentContext } from './environment';

/**
 * 运行时上下文 — 表达式/变量求值的数据源
 *
 * 等同于 EnvironmentContext，顶层 key 对应环境变量：
 * - user → $user
 * - platform → $platform
 * - route → $route
 * - component → $component
 * - data → $data
 * - table → $table
 * - computation → $computation
 * - fetch → $fetch
 * - workflow → $workflow
 */
export type RenderContext = EnvironmentContext;
