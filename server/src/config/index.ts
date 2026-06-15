/**
 * 服务配置
 *
 * 集中管理端口、数据库路径等配置项。
 * 后续可扩展为环境变量 / .env 文件读取。
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** API 服务端口 */
export const PORT = 3001;

/** 系统数据库目录(存放 _system.db) */
export const DATA_DIR = path.resolve(__dirname, '../../../data');

/** 租户根目录(每个租户下有 data/ 和 apps/) */
export const TENANTS_DIR = path.resolve(__dirname, '../../../tenants');
