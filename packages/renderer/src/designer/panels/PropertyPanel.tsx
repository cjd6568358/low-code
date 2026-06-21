import React, { useMemo, useState, useCallback } from 'react';
import { useDesigner } from '../core/DesignerContext';

import { AutoFormRenderer, controlRegistry, registerAntdControls } from '@low-code/auto-rendering';
import { mockDictionaryService } from '@low-code/auto-rendering';
import { EventActionChainEditor } from './EventActionChainEditor';
import { ConditionBuilder } from './ConditionBuilder';
import { VariablePicker } from './VariablePicker';
import { StyleEditor } from './StyleEditor';
import { DataSourcePanel } from './DataSourcePanel';

// 注册 antd 控件到自动渲染引擎
registerAntdControls(controlRegistry);

/** 属性面板 — 右侧（严格按文档实现） */
export function PropertyPanel({ registry }: { registry: any }) {
  const { state, dispatch } = useDesigner();
  const { selectedComponentId, schema } = state;
  const [activeTab, setActiveTab] = useState<'props' | 'advanced' | 'events' | 'style' | 'rules'>('props');
  const [bindingTarget, setBindingTarget] = useState<string | null>(null);
  const [bindingMode, setBindingMode] = useState<'variable' | 'expression'>('variable');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const selectedNode = useMemo(() => {
    if (!selectedComponentId) return null;
    return schema.components.find((c) => c.id === selectedComponentId) || null;
  }, [selectedComponentId, schema.components]);

  const registration = useMemo(() => {
    if (!selectedNode) return null;
    return registry.resolve(selectedNode.type);
  }, [selectedNode, registry]);

  const propsSchema = registration?.propsSchema;

  // 获取当前绑定字段的期望类型
  const expectedFieldType = useMemo(() => {
    if (!bindingTarget || !propsSchema?.properties) return undefined;
    const fieldSchema = propsSchema.properties[bindingTarget];
    if (!fieldSchema) return undefined;
    // 处理 anyOf 联合类型（取第一个类型）
    if (fieldSchema.anyOf && Array.isArray(fieldSchema.anyOf)) {
      const firstType = fieldSchema.anyOf[0];
      if (firstType?.type) return firstType.type;
    }
    return fieldSchema.type;
  }, [bindingTarget, propsSchema]);

  // 提取页面组件列表（用于 $component 代码提示）
  const pageComponents = useMemo(() => {
    const components: Record<string, { type: string; label?: string; propsSchema?: Record<string, any> }> = {};
    for (const comp of schema.components) {
      const reg = registry.resolve(comp.type);
      components[comp.id] = {
        type: comp.type,
        label: comp.props?.title || comp.props?.label || comp.name || comp.id,
        propsSchema: reg?.propsSchema,
      };
    }
    return components;
  }, [schema.components, registry]);

  // 页面数据源（用于 $data 代码提示）
  const pageDataSources = useMemo((): Record<string, { type: string; description?: string }> => {
    if (!schema.dataSource) return {};
    return { $data: { type: 'expression', description: '页面数据源' } };
  }, [schema.dataSource]);

  // 提取已存在的组件名称列表（用于唯一性校验）
  const existingNames = useMemo(() => {
    return schema.components
      .map((c) => c.name)
      .filter((name): name is string => !!name);
  }, [schema.components]);

  // 校验错误处理
  const handleValidationError = useCallback((field: string, error: string) => {
    setValidationErrors((prev) => {
      if (error) {
        return { ...prev, [field]: error };
      }
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // 计算各 tab 是否有内容（必须在 early return 之前，否则违反 Hooks 规则）
  const hasBasicProps = useMemo(
    () => Object.values(propsSchema?.properties || {}).some((p: any) => p['x-group'] === '基础属性'),
    [propsSchema],
  );
  const hasAdvancedProps = useMemo(
    () => Object.values(propsSchema?.properties || {}).some((p: any) => p['x-group'] === '高级属性'),
    [propsSchema],
  );

  // 属性变更处理
  const handlePropsChange = (newProps: Record<string, any>) => {
    if (!selectedNode) return;

    // 如果包含 name 字段，需要更新节点顶层属性
    const changes: Record<string, any> = {
      props: { ...selectedNode.props, ...newProps },
    };

    if ('name' in newProps) {
      changes.name = newProps.name;
      // 同时从 props 中移除 name（避免重复存储）
      delete changes.props.name;
    }

    dispatch({
      type: 'UPDATE_COMPONENT',
      payload: {
        id: selectedNode.id,
        changes,
      },
    });
  };

  // 事件变更
  const handleEventsChange = (events: Record<string, any>) => {
    if (!selectedNode) return;
    dispatch({
      type: 'UPDATE_COMPONENT',
      payload: { id: selectedNode.id, changes: { events } },
    });
  };

  const hasEvents = true; // 事件编辑器始终可配置
  const hasStyle = true;  // 样式编辑器始终可配置
  const hasRules = true;  // 规则编辑器始终可配置

  // 过滤出有内容的 tab
  const allTabs = [
    { key: 'props', label: '属性', visible: hasBasicProps },
    { key: 'advanced', label: '高级', visible: hasAdvancedProps },
    { key: 'events', label: '事件', visible: hasEvents },
    { key: 'style', label: '样式', visible: hasStyle },
    { key: 'rules', label: '规则', visible: hasRules },
  ] as const;
  const visibleTabs = allTabs.filter((t) => t.visible);

  // 切换组件时，如果当前 tab 对新组件不可见，自动切到第一个可见 tab
  // 必须排除 selectedComponentId=null 的情况，否则初始渲染会错误切换
  React.useEffect(() => {
    if (!selectedComponentId) return;
    if (!visibleTabs.some((t) => t.key === activeTab) && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [selectedComponentId, hasBasicProps, hasAdvancedProps, activeTab]);

  // 未选中组件时，显示页面设置面板（必须在所有 hooks 之后）
  if (!selectedNode) {
    return <PageSettingsPanel pageComponents={pageComponents} pageDataSources={pageDataSources} />;
  }

  return (
    <div style={{
      width: '320px', height: '100%', minHeight: 0, borderLeft: '1px solid #e8e8e8',
      backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* 头部 — 基础信息整合 */}
      <div style={{
        padding: '0 16px 12px', borderBottom: '1px solid #e8e8e8',
        backgroundColor: '#fff', flexShrink: 0,
      }}>
        {/* 第二行：组件 ID + 组件类型并排 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#666' }}>组件类型</label>
            <input type="text" value={registration?.name || selectedNode.type} readOnly
              style={{ ...inputStyle, backgroundColor: '#f5f5f5' }} />
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#666' }}>组件 ID</label>
            <input type="text" value={selectedNode.id} readOnly
              style={{ ...inputStyle, backgroundColor: '#f5f5f5' }} />
          </div>
        </div>
      </div>

      {/* Tab 切换 — 仅显示有内容的 tab */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8', backgroundColor: '#fff' }}>
        {visibleTabs.map((tab) => (
          <div
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, textAlign: 'center', padding: '8px 0', cursor: 'pointer', fontSize: '12px',
              borderBottom: activeTab === tab.key ? '2px solid #1890ff' : '2px solid transparent',
              color: activeTab === tab.key ? '#1890ff' : '#666',
              fontWeight: activeTab === tab.key ? 600 : 400,
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* 属性配置区 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>

        {/* 属性 Tab */}
        {activeTab === 'props' && (
          <>
            {/* 基础属性（仅显示 x-group === '基础属性' 的字段） */}
            {propsSchema && (() => {
              const filteredEntries = Object.entries(propsSchema.properties || {}).filter(
                ([, prop]: [string, any]) => prop['x-group'] === '基础属性'
              );
              const strippedProperties = Object.fromEntries(
                filteredEntries.map(([key, prop]: [string, any]) => {
                  const { 'x-group': _, ...rest } = prop;
                  return [key, rest];
                })
              );
              const basicSchema = { ...propsSchema, properties: strippedProperties };
              return filteredEntries.length > 0 ? (
                <AutoFormRenderer
                  schema={basicSchema}
                  value={{ ...selectedNode.props, name: selectedNode.name }}
                  onChange={handlePropsChange}
                  layoutMode="sections"
                  dictionaryService={mockDictionaryService}
                  onVariablePickerOpen={(fieldName: string, initialTab: 'variable' | 'expression') => {
                    setBindingTarget(fieldName);
                    setBindingMode(initialTab);
                  }}
                  existingNames={existingNames}
                  currentName={selectedNode.name}
                  onValidationError={handleValidationError}
                />
              ) : null;
            })()}

            {/* VariablePicker 弹窗 */}
            {bindingTarget && (
              <VariablePicker
                visible={!!bindingTarget}
                value={selectedNode.props[bindingTarget] || ''}
                mode={bindingMode}
                onChange={(val) => handlePropsChange({ [bindingTarget]: val })}
                onClear={() => handlePropsChange({ [bindingTarget]: undefined })}
                onClose={() => setBindingTarget(null)}
                pageComponents={pageComponents}
                pageDataSources={pageDataSources}
                expectedType={expectedFieldType}
              />
            )}
          </>
        )}

        {/* 高级属性 Tab */}
        {activeTab === 'advanced' && (
          <>
            {/* 高级属性（过滤 x-group === '高级属性'） */}
            {propsSchema && (() => {
              const filteredEntries = Object.entries(propsSchema.properties || {}).filter(
                ([, prop]: [string, any]) => prop['x-group'] === '高级属性'
              );
              const strippedProperties = Object.fromEntries(
                filteredEntries.map(([key, prop]: [string, any]) => {
                  const { 'x-group': _, ...rest } = prop;
                  return [key, rest];
                })
              );
              const advancedSchema = { ...propsSchema, properties: strippedProperties };
              return filteredEntries.length > 0 ? (
                <AutoFormRenderer
                  schema={advancedSchema}
                  value={selectedNode.props}
                  onChange={handlePropsChange}
                  layoutMode="sections"
                  dictionaryService={mockDictionaryService}
                  onVariablePickerOpen={(fieldName: string, initialTab: 'variable' | 'expression') => {
                    setBindingTarget(fieldName);
                    setBindingMode(initialTab);
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#999', padding: '24px', fontSize: '12px' }}>
                  暂无高级属性
                </div>
              );
            })()}

            {/* VariablePicker 弹窗 */}
            {bindingTarget && (
              <VariablePicker
                visible={!!bindingTarget}
                value={selectedNode.props[bindingTarget] || ''}
                mode={bindingMode}
                onChange={(val) => handlePropsChange({ [bindingTarget]: val })}
                onClear={() => handlePropsChange({ [bindingTarget]: undefined })}
                onClose={() => setBindingTarget(null)}
                pageComponents={pageComponents}
                pageDataSources={pageDataSources}
                expectedType={expectedFieldType}
              />
            )}
          </>
        )}

        {/* 事件 Tab */}
        {activeTab === 'events' && (
          <Section title="事件配置">
            <EventActionChainEditor
              events={selectedNode.events || {}}
              onChange={handleEventsChange}
              availableEvents={registration?.propsSchema?.properties ? Object.keys(registration.propsSchema.properties).filter((k) => k.startsWith('on')).map((k) => ({ name: k, title: k })) : []}
              availableMethods={[]}
              availableFields={[]}
            />
          </Section>
        )}

        {/* 样式 Tab */}
        {activeTab === 'style' && (
          <>
            <Section title="CSS 类名">
              <input type="text" value={selectedNode.props.className || ''}
                onChange={(e) => handlePropsChange({ className: e.target.value })}
                placeholder="自定义 CSS 类名"
                style={inputStyle} />
            </Section>
            <Section title="内联样式">
              <StyleEditor
                value={selectedNode.props.style || {}}
                onChange={(style) => handlePropsChange({ style })}
              />
            </Section>
          </>
        )}

        {/* 规则 Tab — 仅联动规则 */}
        {activeTab === 'rules' && (
          <Section title="联动规则">
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
              配置条件规则，支持显隐、禁用、设置值等动作
            </div>
            <ConditionBuilder
              rules={schema.rules || []}
              onChange={(rules) => dispatch({ type: 'SET_SCHEMA', payload: { ...schema, rules } })}
              componentIds={schema.components.map((c) => c.id)}
            />
          </Section>
        )}
      </div>
    </div>
  );
}

/** 区块 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#666' }}>{title}</div>
      {children}
    </div>
  );
}

/** 字段 */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#666' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  border: '1px solid #d9d9d9',
  borderRadius: '4px',
  fontSize: '13px',
  boxSizing: 'border-box',
};

// ─── 页面设置面板 ───────────────────────────────────────

/** 页面设置面板 — 未选中组件时显示，编辑页面级属性 */
function PageSettingsPanel({
  pageComponents,
  pageDataSources,
}: {
  pageComponents: Record<string, { type: string; label?: string; propsSchema?: Record<string, any> }>;
  pageDataSources: Record<string, { type: string; description?: string }>;
}) {
  const { state, dispatch } = useDesigner();
  const { schema } = state;

  const handleNameChange = (name: string) => {
    dispatch({ type: 'UPDATE_PAGE_META', payload: { name } });
  };

  const handleGapChange = (gap: string | number) => {
    dispatch({ type: 'UPDATE_LAYOUT', payload: { ...schema.layout, gap } });
  };

  const handleVerticalChange = (vertical: boolean) => {
    dispatch({ type: 'UPDATE_LAYOUT', payload: { ...schema.layout, vertical } });
  };

  const handleWrapChange = (wrap: boolean) => {
    dispatch({ type: 'UPDATE_LAYOUT', payload: { ...schema.layout, wrap } });
  };

  const handleJustifyChange = (justify: string) => {
    dispatch({ type: 'UPDATE_LAYOUT', payload: { ...schema.layout, justify } });
  };

  const handleAlignChange = (align: string) => {
    dispatch({ type: 'UPDATE_LAYOUT', payload: { ...schema.layout, align } });
  };

  const handleColumnsChange = (columns: number) => {
    dispatch({ type: 'UPDATE_LAYOUT', payload: { ...schema.layout, columns } });
  };

  return (
    <div style={{
      width: '320px', height: '100%', minHeight: 0, borderLeft: '1px solid #e8e8e8',
      backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* 头部 — 固定高度，与中间/左侧顶部对齐 */}
      <div style={{
        height: 40, padding: '0 16px', borderBottom: '1px solid #e8e8e8',
        display: 'flex', alignItems: 'center', backgroundColor: '#fff', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: '14px' }}>📄 页面设置</span>
        <span style={{ fontSize: '12px', color: '#999', marginLeft: 8 }}>ID: {schema.pageId}</span>
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {/* 基本信息 */}
        <Section title="基本信息">
          <Field label="名称">
            <input
              type="text"
              value={schema.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="页面名称"
              style={inputStyle}
            />
          </Field>
        </Section>

        {/* 布局配置 */}
        <Section title="布局配置">
          <Field label="布局类型">
            <input
              type="text"
              value={schema.layout.type === 'flex' ? '弹性布局 (Flex)' : '栅格布局 (Grid)'}
              readOnly
              style={{ ...inputStyle, backgroundColor: '#f5f5f5', color: '#999' }}
            />
          </Field>
          <Field label="间距 (gap)">
            <input
              type="number"
              value={schema.layout.gap ?? 16}
              onChange={(e) => handleGapChange(Number(e.target.value))}
              min={0}
              max={64}
              style={inputStyle}
            />
          </Field>
          {schema.layout.type === 'flex' && (
            <>
              <Field label="垂直排列">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={schema.layout.vertical ?? true}
                    onChange={(e) => handleVerticalChange(e.target.checked)}
                  />
                  垂直排列子元素
                </label>
              </Field>
              <Field label="自动换行">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={schema.layout.wrap ?? false}
                    onChange={(e) => handleWrapChange(e.target.checked)}
                  />
                  允许子元素换行
                </label>
              </Field>
              <Field label="主轴对齐 (justify)">
                <select
                  value={schema.layout.justify || 'flex-start'}
                  onChange={(e) => handleJustifyChange(e.target.value)}
                  style={inputStyle}
                >
                  <option value="flex-start">起始 (flex-start)</option>
                  <option value="center">居中 (center)</option>
                  <option value="flex-end">末尾 (flex-end)</option>
                  <option value="space-between">两端对齐 (space-between)</option>
                  <option value="space-around">环绕 (space-around)</option>
                  <option value="space-evenly">均分 (space-evenly)</option>
                </select>
              </Field>
              <Field label="交叉轴对齐 (align)">
                <select
                  value={schema.layout.align || 'stretch'}
                  onChange={(e) => handleAlignChange(e.target.value)}
                  style={inputStyle}
                >
                  <option value="flex-start">起始 (flex-start)</option>
                  <option value="center">居中 (center)</option>
                  <option value="flex-end">末尾 (flex-end)</option>
                  <option value="stretch">拉伸 (stretch)</option>
                  <option value="baseline">基线 (baseline)</option>
                </select>
              </Field>
            </>
          )}
          {schema.layout.type === 'grid' && (
            <Field label="列数">
              <input
                type="number"
                value={schema.layout.columns ?? 24}
                onChange={(e) => handleColumnsChange(Number(e.target.value))}
                min={1}
                max={48}
                style={inputStyle}
              />
            </Field>
          )}
        </Section>

        {/* 数据源配置 */}
        <Section title="数据源">
          <DataSourcePanel
            expression={schema.dataSource}
            onChange={(dataSource) => dispatch({ type: 'SET_SCHEMA', payload: { ...schema, dataSource } })}
            pageComponents={pageComponents}
            pageDataSources={pageDataSources}
          />
        </Section>
      </div>
    </div>
  );
}

