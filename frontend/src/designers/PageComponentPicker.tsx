/**
 * PageComponentPicker — 页面组件属性选择器弹框
 *
 * 参考 VariablePicker 的变量树实现，展示页面组件的完整属性树：
 *   $component
 *     ├── input_01 (输入框)
 *     │     ├── value    (string)   — 组件当前值
 *     │     ├── visible  (boolean)  — 是否可见
 *     │     ├── disabled (boolean)  — 是否禁用
 *     │     └── loading  (boolean)  — 是否加载中
 *     └── select_01 (选择器)
 *           └── ...
 *
 * 支持多选叶子节点，每个选中的属性对应一个表字段。
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Modal, Select, Spin, Empty, Tag, Typography } from 'antd';
import type { PageSchema, ComponentNode } from '@low-code/shared';
import {
  DATA_ENTRY_COMPONENT_TYPES,
  type FieldSourceMapping,
  type TableFieldType,
} from '@low-code/shared';
import { SelectableTree } from '@low-code/renderer';
import type { TreeNodeData } from '@low-code/renderer';

const { Text } = Typography;

// ─── 类型 ──────────────────────────────────────────────

interface PageInfo {
  id: string;
  name: string;
}

/** 组件属性条目 */
interface ComponentPropEntry {
  /** 路径 key，如 "$component.input_01.value" */
  key: string;
  /** 组件 ID */
  componentId: string;
  /** 组件类型 */
  componentType: string;
  /** 组件中文名 */
  componentLabel: string;
  /** 属性名（value/visible/disabled/loading） */
  propName: string;
  /** 属性类型 */
  propType: string;
  /** 属性描述 */
  propDescription: string;
  /** 组件是否配置了 required（从 props.required 同步） */
  componentRequired: boolean;
}

/** 确认返回的数据 */
export interface PageComponentPickResult {
  pageId: string;
  mappings: FieldSourceMapping[];
  fields: Array<{
    fieldName: string;
    fieldType: TableFieldType;
    componentId: string;
    componentType: string;
    propName: string;
    required: boolean;
  }>;
}

// ─── 工具函数 ──────────────────────────────────────────

const COMPONENT_TYPE_NAMES: Record<string, string> = {
  input: '输入框', textarea: '文本域', number: '数字输入', select: '选择器',
  radio: '单选框', checkbox: '复选框', switch: '开关', datepicker: '日期选择',
  timepicker: '时间选择', rate: '评分', slider: '滑块', upload: '上传',
  treeselect: '树选择', cascader: '级联选择', colorpicker: '颜色选择',
  mentions: '提及', autocomplete: '自动完成', text: '文本',
};

function getComponentTypeName(type: string): string {
  return COMPONENT_TYPE_NAMES[type] || type;
}

/** 与 EnvironmentRegistry.extractValueType 保持一致 */
function extractValueType(componentType: string): string {
  const valueTypeMap: Record<string, string> = {
    input: 'string', textarea: 'string', text: 'string',
    number: 'number', rate: 'number', slider: 'number',
    switch: 'boolean', checkbox: 'boolean',
    select: 'string | string[]', radio: 'string',
    datepicker: 'string', timepicker: 'string',
    cascader: 'string[]', treeselect: 'string | string[]',
    upload: 'object', colorpicker: 'string',
  };
  return valueTypeMap[componentType] || 'any';
}

/**
 * 从页面 schema 提取所有数据录入组件的属性列表
 *
 * 每个组件展开为 4 个属性：value / visible / disabled / loading
 */
function extractComponentProps(page: PageSchema): ComponentPropEntry[] {
  const entries: ComponentPropEntry[] = [];
  const seen = new Set<string>();

  for (const comp of page.components) {
    if (!DATA_ENTRY_COMPONENT_TYPES.has(comp.type)) continue;
    if (seen.has(comp.id)) continue;
    seen.add(comp.id);

    const label = comp.name || comp.id;
    const valueType = extractValueType(comp.type);
    const compRequired = comp.props?.required === true;

    // 固定 4 个子属性，与 EnvironmentRegistry.registerPageComponents 一致
    const props = [
      { name: 'value', type: valueType, desc: '组件当前值' },
      { name: 'visible', type: 'boolean', desc: '是否可见' },
      { name: 'disabled', type: 'boolean', desc: '是否禁用' },
      { name: 'loading', type: 'boolean', desc: '是否加载中' },
    ];

    for (const prop of props) {
      entries.push({
        key: `$component.${comp.id}.${prop.name}`,
        componentId: comp.id,
        componentType: comp.type,
        componentLabel: label,
        propName: prop.name,
        propType: prop.type,
        propDescription: prop.desc,
        componentRequired: compRequired,
      });
    }
  }

  return entries;
}

