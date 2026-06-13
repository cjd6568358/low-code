/**
 * 前端权限引擎
 *
 * 基于 RBAC 模型，支持角色叠加继承。
 * 提供菜单/按钮级权限过滤，以及权限表达式求值支持。
 *
 * 仅用于前端 UI 层控制，不做服务端鉴权。
 */

import type {
  Permission,
  ResourceType,
  ActionType,
  DataScopeConfig,
  Role,
  MenuPermissionConfig,
  ButtonPermissionConfig,
  BuiltinRoleId,
} from '../types/permission';
import { DEPARTMENT_DEFAULT_PERMISSIONS } from '../types/permission';
import type { RoleRegistry } from './RoleRegistry';

// ─── 有效权限（合并后的扁平权限列表） ──────────────────

/** 有效权限条目（带来源角色标记） */
export interface EffectivePermission extends Permission {
  /** 来源角色 ID（用于调试/审计） */
  sourceRoleId: string;
}

// ─── 菜单/按钮描述 ─────────────────────────────────────

/** 可过滤的菜单项 */
export interface FilterableMenu {
  menuId: string;
  permission?: MenuPermissionConfig;
  children?: FilterableMenu[];
}

/** 可过滤的按钮项 */
export interface FilterableButton {
  buttonId: string;
  permission?: ButtonPermissionConfig;
}

// ─── 权限引擎 ──────────────────────────────────────────

export class PermissionEngine {
  constructor(private roleRegistry: RoleRegistry) {}

  /**
   * 解析角色的有效权限（递归展开继承链）
   *
   * 合并规则：
   * 1. 递归展开 baseRoleIds，得到从根到叶的角色链
   * 2. 从根角色开始，逐层合并 permissions
   * 3. 同一 (resourceType, resourceId) 子角色覆盖父角色
   * 4. 自动叠加 department_default 角色权限
   */
  resolveEffectivePermissions(roleId: string): EffectivePermission[] {
    const chain = this.resolveRoleChain(roleId);
    return this.mergePermissions(chain);
  }

