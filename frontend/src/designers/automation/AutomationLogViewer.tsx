/**
 * 自动化执行日志查看器
 *
 * 显示规则的执行历史和详细信息：
 * - 日志列表（支持分页）
 * - 执行详情（事件、条件、动作结果）
 * - 状态筛选
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Typography,
  Card,
  Descriptions,
  Timeline,
  Modal,
  Select,
  Tooltip,
  Empty,
  Spin,
  message,
} from 'antd';
import {
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  SkipOutlined,
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { Option } = Select;

/** 执行日志状态 */
type LogStatus = 'success' | 'partial_success' | 'failed';

/** 条件求值结果 */
interface ConditionResult {
  matched: boolean;
  details: Array<{
    rule: string;
    field: string;
    operator: string;
    expected: unknown;
    actual: unknown;
    matched: boolean;
  }>;
  evaluatedAt: string;
  durationMs: number;
}

/** 动作执行结果 */
interface ActionResultData {
  actionType: string;
  actionName: string;
  status: 'success' | 'failed' | 'skipped' | 'retrying';
  result?: unknown;
  error?: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  retryCount: number;
}

/** 执行日志 */
interface ExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  eventType: string;
  eventSource: string;
  eventData: string;
  conditionResult: string;
  actionResults: string;
  status: LogStatus;
  totalDurationMs: number;
  createdAt: string;
}

/** 组件属性 */
export interface AutomationLogViewerProps {
  /** 规则 ID */
  ruleId: string;
  /** 规则名称 */
  ruleName?: string;
  /** API 基础路径 */
  apiBase?: string;
}

/**
 * 获取状态标签颜色
 */
const getStatusColor = (status: LogStatus): string => {
  switch (status) {
    case 'success':
      return 'success';
    case 'partial_success':
      return 'warning';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
};

/**
 * 获取状态显示文本
 */
const getStatusLabel = (status: LogStatus): string => {
  switch (status) {
    case 'success':
      return '成功';
    case 'partial_success':
      return '部分成功';
    case 'failed':
      return '失败';
    default:
      return status;
  }
};

/**
 * 获取动作状态图标
 */
const getActionStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'failed':
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    case 'skipped':
      return <SkipOutlined style={{ color: '#999' }} />;
    case 'retrying':
      return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    default:
      return null;
  }
};

/**
 * 自动化执行日志查看器
 */
