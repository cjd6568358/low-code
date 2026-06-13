import React, { useState } from 'react';

/** 插槽暴露的变量 */
interface SlotVariable {
  name: string;
  expression: string;
}

/** 插槽暴露的方法 */
interface SlotMethod {
  name: string;
  title: string;
  description?: string;
  target: string;
}

/** 插槽暴露的事件 */
interface SlotEvent {
  name: string;
  title: string;
  source: string;
}

/** 插槽配置 */
export interface SlotConfig {
  name: string;
  title: string;
  description?: string;
  accept?: string[];
  maxItems?: number;
  /** 暴露变量 */
  exposeVariables?: SlotVariable[];
  /** 暴露方法 */
  exposeMethods?: SlotMethod[];
  /** 暴露事件 */
  exposeEvents?: SlotEvent[];
}

/** 插槽编辑器属性 */
export interface SlotEditorProps {
  value: SlotConfig;
  onChange: (config: SlotConfig) => void;
  componentTypes: string[];
  /** 当前模板中的组件列表（用于选择方法/事件映射目标） */
  templateComponents?: Array<{ id: string; type: string }>;
}

/**
 * 插槽编辑器
 * 用于配置卡片模板中的插槽组件属性，包括：
 * - 基础配置（名称/标题/约束）
 * - 暴露变量（让消费方在插槽内容中可引用的变量）
 * - 暴露方法（让消费方可调用的内部方法）
 * - 暴露事件（让消费方可监听的内部事件）
 */
