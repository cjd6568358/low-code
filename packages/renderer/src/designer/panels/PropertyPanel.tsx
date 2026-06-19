import React, { useMemo, useState, useCallback } from 'react';
import { useDesigner } from '../core/DesignerContext';
import type { ComponentNode, JSONSchema7, ComponentPermissionConfig, ActionChain } from '@low-code/shared';
import { AutoFormRenderer, controlRegistry, registerAntdControls } from '@low-code/auto-rendering';
import { mockDictionaryService } from '@low-code/auto-rendering';
import { EventActionChainEditor, type ComponentMethod } from './EventActionChainEditor';
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

  const selectedNode = useMemo(() => {
    if (!selectedComponentId) return null;
    return schema.components.find((c) => c.id === selectedComponentId) || null;
  }, [selectedComponentId, schema.components]);

  const registration = useMemo(() => {
    if (!selectedNode) return null;
    return registry.resolve(selectedNode.type);
  }, [selectedNode, registry]);

  // 属性变更处理
  const handlePropsChange = (newProps: Record<string, any>) => {
    if (!selectedNode) return;
    dispatch({
      type: 'UPDATE_COMPONENT',
      payload: {
        id: selectedNode.id,
        changes: { props: { ...selectedNode.props, ...newProps } },
      },
    });
  };

  // 删除组件
  const handleDelete = () => {
    if (!selectedComponentId) return;
    dispatch({ type: 'REMOVE_COMPONENT', payload: { id: selectedComponentId } });
  };

  // 可见性变更
  const handleVisibleChange = (visible: boolean | string) => {
    if (!selectedNode) return;
    dispatch({
      type: 'UPDATE_COMPONENT',
      payload: { id: selectedNode.id, changes: { visible } },
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

  // 权限配置变更
  const handlePermissionChange = useCallback(
    (permission: ComponentPermissionConfig | undefined) => {
      if (!selectedNode) return;
      dispatch({
        type: 'UPDATE_COMPONENT',
        payload: { id: selectedNode.id, changes: { permission } },
      });
    },
    [selectedNode, dispatch],
  );

  // 未选中组件时，显示页面设置面板
  if (!selectedNode) {
    return <PageSettingsPanel />;
  }

  const propsSchema = registration?.propsSchema;

  return (
    <div style={{
      width: '320px', height: '100%', minHeight: 0, borderLeft: '1px solid #e8e8e8',
      backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* 头部 — 固定高度，与中间/左侧顶部对齐 */}
      <div style={{
        height: 40, padding: '0 16px', borderBottom: '1px solid #e8e8e8',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>
            {registration?.name || selectedNode.type}
          </span>
          <span style={{ fontSize: '12px', color: '#999' }}>ID: {selectedNode.id}</span>
        </div>
        <button onClick={handleDelete}
          style={{ padding: '2px 10px', border: '1px solid #ff4d4f', borderRadius: '4px', backgroundColor: '#fff', color: '#ff4d4f', cursor: 'pointer', fontSize: '12px' }}>
          删除
        </button>
      </div>

      {/* Tab 切换 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8', backgroundColor: '#fff' }}>
        {([
          { key: 'props', label: '属性' },
          { key: 'advanced', label: '高级' },
          { key: 'events', label: '事件' },
          { key: 'style', label: '样式' },
          { key: 'rules', label: '规则' },
        ] as const).map((tab) => (
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
            {/* 基础信息 */}
            <Section title="基础信息">
              <Field label="标签名称">
                <input
                  type="text"
                  value={selectedNode.label || ''}
                  onChange={(e) => dispatch({
                    type: 'UPDATE_COMPONENT',
                    payload: { id: selectedNode.id, changes: { label: e.target.value } },
                  })}
                  placeholder="业务标签（如：客户姓名）"
                  style={inputStyle}
                />
              </Field>
              <Field label="组件 ID">
                <input type="text" value={selectedNode.id} readOnly
                  style={{ ...inputStyle, backgroundColor: '#f5f5f5' }} />
              </Field>
              <Field label="组件类型">
                <input type="text" value={registration?.name || selectedNode.type} readOnly
                  style={{ ...inputStyle, backgroundColor: '#f5f5f5' }} />
              </Field>
            </Section>

            {/* 基础属性（过滤 x-group !== '高级属性' 的字段，去掉 x-group 避免重复分组） */}
            {propsSchema && (() => {
              const filteredEntries = Object.entries(propsSchema.properties || {}).filter(
                ([, prop]: [string, any]) => prop['x-group'] !== '高级属性'
              );
              // 去掉 x-group，避免 AutoFormRenderer 内部再次分组
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
                  value={selectedNode.props}
                  onChange={handlePropsChange}
                  layoutMode="sections"
                  dictionaryService={mockDictionaryService}
                  onVariablePickerOpen={(fieldName: string) => setBindingTarget(fieldName)}
                />
              ) : null;
            })()}

            {/* VariablePicker 弹窗 */}
            {bindingTarget && (
              <VariablePicker
                visible={!!bindingTarget}
                value={selectedNode.props[bindingTarget] || ''}
                onChange={(val) => handlePropsChange({ [bindingTarget]: val })}
                onClose={() => setBindingTarget(null)}
              />
            )}
          </>
        )}

        {/* 高级属性 Tab */}
        {activeTab === 'advanced' && (
          <>
            {/* 高级属性（过滤 x-group === '高级属性'，去掉 x-group 避免重复分组） */}
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
                  onVariablePickerOpen={(fieldName: string) => setBindingTarget(fieldName)}
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
                onChange={(val) => handlePropsChange({ [bindingTarget]: val })}
                onClose={() => setBindingTarget(null)}
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

        {/* 规则 Tab */}
        {activeTab === 'rules' && (
          <>
            {/* 组件级显隐规则 */}
            <Section title="组件可见性">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '8px' }}>
                <input type="checkbox" checked={selectedNode.visible !== false}
                  onChange={(e) => handleVisibleChange(e.target.checked)} />
                可见
              </label>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                可切换为条件表达式模式，按条件控制组件显隐
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <input type="checkbox" checked={typeof selectedNode.visible === 'string'}
                  onChange={(e) => handleVisibleChange(e.target.checked ? '$context.currentUser' : true)} />
                使用条件表达式
              </label>
              {typeof selectedNode.visible === 'string' && (
                <div style={{ marginTop: '8px' }}>
                  <Field label="条件表达式">
                    <input type="text" value={selectedNode.visible}
                      onChange={(e) => handleVisibleChange(e.target.value)}
                      placeholder="如: $context.currentUser.roles.includes('admin')"
                      style={inputStyle} />
                  </Field>
                </div>
              )}
            </Section>

            {/* 页面级条件规则 */}
            <Section title="页面条件规则">
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                配置页面级条件规则，支持显隐、禁用、设置值等动作
              </div>
              <ConditionBuilder
                rules={schema.rules || []}
                onChange={(rules) => dispatch({ type: 'SET_SCHEMA', payload: { ...schema, rules } })}
                componentIds={schema.components.map((c) => c.id)}
              />
            </Section>

            {/* 权限配置 */}
            <PermissionConfigSection
              permission={selectedNode.permission}
              availableRoles={[]}
              availableDepartments={[]}
              onChange={handlePermissionChange}
            />
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
function PageSettingsPanel() {
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
            dataSources={schema.dataSource || []}
            onChange={(dataSource) => dispatch({ type: 'SET_SCHEMA', payload: { ...schema, dataSource } })}
          />
        </Section>
      </div>
    </div>
  );
}

// ─── 权限配置区块 ───────────────────────────────────────

interface PermissionConfigSectionProps {
  permission?: ComponentPermissionConfig;
  availableRoles: Array<{ roleId: string; name: string }>;
  availableDepartments: Array<{ departmentId: string; name: string }>;
  onChange: (permission: ComponentPermissionConfig | undefined) => void;
}

function PermissionConfigSection({
  permission,
  availableRoles,
  availableDepartments,
  onChange,
}: PermissionConfigSectionProps) {
  const [roleInput, setRoleInput] = useState('');
  const [userInput, setUserInput] = useState('');
  const [deptInput, setDeptInput] = useState('');

  const enabled = !!permission;

  const toggleEnabled = () => {
    if (enabled) {
      onChange(undefined);
    } else {
      onChange({ allowedRoles: [], allowedDepartments: [], allowedUsers: [] });
    }
  };

  const updateField = (field: keyof ComponentPermissionConfig, value: string[]) => {
    onChange({ ...permission!, [field]: value });
  };

  const addItem = (
    field: keyof ComponentPermissionConfig,
    value: string,
    setter: (v: string) => void,
  ) => {
    const trimmed = value.trim();
    if (!trimmed || !permission) return;
    const current = (permission[field] as string[]) || [];
    if (!current.includes(trimmed)) {
      updateField(field, [...current, trimmed]);
    }
    setter('');
  };

  const removeItem = (field: keyof ComponentPermissionConfig, item: string) => {
    if (!permission) return;
    const current = (permission[field] as string[]) || [];
    updateField(field, current.filter((i) => i !== item));
  };

  return (
    <Section title="权限配置">
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          marginBottom: 12,
        }}
      >
        <input type="checkbox" checked={enabled} onChange={toggleEnabled} />
        启用权限控制
      </label>

      {enabled && permission && (
        <>
          {/* 角色白名单 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
              允许的角色
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {(permission.allowedRoles || []).map((role) => {
                const meta = availableRoles.find((r) => r.roleId === role);
                return (
                  <span
                    key={role}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      backgroundColor: '#e6f7ff',
                      borderRadius: 4,
                      fontSize: 12,
                      border: '1px solid #91d5ff',
                    }}
                  >
                    {meta ? `${meta.name}(${role})` : role}
                    <span
                      onClick={() => removeItem('allowedRoles', role)}
                      style={{ cursor: 'pointer', color: '#999', fontSize: 10 }}
                    >
                      ✕
                    </span>
                  </span>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {availableRoles.length > 0 ? (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addItem('allowedRoles', e.target.value, () => {});
                    }
                  }}
                  style={{ ...inputStyle, flex: 1, fontSize: 12 }}
                >
                  <option value="">从可用角色列表选择...</option>
                  {availableRoles
                    .filter((r) => !(permission.allowedRoles || []).includes(r.roleId))
                    .map((r) => (
                      <option key={r.roleId} value={r.roleId}>
                        {r.name} ({r.roleId})
                      </option>
                    ))}
                </select>
              ) : null}
              <input
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem('allowedRoles', roleInput, setRoleInput)}
                placeholder="手动输入角色ID"
                style={{ ...inputStyle, flex: 1, fontSize: 12 }}
              />
              <button
                onClick={() => addItem('allowedRoles', roleInput, setRoleInput)}
                style={addBtnStyle}
              >
                +
              </button>
            </div>
          </div>

          {/* 部门白名单 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
              允许的部门
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {(permission.allowedDepartments || []).map((dept) => {
                const meta = availableDepartments.find((d) => d.departmentId === dept);
                return (
                  <span
                    key={dept}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      backgroundColor: '#f6ffed',
                      borderRadius: 4,
                      fontSize: 12,
                      border: '1px solid #b7eb8f',
                    }}
                  >
                    {meta ? `${meta.name}(${dept})` : dept}
                    <span
                      onClick={() => removeItem('allowedDepartments', dept)}
                      style={{ cursor: 'pointer', color: '#999', fontSize: 10 }}
                    >
                      ✕
                    </span>
                  </span>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {availableDepartments.length > 0 ? (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addItem('allowedDepartments', e.target.value, () => {});
                    }
                  }}
                  style={{ ...inputStyle, flex: 1, fontSize: 12 }}
                >
                  <option value="">从可用部门列表选择...</option>
                  {availableDepartments
                    .filter((d) => !(permission.allowedDepartments || []).includes(d.departmentId))
                    .map((d) => (
                      <option key={d.departmentId} value={d.departmentId}>
                        {d.name} ({d.departmentId})
                      </option>
                    ))}
                </select>
              ) : null}
              <input
                value={deptInput}
                onChange={(e) => setDeptInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && addItem('allowedDepartments', deptInput, setDeptInput)
                }
                placeholder="手动输入部门ID"
                style={{ ...inputStyle, flex: 1, fontSize: 12 }}
              />
              <button
                onClick={() => addItem('allowedDepartments', deptInput, setDeptInput)}
                style={addBtnStyle}
              >
                +
              </button>
            </div>
          </div>

          {/* 人员白名单 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
              允许的人员
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {(permission.allowedUsers || []).map((user) => (
                <span
                  key={user}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    backgroundColor: '#fff7e6',
                    borderRadius: 4,
                    fontSize: 12,
                    border: '1px solid #ffd591',
                  }}
                >
                  {user}
                  <span
                    onClick={() => removeItem('allowedUsers', user)}
                    style={{ cursor: 'pointer', color: '#999', fontSize: 10 }}
                  >
                    ✕
                  </span>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && addItem('allowedUsers', userInput, setUserInput)
                }
                placeholder="输入用户ID后回车"
                style={{ ...inputStyle, flex: 1, fontSize: 12 }}
              />
              <button
                onClick={() => addItem('allowedUsers', userInput, setUserInput)}
                style={addBtnStyle}
              >
                +
              </button>
            </div>
          </div>

          <div style={{ fontSize: 11, color: '#999', padding: '6px 8px', backgroundColor: '#fafafa', borderRadius: 4 }}>
            💡 权限配置与条件表达式为 AND 关系：两者都通过才可见。留空表示不限制。
          </div>
        </>
      )}
    </Section>
  );
}

const addBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  backgroundColor: '#fff',
  cursor: 'pointer',
  fontSize: 12,
};
