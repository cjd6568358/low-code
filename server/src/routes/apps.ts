// App routes
// Data source: tenants/{tenantId}/apps/*/app.json
// POST /api/apps
// GET  /api/apps
// GET  /api/apps/:appId
// PUT  /api/apps/:appId
// DELETE /api/apps/:appId

import path from 'path';
import KoaRouter from '@koa/router';
import { TENANTS_DIR } from '../config/index.js';
import { existsAsync, resolveAppDir, stripPrefix, readFile, writeFile, readdir, mkdir, unlink, rm } from '../utils/fs-utils.js';
import type { DatabaseManager } from '@low-code/data';
import { TableService } from '../services/TableService.js';
import { generateHexId, RESOURCE_TYPES } from '@low-code/shared';
import { createComputationsRouter } from './computations.js';

/** Add prefix for directory/file names */
function withPrefix(uuid: string, prefix: string): string {
  return `${prefix}_${uuid}`;
}

/** 读取单个应用的 app.json */
async function readAppMeta(tenantId: string, appId: string): Promise<any | null> {
  // 兼容裸 ID 和带前缀 ID
  const dirName = appId.startsWith('app_') ? appId : `app_${appId}`;
  const appJsonPath = path.join(TENANTS_DIR, tenantId, 'apps', dirName, 'app.json');
  try {
    return JSON.parse(await readFile(appJsonPath, 'utf-8'));
  } catch {
    return null;
  }
}

/** 扫描租户下的所有应用 */
async function scanTenantApps(tenantId: string): Promise<any[]> {
  const appsDir = path.join(TENANTS_DIR, tenantId, 'apps');
  try {
    const entries = await readdir(appsDir, { withFileTypes: true });
    const metas = await Promise.all(
      entries
        .filter((e) => e.isDirectory())
        .map((e) => readAppMeta(tenantId, e.name)),
    );
    return metas.filter((meta) => meta !== null);
  } catch {
    return [];
  }
}

/**
 * 从文件名推导裸资源 ID
 *
 * 文件名格式：{type}_{uuid}.json → 裸 ID = uuid
 * JSON 内的 ID 字段已经是裸 ID，此函数仅用于 fallback。
 */
function resourceIdFromFilename(filename: string): string {
  return stripPrefix(filename.replace('.json', ''));
}

/**
 * 从文件读取资源内容（带前缀文件名）
 *
 * @param typeDir 资源类型目录（如 pages/）
 * @param filename 文件名（如 page_abc12345.json）
 * @returns 资源内容，读取失败返回 null
 */
