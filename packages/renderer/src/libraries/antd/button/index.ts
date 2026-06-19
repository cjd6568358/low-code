/**
 * Button 组件 — 统一导出
 *
 * 目录结构：
 * - component.tsx  — withPlatform 包装
 * - schema.ts      — Props 接口定义（JSDoc 中含 x-group/x-priority/中文标题）
 * - button.json    — 从 TS 类型自动生成的 JSON Schema（包含所有注解）
 */
export { PlatformButton } from './component';
export type { ButtonProps } from './schema';
