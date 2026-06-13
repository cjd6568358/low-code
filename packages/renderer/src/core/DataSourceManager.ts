import type { DataSourceConfig, ApiConfig, StaticConfig, ComputedConfig } from '@low-code/shared';
import type { DefaultExpressionEngine } from '@low-code/computation';

/** 数据源状态 */
export interface DataSourceState {
  data: any;
  loading: boolean;
  error: Error | null;
  loadedAt: number | null;
}

/** 数据源管理器回调 */
export interface DataSourceManagerCallbacks {
  apiRequest: (config: any) => Promise<any>;
  onUpdate: (id: string, state: DataSourceState) => void;
}

/**
 * 数据源管理器
 * 管理页面级 API 数据源的声明、加载、缓存
 *
 * 文档定义 DataSourceConfig：
 * - type: 'api' | 'static' | 'computed'
 * - autoLoad: 页面加载时自动请求
 * - dependencies: 依赖的其他数据源 ID
 */
export class DataSourceManager {
  private sources = new Map<string, DataSourceConfig>();
  private states = new Map<string, DataSourceState>();
  private callbacks: DataSourceManagerCallbacks;
  private expressionEngine: DefaultExpressionEngine;

  constructor(
    expressionEngine: DefaultExpressionEngine,
    callbacks: DataSourceManagerCallbacks,
  ) {
    this.expressionEngine = expressionEngine;
    this.callbacks = callbacks;
  }

  /**
   * 初始化数据源配置
   */
  init(configs: DataSourceConfig[]): void {
    this.sources.clear();
    this.states.clear();

    for (const config of configs) {
      this.sources.set(config.id, config);
      this.states.set(config.id, {
        data: null,
        loading: false,
        error: null,
        loadedAt: null,
      });
    }
  }

  /**
   * 自动加载所有 autoLoad=true 的数据源
   * 按依赖顺序加载
   */
  async autoLoad(context: Record<string, any>): Promise<void> {
    const autoLoadSources = Array.from(this.sources.values())
      .filter((s) => s.autoLoad);

    // 按依赖拓扑排序
    const ordered = this.topologicalSort(autoLoadSources);

    for (const source of ordered) {
      await this.load(source.id, context);
    }
  }

  /**
   * 加载单个数据源
   */
  async load(id: string, context: Record<string, any>): Promise<any> {
    const config = this.sources.get(id);
    if (!config) {
      console.warn(`DataSource "${id}" not found`);
      return null;
    }

    // 检查依赖是否已加载
    if (config.dependencies) {
      for (const depId of config.dependencies) {
        const depState = this.states.get(depId);
        if (!depState?.loadedAt) {
          console.warn(`DataSource "${id}" dependency "${depId}" not loaded yet`);
          return null;
        }
      }
    }

    // 设置 loading 状态
    this.updateState(id, { loading: true, error: null });

    try {
      let data: any;

      switch (config.type) {
        case 'api':
          data = await this.loadApi(config.config as ApiConfig, context);
          break;
        case 'static':
          data = this.loadStatic(config.config as StaticConfig);
          break;
        case 'computed':
          data = this.loadComputed(config.config as ComputedConfig, context);
          break;
      }

      this.updateState(id, {
        data,
        loading: false,
        error: null,
        loadedAt: Date.now(),
      });

      return data;
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.updateState(id, {
        loading: false,
        error,
      });
      console.error(`DataSource "${id}" load failed:`, error);
      return null;
    }
  }

  /**
   * 刷新单个数据源
   */
  async refresh(id: string, context: Record<string, any>): Promise<any> {
    return this.load(id, context);
  }

  /**
   * 获取数据源状态
   */
  getState(id: string): DataSourceState | null {
    return this.states.get(id) || null;
  }

  /**
   * 获取所有数据源状态（用于 RenderContext.$api）
   */
  getAllStates(): Record<string, DataSourceState> {
    const result: Record<string, DataSourceState> = {};
    for (const [id, state] of this.states) {
      result[id] = state;
    }
    return result;
  }

  /**
   * 获取数据源数据
   */
  getData(id: string): any {
    return this.states.get(id)?.data ?? null;
  }

  /**
   * 加载 API 数据源
   */
  private async loadApi(config: ApiConfig, context: Record<string, any>): Promise<any> {
    // 解析参数中的变量引用
    const resolvedParams = this.resolveVariables(config.params, context);
    const resolvedData = this.resolveVariables(config.data, context);
    const resolvedHeaders = this.resolveVariables(config.headers, context);

    const response = await this.callbacks.apiRequest({
      url: config.url,
      method: config.method || 'GET',
      headers: resolvedHeaders,
      params: resolvedParams,
      data: resolvedData,
    });

    return response?.data ?? response;
  }

  /**
   * 加载静态数据源
   */
  private loadStatic(config: StaticConfig): any {
    return config.data;
  }

  /**
   * 加载计算数据源
   */
  private loadComputed(config: ComputedConfig, context: Record<string, any>): any {
    return this.expressionEngine.safeEvaluate(config.expression, context);
  }

  /**
   * 解析参数中的变量引用
   */
  private resolveVariables(
    params: Record<string, any> | undefined,
    context: Record<string, any>,
  ): Record<string, any> | undefined {
    if (!params) return undefined;

    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        resolved[key] = this.expressionEngine.safeEvaluate(value, context);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  /**
   * 更新数据源状态
   */
  private updateState(id: string, changes: Partial<DataSourceState>): void {
    const current = this.states.get(id);
    if (!current) return;

    const updated = { ...current, ...changes };
    this.states.set(id, updated);
    this.callbacks.onUpdate(id, updated);
  }

  /**
   * 按依赖拓扑排序
   */
  private topologicalSort(sources: DataSourceConfig[]): DataSourceConfig[] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, Set<string>>();
    const sourceMap = new Map<string, DataSourceConfig>();

    for (const source of sources) {
      sourceMap.set(source.id, source);
      inDegree.set(source.id, 0);
      adjacency.set(source.id, new Set());
    }

    for (const source of sources) {
      if (source.dependencies) {
        for (const depId of source.dependencies) {
          if (sourceMap.has(depId)) {
            adjacency.get(depId)!.add(source.id);
            inDegree.set(source.id, (inDegree.get(source.id) || 0) + 1);
          }
        }
      }
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const sorted: DataSourceConfig[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      sorted.push(sourceMap.get(id)!);

      const neighbors = adjacency.get(id);
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
    if (sorted.length < sources.length) {
      console.warn('Circular dependency detected in data sources');
      for (const source of sources) {
        if (!sorted.find((s) => s.id === source.id)) {
          sorted.push(source);
        }
      }
    }

    return sorted;
  }
}
