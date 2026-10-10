/**
 * 平台适配器公共工具
 *
 * 各端适配器（Web/H5/ReactNative/WechatMiniApp）共享的参数序列化逻辑。
 */

/**
 * 将任意值形式的查询参数序列化为 URLSearchParams
 *
 * 规则：
 * - 数组值展开为重复键（`?a=1&a=2`），与 URL 查询串惯例一致
 * - `undefined` / `null` 跳过（不产生空参数）
 * - 其余值统一 `String()` 转换
 *
 * @param params 查询参数（值可为任意类型）
 * @returns 已填充的 URLSearchParams
 */
export function toSearchParams(params: Record<string, unknown>): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) continue;
        searchParams.append(key, String(item));
      }
      continue;
    }

    searchParams.append(key, String(value));
  }

  return searchParams;
}

/**
 * 构建带查询参数的完整请求地址
 *
 * @param url 原始地址
 * @param params 查询参数（可选）
 * @returns 拼接后的地址，无参数时原样返回
 */
export function buildUrl(url: string, params?: Record<string, unknown>): string {
  if (!params) return url;
  const searchParams = toSearchParams(params);
  const query = searchParams.toString();
  if (!query) return url;
  return url.includes('?') ? `${url}&${query}` : `${url}?${query}`;
}
