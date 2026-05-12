import React, { useState } from 'react';
import { useLocation } from 'umi';
import { Tabs, Input } from 'antd';
import styles from './index.less';
import AllTab from './all';
import WechatTab from './wechate';
import DouyinTab from './douyin';
import XiaohongshuTab from './xiaohongshu';

const { Search } = Input;

const ReleaseMgt: React.FC = () => {
  const location = useLocation();
  const state = location.state as {
    wallpaperId?: number;
    wallpaperTitle?: string;
  } | null;
  const initialTitle = state?.wallpaperTitle || '';
  const [activeTab, setActiveTab] = useState('all');
  const [searchTitle, setSearchTitle] = useState(initialTitle);

  const handleSearch = (value: string) => {
    setSearchTitle(value);
  };

  return (
    <div className={styles['release-mgt-page']}>
      <div className={styles['release-search']}>
        <Search
          placeholder="搜索壁纸名称"
          allowClear
          enterButton="搜索"
          defaultValue={initialTitle}
          onSearch={handleSearch}
          style={{ maxWidth: 400 }}
        />
      </div>
      <div className={styles['release-tabs']}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'all',
              label: '全部',
              children: (
                <AllTab
                  wallpaperTitle={searchTitle}
                  active={activeTab === 'all'}
                />
              ),
            },
            {
              key: 'wechat',
              label: '微信',
              children: (
                <WechatTab
                  wallpaperTitle={searchTitle}
                  active={activeTab === 'wechat'}
                />
              ),
            },
            {
              key: 'douyin',
              label: '抖音',
              children: (
                <DouyinTab
                  wallpaperTitle={searchTitle}
                  active={activeTab === 'douyin'}
                />
              ),
            },
            {
              key: 'xiaohongshu',
              label: '小红书',
              children: (
                <XiaohongshuTab
                  wallpaperTitle={searchTitle}
                  active={activeTab === 'xiaohongshu'}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default ReleaseMgt;
