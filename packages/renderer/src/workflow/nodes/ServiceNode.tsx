/**
 * 脚本节点展示组件（原服务/自动化节点）
 *
 * 执行自定义脚本表达式，支持 $fetch 调用外部 API
 */

import React, { useContext } from 'react';
import { NodeContext } from 'react-flow-builder';

/** 脚本节点展示组件 */
export const ServiceNodeDisplay: React.FC = () => {
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
        border: '1px solid #fa8c16',
        borderRadius: 4,
        padding: '12px',
        boxShadow: '0 1px 4px rgba(250, 140, 22, 0.15)',
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
            background: '#fa8c16',
            marginRight: 8,
            textAlign: 'center',
            lineHeight: '20px',
            color: '#fff',
            fontSize: 10,
          }}
        >
          ⚙
        </span>
        <span style={{ fontWeight: 'bold', fontSize: 13 }}>
          {data.name || node.name || '脚本'}
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
          未配置脚本
        </div>
      )}
    </div>
  );
};

export default ServiceNodeDisplay;
