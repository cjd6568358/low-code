/**
 * 流程实例详情页
 *
 * 左侧：流程图（FlowChart），高亮当前节点和已完成路径
 * 右侧：节点执行结果时间线 + 快照详情
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tag,
  Spin,
  Button,
  Space,
  Timeline,
  Typography,
  Collapse,
  Empty,
  Descriptions,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { FlowChart } from '@low-code/renderer';
import type { BpmnDocument } from '@low-code/workflow';

const { Text, Title } = Typography;

/** 实例数据 */
interface InstanceData {
  id: string;
  workflowDefId: string;
  workflowKey: string;
  version: number;
  currentNodeId?: string;
  status: string;
  variables?: Record<string, unknown>;
  startedBy: string;
  startedByName?: string;
  startedAt: string;
  completedAt?: string;
}

/** 流程定义 */
interface WorkflowDefinition {
  id: string;
  name?: string;
  workflowKey: string;
  version: number;
  schema?: BpmnDocument;
  status: string;
}

/** Job 记录 */
interface JobRecord {
  id: string;
  instanceId: string;
  nodeId: string;
  nodeKey?: string;
  status: 'resolved' | 'failed' | 'error' | 'pending';
  result?: unknown;
  meta?: Record<string, unknown>;
  error?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 快照记录 */
interface SnapshotRecord {
  id: string;
  instanceId: string;
  nodeId?: string;
  nodeName?: string;
  sourceId: string;
  sourceTable: string;
  data: Record<string, unknown>;
  changedFields?: Record<string, { from: unknown; to: unknown }>;
  snapshotType: string;
  operatorId?: string;
  operatorName?: string;
  comment?: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  running: { label: '进行中', color: 'processing', icon: <SyncOutlined spin /> },
  waiting: { label: '等待中', color: 'orange', icon: <ClockCircleOutlined /> },
  pending: { label: '待审批', color: 'orange', icon: <ClockCircleOutlined /> },
  completed: { label: '已完成', color: 'green', icon: <CheckCircleOutlined /> },
  rejected: { label: '已驳回', color: 'red', icon: <CloseCircleOutlined /> },
  cancelled: { label: '已撤回', color: 'default', icon: <ExclamationCircleOutlined /> },
  terminated: { label: '已终止', color: 'default', icon: <ExclamationCircleOutlined /> },
  failed: { label: '执行失败', color: 'red', icon: <CloseCircleOutlined /> },
};

const SNAPSHOT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  INITIAL: { label: '初始', color: 'blue' },
  NODE_COMPLETE: { label: '节点完成', color: 'green' },
  NODE_REJECT: { label: '节点驳回', color: 'red' },
  FINAL: { label: '终态', color: 'purple' },
  TERMINATED: { label: '终止', color: 'default' },
};

