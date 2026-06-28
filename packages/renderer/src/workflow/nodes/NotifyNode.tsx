/**
 * 通知节点展示组件
 */

import React, { useContext } from 'react';
import { NodeContext } from 'react-flow-builder';

/** 通知节点展示组件 */
export const NotifyNodeDisplay: React.FC = () => {
  const node = useContext(NodeContext) as any;

  // 通知渠道标签
  const channelLabels: Record<string, string> = {
    email: '邮件',
    sms: '短信',
    wechat: '微信',
    dingtalk: '钉钉',
  };

  const channels = node.channels || [];

  return (
    <div
      style={{
        width: 160,
        minHeight: 60,
        background: '#fff',
        border: '1px solid #eb2f96',
        borderRadius: 4,
        padding: '10px',
        boxShadow: '0 1px 4px rgba(235, 47, 150, 0.15)',
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
            background: '#eb2f96',
            marginRight: 8,
            textAlign: 'center',
            lineHeight: '20px',
            color: '#fff',
            fontSize: 10,
          }}
        >
          ✉
        </span>
        <span style={{ fontWeight: 'bold', fontSize: 13 }}>
          {node.name || '通知'}
        </span>
      </div>

      {channels.length > 0 && (
        <div style={{ fontSize: 11, color: '#666' }}>
          渠道: {channels.map((c: string) => channelLabels[c] || c).join(', ')}
        </div>
      )}
    </div>
  );
};

export default NotifyNodeDisplay;
