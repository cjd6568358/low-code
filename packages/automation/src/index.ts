/**
 * @low-code/automation
 *
 * 自动化引擎 — 基于 ECA (Event-Condition-Action) 模型的规则引擎。
 * 支持 5 种触发器类型、15 种条件运算符、5 种动作类型。
 */

// ==================== 引擎主类 ====================
export {
  AutomationEngine,
  AutomationError,
} from './engine/AutomationEngine';
export type { AutomationErrorCode } from './engine/AutomationEngine';

// ==================== 核心组件 ====================
export { TriggerMatcher } from './engine/TriggerMatcher';
export { ConditionEvaluator } from './engine/ConditionEvaluator';
export { Throttler } from './engine/Throttler';
export type { ThrottleResult } from './engine/Throttler';
export { EffectiveTimeChecker } from './engine/EffectiveTimeChecker';
export type { EffectiveTimeResult } from './engine/EffectiveTimeChecker';
export { ExecutionLogger } from './logger/ExecutionLogger';
export { VariableResolver } from './variable/VariableResolver';
export type { VariableContext } from './variable/VariableResolver';

// ==================== 动作执行器 ====================
export { ActionExecutorBase } from './executors/ActionExecutorBase';
export type { ActionExecuteResult } from './executors/ActionExecutorBase';
export { TriggerWorkflowExecutor } from './executors/TriggerWorkflowExecutor';
export { SendNotificationExecutor } from './executors/SendNotificationExecutor';
export { DataOperationExecutor } from './executors/DataOperationExecutor';
export { ApiCallExecutor } from './executors/ApiCallExecutor';
export { WebhookExecutor } from './executors/WebhookExecutor';

// ==================== 类型定义 ====================

// 触发器类型
export type {
  TriggerType,
  DataChangeOperation,
  FormEventType,
  WorkflowEventType,
  DataChangeTriggerConfig,
  ScheduleTriggerConfig,
  FormEventTriggerConfig,
  WorkflowEventTriggerConfig,
  CustomEventTriggerConfig,
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
  HttpMethod,
  AuthType,
  ActionExecutionStatus,
  RecipientType,
  NotificationRecipient,
  RetryPolicy,
  TriggerWorkflowConfig,
  SendNotificationConfig,
  DataOperationConfig,
  ApiAuthConfig,
  ApiCallConfig,
  WebhookConfig,
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

// 引擎配置和接口类型
export type {
  DatabaseAdapter,
  EventBus,
  WorkflowService,
  NotifyService,
  DataService,
  HttpClient,
  WebhookService,
  RuleStore,
  LogStore,
  AutomationEngineConfig,
} from './types/engine';
