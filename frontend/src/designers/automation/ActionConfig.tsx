/**
 * 动作配置组件
 *
 * 支持 4 种动作类型的可视化配置：
 * - 触发流程 (trigger_workflow)
 * - 执行表达式 (execute_expression)
 * - 发送通知 (send_notification)
 * - 数据操作 (data_operation)
 *
 * 支持：
 * - 动作列表拖拽排序
 * - 每个动作独立配置
 * - 动作级别条件
 * - 重试策略配置
 */

import React, { useCallback, useState } from 'react';
import {
  Form,
  Select,
  Input,
  InputNumber,
  Switch,
  Button,
  Space,
  Card,
  Typography,
  Tooltip,
  Popconfirm,
  Tag,
  Collapse,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  DragOutlined,
  CopyOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlayCircleOutlined,
  CodeOutlined,
  SendOutlined,
  DatabaseOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { ExpressionEditor } from '@low-code/renderer';

const { Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;

/** 动作类型选项 */
const ACTION_TYPES = [
  { value: 'trigger_workflow', label: '触发流程', icon: <PlayCircleOutlined />, description: '启动指定流程引擎实例' },
  { value: 'execute_expression', label: '执行表达式', icon: <CodeOutlined />, description: '使用公共表达式引擎执行自定义表达式' },
  { value: 'send_notification', label: '发送通知', icon: <SendOutlined />, description: '通过消息中心发送多渠道通知' },
  { value: 'data_operation', label: '数据操作', icon: <DatabaseOutlined />, description: '创建/更新/删除实体记录' },
];

/** 通知渠道选项 */
const NOTIFICATION_CHANNELS = [
  { value: 'site', label: '站内消息' },
  { value: 'email', label: '邮件' },
  { value: 'sms', label: '短信' },
  { value: 'wecom', label: '企业微信' },
  { value: 'dingtalk', label: '钉钉' },
  { value: 'feishu', label: '飞书' },
];

/** 通知优先级选项 */
const NOTIFICATION_PRIORITIES = [
  { value: 'low', label: '低', color: 'default' },
  { value: 'normal', label: '普通', color: 'blue' },
  { value: 'high', label: '高', color: 'orange' },
  { value: 'urgent', label: '紧急', color: 'red' },
];

/** 数据操作类型选项 */
const DATA_OPERATIONS = [
  { value: 'create', label: '创建记录' },
  { value: 'update', label: '更新记录' },
  { value: 'delete', label: '删除记录' },
];

/** 动作配置接口 */
interface ActionConfig {
  type: string;
  name: string;
  async?: boolean;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number[];
  };
  condition?: Record<string, unknown>;
  triggerWorkflow?: {
    workflowId: string;
    variables?: Record<string, unknown>;
    initiator?: string;
  };
  executeExpression?: {
    script: string;
    context?: Record<string, unknown>;
  };
  sendNotification?: {
    templateId?: string;
    channels: string[];
    recipients: Array<{ type: string; value: string }>;
    title?: string;
    content?: string;
    priority?: string;
    variables?: Record<string, unknown>;
  };
  dataOperation?: {
    entityCode: string;
    operation: string;
    data?: Record<string, unknown>;
    filter?: Record<string, unknown>;
  };
}

/** 组件属性 */
export interface ActionConfigProps {
  /** 动作列表 */
  value?: ActionConfig[];
  /** 值变更回调 */
  onChange?: (value: ActionConfig[]) => void;
  /** 可选的流程列表 */
  workflows?: Array<{ id: string; name: string }>;
  /** 可选的实体列表 */
  entities?: Array<{ code: string; name: string }>;
}

/**
 * 动作配置组件
 */
export const ActionConfig: React.FC<ActionConfigProps> = ({
  value = [],
  onChange,
  workflows = [],
  entities = [],
}) => {
  /** 通知值变更 */
  const handleChange = useCallback(
    (newActions: ActionConfig[]) => {
      onChange?.(newActions);
    },
    [onChange]
  );

  /** 添加动作 */
  const handleAddAction = useCallback(() => {
    const newAction: ActionConfig = {
      type: 'trigger_workflow',
      name: `动作 ${value.length + 1}`,
    };
    handleChange([...value, newAction]);
  }, [value, handleChange]);

  /** 更新动作 */
  const handleActionChange = useCallback(
    (index: number, field: string, fieldValue: unknown) => {
      const newActions = [...value];
      newActions[index] = { ...newActions[index], [field]: fieldValue };
      handleChange(newActions);
    },
    [value, handleChange]
  );

  /** 删除动作 */
  const handleDeleteAction = useCallback(
    (index: number) => {
      const newActions = value.filter((_, i) => i !== index);
      handleChange(newActions);
    },
    [value, handleChange]
  );

  /** 复制动作 */
  const handleCopyAction = useCallback(
    (index: number) => {
      const action = value[index];
      const newAction = { ...action, name: `${action.name} (副本)` };
      const newActions = [...value];
      newActions.splice(index + 1, 0, newAction);
      handleChange(newActions);
    },
    [value, handleChange]
  );

  /** 移动动作 */
  const handleMoveAction = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= value.length) return;
      const newActions = [...value];
      const [moved] = newActions.splice(fromIndex, 1);
      newActions.splice(toIndex, 0, moved);
      handleChange(newActions);
    },
    [value, handleChange]
  );

  /** 渲染触发流程配置 */
  const renderTriggerWorkflowConfig = (action: ActionConfig, index: number) => {
    const config = action.triggerWorkflow || { workflowId: '' };

    return (
      <>
        <Form.Item label="选择流程" required>
          <Select
            value={config.workflowId}
            onChange={(val) => handleActionChange(index, 'triggerWorkflow', { ...config, workflowId: val })}
            placeholder="选择要触发的流程"
          >
            {workflows.map(wf => (
              <Option key={wf.id} value={wf.id}>
                {wf.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label={
            <Space>
              流程变量
              <Tooltip title="支持 {{event.data.xxx}} 语法">
                <QuestionCircleOutlined />
              </Tooltip>
            </Space>
          }
        >
          <TextArea
            value={config.variables ? JSON.stringify(config.variables, null, 2) : ''}
            onChange={(e) => {
              try {
                const vars = e.target.value ? JSON.parse(e.target.value) : undefined;
                handleActionChange(index, 'triggerWorkflow', { ...config, variables: vars });
              } catch {
                // 忽略 JSON 解析错误
              }
            }}
            placeholder={'{\n  "orderId": "{{event.data.recordId}}"\n}'}
            rows={3}
          />
        </Form.Item>
      </>
    );
  };

  /** 渲染执行表达式配置 */
  const renderExecuteExpressionConfig = (action: ActionConfig, index: number) => {
    const config = action.executeExpression || { script: '' };
    const [editorVisible, setEditorVisible] = useState(false);

    return (
      <>
        <Form.Item
          label={
            <Space>
              脚本内容
              <Tooltip title="使用表达式引擎执行，支持 $event、$rule、$tenant 等上下文变量">
                <QuestionCircleOutlined />
              </Tooltip>
            </Space>
          }
          required
        >
          <div style={{ marginBottom: 8 }}>
            <Button
              type="dashed"
              icon={<CodeOutlined />}
              onClick={() => setEditorVisible(true)}
              block
            >
              {config.script ? '编辑脚本' : '编写脚本'}
            </Button>
          </div>

          {config.script && (
            <div style={{
              padding: 12,
              background: '#f5f5f5',
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: 12,
              maxHeight: 200,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {config.script}
            </div>
          )}
        </Form.Item>

        <Form.Item
          label={
            <Space>
              脚本上下文
              <Tooltip title="传递给脚本的额外上下文变量（JSON 格式）">
                <QuestionCircleOutlined />
              </Tooltip>
            </Space>
          }
        >
          <TextArea
            value={config.context ? JSON.stringify(config.context, null, 2) : ''}
            onChange={(e) => {
              try {
                const ctx = e.target.value ? JSON.parse(e.target.value) : undefined;
                handleActionChange(index, 'executeExpression', { ...config, context: ctx });
              } catch {
                // 忽略 JSON 解析错误
              }
            }}
            placeholder={'{\n  "customVar": "value"\n}'}
            rows={3}
          />
        </Form.Item>

        <ExpressionEditor
          visible={editorVisible}
          value={config.script}
          onChange={(val) => {
            handleActionChange(index, 'executeExpression', { ...config, script: val.value });
            setEditorVisible(false);
          }}
          onClear={() => {
            handleActionChange(index, 'executeExpression', { ...config, script: '' });
            setEditorVisible(false);
          }}
          onClose={() => setEditorVisible(false)}
          async={false}
          allowedVariables={['$event', '$rule', '$tenant', '$now']}
        />
      </>
    );
  };

  /** 渲染发送通知配置 */
  const renderSendNotificationConfig = (action: ActionConfig, index: number) => {
    const config = action.sendNotification || {
      channels: [],
      recipients: [],
      priority: 'normal',
    };

    return (
      <>
        <Form.Item label="通知渠道" required>
          <Select
            mode="multiple"
            value={config.channels}
            onChange={(val) => handleActionChange(index, 'sendNotification', { ...config, channels: val })}
            placeholder="选择通知渠道"
          >
            {NOTIFICATION_CHANNELS.map(ch => (
              <Option key={ch.value} value={ch.value}>
                {ch.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="通知优先级">
          <Select
            value={config.priority || 'normal'}
            onChange={(val) => handleActionChange(index, 'sendNotification', { ...config, priority: val })}
          >
            {NOTIFICATION_PRIORITIES.map(p => (
              <Option key={p.value} value={p.value}>
                <Tag color={p.color}>{p.label}</Tag>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="消息标题">
          <Input
            value={config.title}
            onChange={(e) => handleActionChange(index, 'sendNotification', { ...config, title: e.target.value })}
            placeholder="输入消息标题（支持变量插值）"
          />
        </Form.Item>

        <Form.Item label="消息内容">
          <TextArea
            value={config.content}
            onChange={(e) => handleActionChange(index, 'sendNotification', { ...config, content: e.target.value })}
            placeholder="输入消息内容（支持变量插值）"
            rows={3}
          />
        </Form.Item>
      </>
    );
  };

  /** 渲染数据操作配置 */
  const renderDataOperationConfig = (action: ActionConfig, index: number) => {
    const config = action.dataOperation || { entityCode: '', operation: 'create' };

    return (
      <>
        <Form.Item label="目标实体" required>
          <Select
            value={config.entityCode}
            onChange={(val) => handleActionChange(index, 'dataOperation', { ...config, entityCode: val })}
            placeholder="选择目标实体"
          >
            {entities.map(entity => (
              <Option key={entity.code} value={entity.code}>
                {entity.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="操作类型" required>
          <Select
            value={config.operation}
            onChange={(val) => handleActionChange(index, 'dataOperation', { ...config, operation: val })}
          >
            {DATA_OPERATIONS.map(op => (
              <Option key={op.value} value={op.value}>
                {op.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {config.operation !== 'delete' && (
          <Form.Item label="操作数据">
            <TextArea
              value={config.data ? JSON.stringify(config.data, null, 2) : ''}
              onChange={(e) => {
                try {
                  const data = e.target.value ? JSON.parse(e.target.value) : undefined;
                  handleActionChange(index, 'dataOperation', { ...config, data });
                } catch {
                  // 忽略 JSON 解析错误
                }
              }}
              placeholder={'{\n  "status": "confirmed",\n  "amount": {{event.data.record.amount}}\n}'}
              rows={3}
            />
          </Form.Item>
        )}
      </>
    );
  };

  /** 渲染动作特定配置 */
  const renderActionSpecificConfig = (action: ActionConfig, index: number) => {
    switch (action.type) {
      case 'trigger_workflow':
        return renderTriggerWorkflowConfig(action, index);
      case 'execute_expression':
        return renderExecuteExpressionConfig(action, index);
      case 'send_notification':
        return renderSendNotificationConfig(action, index);
      case 'data_operation':
        return renderDataOperationConfig(action, index);
      default:
        return null;
    }
  };

  /** 获取动作类型图标 */
  const getActionIcon = (type: string) => {
    const actionType = ACTION_TYPES.find(at => at.value === type);
    return actionType?.icon || <PlayCircleOutlined />;
  };

  /** 渲染单个动作卡片 */
  const renderActionCard = (action: ActionConfig, index: number) => {
    const actionType = ACTION_TYPES.find(at => at.value === action.type);

    return (
      <Card
        key={index}
        size="small"
        style={{ marginBottom: 12 }}
        title={
          <Space>
            {getActionIcon(action.type)}
            <Text strong>{action.name}</Text>
            <Tag>{actionType?.label}</Tag>
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="上移">
              <Button
                type="text"
                icon={<ArrowUpOutlined />}
                size="small"
                disabled={index === 0}
                onClick={() => handleMoveAction(index, index - 1)}
              />
            </Tooltip>
            <Tooltip title="下移">
              <Button
                type="text"
                icon={<ArrowDownOutlined />}
                size="small"
                disabled={index === value.length - 1}
                onClick={() => handleMoveAction(index, index + 1)}
              />
            </Tooltip>
            <Tooltip title="复制">
              <Button
                type="text"
                icon={<CopyOutlined />}
                size="small"
                onClick={() => handleCopyAction(index)}
              />
            </Tooltip>
            <Popconfirm
              title="确定删除此动作？"
              onConfirm={() => handleDeleteAction(index)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="text" danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          </Space>
        }
      >
        <Form layout="vertical">
          <Form.Item label="动作名称">
            <Input
              value={action.name}
              onChange={(e) => handleActionChange(index, 'name', e.target.value)}
              placeholder="输入动作名称"
            />
          </Form.Item>

          <Form.Item label="动作类型" required>
            <Select
              value={action.type}
              onChange={(val) => handleActionChange(index, 'type', val)}
            >
              {ACTION_TYPES.map(type => (
                <Option key={type.value} value={type.value}>
                  <Space>
                    {type.icon}
                    {type.label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {renderActionSpecificConfig(action, index)}

          <Divider style={{ margin: '12px 0' }} />

          <Space>
            <Form.Item label="异步执行" style={{ marginBottom: 0 }}>
              <Switch
                checked={action.async}
                onChange={(checked) => handleActionChange(index, 'async', checked)}
              />
            </Form.Item>

            <Form.Item label="失败重试" style={{ marginBottom: 0 }}>
              <Space.Compact>
                <InputNumber
                  value={action.retryPolicy?.maxRetries || 0}
                  onChange={(val) => handleActionChange(index, 'retryPolicy', {
                    maxRetries: val || 0,
                    backoffMs: [1000, 3000, 5000],
                  })}
                  min={0}
                  max={10}
                />
                <Input value="次" disabled style={{ width: 36, textAlign: 'center' }} />
              </Space.Compact>
            </Form.Item>
          </Space>
        </Form>
      </Card>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Text strong>动作配置</Text>
        <Text type="secondary" style={{ marginLeft: 8 }}>
          {value.length > 0 ? `共 ${value.length} 个动作（按顺序执行）` : '未配置动作'}
        </Text>
      </div>

      {/* 动作列表 */}
      {value.map((action, index) => renderActionCard(action, index))}

      {/* 添加按钮 */}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddAction}
        block
      >
        添加动作
      </Button>
    </div>
  );
};

export default ActionConfig;
