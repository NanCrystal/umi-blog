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
  PlayCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SettingOutlined,
  PlusOutlined,
  EditOutlined,
  LinkOutlined,
  DoubleRightOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { Modal, message, Form, Input, Select, DatePicker, Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import styles from './index.less';
import {
  getPhotoTypes,
  getPhotoLocations,
  getPhotoPlatforms,
} from '@/services/photoTag';

import { getImageUrl, formatFileSize } from '@/utils/utils';
import { uploadImageFull } from '@/services/upload';
import { uploadVideoFile } from '@/services/video';
import { getArtistList } from '@/services/artist';
import { getItineraryList } from '@/services/itinerary';
import {
  getVideosTimeline,
  getVideosByMonth,
  deleteVideo,
  batchDeleteVideos,
  updateVideo,
  batchUpdateVideos,
} from '@/services/video';
import { getSyncPosts } from '@/services/artist';
import {
  batchLinkMedia,
  getVideoLinkedPosts,
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
  uuid?: string;
}
interface Video {
  id: number;
  originalUrl: string;
  coverUrl?: string;
  playUrl?: string;
  hdUrl?: string;
  fileName?: string;
  title?: string;
  size?: number;
  artistId?: string;
  shootDate?: string;
  tagTypeId?: number;
  tagLocationId?: number;
  tagPlatformId?: number;
  itineraryId?: number;
  description?: string;
  duration?: number;
  width?: number;
  height?: number;
  status?: string;
  tagType?: { id: number; name: string };
  tagLocation?: { id: number; name: string };
  tagPlatform?: { id: number; name: string };
  itinerary?: { id: number; title: string; location: string };
}
interface TimelineMonth {
  yearMonth: string;
  count: number;
  percent: number;
  top: number;
  height: number;
}
interface VideoGroup {
  yearMonth: string;
  videos: Video[];
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
  videos: Video[];
}

const ALL_KEY = '__all__';
const VIDEO_SIZE = 128 + 8; // 视频封面尺寸 + gap
const TITLE_HEIGHT = 48; // 月标题高度
const DAY_TITLE_HEIGHT = 36; // 日标题高度（day-title + margin-bottom）
const DAY_GROUP_GAP = 16; // 日分组间距 (day-group margin-bottom)
const PADDING = 24;
const BUFFER_PX = 600;

// ── 高度计算函数 ──

/** 旧版：仅用于时间轴初始估算（还没加载数据时） */
function calcGroupHeight(count: number, cols: number) {
  return Math.ceil(count / cols) * VIDEO_SIZE + TITLE_HEIGHT + PADDING;
}

/**
 * 新版：基于实际日分组精确计算高度
 * 月标题 + Σ(日标题 + 该日视频网格高度) + 日分组间距 + padding
 */
function calcActualGroupHeight(videos: Video[], cols: number): number {
  if (!videos.length) return TITLE_HEIGHT + PADDING;
  const dayGroups = groupVideosByDay(videos);
  let total = TITLE_HEIGHT; // 月标题
  dayGroups.forEach((dg, idx) => {
    total += DAY_TITLE_HEIGHT; // 日标题
    total += Math.ceil(dg.videos.length / cols) * VIDEO_SIZE; // 该日视频网格
    if (idx < dayGroups.length - 1) total += DAY_GROUP_GAP; // 日间间距
  });
  total += PADDING; // 底部 padding
  return total;
}

// 按日分组工具函数
function groupVideosByDay(videos: Video[]): DayGroup[] {
  const map = new Map<string, Video[]>();
  videos.forEach((v) => {
    const key = v.shootDate ? v.shootDate.slice(0, 10) : 'unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  });
  return Array.from(map.entries())
    .map(([dateKey, items]) => ({
      dateKey,
      dateLabel: fmtDate(dateKey),
      videos: items.sort(
        (a, b) =>
          new Date(b.shootDate || 0).getTime() -
          new Date(a.shootDate || 0).getTime(),
      ),
    }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

function calcCols(w: number) {
  return Math.max(3, Math.floor((w - 80 - 40) / VIDEO_SIZE));
}
function fmtYM(ym: string) {
  return `${ym.slice(0, 4)}年${ym.slice(4, 6)}月`;
}
function fmtDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = dateStr.slice(0, 10);
  if (d.length === 10) {
    return `${parseInt(d.slice(5, 7), 10)}月${parseInt(d.slice(8), 10)}日`;
  }
  return d;
}
function thumb(url: string) {
  return `${getImageUrl(url)}?vframe/jpg/offset/0`; // 视频封面取第一帧
}

const VideoPage: React.FC<Props> = () => {
  // ── 原有筛选状态 ─────────────────────────────────
  const [videoTypes, setVideoTypes] = useState<TagItem[]>([]);
  const [videoLocations, setVideoLocations] = useState<TagItem[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Set<number | string>>(
    new Set([ALL_KEY]),
  );
  const [selectedLocations, setSelectedLocations] = useState<
    Set<number | string>
  >(new Set([ALL_KEY]));

  // ── 艺人筛选状态 ─────────────────────────────────
  const [artistList, setArtistList] = useState<TagItem[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [selectedArtists, setSelectedArtists] = useState<Set<string | number>>(
    new Set([ALL_KEY]),
  );

  // ── 发布平台筛选状态 ─────────────────────────────
  const [videoPlatforms, setVideoPlatforms] = useState<TagItem[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    Set<number | string>
  >(new Set([ALL_KEY]));

  // ── 视频列表 + 时间轴状态 ─────────────────────────
  const [groups, setGroups] = useState<Record<string, VideoGroup>>({});
  const [timelineIndex, setTimelineIndex] = useState<TimelineMonth[]>([]);
  const [scrollRatio, setScrollRatio] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [cols, setCols] = useState(8);
  const [hoverTop, setHoverTop] = useState<number | null>(null);
  const [hoverLabel, setHoverLabel] = useState('');

  // ── 编辑弹窗相关 ─────────────────────────────────
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);
  // 编辑弹窗 - 封面上传
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editCoverFileList, setEditCoverFileList] = useState<UploadFile[]>([]);
  // 编辑弹窗 - 替换视频
  const [editNewVideoUrl, setEditNewVideoUrl] = useState('');
  const [editNewVideoKey, setEditNewVideoKey] = useState('');
  const [editNewVideoSize, setEditNewVideoSize] = useState(0);

  // ── 关联帖子 ──
  const [linkPostModalVisible, setLinkPostModalVisible] = useState(false);
  const [linkingVideoIds, setLinkingVideoIds] = useState<number[]>([]);
  const [selectablePosts, setSelectablePosts] = useState<any[]>([]);
  const [selectedPostIds, setSelectedPostIds] = useState<number[]>([]);
  const [linkedPostIds, setLinkedPostIds] = useState<number[]>([]);
  const [linkPostLoading, setLinkPostLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsSearchLoading, setPostsSearchLoading] = useState(false);

  const [artists, setArtists] = useState<any[]>([]);
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);

  // ── 滚动触底加载状态 ─────────────────────────────
  const [loadingMore, setLoadingMore] = useState(false);

  // ── 预览弹窗相关 ─────────────────────────────────
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewingVideo, setPreviewingVideo] = useState<Video | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  // ── 批量设置弹窗相关 ─────────────────────────────
  const [batchEditModalVisible, setBatchEditModalVisible] = useState(false);
  const [batchForm] = Form.useForm();
  const [batchEditLoading, setBatchEditLoading] = useState(false);

  // ── 头部折叠状态 ─────────────────────────────────
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

  // ── 获取视频已关联的帖子 ID ──
  const fetchLinkedPostIds = async (videoIds: number[]) => {
    const idSet = new Set<number>();
    for (const vid of videoIds) {
      try {
        const linked = await getVideoLinkedPosts(vid);
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
    let successCount = 0;
    try {
      for (const vid of linkingVideoIds) {
        try {
          await unlinkMedia({
            socialPostId: postId,
            mediaId: vid,
            mediaType: 'VIDEO',
          });
          successCount++;
        } catch {
          /* 单条失败继续 */
        }
      }
      message.success(`已取消与帖子 #${postId} 的关联`);
      // 更新状态：从已关联和已选中中移除
      setLinkedPostIds((prev) => prev.filter((id) => id !== postId));
      setSelectedPostIds((prev) => prev.filter((id) => id !== postId));
    } catch {
      message.error('取消关联失败');
    } finally {
      setLinkPostLoading(false);
    }
  };

  // ── 筛选数据加载 ─────────────────────────────────
  useEffect(() => {
    setTypesLoading(true);
    getPhotoTypes()
      .then((res: any) => {
        setVideoTypes(
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
        setVideoLocations(
          Array.isArray(res)
            ? res.map((item: any) => ({ id: item.id, name: item.name }))
            : [],
        );
      })
      .catch(() => {})
      .finally(() => setLocationsLoading(false));

    setArtistsLoading(true);
    getArtistList()
      .then((res: any) => {
        setArtistList(
          Array.isArray(res)
            ? res.map((a: any) => ({ id: a.artistId || a.id, name: a.name }))
            : [],
        );
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

    getItineraryList({ pageSize: 999 })
      .then((res: any) => {
        setItineraries(res?.list || (Array.isArray(res) ? res : []));
      })
      .catch(() => {});

    setPlatformsLoading(true);
    getPhotoPlatforms()
      .then((res: any) => {
        setVideoPlatforms(
          Array.isArray(res)
            ? res.map((item: any) => ({
                id: item.id,
                name: item.name,
                uuid: item.uuid,
              }))
            : [],
        );
      })
      .catch(() => {})
      .finally(() => setPlatformsLoading(false));
  }, []);

  // ── 筛选逻辑 ─────────────────────────────────────
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

  const activeArtistIds = useMemo<string[]>(() => {
    if (selectedArtists.has(ALL_KEY) || selectedArtists.size === 0) return [];
    return Array.from(selectedArtists).filter((v) => v !== ALL_KEY) as string[];
  }, [selectedArtists]);

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

  // ── 列数响应式 ──────────────────────────────────
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

  // ── 加载某月视频 ────
  const loadMonth = useCallback(
    async (yearMonth: string, override?: Record<string, VideoGroup>) => {
      if (loadingSet.current.has(yearMonth)) return;
      const g = (override ?? groups)[yearMonth];
      if (!g || g.loaded) return;
      loadingSet.current.add(yearMonth);
      try {
        let page = 1;
        const pageSize = 50;
        const allItems: Video[] = [];
        while (true) {
          const { items, total } = await getVideosByMonth({
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
        const newHeight = calcActualGroupHeight(allItems, cols);
        setGroups((prev) => {
          const oldH = prev[yearMonth]?.height ?? newHeight;
          const delta = newHeight - oldH;
          if (delta === 0) {
            return {
              ...prev,
              [yearMonth]: {
                ...prev[yearMonth],
                videos: allItems,
                loaded: true,
                height: newHeight,
              },
            };
          }
          const next: Record<string, VideoGroup> = {};
          for (const [k, v] of Object.entries(prev)) {
            next[k] =
              k === yearMonth
                ? { ...v, videos: allItems, loaded: true, height: newHeight }
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

  // ── 筛选变化时重新加载时间轴 ────
  useEffect(() => {
    getVideosTimeline({
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
        const initGroups: Record<string, VideoGroup> = {};
        withLayout.forEach((m) => {
          initGroups[m.yearMonth] = {
            yearMonth: m.yearMonth,
            videos: [],
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

  // ── 滚动虚拟化 + 懒加载 + 触底加载更多 ────────────
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

    const nearBottom = scrollHeight - scrollTop - clientHeight < 200;
    if (nearBottom && !loadingMore) {
      setGroups((prev) => {
        const unloaded = Object.values(prev)
          .filter((g) => !g.loaded && !loadingSet.current.has(g.yearMonth))
          .sort((a, b) => a.top - b.top);
        if (unloaded.length === 0) return prev;
        const batch = unloaded.slice(0, 2);
        batch.forEach((g) => loadMonth(g.yearMonth));
        if (batch.length > 0) setLoadingMore(true);
        return prev;
      });
      setTimeout(() => setLoadingMore(false), 800);
    }
  }, [loadMonth, loadingMore]);

  // ── 时间轴鼠标事件 ──────────────────────────────
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

  // ── 年份刻度 ────────────────────────────────────
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

  const loadedVideoCount = useMemo(() => {
    return Object.values(groups)
      .filter((g) => g.loaded)
      .reduce((sum, g) => sum + g.videos.length, 0);
  }, [groups]);

  const totalVideoCount = useMemo(() => {
    return timelineIndex.reduce((sum, m) => sum + m.count, 0);
  }, [timelineIndex]);

  // 扁平化的视频列表
  const flatVideos = useMemo(() => {
    const list: Video[] = [];
    sortedMonths.forEach((ym) => {
      const group = groups[ym];
      if (group?.loaded && group.videos.length) {
        const dayGroups = groupVideosByDay(group.videos);
        dayGroups.forEach((dg) => {
          dg.videos.forEach((v) => list.push(v));
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

  const selectAllInMonth = (yearMonth: string) => {
    const group = groups[yearMonth];
    if (!group || !group.loaded) return;
    const videoIds = group.videos.map((v) => v.id);
    const allSelected = videoIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        videoIds.forEach((id) => next.delete(id));
        return next;
      });
      setSelectedRowKeys((prev) =>
        prev.filter((k) => !videoIds.includes(k as number)),
      );
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        videoIds.forEach((id) => next.add(id));
        return next;
      });
      setSelectedRowKeys((prev) => {
        const next = [...prev];
        videoIds.forEach((id) => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const isMonthAllSelected = (yearMonth: string): boolean => {
    const group = groups[yearMonth];
    if (!group || !group.loaded) return false;
    return group.videos.every((v) => selectedIds.has(v.id));
  };

  const selectAllInDay = (dayVideos: Video[]) => {
    const videoIds = dayVideos.map((v) => v.id);
    const allSelected = videoIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        videoIds.forEach((id) => next.delete(id));
        return next;
      });
      setSelectedRowKeys((prev) =>
        prev.filter((k) => !videoIds.includes(k as number)),
      );
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        videoIds.forEach((id) => next.add(id));
        return next;
      });
      setSelectedRowKeys((prev) => {
        const next = [...prev];
        videoIds.forEach((id) => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const isDayAllSelected = (dayVideos: Video[]): boolean => {
    return (
      dayVideos.length > 0 && dayVideos.every((v) => selectedIds.has(v.id))
    );
  };

  // 删除单条视频（接口暂未就绪，仅弹出提示）
  const handleDeleteVideo = (videoId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个视频吗？',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteVideo(videoId);
          message.success('删除成功');
          setSelectedIds((prev) => {
            const n = new Set(prev);
            n.delete(videoId);
            return n;
          });
          setSelectedRowKeys((prev) => prev.filter((k) => k !== videoId));
          Object.keys(groups).forEach((ym) => {
            if (groups[ym].videos.some((v) => v.id === videoId)) {
              const nextGroups = {
                ...groups,
                [ym]: { ...groups[ym], loaded: false, videos: [] },
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

  // 编辑视频（弹窗）
  const handleEditVideo = (video: Video, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingVideo(video);
    setEditCoverUrl('');
    setEditCoverFileList([]);
    setEditNewVideoUrl('');
    setEditNewVideoKey('');
    setEditNewVideoSize(0);
    setEditModalVisible(true);
    setTimeout(() => {
      editForm.setFieldsValue({
        fileName: video.fileName || '',
        artistId: video.artistId,
        shootDate: video.shootDate ? moment(video.shootDate) : undefined,
        videoTypeId: video.tagTypeId,
        videoLocationId: video.tagLocationId,
        videoPlatformId: video.tagPlatformId,
        itineraryId: video.itineraryId,
        description: video.description || '',
      });
    }, 0);
  };

  // 预览视频（弹窗）
  const handlePreviewVideo = (video: Video, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = flatVideos.findIndex((v) => v.id === video.id);
    setPreviewingVideo(video);
    setPreviewIndex(idx >= 0 ? idx : -1);
    setPreviewPlaying(false);
    setPreviewModalVisible(true);
  };

  // 预览翻页
  const handlePrevVideo = () => {
    if (previewIndex <= 0) return;
    const prevIdx = previewIndex - 1;
    setPreviewIndex(prevIdx);
    setPreviewingVideo(flatVideos[prevIdx]);
    setPreviewPlaying(false);
  };

  const handleNextVideo = () => {
    if (previewIndex < 0 || previewIndex >= flatVideos.length - 1) return;
    const nextIdx = previewIndex + 1;
    setPreviewIndex(nextIdx);
    setPreviewingVideo(flatVideos[nextIdx]);
    setPreviewPlaying(false);
  };

  // 编辑提交
  const handleEditSubmit = async () => {
    try {
      if (!editingVideo) return;
      const values = await editForm.validateFields();
      setEditLoading(true);
      const updateData: Record<string, any> = {
        fileName: values.fileName,
        artistId: values.artistId,
        shootDate: values.shootDate
          ? values.shootDate.format('YYYY-MM-DD HH:mm:ss')
          : undefined,
        tagTypeId: values.videoTypeId,
        tagLocationId: values.videoLocationId,
        tagPlatformId: values.videoPlatformId,
        itineraryId: values.itineraryId,
        description: values.description,
      };
      if (editCoverUrl) updateData.coverUrl = editCoverUrl;
      if (editNewVideoKey) {
        updateData.qiniuKey = editNewVideoKey;
        updateData.originalUrl = editNewVideoUrl;
        updateData.playUrl = editNewVideoUrl;
        updateData.size = editNewVideoSize;
      }
      await updateVideo(editingVideo.id, updateData);
      message.success('修改成功');
      setEditModalVisible(false);
      setEditingVideo(null);
      Object.keys(groups).forEach((ym) => {
        if (groups[ym].videos.some((v) => v.id === editingVideo.id)) {
          const nextGroups = {
            ...groups,
            [ym]: { ...groups[ym], loaded: false, videos: [] },
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
    setEditingVideo(null);
    setEditCoverUrl('');
    setEditCoverFileList([]);
    setEditNewVideoUrl('');
    setEditNewVideoKey('');
    setEditNewVideoSize(0);
    editForm.resetFields();
  };

  // 批量删除视频
  const handleBatchDelete = () => {
    const ids = Array.from(selectedIds);
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${ids.length} 条视频吗？`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await batchDeleteVideos(ids);
          message.success(`成功删除 ${ids.length} 条视频`);
          setSelectedIds(new Set());
          setSelectedRowKeys([]);
          const affectedMonths = new Set<string>();
          ids.forEach((id) => {
            Object.keys(groups).forEach((ym) => {
              if (groups[ym]?.videos?.some((v) => v.id === id))
                affectedMonths.add(ym);
            });
          });
          affectedMonths.forEach((ym) => {
            setGroups((prev) => {
              const next = {
                ...prev,
                [ym]: { ...prev[ym], loaded: false, videos: [] },
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

  // 批量设置
  const handleBatchEdit = () => {
    if (selectedIds.size === 0) return;
    batchForm.resetFields();
    setBatchEditModalVisible(true);
  };

  const handleBatchEditSubmit = async () => {
    try {
      const values = await batchForm.validateFields();
      const updateData: Record<string, any> = {};
      if (values.shootDate)
        updateData.shootDate = values.shootDate.format('YYYY-MM-DD HH:mm:ss');
      if (values.artistId !== undefined && values.artistId !== null)
        updateData.artistId = values.artistId;
      if (values.videoTypeId !== undefined && values.videoTypeId !== null)
        updateData.tagTypeId = values.videoTypeId;
      if (
        values.videoLocationId !== undefined &&
        values.videoLocationId !== null
      )
        updateData.tagLocationId = values.videoLocationId;
      if (values.itineraryId !== undefined && values.itineraryId !== null)
        updateData.itineraryId = values.itineraryId;
      if (
        values.videoPlatformId !== undefined &&
        values.videoPlatformId !== null
      )
        updateData.tagPlatformId = values.videoPlatformId;
      if (values.description) updateData.description = values.description;

      if (Object.keys(updateData).length === 0) {
        message.warning('请至少填写一个需要修改的字段');
        return;
      }

      setBatchEditLoading(true);
      const ids = Array.from(selectedIds);
      await batchUpdateVideos(ids, updateData);
      message.success(`成功更新 ${ids.length} 条视频`);
      setBatchEditModalVisible(false);
      setSelectedIds(new Set());
      setSelectedRowKeys([]);
      Object.keys(groups).forEach((ym) => {
        if (groups[ym].loaded) {
          const nextGroups = {
            ...groups,
            [ym]: { ...groups[ym], loaded: false, videos: [] },
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

  // ── JSX ──────────────────────────────────────────
  return (
    <div className={styles['video-page']}>
      {/* 页面头部（可折叠） */}
      <div
        className={`${styles['mgt-page-header']} ${
          headerCollapsed ? styles['header-collapsed'] : ''
        }`}
      >
        <div
          className={styles['header-toggle-btn']}
          title={headerCollapsed ? '收起标签列表' : '展开标签列表'}
          style={trapezoidStyles}
          onClick={() => setHeaderCollapsed(!headerCollapsed)}
        >
          <DoubleRightOutlined
            style={{
              transform: `rotate(-90deg)`,
              color: '#9f9f9f',
            }}
          />
        </div>

        {!headerCollapsed && (
          <>
            <div className={styles['mgt-page-header-content']}>
              <div className={styles['mgt-page-title']}>视频管理</div>

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
                <span className={styles['filter-tag-label']}>视频类型</span>
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
                      {videoTypes.map((type) => (
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
                      {videoLocations.map((loc) => (
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
                      {videoPlatforms.map((pf) => (
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
                  setLinkingVideoIds(ids);
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
                onClick={() => history.push('/admin/video/add')}
              >
                添加视频
              </Button>
            </div>
          </>
        )}
      </div>

      {/* 列表区域 */}
      <div className={styles['video-list-panel']} ref={panelRef}>
        {sortedMonths.length > 0 && (
          <div className={styles['panel-header-bar']}>
            <span className={styles['header-bar-center']}>
              共加载 {loadedVideoCount}/{totalVideoCount} 条视频
            </span>
            <span className={styles['header-bar-right']}>拍摄时间</span>
          </div>
        )}

        <div
          ref={scrollRef}
          className={styles['scroll-container']}
          onScroll={handleScroll}
        >
          {/* 空状态 */}
          {sortedMonths.length === 0 && (
            <div className={styles['video-list-placeholder']}>
              <PlayCircleOutlined style={{ fontSize: 48, opacity: 0.25 }} />
              <p
                style={{
                  color: 'rgba(255,255,255,0.35)',
                  marginTop: 16,
                }}
              >
                视频列表
              </p>
            </div>
          )}

          {/* 月份分组 */}
          {sortedMonths.map((ym) => {
            const group = groups[ym];
            if (!group) return null;
            if (group.recycled) {
              return (
                <div
                  key={ym}
                  className={styles['month-placeholder']}
                  style={{ height: group.height }}
                />
              );
            }
            const dayGroups = group.loaded
              ? groupVideosByDay(group.videos)
              : [];
            return (
              <div key={ym} className={styles['month-group']}>
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
                    {group.total} 条
                  </span>
                </div>
                {!group.loaded ? (
                  <div className={styles['group-loading']}>
                    <Spin size="small" />
                  </div>
                ) : (
                  <>
                    {dayGroups.map((dg) => (
                      <div key={dg.dateKey} className={styles['day-group']}>
                        <div className={styles['day-title']}>
                          <span
                            className={`${styles['select-all-btn']} ${
                              styles['day-select-all']
                            } ${
                              isDayAllSelected(dg.videos)
                                ? styles['select-all-selected']
                                : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectAllInDay(dg.videos);
                            }}
                          >
                            {isDayAllSelected(dg.videos) ? '取消' : '全选'}
                          </span>
                          {dg.dateLabel || dg.dateKey}
                          <span className={styles['day-count']}>
                            {dg.videos.length} 条
                          </span>
                        </div>
                        <div className={styles['video-grid']}>
                          {dg.videos.map((video) => (
                            <div
                              key={video.id}
                              className={`${styles['video-item']} ${
                                selectedIds.has(video.id)
                                  ? styles['video-selected']
                                  : ''
                              }`}
                              onClick={(e) => handlePreviewVideo(video, e)}
                            >
                              <img
                                src={thumb(video.coverUrl || video.originalUrl)}
                                alt=""
                                loading="lazy"
                                className={styles['video-img']}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src =
                                    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22%3E%3Crect fill=%22%231a1a1a%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23555%22 text-anchor=%22middle%22 dominant-baseline=%22central%22 font-size=%2213%22%3E%E6%9A%82%E6%97%A0%E5%B0%81%E9%9D%A2%3C/text%3E%3C/svg%3E';
                                  target.style.objectFit = 'contain';
                                }}
                              />
                              {/* 播放图标覆盖 */}
                              <div className={styles['video-play-overlay']}>
                                <PlayCircleOutlined
                                  style={{ fontSize: 28, color: '#fff' }}
                                />
                              </div>
                              {/* 左上角 checkbox */}
                              <div className={styles['video-check-wrap']}>
                                <div
                                  className={styles['video-check']}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelect(video.id);
                                  }}
                                >
                                  {selectedIds.has(video.id) && (
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
                              {/* hover 时显示编辑/删除 */}
                              <div className={styles['video-hover-actions']}>
                                <span
                                  className={`${styles['video-action-btn']} ${styles['video-edit-btn']}`}
                                  onClick={(e) => handleEditVideo(video, e)}
                                >
                                  <EditOutlined />
                                </span>
                                <span
                                  className={`${styles['video-action-btn']} ${styles['video-link-btn']}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLinkingVideoIds([video.id]);
                                    setSearchKeyword('');
                                    setPostsPage(1);
                                    setLinkPostModalVisible(true);
                                    fetchSelectablePosts('', 1);
                                    fetchLinkedPostIds([video.id]);
                                  }}
                                >
                                  <LinkOutlined />
                                </span>
                                <span
                                  className={`${styles['video-action-btn']} ${styles['video-delete-btn']}`}
                                  onClick={(e) =>
                                    handleDeleteVideo(video.id, e)
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

        {/* 时间轴 */}
        {timelineIndex.length > 0 && (
          <div ref={rulerRef} className={styles['timeline-ruler']}>
            {yearRulers}
            <div
              className={styles['tl-current']}
              style={{ top: `${scrollRatio * 100}%` }}
            />
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
          已选 <strong>{selectedIds.size}</strong> 条
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

      {/* 关联到帖子弹窗 */}
      <Modal
        title={`关联到社交帖子（${linkingVideoIds.length} 个视频）`}
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
                  items: linkingVideoIds.map((id, i) => ({
                    mediaId: id,
                    mediaType: 'VIDEO',
                    sortOrder: i,
                  })),
                });
                totalSuccess += res.success || 0;
                if (res.failed) totalFailed += res.failed;
              } catch {
                totalFailed += linkingVideoIds.length;
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
                // 已关联的排最前面
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
            已选 {selectedPostIds.length} 条帖子，将 {linkingVideoIds.length}{' '}
            个视频关联到选中的帖子
          </div>
        </div>
      </Modal>

      {/* 编辑弹窗 */}
      <Modal
        title="编辑视频"
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
          className={styles['video-edit-form']}
          style={{ marginTop: 16 }}
        >
          {/* 视频预览（可替换） */}
          <Form.Item label="视频">
            {editingVideo && (
              <div>
                <div className={styles['edit-video-preview']}>
                  <div className={styles['edit-video-preview-thumb']}>
                    <img
                      src={thumb(
                        editingVideo.coverUrl || editingVideo.originalUrl,
                      )}
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22%3E%3Crect fill=%22%231a1a1a%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23555%22 text-anchor=%22middle%22 dominant-baseline=%22central%22 font-size=%2213%22%3E%E6%9A%82%E6%97%A0%E5%B0%81%E9%9D%A2%3C/text%3E%3C/svg%3E';
                        (e.target as HTMLImageElement).style.objectFit =
                          'contain';
                      }}
                    />
                    <PlayCircleOutlined
                      className={styles['edit-video-preview-icon']}
                    />
                  </div>
                  <div className={styles['edit-video-preview-info']}>
                    <span className={styles['edit-video-preview-name']}>
                      {editingVideo.fileName || '未命名视频'}
                    </span>
                    <span className={styles['edit-video-preview-meta']}>
                      {editNewVideoSize > 0
                        ? formatFileSize(editNewVideoSize)
                        : editingVideo.size != null
                        ? formatFileSize(editingVideo.size)
                        : ''}
                      {editingVideo.duration != null && (
                        <>
                          {' '}
                          · {Math.floor(editingVideo.duration / 60)}:
                          {String(
                            Math.floor(editingVideo.duration % 60),
                          ).padStart(2, '0')}
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Upload
                    accept=".mp4,.mov,.avi,.mkv,.webm"
                    showUploadList={false}
                    maxCount={1}
                    customRequest={async (options: any) => {
                      const { file, onSuccess, onError } = options;
                      try {
                        const res = await uploadVideoFile(file as File);
                        if (!res?.url) {
                          onError(new Error('上传失败'));
                          return;
                        }
                        setEditNewVideoUrl(res.url);
                        setEditNewVideoKey(res.key || res.url);
                        setEditNewVideoSize((file as File).size);
                        message.success('视频已替换');
                        onSuccess(res, file);
                      } catch {
                        message.error('视频替换失败');
                        onError(new Error('视频替换失败'));
                      }
                    }}
                  >
                    <Button
                      size="small"
                      icon={<PlayCircleOutlined />}
                      style={{
                        background: 'transparent',
                        border: '1px solid #333',
                        color: '#ccc',
                        borderRadius: 0,
                        fontSize: 12,
                      }}
                    >
                      {editNewVideoSize > 0 ? '已替换' : '替换视频'}
                    </Button>
                  </Upload>
                </div>
              </div>
            )}
          </Form.Item>

          {/* 封面上传 */}
          <Form.Item label="上传封面（可选）">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {editCoverUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src={getImageUrl(editCoverUrl)}
                    alt=""
                    style={{ width: 60, height: 40, objectFit: 'cover' }}
                  />
                  <Button
                    size="small"
                    danger
                    ghost
                    onClick={() => {
                      setEditCoverUrl('');
                      setEditCoverFileList([]);
                    }}
                    style={{ border: 'none', fontSize: 12 }}
                  >
                    移除
                  </Button>
                </div>
              ) : (
                <Upload
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  fileList={editCoverFileList}
                  maxCount={1}
                  showUploadList={false}
                  customRequest={async (options: any) => {
                    const { file, onSuccess, onError } = options;
                    try {
                      const res = await uploadImageFull(file as File);
                      if (!res?.url) {
                        onError(new Error('封面上传失败'));
                        return;
                      }
                      setEditCoverUrl(res.url);
                      onSuccess(res, file);
                    } catch {
                      message.error('封面上传失败');
                      onError(new Error('封面上传失败'));
                    }
                  }}
                  onChange={(info) => setEditCoverFileList([...info.fileList])}
                >
                  <Button
                    icon={<PictureOutlined />}
                    size="small"
                    style={{
                      background: 'transparent',
                      border: '1px dashed #333',
                      color: '#999',
                      borderRadius: 0,
                      fontSize: 12,
                    }}
                  >
                    上传封面
                  </Button>
                </Upload>
              )}
            </div>
          </Form.Item>

          {/* 文件名称 */}
          <Form.Item name="fileName" label="文件名称">
            <Input placeholder="请输入文件名称" maxLength={100} />
          </Form.Item>

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

          {/* 视频类型 */}
          <Form.Item name="videoTypeId" label="视频类型">
            <Select
              placeholder="请选择视频类型"
              allowClear
              loading={typesLoading}
            >
              {videoTypes.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 拍摄地点 */}
          <Form.Item name="videoLocationId" label="拍摄地点">
            <Select
              placeholder="请选择拍摄地点"
              allowClear
              loading={locationsLoading}
            >
              {videoLocations.map((l) => (
                <Select.Option key={l.id} value={l.id}>
                  {l.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 发布平台 */}
          <Form.Item name="videoPlatformId" label="发布平台">
            <Select
              placeholder="请选择发布平台"
              allowClear
              loading={platformsLoading}
            >
              {videoPlatforms.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name}
                  {p.uuid ? ` (${p.uuid})` : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 平台ID（只读展示） */}
          <Form.Item label="平台ID">
            <Input
              value={
                (
                  videoPlatforms.find(
                    (p) => p.id === editForm.getFieldValue('videoPlatformId'),
                  ) as any
                )?.uuid || ''
              }
              disabled
              placeholder="选择发布平台后自动显示"
            />
          </Form.Item>
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
        title="视频预览"
        open={previewModalVisible}
        onCancel={() => {
          setPreviewModalVisible(false);
          setPreviewingVideo(null);
          setPreviewIndex(-1);
        }}
        footer={null}
        width={1200}
        destroyOnClose
        bodyStyle={{ height: 800, overflow: 'hidden' }}
      >
        {previewingVideo && (
          <div className={styles['preview-content']}>
            <span
              className={`${styles['preview-nav-btn']} ${
                styles['preview-nav-prev']
              } ${previewIndex <= 0 ? styles['nav-disabled'] : ''}`}
              onClick={handlePrevVideo}
            >
              ‹
            </span>

            {/* 左边：封面图或视频播放 */}
            <div className={styles['preview-video']}>
              {!previewPlaying ? (
                <div
                  className={styles['preview-cover-wrap']}
                  onClick={() => setPreviewPlaying(true)}
                >
                  <img
                    src={getImageUrl(
                      previewingVideo.coverUrl ||
                        `${previewingVideo.originalUrl}?vframe/jpg/offset/0`,
                    )}
                    alt="视频封面"
                    className={styles['preview-cover-img']}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22%3E%3Crect fill=%22%231a1a1a%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23555%22 text-anchor=%22middle%22 dominant-baseline=%22central%22 font-size=%2213%22%3E%E6%9A%82%E6%97%A0%E5%B0%81%E9%9D%A2%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <PlayCircleOutlined className={styles['preview-play-btn']} />
                </div>
              ) : (
                <video
                  src={getImageUrl(
                    previewingVideo.playUrl || previewingVideo.originalUrl,
                  )}
                  controls
                  autoPlay
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    display: 'block',
                  }}
                >
                  您的浏览器不支持视频播放
                </video>
              )}
              <span
                className={styles['preview-download-btn']}
                onClick={(e) => {
                  e.stopPropagation();
                  const url = getImageUrl(
                    previewingVideo.hdUrl || previewingVideo.originalUrl,
                  );
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = previewingVideo.fileName || 'video.mp4';
                  a.target = '_blank';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                <DownloadOutlined />
                下载原视频
              </span>
            </div>

            {/* 右边：详细信息 */}
            <div className={styles['preview-info']}>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>文件名称</span>
                <span className={styles['preview-info-value']}>
                  {previewingVideo.fileName || '-'}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>文件大小</span>
                <span className={styles['preview-info-value']}>
                  {previewingVideo.size != null
                    ? formatFileSize(previewingVideo.size)
                    : '-'}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>艺人</span>
                <span className={styles['preview-info-value']}>
                  {artists.find((a) => a.artistId === previewingVideo.artistId)
                    ?.name || '-'}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>拍摄日期</span>
                <span className={styles['preview-info-value']}>
                  {previewingVideo.shootDate || '-'}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>视频类型</span>
                <span className={styles['preview-info-value']}>
                  {previewingVideo.tagType?.name || '-'}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>拍摄地点</span>
                <span className={styles['preview-info-value']}>
                  {previewingVideo.tagLocation?.name || '-'}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>发布平台</span>
                <span className={styles['preview-info-value']}>
                  {previewingVideo.tagPlatform
                    ? `${previewingVideo.tagPlatform.name}${
                        (previewingVideo.tagPlatform as any).uuid
                          ? ` (${(previewingVideo.tagPlatform as any).uuid})`
                          : ''
                      }`
                    : '-'}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>行程</span>
                <span className={styles['preview-info-value']}>
                  {previewingVideo.itinerary
                    ? `${previewingVideo.itinerary.title}${
                        previewingVideo.itinerary.location
                          ? ` · ${previewingVideo.itinerary.location}`
                          : ''
                      }`
                    : '-'}
                </span>
              </div>
              <div
                className={styles['preview-info-item']}
                style={{ alignItems: 'flex-start' }}
              >
                <span className={styles['preview-info-label']}>描述</span>
                <span className={styles['preview-info-value']}>
                  {previewingVideo.description || '-'}
                </span>
              </div>
            </div>

            <span
              className={`${styles['preview-nav-btn']} ${
                styles['preview-nav-next']
              } ${
                previewIndex >= flatVideos.length - 1
                  ? styles['nav-disabled']
                  : ''
              }`}
              onClick={handleNextVideo}
            >
              ›
            </span>

            {flatVideos.length > 1 && (
              <div className={styles['preview-counter']}>
                {previewIndex + 1} / {flatVideos.length}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 批量设置弹窗 */}
      <Modal
        title={`批量设置（已选 ${selectedIds.size} 条视频）`}
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
          className={styles['video-edit-form']}
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

          {/* 视频类型 */}
          <Form.Item name="videoTypeId" label="视频类型">
            <Select
              placeholder="请选择视频类型（可选）"
              allowClear
              loading={typesLoading}
            >
              {videoTypes.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 拍摄地点 */}
          <Form.Item name="videoLocationId" label="拍摄地点">
            <Select
              placeholder="请选择拍摄地点（可选）"
              allowClear
              loading={locationsLoading}
            >
              {videoLocations.map((l) => (
                <Select.Option key={l.id} value={l.id}>
                  {l.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 发布平台 */}
          <Form.Item name="videoPlatformId" label="发布平台">
            <Select
              placeholder="请选择发布平台（可选）"
              allowClear
              loading={platformsLoading}
            >
              {videoPlatforms.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name}
                  {p.uuid ? ` (${p.uuid})` : ''}
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

export default VideoPage;
