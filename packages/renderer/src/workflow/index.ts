/**
 * 流程模块导出
 */

// 设计器
export { WorkflowDesigner } from './designer/WorkflowDesigner';
export type { WorkflowDesignerProps } from './designer/WorkflowDesigner';

// 节点组件
export {
  StartNodeDisplay,
  EndNodeDisplay,
  ApprovalNodeDisplay,
  ConditionNodeDisplay,
  ParallelNodeDisplay,
  TimerNodeDisplay,
  NotifyNodeDisplay,
  ServiceNodeDisplay,
} from './nodes';

// 配置组件
export { NodeConfigDrawer } from './config/NodeConfigDrawer';
export type { NodeConfigDrawerProps } from './config/NodeConfigDrawer';

// 运行时组件
export { ApprovalForm } from './runtime/ApprovalForm';
export type { ApprovalFormProps } from './runtime/ApprovalForm';
export { TaskList } from './runtime/TaskList';
export type { TaskListProps } from './runtime/TaskList';
export { FlowChart } from './runtime/FlowChart';
export type { FlowChartProps } from './runtime/FlowChart';

// Hooks
export { useBpmnConverter } from './hooks/useBpmnConverter';

// API 客户端
export * from './api/workflowApi';
