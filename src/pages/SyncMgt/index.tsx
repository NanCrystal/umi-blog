import { useEffect, useState } from 'react';
import {
  Tabs,
  Table,
  Button,
  Tag,
  Modal,
  message,
  Spin,
  Tooltip,
  Space,
  Input,
  Select,
  Switch,
  InputNumber,
} from 'antd';
import {
  SyncOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined,
  LinkOutlined,
  DownloadOutlined,
  WeiboSquareOutlined,
  InstagramOutlined,
  TikTokOutlined,
  BookOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  getArtistList,
  getSyncPosts,
  runSyncAll,
  getFullSyncStatus,
  deleteSyncPost,
  batchDeleteSyncPosts,
  getSyncPostDetail,
  importSyncData,
  importInstagramScript,
  clearAllSyncPosts,
  getSyncPostsStats,
  getSyncScheduleConfig,
  updateSyncScheduleConfig,
  runSyncForArtistPlatform,
} from '@/services/artist';
import { batchLinkMedia, unlinkMedia } from '@/services/socialLink';
import { getImageUrl, formatDateTime } from '@/utils/utils';
import styles from './index.less';

const platformIcons: Record<string, React.ReactNode> = {
  weibo: <WeiboSquareOutlined style={{ fontSize: 18 }} />,
  douyin: <TikTokOutlined style={{ fontSize: 18 }} />,
  xiaohongshu: <BookOutlined style={{ fontSize: 18 }} />,
  instagram: <InstagramOutlined style={{ fontSize: 18 }} />,
};
const platformLabels: Record<string, string> = {
  weibo: '微博',
  douyin: '抖音',
  xiaohongshu: '小红书',
  instagram: 'Instagram',
};

const platforms = [
  { key: '', label: '全部' },
  { key: 'weibo', label: '微博' },
  { key: 'douyin', label: '抖音' },
  { key: 'xiaohongshu', label: '小红书' },
  { key: 'instagram', label: 'Instagram' },
];

