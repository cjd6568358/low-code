/**
 * 流程中心页面
 *
 * 展示流程实例列表，支持按状态筛选。
 * 先选择应用，再展示该应用下的流程实例。
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Table, Tag, Button, Space, Tabs, Avatar, Empty, Select, Spin, message } from 'antd';
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/** 应用信息 */
interface AppInfo {
  appId: string;
  name: string;
}

/** 流程实例 */
interface WorkflowInstance {
  id: string;
  workflowDefId: string;
  workflowKey: string;
  version: number;
  sourceTable?: string;
  sourceId?: string;
  currentNodeId?: string;
  status: 'running' | 'waiting' | 'pending' | 'completed' | 'rejected' | 'cancelled' | 'terminated' | 'failed';
  variables?: Record<string, unknown>;
  startedBy: string;
  startedByName?: string;
  startedAt: string;
  completedAt?: string;
}

/** 流程定义 */
interface WorkflowDefinition {
  id: string;
  workflowKey: string;
  name?: string;
  version: number;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  running: { label: '进行中', color: 'processing' },
  waiting: { label: '等待中', color: 'orange' },
  pending: { label: '待审批', color: 'orange' },
  completed: { label: '已完成', color: 'green' },
  rejected: { label: '已驳回', color: 'red' },
  cancelled: { label: '已撤回', color: 'default' },
  terminated: { label: '已终止', color: 'default' },
  failed: { label: '执行失败', color: 'red' },
};

export default function WorkflowCenterPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { tenantId } = useParams<{ tenantId: string }>();

  const [apps, setApps] = useState<AppInfo[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // 加载应用列表
  useEffect(() => {
    fetch('/api/apps')
      .then((res) => res.json())
      .then((data) => {
        const appList = (data.data || data.resources || []).map((a: any) => ({
          appId: a.appId || a.id,
          name: a.name || a.appId || a.id,
        }));
        setApps(appList);
        if (appList.length > 0 && !selectedAppId) {
          setSelectedAppId(appList[0].appId);
        }
      })
      .catch(() => {});
  }, []);

  // 加载流程定义（用于显示流程名称）
  const loadDefinitions = useCallback(async (appId: string) => {
    try {
      const res = await fetch(`/api/apps/${appId}/workflows`);
      const data = await res.json();
      setDefinitions(data.data || data.resources || []);
    } catch {
      setDefinitions([]);
    }
  }, []);

  // 加载流程实例
  const loadInstances = useCallback(async (appId: string) => {
    if (!appId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/apps/${appId}/workflow-instances`);
      const data = await res.json();
      setInstances(data.data || []);
    } catch {
      message.error('加载流程实例失败');
      setInstances([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 选择应用时加载数据
  useEffect(() => {
    if (selectedAppId) {
      loadInstances(selectedAppId);
      loadDefinitions(selectedAppId);
    }
  }, [selectedAppId, loadInstances, loadDefinitions]);

  // 获取流程定义名称
  const getWorkflowName = useCallback(
    (defId: string) => {
      const def = definitions.find((d) => d.id === defId);
      return def?.name || def?.workflowKey || defId;
    },
    [definitions],
  );

  // 按 Tab 筛选
  const filteredData = useMemo(() => {
    if (activeTab === 'all') return instances;
    if (activeTab === 'my-initiated') {
      return instances.filter((i) => i.startedBy === user?.id);
    }
    return instances.filter((i) => i.status === activeTab);
  }, [instances, activeTab, user?.id]);

  // 终止流程
  const handleTerminate = useCallback(
    async (instanceId: string) => {
      try {
        const res = await fetch(`/api/apps/${selectedAppId}/workflow-instances/${instanceId}/terminate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operatorId: user?.id,
            operatorName: user?.name,
            reason: '手动终止',
          }),
        });
        if (res.ok) {
          message.success('流程已终止');
          loadInstances(selectedAppId);
        } else {
          message.error('终止失败');
        }
      } catch {
        message.error('终止失败');
      }
    },
    [selectedAppId, user, loadInstances],
  );

  const columns: ColumnsType<WorkflowInstance> = [
    {
      title: '流程名称',
      key: 'name',
      render: (_, record) => (
        <span style={{ fontWeight: 500 }}>
          {getWorkflowName(record.workflowDefId)}
        </span>
      ),
    },
    {
      title: '发起人',
      key: 'startedBy',
      width: 120,
      render: (_, record) => {
        const name = record.startedByName || record.startedBy;
        return (
          <Space>
            <Avatar size={24} style={{ background: '#4f46e5', fontSize: 12 }}>
              {name[0] || '?'}
            </Avatar>
            {name}
          </Space>
        );
      },
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      render: (v: number) => <Tag>v{v}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const cfg = STATUS_CONFIG[status] || { label: status, color: 'default' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '发起时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 180,
      render: (v: string) => (v ? new Date(v).toLocaleString() : '-'),
    },
    {
      title: '完成时间',
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 180,
      render: (v: string) => (v ? new Date(v).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/${tenantId}/app/${selectedAppId}/workflows/${record.id}`)}
          >
            查看
          </Button>
          {(record.status === 'running' || record.status === 'waiting') && (
            <Button
              type="link"
              size="small"
              icon={<StopOutlined />}
              danger
              onClick={() => handleTerminate(record.id)}
            >
              终止
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    { key: 'all', label: '全部' },
    { key: 'running', label: '进行中' },
    { key: 'waiting', label: '等待中' },
    { key: 'completed', label: '已完成' },
    { key: 'rejected', label: '已驳回' },
    ...(isAdmin ? [{ key: 'my-initiated', label: '我发起的' }] : []),
  ];

  return (
    <div>
      {/* 页面头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <span style={{ fontWeight: 500, fontSize: 14 }}>应用：</span>
          <Select
            style={{ width: 240 }}
            placeholder="选择应用"
            value={selectedAppId || undefined}
            onChange={setSelectedAppId}
            options={apps.map((a) => ({ label: a.name, value: a.appId }))}
            notFoundContent="暂无应用"
          />
        </Space>
      </div>

      {/* 状态 Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 0 }}
      />

      {/* 实例表格 */}
      <Card style={{ borderRadius: 12, marginTop: 8 }}>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
            locale={{ emptyText: <Empty description={selectedAppId ? '暂无流程实例' : '请先选择应用'} /> }}
          />
        </Spin>
      </Card>
    </div>
  );
}
