/**
 * 数据表设计器
 *
 * 可视化编辑数据表 schema，支持字段的增删改查。
 * 支持从页面组件快速创建字段，并保留映射关系用于后续同步。
 *
 * Props:
 *   appId    — 应用 ID
 *   tableId  — 裸资源 ID
 *   schema   — 初始数据表 schema（可选，为空时加载）
 *   onSaved  — 保存成功后的回调
 *
 * Route: 由 AppDesignPage 加载，不直接暴露路由。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App, Spin, Button, Input, Select, Switch, Table, Space, Tag, Tooltip, Typography,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SyncOutlined, SaveOutlined, LinkOutlined,
} from '@ant-design/icons';
import type { TableSchema, TableColumn, FieldSourceMapping } from '@low-code/shared';
import { SYSTEM_ID_COLUMN, type TableFieldType } from '@low-code/shared';
import { PageComponentPicker, type PageComponentPickResult } from './PageComponentPicker';

const { Text } = Typography;

// ─── 类型 ──────────────────────────────────────────────

interface TableDesignProps {
  appId: string;
  tableId: string;
  schema?: TableSchema;
  onSaved?: (name: string) => void;
}

/** 生成 8 位 hex ID */
function generateId(): string {
  return crypto.randomUUID().slice(0, 8);
}

// ─── 字段类型选项 ──────────────────────────────────────

const FIELD_TYPE_OPTIONS: Array<{ label: string; value: TableFieldType }> = [
  { label: '文本 (string)', value: 'string' },
  { label: '数字 (number)', value: 'number' },
  { label: '布尔 (boolean)', value: 'boolean' },
  { label: '日期 (date)', value: 'date' },
  { label: 'JSON (json)', value: 'json' },
];

/** 字段类型标签颜色 */
const FIELD_TYPE_COLORS: Record<TableFieldType, string> = {
  string: 'blue',
  number: 'green',
  boolean: 'orange',
  date: 'purple',
  json: 'default',
};

// ─── 组件类型中文名 ────────────────────────────────────

const COMPONENT_TYPE_NAMES: Record<string, string> = {
  input: '输入框', textarea: '文本域', number: '数字输入', select: '选择器',
  radio: '单选框', checkbox: '复选框', switch: '开关', datepicker: '日期选择',
  timepicker: '时间选择', rate: '评分', slider: '滑块', upload: '上传',
  treeselect: '树选择', cascader: '级联选择', colorpicker: '颜色选择',
  mentions: '提及', autocomplete: '自动完成',
};

/** 系统字段或同步字段均为只读 */
const isReadonly = (record: TableColumn) => !!record.system || !!record.sourceMapping;

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

const tableInfoStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 6,
  padding: '12px 16px',
  marginBottom: 16,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
};

// ─── 主组件 ────────────────────────────────────────────

