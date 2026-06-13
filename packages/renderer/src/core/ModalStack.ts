/**
 * 弹框栈管理器
 *
 * 支持多层弹框嵌套：A 打开 B，B 关闭后返回结果给 A，A 继续执行后再关闭返回给调用方。
 * 每个 showModal 调用创建一个 Promise，closeModal 时 resolve 该 Promise 并传递 result。
 */

interface ModalEntry {
  modalId: string;
  data?: any;
  resolve: (result?: any) => void;
}

export class ModalStack {
  /** 栈底 → 栈顶 */
  private stack: ModalEntry[] = [];

  /** 状态变化回调（供宿主 UI 监听以渲染/关闭弹框） */
  private onChange?: (event: ModalChangeEvent) => void;

  constructor(onChange?: (event: ModalChangeEvent) => void) {
    this.onChange = onChange;
  }

  /**
   * 打开弹框，返回 Promise
   * - 将条目压入栈
   * - 通知宿主渲染弹框
   * - 弹框内调用 closeModal 时 Promise resolve
   */
  open(modalId: string, data?: any): Promise<any> {
    return new Promise<any>((resolve) => {
      const entry: ModalEntry = { modalId, data, resolve };
      this.stack.push(entry);

      this.onChange?.({
        type: 'open',
        modalId,
        data,
        depth: this.stack.length,
      });
    });
  }

  /**
   * 关闭栈顶弹框（或指定 modalId），并传回结果
   * - 从栈中移除条目
   * - resolve 对应的 Promise
   * - 通知宿主关闭弹框
   */
  close(modalId?: string, result?: any): void {
    if (this.stack.length === 0) return;

    let entry: ModalEntry | undefined;

    if (modalId) {
      // 关闭指定弹框（也关闭其上方的所有弹框）
      const idx = this.stack.findIndex((e) => e.modalId === modalId);
      if (idx === -1) return;

      // 先关闭上方的弹框（级联关闭，result 为 undefined）
      const above = this.stack.splice(idx);
      entry = above.pop()!;
      // 上方的弹框依次关闭
      for (const aboveEntry of above.reverse()) {
        aboveEntry.resolve(undefined);
        this.onChange?.({
          type: 'close',
          modalId: aboveEntry.modalId,
          depth: this.stack.length,
        });
      }
    } else {
      // 默认关闭栈顶
      entry = this.stack.pop()!;
    }

    entry.resolve(result);
    this.onChange?.({
      type: 'close',
      modalId: entry.modalId,
      result,
      depth: this.stack.length,
    });
  }

  /** 当前栈深度 */
  get depth(): number {
    return this.stack.length;
  }

  /** 当前栈顶弹框 ID */
  get topModalId(): string | undefined {
    return this.stack[this.stack.length - 1]?.modalId;
  }

  /** 是否有指定弹框在栈中 */
  has(modalId: string): boolean {
    return this.stack.some((e) => e.modalId === modalId);
  }

  /** 清空栈（页面卸载时调用） */
  clear(): void {
    for (const entry of this.stack.reverse()) {
      entry.resolve(undefined);
    }
    this.stack = [];
  }
}

/** 弹框栈变化事件 */
export interface ModalChangeEvent {
  type: 'open' | 'close';
  modalId: string;
  data?: any;
  result?: any;
  depth: number;
}
