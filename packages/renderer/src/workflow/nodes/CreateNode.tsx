/**
 * 创建记录节点展示组件
 */

import React, { useContext } from 'react';
import { NodeContext } from 'react-flow-builder';

/** 创建记录节点展示组件 */
export const CreateNodeDisplay: React.FC = () => {
  const node = useContext(NodeContext) as any;
  const data = node.data || {};

  const collection = data.collection || '未指定表';
  const fields = data.fields || [];
  const fieldCount = Array.isArray(fields) ? fields.length : 0;

  return (
    <div
      style={{
        width: 180,
        minHeight: 70,
        background: '#fff',
        border: '1px solid #52c41a',
        borderRadius: 4,
        padding: '12px',
        boxShadow: '0 1px 4px rgba(82, 196, 26, 0.15)',
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
            borderRadius: 4,
            background: '#52c41a',
            marginRight: 8,
            textAlign: 'center',
            lineHeight: '20px',
            color: '#fff',
            fontSize: 12,
          }}
        >
          +
        </span>
        <span style={{ fontWeight: 'bold', fontSize: 13 }}>
          {data.name || node.name || '创建记录'}
        </span>
      </div>

      <div style={{ fontSize: 11, color: '#666' }}>
        <div>表: {collection}</div>
        {fieldCount > 0 && (
          <div>字段: {fieldCount} 个</div>
        )}
      </div>
    </div>
  );
};

export default CreateNodeDisplay;
