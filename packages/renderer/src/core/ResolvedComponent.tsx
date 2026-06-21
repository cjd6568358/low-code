/**
 * ResolvedComponent — 解析绑定后的组件包装
 *
 * 使用统一的 useBindings hook 处理所有绑定类型：
 * - 字面量：直接使用
 * - 变量引用：同步解析，通过 DependencyGraph 精准通知
 * - 表达式：异步执行，通过 DependencyGraph 精准通知
 */

import React from 'react';
import type { DefaultExpressionEngine } from '@low-code/computation';
import { useBindings } from '../hooks/useBindings';
import type { ReactiveEnvContext } from '../core/ReactiveEnvContext';

/** 组件属性 */
export interface ResolvedComponentProps {
  /** 组件 ID */
  componentId: string;
  /** 原始属性（可能包含字面量、变量引用、表达式） */
  rawProps: Record<string, any>;
  /** 运行时上下文（稳定引用，如 ReactiveEnvContext.getContext()） */
  context: Record<string, any>;
  /** 响应式上下文（可选，用于追踪变量变更版本） */
  reactiveContext?: ReactiveEnvContext;
  /** 表达式引擎 */
  expressionEngine: DefaultExpressionEngine;
  /** 渲染函数（接收解析后的 props） */
  children: (resolvedProps: Record<string, any>) => React.ReactNode;
}

/**
 * 解析绑定后的组件包装
 */
export function ResolvedComponent({
  componentId,
  rawProps,
  context,
  reactiveContext,
  expressionEngine,
  children,
}: ResolvedComponentProps) {
  const { resolvedProps } = useBindings(
    componentId,
    rawProps,
    context,
    expressionEngine,
    reactiveContext,
  );

  return <>{children(resolvedProps)}</>;
}
