/**
 * 执行超时管理器
 *
 * 参考 NocoBase 的 ExecutionTimeoutManager，
 * 负责流程实例和节点级别的超时调度、检查和中止。
 */

import type { InstanceRecord } from '../types/engine';

/** 超时回调 */
type TimeoutCallback = (instanceId: string, reason: string) => void;

/** 节点超时回调 */
type NodeTimeoutCallback = (instanceId: string, nodeId: string) => void;

/**
 * 超时管理器
 */
export class TimeoutManager {
  /** 活跃的实例级超时定时器 */
  private timers = new Map<string, NodeJS.Timeout>();

  /** 活跃的节点级超时定时器 */
  private nodeTimers = new Map<string, NodeJS.Timeout>();

  /** 实例级超时回调 */
  private onTimeout?: TimeoutCallback;

  /** 节点级超时回调 */
  private onNodeTimeout?: NodeTimeoutCallback;

  constructor(callback?: TimeoutCallback, nodeCallback?: NodeTimeoutCallback) {
    this.onTimeout = callback;
    this.onNodeTimeout = nodeCallback;
  }

  /**
   * 调度执行超时
   * @param instanceId 实例 ID
   * @param timeoutMs 超时时长（毫秒），0 或 undefined 表示不超时
   */
  scheduleExecutionTimeout(instanceId: string, timeoutMs?: number): void {
    // 清除已有定时器
    this.clear(instanceId);

    if (!timeoutMs || timeoutMs <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      this.timers.delete(instanceId);
      this.onTimeout?.(instanceId, 'execution_timeout');
    }, timeoutMs);

    // 防止 Node.js 进程因定时器退出
    if (typeof timer === 'object' && 'unref' in timer) {
      timer.unref();
    }

    this.timers.set(instanceId, timer);
  }

  /**
   * 清除实例级超时定时器
   */
  clear(instanceId: string): void {
    const timer = this.timers.get(instanceId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(instanceId);
    }
  }

  /**
   * 调度节点级超时
   * @param instanceId 实例 ID
   * @param nodeId 节点 ID
   * @param timeoutMs 超时时长（毫秒）
   */
  scheduleNodeTimeout(instanceId: string, nodeId: string, timeoutMs?: number): void {
    const key = `${instanceId}:${nodeId}`;
    this.clearNodeTimeout(instanceId, nodeId);

    if (!timeoutMs || timeoutMs <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      this.nodeTimers.delete(key);
      this.onNodeTimeout?.(instanceId, nodeId);
    }, timeoutMs);

    // 防止 Node.js 进程因定时器退出
    if (typeof timer === 'object' && 'unref' in timer) {
      timer.unref();
    }

    this.nodeTimers.set(key, timer);
  }

  /**
   * 清除节点级超时定时器
   */
  clearNodeTimeout(instanceId: string, nodeId: string): void {
    const key = `${instanceId}:${nodeId}`;
    const timer = this.nodeTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.nodeTimers.delete(key);
    }
  }

  /**
   * 清除实例的所有节点级超时定时器
   */
  clearAllNodeTimeouts(instanceId: string): void {
    const prefix = `${instanceId}:`;
    for (const [key, timer] of this.nodeTimers) {
      if (key.startsWith(prefix)) {
        clearTimeout(timer);
        this.nodeTimers.delete(key);
      }
    }
  }

  /**
   * 清除所有定时器
   */
  clearAll(): void {
    for (const [, timer] of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();

    for (const [, timer] of this.nodeTimers) {
      clearTimeout(timer);
    }
    this.nodeTimers.clear();
  }

  /**
   * 检查实例是否应该继续执行
   * @returns true 表示可以继续，false 表示已超时或状态异常
   */
  shouldContinue(instance: InstanceRecord): boolean {
    // 状态不是运行中或等待中，不需要继续
    if (instance.status !== 'running' && instance.status !== 'waiting') {
      return false;
    }

    return true;
  }

  /**
   * 检查实例是否正在等待超时
   */
  hasPendingTimeout(instanceId: string): boolean {
    if (this.timers.has(instanceId)) return true;
    const prefix = `${instanceId}:`;
    for (const key of this.nodeTimers.keys()) {
      if (key.startsWith(prefix)) return true;
    }
    return false;
  }

  /**
   * 检查节点是否正在等待超时
   */
  hasNodeTimeout(instanceId: string, nodeId: string): boolean {
    return this.nodeTimers.has(`${instanceId}:${nodeId}`);
  }

  /**
   * 获取当前活跃的超时数量（实例级 + 节点级）
   */
  getActiveCount(): number {
    return this.timers.size + this.nodeTimers.size;
  }
}
