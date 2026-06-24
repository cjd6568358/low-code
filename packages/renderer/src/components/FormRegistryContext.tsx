/**
 * FormRegistryContext — 向组件树注入 FormRegistry 和当前活跃 formId
 *
 * Renderer 渲染 Form 组件子树时 push 当前 formId，
 * 渲染完毕后 pop，形成栈结构支持嵌套表单。
 */

import { createContext, useContext } from 'react';
import type { FormRegistry } from '../core/FormRegistry';

/** 表单注册表上下文值 */
export interface FormRegistryContextValue {
  /** 表单注册表实例 */
  registry: FormRegistry;
  /** 当前渲染路径中的活跃 formId（由 Renderer 维护的栈顶） */
  activeFormId?: string;
}

/** 表单注册表上下文 */
export const FormRegistryContext = createContext<FormRegistryContextValue | null>(null);

/**
 * 获取 FormRegistry 和当前活跃 formId
 *
 * @returns 上下文值，不在 PageRenderer 内时返回 null
 */
export function useFormRegistryContext(): FormRegistryContextValue | null {
  return useContext(FormRegistryContext);
}
