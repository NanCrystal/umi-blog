import React from 'react';

import styles from './index.less';
interface Props {}

const PhotoPage: React.FC<Props> = () => {
  return <div className={styles['photo-page']}>照片墙</div>;
};

export default PhotoPage;
