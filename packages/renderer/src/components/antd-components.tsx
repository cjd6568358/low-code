import React from 'react';
import {
  Input,
  InputNumber,
  Select,
  Radio,
  Checkbox,
  Switch,
  DatePicker,
  TimePicker,
  Upload,
  Button,
  Table,
  Form,
  Card,
  Flex,
  Grid,
  Divider,
  Tabs,
  Typography,
  // 数据录入
  AutoComplete,
  Cascader,
  ColorPicker,
  Mentions,
  Rate,
  Slider,
  Transfer,
  TreeSelect,
  // 数据展示
  Avatar,
  Badge,
  Calendar,
  Carousel,
  Collapse,
  Descriptions,
  Empty,
  Image,
  List,
  Popover,
  QRCode,
  Segmented,
  Statistic,
  Tag,
  Timeline,
  Tooltip,
  Tour,
  Tree,
  // 反馈
  Alert,
  Drawer,
  Modal,
  Popconfirm,
  Progress,
  Result,
  Skeleton,
  Spin,
  Watermark,
  // 导航
  Anchor,
  Breadcrumb,
  Dropdown,
  Menu,
  Pagination,
  Steps,
  // 布局
  Layout,
  Space,
  Splitter,
  // 通用
  FloatButton,
  Affix,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;
const { Group: AvatarGroup } = Avatar;
const { Ribbon: BadgeRibbon } = Badge;
const { Panel: CollapsePanel } = Collapse;
const { Item: DescriptionsItem } = Descriptions;
const { Item: ListItem } = List;
const { Item: TimelineItem } = Timeline;
const { Link: AnchorLink } = Anchor;
const { Item: BreadcrumbItem } = Breadcrumb;
const { Item: MenuItem, SubMenu, ItemGroup: MenuItemGroup } = Menu;
const { Header, Footer, Content, Sider } = Layout;
const { Panel: SplitterPanel } = Splitter;
const { Group: FloatButtonGroup, BackTop } = FloatButton;
const { Group: ButtonGroup } = Button;
const { RangePicker } = DatePicker;

/**
 * Ant Design 组件适配层
 *
 * 设计原则：
 * 1. 透传 antd 原生 Props（value/onChange/disabled/style/className 等）
 * 2. 注入 BaseProps 统一接口（visible/disabled/className/style）
 * 3. 设计模式下组件只读预览（disabled + readOnly）
 * 4. 事件处理器标准化（onChange 统一签名）
 */

// ==================== 基础组件 ====================

export const AntdInput: React.FC<any> = (props) => {
  const {
    value, onChange, placeholder, disabled, readOnly, maxLength, allowClear,
    addonBefore, addonAfter, prefix, suffix, size, variant, status, showCount,
    type, onPressEnter, onFocus, onBlur, onClear, style, className, ...rest
  } = props;
  return (
    <Input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      maxLength={maxLength}
      allowClear={allowClear}
      addonBefore={addonBefore}
      addonAfter={addonAfter}
      prefix={prefix}
      suffix={suffix}
      size={size}
      variant={variant}
      status={status}
      showCount={showCount}
      type={type}
      onPressEnter={onPressEnter}
      onFocus={onFocus}
      onBlur={onBlur}
      onClear={onClear}
      style={style}
      className={className}
      {...rest}
    />
  );
};

export const AntdTextarea: React.FC<any> = (props) => {
  const {
    value, onChange, placeholder, disabled, readOnly, maxLength, rows = 4,
    allowClear, autoSize, showCount, size, variant, status,
    onPressEnter, onFocus, onBlur, onResize, onClear, style, className, ...rest
  } = props;
  return (
    <TextArea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      maxLength={maxLength}
      rows={rows}
      allowClear={allowClear}
      autoSize={autoSize}
      showCount={showCount}
      size={size}
      variant={variant}
      status={status}
      onPressEnter={onPressEnter}
      onFocus={onFocus}
      onBlur={onBlur}
      onResize={onResize}
      onClear={onClear}
      style={style}
      className={className}
      {...rest}
    />
  );
};

export const AntdNumber: React.FC<any> = (props) => {
  const {
    value, onChange, placeholder, disabled, min, max, step, precision,
    controls, keyboard, changeOnWheel, changeOnBlur, stringMode,
    formatter, parser, prefix, suffix, size, variant, status,
    onPressEnter, onStep, onInput, onFocus, onBlur, style, className, ...rest
  } = props;
  return (
    <InputNumber
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      precision={precision}
      controls={controls}
      keyboard={keyboard}
      changeOnWheel={changeOnWheel}
      changeOnBlur={changeOnBlur}
      stringMode={stringMode}
      formatter={formatter}
      parser={parser}
      prefix={prefix}
      suffix={suffix}
      size={size}
      variant={variant}
      status={status}
      onPressEnter={onPressEnter}
      onStep={onStep}
      onInput={onInput}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{ width: '100%', ...style }}
      className={className}
      {...rest}
    />
  );
};

