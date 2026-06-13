import type React from 'react';
import type { ComponentNode } from './schema';
import type { ActionChain } from './actions';

/** 自定义卡片定义 */
export interface CustomCardDefinition {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  version: string;
  category?: string;
  author?: string;
  interface: CardInterface;
  template: ComponentNode[];
  bindings: Record<string, PropBinding>;
  events?: CardEventDef[];
  defaultStyle?: React.CSSProperties;
}

/** 卡片对外接口 */
export interface CardInterface {
  props: ExposedProp[];
  methods?: MethodDefinition[];
  slots?: SlotDefinition[];
  events?: EventDefinition[];
}

/** 暴露属性 */
export interface ExposedProp {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  title: string;
  description?: string;
  required?: boolean;
  default?: any;
  group?: string;
  priority?: number;
  properties?: ExposedProp[];
  enum?: Array<{ label: string; value: any }>;
  readable?: boolean;
  writable?: boolean;
}

/** 暴露方法 */
export interface MethodDefinition {
  name: string;
  title: string;
  description?: string;
  group?: string;
  params?: MethodParam[];
  returnType?: string;
  implementation: ActionChain;
}

/** 方法参数 */
export interface MethodParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  title: string;
  required?: boolean;
  default?: any;
  description?: string;
  enum?: Array<{ label: string; value: any }>;
}

/** 插槽定义 */
export interface SlotDefinition {
  name: string;
  title: string;
  description?: string;
  accept?: string[];
  maxItems?: number;
  defaultContent?: ComponentNode[];
  /** 通过插槽暴露给消费方的变量 */
  expose?: SlotExpose;
}

/** 插槽暴露定义 — 让消费方在插槽内容中可引用的变量/方法/事件 */
export interface SlotExpose {
  /** 暴露的变量：变量名 → 表达式（引用 $props / 内部组件属性） */
  variables?: Record<string, string>;
  /** 暴露的方法：方法名 → 内部组件方法引用 */
  methods?: SlotExposedMethod[];
  /** 暴露的事件：事件名 → 映射配置 */
  events?: SlotExposedEvent[];
}

/** 插槽暴露的方法 */
export interface SlotExposedMethod {
  name: string;
  title: string;
  description?: string;
  /** 映射到内部哪个组件的哪个方法，如 "form_01.validate" */
  target: string;
  params?: MethodParam[];
  returnType?: string;
}

/** 插槽暴露的事件 */
export interface SlotExposedEvent {
  name: string;
  title: string;
  /** 内部触发源：组件ID.事件名，如 "submit_btn.onClick" */
  source: string;
  payload?: Record<string, string>;
}

/** 事件定义 */
export interface EventDefinition {
  name: string;
  title: string;
  description?: string;
  payload?: Record<string, string>;
}

/** 属性绑定 */
export interface PropBinding {
  target: string;
  expression?: string;
  twoWay?: boolean;
}

/** 卡片事件映射 */
export interface CardEventDef {
  source: string;
  emit: string;
  transform?: string;
}
