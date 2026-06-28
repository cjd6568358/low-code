/**
 * 结束节点展示组件
 */

import React, { useContext } from 'react';
import { NodeContext } from 'react-flow-builder';

/** 结束节点展示组件 */
export const EndNodeDisplay: React.FC = () => {
  const node = useContext(NodeContext);

  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: '#666',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        boxShadow: '0 2px 8px rgba(102, 102, 102, 0.3)',
      }}
    >
      {node.name || '结束'}
    </div>
  );
};

export default EndNodeDisplay;
