import React, { useMemo, useState, useCallback } from 'react';
import { useDesigner } from '../core/DesignerContext';
import { isInContainer } from '../utils';
import type { WatermarkConfig, ComponentNode } from '@low-code/shared';

import { AutoFormRenderer, controlRegistry, registerAntdControls } from '@low-code/auto-rendering';
import { mockDictionaryService } from '@low-code/auto-rendering';
import { EventActionChainEditor } from './EventActionChainEditor';
import { VariableTreeSelector } from '../../components/VariableTreeSelector';
import { ExpressionEditor } from '../../components/ExpressionEditor';
import { StyleEditor } from './StyleEditor';
import { DataSourcePanel } from './DataSourcePanel';
import { ValidationRulesEditor } from './ValidationRulesEditor';
import { FORM_FIELD_SCHEMA_PROPERTIES } from '../../libraries/antd/form/form-field-schema';
import type { JSONSchema7 } from '@low-code/shared';

// 注册 antd 控件到自动渲染引擎
registerAntdControls(controlRegistry);

/** 属性面板 — 右侧（严格按文档实现） */
export function PropertyPanel({ registry }: { registry: any }) {
  const { state, dispatch, appId, tenantId } = useDesigner();
  const { selectedComponentId, schema } = state;
  const [activeTab, setActiveTab] = useState<ComponentSettingsTab>('props');
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

  // 检测组件是否在 Form 容器内
  const isInForm = useMemo(() => {
    if (!selectedNode) return false;
    return isInContainer(selectedNode, schema.components, 'form');
  }, [selectedNode, schema.components]);

  // 动态合并表单字段 Schema
  const mergedPropsSchema = useMemo(() => {
    if (!propsSchema) return propsSchema;
    if (!isInForm) return propsSchema;

    // 合并表单字段属性
    return {
      ...propsSchema,
      properties: {
        ...propsSchema.properties,
        ...FORM_FIELD_SCHEMA_PROPERTIES,
      },
    };
  }, [propsSchema, isInForm]);

  // 获取当前绑定字段的期望类型
  const expectedFieldType = useMemo(() => {
    if (!bindingTarget || !mergedPropsSchema?.properties) return undefined;
    const fieldSchema = mergedPropsSchema.properties[bindingTarget];
    if (!fieldSchema) return undefined;
    // 处理 anyOf 联合类型（取第一个类型）
    if (fieldSchema.anyOf && Array.isArray(fieldSchema.anyOf)) {
      const firstType = fieldSchema.anyOf[0];
      if (firstType?.type) return firstType.type;
    }
    return fieldSchema.type;
  }, [bindingTarget, mergedPropsSchema]);

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
    () => Object.values(mergedPropsSchema?.properties || {}).some((p: any) => p['x-group'] === '基础属性'),
    [mergedPropsSchema],
  );
  const hasAdvancedProps = useMemo(
    () => Object.values(mergedPropsSchema?.properties || {}).some((p: any) => p['x-group'] === '高级属性'),
    [mergedPropsSchema],
  );
  const hasFormConfig = useMemo(
    () => isInForm && Object.values(mergedPropsSchema?.properties || {}).some((p: any) => p['x-group'] === '表单配置'),
    [isInForm, mergedPropsSchema],
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

  // 事件 tab：仅当组件 schema 中有 x-group === '事件' 的属性时显示
  const hasEvents = useMemo(() => {
    if (!registration?.propsSchema?.properties) return false;
    return Object.values(registration.propsSchema.properties).some(
      (p: any) => p['x-group'] === '事件',
    );
  }, [registration]);
  const hasStyle = true;  // 样式编辑器始终可配置

  // 过滤出有内容的 tab
  const allTabs = [
    { key: 'props', label: '属性', visible: hasBasicProps },
    { key: 'advanced', label: '高级', visible: hasAdvancedProps },
    { key: 'form', label: '表单', visible: hasFormConfig },
    { key: 'events', label: '事件', visible: hasEvents },
    { key: 'style', label: '样式', visible: hasStyle },
  ] as const;
  const visibleTabs = allTabs.filter((t) => t.visible);

  // 切换组件时，如果当前 tab 对新组件不可见，自动切到第一个可见 tab
  // 必须排除 selectedComponentId=null 的情况，否则初始渲染会错误切换
  React.useEffect(() => {
    if (!selectedComponentId) return;
    if (!visibleTabs.some((t) => t.key === activeTab) && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [selectedComponentId, hasBasicProps, hasAdvancedProps, hasFormConfig, activeTab]);

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
            {mergedPropsSchema && (() => {
              const filteredEntries = Object.entries(mergedPropsSchema.properties || {}).filter(
                ([, prop]: [string, any]) => prop['x-group'] === '基础属性'
              );
              const strippedProperties = Object.fromEntries(
                filteredEntries.map(([key, prop]: [string, any]) => {
                  const { 'x-group': _, ...rest } = prop;
                  return [key, rest];
                })
              );
              const basicSchema = { ...mergedPropsSchema, properties: strippedProperties };
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

            {/* 变量/表达式选择弹窗 */}
            {bindingTarget && bindingMode === 'variable' && (
              <VariableTreeSelector
                visible={true}
                value={typeof selectedNode.props[bindingTarget] === 'object' ? selectedNode.props[bindingTarget]?.value : selectedNode.props[bindingTarget] || ''}
                onChange={(val) => handlePropsChange({ [bindingTarget]: val })}
                onClear={() => handlePropsChange({ [bindingTarget]: undefined })}
                onClose={() => setBindingTarget(null)}
                pageComponents={pageComponents}
                pageDataSources={pageDataSources}
                expectedType={expectedFieldType}
              />
            )}
            {bindingTarget && bindingMode === 'expression' && (
              <ExpressionEditor
                visible={true}
                value={selectedNode.props[bindingTarget] || ''}
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
            {mergedPropsSchema && (() => {
              const filteredEntries = Object.entries(mergedPropsSchema.properties || {}).filter(
                ([, prop]: [string, any]) => prop['x-group'] === '高级属性'
              );
              const strippedProperties = Object.fromEntries(
                filteredEntries.map(([key, prop]: [string, any]) => {
                  const { 'x-group': _, ...rest } = prop;
                  return [key, rest];
                })
              );
              const advancedSchema = { ...mergedPropsSchema, properties: strippedProperties };
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

            {/* 变量/表达式选择弹窗 */}
            {bindingTarget && bindingMode === 'variable' && (
              <VariableTreeSelector
                visible={true}
                value={typeof selectedNode.props[bindingTarget] === 'object' ? selectedNode.props[bindingTarget]?.value : selectedNode.props[bindingTarget] || ''}
                onChange={(val) => handlePropsChange({ [bindingTarget]: val })}
                onClear={() => handlePropsChange({ [bindingTarget]: undefined })}
                onClose={() => setBindingTarget(null)}
                pageComponents={pageComponents}
                pageDataSources={pageDataSources}
                expectedType={expectedFieldType}
              />
            )}
            {bindingTarget && bindingMode === 'expression' && (
              <ExpressionEditor
                visible={true}
                value={selectedNode.props[bindingTarget] || ''}
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

        {/* 表单配置 Tab */}
        {activeTab === 'form' && mergedPropsSchema && (() => {
          // 过滤表单配置字段，rules 单独用 ValidationRulesEditor 渲染
          const filteredEntries = Object.entries(mergedPropsSchema.properties || {}).filter(
            ([key, prop]: [string, any]) => prop['x-group'] === '表单配置' && key !== 'rules'
          );
          const strippedProperties = Object.fromEntries(
            filteredEntries.map(([key, prop]: [string, any]) => {
              const { 'x-group': _, ...rest } = prop;
              return [key, rest];
            })
          );
          const formSchema = { ...mergedPropsSchema, properties: strippedProperties };

          return (
            <>
              {/* 其他表单字段（name、label、required 等） */}
              <AutoFormRenderer
                schema={formSchema}
                value={selectedNode.props}
                onChange={handlePropsChange}
                layoutMode="sections"
                dictionaryService={mockDictionaryService}
                onVariablePickerOpen={(fieldName: string, initialTab: 'variable' | 'expression') => {
                  setBindingTarget(fieldName);
                  setBindingMode(initialTab);
                }}
              />

              {/* 校验规则（专用编辑器） */}
              <Section title="校验规则">
                <ValidationRulesEditor
                  value={selectedNode.props.rules || []}
                  onChange={(rules) => handlePropsChange({ rules })}
                />
              </Section>

              {/* 变量/表达式选择弹窗 */}
              {bindingTarget && bindingMode === 'variable' && (
                <VariableTreeSelector
                  visible={true}
                  value={typeof selectedNode.props[bindingTarget] === 'object' ? selectedNode.props[bindingTarget]?.value : selectedNode.props[bindingTarget] || ''}
                  onChange={(val) => handlePropsChange({ [bindingTarget]: val })}
                  onClear={() => handlePropsChange({ [bindingTarget]: undefined })}
                  onClose={() => setBindingTarget(null)}
                  pageComponents={pageComponents}
                  pageDataSources={pageDataSources}
                  expectedType={expectedFieldType}
                />
              )}
              {bindingTarget && bindingMode === 'expression' && (
                <ExpressionEditor
                  visible={true}
                  value={selectedNode.props[bindingTarget] || ''}
                  onChange={(val) => handlePropsChange({ [bindingTarget]: val })}
                  onClear={() => handlePropsChange({ [bindingTarget]: undefined })}
                  onClose={() => setBindingTarget(null)}
                  pageComponents={pageComponents}
                  pageDataSources={pageDataSources}
                  expectedType={expectedFieldType}
                />
              )}
            </>
          );
        })()}

        {/* 事件 Tab */}
        {activeTab === 'events' && (
          <Section title="事件配置">
            <EventActionChainEditor
              events={selectedNode.events || {}}
              onChange={handleEventsChange}
              availableEvents={(() => {
                if (!registration?.propsSchema?.properties) return [];
                return Object.entries(registration.propsSchema.properties)
                  .filter(([, prop]: [string, any]) => prop['x-group'] === '事件')
                  .map(([key, prop]: [string, any]) => ({
                    name: key,
                    title: prop.title || key,
                  }));
              })()}
              availableMethods={[]}
              formComponents={schema.components
                .filter((c) => c.type === 'form')
                .map((c) => ({ id: c.id, name: c.name || c.id }))}
              pageComponents={pageComponents}
              pageDataSources={pageDataSources}
              appId={appId}
              tenantId={tenantId}
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  border: '1px solid #d9d9d9',
  borderRadius: '4px',
  fontSize: '13px',
  boxSizing: 'border-box',
};

// ─── 页面设置统一 Schema ─────────────────────────────────

/** 页面设置 Schema — 基础/水印/数据源统一定义，x-group 分组 */
const PAGE_SETTINGS_SCHEMA: JSONSchema7 = {
  type: 'object',
  properties: {
    // ── 基础 ──
    name:                { type: 'string',  title: '页面名称',    'x-group': '基础', 'x-priority': 0,  'x-no-binding': '' },
    'layout.type':       { type: 'string',  title: '布局类型',    'x-group': '基础', 'x-priority': 1,  'x-no-binding': '', enum: ['flex', 'grid'], 'x-component': 'select' },
    'layout.gap':        { type: 'number',  title: '间距',        'x-group': '基础', 'x-priority': 2,  'x-no-binding': '', default: 16 },
    'layout.vertical':   { type: 'boolean', title: '垂直排列',    'x-group': '基础', 'x-priority': 3,  'x-no-binding': '' },
    'layout.wrap':       { type: 'boolean', title: '自动换行',    'x-group': '基础', 'x-priority': 4,  'x-no-binding': '' },
    'layout.justify':    { type: 'string',  title: '主轴对齐',    'x-group': '基础', 'x-priority': 5,  'x-no-binding': '', enum: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'], 'x-component': 'select' },
    'layout.align':      { type: 'string',  title: '交叉轴对齐',  'x-group': '基础', 'x-priority': 6,  'x-no-binding': '', enum: ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'], 'x-component': 'select' },
    'layout.columns':    { type: 'number',  title: '栅格列数',    'x-group': '基础', 'x-priority': 7,  'x-no-binding': '', default: 24 },
    // ── 水印 ──
    'watermark.enabled': { type: 'boolean', title: '启用水印',    'x-group': '水印', 'x-priority': 0 },
    'watermark.content': { type: 'string',  title: '水印文字',    'x-group': '水印', 'x-priority': 1 },
    'watermark.image':   { type: 'string',  title: '水印图片',    'x-group': '水印', 'x-priority': 2 },
    'watermark.rotate':  { type: 'number',  title: '旋转角度',    'x-group': '水印', 'x-priority': 3,  default: -20 },
    'watermark.zIndex':  { type: 'number',  title: '层级',        'x-group': '水印', 'x-priority': 4,  default: 9 },
  },
};

/** flex 布局独有字段 */
const FLEX_ONLY_KEYS = new Set(['layout.vertical', 'layout.wrap', 'layout.justify', 'layout.align']);
/** grid 布局独有字段 */
const GRID_ONLY_KEYS = new Set(['layout.columns']);

/** 按 x-group 过滤 Schema，同时按布局类型裁剪基础字段 */
function filterPageSchema(group: string, layoutType?: string): JSONSchema7 {
  const allProps = PAGE_SETTINGS_SCHEMA.properties!;
  const filtered: Record<string, JSONSchema7> = {};
  for (const [key, s] of Object.entries(allProps)) {
    if ((s as any)['x-group'] !== group) continue;
    if (group === '基础' && layoutType) {
      if (FLEX_ONLY_KEYS.has(key) && layoutType !== 'flex') continue;
      if (GRID_ONLY_KEYS.has(key) && layoutType !== 'grid') continue;
    }
    filtered[key] = s;
  }
  return { type: 'object', properties: filtered };
}

// ─── 页面设置面板 ───────────────────────────────────────

/** 组件属性面板 tab 类型 */
type ComponentSettingsTab = 'props' | 'advanced' | 'form' | 'events' | 'style';

/** 页面设置面板 tab 类型 */
type PageSettingsTab = 'basic' | 'watermark' | 'dataSource' | 'bindings';

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
  const [activeTab, setActiveTab] = useState<PageSettingsTab>('basic');

  // 绑定状态（VariablePicker）
  const [bindingTarget, setBindingTarget] = useState<string | null>(null);
  const [bindingMode, setBindingMode] = useState<'variable' | 'expression'>('variable');

  // ── 基础 tab 扁平值 ──

  const basicValue = useMemo(() => ({
    name: schema.name,
    'layout.type': schema.layout.type,
    'layout.gap': schema.layout.gap ?? 16,
    'layout.vertical': schema.layout.vertical ?? true,
    'layout.wrap': schema.layout.wrap ?? false,
    'layout.justify': schema.layout.justify || 'flex-start',
    'layout.align': schema.layout.align || 'stretch',
    'layout.columns': schema.layout.columns ?? 24,
  }), [schema]);

  const handleBasicChange = useCallback((newVals: Record<string, any>) => {
    const layoutChanges: Record<string, any> = {};
    for (const [k, v] of Object.entries(newVals)) {
      if (k === 'name') {
        dispatch({ type: 'UPDATE_PAGE_META', payload: { name: v as string } });
      } else if (k.startsWith('layout.')) {
        layoutChanges[k.replace('layout.', '')] = v;
      }
    }
    if (Object.keys(layoutChanges).length > 0) {
      dispatch({ type: 'UPDATE_LAYOUT', payload: { ...schema.layout, ...layoutChanges } });
    }
  }, [schema.layout, dispatch]);

  // ── 水印 tab 扁平值 ──

  const watermarkValue = useMemo(() => ({
    'watermark.enabled': schema.watermark?.enabled ?? false,
    'watermark.content': schema.watermark?.content ?? '',
    'watermark.image':   schema.watermark?.image ?? '',
    'watermark.rotate':  schema.watermark?.rotate ?? -20,
    'watermark.zIndex':  schema.watermark?.zIndex ?? 9,
  }), [schema.watermark]);

  const handleWatermarkChange = useCallback((newVals: Record<string, any>) => {
    const prev = schema.watermark ?? {};
    // 将 dot-path 键值对转为 watermark 对象
    const wm: Record<string, any> = { ...prev };
    for (const [k, v] of Object.entries(newVals)) {
      const field = k.replace('watermark.', '');
      if (field === 'enabled') {
        wm.enabled = v;
      } else if (v === '' || v === undefined) {
        delete wm[field];
      } else {
        wm[field] = v;
      }
    }
    dispatch({ type: 'UPDATE_PAGE_WATERMARK', payload: wm as WatermarkConfig });
  }, [schema.watermark, dispatch]);

  // Tab 定义
  const tabs: { key: PageSettingsTab; label: string }[] = [
    { key: 'basic', label: '基础' },
    { key: 'watermark', label: '水印' },
    { key: 'dataSource', label: '数据源' },
    { key: 'bindings', label: '绑定概览' },
  ];

  return (
    <div style={{
      width: '320px', height: '100%', minHeight: 0, borderLeft: '1px solid #e8e8e8',
      backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* 头部 */}
      <div style={{
        height: 40, padding: '0 16px', borderBottom: '1px solid #e8e8e8',
        display: 'flex', alignItems: 'center', backgroundColor: '#fff', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: '14px' }}>📄 页面设置</span>
        <span style={{ fontSize: '12px', color: '#999', marginLeft: 8 }}>ID: {schema.pageId}</span>
      </div>

      {/* Tab 切换 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8', backgroundColor: '#fff' }}>
        {tabs.map((tab) => (
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

      {/* 内容区 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>

        {/* ── 基础 Tab ── */}
        {activeTab === 'basic' && (
          <AutoFormRenderer
            schema={filterPageSchema('基础', schema.layout.type)}
            value={basicValue}
            onChange={handleBasicChange}
            layoutMode="sections"
          />
        )}

        {/* ── 水印 Tab ── */}
        {activeTab === 'watermark' && (
          <AutoFormRenderer
            schema={filterPageSchema('水印')}
            value={watermarkValue}
            onChange={handleWatermarkChange}
            layoutMode="sections"
            onVariablePickerOpen={(fieldName: string, initialTab: 'variable' | 'expression') => {
              // 转换 dot-path 为 watermark 内部字段名
              setBindingTarget(fieldName.replace('watermark.', ''));
              setBindingMode(initialTab);
            }}
          />
        )}

        {/* ── 数据源 Tab ── */}
        {activeTab === 'dataSource' && (
          <DataSourcePanel
            expression={schema.dataSource}
            onChange={(dataSource) => dispatch({ type: 'SET_SCHEMA', payload: { ...schema, dataSource } })}
            pageComponents={pageComponents}
            pageDataSources={pageDataSources}
          />
        )}

        {/* ── 绑定概览 Tab ── */}
        {activeTab === 'bindings' && (
          <BindingsOverview components={schema.components} />
        )}

        {/* 变量/表达式选择弹窗（仅水印使用） */}
        {bindingTarget && bindingMode === 'variable' && (
          <VariableTreeSelector
            visible={true}
            value={typeof (schema.watermark as any)?.[bindingTarget] === 'object' ? (schema.watermark as any)?.[bindingTarget]?.value : (schema.watermark as any)?.[bindingTarget] || ''}
            onChange={(val) => {
              handleWatermarkChange({ [`watermark.${bindingTarget}`]: val });
              setBindingTarget(null);
            }}
            onClear={() => {
              const next: Record<string, any> = { ...schema.watermark };
              delete next[bindingTarget];
              dispatch({ type: 'UPDATE_PAGE_WATERMARK', payload: next as WatermarkConfig });
              setBindingTarget(null);
            }}
            onClose={() => setBindingTarget(null)}
            pageComponents={pageComponents}
            pageDataSources={pageDataSources}
          />
        )}
        {bindingTarget && bindingMode === 'expression' && (
          <ExpressionEditor
            visible={true}
            value={(schema.watermark as any)?.[bindingTarget] || ''}
            onChange={(val) => {
              handleWatermarkChange({ [`watermark.${bindingTarget}`]: val });
              setBindingTarget(null);
            }}
            onClear={() => {
              const next: Record<string, any> = { ...schema.watermark };
              delete next[bindingTarget];
              dispatch({ type: 'UPDATE_PAGE_WATERMARK', payload: next as WatermarkConfig });
              setBindingTarget(null);
            }}
            onClose={() => setBindingTarget(null)}
            pageComponents={pageComponents}
            pageDataSources={pageDataSources}
          />
        )}
      </div>
    </div>
  );
}

// ─── 绑定概览组件 ───────────────────────────────────────

/** 绑定项 */
interface BindingItem {
  componentId: string;
  componentName: string;
  componentType: string;
  propName: string;
  bindingType: 'variable' | 'expression';
  value: string;
}

/** 提取组件中的绑定属性 */
function extractBindings(components: ComponentNode[]): BindingItem[] {
  const bindings: BindingItem[] = [];

  for (const comp of components) {
    const props = comp.props || {};
    for (const [key, value] of Object.entries(props)) {
      if (value && typeof value === 'object' && 'type' in value) {
        const binding = value as { type: string; value: string };
        if (binding.type === 'variable' || binding.type === 'expression') {
          bindings.push({
            componentId: comp.id,
            componentName: comp.name || comp.id,
            componentType: comp.type,
            propName: key,
            bindingType: binding.type,
            value: binding.value,
          });
        }
      }
    }
  }

  return bindings;
}

/** 绑定概览组件 — 展示页面中使用变量/表达式的组件属性 */
function BindingsOverview({ components }: { components: ComponentNode[] }) {
  const bindings = useMemo(() => extractBindings(components), [components]);

  if (bindings.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#999', padding: '24px', fontSize: '12px' }}>
        暂无绑定
      </div>
    );
  }

  // 按组件分组
  const grouped = bindings.reduce<Record<string, BindingItem[]>>((acc, item) => {
    const key = item.componentId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div style={{ fontSize: '12px' }}>
      {Object.entries(grouped).map(([componentId, items]) => {
        const first = items[0];
        return (
          <div key={componentId} style={{ marginBottom: '12px', border: '1px solid #e8e8e8', borderRadius: '4px', padding: '8px' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px', color: '#333' }}>
              {first.componentName}
              <span style={{ color: '#999', marginLeft: '4px', fontWeight: 400 }}>({first.componentType})</span>
            </div>
            {items.map((item) => (
              <div key={item.propName} style={{ display: 'flex', alignItems: 'center', padding: '4px 0', borderTop: '1px solid #f0f0f0' }}>
                <span style={{ color: '#666', minWidth: '80px' }}>{item.propName}</span>
                <span style={{
                  display: 'inline-block', padding: '0 4px', borderRadius: '2px', fontSize: '11px',
                  backgroundColor: item.bindingType === 'variable' ? '#e6f7ff' : '#fff7e6',
                  color: item.bindingType === 'variable' ? '#1890ff' : '#fa8c16',
                  marginRight: '4px',
                }}>
                  {item.bindingType === 'variable' ? '变量' : '表达式'}
                </span>
                <span style={{ color: '#999', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