export const AntdSelect: React.FC<any> = (props) => {
  const {
    value, onChange, options = [], placeholder, disabled, multiple, showSearch,
    allowClear, mode, size, variant, status, placement, prefix, suffixIcon,
    optionFilterProp, popupMatchSelectWidth, onSearch, onSelect, onDeselect,
    onOpenChange, onClear, onFocus, onBlur, style, className, ...rest
  } = props;
  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      mode={multiple ? 'multiple' : mode}
      showSearch={showSearch}
      allowClear={allowClear}
      size={size}
      variant={variant}
      status={status}
      placement={placement}
      prefix={prefix}
      suffixIcon={suffixIcon}
      optionFilterProp={optionFilterProp}
      popupMatchSelectWidth={popupMatchSelectWidth}
      onSearch={onSearch}
      onSelect={onSelect}
      onDeselect={onDeselect}
      onOpenChange={onOpenChange}
      onClear={onClear}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{ width: '100%', ...style }}
      className={className}
      {...rest}
    />
  );
};

export const AntdRadio: React.FC<any> = (props) => {
  const {
    value, onChange, options = [], disabled, optionType = 'button',
    buttonStyle, block, size, name, onFocus, onBlur, style, className, ...rest
  } = props;

  if (options.length > 0) {
    return (
      <Radio.Group
        value={value}
        onChange={onChange}
        options={options}
        disabled={disabled}
        optionType={optionType}
        buttonStyle={buttonStyle}
        block={block}
        size={size}
        name={name}
        onFocus={onFocus}
        onBlur={onBlur}
        style={style}
        className={className}
        {...rest}
      />
    );
  }

  return (
    <Radio.Group
      value={value}
      onChange={onChange}
      disabled={disabled}
      optionType={optionType}
      buttonStyle={buttonStyle}
      size={size}
      style={style}
      className={className}
      {...rest}
    />
  );
};

export const AntdCheckbox: React.FC<any> = (props) => {
  const {
    value, onChange, options = [], disabled, indeterminate, name,
    onFocus, onBlur, style, className, children, ...rest
  } = props;

  if (options.length > 0) {
    return (
      <Checkbox.Group
        value={value}
        onChange={onChange}
        options={options}
        disabled={disabled}
        name={name}
        style={style}
        className={className}
        {...rest}
      />
    );
  }

  return (
    <Checkbox
      checked={value}
      onChange={onChange}
      disabled={disabled}
      indeterminate={indeterminate}
      name={name}
      onFocus={onFocus}
      onBlur={onBlur}
      style={style}
      className={className}
      {...rest}
    >
      {children}
    </Checkbox>
  );
};

export const AntdSwitch: React.FC<any> = (props) => {
  const {
    value, onChange, disabled, loading, autoFocus, size,
    checkedChildren, unCheckedChildren, style, className, ...rest
  } = props;
  return (
    <Switch
      checked={!!value}
      onChange={onChange}
      disabled={disabled}
      loading={loading}
      autoFocus={autoFocus}
      size={size}
      checkedChildren={checkedChildren}
      unCheckedChildren={unCheckedChildren}
      style={style}
      className={className}
      {...rest}
    />
  );
};

export const AntdDatePicker: React.FC<any> = (props) => {
  const {
    value, onChange, placeholder, disabled, format = 'YYYY-MM-DD',
    showTime, picker, allowClear, size, variant, status, placement,
    multiple, onOk, onCalendarChange, onPanelChange, onOpenChange,
    style, className, ...rest
  } = props;
  return (
    <DatePicker
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      format={format}
      showTime={showTime}
      picker={picker}
      allowClear={allowClear}
      size={size}
      variant={variant}
      status={status}
      placement={placement}
      multiple={multiple}
      onOk={onOk}
      onCalendarChange={onCalendarChange}
      onPanelChange={onPanelChange}
      onOpenChange={onOpenChange}
      style={{ width: '100%', ...style }}
      className={className}
      {...rest}
    />
  );
};

export const AntdRangePicker: React.FC<any> = (props) => {
  const {
    value, onChange, placeholder, disabled, format = 'YYYY-MM-DD',
    showTime, allowClear, size, variant, status, placement,
    onOk, onCalendarChange, onPanelChange, onOpenChange,
    style, className, ...rest
  } = props;
  return (
    <RangePicker
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      format={format}
      showTime={showTime}
      allowClear={allowClear}
      size={size}
      variant={variant}
      status={status}
      placement={placement}
      onOk={onOk}
      onCalendarChange={onCalendarChange}
      onPanelChange={onPanelChange}
      onOpenChange={onOpenChange}
      style={{ width: '100%', ...style }}
      className={className}
      {...rest}
    />
  );
};

