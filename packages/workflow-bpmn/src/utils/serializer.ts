/**
 * BPMN 2.0 JSON 序列化器
 */

import type { BpmnDocument, ProcessDefinition } from '../types/bpmn';
import type { FlowNode, Edge } from '../types/nodes';

/**
 * 将 BpmnDocument 序列化为 JSON 字符串
 */
export function serializeBpmnDocument(doc: BpmnDocument): string {
  return JSON.stringify(doc, null, 2);
}

/**
 * 将 JSON 字符串反序列化为 BpmnDocument
 */
export function deserializeBpmnDocument(json: string): BpmnDocument {
  const parsed = JSON.parse(json);
  return normalizeBpmnDocument(parsed);
}

/**
 * 规范化 BpmnDocument（兼容不同格式）
 */
export function normalizeBpmnDocument(data: any): BpmnDocument {
  // 如果是标准 BPMN 2.0 格式（包含 rootElements）
  if (data.rootElements) {
    return normalizeStandardBpmn(data);
  }

  // 如果已经是简化格式
  if (data.processes) {
    return normalizeSimplifiedBpmn(data);
  }

  throw new Error('无法识别的 BPMN 文档格式');
}

/**
 * 规范化标准 BPMN 2.0 格式
 */
function normalizeStandardBpmn(data: any): BpmnDocument {
  const doc: BpmnDocument = {
    id: data.id || generateId(),
    name: data.name,
    targetNamespace: data.targetNamespace,
    processes: [],
    collaborations: [],
  };

  // 提取流程定义
  for (const element of data.rootElements) {
    if (element.$type === 'bpmn:Process') {
      doc.processes.push(normalizeProcess(element));
    } else if (element.$type === 'bpmn:Collaboration') {
      doc.collaborations?.push(normalizeCollaboration(element));
    }
  }

  return doc;
}

/**
 * 规范化简化格式
 */
function normalizeSimplifiedBpmn(data: any): BpmnDocument {
  return {
    id: data.id || generateId(),
    name: data.name,
    targetNamespace: data.targetNamespace,
    processes: (data.processes || []).map(normalizeProcess),
    collaborations: data.collaborations?.map(normalizeCollaboration) || [],
  };
}

/**
 * 规范化流程定义
 */
function normalizeProcess(data: any): ProcessDefinition {
  return {
    id: data.id || generateId(),
    name: data.name,
    isExecutable: data.isExecutable ?? true,
    processType: data.processType || 'None',
    nodes: (data.nodes || data.flowElements || []).map(normalizeNode),
    edges: (data.edges || []).map(normalizeEdge),
    lanes: data.lanes || data.laneSets?.[0]?.lanes || [],
  };
}

/**
 * 规范化节点
 */
function normalizeNode(data: any): FlowNode {
  const node: any = {
    id: data.id || generateId(),
    $type: data.$type || data.type,
    name: data.name,
    incoming: data.incoming || [],
    outgoing: data.outgoing || [],
  };

  // 复制特有属性
  const skipFields = new Set(['id', '$type', 'type', 'name', 'incoming', 'outgoing']);
  for (const key of Object.keys(data)) {
    if (!skipFields.has(key)) {
      node[key] = data[key];
    }
  }

  return node as FlowNode;
}

/**
 * 规范化连线
 */
function normalizeEdge(data: any): Edge {
  const edge: any = {
    id: data.id || generateId(),
    $type: data.$type || data.type || 'bpmn:SequenceFlow',
    name: data.name,
    sourceRef: data.sourceRef,
    targetRef: data.targetRef,
  };

  // 条件表达式
  if (data.conditionExpression) {
    if (typeof data.conditionExpression === 'string') {
      edge.conditionExpression = {
        $type: 'bpmn:FormalExpression',
        body: data.conditionExpression,
      };
    } else {
      edge.conditionExpression = data.conditionExpression;
    }
  }

  return edge as Edge;
}

/**
 * 规范化协作定义
 */
function normalizeCollaboration(data: any): any {
  return {
    id: data.id || generateId(),
    name: data.name,
    participants: (data.participants || []).map((p: any) => ({
      id: p.id || generateId(),
      name: p.name,
      processRef: p.processRef,
    })),
    messageFlows: data.messageFlows || [],
  };
}

