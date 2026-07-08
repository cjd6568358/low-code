/**
 * 流程设计器上下文
 *
 * 用于在 WorkflowDesigner 和 NodeConfigComponent 之间传递配置
 */

import { createContext, useContext } from 'react';

/** 流程设计器上下文值 */
export interface WorkflowContextValue {
  /** 租户ID */
  tenantId: string;
  /** 应用ID */
  appId?: string;
}

/** 流程设计器上下文 */
export const WorkflowContext = createContext<WorkflowContextValue>({
  tenantId: '',
});

/** 使用流程设计器上下文 */
export function useWorkflowContext(): WorkflowContextValue {
  return useContext(WorkflowContext);
}
