import React, { useEffect, useState } from 'react';
import { history, useLocation } from 'umi';
import {
  Breadcrumb,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Button,
  Upload,
  Image,
  message,
} from 'antd';
import {
  HomeOutlined,
  InboxOutlined,
  CloseOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { getArtistList } from '@/services/artist';
import {
  createAppModule,
  updateAppModule,
  getAppModuleDetail,
} from '@/services/appModule';
import { uploadImageFull } from '@/services/upload';
import { uploadVideoFile } from '@/services/video';
import { getImageUrl, formatFileSize } from '@/utils/utils';
import styles from './Add.less';

const { Dragger } = Upload;
const { TextArea } = Input;

interface ArtistItem {
  id: number;
  name: string;
  artistId: string;
}

const AddModulePage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showArtistSelect, setShowArtistSelect] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [resourceType, setResourceType] = useState<'image' | 'video'>('image');
  const location = useLocation();

  // 视频上传状态
  const [videoFileList, setVideoFileList] = useState<UploadFile[]>([]);
  const [videoUploaded, setVideoUploaded] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFileSize, setVideoFileSize] = useState(0);

  // 图片上传状态（支持拖拽排序）
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchArtists();
    checkEditMode();
  }, []);

  const checkEditMode = async () => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) {
      setEditId(Number(id));
      try {
        const data = await getAppModuleDetail(Number(id));
        form.setFieldsValue({
          name: data.name,
          key: data.key,
          description: data.description || '',
          status: data.status === 1,
          sortOrder: data.sortOrder ?? 0,
          artistIds: data.artistIds?.map((a: ArtistItem) => a.id) || [],
        });
        // 资源类型回显逻辑：video有值优先video，image有值则image，都没有默认image
        let hasImage = false;
        let hasVideo = false;

        if (data.video) {
          let videoList: string[] = [];
          try {
            const parsed =
              typeof data.video === 'string'
                ? JSON.parse(data.video)
                : data.video;
            videoList = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            videoList = [data.video];
          }
          // 检查video是否有有效内容（非空数组）
          if (videoList.length > 0 && videoList[0]) {
            hasVideo = true;
            setShowImageUpload(true);
            setResourceType('video');
            setVideoUploaded(true);
            setVideoUrl(videoList[0]);
            form.setFieldValue(
              'video',
              videoList.map((url: string, index: number) => ({
                uid: `-${index}`,
                name: url.split('/').pop() || 'video',
                status: 'done',
                url,
              })),
            );
          }
        }

        if (data.image && !hasVideo) {
          let imageList: string[] = [];
          try {
            const parsed =
              typeof data.image === 'string'
                ? JSON.parse(data.image)
                : data.image;
            imageList = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            imageList = [data.image];
          }
          // 检查image是否有有效内容
          if (imageList.length > 0 && imageList[0]) {
            hasImage = true;
            setShowImageUpload(true);
            setResourceType('image');
            setImageUrls(imageList);
            form.setFieldValue(
              'image',
              imageList.map((url: string, index: number) => ({
                uid: `-${index}`,
                name: url.split('/').pop() || 'image',
                status: 'done',
                url,
                thumbUrl: getImageUrl(url),
              })),
            );
          }
        }

        // 都没有资源时，默认显示图片类型（但不上传区域不展开）
        if (!hasImage && !hasVideo) {
          setResourceType('image');
        }
        const hasArtists = data.artistIds && data.artistIds.length > 0;
        setShowArtistSelect(hasArtists);
      } catch {
        message.error('获取模块详情失败');
      }
    }
  };

  const fetchArtists = async () => {
    try {
      const data = await getArtistList();
      setArtists(data || []);
    } catch (error) {
      console.error('获取艺人列表失败', error);
    }
  };

  // ─── 图片上传处理（支持拖拽排序） ───
  const handleImageUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newUrls: string[] = [...imageUrls];
    for (const file of Array.from(fileList)) {
      try {
        const res = await uploadImageFull(file);
        if (res?.url) {
          newUrls.push(res.url);
        }
      } catch (err) {
        console.error('图片上传失败', err);
        message.error('图片上传失败');
      }
    }
    setImageUrls(newUrls);
    // 同步到表单
    form.setFieldValue(
      'image',
      newUrls.map((url, index) => ({
        uid: `-${index}`,
        name: url.split('/').pop() || 'image',
        status: 'done',
        url,
        thumbUrl: getImageUrl(url),
      })),
    );
  };

  const handleRemoveImage = (index: number) => {
    const newUrls = imageUrls.filter((_, i) => i !== index);
    setImageUrls(newUrls);
    if (newUrls.length > 0) {
      form.setFieldValue(
        'image',
        newUrls.map((url, idx) => ({
          uid: `-${idx}`,
          name: url.split('/').pop() || 'image',
          status: 'done',
          url,
          thumbUrl: getImageUrl(url),
        })),
      );
    } else {
      form.setFieldValue('image', undefined);
    }
  };

  // ─── 视频上传处理 ───
  const handleVideoCustomRequest = async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
      const res = await uploadVideoFile(file as File);
      if (!res?.url) {
        onError(new Error('上传失败'));
        return;
      }
      setVideoUploaded(true);
      setVideoUrl(res.url);
      setVideoFileSize((file as File).size);
      form.setFieldValue('video', [{ url: res.url }]);
      onSuccess({ url: res.url }, file);
    } catch {
      message.error('视频上传失败');
      onError(new Error('上传失败'));
    }
  };

  const handleVideoFileChange = (info: {
    file: UploadFile;
    fileList: UploadFile[];
  }) => {
    setVideoFileList([...info.fileList]);
    if (info.file.status === 'removed') {
      handleRemoveVideo();
    }
  };

  const handleRemoveVideo = () => {
    setVideoFileList([]);
    setVideoUploaded(false);
    setVideoUrl('');
    setVideoFileSize(0);
    form.setFieldValue('video', []);
  };

  // ─── 视频预览卡片 ───
  const renderVideoPreview = () => {
    if (!videoUploaded || !videoUrl) return null;
    const ext = videoUrl.split('.').pop()?.toUpperCase() || 'MP4';
    return (
      <div className={styles['video-preview']}>
        <div className={styles['video-preview-thumb']}>
          <img
            src={`${getImageUrl(videoUrl)}?vframe/jpg/offset/0`}
            alt="视频封面"
          />
          <PlayCircleOutlined className={styles['video-preview-icon']} />
        </div>
        <div className={styles['video-preview-info']}>
          <span className={styles['video-preview-name']}>
            {videoUrl.split('/').pop() || '未命名视频'}
          </span>
          <span className={styles['video-preview-meta']}>
            {ext} ·{' '}
            {videoFileSize > 0 ? formatFileSize(videoFileSize) : '已上传'}
          </span>
        </div>
        <CloseOutlined
          className={styles['video-preview-remove']}
          onClick={handleRemoveVideo}
        />
      </div>
    );
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      console.log('values', values);

      console.log('values1', values);

      const payload: any = {
        name: values.name,
        key: values.key,
        description: values.description || undefined,
        sortOrder: values.sortOrder,
        status: values.status ? 1 : 0,
        image:
          resourceType === 'image' && imageUrls.length > 0
            ? JSON.stringify(imageUrls)
            : null,
        video:
          resourceType === 'video' && videoUrl
            ? JSON.stringify([videoUrl])
            : '[]',
        artistIds: showArtistSelect ? values.artistIds || [] : [],
      };

      if (editId) {
        await updateAppModule(editId, payload);
        message.success('更新成功');
      } else {
        await createAppModule(payload);
        message.success('新增成功');
      }
      history.push('/admin/app_settings');
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(editId ? '更新失败' : '新增失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles['add-module-page']}>
      <div className={styles['breadcrumb-wrap']}>
        <Breadcrumb className={styles['breadcrumb']}>
          <Breadcrumb.Item>
            <a onClick={() => history.push('/admin/app_settings')}>
              <HomeOutlined style={{ marginRight: 4 }} />
              APP管理
            </a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>{editId ? '编辑模块' : '新增模块'}</Breadcrumb.Item>
        </Breadcrumb>
      </div>

      <div className={styles['tab-panel']}>
        <div className={styles['form-wrap']}>
          <Form
            form={form}
            layout="vertical"
            className={styles['add-form']}
            autoComplete="off"
            onFinish={handleSubmit}
            initialValues={{ status: true, sortOrder: 0 }}
          >
            <Form.Item
              label="是否开启模块 "
              name="status"
              valuePropName="checked"
            >
              <Switch
                checkedChildren="开启"
                unCheckedChildren="关闭"
                defaultChecked
              />
            </Form.Item>

            <Form.Item
              label="模块名称"
              name="name"
              rules={[{ required: true, message: '请输入模块名称' }]}
            >
              <Input placeholder="请输入模块名称" maxLength={50} />
            </Form.Item>

            <Form.Item
              label="模块ID"
              name="key"
              rules={[
                { required: true, message: '请输入模块ID' },
                {
                  pattern: /^[a-zA-Z0-9]*$/,
                  message: '只能输入英文字母和数字',
                },
                { max: 20, message: '最多20个字符' },
              ]}
            >
              <Input
                placeholder="请输入模块ID（仅支持英文、数字）"
                maxLength={20}
                disabled={!!editId}
              />
            </Form.Item>

            <Form.Item label="是否配置资源" valuePropName="checked">
              <Switch
                checkedChildren="是"
                unCheckedChildren="否"
                checked={showImageUpload}
                onChange={(checked) => {
                  setShowImageUpload(checked);
                  if (!checked) {
                    form.setFieldValue('image', undefined);
                    form.setFieldValue('video', undefined);
                  }
                }}
              />
            </Form.Item>

            {showImageUpload && (
              <>
                <Form.Item label="资源类型">
                  <Select
                    value={resourceType}
                    onChange={(value: 'image' | 'video') => {
                      setResourceType(value);
                      form.setFieldValue('image', undefined);
                      form.setFieldValue('video', undefined);
                    }}
                    options={[
                      { label: '图片', value: 'image' },
                      { label: '视频', value: 'video' },
                    ]}
                  />
                </Form.Item>

                {resourceType === 'image' ? (
                  <Form.Item label="上传图片" required>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        handleImageUpload(e.target.files);
                        e.target.value = '';
                      }}
                      className={styles['file-input']}
                    />
                    {imageUrls.length > 0 && (
                      <div className={styles['preview-container']}>
                        {imageUrls.map((url, index) => (
                          <div
                            key={url + index}
                            draggable
                            onDragStart={() => setDragIndex(index)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (dragIndex === null || dragIndex === index)
                                return;
                              setImageUrls((prev) => {
                                const newUrls = [...prev];
                                const [dragged] = newUrls.splice(dragIndex, 1);
                                newUrls.splice(index, 0, dragged);
                                // 同步到表单
                                form.setFieldValue(
                                  'image',
                                  newUrls.map((u, idx) => ({
                                    uid: `-${idx}`,
                                    name: u.split('/').pop() || 'image',
                                    status: 'done',
                                    url: u,
                                    thumbUrl: getImageUrl(u),
                                  })),
                                );
                                return newUrls;
                              });
                              setDragIndex(index);
                            }}
                            onDragEnd={() => setDragIndex(null)}
                            style={{
                              position: 'relative',
                              display: 'inline-block',
                              marginRight: 8,
                              marginBottom: 8,
                              cursor: 'move',
                              opacity: dragIndex === index ? 0.5 : 1,
                            }}
                          >
                            <Image
                              src={`${getImageUrl(url)}${
                                imageErrors.has(index) ? `?t=${Date.now()}` : ''
                              }`}
                              width={100}
                              height={60}
                              style={{ borderRadius: 4, objectFit: 'cover' }}
                              fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 60'%3E%3Crect fill='%23333' width='100' height='60'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='10'%3E加载中...%3C/text%3E%3C/svg%3E"
                              onError={() => {
                                setImageErrors((prev) =>
                                  new Set(prev).add(index),
                                );
                                // 延迟重试（CDN传播延迟）
                                setTimeout(() => {
                                  setImageErrors((prev) => {
                                    const next = new Set(prev);
                                    next.delete(index);
                                    return next;
                                  });
                                }, 1500);
                              }}
                              onLoad={() => {
                                setImageErrors((prev) => {
                                  const next = new Set(prev);
                                  next.delete(index);
                                  return next;
                                });
                              }}
                            />
                            <CloseOutlined
                              onClick={() => handleRemoveImage(index)}
                              style={{
                                position: 'absolute',
                                top: -6,
                                right: -6,
                                color: '#fff',
                                background: '#ff4d4f',
                                borderRadius: '50%',
                                fontSize: 10,
                                padding: 2,
                                cursor: 'pointer',
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </Form.Item>
                ) : (
                  <Form.Item
                    label="上传视频"
                    required
                    className={styles['upload-item']}
                  >
                    {videoUploaded && videoUrl ? (
                      renderVideoPreview()
                    ) : (
                      <Dragger
                        accept=".mp4,.mov,.avi,.mkv,.webm"
                        fileList={videoFileList}
                        customRequest={handleVideoCustomRequest}
                        onChange={handleVideoFileChange}
                        maxCount={1}
                      >
                        <p className="ant-upload-drag-icon">
                          <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">
                          点击或拖拽视频到此区域上传
                        </p>
                        <p className={styles['upload-hint']}>
                          支持 mp4、mov、avi、mkv、webm 格式，500M 以内
                        </p>
                      </Dragger>
                    )}
                  </Form.Item>
                )}
              </>
            )}

            <Form.Item
              label="排序"
              name="sortOrder"
              rules={[{ required: true, message: '请输入排序' }]}
            >
              <InputNumber
                min={0}
                placeholder="数字越小越靠前"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item label="是否配置艺人" valuePropName="checked">
              <Switch
                checkedChildren="是"
                unCheckedChildren="否"
                checked={showArtistSelect}
                onChange={(checked) => {
                  setShowArtistSelect(checked);
                  if (!checked) form.setFieldValue('artistIds', undefined);
                }}
              />
            </Form.Item>

            {showArtistSelect && (
              <Form.Item label="选择艺人" name="artistIds">
                <Select
                  mode="multiple"
                  showSearch
                  placeholder="请选择艺人（可多选）"
                  optionFilterProp="label"
                  options={artists.map((item) => ({
                    value: item.id,
                    label: `${item.name} (${item.artistId})`,
                  }))}
                />
              </Form.Item>
            )}

            <Form.Item label="描述" name="description">
              <TextArea
                rows={4}
                placeholder="请输入描述信息（可选）"
                maxLength={200}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className={styles['submit-btn']}
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

export default AddModulePage;
