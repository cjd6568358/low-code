import React, { useCallback, useState } from 'react';
import { useDesigner } from '../core/DesignerContext';
import type { ComponentNode } from '@low-code/shared';
import {
  BuiltinInput, BuiltinTextarea, BuiltinNumber, BuiltinSelect,
  BuiltinRadio, BuiltinCheckbox, BuiltinSwitch,
  BuiltinDatePicker, BuiltinTimePicker, BuiltinUpload,
  BuiltinButton, BuiltinTable, BuiltinForm,
  BuiltinCard, BuiltinFlex, BuiltinGrid, BuiltinDivider, BuiltinTabs, BuiltinText,
  SlotComponent,
} from '@low-code/renderer';

/** 内建组件映射（用于设计区预览）— 覆盖文档定义的所有组件类型 */
const DESIGN_COMPONENTS: Record<string, React.ComponentType<any>> = {
  slot: SlotComponent,
  input: BuiltinInput,
  textarea: BuiltinTextarea,
  number: BuiltinNumber,
  select: BuiltinSelect,
  radio: BuiltinRadio,
  checkbox: BuiltinCheckbox,
  switch: BuiltinSwitch,
  datepicker: BuiltinDatePicker,
  timepicker: BuiltinTimePicker,
  upload: BuiltinUpload,
  button: BuiltinButton,
  table: BuiltinTable,
  form: BuiltinForm,
  card: BuiltinCard,
  flex: BuiltinFlex,
  grid: BuiltinGrid,
  divider: BuiltinDivider,
  tabs: BuiltinTabs,
  text: BuiltinText,
};

/** 拖拽数据类型 */
const DND_TYPE = 'application/lc-component';

/** 放置指示器位置 */
interface DropIndicator {
  targetId: string;
  position: 'before' | 'after' | 'inside';
  parentId?: string;
}

/** 设计区属性 */
export interface DesignCanvasProps {
  registry: any;
}

