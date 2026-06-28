/**
 * 限流配置组件
 *
 * 配置规则的触发限制：
 * - 冷却时间（最小触发间隔）
 * - 每日最大触发次数
 * - 生效时段
 */

import React, { useCallback } from 'react';
import {
  Form,
  InputNumber,
  Select,
  Switch,
  TimePicker,
  Button,
  Space,
  Card,
  Typography,
  Tag,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

/** 星期几选项 */
const DAYS_OF_WEEK = [
  { value: 0, label: '周日' },
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
];

/** 时段配置接口 */
interface TimeRange {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
}

/** 限流配置接口 */
interface ThrottleConfigData {
  cooldownSeconds: number;
  maxDailyTriggers?: number;
}

/** 生效时间配置接口 */
interface EffectiveTimeConfigData {
  start?: string;
  end?: string;
  timeRanges?: TimeRange[];
}

/** 组件属性 */
export interface ThrottleConfigProps {
  /** 限流配置 */
  throttle?: ThrottleConfigData;
  /** 限流配置变更回调 */
  onThrottleChange?: (config: ThrottleConfigData | undefined) => void;
  /** 生效时间配置 */
  effectiveTime?: EffectiveTimeConfigData;
  /** 生效时间配置变更回调 */
  onEffectiveTimeChange?: (config: EffectiveTimeConfigData | undefined) => void;
}

/**
 * 限流配置组件
 */
export const ThrottleConfig: React.FC<ThrottleConfigProps> = ({
  throttle,
  onThrottleChange,
  effectiveTime,
  onEffectiveTimeChange,
}) => {
  /** 是否启用限流 */
  const throttleEnabled = !!throttle;

  /** 是否启用生效时间 */
  const effectiveTimeEnabled = !!effectiveTime;

  /** 更新限流配置 */
  const handleThrottleChange = useCallback(
    (field: string, value: unknown) => {
      if (!throttle) {
        onThrottleChange?.({ cooldownSeconds: 60, [field]: value });
      } else {
        onThrottleChange?.({ ...throttle, [field]: value });
      }
    },
    [throttle, onThrottleChange]
  );

  /** 更新生效时间配置 */
  const handleEffectiveTimeChange = useCallback(
    (field: string, value: unknown) => {
      if (!effectiveTime) {
        onEffectiveTimeChange?.({ [field]: value });
      } else {
        onEffectiveTimeChange?.({ ...effectiveTime, [field]: value });
      }
    },
    [effectiveTime, onEffectiveTimeChange]
  );

  /** 添加时段配置 */
  const handleAddTimeRange = useCallback(() => {
    const newRange: TimeRange = {
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '09:00',
      endTime: '18:00',
    };
    const ranges = [...(effectiveTime?.timeRanges || []), newRange];
    handleEffectiveTimeChange('timeRanges', ranges);
  }, [effectiveTime, handleEffectiveTimeChange]);

  /** 更新时段配置 */
  const handleTimeRangeChange = useCallback(
    (index: number, field: string, value: unknown) => {
      const ranges = [...(effectiveTime?.timeRanges || [])];
      ranges[index] = { ...ranges[index], [field]: value };
      handleEffectiveTimeChange('timeRanges', ranges);
    },
    [effectiveTime, handleEffectiveTimeChange]
  );

  /** 删除时段配置 */
  const handleDeleteTimeRange = useCallback(
    (index: number) => {
      const ranges = (effectiveTime?.timeRanges || []).filter((_, i) => i !== index);
      handleEffectiveTimeChange('timeRanges', ranges);
    },
    [effectiveTime, handleEffectiveTimeChange]
  );

  /** 渲染时段配置 */
  const renderTimeRange = (range: TimeRange, index: number) => {
    const dayLabels = range.daysOfWeek
      .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label)
      .filter(Boolean)
      .join('、');

    return (
      <Card
        key={index}
        size="small"
        style={{ marginBottom: 8 }}
        extra={
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => handleDeleteTimeRange(index)}
          />
        }
      >
        <Form layout="vertical">
          <Form.Item label="生效日期">
            <Select
              mode="multiple"
              value={range.daysOfWeek}
              onChange={(val) => handleTimeRangeChange(index, 'daysOfWeek', val)}
              placeholder="选择生效日期"
            >
              {DAYS_OF_WEEK.map(day => (
                <Option key={day.value} value={day.value}>
                  {day.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Space>
            <Form.Item label="开始时间">
              <TimePicker
                value={range.startTime ? undefined : undefined}
                format="HH:mm"
                onChange={(_time, timeStr) => handleTimeRangeChange(index, 'startTime', timeStr)}
                style={{ width: 120 }}
              />
            </Form.Item>

            <Form.Item label="结束时间">
              <TimePicker
                value={range.endTime ? undefined : undefined}
                format="HH:mm"
                onChange={(_time, timeStr) => handleTimeRangeChange(index, 'endTime', timeStr)}
                style={{ width: 120 }}
              />
            </Form.Item>
          </Space>

          <div>
            <Text type="secondary">
              {dayLabels} {range.startTime}-{range.endTime}
            </Text>
          </div>
        </Form>
      </Card>
    );
  };

  return (
    <div>
      {/* 限流配置 */}
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <ClockCircleOutlined />
            <Text strong>触发限制</Text>
          </Space>
        }
      >
        <Form layout="vertical">
          <Form.Item
            label={
              <Space>
                启用限流
                <Tooltip title="控制规则的触发频率，防止过度执行">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <Switch
              checked={throttleEnabled}
              onChange={(checked) => onThrottleChange?.(checked ? { cooldownSeconds: 60 } : undefined)}
            />
          </Form.Item>

          {throttleEnabled && (
            <>
              <Form.Item
                label={
                  <Space>
                    冷却时间
                    <Tooltip title="同一规则的最小触发间隔">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
              >
                <InputNumber
                  value={throttle?.cooldownSeconds || 60}
                  onChange={(val) => handleThrottleChange('cooldownSeconds', val)}
                  min={0}
                  max={86400}
                  addonAfter="秒"
                  style={{ width: 200 }}
                />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    每日上限
                    <Tooltip title="每日最大触发次数（0 表示不限制）">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
              >
                <InputNumber
                  value={throttle?.maxDailyTriggers || 0}
                  onChange={(val) => handleThrottleChange('maxDailyTriggers', val)}
                  min={0}
                  max={100000}
                  addonAfter="次"
                  style={{ width: 200 }}
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Card>

      {/* 生效时间配置 */}
      <Card
        size="small"
        title={
          <Space>
            <ClockCircleOutlined />
            <Text strong>生效时间</Text>
          </Space>
        }
      >
        <Form layout="vertical">
          <Form.Item
            label={
              <Space>
                启用生效时间
                <Tooltip title="控制规则在什么时间范围内生效">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <Switch
              checked={effectiveTimeEnabled}
              onChange={(checked) => onEffectiveTimeChange?.(checked ? {} : undefined)}
            />
          </Form.Item>

          {effectiveTimeEnabled && (
            <>
              <Space>
                <Form.Item label="生效开始时间">
                  <input
                    type="datetime-local"
                    value={effectiveTime?.start || ''}
                    onChange={(e) => handleEffectiveTimeChange('start', e.target.value || undefined)}
                    style={{ padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6 }}
                  />
                </Form.Item>

                <Form.Item label="生效结束时间">
                  <input
                    type="datetime-local"
                    value={effectiveTime?.end || ''}
                    onChange={(e) => handleEffectiveTimeChange('end', e.target.value || undefined)}
                    style={{ padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6 }}
                  />
                </Form.Item>
              </Space>

              <Form.Item label="生效时段">
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  配置规则在一周中的哪些时段生效（如仅工作时间触发）
                </Text>

                {effectiveTime?.timeRanges?.map((range, index) => renderTimeRange(range, index))}

                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={handleAddTimeRange}
                  size="small"
                >
                  添加时段
                </Button>
              </Form.Item>
            </>
          )}
        </Form>
      </Card>
    </div>
  );
};

export default ThrottleConfig;
