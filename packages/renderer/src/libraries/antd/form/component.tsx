/**
 * 表单 组件 — withPlatform 包装
 *
 * 提供设计态能力（拖拽、选中、overlay 定位）
 * 和运行时平台能力（field/events/linkage）。
 *
 * 表单组件作为容器，通过 FormContext 向子组件注入表单能力。
 */
import React, { useEffect, useRef } from 'react';
import { Form } from 'antd';
import { withPlatform } from '../../../components/platform';
import { FormContext } from '../../../components/platform/FormContext';
import type { FormRegistry } from '../../../core/FormRegistry';
import { FormDataContextManager } from '../../../core/FormDataContext';
import { expressionEngine } from '@low-code/computation';
import { LinkageEngine } from '../../../core/LinkageEngine';

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
    _formRegistry,
    _formId,
    ...rest
  } = props;

  // 获取 antd 表单实例（用于 setFieldsValue 等 API）
  const [formInstance] = Form.useForm();

  // 注册到 FormRegistry（支持 resetForm/validate 等动作）
  const managerRef = useRef<FormDataContextManager | null>(null);
  const initialValuesCaptured = useRef(false);
  useEffect(() => {
    if (!_formRegistry || !_formId) return;
    const registry = _formRegistry as FormRegistry;
    const linkageEngine = new LinkageEngine(expressionEngine);
    const manager = new FormDataContextManager(expressionEngine, linkageEngine);
    manager.init({ formId: _formId });
    managerRef.current = manager;
    initialValuesCaptured.current = false;
    registry.register(_formId, manager);
    registry.registerAntdForm(_formId, formInstance);
    // 注册重置处理器：直接操作 antd Form store，确保 UI 同步更新
    registry.registerResetHandler(_formId, (values: Record<string, any>) => {
      formInstance.setFieldsValue(values);
    });
    return () => {
      registry.unregister(_formId);
      managerRef.current = null;
    };
  }, [_formRegistry, _formId, formInstance]);

  // 监听表单值变化，同步到 FormDataContextManager
  // 首次收到非空值时，将其捕获为初始值（用于 resetForm 恢复）
  const handleValuesChange = (_changedValues: any, allValues: any) => {
    if (managerRef.current) {
      // 首次捕获：将子组件挂载后的表单值作为初始值
      if (!initialValuesCaptured.current && Object.keys(allValues).length > 0) {
        initialValuesCaptured.current = true;
        managerRef.current.init({ formId: _formId, schemaDefaults: allValues });
      }
      managerRef.current.setValues(allValues);
    }
    (rest as any).onValuesChange?.(_changedValues, allValues);
  };

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
        form={formInstance}
        layout={layout}
        labelCol={normalizedLabelCol}
        wrapperCol={normalizedWrapperCol}
        labelAlign={labelAlign}
        colon={colon}
        requiredMark={requiredMark}
        disabled={disabled}
        size={size}
        onValuesChange={handleValuesChange}
        {...rest}
      >
        {children}
      </Form>
    </FormContext.Provider>
  );
}

/** 表单 平台组件（设计态 + 运行时） */
export const PlatformForm = withPlatform(FormWithProvider);
