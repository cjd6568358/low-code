/**
 * 运算设计器
 *
 * 可视化编辑计算字段/公式规则，支持：
 * - 基本信息配置（名称、描述、类型、状态）
 * - 输入字段选择（从数据表字段或手动定义）
 * - 表达式/公式编辑（复用 ExpressionEditor，阉割环境变量）
 * - 输出配置（字段名、类型、格式）
 * - 运算结果预览
 *
 * 存储格式：PropValue 格式 { type: 'expression', value: '...', async: false }
 * 环境变量：只保留 $user/$system/$env，去掉页面相关变量
 *
 * Props:
 *   appId        — 应用 ID
 *   computationId — 运算资源 ID（编辑模式）
 *   tenantId     — 租户 ID
 *   onSaved      — 保存成功后的回调
 *
 * Route: 由 AppDesignPage 加载，不直接暴露路由。
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  App,
  Spin,
  Button,
  Input,
  Select,
  Card,
  Space,
  Tag,
  Typography,
  Form,
  Empty,
  Tooltip,
  Alert,
} from 'antd';
import {
  SaveOutlined,
  PlayCircleOutlined,
  CalculatorOutlined,
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { ExpressionEditor } from '@low-code/renderer';
import { environmentRegistry } from '@low-code/renderer';
import type {
  ComputationSchema,
  ComputationInput,
  ComputationOutput,
  ComputationType,
  ComputationStatus,
  ComputationFieldType,
  ExpressionBinding,
} from '@low-code/shared';
import type { TableSchema } from '@low-code/shared';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// ─── 类型 ──────────────────────────────────────────────────

/** 组件属性 */
export interface ComputationDesignProps {
  /** 应用 ID */
  appId: string;
  /** 运算资源 ID（编辑模式） */
  computationId?: string;
  /** 租户 ID */
  tenantId?: string;
  /** API 基础路径 */
  apiBase?: string;
  /** 返回回调 */
  onBack?: () => void;
  /** 保存成功回调 */
  onSave?: (computation: ComputationSchema) => void;
}

// ─── 常量 ──────────────────────────────────────────────────

/** 运算类型选项 */
const COMPUTATION_TYPE_OPTIONS: Array<{ label: string; value: ComputationType; description: string }> = [
  { label: '字段计算', value: 'field', description: '基于其他字段计算得出新字段值' },
  { label: '公式规则', value: 'formula', description: '自定义公式进行复杂运算' },
  { label: '聚合计算', value: 'aggregation', description: '对集合数据进行汇总计算' },
  { label: '数据转换', value: 'transform', description: '数据格式转换和清洗' },
];

/** 运算类型颜色 */
const COMPUTATION_TYPE_COLORS: Record<ComputationType, string> = {
  field: 'blue',
  formula: 'green',
  aggregation: 'orange',
  transform: 'purple',
};

/** 字段类型选项 */
const FIELD_TYPE_OPTIONS: Array<{ label: string; value: ComputationFieldType }> = [
  { label: '文本', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '布尔', value: 'boolean' },
  { label: '日期', value: 'date' },
  { label: 'JSON', value: 'json' },
];

/** 输出类型选项 */
const OUTPUT_TYPE_OPTIONS: Array<{ label: string; value: ComputationFieldType }> = [
  { label: '文本 (string)', value: 'string' },
  { label: '数字 (number)', value: 'number' },
  { label: '布尔 (boolean)', value: 'boolean' },
  { label: '日期 (date)', value: 'date' },
  { label: 'JSON (json)', value: 'json' },
];

/** 数字格式化选项 */
const NUMBER_FORMAT_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '普通数字', value: 'number' },
  { label: '货币 (¥)', value: 'currency' },
  { label: '百分比 (%)', value: 'percentage' },
  { label: '整数', value: 'integer' },
];

/** 日期格式化选项 */
const DATE_FORMAT_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '日期 (YYYY-MM-DD)', value: 'date' },
  { label: '日期时间 (YYYY-MM-DD HH:mm:ss)', value: 'datetime' },
  { label: '时间 (HH:mm:ss)', value: 'time' },
  { label: '相对时间', value: 'relative' },
];

// ─── 样式 ──────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  padding: 24,
  height: '100%',
  overflow: 'auto',
  backgroundColor: '#f5f5f5',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 24,
};

const cardStyle: React.CSSProperties = {
  marginBottom: 16,
};

const inputFieldCardStyle: React.CSSProperties = {
  marginBottom: 8,
  backgroundColor: '#fafafa',
};

const previewBoxStyle: React.CSSProperties = {
  backgroundColor: '#f6ffed',
  border: '1px solid #b7eb8f',
  borderRadius: 6,
  padding: 16,
  minHeight: 100,
};

