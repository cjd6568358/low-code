/**
 * ReactiveEnvContext — 响应式环境变量上下文
 *
 * 核心机制：
 * - 所有环境变量存储在稳定的 store 中
 * - set(path, value) 更新变量，自动通知依赖方
 * - subscribe(listener) 订阅变更
 * - 使用 DependencyGraph 精准通知依赖组件
 *
 * 用于设计时和运行时的统一变量绑定解析
 */

import { dependencyGraph } from './DependencyGraph';

/** 变更监听器 */
type Listener = () => void;

/**
 * 响应式环境变量上下文
 */
export class ReactiveEnvContext {
  /** 变量存储（按根路径组织，如 $component、$data） */
  private store: Record<string, any>;

  /** 版本号（每次变更递增，用于 React memoization） */
  private version = 0;

  /** 变更监听器集合 */
  private listeners = new Set<Listener>();

  constructor(initialStore: Record<string, any>) {
    this.store = { ...initialStore };
  }

  /**
   * 获取变量值（支持 $component.xxx.value 路径）
   */
  get(path: string): any {
    if (!path) return undefined;

    const segments = path.split('.');
    const rootKey = segments[0]; // $component
    const restPath = segments.slice(1).join('.'); // xxx.value

    let current = this.store[rootKey];
    if (restPath === '') return current;

    for (const segment of restPath.split('.')) {
      if (current == null) return undefined;
      current = current[segment];
    }
    return current;
  }

  /**
   * 设置变量值，自动通知依赖方
   *
   * @param path 变量路径（如 "$component.数字输入_01.value" 或 "$data"）
   * @param value 新值
   */
  set(path: string, value: any): void {
    const segments = path.split('.');
    const rootKey = segments[0];
    const restPath = segments.slice(1).join('.');

    if (restPath === '') {
      // 直接设置根变量
      this.store[rootKey] = value;
    } else {
      // 设置嵌套路径
      this.store[rootKey] = this.setNested(this.store[rootKey] ?? {}, restPath, value);
    }

    this.version++;
    console.log(`[ReactiveEnvContext] set ${path}, version=${this.version}`);
    this.notify(path);
  }

  /**
   * 批量更新（单次通知）
   */
  batchUpdate(updates: Record<string, any>): void {
    for (const [path, value] of Object.entries(updates)) {
      const segments = path.split('.');
      const rootKey = segments[0];
      const restPath = segments.slice(1).join('.');

      if (restPath === '') {
        this.store[rootKey] = value;
      } else {
        this.store[rootKey] = this.setNested(this.store[rootKey] ?? {}, restPath, value);
      }
    }

    this.version++;
    // 批量通知
    for (const path of Object.keys(updates)) {
      this.notify(path);
    }
  }

  /**
   * 获取完整上下文对象（传给表达式引擎）
   * 返回稳定引用，内部通过 version 追踪变更
   */
  getContext(): Record<string, any> {
    return this.store;
  }

  /**
   * 获取当前版本号
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * 订阅变更（返回取消订阅函数）
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ─── 内部方法 ───

  /**
   * 通知变更
   * 1. 通过 DependencyGraph 精准通知依赖组件
   * 2. 通知所有全局监听器
   */
  private notify(changedPath: string): void {
    // 通过 DependencyGraph 精准通知
    dependencyGraph.notifyVariableChange(changedPath);

    // 通知所有全局监听器
    for (const listener of this.listeners) {
      listener();
    }
  }

  /**
   * 按路径设置嵌套值
   */
  private setNested(obj: any, path: string, value: any): any {
    const segments = path.split('.');
    const result = { ...obj };
    let current = result;

    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      current[segment] = { ...(current[segment] ?? {}) };
      current = current[segment];
    }

    current[segments[segments.length - 1]] = value;
    return result;
  }
}
