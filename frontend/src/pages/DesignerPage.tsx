/**
 * 设计器页面
 *
 * 统一资源设计入口，根据 URL 中的 resourceType 渲染不同内容：
 * - app: 应用资源概览（页面列表、数据表、流程等）
 * - page: 页面设计器（三栏拖拽）
 * - card/form/table/workflow/automation/computation: 各资源编辑器（待实现）
 *
 * 路由格式：/designer/:resourceType/:id
 */

import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, message } from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  FileOutlined,
  TableOutlined,
  NodeIndexOutlined,
  ThunderboltOutlined,
  CalculatorOutlined,
  AppstoreOutlined,
  FormOutlined,
} from '@ant-design/icons';
import { Designer } from '@low-code/renderer';
import type { PageSchema } from '@low-code/shared';
import { buildId } from '../utils/resourceId';

/** 资源类型 */
type ResourceType = 'app' | 'page' | 'card' | 'form' | 'table' | 'workflow' | 'automation' | 'computation';

/** 资源类型配置 */
const RESOURCE_CONFIG: Record<ResourceType, { label: string; icon: React.ReactNode }> = {
  app: { label: '应用', icon: <AppstoreOutlined /> },
  page: { label: '页面', icon: <FileOutlined /> },
  card: { label: '卡片', icon: <FormOutlined /> },
  form: { label: '表单', icon: <FormOutlined /> },
  table: { label: '数据表', icon: <TableOutlined /> },
  workflow: { label: '流程', icon: <NodeIndexOutlined /> },
  automation: { label: '自动化', icon: <ThunderboltOutlined /> },
  computation: { label: '运算', icon: <CalculatorOutlined /> },
};

/** 应用资源概览页 */
function AppResourceOverview({ appId, onNavigate }: { appId: string; onNavigate: (path: string) => void }) {
  // 模拟应用数据（后续从 API 加载）
  const appName = '山水 OA';

  const resources = [
    { type: 'page' as ResourceType, count: 3, items: ['首页', '审批列表', '我的待办'] },
    { type: 'table' as ResourceType, count: 2, items: ['审批记录', '用户信息'] },
    { type: 'workflow' as ResourceType, count: 1, items: ['采购审批流程'] },
    { type: 'card' as ResourceType, count: 0, items: [] },
    { type: 'form' as ResourceType, count: 0, items: [] },
    { type: 'automation' as ResourceType, count: 0, items: [] },
    { type: 'computation' as ResourceType, count: 0, items: [] },
  ];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 0' }}>
      <h2 style={{ marginBottom: 24 }}>{appName} · 应用资源</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {resources.map((res) => {
          const config = RESOURCE_CONFIG[res.type];
          return (
            <Card
              key={res.type}
              hoverable
              style={{ borderRadius: 12 }}
              onClick={() => {
                if (res.count > 0) {
                  // 有资源时跳转到第一个资源的编辑器
                  onNavigate(`/designer/${res.type}/1`);
                }
              }}
            >
              <Card.Meta
                avatar={<span style={{ fontSize: 24 }}>{config.icon}</span>}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{config.label}</span>
                    <span style={{ fontSize: 14, color: '#8c8c8c', fontWeight: 400 }}>{res.count}</span>
                  </div>
                }
                description={
                  res.items.length > 0
                    ? res.items.map((item, i) => (
                        <div key={i} style={{ fontSize: 13, color: '#595959', lineHeight: 1.8 }}>
                          {item}
                        </div>
                      ))
                    : <span style={{ color: '#bfbfbf' }}>暂无</span>
                }
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/** 页面设计器 */
function PageDesigner({ pageId, onBack }: { pageId: string; onBack: () => void }) {
  const handleChange = (changedSchema: PageSchema) => {
    console.log('Schema changed:', changedSchema.pageId);
  };

  const handleSave = () => {
    message.success('页面保存成功');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: '#001529',
          color: 'white',
          flexShrink: 0,
        }}
      >
        <Button type="text" icon={<ArrowLeftOutlined />} style={{ color: 'white' }} onClick={onBack}>
          返回应用资源
        </Button>
        <span style={{ fontSize: 14, opacity: 0.85 }}>
          页面设计器 · {pageId}
        </span>
        <Button type="primary" icon={<SaveOutlined />} size="small" onClick={handleSave}>
          保存
        </Button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Designer onChange={handleChange} />
      </div>
    </div>
  );
}

/** 资源编辑器占位 */
function ResourcePlaceholder({ resourceType, id }: { resourceType: ResourceType; id: string }) {
  const config = RESOURCE_CONFIG[resourceType];
  return (
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
      <span style={{ fontSize: 48 }}>{config.icon}</span>
      <h2 style={{ color: '#1a1a2e' }}>{config.label}设计器</h2>
      <p style={{ color: '#8c8c8c' }}>资源 ID: {id} · 即将上线</p>
    </div>
  );
}

/** 主入口 */
export default function DesignerPage() {
  const { tenantId, resourceType, id } = useParams<{ tenantId: string; resourceType: string; id: string }>();
  const navigate = useNavigate();
  const tid = tenantId || '';
  const fullId = buildId(resourceType || 'app', id || '');

  const validResourceType = (resourceType || 'app') as ResourceType;
  const config = RESOURCE_CONFIG[validResourceType] || RESOURCE_CONFIG.app;

  // Back logic: app -> app center, other -> app resource overview
  const handleBack = () => {
    if (validResourceType === 'app') {
      navigate(`/${tid}/apps`);
    } else {
      navigate(`/${tid}/designer/app/${id}`);
    }
  };

  // app 类型：显示应用资源概览
  if (validResourceType === 'app') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            background: '#001529',
            color: 'white',
            flexShrink: 0,
          }}
        >
          <Button type="text" icon={<ArrowLeftOutlined />} style={{ color: 'white' }} onClick={handleBack}>
            返回应用中心
          </Button>
          <span style={{ fontSize: 14, opacity: 0.85, marginLeft: 16 }}>
            {config.icon} {config.label}资源 · {id}
          </span>
        </div>
        <div style={{ flex: 1, overflow: 'auto', background: '#f5f5f5' }}>
          <AppResourceOverview appId={id || ''} onNavigate={navigate} />
        </div>
      </div>
    );
  }

  // page 类型：显示页面设计器
  if (validResourceType === 'page') {
    return <PageDesigner pageId={id || ''} onBack={handleBack} />;
  }

  // 其他类型：占位
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          background: '#001529',
          color: 'white',
          flexShrink: 0,
        }}
      >
        <Button type="text" icon={<ArrowLeftOutlined />} style={{ color: 'white' }} onClick={handleBack}>
          返回应用资源
        </Button>
      </div>
      <div style={{ flex: 1 }}>
        <ResourcePlaceholder resourceType={validResourceType} id={id || ''} />
      </div>
    </div>
  );
}
