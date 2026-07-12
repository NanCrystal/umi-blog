import React, { useState, useEffect } from 'react';
import { history, useLocation } from 'umi';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Upload,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import {
  createSyncPost,
  updateSyncPost,
  getSyncPostDetail,
  getArtistList,
} from '@/services/artist';
import { uploadImageFull } from '@/services/upload';
import { uploadVideoFile } from '@/services/video';
import { uploadVoiceFile } from '@/services/voice';
import { createPhoto } from '@/services/photo';
import { createVideo } from '@/services/video';
import { createVoice } from '@/services/voice';
import { getImageUrl } from '@/utils/utils';
import MediaPicker, { MediaType, PickerItem } from './MediaPicker';
import styles from './index.less';

const { TextArea } = Input;
const PLATFORMS = [
  { key: 'weibo', label: '微博' },
  { key: 'douyin', label: '抖音' },
  { key: 'xiaohongshu', label: '小红书' },
  { key: 'instagram', label: 'Instagram' },
];
const MEDIA_CONFIG: { key: MediaType; label: string; accept: string }[] = [
  { key: 'PHOTO', label: '图片', accept: 'image/*' },
  { key: 'VIDEO', label: '视频', accept: 'video/*' },
  { key: 'VOICE', label: '音频', accept: 'audio/*' },
];

interface CombinedItem {
  key: string; // 唯一键：upload=up-xxx，library=lib-<id>
  source: 'upload' | 'library';
  mediaType: MediaType;
  fileName: string;
  thumb?: string; // 缩略图/封面（图片为图片地址，视频/音频为封面）
  play: string; // 预览/播放地址（图片为原图，视频/音频为可播放地址）
  qiniuKey?: string; // 上传视频/音频时的七牛 key
  duration?: number; // 上传视频/音频时长
  file?: File; // 上传原始文件（提交时不使用，仅占位）
  libraryId?: number; // 媒体库来源时的底层媒体 id
}

