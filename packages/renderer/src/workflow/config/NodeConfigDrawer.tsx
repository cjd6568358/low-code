/**
 * 节点配置抽屉
 *
 * 用于配置节点的详细属性，如审批人、条件表达式等。
 */

import React, { useState, useEffect } from 'react';
import type { INode } from 'react-flow-builder';

/** 节点配置抽屉属性 */
export interface NodeConfigDrawerProps {
  /** 是否可见 */
  visible: boolean;
  /** 当前节点 */
  node: INode | null;
  /** 关闭回调 */
  onClose: () => void;
  /** 保存回调 */
  onSave: (nodeId: string, config: any) => void;
}

/** 输入框通用样式 */
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  fontSize: 13,
  lineHeight: 1.5,
};

/** 标签样式 */
const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: 13,
  fontWeight: 500,
  color: '#333',
};

/** 字段容器样式 */
const fieldStyle: React.CSSProperties = {
  marginBottom: 16,
};

/**
 * 节点配置抽屉组件
 */
export const NodeConfigDrawer: React.FC<NodeConfigDrawerProps> = ({
  visible,
  node,
  onClose,
  onSave,
}) => {
  const [config, setConfig] = useState<any>({});

  // 初始化配置
  useEffect(() => {
    if (node) {
      setConfig({
        name: node.name || '',
        ...(node as any),
      });
    }
  }, [node]);

  if (!visible || !node) {
    return null;
  }

  const handleSave = () => {
    onSave(node.id, config);
  };

  const updateConfig = (key: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  // 根据节点类型渲染不同的配置表单
  const renderConfigForm = () => {
    const nodeType = (node as any).type || (node as any).$type;

    switch (nodeType) {
      case 'approval':
      case 'bpmn:UserTask':
        return renderApprovalConfig();
      case 'condition':
      case 'bpmn:ExclusiveGateway':
        return renderConditionConfig();
      case 'timer':
        return renderTimerConfig();
      case 'notify':
        return renderNotifyConfig();
      case 'service':
        return renderServiceConfig();
      default:
        return renderBasicConfig();
    }
  };

  // 基础配置表单
  const renderBasicConfig = () => (
    <>
      <div style={fieldStyle}>
        <label style={labelStyle}>节点名称</label>
        <input
          style={inputStyle}
          value={config.name || ''}
          onChange={(e) => updateConfig('name', e.target.value)}
          placeholder="请输入节点名称"
        />
      </div>
    </>
  );

  // 审批节点配置表单
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
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>审批人</label>
        <input
          style={inputStyle}
          value={config.assignee || ''}
          onChange={(e) => updateConfig('assignee', e.target.value)}
          placeholder="用户ID 或 ${变量}"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>候选用户（逗号分隔）</label>
        <input
          style={inputStyle}
          value={config.candidateUsers || ''}
          onChange={(e) => updateConfig('candidateUsers', e.target.value)}
          placeholder="user1, user2"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>候选组</label>
        <input
          style={inputStyle}
          value={config.candidateGroups || ''}
          onChange={(e) => updateConfig('candidateGroups', e.target.value)}
          placeholder="group1, group2"
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
          <option value="rejectToNode">驳回到指定节点</option>
          <option value="rejectToEnd">直接结束流程</option>
        </select>
      </div>

      {config.rejectAction === 'rejectToNode' && (
        <div style={fieldStyle}>
          <label style={labelStyle}>驳回目标节点 ID</label>
          <input
            style={inputStyle}
            value={config.rejectTargetNodeId || ''}
            onChange={(e) => updateConfig('rejectTargetNodeId', e.target.value)}
            placeholder="请输入节点 ID"
          />
        </div>
      )}

      <div style={fieldStyle}>
        <label style={labelStyle}>截止时间</label>
        <input
          style={inputStyle}
          type="datetime-local"
          value={config.dueDate || ''}
          onChange={(e) => updateConfig('dueDate', e.target.value)}
        />
      </div>
    </>
  );

  // 条件节点配置表单
  const renderConditionConfig = () => (
    <>
      {renderBasicConfig()}

      <div style={fieldStyle}>
        <label style={labelStyle}>条件表达式</label>
        <textarea
          style={{
            ...inputStyle,
            fontFamily: 'monospace',
            fontSize: 12,
            minHeight: 80,
          }}
          value={config.conditionExpression || ''}
          onChange={(e) => updateConfig('conditionExpression', e.target.value)}
          placeholder={'${amount > 10000}\n${status == "approved"}'}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>条件描述</label>
        <input
          style={inputStyle}
          value={config.conditionDescription || ''}
          onChange={(e) => updateConfig('conditionDescription', e.target.value)}
          placeholder="条件说明"
        />
      </div>
    </>
  );

  // 延时节点配置表单
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
          <option value="cron">定时任务</option>
        </select>
      </div>

      {config.timerType === 'duration' && (
        <div style={fieldStyle}>
          <label style={labelStyle}>延时时长（分钟）</label>
          <input
            style={inputStyle}
            type="number"
            value={config.duration ? config.duration / 60000 : ''}
            onChange={(e) => updateConfig('duration', Number(e.target.value) * 60000)}
            placeholder="30"
          />
        </div>
      )}

      {config.timerType === 'datetime' && (
        <div style={fieldStyle}>
          <label style={labelStyle}>执行时间</label>
          <input
            style={inputStyle}
            type="datetime-local"
            value={config.executeAt || ''}
            onChange={(e) => updateConfig('executeAt', e.target.value)}
          />
        </div>
      )}

      {config.timerType === 'cron' && (
        <div style={fieldStyle}>
          <label style={labelStyle}>Cron 表达式</label>
          <input
            style={inputStyle}
            value={config.cron || ''}
            onChange={(e) => updateConfig('cron', e.target.value)}
            placeholder="0 0 9 * * ?"
          />
        </div>
      )}
    </>
  );

  // 通知节点配置表单
  const renderNotifyConfig = () => (
    <>
      {renderBasicConfig()}

      <div style={fieldStyle}>
        <label style={labelStyle}>通知渠道</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['email', 'sms', 'wechat', 'dingtalk'].map((channel) => (
            <label key={channel} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="checkbox"
                checked={(config.channels || []).includes(channel)}
                onChange={(e) => {
                  const channels = config.channels || [];
                  if (e.target.checked) {
                    updateConfig('channels', [...channels, channel]);
                  } else {
                    updateConfig('channels', channels.filter((c: string) => c !== channel));
                  }
                }}
              />
              {channel === 'email' ? '邮件' :
               channel === 'sms' ? '短信' :
               channel === 'wechat' ? '微信' : '钉钉'}
            </label>
          ))}
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>接收人（逗号分隔）</label>
        <input
          style={inputStyle}
          value={config.receivers || ''}
          onChange={(e) => updateConfig('receivers', e.target.value)}
          placeholder="user1, user2"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>通知标题</label>
        <input
          style={inputStyle}
          value={config.title || ''}
          onChange={(e) => updateConfig('title', e.target.value)}
          placeholder="通知标题"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>通知内容</label>
        <textarea
          style={{ ...inputStyle, minHeight: 60 }}
          value={config.content || ''}
          onChange={(e) => updateConfig('content', e.target.value)}
          placeholder="通知内容"
        />
      </div>
    </>
  );

  // 服务节点配置表单
  const renderServiceConfig = () => (
    <>
      {renderBasicConfig()}

      <div style={fieldStyle}>
        <label style={labelStyle}>服务类型</label>
        <select
          style={inputStyle}
          value={config.serviceType || 'api'}
          onChange={(e) => updateConfig('serviceType', e.target.value)}
        >
          <option value="api">API 调用</option>
          <option value="database">数据库操作</option>
          <option value="webhook">Webhook</option>
          <option value="custom">自定义</option>
        </select>
      </div>

      {config.serviceType === 'api' && (
        <>
          <div style={fieldStyle}>
            <label style={labelStyle}>请求 URL</label>
            <input
              style={inputStyle}
              value={config.apiUrl || ''}
              onChange={(e) => updateConfig('apiUrl', e.target.value)}
              placeholder="/api/xxx 或 ${变量}"
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>请求方法</label>
            <select
              style={inputStyle}
              value={config.apiMethod || 'GET'}
              onChange={(e) => updateConfig('apiMethod', e.target.value)}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </>
      )}
    </>
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 360,
        height: '100%',
        background: '#fff',
        borderLeft: '1px solid #e8e8e8',
        boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      {/* 头部 */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e8e8e8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 'bold', fontSize: 14 }}>节点配置</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 18,
            cursor: 'pointer',
            color: '#999',
          }}
        >
          ×
        </button>
      </div>

      {/* 内容 */}
      <div
        style={{
          flex: 1,
          padding: 16,
          overflowY: 'auto',
        }}
      >
        {renderConfigForm()}
      </div>

      {/* 底部 */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e8e8e8',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
        }}
      >
        <button
          onClick={onClose}
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
};

export default NodeConfigDrawer;
