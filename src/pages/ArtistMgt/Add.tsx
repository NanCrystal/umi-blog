import React, { useState, useEffect } from 'react';
import { history, useLocation } from 'umi';
import {
  Breadcrumb,
  Form,
  Input,
  Select,
  Button,
  Upload,
  message,
  Spin,
  Switch,
  Space,
} from 'antd';
import {
  PlusOutlined,
  LoadingOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { createArtist, updateArtist, getArtistDetail } from '@/services/artist';
import { uploadImage } from '@/services/article';
import { uploadImageFull } from '@/services/upload';
import { getPhotoPlatforms } from '@/services/photoTag';
import styles from './index.less';
import { getImageUrl } from '@/utils/utils';
import weiboIcon from '@/assets/images/weibo.png';
import douyinIcon from '@/assets/images/douyin.png';
import xhsIcon from '@/assets/images/xiaohongshu.png';
import igIcon from '@/assets/images/instagram.png';

const { TextArea } = Input;
const { Option } = Select;

interface PlatformItem {
  id: number;
  name: string;
}

interface SocialSection {
  key: string;
  label: string;
  idField: string;
  idLabel: string;
  idPlaceholder: string;
  nicknameField: string;
  nicknameLabel: string;
  avatarField: string;
  platformField: string;
  syncField: string;
  hasToken?: boolean;
  tokenField?: string;
  tokenLabel?: string;
}

const platformIcons: Record<string, string> = {
  weibo: weiboIcon,
  douyin: douyinIcon,
  xhs: xhsIcon,
  ig: igIcon,
};

const socialSections: SocialSection[] = [
  {
    key: 'weibo',
    label: '微博',
    idField: 'weiboId',
    idLabel: '微博用户ID',
    idPlaceholder: 'm.weibo.cn 的用户ID',
    nicknameField: 'weiboNickname',
    nicknameLabel: '微博昵称',
    avatarField: 'weiboAvatar',
    platformField: 'weiboPlatformId',
    syncField: 'syncWeibo',
  },
  {
    key: 'douyin',
    label: '抖音',
    idField: 'douyinSecUid',
    idLabel: '抖音 sec_uid',
    idPlaceholder: '抖音个人主页的 sec_uid',
    nicknameField: 'douyinNickname',
    nicknameLabel: '抖音昵称',
    avatarField: 'douyinAvatar',
    platformField: 'douyinPlatformId',
    syncField: 'syncDouyin',
  },
  {
    key: 'xhs',
    label: '小红书',
    idField: 'xhsId',
    idLabel: '小红书用户ID',
    idPlaceholder: '小红书用户ID',
    nicknameField: 'xhsNickname',
    nicknameLabel: '小红书昵称',
    avatarField: 'xhsAvatar',
    platformField: 'xhsPlatformId',
    syncField: 'syncXiaohongshu',
  },
  {
    key: 'ig',
    label: 'Instagram',
    idField: 'igId',
    idLabel: 'Instagram 用户ID',
    idPlaceholder: 'IG Business ID',
    nicknameField: 'igNickname',
    nicknameLabel: 'Instagram 昵称',
    avatarField: 'igAvatar',
    platformField: 'igPlatformId',
    syncField: 'syncInstagram',
    hasToken: true,
    tokenField: 'igToken',
    tokenLabel: 'Instagram Token',
  },
];

const ArtistAddPage: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const editId = params.get('id');
  const isEdit = !!editId;

  const [form] = Form.useForm();
  const [platforms, setPlatforms] = useState<PlatformItem[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [appCoverUrl, setAppCoverUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [appCoverUploading, setAppCoverUploading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [socialAvatars, setSocialAvatars] = useState<Record<string, string>>(
    {},
  );
  const [socialUploading, setSocialUploading] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    let cancelled = false;
    fetchPlatforms();
    if (isEdit && editId) {
      loadArtist(Number(editId), cancelled);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const loadArtist = async (id: number, cancelled?: boolean) => {
    setPageLoading(true);
    try {
      const item = await getArtistDetail(id);
      if (cancelled) return;
      setAvatarUrl(item.avatar || '');
      setAppCoverUrl(item.appCover || '');
      const socialAvatarsMap: Record<string, string> = {};
      if (item.weiboAvatar) socialAvatarsMap.weibo = item.weiboAvatar;
      if (item.douyinAvatar) socialAvatarsMap.douyin = item.douyinAvatar;
      if (item.xhsAvatar) socialAvatarsMap.xhs = item.xhsAvatar;
      if (item.igAvatar) socialAvatarsMap.ig = item.igAvatar;
      setSocialAvatars(socialAvatarsMap);

      form.setFieldsValue({
        name: item.name,
        artistId: item.artistId,
        bio: item.bio,
        weiboId: item.weiboId,
        weiboNickname: item.weiboNickname,
        weiboPlatformId: item.weiboPlatformId ?? undefined,
        douyinSecUid: item.douyinSecUid,
        douyinNickname: item.douyinNickname,
        douyinPlatformId: item.douyinPlatformId ?? undefined,
        xhsId: item.xhsId,
        xhsNickname: item.xhsNickname,
        xhsPlatformId: item.xhsPlatformId ?? undefined,
        igId: item.igId,
        igToken: item.igToken,
        igNickname: item.igNickname,
        igPlatformId: item.igPlatformId ?? undefined,
        syncEnabled: item.syncEnabled ?? true,
        enabled: !!item.enabled,
        syncWeibo: item.syncWeibo ?? false,
        syncDouyin: item.syncDouyin ?? false,
        syncXiaohongshu: item.syncXiaohongshu ?? false,
        syncInstagram: item.syncInstagram ?? false,
      });
    } catch {
      if (cancelled) return;
      message.error('获取艺人信息失败');
      history.push('/admin/artist');
    } finally {
      if (!cancelled) setPageLoading(false);
    }
  };

  const fetchPlatforms = async () => {
    try {
      const data = await getPhotoPlatforms();
      setPlatforms(data || []);
    } catch {
      // ignore
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadImage(file);
      setAvatarUrl(res.url);
    } catch {
      message.error('头像上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleSocialAvatarUpload = async (sectionKey: string, file: File) => {
    setSocialUploading((prev) => ({ ...prev, [sectionKey]: true }));
    try {
      const res = await uploadImage(file);
      setSocialAvatars((prev) => ({ ...prev, [sectionKey]: res.url }));
    } catch {
      message.error('社交头像上传失败');
    } finally {
      setSocialUploading((prev) => ({ ...prev, [sectionKey]: false }));
    }
    return false;
  };

  const handleAppCoverUpload = async (file: File) => {
    setAppCoverUploading(true);
    try {
      const res = await uploadImageFull(file);
      setAppCoverUrl(res.url);
    } catch {
      message.error('App封面上传失败');
    } finally {
      setAppCoverUploading(false);
    }
    return false;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!avatarUrl) {
        message.error('请上传头像');
        return;
      }
      setSubmitLoading(true);

      const payload = {
        ...values,
        avatar: avatarUrl,
        appCover: appCoverUrl || null,
        weiboAvatar: socialAvatars.weibo || null,
        douyinAvatar: socialAvatars.douyin || null,
        xhsAvatar: socialAvatars.xhs || null,
        igAvatar: socialAvatars.ig || null,
        weiboPlatformId: values.weiboPlatformId
          ? Number(values.weiboPlatformId)
          : null,
        douyinPlatformId: values.douyinPlatformId
          ? Number(values.douyinPlatformId)
          : null,
        xhsPlatformId: values.xhsPlatformId
          ? Number(values.xhsPlatformId)
          : null,
        igPlatformId: values.igPlatformId ? Number(values.igPlatformId) : null,
        syncEnabled: values.syncEnabled ?? true,
        enabled: values.enabled ?? true,
        syncWeibo: values.syncWeibo ?? true,
        syncDouyin: values.syncDouyin ?? true,
        syncXiaohongshu: values.syncXiaohongshu ?? true,
        syncInstagram: values.syncInstagram ?? true,
      };

      if (isEdit) {
        await updateArtist(Number(editId), payload);
        message.success('更新成功');
      } else {
        await createArtist(payload as any);
        message.success('新增成功');
      }
      history.push('/admin/artist');
    } catch {
      // validation error or API error
    } finally {
      setSubmitLoading(false);
    }
  };

  const renderAvatarUpload = (
    url: string,
    uploading: boolean,
    onUpload: (file: File) => Promise<boolean>,
    size: number = 80,
  ) => {
    const uploadBtn = (
      <div
        className={styles['avatar-upload-btn']}
        style={{ width: size, height: size }}
      >
        {uploading ? <LoadingOutlined /> : <PlusOutlined />}
        <span>上传</span>
      </div>
    );

    return (
      <Upload
        name="avatar"
        showUploadList={false}
        beforeUpload={onUpload}
        accept="image/*"
      >
        {url ? (
          <div
            className={styles['avatar-preview']}
            style={{ width: size, height: size }}
          >
            <img src={getImageUrl(url)} alt="avatar" />
            <div className={styles['avatar-mask']}>
              {uploading ? <LoadingOutlined /> : '更换'}
            </div>
          </div>
        ) : (
          uploadBtn
        )}
      </Upload>
    );
  };

  return (
    <div className={styles['artist-add-page']}>
      <Spin spinning={pageLoading}>
        <div className={styles['add-page-header']}>
          <Breadcrumb className={styles['add-breadcrumb']}>
            <Breadcrumb.Item>
              <a onClick={() => history.push('/admin/artist')}>
                <HomeOutlined /> 艺人管理
              </a>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              {isEdit ? '编辑艺人' : '新增艺人'}
            </Breadcrumb.Item>
          </Breadcrumb>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => history.push('/admin/artist')}
            className={styles['back-btn']}
          >
            返回列表
          </Button>
        </div>

        <div className={styles['add-form-container']}>
          <Form
            form={form}
            layout="vertical"
            className={styles['artist-form']}
            autoComplete="off"
            initialValues={{ syncEnabled: true, enabled: true }}
          >
            {/* ─── 基本信息 ─── */}
            <div className={styles['form-card']}>
              <div className={styles['main-avatar-section']}>
                {renderAvatarUpload(
                  avatarUrl,
                  uploading,
                  handleAvatarUpload,
                  80,
                )}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 16,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Form.Item
                      name="name"
                      label="艺人姓名"
                      rules={[{ required: true, message: '请输入艺人姓名' }]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Input
                        placeholder="请输入艺人姓名"
                        maxLength={50}
                        showCount
                      />
                    </Form.Item>
                    <Form.Item
                      name="artistId"
                      label="艺人ID"
                      rules={[
                        { required: true, message: '请输入艺人ID' },
                        {
                          pattern: /^[a-zA-Z0-9]+$/,
                          message: '艺人ID只能输入数字和字母',
                        },
                      ]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Input
                        placeholder="请输入艺人ID"
                        maxLength={50}
                        showCount
                        disabled={isEdit}
                      />
                    </Form.Item>
                  </div>
                  <Form.Item
                    shouldUpdate={(prev, cur) => prev.enabled !== cur.enabled}
                  >
                    {({ getFieldValue }) => (
                      <Space style={{ marginBottom: 0 }}>
                        <span className={styles['form-label']}>启用账号</span>
                        <Switch
                          checked={getFieldValue('enabled')}
                          onChange={(val) => {
                            const formInst = form;
                            formInst.setFieldsValue({ enabled: val });
                          }}
                        />
                      </Space>
                    )}
                  </Form.Item>
                </div>
              </div>

              {/* App 封面 */}
              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>App 封面</div>
                {renderAvatarUpload(
                  appCoverUrl,
                  appCoverUploading,
                  handleAppCoverUpload,
                  120,
                )}
              </div>
            </div>

            {/* ─── 社交媒体配置 ─── */}
            <div className={styles['social-grid']}>
              {socialSections.map((section) => (
                <div key={section.key} className={styles['social-card']}>
                  <div className={styles['social-card-header']}>
                    <img
                      src={platformIcons[section.key]}
                      alt={section.label}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        objectFit: 'contain',
                      }}
                    />
                    <span className={styles['social-card-title']}>
                      {section.label}
                    </span>
                    <Form.Item
                      name={section.syncField}
                      valuePropName="checked"
                      style={{ marginBottom: 0, marginLeft: 'auto' }}
                      tooltip="开启后将自动同步该平台内容"
                    >
                      <Switch size="small" />
                    </Form.Item>
                  </div>

                  <div className={styles['social-card-body']}>
                    {/* 社交头像 */}
                    <div className={styles['social-avatar-row']}>
                      <div className={styles['social-avatar-label']}>头像</div>
                      {renderAvatarUpload(
                        socialAvatars[section.key],
                        socialUploading[section.key] || false,
                        (file) => handleSocialAvatarUpload(section.key, file),
                        64,
                      )}
                    </div>

                    {/* 用户ID */}
                    <Form.Item
                      name={section.idField}
                      label={section.idLabel}
                      className={styles['social-field']}
                    >
                      <Input placeholder={section.idPlaceholder} />
                    </Form.Item>

                    {/* 昵称 */}
                    <Form.Item
                      name={section.nicknameField}
                      label={section.nicknameLabel}
                      className={styles['social-field']}
                    >
                      <Input placeholder={`${section.label}昵称`} />
                    </Form.Item>

                    {/* Instagram Token */}
                    {section.hasToken && section.tokenField && (
                      <Form.Item
                        name={section.tokenField}
                        label={section.tokenLabel}
                        className={styles['social-field']}
                      >
                        <Input.Password placeholder="IG Access Token" />
                      </Form.Item>
                    )}

                    {/* 绑定平台 */}
                    <Form.Item
                      name={section.platformField}
                      label="绑定平台"
                      className={styles['social-field']}
                    >
                      <Select
                        placeholder="选择绑定平台"
                        allowClear
                        showSearch
                        filterOption={(input, option) =>
                          (option?.children as unknown as string)
                            ?.toLowerCase()
                            .includes(input.toLowerCase())
                        }
                      >
                        {platforms.map((p) => (
                          <Option key={p.id} value={p.id}>
                            {p.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                </div>
              ))}
            </div>

            {/* ─── 同步设置 ─── */}
            <div className={styles['form-card']}>
              {/* <Form.Item
                name="syncEnabled"
                label="开启自动同步"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item> */}
              <Form.Item name="bio" style={{ marginTop: 16, marginBottom: 0 }}>
                <TextArea
                  placeholder="请输入简介（可选）"
                  rows={2}
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </div>

            {/* ─── 操作按钮 ─── */}
            <div className={styles['form-actions']}>
              <Button
                onClick={() => history.push('/admin/artist')}
                className={styles['cancel-btn']}
              >
                取消
              </Button>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={submitLoading}
                className={styles['save-btn']}
              >
                {isEdit ? '保存修改' : '新增艺人'}
              </Button>
            </div>
          </Form>
        </div>
      </Spin>
    </div>
  );
};

export default ArtistAddPage;
