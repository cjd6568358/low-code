/**
 * 删除记录节点展示组件
 */

import React, { useContext } from 'react';
import { NodeContext } from 'react-flow-builder';

/** 删除记录节点展示组件 */
export const DeleteNodeDisplay: React.FC = () => {
  const node = useContext(NodeContext) as any;
  const data = node.data || {};

  const collection = data.collection || '未指定表';
  const filter = data.filter || [];
  const filterCount = Array.isArray(filter) ? filter.length : 0;

  return (
    <div
      style={{
        width: 180,
        minHeight: 70,
        background: '#fff',
        border: '1px solid #ff4d4f',
        borderRadius: 4,
        padding: '12px',
        boxShadow: '0 1px 4px rgba(255, 77, 79, 0.15)',
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
            background: '#ff4d4f',
            marginRight: 8,
            textAlign: 'center',
            lineHeight: '20px',
            color: '#fff',
            fontSize: 12,
          }}
        >
          ✕
        </span>
        <span style={{ fontWeight: 'bold', fontSize: 13 }}>
          {data.name || node.name || '删除记录'}
        </span>
      </div>

      <div style={{ fontSize: 11, color: '#666' }}>
        <div>表: {collection}</div>
        {filterCount > 0 ? (
          <div>✓ 已设置筛选条件</div>
        ) : (
          <div style={{ color: '#ff4d4f' }}>⚠ 未设置筛选条件</div>
        )}
      </div>
    </div>
  );
};

export default DeleteNodeDisplay;
