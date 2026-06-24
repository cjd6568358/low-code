import type { ComponentNode, DataSourceConfig, LinkageRule } from '@low-code/shared';

/** 依赖节点类型 */
export type DependencyNodeType = 'component' | 'datasource' | 'field' | 'variable';

/** 依赖节点 */
export interface DependencyNode {
  /** 节点 ID */
  id: string;
  /** 节点类型 */
  type: DependencyNodeType;
  /** 依赖的变量路径集合 */
  dependencies: Set<string>;
  /** 被依赖的变量路径集合（反向依赖） */
  dependents: Set<string>;
}

/** 依赖边 */
export interface DependencyEdge {
  /** 源节点 ID */
  source: string;
  /** 目标节点 ID */
  target: string;
  /** 依赖的变量路径 */
  path: string;
}

/** 变更影响分析结果 */
export interface ChangeImpactAnalysis {
  /** 直接受影响的组件 */
  directAffectedComponents: Set<string>;
  /** 间接受影响的组件（通过依赖链） */
  indirectAffectedComponents: Set<string>;
  /** 需要刷新的数据源 */
  affectedDataSources: Set<string>;
  /** 需要重新计算的字段 */
  affectedFields: Set<string>;
  /** 按拓扑排序的更新顺序 */
  updateOrder: string[];
}

/**
 * 统一依赖图管理器
 * 打通 LinkageEngine、DataSourceManager 和组件依赖
 * 支持全局依赖分析和按顺序更新
 */
export class UnifiedDependencyGraph {
  /** 节点集合 */
  private nodes = new Map<string, DependencyNode>();
  /** 边集合 */
  private edges: DependencyEdge[] = [];
  /** 路径到节点的映射（反向索引） */
  private pathToNodes = new Map<string, Set<string>>();
  /** 组件 ID 到节点 ID 的映射 */
  private componentToNodes = new Map<string, Set<string>>();
  /** 数据源 ID 到节点 ID 的映射 */
  private datasourceToNodes = new Map<string, Set<string>>();

  /**
   * 注册组件节点
   */
  registerComponent(componentId: string, dependencies: string[]): void {
    const nodeId = `component:${componentId}`;
    const node: DependencyNode = {
      id: nodeId,
      type: 'component',
      dependencies: new Set(dependencies),
      dependents: new Set(),
    };

    this.nodes.set(nodeId, node);

    // 建立组件到节点的映射
    if (!this.componentToNodes.has(componentId)) {
      this.componentToNodes.set(componentId, new Set());
    }
    this.componentToNodes.get(componentId)!.add(nodeId);

    // 建立路径到节点的映射
    for (const dep of dependencies) {
      if (!this.pathToNodes.has(dep)) {
        this.pathToNodes.set(dep, new Set());
      }
      this.pathToNodes.get(dep)!.add(nodeId);

      // 建立边
      this.edges.push({
        source: dep,
        target: nodeId,
        path: dep,
      });
    }
  }

  /**
   * 注册数据源节点
   */
  registerDataSource(dataSourceId: string, dependencies: string[]): void {
    const nodeId = `datasource:${dataSourceId}`;
    const node: DependencyNode = {
      id: nodeId,
      type: 'datasource',
      dependencies: new Set(dependencies),
      dependents: new Set(),
    };

    this.nodes.set(nodeId, node);

    // 建立数据源到节点的映射
    if (!this.datasourceToNodes.has(dataSourceId)) {
      this.datasourceToNodes.set(dataSourceId, new Set());
    }
    this.datasourceToNodes.get(dataSourceId)!.add(nodeId);

    // 建立路径到节点的映射
    for (const dep of dependencies) {
      if (!this.pathToNodes.has(dep)) {
        this.pathToNodes.set(dep, new Set());
      }
      this.pathToNodes.get(dep)!.add(nodeId);

      // 建立边
      this.edges.push({
        source: dep,
        target: nodeId,
        path: dep,
      });
    }
  }

  /**
   * 注册字段联动节点
   */
  registerFieldLinkage(fieldName: string, dependencies: string[]): void {
    const nodeId = `field:${fieldName}`;
    const node: DependencyNode = {
      id: nodeId,
      type: 'field',
      dependencies: new Set(dependencies),
      dependents: new Set(),
    };

    this.nodes.set(nodeId, node);

    // 建立路径到节点的映射
    for (const dep of dependencies) {
      if (!this.pathToNodes.has(dep)) {
        this.pathToNodes.set(dep, new Set());
      }
      this.pathToNodes.get(dep)!.add(nodeId);

      // 建立边
      this.edges.push({
        source: dep,
        target: nodeId,
        path: dep,
      });
    }
  }

