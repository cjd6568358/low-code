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
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;
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

// ==================== 组件映射表 ====================

export const antdComponents: Record<string, React.ComponentType<any>> = {
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
  grid: AntdFlex, // grid 使用 flex 实现
  divider: AntdDivider,
  tabs: AntdTabs,
  text: AntdText,
};