export function SlotEditor(props: SlotEditorProps) {
  const { value, onChange, componentTypes, templateComponents = [] } = props;
  const [showAcceptPicker, setShowAcceptPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'expose'>('basic');

  const updateField = (key: keyof SlotConfig, val: any) => {
    onChange({ ...value, [key]: val });
  };

  return (
    <div style={{ fontSize: '13px' }}>
      {/* Tab 切换 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8', marginBottom: '12px' }}>
        <div
          onClick={() => setActiveTab('basic')}
          style={{
            padding: '6px 12px',
            cursor: 'pointer',
            borderBottom: activeTab === 'basic' ? '2px solid #1890ff' : '2px solid transparent',
            color: activeTab === 'basic' ? '#1890ff' : '#666',
            fontWeight: activeTab === 'basic' ? 600 : 400,
            fontSize: '12px',
          }}
        >
          基础配置
        </div>
        <div
          onClick={() => setActiveTab('expose')}
          style={{
            padding: '6px 12px',
            cursor: 'pointer',
            borderBottom: activeTab === 'expose' ? '2px solid #1890ff' : '2px solid transparent',
            color: activeTab === 'expose' ? '#1890ff' : '#666',
            fontWeight: activeTab === 'expose' ? 600 : 400,
            fontSize: '12px',
          }}
        >
          暴露接口
        </div>
      </div>

      {/* 基础配置 Tab */}
      {activeTab === 'basic' && (
        <>
          {/* 插槽名称 */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '12px', color: '#666' }}>
              插槽名称 <span style={{ color: '#ff4d4f' }}>*</span>
            </label>
            <input type="text" value={value.name} onChange={(e) => updateField('name', e.target.value)}
              placeholder="如 header, footer, actions"
              style={{ width: '100%', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }} />
            <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
              唯一标识，用于消费方传入 slots 内容
            </div>
          </div>

          {/* 插槽标题 */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '12px', color: '#666' }}>
              显示标题 <span style={{ color: '#ff4d4f' }}>*</span>
            </label>
            <input type="text" value={value.title} onChange={(e) => updateField('title', e.target.value)}
              placeholder="如 扩展区域, 底部操作栏"
              style={{ width: '100%', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>

          {/* 插槽描述 */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '12px', color: '#666' }}>描述</label>
            <input type="text" value={value.description || ''} onChange={(e) => updateField('description', e.target.value || undefined)}
              placeholder="插槽用途说明"
              style={{ width: '100%', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>

          {/* 接受的组件类型 */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '12px', color: '#666' }}>接受的组件类型</label>
            <div onClick={() => setShowAcceptPicker(!showAcceptPicker)}
              style={{ padding: '6px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', minHeight: '28px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', cursor: 'pointer' }}>
              {(!value.accept || value.accept.length === 0) ? (
                <span style={{ color: '#bbb', fontSize: '12px' }}>不限（点击选择）</span>
              ) : value.accept.map((type) => (
                <span key={type} style={{ padding: '2px 6px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '3px', fontSize: '11px', color: '#1890ff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {type}
                  <span onClick={(e) => { e.stopPropagation(); updateField('accept', (value.accept || []).filter((t) => t !== type)); }}
                    style={{ cursor: 'pointer', fontWeight: 600 }}>×</span>
                </span>
              ))}
            </div>
            {showAcceptPicker && (
              <div style={{ marginTop: '4px', border: '1px solid #e8e8e8', borderRadius: '4px', padding: '8px', maxHeight: '150px', overflow: 'auto', backgroundColor: '#fff' }}>
                {componentTypes.map((type) => (
                  <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0', fontSize: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={(value.accept || []).includes(type)}
                      onChange={(e) => updateField('accept', e.target.checked ? [...(value.accept || []), type] : (value.accept || []).filter((t) => t !== type))} />
                    {type}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 最大子项数 */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '12px', color: '#666' }}>最大子项数</label>
            <input type="number" value={value.maxItems ?? ''} onChange={(e) => updateField('maxItems', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="不限" min={1}
              style={{ width: '100%', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
        </>
      )}

      {/* 暴露接口 Tab */}
      {activeTab === 'expose' && (
        <>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '12px', padding: '8px', backgroundColor: '#f0f7ff', borderRadius: '4px', lineHeight: '1.6' }}>
            配置通过此插槽暴露给消费方的变量、方法和事件。消费方在插槽内容中可通过 <code style={{ backgroundColor: '#e6f7ff', padding: '1px 4px', borderRadius: '2px' }}>$slot.xxx</code> 引用暴露的变量。
          </div>

          {/* 暴露变量 */}
          <ExposeSection
            title="暴露变量"
            items={value.exposeVariables || []}
            onAdd={() => updateField('exposeVariables', [...(value.exposeVariables || []), { name: '', expression: '' }])}
            onRemove={(i) => updateField('exposeVariables', (value.exposeVariables || []).filter((_, j) => j !== i))}
            onChange={(i, item) => {
              const next = [...(value.exposeVariables || [])];
              next[i] = item;
              updateField('exposeVariables', next);
            }}
            renderItem={(item, onChange) => (
              <>
                <input value={item.name} onChange={(e) => onChange({ ...item, name: e.target.value })}
                  placeholder="变量名" style={{ flex: 1, padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px' }} />
                <input value={item.expression} onChange={(e) => onChange({ ...item, expression: e.target.value })}
                  placeholder="表达式，如 $context.currentRecord"
                  style={{ flex: 2, padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px' }} />
              </>
            )}
            emptyText="暂无暴露变量"
          />

          {/* 暴露方法 */}
          <ExposeSection
            title="暴露方法"
            items={value.exposeMethods || []}
            onAdd={() => updateField('exposeMethods', [...(value.exposeMethods || []), { name: '', title: '', target: '' }])}
            onRemove={(i) => updateField('exposeMethods', (value.exposeMethods || []).filter((_, j) => j !== i))}
            onChange={(i, item) => {
              const next = [...(value.exposeMethods || [])];
              next[i] = item;
              updateField('exposeMethods', next);
            }}
            renderItem={(item, onChange) => (
              <>
                <input value={item.name} onChange={(e) => onChange({ ...item, name: e.target.value })}
                  placeholder="方法名" style={{ flex: 1, padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px' }} />
                <input value={item.title} onChange={(e) => onChange({ ...item, title: e.target.value })}
                  placeholder="标题" style={{ flex: 1, padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px' }} />
                <select value={item.target} onChange={(e) => onChange({ ...item, target: e.target.value })}
                  style={{ flex: 1, padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px' }}>
                  <option value="">映射目标</option>
                  {templateComponents.map((c) => (
                    <option key={c.id} value={c.id}>{c.id} ({c.type})</option>
                  ))}
                </select>
              </>
            )}
            emptyText="暂无暴露方法"
          />

          {/* 暴露事件 */}
          <ExposeSection
            title="暴露事件"
            items={value.exposeEvents || []}
            onAdd={() => updateField('exposeEvents', [...(value.exposeEvents || []), { name: '', title: '', source: '' }])}
            onRemove={(i) => updateField('exposeEvents', (value.exposeEvents || []).filter((_, j) => j !== i))}
            onChange={(i, item) => {
              const next = [...(value.exposeEvents || [])];
              next[i] = item;
              updateField('exposeEvents', next);
            }}
            renderItem={(item, onChange) => (
              <>
                <input value={item.name} onChange={(e) => onChange({ ...item, name: e.target.value })}
                  placeholder="事件名" style={{ flex: 1, padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px' }} />
                <input value={item.title} onChange={(e) => onChange({ ...item, title: e.target.value })}
                  placeholder="标题" style={{ flex: 1, padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px' }} />
                <input value={item.source} onChange={(e) => onChange({ ...item, source: e.target.value })}
                  placeholder="触发源，如 btn_01.onClick"
                  style={{ flex: 1, padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px' }} />
              </>
            )}
            emptyText="暂无暴露事件"
          />
        </>
      )}
    </div>
  );
}

/** 通用暴露配置区块 */
function ExposeSection<T extends { name: string }>(props: {
  title: string;
  items: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, item: T) => void;
  renderItem: (item: T, onChange: (item: T) => void) => React.ReactNode;
  emptyText: string;
}) {
  const { title, items, onAdd, onRemove, onChange, renderItem, emptyText } = props;

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontWeight: 500, fontSize: '12px', color: '#666' }}>{title} ({items.length})</span>
        <button onClick={onAdd}
          style={{ padding: '2px 8px', border: '1px solid #1890ff', borderRadius: '3px', backgroundColor: '#e6f7ff', color: '#1890ff', cursor: 'pointer', fontSize: '11px' }}>
          + 添加
        </button>
      </div>
      {items.length === 0 ? (
        <div style={{ color: '#bbb', fontSize: '11px', textAlign: 'center', padding: '8px' }}>{emptyText}</div>
      ) : items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
          {renderItem(item, (updated) => onChange(i, updated))}
          <span onClick={() => onRemove(i)}
            style={{ cursor: 'pointer', color: '#ff4d4f', fontSize: '14px', padding: '0 4px', fontWeight: 600 }}>×</span>
        </div>
      ))}
    </div>
  );
}
