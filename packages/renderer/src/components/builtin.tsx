import React from 'react';

/**
 * 内建组件占位实现
 * 用于演示渲染器工作，生产环境应替换为真实组件库实现
 */

// ========== 基础组件 ==========

export const BuiltinInput: React.FC<any> = (props) => {
  const { value, onChange, placeholder, disabled, maxLength, style, ...rest } = props;
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      style={{
        padding: '4px 11px',
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        fontSize: '14px',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
      {...rest}
    />
  );
};

export const BuiltinTextarea: React.FC<any> = (props) => {
  const { value, onChange, placeholder, disabled, maxLength, rows = 4, style, ...rest } = props;
  return (
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      rows={rows}
      style={{
        padding: '4px 11px',
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        fontSize: '14px',
        width: '100%',
        boxSizing: 'border-box',
        resize: 'vertical',
        ...style,
      }}
      {...rest}
    />
  );
};

export const BuiltinNumber: React.FC<any> = (props) => {
  const { value, onChange, placeholder, disabled, min, max, step, style, ...rest } = props;
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange?.(Number(e.target.value))}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      style={{
        padding: '4px 11px',
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        fontSize: '14px',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
      {...rest}
    />
  );
};

export const BuiltinSelect: React.FC<any> = (props) => {
  const { value, onChange, options = [], placeholder, disabled, multiple, style, ...rest } = props;
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      multiple={multiple}
      style={{
        padding: '4px 11px',
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        fontSize: '14px',
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#fff',
        ...style,
      }}
      {...rest}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt: any, i: number) => (
        <option key={i} value={opt.value ?? opt}>
          {opt.label ?? opt}
        </option>
      ))}
    </select>
  );
};

export const BuiltinRadio: React.FC<any> = (props) => {
  const { value, onChange, options = [], disabled, style, ...rest } = props;
  return (
    <div style={{ display: 'flex', gap: '16px', ...style }} {...rest}>
      {options.map((opt: any, i: number) => (
        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: disabled ? 'default' : 'pointer' }}>
          <input
            type="radio"
            value={opt.value ?? opt}
            checked={value === (opt.value ?? opt)}
            onChange={() => onChange?.(opt.value ?? opt)}
            disabled={disabled}
          />
          {opt.label ?? opt}
        </label>
      ))}
    </div>
  );
};

export const BuiltinCheckbox: React.FC<any> = (props) => {
  const { value = [], onChange, options = [], disabled, style, ...rest } = props;
  const handleChange = (optValue: any) => {
    const current = Array.isArray(value) ? value : [];
    if (current.includes(optValue)) {
      onChange?.(current.filter((v: any) => v !== optValue));
    } else {
      onChange?.([...current, optValue]);
    }
  };
  return (
    <div style={{ display: 'flex', gap: '16px', ...style }} {...rest}>
      {options.map((opt: any, i: number) => (
        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: disabled ? 'default' : 'pointer' }}>
          <input
            type="checkbox"
            value={opt.value ?? opt}
            checked={(Array.isArray(value) ? value : []).includes(opt.value ?? opt)}
            onChange={() => handleChange(opt.value ?? opt)}
            disabled={disabled}
          />
          {opt.label ?? opt}
        </label>
      ))}
    </div>
  );
};

export const BuiltinSwitch: React.FC<any> = (props) => {
  const { value, onChange, disabled, style, ...rest } = props;
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: disabled ? 'default' : 'pointer', ...style }} {...rest}>
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
        style={{ marginRight: '8px' }}
      />
      {value ? '是' : '否'}
    </label>
  );
};

export const BuiltinDatePicker: React.FC<any> = (props) => {
  const { value, onChange, placeholder, disabled, style, ...rest } = props;
  return (
    <input
      type="date"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        padding: '4px 11px',
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        fontSize: '14px',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
      {...rest}
    />
  );
};

export const BuiltinTimePicker: React.FC<any> = (props) => {
  const { value, onChange, placeholder, disabled, style, ...rest } = props;
  return (
    <input
      type="time"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        padding: '4px 11px',
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        fontSize: '14px',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
      {...rest}
    />
  );
};

export const BuiltinUpload: React.FC<any> = (props) => {
  const { onChange, disabled, accept, style, ...rest } = props;
  return (
    <input
      type="file"
      onChange={(e) => onChange?.(e.target.files?.[0])}
      disabled={disabled}
      accept={accept}
      style={{
        fontSize: '14px',
        ...style,
      }}
      {...rest}
    />
  );
};

