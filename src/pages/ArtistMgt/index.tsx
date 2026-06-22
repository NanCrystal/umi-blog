import { useEffect, useState } from 'react';
import { history } from 'umi';
import {
  Avatar,
  Tag,
  Button,
  Modal,
  message,
  Popconfirm,
  Spin,
  Space,
  Tooltip,
  Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  getArtistList,
  getArtistDetail,
  deleteArtist,
  runSyncForArtistPlatform,
  updateArtistSortOrder,
} from '@/services/artist';
import { getPhotoPlatforms } from '@/services/photoTag';
import ModuleSettingsModal from './ModuleSettingsModal';
import styles from './index.less';
import { getImageUrl } from '@/utils/utils';
import weiboSvg from '@/assets/images/weibo.svg';
import douyinSvg from '@/assets/images/douyin.svg';
import xhsSvg from '@/assets/images/xiaohongshu.svg';
import igSvg from '@/assets/images/instagram.svg';

interface ArtistItem {
  id: number;
  name: string;
  artistId: string;
  avatar: string;
  appCover?: string;
  bio?: string;
  weiboId?: string;
  douyinSecUid?: string;
  xhsId?: string;
  igId?: string;
  instagramId?: string;
  igToken?: string;
  syncEnabled?: boolean;
  syncWeibo?: boolean;
  syncDouyin?: boolean;
  syncXiaohongshu?: boolean;
  syncInstagram?: boolean;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  sortOrder?: number;
  type?: string;
}

// 平台配置
interface PlatformConfig {
  key: keyof ArtistItem;
  label: string;
  color: string;
  slug: string;
}
const platforms: PlatformConfig[] = [
  { key: 'weiboId', label: '微博', color: '#E6162D', slug: 'weibo' },
  { key: 'douyinSecUid', label: '抖音', color: '#000000', slug: 'douyin' },
  { key: 'xhsId', label: '小红书', color: '#FF2442', slug: 'xiaohongshu' },
  { key: 'instagramId', label: 'Ins', color: '#FF2442', slug: 'instagram' },
];

