/**
 * 跨字段校验规则编辑器
 *
 * 配置 Form 组件的 `props.crossFieldRules`。
 * antd 的 Form.Item rules 只能表达单字段约束，涉及「字段之间关系」的校验
 * （日期区间、合计一致、互不相同…）由运行时 ValidationEngine 的 Level 3 求值。
 *
 * 与 `ValidationRulesEditor` 的区别：
 * - `ValidationRulesEditor` 编辑单个字段的 rules（挂在组件节点 props 上）
 * - 本编辑器编辑表单级的跨字段规则（挂在 Form 节点 props 上）
 */
import React, { useCallback } from 'react';
import type { CrossFieldRule, CrossFieldValidatorType } from '@low-code/shared';
import { generateHexId } from '@low-code/shared';
import { BUILTIN_CROSS_FIELD_VALIDATORS } from '../../core/ValidationEngine';

/** 可被校验的字段选项 */
export interface CrossFieldFieldOption {
  /** 字段名（表单组件 ID） */
  value: string;
  /** 显示名（组件标签或类型） */
  label: string;
}

/** 组件属性 */
export interface CrossFieldRulesEditorProps {
  /** 规则数组 */
  value?: CrossFieldRule[];
  /** 变更回调 */
  onChange?: (rules: CrossFieldRule[]) => void;
  /** 可选字段列表（来自表单内的子组件） */
  fields?: CrossFieldFieldOption[];
}

/** ─── 样式 ────────────────────────────────────────────── */

const cardStyle: React.CSSProperties = {
  border: '1px solid #e8e8e8',
  borderRadius: 4,
  padding: 8,
  marginBottom: 8,
  backgroundColor: '#fff',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 6,
};

const labelStyle: React.CSSProperties = {
  width: 68,
  flexShrink: 0,
  fontSize: 12,
  color: '#666',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: '4px 6px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  fontSize: 12,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  backgroundColor: '#fff',
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#999',
  marginBottom: 6,
  lineHeight: 1.5,
};

const addButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: 6,
  border: '1px dashed #d9d9d9',
  borderRadius: 4,
  backgroundColor: '#fafafa',
  cursor: 'pointer',
  fontSize: 12,
  color: '#1890ff',
};

const deleteButtonStyle: React.CSSProperties = {
  flexShrink: 0,
  padding: '2px 6px',
  border: '1px solid #ffccc7',
  borderRadius: 4,
  backgroundColor: '#fff1f0',
  color: '#ff4d4f',
  cursor: 'pointer',
  fontSize: 11,
};

/**
 * 查找校验类型定义
 *
 * @param type 校验类型
 * @returns 类型定义，未知类型返回 undefined
 */
function findValidatorMeta(type: CrossFieldValidatorType) {
  return BUILTIN_CROSS_FIELD_VALIDATORS.find(v => v.type === type);
}

