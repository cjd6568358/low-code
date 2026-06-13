import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
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
import { ServerVariableResolver } from './ServerVariableResolver';
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
  } = config;

  // 引擎实例（稳定引用）
  const bindingResolver = useMemo(
    () => new DataBindingResolver(expressionEngine),
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

  // 新增：服务端变量解析器
  const serverVariableResolver = useMemo(
    () => new ServerVariableResolver(expressionEngine),
    [],
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

    // 注册数据源依赖
    if (schema.dataSource) {
      for (const ds of schema.dataSource) {
        const dependencies = ds.dependencies || [];
        dependencyGraph.registerDataSource(ds.id, dependencies);
      }
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

  // 组件级数据源缓存
  const [componentDataSourceCache, setComponentDataSourceCache] = useState<Map<string, any>>(new Map());

  // 加载组件级数据源
  useEffect(() => {
    const loadAllComponentDataSources = async () => {
      const newCache = new Map<string, any>();

      for (const component of schema.components) {
        if (component.dataSource) {
          const result = await loadComponentDataSource(component.dataSource, context);
          if (result.success) {
            newCache.set(component.id, result.data);
          }
        }
      }

      setComponentDataSourceCache(newCache);
    };

    loadAllComponentDataSources();
  }, [schema.components, context]);

  // 渲染动作上下文
  const actionContext = useMemo<ActionContext>(
    () => ({
      renderContext: context,
      setFormValue: onFormValueChange,
      getFormValue: (field: string) => context.$form?.[field],
      navigate: (url, params) => adapter.navigate(url, params),
      apiRequest: (config) => adapter.api.request(config),
      showModal: (modalId: string, data?: any) => modalStack.open(modalId, data),
      closeModal: (modalId: string, result?: any) => modalStack.close(modalId, result),
      refreshComponent: async (componentId: string, propNames?: string[]) => {
        if (propNames) {
          return componentRefreshManager.refreshProps(componentId, propNames, context);
        }
        return componentRefreshManager.refreshAll(componentId, context);
      },
      refreshWithDependencyOrder: async (componentIds: string[]) => {
        return componentRefreshManager.refreshWithDependencyOrder(componentIds, context);
      },
      analyzeChangeImpact: (changedPaths: Set<string>) => {
        return dependencyGraph.analyzeChangeImpact(changedPaths);
      },
    }),
    [context, adapter, onFormValueChange, modalStack, componentRefreshManager, dependencyGraph],
  );

  // 渲染单个组件节点
  const renderNode = useCallback(
    (node: ComponentNode): React.ReactNode => {
      // 1. 条件规则评估（含声明式权限检查）
      const ruleResult = conditionEngine.evaluateComponent(
        node.id,
        node.visible,
        context,
        node.permission,
      );
      if (!ruleResult.visible) return null;

      // 2. 解析 props（数据绑定）
      let resolvedProps = bindingResolver.resolveProps(node.props, context);

      // 2.1 处理组件级数据源（从缓存中获取）
      const cachedDataSource = componentDataSourceCache.get(node.id);
      if (cachedDataSource && node.dataSource) {
        resolvedProps[node.dataSource.targetProp] = cachedDataSource;
      }

      // 3. 合并规则设置的属性
      if (ruleResult.setProps[node.id]) {
        resolvedProps = { ...resolvedProps, ...ruleResult.setProps[node.id] };
      }

      // 4. 合并规则设置的值
      if (ruleResult.setValues[node.id] !== undefined) {
        resolvedProps.value = ruleResult.setValues[node.id];
      }

      // 5. 事件编译
      const eventHandlers = node.events
        ? eventCompiler.compileEvents(node.events, actionContext)
        : {};

      // 6. 布局样式
      const layoutStyle = resolveLayoutStyle(node.layout, schema.layout);

      // 7. 组件解析
      let componentType = node.type;
      let isCard = false;

      // 自定义卡片处理
      if (node.type.startsWith('card:')) {
        isCard = true;
        componentType = 'card';
      }

      const registration = registry.resolve(node.type);
      if (!registration && !isCard) {
        console.warn(`Component type "${node.type}" not found in registry`);
        return (
          <div key={node.id} data-component-id={node.id} style={layoutStyle}>
            <span style={{ color: '#999' }}>未找到组件: {node.type}</span>
          </div>
        );
      }

      // 8. 获取实现组件
      let ComponentImpl: React.ComponentType<any> | null = null;
      if (!isCard) {
        ComponentImpl = adapter.resolveComponent(
          componentType,
          registration!.library || 'default',
        );
      }

      if (!ComponentImpl) {
        // 使用默认的 div 容器
        ComponentImpl = 'div' as any;
      }

      // 9. 渲染子组件
      const children = node.children || [];
      const childElements = children
        .map((childId) => componentMap.get(childId))
        .filter(Boolean)
        .map((child) => renderNode(child!));

      // 10. 合并事件处理器到 props
      const finalProps: Record<string, any> = {
        ...resolvedProps,
        ...mapEventHandlersToProps(eventHandlers),
        'data-component-id': node.id,
        style: { ...resolvedProps.style, ...layoutStyle },
        disabled: ruleResult.disabled || resolvedProps.disabled,
        key: node.id,
      };

      return React.createElement(
        ComponentImpl!,
        finalProps,
        childElements.length > 0 ? childElements : resolvedProps.children,
      );
    },
    [
      componentMap,
      context,
      schema.layout,
      conditionEngine,
      bindingResolver,
      eventCompiler,
      actionContext,
      registry,
      adapter,
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

  return (
    <div
      className="lc-page"
      data-page-id={schema.pageId}
      style={layoutStyle}
    >
      {rootChildren}
    </div>
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
    style.flexDirection = layout.direction || 'row';
    if (layout.wrap) style.flexWrap = 'wrap';
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
      case 'server-variable': {
        // 服务端变量类型需要通过 ServerVariableResolver 解析
        // 这里简化处理，实际应该使用 ServerVariableResolver
        return { success: false, error: 'Server variable type not implemented in this context' };
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
