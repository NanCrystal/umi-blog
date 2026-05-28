import React from 'react';

import styles from './index.less';
interface Props {}

const SwiperPage: React.FC<Props> = () => {
  return <div className={styles['swiper-page']}>幻灯片</div>;
};

export default SwiperPage;
