import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { ActionChain, ActionStep } from '@low-code/shared';
import { PropValueField, detectValueMode } from '@low-code/auto-rendering';
import type { ValueMode } from '@low-code/auto-rendering';
import { VariableTreeSelector } from '../../components/VariableTreeSelector';
import { ExpressionEditor } from '../../components/ExpressionEditor';

/** 应用页面信息（从 API 加载） */
interface AppPageInfo {
  id: string;
  name: string;
}

/** 加载应用页面列表 */
function useAppPages(appId?: string): { pages: AppPageInfo[]; loading: boolean } {
  const [pages, setPages] = useState<AppPageInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!appId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/apps/${appId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) {
          setPages(data.resources?.pages ?? []);
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [appId]);

  return { pages, loading };
}

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
  { value: 'refreshComponent', label: '刷新组件' },
  { value: 'condition', label: '条件分支' },
  { value: 'customScript', label: '自定义脚本' },
];

/** 组件方法描述（卡片实例暴露的方法） */
export interface ComponentMethod {
  /** 组件实例 ID */
  componentId: string;
  /** 组件类型 */
  componentType: string;
  /** 方法名 */
  methodName: string;
  /** 显示标签 */
  label: string;
  /** 方法描述 */
  description?: string;
}

/** 事件动作链编排器属性 */
export interface EventActionChainEditorProps {
  events: Record<string, ActionChain[]>;
  onChange: (events: Record<string, ActionChain[]>) => void;
  /** 可选事件列表（从组件 schema 的 x-group: "事件" 属性获取） */
  availableEvents?: Array<{ name: string; title: string }>;
  /** 页面中可被调用方法的组件列表（卡片实例暴露的方法） */
  availableMethods?: ComponentMethod[];
  /** 组件名称列表（含类型和标签，用于 setValues 目标树） */
  /** 页面中的表单组件列表（用于 resetForm/submit/validate/clearValidate） */
  formComponents?: Array<{ id: string; name: string }>;
  /** 页面组件列表（用于 $component 代码提示） */
  pageComponents?: Record<string, { type: string; label?: string }>;
  /** 页面数据源列表（用于 $data 代码提示） */
  pageDataSources?: Record<string, { type: string; description?: string }>;
  /** 当前应用 ID（用于加载页面列表） */
  appId?: string;
  /** 当前租户 ID（用于拼接路由） */
  tenantId?: string;
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
  const { events, onChange, availableEvents = [], availableMethods = [], formComponents = [], pageComponents = {}, pageDataSources = {}, appId, tenantId } = props;
  const { pages: appPages } = useAppPages(appId);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [showEventSelector, setShowEventSelector] = useState(false);
  const addEventBtnRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

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
        ? [...chain, { action: 'showMessage', params: {} }]
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
                      availableMethods={availableMethods}
                      formComponents={formComponents}
                      pageComponents={pageComponents}
                      pageDataSources={pageDataSources}
                      appId={appId}
                      tenantId={tenantId}
                      appPages={appPages}
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
          <button
            ref={addEventBtnRef}
            onClick={() => {
              if (!showEventSelector && addEventBtnRef.current) {
                const rect = addEventBtnRef.current.getBoundingClientRect();
                setDropdownPos({ top: rect.top - 4, left: rect.left, width: rect.width });
              }
              setShowEventSelector(!showEventSelector);
            }}
            style={{ padding: '6px 12px', border: '1px dashed #1890ff', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#e6f7ff', color: '#1890ff', width: '100%' }}>
            + 添加事件
          </button>

          {/* 事件选择下拉框 — portal 到 body 避免被 overflow 容器裁剪 */}
          {showEventSelector && ReactDOM.createPortal(
            <>
              <div onClick={() => setShowEventSelector(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999 }} />
              <div style={{
                position: 'fixed',
                top: dropdownPos.top - 4, left: dropdownPos.left, width: dropdownPos.width,
                transform: 'translateY(-100%)',
                backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 10000, maxHeight: '200px', overflow: 'auto',
              }}>
                {unconfiguredEvents.map((event) => (
                  <div
                    key={event.name}
                    onClick={() => { handleAddEvent(event.name); setShowEventSelector(false); }}
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
            </>,
            document.body
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
  step, index, onUpdate, onDelete, availableMethods, formComponents,
  pageComponents = {}, pageDataSources = {}, excludeActions = [],
  appId, tenantId, appPages = [],
}: {
  step: ActionStep;
  index: number;
  onUpdate: (step: ActionStep) => void;
  onDelete: () => void;
  availableMethods: ComponentMethod[];
  formComponents: Array<{ id: string; name: string }>;
  pageComponents?: Record<string, { type: string; label?: string }>;
  pageDataSources?: Record<string, { type: string; description?: string }>;
  /** 需要排除的动作类型列表（如条件分支内禁止嵌套条件分支） */
  excludeActions?: string[];
  /** 当前应用 ID（用于拼接路由） */
  appId?: string;
  /** 当前租户 ID（用于拼接路由） */
  tenantId?: string;
  /** 当前应用页面列表（用于页面选择） */
  appPages?: AppPageInfo[];
}) {
  // 过滤可用动作类型
  const filteredActionTypes = useMemo(
    () => ACTION_TYPES.filter((opt) => !excludeActions.includes(opt.value)),
    [excludeActions],
  );

  return (
    <div style={{ padding: '8px', border: '1px solid #e8e8e8', borderRadius: '4px', marginBottom: '8px', backgroundColor: '#fff', opacity: step.disabled ? 0.5 : 1 }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: '#999', minWidth: '20px' }}>#{index + 1}</span>
        <select value={step.action}
          onChange={(e) => {
            const newAction = e.target.value;
            // 切换动作类型时重置参数
            const resetParamsMap: Record<string, Record<string, any>> = {
              invokeMethod: { target: '', method: '', params: {} },
              setValues: { values: {} },
            };
            onUpdate({ ...step, action: newAction, params: resetParamsMap[newAction] ?? {} });
          }}
          style={{ flex: 1, padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px' }}>
          {filteredActionTypes.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div
          onClick={() => onUpdate({ ...step, disabled: !step.disabled })}
          title={step.disabled ? '启用' : '禁用'}
          style={{
            width: 28, height: 16, borderRadius: 8, cursor: 'pointer', flexShrink: 0,
            backgroundColor: step.disabled ? '#d9d9d9' : '#52c41a',
            position: 'relative', transition: 'background-color 0.2s',
          }}
        >
          <div style={{
            width: 12, height: 12, borderRadius: '50%', backgroundColor: '#fff',
            position: 'absolute', top: 2,
            left: step.disabled ? 2 : 14, transition: 'left 0.2s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }} />
        </div>
        <button onClick={onDelete}
          style={{ padding: '2px 6px', border: '1px solid #ff4d4f', borderRadius: '3px', color: '#ff4d4f', cursor: 'pointer', backgroundColor: '#fff', fontSize: '11px' }}>删除</button>
      </div>

      {/* 参数编辑 */}
      {step.action === 'condition' ? (
        <ConditionBranchEditor
          params={step.params || {}}
          onChange={(params) => onUpdate({ ...step, params })}
          availableMethods={availableMethods}

          formComponents={formComponents}
          pageComponents={pageComponents}
          pageDataSources={pageDataSources}
          appId={appId}
          tenantId={tenantId}
          appPages={appPages}
        />
      ) : (
        <ParamsEditor
          action={step.action}
          params={step.params || {}}
          onChange={(params) => onUpdate({ ...step, params })}
          availableMethods={availableMethods}

          formComponents={formComponents}
          pageComponents={pageComponents}
          pageDataSources={pageDataSources}
          appId={appId}
          tenantId={tenantId}
          appPages={appPages}
        />
      )}
    </div>
  );
}

/** 参数编辑器 */
function ParamsEditor({
  action, params, onChange, availableMethods, formComponents,
  pageComponents = {}, pageDataSources = {},
  appId, tenantId, appPages = [],
}: {
  action: string;
  params: Record<string, any>;
  onChange: (params: Record<string, any>) => void;
  availableMethods: ComponentMethod[];
  formComponents: Array<{ id: string; name: string }>;
  pageComponents?: Record<string, { type: string; label?: string }>;
  pageDataSources?: Record<string, { type: string; description?: string }>;
  /** 当前应用 ID（用于拼接路由） */
  appId?: string;
  /** 当前租户 ID（用于拼接路由） */
  tenantId?: string;
  /** 当前应用页面列表（用于页面选择） */
  appPages?: AppPageInfo[];
}) {
  switch (action) {
    case 'navigate':
    case 'redirect': {
      const linkType = params.linkType ?? 'internal';
      return (
        <div>
          <ParamField label="链接类型">
            <select value={linkType} onChange={(e) => {
              const next = e.target.value;
              onChange({ ...params, linkType: next, url: '', pageId: undefined });
            }} style={inputStyle}>
              <option value="internal">平台内页面</option>
              <option value="external">外部链接</option>
            </select>
          </ParamField>

          {linkType === 'internal' ? (
            <>
              <ParamField label="目标页面">
                <select value={params.pageId ?? ''} onChange={(e) => {
                  const selectedPageId = e.target.value;
                  if (!selectedPageId) {
                    onChange({ ...params, pageId: undefined, url: '' });
                  } else {
                    const url = `/${tenantId ?? ''}/app/${appId ?? ''}/page/${selectedPageId}`;
                    onChange({ ...params, pageId: selectedPageId, url });
                  }
                }} style={inputStyle}>
                  <option value="">请选择页面</option>
                  {appPages.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </ParamField>
              <QueryParamsPicker
                label="查询参数"
                value={params.queryParams}
                onChange={(qp) => {
                  if (!qp) {
                    const { queryParams: _, ...rest } = params;
                    onChange(rest);
                  } else {
                    onChange({ ...params, queryParams: qp });
                  }
                }}
                pageComponents={pageComponents}
                pageDataSources={pageDataSources}
              />
            </>
          ) : (
            <ParamField label="URL">
              <input value={params.url ?? ''} onChange={(e) => onChange({ ...params, url: e.target.value })}
                style={inputStyle} placeholder="https://example.com 或 /path/{{id}}" />
            </ParamField>
          )}

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
    }

    case 'setValues':
      return (
        <SetValuesEditor
          values={params.values || {}}
          onChange={(values) => onChange({ ...params, values })}
          pageComponents={pageComponents}
          pageDataSources={pageDataSources}
        />
      );

    case 'resetForm':
    case 'validate':
    case 'clearValidate':
    case 'submit': {
      const defaultFormId = formComponents.length === 1 ? formComponents[0].id : '';
      const currentFormId = params.formId ?? defaultFormId;
      // 唯一表单时自动选中（仅在未设置时）
      if (formComponents.length === 1 && !params.formId) {
        setTimeout(() => onChange({ ...params, formId: formComponents[0].id }), 0);
      }
      return (
        <div>
          <ParamField label="表单">
            <select value={currentFormId} onChange={(e) => onChange({ ...params, formId: e.target.value })} style={inputStyle}>
              <option value="">请选择表单</option>
              {formComponents.map((form) => (
                <option key={form.id} value={form.id}>{form.name}</option>
              ))}
            </select>
          </ParamField>
          {action === 'submit' && (
            <>
              <ParamField label="提交 API">
                <input value={params.api ?? ''} onChange={(e) => onChange({ ...params, api: e.target.value })}
                  style={inputStyle} placeholder="/api/submit" />
              </ParamField>
              <ParamField label="成功后跳转 (可选)">
                <input value={params.redirectUrl ?? ''} onChange={(e) => onChange({ ...params, redirectUrl: e.target.value || undefined })}
                  style={inputStyle} placeholder="/success" />
              </ParamField>
            </>
          )}
        </div>
      );
    }

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
                {targetMethods.map((m) => (
                  <option key={m.methodName} value={m.methodName}>
                    {m.label} {m.description ? `— ${m.description}` : ''}
                  </option>
                ))}
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
            placeholder={`// 可用变量:\n// $event - 原生事件对象\n// $result - 上一个动作的返回值\n// $fetch - HTTP 请求函数\n// $component.form_xxx.$form - 表单上下文\n\nawait $fetch('/api/data', {\n  method: 'POST',\n  body: { key: 'value' }\n});`} />
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

/** setValues 选择器编辑器（VariableTreeSelector 选目标 + PropValueField 赋值卡片） */
function SetValuesEditor({
  values, onChange,
  pageComponents = {}, pageDataSources = {},
}: {
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  pageComponents?: Record<string, { type: string; label?: string }>;
  pageDataSources?: Record<string, { type: string; description?: string }>;
}) {
  /** pickerMode: null=关闭, 'target'=选择赋值目标, {field,mode}=编辑某字段的值 */
  const [pickerMode, setPickerMode] = useState<'target' | { field: string; mode: 'variable' | 'expression' } | null>(null);

  const entries = Object.entries(values);

  const handleUpdateValue = (field: string, value: any) => {
    onChange({ ...values, [field]: value });
  };

  const handleModeChange = (field: string, mode: ValueMode) => {
    const cur = values[field];
    const curValue = cur && typeof cur === 'object' ? cur.value : cur;
    if (mode === 'constant') {
      handleUpdateValue(field, curValue ?? '');
    } else {
      handleUpdateValue(field, { type: mode, value: curValue ?? '' });
      setPickerMode({ field, mode: mode as 'variable' | 'expression' });
    }
  };

  const handleDeleteField = (field: string) => {
    const newValues = { ...values };
    delete newValues[field];
    onChange(newValues);
  };

  return (
    <div style={{ fontSize: '12px' }}>
      <div style={{ fontWeight: 500, marginBottom: '8px', color: '#333' }}>批量设置值</div>

      {/* 已配置的赋值卡片 */}
      {entries.map(([field, fieldValue]) => {
        const mode = detectValueMode(fieldValue);

        return (
          <div key={field} style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #e8e8e8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 500, color: '#1890ff', fontFamily: 'monospace', fontSize: '12px' }}>{field}</span>
              <button onClick={() => handleDeleteField(field)}
                style={{ padding: '2px 6px', border: '1px solid #ff4d4f', borderRadius: '3px', color: '#ff4d4f', cursor: 'pointer', backgroundColor: '#fff', fontSize: '11px' }}>
                删除
              </button>
            </div>

            <PropValueField
              mode={mode}
              onModeChange={(m) => handleModeChange(field, m)}
              value={fieldValue}
              onOpenPicker={() => setPickerMode({ field, mode: mode as 'variable' | 'expression' })}
            >
              <input
                value={typeof fieldValue === 'string' ? fieldValue : ''}
                onChange={(e) => handleUpdateValue(field, e.target.value)}
                placeholder="静态值"
                style={{ ...inputStyle, width: '100%' }}
              />
            </PropValueField>
          </div>
        );
      })}

      {/* 添加赋值按钮 */}
      <button
        onClick={() => setPickerMode('target')}
        style={{ padding: '6px 12px', border: '1px dashed #1890ff', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#e6f7ff', color: '#1890ff', width: '100%', fontSize: '12px' }}
      >
        + 添加赋值
      </button>

      {/* 赋值目标多选 */}
      {pickerMode === 'target' && (
        <VariableTreeSelector
          visible={true}
          multiSelect
          onChange={(val) => {
            const targets = val as Array<{ type: 'variable'; value: string }>;
            const newValues = { ...values };
            for (const item of targets) {
              if (!newValues[item.value]) newValues[item.value] = '';
            }
            onChange(newValues);
            setPickerMode(null);
          }}
          onClear={() => setPickerMode(null)}
          onClose={() => setPickerMode(null)}
          pageComponents={pageComponents}
          pageDataSources={pageDataSources}
        />
      )}

      {/* 单选变量 */}
      {pickerMode && pickerMode !== 'target' && pickerMode.mode === 'variable' && (
        <VariableTreeSelector
          visible={true}
          value={values[pickerMode.field]}
          onChange={(val) => {
            handleUpdateValue(pickerMode.field, val);
            setPickerMode(null);
          }}
          onClear={() => {
            handleUpdateValue(pickerMode.field, '');
            setPickerMode(null);
          }}
          onClose={() => setPickerMode(null)}
          pageComponents={pageComponents}
          pageDataSources={pageDataSources}
        />
      )}

      {/* 表达式编辑 */}
      {pickerMode && pickerMode !== 'target' && pickerMode.mode === 'expression' && (
        <ExpressionEditor
          visible={true}
          value={values[pickerMode.field]}
          onChange={(val) => {
            handleUpdateValue(pickerMode.field, val);
            setPickerMode(null);
          }}
          onClear={() => {
            handleUpdateValue(pickerMode.field, '');
            setPickerMode(null);
          }}
          onClose={() => setPickerMode(null)}
          pageComponents={pageComponents}
          pageDataSources={pageDataSources}
        />
      )}
    </div>
  );
}

/** 查询参数选择器 — 变量/表达式二选一 */
function QueryParamsPicker({
  label, value, onChange,
  pageComponents = {}, pageDataSources = {},
}: {
  label?: string;
  value: unknown;
  onChange: (val: { type: 'variable' | 'expression'; value: string; async?: boolean } | undefined) => void;
  pageComponents?: Record<string, { type: string; label?: string }>;
  pageDataSources?: Record<string, { type: string; description?: string }>;
}) {
  const mode = detectValueMode(value);
  const [pickerMode, setPickerMode] = useState<'variable' | 'expression' | null>(null);

  return (
    <div style={{ fontSize: 12 }}>
      <PropValueField
        label={label}
        modes={['variable', 'expression']}
        mode={mode}
        onModeChange={(m) => {
          if (m === 'constant') return;
          setPickerMode(m as 'variable' | 'expression');
          // 首次切换时初始化空值
          if (mode === 'constant') {
            onChange({ type: m as 'variable' | 'expression', value: '' });
          }
        }}
        value={value}
        onOpenPicker={() => setPickerMode(mode as 'variable' | 'expression')}
      />

      {/* 变量选择器 */}
      {pickerMode === 'variable' && (
        <VariableTreeSelector
          visible={true}
          value={value as string}
          onChange={(val) => { onChange(val as { type: 'variable'; value: string }); setPickerMode(null); }}
          onClear={() => { onChange(undefined); setPickerMode(null); }}
          onClose={() => setPickerMode(null)}
          pageComponents={pageComponents}
          pageDataSources={pageDataSources}
        />
      )}

      {/* 表达式编辑器 */}
      {pickerMode === 'expression' && (
        <ExpressionEditor
          visible={true}
          value={value}
          expectedType="object"
          onChange={(val) => { onChange({ type: 'expression', value: val.value, async: val.async }); setPickerMode(null); }}
          onClear={() => { onChange(undefined); setPickerMode(null); }}
          onClose={() => setPickerMode(null)}
          pageComponents={pageComponents}
          pageDataSources={pageDataSources}
        />
      )}
    </div>
  );
}

/** 条件分支编辑器 */
function ConditionBranchEditor({
  params, onChange, availableMethods, formComponents,
  pageComponents = {}, pageDataSources = {},
  appId, tenantId, appPages = [],
}: {
  params: Record<string, any>;
  onChange: (params: Record<string, any>) => void;
  availableMethods: ComponentMethod[];
  formComponents: Array<{ id: string; name: string }>;
  pageComponents?: Record<string, { type: string; label?: string }>;
  pageDataSources?: Record<string, { type: string; description?: string }>;
  /** 当前应用 ID（用于拼接路由） */
  appId?: string;
  /** 当前租户 ID（用于拼接路由） */
  tenantId?: string;
  /** 当前应用页面列表（用于页面选择） */
  appPages?: AppPageInfo[];
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
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {condition ? (
            <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '12px', color: '#333', padding: '4px 0', wordBreak: 'break-all' }}>{condition}</span>
          ) : (
            <span style={{ flex: 1, color: '#999', fontSize: '12px' }}>未设置条件</span>
          )}
          <button
            onClick={() => setShowExpressionPicker(true)}
            style={{
              padding: '4px 8px', border: '1px solid #1890ff', borderRadius: '4px',
              cursor: 'pointer', backgroundColor: '#e6f7ff', color: '#1890ff', fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {condition ? '编辑' : '设置条件'}
          </button>
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
            availableMethods={availableMethods}

            formComponents={formComponents}
            pageComponents={pageComponents}
            pageDataSources={pageDataSources}
            appId={appId}
            tenantId={tenantId}
            appPages={appPages}
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
            availableMethods={availableMethods}

            formComponents={formComponents}
            pageComponents={pageComponents}
            pageDataSources={pageDataSources}
            appId={appId}
            tenantId={tenantId}
            appPages={appPages}
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
        <ExpressionEditor
          visible={showExpressionPicker}
          value={condition}
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
