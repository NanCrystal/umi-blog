import React, { useEffect, useState, useMemo } from 'react';
import { Button, Table, Modal, message, Form, Input, Avatar } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import styles from './index.less';
import {
  getCommentList,
  createComment,
  updateComment,
  deleteComment,
  CommentItem,
} from '@/services/comment';
import { formatDateTime } from '@/utils/utils';

const { TextArea } = Input;

const CommentsList: React.FC = () => {
  const [list, setList] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  // 弹窗
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [editingItem, setEditingItem] = useState<CommentItem | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  // 加载列表
  const fetchList = (
    page = pagination.current,
    pageSize = pagination.pageSize,
  ) => {
    setLoading(true);
    getCommentList({ page, pageSize })
      .then((res: any) => {
        setList(res?.data || res?.list || []);
        setTotal(res?.total || 0);
        setPagination({ current: page, pageSize });
      })
      .catch(() => message.error('获取留言列表失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleAdd = () => {
    setModalMode('add');
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (item: CommentItem) => {
    setModalMode('edit');
    setEditingItem(item);
    form.setFieldsValue({
      content: item.content,
    });
    setModalVisible(true);
  };

  const handleView = (item: CommentItem) => {
    setModalMode('view');
    setEditingItem(item);
    form.setFieldsValue({
      content: item.content,
    });
    setModalVisible(true);
  };

  const handleDelete = (item: CommentItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除该条留言吗？删除后无法恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteComment(item.id);
          message.success('删除成功');
          fetchList(pagination.current, pagination.pageSize);
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleModalOk = async () => {
    if (modalMode === 'view') {
      setModalVisible(false);
      return;
    }

    try {
      const values = await form.validateFields();
      setSubmitLoading(true);

      if (modalMode === 'edit' && editingItem) {
        await updateComment(editingItem.id, values);
        message.success('编辑成功');
      } else {
        const currentUser = localStorage.getItem('user') || 'admin';
        await createComment({
          ...values,
          userId: 0,
          nickName: currentUser,
        });
        message.success('新增成功');
      }
      setModalVisible(false);
      form.resetFields();
      fetchList(pagination.current, pagination.pageSize);
    } catch {
      // 校验失败或接口错误
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns = useMemo<ColumnsType<CommentItem>>(
    () => [
      {
        title: '序号',
        key: 'index',
        width: 70,
        align: 'center',
        render: (_: unknown, __: CommentItem, index: number) =>
          (pagination.current - 1) * pagination.pageSize + index + 1,
      },
      {
        title: '用户',
        key: 'user',
        width: 180,
        render: (_: unknown, record: CommentItem) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar
              src={record.avatarUrl}
              size={32}
              style={{ backgroundColor: '#1677ff', flexShrink: 0 }}
            >
              {record.nickName?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13 }}>
              {record.nickName || `ID:${record.userId}`}
            </span>
          </div>
        ),
      },
      {
        title: '内容',
        dataIndex: 'content',
        key: 'content',
        ellipsis: true,
        render: (value: string) => (
          <span style={{ color: 'rgba(255,255,255,0.82)' }}>{value}</span>
        ),
      },
      {
        title: '时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        render: (value: string) => (
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
            {formatDateTime(value)}
          </span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 200,
        render: (_: unknown, item) => (
          <div className={styles['table-actions']}>
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
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(item)}
            >
              删除
            </Button>
          </div>
        ),
      },
    ],
    [pagination],
  );

  return (
    <div className={styles['comments-list-page']}>
      {/* 页面头部 */}
      <div className={styles['mgt-page-header']}>
        <div>
          <div className={styles['mgt-page-title']}>留言管理</div>
          <div className={styles['mgt-page-desc']}>查看和管理用户留言</div>
        </div>
        <div className={styles['mgt-page-actions']}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            className={styles['add-btn']}
          >
            新增留言
          </Button>
        </div>
      </div>

      {/* 表格区域 */}
      <div className={styles['table-panel']}>
        <Table<CommentItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={list}
          title={() => (
            <div className={styles['table-header-title']}>
              <MessageOutlined style={{ marginRight: 8 }} />
              留言列表
            </div>
          )}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: false,
            onChange: (page, pageSize) => fetchList(page, pageSize),
          }}
          locale={{
            emptyText: (
              <div className={styles['table-empty']}>
                <MessageOutlined
                  style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}
                />
                <div>暂无留言数据</div>
              </div>
            ),
          }}
        />
      </div>

      {/* 新增/编辑/查看弹窗 */}
      <Modal
        title={
          modalMode === 'add'
            ? '新增留言'
            : modalMode === 'edit'
            ? '编辑留言'
            : '查看留言'
        }
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={submitLoading}
        width={520}
        destroyOnClose
        okText={modalMode === 'view' ? '关闭' : '保存'}
        cancelText="取消"
        okButtonProps={
          modalMode === 'view'
            ? undefined
            : { className: styles['modal-ok-btn'] }
        }
      >
        <Form form={form} layout="vertical" className={styles['comment-form']}>
          <Form.Item
            name="content"
            label="留言内容"
            rules={[{ required: true, message: '请输入留言内容' }]}
          >
            <TextArea
              placeholder="请输入留言内容"
              rows={5}
              maxLength={500}
              showCount
              disabled={modalMode === 'view'}
            />
          </Form.Item>
          {editingItem && (
            <div className={styles['comment-meta']}>
              <span>创建时间：{formatDateTime(editingItem.createdAt)}</span>
              {editingItem.updatedAt && (
                <span>更新时间：{formatDateTime(editingItem.updatedAt)}</span>
              )}
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default CommentsList;
