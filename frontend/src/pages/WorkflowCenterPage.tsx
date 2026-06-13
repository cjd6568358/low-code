/**
 * 流程中心页面
 *
 * 展示流程列表，支持按状态筛选。
 * 管理员可审批操作，员工只查看自己的流程。
 */

import { useState, useMemo } from 'react';
import { Card, Table, Tag, Button, Space, Tabs, Avatar, Empty } from 'antd';
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '../auth/AuthContext';
import { PermissionGuard } from '../components/PermissionGuard';

/** 流程数据结构 */
interface WorkflowItem {
  id: string;
  name: string;
  applicant: string;
  applicantId: string;
  currentNode: string;
  status: 'running' | 'pending' | 'completed' | 'rejected' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<
  WorkflowItem['status'],
  { label: string; color: string }
> = {
  running: { label: '进行中', color: 'processing' },
  pending: { label: '待审批', color: 'orange' },
  completed: { label: '已完成', color: 'green' },
  rejected: { label: '已驳回', color: 'red' },
  cancelled: { label: '已撤回', color: 'default' },
};

/** 模拟流程数据 */
const MOCK_WORKFLOWS: WorkflowItem[] = [
  {
    id: 'wf-1',
    name: '采购申请 - 办公设备采购',
    applicant: '张三',
    applicantId: 'user-zhangsan',
    currentNode: '部门主管审批',
    status: 'pending',
    createdAt: '2026-06-13 09:30',
    updatedAt: '2026-06-13 09:30',
  },
  {
    id: 'wf-2',
    name: '请假申请 - 年假 3 天',
    applicant: '李四',
    applicantId: 'user-lisi',
    currentNode: '部门主管审批',
    status: 'pending',
    createdAt: '2026-06-13 10:15',
    updatedAt: '2026-06-13 10:15',
  },
  {
    id: 'wf-3',
    name: '报销申请 - 出差费用报销',
    applicant: '王五',
    applicantId: 'user-wangwu',
    currentNode: '财务审核',
    status: 'running',
    createdAt: '2026-06-12 16:45',
    updatedAt: '2026-06-13 08:20',
  },
  {
    id: 'wf-4',
    name: '采购申请 - 服务器扩容',
    applicant: '张三',
    applicantId: 'user-zhangsan',
    currentNode: '-',
    status: 'completed',
    createdAt: '2026-06-10 14:00',
    updatedAt: '2026-06-12 11:30',
  },
  {
    id: 'wf-5',
    name: '请假申请 - 病假 1 天',
    applicant: '赵六',
    applicantId: 'user-zhaoliu',
    currentNode: '-',
    status: 'rejected',
    createdAt: '2026-06-11 08:00',
    updatedAt: '2026-06-11 15:30',
  },
  {
    id: 'wf-6',
    name: '报销申请 - 团建费用',
    applicant: '张三',
    applicantId: 'user-zhangsan',
    currentNode: '-',
    status: 'completed',
    createdAt: '2026-06-09 10:00',
    updatedAt: '2026-06-10 16:00',
  },
];

export default function WorkflowCenterPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');

  /** 根据 Tab 筛选数据 */
  const filteredData = useMemo(() => {
    if (activeTab === 'all') return MOCK_WORKFLOWS;
    if (activeTab === 'my-initiated') {
      return MOCK_WORKFLOWS.filter((w) => w.applicantId === user?.id);
    }
    if (activeTab === 'pending') {
      return MOCK_WORKFLOWS.filter((w) => w.status === 'pending');
    }
    if (activeTab === 'my-approved') {
      return MOCK_WORKFLOWS.filter(
        (w) => w.status === 'completed' || w.status === 'rejected',
      );
    }
    return MOCK_WORKFLOWS;
  }, [activeTab, user?.id]);

  const columns: ColumnsType<WorkflowItem> = [
    {
      title: '流程名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: '发起人',
      dataIndex: 'applicant',
      key: 'applicant',
      width: 100,
      render: (name: string) => (
        <Space>
          <Avatar size={24} style={{ background: '#4f46e5', fontSize: 12 }}>
            {name[0]}
          </Avatar>
          {name}
        </Space>
      ),
    },
    {
      title: '当前节点',
      dataIndex: 'currentNode',
      key: 'currentNode',
      width: 140,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: WorkflowItem['status']) => (
        <Tag color={STATUS_CONFIG[status].color}>{STATUS_CONFIG[status].label}</Tag>
      ),
    },
    {
      title: '发起时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />}>
            查看
          </Button>
          <PermissionGuard roles={['tenant_admin']}>
            {record.status === 'pending' && (
              <>
                <Button type="link" size="small" icon={<CheckOutlined />} style={{ color: '#52c41a' }}>
                  通过
                </Button>
                <Button type="link" size="small" icon={<CloseOutlined />} danger>
                  驳回
                </Button>
              </>
            )}
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  const tabItems = [
    ...(isAdmin
      ? [{ key: 'pending', label: '待我审批' }]
      : []),
    { key: 'my-initiated', label: '我发起的' },
    { key: 'my-approved', label: '我已审批' },
    { key: 'all', label: '全部流程' },
  ];

  return (
    <div>
      {/* 页面头部 */}
      <div className="page-header">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ marginBottom: 0 }}
        />
        <Button type="primary" icon={<PlusOutlined />}>
          发起流程
        </Button>
      </div>

      {/* 流程表格 */}
      <Card style={{ borderRadius: 12 }}>
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
          locale={{ emptyText: <Empty description="暂无流程数据" /> }}
        />
      </Card>
    </div>
  );
}
