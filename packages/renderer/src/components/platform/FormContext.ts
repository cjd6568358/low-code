/**
 * 表单上下文
 *
 * Form 组件通过此 Context 向子组件注入表单能力。
 * 录入型组件在 Form 内时自动获得表单字段配置能力。
 */
import { createContext, useContext } from 'react';

/** 表单上下文值 */
export interface FormContextValue {
  /** 表单布局 */
  layout?: 'horizontal' | 'vertical' | 'inline';
  /** 标签列宽（归一化后的 Col props） */
  labelCol?: Record<string, any>;
  /** 内容列宽（归一化后的 Col props） */
  wrapperCol?: Record<string, any>;
  /**
   * labelCol 是否为像素模式（原始值以 "px" 结尾）
   *
   * 像素模式下 labelCol 归一化为 `{ style: { minWidth: 'Npx' } }`，
   * withPlatform 在 inline 布局中读取此标记，给 Form.Item 的 labelCol 注入 minWidth。
   */
  labelColPx?: boolean;
  /** 标签对齐 */
  labelAlign?: 'left' | 'right';
  /** 是否显示冒号 */
  colon?: boolean;
  /** 必填标记 */
  requiredMark?: boolean | 'optional';
  /** 表单禁用 */
  disabled?: boolean;
  /** 尺寸 */
  size?: 'small' | 'middle' | 'large';
}

/** 表单上下文 */
export const FormContext = createContext<FormContextValue | null>(null);

/**
 * 获取表单上下文
 * @returns 表单上下文值，不在 Form 内时返回 null
 */
export function useFormContext(): FormContextValue | null {
  return useContext(FormContext);
}

/**
 * 判断是否在 Form 容器内
 */
export function isInFormContext(): boolean {
  // 注意：这个函数不能直接调用 useContext，需要在组件内使用 useFormContext
  // 这里只是一个类型标记，实际判断在 withPlatform 中通过 useFormContext 实现
  return false;
}