// ─── 工具函数 ──────────────────────────────────────────────

/** 初始化空的运算规则 */
function createEmptyComputation(appId: string): ComputationSchema {
  return {
    schemaVersion: 1,
    version: 1,
    computationId: '',
    appId,
    name: '',
    description: '',
    type: 'field',
    status: 'draft',
    inputs: [],
    expression: { type: 'expression', value: '', async: false },
    output: {
      name: '',
      type: 'number',
    },
  };
}

// ─── 子组件 ────────────────────────────────────────────────

/** 输入字段配置卡片 */
function InputFieldCard({
  field,
  index,
  onUpdate,
  onDelete,
}: {
  field: ComputationInput;
  index: number;
  onUpdate: (index: number, field: ComputationInput) => void;
  onDelete: (index: number) => void;
}) {
  return (
    <Card size="small" style={inputFieldCardStyle}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Input
              size="small"
              placeholder="变量名（如 amount）"
              value={field.key}
              onChange={(e) => onUpdate(index, { ...field, key: e.target.value })}
              style={{ width: 150 }}
            />
            <Input
              size="small"
              placeholder="显示名称"
              value={field.label}
              onChange={(e) => onUpdate(index, { ...field, label: e.target.value })}
              style={{ flex: 1 }}
            />
            <Select
              size="small"
              placeholder="类型"
              value={field.fieldType}
              onChange={(value) => onUpdate(index, { ...field, fieldType: value })}
              style={{ width: 100 }}
            >
              {FIELD_TYPE_OPTIONS.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              size="small"
              placeholder="描述（可选）"
              value={field.description || ''}
              onChange={(e) => onUpdate(index, { ...field, description: e.target.value })}
              style={{ flex: 1 }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={field.required || false}
                onChange={(e) => onUpdate(index, { ...field, required: e.target.checked })}
              />
              必填
            </label>
          </div>
        </div>
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onDelete(index)}
        />
      </div>
    </Card>
  );
}

/** 输出配置面板 */
function OutputConfigPanel({
  output,
  onChange,
}: {
  output: ComputationOutput;
  onChange: (output: ComputationOutput) => void;
}) {
  const formatOptions = useMemo(() => {
    switch (output.type) {
      case 'number':
        return NUMBER_FORMAT_OPTIONS;
      case 'date':
        return DATE_FORMAT_OPTIONS;
      default:
        return [];
    }
  }, [output.type]);

  return (
    <Card size="small" title="输出配置">
      <Form layout="vertical" size="small">
        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item label="字段名" style={{ flex: 1 }}>
            <Input
              placeholder="输出字段名"
              value={output.name}
              onChange={(e) => onChange({ ...output, name: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="类型" style={{ width: 150 }}>
            <Select
              value={output.type}
              onChange={(value) => onChange({ ...output, type: value, format: undefined })}
            >
              {OUTPUT_TYPE_OPTIONS.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          {formatOptions.length > 0 && (
            <Form.Item label="格式" style={{ width: 180 }}>
              <Select
                value={output.format}
                onChange={(value) => onChange({ ...output, format: value })}
                allowClear
                placeholder="选择格式"
              >
                {formatOptions.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
          {output.type === 'number' && output.format === 'currency' && (
            <Form.Item label="小数精度" style={{ width: 120 }}>
              <Select
                value={output.precision ?? 2}
                onChange={(value) => onChange({ ...output, precision: value })}
              >
                <Option value={0}>整数</Option>
                <Option value={1}>1 位</Option>
                <Option value={2}>2 位</Option>
                <Option value={3}>3 位</Option>
              </Select>
            </Form.Item>
          )}
        </div>
        <Form.Item label="描述">
          <Input
            placeholder="输出字段描述（可选）"
            value={output.description}
            onChange={(e) => onChange({ ...output, description: e.target.value })}
          />
        </Form.Item>
      </Form>
    </Card>
  );
}

// ─── 主组件 ────────────────────────────────────────────────

/**
 * 运算设计器
 */
export const ComputationDesign: React.FC<ComputationDesignProps> = ({
  appId,
  computationId,
  tenantId,
  apiBase = '/api/computations',
  onBack,
  onSave,
}) => {
  const { message } = App.useApp();

  // ─── 状态 ─────────────────────────────────────────────

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [computation, setComputation] = useState<ComputationSchema>(
    createEmptyComputation(appId)
  );
  const [expressionEditorVisible, setExpressionEditorVisible] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    loading: boolean;
    result?: unknown;
    error?: string;
  }>({ loading: false });

  // ─── 加载数据 ─────────────────────────────────────────

  /** 加载运算规则数据 */
  const fetchComputation = useCallback(async () => {
    if (!computationId) return;

    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/${computationId}?appId=${appId}`);
      const data = await response.json();

      if (data.data) {
        setComputation(data.data);
      }
    } catch {
      message.error('加载运算规则失败');
    } finally {
      setLoading(false);
    }
  }, [computationId, appId, apiBase, message]);

  /** 初始加载 */
  useEffect(() => {
    fetchComputation();
  }, [fetchComputation]);

  // ─── 环境变量过滤 ─────────────────────────────────────

  /** 计算运算模式可用的变量列表 */
  const allowedVariables = useMemo(() => {
    // 系统基础变量
    const systemVars = [
      '$user.id',
      '$user.name',
      '$user.roles',
      '$user.department',
      '$user.departmentName',
      '$user.position',
      '$system.now',
      '$system.today',
      '$env.NODE_ENV',
    ];

    // 输入字段变量
    const inputVars = computation.inputs.map((i) => i.key);

    return [...systemVars, ...inputVars];
  }, [computation.inputs]);

  // ─── 事件处理 ─────────────────────────────────────────

  /** 更新输入字段 */
  const handleUpdateInput = useCallback((index: number, field: ComputationInput) => {
    setComputation((prev) => ({
      ...prev,
      inputs: prev.inputs.map((f, i) => (i === index ? field : f)),
    }));
  }, []);

  /** 删除输入字段 */
  const handleDeleteInput = useCallback((index: number) => {
    setComputation((prev) => ({
      ...prev,
      inputs: prev.inputs.filter((_, i) => i !== index),
    }));
  }, []);

  /** 添加输入字段 */
  const handleAddInput = useCallback(() => {
    setComputation((prev) => ({
      ...prev,
      inputs: [
        ...prev.inputs,
        {
          key: `var${prev.inputs.length + 1}`,
          label: '',
          fieldType: 'string' as ComputationFieldType,
        },
      ],
    }));
  }, []);

  /** 更新输出配置 */
  const handleOutputChange = useCallback((output: ComputationOutput) => {
    setComputation((prev) => ({ ...prev, output }));
  }, []);

  /** 保存运算规则 */
  const handleSave = useCallback(async () => {
    // 校验
    if (!computation.name.trim()) {
      message.warning('请输入运算名称');
      return;
    }
    if (!computation.expression.value.trim()) {
      message.warning('请编写运算表达式');
      return;
    }
    if (!computation.output.name.trim()) {
      message.warning('请输入输出字段名');
      return;
    }

    setSaving(true);
    try {
      const url = computationId
        ? `${apiBase}/${computationId}?appId=${appId}`
        : `${apiBase}?appId=${appId}`;
      const method = computationId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...computation,
          appId,
        }),
      });

      const data = await response.json();

      if (data.data) {
        message.success('保存成功');
        onSave?.(data.data);
      } else {
        message.error(data.error || '保存失败');
      }
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  }, [computation, computationId, appId, apiBase, message, onSave]);

  /** 预览运算结果 */
  const handlePreview = useCallback(async () => {
    if (!computation.expression.value.trim()) {
      message.warning('请先编写表达式');
      return;
    }

    setPreviewResult({ loading: true });

    try {
      // 构建测试上下文
      const testContext: Record<string, unknown> = {};
      computation.inputs.forEach((input) => {
        // 根据类型生成测试值
        switch (input.fieldType) {
          case 'string':
            testContext[input.key] = '测试文本';
            break;
          case 'number':
            testContext[input.key] = 100;
            break;
          case 'boolean':
            testContext[input.key] = true;
            break;
          case 'date':
            testContext[input.key] = new Date().toISOString();
            break;
          case 'json':
            testContext[input.key] = { key: 'value' };
            break;
          default:
            testContext[input.key] = null;
        }
      });

      // 调用预览 API
      const response = await fetch(`${apiBase}/preview?appId=${appId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expression: computation.expression.value,
          context: testContext,
          outputType: computation.output.type,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPreviewResult({ loading: false, result: data.result });
      } else {
        setPreviewResult({ loading: false, error: data.error || '预览失败' });
      }
    } catch {
      setPreviewResult({ loading: false, error: '预览请求失败' });
    }
  }, [computation, appId, apiBase]);

  /** 表达式编辑器确认 */
  const handleExpressionConfirm = useCallback(
    (value: { type: 'expression'; value: string; async: boolean }) => {
      setComputation((prev) => ({
        ...prev,
        expression: value,
      }));
      setExpressionEditorVisible(false);
    },
    []
  );

  // ─── 渲染 ────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 400,
        }}
      >
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* 头部 */}
      <div style={headerStyle}>
        <Space>
          <Button icon={<CalculatorOutlined />} onClick={onBack}>
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {computationId ? '编辑运算规则' : '新建运算规则'}
          </Title>
          {computation.type && (
            <Tag color={COMPUTATION_TYPE_COLORS[computation.type]}>
              {COMPUTATION_TYPE_OPTIONS.find((o) => o.value === computation.type)?.label}
            </Tag>
          )}
        </Space>
        <Space>
          <Button icon={<PlayCircleOutlined />} onClick={handlePreview}>
            预览结果
          </Button>
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

      {/* 基本信息 */}
      <Card title="基本信息" style={cardStyle}>
        <Form layout="vertical">
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item label="运算名称" required style={{ flex: 1 }}>
              <Input
                placeholder="输入运算名称（如：订单金额计算）"
                value={computation.name}
                onChange={(e) =>
                  setComputation((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </Form.Item>
            <Form.Item label="运算类型" style={{ width: 200 }}>
              <Select
                value={computation.type}
                onChange={(value) =>
                  setComputation((prev) => ({ ...prev, type: value }))
                }
              >
                {COMPUTATION_TYPE_OPTIONS.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    <Tooltip title={opt.description}>{opt.label}</Tooltip>
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="状态" style={{ width: 150 }}>
              <Select
                value={computation.status}
                onChange={(value) =>
                  setComputation((prev) => ({ ...prev, status: value }))
                }
              >
                <Option value="draft">草稿</Option>
                <Option value="active">启用</Option>
                <Option value="disabled">禁用</Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item label="描述">
            <TextArea
              placeholder="输入运算描述（可选），说明该规则的用途和计算逻辑"
              rows={2}
              value={computation.description}
              onChange={(e) =>
                setComputation((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </Form.Item>
        </Form>
      </Card>

      {/* 输入字段配置 */}
      <Card
        title={
          <Space>
            <ThunderboltOutlined />
            <span>输入字段</span>
            <Tag>{computation.inputs.length}</Tag>
          </Space>
        }
        extra={
          <Button size="small" icon={<PlusOutlined />} onClick={handleAddInput}>
            添加字段
          </Button>
        }
        style={cardStyle}
      >
        {computation.inputs.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无输入字段，点击上方按钮添加"
          />
        ) : (
          computation.inputs.map((field, index) => (
            <InputFieldCard
              key={index}
              field={field}
              index={index}
              onUpdate={handleUpdateInput}
              onDelete={handleDeleteInput}
            />
          ))
        )}
        {computation.inputs.length > 0 && (
          <Alert
            message="在表达式中使用输入字段"
            description={
              <span>
                输入字段会作为变量注入表达式环境，直接使用字段名引用，如{' '}
                <Text code>amount * 0.1</Text>
              </span>
            }
            type="info"
            showIcon
            style={{ marginTop: 8 }}
          />
        )}
      </Card>

      {/* 表达式配置 */}
      <Card
        title={
          <Space>
            <CalculatorOutlined />
            <span>运算表达式</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            size="small"
            onClick={() => setExpressionEditorVisible(true)}
          >
            编辑表达式
          </Button>
        }
        style={cardStyle}
      >
        {computation.expression.value ? (
          <div
            style={{
              backgroundColor: '#f6f6f6',
              padding: 16,
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: 14,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {computation.expression.value}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="点击上方按钮编写表达式"
          />
        )}
        <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
          💡 表达式中可使用输入字段变量和系统变量（$user、$system），不支持页面相关变量
        </div>
      </Card>

      {/* 输出配置 */}
      <OutputConfigPanel
        output={computation.output}
        onChange={handleOutputChange}
      />

      {/* 预览结果 */}
      {(previewResult.result !== undefined || previewResult.error) && (
        <Card
          title={
            <Space>
              <InfoCircleOutlined />
              <span>预览结果</span>
            </Space>
          }
          style={cardStyle}
        >
          {previewResult.error ? (
            <Alert message="预览失败" description={previewResult.error} type="error" />
          ) : (
            <div style={previewBoxStyle}>
              <div style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
                输出字段: {computation.output.name}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#52c41a',
                  fontFamily: 'monospace',
                }}
              >
                {typeof previewResult.result === 'object'
                  ? JSON.stringify(previewResult.result, null, 2)
                  : String(previewResult.result)}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 表达式编辑器 */}
      <ExpressionEditor
        visible={expressionEditorVisible}
        value={computation.expression}
        async={false} // 运算表达式默认同步
        onChange={handleExpressionConfirm}
        onClear={() =>
          setComputation((prev) => ({
            ...prev,
            expression: { type: 'expression', value: '', async: false },
          }))
        }
        onClose={() => setExpressionEditorVisible(false)}
        appId={appId}
        allowedVariables={allowedVariables}
      />
    </div>
  );
};

export default ComputationDesign;
