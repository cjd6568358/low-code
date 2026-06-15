/**
 * 路由守卫组件
 *
 * 未登录用户重定向到登录页。
 * 可选角色校验，不匹配则重定向到工作台。
 */

import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { UserRole } from './mockAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  /** 允许访问的角色列表（空 = 所有已登录用户） */
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user } = useAuth();
  const location = useLocation();

  // Not logged in -> redirect to login
  if (!user) {
    // Try to get tenantId from current path
    const segments = location.pathname.split('/').filter(Boolean);
    const tenantId = segments[0]?.startsWith('tenant_') ? segments[0] : null;
    const loginPath = tenantId ? `/${tenantId}/login` : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Role check
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to={`/${user.tenantId}/workspace`} replace />;
  }

  return <>{children}</>;
}
