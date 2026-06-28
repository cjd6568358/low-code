/**
 * 并行节点展示组件
 */

import React, { useContext } from 'react';
import { NodeContext } from 'react-flow-builder';

/** 并行节点展示组件 */
export const ParallelNodeDisplay: React.FC = () => {
  const node = useContext(NodeContext) as any;

  return (
    <div
      style={{
        width: 60,
        height: 60,
        background: '#fff',
        border: '2px solid #722ed1',
        transform: 'rotate(45deg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(114, 46, 209, 0.2)',
      }}
    >
      <div
        style={{
          transform: 'rotate(-45deg)',
          fontSize: 12,
          fontWeight: 'bold',
          color: '#722ed1',
          textAlign: 'center',
        }}
      >
        {node.name || '并行'}
      </div>
    </div>
  );
};

export default ParallelNodeDisplay;
