import React from 'react';
import { Card, Avatar, Tag, Descriptions, Space } from 'antd';
import yunyiImg from '@/assets/images/yunyi.webp';
import haoyiranImg from '@/assets/images/haoyiran.jpg';
import yunqiImg from '@/assets/images/yunqi.jpg';
import styles from './index.less';

const avatars = [
  {
    key: 'yunyi',
    src: yunyiImg,
    label: '云熠',
    desc: '跨时空旅者，星光守护者',
  },
  {
    key: 'haoyiran',
    src: haoyiranImg,
    label: '郝熠然',
    desc: '炽热之焰，梦想追逐者',
  },
  { key: 'yunqi', src: yunqiImg, label: '云旗', desc: '云端旗帜，自由飞翔者' },
];

const ArtistMgtPage = () => {
  return (
    <div className={styles['artist-mgt']}>
      <div className={styles['artist-header']}>
        <h2>艺人管理</h2>
        <span className={styles['artist-subtitle']}>
          共 {avatars.length} 位艺人
        </span>
      </div>

      <div className={styles['artist-list']}>
        {avatars.map((item) => (
          <Card key={item.key} className={styles['artist-card']} hoverable>
            <div className={styles['artist-info']}>
              <Avatar
                size={100}
                src={item.src}
                className={styles['artist-avatar']}
              />
              <div className={styles['artist-detail']}>
                <h3>{item.label}</h3>
                <Tag color="blue">{item.key}</Tag>
                <p className={styles['artist-desc']}>{item.desc}</p>
                <Descriptions
                  column={1}
                  size="small"
                  className={styles['artist-meta']}
                >
                  <Descriptions.Item label="角色ID">
                    {item.key}
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Tag color="success">活跃</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="数据面板">
                    /{item.key}/data
                  </Descriptions.Item>
                </Descriptions>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ArtistMgtPage;
