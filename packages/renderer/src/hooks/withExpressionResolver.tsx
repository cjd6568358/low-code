/**
 * withExpressionResolver — 表达式解析 HOC
 *
 * 功能：
 * - 包装组件，自动解析 props 中的表达式
 * - 处理异步加载状态
 * - 统一使用 computation 包的 ExpressionEngine
 */

import React, { useMemo } from 'react';
import type { RenderContext } from '@low-code/shared';
import type { PropValue, ExpressionBinding } from '@low-code/shared';
import type { DefaultExpressionEngine } from '@low-code/computation';
import {
  useExpressionValues,
  isExpressionBinding,
  isVariableBinding,
} from './useExpressionValue';
import { DataBindingResolver } from '../core/DataBindingResolver';

/** HOC 配置 */
export interface WithExpressionResolverOptions {
  /** 组件 ID */
  componentId: string;
  /** 组件属性 */
  props: Record<string, PropValue>;
  /** 运行时上下文 */
  context: RenderContext;
  /** 表达式引擎（统一使用 computation 包的实现） */
  expressionEngine: DefaultExpressionEngine;
}

/**
 * 表达式解析包装组件属性
 *
 * 直接返回解析后的 props，不创建新的组件
 */
export function useResolvedProps({
  componentId,
  props,
  context,
  expressionEngine,
}: WithExpressionResolverOptions): {
  resolvedProps: Record<string, any>;
  loading: boolean;
  errors: Record<string, string>;
} {
  // 分离字面量、变量引用和表达式
  const { syncProps, expressions } = useMemo(() => {
    const syncProps: Record<string, any> = {};
    const expressions: Record<string, ExpressionBinding> = {};
    const bindingResolver = new DataBindingResolver();

    for (const [key, value] of Object.entries(props)) {
      if (isExpressionBinding(value)) {
        expressions[key] = value;
      } else if (isVariableBinding(value)) {
        // 变量引用同步解析
        syncProps[key] = bindingResolver.resolveValue(value, context);
      } else {
        // 字面量
        syncProps[key] = value;
      }
    }

    return { syncProps, expressions };
  }, [props, context]);

  // 解析表达式
  const {
    values: expressionValues,
    loading,
    errors,
  } = useExpressionValues({
    expressions,
    context,
    componentId,
    expressionEngine,
  });

  // 合并所有 props
  const resolvedProps = useMemo(() => {
    return {
      ...syncProps,
      ...expressionValues,
    };
  }, [syncProps, expressionValues]);

  return { resolvedProps, loading, errors };
}
