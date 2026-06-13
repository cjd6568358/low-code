/**
 * 权限守卫组件
 *
 * 根据当前用户角色决定是否渲染子元素。
 * 用于页面内按钮、操作列等细粒度权限控制。
 */

import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { UserRole } from '../auth/mockAuth';

interface PermissionGuardProps {
  /** 允许的角色列表 */
  roles: UserRole[];
  /** 不满足权限时的回退内容（默认 null，不渲染） */
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({ roles, fallback = null, children }: PermissionGuardProps) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
