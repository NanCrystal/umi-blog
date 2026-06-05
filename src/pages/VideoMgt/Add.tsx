import React, { useState, useEffect } from 'react';
import { history } from 'umi';
import {
  Breadcrumb,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Upload,
  message,
} from 'antd';
import {
  InboxOutlined,
  HomeOutlined,
  CloseOutlined,
  PlayCircleOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  getPhotoTypes,
  getPhotoLocations,
  getPhotoPlatforms,
} from '@/services/photoTag';
import { getArtistList } from '@/services/artist';
import { getItineraryList } from '@/services/itinerary';
import { getImageUrl, formatFileSize } from '@/utils/utils';
import { uploadVideoFile, createVideo } from '@/services/video';
import { uploadImageFull } from '@/services/upload';
import styles from './Add.less';

const { Dragger } = Upload;
const { TextArea } = Input;
const { Option } = Select;

const AddVideoComponent: React.FC = () => {
  const [form] = Form.useForm();

  // 下拉数据
  const [artists, setArtists] = useState<any[]>([]);
  const [videoTypes, setVideoTypes] = useState<any[]>([]);
  const [videoLocations, setVideoLocations] = useState<any[]>([]);
  const [videoPlatforms, setVideoPlatforms] = useState<any[]>([]);
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 上传状态
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploaded, setUploaded] = useState(false);
  const [fileKey, setFileKey] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [submitLoading, setSubmitLoading] = useState(false);

  // 封面上传状态
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFileList, setCoverFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getArtistList().catch(() => []),
      getPhotoTypes().catch(() => []),
      getPhotoLocations().catch(() => []),
      getPhotoPlatforms().catch(() => []),
      getItineraryList({ pageSize: 999 }).catch(() => ({ list: [] })),
    ])
      .then(([artistsRes, typesRes, locsRes, platformsRes, itineraryRes]) => {
        setArtists(
          Array.isArray(artistsRes)
            ? artistsRes.map((a: any) => ({
                name: a.name,
                artistId: a.artistId || a.id,
              }))
            : [],
        );
        setVideoTypes(Array.isArray(typesRes) ? typesRes : []);
        setVideoLocations(Array.isArray(locsRes) ? locsRes : []);
        setVideoPlatforms(Array.isArray(platformsRes) ? platformsRes : []);
        setItineraries(
          (itineraryRes as any)?.list ||
            (Array.isArray(itineraryRes) ? itineraryRes : []),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  // ─── 上传处理 ───
  const handleCustomRequest = async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
      const res = await uploadVideoFile(file as File);
      if (!res?.url) {
        onError(new Error('上传失败'));
        return;
      }
      setUploaded(true);
      setFileUrl(res.url);
      setFileKey(res.key || res.url);
      setFileSize((file as File).size);

      const fileName = (file as File).name.replace(/\.[^.]+$/, '');
      form.setFieldsValue({ fileName });

      onSuccess({ url: res.url }, file);
    } catch {
      message.error('视频上传失败');
      onError(new Error('上传失败'));
    }
  };

  // ─── 封面上传 ───
  const handleCoverUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
      const res = await uploadImageFull(file as File);
      if (!res?.url) {
        onError(new Error('封面上传失败'));
        return;
      }
      setCoverUrl(res.url);
      onSuccess(res, file);
    } catch {
      message.error('封面上传失败');
      onError(new Error('封面上传失败'));
    }
  };

  const handleCoverChange = (info: {
    file: UploadFile;
    fileList: UploadFile[];
  }) => {
    setCoverFileList([...info.fileList]);
    if (info.file.status === 'removed') {
      setCoverUrl('');
      setCoverFileList([]);
    }
  };

  const handleRemoveCover = () => {
    setCoverFileList([]);
    setCoverUrl('');
  };

  const handleFileChange = (info: {
    file: UploadFile;
    fileList: UploadFile[];
  }) => {
    setFileList([...info.fileList]);
    if (info.file.status === 'removed') {
      setUploaded(false);
      setFileUrl('');
      setFileKey('');
      setFileSize(0);
      form.setFieldsValue({ fileName: '', shootDate: undefined });
    }
  };

  const handleRemoveVideo = () => {
    setFileList([]);
    setUploaded(false);
    setFileUrl('');
    setFileKey('');
    setFileSize(0);
    setCoverUrl('');
    setCoverFileList([]);
    form.setFieldsValue({ fileName: '', shootDate: undefined });
  };

  // ─── 提交 ───
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!uploaded) {
        message.error('请先上传视频');
        return;
      }
      setSubmitLoading(true);
      await createVideo({
        fileName: values.fileName,
        artistId: values.artistId,
        qiniuKey: fileKey,
        originalUrl: fileUrl,
        coverUrl: coverUrl || undefined,
        shootDate: values.shootDate.format('YYYY-MM-DD'),
        size: fileSize || undefined,
        tagTypeId: values.videoTypeId,
        tagLocationId: values.videoLocationId,
        tagPlatformId: values.videoPlatformId,
        itineraryId: values.itineraryId,
        description: values.description,
      });
      message.success('视频添加成功');
      history.push('/admin/video');
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || '添加失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── 预览卡片 ───
  const renderVideoPreview = () => {
    if (!uploaded || !fileUrl) return null;
    const ext = fileUrl.split('.').pop()?.toUpperCase() || 'MP4';
    return (
      <div className={styles['video-preview']}>
        <div className={styles['video-preview-thumb']}>
          <img
            src={`${getImageUrl(fileUrl)}?vframe/jpg/offset/0`}
            alt="视频封面"
          />
          <PlayCircleOutlined className={styles['video-preview-icon']} />
        </div>
        <div className={styles['video-preview-info']}>
          <span className={styles['video-preview-name']}>
            {form.getFieldValue('fileName') || '未命名视频'}
          </span>
          <span className={styles['video-preview-meta']}>
            {ext} · {fileSize > 0 ? formatFileSize(fileSize) : '已上传'}
          </span>
        </div>
        <CloseOutlined
          className={styles['video-preview-remove']}
          onClick={handleRemoveVideo}
        />
      </div>
    );
  };

  return (
    <div className={styles['add-video-page']}>
      <div className={styles['breadcrumb-wrap']}>
        <Breadcrumb className={styles['breadcrumb']}>
          <Breadcrumb.Item>
            <a onClick={() => history.push('/admin/video')}>
              <HomeOutlined style={{ marginRight: 4 }} />
              全部视频
            </a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>添加视频</Breadcrumb.Item>
        </Breadcrumb>
      </div>

      <div className={styles['tab-panel']}>
        <div className={styles['form-wrap']}>
          <Form form={form} layout="vertical" className={styles['add-form']}>
            {/* 1. 上传视频 */}
            <Form.Item
              label="上传视频"
              required
              className={styles['upload-item']}
            >
              {uploaded && fileUrl ? (
                renderVideoPreview()
              ) : (
                <Dragger
                  accept=".mp4,.mov,.avi,.mkv,.webm"
                  fileList={fileList}
                  customRequest={handleCustomRequest}
                  onChange={handleFileChange}
                  maxCount={1}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽视频到此区域上传</p>
                  <p className={styles['upload-hint']}>
                    支持 mp4、mov、avi、mkv、webm 格式，500M 以内
                  </p>
                </Dragger>
              )}
            </Form.Item>

            {/* 1.5 上传封面 */}
            <Form.Item label="上传封面（可选）">
              {coverUrl ? (
                <div className={styles['cover-preview']}>
                  <img src={getImageUrl(coverUrl)} alt="封面" />
                  <span className={styles['cover-preview-name']}>封面图片</span>
                  <CloseOutlined
                    className={styles['cover-preview-remove']}
                    onClick={handleRemoveCover}
                  />
                </div>
              ) : (
                <Upload
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  fileList={coverFileList}
                  customRequest={handleCoverUpload}
                  onChange={handleCoverChange}
                  maxCount={1}
                  showUploadList={false}
                >
                  <Button
                    icon={<PictureOutlined />}
                    style={{
                      background: 'transparent',
                      border: '1px dashed #333',
                      color: '#999',
                      borderRadius: 0,
                    }}
                  >
                    点击上传封面
                  </Button>
                </Upload>
              )}
            </Form.Item>

            {/* 2. 文件名称 */}
            <Form.Item
              name="fileName"
              label="文件名称"
              rules={[{ required: true, message: '请输入文件名称' }]}
            >
              <Input
                placeholder="上传视频后自动获取，可手动修改"
                maxLength={100}
              />
            </Form.Item>

            {/* 3. 艺人 */}
            <Form.Item
              name="artistId"
              label="艺人"
              rules={[{ required: true, message: '请选择艺人' }]}
            >
              <Select
                placeholder="请选择艺人"
                loading={loading}
                showSearch
                optionFilterProp="children"
              >
                {artists.map((a) => (
                  <Option key={a.artistId} value={a.artistId}>
                    {a.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* 4. 拍摄日期 */}
            <Form.Item
              name="shootDate"
              label="拍摄日期"
              rules={[{ required: true, message: '请选择拍摄日期' }]}
            >
              <DatePicker
                format="YYYY-MM-DD"
                style={{ width: '100%' }}
                placeholder="选择拍摄日期"
              />
            </Form.Item>

            {/* 5. 视频类型 */}
            <Form.Item name="videoTypeId" label="视频类型">
              <Select placeholder="请选择视频类型" allowClear loading={loading}>
                {videoTypes.map((t) => (
                  <Option key={t.id} value={t.id}>
                    {t.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* 6. 拍摄地点 */}
            <Form.Item name="videoLocationId" label="拍摄地点">
              <Select placeholder="请选择拍摄地点" allowClear loading={loading}>
                {videoLocations.map((l) => (
                  <Option key={l.id} value={l.id}>
                    {l.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* 7. 发布平台 */}
            <Form.Item name="videoPlatformId" label="发布平台">
              <Select placeholder="请选择发布平台" allowClear loading={loading}>
                {videoPlatforms.map((p) => (
                  <Option key={p.id} value={p.id}>
                    {p.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* 8. 行程 */}
            <Form.Item name="itineraryId" label="行程">
              <Select
                placeholder="请选择行程"
                allowClear
                loading={loading}
                showSearch
                optionFilterProp="children"
              >
                {itineraries.map((i: any) => (
                  <Option key={i.id} value={i.id}>
                    {i.title} {i.location ? `· ${i.location}` : ''}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* 9. 描述 */}
            <Form.Item name="description" label="描述">
              <TextArea
                placeholder="请输入描述"
                rows={3}
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={submitLoading}
                className={styles['submit-btn']}
                block
              >
                提交
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default AddVideoComponent;
