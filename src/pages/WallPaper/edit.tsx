import React, { useEffect, useRef, useState } from 'react';
import { history, useLocation } from 'umi';
import { Input, Button, Upload, message, Divider } from 'antd';
import {
  PlusOutlined,
  LoadingOutlined,
  CloseCircleFilled,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { createWallPaper, updateWallPaper } from '@/services/wallpaper';
import { uploadImageFull } from '@/services/upload';
import styles from './edit.less';

const WallPaperEditPage: React.FC = () => {
  const location = useLocation();
  const state = location.state as any;
  const isEdit = state?.from === 'edit';
  const editData = state?.data || null;

  const [title, setTitle] = useState('');
  const [coverFileList, setCoverFileList] = useState<UploadFile[]>([]);
  const [imagesFileList, setImagesFileList] = useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);
  const replacingIndexRef = useRef<number>(-1); // -1 表示封面，>=0 表示 images 的索引

  useEffect(() => {
    if (isEdit && editData) {
      setTitle(editData.title || '');

      if (editData.cover) {
        setCoverFileList([
          {
            uid: '-1',
            name: 'cover.png',
            status: 'done',
            url: editData.cover,
          },
        ]);
      }
      if (editData.images && Array.isArray(editData.images)) {
        setImagesFileList(
          editData.images.map((img: any, index: number) => ({
            uid: `-${index + 2}`,
            name: `image-${index}.png`,
            status: 'done',
            url: img.url,
            response: { url: img.url, thumbUrl: img.thumbUrl || img.url },
          })),
        );
      }
    }
  }, [isEdit, editData]);

  const onPublish = async () => {
    if (!title.trim()) {
      message.warning('请输入壁纸标题');
      return;
    }

    let coverUrl = '';
    if (coverFileList.length > 0) {
      const file = coverFileList[0];
      coverUrl = file.url || (file.response as any)?.url || '';
    }

    if (!coverUrl) {
      message.warning('请上传壁纸封面');
      return;
    }

    const imagesUrlList = imagesFileList
      .map((file) => {
        const resp = file.response as any;
        return {
          url: file.url || resp?.url || '',
          thumbUrl: resp?.thumbUrl || file.url || resp?.url || '',
        };
      })
      .filter((img) => img.url);

    if (imagesUrlList.length === 0) {
      message.warning('请至少上传一张壁纸图片');
      return;
    }

    const payload = {
      title: title, // No desc anymore, just title
      cover: coverUrl,
      images: imagesUrlList,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        const updatePayload = {
          title: payload.title,
          cover: payload.cover,
        };
        await updateWallPaper(editData.id, updatePayload);
        message.success('更新成功(注:当前后端接口仅支持更新标题和封面)');
      } else {
        await createWallPaper(payload);
        message.success('发表成功');
      }
      setTimeout(() => history.push('/wallpaper'), 800);
    } catch (err) {
      message.error(isEdit ? '更新失败，请重试' : '发表失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const customUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
      const res = await uploadImageFull(file as File);
      const fullUrl = res.url;
      const thumbFullUrl = res.thumbUrl || fullUrl;
      onSuccess({ url: fullUrl, thumbUrl: thumbFullUrl });
    } catch (err) {
      onError(err);
      message.error('上传失败');
    }
  };

  // 点击图片替换：触发隐藏的 file input
  const handleCoverClick = () => {
    replacingIndexRef.current = -1;
    coverInputRef.current?.click();
  };

  const handleImageClick = (index: number) => {
    replacingIndexRef.current = index;
    imagesInputRef.current?.click();
  };

  // 隐藏 input 的 change 处理
  const handleCoverReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadImageFull(file);
      const fullUrl = res.url;
      const thumbFullUrl = res.thumbUrl || fullUrl;
      setCoverFileList([
        {
          uid: '-1',
          name: file.name,
          status: 'done',
          url: fullUrl,
          response: { url: fullUrl, thumbUrl: thumbFullUrl },
        },
      ]);
    } catch {
      message.error('上传失败');
    }
    // 重置 input 以便再次选择同一文件
    e.target.value = '';
  };

  const handleImageReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const idx = replacingIndexRef.current;
    try {
      const res = await uploadImageFull(file);
      const fullUrl = res.url;
      const thumbFullUrl = res.thumbUrl || fullUrl;
      setImagesFileList((prev) => {
        const next = [...prev];
        next[idx] = {
          uid: prev[idx].uid,
          name: file.name,
          status: 'done',
          url: fullUrl,
          response: { url: fullUrl, thumbUrl: thumbFullUrl },
        };
        return next;
      });
    } catch {
      message.error('上传失败');
    }
    e.target.value = '';
  };

  const handleCoverRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCoverFileList([]);
  };

  const handleImageRemove = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setImagesFileList((prev) => prev.filter((_, i) => i !== index));
  };

  // 渲染可交互的图片项
  const renderImageItem = (
    file: UploadFile,
    onReplace: () => void,
    onRemove: (e: React.MouseEvent) => void,
  ) => {
    if (file.status === 'uploading') {
      return (
        <div
          className={`${styles['image-item']} ant-upload-list-item ant-upload-list-item-uploading`}
        >
          <LoadingOutlined
            style={{ fontSize: 24, color: 'rgba(255,255,255,0.5)' }}
          />
        </div>
      );
    }
    const url = file.url || file.response?.url || '';
    const fullUrl = url.startsWith('http')
      ? url
      : url
      ? `https://cdn.tauol.online${url}`
      : '';
    return (
      <div
        className={`${styles['image-item']} ant-upload-list-item ant-upload-list-item-done`}
      >
        <img src={fullUrl} className={styles['image-item-img']} />
        <div className={styles['image-item-overlay']}>
          <span className={styles['image-item-action']}>点击替换</span>
        </div>
        <CloseCircleFilled
          className={styles['image-item-remove']}
          onClick={onRemove}
        />
      </div>
    );
  };

  const uploadCoverProps: UploadProps = {
    customRequest: customUpload,
    listType: 'picture-card',
    fileList: coverFileList,
    maxCount: 1,
    onChange: ({ fileList }) => {
      setCoverFileList(fileList);
    },
    showUploadList: false,
  };

  const uploadImagesProps: UploadProps = {
    customRequest: customUpload,
    listType: 'picture-card',
    fileList: imagesFileList,
    multiple: true,
    onChange: ({ fileList }) => {
      setImagesFileList(fileList);
    },
    showUploadList: false,
  };

  const handleCancel = () => {
    history.push('/wallpaper');
  };

  return (
    <div className={styles['add-page']}>
      <div className={styles['editor-container']}>
        <Input
          className={styles['title-input']}
          placeholder="请在这里输入标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={60}
          bordered={false}
        />

        <div className={styles['cover-section']}>
          <Upload {...uploadCoverProps} className={styles['large-upload']}>
            {coverFileList.length < 1 ? (
              <div className={styles['upload-btn-content']}>
                <PlusOutlined style={{ fontSize: '24px' }} />
                <div style={{ marginTop: 8, fontSize: '14px' }}>添加封面</div>
              </div>
            ) : (
              renderImageItem(
                coverFileList[0],
                handleCoverClick,
                handleCoverRemove,
              )
            )}
          </Upload>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleCoverReplace}
          />
        </div>

        <Divider className={styles['divider']} />

        <div className={styles['images-section']}>
          <div className={styles['images-grid']}>
            {imagesFileList.map((file, index) =>
              renderImageItem(
                file,
                () => handleImageClick(index),
                (e) => handleImageRemove(index, e),
              ),
            )}
            <Upload {...uploadImagesProps}>
              <div className={styles['upload-btn-content']}>
                <PlusOutlined style={{ fontSize: '20px' }} />
                <div style={{ marginTop: 8 }}>添加壁纸</div>
              </div>
            </Upload>
          </div>
          <input
            ref={imagesInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageReplace}
          />
        </div>
      </div>

      <div className={styles['publish-btn-wrap']}>
        <Button className={styles['cancel-btn']} onClick={handleCancel}>
          取消
        </Button>
        <Button
          type="primary"
          className={styles['publish-btn']}
          onClick={onPublish}
          disabled={submitting}
          loading={submitting}
        >
          {isEdit ? '更新' : '发表'}
        </Button>
      </div>
    </div>
  );
};

export default WallPaperEditPage;