const ArtistMgtPage = () => {
  const [list, setList] = useState<ArtistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingMap, setSyncingMap] = useState<Record<string, boolean>>({});
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [platformMap, setPlatformMap] = useState<Record<number, string>>({});

  // APP 模块设置弹窗
  const [moduleSettingsVisible, setModuleSettingsVisible] = useState(false);
  const [moduleSettingsArtist, setModuleSettingsArtist] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getArtistList();
      const sorted = (data || []).sort(
        (a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const withOrder = sorted.map((item: any, index: number) => ({
        ...item,
        sortOrder: index + 1,
      }));
      setList(withOrder);
    } catch {
      message.error('获取艺人列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const data = await getPhotoPlatforms();
      const map: Record<number, string> = {};
      (data || []).forEach((p: any) => {
        map[p.id] = p.name;
      });
      setPlatformMap(map);
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: number) => {
    // 检查是否为默认艺人
    const artist = list.find((a) => a.id === id);
    if (artist?.type === 'default') {
      message.warning('默认艺人不允许删除');
      return;
    }
    try {
      await deleteArtist(id);
      message.success('删除成功');
      fetchList();
    } catch {
      message.error('删除失败');
    }
  };

  const handleShowDetail = async (id: number) => {
    setDetailLoading(true);
    setDetailVisible(true);
    try {
      const data = await getArtistDetail(id);
      setDetailItem(data);
    } catch {
      message.error('获取详情失败');
      setDetailVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };
  /**
   *
   * @param item
   * @param platform
   * 同步模式（默认增量）mode='incremental'（默认最新10条）| 'full'（全部历史）
   */
  const handleSyncPlatform = async (
    item: ArtistItem,
    platform: PlatformConfig,
  ) => {
    const syncKey = `${item.id}_${platform.slug}`;
    setSyncingMap((prev) => ({ ...prev, [syncKey]: true }));
    try {
      const res = await runSyncForArtistPlatform(
        item.id,
        platform.slug,
        'full',
      );
      if (res.success) {
        message.success(`${platform.label}同步完成，共 ${res.count} 条`);
      } else {
        message.error(`${platform.label}同步失败：${res.error || '未知错误'}`);
      }
    } catch {
      message.error(`${platform.label}同步请求失败`);
    } finally {
      setSyncingMap((prev) => ({ ...prev, [syncKey]: false }));
    }
  };

  const svgMap: Record<string, string> = {
    weibo: weiboSvg,
    douyin: douyinSvg,
    xiaohongshu: xhsSvg,
    instagram: igSvg,
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newList = [...list];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    [newList[index], newList[targetIndex]] = [
      newList[targetIndex],
      newList[index],
    ];
    const reordered = newList.map((item, i) => ({ ...item, sortOrder: i + 1 }));
    setList(reordered);
    try {
      await updateArtistSortOrder(
        reordered.map((item) => ({ id: item.id, sortOrder: item.sortOrder })),
      );
    } catch {
      message.error('排序更新失败');
      fetchList();
    }
  };

  const columns: ColumnsType<ArtistItem> = [
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 72,
      align: 'center',
      sorter: (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0),
      defaultSortOrder: 'ascend',
    },
    {
      title: '艺人',
      key: 'artist',
      render: (_, record) => (
        <Space>
          <Avatar
            src={getImageUrl(record.avatar)}
            size={36}
            style={{
              flexShrink: 0,
              border: '1px solid var(--color-hairline, #262626)',
              borderRadius: 4,
            }}
          />
          <div>
            <div
              style={{
                color: 'var(--color-primary, #ffffff)',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {record.name}
            </div>
            <Tag color="blue" style={{ margin: 0 }}>
              {record.artistId}
            </Tag>
          </div>
        </Space>
      ),
    },
    // {
    //   title: '平台',
    //   key: 'platforms',
    //   render: (_, record) => (
    //     <Space size={4}>
    //       {platforms.map((p) => {
    //         if (!record[p.key]) return null;
    //         return (
    //           <Tooltip key={p.key} title={p.label}>
    //             <img
    //               src={svgMap[p.slug]}
    //               alt={p.label}
    //               style={{ width: 18, height: 18, display: 'block' }}
    //             />
    //           </Tooltip>
    //         );
    //       })}
    //       {platforms.every((p) => !record[p.key]) && (
    //         <span style={{ color: 'var(--color-muted, #666)', fontSize: 13 }}>
    //           未配置
    //         </span>
    //       )}
    //     </Space>
    //   ),
    // },
    {
      title: '账号状态',
      key: 'enabledStatus',
      render: (_, record) => (
        <Tag color={record.enabled !== false ? 'green' : 'red'}>
          {record.enabled !== false ? '已启用' : '已禁用'}
        </Tag>
      ),
    },
    // {
    //   title: '同步状态',
    //   key: 'syncStatus',
    //   render: (_, record) => {
    //     const enabledPlatforms = platforms.filter((p) => record[p.key]);
    //     if (enabledPlatforms.length === 0) {
    //       return (
    //         <Tag color="default">未配置</Tag>
    //       );
    //     }
    //     return (
    //       <Space size={4}>
    //         {enabledPlatforms.map((p) => (
    //           <Tooltip key={p.slug} title={`${p.label} ${record.syncEnabled !== false ? '同步中' : '已暂停'}`}>
    //             <Tag color={record.syncEnabled !== false ? 'success' : 'default'} style={{ margin: 0 }}>
    //               {p.label}
    //             </Tag>
    //           </Tooltip>
    //         ))}
    //       </Space>
    //     );
    //   },
    // },
    {
      title: '同步操作',
      key: 'syncOps',
      render: (_, record) => {
        const enabledPlatforms = platforms.filter((p) => record[p.key]);
        if (enabledPlatforms.length === 0) {
          return (
            <span style={{ color: 'var(--color-muted, #666)', fontSize: 13 }}>
              -
            </span>
          );
        }
        return (
          <Space size={4}>
            {enabledPlatforms.map((p) => {
              const syncKey = `${record.id}_${p.slug}`;
              const isSyncing = syncingMap[syncKey];
              const syncFieldName = `sync${
                p.slug.charAt(0).toUpperCase() + p.slug.slice(1)
              }` as keyof ArtistItem;
              const isSyncDisabled = record[syncFieldName] === false;
              return (
                <Tooltip
                  key={p.slug}
                  title={
                    isSyncDisabled
                      ? `${p.label}同步已禁用`
                      : `同步${p.label}数据`
                  }
                >
                  <Button
                    size="small"
                    disabled={isSyncing || isSyncDisabled}
                    loading={isSyncing}
                    icon={
                      <img
                        src={svgMap[p.slug]}
                        style={{
                          width: 14,
                          height: 14,
                          verticalAlign: 'middle',
                        }}
                      />
                    }
                    onClick={() => handleSyncPlatform(record, p)}
                    className={styles['sync-btn']}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {p.label}
                  </Button>
                </Tooltip>
              );
            })}
          </Space>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a, b) =>
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime(),
      render: (val: string) => (val ? new Date(val).toLocaleDateString() : '-'),
    },
    {
      title: '排序',
      key: 'move',
      width: 80,
      align: 'center',
      render: (_, _record, index) => (
        <Space size={2}>
          <Button
            type="default"
            size="small"
            icon={<ArrowUpOutlined />}
            className={styles['action-btn']}
            disabled={index === 0}
            onClick={() => handleMove(index, 'up')}
          />
          <Button
            type="default"
            size="small"
            icon={<ArrowDownOutlined />}
            className={styles['action-btn']}
            disabled={index === list.length - 1}
            onClick={() => handleMove(index, 'down')}
          />
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="default"
            size="small"
            icon={<EyeOutlined />}
            className={styles['action-btn']}
            onClick={() => handleShowDetail(record.id)}
          />
          <Button
            type="default"
            size="small"
            icon={<EditOutlined />}
            className={styles['action-btn']}
            onClick={() => history.push(`/admin/artist/add?id=${record.id}`)}
          />
          <Button
            type="default"
            size="small"
            title="APP设置"
            icon={<SettingOutlined />}
            className={styles['action-btn']}
            onClick={() => {
              setModuleSettingsArtist({ id: record.id, name: record.name });
              setModuleSettingsVisible(true);
            }}
          />
          {record.type !== 'default' && (
            <Popconfirm
              title="删除后不可恢复，是否继续？"
              onConfirm={() => handleDelete(record.id)}
              okText="删除"
              cancelText="取消"
            >
              <Button
                type="default"
                size="small"
                danger
                icon={<DeleteOutlined />}
                className={styles['action-btn-danger']}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className={styles['artist-mgt']}>
      <div className={styles['header']}>
        <div className={styles['header-left']}>
          <h2 className={styles['header-title']}>艺人管理</h2>
          <span className={styles['header-subtitle']}>
            共 {list.length} 位艺人
          </span>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => history.push('/admin/artist/add')}
          className={styles['add-btn']}
        >
          新增艺人
        </Button>
      </div>

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          pagination={false}
          className={styles['artist-table']}
        />
      </Spin>

      <Modal
        title="艺人详情"
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setDetailItem(null);
        }}
        footer={null}
        width={600}
      >
        <Spin spinning={detailLoading}>
          {detailItem && (
            <div className={styles['detail-content']}>
              {/* 头部：头像 + 名称 */}
              <div className={styles['detail-header']}>
                <Avatar
                  src={getImageUrl(detailItem.avatar)}
                  size={72}
                  className={styles['detail-avatar']}
                />
                <div className={styles['detail-info']}>
                  <div className={styles['detail-name']}>{detailItem.name}</div>
                  <div className={styles['detail-meta']}>
                    <Tag color="blue">{detailItem.artistId}</Tag>
                    <Tag color={detailItem.enabled !== false ? 'green' : 'red'}>
                      {detailItem.enabled !== false ? '已启用' : '已禁用'}
                    </Tag>
                    {detailItem.accentColor && (
                      <Space size={4}>
                        <span style={{ fontSize: 12, color: '#999' }}>
                          主题色:
                        </span>
                        <span
                          style={{
                            display: 'inline-block',
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            backgroundColor: detailItem.accentColor,
                            border: '1px solid var(--color-hairline, #262626)',
                            verticalAlign: 'middle',
                          }}
                        />
                        <span style={{ fontSize: 12, color: '#666' }}>
                          {detailItem.accentColor}
                        </span>
                      </Space>
                    )}
                    {/* <Tag
                      color={
                        detailItem.syncEnabled !== false ? 'success' : 'default'
                      }
                    >
                      {detailItem.syncEnabled !== false ? '同步中' : '已暂停'}
                    </Tag> */}
                  </div>
                </div>
              </div>

              {/* 各平台 */}
              {detailItem.weiboId && (
                <div className={styles['detail-row']}>
                  <div className={styles['detail-label']}>
                    <img
                      src={weiboSvg}
                      alt=""
                      className={styles['detail-label-svg']}
                    />
                    微博
                  </div>
                  <div className={styles['detail-value']}>
                    <div className={styles['detail-platform-row']}>
                      <Avatar
                        src={getImageUrl(detailItem.weiboAvatar)}
                        size={36}
                        className={styles['detail-platform-avatar']}
                      />
                      <div className={styles['detail-platform-info']}>
                        <div>ID: {detailItem.weiboId}</div>
                        {detailItem.weiboNickname && (
                          <div>昵称: {detailItem.weiboNickname}</div>
                        )}
                        {detailItem.weiboPlatformId && (
                          <div className={styles['detail-platform-bound']}>
                            绑定:{' '}
                            {platformMap[detailItem.weiboPlatformId] ||
                              `平台#${detailItem.weiboPlatformId}`}
                          </div>
                        )}
                        <div className={styles['detail-platform-sync']}>
                          <Tag
                            color={
                              detailItem.syncWeibo !== false
                                ? 'success'
                                : 'default'
                            }
                          >
                            {detailItem.syncWeibo !== false
                              ? '已开启同步'
                              : '已关闭同步'}
                          </Tag>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {detailItem.douyinSecUid && (
                <div className={styles['detail-row']}>
                  <div className={styles['detail-label']}>
                    <img
                      src={douyinSvg}
                      alt=""
                      className={styles['detail-label-svg']}
                    />
                    抖音
                  </div>
                  <div className={styles['detail-value']}>
                    <div className={styles['detail-platform-row']}>
                      <Avatar
                        src={getImageUrl(detailItem.douyinAvatar)}
                        size={36}
                        className={styles['detail-platform-avatar']}
                      />
                      <div className={styles['detail-platform-info']}>
                        <div className={styles['detail-platform-sec-uid']}>
                          <span>sec_uid:</span>
                          <span
                            className={styles['detail-platform-sec-uid-value']}
                            title={detailItem.douyinSecUid}
                          >
                            {detailItem.douyinSecUid}
                          </span>
                        </div>
                        {detailItem.douyinNickname && (
                          <div>昵称: {detailItem.douyinNickname}</div>
                        )}
                        {detailItem.douyinPlatformId && (
                          <div className={styles['detail-platform-bound']}>
                            绑定:{' '}
                            {platformMap[detailItem.douyinPlatformId] ||
                              `平台#${detailItem.douyinPlatformId}`}
                          </div>
                        )}
                        <div className={styles['detail-platform-sync']}>
                          <Tag
                            color={
                              detailItem.syncDouyin !== false
                                ? 'success'
                                : 'default'
                            }
                          >
                            {detailItem.syncDouyin !== false
                              ? '已开启同步'
                              : '已关闭同步'}
                          </Tag>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {detailItem.xhsId && (
                <div className={styles['detail-row']}>
                  <div className={styles['detail-label']}>
                    <img
                      src={xhsSvg}
                      alt=""
                      className={styles['detail-label-svg']}
                    />
                    小红书
                  </div>
                  <div className={styles['detail-value']}>
                    <div className={styles['detail-platform-row']}>
                      <Avatar
                        src={getImageUrl(detailItem.xhsAvatar)}
                        size={36}
                        className={styles['detail-platform-avatar']}
                      />
                      <div className={styles['detail-platform-info']}>
                        <div>ID: {detailItem.xhsId}</div>
                        {detailItem.xhsNickname && (
                          <div>昵称: {detailItem.xhsNickname}</div>
                        )}
                        {detailItem.xhsPlatformId && (
                          <div className={styles['detail-platform-bound']}>
                            绑定:{' '}
                            {platformMap[detailItem.xhsPlatformId] ||
                              `平台#${detailItem.xhsPlatformId}`}
                          </div>
                        )}
                        <div className={styles['detail-platform-sync']}>
                          <Tag
                            color={
                              detailItem.syncXiaohongshu !== false
                                ? 'success'
                                : 'default'
                            }
                          >
                            {detailItem.syncXiaohongshu !== false
                              ? '已开启同步'
                              : '已关闭同步'}
                          </Tag>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {detailItem.igId && (
                <div className={styles['detail-row']}>
                  <div className={styles['detail-label']}>
                    <img
                      src={igSvg}
                      alt=""
                      className={styles['detail-label-svg']}
                    />
                    Instagram
                  </div>
                  <div className={styles['detail-value']}>
                    <div className={styles['detail-platform-row']}>
                      <Avatar
                        src={getImageUrl(detailItem.igAvatar)}
                        size={36}
                        className={styles['detail-platform-avatar']}
                      />
                      <div className={styles['detail-platform-info']}>
                        <div>ID: {detailItem.igId}</div>
                        {detailItem.igNickname && (
                          <div>昵称: {detailItem.igNickname}</div>
                        )}
                        {detailItem.igToken && (
                          <div>Token: {detailItem.igToken}</div>
                        )}
                        {detailItem.igPlatformId && (
                          <div className={styles['detail-platform-bound']}>
                            绑定:{' '}
                            {platformMap[detailItem.igPlatformId] ||
                              `平台#${detailItem.igPlatformId}`}
                          </div>
                        )}
                        <div className={styles['detail-platform-sync']}>
                          <Tag
                            color={
                              detailItem.syncInstagram !== false
                                ? 'success'
                                : 'default'
                            }
                          >
                            {detailItem.syncInstagram !== false
                              ? '已开启同步'
                              : '已关闭同步'}
                          </Tag>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 时间 */}
              <div className={styles['detail-row']}>
                <div className={styles['detail-label']}>创建时间</div>
                <div className={styles['detail-value']}>
                  {detailItem.createdAt
                    ? new Date(detailItem.createdAt).toLocaleString()
                    : '-'}
                </div>
              </div>
              <div className={styles['detail-row']}>
                <div className={styles['detail-label']}>更新时间</div>
                <div className={styles['detail-value']}>
                  {detailItem.updatedAt
                    ? new Date(detailItem.updatedAt).toLocaleString()
                    : '-'}
                </div>
              </div>

              {/* 简介 */}
              <div className={styles['detail-row']}>
                <div className={styles['detail-label']}>App 封面</div>
                <div className={styles['detail-value']}>
                  {detailItem.appCover ? (
                    <img
                      src={getImageUrl(detailItem.appCover)}
                      alt="App封面"
                      style={{
                        maxWidth: 200,
                        maxHeight: 120,
                        borderRadius: 8,
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <span style={{ color: '#999' }}>未设置</span>
                  )}
                </div>
              </div>

              {/* 简介 */}
              <div className={styles['detail-row']}>
                <div className={styles['detail-label']}>简介</div>
                <div className={styles['detail-value']}>
                  {detailItem.bio || '无'}
                </div>
              </div>
            </div>
          )}
        </Spin>
      </Modal>

      <ModuleSettingsModal
        visible={moduleSettingsVisible}
        artistId={moduleSettingsArtist?.id ?? 0}
        artistName={moduleSettingsArtist?.name ?? ''}
        onClose={() => {
          setModuleSettingsVisible(false);
          setModuleSettingsArtist(null);
        }}
      />
    </div>
  );
};

export default ArtistMgtPage;
