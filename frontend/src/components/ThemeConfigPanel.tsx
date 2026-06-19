import React from 'react';
import { InputNumber, ColorPicker, Space } from 'antd';

/** 主题配置（应用级） */
export interface ThemeConfig {
  primaryColor: string;
  borderRadius: number;
  fontSize: number;
  spacing: number;
  colorSuccess: string;
  colorWarning: string;
  colorError: string;
  colorBgContainer: string;
  colorTextPrimary: string;
}

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#1890ff',
  borderRadius: 6,
  fontSize: 14,
  spacing: 16,
  colorSuccess: '#52c41a',
  colorWarning: '#faad14',
  colorError: '#ff4d4f',
  colorBgContainer: '#ffffff',
  colorTextPrimary: '#000000d9',
};

interface ThemeConfigPanelProps {
  value?: Partial<ThemeConfig>;
  onChange?: (theme: Partial<ThemeConfig>) => void;
}

/** 应用级主题配置面板 */
export function ThemeConfigPanel({ value, onChange }: ThemeConfigPanelProps) {
  const t = { ...DEFAULT_THEME, ...value };

  const update = <K extends keyof ThemeConfig>(key: K, val: ThemeConfig[K]) => {
    onChange?.({ ...value, [key]: val });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 基础 Token */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 12 }}>基础样式</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FieldRow label="主色">
            <ColorPicker
              value={t.primaryColor}
              onChange={(_, hex) => update('primaryColor', hex)}
              showText
              size="small"
            />
          </FieldRow>
          <FieldRow label="圆角">
            <InputNumber
              value={t.borderRadius}
              onChange={(v) => v !== null && update('borderRadius', v)}
              min={0} max={24}
              size="small"
              addonAfter="px"
              style={{ width: 120 }}
            />
          </FieldRow>
          <FieldRow label="字号">
            <InputNumber
              value={t.fontSize}
              onChange={(v) => v !== null && update('fontSize', v)}
              min={12} max={24}
              size="small"
              addonAfter="px"
              style={{ width: 120 }}
            />
          </FieldRow>
          <FieldRow label="间距">
            <InputNumber
              value={t.spacing}
              onChange={(v) => v !== null && update('spacing', v)}
              min={0} max={48}
              size="small"
              addonAfter="px"
              style={{ width: 120 }}
            />
          </FieldRow>
        </div>
      </div>

      {/* 语义色 */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 12 }}>语义色</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FieldRow label="成功">
            <ColorPicker
              value={t.colorSuccess}
              onChange={(_, hex) => update('colorSuccess', hex)}
              size="small"
            />
          </FieldRow>
          <FieldRow label="警告">
            <ColorPicker
              value={t.colorWarning}
              onChange={(_, hex) => update('colorWarning', hex)}
              size="small"
            />
          </FieldRow>
          <FieldRow label="错误">
            <ColorPicker
              value={t.colorError}
              onChange={(_, hex) => update('colorError', hex)}
              size="small"
            />
          </FieldRow>
        </div>
      </div>

      {/* 容器色 */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 12 }}>容器色</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FieldRow label="背景">
            <ColorPicker
              value={t.colorBgContainer}
              onChange={(_, hex) => update('colorBgContainer', hex)}
              size="small"
            />
          </FieldRow>
          <FieldRow label="文字">
            <ColorPicker
              value={t.colorTextPrimary}
              onChange={(_, hex) => update('colorTextPrimary', hex)}
              size="small"
            />
          </FieldRow>
        </div>
      </div>

      {/* 预览 */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 12 }}>效果预览</div>
        <div style={{
          padding: 16,
          backgroundColor: t.colorBgContainer,
          borderRadius: t.borderRadius,
          border: '1px solid #f0f0f0',
        }}>
          <div style={{
            display: 'inline-block',
            padding: '6px 16px',
            backgroundColor: t.primaryColor,
            color: '#fff',
            borderRadius: t.borderRadius,
            fontSize: t.fontSize,
            marginBottom: t.spacing / 2,
          }}>
            主按钮
          </div>
          <div style={{
            padding: '6px 16px',
            border: `1px solid ${t.primaryColor}`,
            color: t.primaryColor,
            borderRadius: t.borderRadius,
            fontSize: t.fontSize,
            display: 'inline-block',
            marginLeft: 8,
            marginBottom: t.spacing / 2,
          }}>
            次按钮
          </div>
          <div style={{
            color: t.colorTextPrimary,
            fontSize: t.fontSize,
            marginTop: t.spacing / 2,
          }}>
            正文文字 <span style={{ color: t.colorSuccess }}>成功</span> <span style={{ color: t.colorWarning }}>警告</span> <span style={{ color: t.colorError }}>错误</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <label style={{ width: 60, fontSize: 13, color: '#595959', flexShrink: 0 }}>{label}</label>
      {children}
    </div>
  );
}
