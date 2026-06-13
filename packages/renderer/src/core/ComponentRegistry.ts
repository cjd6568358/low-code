import type {
  ComponentRegistry as IComponentRegistry,
  ComponentRegistration,
} from '@low-code/shared';

export class ComponentRegistryImpl implements IComponentRegistry {
  private entries = new Map<string, ComponentRegistration>();
  private libraryEntries = new Map<string, Map<string, ComponentRegistration>>();

  register(entry: ComponentRegistration): void {
    this.entries.set(entry.type, entry);

    const library = entry.library || 'default';
    if (!this.libraryEntries.has(library)) {
      this.libraryEntries.set(library, new Map());
    }
    this.libraryEntries.get(library)!.set(entry.type, entry);
  }

  registerAll(entries: ComponentRegistration[]): void {
    for (const entry of entries) {
      this.register(entry);
    }
  }

  resolve(type: string): ComponentRegistration | null {
    return this.entries.get(type) || null;
  }

  list(): ComponentRegistration[] {
    return Array.from(this.entries.values());
  }

  listByCategory(category: string): ComponentRegistration[] {
    return this.list().filter((e) => e.category === category);
  }

  export(): ComponentRegistration[] {
    return this.list();
  }

  import(entries: ComponentRegistration[]): void {
    this.entries.clear();
    this.libraryEntries.clear();
    this.registerAll(entries);
  }

  /** 按组件库切换 */
  switchLibrary(library: string): void {
    const libEntries = this.libraryEntries.get(library);
    if (!libEntries) {
      console.warn(`Library "${library}" not found in registry`);
      return;
    }
    // 保留非库特定的注册项（如自定义卡片）
    const baseEntries = new Map<string, ComponentRegistration>();
    for (const [type, entry] of this.entries) {
      if (!entry.library || entry.library === 'default') {
        baseEntries.set(type, entry);
      }
    }
    this.entries.clear();
    // 加载库特定组件
    for (const [type, entry] of libEntries) {
      this.entries.set(type, entry);
    }
    // 恢复非库特定组件
    for (const [type, entry] of baseEntries) {
      if (!this.entries.has(type)) {
        this.entries.set(type, entry);
      }
    }
  }

  /** 查询已注册的组件库 */
  getLibraries(): string[] {
    return Array.from(this.libraryEntries.keys());
  }
}

/** 默认组件注册表实例 */
export const componentRegistry = new ComponentRegistryImpl();
