/**
 * 页面运行时渲染器
 *
 * 基于 PageRenderer 完整渲染引擎，支持：
 * - 页面数据源（表达式求值，结果赋给 $data）
 * - PropValue 格式（字面量/变量引用/表达式）
 * - 事件动作链（setValues/navigate/showMessage 等全部动作类型）
 * - 条件规则、联动引擎、组件级数据源
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Spin, App, Watermark } from 'antd';
import type { PageSchema, RenderContext, WatermarkConfig } from '@low-code/shared';
import { PageRenderer, componentRegistry, antdComponents, antdSchemas, WebAdapter } from '@low-code/renderer';
import { expressionEngine } from '@low-code/computation';
import { useNavigate } from 'react-router-dom';

interface PageRuntimeProps {
  appId: string;
  pageId: string;
}

/** 初始化组件状态（$component 上下文） */
function initComponentState(components: PageSchema['components']): Record<string, any> {
  const state: Record<string, any> = {};
  for (const comp of components) {
    state[comp.id] = {
      value: comp.props?.value ?? comp.props?.defaultValue ?? undefined,
      visible: comp.visible !== false,
      disabled: comp.props?.disabled ?? false,
      loading: false,
    };
  }
  return state;
}

export default function PageRuntime({ appId, pageId }: PageRuntimeProps) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [schema, setSchema] = useState<PageSchema | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [dataResult, setDataResult] = useState<any>(undefined);

  // 注册 antd 组件到 componentRegistry（仅首次）
  const registryReady = useRef(false);
  useEffect(() => {
    if (registryReady.current) return;
    registryReady.current = true;
    for (const [type, schemaObj] of Object.entries(antdSchemas)) {
      const existing = componentRegistry.resolve(type);
      if (!existing) {
        componentRegistry.register({
          type,
          name: (schemaObj as any).title || type,
          category: 'basic',
          component: type,
          propsSchema: schemaObj as any,
          library: 'antd',
        });
      }
    }
  }, []);

  // 创建 WebAdapter（稳定引用）
  const adapter = useMemo(() => {
    const a = new WebAdapter();
    for (const [type, comp] of Object.entries(antdComponents)) {
      a.registerComponent(type, comp as React.ComponentType<any>, 'antd');
    }
    return a;
  }, []);

  // 组件状态（运行时可变）
  const componentStateRef = useRef<Record<string, any>>({});

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
          componentStateRef.current = initComponentState(pageSchema.components);

          // 执行数据源表达式
          if (pageSchema.dataSource) {
            try {
              const ctx = buildContext(componentStateRef.current);
              const result = await expressionEngine.evaluateAsync(pageSchema.dataSource, ctx);
              setDataResult(result);
            } catch (e) {
              console.warn('[PageRuntime] 数据源表达式执行失败:', e);
            }
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
  }, [appId, pageId]);

  // 构建 RenderContext
  const buildContext = useCallback((compState: Record<string, any>): RenderContext => ({
    user: { id: '', name: '', roles: [], department: '', departmentName: '', position: '' },
    platform: { web: true, mobile: false, miniApp: false },
    route: {
      params: { tenantId: '', appId, pageId },
      query: Object.fromEntries(new URLSearchParams(window.location.search)),
      path: window.location.pathname,
    },
    component: compState,
    data: dataResult ?? {},
    table: {} as any,
    computation: { evaluate: async () => null },
    fetch: {
      get: (url: string, config?: any) => adapter.api.request({ url, method: 'GET', ...config }),
      post: (url: string, data?: any, config?: any) => adapter.api.request({ url, method: 'POST', data, ...config }),
      put: (url: string, data?: any, config?: any) => adapter.api.request({ url, method: 'PUT', data, ...config }),
      delete: (url: string, config?: any) => adapter.api.request({ url, method: 'DELETE', ...config }),
    },
  }), [appId, pageId, dataResult, adapter]);

  // 表单值变更回调
  const handleFormValueChange = useCallback((field: string, value: any) => {
    // 更新组件状态
    const parts = field.split('.');
    if (parts.length >= 1) {
      const compId = parts[0];
      const current = componentStateRef.current[compId] || {};
      componentStateRef.current[compId] = { ...current, value };
    }
  }, []);

  // 事件回调
  const handleEvent = useCallback((eventName: string, data: any) => {
    console.log('[PageRuntime] event:', eventName, data);
  }, []);

  // 组件属性更新回调
  const handleComponentPropsUpdate = useCallback((componentId: string, props: Record<string, any>) => {
    const current = componentStateRef.current[componentId] || {};
    componentStateRef.current[componentId] = { ...current, ...props };
  }, []);

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

  const context = buildContext(componentStateRef.current);

  // 解析水印配置
  let resolvedWatermark: Record<string, any> | null = null;
  if (schema.watermark?.enabled) {
    resolvedWatermark = {};
    for (const [key, rawValue] of Object.entries(schema.watermark)) {
      if (key === 'enabled' || rawValue === undefined || rawValue === null) continue;
      if (typeof rawValue === 'object' && 'type' in rawValue && 'value' in rawValue) {
        const binding = rawValue as { type: string; value: string };
        if (binding.type === 'variable') {
          const segments = binding.value.split('.');
          let current: any = context;
          for (const seg of segments) {
            if (current == null) break;
            current = current[seg];
          }
          resolvedWatermark[key] = current;
        } else {
          resolvedWatermark[key] = binding.value;
        }
      } else {
        resolvedWatermark[key] = rawValue;
      }
    }
  }

  const layoutContent = (
    <PageRenderer
      schema={schema}
      context={context}
      adapter={adapter}
      registry={componentRegistry}
      onFormValueChange={handleFormValueChange}
      onEvent={handleEvent}
      onComponentPropsUpdate={handleComponentPropsUpdate}
    />
  );

  if (resolvedWatermark) {
    return <Watermark {...resolvedWatermark}>{layoutContent}</Watermark>;
  }

  return layoutContent;
}
