/**
 * 山水集团种子数据脚本
 *
 * 创建山水集团租户、组织架构、用户（scrypt 密码哈希）、角色分配、演示应用。
 * 运行方式：npx tsx packages/data/scripts/seed-shansui.ts
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { DatabaseManager } from '../src/database';
import type { SqliteDb } from '../src/types';

/**
 * Generate unique 8-char hex ID (no prefix in ID itself)
 * Prefix is only added when creating directory names or DB records.
 */
function generateUniqueId(
  db: SqliteDb,
  table: string,
  column: string,
): string {
  let id: string;
  let attempts = 0;
  do {
    id = crypto.randomBytes(4).toString('hex');
    attempts++;
    if (attempts > 100) {
      throw new Error(`Failed to generate unique ID for ${table}.${column} after 100 attempts`);
    }
  } while (db.prepare(`SELECT 1 FROM ${table} WHERE ${column} = ?`).get(id));
  return id;
}

/** Add prefix for directory/file names */
function withPrefix(id: string, prefix: string): string {
  return `${prefix}_${id}`;
}

const TENANT_NAME = '山水集团';

/** scrypt 密码哈希（与 api/src/auth.ts 一致） */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/** 简易 ID 生成（不查库，用于非唯一性资源） */
function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

/** 用户数据（ID 在 main 中动态生成） */
const USER_DEFS = [
  { name: '张总', email: 'admin@shansui.com', phone: '13800000001', password: 'shansui123', deptCode: 'GM', positionName: '总经理', positionCategory: 'management', positionLevel: 1, roleId: 'tenant_admin' },
  { name: '张三', email: 'zhangsan@shansui.com', phone: '13800000002', password: 'shansui123', deptCode: 'FE', positionName: '高级前端工程师', positionCategory: 'technical', positionLevel: 3, roleId: 'department_default' },
  { name: '李四', email: 'lisi@shansui.com', phone: '13800000003', password: 'shansui123', deptCode: 'BE', positionName: '后端工程师', positionCategory: 'technical', positionLevel: 4, roleId: 'department_default' },
  { name: '王五', email: 'wangwu@shansui.com', phone: '13800000004', password: 'shansui123', deptCode: 'PM', positionName: '产品经理', positionCategory: 'business', positionLevel: 3, roleId: 'department_default' },
  { name: '赵六', email: 'zhaoliu@shansui.com', phone: '13800000005', password: 'shansui123', deptCode: 'HR', positionName: 'HR 专员', positionCategory: 'support', positionLevel: 4, roleId: 'department_default' },
];

/** 部门定义（ID 在 main 中动态生成） */
const DEPT_DEFS = [
  { name: '总经办', parentCode: null, code: 'GM', sort: 0 },
  { name: '技术部', parentCode: null, code: 'TECH', sort: 1 },
  { name: '前端组', parentCode: 'TECH', code: 'FE', sort: 0 },
  { name: '后端组', parentCode: 'TECH', code: 'BE', sort: 1 },
  { name: '产品部', parentCode: null, code: 'PM', sort: 2 },
  { name: '人事部', parentCode: null, code: 'HR', sort: 3 },
];

