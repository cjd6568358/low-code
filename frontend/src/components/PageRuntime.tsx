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
import type {
  ComponentState,
  DataSourceItem,
  EnvUserInfo,
  EnvironmentContext,
  FetchConfig,
  PageSchema,
  ServerVariableProxy,
  WatermarkConfig,
} from '@low-code/shared';
import { expressionEngine, isExpressionBinding, isVariableBinding } from '@low-code/shared';
import {
  PageRenderer,
  componentRegistry,
  antdComponents,
  antdSchemas,
  antdComponentMethods,
  WebAdapter,
} from '@low-code/renderer';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/apiClient.js';

/** 页面运行时属性 */
interface PageRuntimeProps {
  /** 应用 ID（裸 8 位 hex） */
  appId: string;
  /** 页面 ID（裸 8 位 hex） */
  pageId: string;
}

/** 水印配置中可被变量绑定覆盖的键（enabled 为开关，不参与绑定） */
type WatermarkBindingKey = Exclude<keyof WatermarkConfig, 'enabled'>;

/** 水印字体样式（antd Watermark font 属性） */
interface WatermarkFont {
  /** 字号（px） */
  fontSize?: number;
  /** 文字颜色 */
  color?: string;
}

/** 解析后的水印配置（传递字面量给 antd Watermark，不含 PropValue 包装） */
interface ResolvedWatermark {
  /** 水印文字 */
  content?: string | string[];
  /** 水印图片地址 */
  image?: string;
  /** 旋转角度（度） */
  rotate?: number;
  /** 层级 */
  zIndex?: number;
  /** 字体样式 */
  font?: WatermarkFont;
}

/** 当前登录用户（未登录时的占位值） */
const ANONYMOUS_USER: EnvUserInfo = {
  id: '',
  name: '未登录',
  roles: [],
  department: '',
  departmentName: '',
  position: '',
};

/** 空的服务端表查询代理（页面运行时不经由 $table 访问数据，统一走 $fetch/apiCall） */
const EMPTY_TABLE_PROXY: ServerVariableProxy = {};

/** 初始化组件状态（$component 上下文） */
function initComponentState(
  components: PageSchema['components'],
): Record<string, ComponentState> {
  const state: Record<string, ComponentState> = {};
  for (const comp of components) {
    const value = comp.props?.value ?? comp.props?.defaultValue;
    state[comp.id] = {
      value,
      visible: comp.visible !== false,
      disabled: comp.props?.disabled === true,
      loading: false,
    };
  }
  return state;
}

/**
 * 构建页面运行时环境变量上下文
 *
 * @param params 上下文依赖项
 * @returns EnvironmentContext 实例
 */
function buildRuntimeContext(params: {
  appId: string;
  pageId: string;
  componentState: Record<string, ComponentState>;
  dataResult: Record<string, DataSourceItem>;
  fetchProxy: EnvironmentContext['$fetch'];
}): EnvironmentContext {
  const { appId, pageId, componentState, dataResult, fetchProxy } = params;

  return {
    $user: ANONYMOUS_USER,
    $platform: { web: true, mobile: false, miniApp: false },
    $route: {
      params: { tenantId: '', appId, pageId },
      query: Object.fromEntries(new URLSearchParams(window.location.search)),
      path: window.location.pathname,
    },
    $component: componentState,
    $data: dataResult,
    $table: EMPTY_TABLE_PROXY,
    $computation: expressionEngine,
    $fetch: fetchProxy,
  };
}

