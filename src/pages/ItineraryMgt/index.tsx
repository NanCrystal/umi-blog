import React from 'react';

import styles from './index.less';
interface Props {}

const ItineraryPage: React.FC<Props> = () => {
  return <div className={styles['itinerary-page']}>行程预告</div>;
};

export default ItineraryPage;
