/**
 * 开始节点展示组件
 */

import React, { useContext } from 'react';
import { NodeContext } from 'react-flow-builder';

/** 开始节点展示组件 */
export const StartNodeDisplay: React.FC = () => {
  const node = useContext(NodeContext);

  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: '#1890ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)',
      }}
    >
      {node.name || '开始'}
    </div>
  );
};

export default StartNodeDisplay;
