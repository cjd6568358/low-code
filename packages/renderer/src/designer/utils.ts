import type { ComponentNode } from '@low-code/shared';
import { antdCategoryMap } from '../libraries/antd';

/**
 * 为组件生成字段名（如 "输入框_01"、"按钮_02"）
 * 使用 antdCategoryMap 中的中文名做前缀，未注册的组件回退到 type
 */
export function generateComponentName(type: string, components: ComponentNode[]): string {
  const prefix = antdCategoryMap[type]?.name || type;
  const existing = components.filter((c) => c.type === type);
  const maxNum = existing.reduce((max, c) => {
    const match = c.name?.match(new RegExp(`^${prefix}_(\\d+)$`));
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `${prefix}_${String(maxNum + 1).padStart(2, '0')}`;
}

/**
 * 沿 parentId 链向上查找祖先节点
 * @param node 起始节点
 * @param components 所有组件列表
 * @param predicate 判断条件
 * @returns 符合条件的祖先节点，未找到返回 null
 */
export function findAncestor(
  node: ComponentNode,
  components: ComponentNode[],
  predicate: (ancestor: ComponentNode) => boolean,
): ComponentNode | null {
  let current = node;
  while (current.parentId) {
    const parent = components.find(c => c.id === current.parentId);
    if (!parent) return null;
    if (predicate(parent)) return parent;
    current = parent;
  }
  return null;
}

/**
 * 判断组件是否在指定类型的容器内
 * @param node 组件节点
 * @param components 所有组件列表
 * @param containerType 容器类型（如 'form'）
 */
export function isInContainer(
  node: ComponentNode,
  components: ComponentNode[],
  containerType: string,
): boolean {
  return findAncestor(node, components, (n) => n.type === containerType) !== null;
}

/**
 * 收集指定容器内的全部后代组件（深度优先）
 *
 * 用于「表单内的字段列表」这类场景：跨字段校验、联动规则等需要知道
 * 容器内部有哪些可参与的子组件。
 *
 * @param container 容器节点
 * @param components 所有组件列表
 * @returns 后代组件列表（不含容器自身），按 depth-first 顺序
 */
export function collectDescendants(
  container: ComponentNode,
  components: ComponentNode[],
): ComponentNode[] {
  const byParent = new Map<string, ComponentNode[]>();
  for (const comp of components) {
    if (!comp.parentId) continue;
    const siblings = byParent.get(comp.parentId);
    if (siblings) siblings.push(comp);
    else byParent.set(comp.parentId, [comp]);
  }

  const result: ComponentNode[] = [];
  const visited = new Set<string>();

  const walk = (parentId: string): void => {
    for (const child of byParent.get(parentId) ?? []) {
      // 防御脏数据导致的环
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      result.push(child);
      walk(child.id);
    }
  };

  walk(container.id);
  return result;
}
