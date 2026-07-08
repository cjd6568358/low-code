/**
 * 流程节点配置组件
 *
 * 支持变量/表达式绑定、选人组件、数据表选择、运算规则选择等。
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { IConfigComponent } from 'react-flow-builder';
import { UserSelector } from '../../components/UserSelector';
import { ExpressionEditor } from '../../components/ExpressionEditor';
import { VariableTreeSelector } from '../../components/VariableTreeSelector';
import { ComputationSelector } from '../../components/ComputationSelector';
import { FieldMappingEditor } from './FieldMappingEditor';
import { ConditionRowEditor } from './ConditionRowEditor';

/** 输入框样式 */
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  fontSize: 13,
};

/** 标签样式 */
const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: 13,
  fontWeight: 500,
};

/** 字段容器样式 */
const fieldStyle: React.CSSProperties = {
  marginBottom: 16,
};

/** 绑定触发按钮样式 */
const bindingTriggerStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  fontSize: 13,
  background: '#fff',
  cursor: 'pointer',
  textAlign: 'left',
  minHeight: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

/** 变量绑定标签样式 */
const variableTagStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 8px',
  background: '#e6f7ff',
  border: '1px solid #91d5ff',
  borderRadius: 4,
  fontSize: 12,
  color: '#1890ff',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** 表达式标签样式 */
const expressionTagStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 8px',
  background: '#f6ffed',
  border: '1px solid #b7eb8f',
  borderRadius: 4,
  fontSize: 12,
  color: '#52c41a',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontFamily: 'monospace',
};

/** 空值占位样式 */
const placeholderStyle: React.CSSProperties = {
  color: '#999',
  fontSize: 13,
};

/** 绑定类型图标 */
const VARIABLE_ICON = '🔗';
const EXPRESSION_ICON = 'ƒ';

/**
 * 获取租户ID（从当前URL或上下文）
 */
function getTenantId(): string {
  const match = window.location.pathname.match(/\/tenant_([^/]+)/);
  return match ? match[1] : 'default';
}

/**
 * 获取应用ID（从当前URL）
 */
function getAppId(): string {
  const match = window.location.pathname.match(/\/app\/([^/]+)/);
  return match ? match[1] : '';
}

/**
 * 解析绑定值
 */
function parseBindingValue(val: unknown): { type: 'variable' | 'expression' | 'constant'; value: string; async?: boolean } {
  if (val && typeof val === 'object' && 'type' in val && 'value' in val) {
    const binding = val as { type: string; value: string; async?: boolean };
    if (binding.type === 'variable' || binding.type === 'expression') {
      return binding as { type: 'variable' | 'expression'; value: string; async?: boolean };
    }
  }
  return { type: 'constant', value: typeof val === 'string' ? val : '' };
}

/**
 * 数据表选择器组件
 */
