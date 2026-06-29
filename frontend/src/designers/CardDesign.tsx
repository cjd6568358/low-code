/**
 * 卡片设计器
 *
 * 可视化编辑自定义卡片定义，支持：
 * - 卡片基本信息配置（名称、分类、版本、描述）
 * - 暴露属性配置（props）
 * - 暴露方法配置（methods）
 * - 暴露事件配置（events）
 * - 卡片模板编辑
 * - 属性绑定配置
 * - 卡片预览
 *
 * Props:
 *   appId    — 应用 ID
 *   cardId   — 裸资源 ID
 *   onSaved  — 保存成功后的回调
 *
 * Route: 由 AppDesignPage 加载，不直接暴露路由。
 */

import { useCallback, useEffect, useState } from 'react';
import {
  App, Spin, Button, Input, Select, Space, Tag, Tabs, Card, Typography, Modal, Form, Switch, Tooltip, Empty,
} from 'antd';
import {
  SaveOutlined, PlusOutlined, DeleteOutlined, EyeOutlined, SettingOutlined,
  ThunderboltOutlined, ApiOutlined, BellOutlined, EditOutlined,
} from '@ant-design/icons';
import type {
  CustomCardDefinition, ExposedProp, MethodDefinition, EventDefinition, MethodParam,
} from '@low-code/shared';

const { Text, Title } = Typography;
const { TextArea } = Input;

// ─── 类型 ──────────────────────────────────────────────

interface CardDesignProps {
  appId: string;
  cardId: string;
  onSaved?: (name: string) => void;
}

/** 属性类型选项 */
const PROP_TYPE_OPTIONS = [
  { label: '字符串 (string)', value: 'string' },
  { label: '数字 (number)', value: 'number' },
  { label: '布尔 (boolean)', value: 'boolean' },
  { label: '对象 (object)', value: 'object' },
  { label: '数组 (array)', value: 'array' },
];

/** 生成 8 位 hex ID */
function generateId(): string {
  return crypto.randomUUID().slice(0, 8);
}

// ─── 样式 ──────────────────────────────────────────────

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 16px',
  borderBottom: '1px solid #f0f0f0',
  backgroundColor: '#fff',
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  padding: 16,
  overflow: 'auto',
  backgroundColor: '#f5f5f5',
};

const sectionStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 6,
  padding: '16px',
  marginBottom: 16,
  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
};

const itemStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 8,
  alignItems: 'center',
  padding: '8px 12px',
  border: '1px solid #f0f0f0',
  borderRadius: 4,
};

// ─── 主组件 ────────────────────────────────────────────