/**
 * 构建组件属性树（TreeNodeData）
 *
 * 结构：组件实例 → 属性叶子（无类型分组）
 */
function buildComponentPropTree(entries: ComponentPropEntry[]): TreeNodeData[] {
  // 按组件 ID 分组
  const compMap = new Map<string, ComponentPropEntry[]>();
  for (const entry of entries) {
    if (!compMap.has(entry.componentId)) compMap.set(entry.componentId, []);
    compMap.get(entry.componentId)!.push(entry);
  }

  const tree: TreeNodeData[] = [];
  for (const [compId, compEntries] of compMap) {
    const first = compEntries[0];
    const requiredTag = first.componentRequired ? ' · 必填' : '';
    tree.push({
      key: `comp_${compId}`,
      label: first.componentLabel,
      description: `${getComponentTypeName(first.componentType)}${requiredTag}`,
      children: compEntries.map((entry) => ({
        key: entry.key,
        label: entry.propName,
        description: `${entry.propType} — ${entry.propDescription}`,
      })),
    });
  }

  return tree;
}

/** 从选中的 key 生成字段名 */
function keyToFieldName(key: string): string {
  // "$component.input_01.value" → "input_01_value"
  const parts = key.split('.').slice(1); // 去掉 $component
  return parts.join('_');
}

/** 简化类型显示（string | string[] → string） */
function simplifyType(type: string): TableFieldType {
  if (type === 'boolean') return 'boolean';
  if (type === 'number' || type === 'integer') return 'number';
  if (type === 'object' || type === 'array') return 'json';
  return 'string';
}

// ─── 样式 ──────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  minHeight: 420,
};

const leftPanelStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
};

const rightPanelStyle: React.CSSProperties = {
  flex: 1,
  border: '1px solid #f0f0f0',
  borderRadius: 6,
  padding: 12,
  overflow: 'auto',
  backgroundColor: '#fafafa',
};

const fieldPreviewStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 8px',
  fontSize: 12,
  fontFamily: 'monospace',
  borderBottom: '1px solid #f0f0f0',
};

// ─── 主组件 ────────────────────────────────────────────

interface PageComponentPickerProps {
  appId: string;
  visible: boolean;
  initialPageId?: string;
  existingFieldMappings?: FieldSourceMapping[];
  onConfirm: (result: PageComponentPickResult) => void;
  onCancel: () => void;
}

