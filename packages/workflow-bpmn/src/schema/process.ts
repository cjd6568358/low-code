/**
 * BPMN 2.0 流程定义
 */

import type {
  BaseElement,
  FlowElementsContainer,
  CallableElement,
  LaneSet,
  Artifact,
  FlowElement,
  Property,
  ResourceRole,
  ResourceParameterBinding,
  FormalExpression,
} from './base';
import type { MessageFlow } from './flows';
import type { Error, Escalation, Signal, Message } from './events-def';

/** 流程定义 */
export interface Process extends FlowElementsContainer, CallableElement {
  $type: 'bpmn:Process';
  /** 流程类型 */
  processType?: 'None' | 'Public' | 'Private';
  /** 是否封闭 */
  isClosed?: boolean;
  /** 是否可执行 */
  isExecutable?: boolean;
  /** 审计 */
  auditing?: Auditing;
  /** 监控 */
  monitoring?: Monitoring;
  /** 属性 */
  properties?: Property[];
  /** 资源 */
  resources?: ResourceRole[];
  /** 关联订阅 */
  correlationSubscriptions?: CorrelationSubscription[];
  /** 支持的流程 */
  supports?: Process[];
  /** 协作引用 */
  definitionalCollaborationRef?: string;
  /** 工件 */
  artifacts?: Artifact[];
}

/** 协作定义 */
export interface Collaboration extends BaseElement {
  $type: 'bpmn:Collaboration';
  /** 协作名称 */
  name?: string;
  /** 参与者 */
  participants: Participant[];
  /** 消息流 */
  messageFlows?: MessageFlow[];
  /** 关联 */
  conversations?: ConversationNode[];
  /** 会话关联 */
  conversationAssociations?: ConversationAssociation[];
  /** 消息流关联 */
  messageFlowAssociations?: MessageFlowAssociation[];
  /** 关联组 */
  correlationKeys?: CorrelationKey[];
  /** 工件 */
  artifacts?: Artifact[];
}

/** 参与者 */
export interface Participant extends BaseElement {
  $type: 'bpmn:Participant';
  /** 参与者名称 */
  name?: string;
  /** 流程引用 */
  processRef?: string;
  /** 接口引用 */
  interfaceRefs?: string[];
  /** 端点引用 */
  endpointRefs?: string[];
  /** 参与者多重性 */
  participantMultiplicity?: ParticipantMultiplicity;
}

/** 参与者多重性 */
export interface ParticipantMultiplicity extends BaseElement {
  /** 最小值 */
  minimum: number;
  /** 最大值 */
  maximum: number;
}

/** 会话节点 */
export interface ConversationNode extends BaseElement {
  /** 会话节点名称 */
  name?: string;
  /** 参与者引用 */
  participantRefs?: string[];
  /** 消息流引用 */
  messageFlowRefs?: string[];
  /** 关联键引用 */
  correlationKeyRefs?: string[];
}

/** 会话关联 */
export interface ConversationAssociation extends BaseElement {
  /** 内部会话引用 */
  innerConversationNodeRef: string;
  /** 外部会话引用 */
  outerConversationNodeRef: string;
}

/** 消息流关联 */
export interface MessageFlowAssociation extends BaseElement {
  /** 内部消息流引用 */
  innerMessageFlowRef: string;
  /** 外部消息流引用 */
  outerMessageFlowRef: string;
}

/** 关联键 */
export interface CorrelationKey extends BaseElement {
  /** 关联键名称 */
  name?: string;
  /** 关联属性 */
  correlationPropertyRef?: CorrelationProperty[];
}

/** 关联属性 */
export interface CorrelationProperty extends BaseElement {
  /** 属性名称 */
  name?: string;
  /** 类型 */
  type?: string;
  /** 关联属性检索 */
  correlationPropertyRetrievalExpression?: CorrelationPropertyRetrievalExpression[];
}

/** 关联属性检索 */
export interface CorrelationPropertyRetrievalExpression extends BaseElement {
  /** 消息路径 */
  messagePath?: FormalExpression;
  /** 消息引用 */
  messageRef?: string;
}

/** 关联订阅 */
export interface CorrelationSubscription extends BaseElement {
  /** 关联键引用 */
  correlationKeyRef: string;
  /** 关联属性绑定 */
  correlationPropertyBinding?: CorrelationPropertyBinding[];
}

/** 关联属性绑定 */
export interface CorrelationPropertyBinding extends BaseElement {
  /** 数据路径 */
  dataPath?: FormalExpression;
  /** 关联属性引用 */
  correlationPropertyRef: string;
}

/** 审计 */
export interface Auditing extends BaseElement {
  // 审计配置
}

/** 监控 */
export interface Monitoring extends BaseElement {
  // 监控配置
}

/** 资源 */
export interface Resource extends BaseElement {
  /** 资源名称 */
  name?: string;
  /** 资源参数 */
  resourceParameters?: ResourceParameter[];
}

/** 资源参数 */
export interface ResourceParameter extends BaseElement {
  /** 参数名称 */
  name?: string;
  /** 是否必须 */
  isRequired?: boolean;
  /** 类型 */
  type?: string;
  /** 类型引用 */
  itemSubjectRef?: string;
}

/** 顶级定义 */
export interface Definitions extends BaseElement {
  $type: 'bpmn:Definitions';
  /** 名称 */
  name?: string;
  /** 目标命名空间 */
  targetNamespace?: string;
  /** 表达式语言 */
  expressionLanguage?: string;
  /** 类型语言 */
  typeLanguage?: string;
  /** 导入 */
  imports?: Import[];
  /** 扩展 */
  extensions?: Extension[];
  /** 根元素 */
  rootElements: RootElement[];
  /** 图表元素 */
  diagrams?: Diagram[];
}

/** 根元素 */
export type RootElement = Process | Collaboration | Resource | Signal | Error | Escalation | Message | Interface | EndPoint | ItemDefinition;

/** 导入 */
export interface Import extends BaseElement {
  /** 导入类型 */
  importType?: string;
  /** 位置 */
  location?: string;
  /** 命名空间 */
  namespace?: string;
}

/** 扩展 */
export interface Extension extends BaseElement {
  /** 扩展定义引用 */
  definition?: string;
  /** 是否必须 */
  mustUnderstand?: boolean;
}

/** 接口 */
export interface Interface extends BaseElement {
  /** 接口名称 */
  name?: string;
  /** 实现引用 */
  implementationRef?: string;
  /** 操作 */
  operations?: Operation[];
}

/** 操作 */
export interface Operation extends BaseElement {
  /** 操作名称 */
  name?: string;
  /** 输入消息引用 */
  inMessageRef?: Message;
  /** 输出消息引用 */
  outMessageRef?: Message;
  /** 错误引用 */
  errorRef?: Error[];
  /** 实现引用 */
  implementationRef?: string;
}

/** 端点 */
export interface EndPoint extends BaseElement {
  // 端点基类
}

/** 项定义 */
export interface ItemDefinition extends BaseElement {
  /** 结构引用 */
  structureRef?: string;
  /** 是否集合 */
  isCollection?: boolean;
  /** 导入 */
  import?: Import;
}

/** 图表 */
export interface Diagram extends BaseElement {
  /** 图表名称 */
  name?: string;
  /** 文档引用 */
  documentation?: string;
  /** 平面 */
  plane: Plane;
}

/** 平面 */
export interface Plane extends BaseElement {
  /** 平面元素 */
  planeElement?: PlaneElement[];
  /** 根元素引用 */
  bpmnElement?: string;
}

/** 平面元素 */
export interface PlaneElement extends BaseElement {
  // 平面元素基类
}
