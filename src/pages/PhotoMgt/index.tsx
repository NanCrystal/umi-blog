import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { history } from 'umi';
import { Spin, Button } from 'antd';
import {
  PictureOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SettingOutlined,
  PlusOutlined,
  EditOutlined,
  DoubleRightOutlined,
  LinkOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Modal,
  message,
  Form,
  Input,
  Select,
  DatePicker,
  Tag,
  Spin as AntSpin,
} from 'antd';
import styles from './index.less';
import {
  getPhotoTypes,
  getPhotoLocations,
  getPhotoPlatforms,
} from '@/services/photoTag';
import {
  getPhotosTimeline,
  getPhotosByMonth,
  deletePhoto,
  updatePhoto,
  batchDeletePhotos,
  batchUpdatePhotos,
} from '@/services/photo';
import { getImageUrl, getThumbUrl, formatFileSize } from '@/utils/utils';
import { getArtistList, getSyncPosts } from '@/services/artist';
import { getItineraryList } from '@/services/itinerary';
import { uploadImageFull } from '@/services/upload';
import {
  linkMedia,
  batchLinkMedia,
  getPhotoLinkedPosts,
  unlinkMedia,
} from '@/services/socialLink';
import weiboSvg from '@/assets/images/weibo.svg';
import douyinSvg from '@/assets/images/douyin.svg';
import xhsSvg from '@/assets/images/xiaohongshu.svg';
import igSvg from '@/assets/images/instagram.svg';
import moment from 'moment';

interface Props {}
interface TagItem {
  id: number | string;
  name: string;
}
interface Photo {
  id: number;
  url: string;
  fileName?: string;
  size?: number;
  artistId?: string;
  shootDate?: string;
  photoTypeId?: number;
  photoLocationId?: number;
  photoPlatformId?: number;
  itineraryId?: number;
  title?: string;
  description?: string;
}
interface TimelineMonth {
  yearMonth: string;
  count: number;
  percent: number;
  top: number;
  height: number;
}
interface PhotoGroup {
  yearMonth: string;
  photos: Photo[];
  total: number;
  top: number;
  height: number;
  loaded: boolean;
  recycled: boolean;
}

// 按日分组的类型
interface DayGroup {
  dateKey: string; // YYYY-MM-DD
  dateLabel: string; // MM月DD日
  photos: Photo[];
}

const ALL_KEY = '__all__';
const PHOTO_SIZE = 128 + 8; // 图片尺寸 + gap
const TITLE_HEIGHT = 48; // 月标题高度
const DAY_TITLE_HEIGHT = 36; // 日标题高度（day-title + margin-bottom）
const DAY_GROUP_GAP = 16; // 日分组间距 (day-group margin-bottom)
const PADDING = 24;
const BUFFER_PX = 600;

// ── 高度计算函数 ──

/** 旧版：仅用于时间轴初始估算（还没加载数据时） */
function calcGroupHeight(count: number, cols: number) {
  return Math.ceil(count / cols) * PHOTO_SIZE + TITLE_HEIGHT + PADDING;
}

/**
 * 新版：基于实际日分组精确计算高度
 * 月标题 + Σ(日标题 + 该日照片网格高度) + 日分组间距 + padding
 */
function calcActualGroupHeight(photos: Photo[], cols: number): number {
  if (!photos.length) return TITLE_HEIGHT + PADDING;
  const dayGroups = groupPhotosByDay(photos);
  let total = TITLE_HEIGHT; // 月标题
  dayGroups.forEach((dg, idx) => {
    total += DAY_TITLE_HEIGHT; // 日标题
    total += Math.ceil(dg.photos.length / cols) * PHOTO_SIZE; // 该日照片网格
    if (idx < dayGroups.length - 1) total += DAY_GROUP_GAP; // 日间间距（最后一个不加）
  });
  total += PADDING; // 底部 padding
  return total;
}

