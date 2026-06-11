import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Tree,
  Input,
  Button,
  Modal,
  Form,
  Select,
  DatePicker,
  Upload,
  message,
  Empty,
  Spin,
  Radio,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  PlusCircleOutlined,
  SearchOutlined,
  UploadOutlined,
  LoadingOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import { RcFile } from 'antd/lib/upload';
import type { DataNode } from 'antd/lib/tree';
import moment from 'moment';
import { useHistory } from 'umi';
import {
  getPhotoCards,
  createPhotoCard,
  uploadCardImage,
  getPhotoCardCategories,
  createPhotoCardCategory,
  updatePhotoCardCategory,
  deletePhotoCardCategory,
  updateCategorySortOrder,
  deletePhotoCard,
  updatePhotoCard,
} from '@/services/photoCard';
import { getArtistList } from '@/services/artist';
import { getPhotoCardTypes } from '@/services/photoTag';
import type {
  PhotoCardItem,
  PhotoCardCategory,
  CreatePhotoCardParams,
} from '@/services/photoCard';
import styles from './index.less';
import { getImageUrl } from '@/utils/utils';
/* ============================================================
   常量
   ============================================================ */
const ALL_KEY = 'all';

/* ============================================================
   Types
   ============================================================ */
interface TreeCategory extends PhotoCardCategory {
  children?: TreeCategory[];
}

interface TreeHandlers {
  onAdd: (parentId: number) => void;
  onRename: (node: TreeCategory) => void;
  onDelete: (node: TreeCategory) => void;
}

/* ============================================================
   Helpers
   ============================================================ */

