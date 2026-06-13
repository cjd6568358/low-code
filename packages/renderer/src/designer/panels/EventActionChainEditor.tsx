import React, { useState } from 'react';
import type { ActionChain, ActionStep } from '@low-code/shared';
import { ACTION_TYPES } from '@low-code/renderer';

/** 组件方法描述 */
export interface ComponentMethod {
  /** 组件实例 ID */
  componentId: string;
  /** 组件类型 */
  componentType: string;
  /** 方法名（卡片级方法直接用方法名，插槽方法用 slotName.methodName） */
  methodName: string;
  /** 显示标签 */
  label: string;
  /** 是否为插槽方法 */
  isSlot?: boolean;
  /** 插槽名（仅插槽方法） */
  slotName?: string;
  /** 方法描述 */
  description?: string;
}

/** 事件动作链编排器属性 */
export interface EventActionChainEditorProps {
  events: Record<string, ActionChain[]>;
  onChange: (events: Record<string, ActionChain[]>) => void;
  availableEvents?: Array<{ name: string; title: string }>;
  /** 页面中可被调用方法的组件列表（含插槽暴露方法） */
  availableMethods?: ComponentMethod[];
  /** 页面中可设置值的字段列表 */
  availableFields?: string[];
}

/**
 * 事件动作链编排器
 *
 * 文档描述：
 * "卡片暴露的事件通过动作链编排器配置，与原生组件事件配置方式一致"
 * - 动作类型下拉选择
 * - invokeMethod：目标组件 + 调用方法 UI 下拉选择
 * - 条件分支
 */
