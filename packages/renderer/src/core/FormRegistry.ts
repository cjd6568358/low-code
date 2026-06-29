/**
 * FormRegistry — 表单实例注册表
 *
 * 管理页面内所有 Form 组件实例的 FormDataContextManager。
 * 支持嵌套表单（栈结构），通过 activeFormId 标识当前活跃表单。
 *
 * 每个 PageRenderer 实例拥有独立的 FormRegistry，不跨页面共享。
 */

import type { FormDataContextManager } from './FormDataContext';
import type { FormInstance } from 'antd';

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
  /** antd 表单实例（用于 setFieldsValue 等 API） */
  private antdForms = new Map<string, FormInstance>();
  /** 表单重置处理器（Form 组件注册，resetForm 动作调用） */
  private resetHandlers = new Map<string, (values: Record<string, any>) => void>();
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
    this.antdForms.delete(formId);
    this.resetHandlers.delete(formId);
    const idx = this.formIdStack.lastIndexOf(formId);
    if (idx !== -1) {
      this.formIdStack.splice(idx, 1);
    }
  }

  /**
   * 注册 antd 表单实例
   *
   * @param formId - 表单组件节点 ID
   * @param formInstance - antd Form.useForm() 返回的实例
   */
  registerAntdForm(formId: string, formInstance: FormInstance): void {
    this.antdForms.set(formId, formInstance);
  }

  /**
   * 注册表单重置处理器
   *
   * Form 组件 mount 时注册，提供直接操作 antd Form 的重置能力。
   * resetForm 动作通过此方法重置表单，确保 antd Form store 和渲染上下文同步更新。
   *
   * @param formId - 表单组件节点 ID
   * @param handler - 重置处理器，接收要重置到的目标值
   */
  registerResetHandler(formId: string, handler: (values: Record<string, any>) => void): void {
    this.resetHandlers.set(formId, handler);
  }

  /**
   * 执行表单重置
   *
   * 调用 Form 组件注册的重置处理器，直接操作 antd Form store。
   * 如果没有注册处理器，回退到 antdForm.setFieldsValue。
   *
   * @param formId - 表单 ID
   * @param values - 要重置到的目标值
   */
  resetForm(formId: string, values: Record<string, any>): void {
    const handler = this.resetHandlers.get(formId);
    if (handler) {
      handler(values);
    } else {
      // 回退：直接更新 antd Form store
      const formInstance = this.antdForms.get(formId);
      if (formInstance) {
        formInstance.setFieldsValue(values);
      }
    }
  }

  /**
   * 设置指定表单的字段值
   *
   * @param fieldName - 字段名（如 "input_01"）
   * @param value - 字段值
   * @param formId - 指定表单 ID，不传则使用活跃表单
   */
  setFieldValue(fieldName: string, value: any, formId?: string): void {
    const targetFormId = formId ?? this.getActiveFormId();
    if (!targetFormId) return;
    const formInstance = this.antdForms.get(targetFormId);
    if (formInstance) {
      formInstance.setFieldsValue({ [fieldName]: value });
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
   * 校验表单
   *
   * 调用 antd Form 的 validateFields 方法，返回校验结果。
   *
   * @param formId - 指定表单 ID，不传则使用活跃表单
   * @param fields - 指定校验的字段列表，不传则校验全部
   * @returns 校验结果，包含 valid 和 errors
   */
  async validateForm(formId?: string, fields?: string[]): Promise<{ valid: boolean; errors: Record<string, string[]> }> {
    const targetFormId = formId ?? this.getActiveFormId();
    if (!targetFormId) return { valid: true, errors: {} };

    const formInstance = this.antdForms.get(targetFormId);
    if (!formInstance) return { valid: true, errors: {} };

    try {
      await formInstance.validateFields(fields as any);
      return { valid: true, errors: {} };
    } catch (errorInfo: any) {
      // antd validateFields reject 时返回 { errorFields: [{ name, errors }] }
      const errors: Record<string, string[]> = {};
      if (errorInfo?.errorFields) {
        for (const field of errorInfo.errorFields) {
          const fieldName = Array.isArray(field.name) ? field.name.join('.') : String(field.name);
          errors[fieldName] = field.errors || [];
        }
      }
      return { valid: false, errors };
    }
  }

  /**
   * 清除表单校验状态
   *
   * 调用 antd Form 的 setFields 方法清除指定字段的校验错误。
   *
   * @param formId - 指定表单 ID，不传则使用活跃表单
   * @param fields - 指定清除的字段列表，不传则清除全部
   */
  clearValidate(formId?: string, fields?: string[]): void {
    const targetFormId = formId ?? this.getActiveFormId();
    if (!targetFormId) return;

    const formInstance = this.antdForms.get(targetFormId);
    if (!formInstance) return;

    if (fields && fields.length > 0) {
      // 清除指定字段的校验状态
      const fieldsData = fields.map((name) => ({ name, errors: [] }));
      formInstance.setFields(fieldsData);
    } else {
      // 清除全部字段的校验状态
      // 使用 setFields 清除所有字段的 errors
      const allValues = formInstance.getFieldsValue();
      const fieldsData = Object.keys(allValues).map((name) => ({ name, errors: [] }));
      formInstance.setFields(fieldsData);
    }
  }

  /**
   * 清空所有注册
   */
  clear(): void {
    this.forms.clear();
    this.antdForms.clear();
    this.resetHandlers.clear();
    this.formIdStack.length = 0;
  }
}