/** 扁平列表 -> 树形结构 */
function buildTree(flat: PhotoCardCategory[]): TreeCategory[] {
  const map = new Map<number, TreeCategory>();
  const roots: TreeCategory[] = [];

  flat.forEach((item) => {
    map.set(item.id, { ...item, children: [] });
  });

  flat.forEach((item) => {
    const node = map.get(item.id)!;
    if (item.parentId != null && map.has(item.parentId)) {
      map.get(item.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

/** 获取指定节点及其所有子孙节点 ID */
function getDescendantIds(tree: TreeCategory[], nodeId: number): number[] {
  const ids: number[] = [];
  const collect = (nodes: TreeCategory[]) => {
    for (const n of nodes) {
      ids.push(n.id);
      if (n.children) collect(n.children);
    }
  };
  const findAndCollect = (nodes: TreeCategory[]): boolean => {
    for (const n of nodes) {
      if (n.id === nodeId) {
        collect([n]);
        return true;
      }
      if (n.children && findAndCollect(n.children)) return true;
    }
    return false;
  };
  findAndCollect(tree);
  return ids;
}

/** 从树中找到节点 */
function findNode(tree: TreeCategory[], id: number): TreeCategory | undefined {
  for (const n of tree) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNode(n.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/* ============================================================
   树节点标题组件
   ============================================================ */
interface TreeNodeTitleProps {
  node: TreeCategory;
  handlers: TreeHandlers;
}

const TreeNodeTitle: React.FC<TreeNodeTitleProps> = ({ node, handlers }) => {
  const [hover, setHover] = useState(false);
  const isRoot = !node.parentId; // 第一级节点（根节点）

  return (
    <span
      className={styles['tree-node-title']}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className={styles['tree-node-name']}>{node.name}</span>
      {hover && (
        <span className={styles['tree-node-actions']}>
          <PlusCircleOutlined
            className={styles['tree-action-icon']}
            onClick={(e) => {
              e.stopPropagation();
              handlers.onAdd(node.id);
            }}
          />
          <EditOutlined
            className={styles['tree-action-icon']}
            onClick={(e) => {
              e.stopPropagation();
              handlers.onRename(node);
            }}
          />
          {!isRoot && (
            <DeleteOutlined
              className={styles['tree-action-icon']}
              onClick={(e) => {
                e.stopPropagation();
                handlers.onDelete(node);
              }}
            />
          )}
        </span>
      )}
    </span>
  );
};

/** 将树节点转为 Ant Design Tree DataNode */
function toTreeData(
  nodes: TreeCategory[],
  searchValue: string,
  handlers: TreeHandlers,
): DataNode[] {
  return nodes.map((node) => {
    return {
      key: node.id,
      title: <TreeNodeTitle node={node} handlers={handlers} />,
      icon: (props: { expanded?: boolean }) =>
        props.expanded ? <FolderOpenOutlined /> : <FolderOutlined />,
      children: node.children
        ? toTreeData(node.children, searchValue, handlers)
        : [],
    };
  });
}

/* ============================================================
   小卡卡片组件
   ============================================================ */
interface CardItemProps {
  card: PhotoCardItem;
  onPreview: (card: PhotoCardItem) => void;
  onEdit: (card: PhotoCardItem) => void;
  onDelete: (card: PhotoCardItem) => void;
}

const CardItem: React.FC<CardItemProps> = ({
  card,
  onPreview,
  onEdit,
  onDelete,
}) => {
  const [hover, setHover] = useState(false);
  const isLandscape = card.orientation === 'landscape';

  return (
    <div
      className={`${styles['card-item']} ${
        isLandscape ? styles['card-item-landscape'] : ''
      }`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onPreview(card)}
    >
      <div className={styles['card-image-wrap']}>
        <img
          src={getImageUrl(card.frontImage)}
          alt={card.name}
          className={styles['card-image']}
        />
        {isLandscape && (
          <span className={styles['landscape-badge']} title="横屏小卡">
            <ExpandOutlined />
          </span>
        )}
      </div>
      <div className={styles['card-info']}>
        <span className={styles['card-name']}>{card.name}</span>
        {card.releaseDate && (
          <span className={styles['card-date']}>
            {moment(card.releaseDate).format('YYYY-MM-DD')}
          </span>
        )}
      </div>
      {/* 悬浮操作按钮 */}
      {hover && (
        <div className={styles['card-hover-actions']}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(card);
            }}
            className={styles['card-action-btn']}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(card);
            }}
            className={styles['card-action-btn']}
          />
        </div>
      )}
    </div>
  );
};

/* ============================================================
   主页面
   ============================================================ */
const PhotoCardsMgtPage: React.FC = () => {
  const history = useHistory();
  // ─── Data State ───
  const [flatCategories, setFlatCategories] = useState<PhotoCardCategory[]>([]);
  const [cards, setCards] = useState<PhotoCardItem[]>([]);
  const [artists, setArtists] = useState<{ id: number; name: string }[]>([]);
  const [cardTypes, setCardTypes] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);

  // ─── Tree State ───
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  // ─── Filter State ───
  const [selectedArtists, setSelectedArtists] = useState<Set<string>>(
    new Set([ALL_KEY]),
  );

  // ─── Node CRUD Modal ───
  const [nodeModalVisible, setNodeModalVisible] = useState(false);
  const [nodeModalMode, setNodeModalMode] = useState<'add' | 'rename'>('add');
  const [nodeModalParentId, setNodeModalParentId] = useState<number | null>(
    null,
  );
  const [editingNode, setEditingNode] = useState<TreeCategory | null>(null);
  const [nodeForm] = Form.useForm();

  // ─── Card Add/Edit Modal ───
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [cardModalMode, setCardModalMode] = useState<'add' | 'edit'>('add');
  const [editingCard, setEditingCard] = useState<PhotoCardItem | null>(null);
  const [cardForm] = Form.useForm();
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [frontUrl, setFrontUrl] = useState('');
  const [backUrl, setBackUrl] = useState('');
  const [cardOrientation, setCardOrientation] = useState<
    'portrait' | 'landscape'
  >('portrait');

  // ─── Card Detail Preview Modal ───
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewCard, setPreviewCard] = useState<PhotoCardItem | null>(null);

  // ─── 计算树形数据 ───
  const treeData = useMemo(() => buildTree(flatCategories), [flatCategories]);
  const selectedNodeId = selectedKeys[0] as number | undefined;

  const selectedNodeData = useMemo(
    () => (selectedNodeId ? findNode(treeData, selectedNodeId) : undefined),
    [selectedNodeId, treeData],
  );

  // 根据树节点筛选 -> 获取该节点及其所有子节点的 ID
  const filterCategoryIds = useMemo(() => {
    if (!selectedNodeId) return [];
    return getDescendantIds(treeData, selectedNodeId);
  }, [selectedNodeId, treeData]);

  // 计算当前选中的 artistIds 参数（逗号分隔）
  const artistIdsParam = useMemo(() => {
    if (selectedArtists.has(ALL_KEY)) return undefined;
    const ids = Array.from(selectedArtists);
    return ids.length > 0 ? ids.join(',') : undefined;
  }, [selectedArtists]);

  // ─── 加载小卡列表（支持分类 + 艺人联合筛选） ───
  const loadCards = useCallback(
    async (categoryIds?: string, artistIds?: string) => {
      setCardLoading(true);
      try {
        const params: { categoryIds?: string; artistIds?: string } = {};
        if (categoryIds) params.categoryIds = categoryIds;
        if (artistIds) params.artistIds = artistIds;
        const res = await getPhotoCards(params);
        setCards(res || []);
      } catch {
        setCards([]);
      } finally {
        setCardLoading(false);
      }
    },
    [],
  );

  // ─── 过滤后的小卡列表（后端已处理艺人筛选，这里直接用 cards） ───
  const filteredCards = cards;

  // ─── 加载数据 ───
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [categoryRes, cardsRes, artistRes, cardTypeRes] = await Promise.all(
        [
          getPhotoCardCategories(),
          getPhotoCards(),
          getArtistList(),
          getPhotoCardTypes(),
        ],
      );
      setFlatCategories(categoryRes || []);
      setCards(cardsRes || []);
      setArtists(artistRes || []);
      setCardTypes(cardTypeRes || []);
    } catch {
      // 错误由拦截器统一处理
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 默认展开所有节点，并选中第一个根节点
  useEffect(() => {
    if (flatCategories.length > 0) {
      setExpandedKeys(flatCategories.map((c) => c.id));
      if (selectedKeys.length === 0) {
        const firstRoot = flatCategories.find((c) => !c.parentId);
        if (firstRoot) {
          setSelectedKeys([firstRoot.id]);
          const descendantIds = getDescendantIds(treeData, firstRoot.id);
          loadCards(descendantIds.join(','), artistIdsParam);
        }
      }
    }
  }, [flatCategories, treeData, artistIdsParam, loadCards]);

  // ─── 树节点 CRUD ───

  const handleNodeAdd = useCallback(
    (parentId?: number) => {
      setNodeModalMode('add');
      setNodeModalParentId(parentId ?? null);
      setEditingNode(null);
      nodeForm.resetFields();
      setNodeModalVisible(true);
    },
    [nodeForm],
  );

  const handleNodeRename = useCallback(
    (node: TreeCategory) => {
      setNodeModalMode('rename');
      setEditingNode(node);
      nodeForm.setFieldsValue({ name: node.name });
      setNodeModalVisible(true);
    },
    [nodeForm],
  );

  const handleNodeDelete = useCallback(
    (node: TreeCategory) => {
      const childHint =
        node.children && node.children.length > 0
          ? '其子分类也将一并删除。'
          : '';
      Modal.confirm({
        title: '删除分类',
        content: `确定要删除「${node.name}」吗？${childHint}`,
        okText: '确定',
        cancelText: '取消',
        onOk: async () => {
          try {
            const ids = getDescendantIds(treeData, node.id);
            await Promise.all(ids.map((id) => deletePhotoCardCategory(id)));
            message.success('删除成功');
            loadData();
            if (selectedKeys.includes(node.id)) {
              setSelectedKeys([]);
            }
          } catch {
            // 错误由拦截器统一处理
          }
        },
      });
    },
    [treeData, selectedKeys, loadData],
  );

  // 树操作 handlers
  const treeHandlers: TreeHandlers = {
    onAdd: (parentId) => handleNodeAdd(parentId),
    onRename: (node) => handleNodeRename(node),
    onDelete: (node) => handleNodeDelete(node),
  };

  const submitNodeForm = async () => {
    try {
      const values = await nodeForm.validateFields();
      if (nodeModalMode === 'add') {
        await createPhotoCardCategory(values.name, nodeModalParentId);
        message.success('创建成功');
      } else if (editingNode) {
        await updatePhotoCardCategory(editingNode.id, values.name);
        message.success('重命名成功');
      }
      setNodeModalVisible(false);
      loadData();
    } catch (error) {
      // 表单校验失败
    }
  };

  // ─── 拖拽排序 ───
  const handleTreeDrop = useCallback(
    async (info: any) => {
      const dragKey = info.dragNode.key as number;
      const dropKey = info.node.key as number;
      const dropToGap = info.dropToGap as boolean;
      const dropPosition = info.dropPosition as number;

      // 不允许拖拽到自己
      if (dragKey === dropKey) return;

      // 计算新 parentId
      let newParentId: number | null;
      if (dropToGap) {
        // 放在节点间隙（同级），新 parent = 目标节点的 parent
        const dropNode = flatCategories.find((n) => n.id === dropKey);
        if (!dropNode) return;
        newParentId = dropNode.parentId;
      } else {
        // 放到节点上作为子节点
        newParentId = dropKey;
      }

      // 不允许拖拽到自己的子孙节点中
      if (newParentId != null) {
        const descendantIds = getDescendantIds(treeData, newParentId);
        if (descendantIds.includes(dragKey)) {
          message.warning('不能将节点拖拽到其自身或子孙节点中');
          return;
        }
      }

      // 拷贝并更新 flatCategories
      const updated = flatCategories.map((c) => ({ ...c }));
      const dragItem = updated.find((c) => c.id === dragKey);
      if (!dragItem) return;
      dragItem.parentId = newParentId;

      // 重新计算目标父级下所有兄弟节点的 sortOrder
      const siblings = updated
        .filter((c) => c.parentId === newParentId)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      // 排除拖拽节点自身，计算插入位置
      const withoutDrag = siblings.filter((c) => c.id !== dragKey);
      let insertIndex: number;

      if (dropToGap) {
        const dropIdx = withoutDrag.findIndex((c) => c.id === dropKey);
        insertIndex = dropPosition === -1 ? dropIdx : dropIdx + 1;
        if (insertIndex < 0) insertIndex = withoutDrag.length;
      } else {
        // 作为子节点加入，放在末尾
        insertIndex = withoutDrag.length;
      }

      // 如果 dragged item 不在 withoutDrag 中，插入它
      withoutDrag.splice(insertIndex, 0, dragItem);

      // 重新编号 sortOrder
      withoutDrag.forEach((item, idx) => {
        item.sortOrder = idx + 1;
      });

      // 乐观更新 UI
      setFlatCategories(updated);

      // 调用后端持久化
      try {
        await updateCategorySortOrder(
          updated.map((c) => ({
            id: c.id,
            sortOrder: c.sortOrder,
            parentId: c.parentId,
          })),
        );
      } catch {
        message.error('排序保存失败');
        loadData();
      }
    },
    [flatCategories, treeData, loadData],
  );

  // ─── 树选择 ───
  const handleTreeSelect = useCallback(
    async (keys: React.Key[]) => {
      setSelectedKeys(keys);
      if (keys.length > 0) {
        const nodeId = keys[0] as number;
        const descendantIds = getDescendantIds(treeData, nodeId);
        loadCards(descendantIds.join(','), artistIdsParam);
      } else {
        setCards([]);
      }
    },
    [treeData, artistIdsParam, loadCards],
  );

  // ─── 树搜索 ───
  const handleTreeSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
      if (value) {
        const matchedKeys: React.Key[] = [];
        const searchNodes = (nodes: TreeCategory[]) => {
          nodes.forEach((n) => {
            if (n.name.toLowerCase().includes(value.toLowerCase())) {
              matchedKeys.push(n.id);
            }
            if (n.children) searchNodes(n.children);
          });
        };
        searchNodes(treeData);
        setExpandedKeys(matchedKeys);
        setAutoExpandParent(true);
      } else {
        setExpandedKeys(flatCategories.map((c) => c.id));
        setAutoExpandParent(false);
      }
    },
    [treeData, flatCategories],
  );

  // ─── 艺人筛选切换（联动接口请求） ───
  const handleArtistToggle = useCallback((id: string) => {
    setSelectedArtists((prev) => {
      const next = new Set(prev);
      if (id === ALL_KEY) {
        next.clear();
        next.add(ALL_KEY);
      } else {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
          next.delete(ALL_KEY);
        }
        if (next.size === 0) {
          next.add(ALL_KEY);
        }
      }
      return next;
    });
  }, []);

  // 艺人筛选变化时，重新请求列表
  useEffect(() => {
    // 只有在已选中树节点时才触发
    if (selectedNodeId && filterCategoryIds.length > 0) {
      loadCards(filterCategoryIds.join(','), artistIdsParam);
    }
  }, [artistIdsParam, selectedNodeId, filterCategoryIds, loadCards]);

  // ─── 新增小卡（跳转到新增页面） ───

  const handleAddCard = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedNodeId) {
      params.set('categoryId', String(selectedNodeId));
    }
    history.push(`/admin/photocards/add?${params.toString()}`);
  }, [history, selectedNodeId]);

  // ─── 编辑小卡 ───

  const openEditCardModal = useCallback(
    async (card: PhotoCardItem) => {
      setCardModalMode('edit');
      setEditingCard(card);
      setCardOrientation(
        (card.orientation as 'portrait' | 'landscape') || 'portrait',
      );
      setFrontUrl(card.frontImage || '');
      setBackUrl(card.backImage || '');
      cardForm.setFieldsValue({
        name: card.name,
        orientation: card.orientation || 'portrait',
        categoryId: card.categoryId,
        artistId: card.artistId,
        releaseDate: card.releaseDate ? moment(card.releaseDate) : undefined,
        remark: card.remark || undefined,
      });
      // 设置图片 URL（用于 Upload 组件回显）
      cardForm.setFieldsValue({
        frontImage: card.frontImage,
        backImage: card.backImage || undefined,
      });
      setCardModalVisible(true);
    },
    [cardForm],
  );

  // ─── 详情预览 ───

  const handlePreviewCard = useCallback((card: PhotoCardItem) => {
    setPreviewCard(card);
    setPreviewVisible(true);
  }, []);

  // ─── 删除小卡 ───

  const handleDeleteCard = useCallback(
    (card: PhotoCardItem) => {
      Modal.confirm({
        title: '删除小卡',
        content: `确定要删除「${card.name}」吗？此操作不可撤销。`,
        okText: '确定',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await deletePhotoCard(card.id);
            message.success('删除成功');
            loadData();
          } catch {
            // 错误由拦截器统一处理
          }
        },
      });
    },
    [loadData],
  );

  const handleUploadFront = useCallback(
    async (file: RcFile): Promise<false> => {
      setUploadingFront(true);
      try {
        const res = await uploadCardImage(file);
        setFrontUrl(res.url);
        cardForm.setFieldsValue({ frontImage: res.url });
        message.success('正面图上传成功');
      } catch {
        message.error('正面图上传失败');
      } finally {
        setUploadingFront(false);
      }
      return false;
    },
    [cardForm],
  );

  const handleUploadBack = useCallback(
    async (file: RcFile): Promise<false> => {
      setUploadingBack(true);
      try {
        const res = await uploadCardImage(file);
        setBackUrl(res.url);
        cardForm.setFieldsValue({ backImage: res.url });
        message.success('背面图上传成功');
      } catch {
        message.error('背面图上传失败');
      } finally {
        setUploadingBack(false);
      }
      return false;
    },
    [cardForm],
  );

  const submitCardForm = async () => {
    try {
      const values = await cardForm.validateFields();

      // 从 Upload 组件的数据结构中提取图片 URL
      const extractImageUrl = (imageData: any): string | undefined => {
        if (!imageData) return undefined;
        if (typeof imageData === 'string') return imageData;
        if (imageData.url) return imageData.url;
        if (imageData.fileList?.[0]) {
          const file = imageData.fileList[0];
          if (file.response?.url) return file.response.url;
          if (file.response && typeof file.response === 'string')
            return file.response;
          if (file.url) return file.url;
        }
        return undefined;
      };

      const params: CreatePhotoCardParams = {
        name: values.name,
        frontImage: extractImageUrl(values.frontImage) || frontUrl,
        backImage: extractImageUrl(values.backImage) || backUrl || undefined,
        orientation: values.orientation || 'portrait',
        cardTypeId: values.cardTypeId || undefined,
        categoryId: values.categoryId || undefined,
        artistId: values.artistId || undefined,
        releaseDate: values.releaseDate
          ? values.releaseDate.format('YYYY-MM-DD')
          : undefined,
        remark: values.remark || undefined,
      };

      if (cardModalMode === 'edit' && editingCard) {
        await updatePhotoCard(editingCard.id, params);
        message.success('编辑成功');
      } else {
        await createPhotoCard(params);
        message.success('新增成功');
      }
      setCardModalVisible(false);
      loadData();
    } catch (error) {
      // 表单校验失败
    }
  };

  // ─── Tree data with handlers ───
  const treeDataNodes = useMemo(
    () => toTreeData(treeData, searchValue, treeHandlers),
    [treeData, searchValue, treeHandlers],
  );

  // ─── 渲染 ───
  return (
    <div className={styles['photo-cards-mgt-page']}>
      {/* ============================ 左侧面板 ============================ */}
      <div className={styles['left-panel']}>
        {/* 搜索 + 新建分类 */}
        <div className={styles['tree-header']}>
          <Input
            placeholder="搜索分类..."
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={handleTreeSearch}
            className={styles['tree-search']}
            allowClear
          />
          {/* <Button
            type="default"

            icon={<PlusOutlined />}
            onClick={() => handleNodeAdd()}
            className={styles['add-root-btn']}
          >
            新建分类
          </Button> */}
        </div>

        {/* 树 */}
        <div className={styles['tree-container']}>
          <Spin spinning={loading}>
            <Tree
              // showIcon
              draggable
              treeData={treeDataNodes}
              selectedKeys={selectedKeys}
              expandedKeys={expandedKeys}
              autoExpandParent={autoExpandParent}
              onSelect={handleTreeSelect}
              onExpand={(keys) => {
                setExpandedKeys(keys);
                setAutoExpandParent(false);
              }}
              onDrop={handleTreeDrop}
              className={styles['category-tree']}
            />
            {treeData.length === 0 && !loading && (
              <div className={styles['tree-empty']}>
                <Empty
                  description="暂无分类"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            )}
          </Spin>
        </div>
      </div>

      {/* ============================ 右侧面板 ============================ */}
      <div className={styles['right-panel']}>
        {/* Header */}
        <div className={styles['right-header']}>
          <div className={styles['header-left']}>
            <span className={styles['header-title']}>
              {selectedNodeData ? selectedNodeData.name : '全部小卡'}
            </span>
            <span className={styles['header-count']}>
              {filteredCards.length} 张
            </span>
          </div>
          <div className={styles['header-right']}>
            {/* 艺人类型筛选 */}
            <div className={styles['filter-tag-row']}>
              <span className={styles['filter-tag-label']}>艺人类型</span>
              <div className={styles['filter-tags']}>
                {loading ? (
                  <Spin size="small" />
                ) : (
                  <>
                    <span
                      className={`${styles['filter-tag-item']} ${
                        selectedArtists.has(ALL_KEY)
                          ? styles['filter-tag-active']
                          : ''
                      }`}
                      onClick={() => handleArtistToggle(ALL_KEY)}
                    >
                      不限
                    </span>
                    {artists.map((artist) => (
                      <span
                        key={artist.id}
                        className={`${styles['filter-tag-item']} ${
                          selectedArtists.has(String(artist.id))
                            ? styles['filter-tag-active']
                            : ''
                        }`}
                        onClick={() => handleArtistToggle(String(artist.id))}
                      >
                        {artist.name}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
            {selectedNodeId && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddCard}
              >
                新增小卡
              </Button>
            )}
          </div>
        </div>

        {/* 卡片网格 */}
        <Spin spinning={cardLoading} className={styles['card-spin']}>
          <div className={styles['card-grid']}>
            {filteredCards.length > 0
              ? filteredCards.map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    onPreview={handlePreviewCard}
                    onEdit={openEditCardModal}
                    onDelete={handleDeleteCard}
                  />
                ))
              : null}
          </div>
        </Spin>
      </div>

      {/* ============================ 节点 CRUD 弹窗 ============================ */}
      <Modal
        title={nodeModalMode === 'add' ? '新建分类' : '重命名分类'}
        open={nodeModalVisible}
        onOk={submitNodeForm}
        onCancel={() => setNodeModalVisible(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form
          form={nodeForm}
          layout="vertical"
          className={styles['tag-form']}
          preserve={false}
          autoComplete="off"
        >
          {nodeModalMode === 'add' && nodeModalParentId != null && (
            <Form.Item label="父级分类">
              <span className={styles['parent-label']}>
                {findNode(treeData, nodeModalParentId)?.name || '—'}
              </span>
            </Form.Item>
          )}
          <Form.Item
            label="分类名称"
            name="name"
            rules={[
              { required: true, message: '请输入分类名称' },
              { min: 1, max: 20, message: '长度在1-20个字符' },
            ]}
          >
            <Input placeholder="请输入分类名称" maxLength={20} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* ============================ 新增/编辑小卡弹窗 ============================ */}
      <Modal
        title={cardModalMode === 'edit' ? '编辑小卡' : '新增小卡'}
        open={cardModalVisible}
        onOk={submitCardForm}
        onCancel={() => setCardModalVisible(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        width={620}
        maskClosable={false}
      >
        <Form
          form={cardForm}
          layout="vertical"
          className={styles['tag-form']}
          preserve={false}
          autoComplete="off"
        >
          {/* 小卡方向选择 - 放在最上面 */}
          <div className={styles['orientation-section']}>
            <Form.Item
              label="小卡方向"
              name="orientation"
              initialValue="portrait"
            >
              <Radio.Group
                value={cardOrientation}
                onChange={(e) => setCardOrientation(e.target.value)}
              >
                <Radio value="portrait">竖屏 (55×85mm)</Radio>
                <Radio value="landscape">横屏 (85×55mm)</Radio>
              </Radio.Group>
            </Form.Item>
          </div>

          {/* 正面图 - 必填 */}
          <div
            className={`${styles['upload-row']} ${
              styles[
                cardOrientation === 'landscape'
                  ? 'upload-row-landscape'
                  : 'upload-row-portrait'
              ]
            }`}
          >
            <Form.Item
              label="小卡正面（必填）"
              name="frontImage"
              rules={[{ required: true, message: '请上传小卡正面图' }]}
              className={styles['upload-item']}
            >
              <Upload
                listType="picture-card"
                showUploadList={false}
                beforeUpload={
                  handleUploadFront as unknown as (
                    file: RcFile,
                    fileList: RcFile[],
                  ) => false
                }
                accept="image/*"
                className={styles[`upload-${cardOrientation}`]}
              >
                {frontUrl ? (
                  <img
                    src={getImageUrl(frontUrl)}
                    alt="正面"
                    className={styles['upload-preview']}
                  />
                ) : (
                  <div className={styles['upload-placeholder']}>
                    {uploadingFront ? (
                      <LoadingOutlined />
                    ) : (
                      <>
                        <UploadOutlined />
                        <span>上传正面</span>
                      </>
                    )}
                  </div>
                )}
              </Upload>
            </Form.Item>

            {/* 背面图 - 不必填 */}
            <Form.Item
              label="小卡背面（选填）"
              name="backImage"
              className={styles['upload-item']}
            >
              <Upload
                listType="picture-card"
                showUploadList={false}
                beforeUpload={
                  handleUploadBack as unknown as (
                    file: RcFile,
                    fileList: RcFile[],
                  ) => false
                }
                accept="image/*"
                className={styles[`upload-${cardOrientation}`]}
              >
                {backUrl ? (
                  <img
                    src={getImageUrl(backUrl)}
                    alt="背面"
                    className={styles['upload-preview']}
                  />
                ) : (
                  <div className={styles['upload-placeholder']}>
                    {uploadingBack ? (
                      <LoadingOutlined />
                    ) : (
                      <>
                        <UploadOutlined />
                        <span>上传背面</span>
                      </>
                    )}
                  </div>
                )}
              </Upload>
            </Form.Item>
          </div>

          {/* 小卡名称 */}
          <Form.Item
            label="小卡名称"
            name="name"
            rules={[
              { required: true, message: '请输入小卡名称' },
              { min: 1, max: 50, message: '长度在1-50个字符' },
            ]}
          >
            <Input placeholder="请输入小卡名称" maxLength={50} showCount />
          </Form.Item>

          {/* 选择类型 */}
          {/* <Form.Item label="选择类型" name="cardTypeId">
            <Select placeholder="请选择小卡类型" allowClear>
              {cardTypes.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item> */}

          {/* 所属分类 - 预选当前树节点，禁用编辑 */}
          <Form.Item label="所属分类" name="categoryId">
            <Select placeholder="请选择分类" allowClear disabled>
              {flatCategories.map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 选择艺人 */}
          <Form.Item label="选择艺人" name="artistId">
            <Select
              placeholder="请选择艺人"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {artists.map((a) => (
                <Select.Option key={a.id} value={a.id}>
                  {a.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 发售时间 */}
          <Form.Item label="发售时间" name="releaseDate">
            <DatePicker
              style={{ width: '100%' }}
              placeholder="选择发售日期"
              format="YYYY-MM-DD"
            />
          </Form.Item>

          {/* 备注 */}
          <Form.Item label="备注" name="remark">
            <Input.TextArea
              placeholder="请输入备注信息"
              maxLength={200}
              showCount
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ============================ 详情预览弹窗 ============================ */}
      <Modal
        title={previewCard?.name || '小卡详情'}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              setPreviewVisible(false);
              if (previewCard) openEditCardModal(previewCard);
            }}
          >
            编辑
          </Button>,
        ]}
        width={620}
        destroyOnClose
      >
        {previewCard && (
          <div className={styles['preview-content']}>
            {/* 图片预览区 */}
            <div
              className={`${styles['preview-images']} ${
                styles[
                  previewCard.orientation === 'landscape'
                    ? 'preview-images-landscape'
                    : 'preview-images-portrait'
                ]
              }`}
            >
              <div className={styles['preview-image-item']}>
                <span className={styles['preview-image-label']}>正面</span>
                <img
                  src={getImageUrl(previewCard.frontImage)}
                  alt="正面"
                  className={styles['preview-image']}
                />
              </div>
              {previewCard.backImage && (
                <div className={styles['preview-image-item']}>
                  <span className={styles['preview-image-label']}>背面</span>
                  <img
                    src={getImageUrl(previewCard.backImage)}
                    alt="背面"
                    className={styles['preview-image']}
                  />
                </div>
              )}
            </div>
            {/* 信息区 */}
            <div className={styles['preview-info']}>
              <div className={styles['preview-info-row']}>
                <span className={styles['preview-info-label']}>名称</span>
                <span className={styles['preview-info-value']}>
                  {previewCard.name}
                </span>
              </div>
              <div className={styles['preview-info-row']}>
                <span className={styles['preview-info-label']}>方向</span>
                <span className={styles['preview-info-value']}>
                  {previewCard.orientation === 'landscape'
                    ? '横屏 (85×55mm)'
                    : '竖屏 (55×85mm)'}
                </span>
              </div>
              {previewCard.categoryId && (
                <div className={styles['preview-info-row']}>
                  <span className={styles['preview-info-label']}>所属分类</span>
                  <span className={styles['preview-info-value']}>
                    {findNode(treeData, previewCard.categoryId)?.name || '—'}
                  </span>
                </div>
              )}
              {previewCard.artistId && (
                <div className={styles['preview-info-row']}>
                  <span className={styles['preview-info-label']}>艺人</span>
                  <span className={styles['preview-info-value']}>
                    {artists.find((a) => a.id === previewCard.artistId)?.name ||
                      '—'}
                  </span>
                </div>
              )}
              {previewCard.releaseDate && (
                <div className={styles['preview-info-row']}>
                  <span className={styles['preview-info-label']}>发售时间</span>
                  <span className={styles['preview-info-value']}>
                    {moment(previewCard.releaseDate).format('YYYY-MM-DD')}
                  </span>
                </div>
              )}
              {previewCard.remark && (
                <div className={styles['preview-info-row']}>
                  <span className={styles['preview-info-label']}>备注</span>
                  <span className={styles['preview-info-value']}>
                    {previewCard.remark}
                  </span>
                </div>
              )}
              <div className={styles['preview-info-row']}>
                <span className={styles['preview-info-label']}>创建时间</span>
                <span className={styles['preview-info-value']}>
                  {moment(previewCard.createdAt).format('YYYY-MM-DD HH:mm')}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PhotoCardsMgtPage;
