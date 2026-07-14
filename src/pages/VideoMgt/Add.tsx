import React, { useState, useEffect, useRef } from 'react';
import { history, useLocation } from 'umi';
import {
  Breadcrumb,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Upload,
  message,
  Progress,
  Spin,
} from 'antd';
import {
  InboxOutlined,
  HomeOutlined,
  CloseOutlined,
  PlayCircleOutlined,
  PictureOutlined,
  PauseCircleOutlined,
  LoadingOutlined,
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
import moment from 'moment';
import {
  uploadVideoFile,
  createVideo,
  updateVideo,
  getVideoById,
} from '@/services/video';
import {
  uploadImageFull,
  createVideoUploadSession,
  uploadVideoChunk,
  completeVideoUpload,
  getDirectUploadToken,
  notifyDirectUpload,
} from '@/services/upload';
import styles from './Add.less';

// 使用 require 绕过 qiniu-js 的类型问题
const qiniu = require('qiniu-js');

const { Dragger } = Upload;
const { TextArea } = Input;
const { Option } = Select;

/** 分片大小：4MB */
const CHUNK_SIZE = 4 * 1024 * 1024;

const AddVideoComponent: React.FC = () => {
  const [form] = Form.useForm();
  const location = useLocation();

  // ─── 编辑模式检测 ───
  const searchParams = new URLSearchParams(location.search);
  const editId = searchParams.get('id');
  const isEditMode = !!editId;

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

  // ─── 分片上传状态（新增）───
  const [uploading, setUploading] = useState(false); // 是否正在上传
  const [sessionId, setSessionId] = useState<string>(''); // 会话ID
  const [progressPercent, setProgressPercent] = useState(0); // 进度百分比
  const [uploadSpeed, setUploadSpeed] = useState(0); // 上传速度 bytes/s
  const [remainingTime, setRemainingTime] = useState(0); // 剩余时间秒数
  const [paused, setPaused] = useState(false); // 是否暂停
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // 选中的文件
  const fileRef = useRef<File | null>(null); // 持久引用
  const abortRef = useRef<boolean>(false); // 中止标志
  const startTimeRef = useRef<number>(Date.now()); // 直传开始时间
  const speedSampleTimeRef = useRef<number>(Date.now()); // 速度采样时间点
  const speedSampleStartBytesRef = useRef<number>(0); // 速度采样起始字节

  // 封面上传状态
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFileList, setCoverFileList] = useState<UploadFile[]>([]);

  // ─── 编辑模式：加载视频数据 ───
  const [editLoadingData, setEditLoadingData] = useState(false);
  const [originalVideoData, setOriginalVideoData] = useState<any>(null);

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

  // 编辑模式：加载视频详情
  useEffect(() => {
    if (!isEditMode || !editId) return;
    setEditLoadingData(true);
    getVideoById(Number(editId))
      .then((res: any) => {
        setOriginalVideoData(res);
        // 填充表单
        form.setFieldsValue({
          fileName: res.fileName || '',
          artistId: res.artistId,
          shootDate: res.shootDate ? moment(res.shootDate) : undefined,
          videoTypeId: res.tagTypeId,
          videoLocationId: res.tagLocationId,
          videoPlatformId: res.tagPlatformId,
          itineraryId: res.itineraryId,
          description: res.description || '',
        });
        // 设置视频信息（已有视频）
        setFileKey(res.qiniuKey || '');
        setFileUrl(res.originalUrl || '');
        setFileSize(res.size || 0);
        setCoverUrl(res.coverUrl || '');
        setUploaded(true);
      })
      .catch((err) => {
        message.error('加载视频数据失败');
        console.error(err);
      })
      .finally(() => setEditLoadingData(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editId]);

  // 页面离开时提示
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploading]);

  // ════════════════════════════════════════
  // 🚀 分片上传核心逻辑（新增）
  // ════════════════════════════════════════

  /** 最大重试次数 */
  const MAX_CHUNK_RETRIES = 3;
  /** 重试延迟 ms */
  const CHUNK_RETRY_DELAY = 2000;

  /** 选择文件后自动启动分片上传 */
  const startChunkedUpload = async (file: File) => {
    setSelectedFile(file);
    fileRef.current = file;
    setFileSize(file.size);
    abortRef.current = false;
    setPaused(false);

    try {
      // Step 1: 创建上传会话
      const session = await createVideoUploadSession(file.name, file.size);
      setSessionId(session.sessionId);
      setUploading(true);
      setProgressPercent(0);

      // Step 2: 分片上传循环（带自动重试）
      const totalParts = session.totalParts;
      let uploadedBytes = 0;
      const startTime = Date.now();
      let speedSampleBytes = 0;
      let speedSampleTime = Date.now();

      for (let partNum = 1; partNum <= totalParts; partNum++) {
        if (abortRef.current) break;
        while (paused && !abortRef.current) {
          await new Promise((r) => setTimeout(r, 500));
          if (abortRef.current) break;
        }
        if (abortRef.current) break;

        const start = (partNum - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        // ★ 带重试的分片上传（网络抖动不再导致整体失败）
        let lastError: any = null;
        for (let attempt = 1; attempt <= MAX_CHUNK_RETRIES; attempt++) {
          if (abortRef.current) break;
          try {
            await uploadVideoChunk(session.sessionId, partNum, chunk);
            lastError = null;
            break; // 成功，跳出重试循环
          } catch (err: any) {
            lastError = err;
            console.warn(
              `[分片] Part ${partNum}/${totalParts} 第${attempt}/${MAX_CHUNK_RETRIES}次失败:`,
              err?.message || err,
            );
            if (attempt < MAX_CHUNK_RETRIES) {
              // 指数退避等待：2s, 4s
              const delay = CHUNK_RETRY_DELAY * Math.pow(2, attempt - 1);
              await new Promise((r) => setTimeout(r, delay));
            }
          }
        }
        // 重试耗尽仍失败 → 抛出外层 catch 终止
        if (lastError && !abortRef.current) throw lastError;
        if (abortRef.current) break;

        uploadedBytes += chunk.size;
        speedSampleBytes += chunk.size;

        // 更新进度
        const percent = Math.round((partNum / totalParts) * 100);
        setProgressPercent(percent);

        // 计算速度（每秒采样）
        const now = Date.now();
        if (now - speedSampleTime >= 1000) {
          setUploadSpeed(
            Math.round(speedSampleBytes / ((now - speedSampleTime) / 1000)),
          );
          speedSampleBytes = 0;
          speedSampleTime = now;
        }

        // 计算剩余时间
        const elapsed = now - startTime;
        if (elapsed > 1000 && uploadedBytes > 0) {
          const avgSpeed = uploadedBytes / (elapsed / 1000);
          setRemainingTime(Math.round((file.size - uploadedBytes) / avgSpeed));
        }
      }

      if (abortRef.current) return;

      // Step 3: 完成合并
      const result = await completeVideoUpload(session.sessionId);
      setUploaded(true);
      setFileUrl(result.url);
      setFileKey(result.key || result.url);
      setUploading(false);
      setProgressPercent(100);
      setUploadSpeed(0);
      setRemainingTime(0);

      // 自动填充文件名
      form.setFieldsValue({ fileName: file.name.replace(/\.[^.]+$/, '') });
    } catch (err: any) {
      console.error('Chunked upload error:', err);
      setUploading(false);
      message.error(err?.message || '视频上传失败，请重试');
    }
  };

  /** 暂停/继续上传 */
  const togglePause = () => {
    setPaused(!paused);
  };

  /** 取消上传 */
  const cancelUpload = () => {
    abortRef.current = true;
    setPaused(false);
    setUploading(false);
    setSelectedFile(null);
    fileRef.current = null;
    setSessionId('');
    setProgressPercent(0);
    setFileList([]);
    setFileSize(0);
  };

  // ─── 文件选择处理 ───
  const handleFileSelect = (file: File) => {
    // 小于50MB的文件使用原有单次上传方式
    if (file.size < 50 * 1024 * 1024) {
      handleSmallFileUpload(file);
    } else if (file.size >= 50 * 1024 * 1024 && file.size < 200 * 1024 * 1024) {
      // 50MB ~ 200MB: 走后端分片中转（原有逻辑）
      startChunkedUpload(file);
    } else {
      // >= 200MB: 走 qiniu-js 前端直传（不经过服务器中转）
      startDirectUpload(file);
    }
  };

  /** 大文件前端直传七牛（>=200MB，绕过服务器带宽瓶颈） */
  const startDirectUpload = async (file: File) => {
    setSelectedFile(file);
    fileRef.current = file;
    setFileSize(file.size);
    abortRef.current = false;
    setPaused(false);

    // 初始化直传速度采样
    startTimeRef.current = Date.now();
    speedSampleTimeRef.current = Date.now();
    speedSampleStartBytesRef.current = 0;

    try {
      // Step 1: 获取直传凭证（含 persistentOps 自动触发 PFOP）
      const tokenRes = await getDirectUploadToken(file.name, file.size);
      setSessionId('direct_' + Date.now());
      setUploading(true);
      setProgressPercent(0);

      // Step 2: 使用 qiniu-js SDK 直传七牛
      await new Promise<void>((resolve, reject) => {
        const subscription = qiniu.upload(
          file,
          tokenRes.key,
          tokenRes.token,
          undefined,
          {
            useCdnDomain: true,
            region: qiniu.region.z2, // 华东区，根据七牛空间选择
            retryCount: 3,
          },
        );

        const task = subscription.subscribe({
          next(res: any) {
            if (abortRef.current) {
              task.abort();
              reject(new Error('已取消'));
              return;
            }
            if (paused) return; // 暂停时跳过进度更新

            // res.total: { loaded, size, percent }
            const percent = Math.round(res.total?.percent || 0);
            setProgressPercent(percent);

            // 计算速度
            const now = Date.now();
            const loadedBytes = res.total?.loaded || 0;
            if (speedSampleTimeRef.current > 0) {
              const elapsed = (now - speedSampleTimeRef.current) / 1000;
              if (elapsed >= 1) {
                setUploadSpeed(
                  Math.round(
                    (loadedBytes - speedSampleStartBytesRef.current) / elapsed,
                  ),
                );
                speedSampleStartBytesRef.current = loadedBytes;
                speedSampleTimeRef.current = now;
              }
            }

            // 剩余时间
            const elapsedSec = (now - startTimeRef.current) / 1000;
            if (elapsedSec > 0 && loadedBytes > 0 && file.size > loadedBytes) {
              const avgSpeed = loadedBytes / elapsedSec;
              setRemainingTime(
                Math.round((file.size - loadedBytes) / avgSpeed),
              );
            }
          },
          error(err: any) {
            reject(new Error(err.message || '七牛直传失败'));
          },
          complete(_res: any) {
            resolve();
          },
        });
      });

      // Step 3: 直传完成，通知后端入库
      await notifyDirectUpload({
        qiniuKey: `/${tokenRes.key}`,
        fileName: file.name,
        size: file.size,
      });

      // 更新状态
      setUploaded(true);
      setFileUrl(`/${tokenRes.key}`);
      setFileKey(`/${tokenRes.key}`);
      setUploading(false);
      setProgressPercent(100);
      setUploadSpeed(0);
      setRemainingTime(0);

      form.setFieldsValue({ fileName: file.name.replace(/\.[^.]+$/, '') });
    } catch (err: any) {
      console.error('Direct upload error:', err);
      setUploading(false);
      message.error(err?.message || '视频上传失败，请重试');
    }
  };

  /** 小文件使用原有单次上传 */
  const handleSmallFileUpload = async (file: File) => {
    try {
      const res = await uploadVideoFile(file);
      if (!res?.url) throw new Error('上传失败');

      setUploaded(true);
      setFileUrl(res.url);
      setFileKey(res.key || res.url);
      setFileSize(file.size);
      setSelectedFile(file);

      form.setFieldsValue({ fileName: file.name.replace(/\.[^.]+$/, '') });
    } catch {
      message.error('视频上传失败');
    }
  };

  // 自定义请求（兼容 Dragger 组件）
  const handleCustomRequest = (options: any) => {
    const { file } = options;
    setFileList([{ uid: '-1', name: file.name, status: 'done' }]);
    handleFileSelect(file as File);
    options.onSuccess({}, file);
  };

  // ─── 封面上传（保持不变）───
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

  const handleRemoveVideo = () => {
    setFileList([]);
    setUploaded(false);
    setFileUrl('');
    setFileKey('');
    setFileSize(0);
    setSelectedFile(null);
    fileRef.current = null;
    setCoverUrl('');
    setCoverFileList([]);
    form.setFieldsValue({ fileName: '', shootDate: undefined });
  };

  // ─── 提交（支持新增和编辑）───
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 编辑模式下允许不重新上传视频
      if (!isEditMode && !uploaded) {
        message.error('请先上传视频');
        return;
      }

      setSubmitLoading(true);

      if (isEditMode && editId) {
        // ─── 编辑模式：调用 updateVideo ───
        const updateData: Record<string, any> = {
          fileName: values.fileName,
          artistId: values.artistId,
          shootDate: values.shootDate
            ? values.shootDate.format
              ? values.shootDate.format('YYYY-MM-DD HH:mm:ss')
              : values.shootDate
            : undefined,
          tagTypeId: values.videoTypeId,
          tagLocationId: values.videoLocationId,
          tagPlatformId: values.videoPlatformId,
          itineraryId: values.itineraryId,
          description: values.description,
        };
        // 如果封面被修改了
        if (coverUrl !== originalVideoData?.coverUrl) {
          updateData.coverUrl = coverUrl || null;
        }
        // 如果视频文件被替换了（新上传了视频，且与原视频不同）
        const hasNewVideo = fileKey && fileKey !== originalVideoData?.qiniuKey;
        if (hasNewVideo) {
          updateData.qiniuKey = fileKey;
          updateData.originalUrl = fileUrl;
          updateData.playUrl = fileUrl;
          updateData.size = fileSize;
        }

        await updateVideo(Number(editId), updateData);
        message.success('修改成功');
        history.push('/admin/video');
      } else {
        // ─── 新增模式：调用 createVideo ───
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
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || (isEditMode ? '修改失败' : '添加失败'));
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
        {!isEditMode && (
          <CloseOutlined
            className={styles['video-preview-remove']}
            onClick={handleRemoveVideo}
          />
        )}
      </div>
    );
  };

  // ─── 分片上传进度面板（新增）───
  const renderUploadProgress = () => {
    if (!uploading && !selectedFile) return null;

    return (
      <div className={styles['chunk-upload-progress']}>
        <div className={styles['progress-header']}>
          <span className={styles['progress-filename']}>
            <LoadingOutlined style={{ marginRight: 8 }} />
            {selectedFile?.name || fileRef.current?.name || '上传中...'}
          </span>
          <span className={styles['progress-filesize']}>
            {formatFileSize(fileSize)}
          </span>
        </div>

        <Progress
          percent={progressPercent}
          strokeColor="#1890ff"
          showInfo={true}
          className={styles['progress-bar']}
        />

        <div className={styles['progress-footer']}>
          <div className={styles['progress-stats']}>
            {uploadSpeed > 0 && <span>{formatFileSize(uploadSpeed)}/s</span>}
            {remainingTime > 0 && (
              <span style={{ marginLeft: 16 }}>
                约 {formatRemainingTime(remainingTime)} 剩余
              </span>
            )}
          </div>
          <div className={styles['progress-actions']}>
            {!paused ? (
              <Button
                type="link"
                icon={<PauseCircleOutlined />}
                onClick={togglePause}
                size="small"
              >
                暂停
              </Button>
            ) : (
              <Button
                type="link"
                onClick={togglePause}
                size="small"
                style={{ color: '#52c41a' }}
              >
                继续
              </Button>
            )}
            <Button type="link" danger onClick={cancelUpload} size="small">
              取消
            </Button>
          </div>
        </div>

        {/* 断点续传提示 */}
        {sessionId && paused && (
          <div className={styles['resume-hint']}>
            已暂停 · 可随时点击"继续"恢复上传
          </div>
        )}
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
          <Breadcrumb.Item>
            {isEditMode ? '编辑视频' : '添加视频'}
          </Breadcrumb.Item>
        </Breadcrumb>
      </div>

      <div className={styles['tab-panel']}>
        <div className={styles['form-wrap']}>
          <Form form={form} layout="vertical" className={styles['add-form']}>
            {/* 1. 上传视频 / 视频预览（编辑模式） */}
            <Form.Item
              label={isEditMode ? '视频' : '上传视频'}
              required={!isEditMode}
              className={styles['upload-item']}
            >
              {editLoadingData ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <Spin size="large" /> 加载中...
                </div>
              ) : isEditMode && uploaded && !uploading ? (
                /* 编辑模式：显示已有视频预览 + 替换选项 */
                <div>
                  {renderVideoPreview()}
                  <div style={{ marginTop: 8 }}>
                    <Dragger
                      accept=".mp4,.mov,.avi,.mkv,.webm"
                      fileList={[]}
                      customRequest={handleCustomRequest}
                      maxCount={1}
                      showUploadList={false}
                    >
                      <p style={{ marginBottom: 4 }}>
                        <InboxOutlined />
                      </p>
                      <p className="ant-upload-text">
                        点击或拖拽新视频到此处替换
                      </p>
                    </Dragger>
                  </div>
                </div>
              ) : uploading ? (
                renderUploadProgress()
              ) : uploaded && fileUrl ? (
                renderVideoPreview()
              ) : (
                <Dragger
                  accept=".mp4,.mov,.avi,.mkv,.webm"
                  fileList={fileList}
                  customRequest={handleCustomRequest}
                  onChange={(info) => setFileList([...info.fileList])}
                  maxCount={1}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽视频到此区域上传</p>
                  <p className={styles['upload-hint']}>
                    支持 mp4、mov、avi、mkv、webm 格式，最大 5GB
                    <br />
                    &lt;50MB: 单次上传 | 50MB~200MB: 分片中转 | ≥200MB:
                    七牛直传（不占服务器带宽）
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
                {isEditMode ? '保存修改' : '提交'}
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

/** 格式化剩余时间为 mm:ss 或 hh:mm:ss */
function formatRemainingTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export default AddVideoComponent;
