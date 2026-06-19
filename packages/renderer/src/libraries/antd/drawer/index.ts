/**
 * 抽屉 组件 — 统一导出
 *
 * 目录结构：
 * - component.tsx  — withPlatform 包装
 * - schema.ts      — Props 接口定义（JSDoc 含 x-group/x-priority/中文标题）
 * - drawer.json    — 从 TS 类型自动生成的 JSON Schema
 */
export { PlatformDrawer } from './component';
export type { DrawerProps } from './schema';
