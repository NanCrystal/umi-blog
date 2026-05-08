import React, { useEffect, useMemo, useState } from 'react';
import styles from './index.less';
import { history } from 'umi';
import { Button, Modal, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CalendarOutlined } from '@ant-design/icons';
import {
  getWallPaperList,
  deleteWallPaper,
  syncWallPaperToWechatDraft,
  scheduleWallPaperWechatPublish,
  checkDouyinLoginStatus,
  douyinLogin,
  syncWallPaperToDouyin,
  checkXiaohongshuLoginStatus,
  xiaohongshuLogin,
  syncWallPaperToXiaohongshu,
  WallPaperItem,
} from '@/services/wallpaper';

const formatDateInputValue = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
};

const getTodayDateString = () => formatDateInputValue(new Date());

const getDefaultPublishDate = () => {
  const now = new Date();
  const nextDate = new Date(now);

  if (now.getHours() >= 9) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  return formatDateInputValue(nextDate);
};

const formatScheduleDisplay = (dateText: string) => `${dateText} 09:00`;

const isTimeoutError = (error: any) => {
  const errorMessage = `${error?.message || ''}`.toLowerCase();
  return (
    error?.name === 'TimeoutError' ||
    error?.type === 'Timeout' ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out')
  );
};

const WallPaperMgt: React.FC = () => {
  const [list, setList] = useState<WallPaperItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── 微信同步 State ── */
  const [syncVisible, setSyncVisible] = useState(false);
  const [syncSubmitting, setSyncSubmitting] = useState(false);
  const [syncMode, setSyncMode] = useState<'draft' | 'publish' | null>(null);
  const [publishDate, setPublishDate] = useState(getDefaultPublishDate());
  const [currentSyncItem, setCurrentSyncItem] = useState<WallPaperItem | null>(
    null,
  );

  /* ── 抖音同步 State ── */
  const [douyinModalVisible, setDouyinModalVisible] = useState(false);
  const [douyinSubmitting, setDouyinSubmitting] = useState(false);
  const [douyinLoggedIn, setDouyinLoggedIn] = useState(false);
  const [douyinChecking, setDouyinChecking] = useState(false);
  const [douyinLoggingIn, setDouyinLoggingIn] = useState(false);

  /* ── 小红书同步 State ── */
  const [xhsModalVisible, setXhsModalVisible] = useState(false);
  const [xhsSubmitting, setXhsSubmitting] = useState(false);
  const [xhsLoggedIn, setXhsLoggedIn] = useState(false);
  const [xhsChecking, setXhsChecking] = useState(false);
  const [xhsLoggingIn, setXhsLoggingIn] = useState(false);

  const fetchList = () => {
    setLoading(true);
    getWallPaperList()
      .then((res: any) => {
        const data = Array.isArray(res) ? res : res?.data || [];
        setList(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleEdit = (e: React.MouseEvent, item: WallPaperItem) => {
    e.stopPropagation();
    history.push('/wallpaper/edit', { from: 'edit', data: item });
  };

  const handleDelete = (e: React.MouseEvent, item: WallPaperItem) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除「${item.title}」吗？删除后无法恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteWallPaper(item.id);
          message.success('删除成功');
          fetchList();
        } catch {
          message.error('删除失败，请重试');
        }
      },
    });
  };

  const handleAdd = () => {
    history.push('/wallpaper/edit', { from: 'add' });
  };

  /* ── 微信同步 ── */

  const handleOpenSync = (item: WallPaperItem) => {
    setCurrentSyncItem(item);
    setSyncMode(null);
    setPublishDate(getDefaultPublishDate());
    setSyncVisible(true);
  };

  const handleCloseSync = () => {
    setSyncVisible(false);
    setCurrentSyncItem(null);
    setSyncMode(null);
    setPublishDate(getDefaultPublishDate());
    setSyncSubmitting(false);
  };

  const handleDraftSync = async () => {
    if (!currentSyncItem) {
      return;
    }

    setSyncSubmitting(true);
    try {
      const result = await syncWallPaperToWechatDraft(currentSyncItem.id);
      message.success(
        `「${result?.title || currentSyncItem.title}」已同步到公众号草稿箱`,
      );
      handleCloseSync();
    } catch (error: any) {
      if (isTimeoutError(error)) {
        message.warning(
          '同步请求已发出，公众号处理时间较长，请稍后到草稿箱确认结果',
          5,
        );
        handleCloseSync();
        return;
      }

      message.error(
        error?.data?.message ||
          error?.info?.message ||
          error?.message ||
          '同步到公众号草稿箱失败，请重试',
      );
    } finally {
      setSyncSubmitting(false);
    }
  };

  const handlePublishSync = async () => {
    if (!currentSyncItem) {
      return;
    }

    if (!publishDate) {
      message.warning('请选择公众号发布日期');
      return;
    }

    if (publishDate < getTodayDateString()) {
      message.warning('发布日期不能早于今天');
      return;
    }

    setSyncSubmitting(true);
    try {
      const result = await scheduleWallPaperWechatPublish(
        currentSyncItem.id,
        publishDate,
      );
      const finalPublishDate = result?.publishDate || publishDate;
      message.success(
        `「${
          currentSyncItem.title
        }」已加入公众号正式发布排期（${formatScheduleDisplay(
          finalPublishDate,
        )}），可前往发布管理查看`,
      );
      handleCloseSync();
    } catch (error: any) {
      if (isTimeoutError(error)) {
        message.warning(
          '排期请求已发出，请稍后在发布计划里确认是否创建成功',
          5,
        );
        handleCloseSync();
        return;
      }

      message.error(
        error?.data?.message ||
          error?.info?.message ||
          error?.message ||
          '创建公众号正式发布排期失败，请重试',
      );
    } finally {
      setSyncSubmitting(false);
    }
  };

  /* ── 抖音同步 ── */

  const handleOpenDouyinSync = async (item: WallPaperItem) => {
    setCurrentSyncItem(item);
    setDouyinModalVisible(true);
    setDouyinSubmitting(false);

    setDouyinChecking(true);
    try {
      const status = await checkDouyinLoginStatus();
      setDouyinLoggedIn(!!status?.loggedIn);
    } catch {
      setDouyinLoggedIn(false);
    } finally {
      setDouyinChecking(false);
    }
  };

  const handleCloseDouyinModal = () => {
    setDouyinModalVisible(false);
    setCurrentSyncItem(null);
    setDouyinSubmitting(false);
    setDouyinLoggingIn(false);
  };

  const handleDouyinLogin = async () => {
    setDouyinLoggingIn(true);
    try {
      const result = await douyinLogin();
      if (result?.success) {
        message.success('抖音登录成功');
        setDouyinLoggedIn(true);
      } else {
        message.error('抖音登录失败，请重试');
      }
    } catch (error: any) {
      message.error(error?.data?.message || error?.message || '抖音登录失败');
    } finally {
      setDouyinLoggingIn(false);
    }
  };

  const handleDouyinPublish = async () => {
    if (!currentSyncItem) return;

    setDouyinSubmitting(true);
    try {
      const result = await syncWallPaperToDouyin(currentSyncItem.id);
      message.success(
        `「${result?.title || currentSyncItem.title}」已发布到抖音图文`,
      );
      handleCloseDouyinModal();
    } catch (error: any) {
      if (isTimeoutError(error)) {
        message.warning(
          '抖音发布请求已发出，处理时间较长，请稍后到抖音创作者中心确认结果',
          5,
        );
        handleCloseDouyinModal();
        return;
      }

      message.error(
        error?.data?.message ||
          error?.info?.message ||
          error?.message ||
          '同步到抖音图文失败，请重试',
      );
    } finally {
      setDouyinSubmitting(false);
    }
  };

  /* ── 小红书同步 ── */

  const handleOpenXhsSync = async (item: WallPaperItem) => {
    setCurrentSyncItem(item);
    setXhsModalVisible(true);
    setXhsSubmitting(false);

    setXhsChecking(true);
    try {
      const status = await checkXiaohongshuLoginStatus();
      setXhsLoggedIn(!!status?.loggedIn);
    } catch {
      setXhsLoggedIn(false);
    } finally {
      setXhsChecking(false);
    }
  };

  const handleCloseXhsModal = () => {
    setXhsModalVisible(false);
    setCurrentSyncItem(null);
    setXhsSubmitting(false);
    setXhsLoggingIn(false);
  };

  const handleXhsLogin = async () => {
    setXhsLoggingIn(true);
    try {
      const result = await xiaohongshuLogin();
      if (result?.success) {
        message.success('小红书登录成功');
        setXhsLoggedIn(true);
      } else {
        message.error('小红书登录失败，请重试');
      }
    } catch (error: any) {
      message.error(error?.data?.message || error?.message || '小红书登录失败');
    } finally {
      setXhsLoggingIn(false);
    }
  };

  const handleXhsPublish = async () => {
    if (!currentSyncItem) return;

    setXhsSubmitting(true);
    try {
      const result = await syncWallPaperToXiaohongshu(currentSyncItem.id);
      message.success(
        `「${result?.title || currentSyncItem.title}」已发布到小红书图文`,
      );
      handleCloseXhsModal();
    } catch (error: any) {
      if (isTimeoutError(error)) {
        message.warning(
          '小红书发布请求已发出，处理时间较长，请稍后到小红书创作者中心确认结果',
          5,
        );
        handleCloseXhsModal();
        return;
      }

      message.error(
        error?.data?.message ||
          error?.info?.message ||
          error?.message ||
          '同步到小红书图文失败，请重试',
      );
    } finally {
      setXhsSubmitting(false);
    }
  };

  const getImageUrl = (path?: string) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `https://cdn.tauol.online${path}`;
  };

  const formatDateTime = (iso: string) => {
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

  const columns = useMemo<ColumnsType<WallPaperItem>>(
    () => [
      {
        title: '封面',
        dataIndex: 'cover',
        key: 'cover',
        width: 120,
        render: (_: string, item) => {
          const imageUrl = getImageUrl(item.cover);
          return imageUrl ? (
            <img
              src={imageUrl}
              alt={item.title || 'wallpaper'}
              className={styles['table-cover']}
            />
          ) : (
            <div className={styles['table-cover-placeholder']}>暂无封面</div>
          );
        },
      },
      {
        title: '壁纸标题',
        dataIndex: 'title',
        key: 'title',
        ellipsis: true,
        render: (value: string) => (
          <span
            className={styles['table-title']}
            onClick={() =>
              history.push('/wallpaper/detail', { data: { id: value } })
            }
          >
            {value}
          </span>
        ),
      },
      {
        title: '图片数量',
        dataIndex: 'images',
        key: 'images',
        width: 100,
        render: (images: WallPaperItem['images']) => images?.length || 0,
      },
      {
        title: '发布时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        render: (value: string) => formatDateTime(value),
      },
      {
        title: '操作',
        key: 'action',
        width: 280,
        render: (_: unknown, item) => (
          <div className={styles['table-actions']}>
            <Button
              type="link"
              size="small"
              onClick={(e) => handleEdit(e, item)}
            >
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              danger
              onClick={(e) => handleDelete(e, item)}
            >
              删除
            </Button>
          </div>
        ),
      },
      {
        title: '同步发布',
        key: 'sync',
        width: 240,
        render: (_: unknown, item) => (
          <div className={styles['table-sync-platforms']}>
            <Button
              type="link"
              className={`${styles['platform-btn']} ${styles['platform-wechat']}`}
              onClick={() => handleOpenSync(item)}
            >
              微信
            </Button>
            <Button
              type="link"
              className={`${styles['platform-btn']} ${styles['platform-douyin']}`}
              onClick={() => handleOpenDouyinSync(item)}
            >
              抖音
            </Button>
            <Button
              type="link"
              className={`${styles['platform-btn']} ${styles['platform-xhs']}`}
              onClick={() => handleOpenXhsSync(item)}
            >
              小红书
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className={styles['wallpaper-mgt-page']}>
      <div className={styles['table-panel']}>
        <Table<WallPaperItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={list}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      </div>

      {/* 微信同步 Modal */}
      <Modal
        open={syncVisible}
        title="同步到微信公众号"
        footer={null}
        onCancel={handleCloseSync}
        wrapClassName={styles['sync-modal-wrap']}
      >
        <div className={styles['sync-modal-content']}>
          <div className={styles['sync-modal-title']}>
            {currentSyncItem
              ? `为「${currentSyncItem.title}」选择同步方式`
              : '请选择同步方式'}
          </div>

          {!syncMode ? (
            <>
              <div className={styles['sync-modal-tip']}>
                选择「发布草稿」将立即同步到公众号草稿箱；选择「定时发表」将在指定日期
                09:00 自动提交正式群发。
              </div>
              <div className={styles['sync-mode-group']}>
                <div
                  className={styles['sync-mode-card']}
                  onClick={() => setSyncMode('draft')}
                >
                  <div className={styles['sync-mode-icon']}>📝</div>
                  <div className={styles['sync-mode-label']}>发布草稿</div>
                  <div className={styles['sync-mode-desc']}>
                    立即同步到公众号草稿箱
                  </div>
                </div>
                <div
                  className={styles['sync-mode-card']}
                  onClick={() => setSyncMode('publish')}
                >
                  <div className={styles['sync-mode-icon']}>📅</div>
                  <div className={styles['sync-mode-label']}>定时发表</div>
                  <div className={styles['sync-mode-desc']}>
                    选择日期后定时正式群发
                  </div>
                </div>
              </div>
            </>
          ) : syncMode === 'draft' ? (
            <div className={styles['sync-confirm-block']}>
              <div className={styles['sync-confirm-tip']}>
                将「{currentSyncItem?.title}
                」同步到微信公众号草稿箱，同步后可在公众号后台编辑和手动发布。
              </div>
              <div className={styles['sync-confirm-actions']}>
                <Button
                  onClick={() => setSyncMode(null)}
                  disabled={syncSubmitting}
                >
                  返回选择
                </Button>
                <Button
                  type="primary"
                  loading={syncSubmitting}
                  onClick={handleDraftSync}
                >
                  确认发布草稿
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles['sync-confirm-block']}>
              <div className={styles['sync-date-block']}>
                <div className={styles['sync-date-label']}>
                  选择正式群发日期
                </div>
                <input
                  type="date"
                  min={getTodayDateString()}
                  value={publishDate}
                  onChange={(event) => setPublishDate(event.target.value)}
                  className={styles['sync-date-input']}
                />
                <div className={styles['sync-date-tip']}>
                  将在所选日期的 09:00
                  自动发起正式群发，同一天只允许创建一条公众号发布计划。
                </div>
              </div>
              <div className={styles['sync-confirm-actions']}>
                <Button
                  onClick={() => setSyncMode(null)}
                  disabled={syncSubmitting}
                >
                  返回选择
                </Button>
                <Button
                  type="primary"
                  loading={syncSubmitting}
                  onClick={handlePublishSync}
                >
                  确认定时发表
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 抖音图文同步 Modal */}
      <Modal
        open={douyinModalVisible}
        title="同步到抖音图文"
        footer={null}
        onCancel={handleCloseDouyinModal}
        wrapClassName={styles['sync-modal-wrap']}
      >
        <div className={styles['sync-modal-content']}>
          <div className={styles['sync-modal-title']}>
            {currentSyncItem
              ? `将「${currentSyncItem.title}」发布到抖音图文`
              : '发布到抖音图文'}
          </div>

          {douyinChecking ? (
            <div className={styles['sync-modal-tip']}>
              正在检查抖音登录状态...
            </div>
          ) : !douyinLoggedIn ? (
            <div className={styles['sync-confirm-block']}>
              <div className={styles['sync-confirm-tip']}>
                抖音未登录或 Cookie
                已过期。点击下方按钮将弹出浏览器窗口，请使用抖音 App
                扫码登录，登录成功后即可发布图文。
              </div>
              <div className={styles['sync-confirm-actions']}>
                <Button
                  onClick={handleCloseDouyinModal}
                  disabled={douyinLoggingIn}
                >
                  取消
                </Button>
                <Button
                  type="primary"
                  loading={douyinLoggingIn}
                  onClick={handleDouyinLogin}
                >
                  扫码登录抖音
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles['sync-confirm-block']}>
              <div className={styles['sync-confirm-tip']}>
                将以图文形式发布到抖音，包含封面在内的{' '}
                {currentSyncItem?.images?.length
                  ? currentSyncItem.images.length + 1
                  : 1}{' '}
                张图片。发布后可在抖音创作者中心查看。
              </div>
              <div className={styles['sync-confirm-actions']}>
                <Button
                  onClick={handleCloseDouyinModal}
                  disabled={douyinSubmitting}
                >
                  取消
                </Button>
                <Button
                  type="primary"
                  loading={douyinSubmitting}
                  onClick={handleDouyinPublish}
                >
                  确认发布到抖音
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 小红书图文同步 Modal */}
      <Modal
        open={xhsModalVisible}
        title="同步到小红书图文"
        footer={null}
        onCancel={handleCloseXhsModal}
        wrapClassName={styles['sync-modal-wrap']}
      >
        <div className={styles['sync-modal-content']}>
          <div className={styles['sync-modal-title']}>
            {currentSyncItem
              ? `将「${currentSyncItem.title}」发布到小红书图文`
              : '发布到小红书图文'}
          </div>

          {xhsChecking ? (
            <div className={styles['sync-modal-tip']}>
              正在检查小红书登录状态...
            </div>
          ) : !xhsLoggedIn ? (
            <div className={styles['sync-confirm-block']}>
              <div className={styles['sync-confirm-tip']}>
                小红书未登录或 Cookie
                已过期。点击下方按钮将弹出浏览器窗口，请使用小红书 App
                扫码登录，登录成功后即可发布图文。
              </div>
              <div className={styles['sync-confirm-actions']}>
                <Button onClick={handleCloseXhsModal} disabled={xhsLoggingIn}>
                  取消
                </Button>
                <Button
                  type="primary"
                  loading={xhsLoggingIn}
                  onClick={handleXhsLogin}
                >
                  扫码登录小红书
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles['sync-confirm-block']}>
              <div className={styles['sync-confirm-tip']}>
                将以图文形式发布到小红书，包含封面在内的{' '}
                {currentSyncItem?.images?.length
                  ? currentSyncItem.images.length + 1
                  : 1}{' '}
                张图片。发布后可在小红书创作者中心查看。
              </div>
              <div className={styles['sync-confirm-actions']}>
                <Button onClick={handleCloseXhsModal} disabled={xhsSubmitting}>
                  取消
                </Button>
                <Button
                  type="primary"
                  loading={xhsSubmitting}
                  onClick={handleXhsPublish}
                >
                  确认发布到小红书
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default WallPaperMgt;
