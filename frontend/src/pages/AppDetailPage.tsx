/**
 * App detail page — 运行时视图
 *
 * 纯应用菜单：侧边栏展示页面列表，点击进入页面。
 * 设计器、发布、设置等能力不在这里，去 AppDesignPage。
 *
 * Route: /:tenantId/app/:appId
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { App, Layout, Menu, Spin } from 'antd';
import { FileOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import PageRuntime from '../components/PageRuntime';

const { Sider, Content } = Layout;

interface ResourceItem {
  id: string;
  name: string;
}

interface AppMeta {
  appId: string;
  name: string;
  icon: string;
  appVersion: string;
}

export default function AppDetailPage() {
  const { tenantId, appId, pageId } = useParams<{ tenantId: string; appId: string; pageId?: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const tid = tenantId || '';

  const [loading, setLoading] = useState(true);
  const [appMeta, setAppMeta] = useState<AppMeta | null>(null);
  const [pages, setPages] = useState<ResourceItem[]>([]);

  // 从 URL 中的 pageId 驱动当前激活页面
  const activePage = pageId || '';

  const loadApp = useCallback(async () => {
    if (!appId) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/apps/${appId}`);
      const data = await resp.json();
      if (data.success) {
        setAppMeta(data.app);
        setPages(data.resources?.pages || []);
      } else {
        message.error('应用不存在');
        navigate(`/${tid}/apps`);
      }
    } catch {
      message.error('加载应用失败');
      navigate(`/${tid}/apps`);
    } finally {
      setLoading(false);
    }
  }, [appId, tid, navigate]);

  useEffect(() => {
    loadApp();
  }, [loadApp]);

  const handleMenuClick: MenuProps['onClick'] = (info) => {
    navigate(`/${tid}/app/${appId}/page/${info.key}`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider
        width={220}
        style={{
          background: '#001529',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}
      >
        {/* 应用信息 */}
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 10,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 24 }}>{appMeta?.icon || '📦'}</span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div
              style={{
                color: 'white',
                fontSize: 15,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {appMeta?.name || ''}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
              v{appMeta?.appVersion || '1.0.0'}
            </div>
          </div>
        </div>

        {/* 页面菜单 */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={activePage ? [activePage] : []}
          onClick={handleMenuClick}
          style={{ flex: 1, overflowY: 'auto', borderRight: 'none' }}
          items={pages.map((p) => ({
            key: p.id,
            icon: <FileOutlined />,
            label: p.name,
          }))}
        />
      </Sider>

      <Content style={{ background: '#f5f5f5', overflow: 'auto' }}>
        {activePage && appId ? (
          <PageRuntime appId={appId} pageId={activePage} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#bbb' }}>
            请从左侧选择页面
          </div>
        )}
      </Content>
    </Layout>
  );
}
