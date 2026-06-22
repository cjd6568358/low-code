/**
 * 页面运行时渲染器
 *
 * 支持：
 * - 页面数据源（表达式求值，结果赋给 $data）
 * - PropValue 格式（字面量/变量引用/表达式）
 * - 响应式组件状态追踪（$component 绑定 + 精准更新）
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Spin, App, Watermark } from 'antd';
import type { PageSchema, ComponentNode, WatermarkConfig } from '@low-code/shared';
import { antdComponents, ResolvedComponent, isVariableBinding, isExpressionBinding } from '@low-code/renderer';
import { ReactiveEnvContext } from '@low-code/renderer';
import { expressionEngine } from '@low-code/computation';

interface PageRuntimeProps {
  appId: string;
  pageId: string;
}

/** API 请求封装 */
async function apiRequest(config: { url: string; method?: string; data?: any; params?: Record<string, any> }): Promise<any> {
  const { url, method = 'GET', data, params } = config;
  const urlObj = new URL(url, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      urlObj.searchParams.set(k, String(v));
    }
  }
  const resp = await fetch(urlObj.toString(), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method !== 'GET' && data ? JSON.stringify(data) : undefined,
  });
  return resp.json();
}

/** 创建 $fetch 代理 */
function createFetchProxy() {
  return {
    get: (url: string, config?: any) => apiRequest({ url, method: 'GET', ...config }),
    post: (url: string, data?: any, config?: any) => apiRequest({ url, method: 'POST', data, ...config }),
    put: (url: string, data?: any, config?: any) => apiRequest({ url, method: 'PUT', data, ...config }),
    delete: (url: string, config?: any) => apiRequest({ url, method: 'DELETE', ...config }),
  };
}

/** 初始化组件默认值 */
function initComponentValues(components: ComponentNode[]): Record<string, any> {
  const values: Record<string, any> = {};
  for (const comp of components) {
    values[comp.id] = {
      value: comp.props?.value ?? comp.props?.defaultValue ?? undefined,
      visible: comp.visible !== false,
      disabled: comp.props?.disabled ?? false,
      loading: false,
    };
  }
  return values;
}

/** 从上下文中按路径取值（如 "$user.name" → context.$user.name） */
function resolveVariablePath(path: string, context: Record<string, any>): any {
  const segments = path.split('.');
  let current: any = context;
  for (const seg of segments) {
    if (current == null) break;
    current = current[seg];
  }
  return current;
}

/** 解析水印配置中的变量引用和表达式 */
function resolveWatermarkProps(
  config: WatermarkConfig | undefined,
  context: Record<string, any>,
): Record<string, any> | null {
  if (!config) return null;
  const resolved: Record<string, any> = {};
  const ctxKeys = Object.keys(context);
  const ctxValues = Object.values(context);

  for (const [key, rawValue] of Object.entries(config)) {
    if (key === 'enabled') continue;  // 跳过平台控制字段
    if (rawValue === undefined || rawValue === null) continue;

    if (isVariableBinding(rawValue)) {
      // 变量引用：从上下文中按路径取值
      resolved[key] = resolveVariablePath(rawValue.value, context);
    } else if (isExpressionBinding(rawValue)) {
      // 表达式：通过 Function 构造器执行，上下文变量通过参数注入
      try {
        const body = rawValue.value.trim();
        const fn = new Function(...ctxKeys, `return (${body})()`);
        resolved[key] = fn(...ctxValues);
      } catch {
        // 表达式执行失败时跳过
      }
    } else {
      // 字面量
      resolved[key] = rawValue;
    }
  }

  return Object.keys(resolved).length > 0 ? resolved : null;
}

