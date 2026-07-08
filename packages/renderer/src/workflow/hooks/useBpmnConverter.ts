/**
 * BPMN 转换器 Hook
 *
 * 负责 react-flow-builder 节点格式与 BPMN JSON 之间的转换。
 *
 * **重要**：react-flow-builder 使用 **平级数组 + path** 结构，不是 children 嵌套！
 * 官方 demo 示例：
 * ```js
 * [
 *   { type: 'start', name: '开始', path: ['0'] },
 *   { type: 'node', name: '普通节点', path: ['1'] },
 *   { type: 'end', name: '结束', path: ['2'] },
 * ]
 * ```
 * 只有 branch/condition 节点才有 children，且 children 内节点也有 path。
 */

import { useCallback } from 'react';
import type { INode } from 'react-flow-builder';
import type { BpmnDocument, ProcessDefinition, FlowNode, Edge } from '@low-code/workflow';

/** 节点类型映射 */
const NODE_TYPE_MAP: Record<string, string> = {
  start: 'bpmn:StartEvent',
  end: 'bpmn:EndEvent',
  approval: 'bpmn:UserTask',
  condition: 'bpmn:ExclusiveGateway',
  parallel: 'bpmn:ParallelGateway',
  timer: 'bpmn:TimerEvent',
  notify: 'bpmn:SendTask',
  service: 'bpmn:ServiceTask',
  calculation: 'bpmn:ScriptTask',
  // 数据操作
  create: 'bpmn:CreateTask',
  update: 'bpmn:UpdateTask',
  query: 'bpmn:QueryTask',
  delete: 'bpmn:DeleteTask',
};

/** 反向节点类型映射 */
const NODE_TYPE_REVERSE_MAP: Record<string, string> = {
  'bpmn:StartEvent': 'start',
  'bpmn:EndEvent': 'end',
  'bpmn:UserTask': 'approval',
  'bpmn:ExclusiveGateway': 'condition',
  'bpmn:ParallelGateway': 'parallel',
  'bpmn:InclusiveGateway': 'condition',
  'bpmn:TimerEvent': 'timer',
  'bpmn:SendTask': 'notify',
  'bpmn:ServiceTask': 'service',
  'bpmn:ScriptTask': 'calculation',
  // 数据操作
  'bpmn:CreateTask': 'create',
  'bpmn:UpdateTask': 'update',
  'bpmn:QueryTask': 'query',
  'bpmn:DeleteTask': 'delete',
};

/**
 * BPMN 转换器 Hook
 */
