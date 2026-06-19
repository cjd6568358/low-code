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
