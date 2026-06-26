import React, { useEffect, useState } from 'react';
import { Input, InputNumber, Select, Switch, DatePicker, Checkbox, Radio, TimePicker } from 'antd';
import { ColumnEditor } from './column-editor';
import type { ControlProps } from '../core/ControlRegistry';

const { TextArea } = Input;

/**
 * 从 Schema 中提取选项列表
 *
 * 优先级：oneOf（带 title）> enum + optionLabels > enum
 */
function extractOptions(schema: ControlProps['schema']): Array<{ label: string; value: unknown }> {
  // 优先读 oneOf（@enumLabels 生成）
  if (schema.oneOf) {
    return schema.oneOf.map((item: { const: unknown; title?: string }) => ({
      label: item.title || String(item.const),
      value: item.const,
    }));
  }
  // fallback: enum + optionLabels
  if (schema.enum) {
    return schema.enum.map((v: unknown, i: number) => ({
      label: schema['x-component-props']?.optionLabels?.[i] || String(v),
      value: v,
    }));
  }
  return [];
}

/**
 * 基于 antd 的自动渲染控件
 *
 * 设计原则：
 * 1. 所有基础控件统一使用 antd 组件
 * 2. 定制组件也基于 antd 基础组件搭建
 * 3. 透传 antd 原生属性（size/variant/status 等）
 * 4. 统一值处理（value/onChange 签名）
 */

/** 文本输入控件 */
export const AntdAutoInput: React.FC<ControlProps> = ({
  value, onChange, schema, disabled, placeholder, errors,
}) => (
  <Input
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    placeholder={placeholder || schema['x-placeholder'] || ''}
    status={errors?.length ? 'error' : undefined}
    size="small"
  />
);

/** 文本域控件 */
export const AntdAutoTextarea: React.FC<ControlProps> = ({
  value, onChange, schema, disabled, placeholder, errors,
}) => (
  <TextArea
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    placeholder={placeholder || schema['x-placeholder'] || ''}
    rows={schema['x-component-props']?.rows || 3}
    status={errors?.length ? 'error' : undefined}
    size="small"
  />
);

/** 数字输入控件 */
export const AntdAutoNumber: React.FC<ControlProps> = ({
  value, onChange, schema, disabled, placeholder, errors,
}) => (
  <InputNumber
    value={value}
    onChange={onChange}
    disabled={disabled}
    placeholder={placeholder || ''}
    min={schema.minimum}
    max={schema.maximum}
    status={errors?.length ? 'error' : undefined}
    size="small"
    style={{ width: '100%' }}
  />
);

/** 布尔开关控件 */
export const AntdAutoSwitch: React.FC<ControlProps> = ({
  value, onChange, disabled,
}) => (
  <Switch
    checked={!!value}
    onChange={onChange}
    disabled={disabled}
    size="small"
  />
);

/** 选择器控件 */
export const AntdAutoSelect: React.FC<ControlProps> = ({
  value, onChange, schema, disabled, placeholder, errors, dictionaryService,
}) => {
  const [options, setOptions] = useState<Array<{ label: string; value: unknown }>>(
    extractOptions(schema),
  );

  // 字典加载
  useEffect(() => {
    const dictCode = schema['x-dictionary'];
    if (dictCode && dictionaryService) {
      dictionaryService.getDictValues(dictCode).then((items: any[]) => {
        setOptions(items.map((item) => ({ label: item.label, value: item.value })));
      });
    }
  }, [schema, dictionaryService]);

  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      placeholder={placeholder || '请选择'}
      status={errors?.length ? 'error' : undefined}
      size="small"
      style={{ width: '100%' }}
      allowClear
      showSearch
      optionFilterProp="label"
    />
  );
};

/** 日期选择控件 */
export const AntdAutoDatePicker: React.FC<ControlProps> = ({
  value, onChange, schema, disabled, placeholder, errors,
}) => (
  <DatePicker
    value={value}
    onChange={onChange}
    disabled={disabled}
    placeholder={placeholder || '请选择日期'}
    format={schema['x-component-props']?.format || 'YYYY-MM-DD'}
    status={errors?.length ? 'error' : undefined}
    size="small"
    style={{ width: '100%' }}
  />
);

/** 时间选择控件 */
export const AntdAutoTimePicker: React.FC<ControlProps> = ({
  value, onChange, disabled, placeholder, errors,
}) => (
  <TimePicker
    value={value}
    onChange={onChange}
    disabled={disabled}
    placeholder={placeholder || '请选择时间'}
    status={errors?.length ? 'error' : undefined}
    size="small"
    style={{ width: '100%' }}
  />
);

/** 多选控件 */
export const AntdAutoCheckbox: React.FC<ControlProps> = ({
  value, onChange, schema, disabled,
}) => {
  const options = extractOptions(schema);

  return (
    <Checkbox.Group
      value={Array.isArray(value) ? value : []}
      onChange={onChange}
      disabled={disabled}
      options={options}
    />
  );
};

/** 单选控件 */
export const AntdAutoRadio: React.FC<ControlProps> = ({
  value, onChange, schema, disabled,
}) => {
  const options = extractOptions(schema);

  return (
    <Radio.Group
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      options={options}
      size="small"
    />
  );
};

/**
 * 注册所有 antd 内建控件到 ControlRegistry
 */
export function registerAntdControls(
  registry: {
    register: (type: string, format: string | null, component: React.ComponentType<ControlProps>) => void;
    registerControl: (name: string, component: React.ComponentType<ControlProps>) => void;
  },
): void {
  // 基础类型映射
  registry.register('string', null, AntdAutoInput);
  registry.register('string', 'textarea', AntdAutoTextarea);
  registry.register('string', 'date', AntdAutoDatePicker);
  registry.register('string', 'date-time', AntdAutoDatePicker);
  registry.register('string', 'time', AntdAutoTimePicker);
  registry.register('number', null, AntdAutoNumber);
  registry.register('integer', null, AntdAutoNumber);
  registry.register('boolean', null, AntdAutoSwitch);
  registry.register('object', null, AntdAutoInput);
  registry.register('array', null, AntdAutoInput);
  registry.register('enum', null, AntdAutoSelect);

  // 命名控件（通过 x-component 引用）
  registry.registerControl('Input', AntdAutoInput);
  registry.registerControl('Textarea', AntdAutoTextarea);
  registry.registerControl('InputNumber', AntdAutoNumber);
  registry.registerControl('Select', AntdAutoSelect);
  registry.registerControl('Switch', AntdAutoSwitch);
  registry.registerControl('DatePicker', AntdAutoDatePicker);
  registry.registerControl('TimePicker', AntdAutoTimePicker);
  registry.registerControl('Checkbox', AntdAutoCheckbox);
  registry.registerControl('Radio', AntdAutoRadio);
  registry.registerControl('ColumnEditor', ColumnEditor);
}
