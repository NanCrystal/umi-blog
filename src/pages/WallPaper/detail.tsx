import React, { useEffect, useState } from 'react';
import { history, useLocation } from 'umi';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import styles from './detail.less';
import { WallPaperItem, getWallPaperDetail } from '@/services/wallpaper';

const WallPaperDetailPage: React.FC = () => {
  const location = useLocation();
  const state = location.state as any;
  const initialData = state?.data;

  const [data, setData] = useState<WallPaperItem | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    // 如果没有 state 传过来，但能在 URL 取到 id，再请求详情
    if (!initialData && state?.id) {
      setLoading(true);
      getWallPaperDetail(state.id)
        .then((res: any) => {
          setData(res?.data || res);
        })
        .finally(() => setLoading(false));
    } else if (!initialData) {
      // 没有任何参数，回列表
      history.replace('/wallpaper');
    }
  }, [initialData, state]);

  if (loading) {
    return (
      <div className={styles['loading-wrapper']}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={styles['detail-wrapper']}>
      {/* <div className={styles['detail-header']}>
        <div className={styles['header-left']} onClick={() => history.goBack()}>
          <ArrowLeftOutlined className={styles['back-icon']} />
          <span className={styles['back-text']}>返回</span>
        </div>
      </div> */}

      <div className={styles['detail-content']}>
        <div className={styles['title-section']}>
          <h1 className={styles['title']}>{data.title}</h1>
          <div className={styles['meta']}>
            {data.createdAt && (
              <span className={styles['date']}>
                {new Date(data.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <PhotoProvider
          // 隐藏默认的工具栏图标(旋转/缩放)，只保留最纯粹的预览和左右滑动
          toolbarRender={() => {
            return null;
          }}
        >
          {/* 封面自己单独展示一行 */}
          {data.cover && (
            <div className={styles['cover-row']}>
              <PhotoView src={`https://cdn.tauol.online${data.cover}`}>
                <img
                  src={`https://cdn.tauol.online${data.cover}`}
                  alt="cover"
                  className={styles['cover-image']}
                />
              </PhotoView>
            </div>
          )}

          {/* 其他图片一行两张 */}
          {data.images && data.images.length > 0 && (
            <div className={styles['images-grid']}>
              {data.images.map((img, idx) => (
                <div key={idx} className={styles['image-item']}>
                  <PhotoView src={`https://cdn.tauol.online${img.url}`}>
                    <img
                      src={`https://cdn.tauol.online${img.url}`}
                      alt={`wallpaper-${idx}`}
                      className={styles['wallpaper-image']}
                    />
                  </PhotoView>
                </div>
              ))}
            </div>
          )}
        </PhotoProvider>
      </div>
    </div>
  );
};

export default WallPaperDetailPage;