/** 单条规则编辑器 */
function RuleCard({
  rule,
  fields,
  onChange,
  onDelete,
}: {
  rule: CrossFieldRule;
  fields: CrossFieldFieldOption[];
  onChange: (rule: CrossFieldRule) => void;
  onDelete: () => void;
}) {
  const validatorType: CrossFieldValidatorType = rule.validator ?? 'dateRange';
  const meta = findValidatorMeta(validatorType);
  const paramFields = meta?.paramFields ?? [];

  const handleParamChange = useCallback(
    (key: string, val: string) => {
      onChange({ ...rule, params: { ...(rule.params ?? {}), [key]: val } });
    },
    [rule, onChange],
  );

  const toggleField = useCallback(
    (field: string) => {
      const selected = rule.fields.includes(field);
      const next = selected
        ? rule.fields.filter(f => f !== field)
        : [...rule.fields, field];
      onChange({ ...rule, fields: next });
    },
    [rule, onChange],
  );

  return (
    <div style={cardStyle}>
      <div style={rowStyle}>
        <label style={labelStyle}>规则名称</label>
        <input
          style={inputStyle}
          value={rule.name}
          placeholder="如：日期区间校验"
          onChange={e => onChange({ ...rule, name: e.target.value })}
        />
        <button type="button" style={deleteButtonStyle} onClick={onDelete}>
          删除
        </button>
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>校验类型</label>
        <select
          style={selectStyle}
          value={validatorType}
          onChange={e => {
            const nextType = e.target.value as CrossFieldValidatorType;
            onChange({
              ...rule,
              validator: nextType,
              // 切换类型时清空不兼容的参数，避免残留脏配置
              params: {},
              expression: nextType === 'expression' ? (rule.expression ?? '') : undefined,
            });
          }}
        >
          {BUILTIN_CROSS_FIELD_VALIDATORS.map(v => (
            <option key={v.type} value={v.type}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {meta && <div style={hintStyle}>{meta.description}</div>}

      <div style={rowStyle}>
        <label style={labelStyle}>参与字段</label>
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {fields.length === 0 && (
            <span style={{ fontSize: 11, color: '#bbb' }}>表单内暂无可选字段</span>
          )}
          {fields.map(f => {
            const checked = rule.fields.includes(f.value);
            return (
              <label
                key={f.value}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 6px',
                  border: `1px solid ${checked ? '#91d5ff' : '#e8e8e8'}`,
                  borderRadius: 10,
                  fontSize: 11,
                  cursor: 'pointer',
                  backgroundColor: checked ? '#e6f7ff' : '#fafafa',
                  color: checked ? '#1890ff' : '#666',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleField(f.value)}
                  style={{ margin: 0 }}
                />
                {f.label}
              </label>
            );
          })}
        </div>
      </div>

      {paramFields.length > 0 && (
        <>
          {paramFields.map(p => (
            <div style={rowStyle} key={String(p.key)}>
              <label style={labelStyle}>{p.label}</label>
              <select
                style={selectStyle}
                value={String(rule.params?.[p.key] ?? '')}
                onChange={e => handleParamChange(String(p.key), e.target.value)}
              >
                <option value="">（请选择）</option>
                {fields.map(f => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </>
      )}

      {validatorType === 'expression' && (
        <div style={rowStyle}>
          <label style={labelStyle}>校验表达式</label>
          <input
            style={{ ...inputStyle, fontFamily: 'monospace' }}
            value={rule.expression ?? ''}
            placeholder="返回 falsy 即失败，如：endDate >= startDate"
            onChange={e => onChange({ ...rule, expression: e.target.value })}
          />
        </div>
      )}

      <div style={rowStyle}>
        <label style={labelStyle}>错误字段</label>
        <select
          style={selectStyle}
          value={rule.targetField ?? ''}
          onChange={e => onChange({ ...rule, targetField: e.target.value || undefined })}
        >
          <option value="">（默认挂到首个字段）</option>
          {rule.fields.map(f => (
            <option key={f} value={f}>
              {fields.find(opt => opt.value === f)?.label ?? f}
            </option>
          ))}
        </select>
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>错误提示</label>
        <input
          style={inputStyle}
          value={rule.message}
          placeholder="如：结束日期不能早于开始日期"
          onChange={e => onChange({ ...rule, message: e.target.value })}
        />
      </div>
    </div>
  );
}

/** 跨字段校验规则编辑器 */
export function CrossFieldRulesEditor({
  value = [],
  onChange,
  fields = [],
}: CrossFieldRulesEditorProps) {
  const handleAdd = useCallback(() => {
    const newRule: CrossFieldRule = {
      // 规则 ID 使用平台统一的 8 位 hex（与资源配置 ID 约定一致）
      id: generateHexId(),
      name: '日期区间校验',
      validator: 'dateRange',
      fields: [],
      message: '结束值不能小于起始值',
    };
    onChange?.([...value, newRule]);
  }, [value, onChange]);

  const handleUpdate = useCallback(
    (index: number, rule: CrossFieldRule) => {
      const next = [...value];
      next[index] = rule;
      onChange?.(next);
    },
    [value, onChange],
  );

  const handleDelete = useCallback(
    (index: number) => {
      onChange?.(value.filter((_, i) => i !== index));
    },
    [value, onChange],
  );

  return (
    <div>
      {value.map((rule, index) => (
        <RuleCard
          key={rule.id || index}
          rule={rule}
          fields={fields}
          onChange={r => handleUpdate(index, r)}
          onDelete={() => handleDelete(index)}
        />
      ))}
      <button type="button" style={addButtonStyle} onClick={handleAdd}>
        + 添加跨字段规则
      </button>
    </div>
  );
}

export default CrossFieldRulesEditor;