const SyncAdd: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const editId = params.get('id') ? Number(params.get('id')) : null;

  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [artists, setArtists] = useState<any[]>([]);
  const [mediaItems, setMediaItems] = useState<
    Record<MediaType, CombinedItem[]>
  >({
    PHOTO: [],
    VIDEO: [],
    VOICE: [],
  });
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [preview, setPreview] = useState<{
    type: MediaType;
    url: string;
    name?: string;
  } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<MediaType>('PHOTO');

  // 拉取艺人列表（独立页面自行加载）
  useEffect(() => {
    getArtistList()
      .then((data: any) => setArtists(data || []))
      .catch(() => message.error('艺人列表加载失败'));
  }, []);

  // 打开时初始化（新建 / 编辑预填）
  useEffect(() => {
    form.resetFields();
    setMediaItems({ PHOTO: [], VIDEO: [], VOICE: [] });
    setDragIndex(null);
    setDropIndex(null);
    setPreview(null);
    if (editId) {
      getSyncPostDetail(editId)
        .then((res: any) => {
          form.setFieldsValue({
            artistId: res.artistId,
            platform: res.platform,
            title: res.title || '',
            content: (res.content || '').replace(/<[^>]*>/g, ''),
            publishTime: res.publishTime ? moment(res.publishTime) : moment(),
          });
          const items: Record<MediaType, CombinedItem[]> = {
            PHOTO: [],
            VIDEO: [],
            VOICE: [],
          };
          (res.linkedMedia || []).forEach((m: any) => {
            const t = m.mediaType as MediaType;
            if (!items[t]) return;
            const media = m.media || {};
            const isPhoto = t === 'PHOTO';
            const thumb = isPhoto ? media.url : media.coverUrl;
            const play = isPhoto
              ? media.url
              : media.playUrl || media.originalUrl;
            items[t].push({
              key: `lib-${m.id}`,
              source: 'library',
              mediaType: t,
              fileName: media.title || media.fileName || '',
              thumb,
              play,
              libraryId: media.id,
            });
          });
          setMediaItems(items);
        })
        .catch(() => message.error('获取详情失败'));
    } else {
      form.setFieldsValue({ publishTime: moment() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const artistStringId = (): string | undefined => {
    const id = form.getFieldValue('artistId');
    return artists.find((a) => a.id === id)?.artistId;
  };

  const makeUploadRequest = (type: MediaType) => async (options: any) => {
    const { file, onSuccess, onError } = options;
    const fileName = (file as File).name.replace(/\.[^.]+$/, '');
    try {
      const key = `up-${Date.now()}-${Math.random()}`;
      let item: CombinedItem;
      if (type === 'PHOTO') {
        const res: any = await uploadImageFull(file as File);
        item = {
          key,
          source: 'upload',
          mediaType: 'PHOTO',
          fileName,
          thumb: res.thumbUrl || res.url,
          play: res.url,
          file: file as File,
        };
      } else if (type === 'VIDEO') {
        const res: any = await uploadVideoFile(file as File);
        item = {
          key,
          source: 'upload',
          mediaType: 'VIDEO',
          fileName,
          thumb: undefined,
          play: res.url,
          qiniuKey: res.key,
          duration: res.duration,
          file: file as File,
        };
      } else {
        const res: any = await uploadVoiceFile(file as File);
        item = {
          key,
          source: 'upload',
          mediaType: 'VOICE',
          fileName,
          thumb: undefined,
          play: res.url,
          qiniuKey: res.key,
          duration: res.duration,
          file: file as File,
        };
      }
      setMediaItems((prev) => ({ ...prev, [type]: [...prev[type], item] }));
      onSuccess({}, file);
    } catch {
      message.error(
        `${MEDIA_CONFIG.find((c) => c.key === type)?.label}上传失败`,
      );
      onError(new Error('upload failed'));
    }
  };

  const removeItem = (type: MediaType, key: string) =>
    setMediaItems((prev) => ({
      ...prev,
      [type]: prev[type].filter((i) => i.key !== key),
    }));

  const openPicker = (type: MediaType) => {
    setPickerType(type);
    setPickerOpen(true);
  };

  const handlePickerConfirm = (items: PickerItem[]) => {
    // 同一类型下以库选结果覆盖（已自动去重），并保留已上传项
    const arr: CombinedItem[] = items.map((p) => {
      const isPhoto = p.mediaType === 'PHOTO';
      return {
        key: `lib-${p.id}`,
        source: 'library',
        mediaType: p.mediaType,
        fileName: p.fileName || '',
        thumb: p.url,
        play: isPhoto ? p.url || '' : p.playUrl || p.url || '',
        libraryId: p.id,
      };
    });
    setMediaItems((prev) => ({
      ...prev,
      [pickerType]: [
        ...prev[pickerType].filter((i) => i.source === 'upload'),
        ...arr,
      ],
    }));
    setPickerOpen(false);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    const strArtist = artistStringId();
    if (!strArtist) {
      message.error('请先选择艺人');
      return;
    }
    const shootDate = moment(values.publishTime).format('YYYY-MM-DD');
    setSubmitting(true);
    try {
      const createdIds: Record<MediaType, number[]> = {
        PHOTO: [],
        VIDEO: [],
        VOICE: [],
      };
      for (const type of ['PHOTO', 'VIDEO', 'VOICE'] as MediaType[]) {
        for (const it of mediaItems[type]) {
          if (it.source !== 'upload') continue;
          let created: any;
          if (type === 'PHOTO') {
            created = await createPhoto({
              fileName: it.fileName,
              url: it.play,
              artistId: strArtist,
              shootDate,
            });
          } else if (type === 'VIDEO') {
            created = await createVideo({
              fileName: it.fileName,
              artistId: strArtist,
              qiniuKey: it.qiniuKey!,
              originalUrl: it.play,
              shootDate,
              duration: it.duration,
            });
          } else {
            created = await createVoice({
              fileName: it.fileName,
              artistId: strArtist,
              qiniuKey: it.qiniuKey!,
              originalUrl: it.play,
              shootDate,
              duration: it.duration,
            });
          }
          if (created?.id) createdIds[type].push(created.id);
        }
      }

      const media: {
        mediaType: MediaType;
        mediaId: number;
        sortOrder: number;
      }[] = [];
      (['PHOTO', 'VIDEO', 'VOICE'] as MediaType[]).forEach((type) => {
        const queue = [...createdIds[type]];
        mediaItems[type].forEach((it, idx) => {
          const mediaId =
            it.source === 'upload'
              ? (queue.shift() as number)
              : (it.libraryId as number);
          media.push({ mediaType: type, mediaId, sortOrder: idx });
        });
      });

      const payload = {
        artistId: Number(values.artistId),
        platform: values.platform,
        title: values.title || undefined,
        content: values.content,
        publishTime: moment(values.publishTime).toISOString(),
        media,
      };

      if (editId) {
        await updateSyncPost(editId, payload);
        message.success('编辑成功');
      } else {
        await createSyncPost(payload);
        message.success('新建成功');
      }
      history.push('/admin/sync');
    } catch (err: any) {
      console.error(err);
      message.error(err?.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const renderThumb = (type: MediaType, thumb?: string) => {
    if (type === 'VOICE') {
      return <div className={styles['add-audio']}>🎵 音频</div>;
    }
    if (type === 'VIDEO') {
      // 有封面则显示缩略图，否则用占位标识
      return thumb ? (
        <img src={getImageUrl(thumb)} className={styles['add-thumb']} alt="" />
      ) : (
        <div className={styles['add-audio']}>🎬 视频</div>
      );
    }
    return (
      <img src={getImageUrl(thumb)} className={styles['add-thumb']} alt="" />
    );
  };

  return (
    <div className={styles['sync-add-page']}>
      <div className={styles['add-page-header']}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => history.push('/admin/sync')}
          style={{ color: '#bbb', paddingLeft: 0 }}
        >
          返回
        </Button>
        <span className={styles['add-page-title']}>
          {editId ? '编辑同步内容' : '新建同步内容'}
        </span>
      </div>

      <div className={styles['add-page-body']}>
        <Form form={form} layout="vertical" className={styles['add-form']}>
          <div className={styles['add-row']}>
            <Form.Item
              name="artistId"
              label="艺人"
              rules={[{ required: true, message: '请选择艺人' }]}
              style={{ flex: 1 }}
            >
              <Select
                placeholder="请选择艺人"
                showSearch
                optionFilterProp="children"
              >
                {artists.map((a) => (
                  <Select.Option key={a.id} value={a.id}>
                    {a.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="platform"
              label="平台"
              rules={[{ required: true, message: '请选择平台' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="请选择平台">
                {PLATFORMS.map((p) => (
                  <Select.Option key={p.key} value={p.key}>
                    {p.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="publishTime"
            label="发布时间"
            rules={[{ required: true, message: '请选择发布时间' }]}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: '100%' }}
              popupClassName="dark-datepicker"
            />
          </Form.Item>

          <Form.Item name="title" label="标题">
            <Input placeholder="选填" maxLength={120} />
          </Form.Item>

          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <TextArea
              rows={4}
              placeholder="请输入同步文字内容"
              maxLength={2000}
              showCount
            />
          </Form.Item>

          <div className={styles['add-media-title']}>
            媒体（图片 / 视频 / 音频）
          </div>
          {MEDIA_CONFIG.map((cfg) => {
            const list = mediaItems[cfg.key];
            const handleDragOver = (e: React.DragEvent, idx: number) => {
              e.preventDefault();
              if (dragIndex === null || dragIndex === idx) return;
              setDropIndex(idx);
              setMediaItems((prev) => {
                const arr = [...prev[cfg.key]];
                const [moved] = arr.splice(dragIndex, 1);
                arr.splice(idx, 0, moved);
                return { ...prev, [cfg.key]: arr };
              });
              setDragIndex(idx);
            };
            return (
              <div key={cfg.key} className={styles['add-media-block']}>
                <div className={styles['add-media-head']}>
                  <span className={styles['add-media-label']}>
                    {cfg.label}
                    {list.length > 0 && (
                      <span
                        style={{ color: '#666', marginLeft: 6, fontSize: 11 }}
                      >
                        可拖拽排序
                      </span>
                    )}
                  </span>
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    className={styles['add-lib-btn']}
                    onClick={() => openPicker(cfg.key)}
                  >
                    从媒体库选择
                  </Button>
                </div>
                <Upload
                  multiple
                  accept={cfg.accept}
                  showUploadList={false}
                  customRequest={makeUploadRequest(cfg.key)}
                >
                  <Button size="small" icon={<PlusOutlined />}>
                    上传新{cfg.label}
                  </Button>
                </Upload>
                {list.length > 0 && (
                  <div className={styles['add-thumbs']}>
                    {list.map((it: CombinedItem, idx: number) => (
                      <div
                        key={it.key}
                        className={`${styles['add-thumb-wrap']} ${
                          dragIndex === idx ? styles['add-thumb-drag'] : ''
                        } ${
                          dropIndex === idx && dragIndex !== idx
                            ? styles['add-thumb-drop']
                            : ''
                        }`}
                        draggable
                        onDragStart={() => setDragIndex(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={() => {
                          setDragIndex(null);
                          setDropIndex(null);
                        }}
                        onClick={() =>
                          setPreview({
                            type: it.mediaType,
                            url: it.play,
                            name: it.fileName,
                          })
                        }
                        style={{ cursor: 'move' }}
                      >
                        {renderThumb(cfg.key, it.thumb)}
                        <div className={styles['add-thumb-name']}>
                          {it.fileName}
                        </div>
                        <DeleteOutlined
                          className={styles['add-thumb-del']}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(cfg.key, it.key);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className={styles['add-footer']}>
            <Button
              onClick={() => history.push('/admin/sync')}
              disabled={submitting}
            >
              取消
            </Button>
            <Button
              type="primary"
              loading={submitting}
              onClick={handleSubmit}
              style={{ background: '#5fa657', borderColor: '#5fa657' }}
            >
              {editId ? '保存修改' : '提交'}
            </Button>
          </div>
        </Form>

        <MediaPicker
          open={pickerOpen}
          artistId={artistStringId()}
          initialSelected={mediaItems[pickerType]
            .filter((i) => i.source === 'library')
            .map((i) => ({
              id: i.libraryId as number,
              mediaType: i.mediaType,
            }))}
          onClose={() => setPickerOpen(false)}
          onConfirm={handlePickerConfirm}
        />

        {/* 预览弹窗：图片查看 / 视频播放 / 音频播放 */}
        <Modal
          open={!!preview}
          footer={null}
          onCancel={() => setPreview(null)}
          title={preview?.name || '预览'}
          width={640}
          className={`${styles['detail-modal']} ${styles['add-preview-modal']}`}
          destroyOnClose
        >
          {preview && preview.type === 'PHOTO' && (
            <img
              src={getImageUrl(preview.url)}
              style={{ width: '100%', display: 'block' }}
              alt={preview.name}
            />
          )}
          {preview && preview.type === 'VIDEO' && preview.url && (
            <video
              controls
              autoPlay
              src={getImageUrl(preview.url)}
              style={{ width: '100%', display: 'block', background: '#000' }}
            />
          )}
          {preview && preview.type === 'VOICE' && preview.url && (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <audio
                controls
                autoPlay
                src={getImageUrl(preview.url)}
                style={{ width: '100%' }}
              />
            </div>
          )}
          {preview &&
            (preview.type === 'VIDEO' || preview.type === 'VOICE') &&
            !preview.url && (
              <div style={{ color: '#999', padding: 24, textAlign: 'center' }}>
                暂无可播放的媒体地址
              </div>
            )}
        </Modal>
      </div>
    </div>
  );
};

export default SyncAdd;
