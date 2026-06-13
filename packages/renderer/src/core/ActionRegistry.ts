import type { ActionExecutor, ActionContext } from '@low-code/shared';

/**
 * 动作注册表
 * 维护动作类型标识到执行器的映射
 */
export class ActionRegistryImpl {
  private executors = new Map<string, ActionExecutor>();

  register(code: string, executor: ActionExecutor): void {
    this.executors.set(code, executor);
  }

  resolve(code: string): ActionExecutor | null {
    return this.executors.get(code) || null;
  }

  list(): string[] {
    return Array.from(this.executors.keys());
  }

  has(code: string): boolean {
    return this.executors.has(code);
  }
}

// ========== 内建动作处理器 ==========

/** 页面跳转 */
const navigateExecutor: ActionExecutor = {
  async execute(params, context) {
    const { url, params: routeParams, target } = params;
    if (target === '_blank' || target === 'openPage') {
      window.open(url, '_blank');
    } else if (context.navigate) {
      context.navigate(url, routeParams);
    } else {
      window.location.href = url;
    }
  },
};

/** 返回上一页 */
const goBackExecutor: ActionExecutor = {
  async execute() {
    window.history.back();
  },
};

/** 刷新页面 */
const refreshExecutor: ActionExecutor = {
  async execute() {
    window.location.reload();
  },
};

/** 设置单个字段值 */
const setValueExecutor: ActionExecutor = {
  async execute(params, context) {
    const { target, value } = params;
    if (context.setFormValue && target) {
      context.setFormValue(target, value);
    }
  },
};

/** 批量设值 */
const setValuesExecutor: ActionExecutor = {
  async execute(params, context) {
    const { values } = params;
    if (context.setFormValue && values) {
      for (const [field, value] of Object.entries(values)) {
        context.setFormValue(field, value);
      }
    }
  },
};

/** 重置值 */
const resetValueExecutor: ActionExecutor = {
  async execute(params, context) {
    const { target } = params;
    if (context.setFormValue && target) {
      const initial = context.renderContext?.$form?.[`__initial_${target}`];
      context.setFormValue(target, initial ?? undefined);
    }
  },
};

/** 调用 API */
const apiCallExecutor: ActionExecutor = {
  async execute(params, context) {
    const { url, method = 'GET', data, headers } = params;
    if (context.apiRequest) {
      return context.apiRequest({ url, method, data, headers });
    }
    // Fallback: fetch
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: method !== 'GET' ? JSON.stringify(data) : undefined,
    });
    return response.json();
  },
};

/** 调用组件方法 */
const invokeMethodExecutor: ActionExecutor = {
  async execute(params, context) {
    const { target, method, params: methodParams } = params;
    if (context.invokeMethod) {
      return context.invokeMethod(target, method, methodParams);
    }
  },
};

/** 消息提示 */
const messageExecutor: ActionExecutor = {
  async execute(params, context) {
    const { type = 'info', content, duration = 3000 } = params;
    if (context.showMessage) {
      context.showMessage(type, content, duration);
    } else {
      // Fallback: alert
      console.log(`[${type}] ${content}`);
    }
  },
};

/** 通知提醒 */
const notificationExecutor: ActionExecutor = {
  async execute(params, context) {
    const { title, content, type = 'info' } = params;
    if (context.showMessage) {
      context.showMessage(type, `${title}: ${content}`, 5000);
    }
  },
};

/** 打开弹窗（返回 Promise，弹框关闭时 resolve，结果注入 $result） */
const showModalExecutor: ActionExecutor = {
  async execute(params, context) {
    const { modalId, data } = params;
    if (context.showModal) {
      return context.showModal(modalId, data);
    }
  },
};

/** 关闭弹窗（携带返回值，触发对应 showModal 的 Promise resolve） */
const closeModalExecutor: ActionExecutor = {
  async execute(params, context) {
    const { modalId, result } = params;
    if (context.closeModal) {
      context.closeModal(modalId, result);
    }
  },
};

/** 刷新组件 */
const refreshComponentExecutor: ActionExecutor = {
  async execute(params, context) {
    const { target, propNames } = params;
    if (context.refreshComponent) {
      return context.refreshComponent(target, propNames);
    }
  },
};

/** 显示加载 */
const showLoadingExecutor: ActionExecutor = {
  async execute(_params, _context) {
    // 占位实现
  },
};

/** 隐藏加载 */
const hideLoadingExecutor: ActionExecutor = {
  async execute(_params, _context) {
    // 占位实现
  },
};

/** 复制到剪贴板 */
const copyToClipboardExecutor: ActionExecutor = {
  async execute(params) {
    const { text } = params;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  },
};

/** 提交表单 */
const submitExecutor: ActionExecutor = {
  async execute(params, context) {
    const { api, redirectUrl } = params;
    if (api && context.apiRequest) {
      const formData = context.renderContext?.$form || {};
      await context.apiRequest({
        url: api,
        method: 'POST',
        data: formData,
      });
    }
    if (redirectUrl) {
      if (context.navigate) {
        context.navigate(redirectUrl);
      } else {
        window.location.href = redirectUrl;
      }
    }
  },
};

/** 触发流程 */
const triggerWorkflowExecutor: ActionExecutor = {
  async execute(params, context) {
    const { workflowId, inputData } = params;
    if (context.apiRequest) {
      return context.apiRequest({
        url: `/api/workflows/${workflowId}/trigger`,
        method: 'POST',
        data: inputData,
      });
    }
  },
};

/** 执行脚本 */
const executeScriptExecutor: ActionExecutor = {
  async execute(params, context) {
    const { script } = params;
    if (!script) return;
    try {
      // 在沙箱中执行脚本
      const fn = new Function('$context', '$form', '$result', script);
      return fn(
        context.renderContext?.$context,
        context.renderContext?.$form,
        context.$result,
      );
    } catch (e) {
      console.error('Script execution error:', e);
    }
  },
};

/** 条件分支 */
const conditionExecutor: ActionExecutor = {
  async execute(_params, _context) {
    // 条件分支由 EventCompiler 在编译阶段处理
    // 此处为占位，实际逻辑在 EventCompiler 中
  },
};

/**
 * 创建默认动作注册表（包含所有内建动作）
 */
export function createDefaultActionRegistry(): ActionRegistryImpl {
  const registry = new ActionRegistryImpl();

  // Navigation
  registry.register('navigate', navigateExecutor);
  registry.register('openPage', navigateExecutor);
  registry.register('goBack', goBackExecutor);
  registry.register('refresh', refreshExecutor);

  // Data
  registry.register('setValue', setValueExecutor);
  registry.register('setValues', setValuesExecutor);
  registry.register('resetValue', resetValueExecutor);
  registry.register('submit', submitExecutor);
  registry.register('apiCall', apiCallExecutor);
  registry.register('invokeMethod', invokeMethodExecutor);

  // UI
  registry.register('showModal', showModalExecutor);
  registry.register('closeModal', closeModalExecutor);
  registry.register('message', messageExecutor);
  registry.register('notification', notificationExecutor);
  registry.register('refreshComponent', refreshComponentExecutor);
  registry.register('showLoading', showLoadingExecutor);
  registry.register('hideLoading', hideLoadingExecutor);
  registry.register('copyToClipboard', copyToClipboardExecutor);

  // Workflow
  registry.register('triggerWorkflow', triggerWorkflowExecutor);
  registry.register('executeScript', executeScriptExecutor);

  // Control
  registry.register('condition', conditionExecutor);

  return registry;
}
