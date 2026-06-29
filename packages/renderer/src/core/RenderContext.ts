/**
 * RenderContext — 运行时环境变量上下文构建器
 *
 * 负责构建页面运行时的环境变量上下文，包括：
 * - $user: 当前登录用户信息
 * - $platform: 平台标识
 * - $route: 路由信息
 * - $component: 页面组件实例状态
 * - $data: 页面级数据源聚合
 * - $table: 服务端表查询代理（惰性求值）
 * - $computation: 运算引擎代理
 * - $fetch: 请求代理
 * - $workflow: 流程上下文
 */

import type {
  EnvUserInfo,
  PlatformInfo,
  RouteInfo,
  ComponentState,
  DataSourceItem,
  ServerVariableProxy,
  ComputationEngine,
  FetchProxy,
  WorkflowContext,
  EnvironmentContext,
} from '@low-code/shared';
import { createQueryProxy } from './QueryProxy';

/** 认证服务接口 */
export interface AuthService {
  getCurrentUser(): Promise<EnvUserInfo>;
}

/** 平台适配器接口 */
export interface PlatformAdapter {
  getPlatform(): PlatformInfo;
}

/** 路由服务接口 */
export interface RouterService {
  getCurrentRoute(): RouteInfo;
}

/** 数据源管理器接口 */
export interface DataSourceManager {
  /** 获取所有数据源的当前值 */
  getAllDataSources(): Record<string, DataSourceItem>;
  /** 监听数据源变更 */
  onDataChange(callback: (key: string, data: DataSourceItem) => void): () => void;
}

/** 服务端变量解析器接口 */
export interface ServerVariableResolver {
  /** 创建服务端变量代理 */
  createProxy(appId?: string): ServerVariableProxy;
}

/** 运算引擎接口 */
export interface ComputationEngineService {
  /** 获取运算引擎实例 */
  getEngine(): ComputationEngine;
}

/** 请求服务接口 */
export interface FetchService {
  /** 获取请求代理 */
  getProxy(): FetchProxy;
}

/** 流程服务接口 */
export interface WorkflowService {
  /** 获取当前流程上下文 */
  getWorkflowContext(): WorkflowContext | null;
}

/**
 * RenderContext 构建器
 */
export class RenderContextBuilder {
  private authService: AuthService;
  private platformAdapter: PlatformAdapter;
  private routerService: RouterService;
  private dataSourceManager: DataSourceManager;
  private serverVariableResolver: ServerVariableResolver;
  private computationEngineService: ComputationEngineService;
  private fetchService: FetchService;
  private workflowService?: WorkflowService;

  /** 缓存的用户信息 */
  private cachedUser: EnvUserInfo | null = null;

  /** 组件状态注册表 */
  private componentStates = new Map<string, ComponentState>();

  /** 数据源变更监听器 */
  private unsubscribeDataChange?: () => void;

  constructor(params: {
    authService: AuthService;
    platformAdapter: PlatformAdapter;
    routerService: RouterService;
    dataSourceManager: DataSourceManager;
    serverVariableResolver: ServerVariableResolver;
    computationEngineService: ComputationEngineService;
    fetchService: FetchService;
    workflowService?: WorkflowService;
  }) {
    this.authService = params.authService;
    this.platformAdapter = params.platformAdapter;
    this.routerService = params.routerService;
    this.dataSourceManager = params.dataSourceManager;
    this.serverVariableResolver = params.serverVariableResolver;
    this.computationEngineService = params.computationEngineService;
    this.fetchService = params.fetchService;
    this.workflowService = params.workflowService;
  }

  /**
   * 构建完整的运行时上下文
   */
  async build(): Promise<EnvironmentContext> {
    // 并行加载异步数据
    const [user, data] = await Promise.all([
      this.loadUser(),
      this.loadDataSources(),
    ]);

    this.cachedUser = user;

    return {
      $user: user,
      $platform: this.platformAdapter.getPlatform(),
      $route: this.routerService.getCurrentRoute(),
      $component: this.getComponentStates(),
      $data: data,
      $table: this.serverVariableResolver.createProxy(),
      $computation: this.computationEngineService.getEngine(),
      $fetch: this.fetchService.getProxy(),
      $workflow: this.workflowService?.getWorkflowContext() ?? undefined,
    };
  }

  /**
   * 加载用户信息
   */
  private async loadUser(): Promise<EnvUserInfo> {
    try {
      return await this.authService.getCurrentUser();
    } catch (error) {
      console.error('[RenderContext] Failed to load user:', error);
      return {
        id: '',
        name: '未登录',
        roles: [],
        department: '',
        departmentName: '',
        position: '',
      };
    }
  }

