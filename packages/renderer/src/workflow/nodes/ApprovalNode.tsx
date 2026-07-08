/**
 * 审批节点展示组件
 */

import React, { useContext } from 'react';
import { NodeContext } from 'react-flow-builder';
import type { AssigneeStrategy } from '../../components/AssigneeSelector/types';

/** 审批模式标签 */
const MODE_LABELS: Record<string, string> = {
  single: '单人',
  countersign: '会签',
  orSign: '或签',
  raceSign: '竞签',
};

/** 指派策略类型标签 */
const STRATEGY_TYPE_LABELS: Record<string, string> = {
  user: '指定人员',
  role: '按角色',
  department: '按部门',
  position: '按岗位',
};

/**
 * 格式化指派策略为可读文本
 */
function formatAssignee(assignee: AssigneeStrategy | undefined): string {
  if (!assignee) return '未设置';
  const label = STRATEGY_TYPE_LABELS[assignee.type] || assignee.type;
  let count = 0;
  switch (assignee.type) {
    case 'user': count = assignee.userIds.length; break;
    case 'role': count = assignee.roleIds.length; break;
    case 'department': count = assignee.deptIds.length; break;
    case 'position': count = assignee.positionIds.length; break;
  }
  return `${label}（${count}项）`;
}

/** 审批节点展示组件 */
export const ApprovalNodeDisplay: React.FC = () => {
  const node = useContext(NodeContext) as any;
  const data = node.data || {};

  const approvalMode = data.approvalMode || 'single';
  const assignee = data.assignee as AssigneeStrategy | undefined;

  return (
    <div
      style={{
        width: 180,
        minHeight: 70,
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
          marginBottom: 6,
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
          {data.name || node.name || '审批节点'}
        </span>
      </div>

      <div style={{ fontSize: 11, color: '#666' }}>
        <div>模式: {MODE_LABELS[approvalMode] || approvalMode}</div>
        <div>审批人: {formatAssignee(assignee)}</div>
      </div>
    </div>
  );
};

export default ApprovalNodeDisplay;
