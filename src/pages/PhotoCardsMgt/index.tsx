import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
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
  Pagination,
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
  CheckSquareOutlined,
  BorderOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
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
  batchUpdatePhotoCards,
  batchDeletePhotoCards,
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
  onMoveUp: (node: TreeCategory) => void;
  onMoveDown: (node: TreeCategory) => void;
}

/* ============================================================
   Helpers
   ============================================================ */

/** 获取指定节点及其所有子孙节点 ID（用于删除操作） */
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
        // 只收集子孙节点，不包含自身
        if (n.children) collect(n.children);
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

/** 从树中展平所有节点（用于拖拽排序） */
function flattenTree(tree: TreeCategory[]): PhotoCardCategory[] {
  const result: PhotoCardCategory[] = [];
  const walk = (nodes: TreeCategory[]) => {
    for (const n of nodes) {
      result.push({
        id: n.id,
        name: n.name,
        parentId: n.parentId,
        sortOrder: n.sortOrder,
      });
      if (n.children) walk(n.children);
    }
  };
  walk(tree);
  return result;
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
          {!isRoot && (
            <ArrowUpOutlined
              className={styles['tree-action-icon']}
              onClick={(e) => {
                e.stopPropagation();
                handlers.onMoveUp(node);
              }}
            />
          )}
          {!isRoot && (
            <ArrowDownOutlined
              className={styles['tree-action-icon']}
              onClick={(e) => {
                e.stopPropagation();
                handlers.onMoveDown(node);
              }}
            />
          )}
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
  selected?: boolean;
  onToggleSelect?: (cardId: number) => void;
  showCheckbox?: boolean;
}

