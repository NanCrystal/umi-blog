import React, { useState, useEffect, useCallback } from 'react';
import { Input, Button, Modal, message, Spin } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import Lottie from 'react-lottie-player';
import emptyJson from '@/assets/json/empty1.json';
import {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} from '@/services/document';
import styles from './index.less';

const { TextArea } = Input;

interface DocItem {
  id: number;
  content: string;
  updatedAt: string;
}

const DocumentPage: React.FC = () => {
  const isAdmin = localStorage.getItem('token') === '121414';

  const [list, setList] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);

  // 拉取列表
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDocuments();
      setList(data || []);
    } catch {
      message.error('获取列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // 新增
  const handleAdd = async () => {
    const content = newContent.trim();
    if (!content) return;
    setSaving(true);
    try {
      await createDocument({ content });
      setNewContent('');
      message.success('发布成功');
      fetchList();
    } catch {
      message.error('发布失败');
    } finally {
      setSaving(false);
    }
  };

  // 开始编辑
  const handleEdit = (item: DocItem) => {
    setEditingId(item.id);
    setEditContent(item.content);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  // 保存编辑 —— 原地更新，不改变顺序
  const handleSave = async (id: number) => {
    const content = editContent.trim();
    if (!content) return;
    setSaving(true);
    try {
      const updated = await updateDocument(id, { content });
      // 原地替换，保持 list 顺序不变
      setList((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                content,
                updatedAt: updated?.updatedAt ?? new Date().toISOString(),
              }
            : item,
        ),
      );
      setEditingId(null);
      setEditContent('');
      message.success('保存成功');
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除
  const handleDelete = (id: number) => {
    Modal.confirm({
      title: null,
      icon: null,
      content: '确认删除该条内容？',
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteDocument(id);
          message.success('删除成功');
          setList((prev) => prev.filter((item) => item.id !== id));
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  return (
    <div className={styles['document-wrapper']}>
      {/* admin 顶部新增输入框 */}
      {isAdmin && (
        <div className={styles['add-bar']}>
          <TextArea
            className={styles['add-input']}
            placeholder="写点什么..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            autoSize={{ minRows: 2, maxRows: 6 }}
            bordered={false}
          />
          <Button
            className={styles['add-btn']}
            onClick={handleAdd}
            loading={saving}
            disabled={!newContent.trim()}
          >
            发布
          </Button>
        </div>
      )}

      {/* 加载中 */}
      {loading ? (
        <div className={styles['loading-wrap']}>
          <Spin />
        </div>
      ) : list.length === 0 ? (
        /* 空状态 */
        <div className={styles['empty-wrap']}>
          <Lottie animationData={emptyJson} play loop style={{ width: 320 }} />
        </div>
      ) : (
        /* 瀑布流 */
        <div className={styles['masonry']}>
          {list.map((item) => (
            <div
              key={item.id}
              className={`${styles['masonry-item']}${
                editingId === item.id ? ` ${styles['is-editing']}` : ''
              }`}
            >
              {/* admin 操作按钮（hover 显示） */}
              {isAdmin && editingId !== item.id && (
                <div className={styles['item-actions']}>
                  <span onClick={() => handleDelete(item.id)}>
                    <DeleteOutlined />
                  </span>
                  <span onClick={() => handleEdit(item)}>
                    <EditOutlined />
                  </span>
                </div>
              )}

              {/* 内容区 */}
              {editingId === item.id ? (
                <div className={styles['edit-area']}>
                  <TextArea
                    className={styles['edit-input']}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    autoSize={{ minRows: 3 }}
                    bordered={false}
                    autoFocus
                  />
                  <div className={styles['edit-btns']}>
                    <span onClick={handleCancelEdit}>取消</span>
                    <span onClick={() => handleSave(item.id)}>
                      {saving ? '保存中...' : '保存'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className={styles['item-content']}>{item.content}</p>
              )}

              {/* 时间 */}
              <div className={styles['item-date']}>
                {dayjs(item.updatedAt).format('YYYY.MM.DD HH:mm')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentPage;
