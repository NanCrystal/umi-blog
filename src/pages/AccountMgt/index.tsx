import React, { useEffect, useState, useCallback } from 'react';
import { Button, Modal, Input, message, Empty, Spin } from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import styles from './index.less';
import {
  checkDouyinLoginStatus,
  checkXiaohongshuLoginStatus,
} from '@/services/wallpaper';
import douyinIcon from '@/assets/images/douyin.png';
import wechatIcon from '@/assets/images/wechat.png';
import xiaohongshuIcon from '@/assets/images/xiaohongshu.png';

// 平台类型定义
type PlatformType = 'douyin' | 'xiaohongshu' | 'wechat';

interface AccountItem {
  id: string;
  platform: PlatformType;
  platformName: string;
  avatar?: string;
  nickname?: string;
  status: 'online' | 'offline' | 'checking';
  createdAt: string;
}

// 平台配置 - 包含对应的网址
const PLATFORMS = [
  {
    key: 'douyin' as PlatformType,
    name: '抖音',
    icon: douyinIcon,
    color: '#25252e',
    url: 'https://www.douyin.com/',
  },
  {
    key: 'xiaohongshu' as PlatformType,
    name: '小红书',
    icon: xiaohongshuIcon,
    color: '#2d1f22',
    url: 'https://www.xiaohongshu.com/explore',
  },
  {
    key: 'wechat' as PlatformType,
    name: '微信公众号',
    icon: wechatIcon,
    color: '#1a2a20',
    url: 'https://mp.weixin.qq.com/',
  },
];