async function main() {
  console.log('🚀 开始创建山水集团种子数据...\n');

  const manager = new DatabaseManager({
    dataDir: path.resolve(__dirname, '../../../data'),
    tenantsDir: path.resolve(__dirname, '../../../tenants'),
  });

  // 1. 初始化系统库
  console.log('📦 初始化系统数据库...');
  manager.initSystemDb();
  const sysDb = manager.getSystemDb();

  // 2. Generate tenant UUID and create tenant (directory + tenant.json + database)
  const tenantUuid = crypto.randomBytes(4).toString('hex');
  const TENANT_ID = withPrefix(tenantUuid, 'tenant'); // tenant_xxxxxxxx
  console.log(`🏢 创建租户：${TENANT_NAME} (${TENANT_ID})...`);

  const tenantDb = manager.createTenant(tenantUuid, TENANT_NAME, 'enterprise');
  console.log('  ✅ 租户创建成功（enterprise 套餐）\n');

  // 3. 创建部门（格式：dept_ + 8位hex）
  console.log('🏗️  创建组织架构...');
  const insertDept = tenantDb.prepare(
    'INSERT INTO departments (dept_id, name, parent_id, code, sort, status) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const deptIdMap = new Map<string, string>(); // code → dept_id
  tenantDb.transaction(() => {
    for (const dept of DEPT_DEFS) {
      const deptId = makeId('dept');
      deptIdMap.set(dept.code, deptId);
      const parentId = dept.parentCode ? deptIdMap.get(dept.parentCode)! : null;
      insertDept.run(deptId, dept.name, parentId, dept.code, dept.sort, 'active');
    }
  });
  console.log(`  ✅ 创建 ${DEPT_DEFS.length} 个部门\n`);

  // 4. 创建用户（格式：user_ + 8位hex）
  console.log('👥 创建用户...');
  const insertUser = tenantDb.prepare(
    `INSERT INTO users (user_id, name, email, phone, password, status, source)
     VALUES (?, ?, ?, ?, ?, 'active', 'native')`,
  );
  const insertPosition = tenantDb.prepare(
    `INSERT INTO positions (position_id, name, category, level, dept_id, status)
     VALUES (?, ?, ?, ?, ?, 'active')`,
  );
  const insertUserDept = tenantDb.prepare(
    `INSERT INTO user_departments (id, user_id, dept_id, position_id, is_primary)
     VALUES (?, ?, ?, ?, 1)`,
  );
  const insertUserRole = tenantDb.prepare(
    `INSERT INTO user_roles (id, user_id, role_id, source) VALUES (?, ?, ?, 'manual')`,
  );

  const adminUserId = makeId('user'); // user_xxxxxxxx (for DB)
  const adminUserUuid = adminUserId.replace('user_', ''); // xxxxxxxx (for JSON)
  tenantDb.transaction(() => {
    for (let i = 0; i < USER_DEFS.length; i++) {
      const u = USER_DEFS[i];
      const userId = i === 0 ? adminUserId : makeId('user');
      const posId = makeId('pos');
      const deptId = deptIdMap.get(u.deptCode)!;
      const hashedPw = hashPassword(u.password);

      insertUser.run(userId, u.name, u.email, u.phone, hashedPw);
      insertPosition.run(posId, u.positionName, u.positionCategory, u.positionLevel, deptId);
      insertUserDept.run(makeId('ud'), userId, deptId, posId);
      insertUserRole.run(makeId('ur'), userId, u.roleId);
    }
  });
  console.log(`  ✅ 创建 ${USER_DEFS.length} 名用户（密码已哈希）\n`);

  // 5. 设置部门负责人
  console.log('📋 设置部门负责人...');
  tenantDb.prepare('UPDATE departments SET manager_id = ? WHERE code = ?').run(adminUserId, 'GM');
  tenantDb.prepare('UPDATE departments SET manager_id = ? WHERE code = ?').run(adminUserId, 'TECH');
  console.log('  ✅ 部门负责人设置完成\n');

  // 6. Create demo app (8-char hex, prefix added for DB/directory)
  const appUuid = generateUniqueId(tenantDb, 'applications', 'app_id');
  const APP_ID = withPrefix(appUuid, 'app'); // app_xxxxxxxx
  console.log(`📱 创建演示应用 (${APP_ID})...`);
  tenantDb.prepare(
    `INSERT INTO applications (app_id, name, description, icon, status, version, component_library, visibility, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    APP_ID, '山水 OA',
    '办公自动化系统，包含审批流程、任务管理、日程安排等功能',
    '📋', 'draft', '0.1.0', 'antd', 'internal', adminUserId,
  );
  console.log('  ✅ 演示应用"山水 OA"已创建\n');

  // 7. 创建租户 Schema 目录
  console.log('📁 创建应用 Schema 目录...');
  const tenantSchemaDir = path.resolve(__dirname, '../../../tenants', TENANT_ID, 'apps', APP_ID);
  const schemaDirs = ['pages', 'cards', 'forms', 'tables', 'workflows', 'automations', 'computations'];
  for (const dir of schemaDirs) {
    fs.mkdirSync(path.join(tenantSchemaDir, dir), { recursive: true });
  }

  // 创建 uploads 目录（租户级，跨应用共享）
  const uploadsDir = path.resolve(__dirname, '../../../tenants', TENANT_ID, 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  // 创建应用元信息文件（含标准字段：schemaVersion、version、references）
  const appMeta = {
    schemaVersion: 1,
    version: 1,
    appId: appUuid,
    name: '山水 OA',
    description: '办公自动化系统，包含审批流程、任务管理、日程安排等功能',
    icon: '📋',
    appVersion: '0.1.0',
    status: 'draft',
    componentLibrary: 'antd',
    visibility: 'internal',
    createdBy: adminUserUuid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    references: {},
    expose: {},
  };
  fs.writeFileSync(
    path.join(tenantSchemaDir, 'app.json'),
    JSON.stringify(appMeta, null, 2),
  );
  console.log('  ✅ Schema 目录创建完成\n');

  manager.closeAll();

  console.log('═══════════════════════════════════════════');
  console.log('✅ 山水集团种子数据创建完成！');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('📋 租户信息：');
  console.log(`   租户 ID：${TENANT_ID}`);
  console.log(`   租户名称：${TENANT_NAME}`);
  console.log('   套餐：enterprise');
  console.log('');
  console.log('📱 应用信息：');
  console.log(`   应用 ID：${APP_ID}`);
  console.log('   应用名称：山水 OA');
  console.log('');
  console.log('👤 演示账号：');
  console.log('   管理员：admin@shansui.com / shansui123');
  console.log('   员工：  zhangsan@shansui.com / shansui123');
  console.log('   员工：  lisi@shansui.com / shansui123');
  console.log('   员工：  wangwu@shansui.com / shansui123');
  console.log('   员工：  zhaoliu@shansui.com / shansui123');
  console.log('');
  console.log('🚀 启动服务：');
  console.log('   yarn server   — 启动 API 服务（:3001）');
  console.log('   yarn frontend — 启动门户应用（:5173）');
  console.log('   yarn dev      — 启动设计器（:3000）');
  console.log('   yarn start:all — 同时启动全部');
}

main().catch((err) => {
  console.error('❌ 种子数据创建失败：', err);
  process.exit(1);
});
