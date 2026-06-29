/**
 * 应用中心页面
 *
 * 展示应用列表，管理员可新建/编辑/删除/发布应用，员工只读。
 * 数据从 API 加载，不再使用 Mock。
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Card, Button, Input, Tag, Space, Empty, Modal, Form, Select, Dropdown, Spin } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import { shortId } from '../utils/resourceId';

/** 可暴露/可引用的资源类型 */
type ExposableResourceType = 'pages' | 'cards' | 'forms' | 'tables' | 'workflows' | 'automations' | 'computations';

/** 应用数据结构 - 与 tenants/{id}/apps/{id}/app.json 一致 */
interface AppItem {
  schemaVersion: number;
  version: number;
  appId: string;
  name: string;
  description: string;
  icon: string;
  appVersion: string;
  status: 'draft' | 'published' | 'archived';
  componentLibrary: string;
  visibility: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  tenantId: string;
  /** 跨应用引用声明 — 按资源类型分组，格式 "{appId}.{resourceId}" */
  references: Partial<Record<ExposableResourceType, string[]>>;
  /** 资源暴露配置 — 按资源类型记录允许跨应用引用的资源 ID 列表 */
  expose?: Partial<Record<ExposableResourceType, string[]>>;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'green' },
  archived: { label: '已归档', color: 'orange' },
};

export default function AppCenterPage() {
  const { message } = App.useApp();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const tenantId = user?.tenantId || '';

  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();

  /** 加载应用列表 */
  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/apps');
      const data = await resp.json();
      if (data.success) {
        setApps(data.apps);
      }
    } catch {
      message.error('加载应用列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/apps')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) setApps(data.apps);
      })
      .catch(() => {
        if (!cancelled) message.error('加载应用列表失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  /** 过滤 */
  const filteredApps = apps.filter(
    (app) =>
      app.name.includes(searchText) || app.description.includes(searchText),
  );

  /** 创建应用 */
  const handleCreate = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const resp = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          description: values.description || '',
          icon: values.icon || '📦',
        }),
      });
      const data = await resp.json();
      if (data.success) {
        message.success('应用创建成功');
        setCreateModalOpen(false);
        form.resetFields();
        loadApps();
      } else {
        message.error(data.error || '创建失败');
      }
    } catch {
      message.error('创建失败');
    }
  }, [form, loadApps]);

  /** 删除应用 */
  const handleDelete = useCallback((appId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复，是否继续？',
      onOk: async () => {
        try {
          const resp = await fetch(`/api/apps/${appId}`, { method: 'DELETE' });
          const data = await resp.json();
          if (data.success) {
            message.success('已删除');
            loadApps();
          } else {
            message.error(data.error || '删除失败');
          }
        } catch {
          message.error('删除失败');
        }
      },
    });
  }, [loadApps]);

  /** 发布应用 */
  const handlePublish = useCallback((appId: string) => {
    Modal.confirm({
      title: '确认发布',
      content: '发布后员工即可在应用中心看到该应用，是否继续？',
      onOk: async () => {
        try {
          const resp = await fetch(`/api/apps/${appId}/publish`, { method: 'POST' });
          const data = await resp.json();
          if (data.success) {
            message.success('应用已发布');
            loadApps();
          } else {
            message.error(data.error || '发布失败');
          }
        } catch {
          message.error('发布失败');
        }
      },
    });
  }, [loadApps]);

  /** 进入应用详情 */
  const handleEnterApp = useCallback((appId: string) => {
    navigate(`/${tenantId}/app/${shortId(appId)}`);
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* 页面头部 */}
      <div className="page-header">
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索应用..."
          style={{ width: 280 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
        {isAdmin && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            新建应用
          </Button>
        )}
      </div>

      {/* 应用网格 */}
      {filteredApps.length === 0 ? (
        <Empty description="暂无应用" style={{ marginTop: 80 }}>
          {isAdmin && (
            <Button type="primary" onClick={() => setCreateModalOpen(true)}>
              新建应用
            </Button>
          )}
        </Empty>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {filteredApps.map((app) => (
            <Card
              key={app.appId}
              className="app-card"
              hoverable
              style={{ position: 'relative' }}
              onClick={() => handleEnterApp(app.appId)}
            >
              {/* 右上角下拉菜单 */}
              {isAdmin && (
                <div
                  key="dropdown-anchor"
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 1,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Dropdown
                    menu={{
                      items: [
                        { key: 'edit', icon: <EditOutlined />, label: '编辑', onClick: () => navigate(`/${tenantId}/designer/app/${shortId(app.appId)}`) },
                        ...(app.status === 'draft'
                          ? [{ key: 'publish', icon: <SendOutlined />, label: '发布', onClick: () => handlePublish(app.appId) }]
                          : []),
                        { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true, onClick: () => handleDelete(app.appId) },
                      ],
                    }}
                    trigger={['click']}
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<EllipsisOutlined style={{ fontSize: 16 }} />}
                    />
                  </Dropdown>
                </div>
              )}

              <Card.Meta
                avatar={
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: '#4f46e515',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                    }}
                  >
                    {app.icon}
                  </div>
                }
                title={
                  <Space>
                    <span>{app.name}</span>
                    <Tag color={STATUS_MAP[app.status]?.color || 'default'}>
                      {STATUS_MAP[app.status]?.label || app.status}
                    </Tag>
                  </Space>
                }
                description={
                  <div>
                    <div
                      style={{
                        color: '#8c8c8c',
                        fontSize: 13,
                        marginBottom: 8,
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {app.description || '暂无描述'}
                    </div>
                    <div style={{ fontSize: 12, color: '#bfbfbf' }}>
                      v{app.appVersion} · {app.tenantId}
                    </div>
                  </div>
                }
              />
            </Card>
          ))}
        </div>
      )}

      {/* 新建应用弹窗 */}
      <Modal
        title="新建应用"
        open={createModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalOpen(false);
          form.resetFields();
        }}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="应用名称"
            rules={[{ required: true, message: '请输入应用名称' }]}
          >
            <Input placeholder="例如：山水 OA" maxLength={30} />
          </Form.Item>
          <Form.Item name="description" label="应用描述">
            <Input.TextArea placeholder="简要描述应用用途" rows={3} maxLength={200} />
          </Form.Item>
          <Form.Item name="icon" label="应用图标">
            <Select
              placeholder="选择图标"
              options={[
                { label: '📋 文档', value: '📋' },
                { label: '🤝 握手', value: '🤝' },
                { label: '📊 图表', value: '📊' },
                { label: '👥 人群', value: '👥' },
                { label: '💰 金钱', value: '💰' },
                { label: '📦 包裹', value: '📦' },
                { label: '🔔 铃铛', value: '🔔' },
                { label: '⚙️ 齿轮', value: '⚙️' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