export const BuiltinButton: React.FC<any> = (props) => {
  const { children, onClick, disabled, type = 'default', style, ...rest } = props;
  const typeStyles: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: '#1890ff', color: '#fff', border: '1px solid #1890ff' },
    default: { backgroundColor: '#fff', color: '#000000d9', border: '1px solid #d9d9d9' },
    danger: { backgroundColor: '#ff4d4f', color: '#fff', border: '1px solid #ff4d4f' },
    link: { backgroundColor: 'transparent', color: '#1890ff', border: 'none' },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '4px 15px',
        borderRadius: '6px',
        fontSize: '14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...typeStyles[type] || typeStyles.default,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
};

// ========== 高级组件 ==========

export const BuiltinTable: React.FC<any> = (props) => {
  const { columns = [], dataSource = [], style, ...rest } = props;
  return (
    <div style={{ overflowX: 'auto', ...style }} {...rest}>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e8e8e8' }}>
        <thead>
          <tr>
            {columns.map((col: any, i: number) => (
              <th
                key={i}
                style={{
                  padding: '12px 8px',
                  borderBottom: '1px solid #e8e8e8',
                  textAlign: 'left',
                  backgroundColor: '#fafafa',
                  fontWeight: 600,
                }}
              >
                {col.title || col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataSource.map((row: any, rowIndex: number) => (
            <tr key={rowIndex}>
              {columns.map((col: any, colIndex: number) => (
                <td
                  key={colIndex}
                  style={{
                    padding: '12px 8px',
                    borderBottom: '1px solid #e8e8e8',
                  }}
                >
                  {row[col.dataIndex || col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const BuiltinForm: React.FC<any> = (props) => {
  const { children, style, ...rest } = props;
  return (
    <form style={{ ...style }} {...rest}>
      {children}
    </form>
  );
};

// ========== 布局组件 ==========

export const BuiltinCard: React.FC<any> = (props) => {
  const { children, title, bordered = true, style, ...rest } = props;
  return (
    <div
      style={{
        border: bordered ? '1px solid #e8e8e8' : 'none',
        borderRadius: '6px',
        padding: '20px',
        backgroundColor: '#fff',
        ...style,
      }}
      {...rest}
    >
      {title && (
        <div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
};

export const BuiltinFlex: React.FC<any> = (props) => {
  const { children, justify, align, direction = 'row', wrap, gap, style, ...rest } = props;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: justify,
        alignItems: align,
        flexDirection: direction,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        gap: gap ? `${gap}px` : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

export const BuiltinGrid: React.FC<any> = (props) => {
  const { children, columns = 24, gap, style, ...rest } = props;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: gap ? `${gap}px` : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

export const BuiltinDivider: React.FC<any> = (props) => {
  const { style, ...rest } = props;
  return (
    <hr
      style={{
        border: 'none',
        borderTop: '1px solid #e8e8e8',
        margin: '16px 0',
        ...style,
      }}
      {...rest}
    />
  );
};

export const BuiltinTabs: React.FC<any> = (props) => {
  const { items = [], activeKey, onChange, style, ...rest } = props;
  return (
    <div style={{ ...style }} {...rest}>
      <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8', marginBottom: '16px' }}>
        {items.map((item: any) => (
          <div
            key={item.key}
            onClick={() => onChange?.(item.key)}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              borderBottom: activeKey === item.key ? '2px solid #1890ff' : '2px solid transparent',
              color: activeKey === item.key ? '#1890ff' : '#000000d9',
              fontWeight: activeKey === item.key ? 600 : 400,
            }}
          >
            {item.label || item.tab}
          </div>
        ))}
      </div>
      {items.find((item: any) => item.key === activeKey)?.children}
    </div>
  );
};

export const BuiltinText: React.FC<any> = (props) => {
  const { children, style, ...rest } = props;
  return <span style={{ ...style }} {...rest}>{children}</span>;
};

// ========== 组件映射表 ==========

export const builtinComponents: Record<string, React.ComponentType<any>> = {
  input: BuiltinInput,
  textarea: BuiltinTextarea,
  number: BuiltinNumber,
  select: BuiltinSelect,
  radio: BuiltinRadio,
  checkbox: BuiltinCheckbox,
  switch: BuiltinSwitch,
  datepicker: BuiltinDatePicker,
  timepicker: BuiltinTimePicker,
  upload: BuiltinUpload,
  button: BuiltinButton,
  table: BuiltinTable,
  form: BuiltinForm,
  card: BuiltinCard,
  flex: BuiltinFlex,
  grid: BuiltinGrid,
  divider: BuiltinDivider,
  tabs: BuiltinTabs,
  text: BuiltinText,
};
