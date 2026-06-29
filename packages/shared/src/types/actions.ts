/** 动作链 — 事件处理的序列化描述 */
export type ActionChain = ActionStep[];

/** 动作步骤 */
export interface ActionStep {
  action: string;
  params?: Record<string, any>;
  condition?: string;
  /** 是否禁用（跳过执行） */
  disabled?: boolean;
  then?: ActionStep[];
  else?: ActionStep[];
  continueOnError?: boolean;
}

/** 动作执行器接口 */
export interface ActionExecutor {
  execute(
    params: Record<string, any>,
    context: ActionContext,
    nativeEvent?: any,
  ): Promise<any>;
}

/** 表单注册表接口（避免循环依赖） */
export interface FormRegistryLike {
  get(formId: string): { getValues(): Record<string, any>; getInitialValues(): Record<string, any> } | undefined;
  getActiveFormId(): string | undefined;
  getFormData(formId?: string): Record<string, any>;
  /** 设置指定表单的字段值（同步 antd Form store） */
  setFieldValue?(fieldName: string, value: any, formId?: string): void;
  /** 执行表单重置（调用 Form 组件注册的重置处理器） */
  resetForm?(formId: string, values: Record<string, any>): void;
  /** 校验表单（调用 antd Form.validateFields） */
  validateForm?(formId?: string, fields?: string[]): Promise<{ valid: boolean; errors: Record<string, string[]> }>;
  /** 清除表单校验状态（调用 antd Form.setFields） */
  clearValidate?(formId?: string, fields?: string[]): void;
}

/** 动作执行上下文 */
export interface ActionContext {
  renderContext: Record<string, any>;
  event?: any;
  $result?: any;
  /** 表单注册表（通过 formId 获取表单数据） */
  formRegistry?: FormRegistryLike;
  /** 当前活跃表单 ID（由 Form 组件栈维护） */
  activeFormId?: string;
  /** 设置表单字段值（写入回调，由宿主应用提供） */
  setFormValue?: (field: string, value: any) => void;
  /** 设置组件属性值（写入回调，由宿主应用提供） */
  setComponentProp?: (componentId: string, propName: string, value: any) => void;
  navigate?: (url: string, params?: Record<string, string>) => void;
  showMessage?: (type: string, content: string, duration?: number) => void;
  /** 显示全局加载状态 */
  showLoading?: (message?: string) => void;
  /** 隐藏全局加载状态 */
  hideLoading?: () => void;
  /** 打开弹窗（加载页面/卡片资源） */
  showModal?: (resourceType: string, resourceId: string, data?: any) => Promise<any>;
  /** 关闭所有弹窗 */
  closeModal?: () => void;
  /** 关闭当前弹窗并返回结果（弹窗内部调用） */
  resolveModal?: (result?: any) => void;
  apiRequest?: (config: any) => Promise<any>;
  invokeMethod?: (targetId: string, method: string, params?: any) => Promise<any>;
  /** 刷新组件属性（支持指定属性列表） */
  refreshComponent?: (targetId: string, propNames?: string[]) => Promise<any>;
  /** 按依赖顺序刷新多个组件 */
  refreshWithDependencyOrder?: (targetIds: string[]) => Promise<any[]>;
  /** 分析变更影响 */
  analyzeChangeImpact?: (changedPaths: Set<string>) => any;
}