export function useBpmnConverter() {
  /**
   * 从 BPMN 文档转换为 react-flow-builder 节点
   *
   * 使用 BFS 遍历，生成 **平级数组 + path** 结构（符合官方 demo 格式）。
   * 只有 branch/condition 节点才有 children。
   */
  const fromBpmnDocument = useCallback((doc: BpmnDocument): INode[] => {
    if (!doc.processes || doc.processes.length === 0) {
      return [];
    }

    const process = doc.processes[0];
    const { nodes: bpmnNodes, edges: bpmnEdges } = process;

    if (!bpmnNodes || bpmnNodes.length === 0) {
      return [];
    }

    // 构建节点映射
    const nodeMap = new Map<string, FlowNode>();
    for (const node of bpmnNodes) {
      nodeMap.set(node.id, node);
    }

    // 构建边的映射：sourceId -> Edge[]
    const outgoingMap = new Map<string, Edge[]>();
    for (const edge of bpmnEdges) {
      const sourceId = edge.sourceRef;
      if (!outgoingMap.has(sourceId)) {
        outgoingMap.set(sourceId, []);
      }
      outgoingMap.get(sourceId)!.push(edge);
    }

    // 找到开始节点
    const startNode = bpmnNodes.find(n => n.$type === 'bpmn:StartEvent');
    if (!startNode) {
      return [];
    }

    // BFS 遍历，生成平级数组
    const result: INode[] = [];
    const visited = new Set<string>();
    // 队列：[nodeId, path]
    const queue: Array<[string, string[]]> = [[startNode.id, ['0']]];

    while (queue.length > 0) {
      const [nodeId, path] = queue.shift()!;

      if (visited.has(nodeId)) {
        continue; // 防止循环
      }
      visited.add(nodeId);

      const bpmnNode = nodeMap.get(nodeId);
      if (!bpmnNode) {
        continue;
      }

      const flowBuilderType = NODE_TYPE_REVERSE_MAP[bpmnNode.$type] || bpmnNode.$type;

      const flowBuilderNode: INode = {
        id: bpmnNode.id,
        name: bpmnNode.name || '',
        type: flowBuilderType,
        path,
        data: {},
      };

      // name 同时写入 data（config panel 从 data 读取，save 后写回 data）
      (flowBuilderNode.data as any).name = bpmnNode.name || '';

      // 复制特有属性（排除 id, name, type, $type, incoming, outgoing, path）
      const skipFields = new Set(['id', 'name', 'type', '$type', 'incoming', 'outgoing', 'path']);
      for (const key of Object.keys(bpmnNode)) {
        if (!skipFields.has(key) && (bpmnNode as any)[key] !== undefined) {
          (flowBuilderNode.data as any)[key] = (bpmnNode as any)[key];
        }
      }

      // 获取 outgoing edges
      const outgoingEdges = outgoingMap.get(nodeId) || [];

      // 判断是否为分支节点（有多个出口或类型为 gateway）
      const isBranch = outgoingEdges.length > 1 ||
        flowBuilderType === 'condition' ||
        flowBuilderType === 'parallel';

      if (isBranch && outgoingEdges.length > 0) {
        // 分支节点：生成 children 结构
        const children: INode[] = [];
        for (let i = 0; i < outgoingEdges.length; i++) {
          const edge = outgoingEdges[i];
          const childPath = [...path, 'children', String(i)];

          // 条件节点本身
          const conditionNode: INode = {
            id: `condition_${edge.id}`,
            type: 'condition',
            name: edge.name || `条件${i + 1}`,
            path: childPath,
            data: {},
          };

          // 获取条件节点的后续节点
          const targetNode = nodeMap.get(edge.targetRef);
          if (targetNode) {
            const conditionChildren: INode[] = [];
            const childFlowNode: INode = {
              id: targetNode.id,
              name: targetNode.name || '',
              type: NODE_TYPE_REVERSE_MAP[targetNode.$type] || targetNode.$type,
              path: [...childPath, 'children', '0'],
              data: {},
            };
            conditionChildren.push(childFlowNode);
            conditionNode.children = conditionChildren;

            // 将后续节点加入队列继续处理
            const targetOutEdges = outgoingMap.get(targetNode.id) || [];
            if (targetOutEdges.length > 0) {
              for (const targetEdge of targetOutEdges) {
                if (!visited.has(targetEdge.targetRef)) {
                  queue.push([targetEdge.targetRef, [...childPath, 'children', '0']]);
                }
              }
            }
          }

          children.push(conditionNode);
        }
        flowBuilderNode.children = children;
      } else if (outgoingEdges.length === 1) {
        // 单出口：将目标节点加入队列
        const targetId = outgoingEdges[0].targetRef;
        if (!visited.has(targetId)) {
          // 计算下一个 path index
          const pathIndex = parseInt(path[path.length - 1], 10) + 1;
          const nextPath = [...path.slice(0, -1), String(pathIndex)];
          queue.push([targetId, nextPath]);
        }
      }

      result.push(flowBuilderNode);
    }

    return result;
  }, []);

  /**
   * 从 react-flow-builder 节点转换为 BPMN 文档
   *
   * react-flow-builder 使用平级数组 + path 结构。
   * 简化逻辑：按 path 排序后，为相邻节点生成 edges。
   */
  const toBpmnDocument = useCallback((nodes: INode[]): BpmnDocument => {
    const bpmnNodes: FlowNode[] = [];
    const bpmnEdges: Edge[] = [];

    // 收集所有真实节点（跳过虚拟 condition 节点）
    const collectNode = (node: INode) => {
      // 跳过虚拟的 condition 节点（由 edge 生成的）
      if (node.id.startsWith('condition_')) {
        // 但处理它的 children
        if (node.children) {
          for (const child of node.children) {
            collectNode(child);
          }
        }
        return;
      }

      const bpmnType = NODE_TYPE_MAP[node.type] || node.type;

      const bpmnNode: any = {
        id: node.id,
        $type: bpmnType,
        // name 优先从 node.data 读（config panel 保存到 data），回退到顶层
        name: node.data?.name || node.name || '',
      };

      // 复制 data 中的特有属性
      if (node.data) {
        for (const key of Object.keys(node.data)) {
          if ((node.data as any)[key] !== undefined) {
            bpmnNode[key] = (node.data as any)[key];
          }
        }
      }

      bpmnNodes.push(bpmnNode as FlowNode);

      // 处理 children（branch/condition 节点）
      if (node.children) {
        for (const child of node.children) {
          collectNode(child);
        }
      }
    };

    // 按 path 排序
    const sortedNodes = [...nodes].sort((a, b) => {
      const pathA = (a.path || []).join('.');
      const pathB = (b.path || []).join('.');
      return pathA.localeCompare(pathB);
    });

    // 收集所有节点
    for (const node of sortedNodes) {
      collectNode(node);
    }

    // 按 path 排序真实节点，生成顺序连线
    const realNodes = bpmnNodes
      .filter(n => !n.id.startsWith('condition_'))
      .sort((a, b) => {
        // 找到对应的 react-flow-builder 节点来获取 path
        const nodeA = sortedNodes.find(n => n.id === a.id);
        const nodeB = sortedNodes.find(n => n.id === b.id);
        const pathA = (nodeA?.path || []).join('.');
        const pathB = (nodeB?.path || []).join('.');
        return pathA.localeCompare(pathB);
      });

    // 为相邻节点生成 edges
    for (let i = 0; i < realNodes.length - 1; i++) {
      const current = realNodes[i];
      const next = realNodes[i + 1];

      // 只有非结束节点才生成出口 edge
      if (current.$type !== 'bpmn:EndEvent') {
        bpmnEdges.push({
          id: `flow_${current.id}_${next.id}`,
          $type: 'bpmn:SequenceFlow',
          sourceRef: current.id,
          targetRef: next.id,
          name: '',
        });
      }
    }

    return {
      id: `doc_${Date.now()}`,
      name: '流程定义',
      processes: [{
        id: `process_${Date.now()}`,
        name: '流程定义',
        isExecutable: true,
        nodes: bpmnNodes,
        edges: bpmnEdges,
      }],
    };
  }, []);

  return {
    fromBpmnDocument,
    toBpmnDocument,
  };
}

export default useBpmnConverter;
