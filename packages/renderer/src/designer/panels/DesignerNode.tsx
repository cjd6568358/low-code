/**
 * DesignerNode — 设计器组件包装器
 *
 * - position:relative wrapper，作为 flex-item 跟随容器对齐
 * - ref 回调测量组件真实宽度，overlay 用该宽度约束
 * - 绝对定位 overlay 覆盖组件，pointer-events:auto 拦截交互
 * - wrapper 本身 pointer-events:none，所有事件由 overlay 处理
 */
import React, { useRef, useCallback, useState, useLayoutEffect } from 'react';
import type { ComponentNode } from '@low-code/shared';
import type { ComponentRegistryImpl } from '../../core/ComponentRegistry';

// ─── 类型 ─────────────────────────────────────────────────

interface DesignerNodeProps {
  node: ComponentNode;
  isSelected: boolean;
  isDragSource: boolean;
  registry: ComponentRegistryImpl;
  onCopy: () => void;
  onMove: (direction: 'left' | 'right') => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onSelect: (id: string | null) => void;
  dragOverId: string | null;
  dropPosition: 'before' | 'after' | 'inside' | null;
  dragSourceId: string | null;
  siblings: string[];
  previewMode: 'design' | 'preview';
  children: React.ReactNode;
}

export function DesignerNode({
  node, isSelected, isDragSource, registry,
  onCopy, onMove, onDelete,
  onDragStart: handleDragStart, onDragEnd: handleDragEnd,
  onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop,
  onSelect,
  dragOverId, dropPosition, dragSourceId,
  siblings, previewMode,
  children,
}: DesignerNodeProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [compWidth, setCompWidth] = useState<number | undefined>(undefined);

  // 每次渲染后测量组件真实宽度（响应容器 align-items:stretch 等布局变化）
  useLayoutEffect(() => {
    const el = wrapperRef.current?.firstElementChild as HTMLElement | null;
    if (el) {
      const w = el.getBoundingClientRect().width;
      setCompWidth((prev) => (prev !== w ? w : prev));
    }
  });

  if (previewMode !== 'design') {
    return <>{children}</>;
  }

  const showDrop = dragOverId === node.id && dropPosition && dragSourceId !== node.id;

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        pointerEvents: 'none',
        opacity: isDragSource ? 0.3 : 1,
      }}
    >
      {/* 组件原样渲染 */}
      {children}

      {/* Overlay — 绝对定位覆盖组件，用组件真实宽度约束 */}
      <div
        style={{
          position: 'absolute',
          left: -2,
          top: -2,
          width: compWidth != null ? compWidth + 4 : undefined,
          right: compWidth != null ? undefined : -2,
          bottom: -2,
          border: isSelected ? '2px solid #1890ff' : '2px solid transparent',
          borderRadius: 6,
          pointerEvents: 'auto',
          cursor: isDragSource ? 'grabbing' : 'grab',
          backgroundColor: dragOverId === node.id && dropPosition === 'inside'
            ? 'rgba(24,144,255,0.08)' : 'transparent',
          transition: 'border-color 0.15s, background-color 0.15s',
          zIndex: 1,
          boxSizing: 'border-box',
        }}
        onMouseDown={(e) => { e.stopPropagation(); onSelect(node.id); }}
        onClick={(e) => { e.stopPropagation(); }}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = 'move';
          handleDragStart(e, node.id);
        }}
        onDragEnd={(e) => { e.stopPropagation(); handleDragEnd(e); }}
        onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, node.id); }}
        onDragLeave={(e) => { e.stopPropagation(); handleDragLeave(e, node.id); }}
        onDrop={(e) => { e.stopPropagation(); handleDrop(e, node.id); }}
        draggable
      />

      {/* Drop 指示器 */}
      {showDrop && <DropIndicator position={dropPosition!} />}

      {/* 工具栏 */}
      {isSelected && (
        <Toolbar
          node={node}
          registry={registry}
          siblings={siblings}
          onCopy={onCopy}
          onMove={onMove}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

// ─── 工具栏 ───────────────────────────────────────────────

interface ToolbarProps {
  node: ComponentNode;
  registry: ComponentRegistryImpl;
  siblings: string[];
  onCopy: () => void;
  onMove: (direction: 'left' | 'right') => void;
  onDelete: () => void;
}

function Toolbar({ node, registry, siblings, onCopy, onMove, onDelete }: ToolbarProps) {
  const registration = registry.resolve(node.type);
  const idx = siblings.indexOf(node.id);
  const isFirst = idx <= 0;
  const isLast = idx >= siblings.length - 1;

  const btnStyle: React.CSSProperties = {
    padding: '1px 5px', border: '1px solid #d9d9d9', borderRadius: 3,
    backgroundColor: '#fff', cursor: 'pointer', fontSize: 11, lineHeight: '18px',
  };

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: -28,
        display: 'flex', alignItems: 'center', gap: 3, zIndex: 30,
        backgroundColor: '#fff', padding: '2px 4px', borderRadius: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        whiteSpace: 'nowrap',
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <span style={{
        backgroundColor: '#1890ff', color: '#fff', fontSize: 11,
        padding: '1px 6px', borderRadius: 3,
      }}>
        {node.name || registration?.name || node.type}
      </span>
      <button onClick={onCopy} title="复制 (Ctrl+C)" style={btnStyle}>📋</button>
      <button onClick={() => onMove('left')} title="左移" disabled={isFirst}
        style={{ ...btnStyle, opacity: isFirst ? 0.3 : 1 }}>◀</button>
      <button onClick={() => onMove('right')} title="右移" disabled={isLast}
        style={{ ...btnStyle, opacity: isLast ? 0.3 : 1 }}>▶</button>
      <button onClick={onDelete} title="删除 (Delete)"
        style={{ ...btnStyle, color: '#ff4d4f', borderColor: '#ff4d4f' }}>✕</button>
    </div>
  );
}

// ─── Drop 指示器 ──────────────────────────────────────────

interface DropIndicatorProps {
  position: 'before' | 'after' | 'inside';
}

function DropIndicator({ position }: DropIndicatorProps) {
  if (position === 'inside') {
    return (
      <div style={{
        position: 'absolute',
        left: -2, top: -2, right: -2, bottom: -2,
        border: '2px solid #1890ff', borderRadius: 6,
        backgroundColor: 'rgba(24,144,255,0.08)',
        pointerEvents: 'none', zIndex: 20,
        boxSizing: 'border-box',
      }} />
    );
  }

  const isBefore = position === 'before';

  return (
    <div style={{
      position: 'absolute',
      left: 0, right: 0,
      top: isBefore ? -3 : undefined,
      bottom: isBefore ? undefined : -3,
      height: 3,
      backgroundColor: '#1890ff', borderRadius: 2,
      zIndex: 20, pointerEvents: 'none',
      boxShadow: '0 0 8px rgba(24,144,255,0.5)',
    }}>
      <div style={{
        position: 'absolute', left: -4, top: -3, width: 8, height: 8,
        borderRadius: '50%', backgroundColor: '#1890ff',
      }} />
      <div style={{
        position: 'absolute', right: -4, top: -3, width: 8, height: 8,
        borderRadius: '50%', backgroundColor: '#1890ff',
      }} />
    </div>
  );
}