const CardItem: React.FC<CardItemProps> = ({
  card,
  onPreview,
  onEdit,
  onDelete,
  selected,
  onToggleSelect,
  showCheckbox,
}) => {
  const [hover, setHover] = useState(false);
  const isLandscape = card.orientation === 'landscape';

  return (
    <div
      className={`${styles['card-item']} ${
        isLandscape ? styles['card-item-landscape'] : ''
      } ${selected ? styles['card-item-selected'] : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onPreview(card)}
    >
      {/* Checkbox */}
      {showCheckbox && (
        <div
          className={styles['card-checkbox-wrap']}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(card.id);
          }}
        >
          {selected ? (
            <CheckSquareOutlined
              className={styles['card-checkbox-icon-checked']}
            />
          ) : (
            <BorderOutlined className={styles['card-checkbox-icon']} />
          )}
        </div>
      )}
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
  const [categoryTreeData, setCategoryTreeData] = useState<TreeCategory[]>([]);
  const [cards, setCards] = useState<PhotoCardItem[]>([]);
  const [artists, setArtists] = useState<{ id: number; name: string }[]>([]);
  const [cardTypes, setCardTypes] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);

  // ─── Pagination State ───
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 24,
    total: 0,
  });

  // ─── 响应式列数计算（精确读取 grid 实际列数）───
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(4);
  /** 请求版本号，用于消除 cols 变化导致的竞态：只有最新请求的响应才更新状态 */
  const requestIdRef = useRef(0);

  /** 从 grid container 读取实际渲染列数 */
  const readActualCols = useCallback(() => {
    const el = cardContainerRef.current;
    if (!el) return;
    // 找到 .card-grid 元素（cardContainerRef 挂在 card-spin-wrapper 上，向下找 grid）
    const grid = el.querySelector(
      `.${styles['card-grid']}`,
    ) as HTMLElement | null;
    if (!grid) return;
    const templateCols = getComputedStyle(grid).gridTemplateColumns;
    // gridTemplateColumns 返回 "150px 150px 150px ..." 这样的字符串，数空格分隔数即列数
    const count = templateCols.split(' ').filter(Boolean).length;
    if (count > 0) setCols(count);
  }, []);

  const dynamicPageSize = cols * 3; // 精确 3 行

  useEffect(() => {
    const el = cardContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      readActualCols();
    });
    observer.observe(el);
    // 初始测量延迟到 loading 结束后执行，确保左侧 tree 已撑开、右侧容器宽度稳定
    if (!loading) {
      const raf = requestAnimationFrame(readActualCols);
      return () => {
        observer.disconnect();
        cancelAnimationFrame(raf);
      };
    }
    return () => observer.disconnect();
  }, [readActualCols, loading]);

  // cols 变化时重新加载（防抖 100ms，等布局稳定）
  const colsTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (cols <= 0) return;
    // 首次渲染 pagination.pageSize 是 24（默认值），
    // 只要 dynamicPageSize 不等于当前 pageSize 就触发修正
    if (pagination.pageSize === cols * 3) return; // 已经对齐，跳过

    clearTimeout(colsTimerRef.current);
    colsTimerRef.current = setTimeout(() => {
      ++requestIdRef.current;
      loadCards(filterCategoryId, artistIdsParam, 1, cols * 3);
    }, 100);

    return () => clearTimeout(colsTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols]);

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
  const [nodeCoverUrl, setNodeCoverUrl] = useState('');
  const [uploadingNodeCover, setUploadingNodeCover] = useState(false);

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

  // ─── Batch Edit State ───
  const [selectedCardIds, setSelectedCardIds] = useState<Set<number>>(
    new Set(),
  );
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [batchForm] = Form.useForm();
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // ─── 计算树形数据（后端已直接返回树形结构，无需前端构建） ───
  const treeData = categoryTreeData;
  const selectedNodeId = selectedKeys[0] as number | undefined;

  const selectedNodeData = useMemo(
    () => (selectedNodeId ? findNode(treeData, selectedNodeId) : undefined),
    [selectedNodeId, treeData],
  );

  // 根据树节点筛选 -> 直接传当前选中节点 ID（后端自动展开子孙分类）
  const filterCategoryId = selectedNodeId;

  // 计算当前选中的 artistIds 参数（逗号分隔）
  const artistIdsParam = useMemo(() => {
    if (selectedArtists.has(ALL_KEY)) return undefined;
    const ids = Array.from(selectedArtists);
    return ids.length > 0 ? ids.join(',') : undefined;
  }, [selectedArtists]);

  // ─── 加载小卡列表（支持分类 + 艺人联合筛选，带竞态保护） ───
  const loadCards = useCallback(
    async (
      categoryId?: number,
      artistIds?: string,
      page = 1,
      pageSize = 24,
    ) => {
      const ridAtCallStart = requestIdRef.current; // 记录调用时的版本号
      setCardLoading(true);
      try {
        const params: {
          categoryId?: number;
          artistIds?: string;
          page?: number;
          pageSize?: number;
        } = { page, pageSize };
        if (categoryId) params.categoryId = categoryId;
        if (artistIds) params.artistIds = artistIds;
        const res = await getPhotoCards(params);
        // 竞态保护：如果已有更新的请求发出，丢弃过期响应
        if (ridAtCallStart !== requestIdRef.current) return;
        if (res) {
          setCards(res.list || []);
          setPagination({
            page: res.page,
            pageSize: res.pageSize,
            total: res.total,
          });
        } else {
          setCards([]);
          setPagination({ page: 1, pageSize: 24, total: 0 });
        }
      } catch {
        // 同样检查竞态，避免错误响应覆盖新请求
        if (ridAtCallStart !== requestIdRef.current) return;
        setCards([]);
        setPagination({ page: 1, pageSize: 24, total: 0 });
      } finally {
        // 只有当前最新请求才关闭 loading
        if (ridAtCallStart === requestIdRef.current) {
          setCardLoading(false);
        }
      }
    },
    [],
  );

  // ─── 过滤后的小卡列表（后端已处理艺人筛选，这里直接用 cards） ───
  const filteredCards = cards;

  // ─── 加载数据（只在 mount 执行一次，不依赖 cols）───
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 初始 pageSize 先用一个合理默认值（后面 ResizeObserver 会修正）
      const [categoryRes, cardsRes, artistRes, cardTypeRes] = await Promise.all(
        [
          getPhotoCardCategories(),
          getPhotoCards({ page: 1, pageSize: 24 }),
          getArtistList(),
          getPhotoCardTypes(),
        ],
      );
      setCategoryTreeData(categoryRes || []);
      if (cardsRes) {
        setCards(cardsRes.list || []);
        setPagination({
          page: cardsRes.page,
          pageSize: cardsRes.pageSize,
          total: cardsRes.total,
        });
      }
      setArtists(artistRes || []);
      setCardTypes(cardTypeRes || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []); // ← 空依赖，只执行一次

  // ─── 刷新数据（保持当前选中节点） ───
  const refreshData = useCallback(async () => {
    setLoading(true);
    setCardLoading(true);
    try {
      const [categoryRes, cardsRes] = await Promise.all([
        getPhotoCardCategories(),
        selectedNodeId
          ? getPhotoCards({
              categoryId: selectedNodeId,
              artistIds: artistIdsParam,
              page: pagination.page,
              pageSize: pagination.pageSize,
            })
          : getPhotoCards({ page: 1, pageSize: dynamicPageSize }),
      ]);
      setCategoryTreeData(categoryRes || []);
      if (cardsRes) {
        setCards(cardsRes.list || []);
        setPagination({
          page: cardsRes.page,
          pageSize: cardsRes.pageSize,
          total: cardsRes.total,
        });
      }
      // 保持 selectedKeys 不变，不重置选中节点
    } catch {
      // 错误由拦截器统一处理
    } finally {
      setLoading(false);
      setCardLoading(false);
    }
  }, [selectedNodeId, artistIdsParam, pagination.page, pagination.pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 默认展开所有节点，并选中第一个根节点
  useEffect(() => {
    if (categoryTreeData.length > 0) {
      const allIds = flattenTree(categoryTreeData).map((c) => c.id);
      setExpandedKeys(allIds);
      if (selectedKeys.length === 0) {
        const firstRoot = categoryTreeData[0];
        if (firstRoot) {
          setSelectedKeys([firstRoot.id]);
          // ★ 这里要等 cols 稳定后再请求，所以不传 dynamicPageSize（让 cols effect 去修正）
          // 或者加判断：如果 cols 已经稳定（不是默认值4），直接用 dynamicPageSize
          loadCards(firstRoot.id, artistIdsParam, 1, cols > 4 ? cols * 3 : 24);
        }
      }
    }
  }, [categoryTreeData]); // ← 不要把 dynamicPageSize 放进依赖，避免 cols 变化再次触发

  // ─── 树节点 CRUD ───

  const handleNodeAdd = useCallback(
    (parentId?: number) => {
      setNodeModalMode('add');
      setNodeModalParentId(parentId ?? null);
      setEditingNode(null);
      setNodeCoverUrl('');
      nodeForm.resetFields();
      setNodeModalVisible(true);
    },
    [nodeForm],
  );

  const handleNodeRename = useCallback(
    (node: TreeCategory) => {
      setNodeModalMode('rename');
      setEditingNode(node);
      setNodeCoverUrl(node.coverImage || '');
      nodeForm.setFieldsValue({
        name: node.name,
        coverImage: node.coverImage || undefined,
      });
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
            refreshData();
            if (selectedKeys.includes(node.id)) {
              setSelectedKeys([]);
            }
          } catch {
            // 错误由拦截器统一处理
          }
        },
      });
    },
    [treeData, selectedKeys, refreshData],
  );

  // 树操作 handlers
  const treeHandlers: TreeHandlers = {
    onAdd: (parentId) => handleNodeAdd(parentId),
    onRename: (node) => handleNodeRename(node),
    onDelete: (node) => handleNodeDelete(node),
    onMoveUp: (node) => handleMoveUp(node),
    onMoveDown: (node) => handleMoveDown(node),
  };

  const submitNodeForm = async () => {
    try {
      const values = await nodeForm.validateFields();
      const coverImage = nodeCoverUrl || undefined;
      if (nodeModalMode === 'add') {
        await createPhotoCardCategory(
          values.name,
          nodeModalParentId,
          coverImage,
        );
        message.success('创建成功');
      } else if (editingNode) {
        await updatePhotoCardCategory(editingNode.id, values.name, coverImage);
        message.success('重命名成功');
      }
      setNodeModalVisible(false);
      refreshData();
    } catch (error) {
      // 表单校验失败
    }
  };

  // ─── 上下移动排序（同级内） ───
  const handleMoveNode = useCallback(
    async (node: TreeCategory, direction: 'up' | 'down') => {
      // 深拷贝当前树数据
      const newTree: TreeCategory[] = JSON.parse(
        JSON.stringify(categoryTreeData),
      );

      // 在树中找到目标节点的父级及其兄弟列表
      let parentChildren: TreeCategory[] | undefined;
      let nodeIndex = -1;

      const findInLevel = (nodes: TreeCategory[]): boolean => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === node.id) {
            parentChildren = nodes;
            nodeIndex = i;
            return true;
          }
          if (nodes[i].children && findInLevel(nodes[i].children!)) return true;
        }
        return false;
      };
      findInLevel(newTree);

      if (!parentChildren || nodeIndex < 0) return;

      // 边界检查
      const siblings: TreeCategory[] = parentChildren;
      if (direction === 'up' && nodeIndex === 0) return;
      if (direction === 'down' && nodeIndex === siblings.length - 1) return;

      // 交换位置
      const swapIndex = direction === 'up' ? nodeIndex - 1 : nodeIndex + 1;
      const temp = siblings[nodeIndex];
      siblings[nodeIndex] = siblings[swapIndex];
      siblings[swapIndex] = temp;

      // 同时更新 sortOrder
      siblings.forEach((item: TreeCategory, idx: number) => {
        item.sortOrder = idx + 1;
      });

      // 更新 UI
      setCategoryTreeData(newTree);

      // 持久化：展平所有节点发送到后端
      const flat = flattenTree(newTree);
      try {
        await updateCategorySortOrder(
          flat.map((c) => ({
            id: c.id,
            sortOrder: c.sortOrder,
            parentId: c.parentId,
          })),
        );
      } catch {
        message.error('排序保存失败');
        refreshData();
      }
    },
    [categoryTreeData, refreshData],
  );

  const handleMoveUp = useCallback(
    async (node: TreeCategory) => handleMoveNode(node, 'up'),
    [handleMoveNode],
  );

  const handleMoveDown = useCallback(
    async (node: TreeCategory) => handleMoveNode(node, 'down'),
    [handleMoveNode],
  );

  // ─── 树选择 ───
  const handleTreeSelect = useCallback(
    async (keys: React.Key[]) => {
      // 如果 keys 为空（再次点击已选中节点时 Ant Design 会传空数组），不做任何操作
      if (keys.length === 0) {
        return;
      }
      setSelectedKeys(keys);
      const nodeId = keys[0] as number;
      loadCards(nodeId, artistIdsParam);
    },
    [artistIdsParam, loadCards],
  );

  // ─── 树搜索 ───
  const handleTreeSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
      const allFlat = flattenTree(categoryTreeData);
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
        setExpandedKeys(allFlat.map((c) => c.id));
        setAutoExpandParent(false);
      }
    },
    [treeData, categoryTreeData],
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
    if (selectedNodeId) {
      loadCards(selectedNodeId, artistIdsParam);
    }
  }, [artistIdsParam, selectedNodeId, loadCards]);

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
            refreshData();
          } catch {
            // 错误由拦截器统一处理
          }
        },
      });
    },
    [refreshData],
  );

  // ─── 批量选择 ───

  const handleToggleSelectCard = useCallback((cardId: number) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (
      selectedCardIds.size === filteredCards.length &&
      filteredCards.length > 0
    ) {
      setSelectedCardIds(new Set());
    } else {
      setSelectedCardIds(new Set(filteredCards.map((c) => c.id)));
    }
  }, [filteredCards, selectedCardIds.size]);

  const handleToggleBatchMode = useCallback(() => {
    setBatchEditMode((prev) => !prev);
    setSelectedCardIds(new Set());
  }, []);

  const handleOpenBatchEdit = useCallback(() => {
    batchForm.resetFields();
    setBatchModalVisible(true);
  }, [batchForm]);

  const handleSubmitBatchEdit = async () => {
    try {
      const values = await batchForm.validateFields();
      setBatchSubmitting(true);

      await batchUpdatePhotoCards(Array.from(selectedCardIds), {
        name: values.name || undefined,
        categoryId: values.categoryId || undefined,
        artistId: values.artistId || undefined,
        releaseDate: values.releaseDate
          ? values.releaseDate.format('YYYY-MM-DD')
          : undefined,
        remark: values.remark || undefined,
      });

      message.success(`成功修改 ${selectedCardIds.size} 张小卡`);
      setBatchModalVisible(false);
      setBatchEditMode(false);
      setSelectedCardIds(new Set());
      refreshData();
    } catch (error) {
      // 表单校验失败或接口错误
    } finally {
      setBatchSubmitting(false);
    }
  };

  // ─── 批量删除 ───

  const handleBatchDelete = useCallback(() => {
    Modal.confirm({
      title: '批量删除小卡',
      content: `确定要删除选中的 ${selectedCardIds.size} 张小卡吗？此操作不可撤销。`,
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await batchDeletePhotoCards(Array.from(selectedCardIds));
          message.success(`成功删除 ${res.deleted} 张小卡`);
          setBatchEditMode(false);
          setSelectedCardIds(new Set());
          refreshData();
        } catch {
          // 错误由拦截器统一处理
        }
      },
    });
  }, [selectedCardIds, refreshData]);

  // ─── 翻页 ───
  const handlePageChange = useCallback(
    (page: number, pageSize: number) => {
      loadCards(filterCategoryId, artistIdsParam, page, pageSize);
    },
    [filterCategoryId, artistIdsParam, loadCards],
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

  const handleUploadNodeCover = useCallback(
    async (file: RcFile): Promise<false> => {
      setUploadingNodeCover(true);
      try {
        const res = await uploadCardImage(file);
        setNodeCoverUrl(res.url);
        nodeForm.setFieldsValue({ coverImage: res.url });
        message.success('封面上传成功');
      } catch {
        message.error('封面上传失败');
      } finally {
        setUploadingNodeCover(false);
      }
      return false;
    },
    [nodeForm],
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
      refreshData();
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
          {!treeDataNodes.length && (
            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={() => handleNodeAdd()}
              className={styles['add-root-btn']}
            >
              新建分类
            </Button>
          )}
        </div>

        {/* 树 */}
        <div className={styles['tree-container']}>
          <Spin spinning={loading}>
            <Tree
              // showIcon
              treeData={treeDataNodes}
              selectedKeys={selectedKeys}
              expandedKeys={expandedKeys}
              autoExpandParent={autoExpandParent}
              onSelect={handleTreeSelect}
              onExpand={(keys) => {
                setExpandedKeys(keys);
                setAutoExpandParent(false);
              }}
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
              {pagination.total} 张
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
            <div className={styles['header-actions']}>
              {selectedNodeId && (
                <>
                  {batchEditMode && (
                    <Button
                      icon={<BorderOutlined />}
                      onClick={handleToggleBatchMode}
                      className={styles['batch-mode-btn']}
                    >
                      取消选择
                    </Button>
                  )}
                  {!batchEditMode && (
                    <Button
                      icon={<CheckSquareOutlined />}
                      onClick={handleToggleBatchMode}
                      className={styles['batch-mode-btn']}
                    >
                      批量设置
                    </Button>
                  )}
                  {batchEditMode && selectedCardIds.size > 0 && (
                    <Button
                      type="primary"
                      onClick={handleOpenBatchEdit}
                      disabled={selectedCardIds.size === 0}
                    >
                      修改 ({selectedCardIds.size})
                    </Button>
                  )}
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddCard}
                  >
                    新增小卡
                  </Button>
                </>
              )}
            </div>
            {/* 批量删除按钮 - 有选中时显示在左下角 */}
            {batchEditMode && selectedCardIds.size > 0 && (
              <div className={styles['batch-delete-btn-wrap']}>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleBatchDelete}
                  className={styles['batch-delete-btn']}
                >
                  删除 ({selectedCardIds.size})
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 卡片网格 */}
        <Spin
          spinning={cardLoading}
          className={styles['card-spin']}
          wrapperClassName={styles['card-spin-wrapper']}
        >
          {/* ← ref 挂在这里，作为滚动容器 */}
          <div ref={cardContainerRef}>
            {batchEditMode && (
              <div className={styles['batch-toolbar']}>
                <div className={styles['batch-toolbar-left']}>
                  <span
                    className={styles['select-all-link']}
                    onClick={handleSelectAll}
                  >
                    {selectedCardIds.size === filteredCards.length &&
                    filteredCards.length > 0
                      ? '取消全选'
                      : '全选'}
                  </span>
                  <span className={styles['selected-count']}>
                    已选 {selectedCardIds.size} / {filteredCards.length} 项
                  </span>
                </div>
              </div>
            )}
            <div className={styles['card-grid']}>
              {filteredCards.length > 0
                ? filteredCards.map((card) => (
                    <CardItem
                      key={card.id}
                      card={card}
                      onPreview={handlePreviewCard}
                      onEdit={openEditCardModal}
                      onDelete={handleDeleteCard}
                      selected={selectedCardIds.has(card.id)}
                      onToggleSelect={handleToggleSelectCard}
                      showCheckbox={batchEditMode}
                    />
                  ))
                : null}
            </div>
            {/* 分页 */}
            {pagination.total > 0 && (
              <div className={styles['pagination-wrap']}>
                <Pagination
                  current={pagination.page}
                  pageSize={dynamicPageSize}
                  total={pagination.total}
                  showQuickJumper
                  showTotal={(total) => `共 ${total} 张`}
                  onChange={(page) =>
                    loadCards(
                      filterCategoryId,
                      artistIdsParam,
                      page,
                      dynamicPageSize,
                    )
                  }
                />
              </div>
            )}
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
            <Input
              placeholder="请输入分类名称"
              maxLength={20}
              showCount
              onPressEnter={submitNodeForm}
            />
          </Form.Item>

          {/* 分类封面图 - 选填 */}
          <Form.Item label="分类封面（选填）" name="coverImage">
            <Upload
              listType="picture-card"
              showUploadList={false}
              beforeUpload={
                handleUploadNodeCover as unknown as (
                  file: RcFile,
                  fileList: RcFile[],
                ) => false
              }
              accept="image/*"
            >
              {nodeCoverUrl ? (
                <img
                  src={getImageUrl(nodeCoverUrl)}
                  alt="封面"
                  className={styles['upload-preview']}
                />
              ) : (
                <div className={styles['upload-placeholder']}>
                  {uploadingNodeCover ? (
                    <LoadingOutlined />
                  ) : (
                    <>
                      <UploadOutlined />
                      <span>上传封面</span>
                    </>
                  )}
                </div>
              )}
            </Upload>
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
              {flattenTree(treeData).map((c) => (
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

      {/* ============================ 批量编辑弹窗 ============================ */}
      <Modal
        title={`批量修改 (${selectedCardIds.size} 项)`}
        open={batchModalVisible}
        onOk={handleSubmitBatchEdit}
        onCancel={() => setBatchModalVisible(false)}
        okText="保存"
        cancelText="取消"
        confirmLoading={batchSubmitting}
        destroyOnClose
        width={560}
      >
        <Form
          form={batchForm}
          layout="vertical"
          className={styles['tag-form']}
          preserve={false}
          autoComplete="off"
        >
          <Form.Item label="小卡名称" name="name">
            <Input placeholder="留空则不修改" maxLength={50} showCount />
          </Form.Item>

          <Form.Item label="所属分类" name="categoryId">
            <Select placeholder="留空则不修改" allowClear>
              {flattenTree(categoryTreeData).map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="艺人" name="artistId">
            <Select
              placeholder="留空则不修改"
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

          <Form.Item label="发售时间" name="releaseDate">
            <DatePicker
              style={{ width: '100%' }}
              placeholder="留空则不修改"
              format="YYYY-MM-DD"
            />
          </Form.Item>

          <Form.Item label="描述" name="remark">
            <Input.TextArea
              placeholder="留空则不修改"
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
