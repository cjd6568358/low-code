/**
 * useExpressionValue — 表达式值 Hook
 *
 * 功能：
 * - 异步执行表达式
 * - 自动收集变量依赖
 * - 监听依赖变更，自动重新执行
 * - 支持缓存
 *
 * 统一使用 computation 包的 ExpressionEngine 作为执行器
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { RenderContext } from '@low-code/shared';
import type { ExpressionBinding } from '@low-code/shared';
import type { DefaultExpressionEngine } from '@low-code/computation';
import { dependencyGraph, extractDependencies } from '../core/DependencyGraph';

/** Hook 配置 */
export interface UseExpressionValueOptions {
  /** 表达式绑定 */
  expression: ExpressionBinding;
  /** 运行时上下文 */
  context: RenderContext;
  /** 组件 ID */
  componentId: string;
  /** 属性名 */
  propKey: string;
  /** 表达式引擎（统一使用 computation 包的实现） */
  expressionEngine: DefaultExpressionEngine;
  /** 是否启用（默认 true） */
  enabled?: boolean;
}

/** Hook 返回值 */
export interface UseExpressionValueResult {
  /** 解析后的值 */
  value: any;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 手动刷新 */
  refresh: () => void;
}

/**
 * 表达式值 Hook
 */
export function useExpressionValue({
  expression,
  context,
  componentId,
  propKey,
  expressionEngine,
  enabled = true,
}: UseExpressionValueOptions): UseExpressionValueResult {
  const [value, setValue] = useState<any>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 表达式标识
  const expressionKey = `${componentId}.${propKey}`;

  // 用于避免过期的异步更新
  const mountedRef = useRef(true);
  const executionIdRef = useRef(0);

  // 执行表达式
  const executeExpression = useCallback(async () => {
    if (!enabled || !expression.value) {
      setValue(undefined);
      return;
    }

    setLoading(true);
    setError(null);

    // 递增执行 ID，用于忽略过期的异步结果
    const currentExecutionId = ++executionIdRef.current;

    try {
      // 统一使用 ExpressionEngine.evaluateAsync
      const result = await expressionEngine.evaluateAsync(expression.value, context);

      // 检查组件是否已卸载，或者执行是否已过期
      if (mountedRef.current && currentExecutionId === executionIdRef.current) {
        setValue(result);
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current && currentExecutionId === executionIdRef.current) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[useExpressionValue] Expression execution failed for ${expressionKey}:`, err);
        setError(errorMessage);
        setLoading(false);
        setValue(undefined);
      }
    }
  }, [expression.value, context, expressionEngine, enabled, expressionKey]);

  // 注册依赖并监听变更
  useEffect(() => {
    if (!enabled) return;

    // 提取依赖
    const dependencies = extractDependencies(expression.value);

    // 注册依赖
    dependencyGraph.register(expressionKey, dependencies);

    // 监听依赖变更
    const unsubscribe = dependencyGraph.onChange((changedKey) => {
      if (changedKey === expressionKey) {
        executeExpression();
      }
    });

    // 初始执行
    executeExpression();

    // 清理
    return () => {
      dependencyGraph.unregister(expressionKey);
      unsubscribe();
    };
  }, [expressionKey, expression.value, enabled, executeExpression]);

  // 组件卸载时标记
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 手动刷新
  const refresh = useCallback(() => {
    executeExpression();
  }, [executeExpression]);

  return { value, loading, error, refresh };
}

/**
 * 批量表达式值 Hook
 *
 * 用于同时解析多个表达式
 */
export function useExpressionValues({
  expressions,
  context,
  componentId,
  expressionEngine,
  enabled = true,
}: {
  expressions: Record<string, ExpressionBinding>;
  context: RenderContext;
  componentId: string;
  expressionEngine: DefaultExpressionEngine;
  enabled?: boolean;
}): {
  values: Record<string, any>;
  loading: boolean;
  errors: Record<string, string>;
  refresh: () => void;
} {
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mountedRef = useRef(true);
  const executionIdRef = useRef(0);

  // 执行所有表达式
  const executeAll = useCallback(async () => {
    if (!enabled || Object.keys(expressions).length === 0) {
      setValues({});
      return;
    }

    setLoading(true);
    setErrors({});

    const currentExecutionId = ++executionIdRef.current;
    const newValues: Record<string, any> = {};
    const newErrors: Record<string, string> = {};

    // 并行执行所有表达式
    const promises = Object.entries(expressions).map(async ([key, expression]) => {
      try {
        // 统一使用 ExpressionEngine.evaluateAsync
        const result = await expressionEngine.evaluateAsync(expression.value, context);
        return { key, result, error: null };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { key, result: undefined, error: errorMessage };
      }
    });

    const results = await Promise.all(promises);

    // 检查是否已过期
    if (!mountedRef.current || currentExecutionId !== executionIdRef.current) {
      return;
    }

    // 汇总结果
    for (const { key, result, error } of results) {
      if (error) {
        newErrors[key] = error;
      } else {
        newValues[key] = result;
      }
    }

    setValues(newValues);
    setErrors(newErrors);
    setLoading(false);
  }, [expressions, context, expressionEngine, enabled]);

  // 注册依赖并监听变更
  useEffect(() => {
    if (!enabled) return;

    // 注册所有表达式的依赖
    const expressionKeys: string[] = [];
    for (const [key, expression] of Object.entries(expressions)) {
      const expressionKey = `${componentId}.${key}`;
      const dependencies = extractDependencies(expression.value);
      dependencyGraph.register(expressionKey, dependencies);
      expressionKeys.push(expressionKey);
    }

    // 监听依赖变更
    const unsubscribe = dependencyGraph.onChange((changedKey) => {
      if (expressionKeys.includes(changedKey)) {
        executeAll();
      }
    });

    // 初始执行
    executeAll();

    // 清理
    return () => {
      for (const key of expressionKeys) {
        dependencyGraph.unregister(key);
      }
      unsubscribe();
    };
  }, [componentId, expressions, enabled, executeAll]);

  // 组件卸载时标记
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 手动刷新
  const refresh = useCallback(() => {
    executeAll();
  }, [executeAll]);

  return { values, loading, errors, refresh };
}

/**
 * 判断是否为表达式绑定
 */
export function isExpressionBinding(value: any): value is ExpressionBinding {
  return (
    value != null &&
    typeof value === 'object' &&
    value.type === 'expression' &&
    typeof value.value === 'string'
  );
}

/**
 * 判断是否为变量引用绑定
 */
export function isVariableBinding(value: any): value is { type: 'variable'; value: string } {
  return (
    value != null &&
    typeof value === 'object' &&
    value.type === 'variable' &&
    typeof value.value === 'string'
  );
}
