/**
 * PropValueField — 属性值字段组件
 *
 * 提供常量/变量/表达式三种值模式的统一 UI：
 * - 模式切换按钮组（常量 | 变量 | 表达式）
 * - 常量模式：渲染传入的 children（任意控件）
 * - 变量/表达式模式：显示 Tag 样式的绑定标识，点击打开选择器
 *
 * 供 AutoFormRenderer 和 EventActionChainEditor 等复用。
 */

import React from 'react';

/** 值模式 */
export type ValueMode = 'constant' | 'variable' | 'expression';

/** PropValueField 属性 */
export interface PropValueFieldProps {
  /** 当前值模式 */
  mode: ValueMode;
  /** 模式变更回调 */
  onModeChange: (mode: ValueMode) => void;
  /** 当前值（变量/表达式模式下用于显示绑定路径） */
  value?: unknown;
  /** 变量/表达式模式下点击打开选择器的回调 */
  onOpenPicker?: () => void;
  /** 是否禁用模式切换 */
  disabled?: boolean;
  /** 常量模式下渲染的控件 */
  children?: React.ReactNode;
  /** 支持的模式列表（默认 ['constant', 'variable', 'expression']） */
  modes?: ValueMode[];
}

/**
 * 从值中检测当前模式
 *
 * 支持 PropValue 对象格式 { type: 'variable'|'expression', value: '...' }
 * 和裸值（视为常量）
 */
export function detectValueMode(val: unknown): ValueMode {
  if (val != null && typeof val === 'object' && 'type' in val && 'value' in val) {
    const obj = val as { type: string; value: string };
    if (obj.type === 'variable') return 'variable';
    if (obj.type === 'expression') return 'expression';
  }
  return 'constant';
}

/**
 * 从值中提取字符串显示值
 */
export function extractDisplayValue(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object' && 'value' in val) return String((val as { value: unknown }).value ?? '');
  return String(val ?? '');
}

// ─── 样式 ──────────────────────────────────────────────

const modeBtnBase: React.CSSProperties = {
  padding: '2px 8px',
  fontSize: '12px',
  border: 'none',
  borderRadius: '2px',
  cursor: 'pointer',
};

const tagBase: React.CSSProperties = {
  padding: '2px 8px',
  border: '1px solid',
  borderRadius: '2px',
  fontSize: '12px',
  flexShrink: 0,
};

const pickerTriggerStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #d9d9d9',
  borderRadius: '4px',
  backgroundColor: '#f5f5f5',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  minHeight: '32px',
};

// ─── 子组件 ────────────────────────────────────────────

/** 模式切换按钮组 */
function ModeSelector({
  currentMode,
  onModeChange,
  disabled,
  modes,
}: {
  currentMode: ValueMode;
  onModeChange: (mode: ValueMode) => void;
  disabled?: boolean;
  modes: ValueMode[];
}) {
  const labels: Record<ValueMode, string> = { constant: '常量', variable: '变量', expression: '表达式' };
  return (
    <div style={{ display: 'flex', marginLeft: 'auto' }}>
      {modes.map((mode) => (
        <button
          key={mode}
          onClick={() => !disabled && onModeChange(mode)}
          disabled={disabled}
          style={{
            ...modeBtnBase,
            backgroundColor: currentMode === mode ? '#e6f7ff' : '#fff',
            color: currentMode === mode ? '#1890ff' : '#666',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {labels[mode]}
        </button>
      ))}
    </div>
  );
}

/** 变量/表达式绑定显示 */
function BindingDisplay({
  mode,
  value,
  onClick,
}: {
  mode: 'variable' | 'expression';
  value?: unknown;
  onClick?: () => void;
}) {
  const displayValue = extractDisplayValue(value);
  return (
    <div onClick={onClick} style={pickerTriggerStyle}>
      <span
        style={{
          ...tagBase,
          backgroundColor: mode === 'variable' ? '#e6f7ff' : '#fff7e6',
          borderColor: mode === 'variable' ? '#91d5ff' : '#ffd591',
          color: mode === 'variable' ? '#1890ff' : '#fa8c16',
        }}
      >
        {mode === 'variable' ? '变量' : '表达式'}
      </span>
      <span style={{ fontSize: '13px', color: '#333', fontFamily: 'monospace' }}>
        {displayValue || '点击选择...'}
      </span>
    </div>
  );
}

// ─── 主组件 ────────────────────────────────────────────

/**
 * 属性值字段
 *
 * 封装常量/变量/表达式三种模式的切换和显示逻辑。
 * 常量模式下渲染 children（传入的控件），变量/表达式模式下显示绑定标识。
 *
 * @example
 * ```tsx
 * <PropValueField
 *   mode={detectValueMode(fieldValue)}
 *   onModeChange={(mode) => { updateMode(mode); if (mode !== 'constant') openPicker(); }}
 *   value={fieldValue}
 *   onOpenPicker={() => openVariablePicker(field)}
 * >
 *   <Input value={fieldValue} onChange={handleChange} />
 * </PropValueField>
 * ```
 */
export function PropValueField(props: PropValueFieldProps) {
  const { mode, onModeChange, value, onOpenPicker, disabled, children, modes } = props;
  const supportedModes = modes ?? ['constant', 'variable', 'expression'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <ModeSelector currentMode={mode} onModeChange={onModeChange} disabled={disabled} modes={supportedModes} />
      {mode === 'constant' && children}
      {mode !== 'constant' && (
        <BindingDisplay mode={mode} value={value} onClick={onOpenPicker} />
      )}
    </div>
  );
}
