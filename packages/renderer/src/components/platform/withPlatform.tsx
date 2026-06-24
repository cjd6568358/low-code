/**
 * withPlatform — 平台 HOC 工厂函数
 *
 * 在组件注册时执行一次（非每次 render），职责：
 * 1. 过滤 _ 前缀的设计态 props（通过 DESIGN_KEYS 常量）
 * 2. 过滤平台能力 props（通过 PLATFORM_KEYS 常量：node/field/events/linkage/designMode）
 * 3. enhanceValueOnChange() 自动关联 value ↔ onChange ↔ 联动规则
 * 4. 设计态注入 className 标记 lc-did-{id}（antd 组件通过 ...rest 传播到 DOM）
 * 5. 设计态注入 draggable/onMouseDown 等 DOM 事件
 * 6. 在 Form 内时，自动包装 Form.Item
 * 7. 注入 refreshComponent/refreshWithDependencyOrder 刷新能力
 *
 * DOM 元素定位：DesignOverlay 通过 document.querySelector('.lc-did-{id}') 定位。
 * 不添加额外 wrapper DOM，不依赖组件透传 data-* 属性。
 */
import React from 'react';
import { Form } from 'antd';
import { useFormContext } from './FormContext';
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
  'refreshComponent', 'refreshWithDependencyOrder',  // 刷新能力
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
 * 设计态通过 className 唯一标记 lc-did-{id} 定位 DOM 元素（antd 组件通过 ...rest 传播）。
 * 在 Form 内时，自动包装 Form.Item。
 */
export function withPlatform<P extends Record<string, any>>(
  WrappedComponent: React.ComponentType<P>,
): React.FC<P & PlatformComponentProps> {
  const PlatformComponent: React.FC<P & PlatformComponentProps> = (props) => {
    // 检测是否在 Form 内
    const formContext = useFormContext();
    // 提取平台能力 props
    const {
      node, field, events, linkage, designMode, visible,
      refreshComponent, refreshWithDependencyOrder,
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

    // 创建 refreshComponent 函数（如果提供了 refreshComponent 回调）
    const handleRefreshComponent = refreshComponent
      ? async (targetId: string, propNames?: string[]) => {
          // 调用外部传入的 refreshComponent 函数
          return await refreshComponent(targetId, propNames);
        }
      : undefined;

    // 创建 refreshWithDependencyOrder 函数（如果提供了 refreshWithDependencyOrder 回调）
    const handleRefreshWithDependencyOrder = refreshWithDependencyOrder
      ? async (targetIds: string[]) => {
          // 调用外部传入的 refreshWithDependencyOrder 函数
          return await refreshWithDependencyOrder(targetIds);
        }
      : undefined;

    // 设计态注入 DOM 属性
    const designAttrs: Record<string, unknown> = {};
    if (designMode) {
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

    // 如果在 Form 内且有 name 属性，自动包装 Form.Item
    const isInForm = formContext !== null;
    const hasFieldName = (enhancedProps as any).name !== undefined;

    // 构建传递给组件的 refresh 相关 props
    const refreshProps: Record<string, any> = {};
    if (handleRefreshComponent) {
      refreshProps.refreshComponent = handleRefreshComponent;
    }
    if (handleRefreshWithDependencyOrder) {
      refreshProps.refreshWithDependencyOrder = handleRefreshWithDependencyOrder;
    }

    if (isInForm && hasFieldName) {
      const {
        name,
        label,
        rules,
        required,
        initialValue,
        preserve,
        help,
        extra,
        validateStatus,
        ...componentProps
      } = enhancedProps as any;

      const itemLabel = label || name;

      /**
       * inline 布局 + 像素模式 labelCol：给 Form.Item 的 labelCol 注入 minWidth。
       *
       * 背景：inline 模式下 Form.Item 宽度由内容撑开。小尺寸组件（如 ColorPicker 触发器
       * 仅 ~32px）会导致整个行宽不足，label 被挤压到几乎不可见。
       * 像素模式（labelCol 以 "px" 结尾，如 "80px"）表示 label 需要固定最小宽度，
       * 此时 FormWithProvider 将 labelColPx 标记传入 context，这里读取后注入 minWidth。
       */
      const isInlinePx = formContext?.layout === 'inline' && formContext?.labelColPx;
      const itemLabelCol = isInlinePx
        ? { ...formContext?.labelCol, style: { ...formContext?.labelCol?.style, minWidth: formContext?.labelCol?.style?.minWidth } }
        : undefined;

      return (
        <Form.Item
          name={name}
          label={itemLabel}
          labelCol={itemLabelCol}
          rules={rules}
          required={required}
          initialValue={initialValue}
          preserve={preserve}
          help={help}
          extra={extra}
          validateStatus={validateStatus}
        >
          <WrappedComponent
            {...(componentProps as P)}
            {...(designAttrs as P)}
            {...(refreshProps as P)}
          />
        </Form.Item>
      );
    }

    return (
      <WrappedComponent
        {...(enhancedProps as P)}
        {...(designAttrs as P)}
        {...(refreshProps as P)}
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
