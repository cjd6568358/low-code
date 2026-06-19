import type { JSONSchema7 } from './json-schema';

/** 组件注册表接口 */
export interface ComponentRegistry {
  register(entry: ComponentRegistration): void;
  registerAll(entries: ComponentRegistration[]): void;
  resolve(type: string): ComponentRegistration | null;
  list(): ComponentRegistration[];
  listByCategory(category: string): ComponentRegistration[];
  export(): ComponentRegistration[];
  import(entries: ComponentRegistration[]): void;
}

/** 组件注册项 — 完全可序列化 */
export interface ComponentRegistration {
  type: string;
  name: string;
  category: 'general' | 'layout' | 'navigation' | 'data-entry' | 'data-display' | 'feedback' | 'basic' | 'advanced' | 'custom' | 'business';
  icon?: string;
  /** 组件标识（序列化用），运行时通过 ComponentLibrary.components 解析为实际组件 */
  component: string;
  propsSchema: JSONSchema7;
  defaultProps?: Record<string, any>;
  acceptsChildren?: boolean;
  library?: string;
  version?: string;
}

/**
 * 组件库描述 — 一组组件的完整定义
 *
 * 每个组件库提供：
 * - name: 库标识（如 'antd'）
 * - basePropsSchema: 该库的公共 BaseProps JSON Schema（所有组件继承）
 * - components: type → 实际 React 组件的映射
 * - schemas: type → 组件 JSON Schema（含 BaseProps 继承）
 */
export interface ComponentLibrary {
  /** 库标识 */
  name: string;
  /** 公共 BaseProps 的 JSON Schema */
  basePropsSchema: JSONSchema7;
  /** 组件分类映射 */
  categoryMap: Record<string, { category: string; name: string }>;
  /** 容器组件类型集合 */
  containerTypes: Set<string>;
}
