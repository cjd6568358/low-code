/**
 * 计算节点展示组件
 *
 * 用于表达式计算，支持引用上游节点结果
 */

import React, { useContext } from 'react';
import { NodeContext } from 'react-flow-builder';

/** 计算节点展示组件 */
export const CalculationNodeDisplay: React.FC = () => {
  const node = useContext(NodeContext) as any;
  const data = node.data || {};

  const expression = data.expression || '';

  // 截断过长的表达式
  const displayExpression = expression.length > 30
    ? expression.substring(0, 30) + '...'
    : expression;

  return (
    <div
      style={{
        width: 180,
        minHeight: 70,
        background: '#fff',
        border: '1px solid #2f54eb',
        borderRadius: 4,
        padding: '12px',
        boxShadow: '0 1px 4px rgba(47, 84, 235, 0.15)',
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
            background: '#2f54eb',
            marginRight: 8,
            textAlign: 'center',
            lineHeight: '20px',
            color: '#fff',
            fontSize: 12,
          }}
        >
          f(x)
        </span>
        <span style={{ fontWeight: 'bold', fontSize: 13 }}>
          {data.name || node.name || '计算'}
        </span>
      </div>

      {expression ? (
        <div
          style={{
            fontSize: 11,
            color: '#666',
            fontFamily: 'monospace',
            background: '#f5f5f5',
            padding: '4px 6px',
            borderRadius: 2,
            wordBreak: 'break-all',
          }}
        >
          {displayExpression}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: '#999' }}>
          未配置表达式
        </div>
      )}
    </div>
  );
};

export default CalculationNodeDisplay;
