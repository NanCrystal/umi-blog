import React, { useState, useEffect } from 'react';
import { Input, Upload, Button, message, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { history, useLocation } from 'umi';
import styles from './index.less';

const { TextArea } = Input;

interface LocationState {
  editMode?: boolean;
  data?: {
    title: string;
    desc: string;
    date: string;
    value: number;
  };
}

const AddPage: React.FC = () => {
  const location = useLocation() as any;
  const state: LocationState = (location.state as LocationState) || {};

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [wordCount, setWordCount] = useState(0);
  const [published, setPublished] = useState(false);

  // 回显数据
  useEffect(() => {
    if (state.editMode && state.data) {
      const d = state.data;
      setTitle(d.title || '');
      setContent(d.desc || '');
      setWordCount((d.desc || '').length);
      // 如果有本地图片可以回显
      try {
        const imgSrc = require(`../../assets/images/${d.value}.jpg`);
        setCoverUrl(imgSrc);
      } catch {}
    }
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

  const handleCoverChange = (info: any) => {
    const file: File = info.file;
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
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
      onOk: () => {
        history.push('/home');
      },
    });
  };

  const handlePublish = () => {
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
      cover: coverUrl,
      createTime: currentTime,
      wordCount,
    };
    console.log('发表文章:', articleData);
    setPublished(true);
    message.success('发表成功！');
    setTimeout(() => {
      history.push('/home');
    }, 800);
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
                <div className={styles['cover-mask']}>更换封面</div>
              </div>
            ) : (
              <div className={styles['cover-upload-btn']}>
                <PlusOutlined />
                <span>添加封面</span>
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
          disabled={published}
        >
          发表
        </Button>
      </div>
    </div>
  );
};

export default AddPage;