export const AutomationLogViewer: React.FC<AutomationLogViewerProps> = ({
  ruleId,
  ruleName,
  apiBase = '/api/automations',
}) => {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [selectedLog, setSelectedLog] = useState<ExecutionLog | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  /** 加载日志列表 */
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      });
      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await fetch(`${apiBase}/${ruleId}/logs?${params}`);
      const data = await response.json();

      setLogs(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      message.error('加载日志失败');
    } finally {
      setLoading(false);
    }
  }, [ruleId, page, pageSize, statusFilter, apiBase]);

  /** 初始加载 */
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /** 查看日志详情 */
  const handleViewDetail = useCallback((log: ExecutionLog) => {
    setSelectedLog(log);
    setDetailVisible(true);
  }, []);

  /** 解析 JSON 字段 */
  const parseJson = (jsonStr: string): unknown => {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  /** 表格列定义 */
  const columns = [
    {
      title: '执行时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '触发事件',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 150,
      render: (text: string) => <Tag>{text}</Tag>,
    },
    {
      title: '条件',
      key: 'condition',
      width: 100,
      render: (_: unknown, record: ExecutionLog) => {
        const result = parseJson(record.conditionResult) as ConditionResult | null;
        if (!result) return '-';
        return result.matched ? (
          <Tag icon={<CheckCircleOutlined />} color="success">匹配</Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">不匹配</Tag>
        );
      },
    },
    {
      title: '动作执行',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: ExecutionLog) => {
        const results = parseJson(record.actionResults) as ActionResultData[] | null;
        if (!results || results.length === 0) return '-';
        const successCount = results.filter(r => r.status === 'success').length;
        return `${successCount}/${results.length} 成功`;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: LogStatus) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'totalDurationMs',
      key: 'duration',
      width: 100,
      render: (ms: number) => `${ms}ms`,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: ExecutionLog) => (
        <Tooltip title="查看详情">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          />
        </Tooltip>
      ),
    },
  ];

  /** 渲染日志详情 */
  const renderDetail = () => {
    if (!selectedLog) return null;

    const eventData = parseJson(selectedLog.eventData) as Record<string, unknown> | null;
    const conditionResult = parseJson(selectedLog.conditionResult) as ConditionResult | null;
    const actionResults = parseJson(selectedLog.actionResults) as ActionResultData[] | null;

    return (
      <Modal
        title={`执行详情 — ${selectedLog.ruleName}`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
      >
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="规则名称">{selectedLog.ruleName}</Descriptions.Item>
          <Descriptions.Item label="执行 ID">{selectedLog.id}</Descriptions.Item>
          <Descriptions.Item label="触发时间">
            {new Date(selectedLog.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="总耗时">{selectedLog.totalDurationMs}ms</Descriptions.Item>
          <Descriptions.Item label="状态" span={2}>
            <Tag color={getStatusColor(selectedLog.status)}>
              {getStatusLabel(selectedLog.status)}
            </Tag>
          </Descriptions.Item>
        </Descriptions>

        {/* 触发事件 */}
        <Card size="small" title="触发事件" style={{ marginTop: 16 }}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="事件类型">
              <Tag>{selectedLog.eventType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="事件来源">
              {selectedLog.eventSource}
            </Descriptions.Item>
            {eventData && (
              <Descriptions.Item label="事件数据">
                <Paragraph
                  code
                  copyable
                  style={{ marginBottom: 0, maxHeight: 200, overflow: 'auto' }}
                >
                  {JSON.stringify(eventData, null, 2)}
                </Paragraph>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* 条件求值 */}
        <Card size="small" title="条件求值" style={{ marginTop: 16 }}>
          {conditionResult ? (
            <>
              <div style={{ marginBottom: 8 }}>
                <Text strong>结果: </Text>
                {conditionResult.matched ? (
                  <Tag color="success">匹配</Tag>
                ) : (
                  <Tag color="error">不匹配</Tag>
                )}
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  耗时: {conditionResult.durationMs}ms
                </Text>
              </div>

              {conditionResult.details.length > 0 && (
                <Timeline
                  items={conditionResult.details.map((detail, index) => ({
                    color: detail.matched ? 'green' : 'red',
                    children: (
                      <div key={index}>
                        <Text>{detail.rule}</Text>
                        <br />
                        <Text type="secondary">
                          实际值: {JSON.stringify(detail.actual)}
                        </Text>
                      </div>
                    ),
                  }))}
                />
              )}
            </>
          ) : (
            <Text type="secondary">无条件配置</Text>
          )}
        </Card>

        {/* 动作执行 */}
        <Card size="small" title="动作执行" style={{ marginTop: 16 }}>
          {actionResults && actionResults.length > 0 ? (
            <Timeline
              items={actionResults.map((result, index) => ({
                color: result.status === 'success' ? 'green' : result.status === 'failed' ? 'red' : 'gray',
                children: (
                  <div key={index}>
                    <Space>
                      {getActionStatusIcon(result.status)}
                      <Text strong>{result.actionName}</Text>
                      <Tag>{result.actionType}</Tag>
                      <Text type="secondary">{result.durationMs}ms</Text>
                      {result.retryCount > 0 && (
                        <Tag color="warning">重试 {result.retryCount} 次</Tag>
                      )}
                    </Space>
                    {result.error && (
                      <div style={{ marginTop: 4 }}>
                        <Text type="danger">{result.error}</Text>
                      </div>
                    )}
                    {result.result && (
                      <div style={{ marginTop: 4 }}>
                        <Text code style={{ fontSize: 12 }}>
                          {JSON.stringify(result.result)}
                        </Text>
                      </div>
                    )}
                  </div>
                ),
              }))}
            />
          ) : (
            <Text type="secondary">无动作执行</Text>
          )}
        </Card>
      </Modal>
    );
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <Text strong>执行日志</Text>
            {ruleName && <Text type="secondary">— {ruleName}</Text>}
          </Space>
        }
        extra={
          <Space>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="状态筛选"
              allowClear
              style={{ width: 120 }}
            >
              <Option value="success">成功</Option>
              <Option value="partial_success">部分成功</Option>
              <Option value="failed">失败</Option>
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchLogs}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              setPageSize(newPageSize);
            },
          }}
          locale={{
            emptyText: <Empty description="暂无执行日志" />,
          }}
        />
      </Card>

      {renderDetail()}
    </div>
  );
};

export default AutomationLogViewer;
