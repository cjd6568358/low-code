/**
 * BPMN 2.0 基础类型定义
 * 基于 OMG BPMN 2.0 规范
 *
 * 本文件是所有基础 BPMN 类型的唯一来源（single source of truth）。
 * 其他 schema 文件应从本文件导入这些类型，不要重新声明。
 */

/** BPMN 元素基础类型 */
export interface BaseElement {
  /** 元素 ID（全局唯一） */
  id: string;
  /** BPMN 类型标识 */
  $type: string;
  /** 文档说明 */
  documentation?: string;
  /** 自定义扩展元素 */
  extensionElements?: ExtensionElements;
}

/** 扩展元素容器 */
export interface ExtensionElements {
  /** 自定义属性 */
  values?: Record<string, unknown>[];
}

/** 流程元素基类 */
export interface FlowElement extends BaseElement {
  /** 元素名称 */
  name?: string;
}

/** 流程节点基类 */
export interface FlowNodeBase extends FlowElement {
  /** 入口连线 */
  incoming?: string[];
  /** 出口连线 */
  outgoing?: string[];
}

/** 可调用元素基类 */
export interface CallableElement extends BaseElement {
  /** 元素名称 */
  name?: string;
  /** 输入 */
  supportedInterfaceRefs?: string[];
  /** IO 规范 */
  ioSpecification?: IoSpecification;
  /** 输入集 */
  inputSets?: InputSet[];
  /** 输出集 */
  outputSets?: OutputSet[];
}

/** IO 规范 */
export interface IoSpecification {
  /** 输入集 */
  dataInputs?: DataInput[];
  /** 输出集 */
  dataOutputs?: DataOutput[];
  /** 输入集引用 */
  inputSets: InputSet[];
  /** 输出集引用 */
  outputSets: OutputSet[];
}

/** 数据输入 */
export interface DataInput extends BaseElement {
  /** 名称 */
  name?: string;
  /** 是否集合 */
  isCollection?: boolean;
  /** 类型 */
  itemSubjectRef?: string;
}

/** 数据输出 */
export interface DataOutput extends BaseElement {
  /** 名称 */
  name?: string;
  /** 是否集合 */
  isCollection?: boolean;
  /** 类型 */
  itemSubjectRef?: string;
}

/** 输入集 */
export interface InputSet extends BaseElement {
  /** 数据输入引用 */
  dataInputRefs?: string[];
  /** 可选输入引用 */
  optionalInputRefs?: string[];
  /** 执行时输入引用 */
  whileExecutingInputRefs?: string[];
  /** 输出集引用 */
  outputSetRefs?: string[];
}

/** 输出集 */
export interface OutputSet extends BaseElement {
  /** 数据输出引用 */
  dataOutputRefs?: string[];
  /** 可选输出引用 */
  optionalOutputRefs?: string[];
  /** 执行时输出引用 */
  whileExecutingOutputRefs?: string[];
  /** 输入集引用 */
  inputSetRefs?: string[];
}

/** 资源角色 */
export interface ResourceRole extends BaseElement {
  /** 资源引用 */
  resourceRef?: string;
  /** 资源参数 */
  resourceParameterBindings?: ResourceParameterBinding[];
  /** 名称 */
  name?: string;
}

/** 资源参数绑定 */
export interface ResourceParameterBinding extends BaseElement {
  /** 参数引用 */
  parameterRef: string;
  /** 表达式 */
  expression: FormalExpression;
}

/** 流元素容器 */
export interface FlowElementsContainer extends BaseElement {
  /** 流元素列表 */
  flowElements: FlowElement[];
  /** 泳道集合 */
  laneSets?: LaneSet[];
}

/** 泳道集合 */
export interface LaneSet extends BaseElement {
  /** 名称 */
  name?: string;
  /** 泳道列表 */
  lanes: Lane[];
}

/** 泳道 */
export interface Lane extends BaseElement {
  /** 名称 */
  name?: string;
  /** 流节点引用 */
  flowNodeRef?: string[];
  /** 分区元素引用 */
  partitionElementRef?: string;
  /** 子泳道集合 */
  childLaneSet?: LaneSet;
}

/** 关系 */
export interface Relationship extends BaseElement {
  /** 关系类型 */
  type?: string;
  /** 方向 */
  direction?: 'Forward' | 'Backward' | 'Both' | 'None';
  /** 源引用 */
  source?: string[];
  /** 目标引用 */
  target?: string[];
}

/** 工件基类 */
export interface Artifact extends BaseElement {
  // 工件基类，无额外属性
}

/** 文本注释 */
export interface TextAnnotation extends Artifact {
  /** 文本内容 */
  text?: string;
  /** 文本格式 */
  textFormat?: string;
}

/** 关联 */
export interface Association extends Artifact {
  /** 关联方向 */
  associationDirection?: 'None' | 'One' | 'Both';
  /** 源引用 */
  sourceRef: string;
  /** 目标引用 */
  targetRef: string;
}

/** 组 */
export interface Group extends Artifact {
  /** 组名 */
  categoryValueRef?: string;
}

// ============================================================
// 以下类型从其他 schema 文件迁移而来，作为唯一来源
// ============================================================

/** 正式表达式 */
export interface FormalExpression extends BaseElement {
  $type: 'bpmn:FormalExpression';
  /** 表达式体 */
  body?: string;
  /** 语言 */
  language?: string;
  /** 求值上下文 */
  evaluatesToTypeRef?: string;
}

/** 属性 */
export interface Property extends BaseElement {
  /** 属性名称 */
  name?: string;
  /** 属性值 */
  value?: string;
  /** 类型引用 */
  itemSubjectRef?: string;
}

/** 数据关联基类 */
export interface DataAssociation extends BaseElement {
  /** 源引用 */
  sourceRef?: string[];
  /** 目标引用 */
  targetRef: string;
  /** 转换 */
  transformation?: FormalExpression;
  /** 赋值 */
  assignment?: Assignment[];
}

/** 数据输入关联 */
export interface DataInputAssociation extends DataAssociation {
  // 继承 DataAssociation，无额外属性
}

/** 数据输出关联 */
export interface DataOutputAssociation extends DataAssociation {
  /** 源引用（必填） */
  sourceRef: string[];
}

/** 赋值 */
export interface Assignment extends BaseElement {
  /** 来源表达式 */
  from: FormalExpression;
  /** 目标表达式 */
  to: FormalExpression;
}
