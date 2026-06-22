/**
 * withPlatform — 平台 HOC 工厂函数
 *
 * 在组件注册时执行一次（非每次 render），职责：
 * 1. 过滤 _ 前缀的设计态 props（通过 DESIGN_KEYS 常量）
 * 2. 过滤平台能力 props（通过 PLATFORM_KEYS 常量：node/field/events/linkage/designMode）
 * 3. enhanceValueOnChange() 自动关联 value ↔ onChange ↔ 联动规则
 * 4. 设计态注入 className 标记 lc-did-{id}（antd 组件通过 ...rest 传播到 DOM）
 * 5. 设计态注入 draggable/onMouseDown 等 DOM 事件
 *
 * DOM 元素定位：DesignOverlay 通过 document.querySelector('.lc-did-{id}') 定位。
 * 不添加额外 wrapper DOM，不依赖组件透传 data-* 属性。
 */
import React from 'react';
import type {
  PlatformComponentProps,
  DesignInjectedProps,
  FieldBinding,
  CompiledEventHandlers,
  LinkageEngine,
} from './types';

/** 设计态专用 props 的 key 列表，用于从 rest 中剔除 */
const DESIGN_KEYS = new Set([
  '_designId', '_draggable', '_isDragSource',
  '_onSelect', '_onDragStart', '_onDragEnd',
  '_onDragOver', '_onDragLeave', '_onDrop', '_onClickCapture',
]);

/** 平台能力 props 的 key 列表，用于从 rest 中剔除 */
const PLATFORM_KEYS = new Set([
  'node', 'field', 'events', 'linkage', 'designMode',
  'visible',  // 平台级控制，不透传给底层组件（避免原生 DOM 警告）
]);

/**
 * 自动关联 value ↔ onChange ↔ 联动
 *
 * 组件的 onChange 回调会自动：
 * 1. 更新绑定字段的值
 * 2. 触发联动规则评估
 * 3. 执行用户配置的事件链
 */
function enhanceValueOnChange(
  props: Record<string, any>,
  field?: FieldBinding,
  events?: CompiledEventHandlers,
  linkage?: LinkageEngine,
): Record<string, any> {
  // 如果没有 field 绑定，直接返回原 props
  if (!field?.bindField) {
    return { ...props, events };
  }

  // 找到组件的 onChange 处理器
  const originalOnChange = props.onChange;

  // 创建增强的 onChange
  const enhancedOnChange = (...args: any[]) => {
    const event = args[0];
    // 提取值：antd 的 onChange 签名不统一，需要适配
    // 大部分组件：(value) => void 或 (value, option) => void
    // Input/TextArea：(e: ChangeEvent) => void，值在 e.target.value
    const value = event?.target?.value !== undefined
      ? event.target.value
      : args[0];

    // 1. 自动赋值
    field.setValue(value);

    // 2. 触发联动
    linkage?.evaluate('onChange', value);

    // 3. 执行用户配置的事件链
    if (events?.onChange) {
      events.onChange(event);
    }

    // 4. 调用原始 onChange（如果有的话）
    originalOnChange?.(...args);
  };

  return {
    ...props,
    value: field.getValue(),
    onChange: enhancedOnChange,
    events,
  };
}

/**
 * 创建平台 HOC
 *
 * 注册时执行一次，返回带平台能力的组件。
 * 设计态通过 className 唯一标记 + useEffect 手动注入 data-component-id 到 DOM。
 */
export function withPlatform<P extends Record<string, any>>(
  WrappedComponent: React.ComponentType<P>,
): React.FC<P & PlatformComponentProps> {
  const PlatformComponent: React.FC<P & PlatformComponentProps> = (props) => {
    // 提取平台能力 props
    const {
      node, field, events, linkage, designMode, visible,
      ...restWithDesign
    } = props as P & PlatformComponentProps;

    // 平台级显隐控制（设计态跳过，确保设计器中所有组件可见；运行时 visible=false 不渲染）
    if (visible === false && !designMode) return null;

    // 设计态：通过 className 唯一标记定位 DOM 元素
    const designId = designMode ? (restWithDesign as any)._designId as string : undefined;
    const markerClass = designId ? `lc-did-${designId}` : undefined;

    // 提取设计态 props
    const designProps: Record<string, unknown> = {};
    const antdProps: Record<string, unknown> = {};

    for (const key of Object.keys(restWithDesign)) {
      if (DESIGN_KEYS.has(key)) {
        designProps[key] = (restWithDesign as Record<string, unknown>)[key];
      } else if (!PLATFORM_KEYS.has(key)) {
        antdProps[key] = (restWithDesign as Record<string, unknown>)[key];
      }
    }

    // 自动关联 value ↔ onChange ↔ 联动
    const enhancedProps = enhanceValueOnChange(
      antdProps as Record<string, any>,
      field,
      events,
      linkage,
    );

    // 设计态注入 DOM 属性
    const designAttrs: Record<string, unknown> = {};
    if (designMode) {
      designAttrs['data-component-id'] = designProps._designId;
      designAttrs['draggable'] = designProps._draggable;

      if (designProps._onSelect) {
        designAttrs['onMouseDown'] = designProps._onSelect;
      }
      if (designProps._onDragStart) {
        designAttrs['onDragStart'] = designProps._onDragStart;
      }
      if (designProps._onDragEnd) {
        designAttrs['onDragEnd'] = designProps._onDragEnd;
      }
      if (designProps._onDragOver) {
        designAttrs['onDragOver'] = designProps._onDragOver;
      }
      if (designProps._onDragLeave) {
        designAttrs['onDragLeave'] = designProps._onDragLeave;
      }
      if (designProps._onDrop) {
        designAttrs['onDrop'] = designProps._onDrop;
      }
      if (designProps._onClickCapture) {
        designAttrs['onClick'] = designProps._onClickCapture;
      }

      // 拖拽源透明度
      if (designProps._isDragSource) {
        designAttrs['style'] = {
          ...((enhancedProps as any).style || {}),
          opacity: 0.3,
        };
      }

      // 注入唯一标记 className（antd 组件通过 ...rest 传播到 DOM）
      if (markerClass) {
        const existingClass = (enhancedProps as any).className || '';
        designAttrs['className'] = `${existingClass} ${markerClass}`.trim();
      }
    }

    return (
      <WrappedComponent
        {...(enhancedProps as P)}
        {...(designAttrs as P)}
      />
    );
  };

  PlatformComponent.displayName = `withPlatform(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  // 标记为平台组件，DesignCanvas 用于判断是否注入设计态 props
  (PlatformComponent as any).__withPlatform = true;

  return PlatformComponent;
}
