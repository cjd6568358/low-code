/**
 * BPMN 2.0 Schema 校验器
 */

import type { BpmnDocument, ProcessDefinition } from '../types/bpmn';
import type { FlowNode, Edge } from '../types/nodes';
import type { ValidationResult, ValidationError, ValidationWarning } from '../types/conditions';

/** 校验选项 */
export interface ValidateOptions {
  /** 是否校验连线引用 */
  validateReferences?: boolean;
  /** 是否校验循环 */
  validateCycles?: boolean;
  /** 是否校验孤立节点 */
  validateOrphans?: boolean;
  /** 最大嵌套深度 */
  maxNestingDepth?: number;
}

const DEFAULT_OPTIONS: ValidateOptions = {
  validateReferences: true,
  validateCycles: true,
  validateOrphans: true,
  maxNestingDepth: 10,
};

/**
 * 校验 BPMN 文档
 */
export function validateBpmnDocument(
  doc: BpmnDocument,
  options: ValidateOptions = {}
): ValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 校验基本结构
  if (!doc.id) {
    errors.push({
      path: 'document.id',
      message: '文档 ID 不能为空',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!doc.processes || doc.processes.length === 0) {
    errors.push({
      path: 'document.processes',
      message: '至少需要一个流程定义',
      code: 'MIN_LENGTH',
    });
  }

  // 校验每个流程
  doc.processes?.forEach((process, index) => {
    const processResult = validateProcessDefinition(process, opts);
    errors.push(...processResult.errors.map(e => ({
      ...e,
      path: `document.processes[${index}].${e.path}`,
    })));
    warnings.push(...processResult.warnings.map(w => ({
      ...w,
      path: `document.processes[${index}].${w.path}`,
    })));
  });

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * 校验流程定义
 */
export function validateProcessDefinition(
  process: ProcessDefinition,
  options: ValidateOptions = {}
): ValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 校验基本字段
  if (!process.id) {
    errors.push({
      path: 'process.id',
      message: '流程 ID 不能为空',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!process.nodes || process.nodes.length === 0) {
    errors.push({
      path: 'process.nodes',
      message: '至少需要一个节点',
      code: 'MIN_LENGTH',
    });
  }

  // 校验节点
  const nodeIds = new Set<string>();
  process.nodes?.forEach((node, index) => {
    const nodeResult = validateNode(node, `nodes[${index}]`);
    errors.push(...nodeResult.errors);
    warnings.push(...nodeResult.warnings);

    // 检查 ID 唯一性
    if (node.id) {
      if (nodeIds.has(node.id)) {
        errors.push({
          path: `nodes[${index}].id`,
          message: `节点 ID "${node.id}" 重复`,
          code: 'DUPLICATE_ID',
        });
      }
      nodeIds.add(node.id);
    }
  });

  // 校验连线
  const edgeIds = new Set<string>();
  process.edges?.forEach((edge, index) => {
    const edgeResult = validateEdge(edge, nodeIds, `edges[${index}]`);
    errors.push(...edgeResult.errors);
    warnings.push(...edgeResult.warnings);

    // 检查 ID 唯一性
    if (edge.id) {
      if (edgeIds.has(edge.id)) {
        errors.push({
          path: `edges[${index}].id`,
          message: `连线 ID "${edge.id}" 重复`,
          code: 'DUPLICATE_ID',
        });
      }
      edgeIds.add(edge.id);
    }
  });

  // 校验引用完整性
  if (opts.validateReferences) {
    const refResult = validateReferences(process, nodeIds, edgeIds);
    errors.push(...refResult.errors);
    warnings.push(...refResult.warnings);
  }

  // 校验孤立节点
  if (opts.validateOrphans) {
    const orphanResult = validateOrphanNodes(process);
    warnings.push(...orphanResult.warnings);
  }

  // 校验开始/结束事件
  const startEvents = process.nodes?.filter(n => n.$type === 'bpmn:StartEvent') || [];
  const endEvents = process.nodes?.filter(n => n.$type === 'bpmn:EndEvent') || [];

  if (startEvents.length === 0) {
    errors.push({
      path: 'process.nodes',
      message: '流程必须有至少一个开始事件',
      code: 'MISSING_START_EVENT',
    });
  }

  if (endEvents.length === 0) {
    warnings.push({
      path: 'process.nodes',
      message: '流程没有结束事件，建议添加',
      code: 'MISSING_END_EVENT',
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * 校验节点
 */
function validateNode(node: FlowNode, path: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!node.id) {
    errors.push({
      path: `${path}.id`,
      message: '节点 ID 不能为空',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!node.$type) {
    errors.push({
      path: `${path}.$type`,
      message: '节点类型不能为空',
      code: 'REQUIRED_FIELD',
    });
  }

  // 校验用户任务特有字段
  if (node.$type === 'bpmn:UserTask') {
    const userTask = node as any;
    if (!userTask.assignee && !userTask.candidateUsers?.length && !userTask.candidateGroups?.length) {
      warnings.push({
        path: `${path}`,
        message: '审批节点没有配置审批人',
        code: 'MISSING_ASSIGNEE',
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * 校验连线
 */
function validateEdge(edge: Edge, nodeIds: Set<string>, path: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!edge.id) {
    errors.push({
      path: `${path}.id`,
      message: '连线 ID 不能为空',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!edge.$type) {
    errors.push({
      path: `${path}.$type`,
      message: '连线类型不能为空',
      code: 'REQUIRED_FIELD',
    });
  }

  // 校验顺序流
  if (edge.$type === 'bpmn:SequenceFlow') {
    const seqFlow = edge as any;
    if (!seqFlow.sourceRef) {
      errors.push({
        path: `${path}.sourceRef`,
        message: '顺序流必须有源节点',
        code: 'REQUIRED_FIELD',
      });
    } else if (!nodeIds.has(seqFlow.sourceRef)) {
      errors.push({
        path: `${path}.sourceRef`,
        message: `源节点 "${seqFlow.sourceRef}" 不存在`,
        code: 'INVALID_REFERENCE',
      });
    }

    if (!seqFlow.targetRef) {
      errors.push({
        path: `${path}.targetRef`,
        message: '顺序流必须有目标节点',
        code: 'REQUIRED_FIELD',
      });
    } else if (!nodeIds.has(seqFlow.targetRef)) {
      errors.push({
        path: `${path}.targetRef`,
        message: `目标节点 "${seqFlow.targetRef}" 不存在`,
        code: 'INVALID_REFERENCE',
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * 校验引用完整性
 */
function validateReferences(
  process: ProcessDefinition,
  nodeIds: Set<string>,
  edgeIds: Set<string>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 检查节点的 incoming/outgoing 引用
  process.nodes?.forEach((node, index) => {
    const nodeEdgeIds = new Set(process.edges?.map(e => e.id) || []);

    node.incoming?.forEach(refId => {
      if (!nodeEdgeIds.has(refId)) {
        errors.push({
          path: `nodes[${index}].incoming`,
          message: `入线引用 "${refId}" 不存在`,
          code: 'INVALID_REFERENCE',
        });
      }
    });

    node.outgoing?.forEach(refId => {
      if (!nodeEdgeIds.has(refId)) {
        errors.push({
          path: `nodes[${index}].outgoing`,
          message: `出线引用 "${refId}" 不存在`,
          code: 'INVALID_REFERENCE',
        });
      }
    });
  });

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * 校验孤立节点
 */
function validateOrphanNodes(process: ProcessDefinition): ValidationResult {
  const warnings: ValidationWarning[] = [];

  const connectedNodes = new Set<string>();

  // 收集所有被连线引用的节点
  process.edges?.forEach(edge => {
    if (edge.$type === 'bpmn:SequenceFlow') {
      const seqFlow = edge as any;
      connectedNodes.add(seqFlow.sourceRef);
      connectedNodes.add(seqFlow.targetRef);
    }
  });

  // 检查孤立节点（开始事件和结束事件除外）
  process.nodes?.forEach((node, index) => {
    if (node.$type !== 'bpmn:StartEvent' && node.$type !== 'bpmn:EndEvent') {
      if (!connectedNodes.has(node.id)) {
        warnings.push({
          path: `nodes[${index}]`,
          message: `节点 "${node.name || node.id}" 是孤立节点`,
          code: 'ORPHAN_NODE',
        });
      }
    }
  });

  return { valid: true, errors: [], warnings };
}

/**
 * 校验循环引用
 */
export function validateCycles(process: ProcessDefinition): string[][] {
  const cycles: string[][] = [];
  const adjacencyList = buildAdjacencyList(process);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string, path: string[]): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recursionStack.has(neighbor)) {
        // 找到循环
        const cycleStart = path.indexOf(neighbor);
        cycles.push(path.slice(cycleStart));
      }
    }

    recursionStack.delete(nodeId);
  }

  for (const nodeId of adjacencyList.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId, []);
    }
  }

  return cycles;
}

/**
 * 构建邻接表
 */
function buildAdjacencyList(process: ProcessDefinition): Map<string, string[]> {
  const adjacencyList = new Map<string, string[]>();

  // 初始化所有节点
  process.nodes?.forEach(node => {
    adjacencyList.set(node.id, []);
  });

  // 添加边
  process.edges?.forEach(edge => {
    if (edge.$type === 'bpmn:SequenceFlow') {
      const seqFlow = edge as any;
      const neighbors = adjacencyList.get(seqFlow.sourceRef) || [];
      neighbors.push(seqFlow.targetRef);
      adjacencyList.set(seqFlow.sourceRef, neighbors);
    }
  });

  return adjacencyList;
}

/**
 * 校验节点嵌套深度
 */
export function validateNestingDepth(process: ProcessDefinition, maxDepth: number = 10): number {
  let maxFoundDepth = 0;

  function traverse(nodeId: string, depth: number): void {
    maxFoundDepth = Math.max(maxFoundDepth, depth);

    if (depth >= maxDepth) {
      return;
    }

    // 查找子流程节点
    const node = process.nodes?.find(n => n.id === nodeId);
    if (node?.$type === 'bpmn:SubProcess') {
      const subProcess = node as any;
      subProcess.flowElements?.forEach((child: any) => {
        traverse(child.id, depth + 1);
      });
    }
  }

  // 从开始事件开始遍历
  process.nodes?.forEach(node => {
    if (node.$type === 'bpmn:StartEvent') {
      traverse(node.id, 0);
    }
  });

  return maxFoundDepth;
}
