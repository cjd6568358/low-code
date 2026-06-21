import type { DataSourceConfig } from '@low-code/shared';
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
  onUpdate: (id: string, state: DataSourceState) => void;
}

/**
 * 数据源管理器
 * 管理页面级数据源的声明、加载、缓存
 *
 * 所有数据源统一为表达式模式：
 * - expression: JavaScript 表达式，支持 $fetch/$table/$data 等环境变量
 * - 配置了即自动加载（页面加载时执行）
 * - 按依赖拓扑排序执行
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
   * 自动加载所有数据源（配置了就一定加载）
   * 按依赖拓扑排序执行
   */
  async autoLoad(context: Record<string, any>): Promise<void> {
    const allSources = Array.from(this.sources.values());

    // 按依赖拓扑排序
    const ordered = this.topologicalSort(allSources);

    for (const source of ordered) {
      await this.load(source.id, context);
    }
  }

  /**
   * 加载单个数据源（执行表达式）
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
      // 统一使用表达式引擎执行
      const data = await this.expressionEngine.evaluateAsync(config.expression, context);

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
   * 获取所有数据源状态（用于 RenderContext.$data）
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
