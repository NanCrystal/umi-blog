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

const DouyinTab: React.FC = () => {
  const [records, setRecords] = useState<PublishRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const fetchRecords = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getPublishRecords('douyin');
      setRecords(data);
    } catch (error: any) {
      if (!silent) {
        message.error(error?.message || '获取抖音发布记录失败');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const handleRetry = async (record: PublishRecord) => {
    setRetryingId(record.id);
    try {
      await retryPublishRecord(record.id);
      message.success('抖音重新发布已提交，请稍后刷新查看结果');
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

  if (loading && !records.length) {
    return (
      <div className={styles['schedule-empty']}>正在加载抖音发布记录...</div>
    );
  }

  if (!records.length) {
    return <div className={styles['schedule-empty']}>暂无抖音发布记录</div>;
  }

  return (
    <div className={styles['schedule-list']}>
      {records.map((record) => {
        const wallpaperTitle =
          record.wallpaper?.title || `壁纸 #${record.wallpaperId}`;
        const wallpaperCover = getImageUrl(record.wallpaper?.cover);
        const isSuccess = record.status === 'SUCCESS';

        return (
          <div key={record.id} className={styles['schedule-item']}>
            <div className={styles['schedule-item-main']}>
              <div className={styles['schedule-item-cover']}>
                {wallpaperCover ? (
                  <img src={wallpaperCover} alt={wallpaperTitle} />
                ) : (
                  <div className={styles['schedule-item-cover-placeholder']}>
                    {isSuccess ? '已发布' : '发布失败'}
                  </div>
                )}
              </div>
              <div className={styles['schedule-item-body']}>
                <div className={styles['schedule-item-top']}>
                  <div className={styles['schedule-item-title']}>
                    {wallpaperTitle}
                  </div>
                  <span
                    className={`${styles['schedule-status']} ${
                      isSuccess
                        ? styles['schedule-status-success']
                        : styles['schedule-status-danger']
                    }`}
                  >
                    {isSuccess ? '发布成功' : '发布失败'}
                  </span>
                </div>
                <div className={styles['schedule-item-meta']}>
                  <span>记录 ID：{record.id}</span>
                  <span>发布时间：{formatDateTime(record.createdAt)}</span>
                </div>
                {!isSuccess && record.errorMessage && (
                  <div className={styles['schedule-item-error']}>
                    {record.errorMessage}
                  </div>
                )}
              </div>
            </div>
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
          </div>
        );
      })}
    </div>
  );
};

export default DouyinTab;
