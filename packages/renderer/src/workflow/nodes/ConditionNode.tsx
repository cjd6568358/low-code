/**
 * 条件节点展示组件
 */

import React, { useContext } from 'react';
import { NodeContext } from 'react-flow-builder';

/** 条件节点展示组件 */
export const ConditionNodeDisplay: React.FC = () => {
  const node = useContext(NodeContext) as any;

  return (
    <div
      style={{
        width: 180,
        minHeight: 60,
        background: '#fff',
        border: '1px solid #faad14',
        borderRadius: 4,
        padding: '10px',
        boxShadow: '0 1px 4px rgba(250, 173, 20, 0.15)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 20,
            height: 20,
            background: '#faad14',
            transform: 'rotate(45deg)',
            marginRight: 8,
            textAlign: 'center',
            lineHeight: '20px',
            color: '#fff',
            fontSize: 10,
          }}
        >
          ?
        </span>
        <span style={{ fontWeight: 'bold', fontSize: 13 }}>
          {node.name || '条件判断'}
        </span>
      </div>

      {node.conditionExpression && (
        <div
          style={{
            fontSize: 11,
            color: '#666',
            fontFamily: 'monospace',
            background: '#fafafa',
            padding: '4px 6px',
            borderRadius: 2,
          }}
        >
          {node.conditionExpression}
        </div>
      )}
    </div>
  );
};

export default ConditionNodeDisplay;
