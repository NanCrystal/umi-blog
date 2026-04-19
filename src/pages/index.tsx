import React, { useState, useEffect } from 'react';
import styles from './index.less';

interface PropsType {}

const Index: React.FC<PropsType> = (props) => {
  useEffect(() => {}, []);
  return <div className={styles['Index']}></div>;
};

export default Index;
