/**
 * 页面运行时渲染器（简化版）
 *
 * 读取 PageSchema JSON，使用 antd 组件映射表渲染页面。
 * 暂不支持数据绑定/联动/事件，仅做静态渲染。
 */
import React, { useState, useEffect } from 'react';
import { Spin, App } from 'antd';
import type { PageSchema, ComponentNode } from '@low-code/shared';
import { antdComponents } from '@low-code/renderer';

interface PageRuntimeProps {
  appId: string;
  pageId: string;
}

/** 递归渲染组件树 */
function renderNode(node: ComponentNode, allComponents: ComponentNode[]): React.ReactNode {
  const ComponentImpl = antdComponents[node.type];

  if (!ComponentImpl) {
    return (
      <div key={node.id} style={{ padding: 8, color: '#999', fontSize: 12, border: '1px dashed #d9d9d9', borderRadius: 4, margin: 4 }}>
        未知组件: {node.type}
      </div>
    );
  }

  // 收集子组件
  const childNodes = (node.children || [])
    .map((id) => allComponents.find((c) => c.id === id))
    .filter(Boolean) as ComponentNode[];

  // 有子组件的容器
  if (childNodes.length > 0) {
    return (
      <ComponentImpl key={node.id} {...node.props}>
        {childNodes.map((child) => renderNode(child, allComponents))}
      </ComponentImpl>
    );
  }

  // 叶子组件
  return <ComponentImpl key={node.id} {...node.props} />;
}

export default function PageRuntime({ appId, pageId }: PageRuntimeProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [schema, setSchema] = useState<PageSchema | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/apps/${appId}/pages/${pageId}`);
        const data = await resp.json();
        if (!cancelled && data.success && data.resource) {
          setSchema(data.resource);
        } else if (!cancelled) {
          message.error('页面不存在');
        }
      } catch {
        if (!cancelled) message.error('加载页面失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [appId, pageId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin />
      </div>
    );
  }

  if (!schema) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#bbb' }}>
        页面数据为空
      </div>
    );
  }

  // 应用布局配置
  const layoutStyle: React.CSSProperties = {
    display: schema.layout.type === 'grid' ? 'grid' : 'flex',
    flexDirection: schema.layout.type === 'flex' ? (schema.layout.vertical !== false ? 'column' : 'row') : undefined,
    flexWrap: schema.layout.type === 'flex' ? (schema.layout.wrap ? 'wrap' : 'nowrap') : undefined,
    justifyContent: schema.layout.type === 'flex' ? (schema.layout.justify || 'flex-start') : undefined,
    alignItems: schema.layout.type === 'flex' ? (schema.layout.align || 'stretch') : undefined,
    gridTemplateColumns: schema.layout.type === 'grid' ? `repeat(${schema.layout.columns || 24}, 1fr)` : undefined,
    gap: schema.layout.gap ?? 16,
    padding: 16,
  };

  const rootComponents = schema.components.filter((c) => !c.parentId);

  return (
    <div style={layoutStyle}>
      {rootComponents.map((node) => renderNode(node, schema.components))}
    </div>
  );
}
