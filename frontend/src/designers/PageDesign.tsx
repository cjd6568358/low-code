/**
 * 页面设计器
 *
 * 可视化拖拽编辑页面 schema，是渲染引擎的设计器模式实现。
 *
 * Props:
 *   pageId   — 裸资源 ID
 *   schema   — 初始页面 schema（可选，为空时加载空画布）
 *   onChange  — schema 变更回调
 *
 * Route: 由 AppDesignPage 加载，不直接暴露路由。
 */

import { useCallback, useEffect, useState } from 'react';
import { App, Spin } from 'antd';
import { Designer } from '@low-code/renderer';
import type { PageSchema } from '@low-code/shared';

interface PageDesignProps {
  appId: string;
  pageId: string;
  /** 当前租户 ID（透传至设计器，用于拼接路由） */
  tenantId?: string;
  schema?: PageSchema;
  onChange?: (schema: PageSchema) => void;
  /** 保存成功后的回调（用于更新 tab 名称和刷新资源列表） */
  onSaved?: (name: string) => void;
}

export default function PageDesign({ appId, pageId, tenantId, schema, onChange, onSaved }: PageDesignProps) {
  const { message } = App.useApp();
  const [currentSchema, setCurrentSchema] = useState<PageSchema | undefined>(schema);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!schema);

  // 加载页面 schema
  useEffect(() => {
    if (schema) return; // 已有初始 schema，跳过加载
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`/api/apps/${appId}/pages/${pageId}`);
        const data = await resp.json();
        if (!cancelled && data.success && data.resource) {
          setCurrentSchema(data.resource);
        }
      } catch {
        if (!cancelled) message.error('加载页面失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [appId, pageId, schema]);

  const handleChange = useCallback(
    (changed: PageSchema) => {
      setCurrentSchema(changed);
      onChange?.(changed);
    },
    [onChange],
  );

  const handleSave = useCallback(async () => {
    if (!currentSchema) return;
    setSaving(true);
    try {
      const resp = await fetch(`/api/apps/${appId}/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSchema),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || '保存失败');
      }
      message.success('页面保存成功');
      // 通知父组件更新 tab 名称和资源列表
      onSaved?.(currentSchema.name);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }, [appId, pageId, currentSchema, onSaved]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 设计器 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Spin />
          </div>
        ) : (
          <Designer schema={currentSchema} appId={appId} tenantId={tenantId} onChange={handleChange} onSave={handleSave} saving={saving} />
        )}
      </div>
    </div>
  );
}
