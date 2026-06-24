/**
 * 按路径从对象中取值
 * @example get(obj, '$user.name') => obj.$user.name
 */
export function get(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const segments = path.split('.');
  let current = obj;
  for (const seg of segments) {
    if (current == null) return undefined;
    // 支持数组索引 user.items[0].name
    const match = seg.match(/^(\w+)(?:\[(\d+)\])?$/);
    if (match) {
      current = current[match[1]];
      if (match[2] !== undefined && current != null) {
        current = current[parseInt(match[2], 10)];
      }
    } else {
      current = current[seg];
    }
  }
  return current;
}

/**
 * 按路径设置对象的值
 */
export function set(obj: any, path: string, value: any): void {
  if (!obj || !path) return;
  const segments = path.split('.');
  let current = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (current[seg] == null) {
      current[seg] = {};
    }
    current = current[seg];
  }
  current[segments[segments.length - 1]] = value;
}

/**
 * 安全的路径格式校验 — 仅允许 dot-path 访问
 */
export function isValidPath(path: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(path);
}
