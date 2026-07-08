/**
 * 条件行编辑器
 *
 * 三列布局：表字段 | 操作符 | 变量选择器
 * 用于更新记录/删除记录节点配置匹配条件。
 */

import React, { useState, useEffect, useCallback } from 'react';
import { VariableTreeSelector } from '../../components/VariableTreeSelector';

/** 条件项 */
export interface ConditionItem {
  /** 表字段名 */
  field: string;
  /** 操作符 */
  operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'like' | 'in';
  /** 绑定值（变量路径或常量） */
  value: string;
  /** 绑定类型 */
  valueType: 'variable' | 'constant';
}

/** 条件行编辑器属性 */
export interface ConditionRowEditorProps {
  /** 当前条件值 */
  value?: ConditionItem[];
  /** 变更回调 */
  onChange: (value: ConditionItem[]) => void;
  /** 数据表 ID（用于加载字段列表） */
  collectionId?: string;
  /** 应用 ID */
  appId?: string;
}

/** 表字段信息 */
interface TableField {
  fieldName: string;
  fieldType: string;
  description?: string;
}

/** 操作符选项 */
const OPERATORS = [
  { value: '=', label: '=' },
  { value: '!=', label: '≠' },
  { value: '>', label: '>' },
  { value: '>=', label: '≥' },
  { value: '<', label: '<' },
  { value: '<=', label: '≤' },
  { value: 'like', label: '包含' },
  { value: 'in', label: '在...中' },
];

/** 输入框样式 */
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  fontSize: 13,
};

/** 按钮样式 */
const addBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  border: '1px dashed #d9d9d9',
  borderRadius: 4,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 12,
  width: '100%',
};

const removeBtnStyle: React.CSSProperties = {
  padding: '4px 8px',
  border: '1px solid #ff4d4f',
  borderRadius: 4,
  background: '#fff',
  color: '#ff4d4f',
  cursor: 'pointer',
  fontSize: 12,
  flexShrink: 0,
};

const variableTriggerStyle: React.CSSProperties = {
  flex: 2,
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

const placeholderStyle: React.CSSProperties = {
  color: '#999',
  fontSize: 13,
};

/** 获取应用 ID */
function getAppId(): string {
  const match = window.location.pathname.match(/\/app\/([^/]+)/);
  return match ? match[1] : '';
}

/**
 * 条件行编辑器
 *
 * 三列布局：表字段 | 操作符 | 变量选择器
 */
export function ConditionRowEditor({
  value = [],
  onChange,
  collectionId,
  appId: externalAppId,
}: ConditionRowEditorProps) {
  const [fields, setFields] = useState<TableField[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectorIndex, setSelectorIndex] = useState<number | null>(null);
  const appId = externalAppId || getAppId();

  // 加载数据表字段
  useEffect(() => {
    if (!collectionId || !appId) {
      setFields([]);
      return;
    }

    setLoading(true);
    fetch(`/api/apps/${appId}/tables/${collectionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.resource?.columns) {
          setFields(
            data.resource.columns.map((col: any) => ({
              fieldName: col.fieldName,
              fieldType: col.fieldType,
              description: col.description,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [collectionId, appId]);

  /** 添加条件行 */
  const handleAdd = useCallback(() => {
    onChange([...value, { field: '', operator: '=', value: '', valueType: 'variable' }]);
  }, [value, onChange]);

  /** 删除条件行 */
  const handleRemove = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  /** 更新字段名 */
  const handleFieldChange = useCallback(
    (index: number, fieldName: string) => {
      const updated = value.map((item, i) =>
        i === index ? { ...item, field: fieldName } : item
      );
      onChange(updated);
    },
    [value, onChange]
  );

  /** 更新操作符 */
  const handleOperatorChange = useCallback(
    (index: number, operator: ConditionItem['operator']) => {
      const updated = value.map((item, i) =>
        i === index ? { ...item, operator } : item
      );
      onChange(updated);
    },
    [value, onChange]
  );

  /** 变量选择确认 */
  const handleVariableChange = useCallback(
    (val: { type: 'variable'; value: string }) => {
      if (selectorIndex === null) return;
      const updated = value.map((item, i) =>
        i === selectorIndex
          ? { ...item, value: val.value, valueType: 'variable' as const }
          : item
      );
      onChange(updated);
      setSelectorIndex(null);
    },
    [selectorIndex, value, onChange]
  );

  /** 清除变量绑定 */
  const handleClearVariable = useCallback(
    (index: number) => {
      const updated = value.map((item, i) =>
        i === index ? { ...item, value: '', valueType: 'variable' as const } : item
      );
      onChange(updated);
    },
    [value, onChange]
  );

  return (
    <div>
      {/* 表头 */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 8,
          alignItems: 'center',
          fontSize: 12,
          color: '#999',
        }}
      >
        <div style={{ flex: 2 }}>字段</div>
        <div style={{ flex: 1 }}>操作符</div>
        <div style={{ flex: 2 }}>值</div>
        <div style={{ width: 32 }}></div>
      </div>

      {/* 条件行 */}
      {value.map((item, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 4,
            alignItems: 'center',
          }}
        >
          {/* 左列：表字段选择 */}
          <select
            style={{ ...inputStyle, flex: 2, marginBottom: 0 }}
            value={item.field}
            onChange={(e) => handleFieldChange(index, e.target.value)}
            disabled={loading}
          >
            <option value="">
              {loading ? '加载中...' : '选择字段'}
            </option>
            {fields.map((f) => (
              <option key={f.fieldName} value={f.fieldName}>
                {f.fieldName}
                {f.description ? ` (${f.description})` : ''}
              </option>
            ))}
          </select>

          {/* 中列：操作符选择 */}
          <select
            style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
            value={item.operator}
            onChange={(e) =>
              handleOperatorChange(index, e.target.value as ConditionItem['operator'])
            }
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>

          {/* 右列：变量选择器触发器 */}
          <div
            style={variableTriggerStyle}
            onClick={() => setSelectorIndex(index)}
          >
            {item.value ? (
              <span style={variableTagStyle} title={item.value}>
                🔗 {item.value}
              </span>
            ) : (
              <span style={placeholderStyle}>选择变量</span>
            )}
            <span style={{ fontSize: 10, color: '#999' }}>▼</span>
          </div>

          {/* 删除按钮 */}
          <button
            type="button"
            style={removeBtnStyle}
            onClick={() => handleRemove(index)}
          >
            删除
          </button>
        </div>
      ))}

      {/* 添加按钮 */}
      <button type="button" style={addBtnStyle} onClick={handleAdd}>
        + 添加条件
      </button>

      {/* 变量选择器弹窗（共享一个实例） */}
      {selectorIndex !== null && (
        <VariableTreeSelector
          visible={true}
          value={value[selectorIndex]?.value || ''}
          onChange={handleVariableChange}
          onClear={() => handleClearVariable(selectorIndex)}
          onClose={() => setSelectorIndex(null)}
          leafOnly
        />
      )}
    </div>
  );
}

export default ConditionRowEditor;
