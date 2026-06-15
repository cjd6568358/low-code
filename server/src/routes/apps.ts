// App routes
// Data source: tenants/{tenantId}/apps/*/app.json
// POST /api/apps
// GET  /api/apps
// GET  /api/apps/:appId
// PUT  /api/apps/:appId
// DELETE /api/apps/:appId

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import KoaRouter from '@koa/router';
import { TENANTS_DIR } from '../config/index.js';

/** Generate 8-char hex UUID (no prefix) */
function generateUuid(): string {
  return crypto.randomBytes(4).toString('hex');
}

/** Add prefix for directory/file names */
function withPrefix(uuid: string, prefix: string): string {
  return `${prefix}_${uuid}`;
}

/** 读取单个应用的 app.json */
function readAppMeta(tenantId: string, appId: string): any | null {
  const appJsonPath = path.join(TENANTS_DIR, tenantId, 'apps', appId, 'app.json');
  try {
    return JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
  } catch {
    return null;
  }
}

/** 扫描租户下的所有应用 */
function scanTenantApps(tenantId: string): any[] {
  const appsDir = path.join(TENANTS_DIR, tenantId, 'apps');
  try {
    const entries = fs.readdirSync(appsDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => readAppMeta(tenantId, e.name))
      .filter((meta) => meta !== null);
  } catch {
    return [];
  }
}

/** 获取第一个活跃租户 ID */
function getFirstTenantId(): string | null {
  try {
    const entries = fs.readdirSync(TENANTS_DIR, { withFileTypes: true });
    const tenant = entries.find((e) => e.isDirectory() && e.name.startsWith('tenant_'));
    return tenant?.name || null;
  } catch {
    return null;
  }
}

