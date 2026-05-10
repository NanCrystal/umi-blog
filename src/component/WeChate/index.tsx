import React, { useState } from 'react';
import { Button, Modal, message } from 'antd';
import {
  getTodayDateString,
  getDefaultPublishDate,
  formatScheduleDisplay,
  isTimeoutError,
} from '@/utils/utils';

const WeChateComponent: React.FC<any> = ({ item }) => {
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'draft' | 'publish' | null>(null);
  const [publishDate, setPublishDate] = useState(getDefaultPublishDate());
  const [currentItem, setCurrentItem] = useState<any>(null);

  const handleOpen = (data: any) => {
    setCurrentItem(data);
    setMode(null);
    setPublishDate(getDefaultPublishDate());
    setVisible(true);
  };

  const handleClose = () => {
    setVisible(false);
    setCurrentItem(null);
    setMode(null);
    setPublishDate(getDefaultPublishDate());
    setSubmitting(false);
  };

  const handleDraftSync = async () => {
    if (!currentItem) return;
    setSubmitting(true);
    try {
      const { syncWallPaperToWechatDraft } = require('@/services/wallpaper');
      const result = await syncWallPaperToWechatDraft(currentItem.id);
      message.success(
        `「${result?.title || currentItem.title}」已同步到公众号草稿箱`,
      );
      handleClose();
    } catch (error: any) {
      if (isTimeoutError(error)) {
        message.warning(
          '同步请求已发出，公众号处理时间较长，请稍后到草稿箱确认结果',
          5,
        );
        handleClose();
        return;
      }
      message.error(
        error?.data?.message ||
          error?.info?.message ||
          error?.message ||
          '同步到公众号草稿箱失败，请重试',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishSync = async () => {
    if (!currentItem) return;
    if (!publishDate) {
      message.warning('请选择公众号发布日期');
      return;
    }
    if (publishDate < getTodayDateString()) {
      message.warning('发布日期不能早于今天');
      return;
    }
    setSubmitting(true);
    try {
      const {
        scheduleWallPaperWechatPublish,
      } = require('@/services/wallpaper');
      const result = await scheduleWallPaperWechatPublish(
        currentItem.id,
        publishDate,
      );
      const finalPublishDate = result?.publishDate || publishDate;
      message.success(
        `「${
          currentItem.title
        }」已加入公众号正式发布排期（${formatScheduleDisplay(
          finalPublishDate,
        )}），可前往发布管理查看`,
      );
      handleClose();
    } catch (error: any) {
      if (isTimeoutError(error)) {
        message.warning(
          '排期请求已发出，请稍后在发布计划里确认是否创建成功',
          5,
        );
        handleClose();
        return;
      }
      message.error(
        error?.data?.message ||
          error?.info?.message ||
          error?.message ||
          '创建公众号正式发布排期失败，请重试',
      );
    } finally {
      setSubmitting(false);
    }
  };

  React.useImperativeHandle(item?._ref, () => ({ open: handleOpen }), []);

  if (item?._ref) return null;

  return (
    <>
      <Button type="link" onClick={() => handleOpen(item)}>
        微信
      </Button>
      <Modal
        open={visible}
        title="同步到微信公众号"
        footer={null}
        onCancel={handleClose}
      >
        <div>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>
            {currentItem
              ? `为「${currentItem.title}」选择同步方式`
              : '请选择同步方式'}
          </div>
          {!mode ? (
            <>
              <div style={{ color: '#666', marginBottom: 16 }}>
                选择「发布草稿」将立即同步到公众号草稿箱；选择「定时发表」将在指定日期
                09:00 自动提交正式群发。
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
                  onClick={() => setMode('draft')}
                >
                  <div style={{ fontSize: 24 }}>📝</div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>发布草稿</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    立即同步到公众号草稿箱
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
                  onClick={() => setMode('publish')}
                >
                  <div style={{ fontSize: 24 }}>📅</div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>定时发表</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    选择日期后定时正式群发
                  </div>
                </div>
              </div>
            </>
          ) : mode === 'draft' ? (
            <div>
              <div style={{ marginBottom: 16 }}>
                将「{currentItem?.title}
                」同步到微信公众号草稿箱，同步后可在公众号后台编辑和手动发布。
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}
              >
                <Button onClick={() => setMode(null)} disabled={submitting}>
                  返回选择
                </Button>
                <Button
                  type="primary"
                  loading={submitting}
                  onClick={handleDraftSync}
                >
                  确认发布草稿
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 12 }}>选择正式群发日期</div>
              <input
                type="date"
                min={getTodayDateString()}
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                  marginBottom: 12,
                }}
              />
              <div style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
                将在所选日期的 09:00
                自动发起正式群发，同一天只允许创建一条公众号发布计划。
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}
              >
                <Button onClick={() => setMode(null)} disabled={submitting}>
                  返回选择
                </Button>
                <Button
                  type="primary"
                  loading={submitting}
                  onClick={handlePublishSync}
                >
                  确认定时发表
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default WeChateComponent;
