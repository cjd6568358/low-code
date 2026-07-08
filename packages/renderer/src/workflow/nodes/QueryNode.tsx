/**
 * 查询记录节点展示组件
 */

import React, { useContext } from 'react';
import { NodeContext } from 'react-flow-builder';

/** 查询记录节点展示组件 */
export const QueryNodeDisplay: React.FC = () => {
  const node = useContext(NodeContext) as any;
  const data = node.data || {};

  const collection = data.collection || '未指定表';
  const filter = data.filter || {};
  const sort = data.sort || {};
  const pagination = data.pagination || {};

  const hasFilter = Object.keys(filter).length > 0;
  const hasSort = Object.keys(sort).length > 0;
  const limit = pagination.limit || '不限';

  return (
    <div
      style={{
        width: 180,
        minHeight: 70,
        background: '#fff',
        border: '1px solid #722ed1',
        borderRadius: 4,
        padding: '12px',
        boxShadow: '0 1px 4px rgba(114, 46, 209, 0.15)',
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
            background: '#722ed1',
            marginRight: 8,
            textAlign: 'center',
            lineHeight: '20px',
            color: '#fff',
            fontSize: 10,
          }}
        >
          🔍
        </span>
        <span style={{ fontWeight: 'bold', fontSize: 13 }}>
          {data.name || node.name || '查询记录'}
        </span>
      </div>

      <div style={{ fontSize: 11, color: '#666' }}>
        <div>表: {collection}</div>
        {hasFilter && <div>✓ 已设置筛选条件</div>}
        {hasSort && <div>✓ 已设置排序</div>}
        <div>返回数量: {limit}</div>
      </div>
    </div>
  );
};

export default QueryNodeDisplay;