function CollectionSelector({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [collections, setCollections] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const appId = getAppId();

  // 加载数据表列表
  useEffect(() => {
    if (!appId) return;
    setLoading(true);
    fetch(`/api/apps/${appId}/tables`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.resources)) {
          setCollections(data.resources);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [appId]);

  return (
    <select
      style={inputStyle}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
    >
      <option value="">{loading ? '加载中...' : placeholder || '选择数据表'}</option>
      {collections.map((col) => (
        <option key={col.id} value={col.id}>
          {col.name} ({col.id})
        </option>
      ))}
    </select>
  );
}

/**
 * 变量绑定触发器组件
 */
function VariableBindingTrigger({
  value,
  onChange,
  onClear,
  placeholder,
  expectedType,
}: {
  value: unknown;
  onChange: (value: any) => void;
  onClear: () => void;
  placeholder?: string;
  expectedType?: string;
}) {
  const [visible, setVisible] = useState(false);
  const binding = parseBindingValue(value);

  const renderDisplay = () => {
    if (binding.type === 'variable') {
      return (
        <span style={variableTagStyle} title={binding.value}>
          {VARIABLE_ICON} {binding.value || '未选择变量'}
        </span>
      );
    }
    return <span style={placeholderStyle}>{placeholder || '点击选择变量'}</span>;
  };

  return (
    <>
      <div style={bindingTriggerStyle} onClick={() => setVisible(true)}>
        {renderDisplay()}
        <span style={{ fontSize: 10, color: '#999' }}>▼</span>
      </div>
      <VariableTreeSelector
        visible={visible}
        value={binding.type === 'variable' ? binding.value : ''}
        onChange={(val) => onChange(val)}
        onClear={onClear}
        onClose={() => setVisible(false)}
        expectedType={expectedType}
        leafOnly
      />
    </>
  );
}

/**
 * 表达式绑定触发器组件
 */
function ExpressionBindingTrigger({
  value,
  onChange,
  onClear,
  placeholder,
  expectedType,
  async: asyncMode,
}: {
  value: unknown;
  onChange: (value: any) => void;
  onClear: () => void;
  placeholder?: string;
  expectedType?: string;
  async?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const binding = parseBindingValue(value);

  const renderDisplay = () => {
    if (binding.type === 'expression') {
      return (
        <span style={expressionTagStyle} title={binding.value}>
          {EXPRESSION_ICON} {binding.value.length > 40 ? binding.value.substring(0, 40) + '...' : binding.value}
        </span>
      );
    }
    return <span style={placeholderStyle}>{placeholder || '点击编写表达式'}</span>;
  };

  return (
    <>
      <div style={bindingTriggerStyle} onClick={() => setVisible(true)}>
        {renderDisplay()}
        <span style={{ fontSize: 10, color: '#999' }}>▼</span>
      </div>
      <ExpressionEditor
        visible={visible}
        value={binding.type === 'expression' ? binding.value : ''}
        onChange={(val) => onChange(val)}
        onClear={onClear}
        onClose={() => setVisible(false)}
        async={asyncMode}
        expectedType={expectedType}
      />
    </>
  );
}

/**
 * 运算规则参数映射组件
 *
 * 将流程变量映射到运算规则的输入字段。
 * 加载运算规则的输入字段定义，为每个字段提供变量绑定器。
 */
function ComputationParamMapper({
  computationId,
  value,
  onChange,
  appId,
}: {
  computationId: string;
  value?: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  appId: string;
}) {
  const [inputs, setInputs] = useState<Array<{ key: string; label: string; fieldType: string }>>([]);
  const [loading, setLoading] = useState(false);

  // 加载运算规则的输入字段定义
  useEffect(() => {
    if (!computationId || !appId) return;

    setLoading(true);
    fetch(`/api/computations/${computationId}?appId=${appId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.inputs) {
          setInputs(data.data.inputs);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [computationId, appId]);

  if (loading) {
    return <div style={{ fontSize: 12, color: '#999' }}>加载参数定义中...</div>;
  }

  if (inputs.length === 0) {
    return <div style={{ fontSize: 12, color: '#999' }}>该运算规则无需输入参数</div>;
  }

  return (
    <div>
      {inputs.map((input) => (
        <div key={input.key} style={{ marginBottom: 8 }}>
          <label style={{ ...labelStyle, fontSize: 12 }}>
            {input.label || input.key}
            <span style={{ color: '#999', fontWeight: 'normal', marginLeft: 4 }}>
              ({input.fieldType})
            </span>
          </label>
          <VariableBindingTrigger
            value={value?.[input.key]}
            onChange={(val: unknown) => onChange({ ...(value || {}), [input.key]: val })}
            onClear={() => {
              const newValue = { ...(value || {}) };
              delete newValue[input.key];
              onChange(newValue);
            }}
            placeholder={`绑定 ${input.label || input.key} 的值`}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * 节点配置组件
 */
const NodeConfigComponent = React.forwardRef<any, IConfigComponent>(
  ({ node, nodes, cancel, save }, ref) => {
    const nodeType = (node as any).type;
    const tenantId = getTenantId();

    const [config, setConfig] = useState<any>({
      name: node.name || '',
      ...(node as any),
      ...(node as any).data,
    });

    const updateConfig = useCallback((key: string, value: any) => {
      setConfig((prev: any) => ({ ...prev, [key]: value }));
    }, []);

    const handleSave = useCallback(() => {
      save?.(config);
    }, [config, save]);

    // 根据节点类型渲染配置表单
    const renderConfigForm = () => {
      switch (nodeType) {
        case 'approval':
          return renderApprovalConfig();
        case 'condition':
          return renderConditionConfig();
        case 'timer':
          return renderTimerConfig();
        case 'notify':
          return renderNotifyConfig();
        case 'service':
          return renderServiceConfig();
        case 'calculation':
          return renderCalculationConfig();
        case 'create':
        case 'update':
        case 'delete':
          return renderDataOperationConfig(nodeType);
        default:
          return renderBasicConfig();
      }
    };

    const renderBasicConfig = () => (
      <div style={fieldStyle}>
        <label style={labelStyle}>节点名称</label>
        <input
          style={inputStyle}
          value={config.name || ''}
          onChange={(e) => updateConfig('name', e.target.value)}
        />
      </div>
    );

    const renderApprovalConfig = () => (
      <>
        {renderBasicConfig()}
        <div style={fieldStyle}>
          <label style={labelStyle}>审批模式</label>
          <select
            style={inputStyle}
            value={config.approvalMode || 'single'}
            onChange={(e) => updateConfig('approvalMode', e.target.value)}
          >
            <option value="single">单人审批</option>
            <option value="countersign">会签（所有人同意）</option>
            <option value="orSign">或签（一人同意即可）</option>
            <option value="raceSign">竞签（先到先得）</option>
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>审批人</label>
          <UserSelector
            value={config.assignee}
            onChange={(value) => updateConfig('assignee', value)}
            mode="single"
            tenantId={tenantId}
            placeholder="选择审批人"
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>候选用户</label>
          <UserSelector
            value={config.candidateUsers}
            onChange={(value) => updateConfig('candidateUsers', value)}
            mode="multiple"
            tenantId={tenantId}
            placeholder="选择候选用户"
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>驳回动作</label>
          <select
            style={inputStyle}
            value={config.rejectAction || 'rejectToStart'}
            onChange={(e) => updateConfig('rejectAction', e.target.value)}
          >
            <option value="rejectToStart">驳回到发起人</option>
            <option value="rejectToPrevious">驳回到上一节点</option>
            <option value="rejectToEnd">直接结束</option>
          </select>
        </div>
      </>
    );

    const renderConditionConfig = () => (
      <>
        {renderBasicConfig()}
        <div style={fieldStyle}>
          <label style={labelStyle}>条件表达式</label>
          <ExpressionBindingTrigger
            value={config.conditionExpression}
            onChange={(val) => updateConfig('conditionExpression', val)}
            onClear={() => updateConfig('conditionExpression', undefined)}
            placeholder="点击设置条件表达式"
            expectedType="boolean"
            async={false}
          />
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            返回 true/false，决定流程走向
          </div>
        </div>
      </>
    );

    const renderTimerConfig = () => (
      <>
        {renderBasicConfig()}
        <div style={fieldStyle}>
          <label style={labelStyle}>延时类型</label>
          <select
            style={inputStyle}
            value={config.timerType || 'duration'}
            onChange={(e) => updateConfig('timerType', e.target.value)}
          >
            <option value="duration">固定时长</option>
            <option value="datetime">指定时间</option>
          </select>
        </div>
        {config.timerType === 'duration' && (
          <div style={fieldStyle}>
            <label style={labelStyle}>延时（分钟）</label>
            <VariableBindingTrigger
              value={config.duration}
              onChange={(val) => updateConfig('duration', val)}
              onClear={() => updateConfig('duration', undefined)}
              placeholder="输入分钟数或绑定变量"
              expectedType="number"
            />
          </div>
        )}
        {config.timerType === 'datetime' && (
          <div style={fieldStyle}>
            <label style={labelStyle}>执行时间</label>
            <VariableBindingTrigger
              value={config.executeAt}
              onChange={(val) => updateConfig('executeAt', val)}
              onClear={() => updateConfig('executeAt', undefined)}
              placeholder="选择时间或绑定变量"
              expectedType="string"
            />
          </div>
        )}
      </>
    );

    const renderNotifyConfig = () => (
      <>
        {renderBasicConfig()}
        <div style={fieldStyle}>
          <label style={labelStyle}>通知渠道</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['email', 'sms', 'wechat', 'dingtalk'].map((ch) => (
              <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="checkbox"
                  checked={(config.channels || []).includes(ch)}
                  onChange={(e) => {
                    const channels = config.channels || [];
                    updateConfig(
                      'channels',
                      e.target.checked
                        ? [...channels, ch]
                        : channels.filter((c: string) => c !== ch)
                    );
                  }}
                />
                {ch === 'email' ? '邮件' : ch === 'sms' ? '短信' : ch === 'wechat' ? '微信' : '钉钉'}
              </label>
            ))}
          </div>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>接收人</label>
          <VariableBindingTrigger
            value={config.receivers}
            onChange={(val) => updateConfig('receivers', val)}
            onClear={() => updateConfig('receivers', undefined)}
            placeholder="选择接收人或绑定变量"
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>通知内容</label>
          <ExpressionBindingTrigger
            value={config.content}
            onChange={(val) => updateConfig('content', val)}
            onClear={() => updateConfig('content', undefined)}
            placeholder="输入通知内容或绑定变量"
            async={false}
          />
        </div>
      </>
    );

    const renderServiceConfig = () => (
      <>
        {renderBasicConfig()}
        <div style={fieldStyle}>
          <label style={labelStyle}>执行表达式</label>
          <ExpressionBindingTrigger
            value={config.expression}
            onChange={(val) => updateConfig('expression', val)}
            onClear={() => updateConfig('expression', undefined)}
            placeholder="点击编写执行表达式"
            async={true}
          />
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            支持 <code>$fetch</code> 调用外部 API，<code>$table</code> 操作数据表
          </div>
        </div>
      </>
    );

    /**
     * 计算节点配置
     *
     * 支持两种模式：
     * - expression：自定义表达式（同步，不支持 $fetch 等异步操作）
     * - rule：选择运算中心定义的运算规则，传入参数执行
     */
    const renderCalculationConfig = () => (
      <>
        {renderBasicConfig()}
        <div style={fieldStyle}>
          <label style={labelStyle}>运算模式</label>
          <select
            style={inputStyle}
            value={config.calculationMode || 'expression'}
            onChange={(e) => {
              const mode = e.target.value;
              updateConfig('calculationMode', mode);
              // 切换模式时清除另一模式的配置
              if (mode === 'expression') {
                updateConfig('computationId', undefined);
                updateConfig('computationParams', undefined);
              } else {
                updateConfig('expression', undefined);
              }
            }}
          >
            <option value="expression">自定义表达式</option>
            <option value="rule">选择运算规则</option>
          </select>
        </div>

        {(config.calculationMode || 'expression') === 'expression' ? (
          <div style={fieldStyle}>
            <label style={labelStyle}>计算表达式</label>
            <ExpressionBindingTrigger
              value={config.expression}
              onChange={(val) => updateConfig('expression', val)}
              onClear={() => updateConfig('expression', undefined)}
              placeholder="点击编写计算表达式"
              expectedType="number"
              async={false}
            />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              同步表达式，支持 <code>$workflow</code> 引用上游节点结果
            </div>
          </div>
        ) : (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>运算规则</label>
              <ComputationSelector
                value={config.computationId}
                onChange={(val) => updateConfig('computationId', val)}
                appId={getAppId()}
                placeholder="选择运算规则"
              />
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                从运算中心选择已定义的规则，流程运行时传入参数执行
              </div>
            </div>

            {config.computationId && (
              <div style={fieldStyle}>
                <label style={labelStyle}>参数映射</label>
                <ComputationParamMapper
                  computationId={config.computationId}
                  value={config.computationParams}
                  onChange={(val) => updateConfig('computationParams', val)}
                  appId={getAppId()}
                />
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  将流程变量映射到运算规则的输入字段
                </div>
              </div>
            )}
          </>
        )}
      </>
    );

    /**
     * 数据操作节点配置
     *
     * create: 选择数据表 + 字段赋值（表字段 = 变量）
     * update: 选择数据表 + 匹配条件 + 字段赋值
     * delete: 选择数据表 + 匹配条件
     */
    const renderDataOperationConfig = (type: string) => (
      <>
        {renderBasicConfig()}
        <div style={fieldStyle}>
          <label style={labelStyle}>数据表</label>
          <CollectionSelector
            value={config.collection}
            onChange={(val) => updateConfig('collection', val)}
            placeholder="选择数据表"
          />
        </div>

        {/* 更新/删除：匹配条件（需先选表） */}
        {(type === 'update' || type === 'delete') && config.collection && (
          <div style={fieldStyle}>
            <label style={labelStyle}>匹配条件</label>
            <ConditionRowEditor
              value={config.filter || []}
              onChange={(val) => updateConfig('filter', val)}
              collectionId={config.collection}
            />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              匹配要{type === 'update' ? '更新' : '删除'}的记录
            </div>
          </div>
        )}

        {/* 创建/更新：字段赋值（需先选表） */}
        {(type === 'create' || type === 'update') && config.collection && (
          <div style={fieldStyle}>
            <label style={labelStyle}>{type === 'create' ? '字段赋值' : '更新字段'}</label>
            <FieldMappingEditor
              value={config.fields || []}
              onChange={(val) => updateConfig('fields', val)}
              collectionId={config.collection}
            />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              配置{type === 'create' ? '创建记录时' : '更新记录时'}各字段的值
            </div>
          </div>
        )}
      </>
    );

    return (
      <div style={{ padding: 16 }}>
        {renderConfigForm()}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button
            onClick={() => cancel?.()}
            style={{
              padding: '6px 16px',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '6px 16px',
              border: 'none',
              borderRadius: 4,
              background: '#1890ff',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            保存
          </button>
        </div>
      </div>
    );
  }
);

export default NodeConfigComponent;
