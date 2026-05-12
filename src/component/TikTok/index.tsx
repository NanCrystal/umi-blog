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
  const [qrImage, setQrImage] = useState<string>('');
  const [polling, setPolling] = useState(false);
  const pollingRef = useRef(false);
  /** QR 码大图弹窗 */
  const [qrModalVisible, setQrModalVisible] = useState(false);
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
    setQrImage('');
    try {
      const { douyinLogin, douyinLoginPoll } = require('@/services/wallpaper');
      const result: any = await douyinLogin();
      if (result?.qrImage) {
        setQrImage(result.qrImage);
        setQrModalVisible(true);
        // 开始轮询扫码状态
        setPolling(true);
        pollingRef.current = true;
        const pollTimer = setInterval(async () => {
          try {
            const status: any = await douyinLoginPoll();
            if (status?.loggedIn) {
              clearInterval(pollTimer);
              pollingRef.current = false;
              setPolling(false);
              setQrImage('');
              setQrModalVisible(false);
              message.success('抖音登录成功');
              setLoggedIn(true);
            }
          } catch {
            // 继续轮询
          }
        }, 3000);
        // 3分钟超时
        setTimeout(() => {
          clearInterval(pollTimer);
          if (pollingRef.current) {
            pollingRef.current = false;
            setPolling(false);
            setQrImage('');
            setQrModalVisible(false);
            message.warning('扫码超时，请重试');
          }
        }, 180_000);
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
    console.log('scheduledTime', scheduledTime);

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
    // 定时发布走同样的发布流程，只是带上时间参数
    // 使用 format() 保持本地时区（北京时间），不带 Z 后缀，
    // 避免后端 new Date() 将其误解析为 UTC 再做时区转换导致偏差
    await handlePublish(publishDate.format('YYYY-MM-DDTHH:mm:ss'));
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
              {qrImage ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <div
                    style={{ color: '#666', marginBottom: 16, fontSize: 14 }}
                  >
                    二维码已获取，请点击下方按钮打开大图扫码
                  </div>
                  <Button
                    type="primary"
                    size="large"
                    icon={<span>📱</span>}
                    onClick={() => setQrModalVisible(true)}
                  >
                    打开二维码大图
                  </Button>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    抖音未登录或 Cookie
                    已过期。点击下方按钮获取二维码，请使用抖音 App 扫码登录。
                  </div>
                  <div className={styles['btn-wrap']}>
                    <Button
                      className={styles['cancel-btn']}
                      onClick={handleClose}
                      disabled={loggingIn || polling}
                    >
                      取消
                    </Button>
                    <Button
                      type="primary"
                      className={styles['action-btn']}
                      loading={loggingIn}
                      disabled={polling}
                      onClick={handleLogin}
                    >
                      {polling ? '获取二维码...' : '扫码登录抖音'}
                    </Button>
                  </div>
                </>
              )}
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

      {/* ── QR 码大图弹窗 ── */}
      <Modal
        open={qrModalVisible}
        title={null}
        footer={null}
        width={900}
        centered
        maskClosable={false}
        onCancel={() => {
          setQrModalVisible(false);
          if (polling) {
            message.info('扫码窗口已关闭，二维码仍在等待扫描');
          }
        }}
        bodyStyle={{ padding: '24px 24px 16px', textAlign: 'center' }}
      >
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          抖音扫码登录
        </div>
        <img
          src={qrImage}
          alt="抖音扫码登录"
          style={{
            width: '100%',
            borderRadius: 12,
            border: '2px solid #e0e0e0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        />
        <div
          style={{
            color: '#666',
            fontSize: 14,
            marginTop: 16,
            padding: '10px 16px',
            background: '#f5f5f5',
            borderRadius: 8,
          }}
        >
          {polling ? (
            <span>
              ⏳ 等待扫码中...（3分钟内有效）
              <br />
              <span style={{ fontSize: 12, color: '#999' }}>
                请使用抖音 App 扫描上方二维码
              </span>
            </span>
          ) : (
            '请使用抖音 App 扫描上方二维码登录'
          )}
        </div>
      </Modal>
    </>
  );
};

export default TikTokComponent;
