import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Switch, Tooltip, message } from 'antd';
import { useDesigner } from '../core/DesignerContext';
import type { ComponentNode } from '@low-code/shared';
import type { ComponentRegistryImpl } from '@low-code/renderer';
import { DesignOverlay } from '../../components/platform/DesignOverlay';
import { generateComponentName } from '../utils';

// ─── 常量 ─────────────────────────────────────────────────

const DND_DATA_TYPE = 'application/lc-component';

// ─── 类型 ─────────────────────────────────────────────────

interface DropPosition {
  targetId: string;
  position: 'before' | 'after' | 'inside';
  parentId: string | undefined;
}

interface DragState {
  sourceId: string | null;       // 拖拽源组件 ID
  overId: string | null;         // 当前悬停的目标组件 ID
  dropPosition: DropPosition | null;  // 放置位置
}

// ─── 工具函数 ─────────────────────────────────────────────

/** 判断组件是否为容器类型 */
function isContainerNode(node: ComponentNode, registry: any): boolean {
  const reg = registry.resolve(node.type);
  return reg?.acceptsChildren || false;
}

/** 获取组件的兄弟节点 ID 列表 */
function getSiblingIds(node: ComponentNode, components: ComponentNode[]): string[] {
  if (node.parentId) {
    const parent = components.find((c) => c.id === node.parentId);
    return parent?.children || [];
  }
  return components.filter((c) => !c.parentId).map((c) => c.id);
}

