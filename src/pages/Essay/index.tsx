import React, { useEffect, useState } from 'react';
import styles from './index.less';
import { history } from 'umi';
import { Modal, message } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import Lottie from 'react-lottie-player';
import emptyJson from '@/assets/json/empty.json';
import { getArticlesList, deleteArticle } from '@/services/article';

// 后端 Article 模型字段
interface ArticleItem {
  id: number;
  title: string;
  content: string;
  cover: string | null;
  createdAt: string;
  updatedAt: string;
}

const EssayPage: React.FC = () => {
  const [list, setList] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = localStorage.getItem('token') === '121414';

  const fetchList = () => {
    setLoading(true);
    getArticlesList()
      .then((res: any) => {
        const data = Array.isArray(res) ? res : res?.data || [];
        setList(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, []);

  // 点击卡片主体 -> 详情
  const handleView = (item: ArticleItem) => {
    history.push('/essay/detail', { data: item });
  };

  // 点击编辑 -> AddPage 回显
  const handleEdit = (e: React.MouseEvent, item: ArticleItem) => {
    e.stopPropagation();
    history.push('/add', { from: 'edit', data: item });
  };

  // 点击删除 -> 二次确认 -> 调接口 -> 刷新列表
  const handleDelete = (e: React.MouseEvent, item: ArticleItem) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除「${item.title}」吗？删除后无法恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteArticle(item.id);
          message.success('删除成功');
          fetchList();
        } catch {
          message.error('删除失败，请重试');
        }
      },
    });
  };

  // 格式化时间
  const formatDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `发表于 ${d.getFullYear()}年${String(d.getMonth() + 1).padStart(
      2,
      '0',
    )}月${String(d.getDate()).padStart(2, '0')}日`;
  };

  // 截取正文前 80 字作为摘要
  const getDesc = (content: string) => {
    if (!content) return '';
    return content.length > 80 ? content.slice(0, 80) + '...' : content;
  };

  if (!loading && list.length === 0) {
    return (
      <div className={styles['empty-wrap']}>
        <Lottie animationData={emptyJson} play loop style={{ width: 600 }} />
      </div>
    );
  }

  return (
    <div className={styles['essay-wrapper']}>
      <div className={styles['essay-main']}>
        {list.map((item) => (
          <div
            key={item.id}
            className={styles['essay-card']}
            onClick={() => handleView(item)}
          >
            <div className={styles['card-cover']}>
              {item.cover ? (
                <img src={item.cover} alt={item.title} />
              ) : (
                <div className={styles['card-cover-placeholder']} />
              )}
            </div>
            <div className={styles['card-body']}>
              <div className={styles['card-title']}>{item.title}</div>
              <div className={styles['card-desc']}>{getDesc(item.content)}</div>
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

export default EssayPage;
