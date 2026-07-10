import React, { useState, useEffect } from 'react';
import { history } from 'umi';
import {
  Button,
  Table,
  Space,
  Popconfirm,
  message,
  Spin,
  Modal,
  Switch,
  Tag,
  Image,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  PictureOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  IdcardOutlined,
  OrderedListOutlined,
} from '@ant-design/icons';
import {
  getAppModuleList,
  deleteAppModule,
  batchDeleteAppModule,
  updateAppModuleStatus,
  updateAppModule,
  getAppModuleDetail,
} from '@/services/appModule';
import type { AppModuleItem } from '@/services/appModule';
import { getImageUrl, getThumbFullUrl } from '@/utils/utils';
import styles from './index.less';

const AppSetMgtPage: React.FC = () => {
  const [list, setList] = useState<AppModuleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState<AppModuleItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchList();
  }, [page, pageSize]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await getAppModuleList({ page, pageSize });
      setList(res.list || []);
      setTotal(res.total || 0);
    } catch {
      message.error('获取模块列表失败');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<AppModuleItem> = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '模块名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '模块标识',
      dataIndex: 'key',
      key: 'key',
      render: (key: string, record: AppModuleItem) => (
        <Space>
          <span>{key}</span>
          {record.type === 'default' && (
            <Tag
              color="blue"
              style={{ borderRadius: 9999, fontSize: 11, marginLeft: 4 }}
            >
              默认
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '关联艺人',
      dataIndex: 'artistIds',
      key: 'artistIds',
      ellipsis: true,
      render: (artistIds: any[]) =>
        artistIds && artistIds.length > 0
          ? artistIds.map((a: any) => a.name).join('、')
          : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number, record: AppModuleItem) => (
        <Switch
          checked={status === 1}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          onChange={(checked) => handleStatusChange(record.id, checked)}
        />
      ),
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 100,
    },
    {
      title: '操作',
      key: 'move',
      width: 100,
      render: (_, record, index) => (
        <Space>
          <Button
            type="link"
            size="small"
            style={{ color: '#fff' }}
            disabled={index === 0}
            onClick={() => handleMoveUp(record.id, index)}
          >
            ↑
          </Button>
          <Button
            type="link"
            size="small"
            style={{ color: '#fff' }}
            disabled={index === list.length - 1}
            onClick={() => handleMoveDown(record.id, index)}
          >
            ↓
          </Button>
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (val: string) => (val ? new Date(val).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 300,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record.id)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() =>
              history.push(`/admin/app_settings/add?id=${record.id}`)
            }
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除该模块吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            disabled={record.type === 'default'}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={record.type === 'default'}
              title={
                record.type === 'default' ? '默认模块不允许删除' : undefined
              }
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleStatusChange = (id: number, checked: boolean) => {
    const newStatus = checked ? 1 : 0;
    const actionText = checked ? '启用' : '禁用';
    Modal.confirm({
      title: `确定要${actionText}该模块吗？`,
      onOk: async () => {
        try {
          await updateAppModuleStatus(id, newStatus);
          message.success(`${actionText}成功`);
          fetchList();
        } catch {
          message.error(`${actionText}失败`);
        }
      },
      okText: '确定',
      cancelText: '取消',
    });
  };

  const handleMoveUp = async (id: number, currentIndex: number) => {
    if (currentIndex === 0) return;
    const targetItem = list[currentIndex - 1];
    try {
      await updateAppModule(id, { sortOrder: targetItem.sortOrder });
      await updateAppModule(targetItem.id, {
        sortOrder: list[currentIndex].sortOrder,
      });
      message.success('上移成功');
      fetchList();
    } catch {
      message.error('排序失败');
    }
  };

  const handleMoveDown = async (id: number, currentIndex: number) => {
    if (currentIndex === list.length - 1) return;
    const targetItem = list[currentIndex + 1];
    try {
      await updateAppModule(id, { sortOrder: targetItem.sortOrder });
      await updateAppModule(targetItem.id, {
        sortOrder: list[currentIndex].sortOrder,
      });
      message.success('下移成功');
      fetchList();
    } catch {
      message.error('排序失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAppModule(id);
      message.success('删除成功');
      fetchList();
    } catch {
      message.error('删除失败');
    }
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的模块');
      return;
    }
    Modal.confirm({
      title: `确定要删除选中的 ${selectedRowKeys.length} 个模块吗？`,
      onOk: async () => {
        try {
          await batchDeleteAppModule(selectedRowKeys as number[]);
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          fetchList();
        } catch {
          message.error('批量删除失败');
        }
      },
      okText: '删除',
      cancelText: '取消',
    });
  };

  const handleAdd = () => {
    history.push('/admin/app_settings/add');
  };

  const handleViewDetail = async (id: number) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const data = await getAppModuleDetail(id);
      setDetailData(data);
    } catch {
      message.error('获取详情失败');
      setDetailVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  /** 解析图片列表 */
  const parseImageList = (image: string | null | undefined): string[] => {
    if (!image) return [];
    try {
      const parsed = typeof image === 'string' ? JSON.parse(image) : image;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  };

  return (
    <div className={styles['app-set-mgt']}>
      <div className={styles['header']}>
        <div className={styles['header-left']}>
          <h2 className={styles['header-title']}>App模块管理</h2>
          <span className={styles['header-subtitle']}>共 {total} 个模块</span>
        </div>
        <Space>
          <Button
            icon={<DeleteOutlined />}
            onClick={handleBatchDelete}
            disabled={selectedRowKeys.length === 0}
          >
            批量删除
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增模块
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (record: AppModuleItem) => ({
              disabled: record.type === 'default',
            }),
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Spin>

      <Modal
        title="模块详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDetailVisible(false)}>关闭</Button>
            {detailData && (
              <Button
                type="primary"
                onClick={() => {
                  setDetailVisible(false);
                  history.push(`/admin/app_settings/add?id=${detailData.id}`);
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
        <Spin spinning={detailLoading}>
          {detailData &&
            (() => {
              const imageList = parseImageList(detailData.image);
              return (
                <div
                  className={styles['detail-content']}
                  style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
                >
                  {/* ── 标题行：模块名称 + 状态 ── */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 400,
                        color: '#ffffff',
                        lineHeight: 1.4,
                        flex: 1,
                      }}
                    >
                      {detailData.name || '-'}
                    </h3>
                    <Tag
                      color={detailData.status === 1 ? 'success' : 'default'}
                      style={{ borderRadius: 9999, fontSize: 11 }}
                    >
                      {detailData.status === 1 ? '启用' : '禁用'}
                    </Tag>
                  </div>

                  {/* ── 图片区域 ── */}
                  {imageList.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: 14,
                          color: '#ccc',
                        }}
                      >
                        <PictureOutlined style={{ marginRight: 6 }} />
                        模块图片
                      </div>
                      <div
                        style={{
                          overflow: 'hidden',
                          background: '#0d0d0d',
                          border: '1px solid #262626',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                          padding: 8,
                        }}
                      >
                        {imageList.map((url: string, index: number) => (
                          <div
                            key={index}
                            style={{
                              width: 'calc(20% - 6.4px)',
                              aspectRatio: '1',
                              overflow: 'hidden',
                            }}
                          >
                            <Image
                              src={getThumbFullUrl(url)}
                              width="100%"
                              height="100%"
                              preview={{ src: getImageUrl(url) }}
                              style={{ objectFit: 'cover' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── 元数据卡片 ── */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      padding: 16,
                      background: '#141414',
                      border: '1px solid #262626',
                    }}
                  >
                    {/* 模块ID */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                      <IdcardOutlined
                        style={{
                          color: '#999',
                          fontSize: 14,
                          width: 18,
                          textAlign: 'center',
                        }}
                      />
                      <span
                        style={{
                          color: '#999',
                          fontSize: 12,
                          width: 64,
                          flexShrink: 0,
                        }}
                      >
                        模块ID
                      </span>
                      <span style={{ color: '#ccc', fontSize: 13, flex: 1 }}>
                        {detailData.key || '-'}
                      </span>
                    </div>
                    {/* 排序 */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                      <OrderedListOutlined
                        style={{
                          color: '#999',
                          fontSize: 14,
                          width: 18,
                          textAlign: 'center',
                        }}
                      />
                      <span
                        style={{
                          color: '#999',
                          fontSize: 12,
                          width: 64,
                          flexShrink: 0,
                        }}
                      >
                        排序
                      </span>
                      <span style={{ color: '#ccc', fontSize: 13, flex: 1 }}>
                        {detailData.sortOrder ?? '-'}
                      </span>
                    </div>
                    {/* 关联艺人 */}
                    {detailData.artistIds &&
                      detailData.artistIds.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <AppstoreOutlined
                            style={{
                              color: '#999',
                              fontSize: 14,
                              width: 18,
                              textAlign: 'center',
                            }}
                          />
                          <span
                            style={{
                              color: '#999',
                              fontSize: 12,
                              width: 64,
                              flexShrink: 0,
                            }}
                          >
                            关联艺人
                          </span>
                          <span
                            style={{ color: '#ccc', fontSize: 13, flex: 1 }}
                          >
                            {detailData.artistIds
                              .map((a: any) => a.name)
                              .join('、') || '-'}
                          </span>
                        </div>
                      )}
                    {/* 创建时间 */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                      <ClockCircleOutlined
                        style={{
                          color: '#999',
                          fontSize: 14,
                          width: 18,
                          textAlign: 'center',
                        }}
                      />
                      <span
                        style={{
                          color: '#999',
                          fontSize: 12,
                          width: 64,
                          flexShrink: 0,
                        }}
                      >
                        创建时间
                      </span>
                      <span style={{ color: '#ccc', fontSize: 13, flex: 1 }}>
                        {detailData.createdAt
                          ? new Date(detailData.createdAt).toLocaleString()
                          : '-'}
                      </span>
                    </div>
                  </div>

                  {/* ── 描述区域 ── */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 14,
                        color: '#ccc',
                      }}
                    >
                      <FileTextOutlined style={{ marginRight: 6 }} />
                      描述
                    </div>
                    <div
                      style={{
                        padding: '14px 16px',
                        background: '#141414',
                        border: '1px solid #262626',
                        color: '#ccc',
                        fontSize: 14,
                        lineHeight: 1.7,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {detailData.description || '暂无描述'}
                    </div>
                  </div>
                </div>
              );
            })()}
        </Spin>
      </Modal>
    </div>
  );
};

export default AppSetMgtPage;
