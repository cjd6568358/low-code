import React, { useState } from 'react';

/** 样式编辑器属性 */
export interface StyleEditorProps {
  value: React.CSSProperties;
  onChange: (style: React.CSSProperties) => void;
}

/** 可视化样式编辑器 */
export function StyleEditor({ value, onChange }: StyleEditorProps) {
  const [activeGroup, setActiveGroup] = useState<string>('layout');

  const updateStyle = (key: keyof React.CSSProperties, val: string | number | undefined) => {
    const next = { ...value };
    if (val === '' || val === undefined) {
      delete next[key];
    } else {
      (next as any)[key] = val;
    }
    onChange(next);
  };

  const groups = [
    { key: 'layout', label: '布局' },
    { key: 'spacing', label: '间距' },
    { key: 'size', label: '尺寸' },
    { key: 'text', label: '文字' },
    { key: 'background', label: '背景' },
    { key: 'border', label: '边框' },
  ];

  return (
    <div>
      {/* 分组切换 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
        {groups.map((g) => (
          <button
            key={g.key}
            onClick={() => setActiveGroup(g.key)}
            style={{
              padding: '3px 8px', border: '1px solid', borderRadius: 3, cursor: 'pointer', fontSize: 11,
              borderColor: activeGroup === g.key ? '#1890ff' : '#d9d9d9',
              backgroundColor: activeGroup === g.key ? '#e6f7ff' : '#fff',
              color: activeGroup === g.key ? '#1890ff' : '#666',
            }}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* 布局 */}
      {activeGroup === 'layout' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <MiniField label="display">
            <select value={String(value.display || '')} onChange={(e) => updateStyle('display', e.target.value)} style={inputStyle}>
              <option value="">默认</option>
              <option value="flex">flex</option>
              <option value="grid">grid</option>
              <option value="block">block</option>
              <option value="inline-block">inline-block</option>
              <option value="inline">inline</option>
              <option value="none">none</option>
            </select>
          </MiniField>
          <MiniField label="position">
            <select value={String(value.position || '')} onChange={(e) => updateStyle('position', e.target.value)} style={inputStyle}>
              <option value="">默认</option>
              <option value="relative">relative</option>
              <option value="absolute">absolute</option>
              <option value="fixed">fixed</option>
              <option value="sticky">sticky</option>
            </select>
          </MiniField>
          <MiniField label="overflow">
            <select value={String(value.overflow || '')} onChange={(e) => updateStyle('overflow', e.target.value)} style={inputStyle}>
              <option value="">默认</option>
              <option value="visible">visible</option>
              <option value="hidden">hidden</option>
              <option value="auto">auto</option>
              <option value="scroll">scroll</option>
            </select>
          </MiniField>
          <MiniField label="zIndex">
            <input type="number" value={value.zIndex ?? ''} onChange={(e) => updateStyle('zIndex', e.target.value ? Number(e.target.value) : undefined)} style={inputStyle} placeholder="auto" />
          </MiniField>
        </div>
      )}

      {/* 间距 */}
      {activeGroup === 'spacing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>margin</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <MiniField label="top"><input value={String(value.marginTop ?? '')} onChange={(e) => updateStyle('marginTop', e.target.value)} style={inputStyle} placeholder="0" /></MiniField>
            <MiniField label="right"><input value={String(value.marginRight ?? '')} onChange={(e) => updateStyle('marginRight', e.target.value)} style={inputStyle} placeholder="0" /></MiniField>
            <MiniField label="bottom"><input value={String(value.marginBottom ?? '')} onChange={(e) => updateStyle('marginBottom', e.target.value)} style={inputStyle} placeholder="0" /></MiniField>
            <MiniField label="left"><input value={String(value.marginLeft ?? '')} onChange={(e) => updateStyle('marginLeft', e.target.value)} style={inputStyle} placeholder="0" /></MiniField>
          </div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 4, marginTop: 8 }}>padding</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <MiniField label="top"><input value={String(value.paddingTop ?? '')} onChange={(e) => updateStyle('paddingTop', e.target.value)} style={inputStyle} placeholder="0" /></MiniField>
            <MiniField label="right"><input value={String(value.paddingRight ?? '')} onChange={(e) => updateStyle('paddingRight', e.target.value)} style={inputStyle} placeholder="0" /></MiniField>
            <MiniField label="bottom"><input value={String(value.paddingBottom ?? '')} onChange={(e) => updateStyle('paddingBottom', e.target.value)} style={inputStyle} placeholder="0" /></MiniField>
            <MiniField label="left"><input value={String(value.paddingLeft ?? '')} onChange={(e) => updateStyle('paddingLeft', e.target.value)} style={inputStyle} placeholder="0" /></MiniField>
          </div>
          <MiniField label="gap">
            <input value={String(value.gap ?? '')} onChange={(e) => updateStyle('gap', e.target.value)} style={inputStyle} placeholder="0" />
          </MiniField>
        </div>
      )}

      {/* 尺寸 */}
      {activeGroup === 'size' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <MiniField label="width">
            <input value={String(value.width ?? '')} onChange={(e) => updateStyle('width', e.target.value || undefined)} style={inputStyle} placeholder="auto" />
          </MiniField>
          <MiniField label="height">
            <input value={String(value.height ?? '')} onChange={(e) => updateStyle('height', e.target.value || undefined)} style={inputStyle} placeholder="auto" />
          </MiniField>
          <MiniField label="minWidth">
            <input value={String(value.minWidth ?? '')} onChange={(e) => updateStyle('minWidth', e.target.value || undefined)} style={inputStyle} placeholder="无" />
          </MiniField>
          <MiniField label="minHeight">
            <input value={String(value.minHeight ?? '')} onChange={(e) => updateStyle('minHeight', e.target.value || undefined)} style={inputStyle} placeholder="无" />
          </MiniField>
          <MiniField label="maxWidth">
            <input value={String(value.maxWidth ?? '')} onChange={(e) => updateStyle('maxWidth', e.target.value || undefined)} style={inputStyle} placeholder="无" />
          </MiniField>
          <MiniField label="maxHeight">
            <input value={String(value.maxHeight ?? '')} onChange={(e) => updateStyle('maxHeight', e.target.value || undefined)} style={inputStyle} placeholder="无" />
          </MiniField>
        </div>
      )}

      {/* 文字 */}
      {activeGroup === 'text' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <MiniField label="fontSize">
            <input value={String(value.fontSize ?? '')} onChange={(e) => updateStyle('fontSize', e.target.value || undefined)} style={inputStyle} placeholder="14px" />
          </MiniField>
          <MiniField label="fontWeight">
            <select value={String(value.fontWeight || '')} onChange={(e) => updateStyle('fontWeight', e.target.value || undefined)} style={inputStyle}>
              <option value="">默认</option>
              <option value="normal">normal</option>
              <option value="bold">bold</option>
              <option value="300">300 (Light)</option>
              <option value="400">400 (Normal)</option>
              <option value="500">500 (Medium)</option>
              <option value="600">600 (Semi Bold)</option>
              <option value="700">700 (Bold)</option>
            </select>
          </MiniField>
          <MiniField label="color">
            <div style={{ display: 'flex', gap: 4 }}>
              <input type="color" value={typeof value.color === 'string' ? value.color : '#000000'} onChange={(e) => updateStyle('color', e.target.value)} style={{ width: 32, height: 28, border: '1px solid #d9d9d9', borderRadius: 4, cursor: 'pointer', padding: 0 }} />
              <input value={String(value.color ?? '')} onChange={(e) => updateStyle('color', e.target.value || undefined)} style={{ ...inputStyle, flex: 1 }} placeholder="#000000" />
            </div>
          </MiniField>
          <MiniField label="textAlign">
            <select value={String(value.textAlign || '')} onChange={(e) => updateStyle('textAlign', e.target.value || undefined)} style={inputStyle}>
              <option value="">默认</option>
              <option value="left">left</option>
              <option value="center">center</option>
              <option value="right">right</option>
            </select>
          </MiniField>
          <MiniField label="lineHeight">
            <input value={String(value.lineHeight ?? '')} onChange={(e) => updateStyle('lineHeight', e.target.value || undefined)} style={inputStyle} placeholder="normal" />
          </MiniField>
        </div>
      )}

      {/* 背景 */}
      {activeGroup === 'background' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <MiniField label="backgroundColor">
            <div style={{ display: 'flex', gap: 4 }}>
              <input type="color" value={typeof value.backgroundColor === 'string' ? value.backgroundColor : '#ffffff'} onChange={(e) => updateStyle('backgroundColor', e.target.value)} style={{ width: 32, height: 28, border: '1px solid #d9d9d9', borderRadius: 4, cursor: 'pointer', padding: 0 }} />
              <input value={String(value.backgroundColor ?? '')} onChange={(e) => updateStyle('backgroundColor', e.target.value || undefined)} style={{ ...inputStyle, flex: 1 }} placeholder="transparent" />
            </div>
          </MiniField>
          <MiniField label="opacity">
            <input type="range" min="0" max="1" step="0.1" value={value.opacity ?? 1} onChange={(e) => updateStyle('opacity', Number(e.target.value))} style={{ width: '100%' }} />
            <span style={{ fontSize: 11, color: '#999' }}>{value.opacity ?? 1}</span>
          </MiniField>
        </div>
      )}

      {/* 边框 */}
      {activeGroup === 'border' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <MiniField label="borderRadius">
            <input value={String(value.borderRadius ?? '')} onChange={(e) => updateStyle('borderRadius', e.target.value || undefined)} style={inputStyle} placeholder="0" />
          </MiniField>
          <MiniField label="border">
            <input value={String(value.border ?? '')} onChange={(e) => updateStyle('border', e.target.value || undefined)} style={inputStyle} placeholder="1px solid #d9d9d9" />
          </MiniField>
          <MiniField label="boxShadow">
            <input value={String(value.boxShadow ?? '')} onChange={(e) => updateStyle('boxShadow', e.target.value || undefined)} style={inputStyle} placeholder="none" />
          </MiniField>
        </div>
      )}
    </div>
  );
}

/** 紧凑字段布局 */
function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <label style={{ fontSize: 11, color: '#666', minWidth: 70, textAlign: 'right', flexShrink: 0 }}>{label}</label>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '3px 6px',
  border: '1px solid #d9d9d9',
  borderRadius: 3,
  fontSize: 12,
  boxSizing: 'border-box',
};
