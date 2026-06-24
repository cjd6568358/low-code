/**
 * FormRegistry — 表单实例注册表
 *
 * 管理页面内所有 Form 组件实例的 FormDataContextManager。
 * 支持嵌套表单（栈结构），通过 activeFormId 标识当前活跃表单。
 *
 * 每个 PageRenderer 实例拥有独立的 FormRegistry，不跨页面共享。
 */

import type { FormDataContextManager } from './FormDataContext';

/** 注册的表单实例信息 */
export interface FormRegistryEntry {
  /** 表单 ID（组件节点 ID） */
  formId: string;
  /** 表单数据管理器 */
  manager: FormDataContextManager;
}

/**
 * 表单注册表
 *
 * Form 组件 mount 时 register，unmount 时 unregister。
 * 栈结构支持嵌套表单：进入子表单时 push，退出时 pop。
 */
export class FormRegistry {
  /** 已注册的表单实例 */
  private forms = new Map<string, FormDataContextManager>();
  /** 表单 ID 栈（支持嵌套，栈顶为活跃表单） */
  private formIdStack: string[] = [];

  /**
   * 注册表单实例
   *
   * @param formId - 表单组件节点 ID
   * @param manager - 表单数据管理器
   */
  register(formId: string, manager: FormDataContextManager): void {
    this.forms.set(formId, manager);
    this.formIdStack.push(formId);
  }

  /**
   * 注销表单实例
   *
   * @param formId - 表单组件节点 ID
   */
  unregister(formId: string): void {
    this.forms.delete(formId);
    const idx = this.formIdStack.lastIndexOf(formId);
    if (idx !== -1) {
      this.formIdStack.splice(idx, 1);
    }
  }

  /**
   * 获取指定表单的数据管理器
   */
  get(formId: string): FormDataContextManager | undefined {
    return this.forms.get(formId);
  }

  /**
   * 获取当前活跃表单 ID（栈顶）
   */
  getActiveFormId(): string | undefined {
    return this.formIdStack.length > 0
      ? this.formIdStack[this.formIdStack.length - 1]
      : undefined;
  }

  /**
   * 获取当前活跃表单的数据管理器
   */
  getActiveForm(): FormDataContextManager | undefined {
    const id = this.getActiveFormId();
    return id ? this.forms.get(id) : undefined;
  }

  /**
   * 获取表单数据（扁平值对象）
   *
   * @param formId - 指定表单 ID，不传则使用活跃表单
   * @returns 表单字段值，无表单时返回空对象
   */
  getFormData(formId?: string): Record<string, any> {
    const manager = formId
      ? this.forms.get(formId)
      : this.getActiveForm();
    return manager?.getValues() ?? {};
  }

  /**
   * 获取所有已注册表单的数据
   */
  getAllForms(): Record<string, FormDataContextManager> {
    return Object.fromEntries(this.forms);
  }

  /**
   * 是否有已注册的表单
   */
  hasForms(): boolean {
    return this.forms.size > 0;
  }

  /**
   * 清空所有注册
   */
  clear(): void {
    this.forms.clear();
    this.formIdStack.length = 0;
  }
}