export function EventActionChainEditor(props: EventActionChainEditorProps) {
  const { events, onChange, availableEvents = [], availableMethods = [], availableFields = [] } = props;
  const [editingEvent, setEditingEvent] = useState<string | null>(null);

  const handleAddEvent = () => {
    const eventName = `onEvent${Object.keys(events).length + 1}`;
    onChange({ ...events, [eventName]: [[]] });
    setEditingEvent(eventName);
  };

  const handleDeleteEvent = (eventName: string) => {
    const next = { ...events };
    delete next[eventName];
    onChange(next);
    if (editingEvent === eventName) setEditingEvent(null);
  };

  const handleAddAction = (eventName: string, chainIndex: number) => {
    const chains = events[eventName] || [[]];
    const newChains = chains.map((chain, i) =>
      i === chainIndex
        ? [...chain, { action: 'message', params: { type: 'info', content: '' } }]
        : chain,
    );
    onChange({ ...events, [eventName]: newChains });
  };

  const handleUpdateAction = (eventName: string, chainIndex: number, stepIndex: number, step: ActionStep) => {
    const chains = events[eventName] || [[]];
    const newChains = chains.map((chain, ci) =>
      ci === chainIndex
        ? chain.map((s, si) => (si === stepIndex ? step : s))
        : chain,
    );
    onChange({ ...events, [eventName]: newChains });
  };

  const handleDeleteAction = (eventName: string, chainIndex: number, stepIndex: number) => {
    const chains = events[eventName] || [[]];
    const newChains = chains.map((chain, ci) =>
      ci === chainIndex ? chain.filter((_, si) => si !== stepIndex) : chain,
    );
    onChange({ ...events, [eventName]: newChains });
  };

  const handleAddCondition = (eventName: string, chainIndex: number, stepIndex: number) => {
    const chains = events[eventName] || [[]];
    const newChains = chains.map((chain, ci) => {
      if (ci !== chainIndex) return chain;
      return chain.map((step, si) => {
        if (si !== stepIndex) return step;
        return {
          ...step,
          action: 'condition',
          params: {
            ...step.params,
            condition: step.params?.condition || '',
            then: step.params?.then || [{ action: 'message', params: { type: 'info', content: '' } }],
            else: step.params?.else || [],
          },
        };
      });
    });
    onChange({ ...events, [eventName]: newChains });
  };

  return (
    <div style={{ fontSize: '13px' }}>
      {/* 事件列表 */}
      {Object.entries(events).map(([eventName, chains]) => (
        <div key={eventName} style={{ marginBottom: '12px', border: '1px solid #e8e8e8', borderRadius: '6px' }}>
          <div
            style={{ padding: '8px 12px', backgroundColor: '#fafafa', borderRadius: '6px 6px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setEditingEvent(editingEvent === eventName ? null : eventName)}
          >
            <span style={{ fontWeight: 600 }}>{eventName}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <span style={{ color: '#999', fontSize: '12px' }}>{chains.reduce((sum, chain) => sum + chain.length, 0)} 个动作</span>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(eventName); }}
                style={{ padding: '2px 6px', border: '1px solid #ff4d4f', borderRadius: '3px', color: '#ff4d4f', cursor: 'pointer', backgroundColor: '#fff', fontSize: '11px' }}>删除</button>
            </div>
          </div>

          {editingEvent === eventName && (
            <div style={{ padding: '12px' }}>
              {chains.map((chain, chainIndex) => (
                <div key={chainIndex} style={{ marginBottom: '12px' }}>
                  {chains.length > 1 && (
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>动作链 #{chainIndex + 1}</div>
                  )}
                  {chain.map((step, stepIndex) => (
                    <ActionStepEditor
                      key={stepIndex}
                      step={step}
                      index={stepIndex}
                      onUpdate={(updated) => handleUpdateAction(eventName, chainIndex, stepIndex, updated)}
                      onDelete={() => handleDeleteAction(eventName, chainIndex, stepIndex)}
                      onAddCondition={() => handleAddCondition(eventName, chainIndex, stepIndex)}
                      availableMethods={availableMethods}
                      availableFields={availableFields}
                    />
                  ))}
                  <button onClick={() => handleAddAction(eventName, chainIndex)}
                    style={{ padding: '4px 12px', border: '1px dashed #d9d9d9', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fff', width: '100%', fontSize: '12px' }}>
                    + 添加动作
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <button onClick={handleAddEvent}
        style={{ padding: '6px 12px', border: '1px dashed #1890ff', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#e6f7ff', color: '#1890ff', width: '100%' }}>
        + 添加事件
      </button>
    </div>
  );
}

/** 单个动作步骤编辑器 */
function ActionStepEditor({
  step, index, onUpdate, onDelete, onAddCondition, availableMethods, availableFields,
}: {
  step: ActionStep;
  index: number;
  onUpdate: (step: ActionStep) => void;
  onDelete: () => void;
  onAddCondition: () => void;
  availableMethods: ComponentMethod[];
  availableFields: string[];
}) {
  return (
    <div style={{ padding: '8px', border: '1px solid #e8e8e8', borderRadius: '4px', marginBottom: '8px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: '#999', minWidth: '20px' }}>#{index + 1}</span>
        <select value={step.action}
          onChange={(e) => {
            const newAction = e.target.value;
            // 切换动作类型时重置参数
            const resetParams = newAction === 'invokeMethod' ? { target: '', method: '', params: {} } : {};
            onUpdate({ ...step, action: newAction, params: resetParams });
          }}
          style={{ flex: 1, padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px' }}>
          {ACTION_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button onClick={onAddCondition}
          style={{ padding: '2px 6px', border: '1px solid #faad14', borderRadius: '3px', color: '#faad14', cursor: 'pointer', backgroundColor: '#fff', fontSize: '11px' }}>条件</button>
        <button onClick={onDelete}
          style={{ padding: '2px 6px', border: '1px solid #ff4d4f', borderRadius: '3px', color: '#ff4d4f', cursor: 'pointer', backgroundColor: '#fff', fontSize: '11px' }}>删除</button>
      </div>

      {/* 条件表达式 */}
      {step.condition && (
        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '2px' }}>执行条件</label>
          <input value={step.condition} onChange={(e) => onUpdate({ ...step, condition: e.target.value })}
            placeholder="条件表达式"
            style={{ width: '100%', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
        </div>
      )}

      {/* 参数编辑 */}
      {step.action === 'condition' ? (
        <div style={{ fontSize: '12px', color: '#999' }}>
          条件分支：{step.params?.then?.length || 0} 个 then 动作, {step.params?.else?.length || 0} 个 else 动作
        </div>
      ) : (
        <ParamsEditor
          action={step.action}
          params={step.params || {}}
          onChange={(params) => onUpdate({ ...step, params })}
          availableMethods={availableMethods}
          availableFields={availableFields}
        />
      )}
    </div>
  );
}

/** 参数编辑器 */
function ParamsEditor({
  action, params, onChange, availableMethods, availableFields,
}: {
  action: string;
  params: Record<string, any>;
  onChange: (params: Record<string, any>) => void;
  availableMethods: ComponentMethod[];
  availableFields: string[];
}) {
  switch (action) {
    case 'navigate':
    case 'openPage':
      return (
        <div>
          <ParamField label="URL">
            <input value={params.url ?? ''} onChange={(e) => onChange({ ...params, url: e.target.value })}
              style={inputStyle} placeholder="/detail/${id}" />
          </ParamField>
          {action === 'navigate' && (
            <ParamField label="目标">
              <select value={params.target ?? '_self'} onChange={(e) => onChange({ ...params, target: e.target.value })} style={inputStyle}>
                <option value="_self">当前窗口</option>
                <option value="_blank">新窗口</option>
              </select>
            </ParamField>
          )}
        </div>
      );

    case 'setValue':
      return (
        <div>
          <ParamField label="目标字段">
            <select value={params.target ?? ''} onChange={(e) => onChange({ ...params, target: e.target.value })} style={inputStyle}>
              <option value="">请选择字段</option>
              {availableFields.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </ParamField>
          <ParamField label="值">
            <input value={params.value ?? ''} onChange={(e) => onChange({ ...params, value: e.target.value })}
              style={inputStyle} placeholder="静态值或 $slot.xxx 表达式" />
          </ParamField>
        </div>
      );

    case 'setValues':
      return (
        <ParamField label="批量值 (JSON)">
          <textarea value={JSON.stringify(params.values ?? {}, null, 2)}
            onChange={(e) => { try { onChange({ ...params, values: JSON.parse(e.target.value) }); } catch { onChange({ ...params, values: e.target.value }); } }}
            rows={3} style={{ ...inputStyle, fontFamily: 'monospace' }} />
        </ParamField>
      );

    case 'apiCall':
      return (
        <div>
          <ParamField label="API URL">
            <input value={params.url ?? ''} onChange={(e) => onChange({ ...params, url: e.target.value })}
              style={inputStyle} placeholder="/api/submit" />
          </ParamField>
          <ParamField label="方法">
            <select value={params.method ?? 'GET'} onChange={(e) => onChange({ ...params, method: e.target.value })} style={inputStyle}>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </ParamField>
          <ParamField label="请求数据">
            <textarea value={typeof params.data === 'string' ? params.data : JSON.stringify(params.data, null, 2) ?? ''}
              onChange={(e) => { try { onChange({ ...params, data: JSON.parse(e.target.value) }); } catch { onChange({ ...params, data: e.target.value }); } }}
              rows={2} style={{ ...inputStyle, fontFamily: 'monospace' }} />
          </ParamField>
        </div>
      );

    case 'invokeMethod': {
      // 按组件分组的方法列表
      const groupedMethods = new Map<string, ComponentMethod[]>();
      for (const m of availableMethods) {
        if (!groupedMethods.has(m.componentId)) groupedMethods.set(m.componentId, []);
        groupedMethods.get(m.componentId)!.push(m);
      }

      // 找到当前 target 对应的可用方法
      const currentTarget = params.target ?? '';
      const targetMethods = groupedMethods.get(currentTarget) || [];

      return (
        <div>
          <ParamField label="目标组件">
            <select value={currentTarget}
              onChange={(e) => onChange({ ...params, target: e.target.value, method: '' })}
              style={inputStyle}>
              <option value="">请选择组件</option>
              {Array.from(groupedMethods.entries()).map(([compId, methods]) => (
                <option key={compId} value={compId}>
                  {compId} ({methods[0]?.componentType}) — {methods.length} 个方法
                </option>
              ))}
            </select>
          </ParamField>

          {currentTarget && (
            <ParamField label="调用方法">
              <select value={params.method ?? ''}
                onChange={(e) => onChange({ ...params, method: e.target.value })}
                style={inputStyle}>
                <option value="">请选择方法</option>
                {/* 卡片级方法 */}
                {targetMethods.filter((m) => !m.isSlot).length > 0 && (
                  <optgroup label="卡片方法">
                    {targetMethods.filter((m) => !m.isSlot).map((m) => (
                      <option key={m.methodName} value={m.methodName}>
                        {m.label} {m.description ? `— ${m.description}` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
                {/* 插槽暴露方法 */}
                {targetMethods.filter((m) => m.isSlot).length > 0 && (
                  <optgroup label="插槽方法">
                    {targetMethods.filter((m) => m.isSlot).map((m) => (
                      <option key={m.methodName} value={m.methodName}>
                        📌 {m.label} {m.description ? `— ${m.description}` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </ParamField>
          )}

          <ParamField label="参数 (JSON)">
            <textarea value={JSON.stringify(params.params ?? {}, null, 2)}
              onChange={(e) => { try { onChange({ ...params, params: JSON.parse(e.target.value) }); } catch { /* ignore */ } }}
              rows={2} style={{ ...inputStyle, fontFamily: 'monospace' }} />
          </ParamField>

          <ParamField label="返回值处理">
            <div style={{ fontSize: '12px', color: '#666', padding: '4px 0' }}>
              返回值自动写入 <code style={{ backgroundColor: '#f0f0f0', padding: '1px 4px', borderRadius: '2px' }}>$result</code>，
              后续动作可通过 <code style={{ backgroundColor: '#f0f0f0', padding: '1px 4px', borderRadius: '2px' }}>$result.xxx</code> 引用
            </div>
          </ParamField>
        </div>
      );
    }

    case 'message':
      return (
        <div>
          <ParamField label="类型">
            <select value={params.type ?? 'info'} onChange={(e) => onChange({ ...params, type: e.target.value })} style={inputStyle}>
              <option value="info">信息</option>
              <option value="success">成功</option>
              <option value="warning">警告</option>
              <option value="error">错误</option>
            </select>
          </ParamField>
          <ParamField label="内容">
            <input value={params.content ?? ''} onChange={(e) => onChange({ ...params, content: e.target.value })}
              style={inputStyle} placeholder="提示内容" />
          </ParamField>
        </div>
      );

    case 'showModal':
      return (
        <div>
          <ParamField label="弹窗 ID">
            <input value={params.modalId ?? ''} onChange={(e) => onChange({ ...params, modalId: e.target.value })}
              style={inputStyle} />
          </ParamField>
        </div>
      );

    case 'copyToClipboard':
      return (
        <ParamField label="文本">
          <input value={params.text ?? ''} onChange={(e) => onChange({ ...params, text: e.target.value })}
            style={inputStyle} />
        </ParamField>
      );

    default:
      return (
        <ParamField label="参数 (JSON)">
          <textarea value={JSON.stringify(params, null, 2)}
            onChange={(e) => { try { onChange(JSON.parse(e.target.value)); } catch { /* ignore */ } }}
            rows={3} style={{ ...inputStyle, fontFamily: 'monospace' }} />
        </ParamField>
      );
  }
}

/** 参数字段布局 */
function ParamField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '6px' }}>
      <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '2px' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  border: '1px solid #d9d9d9',
  borderRadius: '4px',
  fontSize: '12px',
  boxSizing: 'border-box',
};