export default function PageRuntime({ appId, pageId }: PageRuntimeProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [schema, setSchema] = useState<PageSchema | null>(null);
  const [dataReady, setDataReady] = useState(false);

  // 创建响应式上下文（稳定引用，只创建一次）
  const reactiveCtx = useMemo(() => new ReactiveEnvContext({
    $user: {},
    $platform: { web: true, mobile: false, miniApp: false },
    $route: { params: {}, query: {}, path: window.location.pathname },
    $component: {},
    $data: {},
    $table: {},
    $computation: {},
    $fetch: createFetchProxy(),
    $workflow: undefined,
  }), []);

  // 解析后的水印配置
  const [resolvedWatermark, setResolvedWatermark] = useState<Record<string, any> | null>(null);

  // 加载页面 schema + 执行数据源
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setDataReady(false);
      try {
        const resp = await fetch(`/api/apps/${appId}/pages/${pageId}`);
        const data = await resp.json();
        if (!cancelled && data.success && data.resource) {
          const pageSchema = data.resource as PageSchema;
          setSchema(pageSchema);

          // 初始化组件状态
          const componentValues = initComponentValues(pageSchema.components);
          reactiveCtx.set('$component', componentValues);

          // 执行数据源表达式
          if (pageSchema.dataSource) {
            try {
              const result = await expressionEngine.evaluateAsync(
                pageSchema.dataSource,
                reactiveCtx.getContext(),
              );
              console.log('[PageRuntime] $data =', result);
              reactiveCtx.set('$data', result);
            } catch (e) {
              console.warn('[PageRuntime] 数据源表达式执行失败:', e);
            }
          }

          // 解析水印配置（数据源执行后，上下文已就绪）
          if (pageSchema.watermark?.enabled) {
            const wm = resolveWatermarkProps(pageSchema.watermark, reactiveCtx.getContext());
            setResolvedWatermark(wm);
          }

          if (!cancelled) {
            setDataReady(true);
          }
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
  }, [appId, pageId, reactiveCtx]);

  // 组件值变更回调
  const handleComponentValueChange = useCallback((componentId: string, value: any) => {
    const path = `$component.${componentId}`;
    const current = reactiveCtx.get(path) ?? {};
    reactiveCtx.set(path, { ...current, value });
  }, [reactiveCtx]);

  // 递归渲染组件树
  const renderNode = (node: ComponentNode): React.ReactNode => {
    const ComponentImpl = antdComponents[node.type];

    if (!ComponentImpl) {
      return (
        <div key={node.id} style={{ padding: 8, color: '#999', fontSize: 12, border: '1px dashed #d9d9d9', borderRadius: 4, margin: 4 }}>
          未知组件: {node.type}
        </div>
      );
    }

    const childNodes = (node.children || [])
      .map((id) => schema?.components.find((c) => c.id === id))
      .filter(Boolean) as ComponentNode[];

    return (
      <ResolvedComponent
        key={node.id}
        componentId={node.id}
        rawProps={node.props}
        context={reactiveCtx.getContext()}
        reactiveContext={reactiveCtx}
        expressionEngine={expressionEngine}
      >
        {(resolvedProps) => {
          const enhancedProps = {
            ...resolvedProps,
            onChange: (valueOrEvent: any) => {
              const newValue = valueOrEvent?.target
                ? valueOrEvent.target.value ?? valueOrEvent.target.checked
                : valueOrEvent;
              handleComponentValueChange(node.id, newValue);
              resolvedProps.onChange?.(valueOrEvent);
            },
          };

          if (childNodes.length > 0) {
            return (
              <ComponentImpl {...enhancedProps}>
                {childNodes.map((child) => renderNode(child))}
              </ComponentImpl>
            );
          }
          return <ComponentImpl {...enhancedProps} />;
        }}
      </ResolvedComponent>
    );
  };

  if (loading || (schema?.dataSource && !dataReady)) {
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

  const layoutContent = (
    <div style={layoutStyle}>
      {rootComponents.map((node) => renderNode(node))}
    </div>
  );

  // 有水印配置时包裹 Watermark 组件
  if (resolvedWatermark) {
    return <Watermark {...resolvedWatermark}>{layoutContent}</Watermark>;
  }

  return layoutContent;
}