/** Strip prefix from ID (e.g., "app_80e88653" -> "80e88653") */
function stripPrefix(id: string): string {
  const idx = id.indexOf('_');
  return idx >= 0 ? id.substring(idx + 1) : id;
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

/** 资源类型列表 */
const RESOURCE_TYPES = ['pages', 'cards', 'forms', 'tables', 'workflows', 'automations', 'computations'] as const;

/**
 * 从文件读取资源内容（带前缀文件名）
 *
 * @param typeDir 资源类型目录（如 pages/）
 * @param filename 文件名（如 page_abc12345.json）
 * @returns 资源内容，读取失败返回 null
 */
function readResourceFile(typeDir: string, filename: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(typeDir, filename), 'utf-8'));
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
function scanAllResources(appDir: string): Map<string, Map<string, any>> {
  const result = new Map<string, Map<string, any>>();

  for (const type of RESOURCE_TYPES) {
    const typeDir = path.join(appDir, type);
    const resourceMap = new Map<string, any>();
    try {
      const files = fs.readdirSync(typeDir).filter((f) => f.endsWith('.json'));
      for (const f of files) {
        const content = readResourceFile(typeDir, f);
        if (content) {
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

/**
 * 查找应用目录和租户 ID
 *
 * @param appId 应用 ID（带前缀或裸 ID）
 * @returns [tenantDirName, appDirPath] 或 null
 */
function findAppDir(appId: string): [string, string] | null {
  try {
    const entries = fs.readdirSync(TENANTS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('tenant_')) continue;
      const appDir = path.join(TENANTS_DIR, entry.name, 'apps', appId);
      if (fs.existsSync(path.join(appDir, 'app.json'))) {
        return [entry.name, appDir];
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/** Create app routes */
export function createAppsRouter(): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/apps' });

  /**
   * GET /api/apps
   * 获取应用列表(扫描所有租户的 apps 目录)
   */
  router.get('/', async (ctx) => {
    const { tenantId } = ctx.query as { tenantId?: string };

    const allApps: any[] = [];

    if (tenantId) {
      // 指定租户
      allApps.push(...scanTenantApps(tenantId));
    } else {
      // 所有租户
      try {
        const entries = fs.readdirSync(TENANTS_DIR, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.startsWith('tenant_')) {
            const apps = scanTenantApps(entry.name);
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

    const targetTenantId = tenantId || getFirstTenantId();
    if (!targetTenantId) {
      ctx.status = 400;
      ctx.body = { success: false, error: '没有可用的租户' };
      return;
    }

    const uuid = generateUuid();
    const appId = withPrefix(uuid, 'app'); // directory name: app_xxxxxxxx
    const now = Date.now();

    // Create directory
    const appDir = path.join(TENANTS_DIR, targetTenantId, 'apps', appId);
    const resourceDirs = ['pages', 'cards', 'forms', 'tables', 'workflows', 'automations', 'computations'];
    for (const dir of resourceDirs) {
      fs.mkdirSync(path.join(appDir, dir), { recursive: true });
    }

    // Ensure uploads directory exists at tenant level
    const uploadsDir = path.join(TENANTS_DIR, targetTenantId, 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });

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
      references: {},
      expose: {},
    };
    fs.writeFileSync(
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

    // 在所有租户中查找
    try {
      const entries = fs.readdirSync(TENANTS_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.startsWith('tenant_')) continue;

        const meta = readAppMeta(entry.name, appId);
        if (!meta) continue;

        const appDir = path.join(TENANTS_DIR, entry.name, 'apps', appId);

        // 尝试加载 bundle
        const bundlePath = path.join(appDir, 'dist', 'app.bundle.json');
        try {
          const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));
          // bundle 模式：资源已经是完整的对象，转为列表格式返回
          const resources: Record<string, any[]> = {};
          for (const [type, typeResources] of Object.entries(bundle.resources)) {
            resources[type] = Object.entries(typeResources as Record<string, any>).map(([id, content]) => ({
              id,
              name: content.name || content.title || id,
              schemaVersion: content.schemaVersion,
              version: content.version,
            }));
          }

          ctx.body = {
            success: true,
            app: { ...meta, tenantId: stripPrefix(entry.name) },
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
            const files = fs.readdirSync(typeDir).filter((f) => f.endsWith('.json'));
            resources[type] = files.map((f) => {
              try {
                const content = JSON.parse(fs.readFileSync(path.join(typeDir, f), 'utf-8'));
                return {
                  id: content[`${type.slice(0, -1)}Id`] || content.id || resourceIdFromFilename(f),
                  name: content.name || content.title || resourceIdFromFilename(f),
                  schemaVersion: content.schemaVersion,
                  version: content.version,
                };
              } catch {
                return { id: resourceIdFromFilename(f), name: resourceIdFromFilename(f) };
              }
            });
          } catch {
            resources[type] = [];
          }
        }

        ctx.body = {
          success: true,
          app: { ...meta, tenantId: stripPrefix(entry.name) },
          resources,
          fromBundle: false,
        };
        return;
      }
    } catch {
      // ignore
    }

    ctx.status = 404;
    ctx.body = { success: false, error: '应用不存在' };
  });

  /**
   * PUT /api/apps/:appId
   * 更新应用元信息
   */
  router.put('/:appId', async (ctx) => {
    const { appId } = ctx.params;
    const updates = ctx.request.body as Record<string, any>;

    try {
      const entries = fs.readdirSync(TENANTS_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.startsWith('tenant_')) continue;

        const meta = readAppMeta(entry.name, appId);
        if (!meta) continue;

        // 合并更新
        const updated = {
          ...meta,
          ...updates,
          appId: meta.appId, // 不允许修改 ID
          schemaVersion: meta.schemaVersion, // 不允许通过此接口修改
          updatedAt: Date.now(),
          version: (meta.version || 0) + 1,
        };

        const appJsonPath = path.join(TENANTS_DIR, entry.name, 'apps', appId, 'app.json');
        fs.writeFileSync(appJsonPath, JSON.stringify(updated, null, 2));

        ctx.body = { success: true, app: updated };
        return;
      }
    } catch {
      // ignore
    }

    ctx.status = 404;
    ctx.body = { success: false, error: '应用不存在' };
  });

  /**
   * DELETE /api/apps/:appId
   * 删除应用(删除整个目录)
   */
  router.delete('/:appId', async (ctx) => {
    const { appId } = ctx.params;

    try {
      const entries = fs.readdirSync(TENANTS_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.startsWith('tenant_')) continue;

        const appDir = path.join(TENANTS_DIR, entry.name, 'apps', appId);
        if (fs.existsSync(appDir)) {
          fs.rmSync(appDir, { recursive: true, force: true });
          ctx.body = { success: true };
          return;
        }
      }
    } catch {
      // ignore
    }

    ctx.status = 404;
    ctx.body = { success: false, error: '应用不存在' };
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

    const found = findAppDir(appId);
    if (!found) {
      ctx.status = 404;
      ctx.body = { success: false, error: '应用不存在' };
      return;
    }

    const [tenantDir, appDir] = found;
    const now = Date.now();

    // 1. 扫描所有资源
    const allResources = scanAllResources(appDir);

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
    fs.mkdirSync(distDir, { recursive: true });

    const bundle = {
      appId: stripPrefix(appId),
      publishedAt: now,
      resourceCount: totalCount,
      resources: bundleResources,
    };

    fs.writeFileSync(
      path.join(distDir, 'app.bundle.json'),
      JSON.stringify(bundle, null, 2),
    );

    // 5. 更新 app.json 状态
    const metaPath = path.join(appDir, 'app.json');
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      meta.status = 'published';
      meta.publishedAt = now;
      meta.bundleSize = totalCount;
      meta.updatedAt = now;
      meta.version = (meta.version || 0) + 1;
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
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

    // 遍历所有租户的所有应用，检查 references 中是否引用了指定资源
    const affectedApps: Array<{ appId: string; name: string; tenantId: string }> = [];

    try {
      const entries = fs.readdirSync(TENANTS_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.startsWith('tenant_')) continue;

        const appsDir = path.join(TENANTS_DIR, entry.name, 'apps');
        try {
          const appEntries = fs.readdirSync(appsDir, { withFileTypes: true });
          for (const appEntry of appEntries) {
            if (!appEntry.isDirectory()) continue;

            const meta = readAppMeta(entry.name, appEntry.name);
            if (!meta) continue;

            // 检查 references 中是否有匹配的资源
            // 格式：{ "tables": ["appId.resourceId"] }
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
                    tenantId: stripPrefix(entry.name),
                  });
                }
              }
            }
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }

    ctx.body = { success: true, affectedApps };
  });

  return router;
}
