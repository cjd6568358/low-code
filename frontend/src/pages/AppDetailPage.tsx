/**
 * App detail page
 *
 * Left sidebar: resource categories (pages, tables, workflows, etc.)
 * Right content: resource list or resource editor
 * Top: app name + edit metadata (admin only)
 *
 * Route: /:tenantId/apps/:appId
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Empty, Spin, Modal, Form, Input, Select, Tag, message } from 'antd';
import {
  EditOutlined,
  PlusOutlined,
  SettingOutlined,
  FileOutlined,
  FormOutlined,
  TableOutlined,
  NodeIndexOutlined,
  ThunderboltOutlined,
  CalculatorOutlined,
  AppstoreOutlined,
  RocketOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuth } from '../auth/AuthContext';
import { buildId } from '../utils/resourceId';

const { Sider, Content } = Layout;

// Resource type config
const RESOURCE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  pages: { label: '页面', icon: <FileOutlined /> },
  cards: { label: '卡片', icon: <FormOutlined /> },
  forms: { label: '表单', icon: <FormOutlined /> },
  tables: { label: '数据表', icon: <TableOutlined /> },
  workflows: { label: '流程', icon: <NodeIndexOutlined /> },
  automations: { label: '自动化', icon: <ThunderboltOutlined /> },
  computations: { label: '运算', icon: <CalculatorOutlined /> },
};

// Resource item
interface ResourceItem {
  id: string;
  name: string;
  schemaVersion?: number;
  version?: number;
}

// App metadata
interface AppMeta {
  appId: string;
  name: string;
  description: string;
  icon: string;
  appVersion: string;
  status: string;
  componentLibrary: string;
  publishedAt?: number;
  bundleSize?: number;
}

export default function AppDetailPage() {
  const { tenantId, appId } = useParams<{ tenantId: string; appId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const tid = tenantId || '';
  const fullAppId = buildId('app', appId || '');

  const [loading, setLoading] = useState(true);
  const [appMeta, setAppMeta] = useState<AppMeta | null>(null);
  const [resources, setResources] = useState<Record<string, ResourceItem[]>>({});
  const [fromBundle, setFromBundle] = useState(false);
  const [activeMenu, setActiveMenu] = useState('pages');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [form] = Form.useForm();

  // Load app detail
  const loadApp = useCallback(async () => {
    if (!appId) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/apps/${fullAppId}`);
      const data = await resp.json();
      if (data.success) {
        setAppMeta(data.app);
        setResources(data.resources || {});
        setFromBundle(data.fromBundle || false);
      } else {
        message.error('应用不存在');
        navigate(`/${tid}/apps`);
      }
    } catch {
      message.error('加载应用失败');
      navigate(`/${tid}/apps`);
    } finally {
      setLoading(false);
    }
  }, [fullAppId, tid, navigate]);

  useEffect(() => {
    loadApp();
  }, [loadApp]);

  // Sidebar menu click
  const handleMenuClick: MenuProps['onClick'] = (info) => {
    setActiveMenu(info.key);
  };

  // Open edit metadata modal
  const handleEditMeta = useCallback(() => {
    if (appMeta) {
      form.setFieldsValue({
        name: appMeta.name,
        description: appMeta.description,
        icon: appMeta.icon,
      });
      setEditModalOpen(true);
    }
  }, [appMeta, form]);

  // Publish app
  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      const resp = await fetch(`/api/apps/${fullAppId}/publish`, { method: 'POST' });
      const data = await resp.json();
      if (data.success) {
        message.success(`发布成功，打包 ${data.bundle.resourceCount} 个资源`);
        loadApp();
      } else {
        message.error(data.error || '发布失败');
      }
    } catch {
      message.error('发布失败');
    } finally {
      setPublishing(false);
    }
  }, [fullAppId, loadApp]);

  // Save metadata
  const handleSaveMeta = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const resp = await fetch(`/api/apps/${fullAppId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await resp.json();
      if (data.success) {
        message.success('保存成功');
        setEditModalOpen(false);
        loadApp();
      } else {
        message.error(data.error || '保存失败');
      }
    } catch {
      message.error('保存失败');
    }
  }, [form, fullAppId, loadApp]);

  // Current resource list
  const currentResources = resources[activeMenu] || [];
  const currentConfig = RESOURCE_CONFIG[activeMenu];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ height: '100vh' }}>
      {/* Left sidebar */}
      <Sider
        width={220}
        style={{
          background: '#001529',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}
      >
        {/* App info */}
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 10,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 24 }}>{appMeta?.icon || '📦'}</span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div
              style={{
                color: 'white',
                fontSize: 15,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {appMeta?.name || ''}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
              v{appMeta?.appVersion || '1.0.0'}
            </div>
          </div>
        </div>

        {/* Resource menu */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeMenu]}
          onClick={handleMenuClick}
          style={{ flex: 1, overflowY: 'auto', borderRight: 'none' }}
          items={Object.entries(RESOURCE_CONFIG).map(([key, config]) => ({
            key,
            icon: config.icon,
            label: `${config.label}（${resources[key]?.length || 0}）`,
          }))}
        />

        {/* App settings (bottom) */}
        {isAdmin && (
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}
          >
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[]}
              style={{ borderRight: 'none' }}
              items={[
                {
                  key: 'edit-meta',
                  icon: <SettingOutlined />,
                  label: '应用设置',
                  onClick: handleEditMeta,
                },
              ]}
            />
          </div>
        )}
      </Sider>

      {/* Right content */}
      <Layout>
        {/* Top bar */}
        <div
          style={{
            height: 48,
            background: 'white',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e' }}>
              {currentConfig?.label}（{currentResources.length}）
            </span>
            {fromBundle ? (
              <Tag icon={<CloudOutlined />} color="success" style={{ margin: 0 }}>
                已发布
              </Tag>
            ) : appMeta?.status === 'published' ? (
              <Tag icon={<CloudOutlined />} color="warning" style={{ margin: 0 }}>
                有更新
              </Tag>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isAdmin && (
              <>
                <Button
                  icon={<RocketOutlined />}
                  size="small"
                  loading={publishing}
                  onClick={handlePublish}
                  type={appMeta?.status === 'published' && !fromBundle ? 'primary' : 'default'}
                >
                  发布
                </Button>
                <Button type="primary" icon={<PlusOutlined />} size="small">
                  新建{currentConfig?.label}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content area */}
        <Content style={{ padding: 24, overflow: 'auto', background: '#f5f5f5' }}>
          {currentResources.length === 0 ? (
            <Empty
              description={`暂无${currentConfig?.label}`}
              style={{ marginTop: 80 }}
            >
              {isAdmin && (
                <Button type="primary" icon={<PlusOutlined />}>
                  新建{currentConfig?.label}
                </Button>
              )}
            </Empty>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 12,
              }}
            >
              {currentResources.map((res) => (
                <div
                  key={res.id}
                  style={{
                    background: 'white',
                    borderRadius: 10,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    border: '1px solid #f0f0f0',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#4f46e5';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(79,70,229,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#f0f0f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{res.name}</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                    v{res.version || 1} · schema v{res.schemaVersion || 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Content>
      </Layout>

      {/* Edit metadata modal */}
      <Modal
        title="应用设置"
        open={editModalOpen}
        onOk={handleSaveMeta}
        onCancel={() => setEditModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="应用名称" rules={[{ required: true }]}>
            <Input maxLength={30} />
          </Form.Item>
          <Form.Item name="description" label="应用描述">
            <Input.TextArea rows={3} maxLength={200} />
          </Form.Item>
          <Form.Item name="icon" label="应用图标">
            <Select
              options={[
                { label: '📋 文档', value: '📋' },
                { label: '🤝 握手', value: '🤝' },
                { label: '📊 图表', value: '📊' },
                { label: '👥 人群', value: '👥' },
                { label: '💰 金钱', value: '💰' },
                { label: '📦 包裹', value: '📦' },
                { label: '🏔️ 山', value: '🏔️' },
                { label: '⚙️ 齿轮', value: '⚙️' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
