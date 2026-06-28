/**
 * BPMN 2.0 任务类型定义
 */

import type {
  FlowNodeBase,
  BaseElement,
  ResourceRole,
  IoSpecification,
  FlowElement,
  LaneSet,
  DataInput,
  DataOutput,
  DataInputAssociation,
  DataOutputAssociation,
  FormalExpression,
  Property,
} from './base';
import type { MessageEventDefinition } from './events-def';

/** 活动基类 */
export interface Activity extends FlowNodeBase {
  /** 是否为补偿活动 */
  isForCompensation?: boolean;
  /** 默认 */
  default?: string;
  /** 多实例循环特性 */
  loopCharacteristics?: LoopCharacteristics;
  /** 资源 */
  resources?: ResourceRole[];
  /** IO 规范 */
  ioSpecification?: IoSpecification;
  /** 数据输入关联 */
  dataInputAssociations?: DataInputAssociation[];
  /** 数据输出关联 */
  dataOutputAssociations?: DataOutputAssociation[];
  /** 属性 */
  properties?: Property[];
  /** 边界事件 */
  boundaryEventRefs?: string[];
}

/** 任务基类 */
export interface Task extends Activity {
  // 任务基类，继承 Activity
}

/** 用户任务（审批节点） */
export interface UserTask extends Task {
  $type: 'bpmn:UserTask';
  /** 审批人 */
  assignee?: string;
  /** 候选用户 */
  candidateUsers?: string[];
  /** 候选组 */
  candidateGroups?: string[];
  /** 实现 */
  implementation?: string;
  /** 渲染 */
  renderings?: Rendering[];
  /** 表单引用 */
  formKey?: string;
  /** 优先级 */
  priority?: string;
  /** 截止日期 */
  dueDate?: string;
  /** 跟踪日期 */
  followUpDate?: string;
}

/** 服务任务 */
export interface ServiceTask extends Task {
  $type: 'bpmn:ServiceTask';
  /** 实现类型 */
  implementation?: string;
  /** 操作引用 */
  operationRef?: string;
  /** 消息事件定义（用于消息任务） */
  messageEventDefinitions?: MessageEventDefinition[];
}

/** 脚本任务 */
export interface ScriptTask extends Task {
  $type: 'bpmn:ScriptTask';
  /** 脚本格式 */
  scriptFormat?: string;
  /** 脚本内容 */
  script?: string;
  /** 结果变量 */
  resultVariable?: string;
}

/** 手动任务 */
export interface ManualTask extends Task {
  $type: 'bpmn:ManualTask';
}

/** 发送任务 */
export interface SendTask extends Task {
  $type: 'bpmn:SendTask';
  /** 实现 */
  implementation?: string;
  /** 操作引用 */
  operationRef?: string;
  /** 消息引用 */
  messageRef?: string;
}

/** 接收任务 */
export interface ReceiveTask extends Task {
  $type: 'bpmn:ReceiveTask';
  /** 实现 */
  implementation?: string;
  /** 操作引用 */
  operationRef?: string;
  /** 消息引用 */
  messageRef?: string;
  /** 是否实例化 */
  instantiate?: boolean;
}

/** 业务规则任务 */
export interface BusinessRuleTask extends Task {
  $type: 'bpmn:BusinessRuleTask';
  /** 实现 */
  implementation?: string;
}

/** 调用活动（子流程引用） */
export interface CallActivity extends Activity {
  $type: 'bpmn:CallActivity';
  /** 调用的元素引用 */
  calledElement?: string;
}

/** 子流程基类（SubProcess 和 AdHocSubProcess 共享） */
export interface SubProcessBase extends Activity {
  /** 流程元素 */
  flowElements: FlowElement[];
  /** 泳道集合 */
  laneSets?: LaneSet[];
  /** 是否触发 */
  triggeredByEvent?: boolean;
}

/** 子流程 */
export interface SubProcess extends SubProcessBase {
  $type: 'bpmn:SubProcess';
}

/** 临时子流程 */
export interface AdHocSubProcess extends SubProcessBase {
  $type: 'bpmn:AdHocSubProcess';
  /** 完成条件 */
  completionCondition?: FormalExpression;
  /** 是否有序 */
  ordering?: 'Sequential' | 'Parallel';
  /** 取消剩余实例 */
  cancelRemainingInstances?: boolean;
}

/** 循环特性基类 */
export interface LoopCharacteristics extends BaseElement {
  /** 循环特性类型 */
  $type: string;
}

/** 标准循环 */
export interface StandardLoopCharacteristics extends LoopCharacteristics {
  $type: 'bpmn:StandardLoopCharacteristics';
  /** 测试条件 */
  testBefore?: boolean;
  /** 循环条件 */
  loopCondition?: FormalExpression;
  /** 最大循环次数 */
  loopMaximum?: number;
}

/** 多实例循环 */
export interface MultiInstanceLoopCharacteristics extends LoopCharacteristics {
  $type: 'bpmn:MultiInstanceLoopCharacteristics';
  /** 是否并行 */
  isSequential?: boolean;
  /** 循环基数 */
  loopCardinality?: FormalExpression;
  /** 循环数据输入 */
  loopDataInputRef?: string;
  /** 循环数据输出 */
  loopDataOutputRef?: string;
  /** 输入数据项 */
  inputDataItem?: DataInput;
  /** 输出数据项 */
  outputDataItem?: DataOutput;
  /** 完成条件 */
  completionCondition?: FormalExpression;
  /** 实例数量 */
  instance?: number;
  /** 一个行为 */
  oneBehavior?: 'None' | 'One' | 'All';
  /** 复杂行为 */
  complexBehavior?: ComplexBehaviorDefinition;
}

/** 复杂行为定义 */
export interface ComplexBehaviorDefinition extends BaseElement {
  /** 条件 */
  condition: FormalExpression;
  /** 事件 */
  event?: string;
}

/** 渲染 */
export interface Rendering extends BaseElement {
  // 渲染基类
}
