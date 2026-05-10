import React, { useState, useRef } from 'react';
import { Button, Modal, message, Progress, DatePicker } from 'antd';
import moment from 'moment';
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
  const [mode, setMode] = useState<'now' | 'scheduled' | null>(null);
  const [publishDate, setPublishDate] = useState<moment.Moment | null>(null);
  const publishAbortRef = useRef<AbortController | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 用 ref 持久化 submitting 状态，防止重渲染时丢失
  const submittingRef = useRef(false);

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
    setMode(null);
    setPublishDate(null);
    setChecking(true);
    try {
      const { checkDouyinLoginStatus } = require('@/services/wallpaper');
      const status = await checkDouyinLoginStatus();
      setLoggedIn(!!status?.loggedIn);
    } catch {
      // request 已统一处理错误提示，此处仅重置登录状态
      setLoggedIn(false);
    } finally {
      setChecking(false);
    }
  };

  const handleClose = () => {
    if (!publishAbortRef.current) {
      setCurrentItem(null);
    }
    setVisible(false);
    setLoggingIn(false);
    setMode(null);
    setPublishDate(null);
  };

  /** 弹窗关闭时：提交中则阻止关闭，否则正常关闭 */
  const handleModalClose = () => {
    // 使用 ref 检查（即使状态因重渲染丢失也能正确判断）
    if (submittingRef.current) {
      message.warning('正在发布中，请等待操作完成或点击取消按钮中断');
      return;
    }
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
      }
    } catch {
      // request 已统一处理错误提示
    } finally {
      setLoggingIn(false);
    }
  };

  const handlePublish = async (scheduledTime?: string) => {
    if (!currentItem) return;
    const abortController = new AbortController();
    publishAbortRef.current = abortController;
    setSubmitting(true);
    // 同步到 ref，防止重渲染丢失状态
    submittingRef.current = true;
    startProgress();

    // 立即插入一条"审核中"记录到发布列表（只提取纯数据字段，避免循环引用）
    const pendingRecord = addPendingPublish({
      tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      platform: 'douyin',
      wallpaperId: currentItem.id,
      wallpaper: {
        id: currentItem.id,
        title: currentItem.title,
        cover: currentItem.cover,
        images: currentItem.images,
      },
      title: currentItem.title,
    });

    try {
      const { syncWallPaperToDouyin } = require('@/services/wallpaper');
      const result = await syncWallPaperToDouyin(currentItem.id, {
        signal: abortController.signal,
        scheduledAt: scheduledTime || undefined,
      });
      stopProgress(100);
      message.success(result?.message || '发布到抖音图文成功', 4);
      // 更新为成功状态（刷新后端数据后会替换）
      updatePendingPublish(pendingRecord.tempId, { status: 'SUCCESS' });
      // 延迟关闭 Modal，确保用户看到"发布完成"进度条
      setTimeout(() => {
        setCurrentItem(null);
        setVisible(false);
      }, 800);
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
      // request 已统一处理错误提示，此处仅更新待发布记录状态
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
      submittingRef.current = false;
      publishAbortRef.current = null;
    }
  };

  const handleScheduledPublish = async () => {
    if (!currentItem) return;
    if (!publishDate) {
      message.warning('请选择定时发布时间');
      return;
    }
    if (publishDate.isBefore(moment())) {
      message.warning('发布时间必须晚于当前时间');
      return;
    }
    // 定时发布走同样的发布流程，只是带上时间参数（ISO 8601 带 Z 后缀，避免后端 new Date() 时区歧义）
    await handlePublish(publishDate.toISOString());
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
        // 移除 destroyOnClose，防止浏览器弹出时组件被销毁重建导致状态丢失
        maskClosable={false}
        keyboard={!submittingRef.current}
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
              {!mode ? (
                <>
                  <div style={{ color: '#666', marginBottom: 16 }}>
                    选择「立即发布」将立刻发布到抖音图文；选择「定时发布」将在指定日期
                    09:00 自动发布。
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div
                      style={{
                        flex: 1,
                        padding: 16,
                        border: '1px solid #e8e8e8',
                        borderRadius: 8,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                      onClick={() => setMode('now')}
                    >
                      <div style={{ fontSize: 24 }}>🚀</div>
                      <div style={{ fontWeight: 600, marginTop: 4 }}>
                        立即发布
                      </div>
                      <div
                        style={{ fontSize: 12, color: '#999', marginTop: 4 }}
                      >
                        立即发布到抖音图文
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        padding: 16,
                        border: '1px solid #e8e8e8',
                        borderRadius: 8,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                      onClick={() => setMode('scheduled')}
                    >
                      <div style={{ fontSize: 24 }}>📅</div>
                      <div style={{ fontWeight: 600, marginTop: 4 }}>
                        定时发布
                      </div>
                      <div
                        style={{ fontSize: 12, color: '#999', marginTop: 4 }}
                      >
                        选择日期后定时自动发布
                      </div>
                    </div>
                  </div>
                </>
              ) : mode === 'now' ? (
                <div>
                  {submitting && (
                    <div style={{ marginBottom: 16 }}>
                      <Progress
                        percent={Math.round(progress)}
                        status={progress >= 100 ? undefined : 'active'}
                        strokeColor="#25F4EE"
                        format={(pct) =>
                          pct! >= 100
                            ? '发布完成！'
                            : `正在发布... ${Math.round(pct!)}%`
                        }
                      />
                      <div
                        style={{ color: '#999', fontSize: 12, marginTop: 8 }}
                      >
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
                      <Button onClick={() => setMode(null)}>返回选择</Button>
                      <Button
                        type="primary"
                        className={styles['action-btn']}
                        loading={submitting}
                        onClick={() => handlePublish()}
                      >
                        确认立即发布
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {submitting && (
                    <div style={{ marginBottom: 16 }}>
                      <Progress
                        percent={Math.round(progress)}
                        status={progress >= 100 ? undefined : 'active'}
                        strokeColor="#25F4EE"
                        format={(pct) =>
                          pct! >= 100
                            ? '发布完成！'
                            : `正在处理... ${Math.round(pct!)}%`
                        }
                      />
                      <div
                        style={{ color: '#999', fontSize: 12, marginTop: 8 }}
                      >
                        {progress >= 100
                          ? '处理完成，正在关闭窗口...'
                          : '处理过程可能需要较长时间，您可以关闭此窗口，任务将在后台继续进行。'}
                      </div>
                    </div>
                  )}
                  <div style={{ marginBottom: submitting ? 16 : 12 }}>
                    选择定时发布时间
                  </div>
                  {!submitting && (
                    <>
                      <DatePicker
                        showTime={{ format: 'HH:mm' }}
                        placeholder="请选择"
                        style={{ width: '100%', marginBottom: 12 }}
                        value={publishDate}
                        disabledDate={(current) =>
                          current && current < moment().startOf('day')
                        }
                        onChange={(val) => setPublishDate(val)}
                      />
                      <div
                        style={{
                          fontSize: 12,
                          color: '#666',
                          marginBottom: 16,
                        }}
                      >
                        将在选定时间自动发布到抖音图文。
                      </div>
                    </>
                  )}
                  {!submitting && (
                    <div className={styles['btn-wrap']}>
                      <Button onClick={() => setMode(null)}>返回选择</Button>
                      <Button
                        type="primary"
                        className={styles['action-btn']}
                        loading={submitting}
                        onClick={handleScheduledPublish}
                      >
                        确认定时发布
                      </Button>
                    </div>
                  )}
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
