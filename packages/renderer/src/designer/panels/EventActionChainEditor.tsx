import React, { useState, useMemo } from 'react';
import type { ActionChain, ActionStep } from '@low-code/shared';
import { VariablePicker } from './VariablePicker';

/** 动作类型列表（设计器事件配置用） */
const ACTION_TYPES = [
  { value: 'setValues', label: '批量设置值' },
  { value: 'resetForm', label: '重置表单' },
  { value: 'submit', label: '提交表单' },
  { value: 'validate', label: '校验表单' },
  { value: 'clearValidate', label: '清除校验' },
  { value: 'navigate', label: '打开页面' },
  { value: 'redirect', label: '页面跳转' },
  { value: 'showModal', label: '打开弹窗' },
  { value: 'closeModal', label: '关闭弹窗' },
  { value: 'showMessage', label: '消息提示' },
  { value: 'triggerWorkflow', label: '触发流程' },
  { value: 'invokeMethod', label: '调用组件方法' },
  { value: 'copyToClipboard', label: '复制到剪贴板' },
  { value: 'refreshComponent', label: '刷新组件' },
  { value: 'condition', label: '条件分支' },
  { value: 'customScript', label: '自定义脚本' },
];

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
  /** 可选事件列表（从组件 schema 的 x-group: "事件" 属性获取） */
  availableEvents?: Array<{ name: string; title: string }>;
  /** 页面中可被调用方法的组件列表（含插槽暴露方法） */
  availableMethods?: ComponentMethod[];
  /** 页面中可设置值的字段列表 */
  availableFields?: string[];
  /** 页面中的表单组件列表（用于 resetForm/submit/validate/clearValidate） */
  formComponents?: Array<{ id: string; name: string }>;
  /** 页面组件列表（用于 $component 代码提示） */
  pageComponents?: Record<string, { type: string; label?: string }>;
  /** 页面数据源列表（用于 $data 代码提示） */
  pageDataSources?: Record<string, { type: string; description?: string }>;
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
  const { events, onChange, availableEvents = [], availableMethods = [], availableFields = [], formComponents = [], pageComponents = {}, pageDataSources = {} } = props;
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [showEventSelector, setShowEventSelector] = useState(false);

  // 过滤掉已配置的事件
  const configuredEvents = Object.keys(events);
  const unconfiguredEvents = availableEvents.filter((e) => !configuredEvents.includes(e.name));

  const handleAddEvent = (eventName: string) => {
    onChange({ ...events, [eventName]: [[]] });
    setEditingEvent(eventName);
    setShowEventSelector(false);
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
                      formComponents={formComponents}
                      pageComponents={pageComponents}
                      pageDataSources={pageDataSources}
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

      {/* 添加事件按钮 */}
      {unconfiguredEvents.length > 0 && (
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowEventSelector(!showEventSelector)}
            style={{ padding: '6px 12px', border: '1px dashed #1890ff', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#e6f7ff', color: '#1890ff', width: '100%' }}>
            + 添加事件
          </button>

          {/* 事件选择下拉框 */}
          {showEventSelector && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '4px',
              backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 10, maxHeight: '200px', overflow: 'auto',
            }}>
              {unconfiguredEvents.map((event) => (
                <div
                  key={event.name}
                  onClick={() => handleAddEvent(event.name)}
                  style={{
                    padding: '8px 12px', cursor: 'pointer', fontSize: '12px',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
                >
                  <div style={{ fontWeight: 500 }}>{event.title}</div>
                  <div style={{ fontSize: '11px', color: '#999' }}>{event.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {unconfiguredEvents.length === 0 && availableEvents.length > 0 && (
        <div style={{ textAlign: 'center', color: '#999', padding: '12px', fontSize: '12px' }}>
          所有可用事件已配置
        </div>
      )}
    </div>
  );
}

/** 单个动作步骤编辑器 */
function ActionStepEditor({
  step, index, onUpdate, onDelete, onAddCondition, availableMethods, availableFields, formComponents,
  pageComponents = {}, pageDataSources = {}, excludeActions = [],
}: {
  step: ActionStep;
  index: number;
  onUpdate: (step: ActionStep) => void;
  onDelete: () => void;
  onAddCondition: () => void;
  availableMethods: ComponentMethod[];
  availableFields: string[];
  formComponents: Array<{ id: string; name: string }>;
  pageComponents?: Record<string, { type: string; label?: string }>;
  pageDataSources?: Record<string, { type: string; description?: string }>;
  /** 需要排除的动作类型列表（如条件分支内禁止嵌套条件分支） */
  excludeActions?: string[];
}) {
  // 过滤可用动作类型
  const filteredActionTypes = useMemo(
    () => ACTION_TYPES.filter((opt) => !excludeActions.includes(opt.value)),
    [excludeActions],
  );

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
          {filteredActionTypes.map((opt) => (
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
            placeholder="条件表达式（支持 $event、$result 等环境变量）"
            style={{ width: '100%', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
        </div>
      )}

      {/* 参数编辑 */}
      {step.action === 'condition' ? (
        <ConditionBranchEditor
          params={step.params || {}}
          onChange={(params) => onUpdate({ ...step, params })}
          availableMethods={availableMethods}
          availableFields={availableFields}
          formComponents={formComponents}
          pageComponents={pageComponents}
          pageDataSources={pageDataSources}
        />
      ) : (
        <ParamsEditor
          action={step.action}
          params={step.params || {}}
          onChange={(params) => onUpdate({ ...step, params })}
          availableMethods={availableMethods}
          availableFields={availableFields}
          formComponents={formComponents}
          pageComponents={pageComponents}
          pageDataSources={pageDataSources}
        />
      )}
    </div>
  );
}

/** 参数编辑器 */
function ParamsEditor({
  action, params, onChange, availableMethods, availableFields, formComponents,
  pageComponents = {}, pageDataSources = {},
}: {
  action: string;
  params: Record<string, any>;
  onChange: (params: Record<string, any>) => void;
  availableMethods: ComponentMethod[];
  availableFields: string[];
  formComponents: Array<{ id: string; name: string }>;
  pageComponents?: Record<string, { type: string; label?: string }>;
  pageDataSources?: Record<string, { type: string; description?: string }>;
}) {
  switch (action) {
    case 'navigate':
      return (
        <div>
          <ParamField label="URL">
            <input value={params.url ?? ''} onChange={(e) => onChange({ ...params, url: e.target.value })}
              style={inputStyle} placeholder="/detail/${id}" />
          </ParamField>
          <ParamField label="目标">
            <select value={params.target ?? '_self'} onChange={(e) => onChange({ ...params, target: e.target.value })} style={inputStyle}>
              <option value="_self">当前窗口</option>
              <option value="_blank">新窗口</option>
            </select>
          </ParamField>
        </div>
      );

    case 'redirect':
      return (
        <ParamField label="URL">
          <input value={params.url ?? ''} onChange={(e) => onChange({ ...params, url: e.target.value })}
            style={inputStyle} placeholder="/page/${id}" />
        </ParamField>
      );

    case 'setValues':
      return (
        <SetValuesEditor
          values={params.values || {}}
          onChange={(values) => onChange({ ...params, values })}
          availableFields={availableFields}
          pageComponents={pageComponents}
          pageDataSources={pageDataSources}
        />
      );

    case 'resetForm':
    case 'validate':
    case 'clearValidate':
      return (
        <ParamField label="表单">
          <select value={params.formId ?? ''} onChange={(e) => onChange({ ...params, formId: e.target.value })} style={inputStyle}>
            <option value="">请选择表单</option>
            {formComponents.map((form) => (
              <option key={form.id} value={form.id}>{form.name}</option>
            ))}
          </select>
        </ParamField>
      );

    case 'submit':
      return (
        <div>
          <ParamField label="表单">
            <select value={params.formId ?? ''} onChange={(e) => onChange({ ...params, formId: e.target.value })} style={inputStyle}>
              <option value="">请选择表单</option>
              {formComponents.map((form) => (
                <option key={form.id} value={form.id}>{form.name}</option>
              ))}
            </select>
          </ParamField>
          <ParamField label="提交 API">
            <input value={params.api ?? ''} onChange={(e) => onChange({ ...params, api: e.target.value })}
              style={inputStyle} placeholder="/api/submit" />
          </ParamField>
          <ParamField label="成功后跳转 (可选)">
            <input value={params.redirectUrl ?? ''} onChange={(e) => onChange({ ...params, redirectUrl: e.target.value || undefined })}
              style={inputStyle} placeholder="/success" />
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

    case 'showMessage':
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
          <ParamField label="持续时间 (ms)">
            <input type="number" value={params.duration ?? 3000} onChange={(e) => onChange({ ...params, duration: Number(e.target.value) })}
              style={inputStyle} />
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
          <ParamField label="传递数据 (JSON)">
            <textarea value={JSON.stringify(params.data ?? {}, null, 2)}
              onChange={(e) => { try { onChange({ ...params, data: JSON.parse(e.target.value) }); } catch { /* ignore */ } }}
              rows={2} style={{ ...inputStyle, fontFamily: 'monospace' }} />
          </ParamField>
        </div>
      );

    case 'closeModal':
      return (
        <div>
          <ParamField label="弹窗 ID">
            <input value={params.modalId ?? ''} onChange={(e) => onChange({ ...params, modalId: e.target.value })}
              style={inputStyle} />
          </ParamField>
          <ParamField label="返回结果 (JSON)">
            <textarea value={JSON.stringify(params.result ?? null, null, 2)}
              onChange={(e) => { try { onChange({ ...params, result: JSON.parse(e.target.value) }); } catch { /* ignore */ } }}
              rows={2} style={{ ...inputStyle, fontFamily: 'monospace' }} />
          </ParamField>
        </div>
      );

    case 'triggerWorkflow':
      return (
        <div>
          <ParamField label="流程 ID">
            <input value={params.workflowId ?? ''} onChange={(e) => onChange({ ...params, workflowId: e.target.value })}
              style={inputStyle} placeholder="流程定义 ID" />
          </ParamField>
          <ParamField label="触发数据 (JSON)">
            <textarea value={JSON.stringify(params.data ?? {}, null, 2)}
              onChange={(e) => { try { onChange({ ...params, data: JSON.parse(e.target.value) }); } catch { /* ignore */ } }}
              rows={2} style={{ ...inputStyle, fontFamily: 'monospace' }} />
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

    case 'refreshComponent':
      return (
        <div>
          <ParamField label="目标组件">
            <input value={params.target ?? ''} onChange={(e) => onChange({ ...params, target: e.target.value })}
              style={inputStyle} placeholder="组件 ID" />
          </ParamField>
          <ParamField label="刷新属性 (可选)">
            <input value={params.propNames?.join(', ') ?? ''} onChange={(e) => onChange({ ...params, propNames: e.target.value ? e.target.value.split(',').map((s: string) => s.trim()) : undefined })}
              style={inputStyle} placeholder="留空刷新全部，或用逗号分隔属性名" />
          </ParamField>
        </div>
      );

    case 'customScript':
      return (
        <ParamField label="脚本代码">
          <textarea value={params.script ?? ''}
            onChange={(e) => onChange({ ...params, script: e.target.value })}
            rows={6} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '11px' }}
            placeholder={`// 可用变量:\n// $event - 原生事件对象\n// $result - 上一个动作的返回值\n// $fetch - HTTP 请求函数\n// $form - 表单数据\n\nawait $fetch('/api/data', {\n  method: 'POST',\n  body: { key: 'value' }\n});`} />
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

/** setValues 选择器编辑器 */
function SetValuesEditor({
  values, onChange, availableFields,
  pageComponents = {}, pageDataSources = {},
}: {
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  availableFields: string[];
  pageComponents?: Record<string, { type: string; label?: string }>;
  pageDataSources?: Record<string, { type: string; description?: string }>;
}) {
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ field: string; mode: 'variable' | 'expression' } | null>(null);
  const entries = Object.entries(values);

  const handleAddField = (field: string) => {
    onChange({ ...values, [field]: '' });
    setShowFieldSelector(false);
  };

  const handleUpdateValue = (field: string, value: any) => {
    onChange({ ...values, [field]: value });
  };

  const handleUpdateMode = (field: string, mode: 'constant' | 'variable' | 'expression') => {
    const currentValue = values[field];
    let newValue: any;

    if (mode === 'constant') {
      newValue = typeof currentValue === 'object' ? currentValue.value : currentValue;
    } else if (mode === 'variable') {
      newValue = { type: 'variable', value: typeof currentValue === 'object' ? currentValue.value : currentValue || '' };
    } else {
      newValue = { type: 'expression', value: typeof currentValue === 'object' ? currentValue.value : currentValue || '' };
    }

    onChange({ ...values, [field]: newValue });
  };

  const handleDeleteField = (field: string) => {
    const newValues = { ...values };
    delete newValues[field];
    onChange(newValues);
  };

  // 获取当前值的模式
  const getValueMode = (value: any): 'constant' | 'variable' | 'expression' => {
    if (value && typeof value === 'object' && value.type) {
      return value.type;
    }
    return 'constant';
  };

  // 获取当前值的显示值
  const getDisplayValue = (value: any): string => {
    if (value && typeof value === 'object' && value.value !== undefined) {
      return String(value.value);
    }
    return String(value ?? '');
  };

  // 过滤未选择的字段
  const unselectedFields = availableFields.filter((f) => !entries.some(([key]) => key === f));

  return (
    <div style={{ fontSize: '12px' }}>
      <div style={{ fontWeight: 500, marginBottom: '8px', color: '#333' }}>批量设置值</div>

      {/* 已配置的字段 */}
      {entries.map(([field, value]) => {
        const mode = getValueMode(value);
        const displayValue = getDisplayValue(value);

        return (
          <div key={field} style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #e8e8e8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 500, color: '#1890ff' }}>{field}</span>
              <button onClick={() => handleDeleteField(field)}
                style={{ padding: '2px 6px', border: '1px solid #ff4d4f', borderRadius: '3px', color: '#ff4d4f', cursor: 'pointer', backgroundColor: '#fff', fontSize: '11px' }}>
                删除
              </button>
            </div>

            {/* 赋值模式选择 */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
              {(['constant', 'variable', 'expression'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => handleUpdateMode(field, m)}
                  style={{
                    padding: '2px 8px', border: `1px solid ${mode === m ? '#1890ff' : '#d9d9d9'}`,
                    borderRadius: '3px', cursor: 'pointer', fontSize: '11px',
                    backgroundColor: mode === m ? '#e6f7ff' : '#fff',
                    color: mode === m ? '#1890ff' : '#666',
                  }}
                >
                  {m === 'constant' ? '常量' : m === 'variable' ? '变量' : '表达式'}
                </button>
              ))}
            </div>

            {/* 值输入 + 选择变量按钮 */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <input
                value={displayValue}
                onChange={(e) => {
                  if (mode === 'constant') {
                    handleUpdateValue(field, e.target.value);
                  } else {
                    handleUpdateValue(field, { type: mode, value: e.target.value });
                  }
                }}
                placeholder={mode === 'variable' ? '变量路径，如 $data.name' : mode === 'expression' ? '表达式，如 $event.value * 2' : '静态值'}
                style={{ ...inputStyle, flex: 1 }}
              />
              {/* 变量/表达式模式下显示选择按钮 */}
              {mode !== 'constant' && (
                <button
                  onClick={() => setPickerTarget({ field, mode })}
                  style={{
                    padding: '4px 8px', border: '1px solid #1890ff', borderRadius: '4px',
                    cursor: 'pointer', backgroundColor: '#e6f7ff', color: '#1890ff', fontSize: '11px', whiteSpace: 'nowrap',
                  }}
                >
                  选择{mode === 'variable' ? '变量' : '表达式'}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* 添加字段按钮 */}
      {unselectedFields.length > 0 && (
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowFieldSelector(!showFieldSelector)}
            style={{ padding: '6px 12px', border: '1px dashed #1890ff', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#e6f7ff', color: '#1890ff', width: '100%', fontSize: '12px' }}>
            + 添加字段
          </button>

          {/* 字段选择下拉框 */}
          {showFieldSelector && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '4px',
              backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 10, maxHeight: '200px', overflow: 'auto',
            }}>
              {unselectedFields.map((field) => (
                <div
                  key={field}
                  onClick={() => handleAddField(field)}
                  style={{
                    padding: '8px 12px', cursor: 'pointer', fontSize: '12px',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
                >
                  {field}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {unselectedFields.length === 0 && availableFields.length > 0 && (
        <div style={{ textAlign: 'center', color: '#999', padding: '12px', fontSize: '12px' }}>
          所有可用字段已配置
        </div>
      )}

      {/* VariablePicker 弹窗 */}
      {pickerTarget && (
        <VariablePicker
          visible={!!pickerTarget}
          value={values[pickerTarget.field]}
          mode={pickerTarget.mode}
          onChange={(val) => {
            handleUpdateValue(pickerTarget.field, val);
            setPickerTarget(null);
          }}
          onClear={() => {
            handleUpdateValue(pickerTarget.field, '');
            setPickerTarget(null);
          }}
          onClose={() => setPickerTarget(null)}
          pageComponents={pageComponents}
          pageDataSources={pageDataSources}
        />
      )}
    </div>
  );
}

/** 条件分支编辑器 */
function ConditionBranchEditor({
  params, onChange, availableMethods, availableFields, formComponents,
  pageComponents = {}, pageDataSources = {},
}: {
  params: Record<string, any>;
  onChange: (params: Record<string, any>) => void;
  availableMethods: ComponentMethod[];
  availableFields: string[];
  formComponents: Array<{ id: string; name: string }>;
  pageComponents?: Record<string, { type: string; label?: string }>;
  pageDataSources?: Record<string, { type: string; description?: string }>;
}) {
  const condition = params.condition || '';
  const thenActions = params.then || [];
  const elseActions = params.else || [];
  const [showExpressionPicker, setShowExpressionPicker] = useState(false);

  const handleAddThenAction = () => {
    const newAction: ActionStep = { action: 'showMessage', params: { type: 'info', content: '' } };
    onChange({ ...params, then: [...thenActions, newAction] });
  };

  const handleAddElseAction = () => {
    const newAction: ActionStep = { action: 'showMessage', params: { type: 'info', content: '' } };
    onChange({ ...params, else: [...elseActions, newAction] });
  };

  const handleUpdateThenAction = (index: number, step: ActionStep) => {
    const newActions = thenActions.map((s: ActionStep, i: number) => i === index ? step : s);
    onChange({ ...params, then: newActions });
  };

  const handleUpdateElseAction = (index: number, step: ActionStep) => {
    const newActions = elseActions.map((s: ActionStep, i: number) => i === index ? step : s);
    onChange({ ...params, else: newActions });
  };

  const handleDeleteThenAction = (index: number) => {
    onChange({ ...params, then: thenActions.filter((_: ActionStep, i: number) => i !== index) });
  };

  const handleDeleteElseAction = (index: number) => {
    onChange({ ...params, else: elseActions.filter((_: ActionStep, i: number) => i !== index) });
  };

  return (
    <div style={{ fontSize: '12px' }}>
      {/* 条件表达式 — 使用表达式编辑器 */}
      <ParamField label="条件表达式">
        <div style={{ display: 'flex', gap: '4px' }}>
          <input
            value={condition}
            onChange={(e) => onChange({ ...params, condition: e.target.value })}
            placeholder="支持 $event、$result 等环境变量"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => setShowExpressionPicker(true)}
            style={{
              padding: '4px 8px', border: '1px solid #1890ff', borderRadius: '4px',
              cursor: 'pointer', backgroundColor: '#e6f7ff', color: '#1890ff', fontSize: '11px', whiteSpace: 'nowrap',
            }}
          >
            编辑表达式
          </button>
        </div>
        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
          示例: $event.value {'>'} 10, $result.success === true
        </div>
      </ParamField>

      {/* Then 分支 */}
      <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px' }}>
        <div style={{ fontWeight: 500, marginBottom: '8px', color: '#52c41a' }}>
          ✅ Then（条件为真时执行）
        </div>
        {thenActions.map((step: ActionStep, index: number) => (
          <ActionStepEditor
            key={index}
            step={step}
            index={index}
            onUpdate={(updated) => handleUpdateThenAction(index, updated)}
            onDelete={() => handleDeleteThenAction(index)}
            onAddCondition={() => {}}
            availableMethods={availableMethods}
            availableFields={availableFields}
            formComponents={formComponents}
            pageComponents={pageComponents}
            pageDataSources={pageDataSources}
            excludeActions={['condition']}
          />
        ))}
        <button onClick={handleAddThenAction}
          style={{ padding: '4px 12px', border: '1px dashed #52c41a', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fff', width: '100%', fontSize: '12px', color: '#52c41a' }}>
          + 添加 Then 动作
        </button>
      </div>

      {/* Else 分支 */}
      <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fff2e8', border: '1px solid #ffbb96', borderRadius: '4px' }}>
        <div style={{ fontWeight: 500, marginBottom: '8px', color: '#fa541c' }}>
          ❌ Else（条件为假时执行）
        </div>
        {elseActions.map((step: ActionStep, index: number) => (
          <ActionStepEditor
            key={index}
            step={step}
            index={index}
            onUpdate={(updated) => handleUpdateElseAction(index, updated)}
            onDelete={() => handleDeleteElseAction(index)}
            onAddCondition={() => {}}
            availableMethods={availableMethods}
            availableFields={availableFields}
            formComponents={formComponents}
            pageComponents={pageComponents}
            pageDataSources={pageDataSources}
            excludeActions={['condition']}
          />
        ))}
        <button onClick={handleAddElseAction}
          style={{ padding: '4px 12px', border: '1px dashed #fa541c', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fff', width: '100%', fontSize: '12px', color: '#fa541c' }}>
          + 添加 Else 动作
        </button>
      </div>

      {/* 表达式编辑器弹窗 */}
      {showExpressionPicker && (
        <VariablePicker
          visible={showExpressionPicker}
          value={{ type: 'expression', value: condition }}
          mode="expression"
          onChange={(val) => {
            onChange({ ...params, condition: val.value });
            setShowExpressionPicker(false);
          }}
          onClear={() => {
            onChange({ ...params, condition: '' });
            setShowExpressionPicker(false);
          }}
          onClose={() => setShowExpressionPicker(false)}
          pageComponents={pageComponents}
          pageDataSources={pageDataSources}
        />
      )}
    </div>
  );
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
