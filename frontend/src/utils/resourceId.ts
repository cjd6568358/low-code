/**
 * Resource ID helpers
 *
 * URL uses short ID (without prefix), code adds prefix.
 * e.g. URL: /apps/80e88653 -> appId: app_80e88653
 */

/** Resource type -> prefix mapping */
const RESOURCE_PREFIXES: Record<string, string> = {
  app: 'app',
  page: 'page',
  card: 'card',
  form: 'form',
  table: 'table',
  workflow: 'workflow',
  automation: 'automation',
  computation: 'computation',
  tenant: 'tenant',
  user: 'user',
};

/** Build full ID from resource type and short ID */
export function buildId(resourceType: string, shortId: string): string {
  const prefix = RESOURCE_PREFIXES[resourceType];
  if (!prefix) return shortId;
  return shortId.startsWith(`${prefix}_`) ? shortId : `${prefix}_${shortId}`;
}

/** Extract short ID from full ID */
export function shortId(fullId: string): string {
  const idx = fullId.indexOf('_');
  return idx >= 0 ? fullId.substring(idx + 1) : fullId;
}

/** Get resource type from full ID */
export function resourceTypeFromId(fullId: string): string {
  const idx = fullId.indexOf('_');
  return idx >= 0 ? fullId.substring(0, idx) : '';
}
