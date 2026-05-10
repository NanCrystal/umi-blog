import React, { useState } from 'react';
import { Tabs } from 'antd';
import styles from './index.less';
import WechatTab from './wechate';
import DouyinTab from './douyin';
import XiaohongshuTab from './xiaohongshu';

const ReleaseMgt: React.FC = () => {
  const [activeTab, setActiveTab] = useState('wechat');

  return (
    <div className={styles['release-mgt-page']}>
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
              children: <DouyinTab active={activeTab === 'douyin'} />,
            },
            {
              key: 'xiaohongshu',
              label: '小红书',
              children: <XiaohongshuTab active={activeTab === 'xiaohongshu'} />,
            },
          ]}
        />
      </div>
    </div>
  );
};

export default ReleaseMgt;
