/**
 * ID 生成工具
 *
 * - generateHexId — 物理资源 ID（8 位 hex）
 * - generateNodeId — 节点/组件内部 ID（node_01、node_02 格式，序号递增）
 */

/** 生成 8 位 hex ID（物理资源用） */
export function generateHexId(): string {
  return crypto.randomUUID().slice(0, 8);
}

/**
 * 生成节点 ID（node_01、node_02 格式）
 *
 * 扫描 existingIds 中已有的 `{prefix}_NN`，取最大序号 +1。
 * 适用于流程节点、组件节点等资源内部的子元素 ID。
 *
 * @param prefix 前缀（如 'node'、'rule'）
 * @param existingIds 已存在的 ID 列表
 */
export function generateNodeId(prefix: string, existingIds: string[]): string {
  const regex = new RegExp(`^${prefix}_(\\d+)$`);
  const maxNum = existingIds.reduce((max, id) => {
    const match = id.match(regex);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `${prefix}_${String(maxNum + 1).padStart(2, '0')}`;
}