export const AntdTimePicker: React.FC<any> = (props) => {
  const {
    value, onChange, placeholder, disabled, format = 'HH:mm:ss',
    allowClear, size, variant, status, placement, hourStep, minuteStep,
    secondStep, use12Hours, style, className, ...rest
  } = props;
  return (
    <TimePicker
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      format={format}
      allowClear={allowClear}
      size={size}
      variant={variant}
      status={status}
      placement={placement}
      hourStep={hourStep}
      minuteStep={minuteStep}
      secondStep={secondStep}
      use12Hours={use12Hours}
      style={{ width: '100%', ...style }}
      className={className}
      {...rest}
    />
  );
};

export const AntdUpload: React.FC<any> = (props) => {
  const {
    onChange, disabled, accept, maxCount, listType = 'text', action,
    name, multiple, method, headers, data, showUploadList, withCredentials,
    directory, onDrop, onPreview, onDownload, onRemove, beforeUpload,
    style, className, children, ...rest
  } = props;
  return (
    <Upload
      accept={accept}
      disabled={disabled}
      maxCount={maxCount}
      listType={listType}
      action={action}
      name={name}
      multiple={multiple}
      method={method}
      headers={headers}
      data={data}
      showUploadList={showUploadList}
      withCredentials={withCredentials}
      directory={directory}
      onChange={onChange}
      onDrop={onDrop}
      onPreview={onPreview}
      onDownload={onDownload}
      onRemove={onRemove}
      beforeUpload={beforeUpload}
      style={style}
      className={className}
      {...rest}
    >
      {children || (
        <Button icon={<UploadOutlined />} disabled={disabled}>
          上传文件
        </Button>
      )}
    </Upload>
  );
};

// ==================== 布局组件 ====================

export const AntdButton: React.FC<any> = (props) => {
  const {
    children, onClick, disabled, type = 'default', htmlType, loading,
    icon, iconPosition, shape, size, ghost, danger, block, href,
    variant, color, style, className, ...rest
  } = props;
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      type={type}
      htmlType={htmlType}
      loading={loading}
      icon={icon}
      iconPosition={iconPosition}
      shape={shape}
      size={size}
      ghost={ghost}
      danger={danger}
      block={block}
      href={href}
      variant={variant}
      color={color}
      style={style}
      className={className}
      {...rest}
    >
      {children}
    </Button>
  );
};

export const AntdTable: React.FC<any> = (props) => {
  const {
    columns = [], dataSource = [], pagination, loading, bordered, size,
    rowSelection, scroll, expandable, virtual, locale, onChange, onRow,
    onHeaderRow, style, className, ...rest
  } = props;
  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      pagination={pagination ?? { pageSize: 10 }}
      loading={loading}
      bordered={bordered}
      size={size}
      rowSelection={rowSelection}
      scroll={scroll}
      expandable={expandable}
      virtual={virtual}
      locale={locale}
      onChange={onChange}
      onRow={onRow}
      onHeaderRow={onHeaderRow}
      style={style}
      className={className}
      {...rest}
    />
  );
};

export const AntdForm: React.FC<any> = (props) => {
  const {
    children, layout = 'horizontal', labelAlign, labelCol, wrapperCol,
    colon, size, disabled, requiredMark, scrollToFirstError, variant,
    name, initialValues, onFinish, onFinishFailed, onValuesChange,
    form, style, className, ...rest
  } = props;
  return (
    <Form
      layout={layout}
      labelAlign={labelAlign}
      labelCol={labelCol}
      wrapperCol={wrapperCol}
      colon={colon}
      size={size}
      disabled={disabled}
      requiredMark={requiredMark}
      scrollToFirstError={scrollToFirstError}
      variant={variant}
      name={name}
      initialValues={initialValues}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      onValuesChange={onValuesChange}
      form={form}
      style={style}
      className={className}
      {...rest}
    >
      {children}
    </Form>
  );
};

export const AntdCard: React.FC<any> = (props) => {
  const {
    children, title, extra, bordered, variant, loading, hoverable, size,
    type, cover, actions, tabList, tabBarExtraContent, activeTabKey,
    defaultActiveTabKey, onTabChange, headStyle, bodyStyle,
    classNames, styles, style, className, ...rest
  } = props;
  return (
    <Card
      title={title}
      extra={extra}
      bordered={bordered}
      variant={variant}
      loading={loading}
      hoverable={hoverable}
      size={size}
      type={type}
      cover={cover}
      actions={actions}
      tabList={tabList}
      tabBarExtraContent={tabBarExtraContent}
      activeTabKey={activeTabKey}
      defaultActiveTabKey={defaultActiveTabKey}
      onTabChange={onTabChange}
      headStyle={headStyle}
      bodyStyle={bodyStyle}
      classNames={classNames}
      styles={styles}
      style={style}
      className={className}
      {...rest}
    >
      {children}
    </Card>
  );
};

export const AntdFlex: React.FC<any> = (props) => {
  const {
    children, vertical, wrap, justify, align, flex, gap, component,
    style, className, ...rest
  } = props;
  return (
    <Flex
      vertical={vertical}
      wrap={wrap}
      justify={justify}
      align={align}
      flex={flex}
      gap={gap}
      component={component}
      style={style}
      className={className}
      {...rest}
    >
      {children}
    </Flex>
  );
};

