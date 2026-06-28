/**
 * 任务列表组件
 *
 * 展示待办/已办/我发起的任务列表。
 */

import React, { useState, useEffect } from 'react';

/** 任务列表属性 */
export interface TaskListProps {
  /** 任务类型 */
  type: 'pending' | 'completed' | 'initiated';
  /** 任务列表数据 */
  tasks?: any[];
  /** 加载状态 */
  loading?: boolean;
  /** 点击任务回调 */
  onTaskClick?: (task: any) => void;
  /** 审批回调 */
  onApprove?: (taskId: string) => void;
  /** 驳回回调 */
  onReject?: (taskId: string) => void;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/** 状态标签颜色 */
const STATUS_COLORS: Record<string, string> = {
  pending: '#faad14',
  completed: '#52c41a',
  rejected: '#ff4d4f',
  cancelled: '#999',
  transferred: '#1890ff',
};

/** 状态标签文本 */
const STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  completed: '已通过',
  rejected: '已驳回',
  cancelled: '已取消',
  transferred: '已转办',
};

/**
 * 任务列表组件
 */
export const TaskList: React.FC<TaskListProps> = ({
  type,
  tasks = [],
  loading = false,
  onTaskClick,
  onApprove,
  onReject,
  style,
}) => {
  // 格式化时间
  const formatTime = (time?: string): string => {
    if (!time) return '-';
    const date = new Date(time);
    return date.toLocaleString('zh-CN');
  };

  // 获取任务状态标签
  const getStatusBadge = (status: string) => {
    const color = STATUS_COLORS[status] || '#999';
    const label = STATUS_LABELS[status] || status;

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 12,
          color: '#fff',
          background: color,
        }}
      >
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: 'center',
          color: '#999',
          ...style,
        }}
      >
        加载中...
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: 'center',
          color: '#999',
          ...style,
        }}
      >
        暂无数据
      </div>
    );
  }

  return (
    <div style={{ ...style }}>
      {tasks.map((task, index) => (
        <div
          key={task.id || index}
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
            cursor: onTaskClick ? 'pointer' : 'default',
            transition: 'background 0.2s',
          }}
          onClick={() => onTaskClick?.(task)}
          onMouseEnter={(e) => {
            if (onTaskClick) {
              e.currentTarget.style.background = '#f5f5f5';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff';
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 8,
            }}
          >
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>
                {task.nodeName || '审批任务'}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {task.processInfo?.workflowName || task.workflowKey || ''}
              </div>
            </div>
            {getStatusBadge(task.status)}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: '#999',
            }}
          >
            <div>
              {type === 'pending' && task.assigneeName && (
                <span>审批人: {task.assigneeName}</span>
              )}
              {type === 'completed' && task.completedByName && (
                <span>处理人: {task.completedByName}</span>
              )}
              {type === 'initiated' && task.startedByName && (
                <span>发起人: {task.startedByName}</span>
              )}
            </div>
            <div>
              {type === 'pending'
                ? formatTime(task.createdAt)
                : formatTime(task.completedAt || task.createdAt)}
            </div>
          </div>

          {task.comment && (
            <div
              style={{
                marginTop: 8,
                padding: '6px 10px',
                background: '#fafafa',
                borderRadius: 4,
                fontSize: 12,
                color: '#666',
              }}
            >
              意见: {task.comment}
            </div>
          )}

          {/* 待办任务操作按钮 */}
          {type === 'pending' && task.status === 'pending' && (
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
              }}
            >
              {onReject && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject(task.id);
                  }}
                  style={{
                    padding: '4px 12px',
                    border: '1px solid #ff4d4f',
                    borderRadius: 4,
                    background: '#fff',
                    color: '#ff4d4f',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  驳回
                </button>
              )}
              {onApprove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove(task.id);
                  }}
                  style={{
                    padding: '4px 12px',
                    border: 'none',
                    borderRadius: 4,
                    background: '#52c41a',
                    color: '#fff',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  通过
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TaskList;
