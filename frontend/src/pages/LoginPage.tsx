/**
 * 登录页
 *
 * 现代风格：毛玻璃卡片 + 深蓝渐变背景 + 粒子动画。
 * 输入邮箱和密码即可登录，后端自动识别角色。
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      message.warning('请输入邮箱和密码');
      return;
    }

    setSubmitting(true);
    try {
      const result = await login({ email: email.trim(), password: password.trim() });
      if (result.success) {
        message.success('登录成功');
        navigate('/workspace', { replace: true });
      } else {
        message.error(result.error || '登录失败');
      }
    } finally {
      setSubmitting(false);
    }
  }, [email, password, login, navigate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleLogin();
    },
    [handleLogin],
  );

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
          <div className="logo-icon">⚡</div>
          <div className="logo-title">低代码平台</div>
          <div className="logo-subtitle">Low-Code Platform</div>
        </div>

        {/* 登录表单 */}
        <div className="login-form" onKeyDown={handleKeyDown}>
          <div style={{ marginBottom: 20 }}>
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入邮箱"
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

        {/* 演示账号提示 */}
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
      </div>
    </div>
  );
}
