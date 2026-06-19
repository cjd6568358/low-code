/**
 * DesignOverlay — 设计态 Portal overlay
 *
 * 渲染到 portalContainer（画布级容器），提供：
 * - 交互拦截层（pointer-events:auto）阻止组件接收鼠标事件
 * - 选中框（position:fixed CSS border）
 * - 工具栏（复制/移动/删除）
 * - Drop 指示器（before/after/inside）
 *
 * 通过 data-component-id + document.querySelector 定位组件 DOM 元素。
 */
import React from 'react';
import { createPortal } from 'react-dom';
import type { ComponentNode } from '@low-code/shared';
import type { ComponentRegistryImpl } from '../../core/ComponentRegistry';

// ─── 类型 ─────────────────────────────────────────────────

interface DesignOverlayProps {
  node: ComponentNode;
  isSelected: boolean;
  isDragSource: boolean;
  registry: ComponentRegistryImpl;
  portalContainer: Element;
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
  scrollTick: number;
}

export function DesignOverlay({
  node, isSelected, isDragSource, registry, portalContainer,
  onCopy, onMove, onDelete,
  onDragStart: handleDragStart, onDragEnd: handleDragEnd,
  onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop,
  onSelect,
  dragOverId, dropPosition, dragSourceId,
  siblings, scrollTick,
}: DesignOverlayProps) {
  // 通过 className 唯一标记定位组件 DOM 元素
  const getCompRect = React.useCallback((): DOMRect | null => {
    const el = document.querySelector(`.lc-did-${node.id}`) as HTMLElement | null;
    return el?.getBoundingClientRect() ?? null;
  }, [node.id]);

  const [rect, setRect] = React.useState<DOMRect | null>(null);

  // 每次渲染后同步测量（组件移动/resize/滚动都能响应）
  React.useLayoutEffect(() => {
    const newRect = getCompRect();
    setRect((prev) => {
      if (!prev && !newRect) return prev;
      if (!prev || !newRect) return newRect;
      if (prev.left === newRect.left && prev.top === newRect.top &&
          prev.width === newRect.width && prev.height === newRect.height) return prev;
      return newRect;
    });
  });

  if (!rect) return null;

  const showDrop = dragOverId === node.id && dropPosition && dragSourceId !== node.id;

  return createPortal(
    <>
      {/* 交互拦截层 + 选中框 */}
      <div
        style={{
          position: 'fixed',
          left: rect.left - 2,
          top: rect.top - 2,
          width: rect.width + 4,
          height: rect.height + 4,
          border: isSelected ? '2px solid #1890ff' : '2px solid transparent',
          borderRadius: 6,
          pointerEvents: 'auto',
          zIndex: 10,
          cursor: isDragSource ? 'grabbing' : 'grab',
          backgroundColor: dragOverId === node.id && dropPosition === 'inside'
            ? 'rgba(24,144,255,0.08)' : 'transparent',
          boxSizing: 'border-box',
        }}
        onMouseDown={(e) => { e.stopPropagation(); onSelect(node.id); }}
        onClick={(e) => { e.stopPropagation(); }}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = 'move';
          // 用组件真实 DOM 做拖拽预览图
          const compEl = document.querySelector(`.lc-did-${node.id}`) as HTMLElement | null;
          if (compEl) e.dataTransfer.setDragImage(compEl, 10, 10);
          handleDragStart(e, node.id);
        }}
        onDragEnd={(e) => { e.stopPropagation(); handleDragEnd(e); }}
        onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, node.id); }}
        onDragLeave={(e) => { e.stopPropagation(); handleDragLeave(e, node.id); }}
        onDrop={(e) => { e.stopPropagation(); handleDrop(e, node.id); }}
        draggable
      />

      {/* 工具栏 */}
      {isSelected && (
        <Toolbar
          node={node}
          registry={registry}
          siblings={siblings}
          rect={rect}
          onCopy={onCopy}
          onMove={onMove}
          onDelete={onDelete}
        />
      )}

      {/* Drop 指示器 */}
      {showDrop && <DropIndicator position={dropPosition!} rect={rect} />}
    </>,
    portalContainer,
  );
}

// ─── 工具栏 ───────────────────────────────────────────────

interface ToolbarProps {
  node: ComponentNode;
  registry: ComponentRegistryImpl;
  siblings: string[];
  rect: DOMRect;
  onCopy: () => void;
  onMove: (direction: 'left' | 'right') => void;
  onDelete: () => void;
}

function Toolbar({ node, registry, siblings, rect, onCopy, onMove, onDelete }: ToolbarProps) {
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
        position: 'fixed',
        left: rect.right - 160,
        top: rect.top - 28,
        display: 'flex', alignItems: 'center', gap: 3, zIndex: 30,
        backgroundColor: '#fff', padding: '2px 4px', borderRadius: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        whiteSpace: 'nowrap',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <span style={{
        backgroundColor: '#1890ff', color: '#fff', fontSize: 11,
        padding: '1px 6px', borderRadius: 3,
      }}>
        {node.label || registration?.name || node.type}
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
  rect: DOMRect;
}

function DropIndicator({ position, rect }: DropIndicatorProps) {
  if (position === 'inside') {
    return (
      <div style={{
        position: 'fixed',
        left: rect.left - 2, top: rect.top - 2,
        width: rect.width + 4, height: rect.height + 4,
        border: '2px solid #1890ff', borderRadius: 6,
        backgroundColor: 'rgba(24,144,255,0.08)',
        pointerEvents: 'none', zIndex: 20,
        boxSizing: 'border-box',
      }} />
    );
  }

  const isBefore = position === 'before';
  const y = isBefore ? rect.top - 2 : rect.bottom - 1;

  return (
    <div style={{
      position: 'fixed',
      left: rect.left, top: y,
      width: rect.width, height: 3,
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
