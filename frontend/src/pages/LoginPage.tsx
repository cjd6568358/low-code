/**
 * 登录页
 *
 * 两种模式：
 * - /login — 平台管理员登录（默认品牌）
 * - /:tenantId/login — 租户登录（租户个性化品牌）
 *
 * 后端根据邮箱自动识别租户和角色。
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input, Button, message, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';

/** 租户品牌信息 */
interface TenantBrand {
  tenantId: string;
  name: string;
  icon: string;
}

export default function LoginPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tenant, setTenant] = useState<TenantBrand | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(false);

  /** 租户登录页：加载租户品牌信息 */
  useEffect(() => {
    if (!tenantId) return;
    setLoadingTenant(true);
    fetch(`/api/tenants/${tenantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setTenant(data.tenant);
        } else {
          message.error('租户不存在');
          navigate('/login');
        }
      })
      .catch(() => {
        message.error('加载租户信息失败');
        navigate('/login');
      })
      .finally(() => setLoadingTenant(false));
  }, [tenantId, navigate]);

  /** 登录 */
  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      message.warning('请输入邮箱和密码');
      return;
    }

    setSubmitting(true);
    try {
      const result = await login({
        email: email.trim(),
        password: password.trim(),
        tenantId,
      });
      if (result.success) {
        message.success('登录成功');
        // Tenant login -> /:tenantId/workspace, platform login -> /platform
        if (result.user?.tenantId) {
          navigate(`/${result.user.tenantId}/workspace`, { replace: true });
        } else {
          navigate('/platform', { replace: true });
        }
      } else {
        message.error(result.error || '登录失败');
      }
    } finally {
      setSubmitting(false);
    }
  }, [email, password, tenantId, login, navigate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleLogin();
    },
    [handleLogin],
  );

  /** 是否为平台管理员登录页 */
  const isPlatform = !tenantId;

  /** 显示的标题和图标 */
  const displayTitle = tenant?.name || '低代码平台';
  const displayIcon = tenant?.icon || '⚡';
  const displaySubtitle = tenant ? `Powered by Low-Code Platform` : 'Low-Code Platform';

  if (loadingTenant) {
    return (
      <div className="login-bg">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="login-bg">
      <div className="login-grid" />
      <div className="login-particles">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="login-particle" />
        ))}
      </div>

      <div className="login-card">
        {/* Logo */}
        <div className="logo-section">
          <div className="logo-icon">{displayIcon}</div>
          <div className="logo-title">{displayTitle}</div>
          <div className="logo-subtitle">{displaySubtitle}</div>
        </div>

        {/* 登录表单 */}
        <div className="login-form" onKeyDown={handleKeyDown}>
          <div style={{ marginBottom: 20 }}>
            <Input
              prefix={<UserOutlined />}
              placeholder={isPlatform ? '平台管理员邮箱' : '请输入邮箱'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              size="large"
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="large"
              autoComplete="current-password"
            />
          </div>

          <Button
            type="primary"
            className="login-btn"
            loading={submitting}
            onClick={handleLogin}
          >
            登 录
          </Button>
        </div>

        {/* 演示账号提示（仅租户登录页显示） */}
        {!isPlatform && (
          <div className="demo-accounts">
            <div className="demo-title">演示账号</div>
            <div className="demo-account-item">
              <span>
                <span className="demo-role">管理员</span> admin@shansui.com
              </span>
              <span className="demo-pwd">shansui123</span>
            </div>
            <div className="demo-account-item">
              <span>
                <span className="demo-role">员工</span> zhangsan@shansui.com
              </span>
              <span className="demo-pwd">shansui123</span>
            </div>
          </div>
        )}

        {isPlatform && (
          <div className="demo-accounts">
            <div className="demo-title">演示账号</div>
            <div className="demo-account-item">
              <span>
                <span className="demo-role">平台管理员</span> admin@platform.com
              </span>
              <span className="demo-pwd">platform123</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