export function PageComponentPicker({
  appId,
  visible,
  initialPageId,
  existingFieldMappings,
  onConfirm,
  onCancel,
}: PageComponentPickerProps) {
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | undefined>(initialPageId);
  const [componentEntries, setComponentEntries] = useState<ComponentPropEntry[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const mappingsRef = useRef(existingFieldMappings);
  mappingsRef.current = existingFieldMappings;

  // ─── 加载页面列表 ─────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/apps/${appId}`);
        const data = await resp.json();
        if (!cancelled && data.success) {
          setPages((data.resources?.pages || []).map((p: PageInfo) => ({
            id: p.id, name: p.name,
          })));
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [appId, visible]);

  // ─── 加载选中页面的组件属性 ────────────────────────────
  useEffect(() => {
    if (!visible || !selectedPageId) {
      setComponentEntries([]);
      setSelectedKeys(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/apps/${appId}/pages/${selectedPageId}`);
        const data = await resp.json();
        if (!cancelled && data.success && data.resource) {
          const entries = extractComponentProps(data.resource as PageSchema);
          setComponentEntries(entries);

          // 同步模式：默认选中已有映射的属性
          const mappings = mappingsRef.current;
          if (mappings && mappings.length > 0) {
            const mappedKeys = new Set(
              entries
                .filter((e) => mappings.some(
                  (m) => m.componentId === e.componentId
                    && m.componentProp === e.propName,
                ))
                .map((e) => e.key),
            );
            setSelectedKeys(mappedKeys);
          }
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [appId, selectedPageId, visible]);

  // ─── 重置 ─────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      setSelectedPageId(initialPageId);
      setSelectedKeys(new Set());
    }
  }, [visible, initialPageId]);

  // ─── 派生数据 ─────────────────────────────────────────
  const pageOptions = useMemo(
    () => pages.map((p) => ({ label: p.name, value: p.id })),
    [pages],
  );

  const componentTree = useMemo(
    () => buildComponentPropTree(componentEntries),
    [componentEntries],
  );

  // 从选中的 key 反查属性信息，生成预览字段
  const previewFields = useMemo(() => {
    const entryMap = new Map(componentEntries.map((e) => [e.key, e]));
    return Array.from(selectedKeys)
      .map((key) => entryMap.get(key))
      .filter((e): e is ComponentPropEntry => !!e)
      .map((entry) => ({
        key: entry.key,
        fieldName: keyToFieldName(entry.key),
        fieldType: simplifyType(entry.propType),
        componentId: entry.componentId,
        componentType: entry.componentType,
        propName: entry.propName,
        required: entry.componentRequired,
      }));
  }, [selectedKeys, componentEntries]);

  // ─── 确认 ─────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    if (!selectedPageId || previewFields.length === 0) return;

    const mappings: FieldSourceMapping[] = previewFields.map((f) => ({
      componentId: f.componentId,
      componentProp: f.propName,
    }));

    onConfirm({ pageId: selectedPageId, mappings, fields: previewFields });
  }, [selectedPageId, previewFields, onConfirm]);

  // ─── 渲染 ────────────────────────────────────────────
  const isSyncMode = (existingFieldMappings?.length ?? 0) > 0;

  return (
    <Modal
      title={isSyncMode ? '从页面同步组件属性' : '从页面创建数据表'}
      open={visible}
      onOk={handleConfirm}
      onCancel={onCancel}
      okText={isSyncMode ? '同步' : '创建'}
      cancelText="取消"
      okButtonProps={{ disabled: previewFields.length === 0 }}
      width={760}
    >
      <div style={{ marginBottom: 16 }}>
        <span style={{ marginRight: 8, fontSize: 13 }}>选择页面：</span>
        <Select
          placeholder="请选择页面"
          style={{ width: 280 }}
          value={selectedPageId}
          onChange={setSelectedPageId}
          options={pageOptions}
          allowClear
        />
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>}

      {!loading && !selectedPageId && (
        <Empty description="请先选择一个页面" style={{ padding: 40 }} />
      )}

      {!loading && selectedPageId && componentEntries.length === 0 && (
        <Empty description="该页面没有数据录入组件" style={{ padding: 40 }} />
      )}

      {!loading && selectedPageId && componentEntries.length > 0 && (
        <div style={panelStyle}>
          {/* 左侧：组件属性树 */}
          <div style={leftPanelStyle}>
            <SelectableTree
              data={componentTree}
              selectedKeys={selectedKeys}
              onChange={setSelectedKeys}
              searchable
              searchPlaceholder="搜索组件或属性..."
              showSelectAll
              countText={(sel, total) => `已选 ${sel} / ${total} 个属性`}
            />
          </div>

          {/* 右侧：字段预览 */}
          <div style={rightPanelStyle}>
            <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
              <Text strong style={{ fontSize: 13 }}>
                预览字段 ({previewFields.length})
              </Text>
            </div>

            {previewFields.length === 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                请在左侧勾选组件属性
              </Text>
            )}

            {previewFields.map((field) => (
              <div key={field.key} style={fieldPreviewStyle}>
                <span style={{ flex: 1 }}>{field.fieldName}</span>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {field.componentId}.{field.propName}
                </Text>
                <Tag color={
                  field.fieldType === 'string' ? 'blue' :
                  field.fieldType === 'number' ? 'green' :
                  field.fieldType === 'boolean' ? 'orange' :
                  field.fieldType === 'date' ? 'purple' : 'default'
                } style={{ margin: 0, fontSize: 11 }}>
                  {field.fieldType}
                </Tag>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
