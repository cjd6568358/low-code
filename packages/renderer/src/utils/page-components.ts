/**
 * 页面组件获取工具
 *
 * 从 pageId 获取页面组件定义，用于 $component 环境变量注入。
 * 供 VariableTreeSelector 和 ExpressionEditor 共享使用。
 */

import type { PageSchema, ComponentNode } from '@low-code/shared';
import { componentRegistry } from '../core/ComponentRegistry';

/** 页面组件定义（用于 $component 环境变量注入） */
export interface PageComponentDefinition {
  type: string;
  label?: string;
  propsSchema?: Record<string, any>;
}

/**
 * 从页面组件列表提取组件定义（内部工具）
 *
 * @param components 页面组件节点列表
 * @returns 组件定义映射，格式：{ [componentId]: { type, label, propsSchema } }
 */
function extractComponentDefinitions(
  components: ComponentNode[],
): Record<string, PageComponentDefinition> {
  const result: Record<string, PageComponentDefinition> = {};
  for (const comp of components) {
    const reg = componentRegistry.resolve(comp.type);
    result[comp.id] = {
      type: comp.type,
      label: comp.props?.title || comp.props?.label || comp.name || comp.id,
      propsSchema: reg?.propsSchema as Record<string, any> | undefined,
    };
  }
  return result;
}

/**
 * 从 pageId 获取页面组件列表
 *
 * 调用 API 获取页面 Schema，提取组件定义用于 $component 环境变量注入。
 *
 * @param appId 应用 ID
 * @param pageId 页面 ID
 * @returns 组件定义映射
 */
export async function fetchPageComponents(
  appId: string,
  pageId: string,
): Promise<Record<string, PageComponentDefinition>> {
  const resp = await fetch(`/api/apps/${appId}/pages/${pageId}`);
  const data = await resp.json();
  if (!data.success || !data.resource) {
    return {};
  }
  return extractComponentDefinitions((data.resource as PageSchema).components);
}
