/**
 * 配置中心页面（仅管理员可见）
 *
 * 使用 Tab 切换管理子模块：用户管理、角色管理、授权管理、租户设置。
 * 数据从 API 加载，不再使用 Mock。
 */

import { useState, useEffect, useCallback } from 'react';
import { App, Tabs, Card, Table, Tag, Button, Space, Avatar, Switch, Modal, Form, Input, Select, Checkbox, Spin } from 'antd';
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
import { useAuth } from '../auth/AuthContext';

// ─── 类型 ──────────────────────────────────────────────

interface UserItem {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  role: string;
  roleName: string;
  status: 'active' | 'disabled';
  lastLoginAt: string;
}

interface RoleItem {
  id: string;
  name: string;
  level: string;
  description: string;
  isBuiltin: boolean;
  userCount: number;
}

interface PermissionMatrixRow {
  resource: string;
  type: string;
  resourceId: string;
  [roleId: string]: string | boolean;
}

interface RoleInfo {
  id: string;
  name: string;
  level: string;
  isBuiltin: boolean;
}

// ─── 常量 ──────────────────────────────────────────────

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  tenant_admin: { label: '租户管理员', color: 'blue' },
  department_default: { label: '员工', color: 'default' },
  app_admin: { label: '应用管理员', color: 'purple' },
};

// ─── 用户管理 ──────────────────────────────────────────

