import React, { useEffect } from 'react';
import { useLocation, history } from 'umi';
import styles from './detail.less';

// 后端 Article 字段
interface ArticleItem {
  id: number;
  title: string;
  content: string;
  cover: string | null;
  createdAt: string;
}

interface LocationState {
  data?: ArticleItem;
}

const EssayDetailPage: React.FC = () => {
  const location = useLocation() as any;
  const state: LocationState = (location.state as LocationState) || {};
  const item = state.data;

  useEffect(() => {
    if (!item) {
      history.replace('/essay');
    }
  }, []);

  if (!item) return null;

  // 换行/空格分割正文为段落
  const paragraphs = item.content
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // 格式化时间
  const formatDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `发表于 ${d.getFullYear()}年${String(d.getMonth() + 1).padStart(
      2,
      '0',
    )}月${String(d.getDate()).padStart(2, '0')}日`;
  };

  return (
    <div className={styles['detail-wrapper']}>
      <div className={styles['detail-inner']}>
        {/* 标题 */}
        <h1 className={styles['detail-title']}>{item.title}</h1>

        {/* 时间 */}
        <p className={styles['detail-date']}>{formatDate(item.createdAt)}</p>

        {/* 封面图 */}
        {item.cover && (
          <div className={styles['detail-cover']}>
            <img src={item.cover} alt={item.title} />
          </div>
        )}

        {/* 正文 */}
        <div className={styles['detail-content']}>
          {paragraphs.map((para, i) => (
            <p key={i} className={styles['detail-para']}>
              {para}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EssayDetailPage;
