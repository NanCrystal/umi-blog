import React, { useEffect, useState, useCallback } from 'react';
import { history } from 'umi';
import { Button, message, Tag, Pagination } from 'antd';
import styles from './index.less';
import {
  getPublishRecords,
  retryPublishRecord,
  PublishRecord,
  WallPaperItem,
} from '@/services/wallpaper';

type RecordStatus = 'SUCCESS' | 'FAILED' | 'PENDING';

const platformLabels: Record<string, string> = {
  wechat: '微信',
  douyin: '抖音',
  xiaohongshu: '小红书',
};

const platformColors: Record<string, string> = {
  wechat: 'green',
  douyin: 'blue',
  xiaohongshu: 'red',
};

const getImageUrl = (path?: string) => {
  if (!path) return '';
  return path.startsWith('http') ? path : `https://cdn.tauol.online${path}`;
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '--';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(
    2,
    '0',
  )}:${String(d.getMinutes()).padStart(2, '0')}`;
};

interface AllTabProps {
  wallpaperTitle?: string;
  active?: boolean;
}

const AllTab: React.FC<AllTabProps> = ({ wallpaperTitle, active = true }) => {
  const [records, setRecords] = useState<PublishRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const fetchRecords = useCallback(
    async (
      silent = false,
      page = pagination.current,
      pageSize = pagination.pageSize,
    ) => {
      if (!silent) setLoading(true);
      try {
        const res = await getPublishRecords(
          undefined,
          undefined,
          wallpaperTitle || undefined,
          page,
          pageSize,
        );
        setRecords(res.list || []);
        setTotal(res.total);
        setPagination({ current: page, pageSize });
      } catch (error: any) {
        if (!silent) {
          message.error(error?.message || '获取发布记录失败');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [wallpaperTitle],
  );

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (active) {
      void fetchRecords(true);
    }
  }, [active, fetchRecords]);

  const handlePageChange = (page: number, pageSize: number) => {
    void fetchRecords(false, page, pageSize);
  };

  const handleRetry = async (record: PublishRecord) => {
    setRetryingId(record.id);
    try {
      await retryPublishRecord(record.id);
      message.success('重新发布已提交，请稍后刷新查看结果');
      await fetchRecords(true);
    } catch (error: any) {
      message.error(error?.message || '重新发布失败，请稍后重试');
    } finally {
      setRetryingId(null);
    }
  };

  const handleViewWallpaper = (wallpaper?: WallPaperItem | null) => {
    if (!wallpaper) {
      message.info('该记录未返回壁纸详情，请回到壁纸列表查看');
      return;
    }
    history.push('/wallpaper/detail', { data: wallpaper });
  };

  if (loading && !records.length) {
    return <div className={styles['schedule-empty']}>正在加载发布记录...</div>;
  }

  if (!records.length && !loading) {
    return <div className={styles['schedule-empty']}>暂无发布记录</div>;
  }

  return (
    <div>
      <div className={styles['schedule-list']}>
        {records.map((record) => {
          const isWallpaperDeleted =
            !record.wallpaper || !!(record.wallpaper as any)?.deletedAt;
          const recordWallpaperTitle =
            record.wallpaper?.title ||
            record.wallpaperTitle ||
            `壁纸 #${record.wallpaperId ?? '—'}`;
          const wallpaperCover = getImageUrl(
            record.wallpaper?.cover || record.wallpaperCover || undefined,
          );
          const status: RecordStatus =
            (record.status as RecordStatus) || 'PENDING';
          const isPending = status === 'PENDING';
          const isSuccess = status === 'SUCCESS';
          const isFailed = status === 'FAILED';
          const isScheduled = !!record.scheduledAt;
          const platformLabel =
            platformLabels[record.platform] || record.platform;
          const platformColor = platformColors[record.platform] || 'default';

          return (
            <div
              key={record.id}
              className={`${styles['schedule-item']} ${
                isWallpaperDeleted ? styles['schedule-item-deleted'] : ''
              }`}
            >
              <div className={styles['schedule-item-main']}>
                <div className={styles['schedule-item-cover']}>
                  {wallpaperCover ? (
                    <img src={wallpaperCover} alt={recordWallpaperTitle} />
                  ) : (
                    <div className={styles['schedule-item-cover-placeholder']}>
                      {isSuccess
                        ? '已发布'
                        : isPending
                        ? '审核中'
                        : isWallpaperDeleted
                        ? '已删除'
                        : '发布失败'}
                    </div>
                  )}
                </div>
                <div className={styles['schedule-item-body']}>
                  <div className={styles['schedule-item-top']}>
                    <div className={styles['schedule-item-title']}>
                      {recordWallpaperTitle}
                      {isWallpaperDeleted && (
                        <span className={styles['schedule-deleted-tag']}>
                          已删除
                        </span>
                      )}
                    </div>
                    <Tag color={platformColor} style={{ marginRight: 0 }}>
                      {platformLabel}
                    </Tag>
                    <span
                      className={`${styles['schedule-status']} ${
                        isSuccess
                          ? styles['schedule-status-success']
                          : isFailed
                          ? styles['schedule-status-danger']
                          : styles['schedule-status-pending']
                      }`}
                    >
                      {isSuccess
                        ? isScheduled
                          ? '定时发布成功'
                          : '发布成功'
                        : isPending
                        ? '审核中'
                        : '发布失败'}
                    </span>
                  </div>
                  <div className={styles['schedule-item-meta']}>
                    <span>记录 ID：{record.id}</span>
                    <span>创建时间：{formatDateTime(record.createdAt)}</span>
                    {isScheduled && (
                      <span>
                        定时发布时间：{formatDateTime(record.scheduledAt)}
                      </span>
                    )}
                  </div>
                  {isFailed && record.errorMessage && (
                    <div className={styles['schedule-item-error']}>
                      {record.errorMessage}
                    </div>
                  )}
                </div>
              </div>
              {!isPending && !isWallpaperDeleted && (
                <div className={styles['schedule-item-actions']}>
                  <Button
                    size="small"
                    onClick={() => handleViewWallpaper(record.wallpaper)}
                  >
                    查看壁纸
                  </Button>
                  {!isSuccess && (
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => handleRetry(record)}
                      loading={retryingId === record.id}
                    >
                      重新发布
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {total > pagination.pageSize && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={total}
            showSizeChanger={false}
            onChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default AllTab;
