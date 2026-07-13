/**
 * @low-code/automation
 *
 * 自动化引擎类型定义和可复用工具组件。
 * 基于 ECA (Event-Condition-Action) 模型。
 */

// ==================== 工具组件 ====================
export { TriggerMatcher } from './engine/TriggerMatcher';
export { ConditionEvaluator } from './engine/ConditionEvaluator';
export { Throttler } from './engine/Throttler';
export type { ThrottleResult } from './engine/Throttler';
export { EffectiveTimeChecker } from './engine/EffectiveTimeChecker';
export type { EffectiveTimeResult } from './engine/EffectiveTimeChecker';
export { ExecutionLogger } from './logger/ExecutionLogger';
export { VariableResolver } from './variable/VariableResolver';
export type { VariableContext } from './variable/VariableResolver';

// ==================== 类型定义 ====================

// 触发器类型
export type {
  TriggerType,
  DataChangeOperation,
  DataChangeTriggerConfig,
  ScheduleTriggerConfig,
  AutomationTrigger,
  PlatformEvent,
} from './types/trigger';

// 条件类型
export type {
  ConditionOperator,
  ConditionValueType,
  ConditionLogic,
  ConditionRule,
  AutomationCondition,
  ConditionEvaluationResult,
  ConditionRuleResult,
} from './types/condition';

// 动作类型
export type {
  ActionType,
  NotificationChannel,
  NotificationPriority,
  DataOperationType,
  ActionExecutionStatus,
  RecipientType,
  NotificationRecipient,
  RetryPolicy,
  TriggerWorkflowConfig,
  SendNotificationConfig,
  DataOperationConfig,
  ExecuteExpressionConfig,
  AutomationAction,
  ActionResult,
} from './types/action';

// 规则类型
export type {
  AutomationRuleStatus,
  TimeRange,
  ThrottleConfig,
  EffectiveTimeConfig,
  AutomationRule,
} from './types/rule';

// 执行日志类型
export type {
  ExecutionLogStatus,
  ExecutionEventInfo,
  AutomationExecutionLog,
  ExecutionContext,
} from './types/execution';
