import React from 'react';
import { Layout, Menu } from 'antd';
import { useLocation, history, IRouteComponentProps } from 'umi';
import {
  DashboardOutlined,
  EnvironmentOutlined,
  PlayCircleOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  SoundOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import styles from './index.less';

const { Sider, Content } = Layout;

const prefix = '/role';

const menuItems = [
  { key: `${prefix}/data`, icon: <DashboardOutlined />, label: '数据面板' },
  {
    key: `${prefix}/itinerary`,
    icon: <EnvironmentOutlined />,
    label: '行程管理',
  },
  {
    key: `${prefix}/swiper`,
    icon: <PlayCircleOutlined />,
    label: 'Banner管理',
  },
  { key: `${prefix}/photo`, icon: <PictureOutlined />, label: '照片管理' },
  { key: `${prefix}/video`, icon: <VideoCameraOutlined />, label: '视频管理' },
  { key: `${prefix}/voice`, icon: <SoundOutlined />, label: '音频管理' },
  { key: `${prefix}/profile`, icon: <FileTextOutlined />, label: '档案管理' },
];

const RoleAdminLayout: React.FC<IRouteComponentProps> = (props) => {
  const { children } = props;
  const location = useLocation();

  const pathname = location.pathname;
  const selectedKey =
    menuItems.find((item) => pathname.startsWith(item.key))?.key ||
    `${prefix}/data`;

  const handleMenuClick = ({ key }: { key: string }) => {
    history.push(key);
  };

  const tokenVal = localStorage.getItem('token');
  if (!tokenVal) {
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
            数据大屏✨管理后台
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

export default RoleAdminLayout;
