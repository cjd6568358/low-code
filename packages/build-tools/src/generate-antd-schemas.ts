/**
 * 从 antd 的 TypeScript 类型定义自动生成 JSON Schema
 *
 * 使用 typescript-json-schema 库读取 antd 组件的 Props 类型，
 * 生成标准 JSON Schema 文件，供设计器属性面板渲染使用。
 *
 * 用法：npx tsx scripts/generate-antd-schemas.ts
 */
import fs from 'fs';
import path from 'path';
import * as TJS from 'typescript-json-schema';

const OUTPUT_DIR = path.resolve(__dirname, '../packages/renderer/src/schemas/antd-generated');
const ANTD_ES = path.resolve(__dirname, '../node_modules/antd/es');
const TSCONFIG = path.resolve(__dirname, '../tsconfig.json');

// 确保输出目录存在
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * antd 组件类型映射
 *
 * key: 组件标识（小写，与 antd-library.ts 中的 type 对应）
 * value: { file: 类型定义文件路径（相对于 antd/es）, typeName: 导出的类型名 }
 */
const COMPONENT_TYPES: Record<string, { file: string; typeName: string }> = {
  // 数据录入
  input:           { file: 'input/Input.d.ts',               typeName: 'InputProps' },
  textarea:        { file: 'input/TextArea.d.ts',            typeName: 'TextAreaProps' },
  number:          { file: 'input-number/index.d.ts',        typeName: 'InputNumberProps' },
  select:          { file: 'select/index.d.ts',              typeName: 'SelectProps' },
  radio:           { file: 'radio/interface.d.ts',           typeName: 'RadioProps' },
  checkbox:        { file: 'checkbox/Checkbox.d.ts',         typeName: 'CheckboxProps' },
  switch:          { file: 'switch/index.d.ts',              typeName: 'SwitchProps' },
  datepicker:      { file: 'date-picker/generatePicker/interface.d.ts', typeName: 'PickerLocale' },
  timepicker:      { file: 'time-picker/index.d.ts',        typeName: 'TimePickerProps' },
  upload:          { file: 'upload/Upload.d.ts',             typeName: 'UploadProps' },
  autocomplete:    { file: 'auto-complete/AutoComplete.d.ts',typeName: 'AutoCompleteProps' },
  cascader:        { file: 'cascader/index.d.ts',            typeName: 'SearchConfig' },
  colorpicker:     { file: 'color-picker/interface.d.ts',    typeName: 'ColorPickerProps' },
  mentions:        { file: 'mentions/index.d.ts',            typeName: 'MentionsProps' },
  rate:            { file: 'rate/index.d.ts',                typeName: 'RateProps' },
  slider:          { file: 'slider/index.d.ts',              typeName: 'SliderSingleProps' },
  transfer:        { file: 'transfer/index.d.ts',            typeName: 'TransferProps' },
  treeselect:      { file: 'tree-select/index.d.ts',        typeName: 'TreeSelectProps' },

  // 数据展示
  avatar:          { file: 'avatar/Avatar.d.ts',             typeName: 'AvatarProps' },
  badge:           { file: 'badge/index.d.ts',               typeName: 'BadgeProps' },
  calendar:        { file: 'calendar/generateCalendar.d.ts', typeName: 'CalendarProps' },
  card:            { file: 'card/Card.d.ts',                 typeName: 'CardProps' },
  carousel:        { file: 'carousel/index.d.ts',            typeName: 'CarouselProps' },
  collapse:        { file: 'collapse/Collapse.d.ts',         typeName: 'CollapseProps' },
  descriptions:    { file: 'descriptions/index.d.ts',        typeName: 'DescriptionsProps' },
  empty:           { file: 'empty/index.d.ts',               typeName: 'EmptyProps' },
  image:           { file: 'image/index.d.ts',               typeName: 'ImageProps' },
  list:            { file: 'list/Item.d.ts',                typeName: 'ListItemProps' },
  popover:         { file: 'popover/index.d.ts',             typeName: 'PopoverProps' },
  qrcode:          { file: 'qr-code/interface.d.ts',         typeName: 'QRCodeProps' },
  segmented:       { file: 'segmented/index.d.ts',           typeName: 'SegmentedProps' },
  statistic:       { file: 'statistic/Statistic.d.ts',       typeName: 'StatisticReactProps' },
  table:           { file: 'table/interface.d.ts',            typeName: 'TableLocale' },
  tag:             { file: 'tag/index.d.ts',                 typeName: 'TagProps' },
  timeline:        { file: 'timeline/Timeline.d.ts',         typeName: 'TimelineProps' },
  tooltip:         { file: 'tooltip/index.d.ts',             typeName: 'TooltipProps' },
  tour:            { file: 'tour/interface.d.ts',            typeName: 'TourLocale' },
  tree:            { file: 'tree/Tree.d.ts',                 typeName: 'TreeProps' },

  // 反馈
  alert:           { file: 'alert/Alert.d.ts',               typeName: 'AlertProps' },
  drawer:          { file: 'drawer/index.d.ts',              typeName: 'DrawerProps' },
  modal:           { file: 'modal/interface.d.ts',           typeName: 'ModalProps' },
  popconfirm:      { file: 'popconfirm/index.d.ts',         typeName: 'PopconfirmProps' },
  progress:        { file: 'progress/progress.d.ts',         typeName: 'ProgressProps' },
  result:          { file: 'result/index.d.ts',              typeName: 'ResultProps' },
  skeleton:        { file: 'skeleton/Skeleton.d.ts',         typeName: 'SkeletonProps' },
  spin:            { file: 'spin/index.d.ts',                typeName: 'SpinProps' },
  watermark:       { file: 'watermark/index.d.ts',           typeName: 'WatermarkProps' },

  // 导航
  anchor:          { file: 'anchor/Anchor.d.ts',             typeName: 'AnchorProps' },
  breadcrumb:      { file: 'breadcrumb/Breadcrumb.d.ts',     typeName: 'BreadcrumbProps' },
  dropdown:        { file: 'dropdown/dropdown.d.ts',         typeName: 'DropdownProps' },
  menu:            { file: 'menu/menu.d.ts',                 typeName: 'MenuProps' },
  pagination:      { file: 'pagination/Pagination.d.ts',     typeName: 'PaginationProps' },
  steps:           { file: 'steps/index.d.ts',               typeName: 'StepsProps' },
  tabs:            { file: 'tabs/index.d.ts',                typeName: 'TabsProps' },

  // 布局
  button:          { file: 'button/button.d.ts',             typeName: 'ButtonProps' },
  divider:         { file: 'divider/index.d.ts',             typeName: 'DividerProps' },
  flex:            { file: 'flex/index.d.ts',                typeName: 'FlexProps' },
  layout:          { file: 'layout/layout.d.ts',             typeName: 'BasicProps' },
  sider:           { file: 'layout/Sider.d.ts',              typeName: 'SiderProps' },
  space:           { file: 'space/index.d.ts',               typeName: 'SpaceProps' },
  splitter:        { file: 'splitter/interface.d.ts',        typeName: 'SplitterProps' },
  form:            { file: 'form/Form.d.ts',                 typeName: 'FormProps' },

  // 通用
  floatbutton:     { file: 'float-button/FloatButton.d.ts', typeName: 'FloatButtonProps' },
  affix:           { file: 'affix/index.d.ts',               typeName: 'AffixProps' },
  text:            { file: 'typography/Base/index.d.ts',     typeName: 'BlockProps' },
};

