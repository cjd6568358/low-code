/**
 * 流程设计器主组件
 *
 * 基于 react-flow-builder 实现的可视化流程设计器。
 * 只处理 nodes，不负责 schema 转换。
 */

import React, { useMemo, useCallback } from 'react';
import { Drawer, Popover, Popconfirm } from 'antd';
import FlowBuilder, {
  INode,
  IRegisterNode,
  IDrawerComponent,
  IPopoverComponent,
  IPopconfirmComponent,
} from 'react-flow-builder';
import { NODE_META_LIST } from '../nodes/nodeMeta';
import NodeConfigComponent from '../config/NodeConfigComponent';
import { WorkflowContext } from '../context/WorkflowContext';

/** 流程设计器属性 */
export interface WorkflowDesignerProps {
  /** 流程节点列表 */
  nodes: INode[];
  /** 节点变更回调 */
  onChange?: (nodes: INode[]) => void;
  /** 租户ID */
  tenantId?: string;
  /** 应用ID */
  appId?: string;
  /** 是否只读 */
  readonly?: boolean;
  /** 宽度 */
  width?: number | string;
  /** 高度 */
  height?: number | string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * 自定义 Drawer 组件
 * 将 react-flow-builder 的 visible 转换为 antd 的 open
 * 使用 size 替代 width（antd 新版本）
 */
const DrawerComponent: React.FC<IDrawerComponent> = (props) => {
  const { visible, children, width, ...restProps } = props;
  return (
    <Drawer open={visible} size={width} mask={{ closable: true }} {...restProps}>
      {children}
    </Drawer>
  );
};

/**
 * 自定义 Popover 组件
 * 将 react-flow-builder 的 visible/onVisibleChange 转换为 antd 的 open/onOpenChange
 */
const PopoverComponent: React.FC<IPopoverComponent> = (props) => {
  const { visible, onVisibleChange, children, ...restProps } = props;
  return (
    <Popover open={visible} onOpenChange={onVisibleChange} {...restProps}>
      {children}
    </Popover>
  );
};

/**
 * 自定义 Popconfirm 组件
 */
const PopconfirmComponent: React.FC<IPopconfirmComponent> = (props) => {
  const { children, ...restProps } = props;
  return (
    <Popconfirm {...restProps}>
      {children}
    </Popconfirm>
  );
};

/**
 * 流程设计器组件
 */
export const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  nodes,
  onChange,
  tenantId = '',
  appId,
  readonly = false,
  width = '100%',
  height = 600,
  style,
}) => {
  // 从元数据派生 registerNodes
  const registerNodes: IRegisterNode[] = useMemo(
    () =>
      NODE_META_LIST.map((meta) => ({
        type: meta.type,
        name: meta.name,
        displayComponent: meta.displayComponent,
        isStart: meta.isStart,
        isEnd: meta.isEnd,
        conditionNodeType: meta.conditionNodeType,
        addableNodeTypes: meta.addableTypes,
        // 添加 configComponent 使节点可点击并显示配置面板
        configComponent: NodeConfigComponent,
      })),
    []
  );

  // 节点变更回调
  const handleChange = useCallback(
    (newNodes: INode[]) => {
      onChange?.(newNodes);
    },
    [onChange]
  );

  // 上下文值
  const contextValue = useMemo(
    () => ({ tenantId, appId }),
    [tenantId, appId]
  );

  return (
    <WorkflowContext.Provider value={contextValue}>
      <div style={{ width, height, position: 'relative', ...style }}>
        {nodes.length > 0 ? (
          <FlowBuilder
            nodes={nodes}
            onChange={handleChange}
            registerNodes={registerNodes}
            readonly={readonly}
            layout="vertical"
            spaceX={16}
            spaceY={16}
            showArrow
            historyTool
            zoomTool
            // 传入自定义组件
            DrawerComponent={DrawerComponent}
            PopoverComponent={PopoverComponent}
            PopconfirmComponent={PopconfirmComponent}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            加载中...
          </div>
        )}
      </div>
    </WorkflowContext.Provider>
  );
};

export default WorkflowDesigner;
