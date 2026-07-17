/**
 * RoleRegistry 测试用例
 *
 * 验证角色注册表的核心功能：注册、查询、继承链解析。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRoleRegistry } from '../core/RoleRegistry.js';
import type { Role } from '../types/permission.js';

describe('RoleRegistry', () => {
  let registry: MemoryRoleRegistry;

  beforeEach(() => {
    registry = new MemoryRoleRegistry();

    // 注册测试角色
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
      ],
      isBuiltin: false,
    });
  });

  describe('registerRole', () => {
    it('应该成功注册角色', () => {
      const role = registry.getRole('viewer');
      expect(role).toBeDefined();
      expect(role!.name).toBe('查看者');
      expect(role!.level).toBe('business');
    });

    it('应该覆盖已存在的同名角色', () => {
      registry.registerRole({
        roleId: 'viewer',
        name: '新查看者',
        level: 'business',
        baseRoleIds: [],
        permissions: [],
        isBuiltin: false,
      });

      const role = registry.getRole('viewer');
      expect(role!.name).toBe('新查看者');
    });
  });

  describe('getRole', () => {
    it('应该返回存在的角色', () => {
      const role = registry.getRole('editor');
      expect(role).toBeDefined();
      expect(role!.roleId).toBe('editor');
    });

    it('应该返回 undefined 当角色不存在', () => {
      const role = registry.getRole('nonexistent');
      expect(role).toBeUndefined();
    });
  });

  describe('getAllRoles', () => {
    it('应该返回所有注册的角色', () => {
      const roles = registry.getAllRoles();
      // 内建角色（super_admin, tenant_admin, app_admin）+ 测试角色（department_default 覆盖内建, viewer, editor）= 6
      expect(roles.map(r => r.roleId)).toContain('department_default');
      expect(roles.map(r => r.roleId)).toContain('viewer');
      expect(roles.map(r => r.roleId)).toContain('editor');
      expect(roles.map(r => r.roleId)).toContain('super_admin');
    });
  });

  describe('getRolesByLevel', () => {
    it('应该按级别过滤角色', () => {
      const businessRoles = registry.getRolesByLevel('business');
      // department_default + viewer + editor = 3
      expect(businessRoles.length).toBe(3);
    });

    it('应该返回平台级别角色（内建 super_admin）', () => {
      const platformRoles = registry.getRolesByLevel('platform');
      // 内建 super_admin 是 platform 级别
      expect(platformRoles.length).toBe(1);
      expect(platformRoles[0].roleId).toBe('super_admin');
    });
  });

  describe('resolveRoleChain', () => {
    it('应该返回单个角色（无继承）', () => {
      const chain = registry.resolveRoleChain('department_default');
      expect(chain.length).toBe(1);
      expect(chain[0].roleId).toBe('department_default');
    });

    it('应该返回继承链（从根到叶）', () => {
      const chain = registry.resolveRoleChain('editor');
      expect(chain.length).toBe(3);
      expect(chain[0].roleId).toBe('department_default');
      expect(chain[1].roleId).toBe('viewer');
      expect(chain[2].roleId).toBe('editor');
    });

    it('应该返回空数组当角色不存在', () => {
      const chain = registry.resolveRoleChain('nonexistent');
      expect(chain).toEqual([]);
    });

    it('应该防止循环继承', () => {
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

      const chain = registry.resolveRoleChain('role_a');
      expect(chain).toBeDefined();
      expect(chain.length).toBeLessThanOrEqual(2); // 最多两个角色
    });
  });

  describe('unregisterRole', () => {
    it('应该成功注销角色', () => {
      const result = registry.unregisterRole('viewer');
      expect(result).toBe(true);

      const role = registry.getRole('viewer');
      expect(role).toBeUndefined();
    });

    it('应该返回 false 当角色不存在', () => {
      const result = registry.unregisterRole('nonexistent');
      expect(result).toBe(false);
    });

    it('应该返回 false 当尝试注销内置角色', () => {
      const result = registry.unregisterRole('department_default');
      expect(result).toBe(false); // 内置角色不可注销
    });
  });

  describe('多层级继承', () => {
    it('应该支持三层继承', () => {
      registry.registerRole({
        roleId: 'super_editor',
        name: '超级编辑者',
        level: 'business',
        baseRoleIds: ['editor'],
        permissions: [
          {
            permissionId: 'perm_admin',
            resourceType: 'menu',
            resourceId: 'admin',
            actions: ['read', 'write', 'delete'],
          },
        ],
        isBuiltin: false,
      });

      const chain = registry.resolveRoleChain('super_editor');
      expect(chain.length).toBe(4);
      expect(chain[0].roleId).toBe('department_default');
      expect(chain[1].roleId).toBe('viewer');
      expect(chain[2].roleId).toBe('editor');
      expect(chain[3].roleId).toBe('super_editor');
    });
  });

  describe('多继承', () => {
    it('应该支持多继承（合并多个父角色）', () => {
      registry.registerRole({
        roleId: 'role_x',
        name: 'Role X',
        level: 'business',
        baseRoleIds: [],
        permissions: [
          {
            permissionId: 'perm_x',
            resourceType: 'menu',
            resourceId: 'x_menu',
            actions: ['read'],
          },
        ],
        isBuiltin: false,
      });

      registry.registerRole({
        roleId: 'role_y',
        name: 'Role Y',
        level: 'business',
        baseRoleIds: [],
        permissions: [
          {
            permissionId: 'perm_y',
            resourceType: 'menu',
            resourceId: 'y_menu',
            actions: ['read'],
          },
        ],
        isBuiltin: false,
      });

      registry.registerRole({
        roleId: 'multi_inherit',
        name: 'Multi Inherit',
        level: 'business',
        baseRoleIds: ['role_x', 'role_y'],
        permissions: [],
        isBuiltin: false,
      });

      const chain = registry.resolveRoleChain('multi_inherit');
      expect(chain.length).toBe(3);
      expect(chain.map(r => r.roleId)).toContain('role_x');
      expect(chain.map(r => r.roleId)).toContain('role_y');
      expect(chain.map(r => r.roleId)).toContain('multi_inherit');
    });
  });
});
