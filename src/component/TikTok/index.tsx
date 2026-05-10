import React, { useState, useRef } from 'react';
import { Button, Modal, message, Progress } from 'antd';
import { isTimeoutError } from '@/utils/utils';
import {
  addPendingPublish,
  updatePendingPublish,
} from '@/pages/ReleaseMgt/publishPendingStore';
import styles from './index.less';

const TikTokComponent: React.FC<any> = ({ item }) => {
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const publishAbortRef = useRef<AbortController | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 启动模拟进度：从 0 递增到 90%，接口返回后再跳 100% */
  const startProgress = () => {
    setProgress(0);
    // 先快速跳到 10%
    setTimeout(() => setProgress(10), 100);
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressTimerRef.current!);
          return prev;
        }
        // 越接近 90% 增速越慢
        const step =
          prev < 40
            ? Math.random() * 8 + 4
            : prev < 70
            ? Math.random() * 5 + 2
            : Math.random() * 2 + 0.5;
        return Math.min(90, prev + step);
      });
    }, 600);
  };

  /** 停止模拟进度 */
  const stopProgress = (finalPercent?: number) => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (finalPercent !== undefined) setProgress(finalPercent);
  };

  const handleOpen = async (data: any) => {
    setCurrentItem(data);
    setVisible(true);
    setSubmitting(false);
    setChecking(true);
    try {
      const { checkDouyinLoginStatus } = require('@/services/wallpaper');
      const status = await checkDouyinLoginStatus();
      setLoggedIn(!!status?.loggedIn);
    } catch {
      setLoggedIn(false);
    } finally {
      setChecking(false);
    }
  };

  const handleClose = () => {
    // 关闭弹窗但不中断正在进行的发布请求
    if (!publishAbortRef.current) {
      setCurrentItem(null);
    }
    setVisible(false);
    setLoggingIn(false);
  };

  /** 弹窗关闭时重置进度（不中断请求） */
  const handleModalClose = () => {
    // 进度重置但不清除定时器（请求仍在后台执行）
    stopProgress(0);
    handleClose();
  };

  const handleLogin = async () => {
    setLoggingIn(true);
    try {
      const { douyinLogin } = require('@/services/wallpaper');
      const result = await douyinLogin();
      if (result?.success) {
        message.success('抖音登录成功');
        setLoggedIn(true);
      } else {
        message.error('抖音登录失败，请重试');
      }
    } catch (error: any) {
      message.error(error?.data?.message || error?.message || '抖音登录失败');
    } finally {
      setLoggingIn(false);
    }
  };

  const handlePublish = async () => {
    if (!currentItem) return;
    const abortController = new AbortController();
    publishAbortRef.current = abortController;
    setSubmitting(true);
    startProgress();

    // 立即插入一条"审核中"记录到发布列表
    const pendingRecord = addPendingPublish({
      tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      platform: 'douyin',
      wallpaperId: currentItem.id,
      wallpaper: currentItem,
      title: currentItem.title,
    });

    try {
      const { syncWallPaperToDouyin } = require('@/services/wallpaper');
      const result = await syncWallPaperToDouyin(currentItem.id, {
        signal: abortController.signal,
      });
      stopProgress(100);
      message.success(
        `「${result?.title || currentItem.title}」已发布到抖音图文`,
      );
      // 更新为成功状态（刷新后端数据后会替换）
      updatePendingPublish(pendingRecord.tempId, { status: 'SUCCESS' });
      setCurrentItem(null);
      setVisible(false);
    } catch (error: any) {
      if (abortController.signal.aborted) return;
      stopProgress(0);
      if (isTimeoutError(error)) {
        message.warning(
          '抖音发布请求已发出，处理时间较长，请稍后到抖音创作者中心确认结果',
          5,
        );
        return;
      }
      message.error(
        error?.data?.message ||
          error?.info?.message ||
          error?.message ||
          '同步到抖音图文失败，请重试',
      );
      updatePendingPublish(pendingRecord.tempId, {
        status: 'FAILED',
        errorMessage:
          error?.data?.message ||
          error?.info?.message ||
          error?.message ||
          '发布失败',
      });
    } finally {
      setSubmitting(false);
      publishAbortRef.current = null;
    }
  };

  React.useImperativeHandle(item?._ref, () => ({ open: handleOpen }), []);

  if (item?._ref) return null;

  return (
    <>
      <Button type="link" onClick={() => handleOpen(item)}>
        抖音
      </Button>
      <Modal
        open={visible}
        title="同步到抖音图文"
        footer={null}
        destroyOnClose
        maskClosable={!submitting}
        onCancel={handleModalClose}
      >
        <div>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>
            {currentItem
              ? `将「${currentItem.title}」发布到抖音图文`
              : '发布到抖音图文'}
          </div>
          {checking ? (
            <div style={{ color: '#666' }}>正在检查抖音登录状态...</div>
          ) : !loggedIn ? (
            <div>
              <div style={{ marginBottom: 16 }}>
                抖音未登录或 Cookie
                已过期。点击下方按钮将弹出浏览器窗口，请使用抖音 App
                扫码登录，登录成功后即可发布图文。
              </div>
              <div className={styles['btn-wrap']}>
                <Button
                  className={styles['cancel-btn']}
                  onClick={handleClose}
                  disabled={loggingIn}
                >
                  取消
                </Button>
                <Button
                  type="primary"
                  className={styles['action-btn']}
                  loading={loggingIn}
                  onClick={handleLogin}
                >
                  扫码登录抖音
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {submitting && (
                <div style={{ marginBottom: 16 }}>
                  <Progress
                    percentPosition={{ align: 'start', type: 'inner' }}
                    percent={Math.round(progress)}
                    status={progress >= 100 ? undefined : 'active'}
                    strokeColor="#25F4EE"
                    format={(pct) =>
                      pct! >= 100
                        ? '发布完成！'
                        : `正在发布... ${Math.round(pct!)}%`
                    }
                  />
                  <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
                    {progress >= 100
                      ? '发布完成，正在关闭窗口...'
                      : '发布过程可能需要较长时间，您可以关闭此窗口，发布将在后台继续进行。'}
                  </div>
                </div>
              )}
              <div style={{ marginBottom: submitting ? 16 : 0 }}>
                将以图文形式发布到抖音，包含封面在内的{' '}
                {currentItem?.images?.length
                  ? currentItem.images.length + 1
                  : 1}{' '}
                张图片。发布后可在抖音创作者中心查看。
              </div>
              {!submitting && (
                <div className={styles['btn-wrap']}>
                  <Button
                    className={styles['cancel-btn']}
                    onClick={handleClose}
                  >
                    取消
                  </Button>
                  <Button
                    type="primary"
                    className={styles['action-btn']}
                    loading={submitting}
                    onClick={handlePublish}
                  >
                    确认发布到抖音
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default TikTokComponent;
