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
  App, Spin, Button, Input, Select, Switch, Table, Space, Tag, Tooltip, Typography, Popover, Modal,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SyncOutlined, SaveOutlined, LinkOutlined, SettingOutlined,
} from '@ant-design/icons';
import type {
  TableSchema, TableColumn, FieldSourceMapping, ForeignKeyReference,
  FieldConstraints, StringFieldConstraints, NumberFieldConstraints,
  DateFieldConstraints, EnumFieldConstraints, ValidationRule, TableIndex,
} from '@low-code/shared';
import { SYSTEM_ID_COLUMN, type TableFieldType } from '@low-code/shared';
import { PageComponentPicker, type PageComponentPickResult } from './components/PageComponentPicker';

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
  { label: '枚举 (enum)', value: 'enum' },
];

/** 字段类型标签颜色 */
const FIELD_TYPE_COLORS: Record<TableFieldType, string> = {
  string: 'blue',
  number: 'green',
  boolean: 'orange',
  date: 'purple',
  json: 'default',
  enum: 'magenta',
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
  const [sourcePageName, setSourcePageName] = useState<string | null>(null);

  // 外键编辑相关状态
  const [otherTables, setOtherTables] = useState<Array<{ tableId: string; name: string; columns: string[] }>>([]);
  const [editingForeignKey, setEditingForeignKey] = useState<string | null>(null); // 正在编辑的列 ID

  // 约束编辑状态
  const [editingConstraints, setEditingConstraints] = useState<string | null>(null);
  // 校验编辑状态
  const [editingValidations, setEditingValidations] = useState<string | null>(null);
  // 索引编辑状态
  const [editingIndex, setEditingIndex] = useState<string | null>(null);
  const [indexModalOpen, setIndexModalOpen] = useState(false);
  const [indexForm, setIndexForm] = useState<{ name: string; columns: string[]; unique: boolean }>({ name: '', columns: [], unique: false });

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

  // ─── 加载来源页面名称 ──────────────────────────────────
  useEffect(() => {
    const pageId = currentSchema?.sourcePageId;
    if (!pageId) {
      setSourcePageName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`/api/apps/${appId}/pages/${pageId}`);
        const data = await resp.json();
        if (!cancelled && data.success && data.resource) {
          setSourcePageName(data.resource.name || pageId);
        }
      } catch {
        // 静默处理，降级显示 ID
      }
    })();
    return () => { cancelled = true; };
  }, [appId, currentSchema?.sourcePageId]);

  // ─── 加载其他表列表（用于外键选择） ──────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`/api/apps/${appId}/tables`);
        const data = await resp.json();
        if (!cancelled && data.success && data.resources) {
          // 排除当前表，加载每张表的列名
          const tables = await Promise.all(
            data.resources
              .filter((t: any) => t.tableId !== tableId && !t._deleted)
              .map(async (t: any) => {
                try {
                  const schemaResp = await fetch(`/api/apps/${appId}/tables/${t.tableId}`);
                  const schemaData = await schemaResp.json();
                  if (schemaData.success && schemaData.resource) {
                    const columnNames = schemaData.resource.columns
                      .filter((c: any) => !c.system)
                      .map((c: any) => c.fieldName);
                    return { tableId: t.tableId, name: t.name || t.tableId, columns: columnNames };
                  }
                } catch {
                  // 忽略加载失败的表
                }
                return null;
              }),
          );
          if (!cancelled) {
            setOtherTables(tables.filter(Boolean) as typeof otherTables);
          }
        }
      } catch {
        // 静默处理
      }
    })();
    return () => { cancelled = true; };
  }, [appId, tableId]);

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

  // ─── 约束管理 ─────────────────────────────────────────

  const updateConstraints = useCallback((columnId: string, constraints: FieldConstraints | undefined) => {
    setCurrentSchema((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.map((col) =>
          col.id === columnId ? { ...col, constraints } : col,
        ),
      };
    });
  }, []);

  // ─── 校验规则管理 ─────────────────────────────────────

  const updateValidations = useCallback((columnId: string, validations: ValidationRule[] | undefined) => {
    setCurrentSchema((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.map((col) =>
          col.id === columnId ? { ...col, validations } : col,
        ),
      };
    });
  }, []);

  // ─── 索引管理 ─────────────────────────────────────────

  const addIndex = useCallback(() => {
    setCurrentSchema((prev) => {
      if (!prev) return prev;
      const newIndex: TableIndex = {
        id: generateId(),
        name: indexForm.name || `idx_${Date.now().toString(36)}`,
        columns: indexForm.columns,
        unique: indexForm.unique,
      };
      return { ...prev, indexes: [...(prev.indexes || []), newIndex] };
    });
    setIndexModalOpen(false);
    setIndexForm({ name: '', columns: [], unique: false });
  }, [indexForm]);

  const deleteIndex = useCallback((indexId: string) => {
    setCurrentSchema((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        indexes: (prev.indexes || []).filter((idx) => idx.id !== indexId),
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
      title: '约束',
      key: 'constraints',
      width: 100,
      render: (_: unknown, record: TableColumn) => {
        if (record.system || isReadonly(record)) return null;

        const constraintsContent = (
          <div style={{ width: 280 }}>
            {record.fieldType === 'string' && (
              <>
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 12 }}>最大长度：</Text>
                  <Input
                    size="small"
                    type="number"
                    style={{ marginTop: 4 }}
                    value={(record.constraints as StringFieldConstraints)?.maxLength ?? ''}
                    placeholder="不限"
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                      updateConstraints(record.id, {
                        ...(record.constraints as StringFieldConstraints || {}),
                        maxLength: val,
                      });
                    }}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 12 }}>正则校验：</Text>
                  <Input
                    size="small"
                    style={{ marginTop: 4, fontFamily: 'monospace' }}
                    value={(record.constraints as StringFieldConstraints)?.pattern ?? ''}
                    placeholder="如 ^[a-zA-Z]+$"
                    onChange={(e) => {
                      updateConstraints(record.id, {
                        ...(record.constraints as StringFieldConstraints || {}),
                        pattern: e.target.value || undefined,
                      });
                    }}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 12 }}>格式：</Text>
                  <Select
                    size="small"
                    style={{ width: '100%', marginTop: 4 }}
                    value={(record.constraints as StringFieldConstraints)?.format}
                    placeholder="无"
                    allowClear
                    onChange={(val) => {
                      updateConstraints(record.id, {
                        ...(record.constraints as StringFieldConstraints || {}),
                        format: val,
                      });
                    }}
                    options={[
                      { label: '邮箱 (email)', value: 'email' },
                      { label: 'URL (url)', value: 'url' },
                      { label: '手机号 (phone)', value: 'phone' },
                      { label: '身份证 (idcard)', value: 'idcard' },
                    ]}
                  />
                </div>
              </>
            )}
            {record.fieldType === 'number' && (
              <>
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 12 }}>最小值：</Text>
                  <Input
                    size="small"
                    type="number"
                    style={{ marginTop: 4 }}
                    value={(record.constraints as NumberFieldConstraints)?.min ?? ''}
                    placeholder="不限"
                    onChange={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : undefined;
                      updateConstraints(record.id, {
                        ...(record.constraints as NumberFieldConstraints || {}),
                        min: val,
                      });
                    }}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 12 }}>最大值：</Text>
                  <Input
                    size="small"
                    type="number"
                    style={{ marginTop: 4 }}
                    value={(record.constraints as NumberFieldConstraints)?.max ?? ''}
                    placeholder="不限"
                    onChange={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : undefined;
                      updateConstraints(record.id, {
                        ...(record.constraints as NumberFieldConstraints || {}),
                        max: val,
                      });
                    }}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 12 }}>小数精度：</Text>
                  <Input
                    size="small"
                    type="number"
                    style={{ marginTop: 4 }}
                    value={(record.constraints as NumberFieldConstraints)?.precision ?? ''}
                    placeholder="0 = 整数"
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                      updateConstraints(record.id, {
                        ...(record.constraints as NumberFieldConstraints || {}),
                        precision: val,
                      });
                    }}
                  />
                </div>
              </>
            )}
            {record.fieldType === 'date' && (
              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ fontSize: 12 }}>日期格式：</Text>
                <Select
                  size="small"
                  style={{ width: '100%', marginTop: 4 }}
                  value={(record.constraints as DateFieldConstraints)?.format || 'datetime'}
                  onChange={(val) => {
                    updateConstraints(record.id, {
                      ...(record.constraints as DateFieldConstraints || {}),
                      format: val as 'date' | 'datetime',
                    });
                  }}
                  options={[
                    { label: '日期 (date)', value: 'date' },
                    { label: '日期时间 (datetime)', value: 'datetime' },
                  ]}
                />
              </div>
            )}
            {record.fieldType === 'enum' && (
              <div>
                <Text strong style={{ fontSize: 12 }}>枚举值：</Text>
                <div style={{ marginTop: 4 }}>
                  {((record.constraints as EnumFieldConstraints)?.values || []).map((v, i) => (
                    <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      <Input
                        size="small"
                        value={v.label}
                        placeholder="显示名"
                        style={{ flex: 1 }}
                        onChange={(e) => {
                          const values = [...((record.constraints as EnumFieldConstraints)?.values || [])];
                          values[i] = { ...values[i], label: e.target.value };
                          updateConstraints(record.id, { values } as EnumFieldConstraints);
                        }}
                      />
                      <Input
                        size="small"
                        value={v.value}
                        placeholder="值"
                        style={{ flex: 1 }}
                        onChange={(e) => {
                          const values = [...((record.constraints as EnumFieldConstraints)?.values || [])];
                          values[i] = { ...values[i], value: e.target.value };
                          updateConstraints(record.id, { values } as EnumFieldConstraints);
                        }}
                      />
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          const values = ((record.constraints as EnumFieldConstraints)?.values || []).filter((_, idx) => idx !== i);
                          updateConstraints(record.id, values.length > 0 ? { values } as EnumFieldConstraints : undefined);
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    type="dashed"
                    size="small"
                    block
                    onClick={() => {
                      const values = [...((record.constraints as EnumFieldConstraints)?.values || []), { label: '', value: '' }];
                      updateConstraints(record.id, { values } as EnumFieldConstraints);
                    }}
                  >
                    添加枚举值
                  </Button>
                </div>
              </div>
            )}
            {!['string', 'number', 'date', 'enum'].includes(record.fieldType) && (
              <Text type="secondary" style={{ fontSize: 12 }}>该类型无可配置约束</Text>
            )}
          </div>
        );

        const hasConstraints = record.constraints && Object.keys(record.constraints).length > 0;

        return (
          <Popover
            content={constraintsContent}
            title="类型约束"
            trigger="click"
            open={editingConstraints === record.id}
            onOpenChange={(open) => setEditingConstraints(open ? record.id : null)}
          >
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              style={{ fontSize: 11, color: hasConstraints ? '#4f46e5' : '#8c8c8c' }}
            />
          </Popover>
        );
      },
    },
    {
      title: '校验',
      key: 'validations',
      width: 80,
      render: (_: unknown, record: TableColumn) => {
        if (record.system || isReadonly(record)) return null;

        const validations = record.validations || [];
        const validationsContent = (
          <div style={{ width: 300 }}>
            {validations.map((rule, i) => (
              <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 8, alignItems: 'flex-start' }}>
                <Select
                  size="small"
                  value={rule.type}
                  style={{ width: 100 }}
                  onChange={(type) => {
                    const updated = [...validations];
                    updated[i] = { ...updated[i], type: type as ValidationRule['type'] };
                    updateValidations(record.id, updated);
                  }}
                  options={[
                    { label: '必填', value: 'required' },
                    { label: '正则', value: 'pattern' },
                    { label: '最小值', value: 'min' },
                    { label: '最大值', value: 'max' },
                    { label: '最小长度', value: 'minLength' },
                    { label: '最大长度', value: 'maxLength' },
                    { label: '自定义', value: 'custom' },
                  ]}
                />
                {rule.type !== 'required' && (
                  <Input
                    size="small"
                    value={rule.value?.toString() ?? ''}
                    placeholder="值"
                    style={{ flex: 1 }}
                    onChange={(e) => {
                      const updated = [...validations];
                      const val = ['min', 'max', 'minLength', 'maxLength'].includes(rule.type)
                        ? (e.target.value ? Number(e.target.value) : undefined)
                        : e.target.value || undefined;
                      updated[i] = { ...updated[i], value: val };
                      updateValidations(record.id, updated);
                    }}
                  />
                )}
                <Input
                  size="small"
                  value={rule.message ?? ''}
                  placeholder="错误消息"
                  style={{ flex: 1 }}
                  onChange={(e) => {
                    const updated = [...validations];
                    updated[i] = { ...updated[i], message: e.target.value || undefined };
                    updateValidations(record.id, updated);
                  }}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    const updated = validations.filter((_, idx) => idx !== i);
                    updateValidations(record.id, updated.length > 0 ? updated : undefined);
                  }}
                />
              </div>
            ))}
            <Button
              type="dashed"
              size="small"
              block
              onClick={() => {
                const updated = [...validations, { type: 'required' as const, message: '' }];
                updateValidations(record.id, updated);
              }}
            >
              添加校验规则
            </Button>
          </div>
        );

        return (
          <Popover
            content={validationsContent}
            title="校验规则"
            trigger="click"
            open={editingValidations === record.id}
            onOpenChange={(open) => setEditingValidations(open ? record.id : null)}
          >
            <Button
              type="text"
              size="small"
              style={{ fontSize: 11, color: validations.length > 0 ? '#4f46e5' : '#8c8c8c' }}
            >
              {validations.length > 0 ? `${validations.length} 条` : '—'}
            </Button>
          </Popover>
        );
      },
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
      title: '外键',
      dataIndex: 'foreignKey',
      key: 'foreignKey',
      width: 140,
      render: (val: ForeignKeyReference | undefined, record: TableColumn) => {
        if (record.system) return null;

        // 外键编辑 Popover 内容
        const foreignKeyContent = (
          <div style={{ width: 280 }}>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 12 }}>目标表：</Text>
              <Select
                size="small"
                style={{ width: '100%', marginTop: 4 }}
                placeholder="选择目标表"
                value={val?.targetTableId}
                onChange={(targetTableId) => {
                  const targetTable = otherTables.find((t) => t.tableId === targetTableId);
                  updateColumn(record.id, {
                    foreignKey: {
                      targetTableId,
                      targetFieldName: 'id',
                      onDelete: 'RESTRICT',
                    },
                  });
                }}
                options={otherTables.map((t) => ({ label: t.name, value: t.tableId }))}
                allowClear
              />
            </div>
            {val?.targetTableId && (
              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ fontSize: 12 }}>目标字段：</Text>
                <Select
                  size="small"
                  style={{ width: '100%', marginTop: 4 }}
                  value={val.targetFieldName || 'id'}
                  onChange={(targetFieldName) => {
                    updateColumn(record.id, {
                      foreignKey: { ...val, targetFieldName },
                    });
                  }}
                  options={[
                    { label: 'id（主键）', value: 'id' },
                    ...(otherTables.find((t) => t.tableId === val.targetTableId)?.columns || [])
                      .map((c) => ({ label: c, value: c })),
                  ]}
                />
              </div>
            )}
            {val?.targetTableId && (
              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ fontSize: 12 }}>删除策略：</Text>
                <Select
                  size="small"
                  style={{ width: '100%', marginTop: 4 }}
                  value={val.onDelete || 'RESTRICT'}
                  onChange={(onDelete) => {
                    updateColumn(record.id, {
                      foreignKey: { ...val, onDelete: onDelete as ForeignKeyReference['onDelete'] },
                    });
                  }}
                  options={[
                    { label: 'RESTRICT（禁止删除）', value: 'RESTRICT' },
                    { label: 'CASCADE（级联删除）', value: 'CASCADE' },
                    { label: 'SET NULL（设为空）', value: 'SET NULL' },
                  ]}
                />
              </div>
            )}
            {val?.targetTableId && (
              <Button
                size="small"
                danger
                block
                onClick={() => updateColumn(record.id, { foreignKey: undefined })}
              >
                移除外键
              </Button>
            )}
          </div>
        );

        // 外键显示
        if (val) {
          return (
            <Popover
              content={foreignKeyContent}
              title="外键配置"
              trigger="click"
              open={editingForeignKey === record.id}
              onOpenChange={(open) => setEditingForeignKey(open ? record.id : null)}
            >
              <Tag
                color="orange"
                icon={<LinkOutlined />}
                style={{ margin: 0, fontSize: 11, cursor: 'pointer' }}
              >
                {val.targetTableId}.{val.targetFieldName || 'id'}
              </Tag>
            </Popover>
          );
        }

        // 无外键：显示设置按钮
        return (
          <Popover
            content={foreignKeyContent}
            title="设置外键"
            trigger="click"
            open={editingForeignKey === record.id}
            onOpenChange={(open) => setEditingForeignKey(open ? record.id : null)}
          >
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              style={{ fontSize: 11, color: '#8c8c8c' }}
            />
          </Popover>
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
  ], [updateColumn, deleteColumn, otherTables, editingForeignKey, editingConstraints, editingValidations, updateConstraints, updateValidations]);

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
              来源页面: {sourcePageName || currentSchema.sourcePageId}
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
            scroll={{ x: 1200 }}
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

        {/* 索引管理 */}
        <div style={{ backgroundColor: '#fff', borderRadius: 6, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', marginTop: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>索引管理</Text>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setIndexForm({ name: '', columns: [], unique: false });
                setIndexModalOpen(true);
              }}
            >
              新建索引
            </Button>
          </div>
          <Table
            dataSource={currentSchema.indexes || []}
            rowKey="id"
            pagination={false}
            size="small"
            locale={{ emptyText: '暂无索引' }}
            columns={[
              {
                title: '索引名称',
                dataIndex: 'name',
                key: 'name',
                render: (name: string) => <span style={{ fontFamily: 'monospace' }}>{name}</span>,
              },
              {
                title: '关联字段',
                dataIndex: 'columns',
                key: 'columns',
                render: (cols: string[]) => cols.map((c) => <Tag key={c} style={{ margin: 2 }}>{c}</Tag>),
              },
              {
                title: '唯一',
                dataIndex: 'unique',
                key: 'unique',
                width: 80,
                render: (unique: boolean) => <Tag color={unique ? 'green' : 'default'}>{unique ? '是' : '否'}</Tag>,
              },
              {
                title: '操作',
                key: 'action',
                width: 80,
                render: (_: unknown, record: TableIndex) => (
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => deleteIndex(record.id)}
                  />
                ),
              },
            ]}
          />
        </div>
      </div>

      {/* 新建索引弹窗 */}
      <Modal
        title="新建索引"
        open={indexModalOpen}
        onOk={addIndex}
        onCancel={() => setIndexModalOpen(false)}
        okText="创建"
        cancelText="取消"
        okButtonProps={{ disabled: !indexForm.name || indexForm.columns.length === 0 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>索引名称</Text>
            <Input
              value={indexForm.name}
              onChange={(e) => setIndexForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="如 idx_user_email"
            />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>关联字段</Text>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              value={indexForm.columns}
              onChange={(columns) => setIndexForm((prev) => ({ ...prev, columns }))}
              placeholder="选择字段"
              options={currentSchema.columns
                .filter((c) => !c.system)
                .map((c) => ({ label: c.fieldName, value: c.fieldName }))}
            />
          </div>
          <div>
            <Switch
              checked={indexForm.unique}
              onChange={(unique) => setIndexForm((prev) => ({ ...prev, unique }))}
            />
            <Text style={{ marginLeft: 8 }}>唯一索引</Text>
          </div>
        </div>
      </Modal>

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
