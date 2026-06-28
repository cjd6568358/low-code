/**
 * 条件配置组件
 *
 * 支持嵌套条件组的可视化配置：
 * - AND/OR 逻辑组合
 * - 15 种条件运算符
 * - 嵌套条件组
 * - 拖拽排序
 */

import React, { useCallback, useState } from 'react';
import {
  Form,
  Select,
  Input,
  InputNumber,
  Button,
  Space,
  Card,
  Typography,
  Tooltip,
  Popconfirm,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  DragOutlined,
  QuestionCircleOutlined,
  FolderAddOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

/** 条件运算符选项 */
const OPERATORS = [
  { value: 'eq', label: '等于', requiresValue: true },
  { value: 'ne', label: '不等于', requiresValue: true },
  { value: 'gt', label: '大于', requiresValue: true },
  { value: 'gte', label: '大于等于', requiresValue: true },
  { value: 'lt', label: '小于', requiresValue: true },
  { value: 'lte', label: '小于等于', requiresValue: true },
  { value: 'in', label: '在列表中', requiresValue: true },
  { value: 'not_in', label: '不在列表中', requiresValue: true },
  { value: 'contains', label: '包含', requiresValue: true },
  { value: 'not_contains', label: '不包含', requiresValue: true },
  { value: 'is_empty', label: '为空', requiresValue: false },
  { value: 'is_not_empty', label: '不为空', requiresValue: false },
  { value: 'between', label: '介于', requiresValue: true },
  { value: 'changed_to', label: '变更为', requiresValue: true },
  { value: 'changed_from', label: '从...变更', requiresValue: true },
];

/** 条件规则接口 */
interface ConditionRule {
  field: string;
  operator: string;
  value?: unknown;
  valueType?: string;
}

/** 条件组接口 */
interface ConditionGroup {
  logic: 'and' | 'or';
  rules: ConditionRule[];
  groups?: ConditionGroup[];
}

/** 组件属性 */
export interface ConditionConfigProps {
  /** 条件配置值 */
  value?: ConditionGroup;
  /** 值变更回调 */
  onChange?: (value: ConditionGroup | undefined) => void;
  /** 可选的字段列表 */
  fields?: Array<{ code: string; name: string; type?: string }>;
  /** 是否显示标题 */
  showTitle?: boolean;
  /** 嵌套层级（用于缩进） */
  level?: number;
}

/**
 * 条件配置组件
 */
export const ConditionConfig: React.FC<ConditionConfigProps> = ({
  value,
  onChange,
  fields = [],
  showTitle = true,
  level = 0,
}) => {
  /** 当前条件组 */
  const group: ConditionGroup = value || { logic: 'and', rules: [], groups: [] };

  /** 通知值变更 */
  const handleChange = useCallback(
    (newGroup: ConditionGroup) => {
      onChange?.(newGroup);
    },
    [onChange]
  );

  /** 更新逻辑类型 */
  const handleLogicChange = useCallback(
    (logic: 'and' | 'or') => {
      handleChange({ ...group, logic });
    },
    [group, handleChange]
  );

  /** 添加条件规则 */
  const handleAddRule = useCallback(() => {
    const newRule: ConditionRule = { field: '', operator: 'eq', value: undefined };
    handleChange({
      ...group,
      rules: [...group.rules, newRule],
    });
  }, [group, handleChange]);

  /** 更新条件规则 */
  const handleRuleChange = useCallback(
    (index: number, field: string, fieldValue: unknown) => {
      const newRules = [...group.rules];
      newRules[index] = { ...newRules[index], [field]: fieldValue };
      handleChange({ ...group, rules: newRules });
    },
    [group, handleChange]
  );

  /** 删除条件规则 */
  const handleDeleteRule = useCallback(
    (index: number) => {
      const newRules = group.rules.filter((_, i) => i !== index);
      handleChange({ ...group, rules: newRules });
    },
    [group, handleChange]
  );

  /** 添加嵌套条件组 */
  const handleAddGroup = useCallback(() => {
    const newGroup: ConditionGroup = { logic: 'and', rules: [], groups: [] };
    handleChange({
      ...group,
      groups: [...(group.groups || []), newGroup],
    });
  }, [group, handleChange]);

  /** 更新嵌套条件组 */
  const handleGroupChange = useCallback(
    (index: number, newGroup: ConditionGroup | undefined) => {
      const newGroups = [...(group.groups || [])];
      if (newGroup) {
        newGroups[index] = newGroup;
      } else {
        newGroups.splice(index, 1);
      }
      handleChange({ ...group, groups: newGroups });
    },
    [group, handleChange]
  );

  /** 删除嵌套条件组 */
  const handleDeleteGroup = useCallback(
    (index: number) => {
      const newGroups = (group.groups || []).filter((_, i) => i !== index);
      handleChange({ ...group, groups: newGroups });
    },
    [group, handleChange]
  );

  /** 渲染单条条件规则 */
  const renderRule = (rule: ConditionRule, index: number) => {
    const operator = OPERATORS.find(op => op.value === rule.operator);

    return (
      <div
        key={index}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          padding: '8px 12px',
          background: '#fff',
          borderRadius: 4,
          border: '1px solid #f0f0f0',
        }}
      >
        <DragOutlined style={{ color: '#999', cursor: 'grab' }} />

        <Select
          value={rule.field}
          onChange={(val) => handleRuleChange(index, 'field', val)}
          placeholder="选择字段"
          style={{ width: 180 }}
          showSearch
        >
          {fields.map(field => (
            <Option key={field.code} value={field.code}>
              {field.name}
            </Option>
          ))}
        </Select>

        <Select
          value={rule.operator}
          onChange={(val) => handleRuleChange(index, 'operator', val)}
          style={{ width: 120 }}
        >
          {OPERATORS.map(op => (
            <Option key={op.value} value={op.value}>
              {op.label}
            </Option>
          ))}
        </Select>

        {operator?.requiresValue && (
          <Input
            value={rule.value as string}
            onChange={(e) => handleRuleChange(index, 'value', e.target.value)}
            placeholder="输入值"
            style={{ width: 180 }}
          />
        )}

        <Popconfirm
          title="确定删除此条件？"
          onConfirm={() => handleDeleteRule(index)}
          okText="确定"
          cancelText="取消"
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
          />
        </Popconfirm>
      </div>
    );
  };

  /** 渲染嵌套条件组 */
  const renderGroup = (nestedGroup: ConditionGroup, index: number) => {
    return (
      <Card
        key={index}
        size="small"
        style={{ marginBottom: 8, background: '#fafafa' }}
        title={
          <Space>
            <Text type="secondary">条件组 {index + 1}</Text>
            <Tag color={nestedGroup.logic === 'and' ? 'blue' : 'orange'}>
              {nestedGroup.logic === 'and' ? '且 (AND)' : '或 (OR)'}
            </Tag>
          </Space>
        }
        extra={
          <Popconfirm
            title="确定删除此条件组？"
            onConfirm={() => handleDeleteGroup(index)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        }
      >
        <ConditionConfig
          value={nestedGroup}
          onChange={(newGroup) => handleGroupChange(index, newGroup)}
          fields={fields}
          showTitle={false}
          level={level + 1}
        />
      </Card>
    );
  };

  /** 计算总条件数 */
  const totalConditions = group.rules.length + (group.groups?.length || 0);

  return (
    <div style={{ marginLeft: level > 0 ? 24 : 0 }}>
      {showTitle && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>条件配置</Text>
          <Text type="secondary" style={{ marginLeft: 8 }}>
            {totalConditions > 0 ? `共 ${totalConditions} 个条件` : '未配置条件（将始终执行）'}
          </Text>
        </div>
      )}

      {totalConditions > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Space>
            <Text type="secondary">满足</Text>
            <Select
              value={group.logic}
              onChange={handleLogicChange}
              style={{ width: 100 }}
            >
              <Option value="and">全部 (AND)</Option>
              <Option value="or">任一 (OR)</Option>
            </Select>
            <Text type="secondary">条件时执行</Text>
          </Space>
        </div>
      )}

      {/* 条件规则列表 */}
      {group.rules.map((rule, index) => renderRule(rule, index))}

      {/* 嵌套条件组 */}
      {group.groups?.map((nestedGroup, index) => renderGroup(nestedGroup, index))}

      {/* 添加按钮 */}
      <Space style={{ marginTop: 8 }}>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddRule}
          size="small"
        >
          添加条件
        </Button>
        <Button
          type="dashed"
          icon={<FolderAddOutlined />}
          onClick={handleAddGroup}
          size="small"
        >
          添加条件组
        </Button>
      </Space>
    </div>
  );
};

export default ConditionConfig;
