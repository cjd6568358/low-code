/**
 * 角色注册表
 *
 * 管理当前租户的所有角色定义（内置 + 自定义）。
 * 提供角色查询和继承链解析能力。
 */

import type { Role, BuiltinRoleId } from '../types/permission';
import { BUILTIN_ROLES, DEPARTMENT_DEFAULT_PERMISSIONS } from '../types/permission';

/** 角色注册表接口 */
export interface RoleRegistry {
  /** 获取指定角色 */
  getRole(roleId: string): Role | undefined;
  /** 获取所有角色 */
  getAllRoles(): Role[];
  /** 获取指定层级的角色 */
  getRolesByLevel(level: Role['level']): Role[];
  /** 解析角色继承链（从根到叶） */
  resolveRoleChain(roleId: string): Role[];
  /** 注册角色 */
  registerRole(role: Role): void;
  /** 注销角色（内置角色不可注销） */
  unregisterRole(roleId: string): boolean;
  /** 批量注册角色 */
  registerRoles(roles: Role[]): void;
}

/**
 * 内存角色注册表实现
 *
 * 预置所有内置角色和部门默认角色的权限。
 * 运行时通过 registerRole / unregisterRole 动态管理自定义角色。
 */
export class MemoryRoleRegistry implements RoleRegistry {
  private roles = new Map<string, Role>();

  constructor(customRoles: Role[] = []) {
    // 注册内置角色
    for (const builtin of BUILTIN_ROLES) {
      const role: Role = {
        ...builtin,
        permissions:
          builtin.roleId === 'department_default'
            ? DEPARTMENT_DEFAULT_PERMISSIONS
            : [],
        createdAt: '',
        updatedAt: '',
      };
      this.roles.set(role.roleId, role);
    }

    // 注册自定义角色
    for (const role of customRoles) {
      this.roles.set(role.roleId, role);
    }
  }

  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  getAllRoles(): Role[] {
    return [...this.roles.values()];
  }

  getRolesByLevel(level: Role['level']): Role[] {
    return [...this.roles.values()].filter((r) => r.level === level);
  }

  resolveRoleChain(roleId: string): Role[] {
    const visited = new Set<string>();
    const chain: Role[] = [];

    const walk = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const role = this.roles.get(id);
      if (!role) return;
      for (const baseId of role.baseRoleIds) {
        walk(baseId);
      }
      chain.push(role);
    };

    walk(roleId);
    return chain;
  }

  registerRole(role: Role): void {
    this.roles.set(role.roleId, role);
  }

  unregisterRole(roleId: string): boolean {
    const role = this.roles.get(roleId);
    if (!role) return false;
    if (role.isBuiltin) return false; // 内置角色不可注销
    this.roles.delete(roleId);
    return true;
  }

  registerRoles(roles: Role[]): void {
    for (const role of roles) {
      this.registerRole(role);
    }
  }
}
