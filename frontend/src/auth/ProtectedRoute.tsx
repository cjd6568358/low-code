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

  // 未登录 → 重定向到登录页
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 角色校验
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/workspace" replace />;
  }

  return <>{children}</>;
}
