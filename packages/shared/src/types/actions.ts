/** 动作链 — 事件处理的序列化描述 */
export type ActionChain = ActionStep[];

/** 动作步骤 */
export interface ActionStep {
  action: string;
  params?: Record<string, any>;
  condition?: string;
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

/** 动作执行上下文 */
export interface ActionContext {
  renderContext: Record<string, any>;
  event?: any;
  $result?: any;
  setFormValue?: (field: string, value: any) => void;
  getFormValue?: (field: string) => any;
  navigate?: (url: string, params?: Record<string, string>) => void;
  showMessage?: (type: string, content: string, duration?: number) => void;
  showModal?: (modalId: string, data?: any) => Promise<any>;
  closeModal?: (modalId: string, result?: any) => void;
  apiRequest?: (config: any) => Promise<any>;
  invokeMethod?: (targetId: string, method: string, params?: any) => Promise<any>;
  /** 刷新组件属性（支持指定属性列表） */
  refreshComponent?: (targetId: string, propNames?: string[]) => Promise<any>;
  /** 按依赖顺序刷新多个组件 */
  refreshWithDependencyOrder?: (targetIds: string[]) => Promise<any[]>;
  /** 分析变更影响 */
  analyzeChangeImpact?: (changedPaths: Set<string>) => any;
}
