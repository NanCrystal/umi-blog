import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Table,
  Modal,
  message,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Switch,
  Tag,
  Space,
  Popover,
  Badge,
  Image,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FilterOutlined,
  PlayCircleOutlined,
  PictureOutlined,
  ClearOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import styles from './index.less';
import moment from 'moment';

import {
  getBannerList,
  createBanner,
  updateBanner,
  deleteBanner,
  batchDeleteBanner,
  updateBannerStatus,
  updateBannerSortOrder,
  BannerItem,
} from '@/services/banner';
import { uploadImageFull } from '@/services/upload';
import { formatDateTime } from '@/utils/utils';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

type BannerStatus = 'active' | 'inactive';
type TerminalType = 'all' | 'mobile' | 'pc' | 'app';
type PositionType = 'home' | 'profile' | 'article' | 'other';

const STATUS_MAP: Record<
  BannerStatus,
  { label: string; color: string; className: string }
> = {
  active: {
    label: '启用',
    color: '#65dca8',
    className: styles['status-active'],
  },
  inactive: {
    label: '禁用',
    color: '#ff8f8f',
    className: styles['status-inactive'],
  },
};

const TERMINAL_MAP: Record<TerminalType, string> = {
  all: '全部',
  mobile: '移动端',
  pc: 'PC端',
  app: 'APP',
};

const POSITION_MAP: Record<PositionType, string> = {
  home: '首页',
  profile: '个人页',
  article: '文章页',
  other: '其他',
};

