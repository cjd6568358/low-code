/**
 * 文件系统工具函数
 *
 * 提供 async 版本的常用 fs 操作，避免在路由/服务层重复定义。
 */

import { access, readFile, writeFile, readdir, mkdir, unlink, rm } from 'fs/promises';
import path from 'path';
import { TENANTS_DIR } from '../config/index.js';

/** 异步检查文件/目录是否存在 */
export async function existsAsync(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 根据租户 ID 和应用 ID 构造应用目录路径
 *
 * @param tenantId 租户 ID（裸 ID）
 * @param appId 应用 ID（带前缀或裸 ID）
 * @returns appDirPath，如果 app.json 不存在返回 null
 */
export async function resolveAppDir(tenantId: string, appId: string): Promise<string | null> {
  const dirName = appId.startsWith('app_') ? appId : `app_${appId}`;
  const appDir = path.join(TENANTS_DIR, `tenant_${tenantId}`, 'apps', dirName);
  if (await existsAsync(path.join(appDir, 'app.json'))) {
    return appDir;
  }
  return null;
}

/**
 * 去除 ID 前缀（如 "app_80e88653" → "80e88653"）
 */
export function stripPrefix(id: string): string {
  const idx = id.indexOf('_');
  return idx >= 0 ? id.substring(idx + 1) : id;
}

export { access, readFile, writeFile, readdir, mkdir, unlink, rm };