/**
 * 将 BpmnDocument 转换为标准 BPMN 2.0 格式
 */
export function toStandardBpmn(doc: BpmnDocument): any {
  const rootElements: any[] = [];

  // 转换流程定义
  for (const process of doc.processes) {
    rootElements.push({
      $type: 'bpmn:Process',
      id: process.id,
      name: process.name,
      isExecutable: process.isExecutable,
      processType: process.processType,
      flowElements: [
        ...process.nodes.map(nodeToStandard),
        ...process.edges.map(edgeToStandard),
      ],
      laneSets: process.lanes?.length ? [{
        $type: 'bpmn:LaneSet',
        id: generateId(),
        lanes: process.lanes,
      }] : undefined,
    });
  }

  // 转换协作定义
  if (doc.collaborations?.length) {
    for (const collab of doc.collaborations) {
      rootElements.push({
        $type: 'bpmn:Collaboration',
        id: collab.id,
        name: collab.name,
        participants: collab.participants.map(p => ({
          $type: 'bpmn:Participant',
          id: p.id,
          name: p.name,
          processRef: p.processRef,
        })),
        messageFlows: collab.messageFlows,
      });
    }
  }

  return {
    $type: 'bpmn:Definitions',
    id: doc.id,
    name: doc.name,
    targetNamespace: doc.targetNamespace || 'http://www.omg.org/spec/BPMN/20100524/MODEL',
    expressionLanguage: 'http://www.w3.org/1999/XPath',
    typeLanguage: 'http://www.w3.org/2001/XMLSchema',
    rootElements,
  };
}

/**
 * 节点转标准格式
 */
function nodeToStandard(node: FlowNode): any {
  const result: any = {
    $type: node.$type,
    id: node.id,
    name: node.name,
  };

  // 复制特有属性
  const skipFields = new Set(['$type', 'id', 'name']);
  const nodeRecord = node as unknown as Record<string, unknown>;
  for (const key of Object.keys(node)) {
    if (!skipFields.has(key) && nodeRecord[key] !== undefined) {
      result[key] = nodeRecord[key];
    }
  }

  return result;
}

/**
 * 连线转标准格式
 */
function edgeToStandard(edge: Edge): any {
  const result: any = {
    $type: edge.$type,
    id: edge.id,
    name: edge.name,
    sourceRef: (edge as any).sourceRef,
    targetRef: (edge as any).targetRef,
  };

  // 条件表达式
  if ((edge as any).conditionExpression) {
    result.conditionExpression = (edge as any).conditionExpression;
  }

  return result;
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 创建空的 BpmnDocument
 */
export function createEmptyBpmnDocument(name?: string): BpmnDocument {
  const startId = generateId();
  const endId = generateId();
  const flowId = generateId();

  return {
    id: generateId(),
    name: name || '新建流程',
    processes: [{
      id: generateId(),
      name: name || '新建流程',
      isExecutable: true,
      nodes: [
        {
          id: startId,
          $type: 'bpmn:StartEvent',
          name: '开始',
          outgoing: [flowId],
        },
        {
          id: endId,
          $type: 'bpmn:EndEvent',
          name: '结束',
          incoming: [flowId],
        },
      ],
      edges: [{
        id: flowId,
        $type: 'bpmn:SequenceFlow',
        sourceRef: startId,
        targetRef: endId,
      }],
    }],
  };
}

/**
 * 克隆 BpmnDocument（深拷贝）
 */
export function cloneBpmnDocument(doc: BpmnDocument): BpmnDocument {
  return JSON.parse(JSON.stringify(doc));
}

/**
 * 合并两个 BpmnDocument
 */
export function mergeBpmnDocuments(doc1: BpmnDocument, doc2: BpmnDocument): BpmnDocument {
  return {
    id: doc1.id,
    name: doc1.name || doc2.name,
    targetNamespace: doc1.targetNamespace || doc2.targetNamespace,
    processes: [...doc1.processes, ...doc2.processes],
    collaborations: [
      ...(doc1.collaborations || []),
      ...(doc2.collaborations || []),
    ],
  };
}