  /**
   * 分析变更影响
   * @param changedPaths 变更的变量路径集合
   * @returns 影响分析结果
   */
  analyzeChangeImpact(changedPaths: Set<string>): ChangeImpactAnalysis {
    const directAffectedComponents = new Set<string>();
    const indirectAffectedComponents = new Set<string>();
    const affectedDataSources = new Set<string>();
    const affectedFields = new Set<string>();

    // 1. 查找直接受影响的节点
    const directAffectedNodes = new Set<string>();
    for (const path of changedPaths) {
      // 精确匹配
      const exactMatches = this.pathToNodes.get(path);
      if (exactMatches) {
        for (const nodeId of exactMatches) {
          directAffectedNodes.add(nodeId);
        }
      }

      // 前缀匹配（如 $user 变化会影响 $user.name）
      for (const [nodePath, nodeIds] of this.pathToNodes) {
        if (nodePath.startsWith(path + '.') || path.startsWith(nodePath + '.')) {
          for (const nodeId of nodeIds) {
            directAffectedNodes.add(nodeId);
          }
        }
      }
    }

    // 2. 分类直接受影响的节点
    for (const nodeId of directAffectedNodes) {
      const node = this.nodes.get(nodeId);
      if (!node) continue;

      switch (node.type) {
        case 'component': {
          const componentId = nodeId.replace('component:', '');
          directAffectedComponents.add(componentId);
          break;
        }
        case 'datasource': {
          const dataSourceId = nodeId.replace('datasource:', '');
          affectedDataSources.add(dataSourceId);
          break;
        }
        case 'field': {
          const fieldName = nodeId.replace('field:', '');
          affectedFields.add(fieldName);
          break;
        }
      }
    }

    // 3. 查找间接受影响的节点（通过依赖链）
    const visited = new Set<string>(directAffectedNodes);
    const queue = [...directAffectedNodes];

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      const currentNode = this.nodes.get(currentNodeId);
      if (!currentNode) continue;

      // 查找依赖当前节点的其他节点
      for (const edge of this.edges) {
        if (edge.source === currentNodeId && !visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push(edge.target);

          const targetNode = this.nodes.get(edge.target);
          if (!targetNode) continue;

          switch (targetNode.type) {
            case 'component': {
              const componentId = edge.target.replace('component:', '');
              indirectAffectedComponents.add(componentId);
              break;
            }
            case 'datasource': {
              const dataSourceId = edge.target.replace('datasource:', '');
              affectedDataSources.add(dataSourceId);
              break;
            }
            case 'field': {
              const fieldName = edge.target.replace('field:', '');
              affectedFields.add(fieldName);
              break;
            }
          }
        }
      }
    }

    // 4. 生成按拓扑排序的更新顺序
    const updateOrder = this.generateUpdateOrder([
      ...directAffectedNodes,
      ...Array.from(indirectAffectedComponents).map(id => `component:${id}`),
      ...Array.from(affectedDataSources).map(id => `datasource:${id}`),
      ...Array.from(affectedFields).map(id => `field:${id}`),
    ]);

    return {
      directAffectedComponents,
      indirectAffectedComponents,
      affectedDataSources,
      affectedFields,
      updateOrder,
    };
  }

  /**
   * 生成按拓扑排序的更新顺序
   */
  private generateUpdateOrder(nodeIds: string[]): string[] {
    // 构建子图
    const subgraph = new Map<string, Set<string>>();
    for (const nodeId of nodeIds) {
      const node = this.nodes.get(nodeId);
      if (!node) continue;

      const deps = new Set<string>();
      for (const dep of node.dependencies) {
        // 检查依赖是否在子图中
        const depNodes = this.pathToNodes.get(dep);
        if (depNodes) {
          for (const depNodeId of depNodes) {
            if (nodeIds.includes(depNodeId)) {
              deps.add(depNodeId);
            }
          }
        }
      }
      subgraph.set(nodeId, deps);
    }

    // 拓扑排序（Kahn 算法）
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, Set<string>>();

    // 初始化
    for (const [node, deps] of subgraph) {
      if (!inDegree.has(node)) {
        inDegree.set(node, 0);
      }
      if (!adjacency.has(node)) {
        adjacency.set(node, new Set());
      }

      for (const dep of deps) {
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
    if (sorted.length < nodeIds.length) {
      console.warn('Circular dependency detected in update order');
      // 添加剩余节点
      for (const nodeId of nodeIds) {
        if (!sorted.includes(nodeId)) {
          sorted.push(nodeId);
        }
      }
    }

    return sorted;
  }

  /**
   * 获取组件的依赖路径列表
   */
  getComponentDependencies(componentId: string): string[] {
    const nodeIds = this.componentToNodes.get(componentId);
    if (!nodeIds) return [];

    const deps: string[] = [];
    for (const nodeId of nodeIds) {
      const node = this.nodes.get(nodeId);
      if (node) {
        deps.push(...node.dependencies);
      }
    }
    return [...new Set(deps)];
  }

  /**
   * 获取数据源的依赖路径列表
   */
  getDataSourceDependencies(dataSourceId: string): string[] {
    const nodeIds = this.datasourceToNodes.get(dataSourceId);
    if (!nodeIds) return [];

    const deps: string[] = [];
    for (const nodeId of nodeIds) {
      const node = this.nodes.get(nodeId);
      if (node) {
        deps.push(...node.dependencies);
      }
    }
    return [...new Set(deps)];
  }

  /**
   * 清空依赖图
   */
  clear(): void {
    this.nodes.clear();
    this.edges = [];
    this.pathToNodes.clear();
    this.componentToNodes.clear();
    this.datasourceToNodes.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    nodeCount: number;
    edgeCount: number;
    componentCount: number;
    dataSourceCount: number;
    fieldCount: number;
  } {
    let componentCount = 0;
    let dataSourceCount = 0;
    let fieldCount = 0;

    for (const node of this.nodes.values()) {
      switch (node.type) {
        case 'component':
          componentCount++;
          break;
        case 'datasource':
          dataSourceCount++;
          break;
        case 'field':
          fieldCount++;
          break;
      }
    }

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.length,
      componentCount,
      dataSourceCount,
      fieldCount,
    };
  }
}
