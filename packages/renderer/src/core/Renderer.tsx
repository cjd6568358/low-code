import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { message } from 'antd';
import type {
  PageSchema,
  ComponentNode,
  RenderContext,
  ThemeConfig,
  ActionContext,
  ComponentRegistration,
} from '@low-code/shared';
import { expressionEngine } from '@low-code/computation';
import { ComponentRegistryImpl } from './ComponentRegistry';
import { DataBindingResolver } from './DataBindingResolver';
import { ConditionRuleEngine } from './ConditionRuleEngine';
import { ActionRegistryImpl, createDefaultActionRegistry } from './ActionRegistry';
import { EventCompiler } from './EventCompiler';
import { LinkageEngine } from './LinkageEngine';
import { CardRenderer } from './CardRenderer';
import { ModalStack } from './ModalStack';
import { ComponentRefreshManager } from './ComponentRefreshManager';
import { UnifiedDependencyGraph } from './UnifiedDependencyGraph';
import { createTableProxy } from './QueryProxy';
import { ResolvedComponent } from './ResolvedComponent';
import { FormRegistry } from './FormRegistry';
import { ComponentMethodRegistry } from './ComponentMethodRegistry';
import { FormRegistryContext } from '../components/FormRegistryContext';
import { ComponentMethodRegistryContext } from '../components/ComponentMethodRegistryContext';
import type { PlatformAdapter } from '@low-code/shared';

/** 渲染器配置 */
export interface RendererConfig {
  schema: PageSchema;
  context: RenderContext;
  adapter: PlatformAdapter;
  registry: ComponentRegistryImpl;
  theme?: Partial<ThemeConfig>;
  onFormValueChange?: (field: string, value: any) => void;
  onEvent?: (eventName: string, data: any) => void;
  /** 组件属性更新回调 */
  onComponentPropsUpdate?: (componentId: string, props: Record<string, any>) => void;
  /** 自定义卡片定义映射（cardId → CustomCardDefinition），用于卡片渲染和方法注册 */
  cardDefinitions?: Map<string, import('@low-code/shared').CustomCardDefinition>;
}

/**
 * 主渲染器
 * 消费 PageSchema JSON，驱动 React 组件树渲染
 */
