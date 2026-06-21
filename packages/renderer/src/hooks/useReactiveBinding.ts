/**
 * useReactiveBinding — 响应式变量绑定 Hook
 *
 * 通过 DependencyGraph 订阅指定变量路径的变更，
 * 仅当依赖变量变化时触发组件重渲染。
 *
 * 机制：
 * 1. 在 DependencyGraph 中注册组件的依赖路径
 * 2. ReactiveEnvContext.set() → DependencyGraph.notifyVariableChange()
 * 3. DependencyGraph 仅通知依赖该路径的组件
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReactiveEnvContext } from '../core/ReactiveEnvContext';
import { dependencyGraph } from '../core/DependencyGraph';

/**
 * 订阅响应式上下文的变量变更（精准通知）
 *
 * @param componentId 组件 ID（用于 DependencyGraph 注册）
 * @param reactiveCtx 响应式上下文实例
 * @param dependencies 依赖的变量路径列表（如 ['$component.xxx.value', '$data']）
 * @returns version 版本号，用于触发 useMemo 重新计算
 */
export function useReactiveBinding(
  componentId: string,
  reactiveCtx: ReactiveEnvContext,
  dependencies: string[],
): number {
  const [version, setVersion] = useState(0);

  // 用 ref 存最新 version，避免回调闭包问题
  const versionRef = useRef(0);

  // 变更回调 — 由 DependencyGraph 精准触发
  const handleChange = useCallback(() => {
    const newVersion = reactiveCtx.getVersion();
    if (newVersion !== versionRef.current) {
      versionRef.current = newVersion;
      setVersion(newVersion);
    }
  }, [reactiveCtx]);

  useEffect(() => {
    if (dependencies.length === 0) return;

    // 注册依赖到 DependencyGraph
    const expressionKey = `__binding__${componentId}`;
    dependencyGraph.register(expressionKey, dependencies);

    // 监听依赖变更（DependencyGraph 仅在依赖变量变化时触发）
    const unsubscribe = dependencyGraph.onChange((changedKey) => {
      if (changedKey === expressionKey) {
        handleChange();
      }
    });

    return () => {
      dependencyGraph.unregister(expressionKey);
      unsubscribe();
    };
  }, [componentId, dependencies, handleChange]);

  return version;
}

/**
 * 从 props 中提取变量依赖路径
 *
 * 支持格式：
 * - { type: 'variable', value: '$component.xxx.value' } → '$component.xxx.value'
 * - { type: 'expression', value: '...' } → 从表达式中提取 $xxx.yyy
 */
export function extractDependenciesFromProps(props: Record<string, any>): string[] {
  const deps = new Set<string>();

  for (const value of Object.values(props)) {
    if (value == null || typeof value !== 'object') continue;

    // 变量引用绑定
    if (value.type === 'variable' && typeof value.value === 'string') {
      deps.add(value.value);
    }

    // 表达式绑定 — 仅提取有实际变量引用的依赖
    if (value.type === 'expression' && typeof value.value === 'string') {
      const regex = /\$[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/g;
      const matches = value.value.match(regex);
      if (matches) {
        for (const match of matches) {
          deps.add(match);
        }
      }
    }
  }

  return [...deps];
}
