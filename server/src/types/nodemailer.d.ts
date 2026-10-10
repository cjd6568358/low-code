/**
 * nodemailer 最小类型声明
 *
 * nodemailer 是可选依赖（邮件通知渠道），未安装时 EmailNotifyService 自动降级为
 * 控制台输出。为避免为了一个动态导入而引入完整依赖，这里只声明本项目实际用到的
 * API 子集，加载失败由运行时 try/catch 兜底。
 *
 * 若后续正式引入 nodemailer，删除本文件并改用 `@types/nodemailer`。
 */

declare module 'nodemailer' {
  /** 邮件地址 */
  export interface Address {
    /** 邮箱地址 */
    address: string;
    /** 显示名称 */
    name?: string;
  }

  /** 发件配置 */
  export interface SendMailOptions {
    /** 发件人（支持 `"名称" <地址>` 形式） */
    from?: string | Address;
    /** 收件人（多个用逗号分隔） */
    to?: string | Address | Array<string | Address>;
    /** 抄送 */
    cc?: string | Address | Array<string | Address>;
    /** 密送 */
    bcc?: string | Address | Array<string | Address>;
    /** 邮件主题 */
    subject?: string;
    /** 纯文本正文 */
    text?: string;
    /** HTML 正文 */
    html?: string;
  }

  /** 发送结果 */
  export interface SentMessageInfo {
    /** SMTP 响应消息 */
    response?: string;
    /** 被拒绝的收件人 */
    rejected?: string[];
    /** 被接受的收件人 */
    accepted?: string[];
    /** 消息 ID */
    messageId?: string;
  }

  /** 邮件传输器 */
  export interface Transporter {
    /** 发送邮件 */
    sendMail(options: SendMailOptions): Promise<SentMessageInfo>;
    /** 关闭连接池 */
    close(): void;
    /** 校验 SMTP 连接 */
    verify(): Promise<boolean>;
  }

  /** 创建传输器的配置 */
  export interface TransportOptions {
    /** SMTP 服务器地址 */
    host: string;
    /** SMTP 端口 */
    port: number;
    /** 是否使用 TLS */
    secure?: boolean;
    /** 认证信息 */
    auth?: {
      /** 用户名 */
      user: string;
      /** 密码 */
      pass: string;
    };
    /** 连接超时（毫秒） */
    connectionTimeout?: number;
  }

  /** 创建邮件传输器 */
  export function createTransport(options: TransportOptions): Transporter;
}
