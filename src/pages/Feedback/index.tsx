import React, { useEffect, useMemo, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Image,
  Space,
  message,
  Popconfirm,
  Upload,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  PictureOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getFeedbackList,
  updateFeedback,
  deleteFeedback,
  resolveFeedback,
  FeedbackItem,
} from '@/services/feedback';
import { uploadImageFull } from '@/services/upload';
import { getImageUrl, formatDateTime } from '@/utils/utils';
import styles from './index.less';

const { TextArea } = Input;

const FeedbackPage: React.FC = () => {
  const [list, setList] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );

  // 查看 Modal
  const [viewVisible, setViewVisible] = useState(false);
  const [viewItem, setViewItem] = useState<FeedbackItem | null>(null);

  // 编辑 Modal
  const [editVisible, setEditVisible] = useState(false);
  const [editItem, setEditItem] = useState<FeedbackItem | null>(null);
  const [editForm] = Form.useForm();
  const [editSubmitting, setEditSubmitting] = useState(false);

  // 解决 Modal
  const [resolveVisible, setResolveVisible] = useState(false);
  const [resolveItem, setResolveItem] = useState<FeedbackItem | null>(null);
  const [resolveForm] = Form.useForm();
  const [resolveSubmitting, setResolveSubmitting] = useState(false);
  const [resolveUploading, setResolveUploading] = useState(false);
  const [resolveImageUrl, setResolveImageUrl] = useState<string>('');

  const fetchList = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    status = statusFilter,
  ) => {
    setLoading(true);
    try {
      const res = await getFeedbackList({ page, pageSize, status });
      setList(res.list || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      message.error(e.message || '获取列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo<ColumnsType<FeedbackItem>>(
    () => [
      {
        title: '用户',
        key: 'user',
        width: 180,
        render: (_, item) => (
          <div className={styles['user-cell']}>
            {item.user?.avatarUrl ? (
              <Image
                src={getImageUrl(item.user.avatarUrl) || undefined}
                width={36}
                height={36}
                className={styles['user-avatar']}
                preview={false}
              />
            ) : (
              <div className={styles['user-avatar-placeholder']} />
            )}
            <span className={styles['user-name']}>
              {item.user?.nickName || '未设置'}
            </span>
          </div>
        ),
      },
      {
        title: '问题类型',
        dataIndex: 'type',
        key: 'type',
        width: 120,
        render: (type: string) => <Tag>{type}</Tag>,
      },
      {
        title: '问题描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        width: 250,
      },
      {
        title: '截图',
        dataIndex: 'image',
        key: 'image',
        width: 80,
        render: (image: string | null) =>
          image ? (
            <Image
              src={getImageUrl(image) || undefined}
              width={50}
              height={50}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            '-'
          ),
      },
      {
        title: '联系方式',
        dataIndex: 'contact',
        key: 'contact',
        width: 140,
        render: (v: string | null) => v || '-',
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) =>
          status === 'resolved' ? (
            <Tag color="green">已解决</Tag>
          ) : (
            <Tag color="red">未解决</Tag>
          ),
      },
      {
        title: '提交时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        render: (v: string) => formatDateTime(v),
      },
      {
        title: '操作',
        key: 'action',
        width: 240,
        fixed: 'right',
        render: (_, item) => (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleView(item)}
            >
              查看
            </Button>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(item)}
            >
              编辑
            </Button>
            {item.status === 'unresolved' && (
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleResolve(item)}
              >
                解决
              </Button>
            )}
            <Popconfirm
              title="确认删除此反馈？"
              onConfirm={() => handleDelete(item)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ─── 查看 ───
  const handleView = (item: FeedbackItem) => {
    setViewItem(item);
    setViewVisible(true);
  };

  // ─── 编辑 ───
  const handleEdit = (item: FeedbackItem) => {
    setEditItem(item);
    editForm.setFieldsValue({
      type: item.type,
      description: item.description,
      contact: item.contact,
      status: item.status,
    });
    setEditVisible(true);
  };

  const handleEditOk = async () => {
    try {
      const values = await editForm.validateFields();
      setEditSubmitting(true);
      await updateFeedback(editItem!.id, values);
      message.success('编辑成功');
      setEditVisible(false);
      fetchList();
    } catch (e: any) {
      if (e.errorFields) return; // 表单校验错误
      message.error(e.message || '编辑失败');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ─── 删除 ───
  const handleDelete = async (item: FeedbackItem) => {
    try {
      await deleteFeedback(item.id);
      message.success('删除成功');
      fetchList();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  // ─── 解决 ───
  const handleResolve = (item: FeedbackItem) => {
    setResolveItem(item);
    resolveForm.resetFields();
    setResolveImageUrl('');
    setResolveVisible(true);
  };

  const handleResolveUpload = async (file: File) => {
    setResolveUploading(true);
    try {
      const res = await uploadImageFull(file);
      setResolveImageUrl(res.url);
      message.success('图片上传成功');
    } catch (e: any) {
      message.error(e.message || '图片上传失败');
    } finally {
      setResolveUploading(false);
    }
  };

  const handleResolveOk = async () => {
    try {
      const values = await resolveForm.validateFields();
      setResolveSubmitting(true);

      const currentUser = localStorage.getItem('user') || 'unknown';

      await resolveFeedback(resolveItem!.id, {
        resolveResult: values.resolveResult,
        resolveContent: values.resolveContent,
        resolveImage: resolveImageUrl || undefined,
        resolveRemark: values.resolveRemark,
        resolvedBy: currentUser,
      });

      message.success('已标记为已解决');
      setResolveVisible(false);
      fetchList();
    } catch (e: any) {
      if (e.errorFields) return;
      message.error(e.message || '操作失败');
    } finally {
      setResolveSubmitting(false);
    }
  };

  // ─── 状态筛选 ───
  const handleStatusChange = (value: string) => {
    setStatusFilter(value || undefined);
    setPagination({ ...pagination, current: 1 });
    fetchList(1, pagination.pageSize, value || undefined);
  };

  return (
    <div className={styles['feedback-page']}>
      <div className={styles['mgt-page-header']}>
        <div>
          <div className={styles['mgt-page-title']}>问题反馈</div>
          <div className={styles['mgt-page-desc']}>
            查看和处理小程序用户提交的问题反馈
          </div>
        </div>
        <div className={styles['mgt-page-actions']}>
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 140 }}
            value={statusFilter}
            onChange={handleStatusChange}
            options={[
              { value: 'unresolved', label: '未解决' },
              { value: 'resolved', label: '已解决' },
            ]}
          />
        </div>
      </div>

      <Table<FeedbackItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        scroll={{ x: 1200 }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (page, pageSize) => {
            setPagination({ current: page, pageSize });
            fetchList(page, pageSize);
          },
        }}
      />

      {/* ─── 查看 Modal ─── */}
      <Modal
        title="反馈详情"
        open={viewVisible}
        onCancel={() => setViewVisible(false)}
        footer={
          <div className={styles['detail-footer']}>
            <Button onClick={() => setViewVisible(false)}>关 闭</Button>
          </div>
        }
        width={560}
        destroyOnClose
      >
        {viewItem && (
          <div className={styles['detail-content']}>
            {/* 基本信息 */}
            <div className={styles['detail-meta']}>
              <div className={styles['detail-meta-item']}>
                <UserOutlined className={styles['detail-meta-icon']} />
                <span className={styles['detail-meta-label']}>用户</span>
                <span className={styles['detail-meta-value']}>
                  {viewItem.user?.avatarUrl ? (
                    <Image
                      src={getImageUrl(viewItem.user.avatarUrl) || undefined}
                      width={24}
                      height={24}
                      style={{
                        borderRadius: '50%',
                        objectFit: 'cover',
                        verticalAlign: 'middle',
                        marginRight: 8,
                      }}
                      preview={false}
                    />
                  ) : null}
                  {viewItem.user?.nickName || '未设置'}
                </span>
              </div>
              <div className={styles['detail-meta-item']}>
                <FileTextOutlined className={styles['detail-meta-icon']} />
                <span className={styles['detail-meta-label']}>问题类型</span>
                <span className={styles['detail-meta-value']}>
                  {viewItem.type}
                </span>
              </div>
              <div className={styles['detail-meta-item']}>
                <FileTextOutlined className={styles['detail-meta-icon']} />
                <span className={styles['detail-meta-label']}>问题描述</span>
                <span className={styles['detail-meta-value']}>
                  {viewItem.description}
                </span>
              </div>
              <div className={styles['detail-meta-item']}>
                <PictureOutlined className={styles['detail-meta-icon']} />
                <span className={styles['detail-meta-label']}>截图</span>
                <span className={styles['detail-meta-value']}>
                  {viewItem.image ? (
                    <Image
                      src={getImageUrl(viewItem.image) || undefined}
                      width={120}
                      style={{ maxHeight: 80, objectFit: 'contain' }}
                    />
                  ) : (
                    '无'
                  )}
                </span>
              </div>
              <div className={styles['detail-meta-item']}>
                <UserOutlined className={styles['detail-meta-icon']} />
                <span className={styles['detail-meta-label']}>联系方式</span>
                <span className={styles['detail-meta-value']}>
                  {viewItem.contact || '无'}
                </span>
              </div>
              <div className={styles['detail-meta-item']}>
                <FileTextOutlined className={styles['detail-meta-icon']} />
                <span className={styles['detail-meta-label']}>状态</span>
                <span className={styles['detail-meta-value']}>
                  <span
                    className={`${styles['status-tag']} ${
                      viewItem.status === 'resolved'
                        ? styles['status-resolved']
                        : styles['status-unresolved']
                    }`}
                  >
                    {viewItem.status === 'resolved' ? '已解决' : '未解决'}
                  </span>
                </span>
              </div>
              <div className={styles['detail-meta-item']}>
                <ClockCircleOutlined className={styles['detail-meta-icon']} />
                <span className={styles['detail-meta-label']}>提交时间</span>
                <span className={styles['detail-meta-value']}>
                  {formatDateTime(viewItem.createdAt)}
                </span>
              </div>
            </div>

            {/* 已解决的额外信息 */}
            {viewItem.status === 'resolved' && (
              <>
                <div className={styles['detail-section']}>
                  <div className={styles['detail-section-title']}>
                    <FileTextOutlined style={{ marginRight: 6 }} />
                    处理信息
                  </div>
                </div>
                <div className={styles['detail-meta']}>
                  <div className={styles['detail-meta-item']}>
                    <FileTextOutlined className={styles['detail-meta-icon']} />
                    <span className={styles['detail-meta-label']}>
                      处理结果
                    </span>
                    <span className={styles['detail-meta-value']}>
                      {viewItem.resolveResult || '-'}
                    </span>
                  </div>
                  <div className={styles['detail-meta-item']}>
                    <FileTextOutlined className={styles['detail-meta-icon']} />
                    <span className={styles['detail-meta-label']}>
                      处理内容
                    </span>
                    <span className={styles['detail-meta-value']}>
                      {viewItem.resolveContent || '-'}
                    </span>
                  </div>
                  <div className={styles['detail-meta-item']}>
                    <PictureOutlined className={styles['detail-meta-icon']} />
                    <span className={styles['detail-meta-label']}>
                      处理截图
                    </span>
                    <span className={styles['detail-meta-value']}>
                      {viewItem.resolveImage ? (
                        <Image
                          src={getImageUrl(viewItem.resolveImage) || undefined}
                          width={120}
                          style={{ maxHeight: 80, objectFit: 'contain' }}
                        />
                      ) : (
                        '无'
                      )}
                    </span>
                  </div>
                  <div className={styles['detail-meta-item']}>
                    <FileTextOutlined className={styles['detail-meta-icon']} />
                    <span className={styles['detail-meta-label']}>备注</span>
                    <span className={styles['detail-meta-value']}>
                      {viewItem.resolveRemark || '-'}
                    </span>
                  </div>
                  <div className={styles['detail-meta-item']}>
                    <UserOutlined className={styles['detail-meta-icon']} />
                    <span className={styles['detail-meta-label']}>处理人</span>
                    <span className={styles['detail-meta-value']}>
                      {viewItem.resolvedBy || '-'}
                    </span>
                  </div>
                  <div className={styles['detail-meta-item']}>
                    <ClockCircleOutlined
                      className={styles['detail-meta-icon']}
                    />
                    <span className={styles['detail-meta-label']}>
                      处理时间
                    </span>
                    <span className={styles['detail-meta-value']}>
                      {viewItem.resolvedAt
                        ? formatDateTime(viewItem.resolvedAt)
                        : '-'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* ─── 编辑 Modal ─── */}
      <Modal
        title="编辑反馈"
        open={editVisible}
        onOk={handleEditOk}
        onCancel={() => setEditVisible(false)}
        confirmLoading={editSubmitting}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="type" label="问题类型" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="问题描述"
            rules={[{ required: true }]}
          >
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item name="contact" label="联系方式">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'unresolved', label: '未解决' },
                { value: 'resolved', label: '已解决' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ─── 解决 Modal ─── */}
      <Modal
        title="处理反馈"
        open={resolveVisible}
        onOk={handleResolveOk}
        onCancel={() => setResolveVisible(false)}
        confirmLoading={resolveSubmitting}
        destroyOnClose
        width={560}
      >
        <Form form={resolveForm} layout="vertical">
          <Form.Item
            name="resolveResult"
            label="处理结果"
            rules={[{ required: true, message: '请输入处理结果' }]}
          >
            <Input placeholder="请输入处理结果" />
          </Form.Item>
          <Form.Item name="resolveContent" label="处理内容">
            <TextArea rows={4} placeholder="请输入处理内容" />
          </Form.Item>
          <Form.Item label="上传图片">
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={(file) => {
                handleResolveUpload(file);
                return false;
              }}
            >
              {resolveImageUrl ? (
                <img
                  src={getImageUrl(resolveImageUrl) || undefined}
                  alt="处理截图"
                  style={{ width: 120, height: 120, objectFit: 'cover' }}
                />
              ) : (
                <div className={styles['upload-btn']}>
                  <PlusOutlined />
                  <span>上传图片</span>
                </div>
              )}
            </Upload>
            {resolveUploading && (
              <div style={{ marginTop: 8, color: '#999' }}>上传中...</div>
            )}
          </Form.Item>
          <Form.Item name="resolveRemark" label="备注">
            <Input placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FeedbackPage;