export const AntdDivider: React.FC<any> = (props) => {
  const {
    children, type, orientation = 'center', orientationMargin, dashed,
    variant, plain, size, style, className, ...rest
  } = props;
  return (
    <Divider
      type={type}
      orientation={orientation}
      orientationMargin={orientationMargin}
      dashed={dashed}
      variant={variant}
      plain={plain}
      size={size}
      style={style}
      className={className}
      {...rest}
    >
      {children}
    </Divider>
  );
};

export const AntdTabs: React.FC<any> = (props) => {
  const {
    items = [], activeKey, defaultActiveKey, onChange, type = 'line',
    size, centered, tabPosition = 'top', tabBarGutter, tabBarStyle,
    tabBarExtraContent, animated, destroyOnHidden, onEdit, onTabClick,
    onTabScroll, style, className, ...rest
  } = props;
  return (
    <Tabs
      items={items}
      activeKey={activeKey}
      defaultActiveKey={defaultActiveKey}
      onChange={onChange}
      type={type}
      size={size}
      centered={centered}
      tabPosition={tabPosition}
      tabBarGutter={tabBarGutter}
      tabBarStyle={tabBarStyle}
      tabBarExtraContent={tabBarExtraContent}
      animated={animated}
      destroyOnHidden={destroyOnHidden}
      onEdit={onEdit}
      onTabClick={onTabClick}
      onTabScroll={onTabScroll}
      style={style}
      className={className}
      {...rest}
    />
  );
};

export const AntdText: React.FC<any> = (props) => {
  const { children, strong, italic, type, underline, delete: del, mark, code, copyable, style, className, ...rest } = props;
  return (
    <Text strong={strong} italic={italic} type={type} underline={underline} delete={del} mark={mark} code={code} copyable={copyable} style={style} className={className} {...rest}>
      {children}
    </Text>
  );
};

// ==================== 数据录入（补充） ====================

export const AntdAutoComplete: React.FC<any> = (props) => {
  const { value, onChange, placeholder, disabled, options, dataSource, allowClear,
    showSearch, size, variant, style, className, ...rest } = props;
  return (
    <AutoComplete
      value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      options={options || dataSource} allowClear={allowClear} showSearch={showSearch}
      size={size} variant={variant} style={{ width: '100%', ...style }} className={className} {...rest}
    />
  );
};

export const AntdCascader: React.FC<any> = (props) => {
  const { value, onChange, placeholder, disabled, options, multiple, allowClear,
    showSearch, size, variant, placement, style, className, ...rest } = props;
  return (
    <Cascader
      value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      options={options} multiple={multiple} allowClear={allowClear} showSearch={showSearch}
      size={size} variant={variant} placement={placement}
      style={{ width: '100%', ...style }} className={className} {...rest}
    />
  );
};

export const AntdColorPicker: React.FC<any> = (props) => {
  const { value, onChange, disabled, allowClear, format, mode, trigger, placement,
    showText, size, style, className, ...rest } = props;
  return (
    <ColorPicker
      value={value} onChange={onChange} disabled={disabled} allowClear={allowClear}
      format={format} mode={mode} trigger={trigger} placement={placement}
      showText={showText} size={size} style={style} className={className} {...rest}
    />
  );
};

export const AntdMentions: React.FC<any> = (props) => {
  const { value, onChange, placeholder, disabled, options, loading, size, style, className, ...rest } = props;
  return (
    <Mentions
      value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      options={options} loading={loading} size={size} style={style} className={className} {...rest}
    />
  );
};

export const AntdRate: React.FC<any> = (props) => {
  const { value, onChange, disabled, allowClear, count, tooltips, style, className, ...rest } = props;
  return (
    <Rate
      value={value} onChange={onChange} disabled={disabled} allowClear={allowClear}
      count={count} tooltips={tooltips} style={style} className={className} {...rest}
    />
  );
};

export const AntdSlider: React.FC<any> = (props) => {
  const { value, onChange, disabled, min, max, step, range, marks, dots,
    vertical, reverse, tooltip, style, className, ...rest } = props;
  return (
    <Slider
      value={value} onChange={onChange} disabled={disabled} min={min} max={max}
      step={step} range={range} marks={marks} dots={dots} vertical={vertical}
      reverse={reverse} tooltip={tooltip} style={style} className={className} {...rest}
    />
  );
};

export const AntdTransfer: React.FC<any> = (props) => {
  const { dataSource, targetKeys, onChange, disabled, titles, showSearch,
    oneWay, pagination, style, className, ...rest } = props;
  return (
    <Transfer
      dataSource={dataSource} targetKeys={targetKeys} onChange={onChange}
      disabled={disabled} titles={titles} showSearch={showSearch}
      oneWay={oneWay} pagination={pagination} style={style} className={className} {...rest}
    />
  );
};

