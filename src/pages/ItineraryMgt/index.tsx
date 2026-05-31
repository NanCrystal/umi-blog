import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Table,
  Modal,
  message,
  Form,
  Input,
  DatePicker,
  Select,
  Tag,
  Space,
  Popover,
  Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FilterOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import styles from './index.less';
import moment from 'moment';

import {
  getItineraryList,
  createItinerary,
  updateItinerary,
  deleteItinerary,
  batchDeleteItinerary,
  ItineraryItem,
  getCurrentUser,
} from '@/services/itinerary';
import { getArtistList } from '@/services/artist';
import { formatDateTime } from '@/utils/utils';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Option } = Select;

type ItineraryStatus = 'pending' | 'ongoing' | 'completed' | 'cancelled';

const STATUS_MAP: Record<
  ItineraryStatus,
  { label: string; color: string; className: string }
> = {
  pending: {
    label: '未开始',
    color: '#ffd76a',
    className: styles['status-pending'],
  },
  ongoing: {
    label: '进行中',
    color: '#7fd4ff',
    className: styles['status-ongoing'],
  },
  completed: {
    label: '已完成',
    color: '#65dca8',
    className: styles['status-completed'],
  },
  cancelled: {
    label: '已取消',
    color: '#ff8f8f',
    className: styles['status-cancelled'],
  },
};

/** 角色名称映射 */
const USER_LABEL_MAP: Record<string, string> = {
  yunyi: '云熠',
  haoyiran: '郝熠然',
  yunqi: '云旗',
};