/** 设计区 — 中间画布 */
export function DesignCanvas({ registry }: DesignCanvasProps) {
  const { state, dispatch } = useDesigner();
  const { schema, selectedComponentId, previewMode, previewDevice } = state;

  const [clipboard, setClipboard] = useState<ComponentNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);

  const handleSelect = useCallback(
    (e: React.MouseEvent, componentId: string) => {
      e.stopPropagation();
      dispatch({ type: 'SELECT_COMPONENT', payload: componentId });
    },
    [dispatch],
  );

  const handleCanvasClick = useCallback(() => {
    dispatch({ type: 'SELECT_COMPONENT', payload: null });
  }, [dispatch]);

  // ========== 放置指示器计算 ==========
  const calcDropIndicator = useCallback(
    (e: React.DragEvent, targetId: string): DropIndicator => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      const ratio = y / rect.height;

      const targetNode = schema.components.find((c) => c.id === targetId);
      const registration = registry.resolve(targetNode?.type || '');
      const isContainer = registration?.acceptsChildren || !!targetNode?.children?.length;

      if (isContainer) {
        if (ratio < 0.25) return { targetId, position: 'before', parentId: targetNode?.parentId };
        if (ratio > 0.75) return { targetId, position: 'after', parentId: targetNode?.parentId };
        return { targetId, position: 'inside', parentId: targetId };
      }

      return {
        targetId,
        position: ratio < 0.5 ? 'before' : 'after',
        parentId: targetNode?.parentId,
      };
    },
    [schema.components, registry],
  );

  // ========== 拖放处理 ==========
  const handleDrop = useCallback(
    (e: React.DragEvent, indicator?: DropIndicator) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragSourceId(null);
      setDropIndicator(null);

      const effectiveIndicator = indicator || dropIndicator;

      // 画布内排序
      const dragData = e.dataTransfer.getData(DND_TYPE);
      if (dragData) {
        try {
          const { componentId } = JSON.parse(dragData);
          if (componentId) {
            let newIndex = 0;
            if (effectiveIndicator) {
              const parent = schema.components.find((c) => c.id === effectiveIndicator.parentId);
              const children = parent?.children || schema.components.filter((c) => !c.parentId).map((c) => c.id);
              const targetIdx = children.indexOf(effectiveIndicator.targetId);
              newIndex = effectiveIndicator.position === 'inside' ? 0
                : effectiveIndicator.position === 'before' ? targetIdx : targetIdx + 1;
            }
            dispatch({ type: 'MOVE_COMPONENT', payload: { id: componentId, newParentId: effectiveIndicator?.parentId, newIndex } });
            return;
          }
        } catch { /* ignore */ }
      }

      // 面板拖入
      const componentType = e.dataTransfer.getData('component-type');
      if (!componentType) return;

      const registration = registry.resolve(componentType);
      const defaultProps = registration?.defaultProps || {};

      let parentId: string | undefined;
      let insertIndex: number | undefined;
      if (effectiveIndicator) {
        parentId = effectiveIndicator.parentId;
        const parent = schema.components.find((c) => c.id === parentId);
        const children = parent?.children || schema.components.filter((c) => !c.parentId).map((c) => c.id);
        const targetIdx = children.indexOf(effectiveIndicator.targetId);
        insertIndex = effectiveIndicator.position === 'inside' ? 0
          : effectiveIndicator.position === 'before' ? targetIdx : targetIdx + 1;
      }

      dispatch({
        type: 'ADD_COMPONENT',
        payload: {
          node: { id: `${componentType}_${Date.now()}`, type: componentType, props: { ...defaultProps }, parentId, children: registration?.acceptsChildren ? [] : undefined },
          parentId,
          index: insertIndex,
        },
      });
      dispatch({ type: 'SET_DRAGGING', payload: null });
    },
    [registry, dispatch, dropIndicator, schema.components],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // ========== 画布内拖拽 ==========
  const handleComponentDragStart = useCallback(
    (e: React.DragEvent, componentId: string) => {
      e.stopPropagation();
      setIsDragging(true);
      setDragSourceId(componentId);
      e.dataTransfer.setData(DND_TYPE, JSON.stringify({ componentId }));
      e.dataTransfer.effectAllowed = 'move';

      // 拖拽阴影
      const el = e.currentTarget as HTMLElement;
      const ghost = el.cloneNode(true) as HTMLElement;
      ghost.style.cssText = 'position:absolute;top:-9999px;left:-9999px;opacity:0.7;transform:scale(0.95);box-shadow:0 8px 24px rgba(0,0,0,0.2);border-radius:4px;pointer-events:none;';
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
      requestAnimationFrame(() => document.body.removeChild(ghost));
    },
    [],
  );

  const handleComponentDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragSourceId(null);
    setDropIndicator(null);
  }, []);

  const handleComponentDragOver = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (isDragging && dragSourceId && dragSourceId !== targetId) {
        setDropIndicator(calcDropIndicator(e, targetId));
      }
    },
    [isDragging, dragSourceId, calcDropIndicator],
  );

  const handleComponentDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.stopPropagation();
      handleDrop(e, calcDropIndicator(e, targetId));
    },
    [calcDropIndicator, handleDrop],
  );

  // ========== 复制粘贴 ==========
  const handleCopy = useCallback(() => {
    if (!selectedComponentId) return;
    const node = schema.components.find((c) => c.id === selectedComponentId);
    if (node) setClipboard({ ...node });
  }, [selectedComponentId, schema.components]);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    dispatch({ type: 'ADD_COMPONENT', payload: { node: { ...clipboard, id: `${clipboard.type}_${Date.now()}`, children: clipboard.children ? [...clipboard.children] : undefined } } });
  }, [clipboard, dispatch]);

  const handleDuplicate = useCallback(() => {
    if (!selectedComponentId) return;
    const node = schema.components.find((c) => c.id === selectedComponentId);
    if (!node) return;
    dispatch({ type: 'ADD_COMPONENT', payload: { node: { ...node, id: `${node.type}_${Date.now()}`, children: node.children ? [...node.children] : undefined }, parentId: node.parentId } });
  }, [selectedComponentId, schema.components, dispatch]);

  const handleDelete = useCallback(() => {
    if (!selectedComponentId) return;
    dispatch({ type: 'REMOVE_COMPONENT', payload: { id: selectedComponentId } });
  }, [selectedComponentId, dispatch]);

  // 键盘快捷键
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); handleCopy(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); handlePaste(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); handleDuplicate(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleCopy, handlePaste, handleDuplicate, handleDelete]);

  // ========== 放置指示线 ==========
  const renderDropIndicator = useCallback(
    (targetId: string): React.ReactNode => {
      if (!dropIndicator || dropIndicator.targetId !== targetId) return null;

      if (dropIndicator.position === 'inside') {
        return (
          <div style={{
            position: 'absolute', inset: 0, border: '2px solid #1890ff', borderRadius: '4px',
            backgroundColor: 'rgba(24,144,255,0.06)', pointerEvents: 'none', zIndex: 20,
          }} />
        );
      }

      const isBefore = dropIndicator.position === 'before';
      return (
        <div style={{
          position: 'absolute', left: 0, right: 0, [isBefore ? 'top' : 'bottom']: '-2px',
          height: '3px', backgroundColor: '#1890ff', borderRadius: '2px', zIndex: 20,
          pointerEvents: 'none', boxShadow: '0 0 6px rgba(24,144,255,0.4)',
        }}>
          <div style={{ position: 'absolute', left: '-4px', top: '-3px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1890ff' }} />
          <div style={{ position: 'absolute', right: '-4px', top: '-3px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1890ff' }} />
        </div>
      );
    },
    [dropIndicator],
  );

  // ========== 渲染组件节点 ==========
  const renderNode = useCallback(
    (node: ComponentNode): React.ReactNode => {
      const isSelected = selectedComponentId === node.id;
      const isDragSource = dragSourceId === node.id;
      const registration = registry.resolve(node.type);
      const ComponentImpl = DESIGN_COMPONENTS[node.type] || 'div';

      const childNodes = (node.children || [])
        .map((childId) => schema.components.find((c) => c.id === childId))
        .filter(Boolean) as ComponentNode[];

      const isContainer = registration?.acceptsChildren || !!node.children?.length;

      // 只读预览态
      const readOnlyProps: Record<string, any> = {
        disabled: true,
        readOnly: true,
        onChange: undefined,
        onClick: undefined,
      };

      return (
        <div
          key={node.id}
          data-component-id={node.id}
          onClick={(e) => { e.stopPropagation(); handleSelect(e, node.id); }}
          style={{
            position: 'relative',
            border: isSelected ? '2px solid #1890ff' : isDragging ? '1px dashed #1890ff40' : '1px dashed transparent',
            borderRadius: '4px',
            padding: isContainer ? '8px' : '2px',
            margin: '4px',
            minHeight: isContainer ? '60px' : undefined,
            transition: 'all 0.15s ease',
            opacity: isDragSource ? 0.3 : 1,
            boxShadow: isSelected ? '0 0 0 1px #1890ff33' : 'none',
          }}
        >
          {/* 拖拽覆盖层 — 解决内层组件拦截拖拽事件的问题 */}
          {previewMode === 'design' && (
            <div
              draggable
              onDragStart={(e) => handleComponentDragStart(e, node.id)}
              onDragEnd={handleComponentDragEnd}
              onDragOver={(e) => handleComponentDragOver(e, node.id)}
              onDrop={(e) => handleComponentDrop(e, node.id)}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: isContainer ? 1 : 5,
                cursor: isDragSource ? 'grabbing' : 'grab',
                // 容器组件的覆盖层不拦截子组件区域的事件
                pointerEvents: isContainer ? 'none' : 'auto',
              }}
            />
          )}

          {/* 放置指示线 */}
          {renderDropIndicator(node.id)}

          {/* 选中操作栏 */}
          {isSelected && previewMode === 'design' && (
            <div style={{ position: 'absolute', top: '-28px', left: '0', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 30 }}>
              <span style={{ backgroundColor: '#1890ff', color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                {registration?.name || node.type}
              </span>
              <button onClick={(e) => { e.stopPropagation(); handleCopy(); }} title="复制 (Ctrl+C)"
                style={{ padding: '2px 6px', border: '1px solid #d9d9d9', borderRadius: '3px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '11px' }}>复制</button>
              <button onClick={(e) => { e.stopPropagation(); handleDuplicate(); }} title="克隆 (Ctrl+D)"
                style={{ padding: '2px 6px', border: '1px solid #d9d9d9', borderRadius: '3px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '11px' }}>克隆</button>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} title="删除 (Delete)"
                style={{ padding: '2px 6px', border: '1px solid #ff4d4f', borderRadius: '3px', color: '#ff4d4f', backgroundColor: '#fff', cursor: 'pointer', fontSize: '11px' }}>删除</button>
            </div>
          )}

          {/* 组件内容 */}
          {isContainer && childNodes.length > 0 ? (
            <ComponentImpl {...node.props} {...readOnlyProps}>
              {childNodes.map((child) => renderNode(child))}
            </ComponentImpl>
          ) : isContainer ? (
            <ComponentImpl {...node.props} {...readOnlyProps}>
              <div
                onDrop={(e) => handleDrop(e, { targetId: node.id, position: 'inside', parentId: node.id })}
                onDragOver={handleDragOver}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: '40px', color: '#bbb', fontSize: '12px',
                  border: isDragging ? '2px dashed #1890ff40' : '1px dashed #d9d9d9',
                  borderRadius: '4px', transition: 'border-color 0.15s ease',
                }}
              >
                拖入组件
              </div>
            </ComponentImpl>
          ) : (
            <ComponentImpl {...node.props} {...readOnlyProps} />
          )}
        </div>
      );
    },
    [schema.components, selectedComponentId, previewMode, isDragging, dragSourceId, registry,
     handleSelect, handleDrop, handleDragOver, handleComponentDragStart, handleComponentDragEnd,
     handleComponentDragOver, handleComponentDrop, renderDropIndicator, handleCopy, handleDuplicate, handleDelete],
  );

  const rootComponents = schema.components.filter((c) => !c.parentId);

  const deviceStyles: Record<string, React.CSSProperties> = {
    web: { width: '100%', maxWidth: '100%' },
    mobile: { width: '375px', maxWidth: '375px', margin: '0 auto', border: '1px solid #e8e8e8', borderRadius: '20px', minHeight: '667px' },
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 工具栏 */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff' }}>
        <button onClick={() => dispatch({ type: 'UNDO' })} disabled={state.historyIndex <= 0}
          style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', cursor: state.historyIndex <= 0 ? 'not-allowed' : 'pointer', backgroundColor: '#fff' }}>↩ 撤销</button>
        <button onClick={() => dispatch({ type: 'REDO' })} disabled={state.historyIndex >= state.history.length - 1}
          style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', cursor: state.historyIndex >= state.history.length - 1 ? 'not-allowed' : 'pointer', backgroundColor: '#fff' }}>↪ 重做</button>
        <div style={{ width: '1px', height: '20px', backgroundColor: '#e8e8e8' }} />
        <button onClick={handleCopy} disabled={!selectedComponentId}
          style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', cursor: selectedComponentId ? 'pointer' : 'not-allowed', backgroundColor: '#fff' }}>📋 复制</button>
        <button onClick={handlePaste} disabled={!clipboard}
          style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', cursor: clipboard ? 'pointer' : 'not-allowed', backgroundColor: '#fff' }}>📄 粘贴</button>
        <div style={{ width: '1px', height: '20px', backgroundColor: '#e8e8e8' }} />
        {(['design', 'preview'] as const).map((mode) => (
          <button key={mode} onClick={() => dispatch({ type: 'SET_PREVIEW_MODE', payload: mode })}
            style={{ padding: '4px 12px', border: '1px solid', borderColor: previewMode === mode ? '#1890ff' : '#d9d9d9', borderRadius: '4px', backgroundColor: previewMode === mode ? '#e6f7ff' : '#fff', color: previewMode === mode ? '#1890ff' : '#000000d9', cursor: 'pointer' }}>
            {mode === 'design' ? '设计' : '预览'}
          </button>
        ))}
        <div style={{ width: '1px', height: '20px', backgroundColor: '#e8e8e8' }} />
        {(['web', 'mobile'] as const).map((device) => (
          <button key={device} onClick={() => dispatch({ type: 'SET_PREVIEW_DEVICE', payload: device })}
            style={{ padding: '4px 12px', border: '1px solid', borderColor: previewDevice === device ? '#1890ff' : '#d9d9d9', borderRadius: '4px', backgroundColor: previewDevice === device ? '#e6f7ff' : '#fff', color: previewDevice === device ? '#1890ff' : '#000000d9', cursor: 'pointer', fontSize: '12px' }}>
            {device === 'web' ? '🖥 Web' : '📱 Mobile'}
          </button>
        ))}
      </div>

      {/* 画布区域 */}
      <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#f0f2f5', padding: '24px' }}>
        <div
          onClick={handleCanvasClick}
          onDrop={(e) => handleDrop(e)}
          onDragOver={handleDragOver}
          style={{
            ...deviceStyles[previewDevice],
            backgroundColor: '#fff',
            padding: '16px',
            minHeight: '500px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {rootComponents.length === 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: '200px', color: '#bbb', fontSize: '16px',
              border: isDragging ? '2px dashed #1890ff' : '2px dashed #d9d9d9',
              borderRadius: '8px', transition: 'border-color 0.15s ease',
            }}>
              从左侧拖拽组件到此处
            </div>
          ) : (
            rootComponents.map((node) => renderNode(node))
          )}
        </div>
      </div>
    </div>
  );
}
