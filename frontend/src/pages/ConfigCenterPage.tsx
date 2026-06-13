/**
 * 配置中心页面（仅管理员可见）
 *
 * 使用 Tab 切换管理子模块：用户管理、角色管理、授权管理、租户设置。
 */

import { useState } from 'react';
import { Tabs, Card, Table, Tag, Button, Space, Avatar, Switch, Modal, Form, Input, Select, message } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  KeyOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PermissionGuard } from '../components/PermissionGuard';

// ─── 用户管理 ──────────────────────────────────────────

interface UserItem {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  role: string;
  status: 'active' | 'disabled';
  lastLoginAt: string;
}

const MOCK_USERS: UserItem[] = [
  {
    id: 'user-admin',
    name: '张总',
    email: 'admin@shansui.com',
    department: '总经办',
    position: '总经理',
    role: 'tenant_admin',
    status: 'active',
    lastLoginAt: '2026-06-13 10:00',
  },
  {
    id: 'user-zhangsan',
    name: '张三',
    email: 'zhangsan@shansui.com',
    department: '技术部 · 前端组',
    position: '高级前端工程师',
    role: 'department_default',
    status: 'active',
    lastLoginAt: '2026-06-13 09:15',
  },
  {
    id: 'user-lisi',
    name: '李四',
    email: 'lisi@shansui.com',
    department: '技术部 · 后端组',
    position: '后端工程师',
    role: 'department_default',
    status: 'active',
    lastLoginAt: '2026-06-12 17:30',
  },
  {
    id: 'user-wangwu',
    name: '王五',
    email: 'wangwu@shansui.com',
    department: '产品部',
    position: '产品经理',
    role: 'department_default',
    status: 'active',
    lastLoginAt: '2026-06-13 08:45',
  },
  {
    id: 'user-zhaoliu',
    name: '赵六',
    email: 'zhaoliu@shansui.com',
    department: '人事部',
    position: 'HR 专员',
    role: 'department_default',
    status: 'disabled',
    lastLoginAt: '2026-06-10 14:20',
  },
];

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  tenant_admin: { label: '租户管理员', color: 'blue' },
  department_default: { label: '员工', color: 'default' },
  app_admin: { label: '应用管理员', color: 'purple' },
};

function UserManagementTab() {
  const [users, setUsers] = useState(MOCK_USERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const columns: ColumnsType<UserItem> = [
    {
      title: '用户',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar size={32} style={{ background: '#4f46e5' }}>
            {record.name[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    { title: '部门', dataIndex: 'department', key: 'department' },
    { title: '岗位', dataIndex: 'position', key: 'position' },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={ROLE_LABELS[role]?.color || 'default'}>
          {ROLE_LABELS[role]?.label || role}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record) => (
        <Switch
          checked={status === 'active'}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          onChange={(checked) => {
            setUsers((prev) =>
              prev.map((u) =>
                u.id === record.id
                  ? { ...u, status: checked ? 'active' : 'disabled' }
                  : u,
              ),
            );
          }}
        />
      ),
    },
    { title: '最后登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', width: 160 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: () => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />}>
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          新增用户
        </Button>
      </div>
      <Table columns={columns} dataSource={users} rowKey="id" pagination={false} />
      <Modal
        title="新增用户"
        open={modalOpen}
        onOk={() => {
          form.validateFields().then(() => {
            message.success('用户创建成功（演示）');
            setModalOpen(false);
            form.resetFields();
          });
        }}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true }, { type: 'email' }]}>
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="department" label="部门">
            <Select
              placeholder="选择部门"
              options={[
                { label: '总经办', value: '总经办' },
                { label: '技术部 · 前端组', value: '技术部 · 前端组' },
                { label: '技术部 · 后端组', value: '技术部 · 后端组' },
                { label: '产品部', value: '产品部' },
                { label: '人事部', value: '人事部' },
              ]}
            />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select
              placeholder="选择角色"
              options={[
                { label: '租户管理员', value: 'tenant_admin' },
                { label: '员工', value: 'department_default' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ─── 角色管理 ──────────────────────────────────────────

interface RoleItem {
  id: string;
  name: string;
  level: string;
  description: string;
  isBuiltin: boolean;
  userCount: number;
}

const MOCK_ROLES: RoleItem[] = [
  { id: 'tenant_admin', name: '租户管理员', level: 'tenant', description: '拥有租户内所有权限', isBuiltin: true, userCount: 1 },
  { id: 'app_admin', name: '应用管理员', level: 'app', description: '管理指定应用的所有资源', isBuiltin: true, userCount: 0 },
  { id: 'department_default', name: '部门默认角色', level: 'business', description: '所有菜单和按钮的只读权限', isBuiltin: true, userCount: 4 },
  { id: 'custom-1', name: '财务审批员', level: 'business', description: '负责财务相关流程审批', isBuiltin: false, userCount: 2 },
];

function RoleManagementTab() {
  const columns: ColumnsType<RoleItem> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{name}</span>
          {record.isBuiltin && <Tag color="blue">内置</Tag>}
        </Space>
      ),
    },
    {
      title: '层级',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => {
        const levelMap: Record<string, string> = {
          platform: '平台级',
          tenant: '租户级',
          app: '应用级',
          business: '业务级',
        };
        return <Tag>{levelMap[level] || level}</Tag>;
      },
    },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '关联用户', dataIndex: 'userCount', key: 'userCount', width: 100 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} disabled={record.isBuiltin}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<DeleteOutlined />} danger disabled={record.isBuiltin}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />}>
          新建角色
        </Button>
      </div>
      <Table columns={columns} dataSource={MOCK_ROLES} rowKey="id" pagination={false} />
    </>
  );
}

