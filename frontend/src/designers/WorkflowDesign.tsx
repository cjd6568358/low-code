/**
 * 流程设计器
 *
 * 包装 @low-code/renderer 的 WorkflowDesigner 组件，
 * 负责加载/保存流程定义 schema。
 *
 * Props:
 *   workflowId — 裸资源 ID
 *   onSaved    — 保存成功后的回调（用于更新 tab 名称和刷新资源列表）
 *
 * Route: 由 AppDesignPage 加载，不直接暴露路由。
 */

import { useCallback, useEffect, useState } from 'react';
import { App, Spin, Button, Tag, Space } from 'antd';
import { SaveOutlined, SendOutlined } from '@ant-design/icons';
import { WorkflowDesigner } from '@low-code/renderer';
import type { BpmnDocument } from '@low-code/workflow-bpmn';

/** 服务端返回的流程定义结构 */
interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  schema: BpmnDocument;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  version: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

interface WorkflowDesignProps {
  appId: string;
  workflowId: string;
  /** 保存成功后的回调（用于更新 tab 名称和刷新资源列表） */
  onSaved?: (name: string) => void;
}

/** 流程状态 → 标签颜色映射 */
const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default',
  PUBLISHED: 'green',
  ARCHIVED: 'orange',
};

/** 流程状态 → 中文标签 */
const STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
};

export default function WorkflowDesign({ appId, workflowId, onSaved }: WorkflowDesignProps) {
  const { message } = App.useApp();
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [schema, setSchema] = useState<BpmnDocument | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // 加载流程定义
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`/api/workflows/${workflowId}?appId=${appId}`);
        const data = await resp.json();
        if (!cancelled && data.data) {
          setWorkflow(data.data);
          setSchema(data.data.schema);
        }
      } catch {
        if (!cancelled) message.error('加载流程定义失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [appId, workflowId]);

  // schema 变更
  const handleChange = useCallback((newSchema: BpmnDocument) => {
    setSchema(newSchema);
  }, []);

  // 保存
  const handleSave = useCallback(async () => {
    if (!schema || !workflow) return;
    setSaving(true);
    try {
      const resp = await fetch(`/api/workflows/${workflowId}?appId=${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        throw new Error(data.error || '保存失败');
      }
      // 更新本地状态（版本号可能已自增）
      if (data.data) {
        setWorkflow(data.data);
      }
      message.success('流程保存成功');
      onSaved?.(workflow.name);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }, [appId, workflowId, schema, workflow, onSaved]);

  // 发布
  const handlePublish = useCallback(async () => {
    if (!workflow) return;
    setPublishing(true);
    try {
      const resp = await fetch(`/api/workflows/${workflowId}/publish?appId=${appId}`, {
        method: 'POST',
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        throw new Error(data.error || '发布失败');
      }
      if (data.data) {
        setWorkflow(data.data);
      }
      message.success('流程发布成功');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '发布失败');
    } finally {
      setPublishing(false);
    }
  }, [appId, workflowId, workflow]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部工具栏 */}
      <div
        style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0,
        }}
      >
        <Space size={12}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{workflow?.name || '流程设计'}</span>
          {workflow?.status && (
            <Tag color={STATUS_COLOR[workflow.status]}>
              {STATUS_LABEL[workflow.status] || workflow.status}
            </Tag>
          )}
          {workflow?.version && (
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>v{workflow.version}</span>
          )}
        </Space>
        <Space size={8}>
          <Button
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
          >
            保存
          </Button>
          {workflow?.status === 'DRAFT' && (
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={publishing}
              onClick={handlePublish}
            >
              发布
            </Button>
          )}
        </Space>
      </div>

      {/* 流程设计器 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <WorkflowDesigner
          value={schema}
          onChange={handleChange}
          width="100%"
          height="100%"
        />
      </div>
    </div>
  );
}
