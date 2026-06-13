/**
 * 路由配置
 *
 * 定义门户应用的完整路由结构。
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import WorkspacePage from './pages/WorkspacePage';
import AppCenterPage from './pages/AppCenterPage';
import WorkflowCenterPage from './pages/WorkflowCenterPage';
import ConfigCenterPage from './pages/ConfigCenterPage';
import DesignerPage from './pages/DesignerPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 登录页（未登录可访问） */}
          <Route path="/login" element={<LoginPage />} />

          {/* 设计器（全屏，仅管理员） */}
          <Route
            path="/designer/:resourceType/:id"
            element={
              <ProtectedRoute roles={['tenant_admin']}>
                <DesignerPage />
              </ProtectedRoute>
            }
          />

          {/* 平台管理员（暂未实现） */}
          <Route
            path="/platform/*"
            element={
              <ProtectedRoute roles={['platform_admin']}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  <h1 style={{ fontSize: 24, color: '#1a1a2e' }}>🏗️ 平台管理后台</h1>
                  <p style={{ color: '#8c8c8c' }}>即将上线，敬请期待</p>
                </div>
              </ProtectedRoute>
            }
          />

          {/* 主布局路由（需要登录） */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/apps" element={<AppCenterPage />} />
            <Route path="/workflows" element={<WorkflowCenterPage />} />
            <Route
              path="/config"
              element={
                <ProtectedRoute roles={['tenant_admin']}>
                  <ConfigCenterPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 默认重定向 */}
          <Route path="/" element={<Navigate to="/workspace" replace />} />
          <Route path="*" element={<Navigate to="/workspace" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
