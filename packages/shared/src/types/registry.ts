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
  category: 'basic' | 'advanced' | 'layout' | 'custom' | 'business';
  icon?: string;
  component: string;
  propsSchema: JSONSchema7;
  defaultProps?: Record<string, any>;
  acceptsChildren?: boolean;
  library?: string;
  version?: string;
}
