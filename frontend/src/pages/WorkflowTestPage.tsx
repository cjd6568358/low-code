/**
 * 流程设计器测试页面
 *
 * 用于调试 react-flow-builder 的添加按钮问题
 */

import React, { useState, useMemo, useContext } from 'react';
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
};

/** 开始节点展示组件 */
const StartNodeDisplay: React.FC = () => {
  const node = useContext(NodeContext);
  return (
    <div style={{
      width: 48,
      height: 48,
      borderRadius: '50%',
      backgroundColor: '#1890ff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: 12,
    }}>
      {node.name || '开始'}
    </div>
  );
};

/** 结束节点展示组件 */
const EndNodeDisplay: React.FC = () => {
  const node = useContext(NodeContext);
  return (
    <div style={{
      width: 48,
      height: 48,
      borderRadius: '50%',
      backgroundColor: '#666',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: 12,
    }}>
      {node.name || '结束'}
    </div>
  );
};

/** 审批节点展示组件 */
const ApprovalNodeDisplay: React.FC = () => {
  const node = useContext(NodeContext);
  return (
    <div style={{
      width: 200,
      padding: '12px 16px',
      backgroundColor: '#fff',
      borderRadius: 4,
      border: '1px solid #d9d9d9',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontWeight: 500 }}>{node.name || '审批节点'}</div>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>点击配置</div>
    </div>
  );
};

/** 条件节点展示组件 */
const ConditionNodeDisplay: React.FC = () => {
  const node = useContext(NodeContext);
  return (
    <div style={{
      width: 200,
      padding: '12px 16px',
      backgroundColor: '#fffbe6',
      borderRadius: 4,
      border: '1px solid #ffe58f',
    }}>
      <div style={{ fontWeight: 500 }}>{node.name || '条件节点'}</div>
    </div>
  );
};

/**
 * 流程设计器测试页面
 */
export default function WorkflowTestPage() {
  const [nodes, setNodes] = useState<INode[]>([
    {
      id: 'start',
      name: '开始',
      type: NODE_TYPES.START,
      children: [
        {
          id: 'end',
          name: '结束',
          type: NODE_TYPES.END,
        },
      ],
    },
  ]);

  // 可添加的节点类型
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
  ], [addableNodeTypes]);

  const handleChange = (newNodes: INode[]) => {
    console.log('nodes change', JSON.stringify(newNodes, null, 2));
    setNodes(newNodes);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>流程设计器测试</h1>
      <p>当前节点数量: {nodes.length}</p>
      <p>节点数据: <pre>{JSON.stringify(nodes, null, 2)}</pre></p>
      <div style={{ height: 600, border: '1px solid #d9d9d9', borderRadius: 4 }}>
        <FlowBuilder
          nodes={nodes}
          onChange={handleChange}
          registerNodes={registerNodes}
          layout="vertical"
          spaceX={50}
          spaceY={50}
          showArrow
          PopoverComponent={PopoverComponent}
        />
      </div>
    </div>
  );
}