export function PageRenderer(config: RendererConfig) {
  const {
    schema,
    context,
    adapter,
    registry,
    theme,
    onFormValueChange,
    onEvent,
    onComponentPropsUpdate,
    cardDefinitions,
  } = config;

  // 引擎实例（稳定引用）
  const bindingResolver = useMemo(
    () => new DataBindingResolver(),
    [],
  );
  const conditionEngine = useMemo(
    () => new ConditionRuleEngine(expressionEngine),
    [],
  );
  const actionRegistry = useMemo(() => createDefaultActionRegistry(), []);
  const eventCompiler = useMemo(
    () => new EventCompiler(actionRegistry, expressionEngine),
    [actionRegistry],
  );
  const linkageEngine = useMemo(() => new LinkageEngine(expressionEngine), []);
  const modalStack = useMemo(
    () =>
      new ModalStack((event) => {
        onEvent?.('modalChange', event);
      }),
    [onEvent],
  );
  const cardRenderer = useMemo(
    () => new CardRenderer(expressionEngine, bindingResolver),
    [bindingResolver],
  );

  // 新增：组件级刷新管理器
  const componentRefreshManager = useMemo(
    () =>
      new ComponentRefreshManager(expressionEngine, bindingResolver, {
        apiRequest: (config) => adapter.api.request(config),
        onComponentPropsUpdate: (componentId, props) => {
          onComponentPropsUpdate?.(componentId, props);
        },
      }),
    [expressionEngine, bindingResolver, adapter, onComponentPropsUpdate],
  );

  // 新增：统一依赖图
  const dependencyGraph = useMemo(() => new UnifiedDependencyGraph(), []);

  // 表单注册表（每个 PageRenderer 实例独立）
  const formRegistry = useMemo(() => new FormRegistry(), []);

  // 组件方法注册表（每个 PageRenderer 实例独立）
  const methodRegistry = useMemo(() => new ComponentMethodRegistry(), []);

  // 预注册所有组件的方法到 ComponentMethodRegistry
  // 组件树渲染前完成注册，确保事件链中靠前的组件能 invokeMethod 到靠后的组件
  useEffect(() => {
    for (const node of schema.components) {
      const reg = registry.resolve(node.type);
      if (!reg?.methods?.length) continue;

      const methods: Record<string, (params?: any) => any> = {};
      const meta: Record<string, { label: string; description?: string }> = {};

      for (const m of reg.methods) {
        // 空壳处理器：组件实际挂载后通过 useComponentMethods 注册真实实现
        methods[m.name] = (params?: any) => {
          console.warn(`[invokeMethod] 组件 "${node.id}" 的方法 "${m.name}" 尚未注册运行时处理器`);
          return undefined;
        };
        meta[m.name] = { label: m.title, description: m.description };
      }

      methodRegistry.register(node.id, node.type, methods, meta);
    }

    return () => { methodRegistry.clear(); };
  }, [schema.components, registry, methodRegistry]);

  // 组件属性覆盖（setValues 运行时写入）
  const [componentOverrides, setComponentOverrides] = useState<Record<string, Record<string, any>>>({});

  // 全局加载状态（showLoading/hideLoading 动作使用）
  const [loadingState, setLoadingState] = useState<{ visible: boolean; message?: string }>({ visible: false });
  const showLoading = useCallback((message?: string) => {
    setLoadingState({ visible: true, message });
  }, []);
  const hideLoading = useCallback(() => {
    setLoadingState({ visible: false });
  }, []);

  const setComponentProp = useCallback((componentId: string, propName: string, value: any) => {
    setComponentOverrides((prev) => ({
      ...prev,
      [componentId]: { ...prev[componentId], [propName]: value },
    }));
  }, []);

  // 当前渲染路径中的 formId 栈（支持嵌套表单）
  const formIdStackRef = useRef<string[]>([]);
  const getActiveFormId = useCallback(() => {
    const stack = formIdStackRef.current;
    return stack.length > 0 ? stack[stack.length - 1] : undefined;
  }, []);

  // 构建环境变量（独立于数据源状态）
  const envContext = useMemo(() => {
    const $fetch = {
      get: (url: string, config?: any) =>
        adapter.api.request({ url, method: 'GET', ...config }),
      post: (url: string, data?: any, config?: any) =>
        adapter.api.request({ url, method: 'POST', data, ...config }),
      put: (url: string, data?: any, config?: any) =>
        adapter.api.request({ url, method: 'PUT', data, ...config }),
      delete: (url: string, config?: any) =>
        adapter.api.request({ url, method: 'DELETE', ...config }),
    };

    const appId = context.$route?.params?.appId;
    const $table = createTableProxy(
      (config) => adapter.api.request(config),
      appId,
    );

    return {
      $user: context.$user,
      $platform: context.$platform ?? { web: true, mobile: false, miniApp: false },
      $route: context.$route,
      $component: context.$component,
      $table,
      $computation: context.$computation ?? {},
      $fetch,
      $workflow: context.$workflow,
    };
  }, [context, adapter]);

  // 页面数据源：单表达式求值，结果赋给 $data
  const [dataReady, setDataReady] = useState(false);
  const [dataResult, setDataResult] = useState<any>(undefined);

  useEffect(() => {
    if (!schema.dataSource) {
      setDataReady(true);
      setDataResult(undefined);
      return;
    }

    let cancelled = false;
    (async () => {
      setDataReady(false);

      // 使用环境变量上下文执行数据源表达式
      try {
        const result = await expressionEngine.evaluateAsync(
          { type: 'expression', value: schema.dataSource!, async: true },
          envContext,
        );
        if (!cancelled) {
          setDataResult(result);
          setDataReady(true);
        }
      } catch (e) {
        console.warn('[PageRenderer] 数据源表达式执行失败:', e);
        if (!cancelled) {
          setDataResult(undefined);
          setDataReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [schema.dataSource, envContext, expressionEngine]);

  // 初始化条件规则
  useEffect(() => {
    if (schema.rules) {
      conditionEngine.init(schema.rules);
    }
  }, [schema.rules, conditionEngine]);

  // 初始化联动引擎
  useEffect(() => {
    linkageEngine.setUpdateCallback((updates) => {
      if (onFormValueChange) {
        for (const [field, value] of Object.entries(updates)) {
          onFormValueChange(field, value);
        }
      }
    });
  }, [linkageEngine, onFormValueChange]);

  // 初始化组件刷新管理器和依赖图
  useEffect(() => {
    // 初始化组件映射
    componentRefreshManager.init(schema.components);

    // 初始化依赖图
    dependencyGraph.clear();
    for (const component of schema.components) {
      // 分析组件 props 中的变量依赖
      const dependencies = extractDependenciesFromProps(component.props);
      dependencyGraph.registerComponent(component.id, dependencies);
    }

    // 注册数据源依赖（从表达式中提取变量依赖）
    if (schema.dataSource) {
      const dependencies = expressionEngine.analyzeDependencies(schema.dataSource);
      dependencyGraph.registerDataSource('$data', dependencies);
    }
  }, [schema.components, schema.dataSource, componentRefreshManager, dependencyGraph]);

  // 卸载时清理弹框栈
  useEffect(() => {
    return () => modalStack.clear();
  }, [modalStack]);

  // 应用主题
  useEffect(() => {
    if (theme) {
      adapter.applyTheme({
        primaryColor: '#1890ff',
        borderRadius: 6,
        fontSize: 14,
        spacing: 8,
        componentLibrary: 'antd',
        colorSuccess: '#52c41a',
        colorWarning: '#faad14',
        colorError: '#ff4d4f',
        colorBgContainer: '#ffffff',
        colorTextPrimary: '#000000d9',
        ...theme,
      });
    }
  }, [theme, adapter]);

  // 构建组件树映射
  const componentMap = useMemo(() => {
    const map = new Map<string, ComponentNode>();
    for (const node of schema.components) {
      map.set(node.id, node);
    }
    return map;
  }, [schema.components]);

  // 合并数据源结果和环境变量到上下文
  const runtimeContext = useMemo(() => {
    const baseContext = { ...context, ...envContext };

    if (!dataReady || schema.dataSource === undefined) {
      return baseContext;
    }

    // $data 直接就是表达式执行结果
    return {
      ...baseContext,
      $data: dataResult,
    };
  }, [dataReady, context, dataResult, schema.dataSource, envContext]);

  // 组件级数据源缓存
  const [componentDataSourceCache, setComponentDataSourceCache] = useState<Map<string, any>>(new Map());

  // 加载组件级数据源
  useEffect(() => {
    if (!dataReady) return;

    const loadAllComponentDataSources = async () => {
      const newCache = new Map<string, any>();

      for (const component of schema.components) {
        if (component.dataSource) {
          const result = await loadComponentDataSource(component.dataSource, runtimeContext);
          if (result.success) {
            newCache.set(component.id, result.data);
          }
        }
      }

      setComponentDataSourceCache(newCache);
    };

    loadAllComponentDataSources();
  }, [schema.components, runtimeContext, dataReady]);

  // 渲染动作上下文
  const actionContext = useMemo<ActionContext>(
    () => ({
      renderContext: runtimeContext,
      formRegistry,
      activeFormId: getActiveFormId(),
      setFormValue: onFormValueChange,
      setComponentProp,
      navigate: (url, params) => adapter.navigate(url, params),
      showMessage: (type: string, content: string, duration?: number) => {
        // 使用 antd message 组件
        const messageApi = message[type as keyof typeof message];
        if (messageApi) {
          messageApi(content, duration ? duration / 1000 : undefined);
        }
      },
      showLoading,
      hideLoading,
      apiRequest: (config) => adapter.api.request(config),
      showModal: (resourceType: string, resourceId: string, data?: any) => modalStack.open(resourceType, resourceId, data),
      closeModal: () => modalStack.closeAll(),
      resolveModal: (result?: any) => modalStack.resolve(result),
      refreshComponent: async (componentId: string, propNames?: string[]) => {
        if (propNames) {
          return componentRefreshManager.refreshProps(componentId, propNames, runtimeContext);
        }
        return componentRefreshManager.refreshAll(componentId, runtimeContext);
      },
      refreshWithDependencyOrder: async (componentIds: string[]) => {
        return componentRefreshManager.refreshWithDependencyOrder(componentIds, runtimeContext);
      },
      analyzeChangeImpact: (changedPaths: Set<string>) => {
        return dependencyGraph.analyzeChangeImpact(changedPaths);
      },
      invokeMethod: async (targetId: string, method: string, params?: any) => {
        return methodRegistry.invoke(targetId, method, params);
      },
    }),
    [runtimeContext, formRegistry, getActiveFormId, adapter, onFormValueChange, setComponentProp, showLoading, hideLoading, modalStack, componentRefreshManager, dependencyGraph, methodRegistry],
  );

  // 渲染单个组件节点
  const renderNode = useCallback(
    (node: ComponentNode): React.ReactNode => {
      // 1. 条件规则评估
      const ruleResult = conditionEngine.evaluateComponent(
        node.id,
        node.visible,
        runtimeContext,
      );
      if (!ruleResult.visible) return null;

      // 2. 组件解析
      let componentType = node.type;
      let isCard = false;

      // 自定义卡片处理
      if (node.type.startsWith('card:')) {
        isCard = true;
        componentType = 'card';

        // 注册卡片方法到 ComponentMethodRegistry
        const cardId = node.type.slice('card:'.length);
        const cardDef = cardDefinitions?.get(cardId);
        if (cardDef?.interface.methods?.length) {
          cardRenderer.createMethodInvoker(
            cardDef, runtimeContext, eventCompiler,
            methodRegistry, node.id,
          );
        }
      }

      const registration = registry.resolve(node.type);
      if (!registration && !isCard) {
        console.warn(`[PageRenderer] "${node.type}" not in registry, available:`, registry.list().map(r => r.type).join(', '));
        return (
          <div key={node.id} className={`lc-did-${node.id}`}>
            <span style={{ color: '#999' }}>未找到组件: {node.type}</span>
          </div>
        );
      }

      // 3. 获取实现组件
      let ComponentImpl: React.ComponentType<any> | null = null;
      if (!isCard) {
        ComponentImpl = adapter.resolveComponent(
          componentType,
          registration!.library || 'default',
        );
      }

      if (!ComponentImpl) {
        ComponentImpl = 'div' as any;
      }

      // 4. 渲染子组件
      const children = node.children || [];
      let childElements = children
        .map((childId) => componentMap.get(childId))
        .filter(Boolean)
        .map((child) => renderNode(child!));

      // Form 组件：子树内的 $component.formId.$form 绑定指向当前表单实例
      const isFormComponent = node.type === 'form';
      if (isFormComponent && childElements.length > 0) {
        childElements = [
          <FormRegistryContext.Provider key="__form_ctx__" value={{ registry: formRegistry, activeFormId: node.id }}>
            {childElements}
          </FormRegistryContext.Provider>,
        ];
      }

      // 5. 事件编译
      const eventHandlers = node.events
        ? eventCompiler.compileEvents(node.events, actionContext)
        : {};

      // 6. 布局样式
      const layoutStyle = resolveLayoutStyle(node.layout, schema.layout);

      // 7. 使用 ResolvedComponent 处理表达式
      return (
        <ResolvedComponent
          key={node.id}
          componentId={node.id}
          rawProps={node.props}
          context={runtimeContext}
          expressionEngine={expressionEngine}
        >
          {(resolvedProps) => {
            // 8. 处理组件级数据源（从缓存中获取）
            if (componentDataSourceCache.has(node.id) && node.dataSource) {
              resolvedProps[node.dataSource.targetProp] = componentDataSourceCache.get(node.id);
            }

            // 9. 合并规则设置的属性
            if (ruleResult.setProps[node.id]) {
              resolvedProps = { ...resolvedProps, ...ruleResult.setProps[node.id] };
            }

            // 10. 合并规则设置的值
            if (ruleResult.setValues[node.id] !== undefined) {
              resolvedProps.value = ruleResult.setValues[node.id];
            }

            // 10.5. 合并 setValues 运行时覆盖
            const overrides = componentOverrides[node.id];
            if (overrides) {
              resolvedProps = { ...resolvedProps, ...overrides };
            }

            // 11. 构建平台能力 props
            const rawValue = node.props.value;
            let bindField: string | undefined;
            let boundFormId: string | undefined;
            if (rawValue && typeof rawValue === 'object' && rawValue.type === 'variable') {
              const path = rawValue.value;
              if (typeof path === 'string') {
                // $component.formId.$form.fieldName → 指定表单
                if (path.startsWith('$component.') && path.includes('.$form.')) {
                  const formIdx = path.indexOf('.$form.');
                  boundFormId = path.slice('$component.'.length, formIdx);
                  bindField = path.slice(formIdx + '.$form.'.length);
                }
              }
            }

            const platformProps: Record<string, any> = {
              node,
              field: {
                getValue: () => resolvedProps.value,
                setValue: (value: any) => {
                  if (bindField) {
                    onFormValueChange?.(bindField, value);
                  }
                },
                bindField,
                formId: boundFormId ?? formRegistry.getActiveFormId(),
              },
              events: mapEventHandlersToProps(eventHandlers),
              linkage: {
                evaluate: (eventName: string, eventData?: any) => {
                  if (eventName === 'onChange' && bindField) {
                    linkageEngine.onFieldChange(bindField, eventData, runtimeContext);
                  }
                },
              },
              // Form 组件注册 + 预求值所需数据
              ...(isFormComponent ? {
                _formRegistry: formRegistry,
                _formId: node.id,
                _componentMap: componentMap,
                _context: runtimeContext,
              } : {}),
            };

            // 12. 合并所有 props（node.id 注入为 Form.Item 字段名，保持与 form store key 一致）
            // 注意：不单独 spread platformProps.events，withPlatform 内部已处理事件绑定
            const finalProps: Record<string, any> = {
              ...resolvedProps,
              ...platformProps,
              style: { ...resolvedProps.style, ...layoutStyle },
              disabled: ruleResult.disabled || resolvedProps.disabled,
              name: node.id,
            };

            return React.createElement(
              ComponentImpl!,
              finalProps,
              childElements.length > 0 ? childElements : resolvedProps.children,
            );
          }}
        </ResolvedComponent>
      );
    },
    [
      componentMap,
      runtimeContext,
      schema.layout,
      conditionEngine,
      bindingResolver,
      eventCompiler,
      actionContext,
      registry,
      adapter,
      formRegistry,
      componentOverrides,
      cardDefinitions,
      cardRenderer,
      methodRegistry,
    ],
  );

  // 渲染布局容器
  const layoutStyle = resolvePageLayoutStyle(schema.layout);

  const rootChildren = schema.components
    .filter((c) => !c.parentId)
    .sort((a, b) => {
      const orderA = a.layout?.order ?? 0;
      const orderB = b.layout?.order ?? 0;
      return orderA - orderB;
    })
    .map((node) => renderNode(node));

  // 数据源未加载完毕时显示 loading
  if (!dataReady && schema.dataSource) {
    return (
      <div
        className="lc-page lc-page--loading"
        data-page-id={schema.pageId}
        style={{
          ...layoutStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          color: '#999',
          fontSize: 14,
        }}
      >
        加载数据中...
      </div>
    );
  }

  return (
    <ComponentMethodRegistryContext.Provider value={{ registry: methodRegistry }}>
      <FormRegistryContext.Provider value={{ registry: formRegistry, activeFormId: getActiveFormId() }}>
        <div
          className="lc-page"
          data-page-id={schema.pageId}
          style={layoutStyle}
        >
          {rootChildren}
        </div>
      </FormRegistryContext.Provider>
    </ComponentMethodRegistryContext.Provider>
  );
}

// ========== 辅助函数 ==========

/** 解析组件布局样式 */
function resolveLayoutStyle(
  layout: ComponentNode['layout'],
  pageLayout: PageSchema['layout'],
): React.CSSProperties {
  if (!layout) return {};

  const style: React.CSSProperties = {};

  if (pageLayout.type === 'grid' && layout.col) {
    const columns = pageLayout.columns || 24;
    const span = layout.colSpan || 1;
    style.gridColumn = `${layout.col} / span ${span}`;
    if (layout.row) {
      style.gridRow = `${layout.row}`;
      if (layout.rowSpan) {
        style.gridRow = `${layout.row} / span ${layout.rowSpan}`;
      }
    }
  }

  if (layout.order !== undefined) style.order = layout.order;
  if (layout.flex) style.flex = layout.flex;
  if (layout.alignSelf) style.alignSelf = layout.alignSelf as any;

  return style;
}

/** 解析页面布局样式 */
function resolvePageLayoutStyle(layout: PageSchema['layout']): React.CSSProperties {
  const style: React.CSSProperties = {};

  if (layout.type === 'grid') {
    style.display = 'grid';
    style.gridTemplateColumns = `repeat(${layout.columns || 24}, 1fr)`;
    if (layout.gap) style.gap = `${layout.gap}px`;
  } else if (layout.type === 'flex') {
    style.display = 'flex';
    style.flexDirection = layout.vertical !== false ? 'column' : 'row';
    if (layout.wrap) style.flexWrap = 'wrap';
    if (layout.justify) style.justifyContent = layout.justify;
    if (layout.align) style.alignItems = layout.align;
    if (layout.gap) style.gap = `${layout.gap}px`;
  }

  return style;
}

/** 将事件处理器映射为 props */
function mapEventHandlersToProps(
  handlers: Record<string, Function>,
): Record<string, any> {
  const props: Record<string, any> = {};
  for (const [eventName, handler] of Object.entries(handlers)) {
    // onClick -> onClick, onChange -> onChange
    props[eventName] = handler;
  }
  return props;
}

/** 加载组件级数据源 */
async function loadComponentDataSource(
  dataSource: ComponentNode['dataSource'],
  context: RenderContext,
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!dataSource) {
    return { success: false, error: 'No data source configured' };
  }

  try {
    switch (dataSource.type) {
      case 'api': {
        if (!dataSource.api) {
          return { success: false, error: 'API config is required' };
        }

        const { url, method = 'GET', headers, params, dataPath } = dataSource.api;

        // 解析 URL 中的变量模板
        const resolvedUrl = resolveTemplate(url, context);

        // 解析参数中的变量
        const resolvedParams = params
          ? resolveTemplateParams(params, context)
          : undefined;

        // 发起请求（这里需要通过适配器）
        // 注意：这里简化处理，实际应该通过 actionContext.apiRequest
        const response = await fetch(resolvedUrl, {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          body: method !== 'GET' ? JSON.stringify(resolvedParams) : undefined,
        });
        const data = await response.json();

        // 提取指定路径的数据
        const result = dataPath ? extractDataByPath(data, dataPath) : data;

        return { success: true, data };
      }
      default:
        return { success: false, error: `Unknown data source type: ${dataSource.type}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

/** 解析模板字符串 */
function resolveTemplate(template: string, context: RenderContext): any {
  if (typeof template !== 'string') {
    return template;
  }

  // 处理 ${xxx} 语法
  if (template.includes('${')) {
    return expressionEngine.safeEvaluate(template, context);
  }

  // 处理 $xxx.yyy 语法
  if (template.startsWith('$')) {
    const parts = template.slice(1).split('.');
    let value: any = context;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }

  return template;
}

/** 解析模板参数 */
function resolveTemplateParams(
  params: Record<string, any>,
  context: RenderContext,
): Record<string, any> {
  const resolved: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    resolved[key] = resolveTemplate(String(value), context);
  }
  return resolved;
}

/** 按路径提取数据 */
function extractDataByPath(data: any, path: string): any {
  const parts = path.split('.');
  let current = data;
  for (const part of parts) {
    if (current == null) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

/** 从 props 中提取变量依赖 */
function extractDependenciesFromProps(props: Record<string, any>): string[] {
  const dependencies: string[] = [];

  for (const value of Object.values(props)) {
    if (typeof value === 'string') {
      // 提取 $xxx.yyy 格式的变量引用
      const variableMatches = value.matchAll(/\$([a-zA-Z_]\w*(?:\.\w+)*)/g);
      for (const match of variableMatches) {
        dependencies.push('$' + match[1]);
      }

      // 提取 ${xxx} 格式的表达式引用
      const expressionMatches = value.matchAll(/\$\{([^}]+)\}/g);
      for (const match of expressionMatches) {
        // 从表达式中提取变量引用
        const expr = match[1];
        const exprVarMatches = expr.matchAll(/\$([a-zA-Z_]\w*(?:\.\w+)*)/g);
        for (const exprMatch of exprVarMatches) {
          dependencies.push('$' + exprMatch[1]);
        }
      }
    }
  }

  return [...new Set(dependencies)];
}

