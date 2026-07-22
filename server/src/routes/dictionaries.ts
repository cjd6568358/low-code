/**
 * 字典路由
 *
 * 提供字典查询 API，支持全局字典和租户字典。
 * 租户字典覆盖全局同名字典。
 *
 * GET /api/dictionaries           — 获取字典列表（仅元信息）
 * GET /api/dictionaries/:code     — 获取单个字典（含字典项）
 * POST /api/dictionaries/batch    — 批量获取字典
 * GET /api/dictionaries/:code/search — 搜索字典项
 * POST /api/dictionaries/refresh  — 刷新缓存
 */

import KoaRouter from '@koa/router';
import { DictionaryService } from '../services/DictionaryService.js';
import { DATA_DIR, TENANTS_DIR } from '../config/index.js';

/** 创建字典路由 */
export function createDictionariesRouter(): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/dictionaries' });
  const service = new DictionaryService(DATA_DIR, TENANTS_DIR);

  /**
   * 获取当前租户 ID（从 JWT 中间件注入）
   */
  function getTenantId(ctx: KoaRouter.RouterContext): string | undefined {
    return (ctx.state as { tenantId?: string }).tenantId;
  }

  /**
   * GET /api/dictionaries
   * 获取字典列表（仅元信息，不含字典项）
   *
   * 有租户信息时返回全局 + 租户字典（租户覆盖全局）
   * 无租户信息时仅返回全局字典
   */
  router.get('/', async (ctx) => {
    const tenantId = getTenantId(ctx);

    try {
      const dicts = await service.listDicts(tenantId);
      ctx.body = { success: true, data: dicts };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error instanceof Error ? error.message : '获取字典列表失败',
      };
    }
  });

  /**
   * GET /api/dictionaries/:code
   * 获取单个字典（含字典项）
   */
  router.get('/:code', async (ctx) => {
    const { code } = ctx.params;
    const tenantId = getTenantId(ctx);

    try {
      const result = await service.getDict(code, tenantId);

      if (!result.success) {
        ctx.status = 404;
        ctx.body = { success: false, error: result.error };
        return;
      }

      ctx.body = { success: true, data: result.data };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error instanceof Error ? error.message : '获取字典失败',
      };
    }
  });

  /**
   * POST /api/dictionaries/batch
   * 批量获取字典
   *
   * 请求体：{ codes: string[] }
   * 响应：{ success: true, data: Record<string, DictDefinition | null> }
   */
  router.post('/batch', async (ctx) => {
    const { codes } = ctx.request.body as { codes?: string[] };
    const tenantId = getTenantId(ctx);

    if (!Array.isArray(codes) || codes.length === 0) {
      ctx.status = 400;
      ctx.body = { success: false, error: '缺少 codes 参数' };
      return;
    }

    if (codes.length > 50) {
      ctx.status = 400;
      ctx.body = { success: false, error: '单次最多查询 50 个字典' };
      return;
    }

    try {
      const data = await service.getDicts(codes, tenantId);
      ctx.body = { success: true, data };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error instanceof Error ? error.message : '批量获取字典失败',
      };
    }
  });

  /**
   * GET /api/dictionaries/:code/search?q=keyword
   * 搜索字典项
   */
  router.get('/:code/search', async (ctx) => {
    const { code } = ctx.params;
    const { q } = ctx.query as { q?: string };
    const tenantId = getTenantId(ctx);

    if (!q || q.trim().length === 0) {
      ctx.status = 400;
      ctx.body = { success: false, error: '缺少搜索关键词' };
      return;
    }

    try {
      const items = await service.searchItems(code, q.trim(), tenantId);
      ctx.body = { success: true, data: items };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error instanceof Error ? error.message : '搜索字典项失败',
      };
    }
  });

  /**
   * POST /api/dictionaries/refresh
   * 刷新字典缓存（管理员接口）
   *
   * 有租户信息时仅刷新该租户缓存
   * 无租户信息时刷新全部缓存
   */
  router.post('/refresh', async (ctx) => {
    const tenantId = getTenantId(ctx);

    try {
      await service.refresh(tenantId);
      ctx.body = { success: true, message: '字典缓存已刷新' };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error instanceof Error ? error.message : '刷新字典缓存失败',
      };
    }
  });

  return router;
}