const ItineraryMgt: React.FC = () => {
  const currentUser = getCurrentUser();
  const currentLabel = USER_LABEL_MAP[currentUser] || currentUser;

  const [list, setList] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [artists, setArtists] = useState<
    { id: number; name: string; artistId: string }[]
  >([]);

  // 筛选器（仅日期范围 + 状态，艺人固定为当前用户）
  const [filterDateRange, setFilterDateRange] = useState<
    [moment.Moment | null, moment.Moment | null] | null
  >(null);
  const [filterStatus, setFilterStatus] = useState<ItineraryStatus | ''>('');
  const [filterVisible, setFilterVisible] = useState(false);

  // 弹窗
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  // 详情弹窗
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailItem, setDetailItem] = useState<ItineraryItem | null>(null);

  // 加载列表
  const fetchList = (
    page = pagination.current,
    pageSize = pagination.pageSize,
    status?: string,
    startDate?: string,
    endDate?: string,
  ) => {
    setLoading(true);
    getItineraryList({ page, pageSize, status, startDate, endDate })
      .then((res: any) => {
        setList(res?.list || []);
        setTotal(res?.total || 0);
        setPagination({ current: page, pageSize });
      })
      .catch(() => message.error('获取日程列表失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
    getArtistList()
      .then((res: any) => setArtists(res || []))
      .catch(() => message.error('获取艺人列表失败'));
  }, []);

  const hasFilter =
    filterStatus || (filterDateRange?.[0] && filterDateRange?.[1]);

  // 应用筛选后重新请求接口
  const applyFilter = () => {
    const status = filterStatus || undefined;
    let startDate: string | undefined;
    let endDate: string | undefined;
    if (filterDateRange?.[0])
      startDate = filterDateRange[0].format('YYYY-MM-DD');
    if (filterDateRange?.[1]) endDate = filterDateRange[1].format('YYYY-MM-DD');
    fetchList(1, pagination.pageSize, status, startDate, endDate);
  };

  const clearFilters = () => {
    setFilterDateRange(null);
    setFilterStatus('');
    fetchList(1, pagination.pageSize);
  };

  const handleAdd = () => {
    setModalMode('add');
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (item: ItineraryItem) => {
    setModalMode('edit');
    setEditingItem(item);
    form.setFieldsValue({
      title: item.title,
      artistId: item.artistId,
      location: item.location,
      timeRange: [moment(item.startTime), moment(item.endTime)],
      status: item.status,
      description: item.description,
    });
    setModalVisible(true);
  };

  const handleDelete = (item: ItineraryItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除日程「${item.title}」吗？删除后无法恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteItinerary(item.id);
          message.success('删除成功');
          fetchList(pagination.current, pagination.pageSize);
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 项日程吗？删除后无法恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await batchDeleteItinerary(selectedRowKeys.map((id) => Number(id)));
          message.success(`成功删除 ${selectedRowKeys.length} 项日程`);
          setSelectedRowKeys([]);
          fetchList(pagination.current, pagination.pageSize);
        } catch {
          message.error('批量删除失败');
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const [start, end] = values.timeRange as [moment.Moment, moment.Moment];
      setSubmitLoading(true);

      const payload = {
        title: values.title,
        artistId: values.artistId,
        location: values.location,
        startTime: start.format('YYYY-MM-DD HH:mm'),
        endTime: end.format('YYYY-MM-DD HH:mm'),
        status: values.status as ItineraryStatus,
        description: values.description || '',
      };

      if (modalMode === 'edit' && editingItem) {
        await updateItinerary(editingItem.id, payload);
        message.success('编辑成功');
      } else {
        await createItinerary(payload);
        message.success('新增成功');
      }
      setModalVisible(false);
      form.resetFields();
      fetchList(pagination.current, pagination.pageSize);
    } catch {
      // 校验失败或接口错误
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleViewDetail = async (item: ItineraryItem) => {
    try {
      const detail = await import('@/services/itinerary').then((m) =>
        m.getItineraryDetail(item.id),
      );
      setDetailItem(detail);
    } catch {
      setDetailItem(item);
    }
    setDetailVisible(true);
  };

  const columns = useMemo<ColumnsType<ItineraryItem>>(
    () => [
      {
        title: '日程标题',
        dataIndex: 'title',
        key: 'title',
        ellipsis: true,
        render: (value: string, item) => (
          <span
            className={styles['table-title']}
            onClick={() => handleViewDetail(item)}
          >
            {value}
          </span>
        ),
      },
      {
        title: '艺人',
        dataIndex: 'artistId',
        key: 'artistId',
        width: 120,
        render: (value: string) => {
          const artist = artists.find((a) => a.artistId === value);
          return (
            <span style={{ color: 'rgba(255,255,255,0.65)' }}>
              {artist?.name || value}
            </span>
          );
        },
      },
      {
        title: '时间',
        dataIndex: 'startTime',
        key: 'time',
        width: 220,
        render: (_: string, item) => (
          <Space direction="vertical" size={2} style={{ lineHeight: 1.5 }}>
            <span style={{ color: 'rgba(255,255,255,0.82)' }}>
              <ClockCircleOutlined
                style={{ marginRight: 4, fontSize: 12, opacity: 0.6 }}
              />
              {formatDateTime(item.startTime)}
            </span>
            <span
              style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: 12,
                paddingLeft: 16,
              }}
            >
              至 {formatDateTime(item.endTime)}
            </span>
          </Space>
        ),
      },
      {
        title: '地点',
        dataIndex: 'location',
        key: 'location',
        width: 200,
        ellipsis: true,
        render: (value: string) => (
          <Space>
            <EnvironmentOutlined
              style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}
            />
            <span style={{ color: 'rgba(255,255,255,0.65)' }}>{value}</span>
          </Space>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 110,
        render: (value: ItineraryStatus) => {
          const cfg = STATUS_MAP[value];
          return (
            <span className={`${styles['status-tag']} ${cfg.className}`}>
              {cfg.label}
            </span>
          );
        },
      },
      {
        title: '操作',
        key: 'action',
        width: 160,
        render: (_: unknown, item) => (
          <div className={styles['table-actions']}>
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
    [artists],
  );

  const rowSelection: TableRowSelection<ItineraryItem> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  const filterContent = (
    <div className={styles['filter-popover']}>
      <div className={styles['filter-row']}>
        <span className={styles['filter-label']}>日期范围</span>
        <RangePicker
          value={filterDateRange}
          onChange={(dates) => setFilterDateRange(dates as any)}
          style={{ width: 280 }}
          placeholder={['开始日期', '结束日期']}
          popupClassName={styles['dark-picker-dropdown']}
        />
      </div>
      <div className={styles['filter-row']}>
        <span className={styles['filter-label']}>状态</span>
        <Select
          placeholder="选择状态"
          allowClear
          value={filterStatus || undefined}
          onChange={(v) => setFilterStatus((v || '') as ItineraryStatus | '')}
          style={{ width: 180 }}
          popupClassName={styles['dark-select-dropdown']}
        >
          {Object.entries(STATUS_MAP).map(([key, cfg]) => (
            <Option key={key} value={key}>
              <Badge color={cfg.color} text={cfg.label} />
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
    <div className={styles['itinerary-mgt-page']}>
      {/* 页面头部 */}
      <div className={styles['mgt-page-header']}>
        <div>
          <div className={styles['mgt-page-title']}>日程管理</div>
          <div className={styles['mgt-page-desc']}>
            {/* 当前艺人：
            <strong style={{ color: '#4fc3f7' }}>{currentLabel}</strong> */}
            查看和管理行程安排
          </div>
        </div>
        <div className={styles['mgt-page-actions']}>
          <Popover
            content={filterContent}
            title="筛选日程"
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
            新增日程
          </Button>
        </div>
      </div>

      {/* 表格区域 */}
      <div
        className={`${styles['table-panel']} ${styles['table-panel-with-actions']}`}
      >
        <Table<ItineraryItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={list}
          rowSelection={rowSelection}
          title={() => (
            <div className={styles['table-header-title']}>
              <CalendarOutlined style={{ marginRight: 8 }} />
              日程列表
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
                <CalendarOutlined
                  style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}
                />
                <div>暂无日程数据</div>
              </div>
            ),
          }}
        />

        {selectedRowKeys.length > 0 && (
          <div className={styles['batch-actions-bar']}>
            <span className={styles['selected-count']}>
              已选择 {selectedRowKeys.length} 项
            </span>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleBatchDelete}
            >
              批量删除
            </Button>
          </div>
        )}
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={modalMode === 'add' ? '新增日程' : '编辑日程'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={submitLoading}
        width={560}
        destroyOnClose
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          className={styles['itinerary-form']}
        >
          <Form.Item
            name="title"
            label="日程标题"
            rules={[{ required: true, message: '请输入日程标题' }]}
          >
            <Input placeholder="请输入日程标题" maxLength={100} showCount />
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
            name="location"
            label="地点"
            rules={[{ required: true, message: '请输入地点' }]}
          >
            <Input placeholder="请输入活动地点" maxLength={100} />
          </Form.Item>
          <Form.Item
            name="timeRange"
            label="时间范围"
            rules={[{ required: true, message: '请选择时间范围' }]}
          >
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder={['开始时间', '结束时间']}
            />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
            initialValue="pending"
          >
            <Select placeholder="选择状态">
              {Object.entries(STATUS_MAP).map(([key, cfg]) => (
                <Option key={key} value={key}>
                  <Badge color={cfg.color} text={cfg.label} />
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea
              placeholder="请输入日程描述（可选）"
              rows={4}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="日程详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDetailVisible(false)}>关闭</Button>
            {detailItem && (
              <Button
                type="primary"
                onClick={() => {
                  setDetailVisible(false);
                  handleEdit(detailItem);
                }}
              >
                编辑
              </Button>
            )}
          </div>
        }
        width={560}
        destroyOnClose
      >
        {detailItem && (
          <div className={styles['detail-content']}>
            <div className={styles['detail-header']}>
              <h3 className={styles['detail-title']}>{detailItem.title}</h3>
              <span
                className={`${styles['status-tag']} ${
                  STATUS_MAP[detailItem.status].className
                }`}
              >
                {STATUS_MAP[detailItem.status].label}
              </span>
            </div>
            <div className={styles['detail-meta']}>
              <div className={styles['detail-meta-item']}>
                <EnvironmentOutlined className={styles['detail-meta-icon']} />
                <span className={styles['detail-meta-label']}>地点</span>
                <span className={styles['detail-meta-value']}>
                  {detailItem.location}
                </span>
              </div>
              <div className={styles['detail-meta-item']}>
                <CalendarOutlined className={styles['detail-meta-icon']} />
                <span className={styles['detail-meta-label']}>艺人</span>
                <span className={styles['detail-meta-value']}>
                  {artists.find((a) => a.artistId === detailItem.artistId)
                    ?.name || detailItem.artistId}
                </span>
              </div>
              <div className={styles['detail-meta-item']}>
                <ClockCircleOutlined className={styles['detail-meta-icon']} />
                <span className={styles['detail-meta-label']}>时间</span>
                <span className={styles['detail-meta-value']}>
                  {detailItem.startTime} 至 {detailItem.endTime}
                </span>
              </div>
              <div className={styles['detail-meta-item']}>
                <CalendarOutlined className={styles['detail-meta-icon']} />
                <span className={styles['detail-meta-label']}>创建时间</span>
                <span className={styles['detail-meta-value']}>
                  {detailItem.createdAt}
                </span>
              </div>
            </div>
            <div className={styles['detail-section']}>
              <div className={styles['detail-section-title']}>
                <FileTextOutlined style={{ marginRight: 6 }} />
                描述
              </div>
              <div className={styles['detail-desc']}>
                {detailItem.description || '暂无描述'}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ItineraryMgt;
