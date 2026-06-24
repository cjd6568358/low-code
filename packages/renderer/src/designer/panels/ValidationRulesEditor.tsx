/**
 * 校验规则编辑器
 *
 * 用于编辑表单字段的校验规则数组。
 * 支持添加、删除、编辑单条规则。
 */
import React, { useState, useCallback } from 'react';

/** 校验规则 */
interface ValidationRule {
  type?: string;
  required?: boolean;
  message?: string;
  min?: number;
  max?: number;
  len?: number;
  pattern?: string;
  whitespace?: boolean;
  warningOnly?: boolean;
}

/** 规则类型选项 */
const RULE_TYPE_OPTIONS = [
  { label: '字符串', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '布尔值', value: 'boolean' },
  { label: '整数', value: 'integer' },
  { label: '浮点数', value: 'float' },
  { label: '邮箱', value: 'email' },
  { label: 'URL', value: 'url' },
  { label: '手机号', value: 'tel' },
  { label: '正则', value: 'regexp' },
  { label: '枚举', value: 'enum' },
  { label: '日期', value: 'date' },
];

/** 组件属性 */
interface ValidationRulesEditorProps {
  /** 规则数组 */
  value?: ValidationRule[];
  /** 变更回调 */
  onChange?: (rules: ValidationRule[]) => void;
}

/** 单条规则编辑器 */
function RuleEditor({
  rule,
  onChange,
  onDelete,
}: {
  rule: ValidationRule;
  onChange: (rule: ValidationRule) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleChange = (key: keyof ValidationRule, value: any) => {
    onChange({ ...rule, [key]: value });
  };

  const summary = [
    rule.required ? '必填' : null,
    rule.type ? `类型:${rule.type}` : null,
    rule.min !== undefined ? `最小:${rule.min}` : null,
    rule.max !== undefined ? `最大:${rule.max}` : null,
    rule.pattern ? '正则' : null,
  ].filter(Boolean).join(', ') || '自定义规则';

  return (
    <div style={{
      border: '1px solid #d9d9d9',
      borderRadius: '4px',
      marginBottom: '8px',
      backgroundColor: '#fff',
    }}>
      {/* 规则摘要 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          cursor: 'pointer',
          fontSize: '12px',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ color: '#333' }}>{summary}</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              border: 'none', background: 'none', cursor: 'pointer',
              color: '#ff4d4f', fontSize: '12px', padding: '2px 4px',
            }}
          >
            删除
          </button>
          <span style={{ color: '#999' }}>{expanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {/* 展开编辑 */}
      {expanded && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0', fontSize: '12px' }}>
          {/* 必填 */}
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ width: '60px', color: '#666' }}>必填</label>
            <input
              type="checkbox"
              checked={rule.required || false}
              onChange={(e) => handleChange('required', e.target.checked)}
            />
          </div>

          {/* 规则类型 */}
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ width: '60px', color: '#666' }}>类型</label>
            <select
              value={rule.type || ''}
              onChange={(e) => handleChange('type', e.target.value || undefined)}
              style={{ flex: 1, padding: '2px 4px', border: '1px solid #d9d9d9', borderRadius: '2px' }}
            >
              <option value="">不限</option>
              {RULE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 提示信息 */}
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ width: '60px', color: '#666' }}>提示</label>
            <input
              type="text"
              value={rule.message || ''}
              onChange={(e) => handleChange('message', e.target.value || undefined)}
              placeholder="校验失败提示信息"
              style={{ flex: 1, padding: '2px 4px', border: '1px solid #d9d9d9', borderRadius: '2px' }}
            />
          </div>

          {/* 最小值/长度 */}
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ width: '60px', color: '#666' }}>最小</label>
            <input
              type="number"
              value={rule.min ?? ''}
              onChange={(e) => handleChange('min', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="最小值/长度"
              style={{ flex: 1, padding: '2px 4px', border: '1px solid #d9d9d9', borderRadius: '2px' }}
            />
          </div>

          {/* 最大值/长度 */}
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ width: '60px', color: '#666' }}>最大</label>
            <input
              type="number"
              value={rule.max ?? ''}
              onChange={(e) => handleChange('max', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="最大值/长度"
              style={{ flex: 1, padding: '2px 4px', border: '1px solid #d9d9d9', borderRadius: '2px' }}
            />
          </div>

          {/* 正则表达式 */}
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ width: '60px', color: '#666' }}>正则</label>
            <input
              type="text"
              value={rule.pattern || ''}
              onChange={(e) => handleChange('pattern', e.target.value || undefined)}
              placeholder="正则表达式"
              style={{ flex: 1, padding: '2px 4px', border: '1px solid #d9d9d9', borderRadius: '2px' }}
            />
          </div>

          {/* 警告模式 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ width: '60px', color: '#666' }}>警告模式</label>
            <input
              type="checkbox"
              checked={rule.warningOnly || false}
              onChange={(e) => handleChange('warningOnly', e.target.checked)}
            />
            <span style={{ color: '#999', fontSize: '11px' }}>开启后校验失败不阻塞提交</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** 校验规则编辑器 */
export function ValidationRulesEditor({ value = [], onChange }: ValidationRulesEditorProps) {
  const handleAdd = useCallback(() => {
    const newRule: ValidationRule = { required: true, message: '此字段为必填项' };
    onChange?.([...value, newRule]);
  }, [value, onChange]);

  const handleUpdate = useCallback((index: number, rule: ValidationRule) => {
    const newRules = [...value];
    newRules[index] = rule;
    onChange?.(newRules);
  }, [value, onChange]);

  const handleDelete = useCallback((index: number) => {
    const newRules = value.filter((_, i) => i !== index);
    onChange?.(newRules);
  }, [value, onChange]);

  return (
    <div>
      {value.map((rule, index) => (
        <RuleEditor
          key={index}
          rule={rule}
          onChange={(r) => handleUpdate(index, r)}
          onDelete={() => handleDelete(index)}
        />
      ))}
      <button
        onClick={handleAdd}
        style={{
          width: '100%',
          padding: '6px',
          border: '1px dashed #d9d9d9',
          borderRadius: '4px',
          backgroundColor: '#fafafa',
          cursor: 'pointer',
          fontSize: '12px',
          color: '#1890ff',
        }}
      >
        + 添加校验规则
      </button>
    </div>
  );
}