export const AntdTreeSelect: React.FC<any> = (props) => {
  const { value, onChange, placeholder, disabled, treeData, allowClear,
    multiple, showSearch, size, variant, placement, style, className, ...rest } = props;
  return (
    <TreeSelect
      value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      treeData={treeData} allowClear={allowClear} multiple={multiple} showSearch={showSearch}
      size={size} variant={variant} placement={placement}
      style={{ width: '100%', ...style }} className={className} {...rest}
    />
  );
};

// ==================== 数据展示 ====================

export const AntdAvatar: React.FC<any> = (props) => {
  const { src, icon, shape, size, gap, alt, children, style, className, ...rest } = props;
  return (
    <Avatar src={src} icon={icon} shape={shape} size={size} gap={gap}
      alt={alt} style={style} className={className} {...rest}>
      {children}
    </Avatar>
  );
};

export const AntdBadge: React.FC<any> = (props) => {
  const { count, showZero, dot, overflowCount, color, text, offset, title,
    children, style, className, ...rest } = props;
  return (
    <Badge count={count} showZero={showZero} dot={dot} overflowCount={overflowCount}
      color={color} text={text} offset={offset} title={title}
      style={style} className={className} {...rest}>
      {children}
    </Badge>
  );
};

export const AntdCalendar: React.FC<any> = (props) => {
  const { value, onChange, mode, fullscreen, showWeek, disabledDate,
    cellRender, headerRender, style, className, ...rest } = props;
  return (
    <Calendar value={value} onChange={onChange} mode={mode} fullscreen={fullscreen}
      showWeek={showWeek} disabledDate={disabledDate} cellRender={cellRender}
      headerRender={headerRender} style={style} className={className} {...rest}
    />
  );
};

export const AntdCarousel: React.FC<any> = (props) => {
  const { autoplay, dots, dotPosition, effect, children, style, className, ...rest } = props;
  return (
    <Carousel autoplay={autoplay} dots={dots} dotPosition={dotPosition}
      effect={effect} style={style} className={className} {...rest}>
      {children}
    </Carousel>
  );
};

export const AntdCollapse: React.FC<any> = (props) => {
  const { items, activeKey, defaultActiveKey, accordion, bordered, ghost,
    expandIconPosition, destroyOnHidden, onChange, style, className, ...rest } = props;
  return (
    <Collapse items={items} activeKey={activeKey} defaultActiveKey={defaultActiveKey}
      accordion={accordion} bordered={bordered} ghost={ghost}
      expandIconPosition={expandIconPosition} destroyOnHidden={destroyOnHidden}
      onChange={onChange} style={style} className={className} {...rest}
    />
  );
};

export const AntdDescriptions: React.FC<any> = (props) => {
  const { items, title, extra, bordered, column, layout, colon, size,
    labelStyle, contentStyle, style, className, ...rest } = props;
  return (
    <Descriptions items={items} title={title} extra={extra} bordered={bordered}
      column={column} layout={layout} colon={colon} size={size}
      labelStyle={labelStyle} contentStyle={contentStyle}
      style={style} className={className} {...rest}
    />
  );
};

export const AntdEmpty: React.FC<any> = (props) => {
  const { image, description, children, style, className, ...rest } = props;
  return (
    <Empty image={image} description={description} style={style} className={className} {...rest}>
      {children}
    </Empty>
  );
};

export const AntdImage: React.FC<any> = (props) => {
  const { src, alt, width, height, preview, fallback, placeholder, style, className, ...rest } = props;
  return (
    <Image src={src} alt={alt} width={width} height={height} preview={preview}
      fallback={fallback} placeholder={placeholder} style={style} className={className} {...rest}
    />
  );
};

export const AntdList: React.FC<any> = (props) => {
  const { dataSource, renderItem, bordered, itemLayout, loading, loadMore,
    pagination, header, footer, split, grid, size, style, className, ...rest } = props;
  return (
    <List dataSource={dataSource} renderItem={renderItem} bordered={bordered}
      itemLayout={itemLayout} loading={loading} loadMore={loadMore}
      pagination={pagination} header={header} footer={footer} split={split}
      grid={grid} size={size} style={style} className={className} {...rest}
    />
  );
};

export const AntdPopover: React.FC<any> = (props) => {
  const { title, content, trigger, placement, open, onOpenChange,
    children, style, className, ...rest } = props;
  return (
    <Popover title={title} content={content} trigger={trigger} placement={placement}
      open={open} onOpenChange={onOpenChange} style={style} className={className} {...rest}>
      {children}
    </Popover>
  );
};

export const AntdQRCode: React.FC<any> = (props) => {
  const { value, type, icon, size, iconSize, bordered, errorLevel, status,
    onRefresh, style, className, ...rest } = props;
  return (
    <QRCode value={value} type={type} icon={icon} size={size} iconSize={iconSize}
      bordered={bordered} errorLevel={errorLevel} status={status}
      onRefresh={onRefresh} style={style} className={className} {...rest}
    />
  );
};

