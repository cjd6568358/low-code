/**
 * ColumnEditor — Table 列编辑器控件
 *
 * 可视化编辑 Table 的 columns 配置：
 * - 添加/删除/排序列
 * - 配置每列的 title、dataIndex、width、fixed、sorter 等
 * - 支持自定义渲染表达式
 */
import React, { useState, useCallback } from 'react';
import { Button, Input, InputNumber, Select, Switch, Space, Card, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import type { ControlProps } from '../core/ControlRegistry';

interface ColumnConfig {
  title?: string;
  dataIndex?: string;
  key?: string;
  width?: number;
  fixed?: 'left' | 'right';
  sorter?: boolean;
  render?: string;
}

const defaultColumn: ColumnConfig = {
  title: '新列',
  dataIndex: '',
  width: 120,
};

export const ColumnEditor: React.FC<ControlProps> = ({
  value = [],
  onChange,
  disabled,
}) => {
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (Array.isArray(value)) return value;
    return [];
  });

  const updateColumns = useCallback((newColumns: ColumnConfig[]) => {
    setColumns(newColumns);
    onChange?.(newColumns);
  }, [onChange]);

  const addColumn = useCallback(() => {
    updateColumns([...columns, { ...defaultColumn, key: `col_${Date.now()}` }]);
  }, [columns, updateColumns]);

  const removeColumn = useCallback((index: number) => {
    updateColumns(columns.filter((_, i) => i !== index));
  }, [columns, updateColumns]);

  const updateColumn = useCallback((index: number, field: keyof ColumnConfig, val: any) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], [field]: val };
    updateColumns(newColumns);
  }, [columns, updateColumns]);

  const moveColumn = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;
    const newColumns = [...columns];
    [newColumns[index], newColumns[newIndex]] = [newColumns[newIndex], newColumns[index]];
    updateColumns(newColumns);
  }, [columns, updateColumns]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {columns.map((col, index) => (
        <Card
          key={col.key || index}
          size="small"
          title={
            <span style={{ fontSize: 12 }}>
              {col.title || `列 ${index + 1}`}
            </span>
          }
          extra={
            <Space size={4}>
              <Button
                type="text"
                size="small"
                icon={<UpOutlined />}
                disabled={disabled || index === 0}
                onClick={() => moveColumn(index, 'up')}
              />
              <Button
                type="text"
                size="small"
                icon={<DownOutlined />}
                disabled={disabled || index === columns.length - 1}
                onClick={() => moveColumn(index, 'down')}
              />
              <Popconfirm
                title="确定删除此列？"
                onConfirm={() => removeColumn(index)}
                disabled={disabled}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={disabled}
                />
              </Popconfirm>
            </Space>
          }
          style={{ backgroundColor: '#fafafa' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* 基础属性 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: '#666' }}>列标题</label>
                <Input
                  size="small"
                  value={col.title}
                  disabled={disabled}
                  placeholder="列标题"
                  onChange={(e) => updateColumn(index, 'title', e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#666' }}>数据字段</label>
                <Input
                  size="small"
                  value={col.dataIndex}
                  disabled={disabled}
                  placeholder="dataIndex"
                  onChange={(e) => updateColumn(index, 'dataIndex', e.target.value)}
                />
              </div>
            </div>

            {/* 宽度和固定 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: '#666' }}>列宽</label>
                <InputNumber
                  size="small"
                  value={col.width}
                  disabled={disabled}
                  placeholder="自动"
                  min={0}
                  style={{ width: '100%' }}
                  onChange={(val) => updateColumn(index, 'width', val)}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#666' }}>固定方向</label>
                <Select
                  size="small"
                  value={col.fixed}
                  disabled={disabled}
                  allowClear
                  placeholder="不固定"
                  style={{ width: '100%' }}
                  options={[
                    { label: '左固定', value: 'left' },
                    { label: '右固定', value: 'right' },
                  ]}
                  onChange={(val) => updateColumn(index, 'fixed', val)}
                />
              </div>
            </div>

            {/* 排序 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Switch
                size="small"
                checked={col.sorter}
                disabled={disabled}
                onChange={(val) => updateColumn(index, 'sorter', val)}
              />
              <span style={{ fontSize: 12 }}>可排序</span>
            </div>
          </div>
        </Card>
      ))}

      <Button
        type="dashed"
        size="small"
        icon={<PlusOutlined />}
        disabled={disabled}
        onClick={addColumn}
        block
      >
        添加列
      </Button>
    </div>
  );
};
