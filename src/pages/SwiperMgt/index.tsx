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
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  FilterOutlined,
  PlayCircleOutlined,
  PictureOutlined,
  ClearOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CloseOutlined,
  InboxOutlined,
  EyeOutlined,
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
import { uploadVideoFile } from '@/services/video';
import { getArtistList } from '@/services/artist';
import { formatDateTime, getImageUrl, formatFileSize } from '@/utils/utils';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;
const { Dragger } = Upload;

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

const SwiperMgtPage: React.FC = () => {
  const [list, setList] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  // 筛选器
  const [filterStatus, setFilterStatus] = useState<BannerStatus | ''>('');
  const [filterVisible, setFilterVisible] = useState(false);

  // 弹窗
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingItem, setEditingItem] = useState<BannerItem | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // 详情弹窗
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailItem, setDetailItem] = useState<BannerItem | null>(null);

  // 视频预览弹窗
  const [videoPreviewVisible, setVideoPreviewVisible] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');

  const [form] = Form.useForm();
  const [currentMediaType, setCurrentMediaType] = useState<string>('image');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [artists, setArtists] = useState<
    { id: number; name: string; artistId: string }[]
  >([]);

  // 视频上传状态
  const [videoFileList, setVideoFileList] = useState<UploadFile[]>([]);
  const [videoUploaded, setVideoUploaded] = useState(false);
  const [videoFileSize, setVideoFileSize] = useState(0);

  // 加载列表
  const fetchList = (
    page = pagination.current,
    pageSize = pagination.pageSize,
    status?: string,
  ) => {
    setLoading(true);
    getBannerList({ page, pageSize, status })
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
    getArtistList()
      .then((res: any) => {
        setArtists(res || []);
      })
      .catch(() => {});
  }, []);

  const hasFilter = !!filterStatus;

  // 应用筛选
  const applyFilter = () => {
    fetchList(1, pagination.pageSize, filterStatus || undefined);
  };

  const clearFilters = () => {
    setFilterStatus('');
    fetchList(1, pagination.pageSize);
  };

  const handleAdd = () => {
    setModalMode('add');
    setEditingItem(null);
    setCurrentMediaType('image');
    setImageUrls([]);
    setVideoUrl('');
    // 重置视频状态
    setVideoFileList([]);
    setVideoUploaded(false);
    setVideoFileSize(0);
    form.resetFields();
    form.setFieldsValue({
      mediaType: 'image',
      status: 'active',
      sortOrder: 0,
    });
    setModalVisible(true);
  };

  const handleEdit = (item: BannerItem) => {
    setModalMode('edit');
    setEditingItem(item);
    setCurrentMediaType(item.mediaType);
    // 重置视频状态
    setVideoFileList([]);
    setVideoFileSize(0);

    const urls = Array.isArray(item.imageUrl) ? item.imageUrl : [];
    if (item.mediaType === 'image') {
      setImageUrls(urls);
      setVideoUrl('');
      setVideoUploaded(false);
    } else {
      setImageUrls([]);
      const videoUrlValue = urls[0] || '';
      setVideoUrl(videoUrlValue);
      setVideoUploaded(!!videoUrlValue);
      // 如果有视频URL，设置文件列表用于回显
      if (videoUrlValue) {
        setVideoFileList([
          {
            uid: '-1',
            name: videoUrlValue.split('/').pop() || 'video',
            status: 'done',
            url: videoUrlValue,
          },
        ]);
      }
    }
    form.setFieldsValue({
      title: item.title,
      mediaType: item.mediaType,
      artistId: item.artistId,
      linkUrl: item.linkUrl,
      status: item.status,
      sortOrder: item.sortOrder,
      timeRange:
        item.startTime && item.endTime
          ? [moment(item.startTime), moment(item.endTime)]
          : undefined,
    });
    setModalVisible(true);
  };

  const handleViewDetail = (item: BannerItem) => {
    setDetailItem(item);
    setDetailModalVisible(true);
  };

  // 打开视频预览弹窗
  const handleVideoPreview = (url: string) => {
    setVideoPreviewUrl(url);
    setVideoPreviewVisible(true);
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

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const uploadPromises = Array.from(files).map((file) =>
        uploadImageFull(file),
      );
      const results = await Promise.all(uploadPromises);
      const urls = results.map((res) => res.url);
      setImageUrls((prev) => [...prev, ...urls]);
      message.success(`成功上传 ${urls.length} 张图片`);
      // 上传图片时清空视频
      setVideoUrl('');
      setVideoUploaded(false);
      setVideoFileList([]);
      setVideoFileSize(0);
    } catch {
      message.error('图片上传失败');
    }
  };

  // ─── 视频上传处理（使用正确的视频上传接口）───
  const handleVideoCustomRequest = async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
      const res = await uploadVideoFile(file as File);
      if (!res?.url) {
        onError(new Error('上传失败'));
        return;
      }
      setVideoUploaded(true);
      setVideoUrl(res.url);
      setVideoFileSize((file as File).size);
      // 上传视频时清空图片
      setImageUrls([]);
      onSuccess({ url: res.url }, file);
    } catch {
      message.error('视频上传失败');
      onError(new Error('上传失败'));
    }
  };

  const handleVideoFileChange = (info: {
    file: UploadFile;
    fileList: UploadFile[];
  }) => {
    setVideoFileList([...info.fileList]);
    if (info.file.status === 'removed') {
      handleRemoveVideo();
    }
  };

  const handleRemoveVideo = () => {
    setVideoFileList([]);
    setVideoUploaded(false);
    setVideoUrl('');
    setVideoFileSize(0);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);

      if (values.mediaType === 'image' && imageUrls.length === 0) {
        message.error('请至少上传一张图片');
        setSubmitLoading(false);
        return;
      }
      if (values.mediaType === 'video' && !videoUrl) {
        message.error('请上传视频');
        setSubmitLoading(false);
        return;
      }

      const payload = {
        title: values.title || '',
        imageUrl: values.mediaType === 'image' ? imageUrls : [videoUrl],
        mediaType: values.mediaType,
        linkUrl: values.linkUrl || '',
        artistId: values.artistId || undefined,
        status: values.status,
        sortOrder: values.sortOrder || 0,
        startTime: values.timeRange?.[0]
          ? values.timeRange[0].format('YYYY-MM-DD HH:mm:ss')
          : undefined,
        endTime: values.timeRange?.[1]
          ? values.timeRange[1].format('YYYY-MM-DD HH:mm:ss')
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
      setImageUrls([]);
      setVideoUrl('');
      // 重置视频状态
      setVideoFileList([]);
      setVideoUploaded(false);
      setVideoFileSize(0);
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
      // {
      //   title: '预览',
      //   dataIndex: 'imageUrl',
      //   key: 'preview',
      //   render: (value: string[] | string, item) =>
      //     item.mediaType === 'video' ? (
      //       <div className={styles['video-preview']}>
      //         <PlayCircleOutlined style={{ fontSize: 24 }} />
      //         <span style={{ fontSize: 12, marginTop: 4 }}>视频</span>
      //       </div>
      //     ) : (
      //       <Image
      //         src={getImageUrl(
      //           Array.isArray(value) ? value[0] : value?.split(',')[0],
      //         )}
      //         width={80}
      //         height={50}
      //         style={{ borderRadius: 6, objectFit: 'cover' }}
      //       />
      //     ),
      // },
      {
        title: '序号',
        key: 'index',
        width: 80,
        render: (_, __, index) =>
          (pagination.current - 1) * pagination.pageSize + index + 1,
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
        title: '艺人',
        dataIndex: 'artistId',
        key: 'artistId',
        render: (value: string) => {
          const artist = artists.find((a) => a.artistId === value);
          return (
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
              {artist?.name || value || '-'}
            </span>
          );
        },
      },
      {
        title: '媒体类型',
        dataIndex: 'mediaType',
        key: 'mediaType',
        render: (value: string) => (
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
            {value === 'video' ? '视频' : '图片'}
          </span>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
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
        title: '开始时间',
        dataIndex: 'startTime',
        key: 'startTime',
        render: (value: string) =>
          value ? (
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
              {formatDateTime(value)}
            </span>
          ) : (
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
              永久
            </span>
          ),
      },
      {
        title: '结束时间',
        dataIndex: 'endTime',
        key: 'endTime',
        render: (value: string) =>
          value ? (
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
              {formatDateTime(value)}
            </span>
          ) : (
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
              永久
            </span>
          ),
      },
      {
        title: '操作',
        width: 350,
        key: 'action',
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
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(item)}
            >
              查看
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
    [list, artists],
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
          className={styles['filter-select']}
        >
          {Object.entries(STATUS_MAP).map(([key]) => (
            <Option key={key} value={key}>
              <span
                className={
                  key === 'active'
                    ? styles['option-active']
                    : styles['option-inactive']
                }
              >
                {key === 'active' ? '启用' : '禁用'}
              </span>
            </Option>
          ))}
        </Select>
      </div>

      <div className={styles['filter-actions']}>
        <Button
          size="small"
          onClick={clearFilters}
          icon={<ClearOutlined />}
          className={styles['filter-action-btn-clear']}
        >
          清空
        </Button>
        <Button
          size="small"
          type="primary"
          onClick={() => {
            applyFilter();
            setFilterVisible(false);
          }}
          className={styles['filter-action-btn-apply']}
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
              fetchList(page, pageSize, filterStatus || undefined),
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
          setImageUrls([]);
          setVideoUrl('');
          // 重置视频状态
          setVideoFileList([]);
          setVideoUploaded(false);
          setVideoFileSize(0);
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
            name="artistId"
            label="艺人"
            rules={[{ required: true, message: '请选择艺人' }]}
          >
            <Select placeholder="请选择艺人" allowClear>
              {artists.map((a) => (
                <Option key={a.artistId} value={a.artistId}>
                  {a.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="mediaType"
            label="媒体类型"
            rules={[{ required: true, message: '请选择媒体类型' }]}
          >
            <Select
              placeholder="选择媒体类型"
              onChange={(v) => {
                setCurrentMediaType(v as string);
                // 切换媒体类型时，清空对方的内容
                if (v === 'image') {
                  setVideoUrl('');
                  setVideoUploaded(false);
                  setVideoFileList([]);
                  setVideoFileSize(0);
                } else {
                  setImageUrls([]);
                }
              }}
            >
              <Option value="image">图片</Option>
              <Option value="video">视频</Option>
            </Select>
          </Form.Item>

          {currentMediaType === 'image' && (
            <Form.Item label="上传图片" required>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  handleImageUpload(e.target.files);
                  e.target.value = '';
                }}
                className={styles['file-input']}
              />
              {imageUrls.length > 0 && (
                <div className={styles['preview-container']}>
                  {imageUrls.map((url, index) => (
                    <div
                      key={url + index}
                      draggable
                      onDragStart={() => setDragIndex(index)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragIndex === null || dragIndex === index) return;
                        setImageUrls((prev) => {
                          const newUrls = [...prev];
                          const [dragged] = newUrls.splice(dragIndex, 1);
                          newUrls.splice(index, 0, dragged);
                          return newUrls;
                        });
                        setDragIndex(index);
                      }}
                      onDragEnd={() => setDragIndex(null)}
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                        marginRight: 8,
                        marginBottom: 8,
                        cursor: 'move',
                        opacity: dragIndex === index ? 0.5 : 1,
                      }}
                    >
                      <Image
                        src={getImageUrl(url)}
                        width={100}
                        height={60}
                        style={{ borderRadius: 4, objectFit: 'cover' }}
                      />
                      <CloseOutlined
                        onClick={() => {
                          setImageUrls((prev) =>
                            prev.filter((_, i) => i !== index),
                          );
                        }}
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          color: '#fff',
                          background: '#ff4d4f',
                          borderRadius: '50%',
                          fontSize: 10,
                          padding: 2,
                          cursor: 'pointer',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Form.Item>
          )}

          {currentMediaType === 'video' && (
            <Form.Item
              label="上传视频"
              required
              className={styles['upload-item']}
            >
              {videoUploaded && videoUrl ? (
                // 视频预览卡片（参考 Add.tsx 样式）
                <div className={styles['video-preview-card']}>
                  <div className={styles['video-preview-thumb']}>
                    <img
                      src={`${getImageUrl(videoUrl)}?vframe/jpg/offset/0`}
                      alt="视频封面"
                    />
                    <PlayCircleOutlined
                      className={styles['video-preview-icon']}
                    />
                  </div>
                  <div className={styles['video-preview-info']}>
                    <span className={styles['video-preview-name']}>
                      {videoUrl.split('/').pop() || '未命名视频'}
                    </span>
                    <span className={styles['video-preview-meta']}>
                      {videoUrl.split('.').pop()?.toUpperCase() || 'MP4'} ·{' '}
                      {videoFileSize > 0
                        ? formatFileSize(videoFileSize)
                        : '已上传'}
                    </span>
                  </div>
                  <CloseOutlined
                    className={styles['video-preview-remove']}
                    onClick={handleRemoveVideo}
                  />
                </div>
              ) : (
                // 拖拽上传区域（参考 Add.tsx 样式）
                <Dragger
                  accept=".mp4,.mov,.avi,.mkv,.webm"
                  fileList={videoFileList}
                  customRequest={handleVideoCustomRequest}
                  onChange={handleVideoFileChange}
                  maxCount={1}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽视频到此区域上传</p>
                  <p className={styles['upload-hint']}>
                    支持 mp4、mov、avi、mkv、webm 格式，500M 以内
                  </p>
                </Dragger>
              )}
            </Form.Item>
          )}

          <Form.Item
            name="linkUrl"
            label="跳转链接"
            extra="点击 Banner 后跳转的地址"
          >
            <Input placeholder="请输入跳转链接（可选）" maxLength={500} />
          </Form.Item>

          <div className={styles['form-row']}>
            <Form.Item
              name="status"
              label="状态"
              className={styles['form-item-half']}
              rules={[{ required: true }]}
            >
              <Select
                placeholder="选择状态"
                popupClassName={styles['dark-select-dropdown']}
              >
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
            name="timeRange"
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

      {/* 详情查看弹窗 */}
      <Modal
        title="Banner 详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setDetailItem(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDetailModalVisible(false);
              setDetailItem(null);
            }}
          >
            关闭
          </Button>,
        ]}
        width={640}
        destroyOnClose
      >
        {detailItem && (
          <div className={styles['detail-content']}>
            {/* 基本信息区域 */}
            <div className={styles['detail-section']}>
              <div className={styles['detail-section-title']}>基本信息</div>
              <div className={styles['detail-grid']}>
                <div className={styles['detail-item']}>
                  <span className={styles['detail-label']}>标题</span>
                  <span className={styles['detail-value']}>
                    {detailItem.title || '无标题'}
                  </span>
                </div>
                <div className={styles['detail-item']}>
                  <span className={styles['detail-label']}>媒体类型</span>
                  <Tag
                    color={detailItem.mediaType === 'video' ? 'blue' : 'green'}
                  >
                    {detailItem.mediaType === 'video' ? '视频' : '图片'}
                  </Tag>
                </div>
                <div className={styles['detail-item']}>
                  <span className={styles['detail-label']}>状态</span>
                  <span
                    className={`${styles['status-tag']} ${
                      STATUS_MAP[detailItem.status]?.className
                    }`}
                  >
                    {STATUS_MAP[detailItem.status]?.label || detailItem.status}
                  </span>
                </div>
                <div className={styles['detail-item']}>
                  <span className={styles['detail-label']}>排序权重</span>
                  <span className={styles['detail-value']}>
                    {detailItem.sortOrder}
                  </span>
                </div>
              </div>
            </div>

            {/* 艺人信息 */}
            <div className={styles['detail-section']}>
              <div className={styles['detail-section-title']}>艺人信息</div>
              <div className={styles['detail-grid']}>
                <div className={styles['detail-item']}>
                  <span className={styles['detail-label']}>艺人名称</span>
                  <span className={styles['detail-value']}>
                    {(() => {
                      const artist = artists.find(
                        (a) => a.artistId === detailItem.artistId,
                      );
                      return artist?.name || detailItem.artistId || '-';
                    })()}
                  </span>
                </div>
                <div className={styles['detail-item']}>
                  <span className={styles['detail-label']}>跳转链接</span>
                  <span
                    className={styles['detail-value']}
                    style={{ wordBreak: 'break-all' }}
                  >
                    {detailItem.linkUrl || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* 媒体预览区域 */}
            <div className={styles['detail-section']}>
              <div className={styles['detail-section-title']}>媒体内容</div>
              <div className={styles['detail-media']}>
                {detailItem.mediaType === 'video' ? (
                  // 视频预览（可点击播放）
                  <div
                    className={styles['detail-video-wrapper']}
                    onClick={() =>
                      handleVideoPreview(detailItem.imageUrl?.[0] || '')
                    }
                  >
                    <div className={styles['detail-video-preview']}>
                      <img
                        src={`${getImageUrl(
                          detailItem.imageUrl?.[0] || '',
                        )}?vframe/jpg/offset/0`}
                        alt="视频封面"
                        className={styles['detail-video-thumb']}
                      />
                      <PlayCircleOutlined
                        className={styles['detail-video-icon']}
                      />
                    </div>
                    <div className={styles['detail-video-info']}>
                      <div className={styles['detail-video-name']}>
                        {detailItem.imageUrl?.[0]?.split('/').pop() ||
                          '未命名视频'}
                      </div>
                      <div className={styles['detail-video-meta']}>
                        点击预览播放
                      </div>
                    </div>
                  </div>
                ) : (
                  // 图片预览
                  <div className={styles['detail-images-wrapper']}>
                    {(detailItem.imageUrl || []).map(
                      (url: string, index: number) => (
                        <Image
                          key={`preview-${index}`}
                          src={getImageUrl(url)}
                          width={140}
                          height={90}
                          style={{ borderRadius: 4, objectFit: 'cover' }}
                          fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQwIiBoZWlnaHQ9IjkwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiIgZm9udC1zaXplPSIxMiI+5pqp5Lm65omLPC90ZXh0Pjwvc3ZnPg=="
                        />
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 时间信息 */}
            <div className={styles['detail-section']}>
              <div className={styles['detail-section-title']}>时间设置</div>
              <div className={styles['detail-grid']}>
                <div className={styles['detail-item']}>
                  <span className={styles['detail-label']}>上架时间</span>
                  <span className={styles['detail-value']}>
                    {detailItem.startTime
                      ? formatDateTime(detailItem.startTime)
                      : '永久有效'}
                  </span>
                </div>
                <div className={styles['detail-item']}>
                  <span className={styles['detail-label']}>下架时间</span>
                  <span className={styles['detail-value']}>
                    {detailItem.endTime
                      ? formatDateTime(detailItem.endTime)
                      : '永久有效'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 视频预览播放弹窗 */}
      <Modal
        title="视频预览"
        open={videoPreviewVisible}
        onCancel={() => {
          setVideoPreviewVisible(false);
          setVideoPreviewUrl('');
        }}
        footer={null}
        width={800}
        destroyOnClose
        centered
      >
        <div className={styles['video-player-wrapper']}>
          <video
            src={getImageUrl(videoPreviewUrl)}
            controls
            autoPlay
            style={{
              width: '100%',
              maxHeight: 500,
              backgroundColor: '#000',
              borderRadius: 4,
            }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default SwiperMgtPage;
