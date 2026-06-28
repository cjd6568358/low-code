/**
 * API 调用动作执行器
 *
 * 调用外部 HTTP API。
 */

import type { AutomationAction } from '../types/action';
import type { ExecutionContext } from '../types/execution';
import type { HttpClient } from '../types/engine';
import type { VariableContext } from '../variable/VariableResolver';
import { ActionExecutorBase } from './ActionExecutorBase';

/**
 * API 调用动作执行器
 *
 * 执行 api_call 类型的动作，调用外部 HTTP API。
 */
export class ApiCallExecutor extends ActionExecutorBase {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    super();
    this.httpClient = httpClient;
  }

  /**
   * 执行 API 调用动作
   */
  protected async executeAction(
    action: AutomationAction,
    context: ExecutionContext,
    variableContext: VariableContext,
  ): Promise<unknown> {
    if (!action.apiCall) {
      throw new Error('API 调用动作配置缺失');
    }

    // 解析配置中的变量
    const config = this.resolveConfig(action.apiCall, variableContext);

    // 准备请求头
    const headers: Record<string, string> = {
      ...config.headers,
    };

    // 添加认证信息
    if (config.auth) {
      this.applyAuth(headers, config.auth);
    }

    // 发送请求
    const response = await this.httpClient.request({
      method: config.method,
      url: config.url,
      headers,
      body: config.body,
      timeout: config.timeout || 30000,
    });

    // 检查响应状态
    if (response.status >= 400) {
      throw new Error(`API 调用失败: ${response.status} ${response.statusText}`);
    }

    return {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    };
  }

  /**
   * 应用认证信息到请求头
   */
  private applyAuth(
    headers: Record<string, string>,
    auth: { type: string; config: Record<string, string> },
  ): void {
    switch (auth.type) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${auth.config.token}`;
        break;

      case 'basic': {
        const credentials = Buffer.from(
          `${auth.config.username}:${auth.config.password}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      }

      case 'api_key': {
        const headerName = auth.config.headerName || 'X-API-Key';
        headers[headerName] = auth.config.apiKey;
        break;
      }

      default:
        console.warn(`不支持的认证类型: ${auth.type}`);
    }
  }
}
