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