  /**
   * 加载所有数据源
   */
  private async loadDataSources(): Promise<Record<string, DataSourceItem>> {
    return this.dataSourceManager.getAllDataSources();
  }

  /**
   * 获取组件状态（转换为普通对象）
   */
  private getComponentStates(): Record<string, ComponentState> {
    const states: Record<string, ComponentState> = {};
    for (const [id, state] of this.componentStates) {
      states[id] = state;
    }
    return states;
  }

  /**
   * 注册组件状态
   */
  registerComponent(componentId: string, initialState: ComponentState): void {
    this.componentStates.set(componentId, initialState);
  }

  /**
   * 更新组件状态
   */
  updateComponentState(componentId: string, changes: Partial<ComponentState>): void {
    const current = this.componentStates.get(componentId);
    if (current) {
      this.componentStates.set(componentId, { ...current, ...changes });
    }
  }

  /**
   * 注销组件
   */
  unregisterComponent(componentId: string): void {
    this.componentStates.delete(componentId);
  }

  /**
   * 启动数据源变更监听
   */
  startDataChangeListening(callback: (context: EnvironmentContext) => void): void {
    this.unsubscribeDataChange = this.dataSourceManager.onDataChange(async () => {
      // 数据源变更时重新构建上下文
      const newContext = await this.build();
      callback(newContext);
    });
  }

  /**
   * 停止数据源变更监听
   */
  stopDataChangeListening(): void {
    this.unsubscribeDataChange?.();
    this.unsubscribeDataChange = undefined;
  }

  /**
   * 获取缓存的用户信息
   */
  getCachedUser(): EnvUserInfo | null {
    return this.cachedUser;
  }

  /**
   * 刷新用户信息
   */
  async refreshUser(): Promise<EnvUserInfo> {
    this.cachedUser = await this.loadUser();
    return this.cachedUser;
  }
}

/**
 * 创建默认的 RenderContext 构建器（用于测试或简单场景）
 */
export function createDefaultRenderContextBuilder(): RenderContextBuilder {
  return new RenderContextBuilder({
    authService: {
      async getCurrentUser() {
        return {
          id: 'test-user',
          name: '测试用户',
          roles: ['admin'],
          department: 'dept-001',
          departmentName: '技术部',
          position: '工程师',
        };
      },
    },
    platformAdapter: {
      getPlatform() {
        return {
          web: true,
          mobile: false,
          miniApp: false,
        };
      },
    },
    routerService: {
      getCurrentRoute() {
        return {
          params: {},
          query: {},
          path: window.location.pathname,
        };
      },
    },
    dataSourceManager: {
      getAllDataSources() {
        return {};
      },
      onDataChange() {
        return () => {};
      },
    },
    serverVariableResolver: {
      createProxy(appId?: string) {
        const apiRequest = async (config: { url: string; method: string; data?: any }) => {
          const response = await fetch(config.url, {
            method: config.method,
            headers: { 'Content-Type': 'application/json' },
            body: config.data ? JSON.stringify(config.data) : undefined,
          });
          if (!response.ok) throw new Error(`Request failed: ${response.statusText}`);
          return response.json();
        };
        return new Proxy({} as ServerVariableProxy, {
          get(_target, prop) {
            if (typeof prop === 'string') {
              return createQueryProxy(prop, apiRequest, appId);
            }
            return undefined;
          },
        });
      },
    },
    computationEngineService: {
      getEngine() {
        return {
          async evaluate(expression: string, context?: Record<string, any>) {
            // 简单的表达式求值（生产环境应使用安全的沙箱）
            try {
              const fn = new Function(...Object.keys(context || {}), `return ${expression}`);
              return fn(...Object.values(context || {}));
            } catch {
              return undefined;
            }
          },
        };
      },
    },
    fetchService: {
      getProxy() {
        return {
          async get(url: string, config?: any) {
            const response = await fetch(url, { method: 'GET', ...config });
            return response.json();
          },
          async post(url: string, data?: any, config?: any) {
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
              ...config,
            });
            return response.json();
          },
          async put(url: string, data?: any, config?: any) {
            const response = await fetch(url, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
              ...config,
            });
            return response.json();
          },
          async delete(url: string, config?: any) {
            const response = await fetch(url, { method: 'DELETE', ...config });
            return response.json();
          },
        };
      },
    },
  });
}


