/**
 * 延时节点展示组件
 */

import React, { useContext } from 'react';
import { NodeContext } from 'react-flow-builder';

/** 延时节点展示组件 */
export const TimerNodeDisplay: React.FC = () => {
  const node = useContext(NodeContext) as any;

  // 格式化时长
  const formatDuration = (ms: number): string => {
    if (!ms) return '未配置';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return days + '天';
    if (hours > 0) return hours + '小时';
    if (minutes > 0) return minutes + '分钟';
    return seconds + '秒';
  };

  return (
    <div
      style={{
        width: 160,
        minHeight: 60,
        background: '#fff',
        border: '1px solid #13c2c2',
        borderRadius: 4,
        padding: '10px',
        boxShadow: '0 1px 4px rgba(19, 194, 194, 0.15)',
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
            borderRadius: '50%',
            background: '#13c2c2',
            marginRight: 8,
            textAlign: 'center',
            lineHeight: '20px',
            color: '#fff',
            fontSize: 10,
          }}
        >
          ⏱
        </span>
        <span style={{ fontWeight: 'bold', fontSize: 13 }}>
          {node.name || '延时'}
        </span>
      </div>

      <div style={{ fontSize: 11, color: '#666' }}>
        {node.duration ? formatDuration(node.duration) : '未配置时长'}
      </div>
    </div>
  );
};

export default TimerNodeDisplay;
