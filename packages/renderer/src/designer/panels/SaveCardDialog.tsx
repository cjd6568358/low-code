import React, { useState, useMemo } from 'react';
import type { ComponentNode, CustomCardDefinition, ExposedProp, EventDefinition, SlotDefinition, MethodDefinition } from '@low-code/shared';

/** 保存为卡片对话框属性 */
export interface SaveCardDialogProps {
  visible: boolean;
  selectedNodes: ComponentNode[];
  allNodes: ComponentNode[];
  onClose: () => void;
  onSave: (definition: CustomCardDefinition) => void;
}

/**
 * 保存为卡片对话框
 *
 * 文档描述的自动推荐逻辑：
 * - 内部组件引用了页面上下文/表单数据的变量 → 推荐为暴露属性
 * - 内部表单控件 → 推荐 validate / reset / getData 方法
 * - 内部按钮/可点击元素的事件 → 推荐为暴露事件
 */
export function SaveCardDialog(props: SaveCardDialogProps) {
  const { visible, selectedNodes, allNodes, onClose, onSave } = props;

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [description, setDescription] = useState('');
  const [exposedProps, setExposedProps] = useState<ExposedProp[]>([]);
  const [exposedEvents, setExposedEvents] = useState<EventDefinition[]>([]);
  const [exposedSlots, setExposedSlots] = useState<SlotDefinition[]>([]);
  const [exposedMethods, setExposedMethods] = useState<MethodDefinition[]>([]);

  // 自动推荐
  const recommendations = useMemo(() => {
    if (selectedNodes.length === 0) return { props: [], events: [], methods: [], slots: [] };

    const recProps: ExposedProp[] = [];
    const recEvents: EventDefinition[] = [];
    const recMethods: MethodDefinition[] = [];
    const recSlots: SlotDefinition[] = [];

    // 表单控件类型
    const formControlTypes = new Set([
      'input', 'textarea', 'number', 'select', 'radio',
      'checkbox', 'switch', 'datepicker', 'timepicker', 'upload',
    ]);

    for (const node of selectedNodes) {
      // 1. 推荐暴露属性：props 中包含变量引用的字段
      for (const [key, value] of Object.entries(node.props)) {
        if (typeof value === 'string' && value.startsWith('$')) {
          recProps.push({
            name: `${node.id}_${key}`,
            type: 'string',
            title: `${node.id} 的 ${key}`,
            default: value,
          });
        }
      }

      // 2. 推荐方法：表单控件推荐 validate/reset/getData
      if (formControlTypes.has(node.type)) {
        if (!recMethods.find((m) => m.name === 'validate')) {
          recMethods.push({
            name: 'validate',
            title: '校验',
            description: '校验卡片内所有表单字段',
            group: '表单操作',
            params: [{ name: 'strict', type: 'boolean', title: '严格模式', default: false }],
            returnType: '{ valid: boolean, errors: Record<string, string> }',
            implementation: [{ action: 'validateComponents', params: { targets: ['card_container'] } }],
          });
        }
        if (!recMethods.find((m) => m.name === 'reset')) {
          recMethods.push({
            name: 'reset',
            title: '重置',
            description: '重置表单为初始值',
            group: '表单操作',
            params: [],
            returnType: 'void',
            implementation: [{ action: 'resetComponents', params: { targets: ['card_container'] } }],
          });
        }
        if (!recMethods.find((m) => m.name === 'getData')) {
          recMethods.push({
            name: 'getData',
            title: '获取数据',
            description: '获取卡片内所有表单字段的当前值',
            group: '数据操作',
            params: [],
            returnType: 'Record<string, any>',
            implementation: [{ action: 'collectFormData', params: { targets: ['card_container'] } }],
          });
        }
      }

      // 3. 推荐暴露事件：按钮的 onClick
      if (node.type === 'button' && node.events?.onClick) {
        recEvents.push({
          name: `on${capitalize(node.id)}Click`,
          title: `点击 ${node.props.children || node.id}`,
          payload: {},
        });
      }

      // 4. 自动收集插槽：模板中的 slot 组件（含暴露信息）
      if (node.type === 'slot') {
        const slotDef: any = {
          name: node.props.name || node.id,
          title: node.props.title || node.id,
          description: node.props.description,
          accept: node.props.accept,
          maxItems: node.props.maxItems,
        };

        // 收集暴露接口
        const expose: any = {};
        if (node.props.exposeVariables?.length > 0) {
          expose.variables = {};
          for (const ev of node.props.exposeVariables) {
            if (ev.name && ev.expression) {
              expose.variables[ev.name] = ev.expression;
            }
          }
        }
        if (node.props.exposeMethods?.length > 0) {
          expose.methods = node.props.exposeMethods;
        }
        if (node.props.exposeEvents?.length > 0) {
          expose.events = node.props.exposeEvents;
        }
        if (Object.keys(expose).length > 0) {
          slotDef.expose = expose;
        }

        recSlots.push(slotDef);
      }
    }

    return { props: recProps, events: recEvents, methods: recMethods, slots: recSlots };
  }, [selectedNodes]);

  // 初始化推荐数据
  React.useEffect(() => {
    if (visible) {
      setExposedProps(recommendations.props);
      setExposedEvents(recommendations.events);
      setExposedMethods(recommendations.methods);
      setExposedSlots(recommendations.slots);
    }
  }, [visible, recommendations]);

  if (!visible) return null;

  const handleSave = () => {
    const cardId = `card_${Date.now()}`;
    const selectedIds = new Set(selectedNodes.map((n) => n.id));

    // 构建 template（选中的组件及其子组件）
    const template = allNodes.filter(
      (n) => selectedIds.has(n.id) || (n.parentId && selectedIds.has(n.parentId)),
    );

    // 构建 bindings
    const bindings: Record<string, any> = {};
    for (const prop of exposedProps) {
      bindings[prop.name] = {
        target: prop.name,
        expression: `$props.${prop.name}`,
      };
    }

    const definition: CustomCardDefinition = {
      id: cardId,
      name: name || '未命名卡片',
      version,
      description,
      category: category || undefined,
      interface: {
        props: exposedProps,
        methods: exposedMethods,
        slots: exposedSlots,
        events: exposedEvents,
      },
      template,
      bindings,
      events: exposedEvents.map((evt) => ({
        source: evt.name,
        emit: evt.name,
      })),
    };

    onSave(definition);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          width: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <h3 style={{ marginTop: 0 }}>保存为自定义卡片</h3>

        {/* 基本信息 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>名称 *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="客户摘要卡片"
            style={{ width: '100%', padding: '6px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>分类</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="CRM"
              style={{ width: '100%', padding: '6px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>版本</label>
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              style={{ width: '100%', padding: '6px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: '6px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', boxSizing: 'border-box' }}
          />
        </div>

        {/* 暴露属性 */}
        <Section title="暴露属性" count={exposedProps.length}>
          {exposedProps.map((prop, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <input
                value={prop.name}
                onChange={(e) => {
                  const next = [...exposedProps];
                  next[i] = { ...prop, name: e.target.value };
                  setExposedProps(next);
                }}
                style={{ flex: 1, padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              />
              <select
                value={prop.type}
                onChange={(e) => {
                  const next = [...exposedProps];
                  next[i] = { ...prop, type: e.target.value as any };
                  setExposedProps(next);
                }}
                style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="object">object</option>
                <option value="array">array</option>
              </select>
              <input
                value={prop.title}
                onChange={(e) => {
                  const next = [...exposedProps];
                  next[i] = { ...prop, title: e.target.value };
                  setExposedProps(next);
                }}
                placeholder="标题"
                style={{ flex: 1, padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              />
              <button
                onClick={() => setExposedProps(exposedProps.filter((_, j) => j !== i))}
                style={{ padding: '4px 8px', border: '1px solid #ff4d4f', borderRadius: '4px', color: '#ff4d4f', cursor: 'pointer', backgroundColor: '#fff' }}
              >
                删除
              </button>
            </div>
          ))}
          <button
            onClick={() => setExposedProps([...exposedProps, { name: '', type: 'string', title: '' }])}
            style={{ padding: '4px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fff' }}
          >
            + 添加属性
          </button>
        </Section>

        {/* 暴露方法 */}
        <Section title="暴露方法" count={exposedMethods.length}>
          {exposedMethods.map((method, i) => (
            <div key={i} style={{ padding: '8px', border: '1px solid #e8e8e8', borderRadius: '4px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 600 }}>{method.name}</div>
              <div style={{ fontSize: '12px', color: '#999' }}>{method.description}</div>
            </div>
          ))}
        </Section>

        {/* 暴露事件 */}
        <Section title="暴露事件" count={exposedEvents.length}>
          {exposedEvents.map((evt, i) => (
            <div key={i} style={{ padding: '8px', border: '1px solid #e8e8e8', borderRadius: '4px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 600 }}>{evt.name}</div>
              <div style={{ fontSize: '12px', color: '#999' }}>{evt.title}</div>
            </div>
          ))}
        </Section>

        {/* 插槽 */}
        <Section title="插槽" count={exposedSlots.length}>
          {exposedSlots.map((slot, i) => (
            <div key={i} style={{ padding: '8px', border: '1px solid #e8e8e8', borderRadius: '4px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 600 }}>{slot.name}</div>
              <div style={{ fontSize: '12px', color: '#999' }}>{slot.title}</div>
            </div>
          ))}
        </Section>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 24px', border: '1px solid #d9d9d9', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fff' }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!name}
            style={{
              padding: '8px 24px',
              border: 'none',
              borderRadius: '4px',
              cursor: name ? 'pointer' : 'not-allowed',
              backgroundColor: name ? '#1890ff' : '#d9d9d9',
              color: '#fff',
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

/** 分组区块 */
function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#666' }}>
        {title} ({count})
      </div>
      {children}
    </div>
  );
}

/** 首字母大写 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
