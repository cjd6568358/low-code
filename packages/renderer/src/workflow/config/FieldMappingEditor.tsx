/**
 * 字段映射编辑器
 *
 * 三列布局：表字段（只读） | = | 变量选择器
 * 选表后自动列出全部字段，用户只需为每个字段绑定变量值。
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VariableTreeSelector } from '../../components/VariableTreeSelector';

/** 字段映射项 */
export interface FieldMappingItem {
  /** 表字段名 */
  field: string;
  /** 绑定值（变量路径） */
  value: string;
}

/** 字段映射编辑器属性 */
export interface FieldMappingEditorProps {
  /** 当前映射值 */
  value?: FieldMappingItem[];
  /** 变更回调 */
  onChange: (value: FieldMappingItem[]) => void;
  /** 数据表 ID */
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

const variableTriggerStyle: React.CSSProperties = {
  flex: 1,
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

const equalsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  flexShrink: 0,
  fontSize: 14,
  fontWeight: 500,
  color: '#666',
};

const fieldNameStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 13,
  padding: '6px 0',
  color: '#333',
};

const fieldTypeTagStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#999',
  marginLeft: 4,
};

/** 获取应用 ID */
function getAppId(): string {
  const match = window.location.pathname.match(/\/app\/([^/]+)/);
  return match ? match[1] : '';
}

/**
 * 字段映射编辑器
 *
 * 选表后自动列出全部字段，三列布局：字段名 | = | 变量选择器
 */
export function FieldMappingEditor({
  value = [],
  onChange,
  collectionId,
  appId: externalAppId,
}: FieldMappingEditorProps) {
  const [fields, setFields] = useState<TableField[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectorIndex, setSelectorIndex] = useState<number | null>(null);
  const appId = externalAppId || getAppId();

  // 用 ref 保持最新引用，避免 useEffect 闭包过期
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // 加载数据表字段，选表后自动列出全部字段
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
          const tableFields: TableField[] = data.resource.columns.map((col: any) => ({
            fieldName: col.fieldName,
            fieldType: col.fieldType,
            description: col.description,
          }));
          setFields(tableFields);

          // 用表字段初始化 value，保留已有绑定
          const existingMap = new Map(valueRef.current.map((v) => [v.field, v.value]));
          const newValue: FieldMappingItem[] = tableFields.map((f) => ({
            field: f.fieldName,
            value: existingMap.get(f.fieldName) || '',
          }));

          // 仅当实际有变化时才通知父组件
          const changed =
            newValue.length !== valueRef.current.length ||
            newValue.some((item, i) =>
              item.field !== valueRef.current[i]?.field ||
              item.value !== valueRef.current[i]?.value
            );
          if (changed) {
            onChangeRef.current(newValue);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [collectionId, appId]);

  /** 变量选择确认 */
  const handleVariableChange = useCallback(
    (val: { type: 'variable'; value: string }) => {
      if (selectorIndex === null) return;
      const updated = value.map((item, i) =>
        i === selectorIndex ? { ...item, value: val.value } : item
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
        i === index ? { ...item, value: '' } : item
      );
      onChange(updated);
    },
    [value, onChange]
  );

  // 构建字段类型查找表（按 fieldName 索引）
  const fieldTypeMap = new Map(fields.map((f) => [f.fieldName, f.fieldType]));

  if (value.length === 0) {
    return loading
      ? <div style={{ color: '#999', fontSize: 13 }}>加载字段中...</div>
      : null;
  }

  return (
    <div>
      {loading && (
        <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>加载字段类型中...</div>
      )}

      {/* 映射行：基于 value 渲染，字段类型从 fields 查找 */}
      {value.map((item, index) => (
        <div
          key={item.field}
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 4,
            alignItems: 'center',
          }}
        >
          {/* 左列：字段名（只读） */}
          <div style={fieldNameStyle}>
            {item.field}
            {fieldTypeMap.has(item.field) && (
              <span style={fieldTypeTagStyle}>{fieldTypeMap.get(item.field)}</span>
            )}
          </div>

          {/* 中列：等号 */}
          <div style={equalsStyle}>=</div>

          {/* 右列：变量选择器 */}
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
        </div>
      ))}

      {/* 变量选择器弹窗 */}
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

export default FieldMappingEditor;
