import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Tabs, Spin, Empty, message } from 'antd';
import {
  PictureOutlined,
  VideoCameraOutlined,
  CustomerServiceOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { getPhotos } from '@/services/photo';
import { getVideos } from '@/services/video';
import { getVoices } from '@/services/voice';
import { getImageUrl } from '@/utils/utils';
import styles from './index.less';

export type MediaType = 'PHOTO' | 'VIDEO' | 'VOICE';

export interface PickerItem {
  id: number;
  mediaType: MediaType;
  fileName?: string;
  url?: string;
  playUrl?: string; // 视频/音频可播放地址（照片无）
}

const TABS: { key: MediaType; label: string; icon: React.ReactNode }[] = [
  { key: 'PHOTO', label: '照片', icon: <PictureOutlined /> },
  { key: 'VIDEO', label: '视频', icon: <VideoCameraOutlined /> },
  { key: 'VOICE', label: '音频', icon: <CustomerServiceOutlined /> },
];

const PAGE_SIZE = 20;

const MediaPicker: React.FC<{
  open: boolean;
  artistId?: string;
  initialSelected?: { id: number; mediaType: MediaType }[];
  onClose: () => void;
  onConfirm: (items: PickerItem[]) => void;
}> = ({ open, artistId, initialSelected = [], onClose, onConfirm }) => {
  const [active, setActive] = useState<MediaType>('PHOTO');
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, PickerItem>>({});

  // 打开时根据已选初始化选中态
  useEffect(() => {
    if (!open) return;
    const init: Record<string, PickerItem> = {};
    initialSelected.forEach((s) => {
      init[`${s.mediaType}-${s.id}`] = {
        id: s.id,
        mediaType: s.mediaType,
      };
    });
    setSelected(init);
    setActive('PHOTO');
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchList = useCallback(
    async (tab: MediaType, p: number) => {
      setLoading(true);
      try {
        const params = {
          page: p,
          pageSize: PAGE_SIZE,
          artistIds: artistId ? [artistId] : undefined,
        };
        let res: any;
        if (tab === 'PHOTO') res = await getPhotos(params);
        else if (tab === 'VIDEO') res = await getVideos(params);
        else res = await getVoices(params);
        setItems(res.list || []);
        setTotal(res.total || 0);
      } catch {
        message.error('媒体列表加载失败');
      } finally {
        setLoading(false);
      }
    },
    [artistId],
  );

  useEffect(() => {
    if (open) fetchList(active, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active, page, fetchList]);

  const toggle = (item: any) => {
    const key = `${active}-${item.id}`;
    const next = { ...selected };
    if (next[key]) {
      delete next[key];
    } else {
      next[key] = {
        id: item.id,
        mediaType: active,
        fileName: item.title || item.fileName,
        url: active === 'PHOTO' ? item.url : item.coverUrl,
        playUrl:
          active === 'PHOTO' ? undefined : item.playUrl || item.originalUrl,
      };
    }
    setSelected(next);
  };

  const selectedList = Object.values(selected);

  const handleConfirm = () => {
    onConfirm(selectedList);
  };

  const renderThumb = (item: any) => {
    if (active === 'VOICE') {
      return (
        <div className={styles['picker-audio']}>
          <CustomerServiceOutlined style={{ fontSize: 28 }} />
          <div className={styles['picker-audio-name']}>
            {item.title || item.fileName || `#${item.id}`}
          </div>
          {item.duration ? (
            <div className={styles['picker-audio-dur']}>
              {Math.round(item.duration)}s
            </div>
          ) : null}
        </div>
      );
    }
    const url = getImageUrl(
      active === 'PHOTO' ? item.url : item.coverUrl || item.originalUrl,
    );
    return (
      <img
        src={url}
        alt={item.fileName || `#${item.id}`}
        className={styles['picker-thumb']}
      />
    );
  };

  return (
    <Modal
      title="从媒体库选择"
      open={open}
      onCancel={onClose}
      onOk={handleConfirm}
      okText={`确认选择（${selectedList.length}）`}
      cancelText="取消"
      width={720}
      className={`${styles['detail-modal']} ${styles['sync-add-modal']}`}
      destroyOnClose
    >
      <Tabs
        activeKey={active}
        onChange={(k) => {
          setActive(k as MediaType);
          setPage(1);
        }}
        items={TABS.map((t) => ({
          key: t.key,
          label: (
            <span>
              {t.icon} {t.label}
            </span>
          ),
        }))}
        className={styles['sync-tabs']}
      />
      <Spin spinning={loading}>
        {items.length === 0 && !loading ? (
          <Empty
            description="该艺人下暂无媒体"
            style={{ color: '#888', padding: '40px 0' }}
          />
        ) : (
          <div className={styles['picker-grid']}>
            {items.map((item) => {
              const key = `${active}-${item.id}`;
              const checked = !!selected[key];
              return (
                <div
                  key={item.id}
                  className={`${styles['picker-cell']} ${
                    checked ? styles['picker-cell-active'] : ''
                  }`}
                  onClick={() => toggle(item)}
                >
                  {renderThumb(item)}
                  {checked && (
                    <CheckCircleFilled className={styles['picker-check']} />
                  )}
                  {active !== 'VOICE' && (
                    <div className={styles['picker-cap']}>
                      {item.fileName || `#${item.id}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Spin>
      <div className={styles['picker-pager']}>
        <span style={{ color: '#888', fontSize: 12 }}>共 {total} 个</span>
        <span style={{ display: 'flex', gap: 8 }}>
          <button
            className={styles['picker-page-btn']}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            上一页
          </button>
          <button
            className={styles['picker-page-btn']}
            disabled={page * PAGE_SIZE >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </button>
        </span>
      </div>
    </Modal>
  );
};

export default MediaPicker;
