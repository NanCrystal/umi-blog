import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { useLocation, history, IRouteComponentProps } from 'umi';
import { PictureOutlined, SendOutlined } from '@ant-design/icons';
import styles from './index.less';

const { Sider, Content } = Layout;

const menuItems = [
  { key: '/admin/wallpaper', icon: <PictureOutlined />, label: '壁纸管理' },
  { key: '/admin/release', icon: <SendOutlined />, label: '发布管理' },
];

const AdminLayout: React.FC<IRouteComponentProps> = (props) => {
  const { children } = props;
  const location = useLocation();

  const selectedKey =
    menuItems.find((item) => location.pathname.startsWith(item.key))?.key ||
    '/admin/wallpaper';

  const handleMenuClick = ({ key }: { key: string }) => {
    history.push(key);
  };

  const tokenVal = localStorage.getItem('token');
  if (tokenVal !== '121414') {
    history.push('/login');
    return null;
  }

  return (
    <Layout className={styles['admin-layout']}>
      <Sider
        width={220}
        className={styles['admin-sider']}
        breakpoint="lg"
        collapsedWidth="0"
      >
        <div
          className={styles['admin-sider-header']}
          onClick={() => history.push('/home')}
          style={{ cursor: 'pointer' }}
        >
          <span className={styles['admin-sider-title']}>
            N.Crystal✨管理后台
          </span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          className={styles['admin-menu']}
          theme="dark"
        />
      </Sider>
      <Layout className={styles['admin-content-layout']}>
        <Content className={styles['admin-content']}>{children}</Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