  /**
   * 解析用户的所有有效权限（合并所有角色）
   *
   * 自动包含 department_default 角色权限。
   * 多角色之间：同 (resourceType, resourceId) 取权限更宽的（actions 合并去重）。
   */
  resolveUserPermissions(roleIds: string[]): EffectivePermission[] {
    // 自动包含部门默认角色
    const allRoleIds = [...new Set([...roleIds, 'department_default'])];

    const map = new Map<string, EffectivePermission>();

    for (const roleId of allRoleIds) {
      const perms = this.resolveEffectivePermissions(roleId);
      for (const perm of perms) {
        const key = this.permKey(perm.resourceType, perm.resourceId);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, perm);
        } else {
          // 合并 actions，保留更宽的权限
          const mergedActions = [...new Set([...existing.actions, ...perm.actions])];
          map.set(key, { ...existing, actions: mergedActions });
        }
      }
    }

    return [...map.values()];
  }

  /**
   * 判断是否拥有指定操作权限
   *
   * 支持通配符 resourceId='*' 匹配任意资源。
   */
  hasPermission(
    effectivePermissions: EffectivePermission[],
    resourceType: ResourceType,
    resourceId: string,
    action: ActionType,
  ): boolean {
    return effectivePermissions.some(
      (p) =>
        p.resourceType === resourceType &&
        (p.resourceId === resourceId || p.resourceId === '*') &&
        p.actions.includes(action),
    );
  }

  /**
   * 根据菜单权限过滤可见菜单
   *
   * 过滤规则：
   * 1. 有 permission 配置的菜单：检查用户角色/部门/人员是否在允许列表中
   * 2. 无 permission 配置的菜单：默认可见
   * 3. 递归过滤子菜单
   */
  filterMenuByPermission(
    menus: FilterableMenu[],
    userRoleIds: string[],
    userId: string,
    departmentId?: string,
  ): FilterableMenu[] {
    return menus
      .filter((menu) => this.isMenuVisible(menu, userRoleIds, userId, departmentId))
      .map((menu) => ({
        ...menu,
        children: menu.children
          ? this.filterMenuByPermission(menu.children, userRoleIds, userId, departmentId)
          : undefined,
      }));
  }

  /**
   * 根据按钮权限过滤可见按钮
   */
  filterButtonsByPermission(
    buttons: FilterableButton[],
    userRoleIds: string[],
    userId: string,
    departmentId?: string,
  ): FilterableButton[] {
    return buttons.filter((btn) => this.isButtonVisible(btn, userRoleIds, userId, departmentId));
  }

  /**
   * 将用户权限转换为上下文对象（注入 $context.permissions）
   *
   * 返回一个 Proxy 对象，支持：
   * - permissions.has(resourceType, resourceId, action) → boolean
   * - permissions.menus → 可见菜单ID列表
   * - permissions.buttons → 可用按钮ID列表
   */
  buildPermissionContext(
    effectivePermissions: EffectivePermission[],
  ): PermissionContext {
    return new PermissionContext(effectivePermissions);
  }

  // ─── 内部方法 ────────────────────────────────────────

  /**
   * 递归展开角色继承链（从根到叶）
   *
   * 使用 visited 集合防止循环继承。
   */
  private resolveRoleChain(roleId: string, visited = new Set<string>()): Role[] {
    if (visited.has(roleId)) return [];
    visited.add(roleId);

    const role = this.roleRegistry.getRole(roleId);
    if (!role) return [];

    const chain: Role[] = [];
    // 先递归处理基础角色（根在前）
    for (const baseId of role.baseRoleIds) {
      chain.push(...this.resolveRoleChain(baseId, visited));
    }
    // 当前角色在最后（叶在后，覆盖优先级最高）
    chain.push(role);
    return chain;
  }

  /**
   * 合并角色链中的权限
   *
   * 子角色中同 (resourceType, resourceId) 的权限覆盖父角色。
   */
  private mergePermissions(chain: Role[]): EffectivePermission[] {
    const map = new Map<string, EffectivePermission>();

    for (const role of chain) {
      for (const perm of role.permissions) {
        const key = this.permKey(perm.resourceType, perm.resourceId);
        map.set(key, { ...perm, sourceRoleId: role.roleId });
      }
    }

    return [...map.values()];
  }

  /** 权限去重 key */
  private permKey(resourceType: string, resourceId: string): string {
    return `${resourceType}:${resourceId}`;
  }

  /** 判断菜单是否可见 */
  private isMenuVisible(
    menu: FilterableMenu,
    userRoleIds: string[],
    userId: string,
    departmentId?: string,
  ): boolean {
    const cfg = menu.permission;
    if (!cfg) return true; // 无配置默认可见

    // 指定人员
    if (cfg.allowedUsers?.length && cfg.allowedUsers.includes(userId)) return true;
    // 指定部门
    if (cfg.allowedDepartments?.length && departmentId && cfg.allowedDepartments.includes(departmentId)) return true;
    // 指定角色（包含 department_default 自动叠加）
    if (cfg.allowedRoles?.length && userRoleIds.some((r) => cfg.allowedRoles!.includes(r))) return true;

    // 三个列表都为空 → 所有人可见
    if (
      !cfg.allowedRoles?.length &&
      !cfg.allowedDepartments?.length &&
      !cfg.allowedUsers?.length
    ) {
      return true;
    }

    return false;
  }

  /** 判断按钮是否可见 */
  private isButtonVisible(
    btn: FilterableButton,
    userRoleIds: string[],
    userId: string,
    departmentId?: string,
  ): boolean {
    const cfg = btn.permission;
    if (!cfg) return true;

    if (cfg.allowedUsers?.length && cfg.allowedUsers.includes(userId)) return true;
    if (cfg.allowedDepartments?.length && departmentId && cfg.allowedDepartments.includes(departmentId)) return true;
    if (cfg.allowedRoles?.length && userRoleIds.some((r) => cfg.allowedRoles!.includes(r))) return true;

    if (
      !cfg.allowedRoles?.length &&
      !cfg.allowedDepartments?.length &&
      !cfg.allowedUsers?.length
    ) {
      return true;
    }

    return false;
  }
}

// ─── 权限上下文对象 ────────────────────────────────────

/**
 * 注入到 $context.permissions 的权限上下文
 *
 * 使用示例（表达式中）：
 * - $context.permissions.has('menu', 'userManagement', 'read')
 * - $context.permissions.has('button', 'deleteBtn', 'delete')
 * - $context.permissions.menus.includes('orderList')
 * - $context.permissions.buttons.includes('exportBtn')
 */
export class PermissionContext {
  /** 可见菜单 ID 列表 */
  readonly menus: string[];
  /** 可用按钮 ID 列表 */
  readonly buttons: string[];

  private permissions: EffectivePermission[];

  constructor(permissions: EffectivePermission[]) {
    this.permissions = permissions;
    this.menus = permissions
      .filter((p) => p.resourceType === 'menu')
      .map((p) => p.resourceId);
    this.buttons = permissions
      .filter((p) => p.resourceType === 'button')
      .map((p) => p.resourceId);
  }

  /**
   * 判断是否拥有指定权限
   *
   * @example permissions.has('menu', 'userManagement', 'read')
   */
  has(resourceType: ResourceType, resourceId: string, action: ActionType): boolean {
    return this.permissions.some(
      (p) =>
        p.resourceType === resourceType &&
        (p.resourceId === resourceId || p.resourceId === '*') &&
        p.actions.includes(action),
    );
  }

  /**
   * 判断是否拥有任一指定权限
   *
   * @example permissions.hasAny('button', 'deleteBtn', ['delete', 'update'])
   */
  hasAny(
    resourceType: ResourceType,
    resourceId: string,
    actions: ActionType[],
  ): boolean {
    return actions.some((a) => this.has(resourceType, resourceId, a));
  }

  /**
   * 获取指定资源类型的所有有权限的资源 ID
   */
  getResourceIds(resourceType: ResourceType): string[] {
    return this.permissions
      .filter((p) => p.resourceType === resourceType)
      .map((p) => p.resourceId);
  }
}
