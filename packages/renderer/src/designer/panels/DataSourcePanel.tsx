import React, { useState } from 'react';
import type { DataSourceConfig, ApiConfig, StaticConfig, ComputedConfig } from '@low-code/shared';

/** 数据源配置面板属性 */
export interface DataSourcePanelProps {
  dataSources: DataSourceConfig[];
  onChange: (dataSources: DataSourceConfig[]) => void;
}

/** 页面级数据源配置面板 */
export function DataSourcePanel({ dataSources, onChange }: DataSourcePanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = () => {
    const newDs: DataSourceConfig = {
      id: `ds_${Date.now()}`,
      name: `数据源${dataSources.length + 1}`,
      type: 'api',
      config: { url: '', method: 'GET' },
      autoLoad: true,
    };
    onChange([...dataSources, newDs]);
    setEditingId(newDs.id);
  };

  const handleUpdate = (id: string, changes: Partial<DataSourceConfig>) => {
    onChange(dataSources.map((ds) => ds.id === id ? { ...ds, ...changes } : ds));
  };

  const handleDelete = (id: string) => {
    onChange(dataSources.filter((ds) => ds.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const editingDs = dataSources.find((ds) => ds.id === editingId);

  return (
    <div style={{ fontSize: 13 }}>
      {/* 数据源列表 */}
      {dataSources.length === 0 && (
        <div style={{ color: '#999', textAlign: 'center', padding: '16px', fontSize: 12 }}>
          暂无数据源配置
        </div>
      )}

      {dataSources.map((ds) => (
        <div key={ds.id} style={{
          padding: 8, border: '1px solid #e8e8e8', borderRadius: 4,
          marginBottom: 8, backgroundColor: editingId === ds.id ? '#f0f7ff' : '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setEditingId(editingId === ds.id ? null : ds.id)}>
            <div>
              <span style={{ fontWeight: 600, fontSize: 12 }}>{ds.name}</span>
              <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>{ds.type}</span>
              {ds.autoLoad && <span style={{ fontSize: 10, color: '#52c41a', marginLeft: 4 }}>自动加载</span>}
            </div>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(ds.id); }}
              style={{ padding: '2px 6px', border: '1px solid #ff4d4f', borderRadius: 3, color: '#ff4d4f', cursor: 'pointer', backgroundColor: '#fff', fontSize: 11 }}>删除</button>
          </div>

          {/* 编辑区 */}
          {editingId === ds.id && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <MiniField label="名称">
                <input value={ds.name} onChange={(e) => handleUpdate(ds.id, { name: e.target.value })} style={inputStyle} />
              </MiniField>
              <MiniField label="类型">
                <select value={ds.type} onChange={(e) => handleUpdate(ds.id, { type: e.target.value as DataSourceConfig['type'] })} style={inputStyle}>
                  <option value="api">API</option>
                  <option value="static">静态数据</option>
                  <option value="computed">计算属性</option>
                </select>
              </MiniField>

              {/* API 配置 */}
              {ds.type === 'api' && (
                <ApiConfigEditor
                  config={ds.config as ApiConfig}
                  onChange={(config) => handleUpdate(ds.id, { config })}
                />
              )}

              {/* 静态数据配置 */}
              {ds.type === 'static' && (
                <StaticConfigEditor
                  config={ds.config as StaticConfig}
                  onChange={(config) => handleUpdate(ds.id, { config })}
                />
              )}

              {/* 计算属性配置 */}
              {ds.type === 'computed' && (
                <ComputedConfigEditor
                  config={ds.config as ComputedConfig}
                  onChange={(config) => handleUpdate(ds.id, { config })}
                />
              )}

              <MiniField label="自动加载">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <input type="checkbox" checked={ds.autoLoad ?? true}
                    onChange={(e) => handleUpdate(ds.id, { autoLoad: e.target.checked })} />
                  页面加载时自动请求
                </label>
              </MiniField>
            </div>
          )}
        </div>
      ))}

      <button onClick={handleAdd}
        style={{ padding: '6px 12px', border: '1px dashed #1890ff', borderRadius: 4, cursor: 'pointer', backgroundColor: '#e6f7ff', color: '#1890ff', width: '100%', fontSize: 12 }}>
        + 添加数据源
      </button>
    </div>
  );
}

/** API 配置编辑器 */
function ApiConfigEditor({ config, onChange }: { config: ApiConfig; onChange: (c: ApiConfig) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px', backgroundColor: '#fafafa', borderRadius: 4 }}>
      <MiniField label="URL">
        <input value={config.url} onChange={(e) => onChange({ ...config, url: e.target.value })} style={inputStyle} placeholder="/api/xxx" />
      </MiniField>
      <MiniField label="方法">
        <select value={config.method || 'GET'} onChange={(e) => onChange({ ...config, method: e.target.value })} style={inputStyle}>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </MiniField>
      <MiniField label="请求参数">
        <textarea value={JSON.stringify(config.params || {}, null, 2)}
          onChange={(e) => { try { onChange({ ...config, params: JSON.parse(e.target.value) }); } catch { /* ignore */ } }}
          rows={2} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11 }} placeholder='{"key": "value"}' />
      </MiniField>
    </div>
  );
}

/** 静态数据配置编辑器 */
function StaticConfigEditor({ config, onChange }: { config: StaticConfig; onChange: (c: StaticConfig) => void }) {
  return (
    <div style={{ padding: '8px', backgroundColor: '#fafafa', borderRadius: 4 }}>
      <MiniField label="数据 (JSON)">
        <textarea value={JSON.stringify(config.data ?? {}, null, 2)}
          onChange={(e) => { try { onChange({ ...config, data: JSON.parse(e.target.value) }); } catch { /* ignore */ } }}
          rows={4} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11 }} />
      </MiniField>
    </div>
  );
}

/** 计算属性配置编辑器 */
function ComputedConfigEditor({ config, onChange }: { config: ComputedConfig; onChange: (c: ComputedConfig) => void }) {
  return (
    <div style={{ padding: '8px', backgroundColor: '#fafafa', borderRadius: 4 }}>
      <MiniField label="表达式">
        <textarea value={config.expression || ''}
          onChange={(e) => onChange({ ...config, expression: e.target.value })}
          rows={3} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11 }} placeholder="如: $api.users.data.filter(u => u.active)" />
      </MiniField>
      <MiniField label="依赖">
        <input value={(config.dependencies || []).join(', ')}
          onChange={(e) => onChange({ ...config, dependencies: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          style={inputStyle} placeholder="依赖的数据源 ID，逗号分隔" />
      </MiniField>
    </div>
  );
}

function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <label style={{ fontSize: 11, color: '#666', minWidth: 60, textAlign: 'right', flexShrink: 0 }}>{label}</label>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '3px 6px',
  border: '1px solid #d9d9d9',
  borderRadius: 3,
  fontSize: 12,
  boxSizing: 'border-box',
};
