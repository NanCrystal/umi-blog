import React, { useEffect, useState } from 'react';
import { Button, Modal, Table, message } from 'antd';

import styles from './index.less';
import {
  douyinLogin,
  syncWallPaperToDouyin,
  WallPaperItem,
} from '@/services/wallpaper';
interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: WallPaperItem;
}

const CheckLoginModal: React.FC<Props> = (props: Props) => {
  const { visible, onClose, onSuccess, item } = props;
  const [douyinModalVisible, setDouyinModalVisible] = useState(visible);

  const [douyinSubmitting, setDouyinSubmitting] = useState(false);
  const [douyinLoggedIn, setDouyinLoggedIn] = useState(false);
  const [douyinChecking, setDouyinChecking] = useState(false);
  const [douyinLoggingIn, setDouyinLoggingIn] = useState(false);
  const [currentSyncItem, setCurrentSyncItem] = useState<WallPaperItem | null>(
    item,
  );

  useEffect(() => {
    setDouyinModalVisible(visible);
  }, [visible]);

  useEffect(() => {
    setCurrentSyncItem(item);
  }, [item]);
  const isTimeoutError = (error: any) => {
    const errorMessage = `${error?.message || ''}`.toLowerCase();
    return (
      error?.name === 'TimeoutError' ||
      error?.type === 'Timeout' ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('timed out')
    );
  };

  const handleCloseDouyinModal = () => {
    setDouyinModalVisible(false);
    onClose();
    // setCurrentSyncItem(null);
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
      onClose();
      onSuccess();
    } catch (error: any) {
      if (isTimeoutError(error)) {
        message.warning(
          '抖音发布请求已发出，处理时间较长，请稍后到抖音创作者中心确认结果',
          5,
        );
        handleCloseDouyinModal();
        onClose();
        onSuccess();
        return;
      }

      message.error(
        error?.data?.message ||
          error?.info?.message ||
          error?.message ||
          '发布到抖音图文失败，请重试',
      );
    } finally {
      setDouyinSubmitting(false);
    }
  };
  return (
    <Modal
      open={douyinModalVisible}
      title="发布到抖音图文"
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
  );
};

export default CheckLoginModal;
