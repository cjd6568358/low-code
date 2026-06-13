/**
 * 认证服务 — 调用后端 API
 *
 * POST /api/auth/login → 后端自动识别租户和角色。
 */

/** 用户角色类型 */
export type UserRole = 'platform_admin' | 'tenant_admin' | 'department_default' | string;

/** 认证用户信息 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  roleName: string;
  tenantId: string;
  tenantName: string;
  departmentName?: string;
  positionName?: string;
}

/** 登录参数 */
export interface LoginParams {
  email: string;
  password: string;
}

/** 登录结果 */
export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * 调用后端登录接口
 */
export async function loginRequest(params: LoginParams): Promise<LoginResult> {
  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await resp.json();

    if (!resp.ok || !data.success) {
      return { success: false, error: data.error || '登录失败' };
    }

    return { success: true, user: data.user as AuthUser };
  } catch (err) {
    return { success: false, error: '网络错误，请检查服务是否启动' };
  }
}

/**
 * 获取当前登录用户（从 sessionStorage）
 */
export function getStoredUser(): AuthUser | null {
  try {
    const stored = sessionStorage.getItem('auth_user');
    if (!stored) return null;
    return JSON.parse(stored) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * 存储登录用户
 */
export function storeUser(user: AuthUser): void {
  sessionStorage.setItem('auth_user', JSON.stringify(user));
}

/**
 * 清除登录状态
 */
export function clearUser(): void {
  sessionStorage.removeItem('auth_user');
}
