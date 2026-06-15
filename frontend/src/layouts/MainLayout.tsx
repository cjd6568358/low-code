/**
 * 统一主布局
 *
 * 侧边栏 + 顶栏 + 内容区。
 * 管理员和员工共用同一套布局，通过角色过滤菜单项。
 */

import { useMemo, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Badge } from 'antd';
import {
  HomeOutlined,
  AppstoreOutlined,
  NodeIndexOutlined,
  SettingOutlined,
  BellOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuth } from '../auth/AuthContext';

const { Sider, Content, Header } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

export default function MainLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const tenantId = user?.tenantId || '';

  /** Sidebar menu items */
  const menuItems = useMemo<MenuItem[]>(() => {
    const prefix = `/${tenantId}`;
    const items: MenuItem[] = [
      {
        key: `${prefix}/workspace`,
        icon: <HomeOutlined />,
        label: '工作台',
      },
      {
        key: `${prefix}/apps`,
        icon: <AppstoreOutlined />,
        label: '应用中心',
      },
      {
        key: `${prefix}/workflows`,
        icon: <NodeIndexOutlined />,
        label: '流程中心',
      },
    ];

    // Admin only: config center
    if (isAdmin) {
      items.push({
        key: `${prefix}/config`,
        icon: <SettingOutlined />,
        label: '配置中心',
      });
    }

    return items;
  }, [isAdmin, tenantId]);

  /** Current selected menu key */
  const selectedKey = useMemo(() => {
    const prefix = `/${tenantId}`;
    const path = location.pathname;
    if (path.startsWith(`${prefix}/config`)) return `${prefix}/config`;
    if (path.startsWith(`${prefix}/workflows`)) return `${prefix}/workflows`;
    if (path.startsWith(`${prefix}/apps`)) return `${prefix}/apps`;
    return `${prefix}/workspace`;
  }, [location.pathname, tenantId]);

  const handleMenuClick = useCallback(
    (info: { key: string }) => {
      navigate(info.key);
    },
    [navigate],
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate(`/${tenantId}/login`, { replace: true });
  }, [logout, navigate, tenantId]);

  /** User dropdown menu */
  const userMenuItems = useMemo<MenuItem[]>(
    () => [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: '个人信息',
        onClick: () => navigate(`/${tenantId}/config?tab=profile`),
      },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: handleLogout,
      },
    ],
    [navigate, handleLogout, tenantId],
  );

  return (
    <div className="main-layout">
      {/* 侧边栏 */}
      <Sider className="main-sider" width={240}>
        <div className="sider-logo">
          <div className="logo-square">LC</div>
          <span className="tenant-name">{user?.tenantName || '低代码平台'}</span>
        </div>
        <Menu
          className="sider-menu"
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>

      {/* 右侧内容区 */}
      <div className="main-content">
        {/* 顶栏 */}
        <Header className="main-header">
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e' }}>
            {selectedKey === '/workspace' && '工作台'}
            {selectedKey === '/apps' && '应用中心'}
            {selectedKey === '/workflows' && '流程中心'}
            {selectedKey === '/config' && '配置中心'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Badge count={3} size="small">
              <BellOutlined style={{ fontSize: 18, cursor: 'pointer', color: '#595959' }} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 8,
                  transition: 'background 0.2s',
                }}
              >
                <Avatar
                  size={32}
                  style={{ background: '#4f46e5' }}
                  src={user?.avatar}
                >
                  {user?.name?.[0]}
                </Avatar>
                <span style={{ fontSize: 14, color: '#1a1a2e' }}>{user?.name}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* 内容区 */}
        <Content className="main-content-body">
          <Outlet />
        </Content>
      </div>
    </div>
  );
}
