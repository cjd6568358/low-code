/**
 * 折叠面板 组件 — 统一导出
 *
 * 目录结构：
 * - component.tsx  — withPlatform 包装
 * - schema.ts      — Props 接口定义（JSDoc 含 x-group/x-priority/中文标题）
 * - collapse.json    — 从 TS 类型自动生成的 JSON Schema
 */
export { PlatformCollapse } from './component';
export type { CollapseProps } from './schema';
