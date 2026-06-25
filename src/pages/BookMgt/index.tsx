import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  message,
  Form,
  Input,
  Select,
  Space,
  Image,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  getBookList,
  deleteBook,
  batchDeleteBooks,
  batchUpdateBooks,
} from '@/services/book';
import { formatDateTime, getThumbUrl } from '@/utils/utils';
import styles from './index.less';

const { Option } = Select;

interface Book {
  id: number;
  title: string;
  author: string;
  category: string;
  cover: string;
  chapters: number;
  wordCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: '草稿', className: 'status-draft' },
  SERIALIZE: { label: '连载中', className: 'status-serialize' },
  COMPLETED: { label: '已完结', className: 'status-completed' },
};

const categoryOptions = [
  '玄幻',
  '都市',
  '言情',
  '历史',
  '科幻',
  '悬疑',
  '武侠',
  '其他',
];

const BookMgtPage: React.FC = () => {
  const [data, setData] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 批量设置弹窗
  const [batchSetVisible, setBatchSetVisible] = useState(false);
  const [batchSetForm] = Form.useForm();

  // 新增/编辑弹窗
  const [editVisible, setEditVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [editingId, setEditingId] = useState<number | null>(null);

  /** 获取列表 */
  const fetchList = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const res = await getBookList({ page, pageSize });
      const list = res?.list ?? res?.data ?? res ?? [];
      const total = res?.total ?? res?.pagination?.total ?? list.length;
      setData(list);
      setPagination({ current: page, pageSize, total });
    } catch {
      // 错误已由拦截器统一提示
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  /** 批量删除 */
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的遗笺');
      return;
    }
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条遗笺吗？此操作不可撤销。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await batchDeleteBooks(selectedRowKeys as number[]);
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          fetchList(pagination.current, pagination.pageSize);
        } catch {
          // 已统一提示
        }
      },
    });
  };

  /** 单条删除 */
  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这本遗笺吗？',
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteBook(id);
          message.success('删除成功');
          fetchList(pagination.current, pagination.pageSize);
        } catch {
          // 已统一提示
        }
      },
    });
  };

  /** 打开新增弹窗 */
  const handleOpenAdd = () => {
    setEditingId(null);
    editForm.resetFields();
    setEditVisible(true);
  };

  /** 打开编辑弹窗 */
  const handleOpenEdit = (record: Book) => {
    setEditingId(record.id);
    editForm.setFieldsValue({
      title: record.title,
      author: record.author,
      category: record.category,
      cover: record.cover,
      status: record.status,
    });
    setEditVisible(true);
  };

  /** 新增/编辑提交 */
  const handleEditOk = async () => {
    try {
      const values = await editForm.validateFields();
      // TODO: 调用 createBook / updateBook API
      message.success(editingId ? '编辑成功' : '新增成功');
      setEditVisible(false);
      fetchList(pagination.current, pagination.pageSize);
    } catch {
      // 表单校验失败
    }
  };

  /** 打开批量设置弹窗 */
  const handleOpenBatchSet = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要设置的遗笺');
      return;
    }
    batchSetForm.resetFields();
    setBatchSetVisible(true);
  };

  /** 批量设置提交 */
  const handleBatchSetOk = async () => {
    try {
      const values = await batchSetForm.validateFields();
      await batchUpdateBooks(selectedRowKeys as number[], values);
      message.success('批量设置成功');
      setBatchSetVisible(false);
      setSelectedRowKeys([]);
      fetchList(pagination.current, pagination.pageSize);
    } catch {
      // 表单校验失败
    }
  };

  /** Table 分页变化 */
  const handleTableChange = (pag: any) => {
    fetchList(pag.current, pag.pageSize);
  };

  const columns = [
    {
      title: '封面',
      dataIndex: 'cover',
      key: 'cover',
      render: (cover: string) =>
        cover ? (
          <Image
            src={getThumbUrl(cover)}
            width={48}
            height={64}
            style={{ objectFit: 'cover', borderRadius: 2 }}
            preview={{ mask: null }}
          />
        ) : (
          <div className={styles['cover-placeholder']}>无</div>
        ),
    },
    {
      title: '书名',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => cat || '-',
    },
    {
      title: '章节数',
      dataIndex: 'chapters',
      key: 'chapters',
      align: 'center' as const,
      render: (v: number) => v ?? '-',
    },
    {
      title: '字数',
      dataIndex: 'wordCount',
      key: 'wordCount',
      align: 'center' as const,
      render: (v: number) => {
        if (v == null) return '-';
        if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
        return v.toLocaleString();
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const cfg = statusConfig[s];
        if (!cfg) return s || '-';
        return (
          <span className={`${styles['status-tag']} ${styles[cfg.className]}`}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (t: string) => (t ? formatDateTime(t) : '-'),
    },
    {
      title: '操作',
      key: 'action',

      render: (_: any, record: Book) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            className={styles['action-link']}
            onClick={() => handleOpenEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            className={styles['action-link']}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles['book-mgt-page']}>
      {/* ─── 页面头部 ─── */}
      <div className={styles['mgt-page-header']}>
        <div className={styles['mgt-page-header-top']}>
          <div className={styles['mgt-page-header-section']}>
            <div className={styles['mgt-page-title']}>遗笺管理</div>
            <div className={styles['mgt-page-actions']}>
              <Button
                icon={<DeleteOutlined />}
                disabled={selectedRowKeys.length === 0}
                danger
                ghost
                onClick={handleBatchDelete}
              >
                批量删除
              </Button>
              <Button
                icon={<SettingOutlined />}
                disabled={selectedRowKeys.length === 0}
                ghost
                onClick={handleOpenBatchSet}
              >
                批量设置
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className={styles['add-btn']}
                onClick={handleOpenAdd}
              >
                新增
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Table 面板 ─── */}
      <div className={styles['table-panel']}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={handleTableChange}
        />
      </div>

      {/* ─── 新增/编辑弹窗 ─── */}
      <Modal
        title={editingId ? '编辑遗笺' : '新增遗笺'}
        open={editVisible}
        onOk={handleEditOk}
        onCancel={() => setEditVisible(false)}
        okText="确认"
        cancelText="取消"
        className={styles['edit-modal']}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" className={styles['edit-form']}>
          <Form.Item
            name="title"
            label="书名"
            rules={[{ required: true, message: '请输入书名' }]}
          >
            <Input placeholder="请输入书名" />
          </Form.Item>
          <Form.Item
            name="author"
            label="作者"
            rules={[{ required: true, message: '请输入作者' }]}
          >
            <Input placeholder="请输入作者" />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Select placeholder="请选择分类" allowClear>
              {categoryOptions.map((c) => (
                <Option key={c} value={c}>
                  {c}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="cover" label="封面链接">
            <Input placeholder="请输入封面图片URL" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态" allowClear>
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <Option key={key} value={key}>
                  {cfg.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* ─── 批量设置弹窗 ─── */}
      <Modal
        title="批量设置"
        open={batchSetVisible}
        onOk={handleBatchSetOk}
        onCancel={() => setBatchSetVisible(false)}
        okText="确认"
        cancelText="取消"
        className={styles['edit-modal']}
        destroyOnClose
      >
        <p style={{ color: '#999', marginBottom: 16, fontSize: 13 }}>
          已选择 {selectedRowKeys.length}{' '}
          条遗笺，仅填写需要修改的字段，留空则不修改。
        </p>
        <Form
          form={batchSetForm}
          layout="vertical"
          className={styles['edit-form']}
        >
          <Form.Item name="category" label="分类">
            <Select placeholder="请选择分类" allowClear>
              {categoryOptions.map((c) => (
                <Option key={c} value={c}>
                  {c}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态" allowClear>
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <Option key={key} value={key}>
                  {cfg.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BookMgtPage;
