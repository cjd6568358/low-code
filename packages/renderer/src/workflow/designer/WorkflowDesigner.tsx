/**
 * 流程设计器主组件
 *
 * 基于 react-flow-builder 实现的可视化流程设计器，
 * 支持 BPMN 2.0 JSON Schema 导入导出。
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Popover } from 'antd';
import FlowBuilder, {
  NodeContext,
  INode,
  IRegisterNode,
} from 'react-flow-builder';

/** 自定义 Popover 组件 */
const PopoverComponent: React.FC<any> = ({ visible, onVisibleChange, children, content, ...rest }) => {
  return (
    <Popover
      open={visible}
      onOpenChange={onVisibleChange}
      content={content}
      trigger="click"
      placement="rightTop"
      {...rest}
    >
      {children}
    </Popover>
  );
};
import { StartNodeDisplay } from '../nodes/StartNode';
import { EndNodeDisplay } from '../nodes/EndNode';
import { ApprovalNodeDisplay } from '../nodes/ApprovalNode';
import { ConditionNodeDisplay } from '../nodes/ConditionNode';
import { ParallelNodeDisplay } from '../nodes/ParallelNode';
import { TimerNodeDisplay } from '../nodes/TimerNode';
import { NotifyNodeDisplay } from '../nodes/NotifyNode';
import { ServiceNodeDisplay } from '../nodes/ServiceNode';
import { NodeConfigDrawer } from '../config/NodeConfigDrawer';
import { useBpmnConverter } from '../hooks/useBpmnConverter';
import type { BpmnDocument, FlowNode } from '@low-code/workflow-bpmn';

/** 流程设计器属性 */
export interface WorkflowDesignerProps {
  /** 流程定义（BPMN JSON） */
  value?: BpmnDocument;
  /** 值变更回调 */
  onChange?: (value: BpmnDocument) => void;
  /** 是否只读 */
  readonly?: boolean;
  /** 宽度 */
  width?: number | string;
  /** 高度 */
  height?: number | string;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 节点配置回调 */
  onNodeConfig?: (node: INode) => void;
}

/** 节点类型常量 */
const NODE_TYPES = {
  START: 'start',
  END: 'end',
  APPROVAL: 'approval',
  CONDITION: 'condition',
  PARALLEL: 'parallel',
  TIMER: 'timer',
  NOTIFY: 'notify',
  SERVICE: 'service',
} as const;

/**
 * 流程设计器组件
 */
export const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  value,
  onChange,
  readonly = false,
  width = '100%',
  height = 600,
  style,
  onNodeConfig,
}) => {
  const [nodes, setNodes] = useState<INode[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedNode, setSelectedNode] = useState<INode | null>(null);
  const { fromBpmnDocument, toBpmnDocument } = useBpmnConverter();

  // 初始化：从 BPMN JSON 转换为 react-flow-builder 格式
  React.useEffect(() => {
    if (value) {
      const converted = fromBpmnDocument(value);
      setNodes(converted);
    }
  }, [value]);

  // 可添加的节点类型（排除开始和结束节点）
  const addableNodeTypes = useMemo(() => [
    NODE_TYPES.APPROVAL,
    NODE_TYPES.CONDITION,
    NODE_TYPES.PARALLEL,
    NODE_TYPES.TIMER,
    NODE_TYPES.NOTIFY,
    NODE_TYPES.SERVICE,
  ], []);

  // 注册节点类型
  const registerNodes: IRegisterNode[] = useMemo(() => [
    {
      type: NODE_TYPES.START,
      name: '开始',
      isStart: true,
      displayComponent: StartNodeDisplay,
      addableNodeTypes,
    },
    {
      type: NODE_TYPES.END,
      name: '结束',
      isEnd: true,
      displayComponent: EndNodeDisplay,
    },
    {
      type: NODE_TYPES.APPROVAL,
      name: '审批',
      displayComponent: ApprovalNodeDisplay,
      addableNodeTypes,
    },
    {
      type: NODE_TYPES.CONDITION,
      name: '条件',
      displayComponent: ConditionNodeDisplay,
      addableNodeTypes,
    },
    {
      type: NODE_TYPES.PARALLEL,
      name: '并行',
      conditionNodeType: NODE_TYPES.CONDITION,
      displayComponent: ParallelNodeDisplay,
      addableNodeTypes,
    },
    {
      type: NODE_TYPES.TIMER,
      name: '延时',
      displayComponent: TimerNodeDisplay,
      addableNodeTypes,
    },
    {
      type: NODE_TYPES.NOTIFY,
      name: '通知',
      displayComponent: NotifyNodeDisplay,
      addableNodeTypes,
    },
    {
      type: NODE_TYPES.SERVICE,
      name: '自动化',
      displayComponent: ServiceNodeDisplay,
      addableNodeTypes,
    },
  ], [addableNodeTypes]);

  // 节点变更回调
  const handleChange = useCallback((newNodes: INode[]) => {
    setNodes(newNodes);

    // 转换为 BPMN JSON 并通知父组件
    if (onChange) {
      const bpmnDoc = toBpmnDocument(newNodes);
      onChange(bpmnDoc);
    }
  }, [onChange, toBpmnDocument]);

  // 节点点击回调
  const handleNodeClick = useCallback((node: INode) => {
    if (readonly) return;

    setSelectedNode(node);
    setDrawerVisible(true);

    if (onNodeConfig) {
      onNodeConfig(node);
    }
  }, [readonly, onNodeConfig]);

  // 配置抽屉关闭
  const handleDrawerClose = useCallback(() => {
    setDrawerVisible(false);
    setSelectedNode(null);
  }, []);

  // 节点配置保存
  const handleNodeConfigSave = useCallback((nodeId: string, config: any) => {
    const newNodes = nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          ...config,
        };
      }
      return node;
    });

    handleChange(newNodes);
    setDrawerVisible(false);
    setSelectedNode(null);
  }, [nodes, handleChange]);

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        ...style,
      }}
    >
      <FlowBuilder
        nodes={nodes}
        onChange={handleChange}
        registerNodes={registerNodes}
        readonly={readonly}
        layout="vertical"
        spaceX={50}
        spaceY={50}
        showArrow
        historyTool
        zoomTool
        PopoverComponent={PopoverComponent}
      />

      {!readonly && (
        <NodeConfigDrawer
          visible={drawerVisible}
          node={selectedNode}
          onClose={handleDrawerClose}
          onSave={handleNodeConfigSave}
        />
      )}
    </div>
  );
};

export default WorkflowDesigner;
