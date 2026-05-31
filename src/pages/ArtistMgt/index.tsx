import { useEffect, useState } from 'react';
import {
  Card,
  Avatar,
  Tag,
  Descriptions,
  Modal,
  Form,
  Input,
  Upload,
  Button,
  message,
  Popconfirm,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import {
  getArtistList,
  createArtist,
  updateArtist,
  deleteArtist,
} from '@/services/artist';
import { uploadImage } from '@/services/article';
import styles from './index.less';
import { getImageUrl } from '@/utils/utils';

interface ArtistItem {
  id: number;
  name: string;
  artistId: string;
  avatar: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

const ArtistMgtPage = () => {
  const [list, setList] = useState<ArtistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<ArtistItem | null>(null);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getArtistList();
      setList(data || []);
    } catch (e) {
      message.error('获取艺人列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setAvatarUrl('');
    form.resetFields();
    setModalVisible(true);
  };

  const openEdit = (item: ArtistItem) => {
    setEditing(item);
    setAvatarUrl(item.avatar);
    form.setFieldsValue({
      name: item.name,
      artistId: item.artistId,
      bio: item.bio,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteArtist(id);
      message.success('删除成功');
      fetchList();
    } catch (e) {
      message.error('删除失败');
    }
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
      };
      if (editing) {
        await updateArtist(editing.id, payload);
        message.success('更新成功');
      } else {
        await createArtist(payload);
        message.success('新增成功');
      }
      setModalVisible(false);
      form.resetFields();
      fetchList();
    } catch {
      // 校验失败或接口错误
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadImage(file);
      setAvatarUrl(res.url);
      message.success('头像上传成功');
    } catch (e) {
      message.error('头像上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const uploadButton = (
    <div>
      {uploading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>上传头像</div>
    </div>
  );

  return (
    <div className={styles['artist-mgt']}>
      <div className={styles['artist-header']}>
        <h2>艺人管理</h2>
        <span className={styles['artist-subtitle']}>
          共 {list.length} 位艺人
        </span>
      </div>

      <Spin spinning={loading}>
        <div className={styles['artist-list']}>
          <Card
            className={`${styles['artist-card']} ${styles['artist-add-card']}`}
            hoverable
            onClick={openCreate}
          >
            <div className={styles['add-content']}>
              <PlusOutlined style={{ fontSize: 32 }} />
              <div className={styles['add-text']}>新增艺人</div>
            </div>
          </Card>

          {list.map((item) => (
            <Card key={item.id} className={styles['artist-card']} hoverable>
              <div className={styles['artist-actions']}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(item);
                  }}
                />
                <Popconfirm
                  title="删除后不可恢复，是否继续？"
                  onConfirm={() => handleDelete(item.id)}
                  okText="删除"
                  cancelText="取消"
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </div>
              <div className={styles['artist-info']}>
                <Avatar
                  size={100}
                  src={getImageUrl(item.avatar)}
                  className={styles['artist-avatar']}
                />
                <div className={styles['artist-detail']}>
                  <h3>{item.name}</h3>
                  <Tag color="blue">{item.artistId}</Tag>
                  <p className={styles['artist-desc']}>
                    {item.bio || '暂无简介'}
                  </p>
                  <Descriptions
                    column={1}
                    size="small"
                    className={styles['artist-meta']}
                  >
                    <Descriptions.Item label="角色ID">
                      {item.artistId}
                    </Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Tag color="success">活跃</Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Spin>

      <Modal
        title={editing ? '编辑艺人' : '新增艺人'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={submitLoading}
        width={560}
        destroyOnClose
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          className={styles['artist-form']}
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="艺人姓名"
            rules={[{ required: true, message: '请输入艺人姓名' }]}
          >
            <Input placeholder="请输入艺人姓名" maxLength={50} showCount />
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
          >
            <Input placeholder="请输入艺人ID" maxLength={50} showCount />
          </Form.Item>
          <Form.Item label="头像" required>
            <Upload
              name="avatar"
              showUploadList={false}
              beforeUpload={handleUpload}
              accept="image/*"
            >
              {avatarUrl ? (
                <div className={styles['avatar-preview']}>
                  <img src={getImageUrl(avatarUrl)} alt="avatar" />
                  <div className={styles['avatar-mask']}>
                    {uploading ? <LoadingOutlined /> : '更换头像'}
                  </div>
                </div>
              ) : (
                <div className={styles['avatar-upload-btn']}>
                  {uploading ? <LoadingOutlined /> : <PlusOutlined />}
                  <span>上传头像</span>
                </div>
              )}
            </Upload>
          </Form.Item>
          <Form.Item name="bio" label="简介">
            <Input.TextArea
              placeholder="请输入简介（可选）"
              rows={4}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ArtistMgtPage;
