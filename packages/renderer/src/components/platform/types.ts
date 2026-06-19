/**
 * 平台组件类型定义
 *
 * 定义 wrap 层注入的平台能力接口，
 * 所有平台组件（设计器 + 运行时）共享此接口。
 */
import type { ComponentNode } from '@low-code/shared';

/** 字段绑定接口 — 负责取值/赋值 */
export interface FieldBinding {
  /** 获取绑定字段的值 */
  getValue: () => any;
  /** 设置绑定字段的值 */
  setValue: (value: any) => void;
  /** 绑定的字段路径（如 "userName" 或 "address.city"） */
  bindField?: string;
}

/** 联动引擎接口 — 负责联动规则评估 */
export interface LinkageEngine {
  /** 触发联动评估 */
  evaluate: (eventName: string, eventData?: any) => void;
}

/** 编译后的事件处理器 */
export type CompiledEventHandler = (event?: any, context?: any) => Promise<any> | any;

/** 编译后的事件处理器映射 */
export type CompiledEventHandlers = Record<string, CompiledEventHandler>;

/** 设计态注入的 props（下划线前缀，HOC 内部过滤） */
export interface DesignInjectedProps {
  /** 组件 ID → data-component-id */
  _designId?: string;
  /** 是否可拖拽 → draggable */
  _draggable?: boolean;
  /** 是否为拖拽源 → 控制 opacity */
  _isDragSource?: boolean;
  /** 选中事件 */
  _onSelect?: (e: React.MouseEvent) => void;
  /** 拖拽开始 */
  _onDragStart?: (e: React.DragEvent) => void;
  /** 拖拽结束 */
  _onDragEnd?: (e: React.DragEvent) => void;
  /** 拖拽悬停 */
  _onDragOver?: (e: React.DragEvent) => void;
  /** 拖拽离开 */
  _onDragLeave?: (e: React.DragEvent) => void;
  /** 放置 */
  _onDrop?: (e: React.DragEvent) => void;
  /** 阻止冒泡到画布（取消选中） */
  _onClickCapture?: (e: React.MouseEvent) => void;
}

/** 平台组件公共 props */
export interface PlatformComponentProps extends DesignInjectedProps {
  /** 组件实例节点 */
  node?: ComponentNode;
  /** 字段绑定 */
  field?: FieldBinding;
  /** 编译后的事件处理器 */
  events?: CompiledEventHandlers;
  /** 联动引擎 */
  linkage?: LinkageEngine;
  /** 是否为设计态 */
  designMode?: boolean;
}
