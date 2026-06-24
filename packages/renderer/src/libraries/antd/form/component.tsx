/**
 * 表单 组件 — withPlatform 包装
 *
 * 提供设计态能力（拖拽、选中、overlay 定位）
 * 和运行时平台能力（field/events/linkage）。
 *
 * 表单组件作为容器，通过 FormContext 向子组件注入表单能力。
 */
import React from 'react';
import { Form } from 'antd';
import { withPlatform } from '../../../components/platform';
import { FormContext } from '../../../components/platform/FormContext';

/**
 * 归一化 Col 配置
 *
 * 支持两种格式：
 * - 栅格模式：数字或数字字符串 → `{ span: N }`（如 `8` / `"8"` → `{ span: 8 }`）
 * - 像素模式：以 "px" 结尾的字符串 → `{ style: { minWidth: 'Npx' } }`（如 `"80px"`）
 *
 * 像素模式用于 inline 布局下固定 label 最小宽度，
 * 避免小尺寸组件（如 ColorPicker）撑不开容器导致 label 被挤压。
 *
 * @param val 原始值（来自组件 props）
 * @returns antd Col props 对象
 */
function normalizeColProp(val: unknown): Record<string, any> | undefined {
  if (val == null) return undefined;

  // 像素模式："80px" → minWidth
  if (typeof val === 'string' && val.endsWith('px')) {
    return { style: { minWidth: val } };
  }

  // 栅格模式：数字或数字字符串 → span
  if (typeof val === 'number' || typeof val === 'string') {
    return { span: Number(val) };
  }

  // 已是对象，原样返回
  if (typeof val === 'object') return val as Record<string, any>;

  return undefined;
}

/**
 * 判断 Col 配置是否为像素模式（以 "px" 结尾）
 *
 * 用于 withPlatform 在 inline 布局下给 labelCol 注入 minWidth。
 */
function isPxMode(val: unknown): boolean {
  return typeof val === 'string' && val.endsWith('px');
}

/** 表单内部组件（包装 FormContext.Provider） */
function FormWithProvider(props: React.PropsWithChildren<any>) {
  const {
    children,
    layout,
    labelCol,
    wrapperCol,
    labelAlign,
    colon,
    requiredMark,
    disabled,
    size,
    ...rest
  } = props;

  const normalizedLabelCol = normalizeColProp(labelCol);
  const normalizedWrapperCol = normalizeColProp(wrapperCol);

  /**
   * FormContext 存储归一化后的 Col 配置 + 原始像素标记。
   * withPlatform 读取 labelColPx 标记，在 inline 布局下给 Form.Item 的
   * labelCol 注入 minWidth，确保 label 不被小尺寸内容组件（如 ColorPicker）挤压。
   */
  const contextValue = {
    layout,
    labelCol: normalizedLabelCol,
    wrapperCol: normalizedWrapperCol,
    labelColPx: isPxMode(labelCol),
    labelAlign,
    colon,
    requiredMark,
    disabled,
    size,
  };

  return (
    <FormContext.Provider value={contextValue}>
      <Form
        layout={layout}
        labelCol={normalizedLabelCol}
        wrapperCol={normalizedWrapperCol}
        labelAlign={labelAlign}
        colon={colon}
        requiredMark={requiredMark}
        disabled={disabled}
        size={size}
        {...rest}
      >
        {children}
      </Form>
    </FormContext.Provider>
  );
}

/** 表单 平台组件（设计态 + 运行时） */
export const PlatformForm = withPlatform(FormWithProvider);
