/**
 * 运行中执行注册表
 *
 * 参考 NocoBase 的 RunningExecutionRegistry，
 * 跟踪所有正在运行的流程实例，支持外部中止。
 */

/** 中止句柄 */
export interface AbortHandle {
  /** 中止信号 */
  abort: (reason?: string) => void;
}

/**
 * 运行中执行注册表
 */
export class RunningRegistry {
  /** 正在运行的实例 */
  private running = new Map<string, AbortHandle>();

  /**
   * 注册运行中的实例
   * @param instanceId 实例 ID
   * @param abort 中止回调
   */
  register(instanceId: string, abort: (reason?: string) => void): void {
    this.running.set(instanceId, { abort });
  }

  /**
   * 注销运行中的实例
   */
  unregister(instanceId: string): void {
    this.running.delete(instanceId);
  }

  /**
   * 中止指定实例
   * @returns true 表示成功中止，false 表示实例不在运行中
   */
  abort(instanceId: string, reason?: string): boolean {
    const handle = this.running.get(instanceId);
    if (!handle) {
      return false;
    }

    handle.abort(reason);
    this.running.delete(instanceId);
    return true;
  }

  /**
   * 检查实例是否正在运行
   */
  isRunning(instanceId: string): boolean {
    return this.running.has(instanceId);
  }

  /**
   * 获取所有正在运行的实例 ID
   */
  getRunningInstanceIds(): string[] {
    return Array.from(this.running.keys());
  }

  /**
   * 获取运行中的实例数量
   */
  getRunningCount(): number {
    return this.running.size;
  }

  /**
   * 中止所有运行中的实例
   */
  abortAll(reason?: string): void {
    for (const [instanceId, handle] of this.running) {
      handle.abort(reason);
    }
    this.running.clear();
  }
}
