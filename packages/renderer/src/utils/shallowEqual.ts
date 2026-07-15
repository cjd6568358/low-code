/**
 * 浅比较两个对象的所有属性值（Object.is 语义）
 * 用于避免引用变化但值未变时的无效 re-render
 *
 * @returns true 当所有 own enumerable 属性值相同（或两者都是 null/undefined）
 */
export function shallowEqual(
  a: Record<string, any> | null | undefined,
  b: Record<string, any> | null | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is(a[key], b[key])) {
      return false;
    }
  }

  return true;
}
