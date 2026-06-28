/**
 * 审批表单组件
 *
 * 用于审批人查看和填写审批信息。
 */

import React, { useState, useEffect } from 'react';

/** 审批表单属性 */
export interface ApprovalFormProps {
  /** 任务 ID */
  taskId: string;
  /** 任务数据 */
  task?: any;
  /** 流程实例数据 */
  instance?: any;
  /** 表单配置 */
  formConfig?: any;
  /** 审批回调 */
  onApprove?: (data: { formData?: any; comment?: string }) => void;
  /** 驳回回调 */
  onReject?: (data: { comment: string }) => void;
  /** 转办回调 */
  onTransfer?: (data: { targetUserId: string; reason?: string }) => void;
  /** 是否只读 */
  readonly?: boolean;
}

/** 输入框通用样式 */
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  fontSize: 13,
  lineHeight: 1.5,
};

/**
 * 审批表单组件
 */
export const ApprovalForm: React.FC<ApprovalFormProps> = ({
  taskId,
  task,
  instance,
  formConfig,
  onApprove,
  onReject,
  onTransfer,
  readonly = false,
}) => {
  const [formData, setFormData] = useState<any>({});
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (task?.formData) {
      setFormData(task.formData);
    } else if (instance?.variables) {
      setFormData(instance.variables);
    }
  }, [task, instance]);

  // 审批通过
  const handleApprove = async () => {
    if (!onApprove) return;

    setLoading(true);
    try {
      await onApprove({ formData, comment });
    } finally {
      setLoading(false);
    }
  };

  // 驳回
  const handleReject = async () => {
    if (!onReject) return;

    if (!comment.trim()) {
      alert('请填写驳回意见');
      return;
    }

    setLoading(true);
    try {
      await onReject({ comment });
    } finally {
      setLoading(false);
    }
  };

  // 渲染表单字段
  const renderFormField = (key: string, value: any, config?: any) => {
    const fieldConfig = config || {};
    const permission = fieldConfig.permission || 'readonly';
    const label = fieldConfig.label || key;

    if (permission === 'hidden') {
      return null;
    }

    const isReadonly = permission === 'readonly' || readonly;

    return (
      <div key={key} style={{ marginBottom: 16 }}>
        <label
          style={{
            display: 'block',
            marginBottom: 4,
            fontSize: 13,
            fontWeight: 500,
            color: '#333',
          }}
        >
          {label}
          {fieldConfig.validation?.required && (
            <span style={{ color: '#ff4d4f', marginLeft: 4 }}>*</span>
          )}
        </label>

        {typeof value === 'object' ? (
          <pre
            style={{
              ...inputStyle,
              background: '#f5f5f5',
              minHeight: 60,
              overflow: 'auto',
            }}
          >
            {JSON.stringify(value, null, 2)}
          </pre>
        ) : (
          <input
            style={{
              ...inputStyle,
              background: isReadonly ? '#f5f5f5' : '#fff',
            }}
            value={value ?? ''}
            readOnly={isReadonly}
            onChange={(e) => {
              if (!isReadonly) {
                setFormData((prev: any) => ({
                  ...prev,
                  [key]: e.target.value,
                }));
              }
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 20 }}>
      {/* 任务信息 */}
      <div
        style={{
          background: '#f0f5ff',
          padding: 16,
          borderRadius: 4,
          marginBottom: 20,
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16 }}>
          {task?.nodeName || '审批任务'}
        </h3>
        <div style={{ fontSize: 13, color: '#666' }}>
          <div>发起人: {instance?.startedByName || instance?.startedBy || '未知'}</div>
          <div>发起时间: {instance?.startedAt || '未知'}</div>
        </div>
      </div>

      {/* 表单数据 */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ marginBottom: 12, fontSize: 14 }}>表单数据</h4>
        {Object.entries(formData).map(([key, value]) =>
          renderFormField(key, value)
        )}
      </div>

      {/* 审批意见 */}
      {!readonly && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 12, fontSize: 14 }}>审批意见</h4>
          <textarea
            style={{
              ...inputStyle,
              minHeight: 80,
              resize: 'vertical',
            }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="请输入审批意见..."
          />
        </div>
      )}

      {/* 操作按钮 */}
      {!readonly && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            paddingTop: 16,
            borderTop: '1px solid #e8e8e8',
          }}
        >
          {onReject && (
            <button
              onClick={handleReject}
              disabled={loading}
              style={{
                padding: '8px 24px',
                border: '1px solid #ff4d4f',
                borderRadius: 4,
                background: '#fff',
                color: '#ff4d4f',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              驳回
            </button>
          )}

          {onApprove && (
            <button
              onClick={handleApprove}
              disabled={loading}
              style={{
                padding: '8px 24px',
                border: 'none',
                borderRadius: 4,
                background: '#52c41a',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '处理中...' : '同意'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ApprovalForm;
