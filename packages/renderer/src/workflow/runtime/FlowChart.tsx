/**
 * 流程图展示组件
 *
 * 只读模式展示流程图，高亮当前节点和已完成路径。
 */

import React, { useMemo } from 'react';
import type { BpmnDocument } from '@low-code/workflow-bpmn';

/** 流程图展示属性 */
export interface FlowChartProps {
  /** 流程定义 */
  definition?: BpmnDocument;
  /** 当前节点 ID */
  currentNodeId?: string;
  /** 已完成的节点 ID 列表 */
  completedNodeIds?: string[];
  /** 已完成的连线 ID 列表 */
  completedEdgeIds?: string[];
  /** 宽度 */
  width?: number | string;
  /** 高度 */
  height?: number | string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/** 节点颜色配置 */
const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'bpmn:StartEvent': { bg: '#e6f7ff', border: '#1890ff', text: '#1890ff' },
  'bpmn:EndEvent': { bg: '#f5f5f5', border: '#666', text: '#666' },
  'bpmn:UserTask': { bg: '#f6ffed', border: '#52c41a', text: '#52c41a' },
  'bpmn:ExclusiveGateway': { bg: '#fff7e6', border: '#faad14', text: '#faad14' },
  'bpmn:ParallelGateway': { bg: '#f9f0ff', border: '#722ed1', text: '#722ed1' },
  'bpmn:InclusiveGateway': { bg: '#fff0f6', border: '#eb2f96', text: '#eb2f96' },
  'bpmn:ServiceTask': { bg: '#fff7e6', border: '#fa8c16', text: '#fa8c16' },
  'bpmn:SendTask': { bg: '#fff0f6', border: '#eb2f96', text: '#eb2f96' },
};

/** 获取节点颜色 */
const getNodeColors = (type: string, isCompleted: boolean, isCurrent: boolean) => {
  const colors = NODE_COLORS[type] || { bg: '#f5f5f5', border: '#d9d9d9', text: '#666' };

  if (isCurrent) {
    return { bg: '#e6f7ff', border: '#1890ff', text: '#1890ff' };
  }

  if (isCompleted) {
    return { bg: '#f6ffed', border: '#52c41a', text: '#52c41a' };
  }

  return colors;
};

/**
 * 流程图展示组件
 */
export const FlowChart: React.FC<FlowChartProps> = ({
  definition,
  currentNodeId,
  completedNodeIds = [],
  completedEdgeIds = [],
  width = '100%',
  height = 400,
  style,
}) => {
  // 计算节点位置
  const nodePositions = useMemo(() => {
    if (!definition?.processes?.[0]?.nodes) {
      return new Map<string, { x: number; y: number }>();
    }

    const nodes = definition.processes[0].nodes;
    const positions = new Map<string, { x: number; y: number }>();

    // 简单的垂直布局
    let y = 50;
    const x = 200;
    const yGap = 100;

    for (const node of nodes) {
      positions.set(node.id, { x, y });
      y += yGap;
    }

    return positions;
  }, [definition]);

  if (!definition?.processes?.[0]) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          ...style,
        }}
      >
        暂无流程定义
      </div>
    );
  }

  const process = definition.processes[0];
  const nodes = process.nodes || [];
  const edges = process.edges || [];

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'auto',
        background: '#fafafa',
        border: '1px solid #e8e8e8',
        borderRadius: 4,
        ...style,
      }}
    >
      <svg
        style={{
          width: '100%',
          height: '100%',
          minHeight: 400,
        }}
      >
        {/* 绘制连线 */}
        {edges.map((edge) => {
          const sourcePos = nodePositions.get(edge.sourceRef);
          const targetPos = nodePositions.get(edge.targetRef);

          if (!sourcePos || !targetPos) return null;

          const isCompleted = completedEdgeIds.includes(edge.id);

          return (
            <line
              key={edge.id}
              x1={sourcePos.x}
              y1={sourcePos.y + 30}
              x2={targetPos.x}
              y2={targetPos.y - 30}
              stroke={isCompleted ? '#52c41a' : '#d9d9d9'}
              strokeWidth={isCompleted ? 2 : 1}
              markerEnd={isCompleted ? 'url(#arrow-green)' : 'url(#arrow-gray)'}
            />
          );
        })}

        {/* 箭头定义 */}
        <defs>
          <marker
            id="arrow-green"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#52c41a" />
          </marker>
          <marker
            id="arrow-gray"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#d9d9d9" />
          </marker>
        </defs>

        {/* 绘制节点 */}
        {nodes.map((node) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;

          const isCurrent = node.id === currentNodeId;
          const isCompleted = completedNodeIds.includes(node.id);
          const colors = getNodeColors(node.$type, isCompleted, isCurrent);

          const nodeWidth = node.$type.includes('Event') ? 60 : 160;
          const nodeHeight = node.$type.includes('Event') ? 60 : 60;

          return (
            <g key={node.id}>
              {/* 节点背景 */}
              {node.$type.includes('Event') ? (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={30}
                  fill={colors.bg}
                  stroke={colors.border}
                  strokeWidth={isCurrent ? 3 : 1}
                />
              ) : (
                <rect
                  x={pos.x - nodeWidth / 2}
                  y={pos.y - nodeHeight / 2}
                  width={nodeWidth}
                  height={nodeHeight}
                  rx={4}
                  fill={colors.bg}
                  stroke={colors.border}
                  strokeWidth={isCurrent ? 3 : 1}
                />
              )}

              {/* 节点文字 */}
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={colors.text}
                fontSize={12}
                fontWeight={isCurrent ? 'bold' : 'normal'}
              >
                {node.name || node.id}
              </text>

              {/* 当前节点指示器 */}
              {isCurrent && (
                <circle
                  cx={pos.x + nodeWidth / 2 - 8}
                  cy={pos.y - nodeHeight / 2 + 8}
                  r={6}
                  fill="#1890ff"
                />
              )}

              {/* 完成节点勾选 */}
              {isCompleted && !isCurrent && (
                <text
                  x={pos.x + nodeWidth / 2 - 10}
                  y={pos.y - nodeHeight / 2 + 12}
                  fill="#52c41a"
                  fontSize={14}
                >
                  ✓
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default FlowChart;
