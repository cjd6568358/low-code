/**
 * 服务节点展示组件（自动化节点）
 */

import React, { useContext } from 'react';
import { NodeContext } from 'react-flow-builder';

/** 服务节点展示组件 */
export const ServiceNodeDisplay: React.FC = () => {
  const node = useContext(NodeContext) as any;

  // 服务类型标签
  const typeLabels: Record<string, string> = {
    api: 'API',
    database: '数据库',
    email: '邮件',
    webhook: 'Webhook',
    custom: '自定义',
  };

  const serviceType = node.serviceType || 'custom';

  return (
    <div
      style={{
        width: 160,
        minHeight: 60,
        background: '#fff',
        border: '1px solid #fa8c16',
        borderRadius: 4,
        padding: '10px',
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
          {node.name || '自动化'}
        </span>
      </div>

      <div style={{ fontSize: 11, color: '#666' }}>
        类型: {typeLabels[serviceType] || serviceType}
      </div>
    </div>
  );
};

export default ServiceNodeDisplay;