export default function TableDesign({ appId, tableId, schema, onSaved }: TableDesignProps) {
  const { message } = App.useApp();

  // ─── 状态 ─────────────────────────────────────────────
  const [currentSchema, setCurrentSchema] = useState<TableSchema | undefined>(schema);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!schema);
  const [pickerVisible, setPickerVisible] = useState(false);

  // ─── 加载数据表 schema ─────────────────────────────────
  useEffect(() => {
    if (schema) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`/api/apps/${appId}/tables/${tableId}`);
        const data = await resp.json();
        if (!cancelled && data.success && data.resource) {
          setCurrentSchema(data.resource);
        }
      } catch {
        if (!cancelled) message.error('加载数据表失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [appId, tableId, schema]);

  // ─── 更新字段 ─────────────────────────────────────────

  const updateColumn = useCallback((columnId: string, updates: Partial<TableColumn>) => {
    setCurrentSchema((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.map((col) =>
          col.id === columnId ? { ...col, ...updates } : col,
        ),
      };
    });
  }, []);

  const addColumn = useCallback(() => {
    setCurrentSchema((prev) => {
      if (!prev) return prev;
      const newCol: TableColumn = {
        id: generateId(),
        fieldName: `field_${prev.columns.length + 1}`,
        fieldType: 'string',
        required: false,
      };
      return { ...prev, columns: [...prev.columns, newCol] };
    });
  }, []);

  const deleteColumn = useCallback((columnId: string) => {
    setCurrentSchema((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.filter((col) => col.id !== columnId),
      };
    });
  }, []);

  // ─── 从页面同步/创建 ──────────────────────────────────

  const handlePagePickerConfirm = useCallback((result: PageComponentPickResult) => {
    setCurrentSchema((prev) => {
      if (!prev) return prev;

      const existingFieldNames = new Set(prev.columns.map((c) => c.fieldName));
      // 用 componentId + propName 去重，支持同一组件的不同属性
      const existingMappings = new Set(
        prev.columns
          .filter((c) => c.sourceMapping)
          .map((c) => `${c.sourceMapping!.componentId}::${c.sourceMapping!.componentProp}`),
      );

      // 过滤掉已存在的映射（componentId + propName）
      const newFields = result.fields.filter(
        (f) => !existingMappings.has(`${f.componentId}::${f.propName}`),
      );

      // 生成不重复的字段名
      const usedNames = new Set(existingFieldNames);
      const newColumns: TableColumn[] = newFields.map((field) => {
        let name = field.fieldName;
        let counter = 1;
        while (usedNames.has(name)) {
          name = `${field.fieldName}_${counter}`;
          counter++;
        }
        usedNames.add(name);

        const mapping: FieldSourceMapping = {
          componentId: field.componentId,
          componentProp: field.propName,
        };

        return {
          id: generateId(),
          fieldName: name,
          fieldType: field.fieldType,
          required: field.required,
          sourceMapping: mapping,
        };
      });

      return {
        ...prev,
        columns: [...prev.columns, ...newColumns],
        sourcePageId: prev.sourcePageId || result.pageId,
      };
    });

    setPickerVisible(false);
    message.success(`已添加 ${result.fields.length} 个字段`);
  }, [message]);

  // ─── 保存 ─────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!currentSchema) return;
    if (!currentSchema.name?.trim()) {
      message.warning('请输入数据表名称');
      return;
    }
    if (currentSchema.columns.length === 0) {
      message.warning('请至少添加一个字段');
      return;
    }

    // 校验字段名（跳过系统字段）
    const userColumns = currentSchema.columns.filter((c) => !c.system);
    for (const col of userColumns) {
      if (!col.fieldName.trim()) {
        message.warning('字段名不能为空');
        return;
      }
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col.fieldName)) {
        message.warning(`字段名 "${col.fieldName}" 格式不正确，只允许英文、数字和下划线`);
        return;
      }
    }

    // 检查字段名重复（含系统字段）
    const allNames = currentSchema.columns.map((c) => c.fieldName);
    const duplicates = allNames.filter((n, i) => allNames.indexOf(n) !== i);
    if (duplicates.length > 0) {
      message.warning(`字段名重复: ${duplicates[0]}`);
      return;
    }

    setSaving(true);
    try {
      const resp = await fetch(`/api/apps/${appId}/tables/${tableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSchema),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || '保存失败');
      }
      message.success('数据表保存成功');
      onSaved?.(currentSchema.name);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }, [appId, tableId, currentSchema, onSaved, message]);

  // ─── 表格列定义 ───────────────────────────────────────

  const tableColumns = useMemo(() => [
    {
      title: '字段名',
      dataIndex: 'fieldName',
      key: 'fieldName',
      width: 180,
      render: (val: string, record: TableColumn) => isReadonly(record) ? (
        <span style={{ fontFamily: 'monospace', color: '#8c8c8c' }}>{val}</span>
      ) : (
        <Input
          size="small"
          value={val}
          onChange={(e) => updateColumn(record.id, { fieldName: e.target.value })}
          style={{ fontFamily: 'monospace' }}
        />
      ),
    },
    {
      title: '类型',
      dataIndex: 'fieldType',
      key: 'fieldType',
      width: 140,
      render: (val: TableFieldType, record: TableColumn) => {
        if (record.system) return <Tag color="green" style={{ margin: 0 }}>number (自增)</Tag>;
        if (record.sourceMapping) {
          const color = FIELD_TYPE_COLORS[val] || 'default';
          return <Tag color={color} style={{ margin: 0 }}>{val}</Tag>;
        }
        return (
          <Select
            size="small"
            value={val}
            style={{ width: '100%' }}
            onChange={(v) => updateColumn(record.id, { fieldType: v })}
            options={FIELD_TYPE_OPTIONS}
          />
        );
      },
    },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      width: 60,
      render: (val: boolean, record: TableColumn) => isReadonly(record) ? (
        <Tag color={record.system ? 'orange' : 'blue'} style={{ margin: 0, fontSize: 11 }}>
          {record.system ? '系统' : (val ? '必填' : '可选')}
        </Tag>
      ) : (
        <Switch
          size="small"
          checked={val}
          onChange={(v) => updateColumn(record.id, { required: v })}
        />
      ),
    },
    {
      title: '默认值',
      dataIndex: 'defaultValue',
      key: 'defaultValue',
      width: 140,
      render: (val: string | undefined, record: TableColumn) => isReadonly(record) ? (
        <Text type="secondary" style={{ fontSize: 11 }}>{record.system ? '自增' : (val || '—')}</Text>
      ) : (
        <Input
          size="small"
          value={val || ''}
          placeholder="可选"
          onChange={(e) => updateColumn(record.id, { defaultValue: e.target.value || undefined })}
        />
      ),
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      width: 180,
      render: (val: string | undefined, record: TableColumn) => isReadonly(record) ? (
        <Text type="secondary" style={{ fontSize: 11 }}>{val || '—'}</Text>
      ) : (
        <Input
          size="small"
          value={val || ''}
          placeholder="字段说明"
          onChange={(e) => updateColumn(record.id, { description: e.target.value || undefined })}
        />
      ),
    },
    {
      title: '来源',
      dataIndex: 'sourceMapping',
      key: 'source',
      width: 120,
      render: (val: FieldSourceMapping | undefined, record: TableColumn) => {
        if (record.system) return <Tag color="gold" style={{ margin: 0, fontSize: 11 }}>系统</Tag>;
        if (!val) return <Text type="secondary" style={{ fontSize: 11 }}>手动</Text>;
        return (
          <Tooltip title={`${val.componentId}.${val.componentProp}`}>
            <Tag color="cyan" icon={<LinkOutlined />} style={{ margin: 0, fontSize: 11 }}>
              {val.componentId}.{val.componentProp}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 50,
      render: (_: unknown, record: TableColumn) => record.system ? null : (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => deleteColumn(record.id)}
        />
      ),
    },
  ], [updateColumn, deleteColumn]);

  // ─── 渲染 ────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin />
      </div>
    );
  }

  if (!currentSchema) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Text type="secondary">数据表不存在</Text>
      </div>
    );
  }

  const hasSourcePage = !!currentSchema.sourcePageId;
  const sourceMappedCount = currentSchema.columns.filter((c) => c.sourceMapping).length;

  // 合并系统字段 + 用户字段用于展示
  const allDisplayColumns: TableColumn[] = [SYSTEM_ID_COLUMN, ...currentSchema.columns];

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
            icon={<SyncOutlined />}
            onClick={() => setPickerVisible(true)}
          >
            从页面同步
          </Button>
        </Space>
        <Space>
          {sourceMappedCount > 0 && (
            <Tag color="cyan">
              已映射 {sourceMappedCount} 个组件
            </Tag>
          )}
          <Text type="secondary" style={{ fontSize: 12 }}>
            {currentSchema.columns.length} 个自定义字段
          </Text>
        </Space>
      </div>

      {/* 内容区 */}
      <div style={contentStyle}>
        {/* 表信息 */}
        <div style={tableInfoStyle}>
          <Text strong>表名：</Text>
          <Input
            value={currentSchema.name}
            onChange={(e) => setCurrentSchema((prev) => prev ? { ...prev, name: e.target.value } : prev)}
            style={{ width: 240 }}
            placeholder="输入数据表名称"
          />
          {hasSourcePage && (
            <Tag color="blue">
              来源页面: {currentSchema.sourcePageId}
            </Tag>
          )}
        </div>

        {/* 字段表格 */}
        <div style={{ backgroundColor: '#fff', borderRadius: 6, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <Table
            dataSource={allDisplayColumns}
            columns={tableColumns}
            rowKey="id"
            pagination={false}
            size="small"
            scroll={{ x: 900 }}
            footer={() => (
              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={addColumn}
              >
                添加字段
              </Button>
            )}
          />
        </div>
      </div>

      {/* 页面组件选择器 */}
      <PageComponentPicker
        appId={appId}
        visible={pickerVisible}
        initialPageId={currentSchema.sourcePageId}
        existingFieldMappings={
          currentSchema.columns
            .filter((c) => c.sourceMapping)
            .map((c) => c.sourceMapping!)
        }
        onConfirm={handlePagePickerConfirm}
        onCancel={() => setPickerVisible(false)}
      />
    </div>
  );
}
