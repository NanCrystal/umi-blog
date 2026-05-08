import React from 'react';
import styles from './index.less';
interface Props {}

const AccountMgt: React.FC<Props> = () => {
  return <div className={styles['account-mgt-page']}>账号管理</div>;
};

export default AccountMgt;