const SwiperMgtPage: React.FC = () => {
  const [list, setList] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  // 筛选器
  const [filterStatus, setFilterStatus] = useState<BannerStatus | ''>('');
  const [filterTerminal, setFilterTerminal] = useState<TerminalType | ''>('');
  const [filterPosition, setFilterPosition] = useState<PositionType | ''>('');
  const [filterVisible, setFilterVisible] = useState(false);

  // 弹窗
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingItem, setEditingItem] = useState<BannerItem | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();
  const [imageUrl, setImageUrl] = useState<string>('');

  // 加载列表
  const fetchList = (
    page = pagination.current,
    pageSize = pagination.pageSize,
    status?: string,
    terminal?: string,
    position?: string,
  ) => {
    setLoading(true);
    getBannerList({ page, pageSize, status, terminal, position })
      .then((res: any) => {
        setList(res?.list || []);
        setTotal(res?.total || 0);
        setPagination({ current: page, pageSize });
      })
      .catch(() => message.error('获取 Banner 列表失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, []);

  const hasFilter = filterStatus || filterTerminal || filterPosition;

  // 应用筛选
  const applyFilter = () => {
    fetchList(
      1,
      pagination.pageSize,
      filterStatus || undefined,
      filterTerminal || undefined,
      filterPosition || undefined,
    );
  };

  const clearFilters = () => {
    setFilterStatus('');
    setFilterTerminal('');
    setFilterPosition('');
    fetchList(1, pagination.pageSize);
  };

  const handleAdd = () => {
    setModalMode('add');
    setEditingItem(null);
    setImageUrl('');
    form.resetFields();
    form.setFieldsValue({
      mediaType: 'image',
      position: 'home',
      terminal: 'all',
      status: 'active',
      sortOrder: 0,
    });
    setModalVisible(true);
  };

  const handleEdit = (item: BannerItem) => {
    setModalMode('edit');
    setEditingItem(item);
    setImageUrl(item.imageUrl);
    form.setFieldsValue({
      title: item.title,
      imageUrl: item.imageUrl,
      mediaType: item.mediaType,
      linkUrl: item.linkUrl,
      position: item.position,
      terminal: item.terminal,
      status: item.status,
      sortOrder: item.sortOrder,
      startTime: item.startTime ? moment(item.startTime) : null,
      endTime: item.endTime ? moment(item.endTime) : null,
    });
    setModalVisible(true);
  };

  const handleDelete = (item: BannerItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除 Banner「${
        item.title || '无标题'
      }」吗？删除后无法恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteBanner(item.id);
          message.success('删除成功');
          fetchList(pagination.current, pagination.pageSize);
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleStatusToggle = async (item: BannerItem) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      await updateBannerStatus(item.id, newStatus);
      message.success(`已${newStatus === 'active' ? '启用' : '禁用'}该 Banner`);
      fetchList(pagination.current, pagination.pageSize);
    } catch {
      message.error('状态更新失败');
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      const res = await uploadImageFull(file);
      setImageUrl(res.url);
      form.setFieldsValue({ imageUrl: res.url });
      message.success('图片上传成功');
    } catch {
      message.error('图片上传失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);

      const payload = {
        title: values.title || '',
        imageUrl: values.imageUrl,
        mediaType: values.mediaType,
        linkUrl: values.linkUrl || '',
        position: values.position,
        terminal: values.terminal,
        status: values.status,
        sortOrder: values.sortOrder || 0,
        startTime: values.startTime
          ? values.startTime.format('YYYY-MM-DD HH:mm:ss')
          : undefined,
        endTime: values.endTime
          ? values.endTime.format('YYYY-MM-DD HH:mm:ss')
          : undefined,
      };

      if (modalMode === 'edit' && editingItem) {
        await updateBanner(editingItem.id, payload);
        message.success('编辑成功');
      } else {
        await createBanner(payload);
        message.success('新增成功');
      }
      setModalVisible(false);
      form.resetFields();
      setImageUrl('');
      fetchList(pagination.current, pagination.pageSize);
    } catch {
      // 校验失败或接口错误
    } finally {
      setSubmitLoading(false);
    }
  };

  // 排序处理
  const handleSortChange = async (id: number, direction: 'up' | 'down') => {
    const currentIndex = list.findIndex((item) => item.id === id);
    if (currentIndex === -1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= list.length) return;

    const currentSort = list[currentIndex].sortOrder;
    const swapSort = list[swapIndex].sortOrder;

    try {
      // 批量更新排序
      await updateBannerSortOrder([
        { id: list[currentIndex].id, sortOrder: swapSort },
        { id: list[swapIndex].id, sortOrder: currentSort },
      ]);
      message.success('排序更新成功');
      fetchList(pagination.current, pagination.pageSize);
    } catch {
      message.error('排序更新失败');
    }
  };

  const columns = useMemo<ColumnsType<BannerItem>>(
    () => [
      {
        title: '预览',
        dataIndex: 'imageUrl',
        key: 'preview',
        width: 100,
        render: (value: string, item) =>
          item.mediaType === 'video' ? (
            <div className={styles['video-preview']}>
              <PlayCircleOutlined style={{ fontSize: 24 }} />
              <span style={{ fontSize: 12, marginTop: 4 }}>视频</span>
            </div>
          ) : (
            <Image
              src={value}
              width={80}
              height={50}
              style={{ borderRadius: 6, objectFit: 'cover' }}
              fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjEyIj7mlq/lkKc8L3RleHQ+PC9zdmc+"
            />
          ),
      },
      {
        title: '标题',
        dataIndex: 'title',
        key: 'title',
        ellipsis: true,
        render: (value: string) => (
          <span className={styles['table-title']}>{value || '无标题'}</span>
        ),
      },
      {
        title: '位置',
        dataIndex: 'position',
        key: 'position',
        width: 90,
        render: (value: PositionType) => (
          <Tag className={styles['position-tag']}>{POSITION_MAP[value]}</Tag>
        ),
      },
      {
        title: '终端',
        dataIndex: 'terminal',
        key: 'terminal',
        width: 90,
        render: (value: TerminalType) => (
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
            {TERMINAL_MAP[value]}
          </span>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 90,
        render: (value: BannerStatus) => {
          const cfg = STATUS_MAP[value];
          return (
            <span className={`${styles['status-tag']} ${cfg.className}`}>
              {cfg.label}
            </span>
          );
        },
      },
      {
        title: '排序',
        dataIndex: 'sortOrder',
        key: 'sortOrder',
        width: 80,
        align: 'center',
        render: (_: number, record, index) => (
          <Space size={2}>
            <Tooltip title="上移">
              <Button
                type="text"
                size="small"
                icon={<ArrowUpOutlined />}
                disabled={index === 0}
                onClick={() => handleSortChange(record.id, 'up')}
                className={styles['sort-btn']}
              />
            </Tooltip>
            <span
              style={{
                color: 'rgba(255,255,255,0.65)',
                minWidth: 20,
                textAlign: 'center',
              }}
            >
              {_}
            </span>
            <Tooltip title="下移">
              <Button
                type="text"
                size="small"
                icon={<ArrowDownOutlined />}
                disabled={index === list.length - 1}
                onClick={() => handleSortChange(record.id, 'down')}
                className={styles['sort-btn']}
              />
            </Tooltip>
          </Space>
        ),
      },
      {
        title: '点击量',
        dataIndex: 'clickCount',
        key: 'clickCount',
        width: 80,
        align: 'center',
        render: (value: number) => (
          <span className={styles['click-count']}>
            <EyeOutlined style={{ marginRight: 4, fontSize: 12 }} />
            {value}
          </span>
        ),
      },
      {
        title: '展示时间',
        key: 'timeRange',
        width: 160,
        render: (_: unknown, item) => (
          <Space direction="vertical" size={2} style={{ lineHeight: 1.5 }}>
            {item.startTime && (
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                上架：{formatDateTime(item.startTime)}
              </span>
            )}
            {item.endTime && (
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                下架：{formatDateTime(item.endTime)}
              </span>
            )}
            {!item.startTime && !item.endTime && (
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                永久
              </span>
            )}
          </Space>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 200,
        render: (_: unknown, item) => (
          <div className={styles['table-actions']}>
            <Switch
              size="small"
              checked={item.status === 'active'}
              onChange={() => handleStatusToggle(item)}
              checkedChildren="启"
              unCheckedChildren="停"
              className={styles['status-switch']}
            />
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(item)}
            >
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(item)}
            >
              删除
            </Button>
          </div>
        ),
      },
    ],
    [list],
  );

  const filterContent = (
    <div className={styles['filter-popover']}>
      <div className={styles['filter-row']}>
        <span className={styles['filter-label']}>状态</span>
        <Select
          placeholder="选择状态"
          allowClear
          value={filterStatus || undefined}
          onChange={(v) => setFilterStatus((v || '') as BannerStatus | '')}
          style={{ width: 140 }}
          popupClassName={styles['dark-select-dropdown']}
        >
          {Object.entries(STATUS_MAP).map(([key, cfg]) => (
            <Option key={key} value={key}>
              <Badge color={cfg.color} text={cfg.label} />
            </Option>
          ))}
        </Select>
      </div>
      <div className={styles['filter-row']}>
        <span className={styles['filter-label']}>终端</span>
        <Select
          placeholder="选择终端"
          allowClear
          value={filterTerminal || undefined}
          onChange={(v) => setFilterTerminal((v || '') as TerminalType | '')}
          style={{ width: 140 }}
          popupClassName={styles['dark-select-dropdown']}
        >
          {Object.entries(TERMINAL_MAP).map(([key, label]) => (
            <Option key={key} value={key}>
              {label}
            </Option>
          ))}
        </Select>
      </div>
      <div className={styles['filter-row']}>
        <span className={styles['filter-label']}>位置</span>
        <Select
          placeholder="选择位置"
          allowClear
          value={filterPosition || undefined}
          onChange={(v) => setFilterPosition((v || '') as PositionType | '')}
          style={{ width: 140 }}
          popupClassName={styles['dark-select-dropdown']}
        >
          {Object.entries(POSITION_MAP).map(([key, label]) => (
            <Option key={key} value={key}>
              {label}
            </Option>
          ))}
        </Select>
      </div>
      <div className={styles['filter-actions']}>
        <Button size="small" onClick={clearFilters} icon={<ClearOutlined />}>
          清空
        </Button>
        <Button
          size="small"
          type="primary"
          onClick={() => {
            applyFilter();
            setFilterVisible(false);
          }}
        >
          确定
        </Button>
      </div>
    </div>
  );

  return (
    <div className={styles['swiper-mgt-page']}>
      {/* 页面头部 */}
      <div className={styles['mgt-page-header']}>
        <div>
          <div className={styles['mgt-page-title']}>Banner 管理</div>
          <div className={styles['mgt-page-desc']}>
            管理首页轮播图和广告位，支持分页、筛选、排序和状态管理
          </div>
        </div>
        <div className={styles['mgt-page-actions']}>
          <Popover
            content={filterContent}
            title="筛选条件"
            trigger="click"
            open={filterVisible}
            onOpenChange={setFilterVisible}
            placement="bottomRight"
            overlayClassName={styles['filter-popover-overlay']}
          >
            <Button
              icon={<FilterOutlined />}
              className={
                hasFilter ? styles['filter-btn-active'] : styles['filter-btn']
              }
            >
              筛选{hasFilter ? '·已启用' : ''}
            </Button>
          </Popover>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            className={styles['add-btn']}
          >
            新增 Banner
          </Button>
        </div>
      </div>

      {/* 表格区域 */}
      <div
        className={`${styles['table-panel']} ${styles['table-panel-with-actions']}`}
      >
        <Table<BannerItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={list}
          title={() => (
            <div className={styles['table-header-title']}>
              <PictureOutlined style={{ marginRight: 8 }} />
              Banner 列表
              {hasFilter && (
                <Tag
                  className={styles['filter-tag']}
                  closable
                  onClose={clearFilters}
                >
                  已筛选
                </Tag>
              )}
            </div>
          )}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: false,
            onChange: (page, pageSize) =>
              fetchList(
                page,
                pageSize,
                filterStatus || undefined,
                filterTerminal || undefined,
                filterPosition || undefined,
              ),
          }}
          locale={{
            emptyText: (
              <div className={styles['table-empty']}>
                <PictureOutlined
                  style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}
                />
                <div>暂无 Banner 数据</div>
              </div>
            ),
          }}
        />
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={modalMode === 'add' ? '新增 Banner' : '编辑 Banner'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setImageUrl('');
        }}
        confirmLoading={submitLoading}
        width={640}
        destroyOnClose
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" className={styles['banner-form']}>
          <Form.Item name="title" label="标题" extra="可选，用于后台标识">
            <Input
              placeholder="请输入 Banner 标题（可选）"
              maxLength={100}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="imageUrl"
            label="图片/视频地址"
            rules={[{ required: true, message: '请上传图片或填写地址' }]}
          >
            <Input placeholder="请上传图片或填写 URL 地址" />
          </Form.Item>

          <Form.Item label="上传图片">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
                e.target.value = '';
              }}
              className={styles['file-input']}
            />
            {imageUrl && (
              <div className={styles['preview-container']}>
                <Image
                  src={imageUrl}
                  width={200}
                  height={120}
                  style={{ borderRadius: 8, objectFit: 'cover' }}
                />
              </div>
            )}
          </Form.Item>

          <Form.Item
            name="mediaType"
            label="媒体类型"
            rules={[{ required: true }]}
          >
            <Select placeholder="选择媒体类型">
              <Option value="image">图片</Option>
              <Option value="video">视频</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="linkUrl"
            label="跳转链接"
            extra="点击 Banner 后跳转的地址"
          >
            <Input placeholder="请输入跳转链接（可选）" maxLength={500} />
          </Form.Item>

          <div className={styles['form-row']}>
            <Form.Item
              name="position"
              label="位置"
              className={styles['form-item-half']}
              rules={[{ required: true }]}
            >
              <Select placeholder="选择位置">
                {Object.entries(POSITION_MAP).map(([key, label]) => (
                  <Option key={key} value={key}>
                    {label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="terminal"
              label="终端"
              className={styles['form-item-half']}
              rules={[{ required: true }]}
            >
              <Select placeholder="选择终端">
                {Object.entries(TERMINAL_MAP).map(([key, label]) => (
                  <Option key={key} value={key}>
                    {label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className={styles['form-row']}>
            <Form.Item
              name="status"
              label="状态"
              className={styles['form-item-half']}
              rules={[{ required: true }]}
            >
              <Select placeholder="选择状态">
                {Object.entries(STATUS_MAP).map(([key, cfg]) => (
                  <Option key={key} value={key}>
                    <Badge color={cfg.color} text={cfg.label} />
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="sortOrder"
              label="排序权重"
              className={styles['form-item-half']}
              extra="数值越小越靠前"
            >
              <InputNumber min={0} max={9999} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item
            label="展示时间"
            extra="可设置上下架时间，留空表示永久展示"
          >
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder={['上架时间', '下架时间']}
              popupClassName={styles['dark-picker-dropdown']}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SwiperMgtPage;
