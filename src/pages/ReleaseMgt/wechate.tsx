import React, { useEffect, useState, useCallback } from 'react';
import { history } from 'umi';

import { Button, Modal, message, Pagination } from 'antd';
import styles from './index.less';
import {
  cancelWechatPublishSchedule,
  getWechatPublishSchedules,
  syncWallPaperToWechatDraft,
  WallPaperItem,
  WechatPublishSchedule,
} from '@/services/wallpaper';

const formatScheduleDisplay = (dateText: string) => `${dateText} 09:00`;

const getScheduleStatusMeta = (status?: string) => {
  switch (status) {
    case 'PENDING':
      return { text: '待发布', tone: 'pending' };
    case 'PUBLISHING':
      return { text: '发布中', tone: 'processing' };
    case 'SUBMITTED':
      return { text: '已提交到公众号', tone: 'submitted' };
    case 'PUBLISHED':
      return { text: '已发布', tone: 'success' };
    case 'FAILED':
      return { text: '发布失败', tone: 'danger' };
    case 'CANCELLED':
      return { text: '已取消', tone: 'muted' };
    default:
      return { text: status || '未知状态', tone: 'muted' };
  }
};

const canCancelSchedule = (status?: string) =>
  status === 'PENDING' || status === 'FAILED';

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

interface WechatTabProps {
  wallpaperTitle?: string;
  active?: boolean;
}

const WechatTab: React.FC<WechatTabProps> = ({
  wallpaperTitle,
  active = true,
}) => {
  const [schedules, setSchedules] = useState<WechatPublishSchedule[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cancelingScheduleId, setCancelingScheduleId] = useState<number | null>(
    null,
  );
  const [syncDraftLoadingId, setSyncDraftLoadingId] = useState<number | null>(
    null,
  );
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const fetchSchedules = useCallback(
    async (
      silent = false,
      page = pagination.current,
      pageSize = pagination.pageSize,
    ) => {
      if (!silent) setLoading(true);
      try {
        const res = await getWechatPublishSchedules(
          wallpaperTitle || undefined,
          page,
          pageSize,
        );
        setSchedules(res.list || []);
        setTotal(res.total);
        setPagination({ current: page, pageSize });
      } catch (error: any) {
        if (!silent) {
          message.error(
            error?.data?.message ||
              error?.info?.message ||
              error?.message ||
              '获取公众号发布排期失败，请稍后重试',
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [wallpaperTitle],
  );

  useEffect(() => {
    void fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    if (active) {
      void fetchSchedules(true);
    }
  }, [active, fetchSchedules]);

  const handlePageChange = (page: number, pageSize: number) => {
    void fetchSchedules(false, page, pageSize);
  };

  const handleViewWallpaper = (wallpaper?: WallPaperItem) => {
    if (!wallpaper) {
      message.info('该排期未返回壁纸详情，请回到壁纸列表查看');
      return;
    }
    history.push('/wallpaper/detail', { data: wallpaper });
  };

  const handleCancelSchedule = (schedule: WechatPublishSchedule) => {
    Modal.confirm({
      title: '确认取消排期',
      content: `确定要取消 ${formatScheduleDisplay(
        schedule.publishDate,
      )} 的公众号发布计划吗？`,
      okText: '取消排期',
      cancelText: '返回',
      okButtonProps: { danger: true },
      onOk: async () => {
        setCancelingScheduleId(schedule.id);
        try {
          await cancelWechatPublishSchedule(schedule.id);
          message.success('公众号发布排期已取消');
          await fetchSchedules(true);
        } catch (error: any) {
          message.error(
            error?.data?.message ||
              error?.info?.message ||
              error?.message ||
              '取消公众号发布排期失败，请重试',
          );
        } finally {
          setCancelingScheduleId(null);
        }
      },
    });
  };

  const handleSyncDraft = async (schedule: WechatPublishSchedule) => {
    setSyncDraftLoadingId(schedule.id);
    try {
      const result = await syncWallPaperToWechatDraft(schedule.wallpaperId);
      message.success(
        `「${
          result?.title ||
          schedule.wallpaper?.title ||
          `壁纸 #${schedule.wallpaperId}`
        }」已同步到公众号草稿箱`,
      );
    } catch (error: any) {
      message.error(
        error?.data?.message ||
          error?.info?.message ||
          error?.message ||
          '同步到公众号草稿箱失败，请重试',
      );
    } finally {
      setSyncDraftLoadingId(null);
    }
  };

  if (loading && !schedules.length) {
    return (
      <div className={styles['schedule-empty']}>正在加载公众号排期...</div>
    );
  }

  if (!schedules.length && !loading) {
    return <div className={styles['schedule-empty']}>暂无公众号发布排期</div>;
  }

  return (
    <>
      <div className={styles['schedule-list']}>
        {schedules.map((schedule) => {
          const statusMeta = getScheduleStatusMeta(schedule.status);
          // 壁纸是否已被删除（无关联壁纸实体）
          const isWallpaperDeleted = !schedule.wallpaper;
          const wallpaperTitle =
            schedule.wallpaper?.title || `壁纸 #${schedule.wallpaperId}`;
          const wallpaperCover = getImageUrl(schedule.wallpaper?.cover);
          const latestTime =
            schedule.publishedAt ||
            schedule.submittedAt ||
            schedule.updatedAt ||
            schedule.scheduledAt;

          return (
            <div
              key={schedule.id}
              className={`${styles['schedule-item']} ${
                isWallpaperDeleted ? styles['schedule-item-deleted'] : ''
              }`}
            >
              <div className={styles['schedule-item-main']}>
                <div className={styles['schedule-item-cover']}>
                  {wallpaperCover ? (
                    <img src={wallpaperCover} alt={wallpaperTitle} />
                  ) : (
                    <div className={styles['schedule-item-cover-placeholder']}>
                      {isWallpaperDeleted ? '已删除' : '待发布'}
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
                        styles[`schedule-status-${statusMeta.tone}`]
                      }`}
                    >
                      {statusMeta.text}
                    </span>
                  </div>
                  <div className={styles['schedule-item-meta']}>
                    <span>
                      发布日期：{formatScheduleDisplay(schedule.publishDate)}
                    </span>
                    <span>计划 ID：{schedule.id}</span>
                    <span>发布状态：{statusMeta.text}</span>
                    <span>最后更新：{formatDateTime(latestTime)}</span>
                    {schedule.publishId ? (
                      <span>发布单号：{schedule.publishId}</span>
                    ) : null}
                  </div>
                  {schedule.errorMessage ? (
                    <div className={styles['schedule-item-error']}>
                      {schedule.errorMessage}
                    </div>
                  ) : (
                    <div className={styles['schedule-item-desc']}>
                      {schedule.status === 'SUBMITTED'
                        ? '已进入公众号发布队列，等待平台返回正式结果。'
                        : '系统会在所选日期 09:00 自动提交公众号正式发布。'}
                    </div>
                  )}
                </div>
              </div>
              {!isWallpaperDeleted && (
                <div className={styles['schedule-item-actions']}>
                  <Button
                    size="small"
                    onClick={() => handleViewWallpaper(schedule.wallpaper)}
                  >
                    查看壁纸
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleSyncDraft(schedule)}
                    loading={syncDraftLoadingId === schedule.id}
                  >
                    同步草稿
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={() => handleCancelSchedule(schedule)}
                    loading={cancelingScheduleId === schedule.id}
                    disabled={!canCancelSchedule(schedule.status)}
                  >
                    取消排期
                  </Button>
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
    </>
  );
};

export default WechatTab;
