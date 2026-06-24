/**
 * 依赖追踪器
 * 记录每个组件依赖的变量路径，变量变化时仅重渲染受影响的组件
 *
 * 文档描述：
 * "记录每个组件依赖的变量路径，变量变化时仅重渲染依赖组件"
 */
export class DependencyTracker {
  /** 组件 ID → 依赖的变量路径集合 */
  private componentDeps = new Map<string, Set<string>>();

  /** 变量路径 → 依赖该路径的组件 ID 集合（反向索引） */
  private pathToComponents = new Map<string, Set<string>>();

  /**
   * 注册组件的依赖路径
   */
  register(componentId: string, paths: string[]): void {
    // 清除旧依赖
    this.unregister(componentId);

    this.componentDeps.set(componentId, new Set(paths));

    // 建立反向索引
    for (const path of paths) {
      if (!this.pathToComponents.has(path)) {
        this.pathToComponents.set(path, new Set());
      }
      this.pathToComponents.get(path)!.add(componentId);
    }
  }

  /**
   * 注销组件的所有依赖
   */
  unregister(componentId: string): void {
    const oldDeps = this.componentDeps.get(componentId);
    if (oldDeps) {
      for (const path of oldDeps) {
        this.pathToComponents.get(path)?.delete(componentId);
      }
    }
    this.componentDeps.delete(componentId);
  }

  /**
   * 获取受变量路径变化影响的组件列表
   */
  getAffectedComponents(changedPaths: string[]): Set<string> {
    const affected = new Set<string>();

    for (const path of changedPaths) {
      // 精确匹配
      const exact = this.pathToComponents.get(path);
      if (exact) {
        for (const id of exact) affected.add(id);
      }

      // 前缀匹配（如 $user 变化影响 $user.name）
      for (const [trackedPath, components] of this.pathToComponents) {
        if (trackedPath.startsWith(path + '.') || path.startsWith(trackedPath + '.')) {
          for (const id of components) affected.add(id);
        }
      }
    }

    return affected;
  }

  /**
   * 获取组件的依赖路径
   */
  getDependencies(componentId: string): string[] {
    const deps = this.componentDeps.get(componentId);
    return deps ? Array.from(deps) : [];
  }

  /**
   * 清除所有依赖
   */
  clear(): void {
    this.componentDeps.clear();
    this.pathToComponents.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): { componentCount: number; pathCount: number } {
    return {
      componentCount: this.componentDeps.size,
      pathCount: this.pathToComponents.size,
    };
  }
}
