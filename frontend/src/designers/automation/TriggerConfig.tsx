/**
 * 触发器配置组件
 *
 * 支持 2 种触发器类型的可视化配置：
 * - 数据变更 (data_change)
 * - 定时触发 (schedule)
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
  QuestionCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

/** 触发器类型选项 */
const TRIGGER_TYPES = [
  { value: 'data_change', label: '数据变更', icon: <DatabaseOutlined />, description: '监听实体记录的创建/更新/删除' },
  { value: 'schedule', label: '定时触发', icon: <ClockCircleOutlined />, description: '基于 Cron 表达式的定时任务' },
];

/** 数据变更操作选项 */
const DATA_CHANGE_OPERATIONS = [
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
];

/** 组件属性 */
export interface TriggerConfigProps {
  /** 触发器配置值 */
  value?: Record<string, unknown>;
  /** 值变更回调 */
  onChange?: (value: Record<string, unknown>) => void;
  /** 可选的实体列表（用于数据变更触发器） */
  entities?: Array<{ code: string; name: string; fields?: Array<{ code: string; name: string }> }>;
}

/**
 * 触发器配置组件
 */
export const TriggerConfig: React.FC<TriggerConfigProps> = ({
  value = {},
  onChange,
  entities = [],
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

  /** 根据触发器类型渲染对应配置 */
  const renderTriggerConfig = () => {
    switch (triggerType) {
      case 'data_change':
        return renderDataChangeConfig();
      case 'schedule':
        return renderScheduleConfig();
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
