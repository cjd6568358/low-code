import React, { useMemo } from 'react';
import { useDesigner } from '../core/DesignerContext';
import type { ComponentRegistration } from '@low-code/shared';
import { COMPONENT_TYPES } from '@low-code/renderer';

/** 组件面板 — 左侧 */
export function ComponentPanel({ registry }: { registry: any }) {
  const { state, dispatch, library } = useDesigner();
  const { searchKeyword } = state;
  const currentLibrary = library; // 使用应用级组件库，不可切换

  // 获取所有注册组件
  const allComponents = useMemo(() => {
    return registry.list() as ComponentRegistration[];
  }, [registry]);

  // 按分类分组
  const groupedComponents = useMemo(() => {
    const groups = new Map<string, ComponentRegistration[]>();

    for (const comp of allComponents) {
      // 按组件库过滤
      if (comp.library && comp.library !== currentLibrary && comp.library !== 'default') {
        continue;
      }
      // 搜索过滤
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        if (!comp.name.toLowerCase().includes(keyword) && !comp.type.toLowerCase().includes(keyword)) {
          continue;
        }
      }

      const category = comp.category || 'basic';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(comp);
    }

    return groups;
  }, [allComponents, searchKeyword, currentLibrary]);

  // 分类标签映射
  const categoryLabels: Record<string, string> = {
    basic: '基础组件',
    advanced: '高级组件',
    layout: '布局组件',
    custom: '自定义',
    business: '业务组件',
  };

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('component-type', type);
    dispatch({ type: 'SET_DRAGGING', payload: type });
  };

  const handleDragEnd = () => {
    dispatch({ type: 'SET_DRAGGING', payload: null });
  };

  return (
    <div
      style={{
        width: '280px',
        height: '100%',
        borderRight: '1px solid #e8e8e8',
        backgroundColor: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 搜索栏 */}
      <div style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>
        <input
          type="text"
          placeholder="搜索组件..."
          value={searchKeyword}
          onChange={(e) => dispatch({ type: 'SET_SEARCH', payload: e.target.value })}
          style={{
            width: '100%',
            padding: '6px 12px',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* 当前组件库标识（应用级配置，不可切换） */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #e8e8e8', fontSize: '12px', color: '#999' }}>
        组件库: <span style={{ color: '#1890ff', fontWeight: 600 }}>
          {currentLibrary === 'antd' ? 'Ant Design' : currentLibrary === 'element-plus' ? 'Element Plus' : currentLibrary}
        </span>
        <span style={{ marginLeft: '8px', fontSize: '11px' }}>（应用创建时指定）</span>
      </div>

      {/* 组件列表 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {Array.from(groupedComponents.entries()).map(([category, components]) => (
          <div key={category} style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#999',
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}
            >
              {categoryLabels[category] || category}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {components.map((comp) => (
                <div
                  key={comp.type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, comp.type)}
                  onDragEnd={handleDragEnd}
                  style={{
                    padding: '8px',
                    border: '1px solid #e8e8e8',
                    borderRadius: '6px',
                    backgroundColor: '#fff',
                    cursor: 'grab',
                    textAlign: 'center',
                    fontSize: '12px',
                    transition: 'border-color 0.2s',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#1890ff';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#e8e8e8';
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                    {comp.icon || '📦'}
                  </div>
                  <div>{comp.name}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
