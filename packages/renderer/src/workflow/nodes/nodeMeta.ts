/**
 * 流程节点元数据统一配置
 *
 * 定义所有节点类型的 type、名称、展示组件、可添加的子节点类型等。
 * 从这个配置中派生出 registerNodes、NODE_TYPES 等。
 */

import { StartNodeDisplay } from './StartNode';
import { EndNodeDisplay } from './EndNode';
import { ApprovalNodeDisplay } from './ApprovalNode';
import { ConditionNodeDisplay } from './ConditionNode';
import { ParallelNodeDisplay } from './ParallelNode';
import { TimerNodeDisplay } from './TimerNode';
import { NotifyNodeDisplay } from './NotifyNode';
import { ServiceNodeDisplay } from './ServiceNode';
import { CreateNodeDisplay } from './CreateNode';
import { UpdateNodeDisplay } from './UpdateNode';
import { DeleteNodeDisplay } from './DeleteNode';
import { CalculationNodeDisplay } from './CalculationNode';

/** 节点类型定义 */
export interface NodeMeta {
  /** 节点类型标识 */
  type: string;
  /** 节点名称 */
  name: string;
  /** 节点分组（用于菜单分类） */
  group?: string;
  /** 展示组件 */
  displayComponent: React.FC;
  /** 是否为开始节点 */
  isStart?: boolean;
  /** 是否为结束节点 */
  isEnd?: boolean;
  /** 条件节点类型（用于分支节点） */
  conditionNodeType?: string;
  /** 可添加的子节点类型 */
  addableTypes?: string[];
}

/** 所有节点类型的元数据配置 */
export const NODE_META_LIST: NodeMeta[] = [
  // 开始/结束
  {
    type: 'start',
    name: '开始',
    group: 'basic',
    displayComponent: StartNodeDisplay,
    isStart: true,
    addableTypes: [
      'approval',
      'condition', 'parallel',
      'timer',
      'notify', 'service',
      'calculation',
      'create', 'update', 'delete',
      'end',
    ],
  },
  {
    type: 'end',
    name: '结束',
    group: 'basic',
    displayComponent: EndNodeDisplay,
    isEnd: true,
  },
  // 人工任务
  {
    type: 'approval',
    name: '审批',
    group: 'human',
    displayComponent: ApprovalNodeDisplay,
    addableTypes: [
      'approval',
      'condition', 'parallel',
      'timer',
      'notify', 'service',
      'calculation',
      'create', 'update', 'delete',
      'end',
    ],
  },
  // 控制流
  {
    type: 'condition',
    name: '条件',
    group: 'control',
    displayComponent: ConditionNodeDisplay,
    addableTypes: [
      'approval',
      'condition', 'parallel',
      'timer',
      'notify', 'service',
      'calculation',
      'create', 'update', 'delete',
      'end',
    ],
  },
  {
    type: 'parallel',
    name: '并行',
    group: 'control',
    displayComponent: ParallelNodeDisplay,
    conditionNodeType: 'condition',
    addableTypes: [
      'approval',
      'condition', 'parallel',
      'timer',
      'notify', 'service',
      'calculation',
      'create', 'update', 'delete',
      'end',
    ],
  },
  // 时间
  {
    type: 'timer',
    name: '延时',
    group: 'control',
    displayComponent: TimerNodeDisplay,
    addableTypes: [
      'approval',
      'condition', 'parallel',
      'timer',
      'notify', 'service',
      'calculation',
      'create', 'update', 'delete',
      'end',
    ],
  },
  // 计算
  {
    type: 'calculation',
    name: '计算',
    group: 'control',
    displayComponent: CalculationNodeDisplay,
    addableTypes: [
      'approval',
      'condition', 'parallel',
      'timer',
      'notify', 'service',
      'calculation',
      'create', 'update', 'delete',
      'end',
    ],
  },
  // 通知/自动化
  {
    type: 'notify',
    name: '通知',
    group: 'automation',
    displayComponent: NotifyNodeDisplay,
    addableTypes: [
      'approval',
      'condition', 'parallel',
      'timer',
      'notify', 'service',
      'calculation',
      'create', 'update', 'delete',
      'end',
    ],
  },
  {
    type: 'service',
    name: '自动化',
    group: 'automation',
    displayComponent: ServiceNodeDisplay,
    addableTypes: [
      'approval',
      'condition', 'parallel',
      'timer',
      'notify', 'service',
      'calculation',
      'create', 'update', 'delete',
      'end',
    ],
  },
  // 数据操作
  {
    type: 'create',
    name: '创建记录',
    group: 'data',
    displayComponent: CreateNodeDisplay,
    addableTypes: [
      'approval',
      'condition', 'parallel',
      'timer',
      'notify', 'service',
      'calculation',
      'create', 'update', 'delete',
      'end',
    ],
  },
  {
    type: 'update',
    name: '更新记录',
    group: 'data',
    displayComponent: UpdateNodeDisplay,
    addableTypes: [
      'approval',
      'condition', 'parallel',
      'timer',
      'notify', 'service',
      'calculation',
      'create', 'update', 'delete',
      'end',
    ],
  },
  {
    type: 'delete',
    name: '删除记录',
    group: 'data',
    displayComponent: DeleteNodeDisplay,
    addableTypes: [
      'approval',
      'condition', 'parallel',
      'timer',
      'notify', 'service',
      'calculation',
      'create', 'update', 'delete',
      'end',
    ],
  },
];

/** 节点类型常量（从元数据派生） */
export const NODE_TYPES = Object.fromEntries(
  NODE_META_LIST.map(meta => [meta.type.toUpperCase(), meta.type])
) as Record<string, string>;

/** 节点类型 Map，方便查找 */
export const NODE_META_MAP = new Map<string, NodeMeta>(
  NODE_META_LIST.map(meta => [meta.type, meta])
);

/** 节点分组定义 */
export const NODE_GROUPS = [
  { key: 'basic', label: '基础' },
  { key: 'human', label: '人工任务' },
  { key: 'control', label: '控制流' },
  { key: 'automation', label: '自动化' },
  { key: 'data', label: '数据操作' },
];
