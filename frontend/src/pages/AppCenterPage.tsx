/**
 * 应用中心页面
 *
 * 展示应用列表，管理员可新建/编辑/删除应用，员工只读。
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Tag, Space, Empty, Modal, Form, Select, Dropdown, message } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import { PermissionGuard } from '../components/PermissionGuard';

/** 应用数据结构 */
interface AppItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: 'draft' | 'published' | 'archived';
  version: string;
  createdBy: string;
  createdAt: string;
}

/** 模拟应用数据 */
const MOCK_APPS: AppItem[] = [
  {
    id: '597d90e9',
    name: '山水 OA',
    description: '办公自动化系统，包含审批流程、任务管理、日程安排等功能',
    icon: '📋',
    color: '#4f46e5',
    status: 'draft',
    version: '0.1.0',
    createdBy: '张总',
    createdAt: '2026-06-10',
  },
  {
    id: 'app-2',
    name: '山水 CRM',
    description: '客户关系管理系统，管理客户信息、商机跟进、销售漏斗',
    icon: '🤝',
    color: '#059669',
    status: 'published',
    version: '1.0.0',
    createdBy: '张总',
    createdAt: '2026-06-08',
  },
  {
    id: 'app-3',
    name: '项目管理',
    description: '项目进度跟踪、任务分配、甘特图、看板视图',
    icon: '📊',
    color: '#d97706',
    status: 'published',
    version: '1.2.0',
    createdBy: '张总',
    createdAt: '2026-05-20',
  },
  {
    id: 'app-4',
    name: '人事管理',
    description: '员工信息管理、考勤统计、薪资管理、招聘管理',
    icon: '👥',
    color: '#dc2626',
    status: 'published',
    version: '1.0.0',
    createdBy: '张总',
    createdAt: '2026-05-15',
  },
  {
    id: 'app-5',
    name: '财务报表',
    description: '财务数据汇总、报表生成、预算管理',
    icon: '💰',
    color: '#7c3aed',
    status: 'draft',
    version: '0.1.0',
    createdBy: '张总',
    createdAt: '2026-06-01',
  },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'green' },
  archived: { label: '已归档', color: 'orange' },
};

export default function AppCenterPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState(MOCK_APPS);
  const [searchText, setSearchText] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();

  const filteredApps = apps.filter(
    (app) =>
      app.name.includes(searchText) || app.description.includes(searchText),
  );

  const handleCreate = useCallback(() => {
    form.validateFields().then((values) => {
      const newApp: AppItem = {
        id: `app-${Date.now()}`,
        name: values.name,
        description: values.description || '',
        icon: values.icon || '📦',
        color: '#4f46e5',
        status: 'draft',
        version: '0.1.0',
        createdBy: '当前用户',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setApps((prev) => [newApp, ...prev]);
      setCreateModalOpen(false);
      form.resetFields();
      message.success('应用创建成功');
    });
  }, [form]);

  const handleDelete = useCallback((appId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复，是否继续？',
      onOk: () => {
        setApps((prev) => prev.filter((a) => a.id !== appId));
        message.success('已删除');
      },
    });
  }, []);

  const handlePublish = useCallback((appId: string) => {
    Modal.confirm({
      title: '确认发布',
      content: '发布后员工即可在应用中心看到该应用，是否继续？',
      onOk: () => {
        setApps((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, status: 'published' as const } : a)),
        );
        message.success('应用已发布');
      },
    });
  }, []);

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
        <PermissionGuard roles={['tenant_admin']}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            新建应用
          </Button>
        </PermissionGuard>
      </div>

      {/* 应用网格 */}
      {filteredApps.length === 0 ? (
        <Empty description="暂无应用" style={{ marginTop: 80 }} />
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
              key={app.id}
              className="app-card"
              hoverable
              style={{ position: 'relative' }}
            >
              {/* 右上角下拉菜单 */}
              {isAdmin && (
                <div
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 1,
                  }}
                >
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'edit',
                          icon: <EditOutlined />,
                          label: '编辑',
                          onClick: () => navigate(`/designer/app/${app.id}`),
                        },
                        ...(app.status === 'draft'
                          ? [
                              {
                                key: 'publish',
                                icon: <SendOutlined />,
                                label: '发布',
                                onClick: () => handlePublish(app.id),
                              },
                            ]
                          : []),
                        {
                          key: 'delete',
                          icon: <DeleteOutlined />,
                          label: '删除',
                          danger: true,
                          onClick: () => handleDelete(app.id),
                        },
                      ],
                    }}
                    trigger={['click']}
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<EllipsisOutlined style={{ fontSize: 16 }} />}
                      onClick={(e) => e.stopPropagation()}
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
                      background: `${app.color}15`,
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
                    <Tag color={STATUS_MAP[app.status].color}>
                      {STATUS_MAP[app.status].label}
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
                      {app.description}
                    </div>
                    <div style={{ fontSize: 12, color: '#bfbfbf' }}>
                      v{app.version} · {app.createdBy} · {app.createdAt}
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
