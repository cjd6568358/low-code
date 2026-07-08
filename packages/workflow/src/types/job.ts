/**
 * 节点执行结果（Job）类型定义
 *
 * 参考 NocoBase 的 jobs 表设计，每个节点执行完产生一条 job 记录。
 * 用于审计追溯、重试机制、节点结果查询。
 */

/** 节点执行结果状态 */
export type JobStatus =
  | 'pending'       // 等待执行（人工节点等待审批）
  | 'resolved'      // 执行成功
  | 'failed'        // 执行失败（业务层面，如条件不满足）
  | 'error'         // 执行异常（系统层面，如超时、网络错误）
  | 'aborted'       // 被中止（超时或手动终止）
  | 'retry_needed'; // 需要重试

/** 节点执行结果记录 */
export interface JobRecord {
  /** Job ID */
  id: string;
  /** 流程实例 ID */
  instanceId: string;
  /** 节点 ID */
  nodeId: string;
  /** 节点 Key（用于跨版本稳定的节点引用） */
  nodeKey?: string;
  /** 上游 Job ID（链式记录执行路径） */
  upstreamId?: string;
  /** 执行状态 */
  status: JobStatus;
  /** 节点输出结果 */
  result?: unknown;
  /** 元数据（如审批意见、重试次数等） */
  meta?: Record<string, unknown>;
  /** 错误信息 */
  error?: string;
  /** 已重试次数 */
  retryCount: number;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/** Job 状态数值映射（兼容 NocoBase 的数值状态） */
export const JOB_STATUS_VALUE = {
  pending: 0,
  resolved: 1,
  failed: -1,
  error: -2,
  aborted: -3,
  retry_needed: -6,
} as const;

/** 数值状态到字符串的反向映射 */
export const JOB_STATUS_FROM_VALUE: Record<number, JobStatus> = Object.fromEntries(
  Object.entries(JOB_STATUS_VALUE).map(([k, v]) => [v, k as JobStatus])
);
