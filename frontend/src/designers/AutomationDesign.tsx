/**
 * 自动化规则编辑器
 *
 * 完整的可视化编辑器，用于创建和编辑自动化规则。
 * 包含：
 * - 基本信息配置
 * - 触发器配置
 * - 条件配置
 * - 动作配置
 * - 限流和生效时间配置
 * - 执行日志查看
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Space,
  Card,
  Typography,
  Tabs,
  Switch,
  message,
  Spin,
  Divider,
  Breadcrumb,
} from 'antd';
import {
  SaveOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  HistoryOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { TriggerConfig } from './automation/TriggerConfig';
import { ConditionConfig } from './automation/ConditionConfig';
import { ActionConfig } from './automation/ActionConfig';
import { ThrottleConfig } from './automation/ThrottleConfig';
import { AutomationLogViewer } from './automation/AutomationLogViewer';

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

/** 规则状态 */
type RuleStatus = 'draft' | 'enabled' | 'disabled';

/** 规则数据 */
interface AutomationRuleData {
  id?: string;
  appId: string;
  name: string;
  description?: string;
  status: RuleStatus;
  trigger: Record<string, unknown>;
  condition?: Record<string, unknown>;
  actions: Record<string, unknown>[];
  throttle?: Record<string, unknown>;
  effectiveTime?: Record<string, unknown>;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  schemaVersion?: number;
  version?: number;
}

/** 组件属性 */
export interface AutomationDesignProps {
  /** 应用 ID */
  appId: string;
  /** 规则 ID（编辑模式） */
  ruleId?: string;
  /** 租户 ID */
  tenantId?: string;
  /** API 基础路径 */
  apiBase?: string;
  /** 返回回调 */
  onBack?: () => void;
  /** 保存成功回调 */
  onSave?: (rule: AutomationRuleData) => void;
}

/**
 * 自动化规则编辑器
 */
