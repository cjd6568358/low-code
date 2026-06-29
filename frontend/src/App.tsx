/**
 * Route configuration
 *
 * Tenant routes: /:tenantId/*
 * Platform routes: /login, /platform/*
 */

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import WorkspacePage from './pages/WorkspacePage';
import AppCenterPage from './pages/AppCenterPage';
import WorkflowCenterPage from './pages/WorkflowCenterPage';
import ConfigCenterPage from './pages/ConfigCenterPage';
import AppDesignPage from './pages/AppDesignPage';
import AppDetailPage from './pages/AppDetailPage';
import WorkflowTestPage from './pages/WorkflowTestPage';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* Platform admin login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Platform admin (not implemented) */}
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
                  <h1 style={{ fontSize: 24, color: '#1a1a2e' }}>Platform Admin</h1>
                  <p style={{ color: '#8c8c8c' }}>Coming soon</p>
                </div>
              </ProtectedRoute>
            }
          />

          {/* Tenant login */}
          <Route path="/:tenantId/login" element={<LoginPage />} />

          {/* Tenant app detail (fullscreen, own sidebar) */}
          <Route
            path="/:tenantId/app/:appId"
            element={
              <ProtectedRoute>
                <AppDetailPage />
              </ProtectedRoute>
            }
          >
            {/* 嵌套页面路由 — 用 pageId 做路由标识 */}
            <Route path="page/:pageId" element={null} />
          </Route>

          {/* Tenant designer (fullscreen, admin only) */}
          <Route
            path="/:tenantId/designer/:resourceType/:id"
            element={
              <ProtectedRoute roles={['tenant_admin']}>
                <AppDesignPage />
              </ProtectedRoute>
            }
          />

          {/* Tenant main layout routes (require login) */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/:tenantId/workspace" element={<WorkspacePage />} />
            <Route path="/:tenantId/apps" element={<AppCenterPage />} />
            <Route path="/:tenantId/workflows" element={<WorkflowCenterPage />} />
            <Route
              path="/:tenantId/config"
              element={
                <ProtectedRoute roles={['tenant_admin']}>
                  <ConfigCenterPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 测试页面 */}
          <Route path="/test/workflow" element={<WorkflowTestPage />} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