// ─── 授权管理 ──────────────────────────────────────────

const MOCK_PERMISSION_MATRIX = [
  { resource: '工作台', type: '菜单', tenantAdmin: true, employee: true },
  { resource: '应用中心', type: '菜单', tenantAdmin: true, employee: true },
  { resource: '流程中心', type: '菜单', tenantAdmin: true, employee: true },
  { resource: '配置中心', type: '菜单', tenantAdmin: true, employee: false },
  { resource: '新建应用', type: '按钮', tenantAdmin: true, employee: false },
  { resource: '编辑应用', type: '按钮', tenantAdmin: true, employee: false },
  { resource: '删除应用', type: '按钮', tenantAdmin: true, employee: false },
  { resource: '审批流程', type: '按钮', tenantAdmin: true, employee: false },
  { resource: '发起流程', type: '按钮', tenantAdmin: true, employee: true },
  { resource: '查看流程', type: '按钮', tenantAdmin: true, employee: true },
  { resource: '用户管理', type: '数据', tenantAdmin: true, employee: false },
  { resource: '角色管理', type: '数据', tenantAdmin: true, employee: false },
];

function AuthorizationTab() {
  const columns: ColumnsType<(typeof MOCK_PERMISSION_MATRIX)[0]> = [
    { title: '资源', dataIndex: 'resource', key: 'resource' },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const colorMap: Record<string, string> = { 菜单: 'blue', 按钮: 'green', 数据: 'orange' };
        return <Tag color={colorMap[type] || 'default'}>{type}</Tag>;
      },
    },
    {
      title: '租户管理员',
      dataIndex: 'tenantAdmin',
      key: 'tenantAdmin',
      width: 120,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'red'}>{v ? '✅ 允许' : '❌ 拒绝'}</Tag>
      ),
    },
    {
      title: '员工',
      dataIndex: 'employee',
      key: 'employee',
      width: 120,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'red'}>{v ? '✅ 允许' : '❌ 拒绝'}</Tag>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={MOCK_PERMISSION_MATRIX}
      rowKey="resource"
      pagination={false}
    />
  );
}

// ─── 租户设置 ──────────────────────────────────────────

function TenantSettingsTab() {
  return (
    <div style={{ maxWidth: 600 }}>
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Form layout="vertical">
          <Form.Item label="租户名称">
            <Input defaultValue="山水集团" />
          </Form.Item>
          <Form.Item label="租户 ID">
            <Input defaultValue="shansui" disabled />
          </Form.Item>
          <Form.Item label="当前套餐">
            <Select
              defaultValue="enterprise"
              options={[
                { label: '免费版', value: 'free' },
                { label: '专业版', value: 'pro' },
                { label: '企业版', value: 'enterprise' },
              ]}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary">保存设置</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="安全设置">
        <Form layout="vertical">
          <Form.Item label="密码最小长度">
            <Input defaultValue="8" type="number" />
          </Form.Item>
          <Form.Item label="登录失败锁定次数">
            <Input defaultValue="5" type="number" />
          </Form.Item>
          <Form.Item label="会话超时（分钟）">
            <Input defaultValue="480" type="number" />
          </Form.Item>
          <Form.Item>
            <Button type="primary">保存设置</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

// ─── 配置中心主组件 ────────────────────────────────────

export default function ConfigCenterPage() {
  const [activeTab, setActiveTab] = useState('users');

  const tabItems = [
    {
      key: 'users',
      label: (
        <span>
          <UserOutlined style={{ marginRight: 4 }} />
          用户管理
        </span>
      ),
      children: <UserManagementTab />,
    },
    {
      key: 'roles',
      label: (
        <span>
          <SafetyCertificateOutlined style={{ marginRight: 4 }} />
          角色管理
        </span>
      ),
      children: <RoleManagementTab />,
    },
    {
      key: 'authorization',
      label: (
        <span>
          <KeyOutlined style={{ marginRight: 4 }} />
          授权管理
        </span>
      ),
      children: <AuthorizationTab />,
    },
    {
      key: 'tenant',
      label: (
        <span>
          <SettingOutlined style={{ marginRight: 4 }} />
          租户设置
        </span>
      ),
      children: <TenantSettingsTab />,
    },
  ];

  return (
    <PermissionGuard
      roles={['tenant_admin']}
      fallback={
        <div style={{ textAlign: 'center', marginTop: 100, color: '#8c8c8c' }}>
          无权访问配置中心
        </div>
      }
    >
      <Card style={{ borderRadius: 12 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="config-tabs"
        />
      </Card>
    </PermissionGuard>
  );
}
