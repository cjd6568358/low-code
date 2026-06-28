/**
 * BPMN 2.0 流向类型定义
 */

import type { FlowElement, ExtensionElements, FormalExpression } from './base';

/** 连线基类 */
export interface EdgeBase extends FlowElement {
  // 连线基类
}

/** 顺序流 */
export interface SequenceFlow extends EdgeBase {
  $type: 'bpmn:SequenceFlow';
  /** 源节点引用 */
  sourceRef: string;
  /** 目标节点引用 */
  targetRef: string;
  /** 条件表达式 */
  conditionExpression?: FormalExpression;
  /** 是否为默认流 */
  isImmediate?: boolean;
  /** 按钮配置扩展（兼容 ExtensionElements） */
  extensionElements?: SequenceFlowExtension;
}

/** 顺序流扩展（继承 ExtensionElements 以兼容 BaseElement.extensionElements） */
export interface SequenceFlowExtension extends ExtensionElements {
  /** 条件规则 */
  conditionRule?: ConditionRule;
  /** 自动触发 */
  autoTrigger?: boolean;
}

/** 条件规则 */
export interface ConditionRule {
  /** 条件类型 */
  type: 'expression' | 'always' | 'default';
  /** 表达式 */
  expression?: string;
  /** 描述 */
  description?: string;
}

/** 消息流 */
export interface MessageFlow extends EdgeBase {
  $type: 'bpmn:MessageFlow';
  /** 源引用 */
  sourceRef: string;
  /** 目标引用 */
  targetRef: string;
  /** 消息引用 */
  messageRef?: string;
}

// DataAssociation 已迁移至 base.ts 作为唯一来源
