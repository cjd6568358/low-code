/**
 * 认证上下文
 *
 * 管理当前登录用户状态，提供登录/登出方法。
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser, LoginParams } from './mockAuth';
import { loginRequest, getStoredUser, storeUser, clearUser } from './mockAuth';

/** 认证上下文值 */
interface AuthContextValue {
  /** 当前登录用户（null 表示未登录） */
  user: AuthUser | null;
  /** 是否正在加载 */
  loading: boolean;
  /** 登录 */
  login: (params: LoginParams) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  /** 登出 */
  logout: () => void;
  /** 当前用户是否为管理员 */
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** 认证 Provider 组件 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (params: LoginParams) => {
    setLoading(true);
    try {
      const result = await loginRequest(params);
      if (result.success && result.user) {
        setUser(result.user);
        storeUser(result.user);
        return { success: true, user: result.user };
      }
      return { success: false, error: result.error };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    clearUser();
  }, []);

  const isAdmin = useMemo(
    () => user?.role === 'tenant_admin' || user?.role === 'platform_admin',
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, isAdmin }),
    [user, loading, login, logout, isAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** 使用认证上下文 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