export default function PageRuntime({ appId, pageId }: PageRuntimeProps) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [schema, setSchema] = useState<PageSchema | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [dataResult, setDataResult] = useState<Record<string, DataSourceItem>>({});

  // 注册 antd 组件到 componentRegistry（仅首次）
  const registryReady = useRef(false);
  useEffect(() => {
    if (registryReady.current) return;
    registryReady.current = true;
    for (const [type, propsSchema] of Object.entries(antdSchemas)) {
      const existing = componentRegistry.resolve(type);
      if (!existing) {
        componentRegistry.register({
          type,
          name: propsSchema.title ?? type,
          category: 'basic',
          component: type,
          propsSchema,
          library: 'antd',
          methods: antdComponentMethods[type],
        });
      }
    }
  }, []);

  // 创建 WebAdapter（稳定引用）
  const adapter = useMemo(() => {
    const instance = new WebAdapter();
    for (const [type, comp] of Object.entries(antdComponents)) {
      instance.registerComponent(type, comp, 'antd');
    }
    return instance;
  }, []);

  // 组件状态（运行时可变）
  const componentStateRef = useRef<Record<string, ComponentState>>({});

  // 请求代理（供表达式中的 $fetch 使用）
  const fetchProxy = useMemo<EnvironmentContext['$fetch']>(() => ({
    get: (url: string, config?: FetchConfig) =>
      adapter.api.request({ url, method: 'GET', ...config }),
    post: (url: string, data?: unknown, config?: FetchConfig) =>
      adapter.api.request({ url, method: 'POST', data, ...config }),
    put: (url: string, data?: unknown, config?: FetchConfig) =>
      adapter.api.request({ url, method: 'PUT', data, ...config }),
    delete: (url: string, config?: FetchConfig) =>
      adapter.api.request({ url, method: 'DELETE', ...config }),
  }), [adapter]);

  // 加载页面 schema + 执行数据源
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setDataReady(false);
      try {
        const resp = await apiFetch(`/api/apps/${appId}/pages/${pageId}`);
        const data = await resp.json() as { success?: boolean; resource?: PageSchema };
        if (!cancelled && data.success && data.resource) {
          const pageSchema = data.resource;
          setSchema(pageSchema);

          // 初始化组件状态
          const componentState = initComponentState(pageSchema.components);
          componentStateRef.current = componentState;

          // 执行数据源表达式，结果挂载到 $data.<sourceKey>
          if (pageSchema.dataSource) {
            try {
              const ctx = buildRuntimeContext({
                appId,
                pageId,
                componentState,
                dataResult: {},
                fetchProxy,
              });
              const result = await expressionEngine.evaluateAsync(pageSchema.dataSource, ctx);
              setDataResult({
                page: { data: result, loading: false, error: null },
              });
            } catch (e) {
              console.warn('[PageRuntime] 数据源表达式执行失败:', e);
              setDataResult({
                page: {
                  data: undefined,
                  loading: false,
                  error: e instanceof Error ? e : new Error('数据源执行失败'),
                },
              });
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
  }, [appId, pageId, fetchProxy, message]);

  // 表单值变更回调
  const handleFormValueChange = useCallback((field: string, value: unknown) => {
    const parts = field.split('.');
    if (parts.length === 0) return;
    const compId = parts[0];
    const current = componentStateRef.current[compId] ?? {
      value: undefined,
      visible: true,
      disabled: false,
      loading: false,
    };
    componentStateRef.current[compId] = { ...current, value };
  }, []);

  // 事件回调
  const handleEvent = useCallback((eventName: string, data: unknown) => {
    console.warn('[PageRuntime] 未处理事件:', eventName, data);
  }, []);

  // 组件属性更新回调
  const handleComponentPropsUpdate = useCallback(
    (componentId: string, props: Record<string, unknown>) => {
      const current = componentStateRef.current[componentId] ?? {
        value: undefined,
        visible: true,
        disabled: false,
        loading: false,
      };
      componentStateRef.current[componentId] = { ...current, ...props };
    },
    [],
  );

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

  const context = buildRuntimeContext({
    appId,
    pageId,
    componentState: componentStateRef.current,
    dataResult,
    fetchProxy,
  });

  // 解析水印配置
  const resolvedWatermark = resolveWatermarkConfig(schema.watermark, context);

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

/**
 * 解析水印配置中的变量绑定
 *
 * 配置项支持 PropValue（变量引用/表达式），这里仅处理变量引用；
 * 水印启用但无文案/图片时补默认文案，
 * 避免 antd Watermark 内部 canvas 尺寸为 0 报错。
 *
 * @param config 页面 Schema 中的水印配置
 * @param context 运行时环境变量上下文
 * @returns 解析后的水印配置，未启用时返回 null
 */
function resolveWatermarkConfig(
  config: WatermarkConfig | undefined,
  context: EnvironmentContext,
): ResolvedWatermark | null {
  if (!config?.enabled) return null;

  const resolved: ResolvedWatermark = {};
  const bindingKeys: WatermarkBindingKey[] = ['content', 'image', 'rotate', 'zIndex', 'font'];

  for (const key of bindingKeys) {
    const rawValue = config[key];
    if (rawValue === undefined || rawValue === null) continue;

    let value: unknown = rawValue;
    if (isVariableBinding(rawValue)) {
      value = readPath(context, rawValue.value);
    } else if (isExpressionBinding(rawValue)) {
      // 表达式型水印配置需要异步求值，同步渲染阶段先跳过，使用默认值
      continue;
    }

    if (value === undefined || value === null) continue;

    if (key === 'content') {
      resolved.content = Array.isArray(value) ? value.map(String) : String(value);
    } else if (key === 'image') {
      resolved.image = String(value);
    } else if (key === 'rotate' || key === 'zIndex') {
      const num = Number(value);
      if (!Number.isNaN(num)) {
        if (key === 'rotate') resolved.rotate = num;
        else resolved.zIndex = num;
      }
    } else if (key === 'font' && typeof value === 'object') {
      resolved.font = value as WatermarkFont;
    }
  }

  if (!resolved.content && !resolved.image) {
    resolved.content = '水印';
  }

  return resolved;
}

/**
 * 按点分路径读取上下文中的值
 *
 * @param source 源对象
 * @param path 点分路径（如 `$user.name`）
 * @returns 路径对应的值，任一层缺失时返回 undefined
 */
function readPath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
