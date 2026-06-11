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
} from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  getArtistList,
  getArtistDetail,
  deleteArtist,
  runSyncForArtistPlatform,
} from '@/services/artist';
import { getPhotoPlatforms } from '@/services/photoTag';
import styles from './index.less';
import { getImageUrl } from '@/utils/utils';
import weiboIcon from '@/assets/images/weibo.png';
import douyinIcon from '@/assets/images/douyin.png';
import xhsIcon from '@/assets/images/xiaohongshu.png';
import igIcon from '@/assets/images/instagram.png';
import weiboSvg from '@/assets/images/weibo.svg';
import douyinSvg from '@/assets/images/douyin.svg';
import xhsSvg from '@/assets/images/xiaohongshu.svg';
import igSvg from '@/assets/images/instagram.svg';

interface ArtistItem {
  id: number;
  name: string;
  artistId: string;
  avatar: string;
  bio?: string;
  weiboId?: string;
  douyinSecUid?: string;
  xhsId?: string;
  igId?: string;
  instagramId?: string;
  igToken?: string;
  syncEnabled?: boolean;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  // { key: 'instagramId', label: 'Ins', color: '#FF2442', slug: 'instagram' },
];

const ArtistMgtPage = () => {
  const [list, setList] = useState<ArtistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingMap, setSyncingMap] = useState<Record<string, boolean>>({});
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [platformMap, setPlatformMap] = useState<Record<number, string>>({});

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getArtistList();
      const sorted = (data || []).sort(
        (a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setList(sorted);
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
        'incremental',
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

  const platformImgMap: Record<string, string> = {
    weibo: weiboIcon,
    douyin: douyinIcon,
    xiaohongshu: xhsIcon,
    instagram: igIcon,
  };

  const renderCard = (item: ArtistItem) => {
    const hasPlatform = (p: PlatformConfig) => !!item[p.key];
    const platformCount = platforms.filter(hasPlatform).length;

    return (
      <div key={item.id} className={styles['artist-card']}>
        {/* 右上角操作按钮（hover 显示） */}
        <div className={styles['card-actions']}>
          <Button
            type="default"
            size="small"
            icon={<EyeOutlined />}
            className={styles['action-btn']}
            onClick={() => handleShowDetail(item.id)}
          />
          <Button
            type="default"
            size="small"
            icon={<EditOutlined />}
            className={styles['action-btn']}
            onClick={() => history.push(`/admin/artist/add?id=${item.id}`)}
          />
          <Popconfirm
            title="删除后不可恢复，是否继续？"
            onConfirm={() => handleDelete(item.id)}
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
        </div>

        {/* 头部：头像 + 基本信息 */}
        <div className={styles['card-header']}>
          <Avatar
            src={getImageUrl(item.avatar)}
            size={56}
            className={styles['card-avatar']}
          />
          <div className={styles['card-info']}>
            <div className={styles['card-name']}>{item.name}</div>
            <div className={styles['card-id']}>
              <Tag color="blue" style={{ margin: 0 }}>
                {item.artistId}
              </Tag>
            </div>
          </div>
        </div>

        {/* 平台图标 */}
        {/* {platformCount > 0 ? (
          <div className={styles['card-platforms']}>
            {platforms.map((p) =>
              hasPlatform(p) ? (
                <img
                  key={p.key}
                  src={platformImgMap[p.slug]}
                  alt={p.label}
                  title={p.label}
                  className={styles['platform-icon']}
                />
              ) : null,
            )}
          </div>
        ) : (
          <div className={styles['card-platforms']}>
            <span className={styles['no-platform']}>未配置平台</span>
          </div>
        )} */}

        {/* 底部：状态 + 同步操作 */}
        <div className={styles['card-footer']}>
          <Space size={4}>
            <Tag color={item.enabled !== false ? 'green' : 'red'}>
              {item.enabled !== false ? '已启用' : '已禁用'}
            </Tag>
            <Tag color={item.syncEnabled !== false ? 'success' : 'default'}>
              {item.syncEnabled !== false ? '同步中' : '已暂停'}
            </Tag>
          </Space>
          <Space size={4}>
            {platforms.map((p) => {
              const syncKey = `${item.id}_${p.slug}`;
              const isSyncing = syncingMap[syncKey];
              const disabled = !item[p.key] || isSyncing;
              return (
                <Tooltip
                  key={p.slug}
                  title={
                    !item[p.key] ? `未配置${p.label}ID` : `同步${p.label}数据`
                  }
                >
                  <Button
                    size="small"
                    disabled={disabled}
                    loading={isSyncing}
                    icon={
                      <img
                        src={svgMap[p.slug]}
                        className={styles['sync-svg-icon']}
                        style={{
                          display: 'inline-flex',
                          verticalAlign: 'middle',
                        }}
                      />
                    }
                    onClick={() => handleSyncPlatform(item, p)}
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
        </div>
      </div>
    );
  };

  return (
    <div className={styles['artist-mgt']}>
      <div className={styles['header']}>
        <div className={styles['header-left']}>
          <h2 className={styles['header-title']}>艺人管理</h2>
          <span className={styles['header-subtitle']}>
            共 {list.length} 位艺人
          </span>
        </div>
      </div>

      <Spin spinning={loading}>
        <div className={styles['card-grid']}>
          <div
            className={styles['add-card']}
            onClick={() => history.push('/admin/artist/add')}
          >
            <div className={styles['add-card-icon']}>+</div>
            <div className={styles['add-card-text']}>新增艺人</div>
          </div>
          {list.map(renderCard)}
        </div>
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
                    <Tag
                      color={
                        detailItem.syncEnabled !== false ? 'success' : 'default'
                      }
                    >
                      {detailItem.syncEnabled !== false ? '同步中' : '已暂停'}
                    </Tag>
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
                <div className={styles['detail-label']}>简介</div>
                <div className={styles['detail-value']}>
                  {detailItem.bio || '无'}
                </div>
              </div>
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default ArtistMgtPage;
