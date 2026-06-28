/**
 * 服务任务执行器
 * 处理自动化节点（API 调用、数据操作等）
 */

import type { ServiceTask, FlowNode } from '@low-code/workflow-bpmn';
import { NodeExecutorBase } from './NodeExecutorBase';
import type { ExecutionContext, ExecutionResult } from '../types/execution';

/** 服务任务配置 */
interface ServiceTaskConfig {
  /** 服务类型 */
  serviceType: 'api' | 'database' | 'email' | 'webhook' | 'custom';
  /** API 配置 */
  apiConfig?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
    timeout?: number;
  };
  /** 数据库配置 */
  databaseConfig?: {
    operation: 'insert' | 'update' | 'delete' | 'query';
    table: string;
    data?: Record<string, unknown>;
    conditions?: Record<string, unknown>;
  };
  /** 邮件配置 */
  emailConfig?: {
    to: string[];
    subject: string;
    body: string;
    attachments?: string[];
  };
  /** Webhook 配置 */
  webhookConfig?: {
    url: string;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  };
  /** 自定义配置 */
  customConfig?: {
    handler: string;
    params?: Record<string, unknown>;
  };
  /** 重试配置 */
  retryConfig?: {
    maxRetries: number;
    retryInterval: number;
    backoffMultiplier?: number;
  };
  /** 超时配置 */
  timeout?: number;
}

/**
 * 服务任务执行器
 */
export class ServiceTaskExecutor extends NodeExecutorBase {
  /**
   * 执行服务任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { currentNode, instance, variables } = context;

    // 更新当前节点
    await this.engine['updateInstance'](instance.id, {
      currentNodeId: currentNode.id,
    });

    // 获取服务配置
    const serviceConfig = this.getServiceConfig(currentNode);

    // 执行服务
    const result = await this.executeService(serviceConfig, variables);

    if (!result.success) {
      return this.createErrorResult(result.error || '服务执行失败');
    }

    // 合并结果到变量
    if (result.data) {
      await this.engine['mergeVariables'](instance.id, result.data);
    }

    // 获取下一个节点
    const nextNodes = this.getNextNodes(context);

    // 返回成功结果
    return this.createSuccessResult(nextNodes);
  }

  /**
   * 获取服务配置
   */
  private getServiceConfig(node: FlowNode): ServiceTaskConfig {
    const extension = node.extensionElements as any;
    return extension?.serviceConfig || {};
  }

  /**
   * 执行服务
   */
  private async executeService(
    config: ServiceTaskConfig,
    variables: Record<string, unknown>
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      switch (config.serviceType) {
        case 'api':
          return await this.executeApiCall(config.apiConfig!, variables);
        case 'database':
          return await this.executeDatabaseOperation(config.databaseConfig!, variables);
        case 'email':
          return await this.executeEmail(config.emailConfig!, variables);
        case 'webhook':
          return await this.executeWebhook(config.webhookConfig!, variables);
        case 'custom':
          return await this.executeCustomHandler(config.customConfig!, variables);
        default:
          return { success: false, error: `不支持的服务类型: ${config.serviceType}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '服务执行失败',
      };
    }
  }

  /**
   * 执行 API 调用
   */
  private async executeApiCall(
    config: ServiceTaskConfig['apiConfig'],
    variables: Record<string, unknown>
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    if (!config) {
      return { success: false, error: 'API 配置为空' };
    }

    try {
      // 解析 URL 中的变量
      const url = this.resolveVariables(config.url, variables);

      // 解析请求体中的变量
      const body = config.body ? this.resolveVariables(JSON.stringify(config.body), variables) : undefined;

      // 发送请求
      const response = await fetch(url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: body ? JSON.parse(body) : undefined,
        signal: config.timeout ? AbortSignal.timeout(config.timeout) : undefined,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `API 调用失败: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API 调用失败',
      };
    }
  }

  /**
   * 执行数据库操作
   */
  private async executeDatabaseOperation(
    config: ServiceTaskConfig['databaseConfig'],
    variables: Record<string, unknown>
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    if (!config) {
      return { success: false, error: '数据库配置为空' };
    }

    // 这里应该调用实际的数据库服务
    // 简化处理，返回模拟结果
    return {
      success: true,
      data: {
        affectedRows: 1,
        operation: config.operation,
        table: config.table,
      },
    };
  }

  /**
   * 执行邮件发送
   */
  private async executeEmail(
    config: ServiceTaskConfig['emailConfig'],
    variables: Record<string, unknown>
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    if (!config) {
      return { success: false, error: '邮件配置为空' };
    }

    // 这里应该调用实际的邮件服务
    // 简化处理，返回模拟结果
    return {
      success: true,
      data: {
        sent: true,
        to: config.to,
        subject: this.resolveVariables(config.subject, variables),
      },
    };
  }

  /**
   * 执行 Webhook
   */
  private async executeWebhook(
    config: ServiceTaskConfig['webhookConfig'],
    variables: Record<string, unknown>
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    if (!config) {
      return { success: false, error: 'Webhook 配置为空' };
    }

    try {
      const url = this.resolveVariables(config.url, variables);
      const body = config.body ? this.resolveVariables(JSON.stringify(config.body), variables) : undefined;

      const response = await fetch(url, {
        method: config.method,
        headers: config.headers,
        body: body ? JSON.parse(body) : undefined,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Webhook 调用失败: ${response.status}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook 调用失败',
      };
    }
  }

  /**
   * 执行自定义处理器
   */
  private async executeCustomHandler(
    config: ServiceTaskConfig['customConfig'],
    variables: Record<string, unknown>
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    if (!config) {
      return { success: false, error: '自定义配置为空' };
    }

    // 这里应该调用实际的自定义处理器
    // 简化处理，返回模拟结果
    return {
      success: true,
      data: {
        handler: config.handler,
        params: config.params,
      },
    };
  }

  /**
   * 解析变量
   */
  private resolveVariables(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\$\{([^}]+)\}/g, (match, varPath) => {
      const value = this.getNestedValue(variables, varPath.trim());
      return String(value ?? match);
    });
  }

  /**
   * 获取嵌套对象的值
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * 获取节点配置
   */
  getNodeConfig(node: FlowNode) {
    const serviceConfig = this.getServiceConfig(node);

    return {
      type: 'bpmn:ServiceTask',
      waitForInput: false,
      timeout: serviceConfig.timeout,
      retryCount: serviceConfig.retryConfig?.maxRetries,
      retryInterval: serviceConfig.retryConfig?.retryInterval,
    };
  }
}
