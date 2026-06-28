/**
 * BPMN 2.0 网关类型定义
 */

import type { FlowNodeBase, FormalExpression } from './base';

/** 网关基类 */
export interface Gateway extends FlowNodeBase {
  /** 网关方向 */
  gatewayDirection?: 'Unspecified' | 'Converging' | 'Diverging' | 'Mixed';
}

/** 排他网关（XOR） */
export interface ExclusiveGateway extends Gateway {
  $type: 'bpmn:ExclusiveGateway';
  /** 默认出口 */
  default?: string;
}

/** 并行网关（AND） */
export interface ParallelGateway extends Gateway {
  $type: 'bpmn:ParallelGateway';
}

/** 包含网关（OR） */
export interface InclusiveGateway extends Gateway {
  $type: 'bpmn:InclusiveGateway';
  /** 默认出口 */
  default?: string;
}

/** 事件网关 */
export interface EventBasedGateway extends Gateway {
  $type: 'bpmn:EventBasedGateway';
  /** 是否实例化 */
  instantiate?: boolean;
  /** 事件网关类型 */
  eventGatewayType?: 'Exclusive' | 'Parallel';
}

/** 复杂网关 */
export interface ComplexGateway extends Gateway {
  $type: 'bpmn:ComplexGateway';
  /** 激活条件 */
  activationCondition?: FormalExpression;
  /** 默认出口 */
  default?: string;
}
