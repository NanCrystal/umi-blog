import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './index.less';
import { history } from 'umi';
import { Button, Table, Modal, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import {
  getWallPaperList,
  deleteWallPaper,
  batchDeleteWallPaper,
  getTrashedWallPapers,
  restoreWallPaper,
  WallPaperItem,
} from '@/services/wallpaper';
import WeChateComponent from '@/component/WeChate';
import RedNoteComponent from '@/component/RedNote';
import TikTokComponent from '@/component/TikTok';

const WallPaperMgt: React.FC = () => {
  const [list, setList] = useState<WallPaperItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashList, setTrashList] = useState<WallPaperItem[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashTotal, setTrashTotal] = useState(0);
  const [trashPagination, setTrashPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const wechatRef = useRef<any>(null);
  const douyinRef = useRef<any>(null);
  const xhsRef = useRef<any>(null);

  const fetchList = (
    page = pagination.current,
    pageSize = pagination.pageSize,
  ) => {
    setLoading(true);
    getWallPaperList({ page, pageSize })
      .then((res: any) => {
        const data = res?.list || [];
        setList(data);
        setTotal(res?.total || 0);
        setPagination({ current: page, pageSize });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleEdit = (e: React.MouseEvent, item: WallPaperItem) => {
    e.stopPropagation();
    history.push('/wallpaper/edit', { from: 'edit', data: item });
  };

  const handleDelete = (e: React.MouseEvent, item: WallPaperItem) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除「${item.title}」吗？删除后无法恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteWallPaper(item.id);
          message.success('删除成功');
          fetchList();
        } catch {}
      },
    });
  };

  const handleAdd = () => {
    history.push('/wallpaper/edit', { from: 'add' });
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: '确认批量删除',
      content: `确定要移除选中的 ${selectedRowKeys.length} 项壁纸吗？移入回收站后可在发布管理中查看历史记录。`,
      okText: '移除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await batchDeleteWallPaper(selectedRowKeys.map((id) => Number(id)));
          message.success(`成功移除 ${selectedRowKeys.length} 项`);
          setSelectedRowKeys([]);
          fetchList();
        } catch {}
      },
    });
  };

  // ── 回收站 ──

  const fetchTrashList = (
    page = trashPagination.current,
    pageSize = trashPagination.pageSize,
  ) => {
    setTrashLoading(true);
    getTrashedWallPapers({ page, pageSize })
      .then((res: any) => {
        setTrashList(res?.list || []);
        setTrashTotal(res?.total || 0);
        setTrashPagination({ current: page, pageSize });
      })
      .finally(() => setTrashLoading(false));
  };

  const handleOpenTrash = () => {
    setTrashOpen(true);
    fetchTrashList(1, trashPagination.pageSize);
  };

  const handleCloseTrash = () => {
    setTrashOpen(false);
  };

  const handleRestore = (item: WallPaperItem) => {
    Modal.confirm({
      title: '确认恢复',
      content: `确定要恢复「${item.title}」到壁纸列表吗？`,
      okText: '恢复',
      cancelText: '取消',
      onOk: async () => {
        setRestoringId(item.id);
        try {
          await restoreWallPaper(item.id);
          message.success('恢复成功');
          fetchTrashList(trashPagination.current, trashPagination.pageSize);
          fetchList(pagination.current, pagination.pageSize);
        } catch {
        } finally {
          setRestoringId(null);
        }
      },
    });
  };

  const getImageUrl = (path?: string) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `https://cdn.tauol.online${path}`;
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return '--';
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(
      2,
      '0',
    )}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const columns = useMemo<ColumnsType<WallPaperItem>>(
    () => [
      {
        title: '封面',
        dataIndex: 'cover',
        key: 'cover',
        width: 120,
        render: (_: string, item) => {
          const imageUrl = getImageUrl(item.cover);
          return imageUrl ? (
            <img
              src={imageUrl}
              alt={item.title || 'wallpaper'}
              className={styles['table-cover']}
            />
          ) : (
            <div className={styles['table-cover-placeholder']}>暂无封面</div>
          );
        },
      },
      {
        title: '壁纸标题',
        dataIndex: 'title',
        key: 'title',
        ellipsis: true,
        render: (value: string, item) => (
          <span
            className={styles['table-title']}
            onClick={() => history.push('/wallpaper/detail', { id: item.id })}
          >
            {value}
          </span>
        ),
      },
      {
        title: '图片数量',
        dataIndex: 'images',
        key: 'images',
        width: 100,
        render: (images: WallPaperItem['images']) => images?.length || 0,
      },
      {
        title: '发布时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        render: (value: string) => formatDateTime(value),
      },
      {
        title: '操作',
        key: 'action',
        width: 160,
        render: (_: unknown, item) => (
          <div className={styles['table-actions']}>
            <Button
              type="link"
              size="small"
              onClick={(e) => handleEdit(e, item)}
            >
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              danger
              onClick={(e) => handleDelete(e, item)}
            >
              删除
            </Button>
          </div>
        ),
      },
      {
        title: '发布记录',
        key: 'publishRecord',
        width: 120,
        render: (_: unknown, item) => (
          <Button
            type="link"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              history.push('/admin/release', {
                wallpaperId: item.id,
                wallpaperTitle: item.title,
              });
            }}
          >
            查看
          </Button>
        ),
      },
      {
        title: '同步发布',
        key: 'sync',
        width: 240,
        render: (_: unknown, item) => (
          <div className={styles['table-sync-platforms']}>
            <WeChateComponent item={item} />
            <TikTokComponent item={item} />
            <RedNoteComponent item={item} />
          </div>
        ),
      },
    ],
    [],
  );

  const rowSelection: TableRowSelection<WallPaperItem> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  // 回收站表格列
  const trashColumns: ColumnsType<WallPaperItem> = [
    {
      title: '封面',
      dataIndex: 'cover',
      key: 'cover',
      width: 120,
      render: (_: string, item) => {
        const imageUrl = getImageUrl(item.cover);
        return imageUrl ? (
          <img
            src={imageUrl}
            alt={item.title || 'wallpaper'}
            className={styles['table-cover']}
          />
        ) : (
          <div className={styles['table-cover-placeholder']}>暂无封面</div>
        );
      },
    },
    {
      title: '壁纸标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (value: string) => value || '(无标题)',
    },
    {
      title: '图片数量',
      dataIndex: 'images',
      key: 'images',
      width: 100,
      render: (images: WallPaperItem['images']) => images?.length || 0,
    },
    {
      title: '删除时间',
      dataIndex: 'deletedAt',
      key: 'deletedAt',
      width: 180,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, item) => (
        <Button
          type="link"
          size="small"
          loading={restoringId === item.id}
          onClick={() => handleRestore(item)}
        >
          撤回
        </Button>
      ),
    },
  ];

  return (
    <div className={styles['wallpaper-mgt-page']}>
      <div
        className={`${styles['table-panel']} ${styles['table-panel-with-actions']}`}
      >
        <Table<WallPaperItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={list}
          rowSelection={rowSelection}
          title={() => (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ color: 'rgba(255, 255, 255, 0.94)' }}>
                壁纸列表
              </span>
              <Button className={styles['trash-btn']} onClick={handleOpenTrash}>
                回收站
              </Button>
            </div>
          )}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: false,
            onChange: (page, pageSize) => fetchList(page, pageSize),
          }}
        />

        {selectedRowKeys.length > 0 && (
          <div className={styles['batch-actions-bar']}>
            <span className={styles['selected-count']}>
              已选择 {selectedRowKeys.length} 项
            </span>
            <Button danger onClick={handleBatchDelete}>
              批量删除
            </Button>
          </div>
        )}
      </div>

      {/* 回收站 Modal */}
      <Modal
        open={trashOpen}
        onCancel={handleCloseTrash}
        footer={null}
        title="回收站"
        width={800}
        destroyOnClose
        className={styles['trash-modal']}
      >
        <div className={styles['table-panel']}>
          <Table<WallPaperItem>
            rowKey="id"
            loading={trashLoading}
            columns={trashColumns}
            dataSource={trashList}
            pagination={{
              current: trashPagination.current,
              pageSize: trashPagination.pageSize,
              total: trashTotal,
              showSizeChanger: false,
              onChange: (page, pageSize) => fetchTrashList(page, pageSize),
            }}
          />
        </div>
      </Modal>

      {/* 隐藏的 Modal 容器 */}
      <div style={{ display: 'none' }}>
        <WeChateComponent ref={wechatRef} />
        <TikTokComponent ref={douyinRef} />
        <RedNoteComponent ref={xhsRef} />
      </div>
    </div>
  );
};

export default WallPaperMgt;
