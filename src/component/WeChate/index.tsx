import React, { useState } from 'react';
import { Button, Modal, message, DatePicker } from 'antd';
import moment from 'moment';
import { isTimeoutError } from '@/utils/utils';

const WeChateComponent: React.FC<any> = ({ item }) => {
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'draft' | 'publish' | null>(null);
  const [publishDate, setPublishDate] = useState<moment.Moment | null>(null);
  const [currentItem, setCurrentItem] = useState<any>(null);

  const handleOpen = (data: any) => {
    setCurrentItem(data);
    setMode(null);
    setPublishDate(null);
    setVisible(true);
  };

  const handleClose = () => {
    setVisible(false);
    setCurrentItem(null);
    setMode(null);
    setPublishDate(null);
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
    if (publishDate.isBefore(moment(), 'day')) {
      message.warning('发布日期不能早于今天');
      return;
    }
    setSubmitting(true);
    try {
      const {
        scheduleWallPaperWechatPublish,
      } = require('@/services/wallpaper');
      const dateStr = publishDate.format('YYYY-MM-DD');
      const result = await scheduleWallPaperWechatPublish(
        currentItem.id,
        dateStr,
      );
      const finalPublishDate = result?.publishDate || dateStr;
      message.success(
        `「${currentItem.title}」已加入公众号正式发布排期（${moment(
          finalPublishDate,
        ).format('YYYY年MM月DD日')}），可前往发布管理查看`,
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
      <Button
        type="link"
        onClick={() => handleOpen(item)}
        style={{
          color: '#c3d9f3',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '2px',
          fontWeight: 400,
        }}
      >
        微信
      </Button>
      <Modal
        open={visible}
        title="同步到微信公众号"
        footer={null}
        onCancel={handleClose}
        wrapClassName="wechate-bugatti-modal"
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: '#cccccc',
            fontWeight: 400,
          }}
        >
          <div
            style={{
              fontFamily: "'Saira Condensed', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '2px',
              fontWeight: 400,
              marginBottom: 12,
              color: '#ffffff',
            }}
          >
            {currentItem
              ? `为「${currentItem.title}」选择同步方式`
              : '请选择同步方式'}
          </div>
          {!mode ? (
            <>
              <div
                style={{
                  color: '#999999',
                  marginBottom: 16,
                  lineHeight: 1.7,
                }}
              >
                选择「发布草稿」将立即同步到公众号草稿箱；选择「定时发表」将在指定日期
                09:00 自动提交正式群发。
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div
                  style={{
                    flex: 1,
                    padding: 16,
                    border: '1px solid #262626',
                    borderRadius: 0,
                    cursor: 'pointer',
                    textAlign: 'center',
                    background: '#141414',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => setMode('draft')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#999999';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#262626';
                  }}
                >
                  <div style={{ fontSize: 24 }}>📝</div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      fontWeight: 400,
                      marginTop: 4,
                      color: '#ffffff',
                    }}
                  >
                    发布草稿
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#999999',
                      marginTop: 4,
                      fontFamily: "'Cormorant Garamond', serif",
                    }}
                  >
                    立即同步到公众号草稿箱
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: 16,
                    border: '1px solid #262626',
                    borderRadius: 0,
                    cursor: 'pointer',
                    textAlign: 'center',
                    background: '#141414',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => setMode('publish')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#999999';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#262626';
                  }}
                >
                  <div style={{ fontSize: 24 }}>📅</div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      fontWeight: 400,
                      marginTop: 4,
                      color: '#ffffff',
                    }}
                  >
                    定时发表
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#999999',
                      marginTop: 4,
                      fontFamily: "'Cormorant Garamond', serif",
                    }}
                  >
                    选择日期后定时正式群发
                  </div>
                </div>
              </div>
            </>
          ) : mode === 'draft' ? (
            <div>
              <div
                style={{
                  marginBottom: 16,
                  lineHeight: 1.7,
                }}
              >
                将「{currentItem?.title}
                」同步到微信公众号草稿箱，同步后可在公众号后台编辑和手动发布。
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}
              >
                <Button
                  onClick={() => setMode(null)}
                  disabled={submitting}
                  style={{
                    borderRadius: 9999,
                    fontFamily: "'JetBrains Mono', monospace",
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    fontWeight: 400,
                    background: 'transparent',
                    borderColor: '#262626',
                    color: '#cccccc',
                  }}
                >
                  返回选择
                </Button>
                <Button
                  type="primary"
                  loading={submitting}
                  onClick={handleDraftSync}
                  style={{
                    borderRadius: 9999,
                    fontFamily: "'JetBrains Mono', monospace",
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    fontWeight: 400,
                    background: 'transparent',
                    borderColor: '#c3d9f3',
                    color: '#c3d9f3',
                  }}
                >
                  确认发布草稿
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div
                style={{
                  marginBottom: 12,
                  fontFamily: "'Saira Condensed', sans-serif",
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  color: '#ffffff',
                }}
              >
                选择正式群发日期
              </div>
              <DatePicker
                placeholder="请选择"
                style={{
                  width: '100%',
                  marginBottom: 12,
                  borderRadius: 0,
                  background: '#141414',
                  borderColor: '#262626',
                  color: '#cccccc',
                }}
                value={publishDate}
                disabledDate={(current) =>
                  current && current < moment().startOf('day')
                }
                onChange={(val) => setPublishDate(val)}
              />
              <div
                style={{
                  fontSize: 12,
                  color: '#999999',
                  marginBottom: 16,
                  fontFamily: "'Cormorant Garamond', serif",
                  lineHeight: 1.7,
                }}
              >
                将在所选日期的 09:00
                自动发起正式群发，同一天只允许创建一条公众号发布计划。
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}
              >
                <Button
                  onClick={() => setMode(null)}
                  disabled={submitting}
                  style={{
                    borderRadius: 9999,
                    fontFamily: "'JetBrains Mono', monospace",
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    fontWeight: 400,
                    background: 'transparent',
                    borderColor: '#262626',
                    color: '#cccccc',
                  }}
                >
                  返回选择
                </Button>
                <Button
                  type="primary"
                  loading={submitting}
                  onClick={handlePublishSync}
                  style={{
                    borderRadius: 9999,
                    fontFamily: "'JetBrains Mono', monospace",
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    fontWeight: 400,
                    background: 'transparent',
                    borderColor: '#c3d9f3',
                    color: '#c3d9f3',
                  }}
                >
                  确认定时发表
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <style>{`
        .wechate-bugatti-modal .ant-modal-content {
          background: #000000 !important;
          border: 1px solid #262626 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }
        .wechate-bugatti-modal .ant-modal-header {
          background: transparent !important;
          border-bottom: 1px solid #262626 !important;
          border-radius: 0 !important;
        }
        .wechate-bugatti-modal .ant-modal-title {
          color: #ffffff !important;
          font-family: 'Saira Condensed', sans-serif !important;
          text-transform: uppercase !important;
          letter-spacing: 2px !important;
          font-weight: 400 !important;
        }
        .wechate-bugatti-modal .ant-modal-close-x,
        .wechate-bugatti-modal .ant-modal-close {
          color: #999999 !important;
        }
        .wechate-bugatti-modal .ant-modal-body {
          color: #cccccc !important;
        }
      `}</style>
    </>
  );
};

export default WeChateComponent;