export const AutomationDesign: React.FC<AutomationDesignProps> = ({
  appId,
  ruleId,
  tenantId,
  apiBase = '/api/automations',
  onBack,
  onSave,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rule, setRule] = useState<AutomationRuleData>({
    appId,
    name: '',
    status: 'draft',
    trigger: {},
    actions: [],
  });
  const [activeTab, setActiveTab] = useState('basic');

  /** 加载规则数据 */
  const fetchRule = useCallback(async () => {
    if (!ruleId) return;

    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/${ruleId}?appId=${appId}`);
      const data = await response.json();

      if (data.data) {
        setRule(data.data);
        form.setFieldsValue({
          name: data.data.name,
          description: data.data.description,
          status: data.data.status,
        });
      }
    } catch (error) {
      console.error('Failed to fetch rule:', error);
      message.error('加载规则失败');
    } finally {
      setLoading(false);
    }
  }, [ruleId, appId, apiBase, form]);

  /** 初始加载 */
  useEffect(() => {
    fetchRule();
  }, [fetchRule]);

  /** 保存规则 */
  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const ruleData = {
        ...rule,
        ...values,
        appId,
      };

      const url = ruleId ? `${apiBase}/${ruleId}?appId=${appId}` : `${apiBase}?appId=${appId}`;
      const method = ruleId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData),
      });

      const data = await response.json();

      if (data.data) {
        message.success('保存成功');
        onSave?.(data.data);
        if (!ruleId) {
          // 新建模式，跳转到编辑模式
          window.location.href = `/designer/automation/${data.data.id}?appId=${appId}`;
        }
      }
    } catch (error) {
      console.error('Failed to save rule:', error);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  }, [rule, ruleId, appId, apiBase, form, onSave]);

  /** 启用/禁用规则 */
  const handleToggleStatus = useCallback(async () => {
    if (!ruleId) return;

    const newStatus = rule.status === 'enabled' ? 'disabled' : 'enabled';
    const action = newStatus === 'enabled' ? 'enable' : 'disable';

    try {
      const response = await fetch(`${apiBase}/${ruleId}/${action}?appId=${appId}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.data) {
        setRule(data.data);
        form.setFieldValue('status', data.data.status);
        message.success(newStatus === 'enabled' ? '规则已启用' : '规则已禁用');
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
      message.error('操作失败');
    }
  }, [ruleId, rule.status, appId, apiBase, form]);

  /** 更新触发器配置 */
  const handleTriggerChange = useCallback(
    (trigger: Record<string, unknown>) => {
      setRule(prev => ({ ...prev, trigger }));
    },
    []
  );

  /** 更新条件配置 */
  const handleConditionChange = useCallback(
    (condition: Record<string, unknown> | undefined) => {
      setRule(prev => ({ ...prev, condition }));
    },
    []
  );

  /** 更新动作配置 */
  const handleActionsChange = useCallback(
    (actions: Record<string, unknown>[]) => {
      setRule(prev => ({ ...prev, actions }));
    },
    []
  );

  /** 更新限流配置 */
  const handleThrottleChange = useCallback(
    (throttle: Record<string, unknown> | undefined) => {
      setRule(prev => ({ ...prev, throttle }));
    },
    []
  );

  /** 更新生效时间配置 */
  const handleEffectiveTimeChange = useCallback(
    (effectiveTime: Record<string, unknown> | undefined) => {
      setRule(prev => ({ ...prev, effectiveTime }));
    },
    []
  );

  /** 渲染基本信息 */
  const renderBasicInfo = () => (
    <Card title="基本信息" style={{ marginBottom: 16 }}>
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="规则名称"
          rules={[{ required: true, message: '请输入规则名称' }]}
        >
          <Input placeholder="输入规则名称" />
        </Form.Item>

        <Form.Item name="description" label="规则描述">
          <TextArea placeholder="输入规则描述（可选）" rows={2} />
        </Form.Item>

        <Form.Item name="status" label="规则状态">
          <Select>
            <Option value="draft">草稿</Option>
            <Option value="enabled">启用</Option>
            <Option value="disabled">禁用</Option>
          </Select>
        </Form.Item>
      </Form>
    </Card>
  );

  /** 渲染触发器配置 */
  const renderTriggerSection = () => (
    <Card
      title={
        <Space>
          <ThunderboltOutlined />
          <Text strong>① 触发器</Text>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <TriggerConfig
        value={rule.trigger}
        onChange={handleTriggerChange}
      />
    </Card>
  );

  /** 渲染条件配置 */
  const renderConditionSection = () => (
    <Card
      title={
        <Space>
          <SettingOutlined />
          <Text strong>② 条件</Text>
          {!rule.condition && (
            <Text type="secondary">（可选，为空则始终执行）</Text>
          )}
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <ConditionConfig
        value={rule.condition as any}
        onChange={handleConditionChange}
      />
    </Card>
  );

  /** 渲染动作配置 */
  const renderActionSection = () => (
    <Card
      title={
        <Space>
          <PlayCircleOutlined />
          <Text strong>③ 动作</Text>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <ActionConfig
        value={rule.actions as any[]}
        onChange={handleActionsChange}
      />
    </Card>
  );

  /** 渲染高级设置 */
  const renderAdvancedSection = () => (
    <ThrottleConfig
      throttle={rule.throttle as any}
      onThrottleChange={handleThrottleChange}
      effectiveTime={rule.effectiveTime as any}
      onEffectiveTimeChange={handleEffectiveTimeChange}
    />
  );

  /** 渲染执行日志 */
  const renderLogs = () => {
    if (!ruleId) {
      return <Text type="secondary">保存规则后可查看执行日志</Text>;
    }

    return (
      <AutomationLogViewer
        ruleId={ruleId}
        ruleName={rule.name}
        apiBase={apiBase}
      />
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* 面包屑导航 */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          {
            title: (
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={onBack}
                style={{ padding: 0 }}
              >
                返回
              </Button>
            ),
          },
          { title: '自动化规则' },
          { title: ruleId ? '编辑规则' : '新建规则' },
        ]}
      />

      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          {ruleId ? '编辑自动化规则' : '新建自动化规则'}
        </Title>

        <Space>
          {ruleId && (
            <Button
              icon={rule.status === 'enabled' ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={handleToggleStatus}
            >
              {rule.status === 'enabled' ? '禁用' : '启用'}
            </Button>
          )}
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            保存
          </Button>
        </Space>
      </div>

      {/* 主要内容 */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'basic',
            label: '规则配置',
            children: (
              <>
                {renderBasicInfo()}
                {renderTriggerSection()}
                {renderConditionSection()}
                {renderActionSection()}
                {renderAdvancedSection()}
              </>
            ),
          },
          {
            key: 'logs',
            label: (
              <Space>
                <HistoryOutlined />
                执行日志
              </Space>
            ),
            children: renderLogs(),
          },
        ]}
      />
    </div>
  );
};

export default AutomationDesign;
