import React, { useEffect, useState } from 'react';
import styles from './index.less';
import { history } from 'umi';
import { Modal, message } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import Lottie from 'react-lottie-player';
import emptyJson from '@/assets/json/empty.json';
import {
  getWallPaperList,
  deleteWallPaper,
  WallPaperItem,
} from '@/services/wallpaper';

const WallPaperPage: React.FC = () => {
  const [list, setList] = useState<WallPaperItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = localStorage.getItem('token') === '121414';

  const fetchList = () => {
    setLoading(true);
    getWallPaperList()
      .then((res: any) => {
        const data = Array.isArray(res) ? res : res?.data || [];
        setList(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleView = (item: WallPaperItem) => {
    history.push('/wallpaper/detail', { data: item });
  };

  const handleEdit = (e: React.MouseEvent, item: WallPaperItem) => {
    e.stopPropagation();
    history.push('/wallpaper/edit', { from: 'edit', data: item });
  };

  const handleDelete = (e: React.MouseEvent, item: WallPaperItem) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除「${item.title}」吗？删除后无法恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteWallPaper(item.id);
          message.success('删除成功');
          fetchList();
        } catch {
          message.error('删除失败，请重试');
        }
      },
    });
  };

  const handleAdd = () => {
    history.push('/wallpaper/edit', { from: 'add' });
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `发表于 ${d.getFullYear()}年${String(d.getMonth() + 1).padStart(
      2,
      '0',
    )}月${String(d.getDate()).padStart(2, '0')}日`;
  };

  if (!loading && list.length === 0 && !isAdmin) {
    return (
      <div className={styles['empty-wrap']}>
        <Lottie animationData={emptyJson} play loop style={{ width: 600 }} />
      </div>
    );
  }

  return (
    <div className={styles['wallpaper-wrapper']}>
      <div className={styles['wallpaper-main']}>
        {/* 新增固定卡片框 */}
        {isAdmin && (
          <div
            className={`${styles['wallpaper-card']} ${styles['add-card']}`}
            onClick={handleAdd}
          >
            <div className={styles['add-content']}>
              <PlusOutlined className={styles['add-icon']} />
              <div className={styles['add-text']}>新增壁纸</div>
            </div>
          </div>
        )}

        {/* 壁纸列表 */}
        {list.map((item) => (
          <div
            key={item.id}
            className={styles['wallpaper-card']}
            onClick={() => handleView(item)}
          >
            <div className={styles['card-cover']}>
              {item.cover ? (
                <img
                  src={`https://cdn.tauol.online${item.cover}`}
                  alt={item.title || 'wallpaper'}
                />
              ) : (
                <div className={styles['card-cover-placeholder']} />
              )}
            </div>
            <div className={styles['card-body']}>
              <div className={styles['card-title']}>{item.title}</div>
              <div className={styles['card-footer']}>
                <div className={styles['card-date']}>
                  {formatDate(item.createdAt)}
                </div>
                {isAdmin && (
                  <div className={styles['card-actions']}>
                    <span
                      className={styles['action-edit']}
                      onClick={(e) => handleEdit(e, item)}
                      title="编辑"
                    >
                      <EditOutlined />
                    </span>
                    <span
                      className={styles['action-delete']}
                      onClick={(e) => handleDelete(e, item)}
                      title="删除"
                    >
                      <DeleteOutlined />
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WallPaperPage;
