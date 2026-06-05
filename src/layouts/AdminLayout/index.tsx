import React, { useState, useMemo, useEffect } from 'react';
import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
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
  AppstoreOutlined,
  ImportOutlined,
  TagsOutlined,
  IdcardOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import styles from './index.less';

const { Sider, Content } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  { key: '/admin/data', icon: <DashboardOutlined />, label: '数据面板' },
  { key: '/admin/itinerary', icon: <EnvironmentOutlined />, label: '行程管理' },
  { key: '/admin/swiper', icon: <PlayCircleOutlined />, label: 'Banner管理' },
  {
    key: 'content',
    icon: <AppstoreOutlined />,
    label: '内容管理',
    children: [
      { key: '/admin/photo', icon: <PictureOutlined />, label: '照片管理' },
      { key: '/admin/video', icon: <VideoCameraOutlined />, label: '视频管理' },
      { key: '/admin/voice', icon: <SoundOutlined />, label: '音频管理' },
      { key: '/admin/photocards', icon: <IdcardOutlined />, label: '小卡管理' },
      { key: '/admin/profile', icon: <FileTextOutlined />, label: '档案管理' },
    ],
  },
  {
    key: '/admin/import/tasks',
    icon: <ImportOutlined />,
    label: '数据集管理',
  },
  { key: '/admin/photo_info', icon: <TagsOutlined />, label: '标签管理' },
  { key: '/admin/sync', icon: <SyncOutlined />, label: '社交同步' },
  { key: '/admin/artist', icon: <UserOutlined />, label: '艺人管理' },
  {
    key: 'wallpaper-center',
    icon: <PictureOutlined />,
    label: '壁纸中心',
    children: [
      { key: '/admin/wallpaper', icon: <PictureOutlined />, label: '壁纸管理' },
      { key: '/admin/release', icon: <SendOutlined />, label: '发布管理' },
    ],
  },
];

// 父子菜单映射：子路径 -> 父菜单key
const parentKeyMap: Record<string, string> = {
  '/admin/photo': 'content',
  '/admin/video': 'content',
  '/admin/voice': 'content',
  '/admin/photocards': 'content',
  '/admin/profile': 'content',
  '/admin/wallpaper': 'wallpaper-center',
  '/admin/release': 'wallpaper-center',
};

const AdminLayout: React.FC<IRouteComponentProps> = (props) => {
  const { children } = props;
  const location = useLocation();

  // 收集所有叶子节点的 key
  const leafKeys = useMemo(() => {
    const keys: string[] = [];
    const collect = (items: MenuItem[]) => {
      for (const item of items) {
        if (item && 'children' in item && item.children) {
          collect(item.children as MenuItem[]);
        } else if (item && item.key) {
          keys.push(item.key as string);
        }
      }
    };
    collect(menuItems);
    return keys;
  }, []);

  // 根据当前路径匹配选中的菜单项
  const selectedKey =
    leafKeys
      .filter((key) => location.pathname.startsWith(key))
      .sort((a, b) => b.length - a.length)[0] || '/admin/data';

  // 确定需要展开的子菜单
  const openKeys = useMemo(() => {
    const keys: string[] = [];
    // 如果当前路径匹配子项，展开对应的父菜单
    for (const [childPath, parentKey] of Object.entries(parentKeyMap)) {
      if (location.pathname.startsWith(childPath)) {
        keys.push(parentKey);
        break;
      }
    }
    return keys;
  }, [location.pathname]);

  const [openKeysState, setOpenKeysState] = useState<string[]>(openKeys);

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    // 只处理叶子节点的点击（非父菜单key）
    if (leafKeys.includes(key)) {
      history.push(key);
    }
  };

  const handleOpenChange = (keys: string[]) => {
    setOpenKeysState(keys);
  };

  const tokenVal = localStorage.getItem('token');
  const userVal = localStorage.getItem('user');
  if (!tokenVal || userVal !== 'admin') {
    history.push('/login');
    return null;
  }

  // antd 的 CSS-in-JS 会动态注入行内 padding-left，CSS !important 无法覆盖
  // 使用 useEffect 在渲染后强制统一一级菜单的左侧内边距
  useEffect(() => {
    const fixPadding = () => {
      document
        .querySelectorAll<HTMLElement>('.ant-menu-submenu-title')
        .forEach((el) => {
          el.style.paddingLeft = '16px';
          el.style.removeProperty('padding-inline-start');
        });
    };
    fixPadding();
    // antd 在子菜单展开/收起时可能重设样式，通过 MutationObserver 持续修正
    const menuEl = document.querySelector('.ant-menu-root');
    if (!menuEl) return;
    const observer = new MutationObserver(fixPadding);
    observer.observe(menuEl, {
      attributes: true,
      subtree: true,
      attributeFilter: ['style', 'class'],
    });
    return () => observer.disconnect();
  }, []);

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
          openKeys={openKeysState}
          items={menuItems}
          onClick={handleMenuClick}
          onOpenChange={handleOpenChange}
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
