import React, { useEffect } from 'react';
import { useLocation, history } from 'umi';
import styles from './detail.less';

interface EssayItem {
  value: number;
  title: string;
  desc: string;
  date: string;
}

interface LocationState {
  data?: EssayItem;
}

const EssayDetailPage: React.FC = () => {
  const location = useLocation() as any;
  const state: LocationState = (location.state as LocationState) || {};
  const item = state.data;

  // 如果没有数据，返回列表
  useEffect(() => {
    if (!item) {
      history.replace('/essay');
    }
  }, []);

  if (!item) return null;

  // 空格/换行都作为段落分隔
  const paragraphs = item.desc
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  let coverSrc = '';
  try {
    coverSrc = require(`../../assets/images/${item.value}.jpg`);
  } catch {}

  return (
    <div className={styles['detail-wrapper']}>
      <div className={styles['detail-inner']}>
        {/* 标题 */}
        <h1 className={styles['detail-title']}>{item.title}</h1>

        {/* 时间 */}
        <p className={styles['detail-date']}>{item.date}</p>

        {/* 封面图 */}
        {coverSrc && (
          <div className={styles['detail-cover']}>
            <img src={coverSrc} alt={item.title} />
          </div>
        )}

        {/* 正文：每段单独一行，垂直居中 */}
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
