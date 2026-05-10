import React, { useEffect, useState, useCallback } from 'react';
import { history } from 'umi';
import { Button, message } from 'antd';
import styles from './index.less';
import {
  getPublishRecords,
  retryPublishRecord,
  PublishRecord,
  WallPaperItem,
} from '@/services/wallpaper';
import {
  getPendingPublishes,
  subscribePendingPublish,
  removePendingPublish,
  PendingPublishItem,
} from './publishPendingStore';

// 扩展状态类型，支持审核中
type RecordStatus = 'SUCCESS' | 'FAILED' | 'PENDING';

// 合并类型：API记录 或 本地待发布记录
type MergedRecord =
  | (PublishRecord & { tempId?: undefined })
  | (PendingPublishItem & { id: number });

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

const XiaohongshuTab: React.FC<{ active?: boolean }> = ({ active = true }) => {
  const [records, setRecords] = useState<PublishRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  // 本地待发布记录（点击发布时立即显示）
  const [pendingList, setPendingList] = useState<PendingPublishItem[]>(
    getPendingPublishes(),
  );

  // 订阅本地待发布状态变化
  useEffect(() => {
    return subscribePendingPublish(() => {
      setPendingList([...getPendingPublishes()]);
    });
  }, []);

  // 合并：pending 在前，API 记录在后（只取当前平台的 pending 记录）
  const mergedRecords: MergedRecord[] = [
    ...pendingList
      .filter((p) => p.platform === 'xiaohongshu')
      .map((p) => ({ ...p, id: -1 } as MergedRecord)),
    ...records,
  ];

  /** 用后端正式数据替换/清理已完成的本地待发布记录 */
  const reconcilePendingWithServer = (serverRecords: PublishRecord[]) => {
    const serverWallpaperIds = new Set(serverRecords.map((r) => r.wallpaperId));
    const pending = getPendingPublishes();
    // 后端已有对应 wallpaperId 的记录，移除本地 pending（无论成功或失败）
    pending.forEach((p) => {
      if (serverWallpaperIds.has(p.wallpaperId)) {
        removePendingPublish(p.tempId);
      }
    });
    // 同步更新 state
    setPendingList([...getPendingPublishes()]);
  };

  const fetchRecords = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getPublishRecords('xiaohongshu');
      setRecords(data);
      // 用后端数据替换已完成的本地待发布记录
      reconcilePendingWithServer(data);
    } catch (error: any) {
      if (!silent) {
        message.error(error?.message || '获取小红书发布记录失败');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // 首次挂载 + tab 切回时刷新
  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (active) {
      // 切换到该 tab 时静默刷新
      void fetchRecords(true);
    }
  }, [active, fetchRecords]);

  const handleRetry = async (record: PublishRecord) => {
    setRetryingId(record.id);
    try {
      await retryPublishRecord(record.id);
      message.success('小红书重新发布已提交，请稍后刷新查看结果');
      await fetchRecords(true);
    } catch (error: any) {
      message.error(error?.message || '重新发布失败，请稍后重试');
    } finally {
      setRetryingId(null);
    }
  };

  const handleViewWallpaper = (wallpaper?: WallPaperItem) => {
    if (!wallpaper) {
      message.info('该记录未返回壁纸详情，请回到壁纸列表查看');
      return;
    }
    history.push('/wallpaper/detail', { data: wallpaper });
  };

  if (loading && !mergedRecords.length) {
    return (
      <div className={styles['schedule-empty']}>正在加载小红书发布记录...</div>
    );
  }

  if (!mergedRecords.length) {
    return <div className={styles['schedule-empty']}>暂无小红书发布记录</div>;
  }

  // 判断是否为本地待发布记录
  const isPendingRecord = (
    record: MergedRecord,
  ): record is PendingPublishItem & { id: number } => 'tempId' in record;

  return (
    <div className={styles['schedule-list']}>
      {mergedRecords.map((record) => {
        const pending = isPendingRecord(record);
        // 壁纸是否已被删除（非本地记录 + 无关联壁纸实体 或 壁纸已软删除）
        const isWallpaperDeleted =
          !pending && (!record.wallpaper || !!record.wallpaper?.deletedAt);
        const wallpaperTitle = pending
          ? record.title
          : record.wallpaper?.title ||
            record.wallpaperTitle ||
            `壁纸 #${record.wallpaperId ?? '—'}`;
        const wallpaperCover = pending
          ? getImageUrl(record.wallpaper?.cover)
          : getImageUrl(
              record.wallpaper?.cover ||
                (record as PublishRecord).wallpaperCover ||
                undefined,
            );
        const status: RecordStatus =
          (record.status as RecordStatus) || 'PENDING';
        const isPending = status === 'PENDING';
        const isSuccess = status === 'SUCCESS';
        const isFailed = status === 'FAILED';

        return (
          <div
            key={pending ? (record as any).tempId! : record.id}
            className={`${styles['schedule-item']} ${
              isWallpaperDeleted ? styles['schedule-item-deleted'] : ''
            }`}
          >
            <div className={styles['schedule-item-main']}>
              <div className={styles['schedule-item-cover']}>
                {(pending && wallpaperCover) || (!pending && wallpaperCover) ? (
                  <img src={wallpaperCover} alt={wallpaperTitle} />
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
                    {wallpaperTitle}
                    {isWallpaperDeleted && (
                      <span className={styles['schedule-deleted-tag']}>
                        已删除
                      </span>
                    )}
                  </div>
                  <span
                    className={`${styles['schedule-status']} ${
                      isSuccess
                        ? styles['schedule-status-success']
                        : isFailed
                        ? styles['schedule-status-danger']
                        : styles['schedule-status-pending']
                    }`}
                  >
                    {isSuccess ? '发布成功' : isPending ? '审核中' : '发布失败'}
                  </span>
                </div>
                <div className={styles['schedule-item-meta']}>
                  <span>记录 ID：{pending ? '本地' : record.id}</span>
                  <span>发布时间：{formatDateTime(record.createdAt)}</span>
                </div>
                {isFailed &&
                  'errorMessage' in record &&
                  record.errorMessage && (
                    <div className={styles['schedule-item-error']}>
                      {record.errorMessage}
                    </div>
                  )}
              </div>
            </div>
            {/* 审核中、本地待发布、壁纸已删除时隐藏操作按钮 */}
            {!isPending && !pending && !isWallpaperDeleted && (
              <div className={styles['schedule-item-actions']}>
                <Button
                  size="small"
                  onClick={() =>
                    handleViewWallpaper(
                      'wallpaper' in record
                        ? record.wallpaper ?? undefined
                        : undefined,
                    )
                  }
                >
                  查看壁纸
                </Button>
                {!isSuccess && (
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => handleRetry(record)}
                    loading={retryingId === (pending ? -1 : record.id)}
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
  );
};

export default XiaohongshuTab;
