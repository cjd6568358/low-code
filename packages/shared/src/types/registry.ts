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
  /** 组件暴露的方法（用于 invokeMethod 设计时选择） */
  methods?: ComponentMethodDef[];
}

/** 组件方法定义（设计时元数据，描述组件可被 invokeMethod 调用的方法） */
export interface ComponentMethodDef {
  /** 方法名 */
  name: string;
  /** 显示标签 */
  title: string;
  /** 方法描述 */
  description?: string;
  /** 方法分组 */
  group?: string;
  /** 参数定义 */
  params?: MethodParamDef[];
  /** 返回值类型描述 */
  returnType?: string;
}

/** 方法参数定义 */
export interface MethodParamDef {
  /** 参数名 */
  name: string;
  /** 参数类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** 显示标签 */
  title: string;
  /** 是否必填 */
  required?: boolean;
  /** 默认值 */
  default?: any;
  /** 参数描述 */
  description?: string;
}

/**
 * 组件方法引用（设计时 UI 用）
 *
 * 描述页面中某个组件实例的某个可调用方法。
 * 由 PropertyPanel 从 ComponentRegistration.methods + schema.components 组合生成，
 * 传给 EventActionChainEditor 作为 invokeMethod 动作的目标选择列表。
 */
export interface ComponentMethod {
  /** 组件实例 ID */
  componentId: string;
  /** 组件类型 */
  componentType: string;
  /** 方法名 */
  methodName: string;
  /** 显示标签 */
  label: string;
  /** 方法描述 */
  description?: string;
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