async function readResourceFile(typeDir: string, filename: string): Promise<any | null> {
  try {
    return JSON.parse(await readFile(path.join(typeDir, filename), 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * 扫描应用目录下的所有资源
 *
 * @param appDir 应用目录路径
 * @returns 按类型分组的资源 Map（key 为裸 ID，value 为资源内容）
 */
async function scanAllResources(appDir: string): Promise<Map<string, Map<string, any>>> {
  const result = new Map<string, Map<string, any>>();

  for (const type of RESOURCE_TYPES) {
    const typeDir = path.join(appDir, type);
    const resourceMap = new Map<string, any>();
    try {
      const files = (await readdir(typeDir)).filter((f) => f.endsWith('.json'));
      for (const f of files) {
        const content = await readResourceFile(typeDir, f);
        if (content && !content._deleted) {
          const id = content[`${type.slice(0, -1)}Id`] || content.id || resourceIdFromFilename(f);
          resourceMap.set(id, content);
        }
      }
    } catch {
      // 目录不存在，跳过
    }
    result.set(type, resourceMap);
  }

  return result;
}

/**
 * Treeshake：从页面入口出发，递归收集所有被引用的资源 ID
 *
 * @param allResources 所有资源（按类型分组）
 * @returns 被引用的资源 ID 集合（按类型分组）
 */
function treeshake(allResources: Map<string, Map<string, any>>): Map<string, Set<string>> {
  const included = new Map<string, Set<string>>();
  for (const type of RESOURCE_TYPES) {
    included.set(type, new Set());
  }

  // 从所有页面出发（页面都是入口）
  const pages = allResources.get('pages');
  if (pages) {
    for (const [pageId, pageContent] of pages) {
      collectReferences(pageContent, allResources, included);
    }
  }

  return included;
}

/**
 * 递归收集资源引用
 *
 * @param content 当前资源内容
 * @param allResources 所有资源
 * @param included 已收集的资源 ID 集合
 */
function collectReferences(
  content: any,
  allResources: Map<string, Map<string, any>>,
  included: Map<string, Set<string>>,
): void {
  const refs = content.references;
  if (!refs || typeof refs !== 'object') return;

  for (const [type, ids] of Object.entries(refs)) {
    if (!Array.isArray(ids)) continue;
    const typeSet = included.get(type);
    if (!typeSet) continue;

    for (const ref of ids) {
      // 格式：跨应用 "appId.resourceId" 或 应用内 "resourceId"
      const refId = typeof ref === 'string' ? (ref.includes('.') ? ref.split('.')[1] : ref) : undefined;
      if (!refId || typeSet.has(refId)) continue;

      typeSet.add(refId);

      // 递归收集被引用资源的引用
      const resource = allResources.get(type)?.get(refId);
      if (resource) {
        collectReferences(resource, allResources, included);
      }
    }
  }
}

/** Create app routes */
export function createAppsRouter(manager?: DatabaseManager): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/apps' });
  const tableService = manager ? new TableService(manager) : null;

  /**
   * GET /api/apps
   * 获取应用列表(扫描所有租户的 apps 目录)
   */
  router.get('/', async (ctx) => {
    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    const allApps: any[] = [];

    if (tenantId) {
      // 指定租户（普通用户 或 平台管理员指定了租户）
      allApps.push(...(await scanTenantApps(tenantId)));
    } else {
      // 平台管理员未指定租户 → 扫描全部（管理后台场景）
      try {
        const entries = await readdir(TENANTS_DIR, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.startsWith('tenant_')) {
            const apps = await scanTenantApps(entry.name);
            allApps.push(...apps.map((app) => ({ ...app, tenantId: stripPrefix(entry.name) })));
          }
        }
      } catch {
        // tenants 目录不存在
      }
    }

    ctx.body = { success: true, apps: allApps };
  });

  /**
   * POST /api/apps
   * 创建应用(创建目录 + 写 app.json)
   */
  router.post('/', async (ctx) => {
    const { name, description, icon, tenantId } = ctx.request.body as {
      name?: string;
      description?: string;
      icon?: string;
      tenantId?: string;
    };

    if (!name) {
      ctx.status = 400;
      ctx.body = { success: false, error: '应用名称不能为空' };
      return;
    }

    const targetTenantId = (ctx.state as { tenantId: string }).tenantId || tenantId;
    if (!targetTenantId) {
      ctx.status = 400;
      ctx.body = { success: false, error: '没有可用的租户' };
      return;
    }

    const uuid = generateHexId();
    const appId = withPrefix(uuid, 'app'); // directory name: app_xxxxxxxx
    const now = Date.now();

    // Create directory
    const appDir = path.join(TENANTS_DIR, targetTenantId, 'apps', appId);
    const resourceDirs = [...RESOURCE_TYPES];
    for (const dir of resourceDirs) {
      await mkdir(path.join(appDir, dir), { recursive: true });
    }

    // Ensure uploads directory exists at tenant level
    const uploadsDir = path.join(TENANTS_DIR, targetTenantId, 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Write app.json (appId is unprefixed UUID, directory name has prefix)
    const appMeta = {
      schemaVersion: 1,
      version: 1,
      appId: uuid,
      name,
      description: description || '',
      icon: icon || '📦',
      appVersion: '1.0.0',
      status: 'draft',
      componentLibrary: 'antd',
      visibility: 'internal',
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
      expose: {},
    };
    await writeFile(
      path.join(appDir, 'app.json'),
      JSON.stringify(appMeta, null, 2),
    );

    ctx.status = 201;
    ctx.body = { success: true, app: appMeta };
  });

  /**
   * GET /api/apps/:appId
   * 获取应用详情(含资源列表)
   *
   * 加载策略：
   *   1. 优先尝试加载 dist/app.bundle.json（运行时优化）
   *   2. 如果 bundle 不存在，fallback 到逐文件扫描（开发环境）
   */
  router.get('/:appId', async (ctx) => {
    const { appId } = ctx.params;
    const tenantId = (ctx.state as { tenantId: string }).tenantId;

    if (!tenantId) {
      ctx.status = 400;
      ctx.body = { success: false, error: '缺少租户信息' };
      return;
    }

    const meta = await readAppMeta(tenantId, appId);
    if (!meta) {
      ctx.status = 404;
      ctx.body = { success: false, error: '应用不存在' };
      return;
    }

    const dirName = appId.startsWith('app_') ? appId : `app_${appId}`;
    const appDir = path.join(TENANTS_DIR, `tenant_${tenantId}`, 'apps', dirName);

    // 尝试加载 bundle
    const bundlePath = path.join(appDir, 'dist', 'app.bundle.json');
    try {
      const bundle = JSON.parse(await readFile(bundlePath, 'utf-8'));
      const resources: Record<string, any[]> = {};
      for (const [type, typeResources] of Object.entries(bundle.resources)) {
        resources[type] = Object.entries(typeResources as Record<string, any>).map(([id, content]) => ({
          id,
          name: content.name || id,
          schemaVersion: content.schemaVersion,
          version: content.version,
        }));
      }

      ctx.body = {
        success: true,
        app: { ...meta, tenantId },
        resources,
        fromBundle: true,
        publishedAt: bundle.publishedAt,
      };
      return;
    } catch {
      // bundle 不存在，fallback 到逐文件扫描
    }

    // Fallback：逐文件扫描
    const resourceTypes = RESOURCE_TYPES;
    const resources: Record<string, any[]> = {};

    for (const type of resourceTypes) {
      const typeDir = path.join(appDir, type);
      try {
        const files = (await readdir(typeDir)).filter((f) => f.endsWith('.json'));
        resources[type] = await Promise.all(
          files.map(async (f) => {
            try {
              const content = JSON.parse(await readFile(path.join(typeDir, f), 'utf-8'));
              return {
                id: content[`${type.slice(0, -1)}Id`] || content.id || resourceIdFromFilename(f),
                name: content.name || resourceIdFromFilename(f),
                schemaVersion: content.schemaVersion,
                version: content.version,
              };
            } catch {
              return { id: resourceIdFromFilename(f), name: resourceIdFromFilename(f) };
            }
          }),
        );
      } catch {
        resources[type] = [];
      }
    }

    ctx.body = {
      success: true,
      app: { ...meta, tenantId },
      resources,
      fromBundle: false,
    };
  });

  /**
   * PUT /api/apps/:appId
   * 更新应用元信息
   */
  router.put('/:appId', async (ctx) => {
    const { appId } = ctx.params;
    const updates = ctx.request.body as Record<string, any>;
    const tenantId = (ctx.state as { tenantId: string }).tenantId;

    if (!tenantId) {
      ctx.status = 400;
      ctx.body = { success: false, error: '缺少租户信息' };
      return;
    }

    const meta = await readAppMeta(tenantId, appId);
    if (!meta) {
      ctx.status = 404;
      ctx.body = { success: false, error: '应用不存在' };
      return;
    }

    const dirName = appId.startsWith('app_') ? appId : `app_${appId}`;
    const updated = {
      ...meta,
      ...updates,
      appId: meta.appId,
      schemaVersion: meta.schemaVersion,
      updatedAt: Date.now(),
      version: (meta.version || 0) + 1,
    };

    const appJsonPath = path.join(TENANTS_DIR, `tenant_${tenantId}`, 'apps', dirName, 'app.json');
    await writeFile(appJsonPath, JSON.stringify(updated, null, 2));

    ctx.body = { success: true, app: updated };
  });

  /**
   * DELETE /api/apps/:appId
   * 删除应用(删除整个目录)
   */
  router.delete('/:appId', async (ctx) => {
    const { appId } = ctx.params;
    const tenantId = (ctx.state as { tenantId: string }).tenantId;

    if (!tenantId) {
      ctx.status = 400;
      ctx.body = { success: false, error: '缺少租户信息' };
      return;
    }

    const dirName = appId.startsWith('app_') ? appId : `app_${appId}`;
    const appDir = path.join(TENANTS_DIR, `tenant_${tenantId}`, 'apps', dirName);

    if (await existsAsync(appDir)) {
      await rm(appDir, { recursive: true, force: true });
      ctx.body = { success: true };
      return;
    }

    ctx.status = 404;
    ctx.body = { success: false, error: '应用不存在' };
  });

  /**
   * GET /api/apps/:appId/:resourceType
   * 获取资源列表（单个类型）
   */
  router.get('/:appId/:resourceType', async (ctx) => {
    const { appId, resourceType } = ctx.params;

    // 验证资源类型
    const validTypes = [...RESOURCE_TYPES];
    if (!validTypes.includes(resourceType)) {
      ctx.status = 400;
      ctx.body = { success: false, error: `无效的资源类型: ${resourceType}` };
      return;
    }

    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    const appDir = tenantId ? await resolveAppDir(tenantId, appId) : null;
    if (!appDir) {
      ctx.status = 404;
      ctx.body = { success: false, error: '应用不存在' };
      return;
    }

    const typeDir = path.join(appDir, resourceType);
    const prefix = resourceType.slice(0, -1);

    try {
      const files = (await readdir(typeDir)).filter((f) => f.endsWith('.json'));
      const resources = (await Promise.all(
        files.map(async (f) => {
          try {
            const content = JSON.parse(await readFile(path.join(typeDir, f), 'utf-8'));
            // 跳过已删除的资源
            if (content._deleted) return null;
            return {
              id: content[`${prefix}Id`] || content.id || resourceIdFromFilename(f),
              tableId: content.tableId || content[`${prefix}Id`] || resourceIdFromFilename(f),
              name: content.name || resourceIdFromFilename(f),
              schemaVersion: content.schemaVersion,
              version: content.version,
            };
          } catch {
            return { id: resourceIdFromFilename(f), name: resourceIdFromFilename(f) };
          }
        }),
      )).filter(Boolean);

      ctx.body = { success: true, resources };
    } catch {
      ctx.body = { success: true, resources: [] };
    }
  });

  /**
   * POST /api/apps/:appId/:resourceType
   * 创建资源（页面、卡片、表单、数据表、流程等）
   *
   * 请求体：{ name: string, [key: string]: any }
   * 响应：{ success: true, resource: { id, name } }
   */
  router.post('/:appId/:resourceType', async (ctx) => {
    const { appId, resourceType } = ctx.params;
    const body = ctx.request.body as Record<string, any>;
    const { name, layout, description, schema, ...rest } = body;

    if (!name) {
      ctx.status = 400;
      ctx.body = { success: false, error: '资源名称不能为空' };
      return;
    }

    // 验证资源类型
    const validTypes = [...RESOURCE_TYPES];
    if (!validTypes.includes(resourceType)) {
      ctx.status = 400;
      ctx.body = { success: false, error: `无效的资源类型: ${resourceType}` };
      return;
    }

    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    const appDir = tenantId ? await resolveAppDir(tenantId, appId) : null;
    if (!appDir) {
      ctx.status = 404;
      ctx.body = { success: false, error: '应用不存在' };
      return;
    }

    const uuid = generateHexId();
    const prefix = resourceType.slice(0, -1); // pages → page, tables → table, workflows → workflow
    const filename = `${prefix}_${uuid}.json`;
    const resourceDir = path.join(appDir, resourceType);

    // 确保目录存在
    await mkdir(resourceDir, { recursive: true });

    // 构建资源内容
    const now = Date.now();
    const resourceContent: Record<string, any> = {
      schemaVersion: 1,
      version: 1,
      name,
      createdAt: now,
      updatedAt: now,
      references: {},
      ...rest,
    };

    // 设置资源 ID 字段
    const idField = `${prefix}Id`;
    resourceContent[idField] = uuid;

    // 页面类型：添加布局配置
    if (resourceType === 'pages') {
      resourceContent.layout = layout || { type: 'grid', columns: 24, gap: 16 };
      resourceContent.components = [];
    }

    // 数据表类型：添加空字段列表
    if (resourceType === 'tables') {
      resourceContent.columns = [];
    }

    // 流程类型：添加描述和默认 BPMN schema（含开始/结束节点）
    if (resourceType === 'workflows') {
      if (description) resourceContent.description = description;
      // 如果未提供 schema，使用默认的 BPMN 结构
      resourceContent.schema = schema || {
        id: `workflow_${uuid}`,
        name: name,
        processes: [
          {
            id: 'process_1',
            name: '主流程',
            nodes: [
              {
                id: 'start_1',
                $type: 'bpmn:StartEvent',
                name: '开始',
                outgoing: ['edge_start_to_end'],
              },
              {
                id: 'end_1',
                $type: 'bpmn:EndEvent',
                name: '结束',
                incoming: ['edge_start_to_end'],
              },
            ],
            edges: [
              {
                id: 'edge_start_to_end',
                $type: 'bpmn:SequenceFlow',
                name: '',
                sourceRef: 'start_1',
                targetRef: 'end_1',
              },
            ],
          },
        ],
      };
      resourceContent.status = 'DRAFT';
    }

    // 自动化类型：添加触发器和动作
    if (resourceType === 'automations') {
      if (description) resourceContent.description = description;
      resourceContent.status = 'draft';
      resourceContent.trigger = body.trigger || {};
      resourceContent.condition = body.condition || null;
      resourceContent.actions = body.actions || [];
      resourceContent.throttle = body.throttle || null;
      resourceContent.effectiveTime = body.effectiveTime || null;
    }

    // 写入文件
    await writeFile(
      path.join(resourceDir, filename),
      JSON.stringify(resourceContent, null, 2),
    );

    ctx.status = 201;
    ctx.body = {
      success: true,
      resource: { id: uuid, name },
    };
  });

  /**
   * GET /api/apps/:appId/automations/:ruleId/logs
   * 获取自动化规则执行日志
   */
  router.get('/:appId/automations/:ruleId/logs', async (ctx) => {
    const { appId, ruleId } = ctx.params;
    const tenantId = (ctx.state as { tenantId: string }).tenantId;

    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    if (!manager) {
      ctx.status = 500;
      ctx.body = { error: '数据库未初始化' };
      return;
    }

    const limit = parseInt(ctx.query.limit as string) || 20;
    const offset = parseInt(ctx.query.offset as string) || 0;

    try {
      const db = manager.getTenantDb(tenantId);

      const logs = db.prepare(
        `SELECT * FROM automation_execution_logs
         WHERE rule_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
      ).all(ruleId, limit, offset);

      const total = db.prepare(
        'SELECT COUNT(*) as count FROM automation_execution_logs WHERE rule_id = ?',
      ).get(ruleId);

      ctx.body = {
        data: logs,
        total: (total as Record<string, unknown>)?.count || 0,
        limit,
        offset,
      };
    } catch (error) {
      console.error('[Apps] 查询自动化日志失败:', error);
      ctx.body = { data: [], total: 0 };
    }
  });

  /**
   * GET /api/apps/:appId/:resourceType/:resourceId
   * 获取单个资源内容
   */
  router.get('/:appId/:resourceType/:resourceId', async (ctx) => {
    const { appId, resourceType, resourceId } = ctx.params;

    const validTypes = [...RESOURCE_TYPES];
    if (!validTypes.includes(resourceType)) {
      ctx.status = 400;
      ctx.body = { success: false, error: `无效的资源类型: ${resourceType}` };
      return;
    }

    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    const appDir = tenantId ? await resolveAppDir(tenantId, appId) : null;
    if (!appDir) {
      ctx.status = 404;
      ctx.body = { success: false, error: '应用不存在' };
      return;
    }

    const prefix = resourceType.slice(0, -1);
    const filename = `${prefix}_${resourceId}.json`;
    const filePath = path.join(appDir, resourceType, filename);

    if (!(await existsAsync(filePath))) {
      ctx.status = 404;
      ctx.body = { success: false, error: '资源不存在' };
      return;
    }

    try {
      const content = JSON.parse(await readFile(filePath, 'utf-8'));
      ctx.body = { success: true, resource: content };
    } catch {
      ctx.status = 500;
      ctx.body = { success: false, error: '读取资源失败' };
    }
  });

  /**
   * PUT /api/apps/:appId/:resourceType/:resourceId
   * 更新资源（页面 schema、卡片 schema 等）
   */
  router.put('/:appId/:resourceType/:resourceId', async (ctx) => {
    const { appId, resourceType, resourceId } = ctx.params;
    const updates = ctx.request.body as Record<string, any>;

    // 验证资源类型
    const validTypes = [...RESOURCE_TYPES];
    if (!validTypes.includes(resourceType)) {
      ctx.status = 400;
      ctx.body = { success: false, error: `无效的资源类型: ${resourceType}` };
      return;
    }

    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    const appDir = tenantId ? await resolveAppDir(tenantId, appId) : null;
    if (!appDir) {
      ctx.status = 404;
      ctx.body = { success: false, error: '应用不存在' };
      return;
    }
    const prefix = resourceType.slice(0, -1);
    const filename = `${prefix}_${resourceId}.json`;
    const filePath = path.join(appDir, resourceType, filename);

    if (!(await existsAsync(filePath))) {
      ctx.status = 404;
      ctx.body = { success: false, error: '资源不存在' };
      return;
    }

    // 读取现有内容并合并更新
    let existing: Record<string, any>;
    try {
      existing = JSON.parse(await readFile(filePath, 'utf-8'));
    } catch {
      ctx.status = 500;
      ctx.body = { success: false, error: '读取资源失败' };
      return;
    }

    // 过滤已废弃字段
    if (resourceType === 'pages') {
      delete updates.title;
      delete updates.route;
    }

    const updated = {
      ...existing,
      ...updates,
      [`${prefix}Id`]: existing[`${prefix}Id`], // 不允许修改 ID
      updatedAt: Date.now(),
      version: (existing.version || 0) + 1,
    };

    // 清除已有数据中的废弃字段
    if (resourceType === 'pages') {
      delete updated.title;
      delete updated.route;
    }

    await writeFile(filePath, JSON.stringify(updated, null, 2));

    // 数据表类型：同步物理表
    if (resourceType === 'tables' && tableService) {
      try {
        const tenantDirName = `tenant_${tenantId}`;
        const tableId = resourceId;

        // 读取旧 Schema（如果有）
        let oldSchema: any;
        try {
          const oldContent = JSON.parse(await readFile(filePath, 'utf-8'));
          // 移除本次更新的字段，得到更新前的状态
          delete oldContent.updatedAt;
          delete oldContent.version;
          oldSchema = oldContent;
        } catch {
          // 新表，无旧 Schema
        }

        // 类型转换：将 updated 对象转为 TableSchema
        const tableSchema = updated as any;
        await tableService.syncTableSchema(tenantDirName, tableId, tableSchema, oldSchema);
        console.log(`[TableService] 同步物理表成功: ${tenantDirName}/${tableId}`);
      } catch (err) {
        console.error('[TableService] 同步物理表失败:', err);
        // 不阻塞响应，Schema JSON 已保存成功
      }
    }

    ctx.body = { success: true, resource: updated };
  });

  /**
   * DELETE /api/apps/:appId/:resourceType/:resourceId
   * 删除资源（硬删除：物理删除文件）
   */
  router.delete('/:appId/:resourceType/:resourceId', async (ctx) => {
    const { appId, resourceType, resourceId } = ctx.params;

    // 验证资源类型
    const validTypes = [...RESOURCE_TYPES];
    if (!validTypes.includes(resourceType)) {
      ctx.status = 400;
      ctx.body = { success: false, error: `无效的资源类型: ${resourceType}` };
      return;
    }

    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    const appDir = tenantId ? await resolveAppDir(tenantId, appId) : null;
    if (!appDir) {
      ctx.status = 404;
      ctx.body = { success: false, error: '应用不存在' };
      return;
    }

    const prefix = resourceType.slice(0, -1); // pages → page, tables → table
    const filename = `${prefix}_${resourceId}.json`;
    const filePath = path.join(appDir, resourceType, filename);

    if (!(await existsAsync(filePath))) {
      ctx.status = 404;
      ctx.body = { success: false, error: '资源不存在' };
      return;
    }

    // 硬删除：物理删除文件
    try {
      await unlink(filePath);
    } catch {
      ctx.status = 500;
      ctx.body = { success: false, error: '删除失败' };
      return;
    }

    ctx.body = { success: true };
  });

  /**
   * POST /api/apps/:appId/publish
   * 发布应用 — treeshake + 合并为单个 bundle
   *
   * 1. 扫描应用内所有资源
   * 2. 从页面入口 treeshake，收集所有被引用的资源
   * 3. 合并为 dist/app.bundle.json
   * 4. 更新 app.json 状态为 published
   */
  router.post('/:appId/publish', async (ctx) => {
    const { appId } = ctx.params;

    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    const appDir = tenantId ? await resolveAppDir(tenantId, appId) : null;
    if (!appDir) {
      ctx.status = 404;
      ctx.body = { success: false, error: '应用不存在' };
      return;
    }

    const now = Date.now();

    // 1. 扫描所有资源
    const allResources = await scanAllResources(appDir);

    // 2. Treeshake
    const included = treeshake(allResources);

    // 3. 构建 bundle
    const bundleResources: Record<string, Record<string, any>> = {};
    let totalCount = 0;

    for (const type of RESOURCE_TYPES) {
      const typeMap = allResources.get(type);
      const typeIncluded = included.get(type);
      if (!typeMap || !typeIncluded) continue;

      const typeBundle: Record<string, any> = {};
      for (const id of typeIncluded) {
        const content = typeMap.get(id);
        if (content) {
          typeBundle[id] = content;
          totalCount++;
        }
      }

      // 页面全部包含（页面是入口，不做 treeshake 过滤）
      if (type === 'pages') {
        for (const [id, content] of typeMap) {
          if (!typeBundle[id]) {
            typeBundle[id] = content;
            totalCount++;
          }
        }
      }

      if (Object.keys(typeBundle).length > 0) {
        bundleResources[type] = typeBundle;
      }
    }

    // 4. 写入 bundle
    const distDir = path.join(appDir, 'dist');
    await mkdir(distDir, { recursive: true });

    const bundle = {
      appId: stripPrefix(appId),
      publishedAt: now,
      resourceCount: totalCount,
      resources: bundleResources,
    };

    await writeFile(
      path.join(distDir, 'app.bundle.json'),
      JSON.stringify(bundle, null, 2),
    );

    // 5. 更新 app.json 状态
    const metaPath = path.join(appDir, 'app.json');
    try {
      const meta = JSON.parse(await readFile(metaPath, 'utf-8'));
      meta.status = 'published';
      meta.publishedAt = now;
      meta.bundleSize = totalCount;
      meta.updatedAt = now;
      meta.version = (meta.version || 0) + 1;
      await writeFile(metaPath, JSON.stringify(meta, null, 2));
    } catch {
      // ignore
    }

    ctx.body = {
      success: true,
      bundle: {
        appId: stripPrefix(appId),
        publishedAt: now,
        resourceCount: totalCount,
        types: Object.keys(bundleResources),
      },
    };
  });

  /**
   * GET /api/apps/:appId/check-updates
   * 检查引用了指定资源的应用是否需要重新发布
   *
   * 查询参数：
   *   resourceType — 被修改的资源类型
   *   resourceId — 被修改的资源 ID
   *
   * 返回引用了该资源且已发布但 bundle 中包含该资源的应用列表
   */
  router.get('/:appId/check-updates', async (ctx) => {
    const { appId } = ctx.params;
    const { resourceType, resourceId } = ctx.query as {
      resourceType?: string;
      resourceId?: string;
    };

    if (!resourceType || !resourceId) {
      ctx.status = 400;
      ctx.body = { success: false, error: '缺少 resourceType 或 resourceId 参数' };
      return;
    }

    // 检查引用了指定资源的已发布应用
    const affectedApps: Array<{ appId: string; name: string; tenantId: string }> = [];
    const currentTenantId = (ctx.state as { tenantId: string }).tenantId;

    // 确定要扫描的租户列表
    const tenantDirs: Array<{ name: string; id: string }> = [];
    if (currentTenantId) {
      tenantDirs.push({ name: `tenant_${currentTenantId}`, id: currentTenantId });
    } else {
      // 平台管理员未指定租户 → 扫描全部
      try {
        const entries = await readdir(TENANTS_DIR, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.startsWith('tenant_')) {
            tenantDirs.push({ name: entry.name, id: stripPrefix(entry.name) });
          }
        }
      } catch {
        // ignore
      }
    }

    for (const { name: tenantDirName, id: tid } of tenantDirs) {
      const appsDir = path.join(TENANTS_DIR, tenantDirName, 'apps');
      try {
        const appEntries = await readdir(appsDir, { withFileTypes: true });
        for (const appEntry of appEntries) {
          if (!appEntry.isDirectory()) continue;

          const meta = await readAppMeta(tenantDirName, appEntry.name);
          if (!meta) continue;

          const refs = meta.references;
          if (refs && typeof refs === 'object') {
            const typeRefs = refs[resourceType];
            if (Array.isArray(typeRefs)) {
              const found = typeRefs.some((ref: string) => {
                const parts = ref.split('.');
                return parts.length === 2 && parts[1] === resourceId;
              });
              if (found && meta.status === 'published') {
                affectedApps.push({
                  appId: meta.appId,
                  name: meta.name,
                  tenantId: tid,
                });
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    ctx.body = { success: true, affectedApps };
  });

  // 挂载运算规则子路由
  router.use(
    '/:appId/computations',
    createComputationsRouter().routes(),
    createComputationsRouter().allowedMethods()
  );

  return router;
}
