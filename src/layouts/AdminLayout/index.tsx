import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { useLocation, history, IRouteComponentProps } from 'umi';
import {
  PictureOutlined,
  SendOutlined,
  UserOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  PlayCircleOutlined,
  VideoCameraOutlined,
  SoundOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import styles from './index.less';

const { Sider, Content } = Layout;

const menuItems = [
  { key: '/admin/data', icon: <DashboardOutlined />, label: '数据面板' },
  { key: '/admin/itinerary', icon: <EnvironmentOutlined />, label: '行程管理' },
  { key: '/admin/swiper', icon: <PlayCircleOutlined />, label: 'Banner管理' },
  { key: '/admin/photo', icon: <PictureOutlined />, label: '照片管理' },
  { key: '/admin/video', icon: <VideoCameraOutlined />, label: '视频管理' },
  { key: '/admin/voice', icon: <SoundOutlined />, label: '音频管理' },
  { key: '/admin/profile', icon: <FileTextOutlined />, label: '档案管理' },
  { key: '/admin/artist', icon: <UserOutlined />, label: '艺人管理' },
  { key: '/admin/wallpaper', icon: <PictureOutlined />, label: '壁纸管理' },
  { key: '/admin/release', icon: <SendOutlined />, label: '发布管理' },
];

const AdminLayout: React.FC<IRouteComponentProps> = (props) => {
  const { children } = props;
  const location = useLocation();

  const selectedKey =
    menuItems.find((item) => location.pathname.startsWith(item.key))?.key ||
    '/admin/data';

  const handleMenuClick = ({ key }: { key: string }) => {
    history.push(key);
  };

  const tokenVal = localStorage.getItem('token');
  const userVal = localStorage.getItem('user');
  if (!tokenVal || userVal !== 'admin') {
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
