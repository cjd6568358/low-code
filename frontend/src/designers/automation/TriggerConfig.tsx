/**
 * 触发器配置组件
 *
 * 支持 5 种触发器类型的可视化配置：
 * - 数据变更 (data_change)
 * - 定时触发 (schedule)
 * - 表单事件 (form_event)
 * - 审批事件 (workflow_event)
 * - 自定义事件 (custom_event)
 */

import React, { useCallback } from 'react';
import {
  Form,
  Select,
  Input,
  InputNumber,
  Switch,
  Checkbox,
  Space,
  Typography,
  Tooltip,
  Button,
} from 'antd';
import {
  DatabaseOutlined,
  ClockCircleOutlined,
  FormOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  QuestionCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

/** 触发器类型选项 */
const TRIGGER_TYPES = [
  { value: 'data_change', label: '数据变更', icon: <DatabaseOutlined />, description: '监听实体记录的创建/更新/删除' },
  { value: 'schedule', label: '定时触发', icon: <ClockCircleOutlined />, description: '基于 Cron 表达式的定时任务' },
  { value: 'form_event', label: '表单事件', icon: <FormOutlined />, description: '表单提交、字段值变更' },
  { value: 'workflow_event', label: '审批事件', icon: <ApiOutlined />, description: '流程审批通过/拒绝/完成' },
  { value: 'custom_event', label: '自定义事件', icon: <ThunderboltOutlined />, description: '平台事件总线中的任意事件' },
];

/** 数据变更操作选项 */
const DATA_CHANGE_OPERATIONS = [
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
];

/** 表单事件选项 */
const FORM_EVENTS = [
  { value: 'submitted', label: '表单提交' },
  { value: 'field_changed', label: '字段变更' },
];

/** 审批事件选项 */
const WORKFLOW_EVENTS = [
  { value: 'started', label: '流程启动' },
  { value: 'approved', label: '审批通过' },
  { value: 'rejected', label: '审批拒绝' },
  { value: 'completed', label: '流程完成' },
];

/** 组件属性 */
export interface TriggerConfigProps {
  /** 触发器配置值 */
  value?: Record<string, unknown>;
  /** 值变更回调 */
  onChange?: (value: Record<string, unknown>) => void;
  /** 可选的实体列表（用于数据变更触发器） */
  entities?: Array<{ code: string; name: string; fields?: Array<{ code: string; name: string }> }>;
  /** 可选的页面列表（用于表单事件触发器） */
  pages?: Array<{ id: string; name: string }>;
  /** 可选的流程列表（用于审批事件触发器） */
  workflows?: Array<{ id: string; name: string }>;
}

/**
 * 触发器配置组件
 */
export const TriggerConfig: React.FC<TriggerConfigProps> = ({
  value = {},
  onChange,
  entities = [],
  pages = [],
  workflows = [],
}) => {
  const triggerType = value.type as string;

  /** 通知值变更 */
  const handleChange = useCallback(
    (field: string, fieldValue: unknown) => {
      const newValue = { ...value, [field]: fieldValue };
      onChange?.(newValue);
    },
    [value, onChange]
  );

  /** 渲染数据变更触发器配置 */
  const renderDataChangeConfig = () => {
    const config = (value.dataChange || {}) as Record<string, unknown>;
    const selectedEntity = entities.find(e => e.code === config.entityCode);

    return (
      <div style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 8 }}>
        <Form.Item label="监听实体" required>
          <Select
            value={config.entityCode as string}
            onChange={(val) => handleChange('dataChange', { ...config, entityCode: val })}
            placeholder="选择要监听的实体"
          >
            {entities.map(entity => (
              <Option key={entity.code} value={entity.code}>
                {entity.name} ({entity.code})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="监听操作" required>
          <Checkbox.Group
            value={(config.operations as string[]) || []}
            onChange={(vals) => handleChange('dataChange', { ...config, operations: vals })}
            options={DATA_CHANGE_OPERATIONS}
          />
        </Form.Item>

        <Form.Item
          label={
            <Space>
              监听字段
              <Tooltip title="为空则监听所有字段变更">
                <QuestionCircleOutlined />
              </Tooltip>
            </Space>
          }
        >
          <Select
            mode="multiple"
            value={(config.watchFields as string[]) || []}
            onChange={(vals) => handleChange('dataChange', { ...config, watchFields: vals })}
            placeholder="选择要监听的字段（可选）"
            allowClear
          >
            {selectedEntity?.fields?.map(field => (
              <Option key={field.code} value={field.code}>
                {field.name} ({field.code})
              </Option>
            ))}
          </Select>
        </Form.Item>
      </div>
    );
  };

  /** 渲染定时触发器配置 */
  const renderScheduleConfig = () => {
    const config = (value.schedule || {}) as Record<string, unknown>;

    return (
      <div style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 8 }}>
        <Form.Item label="Cron 表达式" required>
          <Input
            value={config.cron as string}
            onChange={(e) => handleChange('schedule', { ...config, cron: e.target.value })}
            placeholder="* * * * * (分 时 日 月 周)"
          />
        </Form.Item>

        <Form.Item label="时区">
          <Select
            value={config.timezone as string || 'Asia/Shanghai'}
            onChange={(val) => handleChange('schedule', { ...config, timezone: val })}
          >
            <Option value="Asia/Shanghai">中国标准时间 (UTC+8)</Option>
            <Option value="America/New_York">美国东部时间 (UTC-5)</Option>
            <Option value="Europe/London">英国时间 (UTC+0)</Option>
          </Select>
        </Form.Item>

        <Space>
          <Form.Item label="生效开始时间">
            <Input
              type="datetime-local"
              value={config.startDate as string}
              onChange={(e) => handleChange('schedule', { ...config, startDate: e.target.value })}
            />
          </Form.Item>

          <Form.Item label="生效结束时间">
            <Input
              type="datetime-local"
              value={config.endDate as string}
              onChange={(e) => handleChange('schedule', { ...config, endDate: e.target.value })}
            />
          </Form.Item>
        </Space>
      </div>
    );
  };

  /** 渲染表单事件触发器配置 */
  const renderFormEventConfig = () => {
    const config = (value.formEvent || {}) as Record<string, unknown>;

    return (
      <div style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 8 }}>
        <Form.Item label="关联页面" required>
          <Select
            value={config.pageId as string}
            onChange={(val) => handleChange('formEvent', { ...config, pageId: val })}
            placeholder="选择关联的页面"
          >
            {pages.map(page => (
              <Option key={page.id} value={page.id}>
                {page.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="监听事件" required>
          <Checkbox.Group
            value={(config.events as string[]) || []}
            onChange={(vals) => handleChange('formEvent', { ...config, events: vals })}
            options={FORM_EVENTS}
          />
        </Form.Item>

        {(config.events as string[])?.includes('field_changed') && (
          <Form.Item label="指定字段">
            <Input
              value={config.fieldCode as string}
              onChange={(e) => handleChange('formEvent', { ...config, fieldCode: e.target.value })}
              placeholder="输入字段编码"
            />
          </Form.Item>
        )}
      </div>
    );
  };

  /** 渲染审批事件触发器配置 */
  const renderWorkflowEventConfig = () => {
    const config = (value.workflowEvent || {}) as Record<string, unknown>;

    return (
      <div style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 8 }}>
        <Form.Item label="指定流程">
          <Select
            value={config.workflowId as string}
            onChange={(val) => handleChange('workflowEvent', { ...config, workflowId: val })}
            placeholder="选择流程（留空则监听所有）"
            allowClear
          >
            {workflows.map(wf => (
              <Option key={wf.id} value={wf.id}>
                {wf.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="监听事件" required>
          <Checkbox.Group
            value={(config.events as string[]) || []}
            onChange={(vals) => handleChange('workflowEvent', { ...config, events: vals })}
            options={WORKFLOW_EVENTS}
          />
        </Form.Item>

        <Form.Item label="指定节点">
          <Input
            value={config.nodeCode as string}
            onChange={(e) => handleChange('workflowEvent', { ...config, nodeCode: e.target.value })}
            placeholder="输入节点编码（可选）"
          />
        </Form.Item>
      </div>
    );
  };

  /** 渲染自定义事件触发器配置 */
  const renderCustomEventConfig = () => {
    const config = (value.customEvent || {}) as Record<string, unknown>;

    return (
      <div style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 8 }}>
        <Form.Item label="事件类型" required>
          <Input
            value={config.eventType as string}
            onChange={(e) => handleChange('customEvent', { ...config, eventType: e.target.value })}
            placeholder="输入事件类型（如 order.cancelled）"
          />
        </Form.Item>

        <Form.Item label="事件来源">
          <Input
            value={config.source as string}
            onChange={(e) => handleChange('customEvent', { ...config, source: e.target.value })}
            placeholder="过滤事件来源（可选）"
          />
        </Form.Item>
      </div>
    );
  };

  /** 根据触发器类型渲染对应配置 */
  const renderTriggerConfig = () => {
    switch (triggerType) {
      case 'data_change':
        return renderDataChangeConfig();
      case 'schedule':
        return renderScheduleConfig();
      case 'form_event':
        return renderFormEventConfig();
      case 'workflow_event':
        return renderWorkflowEventConfig();
      case 'custom_event':
        return renderCustomEventConfig();
      default:
        return null;
    }
  };

  return (
    <div>
      <Form.Item label="触发器类型" required>
        <Select
          value={triggerType}
          onChange={(val) => handleChange('type', val)}
          placeholder="选择触发器类型"
        >
          {TRIGGER_TYPES.map(type => (
            <Option key={type.value} value={type.value}>
              <Space>
                {type.icon}
                {type.label}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {type.description}
                </Text>
              </Space>
            </Option>
          ))}
        </Select>
      </Form.Item>

      {renderTriggerConfig()}
    </div>
  );
};

export default TriggerConfig;
