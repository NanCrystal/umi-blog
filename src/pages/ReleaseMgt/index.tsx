import React, { useState } from 'react';
import { history } from 'umi';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Tabs } from 'antd';
import styles from './index.less';
import WechatTab from './wechate';
import DouyinTab from './douyin';
import XiaohongshuTab from './xiaohongshu';

const ReleaseMgt: React.FC = () => {
  const [activeTab, setActiveTab] = useState('wechat');

  return (
    <div className={styles['release-mgt-page']}>
      <div className={styles['release-page-header']}>
        <div>
          <div className={styles['release-page-eyebrow']}>管理系统</div>
          <div className={styles['release-page-title']}>发布管理</div>
          <div className={styles['release-page-desc']}>
            集中查看各平台壁纸发布记录，支持查看详情和重新发布失败任务。
          </div>
        </div>
        <div className={styles['release-page-actions']}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => history.push('/admin/wallpaper')}
          >
            返回壁纸管理
          </Button>
        </div>
      </div>

      <div className={styles['release-tabs']}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'wechat',
              label: '微信',
              children: <WechatTab />,
            },
            {
              key: 'douyin',
              label: '抖音',
              children: <DouyinTab />,
            },
            {
              key: 'xiaohongshu',
              label: '小红书',
              children: <XiaohongshuTab />,
            },
          ]}
        />
      </div>
    </div>
  );
};

export default ReleaseMgt;
