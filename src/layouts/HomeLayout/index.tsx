import styles from './index.less';
import { history, useLocation } from 'umi';
import { Layout, Modal, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { checkAdmin } from '@/utils/utils';
import {
  MessageOutlined,
  ExclamationCircleOutlined,
  MenuOutlined,
  CloseOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';

const { Header, Footer, Content } = Layout;

const headerList: any = [
  { label: '主页', path: '/home', value: 0 },
  { label: '吐槽', path: '/document', value: 1 },
  { label: '装逼', path: '/essay', value: 2 },
  { label: '壁纸', path: '/wallpaper', value: 3 },
];

const HomeLayout = (props: IRouteComponentProps) => {
  const { children } = props;
  const location = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const isAddPage = location.pathname === '/add';

  // 匹配 activeTab，支持子路由高亮
  const getActiveTab = (path: string) => {
    if (path.startsWith('/wallpaper')) return 3;
    if (path.startsWith('/essay')) return 2;
    if (path.startsWith('/document')) return 1;
    if (path.startsWith('/home')) return 0;
    return -1;
  };

  const activeTab = isAddPage ? -1 : getActiveTab(location.pathname);
  const isAdmin = checkAdmin();

  // 全局星空背景
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let animationId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random(),
      speed: Math.random() * 0.02 + 0.005,
      dir: Math.random() > 0.5 ? 1 : -1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        s.alpha += s.speed * s.dir;
        if (s.alpha >= 1 || s.alpha <= 0) s.dir *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
        ctx.fill();
      });
      animationId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // 路由变化时关闭移动端菜单
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const confirmLeave = (onOk: () => void) => {
    if (isAddPage) {
      Modal.confirm({
        title: '确认离开？',
        icon: <ExclamationCircleOutlined />,
        content: '当前内容尚未发表，离开后将丢失所有编辑内容。',
        okText: '确认离开',
        cancelText: '继续编辑',
        okButtonProps: { danger: true },
        onOk,
      });
    } else {
      onOk();
    }
  };

  const handlePush = (val: any) => {
    setMenuOpen(false);
    confirmLeave(() => history.push(val.path));
  };

  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出登录？',
      icon: <ExclamationCircleOutlined />,
      okText: '退出',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        localStorage.removeItem('token');
        history.push('/login');
      },
    });
  };

  const handleAdmin = () => {
    confirmLeave(() => history.push('/admin/wallpaper'));
  };

  const dropdownItems: MenuProps['items'] = [
    {
      key: 'admin',
      icon: <SettingOutlined />,
      label: '后台管理',
      onClick: handleAdmin,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout className="home-wrapper">
      <canvas ref={canvasRef} className={styles['star-canvas']} />

      <Header className="home-header">
        <div className={styles['home-header-container']}>
          <div className={styles['home-header-left']}>
            <a
              className={styles['header_link']}
              onClick={(e) => {
                e.preventDefault();
                confirmLeave(() => history.push('/home'));
              }}
              href="/home"
            >
              N.Crystal✨
            </a>
          </div>

          {/* PC 导航 */}
          <div className={styles['home-header-right']}>
            {headerList.map((item: any) => (
              <div
                className={`${styles['header-item']} ${
                  styles[activeTab === item.value ? 'activeSelect' : '']
                }`}
                key={item.value}
                onClick={() => handlePush(item)}
              >
                <span>{item.label}</span>
              </div>
            ))}
            {isAdmin ? (
              <Dropdown
                menu={{ items: dropdownItems }}
                trigger={['click']}
                placement="bottomRight"
                overlayClassName={styles['avatar-dropdown-overlay']}
              >
                <div className={styles['avatar-btn']}>
                  <UserOutlined />
                </div>
              </Dropdown>
            ) : (
              <div className={styles['header-item']} onClick={handleLogout}>
                <span>退出</span>
              </div>
            )}
          </div>

          {/* 移动端汉堡按钮 */}
          <div
            className={styles['hamburger']}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <CloseOutlined /> : <MenuOutlined />}
          </div>
        </div>
      </Header>

      {/* 移动端抽屉菜单 */}
      {menuOpen && (
        <div className={styles['mobile-menu']}>
          {headerList.map((item: any) => (
            <div
              className={`${styles['mobile-menu-item']} ${
                styles[activeTab === item.value ? 'activeSelect' : '']
              }`}
              key={item.value}
              onClick={() => handlePush(item)}
            >
              {item.label}
            </div>
          ))}
          {isAdmin && (
            <div
              className={styles['mobile-menu-item']}
              onClick={() => {
                setMenuOpen(false);
                handleAdmin();
              }}
            >
              后台管理
            </div>
          )}
          <div className={styles['mobile-menu-item']} onClick={handleLogout}>
            退出
          </div>
        </div>
      )}

      <Content style={{ padding: 0 }}>
        <Layout className="home-layout-container">{children}</Layout>
      </Content>

      {/* <Footer className="home-footer-container">
        <div className={styles['home-footer']}>
          <a href="https://beian.miit.gov.cn/" target="_blank">
            粤ICP备2021020229号
          </a>
        </div>
      </Footer> */}

      {/* 留言入口（全员可见） */}
      {!isAddPage && location.pathname !== '/comment' && (
        <div
          className={`${styles['comment-btn']}${
            location.pathname === '/comment'
              ? ` ${styles['comment-btn-active']}`
              : ''
          }`}
          onClick={() => confirmLeave(() => history.push('/comment'))}
        >
          <MessageOutlined />
        </div>
      )}
    </Layout>
  );
};

export default HomeLayout;
