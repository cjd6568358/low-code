/** 主题配置 */
export interface ThemeConfig {
  primaryColor: string;
  borderRadius: number;
  fontSize: number;
  spacing: number;
  componentLibrary: 'antd' | 'element-plus' | 'custom';
  colorSuccess: string;
  colorWarning: string;
  colorError: string;
  colorBgContainer: string;
  colorTextPrimary: string;
}
