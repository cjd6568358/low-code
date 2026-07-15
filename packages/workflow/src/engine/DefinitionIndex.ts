/**
 * 流程定义索引
 * 将 ProcessDefinition 的 nodes/edges 构建为 Map 索引，提供 O(1) 查找
 * 替代代码中散落的 Array.find/filter 线性扫描
 */

import type { FlowNode, Edge, ProcessDefinition } from '../schema';

/**
 * 流程定义索引
 * 构建一次，多次复用，将 O(n) 查找优化为 O(1)
 */
export class DefinitionIndex {
  /** 节点 ID → 节点 */
  private readonly nodeMap: Map<string, FlowNode>;
  /** 连线 ID → 连线 */
  private readonly edgeMap: Map<string, Edge>;
  /** 节点 ID → 该节点的出口连线列表 */
  private readonly outgoingMap: Map<string, Edge[]>;
  /** 节点 ID → 该节点的入口连线列表 */
  private readonly incomingMap: Map<string, Edge[]>;

  constructor(definition: ProcessDefinition) {
    this.nodeMap = new Map(definition.nodes.map(n => [n.id, n]));
    this.edgeMap = new Map(definition.edges.map(e => [e.id, e]));

    this.outgoingMap = new Map();
    this.incomingMap = new Map();

    for (const edge of definition.edges) {
      const sourceId = (edge as { sourceRef?: string }).sourceRef;
      const targetId = (edge as { targetRef?: string }).targetRef;

      if (sourceId) {
        const outList = this.outgoingMap.get(sourceId);
        if (outList) {
          outList.push(edge);
        } else {
          this.outgoingMap.set(sourceId, [edge]);
        }
      }

      if (targetId) {
        const inList = this.incomingMap.get(targetId);
        if (inList) {
          inList.push(edge);
        } else {
          this.incomingMap.set(targetId, [edge]);
        }
      }
    }
  }

  /** O(1) 节点查找 */
  getNode(id: string): FlowNode | undefined {
    return this.nodeMap.get(id);
  }

  /** O(1) 连线查找 */
  getEdge(id: string): Edge | undefined {
    return this.edgeMap.get(id);
  }

  /** O(1) 获取节点的出口连线 */
  getOutgoing(nodeId: string): Edge[] {
    return this.outgoingMap.get(nodeId) ?? [];
  }

  /** O(1) 获取节点的入口连线 */
  getIncoming(nodeId: string): Edge[] {
    return this.incomingMap.get(nodeId) ?? [];
  }

  /** 根据节点 outgoing ID 列表获取出口连线（兼容 FlowNode.outgoing 字段） */
  getOutgoingByNode(node: FlowNode): Edge[] {
    if (node.outgoing && node.outgoing.length > 0) {
      return node.outgoing
        .map(id => this.edgeMap.get(id))
        .filter((e): e is Edge => e !== undefined);
    }
    return this.outgoingMap.get(node.id) ?? [];
  }

  /** 根据节点 incoming ID 列表获取入口连线（兼容 FlowNode.incoming 字段） */
  getIncomingByNode(node: FlowNode): Edge[] {
    if (node.incoming && node.incoming.length > 0) {
      return node.incoming
        .map(id => this.edgeMap.get(id))
        .filter((e): e is Edge => e !== undefined);
    }
    return this.incomingMap.get(node.id) ?? [];
  }

  /** 获取所有节点 */
  get nodes(): FlowNode[] {
    return Array.from(this.nodeMap.values());
  }

  /** 获取所有连线 */
  get edges(): Edge[] {
    return Array.from(this.edgeMap.values());
  }

  /** 节点数量 */
  get nodeCount(): number {
    return this.nodeMap.size;
  }

  /** 连线数量 */
  get edgeCount(): number {
    return this.edgeMap.size;
  }
}
