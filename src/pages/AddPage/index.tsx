import React, { useState, useEffect } from 'react';
import { Input, Upload, Button, message, Modal, Spin } from 'antd';
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons';
import { history, useLocation } from 'umi';
import styles from './index.less';
import {
  getArticlesDetail,
  createArticle,
  updateArticle,
  uploadImage,
} from '@/services/article';

const { TextArea } = Input;

// 后端 Article 字段
interface ArticleData {
  id?: number;
  title: string;
  content: string;
  cover: string | null;
  createdAt?: string;
}

interface LocationState {
  /** 'add' = HomeLayout 新建按钮  |  'edit' = Essay 列表点击编辑 */
  from?: 'add' | 'edit';
  data?: ArticleData;
}

const AddPage: React.FC = () => {
  const location = useLocation() as any;
  const state: LocationState = (location.state as LocationState) || {};

  const isEdit = state.from === 'edit' && !!state.data?.id;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [wordCount, setWordCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [published, setPublished] = useState(false);

  // 编辑模式：调用接口获取详情回显
  useEffect(() => {
    if (isEdit && state.data?.id) {
      setLoading(true);
      getArticlesDetail(state.data.id)
        .then((res: any) => {
          const d: ArticleData = Array.isArray(res) ? res[0] : res?.data ?? res;
          if (d) {
            setTitle(d.title || '');
            setContent(d.content || '');
            setWordCount((d.content || '').length);
            if (d.cover) setCoverUrl(d.cover);
          }
        })
        .catch(() => message.error('获取文章详情失败'))
        .finally(() => setLoading(false));
    }
    // from === 'add' 时不调接口，保持空白
  }, []);

  const now = new Date();
  const currentTime = `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(
    now.getHours(),
  ).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setWordCount(e.target.value.length);
  };

  // 封面上传：先本地预览，同时上传到后端拿 URL
  const handleCoverChange = async (info: any) => {
    const file: File = info.file;
    if (!file) return false;

    // 本地预览
    const reader = new FileReader();
    reader.onload = (e) => setCoverUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    // 上传到后端
    setImgUploading(true);
    try {
      const result = await uploadImage(file);
      // 后端返回 { url: '/uploads/xxx.jpg' }，拼上后端地址
      const fullUrl = `http://localhost:3000${result.url}`;
      setCoverUrl(fullUrl);
      message.success('封面上传成功');
    } catch {
      message.error('封面上传失败，将使用本地预览');
    } finally {
      setImgUploading(false);
    }
    return false;
  };

  const handleCancel = () => {
    Modal.confirm({
      title: null,
      icon: null,
      content: '当前内容尚未发表，离开后将丢失所有编辑内容。',
      okText: '确认离开',
      cancelText: '继续编辑',
      onOk: () => history.push('/home'),
    });
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      message.warning('请输入文章标题');
      return;
    }
    if (!content.trim()) {
      message.warning('请输入正文内容');
      return;
    }

    const articleData = {
      title,
      content,
      cover: coverUrl || null,
    };

    try {
      setPublished(true);
      if (isEdit && state.data?.id) {
        // 编辑模式：PUT 更新
        await updateArticle(state.data.id, articleData);
        message.success('更新成功！');
      } else {
        // 新建模式：POST 创建
        await createArticle(articleData);
        message.success('发表成功！');
      }
      setTimeout(() => history.push('/essay'), 800);
    } catch {
      message.error('操作失败，请重试');
      setPublished(false);
    }
  };

  if (loading) {
    return (
      <div
        className={styles['add-page']}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

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

        <TextArea
          className={styles['content-input']}
          placeholder="从这里开始写正文"
          value={content}
          onChange={handleContentChange}
          bordered={false}
          autoSize={{ minRows: 20 }}
        />

        <div className={styles['cover-section']}>
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={() => false}
            onChange={handleCoverChange}
          >
            {coverUrl ? (
              <div className={styles['cover-preview']}>
                <img src={coverUrl} alt="封面" />
                <div className={styles['cover-mask']}>
                  {imgUploading ? <LoadingOutlined /> : '更换封面'}
                </div>
              </div>
            ) : (
              <div className={styles['cover-upload-btn']}>
                {imgUploading ? <LoadingOutlined /> : <PlusOutlined />}
                <span>{imgUploading ? '上传中...' : '添加封面'}</span>
              </div>
            )}
          </Upload>
        </div>
      </div>

      <div className={styles['status-bar']}>
        <span className={styles['time-info']}>
          {currentTime} &nbsp; 正文字数 {wordCount}
        </span>
      </div>

      <div className={styles['publish-btn-wrap']}>
        <Button className={styles['cancel-btn']} onClick={handleCancel}>
          取消
        </Button>
        <Button
          type="primary"
          className={styles['publish-btn']}
          onClick={handlePublish}
          disabled={published || imgUploading}
        >
          {isEdit ? '更新' : '发表'}
        </Button>
      </div>
    </div>
  );
};

export default AddPage;