export const AntdSegmented: React.FC<any> = (props) => {
  const { value, onChange, options, disabled, block, vertical, size, shape,
    style, className, ...rest } = props;
  return (
    <Segmented value={value} onChange={onChange} options={options} disabled={disabled}
      block={block} vertical={vertical} size={size} shape={shape}
      style={style} className={className} {...rest}
    />
  );
};

export const AntdStatistic: React.FC<any> = (props) => {
  const { title, value, valueStyle, prefix, suffix, precision, decimalSeparator,
    groupSeparator, formatter, loading, style, className, ...rest } = props;
  return (
    <Statistic title={title} value={value} valueStyle={valueStyle} prefix={prefix}
      suffix={suffix} precision={precision} decimalSeparator={decimalSeparator}
      groupSeparator={groupSeparator} formatter={formatter} loading={loading}
      style={style} className={className} {...rest}
    />
  );
};

export const AntdTag: React.FC<any> = (props) => {
  const { children, color, closable, closeIcon, icon, bordered, onClose,
    style, className, ...rest } = props;
  return (
    <Tag color={color} closable={closable} closeIcon={closeIcon} icon={icon}
      bordered={bordered} onClose={onClose} style={style} className={className} {...rest}>
      {children}
    </Tag>
  );
};

export const AntdTimeline: React.FC<any> = (props) => {
  const { items, mode, pending, pendingDot, reverse, children, style, className, ...rest } = props;
  return (
    <Timeline items={items} mode={mode} pending={pending} pendingDot={pendingDot}
      reverse={reverse} style={style} className={className} {...rest}>
      {children}
    </Timeline>
  );
};

export const AntdTooltip: React.FC<any> = (props) => {
  const { title, placement, color, arrow, open, onOpenChange,
    children, style, className, ...rest } = props;
  return (
    <Tooltip title={title} placement={placement} color={color} arrow={arrow}
      open={open} onOpenChange={onOpenChange} style={style} className={className} {...rest}>
      {children}
    </Tooltip>
  );
};

export const AntdTour: React.FC<any> = (props) => {
  const { steps, current, type, indicatorsRender, style, className, ...rest } = props;
  return (
    <Tour steps={steps} current={current} type={type}
      indicatorsRender={indicatorsRender} style={style} className={className} {...rest}
    />
  );
};

export const AntdTree: React.FC<any> = (props) => {
  const { treeData, checkable, selectable, disabled, showLine, showIcon,
    draggable, defaultExpandAll, expandedKeys, selectedKeys, checkedKeys,
    onSelect, onCheck, onExpand, style, className, ...rest } = props;
  return (
    <Tree treeData={treeData} checkable={checkable} selectable={selectable}
      disabled={disabled} showLine={showLine} showIcon={showIcon} draggable={draggable}
      defaultExpandAll={defaultExpandAll} expandedKeys={expandedKeys}
      selectedKeys={selectedKeys} checkedKeys={checkedKeys}
      onSelect={onSelect} onCheck={onCheck} onExpand={onExpand}
      style={style} className={className} {...rest}
    />
  );
};

// ==================== 反馈 ====================

export const AntdAlert: React.FC<any> = (props) => {
  const { type, message, description, showIcon, closable, closeText, icon,
    banner, action, onClose, style, className, ...rest } = props;
  return (
    <Alert type={type} message={message} description={description} showIcon={showIcon}
      closable={closable} closeText={closeText} icon={icon} banner={banner}
      action={action} onClose={onClose} style={style} className={className} {...rest}
    />
  );
};

export const AntdDrawer: React.FC<any> = (props) => {
  const { open, title, placement, width, height, footer, extra, closable,
    destroyOnHidden, loading, children, onClose, style, className, ...rest } = props;
  return (
    <Drawer open={open} title={title} placement={placement} width={width} height={height}
      footer={footer} extra={extra} closable={closable} destroyOnHidden={destroyOnHidden}
      loading={loading} onClose={onClose} style={style} className={className} {...rest}>
      {children}
    </Drawer>
  );
};

export const AntdModal: React.FC<any> = (props) => {
  const { open, title, width, centered, okText, cancelText, okType, confirmLoading,
    maskClosable, destroyOnHidden, footer, closable, loading, children,
    onOk, onCancel, style, className, ...rest } = props;
  return (
    <Modal open={open} title={title} width={width} centered={centered}
      okText={okText} cancelText={cancelText} okType={okType}
      confirmLoading={confirmLoading} maskClosable={maskClosable}
      destroyOnHidden={destroyOnHidden} footer={footer} closable={closable}
      loading={loading} onOk={onOk} onCancel={onCancel}
      style={style} className={className} {...rest}>
      {children}
    </Modal>
  );
};

export const AntdPopconfirm: React.FC<any> = (props) => {
  const { title, description, okText, cancelText, okType, icon, showCancel,
    disabled, children, onConfirm, onCancel, style, className, ...rest } = props;
  return (
    <Popconfirm title={title} description={description} okText={okText}
      cancelText={cancelText} okType={okType} icon={icon} showCancel={showCancel}
      disabled={disabled} onConfirm={onConfirm} onCancel={onCancel}
      style={style} className={className} {...rest}>
      {children}
    </Popconfirm>
  );
};

