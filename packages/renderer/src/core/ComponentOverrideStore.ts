import { shallowEqual } from '../utils/shallowEqual';

/** 空 props 常量，避免每次创建新对象 */
const EMPTY_PROPS: Record<string, any> = {};

type Listener = () => void;

/**
 * 组件属性覆盖外部存储
 *
 * 替代 useState<Record<string, Record<string, any>>>，
 * 支持 per-component 粒度的 useSyncExternalStore 订阅，
 * 避免单个组件 setValues 导致整棵树 re-render。
 */
export class ComponentOverrideStore {
  private overrides = new Map<string, Record<string, any>>();
  private listeners = new Set<Listener>();
  /** 快照缓存：保证同一个 componentId 返回稳定引用 */
  private snapshotCache = new Map<string, Record<string, any>>();

  /** 订阅变更（useSyncExternalStore 要求的签名） */
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  /** 获取单个组件的覆盖 props（稳定引用） */
  getOverrides = (componentId: string): Record<string, any> => {
    const current = this.overrides.get(componentId) ?? EMPTY_PROPS;
    const cached = this.snapshotCache.get(componentId);
    // 引用相同或值相同都返回缓存，保证 snapshot 稳定
    if (cached === current) return cached;
    if (cached && shallowEqual(cached, current)) {
      this.snapshotCache.set(componentId, cached);
      return cached;
    }
    this.snapshotCache.set(componentId, current);
    return current;
  };

  /** 设置单个组件的单个属性 */
  setProp(componentId: string, propName: string, value: any): void {
    const current = this.overrides.get(componentId) ?? {};
    if (current[propName] === value) return; // 值未变，跳过
    this.overrides.set(componentId, { ...current, [propName]: value });
    this.snapshotCache.delete(componentId); // 清除缓存，下次 getOverrides 重建
    this.emit();
  }

  /** 批量设置单个组件的多个属性 */
  setProps(componentId: string, props: Record<string, any>): void {
    const current = this.overrides.get(componentId) ?? {};
    this.overrides.set(componentId, { ...current, ...props });
    this.snapshotCache.delete(componentId);
    this.emit();
  }

  /** 清空所有覆盖 */
  clear(): void {
    if (this.overrides.size === 0) return;
    this.overrides.clear();
    this.snapshotCache.clear();
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