export default function CardDesign({ appId, cardId, onSaved }: CardDesignProps) {
  const { message } = App.useApp();

  // ─── 状态 ─────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [card, setCard] = useState<CustomCardDefinition | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // 编辑状态
  const [editingProp, setEditingProp] = useState<number | null>(null);
  const [editingMethod, setEditingMethod] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<number | null>(null);

  // 新增方法参数弹窗
  const [methodParamModal, setMethodParamModal] = useState<{ open: boolean; methodIndex: number }>({
    open: false,
    methodIndex: -1,
  });
  const [newParam, setNewParam] = useState<MethodParam>({
    name: '',
    type: 'string',
    title: '',
    required: false,
  });

  // ─── 加载卡片定义 ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`/api/apps/${appId}/cards/${cardId}`);
        const data = await resp.json();
        if (!cancelled && data.success && data.resource) {
          setCard(data.resource);
        }
      } catch {
        if (!cancelled) message.error('加载卡片定义失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [appId, cardId]);

  // ─── 更新卡片字段 ─────────────────────────────────────
  const updateCard = useCallback((updates: Partial<CustomCardDefinition>) => {
    setCard((prev) => prev ? { ...prev, ...updates } : prev);
  }, []);

  // ─── 属性管理 ─────────────────────────────────────────
  const addProp = useCallback(() => {
    const newProp: ExposedProp = {
      name: `prop_${Date.now().toString(36)}`,
      type: 'string',
      title: '新属性',
      required: false,
    };
    setCard((prev) => prev ? {
      ...prev,
      interface: {
        ...prev.interface,
        props: [...prev.interface.props, newProp],
      },
    } : prev);
    setEditingProp(card?.interface.props.length || 0);
  }, [card?.interface.props.length]);

  const updateProp = useCallback((index: number, updates: Partial<ExposedProp>) => {
    setCard((prev) => {
      if (!prev) return prev;
      const props = [...prev.interface.props];
      props[index] = { ...props[index], ...updates };
      return {
        ...prev,
        interface: { ...prev.interface, props },
      };
    });
  }, []);

  const deleteProp = useCallback((index: number) => {
    setCard((prev) => {
      if (!prev) return prev;
      const props = prev.interface.props.filter((_, i) => i !== index);
      return {
        ...prev,
        interface: { ...prev.interface, props },
      };
    });
    setEditingProp(null);
  }, []);

  // ─── 方法管理 ─────────────────────────────────────────
  const addMethod = useCallback(() => {
    const newMethod: MethodDefinition = {
      name: `method_${Date.now().toString(36)}`,
      title: '新方法',
      description: '',
      group: '自定义',
      params: [],
      returnType: 'void',
      implementation: [],
    };
    setCard((prev) => prev ? {
      ...prev,
      interface: {
        ...prev.interface,
        methods: [...(prev.interface.methods || []), newMethod],
      },
    } : prev);
    setEditingMethod(card?.interface.methods?.length || 0);
  }, [card?.interface.methods?.length]);

  const updateMethod = useCallback((index: number, updates: Partial<MethodDefinition>) => {
    setCard((prev) => {
      if (!prev) return prev;
      const methods = [...(prev.interface.methods || [])];
      methods[index] = { ...methods[index], ...updates };
      return {
        ...prev,
        interface: { ...prev.interface, methods },
      };
    });
  }, []);

  const deleteMethod = useCallback((index: number) => {
    setCard((prev) => {
      if (!prev) return prev;
      const methods = (prev.interface.methods || []).filter((_, i) => i !== index);
      return {
        ...prev,
        interface: { ...prev.interface, methods },
      };
    });
    setEditingMethod(null);
  }, []);

  // 添加方法参数
  const addMethodParam = useCallback(() => {
    if (methodParamModal.methodIndex < 0 || !card) return;
    const methods = [...(card.interface.methods || [])];
    const method = methods[methodParamModal.methodIndex];
    if (!method) return;

    methods[methodParamModal.methodIndex] = {
      ...method,
      params: [...(method.params || []), { ...newParam }],
    };
    setCard((prev) => prev ? {
      ...prev,
      interface: { ...prev.interface, methods },
    } : prev);
    setMethodParamModal({ open: false, methodIndex: -1 });
    setNewParam({ name: '', type: 'string', title: '', required: false });
  }, [card, methodParamModal.methodIndex, newParam]);

  // 删除方法参数
  const deleteMethodParam = useCallback((methodIndex: number, paramIndex: number) => {
    setCard((prev) => {
      if (!prev) return prev;
      const methods = [...(prev.interface.methods || [])];
      const method = methods[methodIndex];
      if (!method) return prev;

      methods[methodIndex] = {
        ...method,
        params: (method.params || []).filter((_, i) => i !== paramIndex),
      };
      return {
        ...prev,
        interface: { ...prev.interface, methods },
      };
    });
  }, []);

  // ─── 事件管理 ─────────────────────────────────────────
  const addEvent = useCallback(() => {
    const newEvent: EventDefinition = {
      name: `on${Date.now().toString(36)}`,
      title: '新事件',
      description: '',
      payload: {},
    };
    setCard((prev) => prev ? {
      ...prev,
      interface: {
        ...prev.interface,
        events: [...(prev.interface.events || []), newEvent],
      },
    } : prev);
    setEditingEvent(card?.interface.events?.length || 0);
  }, [card?.interface.events?.length]);

  const updateEvent = useCallback((index: number, updates: Partial<EventDefinition>) => {
    setCard((prev) => {
      if (!prev) return prev;
      const events = [...(prev.interface.events || [])];
      events[index] = { ...events[index], ...updates };
      return {
        ...prev,
        interface: { ...prev.interface, events },
      };
    });
  }, []);

  const deleteEvent = useCallback((index: number) => {
    setCard((prev) => {
      if (!prev) return prev;
      const events = (prev.interface.events || []).filter((_, i) => i !== index);
      return {
        ...prev,
        interface: { ...prev.interface, events },
      };
    });
    setEditingEvent(null);
  }, []);

  // ─── 保存 ─────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!card) return;
    if (!card.name?.trim()) {
      message.warning('请输入卡片名称');
      return;
    }

    setSaving(true);
    try {
      const resp = await fetch(`/api/apps/${appId}/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || '保存失败');
      }
      message.success('卡片保存成功');
      onSaved?.(card.name);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }, [appId, cardId, card, onSaved, message]);

  // ─── 渲染 ────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin />
      </div>
    );
  }

  if (!card) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Text type="secondary">卡片定义不存在</Text>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 工具栏 */}
      <div style={toolbarStyle}>
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            保存
          </Button>
          <Button
            icon={<EyeOutlined />}
            onClick={() => setPreviewVisible(true)}
          >
            预览
          </Button>
        </Space>
        <Space>
          <Tag color="blue">v{card.version}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {card.interface.props.length} 个属性 · {(card.interface.methods || []).length} 个方法 · {(card.interface.events || []).length} 个事件
          </Text>
        </Space>
      </div>

      {/* 内容区 */}
      <div style={contentStyle}>
        <Tabs
          defaultActiveKey="basic"
          items={[
            {
              key: 'basic',
              label: '基本信息',
              children: (
                <div style={sectionStyle}>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>卡片名称 *</Text>
                      <Input
                        value={card.name}
                        onChange={(e) => updateCard({ name: e.target.value })}
                        placeholder="输入卡片名称"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>分类</Text>
                      <Input
                        value={card.category || ''}
                        onChange={(e) => updateCard({ category: e.target.value || undefined })}
                        placeholder="如：CRM、通用"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>版本</Text>
                      <Input
                        value={card.version}
                        onChange={(e) => updateCard({ version: e.target.value })}
                        placeholder="1.0.0"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>作者</Text>
                      <Input
                        value={card.author || ''}
                        onChange={(e) => updateCard({ author: e.target.value || undefined })}
                        placeholder="可选"
                      />
                    </div>
                  </div>
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 4 }}>描述</Text>
                    <TextArea
                      value={card.description || ''}
                      onChange={(e) => updateCard({ description: e.target.value || undefined })}
                      rows={3}
                      placeholder="卡片功能描述"
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'props',
              label: (
                <span>
                  <SettingOutlined /> 暴露属性 ({card.interface.props.length})
                </span>
              ),
              children: (
                <div style={sectionStyle}>
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">
                      配置卡片对外暴露的属性，使用时可通过 $props.xxx 访问
                    </Text>
                  </div>

                  {card.interface.props.map((prop, i) => (
                    <div key={i} style={itemStyle}>
                      {editingProp === i ? (
                        // 编辑模式
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Input
                              size="small"
                              value={prop.name}
                              onChange={(e) => updateProp(i, { name: e.target.value })}
                              placeholder="属性名"
                              style={{ flex: 1 }}
                            />
                            <Select
                              size="small"
                              value={prop.type}
                              onChange={(type) => updateProp(i, { type })}
                              options={PROP_TYPE_OPTIONS}
                              style={{ width: 120 }}
                            />
                            <Input
                              size="small"
                              value={prop.title}
                              onChange={(e) => updateProp(i, { title: e.target.value })}
                              placeholder="显示标题"
                              style={{ flex: 1 }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Input
                              size="small"
                              value={prop.description || ''}
                              onChange={(e) => updateProp(i, { description: e.target.value || undefined })}
                              placeholder="描述（可选）"
                              style={{ flex: 1 }}
                            />
                            <Input
                              size="small"
                              value={prop.default?.toString() || ''}
                              onChange={(e) => updateProp(i, { default: e.target.value || undefined })}
                              placeholder="默认值"
                              style={{ width: 120 }}
                            />
                            <Switch
                              size="small"
                              checked={prop.required}
                              onChange={(required) => updateProp(i, { required })}
                            />
                            <Text style={{ fontSize: 12 }}>必填</Text>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button size="small" onClick={() => setEditingProp(null)}>
                              完成
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // 展示模式
                        <>
                          <div style={{ flex: 1 }}>
                            <Text code>{prop.name}</Text>
                            <Tag color="blue" style={{ marginLeft: 8 }}>{prop.type}</Tag>
                            {prop.required && <Tag color="red" style={{ marginLeft: 4 }}>必填</Tag>}
                            <Text type="secondary" style={{ marginLeft: 8 }}>{prop.title}</Text>
                          </div>
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => setEditingProp(i)}
                          />
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => deleteProp(i)}
                          />
                        </>
                      )}
                    </div>
                  ))}

                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={addProp}
                  >
                    添加属性
                  </Button>
                </div>
              ),
            },
            {
              key: 'methods',
              label: (
                <span>
                  <ApiOutlined /> 暴露方法 ({(card.interface.methods || []).length})
                </span>
              ),
              children: (
                <div style={sectionStyle}>
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">
                      配置卡片对外暴露的方法，外部可通过 invokeMethod 调用
                    </Text>
                  </div>

                  {(card.interface.methods || []).map((method, i) => (
                    <Card
                      key={i}
                      size="small"
                      style={{ marginBottom: 12 }}
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {editingMethod === i ? (
                            <Input
                              size="small"
                              value={method.name}
                              onChange={(e) => updateMethod(i, { name: e.target.value })}
                              style={{ width: 150 }}
                            />
                          ) : (
                            <Text code>{method.name}</Text>
                          )}
                          {method.group && <Tag>{method.group}</Tag>}
                        </div>
                      }
                      extra={
                        <Space>
                          {editingMethod === i ? (
                            <Button size="small" onClick={() => setEditingMethod(null)}>
                              完成
                            </Button>
                          ) : (
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => setEditingMethod(i)}
                            />
                          )}
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => deleteMethod(i)}
                          />
                        </Space>
                      }
                    >
                      {editingMethod === i ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Input
                              size="small"
                              value={method.title}
                              onChange={(e) => updateMethod(i, { title: e.target.value })}
                              placeholder="显示标题"
                              style={{ flex: 1 }}
                            />
                            <Input
                              size="small"
                              value={method.description || ''}
                              onChange={(e) => updateMethod(i, { description: e.target.value || undefined })}
                              placeholder="描述"
                              style={{ flex: 1 }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Input
                              size="small"
                              value={method.group || ''}
                              onChange={(e) => updateMethod(i, { group: e.target.value || undefined })}
                              placeholder="分组"
                              style={{ width: 120 }}
                            />
                            <Input
                              size="small"
                              value={method.returnType || ''}
                              onChange={(e) => updateMethod(i, { returnType: e.target.value || undefined })}
                              placeholder="返回类型"
                              style={{ width: 120 }}
                            />
                          </div>
                          {/* 参数列表 */}
                          <div>
                            <Text strong style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>参数：</Text>
                            {(method.params || []).map((param, pi) => (
                              <div key={pi} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
                                <Text code style={{ fontSize: 11 }}>{param.name}</Text>
                                <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>{param.type}</Tag>
                                <Text type="secondary" style={{ fontSize: 11 }}>{param.title}</Text>
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => deleteMethodParam(i, pi)}
                                />
                              </div>
                            ))}
                            <Button
                              type="dashed"
                              size="small"
                              onClick={() => setMethodParamModal({ open: true, methodIndex: i })}
                            >
                              添加参数
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Text type="secondary">{method.description || '暂无描述'}</Text>
                          {method.params && method.params.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <Text style={{ fontSize: 12 }}>参数：</Text>
                              {method.params.map((param, pi) => (
                                <Tag key={pi} style={{ margin: 2 }}>
                                  {param.name}: {param.type}
                                </Tag>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  ))}

                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={addMethod}
                  >
                    添加方法
                  </Button>
                </div>
              ),
            },
            {
              key: 'events',
              label: (
                <span>
                  <BellOutlined /> 暴露事件 ({(card.interface.events || []).length})
                </span>
              ),
              children: (
                <div style={sectionStyle}>
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">
                      配置卡片对外暴露的事件，外部可监听这些事件
                    </Text>
                  </div>

                  {(card.interface.events || []).map((evt, i) => (
                    <div key={i} style={itemStyle}>
                      {editingEvent === i ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Input
                              size="small"
                              value={evt.name}
                              onChange={(e) => updateEvent(i, { name: e.target.value })}
                              placeholder="事件名"
                              style={{ flex: 1 }}
                            />
                            <Input
                              size="small"
                              value={evt.title}
                              onChange={(e) => updateEvent(i, { title: e.target.value })}
                              placeholder="显示标题"
                              style={{ flex: 1 }}
                            />
                          </div>
                          <Input
                            size="small"
                            value={evt.description || ''}
                            onChange={(e) => updateEvent(i, { description: e.target.value || undefined })}
                            placeholder="事件描述"
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button size="small" onClick={() => setEditingEvent(null)}>
                              完成
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ flex: 1 }}>
                            <Text code>{evt.name}</Text>
                            <Text type="secondary" style={{ marginLeft: 8 }}>{evt.title}</Text>
                            {evt.description && (
                              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                                — {evt.description}
                              </Text>
                            )}
                          </div>
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => setEditingEvent(i)}
                          />
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => deleteEvent(i)}
                          />
                        </>
                      )}
                    </div>
                  ))}

                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={addEvent}
                  >
                    添加事件
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* 方法参数弹窗 */}
      <Modal
        title="添加方法参数"
        open={methodParamModal.open}
        onOk={addMethodParam}
        onCancel={() => setMethodParamModal({ open: false, methodIndex: -1 })}
        okText="添加"
        cancelText="取消"
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="参数名" required>
            <Input
              value={newParam.name}
              onChange={(e) => setNewParam((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="参数名"
            />
          </Form.Item>
          <Form.Item label="显示标题" required>
            <Input
              value={newParam.title}
              onChange={(e) => setNewParam((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="参数标题"
            />
          </Form.Item>
          <Form.Item label="类型">
            <Select
              value={newParam.type}
              onChange={(type) => setNewParam((prev) => ({ ...prev, type }))}
              options={PROP_TYPE_OPTIONS}
            />
          </Form.Item>
          <Form.Item label="描述">
            <Input
              value={newParam.description || ''}
              onChange={(e) => setNewParam((prev) => ({ ...prev, description: e.target.value || undefined }))}
              placeholder="参数描述"
            />
          </Form.Item>
          <Form.Item label="默认值">
            <Input
              value={newParam.default?.toString() || ''}
              onChange={(e) => setNewParam((prev) => ({ ...prev, default: e.target.value || undefined }))}
              placeholder="默认值"
            />
          </Form.Item>
          <Form.Item>
            <Switch
              checked={newParam.required}
              onChange={(required) => setNewParam((prev) => ({ ...prev, required }))}
            />
            <Text style={{ marginLeft: 8 }}>必填</Text>
          </Form.Item>
        </Form>
      </Modal>

      {/* 预览弹窗 */}
      <Modal
        title="卡片预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={800}
      >
        <div style={{ padding: 16 }}>
          <Card title={card.name}>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">{card.description || '暂无描述'}</Text>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>暴露属性：</Text>
              {card.interface.props.length > 0 ? (
                <div style={{ marginTop: 8 }}>
                  {card.interface.props.map((prop, i) => (
                    <Tag key={i} color="blue" style={{ margin: 4 }}>
                      {prop.name}: {prop.type}
                    </Tag>
                  ))}
                </div>
              ) : (
                <Text type="secondary" style={{ marginLeft: 8 }}>无</Text>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>暴露方法：</Text>
              {(card.interface.methods || []).length > 0 ? (
                <div style={{ marginTop: 8 }}>
                  {(card.interface.methods || []).map((method, i) => (
                    <Tag key={i} color="green" style={{ margin: 4 }}>
                      {method.name}()
                    </Tag>
                  ))}
                </div>
              ) : (
                <Text type="secondary" style={{ marginLeft: 8 }}>无</Text>
              )}
            </div>

            <div>
              <Text strong>暴露事件：</Text>
              {(card.interface.events || []).length > 0 ? (
                <div style={{ marginTop: 8 }}>
                  {(card.interface.events || []).map((evt, i) => (
                    <Tag key={i} color="orange" style={{ margin: 4 }}>
                      {evt.name}
                    </Tag>
                  ))}
                </div>
              ) : (
                <Text type="secondary" style={{ marginLeft: 8 }}>无</Text>
              )}
            </div>
          </Card>
        </div>
      </Modal>
    </div>
  );
}