export const AntdProgress: React.FC<any> = (props) => {
  const { type, percent, format, showInfo, strokeWidth, strokeLinecap,
    strokeColor, trailColor, gapDegree, gapPosition, size, steps,
    success, style, className, ...rest } = props;
  return (
    <Progress type={type} percent={percent} format={format} showInfo={showInfo}
      strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeColor={strokeColor}
      trailColor={trailColor} gapDegree={gapDegree} gapPosition={gapPosition}
      size={size} steps={steps} success={success}
      style={style} className={className} {...rest}
    />
  );
};

export const AntdResult: React.FC<any> = (props) => {
  const { status, icon, title, subTitle, extra, children, style, className, ...rest } = props;
  return (
    <Result status={status} icon={icon} title={title} subTitle={subTitle}
      extra={extra} style={style} className={className} {...rest}>
      {children}
    </Result>
  );
};

export const AntdSkeleton: React.FC<any> = (props) => {
  const { active, loading, avatar, title, paragraph, round, children,
    style, className, ...rest } = props;
  return (
    <Skeleton active={active} loading={loading} avatar={avatar} title={title}
      paragraph={paragraph} round={round} style={style} className={className} {...rest}>
      {children}
    </Skeleton>
  );
};

export const AntdSpin: React.FC<any> = (props) => {
  const { spinning, size, tip, delay, indicator, fullscreen, children,
    style, className, ...rest } = props;
  return (
    <Spin spinning={spinning} size={size} tip={tip} delay={delay}
      indicator={indicator} fullscreen={fullscreen}
      style={style} className={className} {...rest}>
      {children}
    </Spin>
  );
};

export const AntdWatermark: React.FC<any> = (props) => {
  const { content, image, font, rotate, zIndex, width, height, gap, offset,
    children, style, className, ...rest } = props;
  return (
    <Watermark content={content} image={image} font={font} rotate={rotate}
      zIndex={zIndex} width={width} height={height} gap={gap} offset={offset}
      style={style} className={className} {...rest}>
      {children}
    </Watermark>
  );
};

// ==================== 导航 ====================

export const AntdAnchor: React.FC<any> = (props) => {
  const { items, direction, offsetTop, targetOffset, affix, onClick, onChange,
    style, className, ...rest } = props;
  return (
    <Anchor items={items} direction={direction} offsetTop={offsetTop}
      targetOffset={targetOffset} affix={affix} onClick={onClick} onChange={onChange}
      style={style} className={className} {...rest}
    />
  );
};

export const AntdBreadcrumb: React.FC<any> = (props) => {
  const { items, separator, itemRender, style, className, ...rest } = props;
  return (
    <Breadcrumb items={items} separator={separator} itemRender={itemRender}
      style={style} className={className} {...rest}
    />
  );
};

export const AntdDropdown: React.FC<any> = (props) => {
  const { menu, trigger, placement, open, onOpenChange, arrow, disabled,
    children, style, className, ...rest } = props;
  return (
    <Dropdown menu={menu} trigger={trigger} placement={placement} open={open}
      onOpenChange={onOpenChange} arrow={arrow} disabled={disabled}
      style={style} className={className} {...rest}>
      {children}
    </Dropdown>
  );
};

export const AntdMenu: React.FC<any> = (props) => {
  const { items, mode, theme, selectedKeys, defaultSelectedKeys, openKeys,
    defaultOpenKeys, inlineIndent, onClick, onOpenChange, style, className, ...rest } = props;
  return (
    <Menu items={items} mode={mode} theme={theme} selectedKeys={selectedKeys}
      defaultSelectedKeys={defaultSelectedKeys} openKeys={openKeys}
      defaultOpenKeys={defaultOpenKeys} inlineIndent={inlineIndent}
      onClick={onClick} onOpenChange={onOpenChange}
      style={style} className={className} {...rest}
    />
  );
};

export const AntdPagination: React.FC<any> = (props) => {
  const { current, total, pageSize, pageSizeOptions, showSizeChanger,
    showQuickJumper, showTotal, disabled, size, onChange, style, className, ...rest } = props;
  return (
    <Pagination current={current} total={total} pageSize={pageSize}
      pageSizeOptions={pageSizeOptions} showSizeChanger={showSizeChanger}
      showQuickJumper={showQuickJumper} showTotal={showTotal} disabled={disabled}
      size={size} onChange={onChange} style={style} className={className} {...rest}
    />
  );
};

export const AntdSteps: React.FC<any> = (props) => {
  const { items, current, direction, type, size, labelPlacement, progressDot,
    initial, percent, onChange, style, className, ...rest } = props;
  return (
    <Steps items={items} current={current} direction={direction} type={type}
      size={size} labelPlacement={labelPlacement} progressDot={progressDot}
      initial={initial} percent={percent} onChange={onChange}
      style={style} className={className} {...rest}
    />
  );
};

