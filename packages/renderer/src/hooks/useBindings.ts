/**
 * useBindings — 统一绑定解析 Hook
 *
 * 将变量引用和表达式统一到同一套依赖管理逻辑：
 * 1. 从所有绑定中提取依赖
 * 2. 统一注册到 DependencyGraph
 * 3. 依赖变更时，仅重算受影响的绑定
 * 4. 变量引用同步解析，表达式异步执行
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ExpressionBinding } from '@low-code/shared';
import type { DefaultExpressionEngine } from '@low-code/computation';
import { dependencyGraph, extractDependencies } from '../core/DependencyGraph';
import { DataBindingResolver } from '../core/DataBindingResolver';
import {
  isExpressionBinding,
  isVariableBinding,
} from './useExpressionValue';
import type { ReactiveEnvContext } from '../core/ReactiveEnvContext';

/** 绑定项 */
interface BindingItem {
  key: string;
  type: 'variable' | 'expression';
  value: string;
}

/** 绑定解析结果 */
export interface UseBindingsResult {
  /** 解析后的 props */
  resolvedProps: Record<string, any>;
  /** 是否有表达式正在加载 */
  loading: boolean;
  /** 错误信息 */
  errors: Record<string, string>;
}

/**
 * 统一绑定解析 Hook
 *
 * @param componentId 组件 ID
 * @param rawProps 原始 props（可能包含字面量、变量引用、表达式）
 * @param context 运行时上下文（稳定引用）
 * @param expressionEngine 表达式引擎
 * @param reactiveContext 响应式上下文（可选，用于追踪变量变更版本）
 */
export function useBindings(
  componentId: string,
  rawProps: Record<string, any>,
  context: Record<string, any>,
  expressionEngine: DefaultExpressionEngine,
  reactiveContext?: ReactiveEnvContext,
): UseBindingsResult {
  const [expressionValues, setExpressionValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [varVersion, setVarVersion] = useState(0);
  const mountedRef = useRef(true);
  const executionIdRef = useRef(0);

  // 分离字面量、变量引用、表达式
  const { literals, variableBindings, expressionBindings, allBindings } = useMemo(() => {
    const literals: Record<string, any> = {};
    const variableBindings: BindingItem[] = [];
    const expressionBindings: BindingItem[] = [];

    for (const [key, value] of Object.entries(rawProps)) {
      if (isExpressionBinding(value)) {
        expressionBindings.push({ key, type: 'expression', value: value.value });
      } else if (isVariableBinding(value)) {
        variableBindings.push({ key, type: 'variable', value: value.value });
      } else {
        literals[key] = value;
      }
    }

    return { literals, variableBindings, expressionBindings, allBindings: [...variableBindings, ...expressionBindings] };
  }, [rawProps]);

  // 从所有绑定中提取依赖
  const dependencies = useMemo(() => {
    const deps = new Set<string>();
    for (const binding of allBindings) {
      if (binding.type === 'variable') {
        deps.add(binding.value);
      } else {
        // 表达式：提取 $xxx.yyy 引用
        const exprDeps = extractDependencies(binding.value);
        for (const dep of exprDeps) {
          deps.add(dep);
        }
      }
    }
    return [...deps];
  }, [allBindings]);

  // 同步解析变量引用（varVersion 变化时重算）
  const syncResolved = useMemo(() => {
    const bindingResolver = new DataBindingResolver();
    const resolved: Record<string, any> = {};
    for (const binding of variableBindings) {
      resolved[binding.key] = bindingResolver.resolveValue(
        { type: 'variable', value: binding.value } as any,
        context as any,
      );
    }
    return resolved;
    // varVersion 变化时重新解析
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variableBindings, context, varVersion]);

  // 执行受影响的表达式
  const executeExpressions = useCallback(async (affectedKeys?: Set<string>) => {
    const toExecute = affectedKeys
      ? expressionBindings.filter((b) => affectedKeys.has(`${componentId}.${b.key}`))
      : expressionBindings;

    if (toExecute.length === 0) return;

    const currentExecutionId = ++executionIdRef.current;
    setLoading(true);

    const promises = toExecute.map(async (binding) => {
      try {
        const result = await expressionEngine.evaluateAsync(binding.value, context);
        return { key: binding.key, result, error: null };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { key: binding.key, result: undefined, error: errorMessage };
      }
    });

    const results = await Promise.all(promises);

    if (!mountedRef.current || currentExecutionId !== executionIdRef.current) return;

    setExpressionValues((prev) => {
      const updated = { ...prev };
      const newErrors: Record<string, string> = {};
      for (const { key, result, error } of results) {
        if (error) {
          newErrors[key] = error;
        } else {
          updated[key] = result;
        }
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...newErrors }));
      }
      return updated;
    });
    setLoading(false);
  }, [expressionBindings, context, expressionEngine, componentId]);

  // 注册依赖 + 监听变更 + 初始执行
  useEffect(() => {
    // 注册所有绑定的依赖
    const bindingKeys: string[] = [];
    for (const binding of allBindings) {
      const bindingKey = `${componentId}.${binding.key}`;
      const deps = binding.type === 'variable'
        ? [binding.value]
        : extractDependencies(binding.value);
      dependencyGraph.register(bindingKey, deps);
      bindingKeys.push(bindingKey);
    }

    // 监听依赖变更
    const unsubscribe = dependencyGraph.onChange((changedKey) => {
      if (!bindingKeys.includes(changedKey)) return;

      const affectedBinding = allBindings.find((b) => `${componentId}.${b.key}` === changedKey);
      if (!affectedBinding) return;

      console.log(`[useBindings] ${componentId}.${affectedBinding.key} 依赖变更: ${changedKey}`);

      if (affectedBinding.type === 'expression') {
        executeExpressions(new Set([changedKey]));
      } else {
        setVarVersion((v) => v + 1);
      }
    });

    // console.log(`[useBindings] ${componentId} 注册依赖:`, bindingKeys, '依赖路径:', dependencies);

    // 初始执行所有表达式
    if (expressionBindings.length > 0) {
      executeExpressions();
    }

    return () => {
      for (const key of bindingKeys) {
        dependencyGraph.unregister(key);
      }
      unsubscribe();
    };
  }, [componentId, allBindings, executeExpressions]);

  // 组件卸载标记
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // 合并最终 props
  const resolvedProps = useMemo(() => ({
    ...literals,
    ...syncResolved,
    ...expressionValues,
  }), [literals, syncResolved, expressionValues]);

  return { resolvedProps, loading, errors };
}
