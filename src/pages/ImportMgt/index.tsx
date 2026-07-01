import React, { useEffect, useState, useRef } from 'react';
import {
  Table,
  Button,
  Modal,
  message,
  Form,
  Input,
  Select,
  Space,
  Progress,
  Upload,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  RedoOutlined,
  ImportOutlined,
  InboxOutlined,
  FileZipOutlined,
  CloseOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { getArtistList } from '@/services/artist';
import {
  getImportTaskList,
  getImportTaskDetail,
  deleteImportTask,
  batchDeleteImportTasks,
  updateImportTask,
  createImportTask,
  reprocessImportTask,
  downloadImportTask,
} from '@/services/importTask';
import { formatDateTime } from '@/utils/utils';
import styles from './index.less';

const { Dragger } = Upload;
const { Option } = Select;

interface ImportTask {
  id: number;
  name: string;
  artistId: string;
  artistName: string;
  type?: string;
  fileUrl: string;
  fileSize: number;
  status: string;
  totalFiles: number;
  successCount: number;
  failCount: number;
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: '待处理', className: 'status-pending' },
  PROCESSING: { label: '处理中', className: 'status-processing' },
  COMPLETED: { label: '已完成', className: 'status-completed' },
  FAILED: { label: '失败', className: 'status-failed' },
};

const ImportTasksPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<ImportTask[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 上传弹窗
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [dataType, setDataType] = useState<string>('');
  const [selectedArtistId, setSelectedArtistId] = useState<string>('');
  const abortRef = useRef<(() => void) | null>(null);

  // 重新处理
  const [reprocessingId, setReprocessingId] = useState<number | null>(null);

  const handleReprocess = async (record: ImportTask) => {
    setReprocessingId(record.id);
    try {
      await reprocessImportTask(record.id);
      message.success('已开始重新处理，请稍后刷新查看');
      // 定时检查任务状态
      const timer = setInterval(async () => {
        const updated = await getImportTaskList({ page, pageSize }).catch(
          () => null,
        );
        if (updated?.list) {
          const task = updated.list.find((t: any) => t.id === record.id);
          if (
            task &&
            (task.status === 'COMPLETED' || task.status === 'FAILED')
          ) {
            clearInterval(timer);
            setReprocessingId(null);
            fetchList();
          }
        }
      }, 3000);
    } catch {
      message.error('重新处理失败');
      setReprocessingId(null);
    }
  };

  // 编辑弹窗
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<ImportTask | null>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);
  const [artists, setArtists] = useState<any[]>([]);

  const fetchList = async (p?: number, ps?: number) => {
    setLoading(true);
    try {
      const res = await getImportTaskList({
        page: p ?? page,
        pageSize: ps ?? pageSize,
      });
      setList(res?.list || []);
      setTotal(res?.total || 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();

    getArtistList()
      .then((res: any) => {
        setArtists(
          Array.isArray(res)
            ? res.map((a: any) => ({
                name: a.name,
                artistId: a.artistId || a.id,
              }))
            : [],
        );
      })
      .catch(() => {});
  }, []);

  // 定时刷新：有进行中的任务时每10秒刷新一次
  useEffect(() => {
    const hasActiveTasks = list.some(
      (t) => t.status === 'PENDING' || t.status === 'PROCESSING',
    );
    if (!hasActiveTasks) return;

    const timer = setInterval(() => {
      fetchList();
    }, 10000);

    return () => clearInterval(timer);
  }, [list]);

  // ─── 上传弹窗逻辑 ───
  const handleOpenUploadModal = () => {
    setUploadModalOpen(true);
    setUploadFile(null);
    setUploadProgress(0);
    setUploading(false);
    setUploadDone(false);
    setDataType('');
    setSelectedArtistId('');
  };

  const handleCloseUploadModal = () => {
    if (uploading) return; // 上传中不允许关闭
    setUploadModalOpen(false);
    setUploadFile(null);
    setUploadProgress(0);
    setUploadDone(false);
  };

  const handleFileSelect = (file: File) => {
    setUploadFile(file);
    setUploadProgress(0);
    setUploading(false);
    setUploadDone(false);
    return false; // 阻止自动上传
  };

  const handleStartUpload = () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadProgress(0);

    const datasetName = uploadFile.name.replace(/\.zip$/i, '');
    const selectedArtist = artists.find((a) => a.artistId === selectedArtistId);
    const { promise, abort } = createImportTask({
      name: datasetName,
      file: uploadFile,
      type: dataType || undefined,
      artistId: selectedArtistId || undefined,
      artistName: selectedArtist?.name || undefined,
      onProgress: (percent) => {
        setUploadProgress(percent);
        // 上传完成(100%)立即关闭弹窗并刷新列表
        if (percent === 100) {
          setUploadDone(true);
          setUploading(false);
          handleCloseUploadModal();
          fetchList();
        }
      },
    });

    abortRef.current = abort;

    promise
      .then(() => {
        // 进度100%时已关闭弹窗，这里仅记录成功
        message.success('上传成功，后台正在处理');
      })
      .catch((err: any) => {
        if (err?.message === '上传已取消') {
          message.info('上传已取消');
        } else {
          message.error(err?.message || '上传失败');
        }
        setUploading(false);
        setUploadProgress(0);
      });
  };

  const handleCancelUpload = () => {
    abortRef.current?.();
    setUploadFile(null);
    setUploadProgress(0);
  };

  // ─── Table 操作逻辑 ───
  const handleDelete = (record: ImportTask) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除数据集「${record.name}」吗？`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteImportTask(record.id);
          message.success('删除成功');
          fetchList();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleBatchDelete = () => {
    const ids = selectedRowKeys as number[];
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${ids.length} 个数据集吗？`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await batchDeleteImportTasks(ids);
          message.success(`成功删除 ${ids.length} 个数据集`);
          setSelectedRowKeys([]);
          fetchList();
        } catch {
          message.error('批量删除失败');
        }
      },
    });
  };

  const handleEdit = async (record: ImportTask) => {
    // 从详情接口获取最新数据（避免列表数据过期或不一致）
    try {
      const detail = await getImportTaskDetail(record.id);
      if (detail) {
        setEditingTask(detail);
        setEditModalVisible(true);
        setTimeout(() => {
          editForm.setFieldsValue({
            name: detail.name,
            type: detail.type || undefined,
            artistId: detail.artistId || undefined,
          });
        }, 0);
      }
    } catch (err) {
      // 详情接口失败时回退到使用列表数据
      console.warn('[handleEdit] 获取详情失败，使用列表数据:', err);
      setEditingTask(record);
      setEditModalVisible(true);
      setTimeout(() => {
        editForm.setFieldsValue({
          name: record.name,
          type: record.type || undefined,
          artistId: record.artistId || undefined,
        });
      }, 0);
    }
  };

  const handleDownload = (record: ImportTask) => {
    if (!record.fileUrl) {
      message.warning('该任务暂无文件可下载');
      return;
    }
    const fileName = `${record.name}.zip`;
    // 主路径：CDN 直连下载
    try {
      const cdnUrl = `https://cdn.tauol.online${record.fileUrl}`;
      const link = document.createElement('a');
      link.href = cdnUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // CDN 失败，降级到后端代理下载
      message.info('CDN 下载失败，正在通过服务器下载...');
      downloadImportTask(record.id, fileName);
    }
  };

  const handleEditSubmit = async () => {
    try {
      if (!editingTask) return;
      const values = await editForm.validateFields();
      setEditLoading(true);
      const editArtist = artists.find((a) => a.artistId === values.artistId);
      await updateImportTask(editingTask.id, {
        name: values.name,
        type: values.type || null,
        artistId: values.artistId || null,
        artistName: editArtist?.name || null,
      });
      message.success('修改成功');
      setEditModalVisible(false);
      setEditingTask(null);
      fetchList();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('修改失败');
    } finally {
      setEditLoading(false);
    }
  };

  const columns = [
    {
      title: '数据集名称',
      dataIndex: 'name',
      key: 'name',
      width: 260,
      render: (text: string) => (
        <span
          style={{ color: '#ffffff', fontFamily: "'Cormorant Garamond',serif" }}
        >
          {text}
        </span>
      ),
    },
    // {
    //   title: '艺人',
    //   dataIndex: 'artistName',
    //   key: 'artistName',
    //   width: 140,
    //   render: (text: string) => text || '-',
    // },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const cfg = statusConfig[status] || {
          label: status,
          className: 'status-pending',
        };
        return (
          <span className={`${styles['status-tag']} ${styles[cfg.className]}`}>
            {status === 'PROCESSING' && (
              <span className={styles['status-dot']} />
            )}
            {cfg.label}
          </span>
        );
      },
    },
    {
      title: '文件数',
      key: 'files',
      width: 100,
      render: (_: any, record: ImportTask) => (
        <span
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 13,
            color: '#999999',
          }}
        >
          {record.status === 'COMPLETED' || record.status === 'FAILED'
            ? `${record.successCount}/${record.totalFiles}`
            : '-'}
        </span>
      ),
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (t: string) => (
        <span
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 12,
            color: '#999999',
          }}
        >
          {formatDateTime(t)}
        </span>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170,
      render: (t: string) => (
        <span
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 12,
            color: '#666666',
          }}
        >
          {t ? formatDateTime(t) : '-'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      render: (_: any, record: ImportTask) => (
        <Space size="small">
          {record.fileUrl && (
            <Button
              className={`${styles['action-btn']}`}
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            >
              下载
            </Button>
          )}
          {(record.status === 'COMPLETED' || record.status === 'FAILED') && (
            <Button
              className={`${styles['action-btn']}`}
              size="small"
              icon={<RedoOutlined spin={reprocessingId === record.id} />}
              loading={reprocessingId === record.id}
              onClick={() => handleReprocess(record)}
            >
              重新处理
            </Button>
          )}
          <Button
            className={`${styles['action-btn']}`}
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            className={`${styles['action-btn']} ${styles['action-btn-danger']}`}
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles['import-mgt-page']}>
      {/* ─── 页面头部 ─── */}
      <div className={styles['mgt-page-header']}>
        <div className={styles['mgt-page-header-top']}>
          <div className={styles['mgt-page-header-section']}>
            <div className={styles['mgt-page-title']}>导入数据集</div>
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
                type="primary"
                icon={<PlusOutlined />}
                className={styles['add-btn']}
                onClick={handleOpenUploadModal}
              >
                上传数据集
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className={styles['table-panel']}>
        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
              fetchList(p, ps);
            },
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          locale={{
            emptyText: (
              <div className={styles['empty-state']}>
                <ImportOutlined
                  style={{
                    fontSize: 40,
                    display: 'block',
                    marginBottom: 12,
                    opacity: 0.3,
                  }}
                />
                暂无导入数据集
              </div>
            ),
          }}
        />
      </div>

      {/* ─── 上传弹窗 ─── */}
      <Modal
        title="上传数据集"
        open={uploadModalOpen}
        onCancel={handleCloseUploadModal}
        footer={null}
        width={520}
        destroyOnClose
        className={styles['upload-modal']}
      >
        <div className={styles['upload-modal-body']}>
          {/* 拖拽区域 */}
          <div className={styles['upload-zone']}>
            {!uploadFile ? (
              <Dragger
                accept=".zip"
                beforeUpload={handleFileSelect}
                showUploadList={false}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽压缩包到此区域</p>
                <p className={styles['upload-hint']}>支持 ZIP 格式，2G 以内</p>
              </Dragger>
            ) : (
              <div className={styles['file-preview']}>
                <FileZipOutlined className={styles['file-icon']} />
                <div className={styles['file-info']}>
                  <span className={styles['file-name']}>{uploadFile.name}</span>
                  <span className={styles['file-size']}>
                    {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                {!uploading && !uploadDone && (
                  <CloseOutlined
                    className={styles['file-remove']}
                    onClick={() => setUploadFile(null)}
                  />
                )}
              </div>
            )}
          </div>

          {/* 数据集类型选择 */}
          {uploadFile && !uploading && !uploadDone && (
            <div className={styles['dataset-type-selector']}>
              <div className={styles['type-label']}>数据集类型</div>
              <Select
                value={dataType}
                onChange={setDataType}
                placeholder="自动检测（不选则自动识别）"
                className={styles['type-select']}
                allowClear
              >
                <Option value="ins">Instagram（INS）</Option>
                <Option value="xiaohongshu">小红书</Option>
                <Option value="weibo">微博</Option>
                <Option value="douyin">抖音</Option>
              </Select>
            </div>
          )}

          {/* 绑定艺人选择 */}
          {uploadFile && !uploading && !uploadDone && (
            <div className={styles['dataset-type-selector']}>
              <div className={styles['type-label']}>绑定艺人</div>
              <Select
                value={selectedArtistId}
                onChange={setSelectedArtistId}
                placeholder="选择艺人（可选，优先使用选中的艺人）"
                className={styles['type-select']}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.children as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {artists.map((a) => (
                  <Option key={a.artistId} value={a.artistId}>
                    {a.name}
                  </Option>
                ))}
              </Select>
            </div>
          )}

          {/* 进度条 */}
          {(uploading || uploadDone) && (
            <div className={styles['progress-wrap']}>
              <Progress
                percent={uploadProgress}
                strokeColor={uploadDone ? '#5fa657' : '#c3d9f3'}
                trailColor="#262626"
                showInfo={false}
                className={styles['progress-bar']}
              />
              <span className={styles['progress-text']}>
                {uploadDone ? '处理中...' : `${uploadProgress}%`}
              </span>
            </div>
          )}

          {/* 操作按钮 */}
          <div className={styles['upload-actions']}>
            {!uploading && !uploadDone && uploadFile && (
              <Button
                type="primary"
                className={styles['upload-start-btn']}
                onClick={handleStartUpload}
              >
                开始上传
              </Button>
            )}
            {uploading && (
              <Button
                className={styles['upload-cancel-btn']}
                onClick={handleCancelUpload}
              >
                取消上传
              </Button>
            )}
            {uploadDone && (
              <span className={styles['upload-done-text']}>上传完成</span>
            )}
          </div>
        </div>
      </Modal>

      {/* ─── 编辑弹窗 ─── */}
      <Modal
        title="编辑数据集"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingTask(null);
          editForm.resetFields();
        }}
        onOk={handleEditSubmit}
        confirmLoading={editLoading}
        okText="保存"
        cancelText="取消"
        width={480}
        destroyOnClose
        className={styles['edit-modal']}
      >
        <Form
          form={editForm}
          layout="vertical"
          className={styles['edit-form']}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="数据集名称"
            rules={[{ required: true, message: '请输入数据集名称' }]}
          >
            <Input placeholder="请输入数据集名称" maxLength={100} />
          </Form.Item>

          <Form.Item name="type" label="数据集类型">
            <Select placeholder="自动检测" allowClear>
              <Option value="ins">Instagram（INS）</Option>
              <Option value="xiaohongshu">小红书</Option>
              <Option value="weibo">微博</Option>
              <Option value="douyin">抖音</Option>
            </Select>
          </Form.Item>

          <Form.Item name="artistId" label="绑定艺人">
            <Select
              placeholder="选择艺人（可选，重新处理时生效）"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)
                  ?.toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {artists.map((a) => (
                <Option key={a.artistId} value={a.artistId}>
                  {a.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ImportTasksPage;