// 收集所有需要处理的文件路径
const allFiles = Object.values(COMPONENT_TYPES).map((v) => path.join(ANTD_ES, v.file));

// 创建程序化 API 的 settings
const settings: TJS.PartialArgs = {
  refs: true,
  titles: true,
  required: false,  // 设为 false 避免复杂类型解析失败
  strictNullChecks: true,
  skipLibCheck: true,
  ignoreErrors: true,
  out: undefined,
  noExtraProps: false,
  defaultProps: false,
};

// 执行生成
const results: { type: string; status: 'ok' | 'error'; error?: string }[] = [];

// 用程序化 API 一次性构建 program，然后逐个生成
let program: any = null;
try {
  program = TJS.getProgramFromFiles(allFiles, {
    skipLibCheck: true,
    strictNullChecks: true,
  }, path.resolve(__dirname, '..'));
} catch (err: any) {
  console.error('Failed to create program:', err.message);
  process.exit(1);
}

for (const [type, { file, typeName }] of Object.entries(COMPONENT_TYPES)) {
  const filePath = path.join(ANTD_ES, file);
  const outFile = path.join(OUTPUT_DIR, `${type}.json`);

  if (!fs.existsSync(filePath)) {
    results.push({ type, status: 'error', error: `File not found: ${filePath}` });
    console.log(`  ❌ ${type} → ${typeName}: File not found`);
    continue;
  }

  try {
    const schema = TJS.generateSchema(program!, typeName, settings);

    if (!schema) {
      results.push({ type, status: 'error', error: 'generateSchema returned null' });
      console.log(`  ❌ ${type} → ${typeName}: generateSchema returned null`);
      continue;
    }

    // 注入 $id 和元信息
    schema.$id = `antd-${type}`;
    schema.title = typeName;
    schema.description = `antd ${typeName} — auto-generated from ${file}`;

    fs.writeFileSync(outFile, JSON.stringify(schema, null, 2), 'utf-8');
    results.push({ type, status: 'ok' });
    console.log(`  ✅ ${type} → ${typeName}`);
  } catch (err: any) {
    const msg = err.message?.split('\n')[0]?.slice(0, 120) || 'Unknown error';
    results.push({ type, status: 'error', error: msg });
    console.log(`  ❌ ${type} → ${typeName}: ${msg}`);
  }
}

// 汇总
const ok = results.filter((r) => r.status === 'ok');
const failed = results.filter((r) => r.status === 'error');

console.log(`\n═══════════════════════════════════════`);
console.log(`Total: ${results.length} | ✅ ${ok.length} | ❌ ${failed.length}`);
if (failed.length > 0) {
  console.log(`\nFailed components:`);
  for (const f of failed) {
    console.log(`  ${f.type}: ${f.error}`);
  }
}
console.log(`\nOutput: ${OUTPUT_DIR}`);

// 生成索引文件
const indexContent = `/**
 * antd 组件 JSON Schema — 自动生成
 *
 * 由 scripts/generate-antd-schemas.ts 从 antd 的 TS 类型定义生成。
 * 不要手动编辑此文件，重新运行生成脚本即可。
 *
 * 生成命令：npx tsx scripts/generate-antd-schemas.ts
 */
${ok.map((r) => `import ${r.type}Schema from './${r.type}.json';`).join('\n')}

export const antdGeneratedSchemas: Record<string, any> = {
${ok.map((r) => `  ${r.type}: ${r.type}Schema,`).join('\n')}
};
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'index.ts'), indexContent, 'utf-8');
console.log(`\nIndex file generated: ${path.join(OUTPUT_DIR, 'index.ts')}`);
