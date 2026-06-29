import type { ComponentNode, ComponentDataSource, RenderContext } from '@low-code/shared';
import type { DefaultExpressionEngine } from '@low-code/computation';
import type { DataBindingResolver } from './DataBindingResolver';

/** 组件刷新结果 */
export interface ComponentRefreshResult {
  /** 组件 ID */
  componentId: string;
  /** 刷新的属性 */
  refreshedProps: Record<string, any>;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

/** 组件刷新管理器回调 */
export interface ComponentRefreshManagerCallbacks {
  /** API 请求函数 */
  apiRequest: (config: any) => Promise<any>;
  /** 组件属性更新回调 */
  onComponentPropsUpdate: (componentId: string, props: Record<string, any>) => void;
}

/**
 * 组件级刷新管理器
 * 支持刷新组件的所有属性或指定属性
 * 复用 DataBindingResolver 进行变量解析
 */
export class ComponentRefreshManager {
  private componentMap = new Map<string, ComponentNode>();
  private expressionEngine: DefaultExpressionEngine;
  private bindingResolver: DataBindingResolver;
  private callbacks: ComponentRefreshManagerCallbacks;

  constructor(
    expressionEngine: DefaultExpressionEngine,
    bindingResolver: DataBindingResolver,
    callbacks: ComponentRefreshManagerCallbacks,
  ) {
    this.expressionEngine = expressionEngine;
    this.bindingResolver = bindingResolver;
    this.callbacks = callbacks;
  }

  /**
   * 初始化组件映射
   */
  init(components: ComponentNode[]): void {
    this.componentMap.clear();
    for (const component of components) {
      this.componentMap.set(component.id, component);
    }
  }

