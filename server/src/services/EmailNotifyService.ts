/**
 * 邮件通知服务
 *
 * 实现 NotifyService 接口，支持通过 SMTP 发送邮件通知。
 */

import type { NotifyService, NotifyParams } from '@low-code/workflow';

/** 邮件配置 */
export interface EmailConfig {
  /** SMTP 服务器 */
  host: string;
  /** SMTP 端口 */
  port: number;
  /** 是否使用 SSL */
  secure: boolean;
  /** 用户名 */
  user: string;
  /** 密码 */
  password: string;
  /** 发件人地址 */
  from: string;
  /** 发件人名称 */
  fromName?: string;
}

/** 用户邮箱查询接口 */
export interface UserEmailResolver {
  /** 根据用户 ID 查询邮箱 */
  getEmail(userId: string): Promise<string | undefined>;
  /** 批量查询 */
  getEmails(userIds: string[]): Promise<Map<string, string>>;
}

/**
 * 邮件通知服务
 */
export class EmailNotifyService implements NotifyService {
  private config: EmailConfig;
  private emailResolver: UserEmailResolver;
  private transporter: any; // nodemailer Transporter

  constructor(config: EmailConfig, emailResolver: UserEmailResolver) {
    this.config = config;
    this.emailResolver = emailResolver;
  }

  /**
   * 初始化邮件传输器
   */
  async init(): Promise<void> {
    // 动态导入 nodemailer（可选依赖）
    try {
      const nodemailer = await import('nodemailer');
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.password,
        },
      });
    } catch {
      console.warn('[EmailNotifyService] nodemailer 未安装，邮件通知将使用控制台输出');
    }
  }

  /**
   * 发送通知
   */
  async send(params: NotifyParams): Promise<void> {
    // 如果指定了渠道且不包含 email，跳过
    if (params.channels && !params.channels.includes('email')) {
      return;
    }

    // 查询接收人邮箱
    const emailMap = await this.emailResolver.getEmails(params.receiverIds);
    const emails = Array.from(emailMap.values()).filter(Boolean);

    if (emails.length === 0) {
      console.warn('[EmailNotifyService] 未找到接收人邮箱');
      return;
    }

    // 构建邮件内容
    const subject = this.buildSubject(params);
    const html = this.buildHtml(params);

    // 发送邮件
    if (this.transporter) {
      await this.transporter.sendMail({
        from: `"${this.config.fromName || '低代码平台'}" <${this.config.from}>`,
        to: emails.join(', '),
        subject,
        html,
      });
    } else {
      // 降级：控制台输出
      console.log('[EmailNotifyService] 邮件通知（降级模式）:');
      console.log(`  收件人: ${emails.join(', ')}`);
      console.log(`  主题: ${subject}`);
      console.log(`  内容: ${params.content}`);
    }
  }

  /**
   * 批量发送
   */
  async sendBatch(params: NotifyParams[]): Promise<void> {
    for (const param of params) {
      try {
        await this.send(param);
      } catch (error) {
        console.error(`[EmailNotifyService] 发送失败: ${error}`);
      }
    }
  }

  /**
   * 构建邮件主题
   */
  private buildSubject(params: NotifyParams): string {
    const typeMap: Record<string, string> = {
      approval: '待审批',
      reject: '已驳回',
      timeout: '已超时',
      complete: '已完成',
      custom: '',
    };

    const prefix = typeMap[params.type] || '';
    return prefix ? `[${prefix}] ${params.title}` : params.title;
  }

  /**
   * 构建邮件 HTML 内容
   */
  private buildHtml(params: NotifyParams): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Microsoft YaHei', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1890ff; color: white; padding: 15px; border-radius: 4px 4px 0 0; }
    .content { background: #f5f5f5; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 4px 4px; }
    .footer { margin-top: 20px; font-size: 12px; color: #999; }
    .btn { display: inline-block; padding: 10px 20px; background: #1890ff; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">${params.title}</h2>
    </div>
    <div class="content">
      <p>${params.content}</p>
      ${params.data ? `<pre style="background: #fff; padding: 10px; border: 1px solid #eee;">${JSON.stringify(params.data, null, 2)}</pre>` : ''}
    </div>
    <div class="footer">
      <p>此邮件由低代码平台自动发送，请勿回复。</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * 关闭传输器
   */
  async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
    }
  }
}
