/**
 * ComponentMethodRegistryContext — 组件方法注册表上下文
 *
 * 通过 React Context 将 ComponentMethodRegistry 注入组件树，
 * 组件通过 useComponentMethods hook 注册/注销方法。
 */
import { createContext, useContext, useEffect, useRef } from 'react';
import type { ComponentMethodRegistry, MethodHandler, MethodMeta } from '../core/ComponentMethodRegistry';

/** 注册表上下文值 */
export interface ComponentMethodRegistryContextValue {
  registry: ComponentMethodRegistry;
}

/**
 * 组件方法注册表 Context
 *
 * 由 PageRenderer 创建并提供，组件通过 useComponentMethods 消费。
 */
export const ComponentMethodRegistryContext = createContext<ComponentMethodRegistryContextValue | null>(null);

/**
 * 获取组件方法注册表上下文
 *
 * @returns 注册表上下文，不在 Provider 内时返回 null
 */
export function useComponentRegistryContext(): ComponentMethodRegistryContextValue | null {
  return useContext(ComponentMethodRegistryContext);
}

/**
 * useComponentMethods — 组件方法注册 hook
 *
 * 组件 mount 时自动注册方法到 ComponentMethodRegistry，unmount 时注销。
 * 方法引用变化时（deps 变更），先注销旧方法再注册新方法。
 *
 * @param componentId - 组件实例 ID
 * @param componentType - 组件类型标识
 * @param methods - 方法名 → 处理器映射
 * @param meta - 方法名 → 元数据映射（可选，用于设计时展示）
 *
 * @example
 * ```tsx
 * useComponentMethods('table_01', 'table', {
 *   refresh: () => reload(),
 *   clearSelection: () => setSelectedKeys([]),
 * }, {
 *   refresh: { label: '刷新数据', description: '重新加载表格数据' },
 *   clearSelection: { label: '清除选择', description: '清除所有选中行' },
 * });
 * ```
 */
export function useComponentMethods(
  componentId: string,
  componentType: string,
  methods: Record<string, MethodHandler>,
  meta?: Record<string, MethodMeta>,
): void {
  const ctx = useComponentRegistryContext();
  const prevMethodsRef = useRef<Record<string, MethodHandler> | null>(null);

  useEffect(() => {
    if (!ctx) return;
    const registry = ctx.registry;

    // 注销旧方法（如果 methods 引用变化）
    if (prevMethodsRef.current) {
      registry.unregister(componentId);
    }

    // 注册新方法
    if (Object.keys(methods).length > 0) {
      registry.register(componentId, componentType, methods, meta);
    }

    prevMethodsRef.current = methods;

    return () => {
      registry.unregister(componentId);
      prevMethodsRef.current = null;
    };
    // methods 对象引用变化时重新注册
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, componentId, componentType, methods, meta]);
}