// 按日分组工具函数
function groupPhotosByDay(photos: Photo[]): DayGroup[] {
  const map = new Map<string, Photo[]>();
  photos.forEach((p) => {
    const key = p.shootDate ? p.shootDate.slice(0, 10) : 'unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  });
  return Array.from(map.entries())
    .map(([dateKey, items]) => ({
      dateKey,
      dateLabel: fmtDate(dateKey),
      photos: items.sort(
        (a, b) =>
          new Date(b.shootDate || 0).getTime() -
          new Date(a.shootDate || 0).getTime(),
      ),
    }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

function calcCols(w: number) {
  return Math.max(3, Math.floor((w - 80 - 40) / PHOTO_SIZE));
}
function fmtYM(ym: string) {
  return `${ym.slice(0, 4)}年${ym.slice(4, 6)}月`;
}
// 格式化日期：MM月DD日
function fmtDate(dateStr?: string): string {
  if (!dateStr) return '';
  // shootDate 格式可能是 "YYYY-MM-DD HH:mm:ss" 或 "YYYY-MM-DD"
  const d = dateStr.slice(0, 10); // 取 YYYY-MM-DD
  if (d.length === 10) {
    return `${parseInt(d.slice(5, 7), 10)}月${parseInt(d.slice(8), 10)}日`;
  }
  return d;
}

const PhotoPage: React.FC<Props> = () => {
  // ── 原有筛选状态（一字未改） ──────────────────────────────
  const [photoTypes, setPhotoTypes] = useState<TagItem[]>([]);
  const [photoLocations, setPhotoLocations] = useState<TagItem[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Set<number | string>>(
    new Set([ALL_KEY]),
  );
  const [selectedLocations, setSelectedLocations] = useState<
    Set<number | string>
  >(new Set([ALL_KEY]));

  // ── 艺人筛选状态 ──────────────────────────────────────
  const [artistList, setArtistList] = useState<TagItem[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [selectedArtists, setSelectedArtists] = useState<Set<string | number>>(
    new Set([ALL_KEY]),
  );

  // ── 发布平台筛选状态 ──────────────────────────────────
  const [photoPlatforms, setPhotoPlatforms] = useState<TagItem[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    Set<number | string>
  >(new Set([ALL_KEY]));

  // ── 新增：图片列表 + 时间轴状态 ──────────────────────────
  const [groups, setGroups] = useState<Record<string, PhotoGroup>>({});
  const [timelineIndex, setTimelineIndex] = useState<TimelineMonth[]>([]);
  const [scrollRatio, setScrollRatio] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [cols, setCols] = useState(8);
  const [hoverTop, setHoverTop] = useState<number | null>(null);
  const [hoverLabel, setHoverLabel] = useState('');

  // ── 编辑弹窗相关 ───────────────────────────────────────
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);
  const [editPhotoUrl, setEditPhotoUrl] = useState<string>('');
  const [editFileSize, setEditFileSize] = useState(0);
  const [uploadEditLoading, setUploadEditLoading] = useState(false);
  const [artists, setArtists] = useState<any[]>([]);
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);

  // ── 滚动触底加载状态 ─────────────────────────────────────
  const [loadingMore, setLoadingMore] = useState(false);

  // ── 预览弹窗相关 ───────────────────────────────────────
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewingPhoto, setPreviewingPhoto] = useState<Photo | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);

  // ── 批量设置弹窗相关 ─────────────────────────────────────
  const [batchEditModalVisible, setBatchEditModalVisible] = useState(false);
  const [batchForm] = Form.useForm();
  const [batchEditLoading, setBatchEditLoading] = useState(false);

  // ── 关联帖子 ──
  const [linkPostModalVisible, setLinkPostModalVisible] = useState(false);
  const [linkingPhotoIds, setLinkingPhotoIds] = useState<number[]>([]);
  const [selectablePosts, setSelectablePosts] = useState<any[]>([]);
  const [selectedPostIds, setSelectedPostIds] = useState<number[]>([]);
  const [linkedPostIds, setLinkedPostIds] = useState<number[]>([]);
  const [linkPostLoading, setLinkPostLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsSearchLoading, setPostsSearchLoading] = useState(false);

  // ── 头部折叠状态 ───────────────────────────────────────
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const loadingSet = useRef<Set<string>>(new Set());
  const postListRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // ── 搜索帖子 ──
  const fetchSelectablePosts = async (
    keyword: string,
    pageNum: number,
    append = false,
  ) => {
    setPostsSearchLoading(true);
    try {
      const res = await getSyncPosts({
        search: keyword || undefined,
        page: pageNum,
        pageSize: 20,
      });
      setPostsTotal(res?.total || 0);
      setSelectablePosts(
        append ? (prev) => [...prev, ...(res?.list || [])] : res?.list || [],
      );
    } catch {
      /* silent */
    }
    setPostsSearchLoading(false);
  };

  const handlePostSearch = useCallback((val: string) => {
    setSearchKeyword(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPostsPage(1);
      fetchSelectablePosts(val, 1);
    }, 300);
  }, []);

  const handlePostPopupScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (
        el.scrollHeight - el.scrollTop - el.clientHeight < 60 &&
        !postsSearchLoading &&
        selectablePosts.length < postsTotal
      ) {
        const nextPage = postsPage + 1;
        setPostsPage(nextPage);
        fetchSelectablePosts(searchKeyword, nextPage, true);
      }
    },
    [
      postsPage,
      postsSearchLoading,
      selectablePosts.length,
      postsTotal,
      searchKeyword,
    ],
  );

  // ── 获取照片已关联的帖子 ID ──
  const fetchLinkedPostIds = async (photoIds: number[]) => {
    const idSet = new Set<number>();
    for (const pid of photoIds) {
      try {
        const linked = await getPhotoLinkedPosts(pid);
        if (Array.isArray(linked)) linked.forEach((p: any) => idSet.add(p.id));
      } catch {
        /* silent */
      }
    }
    const ids = Array.from(idSet);
    setLinkedPostIds(ids);
    setSelectedPostIds(ids);
  };

  // ── 取消关联帖子 ──
  const handleUnlinkLinkedPost = async (postId: number) => {
    setLinkPostLoading(true);
    try {
      for (const pid of linkingPhotoIds) {
        try {
          await unlinkMedia({
            socialPostId: postId,
            mediaId: pid,
            mediaType: 'PHOTO',
          });
        } catch {
          /* 单条失败继续 */
        }
      }
      message.success(`已取消与帖子 #${postId} 的关联`);
      setLinkedPostIds((prev) => prev.filter((id) => id !== postId));
      setSelectedPostIds((prev) => prev.filter((id) => id !== postId));
    } catch {
      message.error('取消关联失败');
    } finally {
      setLinkPostLoading(false);
    }
  };

  // ── 原有筛选数据加载（一字未改） ─────────────────────────
  useEffect(() => {
    setTypesLoading(true);
    getPhotoTypes()
      .then((res: any) => {
        setPhotoTypes(
          Array.isArray(res)
            ? res.map((item: any) => ({ id: item.id, name: item.name }))
            : [],
        );
      })
      .catch(() => {})
      .finally(() => setTypesLoading(false));

    setLocationsLoading(true);
    getPhotoLocations()
      .then((res: any) => {
        setPhotoLocations(
          Array.isArray(res)
            ? res.map((item: any) => ({ id: item.id, name: item.name }))
            : [],
        );
      })
      .catch(() => {})
      .finally(() => setLocationsLoading(false));

    // 加载艺人列表（筛选用）
    setArtistsLoading(true);
    getArtistList()
      .then((res: any) => {
        setArtistList(
          Array.isArray(res)
            ? res.map((a: any) => ({ id: a.artistId || a.id, name: a.name }))
            : [],
        );
        // 同时设置编辑弹窗用的艺人数据
        setArtists(
          Array.isArray(res)
            ? res.map((a: any) => ({
                name: a.name,
                artistId: a.artistId || a.id,
              }))
            : [],
        );
      })
      .catch(() => {})
      .finally(() => {
        setArtistsLoading(false);
        setDropdownLoading(false);
      });

    // 加载行程列表（编辑弹窗用）
    getItineraryList({ pageSize: 999 })
      .then((res: any) => {
        setItineraries(res?.list || (Array.isArray(res) ? res : []));
      })
      .catch(() => {});

    // 加载发布平台列表（筛选用）
    setPlatformsLoading(true);
    getPhotoPlatforms()
      .then((res: any) => {
        setPhotoPlatforms(
          Array.isArray(res)
            ? res.map((item: any) => ({ id: item.id, name: item.name }))
            : [],
        );
      })
      .catch(() => {})
      .finally(() => setPlatformsLoading(false));
  }, []);

  // ── 原有筛选逻辑（一字未改） ─────────────────────────────
  const activeTypeIds = useMemo<number[]>(() => {
    if (selectedTypes.has(ALL_KEY)) return [];
    return Array.from(selectedTypes).filter((v) => v !== ALL_KEY) as number[];
  }, [selectedTypes]);

  const activeLocationIds = useMemo<number[]>(() => {
    if (selectedLocations.has(ALL_KEY)) return [];
    return Array.from(selectedLocations).filter(
      (v) => v !== ALL_KEY,
    ) as number[];
  }, [selectedLocations]);

  // ── 艺人筛选逻辑（支持多选） ─────────────────────────────
  const activeArtistIds = useMemo<string[]>(() => {
    if (selectedArtists.has(ALL_KEY) || selectedArtists.size === 0) return [];
    return Array.from(selectedArtists).filter((v) => v !== ALL_KEY) as string[];
  }, [selectedArtists]);

  // ── 发布平台筛选逻辑 ──────────────────────────────────
  const activePlatformIds = useMemo<number[]>(() => {
    if (selectedPlatforms.has(ALL_KEY)) return [];
    return Array.from(selectedPlatforms).filter(
      (v) => v !== ALL_KEY,
    ) as number[];
  }, [selectedPlatforms]);

  const handleArtistToggle = (id: string | number) => {
    setSelectedArtists((prev) => {
      const next = new Set(prev);
      if (id === ALL_KEY) return new Set([ALL_KEY]);
      if (next.has(id)) {
        next.delete(id);
        return next.size === 0 ? new Set([ALL_KEY]) : next;
      }
      next.delete(ALL_KEY);
      next.add(id);
      return next;
    });
  };

  const handleTypeToggle = (id: number | string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (id === ALL_KEY) return new Set([ALL_KEY]);
      if (next.has(id)) {
        next.delete(id);
        return next.size === 0 ? new Set([ALL_KEY]) : next;
      }
      next.delete(ALL_KEY);
      next.add(id);
      return next;
    });
  };

  const handleLocationToggle = (id: number | string) => {
    setSelectedLocations((prev) => {
      const next = new Set(prev);
      if (id === ALL_KEY) return new Set([ALL_KEY]);
      if (next.has(id)) {
        next.delete(id);
        return next.size === 0 ? new Set([ALL_KEY]) : next;
      }
      next.delete(ALL_KEY);
      next.add(id);
      return next;
    });
  };

  const handlePlatformToggle = (id: number | string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (id === ALL_KEY) return new Set([ALL_KEY]);
      if (next.has(id)) {
        next.delete(id);
        return next.size === 0 ? new Set([ALL_KEY]) : next;
      }
      next.delete(ALL_KEY);
      next.add(id);
      return next;
    });
  };

  // ── 新增：列数响应式 ──────────────────────────────────────
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const obs = new ResizeObserver(([e]) =>
      setCols(calcCols(e.contentRect.width)),
    );
    obs.observe(panel);
    setCols(calcCols(panel.offsetWidth));
    return () => obs.disconnect();
  }, []);

  // ── 新增：加载某月图片 ────────────────────────────────────
  const loadMonth = useCallback(
    async (yearMonth: string, override?: Record<string, PhotoGroup>) => {
      if (loadingSet.current.has(yearMonth)) return;
      const g = (override ?? groups)[yearMonth];
      if (!g || g.loaded) return;
      loadingSet.current.add(yearMonth);
      try {
        // 分页循环加载该月全部照片
        const allItems: Photo[] = [];
        let page = 1;
        const pageSize = 50;
        while (true) {
          const { items, total } = await getPhotosByMonth({
            yearMonth,
            page,
            pageSize,
            typeIds: activeTypeIds.length > 0 ? activeTypeIds : undefined,
            locationIds:
              activeLocationIds.length > 0 ? activeLocationIds : undefined,
            platformIds:
              activePlatformIds.length > 0 ? activePlatformIds : undefined,
            artistIds: activeArtistIds.length > 0 ? activeArtistIds : undefined,
          });
          if (items?.length) allItems.push(...items);
          if (allItems.length >= total || !items || items.length < pageSize)
            break;
          page++;
        }
        // 根据实际日分组数量精确计算高度
        const newHeight = calcActualGroupHeight(allItems, cols);
        setGroups((prev) => {
          const oldH = prev[yearMonth]?.height ?? newHeight;
          const delta = newHeight - oldH;
          if (delta === 0) {
            return {
              ...prev,
              [yearMonth]: {
                ...prev[yearMonth],
                photos: allItems,
                loaded: true,
                height: newHeight,
              },
            };
          }
          const next: Record<string, PhotoGroup> = {};
          for (const [k, v] of Object.entries(prev)) {
            next[k] =
              k === yearMonth
                ? { ...v, photos: allItems, loaded: true, height: newHeight }
                : v.top > prev[yearMonth].top
                ? { ...v, top: v.top + delta }
                : v;
          }
          return next;
        });
        setTimelineIndex((prev) => {
          const oldH =
            prev.find((m) => m.yearMonth === yearMonth)?.height ?? newHeight;
          const delta = newHeight - oldH;
          if (delta === 0) return prev;
          let passed = false;
          return prev.map((m) => {
            if (m.yearMonth === yearMonth) {
              passed = true;
              return { ...m, height: newHeight };
            }
            if (passed) return { ...m, top: m.top + delta };
            return m;
          });
        });
      } catch {
        /* silent */
      } finally {
        loadingSet.current.delete(yearMonth);
      }
    },
    [
      groups,
      activeTypeIds,
      activeLocationIds,
      activePlatformIds,
      activeArtistIds,
      cols,
    ],
  );

  // ── 新增：筛选变化时重新加载时间轴 ──────────────────────
  useEffect(() => {
    getPhotosTimeline({
      typeIds: activeTypeIds,
      locationIds: activeLocationIds,
      platformIds: activePlatformIds,
      artistIds: activeArtistIds.length > 0 ? activeArtistIds : undefined,
    })
      .then((data: { yearMonth: string; count: number }[]) => {
        if (!data?.length) {
          setTimelineIndex([]);
          setGroups({});
          return;
        }
        const total = data.reduce((s, m) => s + m.count, 0);
        let top = 0;
        const withLayout: TimelineMonth[] = data.map((m) => {
          const height = calcGroupHeight(m.count, cols);
          const item = { ...m, percent: m.count / total, top, height };
          top += height;
          return item;
        });
        const initGroups: Record<string, PhotoGroup> = {};
        withLayout.forEach((m) => {
          initGroups[m.yearMonth] = {
            yearMonth: m.yearMonth,
            photos: [],
            total: m.count,
            top: m.top,
            height: m.height,
            loaded: false,
            recycled: m.top > 2000,
          };
        });
        setTimelineIndex(withLayout);
        setGroups(initGroups);
        withLayout
          .filter((m) => m.top < 2000)
          .forEach((m) => loadMonth(m.yearMonth, initGroups));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTypeIds,
    activeLocationIds,
    activePlatformIds,
    activeArtistIds,
    cols,
  ]);

  // ── 新增：滚动虚拟化 + 懒加载 + 触底加载更多 ─────────────
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setScrollRatio(scrollTop / (scrollHeight || 1));
    const visTop = scrollTop - BUFFER_PX;
    const visBottom = scrollTop + clientHeight + BUFFER_PX;
    const toLoad: string[] = [];
    setGroups((prev) => {
      const next = { ...prev };
      let changed = false;
      Object.values(next).forEach((g) => {
        const bottom = g.top + g.height;
        const inView = bottom > visTop && g.top < visBottom;
        const far =
          bottom < scrollTop - 3000 || g.top > scrollTop + clientHeight + 3000;
        if (inView && g.recycled) {
          next[g.yearMonth] = { ...g, recycled: false };
          changed = true;
        } else if (far && !g.recycled) {
          next[g.yearMonth] = { ...g, recycled: true };
          changed = true;
        }
        if (inView && !g.loaded) toLoad.push(g.yearMonth);
      });
      return changed ? next : prev;
    });
    toLoad.forEach((ym) => {
      if (!loadingSet.current.has(ym)) loadMonth(ym);
    });

    // ── 触底加载：距离底部 < 200px 时，加载后续未加载的月份 ──
    const nearBottom = scrollHeight - scrollTop - clientHeight < 200;
    if (nearBottom && !loadingMore) {
      setGroups((prev) => {
        // 找到所有未加载的月份，按 top 升序（即时间从新到旧）
        const unloaded = Object.values(prev)
          .filter((g) => !g.loaded && !loadingSet.current.has(g.yearMonth))
          .sort((a, b) => a.top - b.top);
        if (unloaded.length === 0) return prev;
        // 加载接下来的 2 个月份
        const batch = unloaded.slice(0, 2);
        batch.forEach((g) => loadMonth(g.yearMonth));
        if (batch.length > 0) setLoadingMore(true);
        return prev;
      });
      // 标记加载完成（延迟重置状态，避免频繁触发）
      setTimeout(() => setLoadingMore(false), 800);
    }
  }, [loadMonth, loadingMore]);

  // ── 新增：时间轴鼠标事件 ─────────────────────────────────
  useEffect(() => {
    const ruler = rulerRef.current;
    if (!ruler || !timelineIndex.length) return;
    const getHit = (clientY: number) => {
      const { top, height } = ruler.getBoundingClientRect();
      const oy = clientY - top;
      if (oy < 0 || oy > height) return null;
      let consumed = 0;
      for (const m of timelineIndex) {
        const h = m.percent * height;
        if (oy < consumed + h) return { month: m, oy };
        consumed += h;
      }
      return { month: timelineIndex[timelineIndex.length - 1], oy };
    };
    const onMove = (e: MouseEvent) => {
      const hit = getHit(e.clientY);
      if (!hit) return;
      setHoverTop(hit.oy);
      setHoverLabel(fmtYM(hit.month.yearMonth));
    };
    const onLeave = () => {
      setHoverTop(null);
      setHoverLabel('');
    };
    const onClick = (e: MouseEvent) => {
      const hit = getHit(e.clientY);
      if (!hit || !scrollRef.current) return;
      scrollRef.current.scrollTo({ top: hit.month.top, behavior: 'smooth' });
    };
    ruler.addEventListener('mousemove', onMove);
    ruler.addEventListener('mouseleave', onLeave);
    ruler.addEventListener('click', onClick);
    return () => {
      ruler.removeEventListener('mousemove', onMove);
      ruler.removeEventListener('mouseleave', onLeave);
      ruler.removeEventListener('click', onClick);
    };
  }, [timelineIndex]);

  // ── 新增：年份刻度 ────────────────────────────────────────
  const yearRulers = useMemo(() => {
    const result: React.ReactNode[] = [];
    const seen = new Set<string>();
    let consumed = 0;
    timelineIndex.forEach((m) => {
      const year = m.yearMonth.slice(0, 4);
      if (!seen.has(year)) {
        seen.add(year);
        result.push(
          <div
            key={year}
            className={styles['tl-year']}
            style={{ top: `${consumed * 100}%` }}
          >
            {year}
            <span className={styles['tl-tick']} />
          </div>,
        );
      }
      consumed += m.percent;
    });
    return result;
  }, [timelineIndex]);

  const sortedMonths = useMemo(
    () => Object.keys(groups).sort((a, b) => (b > a ? 1 : -1)),
    [groups],
  );

  // 计算已加载的图片总数
  const loadedPhotoCount = useMemo(() => {
    return Object.values(groups)
      .filter((g) => g.loaded)
      .reduce((sum, g) => sum + g.photos.length, 0);
  }, [groups]);

  // 总图片数（来自时间轴）
  const totalPhotoCount = useMemo(() => {
    return timelineIndex.reduce((sum, m) => sum + m.count, 0);
  }, [timelineIndex]);

  // 扁平化的照片列表（按月份倒序 → 每月内按日倒序），用于跨日跨月翻页
  const flatPhotos = useMemo(() => {
    const list: Photo[] = [];
    sortedMonths.forEach((ym) => {
      const group = groups[ym];
      if (group?.loaded && group.photos.length) {
        const dayGroups = groupPhotosByDay(group.photos);
        dayGroups.forEach((dg) => {
          dg.photos.forEach((p) => list.push(p));
        });
      }
    });
    return list;
  }, [groups, sortedMonths]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    setSelectedRowKeys((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id],
    );
  };

  // 全选/取消全选某月份的所有照片
  const selectAllInMonth = (yearMonth: string) => {
    const group = groups[yearMonth];
    if (!group || !group.loaded) return;
    const photoIds = group.photos.map((p) => p.id);
    // 判断当前是否已全选
    const allSelected = photoIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      // 取消全选：移除该月的所有图片
      setSelectedIds((prev) => {
        const next = new Set(prev);
        photoIds.forEach((id) => next.delete(id));
        return next;
      });
      setSelectedRowKeys((prev) =>
        prev.filter((k) => !photoIds.includes(k as number)),
      );
    } else {
      // 全选：添加该月的所有图片
      setSelectedIds((prev) => {
        const next = new Set(prev);
        photoIds.forEach((id) => next.add(id));
        return next;
      });
      setSelectedRowKeys((prev) => {
        const next = [...prev];
        photoIds.forEach((id) => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  // 判断某月是否全部选中
  const isMonthAllSelected = (yearMonth: string): boolean => {
    const group = groups[yearMonth];
    if (!group || !group.loaded) return false;
    return group.photos.every((p) => selectedIds.has(p.id));
  };

  // 全选/取消全选某日的所有照片
  const selectAllInDay = (dayPhotos: Photo[]) => {
    const photoIds = dayPhotos.map((p) => p.id);
    const allSelected = photoIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        photoIds.forEach((id) => next.delete(id));
        return next;
      });
      setSelectedRowKeys((prev) =>
        prev.filter((k) => !photoIds.includes(k as number)),
      );
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        photoIds.forEach((id) => next.add(id));
        return next;
      });
      setSelectedRowKeys((prev) => {
        const next = [...prev];
        photoIds.forEach((id) => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  // 判断某日是否全部选中
  const isDayAllSelected = (dayPhotos: Photo[]): boolean => {
    return (
      dayPhotos.length > 0 && dayPhotos.every((p) => selectedIds.has(p.id))
    );
  };

  // 删除单张照片
  const handleDeletePhoto = (photoId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deletePhoto(photoId);
          message.success('删除成功');
          // 从选中状态中移除
          setSelectedIds((prev) => {
            const n = new Set(prev);
            n.delete(photoId);
            return n;
          });
          setSelectedRowKeys((prev) => prev.filter((k) => k !== photoId));
          // 刷新当前月份数据 - 找到该照片所属的月份并重新加载
          Object.keys(groups).forEach((ym) => {
            if (groups[ym].photos.some((p) => p.id === photoId)) {
              const nextGroups = {
                ...groups,
                [ym]: { ...groups[ym], loaded: false, photos: [] },
              };
              setGroups(nextGroups);
              loadMonth(ym, nextGroups);
            }
          });
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  // 编辑照片（弹窗）
  const handleEditPhoto = (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPhoto(photo);
    setEditModalVisible(true);
    // 延迟回填表单，等 Modal 渲染完
    setTimeout(() => {
      editForm.setFieldsValue({
        fileName: photo.fileName || '',
        artistId: photo.artistId,
        shootDate: photo.shootDate ? moment(photo.shootDate) : undefined,
        photoTypeId: photo.photoTypeId,
        photoLocationId: photo.photoLocationId,
        photoPlatformId: photo.photoPlatformId,
        itineraryId: photo.itineraryId,
        description: photo.description || '',
      });
    }, 0);
  };

  // 预览照片（弹窗）
  const handlePreviewPhoto = (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = flatPhotos.findIndex((p) => p.id === photo.id);
    setPreviewingPhoto(photo);
    setPreviewIndex(idx >= 0 ? idx : -1);
    setPreviewModalVisible(true);
  };

  // 预览翻页
  const handlePrevPhoto = () => {
    if (previewIndex <= 0) return;
    const prevIdx = previewIndex - 1;
    setPreviewIndex(prevIdx);
    setPreviewingPhoto(flatPhotos[prevIdx]);
  };

  const handleNextPhoto = () => {
    if (previewIndex < 0 || previewIndex >= flatPhotos.length - 1) return;
    const nextIdx = previewIndex + 1;
    setPreviewIndex(nextIdx);
    setPreviewingPhoto(flatPhotos[nextIdx]);
  };

  // 编辑提交
  const handleEditSubmit = async () => {
    try {
      if (!editingPhoto) return;
      const values = await editForm.validateFields();
      setEditLoading(true);
      await updatePhoto(editingPhoto.id, {
        fileName: values.fileName,
        url: editPhotoUrl || undefined,
        size: editPhotoUrl
          ? editFileSize > 0
            ? editFileSize
            : undefined
          : undefined,
        artistId: values.artistId,
        shootDate: values.shootDate
          ? values.shootDate.format('YYYY-MM-DD HH:mm:ss')
          : undefined,
        photoTypeId: values.photoTypeId,
        photoLocationId: values.photoLocationId,
        photoPlatformId: values.photoPlatformId,
        itineraryId: values.itineraryId,
        description: values.description,
      });
      message.success('修改成功');
      setEditModalVisible(false);
      setEditingPhoto(null);
      setEditPhotoUrl('');
      // 刷新该照片所在月份数据
      Object.keys(groups).forEach((ym) => {
        if (groups[ym].photos.some((p) => p.id === editingPhoto.id)) {
          const nextGroups = {
            ...groups,
            [ym]: { ...groups[ym], loaded: false, photos: [] },
          };
          setGroups(nextGroups);
          loadMonth(ym, nextGroups);
        }
      });
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('修改失败');
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingPhoto(null);
    setEditPhotoUrl('');
    editForm.resetFields();
  };

  // 编辑弹窗上传替换照片
  const handleEditPhotoUpload = async (file: File) => {
    setUploadEditLoading(true);
    try {
      const res = await uploadImageFull(file);
      if (res?.url) {
        setEditPhotoUrl(res.url);
        setEditFileSize(file.size);
        // 自动填入文件名（去掉扩展名）
        const name = file.name.replace(/\.[^/.]+$/, '');
        editForm.setFieldsValue({ fileName: name });
        message.success('照片上传成功');
      }
    } catch {
      message.error('照片上传失败');
    } finally {
      setUploadEditLoading(false);
    }
  };

  // 批量删除照片
  const handleBatchDelete = () => {
    const ids = Array.from(selectedIds);
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${ids.length} 张照片吗？`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await batchDeletePhotos(ids);
          message.success(`成功删除 ${ids.length} 张照片`);
          setSelectedIds(new Set());
          setSelectedRowKeys([]);
          // 精准刷新：收集选中照片所在月份，只重新加载这些月份
          const affectedMonths = new Set<string>();
          ids.forEach((id) => {
            Object.keys(groups).forEach((ym) => {
              if (groups[ym]?.photos?.some((p) => p.id === id)) {
                affectedMonths.add(ym);
              }
            });
          });
          // 重新加载受影响的月份
          affectedMonths.forEach((ym) => {
            setGroups((prev) => {
              const next = {
                ...prev,
                [ym]: { ...prev[ym], loaded: false, photos: [] },
              };
              loadMonth(ym, next);
              return next;
            });
          });
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  // 批量设置 - 打开弹窗
  const handleBatchEdit = () => {
    if (selectedIds.size === 0) return;
    batchForm.resetFields();
    setBatchEditModalVisible(true);
  };

  // 批量设置 - 提交
  const handleBatchEditSubmit = async () => {
    try {
      const values = await batchForm.validateFields();
      // 过滤出有值的字段
      const updateData: Record<string, any> = {};
      if (values.shootDate)
        updateData.shootDate = values.shootDate.format('YYYY-MM-DD HH:mm:ss');
      if (values.artistId !== undefined && values.artistId !== null)
        updateData.artistId = values.artistId;
      if (values.photoTypeId !== undefined && values.photoTypeId !== null)
        updateData.photoTypeId = values.photoTypeId;
      if (
        values.photoLocationId !== undefined &&
        values.photoLocationId !== null
      )
        updateData.photoLocationId = values.photoLocationId;
      if (values.itineraryId !== undefined && values.itineraryId !== null)
        updateData.itineraryId = values.itineraryId;
      if (
        values.photoPlatformId !== undefined &&
        values.photoPlatformId !== null
      )
        updateData.photoPlatformId = values.photoPlatformId;
      if (values.description) updateData.description = values.description;

      if (Object.keys(updateData).length === 0) {
        message.warning('请至少填写一个需要修改的字段');
        return;
      }

      setBatchEditLoading(true);
      const ids = Array.from(selectedIds);
      // 调用批量更新接口，一次请求完成
      await batchUpdatePhotos(ids, updateData);
      message.success(`成功更新 ${ids.length} 张照片`);
      setBatchEditModalVisible(false);
      setSelectedIds(new Set());
      setSelectedRowKeys([]);
      // 刷新所有已加载月份的数据
      Object.keys(groups).forEach((ym) => {
        if (groups[ym].loaded) {
          const nextGroups = {
            ...groups,
            [ym]: { ...groups[ym], loaded: false, photos: [] },
          };
          setGroups(nextGroups);
          loadMonth(ym, nextGroups);
        }
      });
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('批量修改失败');
    } finally {
      setBatchEditLoading(false);
    }
  };
  const trapezoidStyles = headerCollapsed
    ? {
        transform: `rotate(0)`,
        top: '-20px',
      }
    : {
        transform: `rotate(180deg)`,
        top: 0,
      };
  // ── JSX ──────────────────────────────────────────────────
  return (
    <div className={styles['photo-page']}>
      {/* 页面头部（可折叠） */}

      <div
        className={`${styles['mgt-page-header']} ${
          headerCollapsed ? styles['header-collapsed'] : ''
        }`}
      >
        {/* 折叠按钮（顶部中间） */}
        <div
          className={styles['header-toggle-btn']}
          title={headerCollapsed ? '收起标签列表' : '展开标签列表'}
          style={trapezoidStyles}
          onClick={() => setHeaderCollapsed(!headerCollapsed)}
        >
          <DoubleRightOutlined
            style={{ transform: `rotate(-90deg)`, color: '#9f9f9f' }}
          />
        </div>
        {/* <div
          className={styles['header-toggle-btn']}
          onClick={() => setHeaderCollapsed(!headerCollapsed)}
        >
          <span className={headerCollapsed ? styles['toggle-icon-down'] : styles['toggle-icon-up']} />
        </div> */}

        {/* 头部内容（折叠时隐藏） */}
        {!headerCollapsed && (
          <>
            <div className={styles['mgt-page-header-content']}>
              <div className={styles['mgt-page-title']}>照片管理</div>

              {/* 艺人类型筛选 */}
              <div className={styles['filter-tag-row']}>
                <span className={styles['filter-tag-label']}>艺人类型</span>
                <div className={styles['filter-tags']}>
                  {artistsLoading ? (
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
                      {artistList.map((artist) => (
                        <span
                          key={artist.id}
                          className={`${styles['filter-tag-item']} ${
                            selectedArtists.has(artist.id)
                              ? styles['filter-tag-active']
                              : ''
                          }`}
                          onClick={() => handleArtistToggle(artist.id)}
                        >
                          {artist.name}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className={styles['filter-tag-row']}>
                <span className={styles['filter-tag-label']}>照片类型</span>
                <div className={styles['filter-tags']}>
                  {typesLoading ? (
                    <Spin size="small" />
                  ) : (
                    <>
                      <span
                        className={`${styles['filter-tag-item']} ${
                          selectedTypes.has(ALL_KEY)
                            ? styles['filter-tag-active']
                            : ''
                        }`}
                        onClick={() => handleTypeToggle(ALL_KEY)}
                      >
                        不限
                      </span>
                      {photoTypes.map((type) => (
                        <span
                          key={type.id}
                          className={`${styles['filter-tag-item']} ${
                            selectedTypes.has(type.id)
                              ? styles['filter-tag-active']
                              : ''
                          }`}
                          onClick={() => handleTypeToggle(type.id)}
                        >
                          {type.name}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className={styles['filter-tag-row']}>
                <span className={styles['filter-tag-label']}>拍摄地点</span>
                <div className={styles['filter-tags']}>
                  {locationsLoading ? (
                    <Spin size="small" />
                  ) : (
                    <>
                      <span
                        className={`${styles['filter-tag-item']} ${
                          selectedLocations.has(ALL_KEY)
                            ? styles['filter-tag-active']
                            : ''
                        }`}
                        onClick={() => handleLocationToggle(ALL_KEY)}
                      >
                        不限
                      </span>
                      {photoLocations.map((loc) => (
                        <span
                          key={loc.id}
                          className={`${styles['filter-tag-item']} ${
                            selectedLocations.has(loc.id)
                              ? styles['filter-tag-active']
                              : ''
                          }`}
                          onClick={() => handleLocationToggle(loc.id)}
                        >
                          {loc.name}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className={styles['filter-tag-row']}>
                <span className={styles['filter-tag-label']}>发布平台</span>
                <div className={styles['filter-tags']}>
                  {platformsLoading ? (
                    <Spin size="small" />
                  ) : (
                    <>
                      <span
                        className={`${styles['filter-tag-item']} ${
                          selectedPlatforms.has(ALL_KEY)
                            ? styles['filter-tag-active']
                            : ''
                        }`}
                        onClick={() => handlePlatformToggle(ALL_KEY)}
                      >
                        不限
                      </span>
                      {photoPlatforms.map((pf) => (
                        <span
                          key={pf.id}
                          className={`${styles['filter-tag-item']} ${
                            selectedPlatforms.has(pf.id)
                              ? styles['filter-tag-active']
                              : ''
                          }`}
                          onClick={() => handlePlatformToggle(pf.id)}
                        >
                          {pf.name}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className={styles['mgt-page-actions']}>
              <Button
                icon={<DeleteOutlined />}
                disabled={selectedRowKeys.length === 0}
                danger
                ghost
                onClick={handleBatchDelete}
              >
                删除
              </Button>
              <Button
                icon={<DownloadOutlined />}
                disabled={selectedRowKeys.length === 0}
              >
                下载
              </Button>
              <Button
                icon={<SettingOutlined />}
                disabled={selectedRowKeys.length === 0}
                onClick={handleBatchEdit}
              >
                批量设置
              </Button>
              <Button
                icon={<LinkOutlined />}
                disabled={selectedRowKeys.length === 0}
                onClick={() => {
                  const ids = Array.from(selectedIds);
                  setLinkingPhotoIds(ids);
                  setSearchKeyword('');
                  setPostsPage(1);
                  setLinkPostModalVisible(true);
                  fetchSelectablePosts('', 1);
                  fetchLinkedPostIds(ids);
                }}
              >
                关联到帖子
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className={styles['add-btn']}
                onClick={() => history.push('/admin/photo/add')}
              >
                添加照片
              </Button>
            </div>
          </>
        )}
      </div>

      {/* ↓↓↓ 列表区域：把占位替换成真实列表 + 时间轴 ↓↓↓ */}
      <div className={styles['photo-list-panel']} ref={panelRef}>
        {/* 顶部信息栏：图片数量 + 拍摄时间标签 */}
        {sortedMonths.length > 0 && (
          <div className={styles['panel-header-bar']}>
            <span className={styles['header-bar-center']}>
              共加载 {loadedPhotoCount}/{totalPhotoCount} 张图片
            </span>
            <span className={styles['header-bar-right']}>拍摄时间</span>
          </div>
        )}

        {/* 滚动区 */}
        <div
          ref={scrollRef}
          className={styles['scroll-container']}
          onScroll={handleScroll}
        >
          {/* 空状态 */}
          {sortedMonths.length === 0 && (
            <div className={styles['photo-list-placeholder']}>
              <PictureOutlined style={{ fontSize: 48, opacity: 0.25 }} />
              <p style={{ color: 'rgba(255,255,255,0.35)', marginTop: 16 }}>
                照片列表
              </p>
            </div>
          )}

          {/* 月份分组（正常流排列） */}
          {sortedMonths.map((ym) => {
            const group = groups[ym];
            if (!group) return null;
            // recycled 状态的月份：渲染占位符以维持滚动高度，否则无法滚到更早的月份
            if (group.recycled) {
              return (
                <div
                  key={ym}
                  className={styles['month-placeholder']}
                  style={{ height: group.height }}
                />
              );
            }
            // 按日二次分组
            const dayGroups = group.loaded
              ? groupPhotosByDay(group.photos)
              : [];
            return (
              <div key={ym} className={styles['month-group']}>
                {/* 月份标题 + 全选按钮 */}
                <div className={styles['group-title']}>
                  {group.loaded && (
                    <span
                      className={`${styles['select-all-btn']} ${
                        isMonthAllSelected(ym)
                          ? styles['select-all-selected']
                          : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectAllInMonth(ym);
                      }}
                    >
                      {isMonthAllSelected(ym) ? '取消全选' : '全选本月'}
                    </span>
                  )}
                  <span className={styles['group-date']}>{fmtYM(ym)}</span>
                  <span className={styles['group-count']}>
                    {group.total} 张
                  </span>
                </div>
                {/* 图片网格：按日二次分组展示 */}
                {!group.loaded ? (
                  <div className={styles['group-loading']}>
                    <Spin size="small" />
                  </div>
                ) : (
                  <>
                    {dayGroups.map((dg) => (
                      <div key={dg.dateKey} className={styles['day-group']}>
                        {/* 日期标题 + 全选按钮 */}
                        <div className={styles['day-title']}>
                          <span
                            className={`${styles['select-all-btn']} ${
                              styles['day-select-all']
                            } ${
                              isDayAllSelected(dg.photos)
                                ? styles['select-all-selected']
                                : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectAllInDay(dg.photos);
                            }}
                          >
                            {isDayAllSelected(dg.photos) ? '取消' : '全选'}
                          </span>
                          {dg.dateLabel || dg.dateKey}
                          <span className={styles['day-count']}>
                            {dg.photos.length} 张
                          </span>
                        </div>
                        {/* 该日的照片网格 */}
                        <div className={styles['photo-grid']}>
                          {dg.photos.map((photo) => (
                            <div
                              key={photo.id}
                              className={`${styles['photo-item']} ${
                                selectedIds.has(photo.id)
                                  ? styles['photo-selected']
                                  : ''
                              }`}
                              onClick={(e) => handlePreviewPhoto(photo, e)}
                            >
                              <img
                                src={getThumbUrl(photo.url)}
                                alt=""
                                loading="lazy"
                                className={styles['photo-img']}
                              />
                              {/* 左上角 checkbox（始终显示） */}
                              <div className={styles['photo-check-wrap']}>
                                <div
                                  className={styles['photo-check']}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelect(photo.id);
                                  }}
                                >
                                  {selectedIds.has(photo.id) && (
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 14 14"
                                      fill="none"
                                    >
                                      <path
                                        d="M2.5 7L5.5 10L11.5 4"
                                        stroke="#08111d"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  )}
                                </div>
                              </div>
                              {/* hover 时显示编辑/删除/关联（右下角） */}
                              <div className={styles['photo-hover-actions']}>
                                <span
                                  className={`${styles['photo-action-btn']} ${styles['photo-edit-btn']}`}
                                  onClick={(e) => handleEditPhoto(photo, e)}
                                >
                                  <EditOutlined />
                                </span>
                                <span
                                  className={`${styles['photo-action-btn']} ${styles['photo-edit-btn']}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLinkingPhotoIds([photo.id]);
                                    setSearchKeyword('');
                                    setPostsPage(1);
                                    setLinkPostModalVisible(true);
                                    fetchSelectablePosts('', 1);
                                    fetchLinkedPostIds([photo.id]);
                                  }}
                                >
                                  <LinkOutlined />
                                </span>
                                <span
                                  className={`${styles['photo-action-btn']} ${styles['photo-delete-btn']}`}
                                  onClick={(e) =>
                                    handleDeletePhoto(photo.id, e)
                                  }
                                >
                                  <DeleteOutlined />
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}

          {/* 底部加载更多提示 */}
          {sortedMonths.length > 0 && loadingMore && (
            <div className={styles['loading-more-tip']}>
              <Spin size="small" />
              <span>加载更多...</span>
            </div>
          )}
        </div>

        {/* 时间轴（仅有数据时显示） */}
        {timelineIndex.length > 0 && (
          <div ref={rulerRef} className={styles['timeline-ruler']}>
            {yearRulers}
            {/* 当前位置蓝线 */}
            <div
              className={styles['tl-current']}
              style={{ top: `${scrollRatio * 100}%` }}
            />
            {/* hover 线 + tooltip */}
            {hoverTop !== null && (
              <>
                <div
                  className={styles['tl-hover-line']}
                  style={{ top: hoverTop }}
                />
                <div
                  className={styles['tl-tooltip']}
                  style={{ top: Math.max(0, hoverTop - 14) }}
                >
                  {hoverLabel}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 底部选中提示 */}
      {selectedIds.size > 0 && (
        <div className={styles['select-bar']}>
          已选 <strong>{selectedIds.size}</strong> 张
          <span
            className={styles['select-cancel']}
            onClick={() => {
              setSelectedIds(new Set());
              setSelectedRowKeys([]);
            }}
          >
            取消选择
          </span>
        </div>
      )}

      {/* 编辑弹窗 */}
      <Modal
        title="编辑照片"
        open={editModalVisible}
        onCancel={handleEditCancel}
        onOk={handleEditSubmit}
        confirmLoading={editLoading}
        okText="保存"
        cancelText="取消"
        width={560}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          className={styles['photo-edit-form']}
          style={{ marginTop: 16 }}
        >
          {/* 照片预览（可替换） */}
          <Form.Item label="照片">
            {editingPhoto && (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={
                    editPhotoUrl
                      ? `${getThumbUrl(editPhotoUrl)}`
                      : `${getThumbUrl(editingPhoto.url)}`
                  }
                  alt=""
                  style={{
                    maxWidth: '100%',
                    maxHeight: 240,
                    borderRadius: 8,
                    display: 'block',
                  }}
                />
                <div
                  style={{
                    marginTop: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="edit-photo-upload-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleEditPhotoUpload(file);
                      e.target.value = '';
                    }}
                  />
                  <label
                    htmlFor="edit-photo-upload-input"
                    style={{ cursor: 'pointer' }}
                  >
                    <Button
                      type="dashed"
                      size="small"
                      icon={<UploadOutlined />}
                      loading={uploadEditLoading}
                      onClick={() =>
                        document
                          .getElementById('edit-photo-upload-input')
                          ?.click()
                      }
                    >
                      替换照片
                    </Button>
                  </label>
                  {editPhotoUrl && (
                    <span style={{ fontSize: 12, color: '#5fa657' }}>
                      已上传新照片
                      {editFileSize > 0
                        ? ` (${formatFileSize(editFileSize)})`
                        : ''}
                    </span>
                  )}
                </div>
              </div>
            )}
          </Form.Item>

          {/* 文件名称（可编辑，上传时自动读取） */}
          <Form.Item name="fileName" label="文件名称">
            <Input placeholder="输入文件名称" maxLength={100} />
          </Form.Item>

          {editingPhoto?.size != null && !editPhotoUrl && (
            <div
              style={{
                marginBottom: 16,
                fontSize: 12,
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              文件大小：{formatFileSize(editingPhoto.size)}
            </div>
          )}

          {/* 艺人 */}
          <Form.Item
            name="artistId"
            label="艺人"
            rules={[{ required: true, message: '请选择艺人' }]}
          >
            <Select
              placeholder="请选择艺人"
              loading={dropdownLoading}
              showSearch
              optionFilterProp="children"
            >
              {artists.map((a) => (
                <Select.Option key={a.artistId} value={a.artistId}>
                  {a.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 拍摄日期 */}
          <Form.Item name="shootDate" label="拍摄日期">
            <DatePicker
              format="YYYY-MM-DD"
              style={{ width: '100%' }}
              placeholder="选择拍摄日期"
            />
          </Form.Item>

          {/* 照片类型 */}
          <Form.Item name="photoTypeId" label="照片类型">
            <Select
              placeholder="请选择照片类型"
              allowClear
              loading={typesLoading}
            >
              {photoTypes.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 拍摄地点 */}
          <Form.Item name="photoLocationId" label="拍摄地点">
            <Select
              placeholder="请选择拍摄地点"
              allowClear
              loading={locationsLoading}
            >
              {photoLocations.map((l) => (
                <Select.Option key={l.id} value={l.id}>
                  {l.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 发布平台 */}
          <Form.Item name="photoPlatformId" label="发布平台">
            <Select
              placeholder="请选择发布平台"
              allowClear
              loading={platformsLoading}
            >
              {photoPlatforms.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 行程 */}
          <Form.Item name="itineraryId" label="行程">
            <Select
              placeholder="请选择行程"
              allowClear
              loading={dropdownLoading}
              showSearch
              optionFilterProp="children"
            >
              {itineraries.map((i: any) => (
                <Select.Option key={i.id} value={i.id}>
                  {i.title} {i.location ? `· ${i.location}` : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 描述 */}
          <Form.Item name="description" label="描述">
            <Input.TextArea
              placeholder="请输入描述"
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 预览弹窗 */}
      <Modal
        title="照片预览"
        open={previewModalVisible}
        onCancel={() => {
          setPreviewModalVisible(false);
          setPreviewingPhoto(null);
          setPreviewIndex(-1);
        }}
        footer={null}
        width={1200}
        destroyOnClose
        bodyStyle={{ height: 800, overflow: 'hidden' }}
      >
        {previewingPhoto && (
          <div className={styles['preview-content']}>
            {/* 左翻页按钮 */}
            <span
              className={`${styles['preview-nav-btn']} ${
                styles['preview-nav-prev']
              } ${previewIndex <= 0 ? styles['nav-disabled'] : ''}`}
              onClick={handlePrevPhoto}
            >
              ‹
            </span>

            {/* 左边：预览大图 */}
            <div className={styles['preview-image']}>
              <img
                src={`${getImageUrl(
                  previewingPhoto.url,
                )}?imageView2/2/w/800/q/90`}
                alt={previewingPhoto.fileName || '照片预览'}
              />
              {/* 下载按钮 */}
              <span
                className={styles['preview-download-btn']}
                onClick={(e) => {
                  e.stopPropagation();
                  const url = getImageUrl(previewingPhoto.url);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = previewingPhoto.fileName || 'photo.jpg';
                  a.target = '_blank';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                <DownloadOutlined />
                下载原图
              </span>
            </div>

            {/* 右边：详细信息 */}
            <div className={styles['preview-info']}>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>文件名称</span>
                <span className={styles['preview-info-value']}>
                  {previewingPhoto.fileName || '-'}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>文件大小</span>
                <span className={styles['preview-info-value']}>
                  {previewingPhoto.size != null
                    ? formatFileSize(previewingPhoto.size)
                    : '-'}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>艺人</span>
                <span className={styles['preview-info-value']}>
                  {artists.find((a) => a.artistId === previewingPhoto.artistId)
                    ?.name || '-'}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>拍摄日期</span>
                <span className={styles['preview-info-value']}>
                  {previewingPhoto.shootDate || '-'}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>照片类型</span>
                <span className={styles['preview-info-value']}>
                  {photoTypes.find((t) => t.id === previewingPhoto.photoTypeId)
                    ?.name || '-'}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>拍摄地点</span>
                <span className={styles['preview-info-value']}>
                  {photoLocations.find(
                    (l) => l.id === previewingPhoto.photoLocationId,
                  )?.name || '-'}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>发布平台</span>
                <span className={styles['preview-info-value']}>
                  {photoPlatforms.find(
                    (p) => p.id === previewingPhoto.photoPlatformId,
                  )?.name || '-'}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>行程</span>
                <span className={styles['preview-info-value']}>
                  {itineraries.find(
                    (i: any) => i.id === previewingPhoto.itineraryId,
                  )
                    ? `${
                        itineraries.find(
                          (i: any) => i.id === previewingPhoto.itineraryId,
                        ).title
                      }${
                        itineraries.find(
                          (i: any) => i.id === previewingPhoto.itineraryId,
                        ).location
                          ? ` · ${
                              itineraries.find(
                                (i: any) =>
                                  i.id === previewingPhoto.itineraryId,
                              ).location
                            }`
                          : ''
                      }`
                    : '-'}
                </span>
              </div>
              <div
                className={styles['preview-info-item']}
                style={{ alignItems: 'flex-start' }}
              >
                <span className={styles['preview-info-label']}>标题</span>
                <span className={styles['preview-info-value']}>
                  {previewingPhoto.title || '无'}
                </span>
              </div>
              <div
                className={styles['preview-info-item']}
                style={{ alignItems: 'flex-start' }}
              >
                <span className={styles['preview-info-label']}>描述</span>
                <span className={styles['preview-info-value']}>
                  {previewingPhoto.description || '-'}
                </span>
              </div>
            </div>

            {/* 右翻页按钮 */}
            <span
              className={`${styles['preview-nav-btn']} ${
                styles['preview-nav-next']
              } ${
                previewIndex >= flatPhotos.length - 1
                  ? styles['nav-disabled']
                  : ''
              }`}
              onClick={handleNextPhoto}
            >
              ›
            </span>

            {/* 计数器 */}
            {flatPhotos.length > 1 && (
              <div className={styles['preview-counter']}>
                {previewIndex + 1} / {flatPhotos.length}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 关联到帖子弹窗 */}
      <Modal
        title={`关联到社交帖子（${linkingPhotoIds.length} 张照片）`}
        open={linkPostModalVisible}
        onCancel={() => {
          setLinkPostModalVisible(false);
          setSelectedPostIds([]);
          setLinkedPostIds([]);
        }}
        onOk={async () => {
          if (selectedPostIds.length === 0) {
            message.warning('请至少选择一条社交帖子');
            return;
          }
          setLinkPostLoading(true);
          let totalSuccess = 0;
          let totalFailed = 0;
          try {
            for (const postId of selectedPostIds) {
              try {
                const res = await batchLinkMedia({
                  socialPostId: postId,
                  items: linkingPhotoIds.map((id, i) => ({
                    mediaId: id,
                    mediaType: 'PHOTO',
                    sortOrder: i,
                  })),
                });
                totalSuccess += res.success || 0;
                if (res.failed) totalFailed += res.failed;
              } catch {
                totalFailed += linkingPhotoIds.length;
              }
            }
            message.success(
              `关联成功：${totalSuccess} 条${
                totalFailed > 0 ? `，${totalFailed} 条失败` : ''
              }`,
            );
            setLinkPostModalVisible(false);
            setSelectedPostIds([]);
            setLinkedPostIds([]);
          } catch {
            message.error('关联失败');
          } finally {
            setLinkPostLoading(false);
          }
        }}
        confirmLoading={linkPostLoading}
        okText="确认关联"
        width={520}
        destroyOnClose
      >
        <div style={{ padding: '8px 0' }}>
          <div
            style={{
              color: '#999',
              fontSize: 13,
              marginBottom: 12,
              fontFamily: "'Cormorant Garamond',serif",
            }}
          >
            选择要关联到的社交帖子（已关联的帖子默认选中，可取消）：
          </div>
          <Input
            placeholder="搜索帖子内容"
            value={searchKeyword}
            onChange={(e) => handlePostSearch(e.target.value)}
            onPressEnter={(e: any) => {
              setPostsPage(1);
              fetchSelectablePosts(e.target.value, 1);
            }}
            suffix={postsSearchLoading ? <Spin size="small" /> : null}
            style={{ marginBottom: 8 }}
          />
          <div
            ref={postListRef}
            onScroll={handlePostPopupScroll}
            className={styles['post-list-scroll']}
            style={{
              maxHeight: 300,
              overflowY: 'auto',
              border: '1px solid #262626',
              borderRadius: 6,
            }}
          >
            {postsSearchLoading && selectablePosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Spin size="small" />
              </div>
            ) : selectablePosts.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: 24,
                  color: '#666',
                  fontSize: 13,
                }}
              >
                无匹配帖子
              </div>
            ) : (
              (() => {
                const linkedSet = new Set(linkedPostIds);
                const sorted = [...selectablePosts].sort((a, b) => {
                  const aLinked = linkedSet.has(a.id) ? 0 : 1;
                  const bLinked = linkedSet.has(b.id) ? 0 : 1;
                  return aLinked - bLinked;
                });
                return sorted.map((p: any) => {
                  const isLinked = linkedPostIds.includes(p.id);
                  const isSelected = selectedPostIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (!isLinked) {
                          setSelectedPostIds((prev) =>
                            prev.includes(p.id)
                              ? prev.filter((id) => id !== p.id)
                              : [...prev, p.id],
                          );
                        }
                      }}
                      style={{
                        padding: '8px 12px',
                        cursor: isLinked ? 'default' : 'pointer',
                        borderBottom: '1px solid #1a1a1a',
                        background: isSelected
                          ? 'rgba(255,255,255,0.08)'
                          : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected)
                          e.currentTarget.style.background =
                            'rgba(255,255,255,0.04)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected)
                          e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* 多选框 */}
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 3,
                          border: '1px solid #555',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          background: isSelected ? '#5fa657' : 'transparent',
                          borderColor: isSelected ? '#5fa657' : '#555',
                          opacity: isLinked ? 0.4 : 1,
                        }}
                      >
                        {isSelected && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="none"
                          >
                            <path
                              d="M2 5L4 7L8 3"
                              stroke="#fff"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <img
                          src={
                            p.platform === 'weibo'
                              ? weiboSvg
                              : p.platform === 'douyin'
                              ? douyinSvg
                              : p.platform === 'xiaohongshu'
                              ? xhsSvg
                              : igSvg
                          }
                          alt={p.platform}
                          style={{ width: 14, height: 14, flexShrink: 0 }}
                        />
                        <span
                          style={{
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.title ||
                            (p.content || '')
                              .replace(/<[^>]*>/g, '')
                              .slice(0, 60) ||
                            '(无内容)'}
                        </span>
                      </div>
                      {isLinked && (
                        <span
                          style={{
                            fontSize: 11,
                            color: '#5fa657',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            border: '1px solid #5fa657',
                            borderRadius: 3,
                            padding: '1px 6px',
                          }}
                        >
                          已关联
                        </span>
                      )}
                      {isLinked && (
                        <Button
                          type="link"
                          size="small"
                          danger
                          loading={linkPostLoading}
                          style={{
                            fontSize: 11,
                            padding: '0 4px',
                            height: 'auto',
                            flexShrink: 0,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnlinkLinkedPost(p.id);
                          }}
                        >
                          取消关联
                        </Button>
                      )}
                    </div>
                  );
                });
              })()
            )}
            {postsSearchLoading && (
              <div style={{ textAlign: 'center', padding: 12 }}>
                <Spin size="small" />
              </div>
            )}
          </div>
          <div
            style={{
              color: '#666',
              fontSize: 12,
              marginTop: 12,
              fontFamily: "'JetBrains Mono',monospace",
            }}
          >
            已选 {selectedPostIds.length} 条帖子，将 {linkingPhotoIds.length}{' '}
            张照片关联到选中的帖子
          </div>
        </div>
      </Modal>

      {/* 批量设置弹窗 */}
      <Modal
        title={`批量设置（已选 ${selectedIds.size} 张照片）`}
        open={batchEditModalVisible}
        onCancel={() => {
          setBatchEditModalVisible(false);
          batchForm.resetFields();
        }}
        onOk={handleBatchEditSubmit}
        confirmLoading={batchEditLoading}
        okText="保存修改"
        cancelText="取消"
        width={560}
        destroyOnClose
      >
        <Form
          form={batchForm}
          layout="vertical"
          className={styles['photo-edit-form']}
          style={{ marginTop: 16 }}
        >
          <div
            style={{
              marginBottom: 12,
              fontSize: 13,
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            提示：留空表示不修改该字段
          </div>
          {/* 艺人 */}
          <Form.Item name="artistId" label="艺人">
            <Select
              placeholder="请选择艺人（可选）"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {artists.map((a: any) => (
                <Select.Option key={a.artistId} value={a.artistId}>
                  {a.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 拍摄日期 */}
          <Form.Item name="shootDate" label="拍摄日期">
            <DatePicker
              format="YYYY-MM-DD"
              style={{ width: '100%' }}
              placeholder="选择拍摄日期（可选）"
            />
          </Form.Item>

          {/* 照片类型 */}
          <Form.Item name="photoTypeId" label="照片类型">
            <Select
              placeholder="请选择照片类型（可选）"
              allowClear
              loading={typesLoading}
            >
              {photoTypes.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 拍摄地点 */}
          <Form.Item name="photoLocationId" label="拍摄地点">
            <Select
              placeholder="请选择拍摄地点（可选）"
              allowClear
              loading={locationsLoading}
            >
              {photoLocations.map((l) => (
                <Select.Option key={l.id} value={l.id}>
                  {l.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 发布平台 */}
          <Form.Item name="photoPlatformId" label="发布平台">
            <Select
              placeholder="请选择发布平台（可选）"
              allowClear
              loading={platformsLoading}
            >
              {photoPlatforms.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 行程 */}
          <Form.Item name="itineraryId" label="行程">
            <Select
              placeholder="请选择行程（可选）"
              allowClear
              loading={dropdownLoading}
              showSearch
              optionFilterProp="children"
            >
              {itineraries.map((i: any) => (
                <Select.Option key={i.id} value={i.id}>
                  {i.title} {i.location ? `· ${i.location}` : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 描述 */}
          <Form.Item name="description" label="描述">
            <Input.TextArea
              placeholder="请输入描述（可选）"
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PhotoPage;
