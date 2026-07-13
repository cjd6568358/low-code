/**
 * 统一 API 客户端
 *
 * 封装 fetch，自动附带 Authorization header。
 * 401 时清除本地 token 并跳转登录页。
 */

const TOKEN_KEY = 'auth_token';

/** 获取存储的 JWT token */
function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** 存储 JWT token */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** 清除 JWT token */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** 跳转到登录页 */
function redirectToLogin(): void {
  const path = window.location.pathname;
  const tenantMatch = path.match(/^\/([^/]+)\/(login|workspace|apps|app|workflows|config|designer)/);
  if (tenantMatch) {
    window.location.href = `/${tenantMatch[1]}/login`;
  } else {
    window.location.href = '/login';
  }
}

/**
 * 统一 fetch 封装
 *
 * - 自动附带 `Authorization: Bearer <token>` header
 * - 401 响应时清除 token 并跳转登录页
 * - 其余行为与原生 fetch 一致
 */
export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = getToken();

  const headers = new Headers(options?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearToken();
    redirectToLogin();
  }

  return response;
}
