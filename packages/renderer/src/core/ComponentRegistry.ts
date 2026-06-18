import type {
  ComponentRegistry as IComponentRegistry,
  ComponentRegistration,
  ComponentLibrary,
} from '@low-code/shared';
import type React from 'react';

/** 带组件实现的注册表 — 在 IComponentRegistry 基础上增加组件解析能力 */
export class ComponentRegistryImpl implements IComponentRegistry {
  private entries = new Map<string, ComponentRegistration>();
  private libraryEntries = new Map<string, Map<string, ComponentRegistration>>();
  /** 组件实现映射（type → React 组件） */
  private componentImpls = new Map<string, React.ComponentType<any>>();

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
    this.componentImpls.clear();
    this.registerAll(entries);
  }

  /**
   * 注册组件库 — 一次性注册库内所有组件
   *
   * @param library 组件库描述
   * @param components type → React 组件实现映射
   * @param schemas type → JSON Schema 映射
   */
  registerLibrary(
    library: ComponentLibrary,
    components: Record<string, React.ComponentType<any>>,
    schemas: Record<string, Record<string, any>>,
  ): void {
    // 注册组件实现
    for (const [type, impl] of Object.entries(components)) {
      this.componentImpls.set(type, impl);
    }

    // 注册元数据
    const categoryMap = library.categoryMap as Record<string, { category: string; name: string }>;
    for (const [type, meta] of Object.entries(categoryMap)) {
      const schema = schemas[type];
      if (!schema) continue;

      this.register({
        type,
        name: meta.name,
        category: meta.category as any,
        component: type,
        propsSchema: schema as any,
        acceptsChildren: library.containerTypes.has(type),
        library: library.name,
      });
    }
  }

  /**
   * 解析组件实现 — 返回实际的 React 组件
   *
   * @param type 组件类型标识
   * @returns React 组件，未找到返回 null
   */
  resolveComponent(type: string): React.ComponentType<any> | null {
    return this.componentImpls.get(type) || null;
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