export default function WorkflowInstanceDetailPage() {
  const { tenantId, appId, instanceId } = useParams<{
    tenantId: string;
    appId: string;
    instanceId: string;
  }>();
  const navigate = useNavigate();

  const [instance, setInstance] = useState<InstanceData | null>(null);
  const [definition, setDefinition] = useState<WorkflowDefinition | null>(null);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载所有数据
  useEffect(() => {
    if (!appId || !instanceId) return;

    const loadAll = async () => {
      setLoading(true);
      try {
        // 并行加载
        const [instanceRes, historyRes, jobsRes] = await Promise.all([
          fetch(`/api/apps/${appId}/workflow-instances/${instanceId}`),
          fetch(`/api/apps/${appId}/workflow-instances/${instanceId}/history`),
          fetch(`/api/apps/${appId}/workflow-instances/${instanceId}/jobs`),
        ]);

        const instanceData = await instanceRes.json();
        const historyData = await historyRes.json();
        const jobsData = await jobsRes.json();

        const inst = instanceData.data;
        setInstance(inst);
        setSnapshots(historyData.data?.snapshots || []);
        setJobs(jobsData.data || []);

        // 加载流程定义
        if (inst?.workflowDefId) {
          const defRes = await fetch(`/api/apps/${appId}/workflows/${inst.workflowDefId}`);
          const defData = await defRes.json();
          setDefinition(defData.data || defData.resource || null);
        }
      } catch {
        message.error('加载流程详情失败');
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [appId, instanceId]);

  // 计算已完成的节点 ID 列表
  const completedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const job of jobs) {
      if (job.status === 'resolved') {
        ids.add(job.nodeId);
      }
    }
    // 也从快照中提取
    for (const snap of snapshots) {
      if (snap.nodeId && (snap.snapshotType === 'NODE_COMPLETE' || snap.snapshotType === 'FINAL')) {
        ids.add(snap.nodeId);
      }
    }
    return Array.from(ids);
  }, [jobs, snapshots]);

  // 合并 jobs 和 snapshots 为时间线
  const timelineItems = useMemo(() => {
    const items: Array<{
      key: string;
      time: string;
      type: 'job' | 'snapshot';
      title: string;
      status: string;
      data: JobRecord | SnapshotRecord;
    }> = [];

    for (const job of jobs) {
      items.push({
        key: `job-${job.id}`,
        time: job.createdAt,
        type: 'job',
        title: `节点执行 [${job.nodeId}]`,
        status: job.status,
        data: job,
      });
    }

    for (const snap of snapshots) {
      items.push({
        key: `snap-${snap.id}`,
        time: snap.createdAt,
        type: 'snapshot',
        title: snap.nodeName
          ? `${SNAPSHOT_TYPE_CONFIG[snap.snapshotType]?.label || snap.snapshotType} - ${snap.nodeName}`
          : SNAPSHOT_TYPE_CONFIG[snap.snapshotType]?.label || snap.snapshotType,
        status: snap.snapshotType,
        data: snap,
      });
    }

    // 按时间排序
    items.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    return items;
  }, [jobs, snapshots]);

  const getStatusConfig = (status: string) =>
    STATUS_CONFIG[status] || { label: status, color: 'default', icon: null };

  const renderTimelineDot = (item: (typeof timelineItems)[0]) => {
    if (item.type === 'job') {
      const job = item.data as JobRecord;
      if (job.status === 'resolved') return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />;
      if (job.status === 'failed' || job.status === 'error') return <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />;
      return <ClockCircleOutlined style={{ color: '#faad14', fontSize: 16 }} />;
    }
    const snap = item.data as SnapshotRecord;
    const cfg = SNAPSHOT_TYPE_CONFIG[snap.snapshotType];
    if (cfg?.color === 'green') return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />;
    if (cfg?.color === 'red') return <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />;
    if (cfg?.color === 'purple') return <CheckCircleOutlined style={{ color: '#722ed1', fontSize: 16 }} />;
    return <ClockCircleOutlined style={{ color: '#1890ff', fontSize: 16 }} />;
  };

  const renderTimelineContent = (item: (typeof timelineItems)[0]) => {
    if (item.type === 'snapshot') {
      const snap = item.data as SnapshotRecord;
      return (
        <div>
          <div style={{ marginBottom: 8 }}>
            <Text strong>{item.title}</Text>
            {snap.operatorName && (
              <Text type="secondary" style={{ marginLeft: 8 }}>
                操作人：{snap.operatorName}
              </Text>
            )}
          </div>
          {snap.comment && (
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">备注：</Text>
              <Text>{snap.comment}</Text>
            </div>
          )}
          <Collapse
            ghost
            size="small"
            items={[
              {
                key: 'data',
                label: '快照数据',
                children: (
                  <pre
                    style={{
                      background: '#f5f5f5',
                      padding: 12,
                      borderRadius: 4,
                      fontSize: 12,
                      maxHeight: 300,
                      overflow: 'auto',
                      margin: 0,
                    }}
                  >
                    {JSON.stringify(snap.data, null, 2)}
                  </pre>
                ),
              },
              ...(snap.changedFields && Object.keys(snap.changedFields).length > 0
                ? [
                    {
                      key: 'changes',
                      label: `变更字段 (${Object.keys(snap.changedFields).length})`,
                      children: (
                        <div>
                          {Object.entries(snap.changedFields).map(([field, change]) => (
                            <div key={field} style={{ marginBottom: 4 }}>
                              <Text code>{field}</Text>
                              <Text type="secondary" style={{ margin: '0 8px' }}>
                                {JSON.stringify(change.from)} → {JSON.stringify(change.to)}
                              </Text>
                            </div>
                          ))}
                        </div>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      );
    }

    // job
    const job = item.data as JobRecord;
    return (
      <div>
        <div style={{ marginBottom: 8 }}>
          <Text strong>{item.title}</Text>
          <Tag
            color={job.status === 'resolved' ? 'green' : job.status === 'failed' || job.status === 'error' ? 'red' : 'orange'}
            style={{ marginLeft: 8 }}
          >
            {job.status}
          </Tag>
          {job.retryCount > 0 && (
            <Tag style={{ marginLeft: 4 }}>重试 {job.retryCount} 次</Tag>
          )}
        </div>
        {job.error && (
          <div style={{ marginBottom: 8 }}>
            <Text type="danger">{job.error}</Text>
          </div>
        )}
        {Boolean(job.result) && (
          <Collapse
            ghost
            size="small"
            items={[
              {
                key: 'result',
                label: '执行结果',
                children: (
                  <pre
                    style={{
                      background: '#f5f5f5',
                      padding: 12,
                      borderRadius: 4,
                      fontSize: 12,
                      maxHeight: 200,
                      overflow: 'auto',
                      margin: 0,
                    }}
                  >
                    {JSON.stringify(job.result, null, 2)}
                  </pre>
                ),
              },
            ]}
          />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!instance) {
    return <Empty description="流程实例不存在" />;
  }

  const statusCfg = getStatusConfig(instance.status);

  return (
    <div style={{ padding: 24 }}>
      {/* 头部 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/${tenantId}/app/${appId}/workflows`)}>
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {definition?.name || instance.workflowKey || '流程实例详情'}
          </Title>
          <Tag color={statusCfg.color} icon={statusCfg.icon}>
            {statusCfg.label}
          </Tag>
        </Space>
        <Space>
          <Text type="secondary">实例 ID：{instance.id}</Text>
          <Text type="secondary">版本：v{instance.version}</Text>
        </Space>
      </div>

      {/* 基本信息 */}
      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={4} size="small">
          <Descriptions.Item label="发起人">{instance.startedByName || instance.startedBy}</Descriptions.Item>
          <Descriptions.Item label="发起时间">{new Date(instance.startedAt).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="完成时间">
            {instance.completedAt ? new Date(instance.completedAt).toLocaleString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="当前节点">{instance.currentNodeId || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 主体：左侧流程图 + 右侧时间线 */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* 左侧流程图 */}
        <Card
          title="流程图"
          style={{ width: 400, flexShrink: 0 }}
          styles={{ body: { padding: 0 } }}
        >
          {definition?.schema ? (
            <FlowChart
              definition={definition.schema}
              currentNodeId={instance.currentNodeId}
              completedNodeIds={completedNodeIds}
              height={500}
            />
          ) : (
            <Empty description="暂无流程定义" style={{ padding: 40 }} />
          )}
        </Card>

        {/* 右侧时间线 */}
        <Card title="执行记录" style={{ flex: 1 }}>
          {timelineItems.length > 0 ? (
            <Timeline
              items={timelineItems.map((item) => ({
                dot: renderTimelineDot(item),
                children: renderTimelineContent(item),
              }))}
            />
          ) : (
            <Empty description="暂无执行记录" />
          )}
        </Card>
      </div>
    </div>
  );
}
