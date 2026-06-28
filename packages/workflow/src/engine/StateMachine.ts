/**
 * 流程状态机
 * 管理流程实例的状态转换
 */

import type { ProcessState, ExecutionContext } from '../types/execution';
import type { InstanceRecord } from '../types/engine';

/** 状态转换规则 */
interface Transition {
  from: ProcessState;
  to: ProcessState;
  event: string;
  guard?: (context?: unknown) => boolean;
  action?: (context?: unknown) => Promise<void>;
}

/** 状态机事件 */
export type StateMachineEvent =
  | 'start'        // 启动流程
  | 'complete'     // 完成任务
  | 'reject'       // 驳回任务
  | 'suspend'      // 暂停流程
  | 'resume'       // 恢复流程
  | 'terminate'    // 终止流程
  | 'fail'         // 执行失败
  | 'recover';     // 恢复流程

/**
 * 流程状态机
 */
export class StateMachine {
  private readonly transitions: Transition[] = [];

  constructor() {
    this.registerDefaultTransitions();
  }

  /**
   * 注册状态转换
   */
  register(transition: Transition): void {
    this.transitions.push(transition);
  }

  /**
   * 触发事件
   */
  async trigger(
    instance: InstanceRecord,
    event: StateMachineEvent,
    context?: unknown
  ): Promise<ProcessState> {
    const currentState = instance.status as ProcessState;

    // 查找匹配的转换规则
    const transition = this.transitions.find(
      t => t.from === currentState && t.event === event
    );

    if (!transition) {
      throw new Error(
        `无效的状态转换: ${currentState} -> ${event}`
      );
    }

    // 检查守卫条件
    if (transition.guard && !transition.guard(context)) {
      throw new Error(
        `状态转换守卫条件不满足: ${currentState} -> ${event}`
      );
    }

    // 执行动作
    if (transition.action) {
      await transition.action(context);
    }

    return transition.to;
  }

  /**
   * 检查是否可以触发事件
   */
  canTrigger(instance: InstanceRecord, event: StateMachineEvent): boolean {
    const currentState = instance.status as ProcessState;
    return this.transitions.some(
      t => t.from === currentState && t.event === event
    );
  }

  /**
   * 获取当前状态可触发的事件
   */
  getAvailableEvents(instance: InstanceRecord): StateMachineEvent[] {
    const currentState = instance.status as ProcessState;
    return this.transitions
      .filter(t => t.from === currentState)
      .map(t => t.event as StateMachineEvent);
  }

  /**
   * 获取状态描述
   */
  getStateLabel(state: ProcessState): string {
    const labels: Record<ProcessState, string> = {
      created: '已创建',
      running: '运行中',
      waiting: '等待中',
      suspended: '已暂停',
      completed: '已完成',
      rejected: '已驳回',
      cancelled: '已取消',
      terminated: '已终止',
      failed: '执行失败',
    };
    return labels[state] || state;
  }

  /**
   * 检查状态是否为终态
   */
  isTerminalState(state: ProcessState): boolean {
    return ['completed', 'rejected', 'cancelled', 'terminated'].includes(state);
  }

  /**
   * 检查状态是否为活跃状态
   */
  isActiveState(state: ProcessState): boolean {
    return ['running', 'waiting'].includes(state);
  }

  /**
   * 注册默认转换规则
   */
  private registerDefaultTransitions(): void {
    // created -> running (启动)
    this.register({
      from: 'created',
      to: 'running',
      event: 'start',
    });

    // running -> waiting (等待外部输入)
    this.register({
      from: 'running',
      to: 'waiting',
      event: 'wait',
    });

    // waiting -> running (恢复执行)
    this.register({
      from: 'waiting',
      to: 'running',
      event: 'resume',
    });

    // running -> suspended (暂停)
    this.register({
      from: 'running',
      to: 'suspended',
      event: 'suspend',
    });

    // suspended -> running (恢复)
    this.register({
      from: 'suspended',
      to: 'running',
      event: 'resume',
    });

    // running -> completed (完成)
    this.register({
      from: 'running',
      to: 'completed',
      event: 'complete',
    });

    // waiting -> completed (完成)
    this.register({
      from: 'waiting',
      to: 'completed',
      event: 'complete',
    });

    // running -> rejected (驳回)
    this.register({
      from: 'running',
      to: 'rejected',
      event: 'reject',
    });

    // waiting -> rejected (驳回)
    this.register({
      from: 'waiting',
      to: 'rejected',
      event: 'reject',
    });

    // running -> running (驳回后重新运行)
    this.register({
      from: 'rejected',
      to: 'running',
      event: 'restart',
    });

    // 任何状态 -> terminated (终止)
    const activeStates: ProcessState[] = ['running', 'waiting', 'suspended'];
    for (const state of activeStates) {
      this.register({
        from: state,
        to: 'terminated',
        event: 'terminate',
      });
    }

    // 任何状态 -> cancelled (取消)
    for (const state of activeStates) {
      this.register({
        from: state,
        to: 'cancelled',
        event: 'cancel',
      });
    }

    // running -> failed (失败)
    this.register({
      from: 'running',
      to: 'failed',
      event: 'fail',
    });

    // failed -> running (恢复)
    this.register({
      from: 'failed',
      to: 'running',
      event: 'recover',
    });

    // waiting -> running (超时恢复)
    this.register({
      from: 'waiting',
      to: 'running',
      event: 'timeout',
    });
  }
}