/** 设计模式下解析 props（将表达式/变量引用转换为可显示的值） */
function resolvePropsForDesign(props: Record<string, any>): Record<string, any> {
  const resolved: Record<string, any> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value != null && typeof value === 'object' && 'type' in value && 'value' in value) {
      // 变量引用或表达式，显示类型标签
      if (value.type === 'variable') {
        resolved[key] = `[变量] ${value.value}`;
      } else if (value.type === 'expression') {
        resolved[key] = '[表达式]';
      } else {
        resolved[key] = value;
      }
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

// ─── 主组件 ───────────────────────────────────────────────

export interface DesignCanvasProps {
  registry: ComponentRegistryImpl;
}

export function DesignCanvas({ registry }: DesignCanvasProps) {
  const { state, dispatch, onSave, saving } = useDesigner();
  const { schema, selectedComponentId, previewMode, previewDevice } = state;

  const [dragState, setDragState] = useState<DragState>({
    sourceId: null, overId: null, dropPosition: null,
  });
  // 用 ref 保存拖拽源 ID，避免闭包过期问题
  const dragSourceRef = useRef<string | null>(null);
  // Portal 容器 ref — overlay（选中框/工具栏/drop 指示器）渲染到这里
  const portalRef = useRef<HTMLDivElement>(null);
  // 滚动计数器 — 触发 overlay 位置重新计算
  const [scrollTick, setScrollTick] = useState(0);
  const canvasScrollRef = useRef<HTMLDivElement>(null);

  // 画布滚动时更新 overlay 位置
  useEffect(() => {
    const el = canvasScrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollTick((t) => t + 1);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // ─── 选中 ──────────────────────────────────────────────

  const handleSelect = useCallback((componentId: string | null) => {
    dispatch({ type: 'SELECT_COMPONENT', payload: componentId });
  }, [dispatch]);

  // ─── 放置位置计算（按设计文档规范） ────────────────────

  const calcDropPosition = useCallback(
    (e: React.DragEvent, targetId: string): DropPosition => {
      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const ratio = y / rect.height;

      const targetNode = schema.components.find((c) => c.id === targetId);
      const isContainer = isContainerNode(targetNode!, registry);

      // 容器组件：上1/4→before，中1/2→inside，下1/4→after
      if (isContainer) {
        if (ratio < 0.25) {
          return { targetId, position: 'before', parentId: targetNode?.parentId };
        }
        if (ratio > 0.75) {
          return { targetId, position: 'after', parentId: targetNode?.parentId };
        }
        return { targetId, position: 'inside', parentId: targetId };
      }

      // 普通组件：上半→before，下半→after
      return {
        targetId,
        position: ratio < 0.5 ? 'before' : 'after',
        parentId: targetNode?.parentId,
      };
    },
    [schema.components, registry],
  );

  // ─── 拖拽开始（画布内组件） ────────────────────────────

  const handleDragStart = useCallback(
    (e: React.DragEvent, componentId: string) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(DND_DATA_TYPE, JSON.stringify({ componentId }));
      const el = e.currentTarget as HTMLElement;
      el.style.opacity = '0.3';
      dragSourceRef.current = componentId;
      setDragState({ sourceId: componentId, overId: null, dropPosition: null });
    },
    [],
  );

  // ─── 拖拽结束 ──────────────────────────────────────────

  const handleDragEnd = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();
      const el = e.currentTarget as HTMLElement;
      el.style.opacity = '1';
      dragSourceRef.current = null;
      setDragState({ sourceId: null, overId: null, dropPosition: null });
    },
    [],
  );

  // ─── 拖拽悬停（画布内组件） ────────────────────────────

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      // 画布内拖拽：跳过自身；面板拖入：始终处理
      const isPanelDrag = e.dataTransfer.types.includes('component-type');
      if (!isPanelDrag && (!dragSourceRef.current || dragSourceRef.current === targetId)) return;
      const pos = calcDropPosition(e, targetId);
      setDragState((prev) => ({ ...prev, overId: targetId, dropPosition: pos }));
    },
    [calcDropPosition],
  );

  // ─── 拖拽离开 ──────────────────────────────────────────

  const handleDragLeave = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.stopPropagation();
      setDragState((prev) => {
        if (prev.overId === targetId) return { ...prev, overId: null, dropPosition: null };
        return prev;
      });
    },
    [],
  );

  // ─── 放置（画布内组件） ────────────────────────────────

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      e.stopPropagation();

      // 始终实时计算放置位置，避免缓存的 dropPosition 与实际位置不一致
      const pos = calcDropPosition(e, targetId);

      // 计算新索引
      const parent = schema.components.find((c) => c.id === pos.parentId);
      const children = parent?.children || schema.components.filter((c) => !c.parentId).map((c) => c.id);
      const targetIdx = children.indexOf(pos.targetId);
      const newIndex = pos.position === 'inside' ? 0
        : pos.position === 'before' ? targetIdx : targetIdx + 1;

      // 画布内排序
      const dragData = e.dataTransfer.getData(DND_DATA_TYPE);
      if (dragData) {
        try {
          const { componentId } = JSON.parse(dragData);
          if (componentId && componentId !== targetId) {
            dispatch({
              type: 'MOVE_COMPONENT',
              payload: { id: componentId, newParentId: pos.parentId, newIndex },
            });
          }
        } catch { /* ignore */ }
      }

      // 面板拖入
      const componentType = e.dataTransfer.getData('component-type');
      if (componentType) {
        const registration = registry.resolve(componentType);
        const defaultProps = registration?.defaultProps || {};
        const fieldName = generateComponentName(componentType, schema.components);

        dispatch({
          type: 'ADD_COMPONENT',
          payload: {
            node: {
              id: `${componentType}_${Date.now()}`,
              type: componentType,
              name: fieldName,
              props: { ...defaultProps },
              parentId: pos.parentId,
              children: registration?.acceptsChildren ? [] : undefined,
            },
            parentId: pos.parentId,
            index: newIndex,
          },
        });
      }

      dragSourceRef.current = null;
      setDragState({ sourceId: null, overId: null, dropPosition: null });
    },
    [calcDropPosition, registry, dispatch, schema.components],
  );

  // ─── 画布放置（根级别） ────────────────────────────────

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const dragData = e.dataTransfer.getData(DND_DATA_TYPE);
      if (dragData) {
        try {
          const { componentId } = JSON.parse(dragData);
          if (componentId) {
            dispatch({
              type: 'MOVE_COMPONENT',
              payload: { id: componentId, newParentId: undefined, newIndex: schema.components.filter((c) => !c.parentId).length },
            });
          }
        } catch { /* ignore */ }
      }

      const componentType = e.dataTransfer.getData('component-type');
      if (componentType) {
        const registration = registry.resolve(componentType);
        const defaultProps = registration?.defaultProps || {};
        const fieldName = generateComponentName(componentType, schema.components);
        dispatch({
          type: 'ADD_COMPONENT',
          payload: {
            node: {
              id: `${componentType}_${Date.now()}`,
              type: componentType,
              name: fieldName,
              props: { ...defaultProps },
              parentId: undefined,
              children: registration?.acceptsChildren ? [] : undefined,
            },
          },
        });
      }

      dragSourceRef.current = null;
      setDragState({ sourceId: null, overId: null, dropPosition: null });
    },
    [registry, dispatch, schema.components],
  );

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // ─── 组件操作 ──────────────────────────────────────────

  const handleCopy = useCallback(() => {
    if (!selectedComponentId) return;
    const node = schema.components.find((c) => c.id === selectedComponentId);
    if (node) {
      navigator.clipboard.writeText(JSON.stringify(node)).catch(() => {});
    }
  }, [selectedComponentId, schema.components]);

  const handleDuplicate = useCallback(() => {
    if (!selectedComponentId) return;
    const node = schema.components.find((c) => c.id === selectedComponentId);
    if (!node) return;
    dispatch({
      type: 'ADD_COMPONENT',
      payload: {
        node: {
          ...node,
          id: `${node.type}_${Date.now()}`,
          name: generateComponentName(node.type, schema.components),
          children: node.children ? [...node.children] : undefined,
        },
        parentId: node.parentId,
      },
    });
  }, [selectedComponentId, schema.components, dispatch]);

  const handleDelete = useCallback(() => {
    if (!selectedComponentId) return;
    dispatch({ type: 'REMOVE_COMPONENT', payload: { id: selectedComponentId } });
  }, [selectedComponentId, dispatch]);

  const handleMove = useCallback((direction: 'left' | 'right') => {
    if (!selectedComponentId) return;
    const node = schema.components.find((c) => c.id === selectedComponentId);
    if (!node) return;

    const siblings = getSiblingIds(node, schema.components);
    const idx = siblings.indexOf(selectedComponentId);
    // 右移传 idx+2：reducer 会把源在目标前面的索引减 1，所以要多传 1 来补偿
    const newIdx = direction === 'left' ? idx - 1 : idx + 2;

    if (newIdx < 0 || newIdx > siblings.length) return;

    dispatch({
      type: 'MOVE_COMPONENT',
      payload: { id: selectedComponentId, newParentId: node.parentId, newIndex: newIdx },
    });
  }, [selectedComponentId, schema.components, dispatch]);

  // ─── 键盘快捷键 ────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); handleDuplicate(); }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); handleDelete(); }
      if (e.key === 'Escape') { handleSelect(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleDuplicate, handleDelete, handleSelect]);

  // ─── 组件节点渲染（HOC 注入 + Portal overlay，零 wrapper DOM） ──

  const renderNode = useCallback(
    (node: ComponentNode): React.ReactNode => {
      const isSelected = selectedComponentId === node.id;
      const isDragSource = dragState.sourceId === node.id;
      const isContainer = isContainerNode(node, registry);
      const ComponentImpl = ((registry as ComponentRegistryImpl).resolveComponent(node.type) || 'div') as React.ComponentType<any>;

      const childNodes = (node.children || [])
        .map((id) => schema.components.find((c) => c.id === id))
        .filter(Boolean) as ComponentNode[];

      // DesignOverlay props（设计态所有交互由 overlay 处理）
      const overlayProps = previewMode === 'design' && portalRef.current ? {
        node,
        isSelected,
        isDragSource,
        registry,
        portalContainer: portalRef.current,
        onCopy: handleCopy,
        onMove: handleMove,
        onDelete: handleDelete,
        onDragStart: handleDragStart,
        onDragEnd: handleDragEnd,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
        onSelect: handleSelect,
        dragOverId: dragState.overId,
        dropPosition: dragState.dropPosition?.position ?? null,
        dragSourceId: dragState.sourceId,
        siblings: getSiblingIds(node, schema.components),
        scrollTick,
      } : null;

      // 设计态标识
      const isDesign = previewMode === 'design';
      const isNative = typeof ComponentImpl === 'string';

      // 设计态注入 props（仅平台组件接受，原生元素不注入）
      const designProps = isDesign && !isNative ? {
        designMode: true,
        _designId: node.id,
        _draggable: true,
        _isDragSource: isDragSource,
        _onSelect: (e: React.MouseEvent) => { e.stopPropagation(); handleSelect(node.id); },
        _onDragStart: (e: React.DragEvent) => { e.stopPropagation(); handleDragStart(e, node.id); },
        _onDragEnd: (e: React.DragEvent) => { e.stopPropagation(); handleDragEnd(e); },
        _onDragOver: (e: React.DragEvent) => { e.stopPropagation(); handleDragOver(e, node.id); },
        _onDragLeave: (e: React.DragEvent) => { e.stopPropagation(); handleDragLeave(e, node.id); },
        _onDrop: (e: React.DragEvent) => { e.stopPropagation(); handleDrop(e, node.id); },
        _onClickCapture: (e: React.MouseEvent) => { e.stopPropagation(); },
      } : {};

      // 容器组件
      if (isContainer) {
        return (
          <React.Fragment key={node.id}>
            <ComponentImpl
              {...node.props}
              {...designProps}
              style={{
                border: '1px dashed #c8c8c8',
                borderRadius: 6,
                padding: 8,
                minHeight: 60,
                ...((node.type === 'flex' || node.type === 'grid') ? {
                  display: 'flex',
                  flexDirection: node.props.vertical !== false ? 'column' : 'row',
                  flexWrap: node.props.wrap ? 'wrap' : 'nowrap',
                  justifyContent: node.props.justify || 'flex-start',
                  alignItems: node.props.align || 'stretch',
                  gap: node.props.gap ?? 8,
                } : { display: 'flex', flexDirection: 'column', gap: 8 }),
                ...node.props.style,
              }}
            >
              {childNodes.map((child) => renderNode(child))}
              {/* 容器内拖入区域 */}
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const componentType = e.dataTransfer.getData('component-type');
                  if (componentType) {
                    const reg = registry.resolve(componentType);
                    const fieldName = generateComponentName(componentType, schema.components);
                    dispatch({
                      type: 'ADD_COMPONENT',
                      payload: {
                        node: {
                          id: `${componentType}_${Date.now()}`,
                          type: componentType,
                          name: fieldName,
                          props: { ...(reg?.defaultProps || {}) },
                          parentId: node.id,
                          children: reg?.acceptsChildren ? [] : undefined,
                        },
                        parentId: node.id,
                      },
                    });
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: childNodes.length > 0 ? 24 : 40,
                  color: '#bbb', fontSize: 12,
                  border: '1px dashed #d9d9d9',
                  borderRadius: 4,
                  marginTop: childNodes.length > 0 ? 4 : 0,
                }}
              >
                {childNodes.length > 0 ? '+ 拖入更多' : '拖入组件'}
              </div>
            </ComponentImpl>
            {overlayProps && <DesignOverlay {...overlayProps} />}
          </React.Fragment>
        );
      }

      // 普通组件（叶子节点）
      return (
        <React.Fragment key={node.id}>
          <ComponentImpl
            {...resolvePropsForDesign(node.props)}
            {...designProps}
          />
          {overlayProps && <DesignOverlay {...overlayProps} />}
        </React.Fragment>
      );
    },
    [schema.components, selectedComponentId, previewMode, dragState, registry,
     handleSelect, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave,
     handleDrop, handleCopy, handleMove, handleDelete, dispatch, scrollTick],
  );

  // ─── 根级组件 ──────────────────────────────────────────

  const rootComponents = schema.components.filter((c) => !c.parentId);

  const deviceStyles: Record<string, React.CSSProperties> = {
    web: { width: '100%', maxWidth: '100%', height: '100%' },
    mobile: { width: 375, height: 667, maxWidth: 375, margin: '0 auto', border: '1px solid #e8e8e8', borderRadius: 20 },
  };

  // ─── 渲染 ──────────────────────────────────────────────

  // ─── Ctrl+S 快捷键 ──────────────────────────────────────

  // 保存前校验
  const validateBeforeSave = useCallback(() => {
    // 检查字段名唯一性
    const names = schema.components
      .map((c) => c.name)
      .filter((name): name is string => !!name);

    const nameCount = new Map<string, number>();
    for (const name of names) {
      nameCount.set(name, (nameCount.get(name) || 0) + 1);
    }

    const duplicates = Array.from(nameCount.entries())
      .filter(([, count]) => count > 1)
      .map(([name]) => name);

    if (duplicates.length > 0) {
      message.error(`存在重复的字段名: ${duplicates.join(', ')}`);
      return false;
    }

    return true;
  }, [schema.components]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (validateBeforeSave()) {
          onSave?.();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSave, validateBeforeSave]);

  // ─── 渲染 ──────────────────────────────────────────────

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 工具栏 */}
      <div style={{
        height: 40, padding: '0 12px', borderBottom: '1px solid #e8e8e8',
        display: 'flex', alignItems: 'center', gap: 12, backgroundColor: '#fff', flexShrink: 0,
      }}>
        {/* 左侧：设计/预览 Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: previewMode === 'design' ? '#1890ff' : '#999' }}>设计</span>
          <Switch
            size="small"
            checked={previewMode === 'preview'}
            onChange={(checked) => dispatch({ type: 'SET_PREVIEW_MODE', payload: checked ? 'preview' : 'design' })}
          />
          <span style={{ fontSize: 12, color: previewMode === 'preview' ? '#1890ff' : '#999' }}>预览</span>
        </div>

        <div style={{ width: 1, height: 16, backgroundColor: '#e8e8e8' }} />

        {/* Web/Mobile Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: previewDevice === 'web' ? '#1890ff' : '#999' }}>🖥 Web</span>
          <Switch
            size="small"
            checked={previewDevice === 'mobile'}
            onChange={(checked) => dispatch({ type: 'SET_PREVIEW_DEVICE', payload: checked ? 'mobile' : 'web' })}
          />
          <span style={{ fontSize: 12, color: previewDevice === 'mobile' ? '#1890ff' : '#999' }}>📱 Mobile</span>
        </div>

        <div style={{ width: 1, height: 16, backgroundColor: '#e8e8e8' }} />

        {/* 中间：保存按钮 */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          {onSave && (
            <Tooltip title="Ctrl+S">
              <button
                onClick={onSave}
                disabled={saving}
                style={{
                  padding: '3px 20px',
                  border: '1px solid #1890ff',
                  borderRadius: 4,
                  backgroundColor: '#1890ff',
                  color: '#fff',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Portal 容器 — overlay（选中框/工具栏/drop 指示器）渲染到这里，放在滚动容器外 */}
      <div ref={portalRef} />
      {/* 画布 */}
      <div ref={canvasScrollRef} style={{ flex: 1, overflow: 'auto', backgroundColor: '#f0f2f5', padding: 24 }}>
        <div
          onClick={() => handleSelect(null)}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
          style={{
            ...deviceStyles[previewDevice],
            backgroundColor: '#fff',
            padding: 16,
            minHeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '2px dashed #d9d9d9',
            borderRadius: 8,
            position: 'relative',
          }}
        >
          {rootComponents.length === 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 200, color: '#bbb', fontSize: 16,
            }}>
              从左侧拖拽组件到此处
            </div>
          ) : (
            <>
              {/* 组件区域 — 受布局配置影响 */}
              <div style={{
                display: schema.layout.type === 'grid' ? 'grid' : 'flex',
                flexDirection: schema.layout.type === 'flex' ? (schema.layout.vertical !== false ? 'column' : 'row') : undefined,
                flexWrap: schema.layout.type === 'flex' ? (schema.layout.wrap ? 'wrap' : 'nowrap') : undefined,
                justifyContent: schema.layout.type === 'flex' ? (schema.layout.justify || 'flex-start') : undefined,
                alignItems: schema.layout.type === 'flex' ? (schema.layout.align || 'stretch') : undefined,
                gridTemplateColumns: schema.layout.type === 'grid' ? `repeat(${schema.layout.columns || 24}, 1fr)` : undefined,
                gap: schema.layout.gap ?? 16,
              }}>
                {rootComponents.map((node) => renderNode(node))}
              </div>
              {/* 根级放置区域 — 不受布局影响 */}
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const componentType = e.dataTransfer.getData('component-type');
                  if (componentType) {
                    const reg = registry.resolve(componentType);
                    const fieldName = generateComponentName(componentType, schema.components);
                    dispatch({
                      type: 'ADD_COMPONENT',
                      payload: {
                        node: {
                          id: `${componentType}_${Date.now()}`,
                          type: componentType,
                          name: fieldName,
                          props: { ...(reg?.defaultProps || {}) },
                          children: reg?.acceptsChildren ? [] : undefined,
                        },
                      },
                    });
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: 24, color: '#bbb', fontSize: 12,
                  border: '1px dashed #d9d9d9', borderRadius: 4, marginTop: 8,
                }}
              >
                + 拖入更多组件
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
