/**
 * 消息中心路由
 *
 * 提供用户消息的查询和操作。
 * 数据存储在 tenant SQLite 数据库的 messages 表。
 */

import KoaRouter from '@koa/router';
import { getDbManager } from '../config/db.js';
import { TENANTS_DIR } from '../config/index.js';
import fs from 'fs';

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

/**
 * 创建消息中心路由
 */
export function createMessagesRouter(): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/messages' });

  // GET /api/messages - 查询消息列表
  router.get('/', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);
    const recipientId = ctx.query.recipientId as string | undefined;
    const isRead = ctx.query.isRead as string | undefined;
    const category = ctx.query.category as string | undefined;
    const limit = parseInt(ctx.query.limit as string || '50', 10);
    const offset = parseInt(ctx.query.offset as string || '0', 10);

    try {
      let sql = 'SELECT * FROM messages WHERE 1=1';
      const params: (string | number)[] = [];

      if (recipientId) {
        sql += ' AND recipient_id = ?';
        params.push(recipientId);
      }

      if (isRead !== undefined) {
        sql += ' AND is_read = ?';
        params.push(isRead === 'true' || isRead === '1' ? 1 : 0);
      }

      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }

      // 获取总数
      const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) AS total');
      const countRow = db.prepare(countSql).get(...params) as { total: number };

      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const rows = db.prepare(sql).all(...params) as Array<{
        id: number;
        recipient_id: string;
        sender_id: string | null;
        category: string;
        title: string;
        content: string;
        content_type: string;
        action_url: string | null;
        is_read: number;
        read_at: string | null;
        channel: string;
        status: string;
        related_type: string | null;
        related_id: string | null;
        created_at: string;
      }>;

      const messages = rows.map((r) => ({
        id: r.id,
        recipientId: r.recipient_id,
        senderId: r.sender_id,
        category: r.category,
        title: r.title,
        content: r.content,
        contentType: r.content_type,
        actionUrl: r.action_url,
        isRead: r.is_read === 1,
        readAt: r.read_at,
        channel: r.channel,
        status: r.status,
        relatedType: r.related_type,
        relatedId: r.related_id,
        createdAt: r.created_at,
      }));

      ctx.body = { success: true, messages, total: countRow.total };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '查询消息失败' };
    }
  });

  // GET /api/messages/unread-count - 未读消息数量
  router.get('/unread-count', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);
    const recipientId = ctx.query.recipientId as string | undefined;

    try {
      let sql = 'SELECT COUNT(*) AS count FROM messages WHERE is_read = 0';
      const params: string[] = [];

      if (recipientId) {
        sql += ' AND recipient_id = ?';
        params.push(recipientId);
      }

      const row = db.prepare(sql).get(...params) as { count: number };
      ctx.body = { success: true, count: row.count };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '查询未读消息数失败' };
    }
  });

  // PUT /api/messages/:id/read - 标记单条消息已读
  router.put('/:id/read', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);
    const msgId = parseInt(ctx.params.id, 10);

    try {
      const result = db.prepare(`
        UPDATE messages SET is_read = 1, read_at = datetime('now') WHERE id = ?
      `).run(msgId);

      if (result.changes === 0) {
        ctx.status = 404;
        ctx.body = { success: false, error: '消息不存在' };
        return;
      }

      ctx.body = { success: true };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '标记已读失败' };
    }
  });

  // POST /api/messages/read-all - 全部标记已读
  router.post('/read-all', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);
    const body = ctx.request.body as { recipientId?: string };

    try {
      if (body.recipientId) {
        db.prepare(`
          UPDATE messages SET is_read = 1, read_at = datetime('now')
          WHERE recipient_id = ? AND is_read = 0
        `).run(body.recipientId);
      } else {
        db.prepare(`
          UPDATE messages SET is_read = 1, read_at = datetime('now') WHERE is_read = 0
        `).run();
      }

      ctx.body = { success: true };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '全部标记已读失败' };
    }
  });

  return router;
}
