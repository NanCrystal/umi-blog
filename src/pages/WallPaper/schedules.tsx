import React, { useEffect, useState } from 'react';
import { history } from 'umi';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Modal, message } from 'antd';
import styles from './schedules.less';
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

const WechatPublishSchedulesPage: React.FC = () => {
  const [schedules, setSchedules] = useState<WechatPublishSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelingScheduleId, setCancelingScheduleId] = useState<number | null>(
    null,
  );
  const [syncDraftLoadingId, setSyncDraftLoadingId] = useState<number | null>(
    null,
  );
  const isAdmin = localStorage.getItem('token') === '121414';

  const fetchSchedules = async (silent = false) => {
    if (!isAdmin) {
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    try {
      const data = await getWechatPublishSchedules();
      setSchedules(data);
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
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchSchedules();
  }, []);

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

  const renderContent = () => {
    if (!isAdmin) {
      return (
        <div className={styles['schedule-empty']}>
          仅管理员可查看公众号已排期列表
        </div>
      );
    }

    if (loading && !schedules.length) {
      return (
        <div className={styles['schedule-empty']}>正在加载公众号排期...</div>
      );
    }

    if (!schedules.length) {
      return <div className={styles['schedule-empty']}>暂无公众号发布排期</div>;
    }

    return (
      <div className={styles['schedule-list']}>
        {schedules.map((schedule) => {
          const statusMeta = getScheduleStatusMeta(schedule.status);
          const wallpaperTitle =
            schedule.wallpaper?.title || `壁纸 #${schedule.wallpaperId}`;
          const wallpaperCover = getImageUrl(schedule.wallpaper?.cover);
          const latestTime =
            schedule.publishedAt ||
            schedule.submittedAt ||
            schedule.updatedAt ||
            schedule.scheduledAt;

          return (
            <div key={schedule.id} className={styles['schedule-item']}>
              <div className={styles['schedule-item-main']}>
                <div className={styles['schedule-item-cover']}>
                  {wallpaperCover ? (
                    <img src={wallpaperCover} alt={wallpaperTitle} />
                  ) : (
                    <div className={styles['schedule-item-cover-placeholder']}>
                      待发布
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
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles['schedule-page']}>
      <div className={styles['schedule-page-header']}>
        <div>
          <div className={styles['schedule-page-eyebrow']}>WallPaper Admin</div>
          <div className={styles['schedule-page-title']}>公众号已排期列表</div>
          <div className={styles['schedule-page-desc']}>
            集中查看公众号正式发布计划，支持刷新状态和取消未提交排期。
          </div>
        </div>
        <div className={styles['schedule-page-actions']}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => history.push('/wallpaper')}
          >
            返回壁纸列表
          </Button>
          {isAdmin ? (
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchSchedules()}
              loading={loading}
            >
              刷新排期
            </Button>
          ) : null}
        </div>
      </div>

      <div className={styles['schedule-board']}>{renderContent()}</div>
    </div>
  );
};

export default WechatPublishSchedulesPage;
