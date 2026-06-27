/**
 * BindingCache — 表达式结果缓存
 *
 * 模块级单例，供 useBindings 和 FormPreEvaluator 共享。
 * 表单预求值时写入缓存，子组件 useBindings 命中缓存直接复用，避免重复计算。
 */

/** 缓存条目 key 格式：`${componentId}.${propKey}` */
type CacheKey = string;

/** 缓存结果 */
interface CachedBinding {
  /** 求值结果 */
  value: any;
  /** 写入时间戳（用于调试） */
  timestamp: number;
}

class BindingCacheImpl {
  private cache = new Map<CacheKey, CachedBinding>();

  /**
   * 写入缓存
   */
  set(componentId: string, propKey: string, value: any): void {
    this.cache.set(`${componentId}.${propKey}`, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * 读取缓存
   * @returns 命中返回求值结果，未命中返回 undefined
   */
  get(componentId: string, propKey: string): any | undefined {
    const entry = this.cache.get(`${componentId}.${propKey}`);
    return entry?.value;
  }

  /**
   * 检查缓存是否命中
   */
  has(componentId: string, propKey: string): boolean {
    return this.cache.has(`${componentId}.${propKey}`);
  }

  /**
   * 批量写入
   */
  setAll(entries: Array<{ componentId: string; propKey: string; value: any }>): void {
    for (const { componentId, propKey, value } of entries) {
      this.set(componentId, propKey, value);
    }
  }

  /**
   * 清除指定组件的所有缓存
   */
  clearComponent(componentId: string): void {
    const prefix = `${componentId}.`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 清除全部缓存
   */
  clear(): void {
    this.cache.clear();
  }
}

/** 模块级单例 */
export const bindingCache = new BindingCacheImpl();
