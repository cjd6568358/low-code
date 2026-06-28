/**
 * 审批节点展示组件
 */

import React, { useContext } from 'react';
import { NodeContext } from 'react-flow-builder';

/** 审批节点展示组件 */
export const ApprovalNodeDisplay: React.FC = () => {
  const node = useContext(NodeContext) as any;

  // 获取审批配置
  const approvalMode = node.approvalMode || 'single';
  const assignee = node.assignee || '未指定';

  // 审批模式标签
  const modeLabels: Record<string, string> = {
    single: '单人',
    countersign: '会签',
    orSign: '或签',
  };

  return (
    <div
      style={{
        width: 200,
        minHeight: 80,
        background: '#fff',
        border: '1px solid #d9d9d9',
        borderRadius: 4,
        padding: '12px',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 20,
            height: 20,
            borderRadius: 4,
            background: '#52c41a',
            marginRight: 8,
            textAlign: 'center',
            lineHeight: '20px',
            color: '#fff',
            fontSize: 12,
          }}
        >
          ✓
        </span>
        <span style={{ fontWeight: 'bold', fontSize: 13 }}>
          {node.name || '审批节点'}
        </span>
      </div>

      <div style={{ fontSize: 11, color: '#666' }}>
        <div>模式: {modeLabels[approvalMode] || approvalMode}</div>
        <div>审批人: {assignee}</div>
      </div>
    </div>
  );
};

export default ApprovalNodeDisplay;
