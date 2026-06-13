import React from 'react';

/** 插槽组件属性 */
export interface SlotComponentProps {
  /** 插槽名称 */
  name: string;
  /** 插槽标题 */
  title?: string;
  /** 插槽描述 */
  description?: string;
  /** 允许放入的组件类型 */
  accept?: string[];
  /** 最大子项数 */
  maxItems?: number;
  /** 是否为设计模式（设计器中显示占位） */
  designMode?: boolean;
  /** 子内容（消费方填充的内容） */
  children?: React.ReactNode;
}

/**
 * 插槽组件
 *
 * 卡片中的特殊组件，用于暴露变量/方法/事件给调用方。
 * 设计模式下渲染为可拖入的占位区域；
 * 运行时替换为消费方传入的 slots[slotName] 内容。
 */
export const SlotComponent: React.FC<SlotComponentProps> = (props) => {
  const { name, title, description, accept, maxItems, designMode, children } = React.useMemo(() => props, [props]);

  // 运行时：有子内容则直接渲染
  if (!designMode && children) {
    return <>{children}</>;
  }

  // 设计模式或无内容：显示占位区域
  return (
    <div
      data-slot-name={name}
      style={{
        minHeight: '48px',
        border: '2px dashed #1890ff40',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        backgroundColor: '#f0f7ff',
        position: 'relative',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{
        fontSize: '12px',
        color: '#1890ff',
        fontWeight: 600,
        marginBottom: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}>
        <span style={{ fontSize: '14px' }}>📌</span>
        {title || name}
      </div>
      {description && (
        <div style={{ fontSize: '11px', color: '#999', textAlign: 'center' }}>
          {description}
        </div>
      )}
      {accept && accept.length > 0 && (
        <div style={{ fontSize: '10px', color: '#bbb', marginTop: '4px' }}>
          接受: {accept.join(', ')}
        </div>
      )}
      {maxItems !== undefined && (
        <div style={{ fontSize: '10px', color: '#bbb' }}>
          最多 {maxItems} 项
        </div>
      )}
      {children}
    </div>
  );
};