function UserManagementTab() {
  const { message } = App.useApp();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  /** 加载用户列表 */
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/users');
      const data = await resp.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch {
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /** 切换用户状态 */
  const handleStatusChange = useCallback(async (userId: string, checked: boolean) => {
    try {
      const resp = await fetch(`/api/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: checked ? 'active' : 'disabled' }),
      });
      const data = await resp.json();
      if (data.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, status: checked ? 'active' : 'disabled' } : u,
          ),
        );
        message.success(checked ? '已启用' : '已禁用');
      } else {
        message.error(data.error || '操作失败');
      }
    } catch {
      message.error('操作失败');
    }
  }, []);

  /** 创建用户 */
  const handleCreateUser = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const resp = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await resp.json();
      if (data.success) {
        message.success('用户创建成功');
        setModalOpen(false);
        form.resetFields();
        loadUsers();
      } else {
        message.error(data.error || '创建失败');
      }
    } catch {
      message.error('创建失败');
    }
  }, [form, loadUsers]);

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
      key: 'role',
      render: (_, record) => (
        <Tag color={ROLE_LABELS[record.role]?.color || 'default'}>
          {record.roleName || ROLE_LABELS[record.role]?.label || record.role}
        </Tag>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => (
        <Switch
          checked={record.status === 'active'}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          onChange={(checked) => handleStatusChange(record.id, checked)}
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
      <Table columns={columns} dataSource={users} rowKey="id" pagination={false} loading={loading} />
      <Modal
        title="新增用户"
        open={modalOpen}
        onOk={handleCreateUser}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        okText="创建"
        cancelText="取消"
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

function RoleManagementTab() {
  const { message } = App.useApp();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  /** 加载角色列表 */
  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/roles');
      const data = await resp.json();
      if (data.success) {
        setRoles(data.roles);
      }
    } catch {
      message.error('加载角色列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  /** 创建角色 */
  const handleCreateRole = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const resp = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await resp.json();
      if (data.success) {
        message.success('角色创建成功');
        setModalOpen(false);
        form.resetFields();
        loadRoles();
      } else {
        message.error(data.error || '创建失败');
      }
    } catch {
      message.error('创建失败');
    }
  }, [form, loadRoles]);

  /** 删除角色 */
  const handleDeleteRole = useCallback((roleId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除角色将同时移除关联的权限和用户绑定，是否继续？',
      onOk: async () => {
        try {
          const resp = await fetch(`/api/roles/${roleId}`, { method: 'DELETE' });
          const data = await resp.json();
          if (data.success) {
            message.success('已删除');
            loadRoles();
          } else {
            message.error(data.error || '删除失败');
          }
        } catch {
          message.error('删除失败');
        }
      },
    });
  }, [loadRoles]);

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
          <Button
            type="link"
            size="small"
            icon={<DeleteOutlined />}
            danger
            disabled={record.isBuiltin}
            onClick={() => handleDeleteRole(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          新建角色
        </Button>
      </div>
      <Table columns={columns} dataSource={roles} rowKey="id" pagination={false} loading={loading} />
      <Modal
        title="新建角色"
        open={modalOpen}
        onOk={handleCreateRole}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="角色名称" rules={[{ required: true }]}>
            <Input placeholder="请输入角色名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入角色描述" rows={2} />
          </Form.Item>
          <Form.Item name="level" label="层级" initialValue="business">
            <Select
              options={[
                { label: '租户级', value: 'tenant' },
                { label: '应用级', value: 'app' },
                { label: '业务级', value: 'business' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ─── 授权管理 ──────────────────────────────────────────

function AuthorizationTab() {
  const { message } = App.useApp();
  const [matrix, setMatrix] = useState<PermissionMatrixRow[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, boolean>>({});

  /** 加载权限矩阵 */
  const loadMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/permissions/matrix');
      const data = await resp.json();
      if (data.success) {
        setMatrix(data.matrix);
        setRoles(data.roles);
      }
    } catch {
      message.error('加载权限矩阵失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  /** 开始编辑某角色的权限 */
  const handleStartEdit = useCallback((roleId: string) => {
    setEditingRole(roleId);
    const values: Record<string, boolean> = {};
    matrix.forEach((row) => {
      values[row.resourceId] = !!row[roleId];
    });
    setEditValues(values);
  }, [matrix]);

  /** 保存角色权限 */
  const handleSavePermissions = useCallback(async () => {
    if (!editingRole) return;

    try {
      const permissions = Object.entries(editValues).map(([resourceId, allowed]) => {
        const row = matrix.find((r) => r.resourceId === resourceId);
        return {
          resourceId,
          resourceType: row?.type || 'menu',
          allowed,
        };
      });

      const resp = await fetch('/api/permissions/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: editingRole, permissions }),
      });
      const data = await resp.json();
      if (data.success) {
        message.success('权限已更新');
        setEditingRole(null);
        loadMatrix();
      } else {
        message.error(data.error || '保存失败');
      }
    } catch {
      message.error('保存失败');
    }
  }, [editingRole, editValues, matrix, loadMatrix]);

  /** 构建列定义 */
  const columns: ColumnsType<PermissionMatrixRow> = [
    { title: '资源', dataIndex: 'resource', key: 'resource' },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const colorMap: Record<string, string> = { menu: 'blue', button: 'green', data: 'orange' };
        const labelMap: Record<string, string> = { menu: '菜单', button: '按钮', data: '数据' };
        return <Tag color={colorMap[type] || 'default'}>{labelMap[type] || type}</Tag>;
      },
    },
    ...roles.map((role) => ({
      title: (
        <Space>
          <span>{role.name}</span>
          {!role.isBuiltin && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleStartEdit(role.id)}
            />
          )}
        </Space>
      ),
      dataIndex: role.id,
      key: role.id,
      width: 140,
      render: (_: unknown, record: PermissionMatrixRow) => {
        if (editingRole === role.id) {
          return (
            <Checkbox
              checked={editValues[record.resourceId] || false}
              onChange={(e) =>
                setEditValues((prev) => ({ ...prev, [record.resourceId]: e.target.checked }))
              }
            />
          );
        }
        const allowed = record[role.id];
        return (
          <Tag color={allowed ? 'green' : 'red'}>
            {allowed ? '✅ 允许' : '❌ 拒绝'}
          </Tag>
        );
      },
    })),
  ];

  return (
    <>
      {editingRole && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          <Button type="primary" onClick={handleSavePermissions}>
            保存权限
          </Button>
          <Button onClick={() => setEditingRole(null)}>取消</Button>
        </div>
      )}
      <Table
        columns={columns}
        dataSource={matrix}
        rowKey="resourceId"
        pagination={false}
        loading={loading}
      />
    </>
  );
}

// ─── 租户设置 ──────────────────────────────────────────

function TenantSettingsTab() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);

  /** 加载租户信息 */
  useEffect(() => {
    if (!user?.tenantId) return;
    fetch(`/api/tenants/${user.tenantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.tenant) {
          form.setFieldsValue({
            name: data.tenant.name || '',
            plan: data.tenant.plan || 'enterprise',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.tenantId]);

  /** 保存设置 */
  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const resp = await fetch(`/api/tenants/${user?.tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await resp.json();
      if (data.success) {
        message.success('设置已保存');
      } else {
        message.error(data.error || '保存失败');
      }
    } catch {
      message.error('保存失败');
    }
  }, [user?.tenantId]);

  return (
    <div style={{ maxWidth: 600 }}>
      <Card title="基本信息" style={{ marginBottom: 16 }} loading={loading}>
        <Form form={form} layout="vertical">
          <Form.Item label="租户名称" name="name">
            <Input />
          </Form.Item>
          <Form.Item label="租户 ID">
            <Input value={user?.tenantId || ''} disabled />
          </Form.Item>
          <Form.Item label="当前套餐" name="plan">
            <Select
              options={[
                { label: '免费版', value: 'free' },
                { label: '专业版', value: 'pro' },
                { label: '企业版', value: 'enterprise' },
              ]}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleSave}>
              保存设置
            </Button>
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
            <Button type="primary" onClick={() => message.success('设置已保存（演示）')}>
              保存设置
            </Button>
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
