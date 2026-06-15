// Tenant routes
// Data source: tenants/{tenantId}/tenant.json

import fs from 'fs';
import path from 'path';
import KoaRouter from '@koa/router';
import { TENANTS_DIR } from '../config/index.js';

// Read tenant.json (shortId -> directory: tenant_{shortId})
function readTenantMeta(shortId: string): any | null {
  const dirName = shortId.startsWith('tenant_') ? shortId : `tenant_${shortId}`;
  const filePath = path.join(TENANTS_DIR, dirName, 'tenant.json');
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

// Create tenant routes
export function createTenantsRouter(): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/tenants' });

  // GET /api/tenants/:tenantId
  router.get('/:tenantId', async (ctx) => {
    const { tenantId } = ctx.params;
    const meta = readTenantMeta(tenantId);

    if (!meta) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Tenant not found' };
      return;
    }

    ctx.body = {
      success: true,
      tenant: {
        tenantId: meta.tenantId,
        name: meta.name,
        icon: meta.icon || '🏢',
        plan: meta.plan,
        status: meta.status,
      },
    };
  });

  return router;
}
