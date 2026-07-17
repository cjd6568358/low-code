/**
 * PermissionEngine 测试用例
 *
 * 验证 RBAC 权限引擎的核心功能：角色继承、权限合并、菜单/按钮过滤。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionEngine } from '../core/PermissionEngine.js';
import type { RoleRegistry } from '../core/RoleRegistry.js';
import type { Role, Permission } from '../types/permission.js';

// Mock RoleRegistry
class MockRoleRegistry implements RoleRegistry {
  private roles = new Map<string, Role>();

  registerRole(role: Role): void {
    this.roles.set(role.roleId, role);
  }

  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  getAllRoles(): Role[] {
    return [...this.roles.values()];
  }

  getRolesByLevel(level: string): Role[] {
    return this.getAllRoles().filter(r => r.level === level);
  }

  resolveRoleChain(roleId: string): Role[] {
    const role = this.getRole(roleId);
    if (!role) return [];
    const chain: Role[] = [];
    for (const baseId of role.baseRoleIds) {
      chain.push(...this.resolveRoleChain(baseId));
    }
    chain.push(role);
    return chain;
  }

  unregisterRole(roleId: string): boolean {
    return this.roles.delete(roleId);
  }
}

describe('PermissionEngine', () => {
  let engine: PermissionEngine;
  let registry: MockRoleRegistry;

  beforeEach(() => {
    registry = new MockRoleRegistry();

    // 注册 department_default 角色
    registry.registerRole({
      roleId: 'department_default',
      name: '部门默认角色',
      level: 'business',
      baseRoleIds: [],
      permissions: [
        {
          permissionId: 'perm_dashboard',
          resourceType: 'menu',
          resourceId: 'dashboard',
          actions: ['read'],
        },
      ],
      isBuiltin: true,
    });

    // 注册 viewer 角色
    registry.registerRole({
      roleId: 'viewer',
      name: '查看者',
      level: 'business',
      baseRoleIds: ['department_default'],
      permissions: [
        {
          permissionId: 'perm_report_read',
          resourceType: 'menu',
          resourceId: 'report',
          actions: ['read'],
        },
      ],
      isBuiltin: false,
    });

    // 注册 editor 角色
    registry.registerRole({
      roleId: 'editor',
      name: '编辑者',
      level: 'business',
      baseRoleIds: ['viewer'],
      permissions: [
        {
          permissionId: 'perm_report_write',
          resourceType: 'menu',
          resourceId: 'report',
          actions: ['read', 'write'],
        },
        {
          permissionId: 'perm_delete_btn',
          resourceType: 'button',
          resourceId: 'deleteBtn',
          actions: ['delete'],
        },
      ],
      isBuiltin: false,
    });

    engine = new PermissionEngine(registry);
  });

  describe('resolveEffectivePermissions', () => {
    it('应该返回角色自身的权限', () => {
      const perms = engine.resolveEffectivePermissions('viewer');
      expect(perms.length).toBeGreaterThan(0);

      const reportPerm = perms.find(p => p.resourceId === 'report');
      expect(reportPerm).toBeDefined();
      expect(reportPerm!.actions).toContain('read');
    });

    it('应该继承父角色权限', () => {
      const perms = engine.resolveEffectivePermissions('editor');

      // 应该包含继承自 viewer 的 report 权限
      const reportPerm = perms.find(p => p.resourceId === 'report');
      expect(reportPerm).toBeDefined();
      expect(reportPerm!.actions).toContain('read');
      expect(reportPerm!.actions).toContain('write');
    });

    it('应该继承 department_default 权限', () => {
      const perms = engine.resolveEffectivePermissions('viewer');

      const dashboardPerm = perms.find(p => p.resourceId === 'dashboard');
      expect(dashboardPerm).toBeDefined();
      expect(dashboardPerm!.sourceRoleId).toBe('department_default');
    });

    it('子角色应该覆盖父角色权限', () => {
      const perms = engine.resolveEffectivePermissions('editor');

      // editor 的 report 权限应该覆盖 viewer 的
      const reportPerm = perms.find(p => p.resourceId === 'report');
      expect(reportPerm).toBeDefined();
      expect(reportPerm!.sourceRoleId).toBe('editor');
      expect(reportPerm!.actions).toContain('write');
    });

    it('应该防止循环继承', () => {
      // 创建循环继承
      registry.registerRole({
        roleId: 'role_a',
        name: 'Role A',
        level: 'business',
        baseRoleIds: ['role_b'],
        permissions: [],
        isBuiltin: false,
      });

      registry.registerRole({
        roleId: 'role_b',
        name: 'Role B',
        level: 'business',
        baseRoleIds: ['role_a'],
        permissions: [],
        isBuiltin: false,
      });

      const perms = engine.resolveEffectivePermissions('role_a');
      expect(perms).toBeDefined(); // 不应该抛异常
    });
  });

  describe('resolveUserPermissions', () => {
    it('应该合并多个角色的权限', () => {
      const perms = engine.resolveUserPermissions(['viewer', 'editor']);

      // 应该包含两个角色的所有权限
      const reportPerm = perms.find(p => p.resourceId === 'report');
      expect(reportPerm).toBeDefined();
      expect(reportPerm!.actions).toContain('read');
      expect(reportPerm!.actions).toContain('write');
    });

    it('应该自动包含 department_default 角色', () => {
      const perms = engine.resolveUserPermissions(['viewer']);

      const dashboardPerm = perms.find(p => p.resourceId === 'dashboard');
      expect(dashboardPerm).toBeDefined();
    });

    it('应该去重相同资源的权限', () => {
      const perms = engine.resolveUserPermissions(['viewer', 'viewer']);

      const reportPerms = perms.filter(p => p.resourceId === 'report');
      expect(reportPerms.length).toBe(1);
    });
  });

  describe('hasPermission', () => {
    it('应该返回 true 当有权限时', () => {
      const perms = engine.resolveUserPermissions(['editor']);
      const hasPerm = engine.hasPermission(perms, 'menu', 'report', 'read');
      expect(hasPerm).toBe(true);
    });

    it('应该返回 false 当无权限时', () => {
      const perms = engine.resolveUserPermissions(['viewer']);
      const hasPerm = engine.hasPermission(perms, 'menu', 'report', 'write');
      expect(hasPerm).toBe(false);
    });

    it('应该支持通配符 resourceId', () => {
      registry.registerRole({
        roleId: 'admin',
        name: '管理员',
        level: 'business',
        baseRoleIds: [],
        permissions: [
          {
            permissionId: 'perm_all_menu',
            resourceType: 'menu',
            resourceId: '*',
            actions: ['read', 'write', 'delete'],
          },
        ],
        isBuiltin: false,
      });

      const perms = engine.resolveUserPermissions(['admin']);
      const hasPerm = engine.hasPermission(perms, 'menu', 'any_menu', 'read');
      expect(hasPerm).toBe(true);
    });
  });

  describe('filterMenuByPermission', () => {
    it('应该显示无 permission 配置的菜单', () => {
      const menus = [
        { menuId: 'home', permission: undefined },
      ];

      const filtered = engine.filterMenuByPermission(menus, ['viewer'], 'user1');
      expect(filtered.length).toBe(1);
      expect(filtered[0].menuId).toBe('home');
    });

    it('应该根据角色过滤菜单', () => {
      const menus = [
        {
          menuId: 'admin',
          permission: { allowedRoles: ['admin'] },
        },
      ];

      const filtered = engine.filterMenuByPermission(menus, ['viewer'], 'user1');
      expect(filtered.length).toBe(0);
    });

    it('应该显示用户有角色的菜单', () => {
      const menus = [
        {
          menuId: 'report',
          permission: { allowedRoles: ['viewer'] },
        },
      ];

      const filtered = engine.filterMenuByPermission(menus, ['viewer'], 'user1');
      expect(filtered.length).toBe(1);
      expect(filtered[0].menuId).toBe('report');
    });

    it('应该根据用户 ID 过滤菜单', () => {
      const menus = [
        {
          menuId: 'my_menu',
          permission: { allowedUsers: ['user1', 'user2'] },
        },
      ];

      const filtered1 = engine.filterMenuByPermission(menus, [], 'user1');
      expect(filtered1.length).toBe(1);

      const filtered2 = engine.filterMenuByPermission(menus, [], 'user3');
      expect(filtered2.length).toBe(0);
    });

    it('应该根据部门过滤菜单', () => {
      const menus = [
        {
          menuId: 'dept_menu',
          permission: { allowedDepartments: ['dept1'] },
        },
      ];

      const filtered1 = engine.filterMenuByPermission(menus, [], 'user1', 'dept1');
      expect(filtered1.length).toBe(1);

      const filtered2 = engine.filterMenuByPermission(menus, [], 'user1', 'dept2');
      expect(filtered2.length).toBe(0);
    });

    it('应该递归过滤子菜单', () => {
      const menus = [
        {
          menuId: 'parent',
          permission: { allowedRoles: ['admin'] },
          children: [
            { menuId: 'child', permission: undefined },
          ],
        },
      ];

      const filtered = engine.filterMenuByPermission(menus, ['viewer'], 'user1');
      expect(filtered.length).toBe(0);
    });
  });

  describe('filterButtonsByPermission', () => {
    it('应该显示无 permission 配置的按钮', () => {
      const buttons = [
        { buttonId: 'addBtn', permission: undefined },
      ];

      const filtered = engine.filterButtonsByPermission(buttons, ['viewer'], 'user1');
      expect(filtered.length).toBe(1);
    });

    it('应该根据角色过滤按钮', () => {
      const buttons = [
        {
          buttonId: 'deleteBtn',
          permission: { allowedRoles: ['admin'] },
        },
      ];

      const filtered = engine.filterButtonsByPermission(buttons, ['viewer'], 'user1');
      expect(filtered.length).toBe(0);
    });
  });

  describe('buildPermissionContext', () => {
    it('应该构建权限上下文', () => {
      const perms = engine.resolveUserPermissions(['editor']);
      const context = engine.buildPermissionContext(perms);

      expect(context.has('menu', 'report', 'read')).toBe(true);
      expect(context.has('menu', 'report', 'write')).toBe(true);
      expect(context.has('button', 'deleteBtn', 'delete')).toBe(true);
    });

    it('应该提供 menus 列表', () => {
      const perms = engine.resolveUserPermissions(['viewer']);
      const context = engine.buildPermissionContext(perms);

      expect(context.menus).toContain('dashboard');
      expect(context.menus).toContain('report');
    });

    it('应该提供 buttons 列表', () => {
      const perms = engine.resolveUserPermissions(['editor']);
      const context = engine.buildPermissionContext(perms);

      expect(context.buttons).toContain('deleteBtn');
    });

    it('hasAny 应该匹配任一 action', () => {
      const perms = engine.resolveUserPermissions(['editor']);
      const context = engine.buildPermissionContext(perms);

      expect(context.hasAny('menu', 'report', ['read', 'delete'])).toBe(true);
      expect(context.hasAny('menu', 'report', ['delete', 'update'])).toBe(false);
    });

    it('getResourceIds 应该返回指定类型的所有资源 ID', () => {
      const perms = engine.resolveUserPermissions(['editor']);
      const context = engine.buildPermissionContext(perms);

      const menuIds = context.getResourceIds('menu');
      expect(menuIds).toContain('dashboard');
      expect(menuIds).toContain('report');
    });
  });
});
