import React, { useEffect, useState } from 'react';
import { history, useLocation } from 'umi';
import { Form, Input, Button, Upload, message, Divider, Spin } from 'antd';
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons';
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
      // 直接使用后端返回的相对路径，.umirc.ts 已经配置了代理
      const fullUrl = res.url;
      const thumbFullUrl = res.thumbUrl || fullUrl;
      onSuccess({ url: fullUrl, thumbUrl: thumbFullUrl });
    } catch (err) {
      onError(err);
      message.error('上传失败');
    }
  };

  const uploadCoverProps: UploadProps = {
    customRequest: customUpload,
    listType: 'picture-card',
    fileList: coverFileList,
    maxCount: 1,
    onChange: ({ fileList }) => {
      setCoverFileList(fileList);
    },
    itemRender: (originNode, file) => {
      const url = file.url || file.response?.url;
      if (url) {
        const fullUrl = url.startsWith('http')
          ? url
          : `https://cdn.tauol.online${url}`;
        return (
          <div
            className="ant-upload-list-item ant-upload-list-item-done"
            style={{ padding: 8 }}
          >
            <img
              src={fullUrl}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        );
      }
      return originNode;
    },
  };

  const uploadImagesProps: UploadProps = {
    customRequest: customUpload,
    listType: 'picture-card',
    fileList: imagesFileList,
    multiple: true,
    onChange: ({ fileList }) => {
      setImagesFileList(fileList);
    },
    itemRender: (originNode, file) => {
      const url = file.url || file.response?.url;
      if (url) {
        const fullUrl = url.startsWith('http')
          ? url
          : `https://cdn.tauol.online${url}`;
        return (
          <div
            className="ant-upload-list-item ant-upload-list-item-done"
            style={{ padding: 8 }}
          >
            <img
              src={fullUrl}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        );
      }
      return originNode;
    },
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
            {coverFileList.length < 1 && (
              <div className={styles['upload-btn-content']}>
                <PlusOutlined style={{ fontSize: '24px' }} />
                <div style={{ marginTop: 8, fontSize: '14px' }}>添加封面</div>
              </div>
            )}
          </Upload>
        </div>

        <Divider className={styles['divider']} />

        <div className={styles['images-section']}>
          <Upload {...uploadImagesProps}>
            <div className={styles['upload-btn-content']}>
              <PlusOutlined style={{ fontSize: '20px' }} />
              <div style={{ marginTop: 8 }}>添加壁纸</div>
            </div>
          </Upload>
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