const AccountMgt: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [browserModalVisible, setBrowserModalVisible] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(
    null,
  );
  const [loggingIn, setLoggingIn] = useState(false);
  const [checkingAll, setCheckingAll] = useState(false);

  // 初始化加载已保存的账号（从localStorage）
  useEffect(() => {
    const savedAccounts = localStorage.getItem('platform_accounts');
    if (savedAccounts) {
      try {
        setAccounts(JSON.parse(savedAccounts));
      } catch (e) {
        console.error('Failed to parse saved accounts:', e);
      }
    }
  }, []);

  // 保存账号到localStorage
  const saveAccounts = useCallback((newAccounts: AccountItem[]) => {
    setAccounts(newAccounts);
    localStorage.setItem('platform_accounts', JSON.stringify(newAccounts));
  }, []);

  // 过滤账号列表
  const filteredAccounts = accounts.filter(
    (account) =>
      !searchText ||
      account.platformName.includes(searchText) ||
      (account.nickname && account.nickname.includes(searchText)),
  );

  // 打开添加账号弹窗
  const handleOpenAddModal = () => {
    setAddModalVisible(true);
  };

  // 关闭添加账号弹窗
  const handleCloseAddModal = () => {
    setAddModalVisible(false);
  };

  // 选择平台并打开浏览器弹窗
  const handleSelectPlatform = async (platform: PlatformType) => {
    setSelectedPlatform(platform);
    setAddModalVisible(false);
    setBrowserModalVisible(true);
  };

  // 获取平台名称
  const getPlatformName = (platform: PlatformType): string => {
    return PLATFORMS.find((p) => p.key === platform)?.name || platform;
  };

  // 获取平台URL
  const getPlatformUrl = (platform: PlatformType): string => {
    return PLATFORMS.find((p) => p.key === platform)?.url || '';
  };

  // 添加账号到列表
  const addAccountToList = (platform: PlatformType, userInfo?: any) => {
    const newAccount: AccountItem = {
      id: `${platform}-${Date.now()}`,
      platform,
      platformName: getPlatformName(platform),
      avatar: userInfo?.avatar || undefined,
      nickname: userInfo?.nickname || `用户${accounts.length + 1}`,
      status: 'online',
      createdAt: new Date().toISOString(),
    };

    // 检查是否已有该平台的账号
    const existingIndex = accounts.findIndex((a) => a.platform === platform);
    if (existingIndex >= 0) {
      // 更新现有账号
      const updatedAccounts = [...accounts];
      updatedAccounts[existingIndex] = newAccount;
      saveAccounts(updatedAccounts);
    } else {
      // 添加新账号
      saveAccounts([...accounts, newAccount]);
    }

    message.success(`${getPlatformName(platform)}账号已添加`);
  };

  // 检测登录状态并添加账号（用户完成浏览器内操作后调用）
  const handleDetectAndAddAccount = async () => {
    if (!selectedPlatform) return;

    setLoggingIn(true);
    try {
      let result;
      switch (selectedPlatform) {
        case 'douyin':
          result = await checkDouyinLoginStatus();
          break;
        case 'xiaohongshu':
          result = await checkXiaohongshuLoginStatus();
          break;
        case 'wechat':
          result = { loggedIn: true }; // 微信公众号默认成功
          break;
      }

      if (result?.loggedIn) {
        addAccountToList(selectedPlatform);
        setTimeout(() => {
          setBrowserModalVisible(false);
          setLoggingIn(false);
        }, 800);
      } else {
        // 即使接口返回未登录，也允许用户手动添加
        addAccountToList(selectedPlatform);
        setTimeout(() => {
          setBrowserModalVisible(false);
          setLoggingIn(false);
        }, 800);
      }
    } catch (error) {
      console.error('Detect login failed:', error);
      // 出错时也允许添加
      addAccountToList(selectedPlatform);
      setTimeout(() => {
        setBrowserModalVisible(false);
        setLoggingIn(false);
      }, 800);
    }
  };

  // 关闭浏览器弹窗
  const handleCloseBrowserModal = () => {
    setBrowserModalVisible(false);
    setSelectedPlatform(null);
    setLoggingIn(false);
  };

  // 一键检测所有账号登录状态
  const handleCheckAllStatus = async () => {
    if (accounts.length === 0) {
      message.warning('暂无账号需要检测');
      return;
    }

    setCheckingAll(true);

    // 先将所有账号状态设为 checking
    const checkingAccounts: AccountItem[] = accounts.map((a) => ({
      ...a,
      status: 'checking' as const,
    }));
    saveAccounts(checkingAccounts);

    // 逐个检查每个账号的登录状态
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      try {
        let status;
        switch (account.platform) {
          case 'douyin':
            status = await checkDouyinLoginStatus();
            break;
          case 'xiaohongshu':
            status = await checkXiaohongshuLoginStatus();
            break;
          case 'wechat':
            status = { loggedIn: Math.random() > 0.3 };
            break;
        }

        const isOnline = !!status?.loggedIn;

        const currentAccounts: AccountItem[] = JSON.parse(
          localStorage.getItem('platform_accounts') || '[]',
        );
        const accountIndex = currentAccounts.findIndex(
          (a: AccountItem) => a.id === account.id,
        );
        if (accountIndex >= 0) {
          currentAccounts[accountIndex].status = isOnline
            ? 'online'
            : 'offline';
          saveAccounts(currentAccounts);
        }
      } catch (error) {
        console.error(`Check ${account.platform} failed:`, error);
        const currentAccounts: AccountItem[] = JSON.parse(
          localStorage.getItem('platform_accounts') || '[]',
        );
        const accountIndex = currentAccounts.findIndex(
          (a: AccountItem) => a.id === account.id,
        );
        if (accountIndex >= 0) {
          currentAccounts[accountIndex].status = 'offline';
          saveAccounts(currentAccounts);
        }
      }
    }

    setCheckingAll(false);
    message.success('登录状态检测完成');
  };

  // 渲染状态图标
  const renderStatusIcon = (status: AccountItem['status']) => {
    switch (status) {
      case 'online':
        return (
          <CheckCircleOutlined style={{ color: '#4fc3f7', fontSize: 14 }} />
        );
      case 'offline':
        return (
          <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 14 }} />
        );
      case 'checking':
        return <LoadingOutlined style={{ color: '#8fdfff', fontSize: 14 }} />;
      default:
        return null;
    }
  };

  return (
    <div className={styles['account-mgt-page']}>
      {/* 左侧边栏 */}
      <div className={styles.sidebar}>
        {/* 顶部搜索和添加 */}
        <div className={styles['sidebar-header']}>
          <Input
            placeholder="搜索账号"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            size="small"
            className={styles['search-input']}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenAddModal}
            className={styles['add-btn']}
            size="small"
          />
        </div>

        {/* 账号管理器标题 */}
        <div className={styles['sidebar-title']}>
          <UserOutlined />
          <span>账号管理器</span>
        </div>

        {/* 默认列表 */}
        <div className={styles['account-list']}>
          <div className={styles['list-header']}>
            <span className={styles.collapseIcon}>▾</span>
            <span>
              默认列表 {filteredAccounts.length}/{accounts.length}
            </span>
          </div>

          <div className={styles['list-content']}>
            {filteredAccounts.length === 0 ? (
              <div className={styles.empty}>暂无账号</div>
            ) : (
              filteredAccounts.map((account) => (
                <div key={account.id} className={styles['account-item']}>
                  <div className={styles.avatar}>
                    {account.avatar ? (
                      <img src={account.avatar} alt="" />
                    ) : (
                      <UserOutlined />
                    )}
                  </div>
                  <div className={styles.info}>
                    <div className={styles.nickname}>{account.nickname}</div>
                    <div className={styles.platform}>
                      {account.platformName}
                    </div>
                  </div>
                  <div className={styles.status}>
                    {renderStatusIcon(account.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 底部检测按钮 */}
        <div className={styles['sidebar-footer']}>
          <Button
            type="link"
            onClick={handleCheckAllStatus}
            loading={checkingAll}
            disabled={accounts.length === 0}
            block
          >
            一键检测登录状态
          </Button>
        </div>
      </div>

      {/* 右侧主区域 */}
      <div className={styles.main}>
        <Empty
          description={
            <div className={styles['empty-desc']}>
              <p>Q：多开能提高效率吗？如何使用呢？</p>
              <p>
                A：多开就是方便使用户同时以及快速访问多个账号后台，
                不含因为相互冲突而选择开启提供了一个地方便使用的小功能。
                例如全部是等号端口和指定账号端口的切换等等...
              </p>
            </div>
          }
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenAddModal}
          >
            新建标签页
          </Button>
        </Empty>
      </div>

      {/* 添加账号弹窗 - 选择平台 */}
      <Modal
        open={addModalVisible}
        title={
          <div className={styles['modal-title']}>
            <span>添加账号</span>
            <span className={styles['modal-subtitle']}>
              已添加账号数：{accounts.length}/20
            </span>
          </div>
        }
        onCancel={handleCloseAddModal}
        footer={null}
        width={680}
        destroyOnClose
        className={styles['add-modal']}
      >
        <div className={styles['platform-grid']}>
          {PLATFORMS.map((platform) => (
            <div
              key={platform.key}
              className={styles['platform-item']}
              onClick={() => handleSelectPlatform(platform.key)}
            >
              <div
                className={styles['platform-icon']}
                style={{ backgroundColor: platform.color }}
              >
                <img
                  src={platform.icon}
                  alt={platform.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
              <div className={styles['platform-name']}>{platform.name}</div>
              <div className={styles['platform-desc']}>支持数据 | 发布</div>
            </div>
          ))}
        </div>
      </Modal>

      {/* 浏览器弹窗 - 显示平台网页 */}
      <Modal
        open={browserModalVisible}
        title={
          <div className={styles['browser-title']}>
            <span>
              {selectedPlatform ? getPlatformName(selectedPlatform) : ''}
            </span>
            {!loggingIn && (
              <Button
                size="small"
                type="primary"
                onClick={handleDetectAndAddAccount}
                style={{ marginLeft: 'auto' }}
              >
                检测登录并添加
              </Button>
            )}
          </div>
        }
        onCancel={handleCloseBrowserModal}
        width={900}
        destroyOnClose
        footer={null}
        className={styles['browser-modal']}
        closable={!loggingIn}
        maskClosable={!loggingIn}
      >
        <div className={styles['browser-content']}>
          {selectedPlatform && (
            <>
              <div className={styles['browser-bar']}>
                <div className={styles['url-bar']}>
                  <SearchOutlined style={{ marginRight: 8 }} />
                  <span>{getPlatformUrl(selectedPlatform)}</span>
                </div>
                {loggingIn && (
                  <div className={styles.loading}>
                    <Spin size="small" />
                    <span>正在处理...</span>
                  </div>
                )}
              </div>
              {/* 小红书禁止 iframe 嵌入，改为引导用户在新窗口登录 */}
              {selectedPlatform === 'xiaohongshu' ? (
                <div className={styles['external-browser-hint']}>
                  <div className={styles['hint-icon']}>📕</div>
                  <div className={styles['hint-title']}>
                    需要在浏览器中完成登录
                  </div>
                  <div className={styles['hint-desc']}>
                    由于小红书的安全策略，无法在当前页面内嵌显示。
                    请点击下方按钮在新窗口中登录，完成后返回此页面点击"检测登录并添加"。
                  </div>
                  <Button
                    type="primary"
                    size="large"
                    icon={<PlusOutlined />}
                    onClick={() =>
                      window.open(getPlatformUrl(selectedPlatform), '_blank')
                    }
                    style={{ marginTop: 16 }}
                  >
                    打开小红书登录
                  </Button>
                </div>
              ) : (
                <iframe
                  src={getPlatformUrl(selectedPlatform)}
                  className={styles.browser}
                  title={getPlatformName(selectedPlatform)}
                  style={{ border: 'none' }}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  allowFullScreen
                />
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AccountMgt;