const SyncMgtPage = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [fullSyncing, setFullSyncing] = useState(false);
  const [fullSyncDone, setFullSyncDone] = useState(false);
  const [quickSyncing, setQuickSyncing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [artists, setArtists] = useState<any[]>([]);
  const [filterArtist, setFilterArtist] = useState<number | undefined>();
  const [activeTab, setActiveTab] = useState('');

  // 统计
  const [stats, setStats] = useState<{
    total: number;
    byPlatform: Record<string, number>;
  } | null>(null);

  // 多选
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 详情弹窗
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // 图片翻页
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // 导入弹窗
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPlatform, setImportPlatform] = useState('instagram');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // ── Instagram 脚本导入 ──
  const [importTab, setImportTab] = useState('json'); // 'json' | 'script'
  const [scriptBasePath, setScriptBasePath] = useState('');
  const [scriptArtistId, setScriptArtistId] = useState<number | undefined>();
  const [scriptCleanup, setScriptCleanup] = useState(true);
  const [scripting, setScripting] = useState(false);

  // ── 关联媒体 ──
  const [linkedMedia, setLinkedMedia] = useState<any[]>([]);

  // ── 关联照片弹窗 ──
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkingPostId, setLinkingPostId] = useState<number | null>(null);
  const [linkMediaIds, setLinkMediaIds] = useState<number[]>([]);

  // ── 定时同步任务 ──
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleIntervalType, setScheduleIntervalType] =
    useState<string>('day');
  const [scheduleIntervalValue, setScheduleIntervalValue] = useState<number>(1);
  const [scheduleLastRunAt, setScheduleLastRunAt] = useState<string | null>(
    null,
  );
  const [scheduleLastRunStatus, setScheduleLastRunStatus] = useState<
    string | null
  >(null);

  const handleOpenScheduleModal = async () => {
    setScheduleModalOpen(true);
    setScheduleLoading(true);
    try {
      const cfg: any = await getSyncScheduleConfig();
      setScheduleEnabled(!!cfg?.enabled);
      setScheduleIntervalType(cfg?.intervalType || 'day');
      setScheduleIntervalValue(cfg?.intervalValue || 1);
      setScheduleLastRunAt(cfg?.lastRunAt || null);
      setScheduleLastRunStatus(cfg?.lastRunStatus || null);
    } catch {
      message.error('获取定时任务配置失败');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (
      scheduleEnabled &&
      (!scheduleIntervalValue || scheduleIntervalValue < 1)
    ) {
      message.warning('请输入有效的间隔数值（≥1）');
      return;
    }
    setScheduleSaving(true);
    try {
      await updateSyncScheduleConfig({
        enabled: scheduleEnabled,
        intervalType: scheduleIntervalType,
        intervalValue: scheduleIntervalValue,
      });
      message.success(scheduleEnabled ? '定时任务已开启' : '定时任务已关闭');
      setScheduleModalOpen(false);
    } catch {
      message.error('保存定时任务配置失败');
    } finally {
      setScheduleSaving(false);
    }
  };

  const fetchPosts = async (tab?: string) => {
    setLoading(true);
    try {
      const res = await getSyncPosts({
        artistId: filterArtist,
        platform: tab ?? activeTab,
        page,
        pageSize,
      });
      setPosts(res.list || []);
      setTotal(res.total || 0);
    } catch {
      message.error('获取同步记录失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await getSyncPostsStats();
      setStats(res);
    } catch {
      // ignore
    }
  };

  const fetchArtists = async () => {
    try {
      const data = await getArtistList();
      setArtists(data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchArtists();
    checkFullSyncStatus();
  }, []);

  const checkFullSyncStatus = async () => {
    try {
      const status = await getFullSyncStatus();
      setFullSyncDone(status.done);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchStats();
  }, [page, pageSize, filterArtist, activeTab]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPage(1);
    setSelectedRowKeys([]);
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await runSyncAll();
      const succeed = res.filter((r: any) => r.success).length;
      const failed = res.filter((r: any) => !r.success).length;
      message.success(
        `同步完成：${succeed} 个成功${failed > 0 ? `，${failed} 个失败` : ''}`,
      );
      fetchPosts();
      fetchStats();
    } catch {
      message.error('同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleFullSync = async () => {
    setFullSyncing(true);
    try {
      const res = await runSyncAll('full');
      message.success(res.message || '全量同步完成');
      setFullSyncDone(true);
      fetchPosts();
      fetchStats();
    } catch {
      message.error('全量同步失败');
    } finally {
      setFullSyncing(false);
    }
  };

  /**
   * 一键同步：
   * - tab 为全部（activeTab === ''）→ 等同全量同步（所有艺人所有平台）
   * - tab 为具体平台 → 遍历所有艺人，同步该平台数据
   */
  const handleQuickSync = async () => {
    // 全部 tab：直接走全量同步
    if (!activeTab) {
      return handleFullSync();
    }

    // 具体平台 tab：遍历所有艺人同步该平台
    const platformLabel = platformLabels[activeTab] || activeTab;
    setQuickSyncing(true);
    try {
      let succeed = 0;
      let failed = 0;
      for (const artist of artists) {
        try {
          await runSyncForArtistPlatform(artist.id, activeTab, 'incremental');
          succeed++;
        } catch {
          failed++;
        }
      }
      message.success(
        `${platformLabel}同步完成：${succeed} 个成功${
          failed > 0 ? `，${failed} 个失败` : ''
        }`,
      );
      fetchPosts();
      fetchStats();
    } catch {
      message.error(`${platformLabel}同步失败`);
    } finally {
      setQuickSyncing(false);
    }
  };

  // 查看详情
  const handleViewDetail = async (record: any) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    try {
      const res = await getSyncPostDetail(record.id);
      setDetailRecord(res);
      setCurrentImgIndex(0);
      setLinkedMedia(res?.linkedMedia || []);
    } catch {
      message.error('获取详情失败');
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // 取消关联
  const handleUnlinkMedia = async (mediaItem: any) => {
    if (!detailRecord) return;
    Modal.confirm({
      title: '确认取消关联',
      content: `确定要取消与 ${
        mediaItem.mediaType === 'PHOTO' ? '照片' : '视频'
      } #${mediaItem.media?.id} 的关联吗？`,
      okText: '确认取消',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await unlinkMedia({
            socialPostId: detailRecord.id,
            mediaId: mediaItem.media?.id,
            mediaType: mediaItem.mediaType,
          });
          message.success('已取消关联');
          // 重新拉取详情
          const updated = await getSyncPostDetail(detailRecord.id).catch(
            () => null,
          );
          if (updated) {
            setDetailRecord(updated);
            setLinkedMedia(updated.linkedMedia || []);
          }
        } catch {
          message.error('取消关联失败');
        }
      },
    });
  };

  const images = detailRecord?.images || [];
  // 构建展示媒体列表（含类型信息）
  const linkedDisplay: {
    type: 'photo' | 'video';
    url: string;
    originalUrl?: string;
  }[] = [];
  for (const m of linkedMedia) {
    if (m.mediaType === 'PHOTO' && m.media?.url) {
      linkedDisplay.push({
        type: 'photo',
        url: getImageUrl(m.media.url),
        originalUrl: m.media.url,
      });
    } else if (m.mediaType === 'VIDEO' && m.media?.originalUrl) {
      linkedDisplay.push({
        type: 'video',
        url: getImageUrl(m.media.originalUrl),
        originalUrl: m.media.originalUrl,
      });
    }
  }
  const displayMedia =
    linkedDisplay.length > 0
      ? linkedDisplay
      : images.map((url: string) => ({ type: 'photo' as const, url }));
  const currentMedia = displayMedia[currentImgIndex];

  const mediaCount = displayMedia.length;
  const prevImage = () => {
    setCurrentImgIndex((prev) => (prev > 0 ? prev - 1 : mediaCount - 1));
  };

  const nextImage = () => {
    setCurrentImgIndex((prev) => (prev < mediaCount - 1 ? prev + 1 : 0));
  };

  // 单条删除
  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条同步记录吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteSyncPost(id);
          message.success('删除成功');
          fetchPosts();
          fetchStats();
          setSelectedRowKeys((prev) => prev.filter((k) => k !== id));
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的记录');
      return;
    }
    Modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条记录吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await batchDeleteSyncPosts(selectedRowKeys as number[]);
          message.success(`成功删除 ${selectedRowKeys.length} 条记录`);
          setSelectedRowKeys([]);
          fetchPosts();
          fetchStats();
        } catch {
          message.error('批量删除失败');
        }
      },
    });
  };

  // 一键清空
  const handleClearAll = () => {
    Modal.confirm({
      title: '一键清空',
      content: '确定要清空所有同步记录吗？此操作不可恢复！',
      okText: '清空',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await clearAllSyncPosts();
          message.success('已清空所有同步记录');
          setSelectedRowKeys([]);
          setPosts([]);
          setTotal(0);
          setStats(null);
        } catch {
          message.error('清空失败');
        }
      },
    });
  };

  // 导入数据
  const handleImport = async () => {
    if (!importFile) {
      message.warning('请选择 JSON 文件');
      return;
    }
    setImporting(true);
    try {
      const res = await importSyncData(importFile, importPlatform);
      if (res.success) {
        message.success(res.message || `成功导入 ${res.count} 条`);
        setImportModalOpen(false);
        setImportFile(null);
        fetchPosts();
        fetchStats();
      } else {
        message.error(res.message || '导入失败');
      }
    } catch {
      message.error('导入失败，请检查文件格式');
    } finally {
      setImporting(false);
    }
  };

  const columns = [
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: (p: string) =>
        platformIcons[p] ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {platformIcons[p]}
            <span style={{ color: '#ccc', fontSize: 13 }}>
              {platformLabels[p] || p}
            </span>
          </span>
        ) : (
          <span style={{ color: '#666', fontSize: 12 }}>-</span>
        ),
    },
    {
      title: '艺人',
      key: 'artist',
      width: 100,
      render: (_: any, record: any) =>
        record.artist?.name || `#${record.artistId}`,
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text: string) => (
        <span
          className={styles['content-text']}
          style={{
            maxWidth: 350,
            color: '#ffffff',
            display: 'inline-block',
          }}
        >
          {text?.replace(/<[^>]*>/g, '') || '(无文本内容)'}
        </span>
      ),
    },
    {
      title: '类型',
      key: 'mediaType',
      width: 60,
      render: (_: any, record: any) => {
        if (!record.linkedMedia?.length)
          return <span style={{ color: '#555' }}>-</span>;
        const hasPhoto = record.linkedMedia.some(
          (m: any) => m.mediaType === 'PHOTO',
        );
        const hasVideo = record.linkedMedia.some(
          (m: any) => m.mediaType === 'VIDEO',
        );
        return (
          <span style={{ color: hasVideo ? '#999' : '#5fa657', fontSize: 12 }}>
            {hasPhoto && hasVideo ? '图片/视频' : hasPhoto ? '图片' : '视频'}
          </span>
        );
      },
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      key: 'publishTime',
      width: 160,
      render: (t: string) => new Date(t).toLocaleString('zh-CN'),
    },
    // {
    //   title: '状态',
    //   dataIndex: 'syncStatus',
    //   key: 'syncStatus',
    //   width: 70,
    //   render: (s: string) => (
    //     <Tag color={s === 'ACTIVE' ? 'success' : 'default'} style={{ margin: 0 }}>
    //       {s === 'ACTIVE' ? '正常' : s}
    //     </Tag>
    //   ),
    // },
    {
      title: '操作',
      key: 'action',
      width: 300,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            >
              详情
            </Button>
          </Tooltip>
          <Tooltip title="关联照片/视频">
            <Button
              type="link"
              size="small"
              icon={<LinkOutlined />}
              onClick={() => {
                setLinkingPostId(record.id);
                setLinkMediaIds([]);
                setLinkModalOpen(true);
              }}
            >
              关联
            </Button>
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            >
              删除
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const tabItems = platforms.map((p) => ({
    key: p.key,
    label: p.label,
  }));

  return (
    <div className={styles['sync-mgt']}>
      {/* 页面头部 */}
      <div className={styles['mgt-page-header']}>
        <div className={styles['mgt-page-header-top']}>
          <div className={styles['mgt-page-header-section']}>
            <div className={styles['mgt-page-title']}>社交同步管理</div>
            <div className={styles['mgt-page-actions']}>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setPage(1);
                  fetchPosts();
                }}
              >
                刷新
              </Button>
              <Button
                icon={<SyncOutlined spin={syncing} />}
                loading={syncing}
                onClick={handleSyncAll}
              >
                增量同步
              </Button>
              <Button
                type="primary"
                danger={!fullSyncDone}
                icon={<ThunderboltOutlined spin={fullSyncing} />}
                loading={fullSyncing}
                // disabled={fullSyncDone}
                onClick={handleFullSync}
              >
                {fullSyncDone ? '全量同步 ✓' : '全量同步'}
              </Button>
              <Button
                icon={<ClockCircleOutlined />}
                onClick={handleOpenScheduleModal}
              >
                定时同步
              </Button>
              <Button
                icon={<UploadOutlined />}
                onClick={() => setImportModalOpen(true)}
              >
                导入
              </Button>
            </div>
          </div>
        </div>
        <div className={styles['header-content']}>
          <div className={styles['filter-tag-row']}>
            <span className={styles['filter-tag-label']}>艺人</span>
            <div className={styles['filter-tags']}>
              <span
                className={`${styles['filter-tag-item']} ${
                  filterArtist === undefined ? styles['filter-tag-active'] : ''
                }`}
                onClick={() => {
                  setFilterArtist(undefined);
                  setPage(1);
                }}
              >
                全部
              </span>
              {artists.map((artist) => (
                <span
                  key={artist.id}
                  className={`${styles['filter-tag-item']} ${
                    filterArtist === artist.id
                      ? styles['filter-tag-active']
                      : ''
                  }`}
                  onClick={() => {
                    setFilterArtist(artist.id);
                    setPage(1);
                  }}
                >
                  {artist.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        className={styles['sync-tabs']}
      />

      <Spin spinning={loading}>
        {/* 统计信息 */}
        <div className={styles['table-stats']}>
          <span className={styles['stat-item']}>
            共 <em>{stats?.total ?? total}</em> 条记录
          </span>
          {stats?.byPlatform &&
            Object.entries(stats.byPlatform).map(([platform, count]) => (
              <span key={platform} className={styles['stat-item']}>
                {platformIcons[platform]} {platformLabels[platform] || platform}{' '}
                <em>{count}</em>
              </span>
            ))}
        </div>

        <div className={styles['table-toolbar']}>
          <span className={styles['table-total']}>
            共 {total} 条{filterArtist !== undefined && ` · 已筛选`}
          </span>
          {selectedRowKeys.length > 0 && (
            <span className={styles['table-selected']}>
              已选 {selectedRowKeys.length} 条
            </span>
          )}
          <div className={styles['table-toolbar-actions']}>
            <Button
              danger
              disabled={selectedRowKeys.length === 0}
              icon={<DeleteOutlined />}
              onClick={handleBatchDelete}
            >
              批量删除
            </Button>
            <Button
              type="primary"
              icon={<ThunderboltOutlined spin={quickSyncing || fullSyncing} />}
              loading={quickSyncing || fullSyncing}
              onClick={handleQuickSync}
            >
              一键同步
              {activeTab ? `(${platformLabels[activeTab] || activeTab})` : ''}
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={handleClearAll}>
              一键清空
            </Button>
          </div>
        </div>
        <Table
          dataSource={posts}
          columns={columns}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p, ps) => {
              setPage(p);
              if (ps !== pageSize) {
                setPageSize(ps);
                setPage(1);
              }
              setSelectedRowKeys([]);
            },
            onShowSizeChange: (_current, size) => {
              setPageSize(size);
              setPage(1);
              setSelectedRowKeys([]);
            },
          }}
          size="small"
          className={styles['sync-table']}
        />
      </Spin>

      {/* 导入弹窗 */}
      <Modal
        title="导入数据"
        open={importModalOpen}
        onCancel={() => {
          setImportModalOpen(false);
          setImportFile(null);
          setScriptBasePath('');
        }}
        footer={null}
        width={560}
        className={styles['detail-modal']}
        destroyOnClose
      >
        <div
          style={{
            display: 'flex',
            gap: 0,
            marginBottom: 20,
            borderBottom: '1px solid #262626',
          }}
        >
          <span
            onClick={() => setImportTab('json')}
            style={{
              padding: '8px 20px',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: "'JetBrains Mono',monospace",
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: importTab === 'json' ? '#fff' : '#666',
              borderBottom:
                importTab === 'json'
                  ? '2px solid #fff'
                  : '2px solid transparent',
            }}
          >
            📄 JSON 导入
          </span>
          <span
            onClick={() => setImportTab('script')}
            style={{
              padding: '8px 20px',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: "'JetBrains Mono',monospace",
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: importTab === 'script' ? '#fff' : '#666',
              borderBottom:
                importTab === 'script'
                  ? '2px solid #fff'
                  : '2px solid transparent',
            }}
          >
            📁 桌面脚本导入
          </span>
        </div>

        {importTab === 'json' ? (
          <div className={styles['import-modal-body']}>
            <div className={styles['import-field']}>
              <span className={styles['import-label']}>目标平台</span>
              <div className={styles['import-tags']}>
                {platforms
                  .filter((p) => p.key)
                  .map((p) => (
                    <span
                      key={p.key}
                      className={`${styles['filter-tag-item']} ${
                        importPlatform === p.key
                          ? styles['filter-tag-active']
                          : ''
                      }`}
                      onClick={() => setImportPlatform(p.key)}
                    >
                      {p.label}
                    </span>
                  ))}
              </div>
            </div>
            <div className={styles['import-field']}>
              <span className={styles['import-label']}>JSON 文件</span>
              <div className={styles['import-file-area']}>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                  id="import-file-input"
                />
                <label
                  htmlFor="import-file-input"
                  className={styles['import-file-label']}
                >
                  {importFile ? (
                    <span className={styles['import-file-name']}>
                      {importFile.name}
                    </span>
                  ) : (
                    <span className={styles['import-file-placeholder']}>
                      点击选择 JSON 文件
                    </span>
                  )}
                </label>
              </div>
            </div>
            {importFile && (
              <div
                style={{
                  color: '#999',
                  fontSize: 12,
                  marginTop: 8,
                  paddingLeft: 76,
                }}
              >
                文件大小：{(importFile.size / 1024).toFixed(1)} KB
              </div>
            )}
            <div style={{ textAlign: 'right', marginTop: 20 }}>
              <Button
                type="primary"
                loading={importing}
                disabled={!importFile}
                onClick={handleImport}
              >
                导入
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles['import-modal-body']}>
            <div className={styles['import-field']}>
              <span className={styles['import-label']}>基础路径</span>
              <Input
                placeholder="/tmp/instagram-export 或 ./downloads"
                value={scriptBasePath}
                onChange={(e) => setScriptBasePath(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #3a3a3a',
                  borderRadius: 0,
                  color: '#fff',
                }}
              />
            </div>
            <div className={styles['import-field']}>
              <span className={styles['import-label']}>艺人</span>
              <Select
                placeholder="选择艺人（可选，自动匹配）"
                allowClear
                value={scriptArtistId}
                onChange={setScriptArtistId}
                style={{ flex: 1 }}
              >
                {artists.map((a: any) => (
                  <Select.Option key={a.id} value={a.id}>
                    {a.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
            <div className={styles['import-field']}>
              <span className={styles['import-label']}>清理文件</span>
              <Switch
                checked={scriptCleanup}
                onChange={setScriptCleanup}
                checkedChildren="删除"
                unCheckedChildren="保留"
              />
            </div>
            <div style={{ textAlign: 'right', marginTop: 20 }}>
              <Button
                type="primary"
                loading={scripting}
                disabled={!scriptBasePath.trim()}
                onClick={async () => {
                  setScripting(true);
                  try {
                    const res = await importInstagramScript({
                      basePath: scriptBasePath.trim(),
                      artistId: scriptArtistId,
                      cleanupAfter: scriptCleanup,
                    });
                    if (res.success) {
                      message.success(res.message || '导入完成');
                      setImportModalOpen(false);
                      fetchPosts();
                      fetchStats();
                    } else {
                      message.error(res.message || '导入失败');
                    }
                  } catch {
                    message.error('导入失败，请检查路径');
                  } finally {
                    setScripting(false);
                  }
                }}
              >
                开始导入
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 详情弹窗（与 PhotoMgt 预览样式完全一致） */}
      <Modal
        title={currentMedia?.type === 'video' ? '视频详情' : '图片详情'}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={800}
        className={styles['detail-modal']}
        destroyOnClose
        bodyStyle={{ height: 500, overflow: 'hidden' }}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin />
          </div>
        ) : detailRecord ? (
          <div className={styles['preview-content']}>
            {/* 左翻页按钮 */}
            <span
              className={`${styles['preview-nav-btn']} ${
                styles['preview-nav-prev']
              } ${currentImgIndex <= 0 ? styles['nav-disabled'] : ''}`}
              onClick={prevImage}
            >
              ‹
            </span>

            {/* 左侧：预览（图片或视频） */}
            <div
              className={
                styles[
                  currentMedia?.type === 'video'
                    ? 'preview-video'
                    : 'preview-image'
                ]
              }
            >
              {currentMedia?.type === 'video' ? (
                <video
                  src={currentMedia.url}
                  controls
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    display: 'block',
                  }}
                >
                  您的浏览器不支持视频播放
                </video>
              ) : (
                <img
                  src={
                    currentMedia?.url
                      ? `${currentMedia.url}?imageView2/2/w/800/q/90`
                      : ''
                  }
                  alt={`媒体 ${currentImgIndex + 1}`}
                />
              )}
              {displayMedia.length > 0 && (
                <span
                  className={styles['preview-download-btn']}
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = currentMedia?.url;
                    if (!url) return;
                    const a = document.createElement('a');
                    a.href = url;
                    a.download =
                      currentMedia.type === 'video' ? 'video.mp4' : 'image.jpg';
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                >
                  <DownloadOutlined />
                  {currentMedia?.type === 'video' ? '下载视频' : '下载'}
                </span>
              )}
            </div>

            {/* 右侧：详细信息 */}
            <div className={styles['preview-info']}>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>平台</span>
                <span className={styles['preview-info-value']}>
                  <span
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {platformIcons[detailRecord.platform] || null}
                    {platformLabels[detailRecord.platform] ||
                      detailRecord.platform}
                  </span>
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>艺人</span>
                <span className={styles['preview-info-value']}>
                  {detailRecord.artist?.name || `#${detailRecord.artistId}`}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>平台ID</span>
                <span className={styles['detail-value-mono']}>
                  {detailRecord.platformPostId}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>发布时间</span>
                <span className={styles['preview-info-value']}>
                  {new Date(detailRecord.publishTime).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>状态</span>
                <span className={styles['preview-info-value']}>
                  <Tag
                    color={
                      detailRecord.syncStatus === 'ACTIVE'
                        ? 'success'
                        : 'default'
                    }
                    style={{ margin: 0 }}
                  >
                    {detailRecord.syncStatus === 'ACTIVE'
                      ? '正常'
                      : detailRecord.syncStatus}
                  </Tag>
                </span>
              </div>

              <div
                className={styles['preview-info-item']}
                style={{ alignItems: 'flex-start' }}
              >
                <span className={styles['preview-info-label']}>标题</span>
                <span className={styles['preview-info-value']}>
                  {detailRecord.title || '无'}
                </span>
              </div>
              <div
                className={styles['preview-info-item']}
                style={{ alignItems: 'flex-start' }}
              >
                <span className={styles['preview-info-label']}>内容</span>
                <span className={styles['preview-info-value']}>
                  {detailRecord.content?.replace(/<[^>]*>/g, '') || '无)'}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>关联</span>
                <span className={styles['preview-info-value']}>
                  <span
                    style={{
                      fontSize: 12,
                      color: linkedMedia.length > 0 ? '#5fa657' : '#666',
                    }}
                  >
                    {linkedMedia.length > 0
                      ? (() => {
                          const pc = linkedMedia.filter(
                            (m: any) => m.mediaType === 'PHOTO',
                          ).length;
                          const vc = linkedMedia.filter(
                            (m: any) => m.mediaType === 'VIDEO',
                          ).length;
                          const parts: string[] = [];
                          if (pc) parts.push(`${pc} 张照片`);
                          if (vc) parts.push(`${vc} 个视频`);
                          return `已关联 ${parts.join('，')}`;
                        })()
                      : '未关联'}
                  </span>
                </span>
              </div>
              {/* 已关联媒体列表 */}
              {linkedMedia.length > 0 && (
                <div
                  style={{
                    marginTop: 16,
                    borderTop: '1px solid #262626',
                    paddingTop: 12,
                  }}
                >
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
                    已关联媒体
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      width: '100%',
                      overflow: 'hidden',
                    }}
                  >
                    {linkedMedia.map((m: any) => (
                      <div
                        key={m.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 16,
                          padding: '4px 10px',
                          borderBottom: '1px solid #333',
                          fontSize: 12,
                          maxWidth: '100%',
                          overflow: 'hidden',
                        }}
                      >
                        <Tag
                          color={m.mediaType === 'PHOTO' ? 'green' : 'blue'}
                          style={{ margin: 0, fontSize: 11, flexShrink: 0 }}
                        >
                          {m.mediaType === 'PHOTO' ? '照片' : '视频'}
                        </Tag>
                        <span
                          style={{
                            color: '#ccc',
                            fontFamily: "'JetBrains Mono',monospace",
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 120,
                          }}
                        >
                          #{m.media?.id}
                        </span>
                        <Button
                          type="link"
                          size="small"
                          danger
                          style={{
                            padding: '0 4px',
                            height: 'auto',
                            fontSize: 11,
                            flexShrink: 0,
                          }}
                          onClick={() => handleUnlinkMedia(m)}
                        >
                          取消关联
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 右翻页按钮 */}
            <span
              className={`${styles['preview-nav-btn']} ${
                styles['preview-nav-next']
              } ${
                currentImgIndex >= displayMedia.length - 1
                  ? styles['nav-disabled']
                  : ''
              }`}
              onClick={nextImage}
            >
              ›
            </span>

            {/* 计数器 */}
            {displayMedia.length > 1 && (
              <div className={styles['preview-counter']}>
                {currentImgIndex + 1} / {displayMedia.length}
              </div>
            )}
          </div>
        ) : null}
      </Modal>
      {/* 关联照片弹窗 */}
      <Modal
        title="关联照片/视频到帖子"
        open={linkModalOpen}
        onCancel={() => setLinkModalOpen(false)}
        onOk={async () => {
          if (!linkingPostId || linkMediaIds.length === 0) {
            message.warning('请输入照片/视频 ID');
            return;
          }
          try {
            const res = await batchLinkMedia({
              socialPostId: linkingPostId,
              items: linkMediaIds.map((id, i) => ({
                mediaId: id,
                mediaType: 'PHOTO',
                sortOrder: i,
              })),
            });
            message.success(
              `关联成功：${res.success} 条${
                res.failed > 0 ? `，${res.failed} 条失败` : ''
              }`,
            );
            setLinkModalOpen(false);
            // 重新拉取详情获取最新关联媒体
            if (detailRecord?.id === linkingPostId) {
              const updated = await getSyncPostDetail(linkingPostId).catch(
                () => null,
              );
              if (updated) setLinkedMedia(updated.linkedMedia || []);
            }
          } catch {
            message.error('关联失败');
          }
        }}
        okText="确认关联"
        width={440}
        className={styles['detail-modal']}
        destroyOnClose
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ color: '#999', fontSize: 13, marginBottom: 12 }}>
            请输入要关联的照片/视频 ID（用逗号分隔）
          </div>
          <Input.TextArea
            placeholder="例如：101, 102, 103"
            rows={3}
            style={{
              background: 'transparent',
              border: '1px solid #262626',
              borderRadius: 0,
              color: '#fff',
            }}
            onChange={(e) => {
              const ids = e.target.value
                .split(',')
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => !isNaN(n));
              setLinkMediaIds(ids);
            }}
          />
          {linkMediaIds.length > 0 && (
            <div
              style={{
                color: '#666',
                fontSize: 12,
                marginTop: 8,
                fontFamily: "'JetBrains Mono',monospace",
              }}
            >
              已识别 {linkMediaIds.length} 个媒体 ID
            </div>
          )}
        </div>
      </Modal>

      {/* ─── 定时同步弹窗 ─── */}
      <Modal
        title={
          <Space>
            <ClockCircleOutlined />
            定时同步设置
          </Space>
        }
        open={scheduleModalOpen}
        onCancel={() => setScheduleModalOpen(false)}
        onOk={handleSaveSchedule}
        confirmLoading={scheduleSaving}
        okText="保存"
        cancelText="取消"
        width={480}
        destroyOnClose
      >
        {scheduleLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            加载中...
          </div>
        ) : (
          <div style={{ paddingTop: 16 }}>
            {/* 开关 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 14, color: '#fff' }}>
                  启用定时增量同步
                </div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  开启后将按设定频率自动调用 /sync/run
                </div>
              </div>
              <Switch checked={scheduleEnabled} onChange={setScheduleEnabled} />
            </div>

            {/* 频率设置 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#bbb', marginBottom: 8 }}>
                执行频率
              </div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  min={1}
                  max={365}
                  value={scheduleIntervalValue}
                  onChange={(v) => setScheduleIntervalValue(v || 1)}
                  style={{ width: '40%' }}
                  disabled={!scheduleEnabled}
                />
                <Select
                  value={scheduleIntervalType}
                  onChange={setScheduleIntervalType}
                  style={{ width: '60%' }}
                  disabled={!scheduleEnabled}
                >
                  <Select.Option value="hour">小时</Select.Option>
                  <Select.Option value="day">天</Select.Option>
                  <Select.Option value="week">周</Select.Option>
                  <Select.Option value="month">月</Select.Option>
                  <Select.Option value="year">年</Select.Option>
                </Select>
              </Space.Compact>
              <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
                示例：选「1」+「天」= 每 1 天执行一次；选「3」+「小时」= 每 3
                小时执行一次
              </div>
            </div>

            {/* 上次执行信息 */}
            {scheduleLastRunAt && (
              <div
                style={{
                  fontSize: 12,
                  color: '#666',
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 6,
                }}
              >
                上次执行：{formatDateTime(scheduleLastRunAt)}
                {scheduleLastRunStatus && (
                  <span
                    style={{
                      marginLeft: 8,
                      color:
                        scheduleLastRunStatus === 'success'
                          ? '#5fa657'
                          : '#e85d5d',
                    }}
                  >
                    {scheduleLastRunStatus === 'success'
                      ? '成功'
                      : scheduleLastRunStatus}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SyncMgtPage;
