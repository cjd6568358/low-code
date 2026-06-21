/**
 * DependencyGraph — 表达式变量依赖追踪
 *
 * 功能：
 * - 注册表达式的变量依赖
 * - 查询依赖某变量的所有表达式
 * - 检测循环依赖
 * - 变更传播：变量变更时通知依赖的表达式重新执行
 */

/** 表达式标识：componentId.propKey */
type ExpressionKey = string;

/** 变量路径：如 $user.name、$platform.web */
type VariablePath = string;

/** 依赖变更回调 */
type OnDependencyChange = (expressionKey: ExpressionKey) => void;

/**
 * 依赖图实现
 */
export class DependencyGraphImpl {
  /**
   * 正向依赖：expressionKey → Set<variablePath>
   * 记录每个表达式依赖哪些变量
   */
  private forwardDeps = new Map<ExpressionKey, Set<VariablePath>>();

  /**
   * 反向依赖：variablePath → Set<expressionKey>
   * 记录每个变量被哪些表达式依赖
   */
  private reverseDeps = new Map<VariablePath, Set<ExpressionKey>>();

  /**
   * 变更回调列表
   */
  private changeCallbacks: OnDependencyChange[] = [];

  /**
   * 注册表达式的变量依赖
   *
   * @param expressionKey 表达式标识（如 "textarea_01.props.b"）
   * @param dependencies 依赖的变量路径列表（如 ["$user.name", "$platform.web"]）
   */
  register(expressionKey: ExpressionKey, dependencies: VariablePath[]): void {
    // 清除旧的正向依赖
    const oldDeps = this.forwardDeps.get(expressionKey);
    if (oldDeps) {
      for (const oldPath of oldDeps) {
        this.reverseDeps.get(oldPath)?.delete(expressionKey);
      }
    }

    // 注册新的正向依赖
    this.forwardDeps.set(expressionKey, new Set(dependencies));

    // 注册反向依赖
    for (const path of dependencies) {
      if (!this.reverseDeps.has(path)) {
        this.reverseDeps.set(path, new Set());
      }
      this.reverseDeps.get(path)!.add(expressionKey);
    }
  }

  /**
   * 注销表达式的依赖
   */
  unregister(expressionKey: ExpressionKey): void {
    const deps = this.forwardDeps.get(expressionKey);
    if (deps) {
      for (const path of deps) {
        this.reverseDeps.get(path)?.delete(expressionKey);
      }
      this.forwardDeps.delete(expressionKey);
    }
  }

  /**
   * 获取依赖某变量的所有表达式
   *
   * @param variablePath 变量路径（如 "$user.name"）
   * @returns 依赖该变量的表达式列表
   */
  getDependents(variablePath: VariablePath): ExpressionKey[] {
    const dependents = this.reverseDeps.get(variablePath);
    return dependents ? Array.from(dependents) : [];
  }

  /**
   * 获取表达式依赖的所有变量
   *
   * @param expressionKey 表达式标识
   * @returns 依赖的变量路径列表
   */
  getDependencies(expressionKey: ExpressionKey): VariablePath[] {
    const deps = this.forwardDeps.get(expressionKey);
    return deps ? Array.from(deps) : [];
  }

  /**
   * 触发变量变更
   * 通知所有依赖该变量的表达式重新执行
   * 匹配规则（双向）：
   * - 精确匹配：$component.xxx.value 变更 → 通知依赖 $component.xxx.value
   * - 子路径匹配：$component.xxx.value 变更 → 通知依赖 $component.xxx（N 层通知 N-1 层）
   * - 父路径匹配：$component.xxx 变更 → 通知依赖 $component.xxx.value（父通知子）
   *
   * @param variablePath 变更的变量路径
   */
  notifyVariableChange(variablePath: VariablePath): void {
    const notified = new Set<ExpressionKey>();

    for (const [trackedPath, dependents] of this.reverseDeps) {
      // 精确匹配 / 子路径匹配 / 父路径匹配
      const matches = trackedPath === variablePath
        || variablePath.startsWith(trackedPath + '.')
        || trackedPath.startsWith(variablePath + '.');

      if (matches) {
        for (const exprKey of dependents) {
          if (!notified.has(exprKey)) {
            notified.add(exprKey);
            for (const callback of this.changeCallbacks) {
              callback(exprKey);
            }
          }
        }
      }
    }
  }

  /**
   * 批量触发变量变更
   */
  notifyVariableChanges(variablePaths: VariablePath[]): void {
    const notified = new Set<ExpressionKey>();
    for (const path of variablePaths) {
      const dependents = this.getDependents(path);
      for (const exprKey of dependents) {
        if (!notified.has(exprKey)) {
          notified.add(exprKey);
          for (const callback of this.changeCallbacks) {
            callback(exprKey);
          }
        }
      }
    }
  }

  /**
   * 注册变更回调
   */
  onChange(callback: OnDependencyChange): () => void {
    this.changeCallbacks.push(callback);
    return () => {
      const index = this.changeCallbacks.indexOf(callback);
      if (index > -1) {
        this.changeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 检测循环依赖
   *
   * @returns 循环依赖的路径列表，如果没有循环则返回空数组
   */
  detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): boolean => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const deps = this.getDependencies(node);
      for (const dep of deps) {
        const dependents = this.getDependents(dep);
        for (const dependent of dependents) {
          if (!visited.has(dependent)) {
            if (dfs(dependent, [...path])) return true;
          } else if (recursionStack.has(dependent)) {
            // 找到循环
            const cycleStart = path.indexOf(dependent);
            cycles.push(path.slice(cycleStart));
            return true;
          }
        }
      }

      recursionStack.delete(node);
      return false;
    };

    // 遍历所有节点
    for (const key of this.forwardDeps.keys()) {
      if (!visited.has(key)) {
        dfs(key, []);
      }
    }

    return cycles;
  }

  /**
   * 清空所有依赖
   */
  clear(): void {
    this.forwardDeps.clear();
    this.reverseDeps.clear();
  }

  /**
   * 获取依赖图状态（调试用）
   */
  getDebugInfo(): {
    forwardDeps: Record<string, string[]>;
    reverseDeps: Record<string, string[]>;
  } {
    const forwardDeps: Record<string, string[]> = {};
    for (const [key, deps] of this.forwardDeps) {
      forwardDeps[key] = Array.from(deps);
    }

    const reverseDeps: Record<string, string[]> = {};
    for (const [key, deps] of this.reverseDeps) {
      reverseDeps[key] = Array.from(deps);
    }

    return { forwardDeps, reverseDeps };
  }
}

/**
 * 从表达式代码中提取变量依赖
 *
 * @param code 表达式代码（如 "async () => { return $user.name; }"）
 * @returns 依赖的变量路径列表
 */
export function extractDependencies(code: string): VariablePath[] {
  if (!code || typeof code !== 'string') return [];

  // 匹配 $xxx.yyy.zzz 格式的变量引用
  const regex = /\$[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/g;
  const matches = code.match(regex);

  if (!matches) return [];

  // 去重并返回
  return [...new Set(matches)];
}

/** 依赖图单例 */
export const dependencyGraph = new DependencyGraphImpl();
