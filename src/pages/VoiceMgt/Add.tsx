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
  Tabs,
  message,
} from 'antd';
import {
  InboxOutlined,
  HomeOutlined,
  CloseOutlined,
  SoundOutlined,
  FileZipOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
// import { // 类型/地点/平台暂不展示
//   getPhotoTypes,
//   getPhotoLocations,
//   getPhotoPlatforms,
// } from '@/services/photoTag';
import { getArtistList } from '@/services/artist';
// import { getItineraryList } from '@/services/itinerary'; // 行程暂不展示
import { getImageUrl } from '@/utils/utils';
import {
  uploadVoiceFile,
  uploadVoiceCover,
  uploadAudioZipBatch,
  createVoice,
} from '@/services/voice';
import styles from './Add.less';

const { Dragger } = Upload;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

function fmtDuration(seconds?: number): string {
  if (seconds == null || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const AddVoiceComponent: React.FC = () => {
  const [form] = Form.useForm();

  // 下拉数据
  const [artists, setArtists] = useState<any[]>([]);
  const [voiceTypes, setVoiceTypes] = useState<any[]>([]);
  const [voiceLocations, setVoiceLocations] = useState<any[]>([]);
  const [voicePlatforms, setVoicePlatforms] = useState<any[]>([]);
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ─── 单条上传状态 ───
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploaded, setUploaded] = useState(false);
  const [fileKey, setFileKey] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [audioDuration, setAudioDuration] = useState<number | null>(null); // 从 ffprobe 读取的时长
  const [submitLoading, setSubmitLoading] = useState(false);

  // ─── 封面上传状态 ───
  const [coverFileList, setCoverFileList] = useState<UploadFile[]>([]);
  const [coverUploaded, setCoverUploaded] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');

  // ─── ZIP 上传状态 ───
  const [zipFileList, setZipFileList] = useState<UploadFile[]>([]);
  const [zipUploaded, setZipUploaded] = useState(false);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipFileName, setZipFileName] = useState('');
  const [zipSubmitLoading, setZipSubmitLoading] = useState(false);
  const [zipProgress, setZipProgress] = useState<number | undefined>(undefined);

  // ─── 当前 Tab ───
  const [activeTab, setActiveTab] = useState<string>('single');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getArtistList().catch(() => []),
      // getPhotoTypes().catch(() => []), // 暂不展示
      // getPhotoLocations().catch(() => []), // 暂不展示
      // getPhotoPlatforms().catch(() => []), // 暂不展示
      // getItineraryList({ pageSize: 999 }).catch(() => ({ list: [] })), // 行程暂不展示
    ])
      .then(
        ([
          artistsRes /* , typesRes, locsRes, platformsRes , itineraryRes */,
        ]) => {
          setArtists(
            Array.isArray(artistsRes)
              ? artistsRes.map((a: any) => ({
                  name: a.name,
                  artistId: a.artistId || a.id,
                }))
              : [],
          );
          // 暂不展示
          // setVoiceTypes(Array.isArray(typesRes) ? typesRes : []);
          // setVoiceLocations(Array.isArray(locsRes) ? locsRes : []);
          // setVoicePlatforms(Array.isArray(platformsRes) ? platformsRes : []);
          // 行程暂不展示
          // setItineraries(
          //   (itineraryRes as any)?.list ||
          //     (Array.isArray(itineraryRes) ? itineraryRes : []),
          // );
        },
      )
      .finally(() => setLoading(false));
  }, []);

  // ─── 重置表单 ───
  const resetForm = () => {
    form.resetFields();
    // 单条
    setFileList([]);
    setUploaded(false);
    setFileUrl('');
    setFileKey('');
    setAudioDuration(null);
    // 封面
    setCoverFileList([]);
    setCoverUploaded(false);
    setCoverUrl('');
    // ZIP
    setZipFileList([]);
    setZipUploaded(false);
    setZipFile(null);
    setZipFileName('');
    setZipProgress(undefined);
  };

  // ========================== 单条上传 ==========================
  const handleCustomRequest = async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
      const res = await uploadVoiceFile(file as File);
      if (!res?.url) {
        onError(new Error('上传失败'));
        return;
      }
      setUploaded(true);
      setFileUrl(res.url);
      setFileKey(res.key || res.url);
      // 从后端读取的音频时长
      if (res.duration != null && res.duration > 0) {
        setAudioDuration(res.duration);
      }

      const fileName = (file as File).name.replace(/\.[^.]+$/, '');
      form.setFieldsValue({ fileName });

      onSuccess({ url: res.url }, file);
    } catch {
      message.error('音频上传失败');
      onError(new Error('上传失败'));
    }
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
      setAudioDuration(null);
      form.setFieldsValue({ fileName: '', shootDate: undefined });
    }
  };

  const handleRemoveVoice = () => {
    setFileList([]);
    setUploaded(false);
    setFileUrl('');
    setFileKey('');
    setAudioDuration(null);
    form.setFieldsValue({ fileName: '', shootDate: undefined });
  };

  // ========================== 封面上传 ==========================
  const handleCoverCustomRequest = async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
      const res = await uploadVoiceCover(file as File);
      if (!res?.url) {
        onError(new Error('上传失败'));
        return;
      }
      setCoverUploaded(true);
      setCoverUrl(res.url);
      onSuccess({ url: res.url }, file);
    } catch {
      message.error('封面上传失败');
      onError(new Error('上传失败'));
    }
  };

  const handleCoverChange = (info: {
    file: UploadFile;
    fileList: UploadFile[];
  }) => {
    setCoverFileList([...info.fileList]);
    if (info.file.status === 'removed') {
      setCoverUploaded(false);
      setCoverUrl('');
    }
  };

  // ─── 单条提交 ───
  const handleSingleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!uploaded) {
        message.error('请先上传音频');
        return;
      }
      setSubmitLoading(true);
      await createVoice({
        fileName: values.fileName,
        artistId: values.artistId,
        qiniuKey: fileKey,
        originalUrl: fileUrl,
        coverUrl: coverUrl || undefined,
        duration: audioDuration ?? undefined,
        shootDate: values.shootDate.format('YYYY-MM-DD'),
        tagTypeId: values.voiceTypeId,
        tagLocationId: values.voiceLocationId,
        tagPlatformId: values.voicePlatformId,
        // itineraryId: values.itineraryId, // 行程暂不展示
        description: values.description,
      });
      message.success('音频添加成功');
      history.push('/admin/voice');
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || '添加失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ========================== ZIP 上传 ==========================
  const handleZipCustomRequest = (options: any) => {
    const { file, onSuccess } = options;
    // ZIP 不再预上传到七牛，只保存文件对象，提交时一次性上传+解压
    setZipUploaded(true);
    setZipFile(file as File);
    setZipFileName((file as File).name);
    onSuccess({ fileName: (file as File).name }, file);
  };

  const handleZipFileChange = (info: {
    file: UploadFile;
    fileList: UploadFile[];
  }) => {
    setZipFileList([...info.fileList]);
    if (info.file.status === 'removed') {
      setZipUploaded(false);
      setZipFile(null);
      setZipFileName('');
      setZipProgress(undefined);
      form.setFieldsValue({
        artistId: undefined,
        shootDate: undefined,
        voiceTypeId: undefined,
        voiceLocationId: undefined,
        voicePlatformId: undefined,
        // itineraryId: undefined, // 行程暂不展示
        description: undefined,
      });
    }
  };

  const handleRemoveZip = () => {
    setZipFileList([]);
    setZipUploaded(false);
    setZipFile(null);
    setZipFileName('');
    setZipProgress(undefined);
    form.resetFields();
  };

  // ─── ZIP 提交（上传 + 自动解压入库） ───
  const handleZipSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!zipUploaded || !zipFile) {
        message.error('请先上传 ZIP 压缩包');
        return;
      }
      setZipSubmitLoading(true);
      const { promise } = uploadAudioZipBatch({
        file: zipFile,
        artistId: values.artistId,
        shootDate: values.shootDate?.format('YYYY-MM-DD'),
        description: values.description || '',
        tagTypeId: values.voiceTypeId,
        tagLocationId: values.voiceLocationId,
        tagPlatformId: values.voicePlatformId,
        itineraryId: values.itineraryId,
        onProgress: (percent) => setZipProgress(percent),
      });
      const res = await promise;
      if (res.successCount > 0) {
        message.success(
          `ZIP 解析完成：成功 ${res.successCount} 个${
            res.failCount > 0 ? `，失败 ${res.failCount} 个` : ''
          }`,
        );
        if (res.failFiles?.length) {
          console.warn('[AudioZip] 失败文件:', res.failFiles);
        }
        history.push('/admin/voice');
      } else {
        message.error(res.message || 'ZIP 解压失败，未找到有效的音频文件');
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'ZIP 上传失败');
    } finally {
      setZipSubmitLoading(false);
      setZipProgress(undefined);
    }
  };

  // ─── 统一切换 Tab 重置 ───
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    resetForm();
  };

  // ─── 单条音频预览卡片 ───
  const renderVoicePreview = () => {
    if (!uploaded || !fileUrl) return null;
    const ext = fileUrl.split('.').pop()?.toUpperCase() || 'AUDIO';
    return (
      <div className={styles['voice-preview']}>
        <div className={styles['voice-preview-thumb']}>
          {coverUploaded && coverUrl ? (
            <img
              src={getImageUrl(coverUrl)}
              alt="封面"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <SoundOutlined className={styles['voice-preview-icon']} />
          )}
        </div>
        <div className={styles['voice-preview-info']}>
          <span className={styles['voice-preview-name']}>
            {form.getFieldValue('fileName') || '未命名音频'}
          </span>
          <span className={styles['voice-preview-meta']}>
            {ext} · 已上传
            {audioDuration != null ? ` · ${fmtDuration(audioDuration)}` : ''}
          </span>
        </div>
        <CloseOutlined
          className={styles['voice-preview-remove']}
          onClick={handleRemoveVoice}
        />
      </div>
    );
  };

  // ─── ZIP 预览卡片 ───
  const renderZipPreview = () => {
    if (!zipUploaded || !zipFile) return null;
    return (
      <div className={styles['zip-preview']}>
        <FileZipOutlined className={styles['zip-icon']} />
        <div className={styles['zip-info']}>
          <span className={styles['zip-name']}>{zipFileName}</span>
          <span className={styles['zip-size']}>
            {(zipFile.size / 1024 / 1024).toFixed(2)} MB
            {zipProgress != null &&
              zipProgress < 100 &&
              ` · 处理中 ${zipProgress}%`}
          </span>
        </div>
        <CloseOutlined
          className={styles['zip-remove']}
          onClick={handleRemoveZip}
        />
      </div>
    );
  };

  // ─── 表单字段（共用） ───
  const renderFormFields = () => (
    <>
      {/* 文件名称 */}
      <Form.Item
        name="fileName"
        label="文件名称"
        rules={[{ required: true, message: '请输入文件名称' }]}
      >
        <Input placeholder="上传后自动获取，可手动修改" maxLength={100} />
      </Form.Item>

      {/* 音频时长（只读，从文件元数据读取） */}
      {audioDuration != null && (
        <Form.Item label="音频时长">
          <Input
            value={fmtDuration(audioDuration)}
            disabled
            style={{ color: '#65dca8' }}
          />
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            根据文件元数据自动读取，不可修改
          </div>
        </Form.Item>
      )}

      {/* 封面上传（选填） */}
      <Form.Item label="上传封面（选填）" className={styles['upload-item']}>
        {coverUploaded && coverUrl ? (
          <div
            className={styles['voice-preview']}
            style={{ border: '1px solid #262626' }}
          >
            <div className={styles['voice-preview-thumb']}>
              <img
                src={getImageUrl(coverUrl)}
                alt="封面"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div className={styles['voice-preview-info']}>
              <span className={styles['voice-preview-name']}>自定义封面</span>
              <span className={styles['voice-preview-meta']}>已上传</span>
            </div>
            <CloseOutlined
              className={styles['voice-preview-remove']}
              onClick={() => {
                setCoverFileList([]);
                setCoverUploaded(false);
                setCoverUrl('');
              }}
            />
          </div>
        ) : (
          <Upload
            accept=".jpg,.jpeg,.png,.webp"
            fileList={coverFileList}
            customRequest={handleCoverCustomRequest}
            onChange={handleCoverChange}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>选择封面图片</Button>
          </Upload>
        )}
      </Form.Item>

      {/* 艺人 */}
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

      {/* 拍摄日期 */}
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

      {/* 音频类型（暂不展示）
      <Form.Item name="voiceTypeId" label="音频类型">
        <Select placeholder="请选择音频类型" allowClear loading={loading}>
          {voiceTypes.map((t) => (
            <Option key={t.id} value={t.id}>
              {t.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
      */}

      {/* 拍摄地点（暂不展示）
      <Form.Item name="voiceLocationId" label="拍摄地点">
        <Select placeholder="请选择拍摄地点" allowClear loading={loading}>
          {voiceLocations.map((l) => (
            <Option key={l.id} value={l.id}>
              {l.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
      */}

      {/* 发布平台（暂不展示）
      <Form.Item name="voicePlatformId" label="发布平台">
        <Select placeholder="请选择发布平台" allowClear loading={loading}>
          {voicePlatforms.map((p) => (
            <Option key={p.id} value={p.id}>
              {p.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
      */}

      {/* 行程（暂不展示）
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
      */}

      {/* 描述 */}
      <Form.Item name="description" label="描述">
        <TextArea placeholder="请输入描述" rows={3} maxLength={500} showCount />
      </Form.Item>
    </>
  );

  return (
    <div className={styles['add-voice-page']}>
      <div className={styles['breadcrumb-wrap']}>
        <Breadcrumb className={styles['breadcrumb']}>
          <Breadcrumb.Item>
            <a onClick={() => history.push('/admin/voice')}>
              <HomeOutlined style={{ marginRight: 4 }} />
              全部音频
            </a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>添加音频</Breadcrumb.Item>
        </Breadcrumb>
      </div>

      <div className={styles['tab-panel']}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          className={styles['tabs']}
        >
          {/* =========== Tab 1: 单条上传 =========== */}
          <TabPane tab="单条上传" key="single">
            <div className={styles['form-wrap']}>
              <Form
                form={form}
                layout="vertical"
                className={styles['add-form']}
              >
                {/* 1. 上传音频 */}
                <Form.Item
                  label="上传音频"
                  required
                  className={styles['upload-item']}
                >
                  {uploaded && fileUrl ? (
                    renderVoicePreview()
                  ) : (
                    <Dragger
                      accept=".mp3,.wav,.flac,.aac,.ogg,.wma,.m4a,.opus"
                      fileList={fileList}
                      customRequest={handleCustomRequest}
                      onChange={handleFileChange}
                      maxCount={1}
                    >
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p className="ant-upload-text">
                        点击或拖拽音频到此区域上传
                      </p>
                      <p className={styles['upload-hint']}>
                        支持 mp3、wav、flac、aac、ogg、wma、m4a、opus
                        格式，500MB 以内
                      </p>
                    </Dragger>
                  )}
                </Form.Item>

                {renderFormFields()}

                <Form.Item>
                  <Button
                    type="primary"
                    onClick={handleSingleSubmit}
                    loading={submitLoading}
                    className={styles['submit-btn']}
                    block
                  >
                    提交
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </TabPane>

          {/* =========== Tab 2: ZIP 批量上传 =========== */}
          <TabPane tab="ZIP 批量上传" key="zip">
            <div className={styles['form-wrap']}>
              <Form
                form={form}
                layout="vertical"
                className={styles['add-form']}
              >
                {/* 1. 上传 ZIP */}
                <Form.Item
                  label="上传 ZIP 压缩包"
                  required
                  className={styles['upload-item']}
                >
                  {zipUploaded && zipFile ? (
                    renderZipPreview()
                  ) : (
                    <Dragger
                      accept=".zip"
                      fileList={zipFileList}
                      customRequest={handleZipCustomRequest}
                      onChange={handleZipFileChange}
                      maxCount={1}
                    >
                      <p className="ant-upload-drag-icon">
                        <FileZipOutlined
                          style={{ fontSize: 40, color: '#666' }}
                        />
                      </p>
                      <p className="ant-upload-text">
                        点击或拖拽 ZIP 包到此区域上传
                      </p>
                      <p className={styles['upload-hint']}>
                        将包含多个音频文件的 .zip
                        包直接上传至七牛，后端将自动解压处理
                      </p>
                    </Dragger>
                  )}
                </Form.Item>

                {renderFormFields()}

                <Form.Item>
                  <Button
                    type="primary"
                    onClick={handleZipSubmit}
                    loading={zipSubmitLoading}
                    className={styles['submit-btn']}
                    block
                  >
                    提交
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default AddVoiceComponent;
