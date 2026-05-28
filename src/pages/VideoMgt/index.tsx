import React from 'react';

import styles from './index.less';
interface Props {}

const VideoPage: React.FC<Props> = () => {
  return <div className={styles['VideoPage-page']}>视频页面</div>;
};

export default VideoPage;