// ==================== 布局（补充） ====================

export const AntdLayout: React.FC<any> = (props) => {
  const { children, hasSider, style, className, ...rest } = props;
  return (
    <Layout hasSider={hasSider} style={style} className={className} {...rest}>
      {children}
    </Layout>
  );
};

export const AntdSider: React.FC<any> = (props) => {
  const { children, collapsible, collapsed, defaultCollapsed, width, collapsedWidth,
    breakpoint, theme, reverseArrow, trigger, onCollapse, onBreakpoint,
    style, className, ...rest } = props;
  return (
    <Sider collapsible={collapsible} collapsed={collapsed} defaultCollapsed={defaultCollapsed}
      width={width} collapsedWidth={collapsedWidth} breakpoint={breakpoint} theme={theme}
      reverseArrow={reverseArrow} trigger={trigger} onCollapse={onCollapse}
      onBreakpoint={onBreakpoint} style={style} className={className} {...rest}>
      {children}
    </Sider>
  );
};

export const AntdSpace: React.FC<any> = (props) => {
  const { children, size, direction, align, wrap, split, style, className, ...rest } = props;
  return (
    <Space size={size} direction={direction} align={align} wrap={wrap}
      split={split} style={style} className={className} {...rest}>
      {children}
    </Space>
  );
};

export const AntdSplitter: React.FC<any> = (props) => {
  const { children, layout, onResize, onResizeStart, onResizeEnd, onCollapse, lazy,
    style, className, ...rest } = props;
  return (
    <Splitter layout={layout} onResize={onResize} onResizeStart={onResizeStart}
      onResizeEnd={onResizeEnd} onCollapse={onCollapse} lazy={lazy}
      style={style} className={className} {...rest}>
      {children}
    </Splitter>
  );
};

// ==================== 通用（补充） ====================

export const AntdFloatButton: React.FC<any> = (props) => {
  const { icon, description, type, shape, tooltip, href, target, badge,
    style, className, ...rest } = props;
  return (
    <FloatButton icon={icon} description={description} type={type} shape={shape}
      tooltip={tooltip} href={href} target={target} badge={badge}
      style={style} className={className} {...rest}
    />
  );
};

export const AntdAffix: React.FC<any> = (props) => {
  const { children, offsetTop, offsetBottom, target, style, className, ...rest } = props;
  return (
    <Affix offsetTop={offsetTop} offsetBottom={offsetBottom} target={target}
      style={style} className={className} {...rest}>
      {children}
    </Affix>
  );
};

// ==================== 组件映射表 ====================

export const antdComponents: Record<string, React.ComponentType<any>> = {
  // 原有 19 个
  input: AntdInput,
  textarea: AntdTextarea,
  number: AntdNumber,
  select: AntdSelect,
  radio: AntdRadio,
  checkbox: AntdCheckbox,
  switch: AntdSwitch,
  datepicker: AntdDatePicker,
  timepicker: AntdTimePicker,
  upload: AntdUpload,
  button: AntdButton,
  table: AntdTable,
  form: AntdForm,
  card: AntdCard,
  flex: AntdFlex,
  grid: AntdFlex,
  divider: AntdDivider,
  tabs: AntdTabs,
  text: AntdText,
  // 数据录入（补充）
  autocomplete: AntdAutoComplete,
  cascader: AntdCascader,
  colorpicker: AntdColorPicker,
  mentions: AntdMentions,
  rate: AntdRate,
  slider: AntdSlider,
  transfer: AntdTransfer,
  treeselect: AntdTreeSelect,
  // 数据展示
  avatar: AntdAvatar,
  badge: AntdBadge,
  calendar: AntdCalendar,
  carousel: AntdCarousel,
  collapse: AntdCollapse,
  descriptions: AntdDescriptions,
  empty: AntdEmpty,
  image: AntdImage,
  list: AntdList,
  popover: AntdPopover,
  qrcode: AntdQRCode,
  segmented: AntdSegmented,
  statistic: AntdStatistic,
  tag: AntdTag,
  timeline: AntdTimeline,
  tooltip: AntdTooltip,
  tour: AntdTour,
  tree: AntdTree,
  // 反馈
  alert: AntdAlert,
  drawer: AntdDrawer,
  modal: AntdModal,
  popconfirm: AntdPopconfirm,
  progress: AntdProgress,
  result: AntdResult,
  skeleton: AntdSkeleton,
  spin: AntdSpin,
  watermark: AntdWatermark,
  // 导航
  anchor: AntdAnchor,
  breadcrumb: AntdBreadcrumb,
  dropdown: AntdDropdown,
  menu: AntdMenu,
  pagination: AntdPagination,
  steps: AntdSteps,
  // 布局（补充）
  layout: AntdLayout,
  sider: AntdSider,
  space: AntdSpace,
  splitter: AntdSplitter,
  // 通用（补充）
  floatbutton: AntdFloatButton,
  affix: AntdAffix,
};