  /**
   * 刷新组件的所有属性
   * @param componentId 组件 ID
   * @param context 运行时上下文
   * @returns 刷新结果
   */
  async refreshAll(componentId: string, context: RenderContext): Promise<ComponentRefreshResult> {
    const component = this.componentMap.get(componentId);
    if (!component) {
      return {
        componentId,
        refreshedProps: {},
        success: false,
        error: `Component "${componentId}" not found`,
      };
    }

    try {
      // 1. 重新解析所有 props（变量绑定 + 表达式，支持 async）
      const resolvedProps = await this.bindingResolver.resolvePropsAsync(component.props, context);

      // 2. 如果有组件级数据源，重新加载
      if (component.dataSource) {
        const dataSourceResult = await this.loadComponentDataSource(
          component.dataSource,
          context,
        );

        if (dataSourceResult.success) {
          // 将数据源结果注入到目标属性
          resolvedProps[component.dataSource.targetProp] = dataSourceResult.data;
        }
      }

      // 3. 触发组件属性更新
      this.callbacks.onComponentPropsUpdate(componentId, resolvedProps);

      return {
        componentId,
        refreshedProps: resolvedProps,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        componentId,
        refreshedProps: {},
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 刷新组件的指定属性
   * @param componentId 组件 ID
   * @param propNames 要刷新的属性名列表
   * @param context 运行时上下文
   * @returns 刷新结果
   */
  async refreshProps(
    componentId: string,
    propNames: string[],
    context: RenderContext,
  ): Promise<ComponentRefreshResult> {
    const component = this.componentMap.get(componentId);
    if (!component) {
      return {
        componentId,
        refreshedProps: {},
        success: false,
        error: `Component "${componentId}" not found`,
      };
    }

    try {
      // 1. 只解析指定的 props
      const partialProps: Record<string, any> = {};
      for (const propName of propNames) {
        if (propName in component.props) {
          partialProps[propName] = component.props[propName];
        }
      }

      const resolvedProps = await this.bindingResolver.resolvePropsAsync(partialProps, context);

      // 2. 如果目标属性在刷新列表中，且有数据源，重新加载
      if (
        component.dataSource &&
        propNames.includes(component.dataSource.targetProp)
      ) {
        const dataSourceResult = await this.loadComponentDataSource(
          component.dataSource,
          context,
        );

        if (dataSourceResult.success) {
          resolvedProps[component.dataSource.targetProp] = dataSourceResult.data;
        }
      }

      // 3. 触发组件属性更新（只更新指定的属性）
      this.callbacks.onComponentPropsUpdate(componentId, resolvedProps);

      return {
        componentId,
        refreshedProps: resolvedProps,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        componentId,
        refreshedProps: {},
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 批量刷新多个组件
   * @param componentIds 组件 ID 列表
   * @param context 运行时上下文
   * @returns 刷新结果列表
   */
  async refreshBatch(
    componentIds: string[],
    context: RenderContext,
  ): Promise<ComponentRefreshResult[]> {
    const results: ComponentRefreshResult[] = [];

    for (const componentId of componentIds) {
      const result = await this.refreshAll(componentId, context);
      results.push(result);
    }

    return results;
  }

  /**
   * 按依赖顺序刷新组件
   * @param componentIds 组件 ID 列表
   * @param context 运行时上下文
   * @returns 刷新结果列表（按依赖顺序）
   */
  async refreshWithDependencyOrder(
    componentIds: string[],
    context: RenderContext,
  ): Promise<ComponentRefreshResult[]> {
    // 1. 构建依赖图
    const dependencyGraph = this.buildDependencyGraph(componentIds, context);

    // 2. 拓扑排序
    const orderedIds = this.topologicalSort(dependencyGraph);

    // 3. 按顺序刷新
    const results: ComponentRefreshResult[] = [];
    for (const componentId of orderedIds) {
      if (componentIds.includes(componentId)) {
        const result = await this.refreshAll(componentId, context);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 加载组件级数据源
   */
  private async loadComponentDataSource(
    dataSource: ComponentDataSource,
    context: RenderContext,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      switch (dataSource.type) {
        case 'api':
          return await this.loadApiDataSource(dataSource, context);
        default:
          return { success: false, error: `Unknown data source type: ${dataSource.type}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 加载 API 类型的数据源
   */
  private async loadApiDataSource(
    dataSource: ComponentDataSource,
    context: RenderContext,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!dataSource.api) {
      return { success: false, error: 'API config is required for api data source' };
    }

    const { url, method = 'GET', headers, params, dataPath } = dataSource.api;

    // 解析 URL 中的变量模板
    const resolvedUrl = this.resolveTemplate(url, context);

    // 解析参数中的变量
    const resolvedParams = params
      ? this.resolveTemplateParams(params, context)
      : undefined;

    // 发起请求
    const response = await this.callbacks.apiRequest({
      url: resolvedUrl,
      method,
      headers,
      params: resolvedParams,
    });

    // 提取指定路径的数据
    const data = dataPath ? this.extractDataByPath(response, dataPath) : response;

    return { success: true, data };
  }

  /**
   * 解析模板字符串（如 ${xxx} 或 $xxx）
   */
  private resolveTemplate(template: string, context: RenderContext): any {
    if (typeof template !== 'string') {
      return template;
    }

    // 处理 ${xxx} 语法
    if (template.includes('${')) {
      return this.expressionEngine.safeEvaluate(template, context);
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

  /**
   * 解析模板参数
   */
  private resolveTemplateParams(
    params: Record<string, any>,
    context: RenderContext,
  ): Record<string, any> {
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(params)) {
      resolved[key] = this.resolveTemplate(String(value), context);
    }
    return resolved;
  }

  /**
   * 按路径提取数据
   */
  private extractDataByPath(data: any, path: string): any {
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

  /**
   * 构建组件依赖图
   */
  private buildDependencyGraph(
    componentIds: string[],
    context: RenderContext,
  ): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const componentId of componentIds) {
      const component = this.componentMap.get(componentId);
      if (!component) continue;

      const deps = new Set<string>();

      // 分析 props 中的变量引用
      for (const value of Object.values(component.props)) {
        if (typeof value === 'string') {
          // 提取变量引用（如 $components.xxx.value）
          const refs = this.extractVariableReferences(value);
          for (const ref of refs) {
            // 检查是否引用了其他组件
            const componentMatch = ref.match(/^\$components\.(\w+)\./);
            if (componentMatch) {
              deps.add(componentMatch[1]);
            }
          }
        }
      }

      // 分析数据源依赖
      if (component.dataSource?.dependencies) {
        for (const dep of component.dataSource.dependencies) {
          const componentMatch = dep.match(/^\$components\.(\w+)\./);
          if (componentMatch) {
            deps.add(componentMatch[1]);
          }
        }
      }

      graph.set(componentId, deps);
    }

    return graph;
  }

  /**
   * 提取字符串中的变量引用
   */
  private extractVariableReferences(value: string): string[] {
    const refs: string[] = [];

    // 匹配 ${xxx} 语法
    const expressionMatches = value.matchAll(/\$\{([^}]+)\}/g);
    for (const match of expressionMatches) {
      refs.push(match[1]);
    }

    // 匹配 $xxx.yyy 语法
    const variableMatches = value.matchAll(/\$([a-zA-Z_]\w*(?:\.\w+)*)/g);
    for (const match of variableMatches) {
      refs.push('$' + match[1]);
    }

    return refs;
  }

  /**
   * 拓扑排序（Kahn 算法）
   */
  private topologicalSort(graph: Map<string, Set<string>>): string[] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, Set<string>>();

    // 初始化
    for (const [node, deps] of graph) {
      if (!inDegree.has(node)) {
        inDegree.set(node, 0);
      }
      if (!adjacency.has(node)) {
        adjacency.set(node, new Set());
      }

      for (const dep of deps) {
        // dep -> node 的边
        if (!adjacency.has(dep)) {
          adjacency.set(dep, new Set());
        }
        adjacency.get(dep)!.add(node);
        inDegree.set(node, (inDegree.get(node) || 0) + 1);
      }
    }

    // 找到所有入度为 0 的节点
    const queue: string[] = [];
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      sorted.push(node);

      const neighbors = adjacency.get(node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          const newDegree = (inDegree.get(neighbor) || 1) - 1;
          inDegree.set(neighbor, newDegree);
          if (newDegree === 0) {
            queue.push(neighbor);
          }
        }
      }
    }

    // 检测循环依赖
    if (sorted.length < graph.size) {
      console.warn('Circular dependency detected in component refresh order');
      // 添加剩余节点
      for (const node of graph.keys()) {
        if (!sorted.includes(node)) {
          sorted.push(node);
        }
      }
    }

    return sorted;
  }
}
