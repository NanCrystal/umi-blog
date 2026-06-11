import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { history } from 'umi';
import { Spin, Button, Upload } from 'antd';
import {
  SoundOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SettingOutlined,
  PlusOutlined,
  EditOutlined,
  DoubleRightOutlined,
  PlayCircleFilled,
  PauseCircleFilled,
  CloseCircleFilled,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { Modal, message, Form, Input, Select, DatePicker } from 'antd';
import styles from './index.less';
// import { // 音频类型/拍摄地点/发布平台暂不展示
//   getPhotoTypes,
//   getPhotoLocations,
//   getPhotoPlatforms,
// } from '@/services/photoTag';

import { getImageUrl } from '@/utils/utils';
import { getArtistList } from '@/services/artist';
// import { getItineraryList } from '@/services/itinerary'; // 行程暂不展示
import {
  getVoicesTimeline,
  getVoicesByMonth,
  deleteVoice,
  batchDeleteVoices,
  updateVoice,
  uploadVoiceCover,
  batchUpdateVoices,
} from '@/services/voice';
import moment from 'moment';

interface Props {}
interface TagItem {
  id: number | string;
  name: string;
}
interface Voice {
  id: number;
  originalUrl: string;
  coverUrl?: string;
  playUrl?: string;
  hdUrl?: string;
  fileName?: string;
  title?: string;
  artistId?: string;
  shootDate?: string;
  tagTypeId?: number;
  tagLocationId?: number;
  tagPlatformId?: number;
  itineraryId?: number;
  description?: string;
  duration?: number;
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
interface VoiceGroup {
  yearMonth: string;
  voices: Voice[];
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
  voices: Voice[];
}

const ALL_KEY = '__all__';
const VOICE_SIZE = 128 + 8; // 音频封面尺寸 + gap
const TITLE_HEIGHT = 48; // 月标题高度
const DAY_TITLE_HEIGHT = 36; // 日标题高度
const DAY_GROUP_GAP = 16; // 日分组间距
const PADDING = 24;
const BUFFER_PX = 600;

// ── 高度计算函数 ──

/** 旧版：仅用于时间轴初始估算（还没加载数据时） */
function calcGroupHeight(count: number, cols: number) {
  return Math.ceil(count / cols) * VOICE_SIZE + TITLE_HEIGHT + PADDING;
}

/**
 * 新版：基于实际日分组精确计算高度
 */
function calcActualGroupHeight(voices: Voice[], cols: number): number {
  if (!voices.length) return TITLE_HEIGHT + PADDING;
  const dayGroups = groupVoicesByDay(voices);
  let total = TITLE_HEIGHT;
  dayGroups.forEach((dg, idx) => {
    total += DAY_TITLE_HEIGHT;
    total += Math.ceil(dg.voices.length / cols) * VOICE_SIZE;
    if (idx < dayGroups.length - 1) total += DAY_GROUP_GAP;
  });
  total += PADDING;
  return total;
}

// 按日分组工具函数
function groupVoicesByDay(voices: Voice[]): DayGroup[] {
  const map = new Map<string, Voice[]>();
  voices.forEach((v) => {
    const key = v.shootDate ? v.shootDate.slice(0, 10) : 'unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  });
  return Array.from(map.entries())
    .map(([dateKey, items]) => ({
      dateKey,
      dateLabel: fmtDate(dateKey),
      voices: items.sort(
        (a, b) =>
          new Date(b.shootDate || 0).getTime() -
          new Date(a.shootDate || 0).getTime(),
      ),
    }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

function calcCols(w: number) {
  return Math.max(3, Math.floor((w - 80 - 40) / VOICE_SIZE));
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
function fmtDuration(seconds?: number): string {
  if (seconds == null || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const VoicePage: React.FC<Props> = () => {
  // ── 筛选状态 ─────────────────────────────────
  const [voiceTypes, setVoiceTypes] = useState<TagItem[]>([]);
  const [voiceLocations, setVoiceLocations] = useState<TagItem[]>([]);
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
  const [voicePlatforms, setVoicePlatforms] = useState<TagItem[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    Set<number | string>
  >(new Set([ALL_KEY]));

  // ── 音频列表 + 时间轴状态 ─────────────────────────
  const [groups, setGroups] = useState<Record<string, VoiceGroup>>({});
  const [timelineIndex, setTimelineIndex] = useState<TimelineMonth[]>([]);
  const [scrollRatio, setScrollRatio] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [cols, setCols] = useState(8);
  const [hoverTop, setHoverTop] = useState<number | null>(null);
  const [hoverLabel, setHoverLabel] = useState('');

  // ── 编辑弹窗相关 ─────────────────────────────────
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingVoice, setEditingVoice] = useState<Voice | null>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // 查看/编辑模式切换
  const [artists, setArtists] = useState<any[]>([]);

  // ── 编辑弹窗：封面上传状态 ─────────────────────────
  const [editCoverFileList, setEditCoverFileList] = useState<UploadFile[]>([]);
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);

  // ── 滚动触底加载状态 ─────────────────────────────
  const [loadingMore, setLoadingMore] = useState(false);

  // ── 预览弹窗相关 ─────────────────────────────────
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<Voice | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);

  // ── 批量设置弹窗相关 ─────────────────────────────
  const [batchEditModalVisible, setBatchEditModalVisible] = useState(false);
  const [batchForm] = Form.useForm();
  const [batchEditLoading, setBatchEditLoading] = useState(false);

  // ── 头部折叠状态 ─────────────────────────────────
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const loadingSet = useRef<Set<string>>(new Set());
  const groupsRef = useRef<Record<string, VoiceGroup>>({});

  // 保持 groupsRef 与 groups 状态同步
  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  // ── 音频播放状态 ─────────────────────────────────
  const [playingVoice, setPlayingVoice] = useState<Voice | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── 筛选数据加载 ─────────────────────────────────
  useEffect(() => {
    // 类型/地点/平台暂不展示
    // setTypesLoading(true);
    // getPhotoTypes()
    //   .then((res: any) => {
    //     setVoiceTypes(
    //       Array.isArray(res)
    //         ? res.map((item: any) => ({ id: item.id, name: item.name }))
    //         : [],
    //     );
    //   })
    //   .catch(() => {})
    //   .finally(() => setTypesLoading(false));

    // setLocationsLoading(true);
    // getPhotoLocations()
    //   .then((res: any) => {
    //     setVoiceLocations(
    //       Array.isArray(res)
    //         ? res.map((item: any) => ({ id: item.id, name: item.name }))
    //         : [],
    //     );
    //   })
    //   .catch(() => {})
    //   .finally(() => setLocationsLoading(false));

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

    // 行程暂不展示
    // getItineraryList({ pageSize: 999 })
    //   .then((res: any) => {
    //     setItineraries(res?.list || (Array.isArray(res) ? res : []));
    //   })
    //   .catch(() => {});

    // 平台暂不展示
    // setPlatformsLoading(true);
    // getPhotoPlatforms()
    //   .then((res: any) => {
    //     setVoicePlatforms(
    //       Array.isArray(res)
    //         ? res.map((item: any) => ({ id: item.id, name: item.name }))
    //         : [],
    //     );
    //   })
    //   .catch(() => {})
    //   .finally(() => setPlatformsLoading(false));
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

  // ── 监听头部高度变化（联动 voice-list-panel 高度） ──────
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setHeaderHeight(entry.contentRect.height);
    });
    obs.observe(el);
    setHeaderHeight(el.offsetHeight);
    return () => obs.disconnect();
  }, []);

  // ── 加载某月音频 ────
  const loadMonth = useCallback(
    async (yearMonth: string, override?: Record<string, VoiceGroup>) => {
      if (loadingSet.current.has(yearMonth)) return;
      const currentGroups = override ?? groupsRef.current;
      const g = currentGroups[yearMonth];
      if (!g || g.loaded) return;
      loadingSet.current.add(yearMonth);
      try {
        let page = 1;
        const pageSize = 50;
        const allItems: Voice[] = [];
        while (true) {
          const { items, total } = await getVoicesByMonth({
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
          if (!items || items.length < pageSize) break;
          // total 可能为空或 undefined，用 allItems.length 兜底
          if (total != null && allItems.length >= total) break;
          page++;
        }
        const newHeight = calcActualGroupHeight(allItems, cols);
        setGroups((prev) => {
          const oldH = prev[yearMonth]?.height ?? newHeight;
          const delta = newHeight - oldH;
          if (!prev[yearMonth]) return prev; // 防止组不存在
          if (delta === 0) {
            return {
              ...prev,
              [yearMonth]: {
                ...prev[yearMonth],
                voices: allItems,
                loaded: true,
                height: newHeight,
              },
            };
          }
          const next: Record<string, VoiceGroup> = {};
          for (const [k, v] of Object.entries(prev)) {
            next[k] =
              k === yearMonth
                ? { ...v, voices: allItems, loaded: true, height: newHeight }
                : v.top > (prev[yearMonth]?.top ?? 0)
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
      } catch (err) {
        // API 失败时不更新 state，下一轮滚动会重试
        console.error(`[VoiceMgt] loadMonth(${yearMonth}) failed:`, err);
      } finally {
        loadingSet.current.delete(yearMonth);
      }
    },
    [
      activeTypeIds,
      activeLocationIds,
      activePlatformIds,
      activeArtistIds,
      cols,
    ],
  );

  // ── 筛选变化时重新加载时间轴 ────
  useEffect(() => {
    getVoicesTimeline({
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
        const initGroups: Record<string, VoiceGroup> = {};
        withLayout.forEach((m) => {
          initGroups[m.yearMonth] = {
            yearMonth: m.yearMonth,
            voices: [],
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

    // 使用变量记录最新 groups state，避免闭包 stale 问题
    let latestGroups: Record<string, VoiceGroup> | null = null;

    setGroups((prev) => {
      latestGroups = prev;
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
      });
      return changed ? next : prev;
    });

    // 用 latestGroups 作为 override 调用 loadMonth，确保最新状态
    const snapshot = latestGroups ?? groups;
    const toLoad: string[] = [];
    Object.values(snapshot).forEach((g) => {
      const bottom = g.top + g.height;
      const inView = bottom > visTop && g.top < visBottom;
      if (inView && !g.loaded && !loadingSet.current.has(g.yearMonth)) {
        toLoad.push(g.yearMonth);
      }
    });
    toLoad.forEach((ym) => loadMonth(ym, snapshot));

    const nearBottom = scrollHeight - scrollTop - clientHeight < 200;
    if (nearBottom && !loadingMore) {
      const unloaded = Object.values(snapshot)
        .filter((g) => !g.loaded && !loadingSet.current.has(g.yearMonth))
        .sort((a, b) => a.top - b.top);
      if (unloaded.length > 0) {
        const batch = unloaded.slice(0, 2);
        batch.forEach((g) => loadMonth(g.yearMonth, snapshot));
        setLoadingMore(true);
        setTimeout(() => setLoadingMore(false), 800);
      }
    }
  }, [loadMonth, loadingMore, groups]);

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

  const loadedVoiceCount = useMemo(() => {
    return Object.values(groups)
      .filter((g) => g.loaded)
      .reduce((sum, g) => sum + g.voices.length, 0);
  }, [groups]);

  const totalVoiceCount = useMemo(() => {
    return timelineIndex.reduce((sum, m) => sum + m.count, 0);
  }, [timelineIndex]);

  // 扁平化的音频列表
  const flatVoices = useMemo(() => {
    const list: Voice[] = [];
    sortedMonths.forEach((ym) => {
      const group = groups[ym];
      if (group?.loaded && group.voices.length) {
        const dayGroups = groupVoicesByDay(group.voices);
        dayGroups.forEach((dg) => {
          dg.voices.forEach((v) => list.push(v));
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

  // ── 音频播放控制（互斥） ─────────────────────────
  const togglePlay = useCallback(
    (voice: Voice, e: React.MouseEvent) => {
      e.stopPropagation();
      const url = getImageUrl(voice.playUrl || voice.originalUrl);

      if (playingVoice?.id === voice.id) {
        // 同一个音频：切换播放/暂停
        if (isAudioPlaying) {
          audioRef.current?.pause();
          setIsAudioPlaying(false);
        } else {
          audioRef.current?.play().catch(() => {});
          setIsAudioPlaying(true);
        }
        return;
      }

      // 不同音频：停止旧的，播放新的
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingVoice(voice);
      setIsAudioPlaying(true);

      audio.addEventListener('ended', () => {
        setIsAudioPlaying(false);
      });
      audio.addEventListener('error', () => {
        message.error('音频加载失败');
        setIsAudioPlaying(false);
      });
      audio.play().catch(() => {
        message.error('音频播放失败');
        setIsAudioPlaying(false);
      });
    },
    [playingVoice, isAudioPlaying],
  );

  // ── Mini Player 播放/暂停 ────────────────────────
  const togglePlayerPlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isAudioPlaying) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsAudioPlaying(true);
    }
  }, [isAudioPlaying]);

  // ── 关闭 Mini Player ────────────────────────────
  const closePlayer = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute('src'); // 用 removeAttribute 代替 src=''，避免触发 error 事件
      el.load(); // 确保释放资源
    }
    audioRef.current = null;
    setPlayingVoice(null);
    setIsAudioPlaying(false);
  }, []);

  const selectAllInMonth = (yearMonth: string) => {
    const group = groups[yearMonth];
    if (!group || !group.loaded) return;
    const voiceIds = group.voices.map((v) => v.id);
    const allSelected = voiceIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        voiceIds.forEach((id) => next.delete(id));
        return next;
      });
      setSelectedRowKeys((prev) =>
        prev.filter((k) => !voiceIds.includes(k as number)),
      );
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        voiceIds.forEach((id) => next.add(id));
        return next;
      });
      setSelectedRowKeys((prev) => {
        const next = [...prev];
        voiceIds.forEach((id) => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const isMonthAllSelected = (yearMonth: string): boolean => {
    const group = groups[yearMonth];
    if (!group || !group.loaded) return false;
    return group.voices.every((v) => selectedIds.has(v.id));
  };

  const selectAllInDay = (dayVoices: Voice[]) => {
    const voiceIds = dayVoices.map((v) => v.id);
    const allSelected = voiceIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        voiceIds.forEach((id) => next.delete(id));
        return next;
      });
      setSelectedRowKeys((prev) =>
        prev.filter((k) => !voiceIds.includes(k as number)),
      );
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        voiceIds.forEach((id) => next.add(id));
        return next;
      });
      setSelectedRowKeys((prev) => {
        const next = [...prev];
        voiceIds.forEach((id) => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const isDayAllSelected = (dayVoices: Voice[]): boolean => {
    return (
      dayVoices.length > 0 && dayVoices.every((v) => selectedIds.has(v.id))
    );
  };

  // 删除单条音频
  const handleDeleteVoice = (voiceId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条音频吗？',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteVoice(voiceId);
          message.success('删除成功');
          setSelectedIds((prev) => {
            const n = new Set(prev);
            n.delete(voiceId);
            return n;
          });
          setSelectedRowKeys((prev) => prev.filter((k) => k !== voiceId));
          Object.keys(groups).forEach((ym) => {
            if (groups[ym].voices.some((v) => v.id === voiceId)) {
              const nextGroups = {
                ...groups,
                [ym]: { ...groups[ym], loaded: false, voices: [] },
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

  // 编辑音频（弹窗）- 默认查看模式
  const handleEditVoice = (voice: Voice, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingVoice(voice);
    setIsEditing(false); // 默认查看模式
    setEditCoverFileList([]);
    setEditCoverUrl('');
    setEditModalVisible(true);
    setTimeout(() => {
      editForm.setFieldsValue({
        fileName: voice.fileName || '',
        artistId: voice.artistId,
        shootDate: voice.shootDate ? moment(voice.shootDate) : undefined,
        voiceTypeId: voice.tagTypeId,
        voiceLocationId: voice.tagLocationId,
        voicePlatformId: voice.tagPlatformId,
        // itineraryId: voice.itineraryId, // 行程暂不展示
        description: voice.description || '',
      });
    }, 0);
  };

  // 预览音频（弹窗）
  const handlePreviewVoice = (voice: Voice, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = flatVoices.findIndex((v) => v.id === voice.id);
    setPreviewingVoice(voice);
    setPreviewIndex(idx >= 0 ? idx : -1);
    setPreviewModalVisible(true);
  };

  // 预览翻页
  const handlePrevVoice = () => {
    if (previewIndex <= 0) return;
    const prevIdx = previewIndex - 1;
    setPreviewIndex(prevIdx);
    setPreviewingVoice(flatVoices[prevIdx]);
  };

  const handleNextVoice = () => {
    if (previewIndex < 0 || previewIndex >= flatVoices.length - 1) return;
    const nextIdx = previewIndex + 1;
    setPreviewIndex(nextIdx);
    setPreviewingVoice(flatVoices[nextIdx]);
  };

  // 编辑提交
  const handleEditSubmit = async () => {
    try {
      if (!editingVoice) return;
      const values = await editForm.validateFields();
      setEditLoading(true);
      await updateVoice(editingVoice.id, {
        fileName: values.fileName,
        artistId: values.artistId,
        shootDate: values.shootDate
          ? values.shootDate.format('YYYY-MM-DD HH:mm:ss')
          : undefined,
        tagTypeId: values.voiceTypeId,
        tagLocationId: values.voiceLocationId,
        tagPlatformId: values.voicePlatformId,
        coverUrl: editCoverUrl || undefined,
        // itineraryId: values.itineraryId, // 行程暂不展示
        description: values.description,
      });
      message.success('修改成功');
      setEditModalVisible(false);
      setEditingVoice(null);
      setIsEditing(false);
      setEditCoverFileList([]);
      setEditCoverUrl('');
      // 重新加载所有已加载的月份（使用 groupsRef 避免闭包问题）
      setGroups((prev) => {
        const monthsToReload = Object.keys(prev).filter(
          (k) => prev[k].loaded || prev[k].voices.length > 0,
        );
        const next = { ...prev };
        monthsToReload.forEach((ym) => {
          next[ym] = { ...next[ym], loaded: false, voices: [] };
        });
        // 异步触发重载
        setTimeout(() => {
          monthsToReload.forEach((ym) => loadMonth(ym));
        }, 50);
        return next;
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
    setEditingVoice(null);
    setIsEditing(false);
    setEditCoverFileList([]);
    setEditCoverUrl('');
    editForm.resetFields();
  };

  // 批量删除音频
  const handleBatchDelete = () => {
    const ids = Array.from(selectedIds);
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${ids.length} 条音频吗？`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await batchDeleteVoices(ids);
          message.success(`成功删除 ${ids.length} 条音频`);
          setSelectedIds(new Set());
          setSelectedRowKeys([]);
          const affectedMonths = new Set<string>();
          ids.forEach((id) => {
            Object.keys(groups).forEach((ym) => {
              if (groups[ym]?.voices?.some((v) => v.id === id))
                affectedMonths.add(ym);
            });
          });
          affectedMonths.forEach((ym) => {
            setGroups((prev) => {
              const next = {
                ...prev,
                [ym]: { ...prev[ym], loaded: false, voices: [] },
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
      if (values.voiceTypeId !== undefined && values.voiceTypeId !== null)
        updateData.tagTypeId = values.voiceTypeId;
      if (
        values.voiceLocationId !== undefined &&
        values.voiceLocationId !== null
      )
        updateData.tagLocationId = values.voiceLocationId;
      // if (values.itineraryId !== undefined && values.itineraryId !== null) updateData.itineraryId = values.itineraryId; // 行程暂不展示
      if (
        values.voicePlatformId !== undefined &&
        values.voicePlatformId !== null
      )
        updateData.tagPlatformId = values.voicePlatformId;
      if (values.description) updateData.description = values.description;

      if (Object.keys(updateData).length === 0) {
        message.warning('请至少填写一个需要修改的字段');
        return;
      }

      setBatchEditLoading(true);
      const ids = Array.from(selectedIds);
      await batchUpdateVoices(ids, updateData);
      message.success(`成功更新 ${ids.length} 条音频`);
      setBatchEditModalVisible(false);
      setSelectedIds(new Set());
      setSelectedRowKeys([]);
      Object.keys(groups).forEach((ym) => {
        if (groups[ym].loaded) {
          const nextGroups = {
            ...groups,
            [ym]: { ...groups[ym], loaded: false, voices: [] },
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
    <div className={styles['voice-page']}>
      {/* 页面头部（可折叠） */}
      <div
        ref={headerRef}
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
            <div className={styles['mgt-page-header-top']}>
              <div className={styles['mgt-page-header-section']}>
                <div className={styles['mgt-page-title']}>音频管理</div>
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
                    type="primary"
                    icon={<PlusOutlined />}
                    className={styles['add-btn']}
                    onClick={() => history.push('/admin/voice/add')}
                  >
                    添加音频
                  </Button>
                </div>
              </div>
              <div className={styles['mgt-page-header-content']}>
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

                {/* 音频类型筛选（暂不展示）
              <div className={styles['filter-tag-row']}>
                <span className={styles['filter-tag-label']}>音频类型</span>
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
                      {voiceTypes.map((type) => (
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
              */}

                {/* 拍摄地点筛选（暂不展示）
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
                      {voiceLocations.map((loc) => (
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
              */}

                {/* 发布平台筛选（暂不展示）
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
                      {voicePlatforms.map((pf) => (
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
              */}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 列表区域 */}
      <div className={styles['voice-list-panel']} ref={panelRef}>
        {sortedMonths.length > 0 && (
          <div className={styles['panel-header-bar']}>
            <span className={styles['header-bar-center']}>
              共加载 {loadedVoiceCount}/{totalVoiceCount} 条音频
            </span>
            <span className={styles['header-bar-right']}>拍摄时间</span>
          </div>
        )}

        <div
          ref={scrollRef}
          className={styles['scroll-container']}
          style={{ height: `calc(100vh - ${headerHeight + 60}px)` }}
          onScroll={handleScroll}
        >
          {/* 空状态 */}
          {sortedMonths.length === 0 && (
            <div className={styles['voice-list-placeholder']}>
              <SoundOutlined style={{ fontSize: 48, opacity: 0.25 }} />
              <p
                style={{
                  color: 'rgba(255,255,255,0.35)',
                  marginTop: 16,
                }}
              >
                音频列表
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
              ? groupVoicesByDay(group.voices)
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
                              isDayAllSelected(dg.voices)
                                ? styles['select-all-selected']
                                : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectAllInDay(dg.voices);
                            }}
                          >
                            {isDayAllSelected(dg.voices) ? '取消' : '全选'}
                          </span>
                          {dg.dateLabel || dg.dateKey}
                          <span className={styles['day-count']}>
                            {dg.voices.length} 条
                          </span>
                        </div>
                        <div className={styles['voice-grid']}>
                          {dg.voices.map((voice) => (
                            <div
                              key={voice.id}
                              className={`${styles['voice-item']} ${
                                selectedIds.has(voice.id)
                                  ? styles['voice-selected']
                                  : ''
                              }`}
                              onClick={(e) => handleEditVoice(voice, e)}
                            >
                              {/* 音频封面 */}
                              <div className={styles['voice-cover']}>
                                {voice.coverUrl ? (
                                  <img
                                    src={getImageUrl(voice.coverUrl)}
                                    alt=""
                                    loading="lazy"
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                    }}
                                  />
                                ) : (
                                  <SoundOutlined
                                    className={styles['voice-wave-icon']}
                                  />
                                )}
                                {/* 底部时长标签 */}
                                {voice.duration != null &&
                                  voice.duration > 0 && (
                                    <div
                                      className={styles['voice-duration-bar']}
                                    >
                                      {fmtDuration(voice.duration)}
                                    </div>
                                  )}
                              </div>
                              {/* 底部信息栏：文件名 + 播放按钮 */}
                              <div className={styles['voice-item-footer']}>
                                <span
                                  className={styles['voice-item-name']}
                                  title={voice.fileName}
                                >
                                  {voice.fileName || '未命名'}
                                </span>
                                <span
                                  className={styles['voice-item-play']}
                                  onClick={(e) => togglePlay(voice, e)}
                                >
                                  {playingVoice?.id === voice.id &&
                                  isAudioPlaying ? (
                                    <PauseCircleFilled
                                      style={{ fontSize: 18 }}
                                    />
                                  ) : (
                                    <PlayCircleFilled
                                      style={{ fontSize: 18 }}
                                    />
                                  )}
                                </span>
                              </div>
                              {/* 左上角 checkbox */}
                              <div className={styles['voice-check-wrap']}>
                                <div
                                  className={styles['voice-check']}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelect(voice.id);
                                  }}
                                >
                                  {selectedIds.has(voice.id) && (
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

      {/* Mini 播放器 */}
      {playingVoice && (
        <div className={styles['mini-player']}>
          <div className={styles['mini-player-cover']}>
            {playingVoice.coverUrl ? (
              <img src={getImageUrl(playingVoice.coverUrl)} alt="" />
            ) : (
              <SoundOutlined style={{ fontSize: 28, color: '#444' }} />
            )}
          </div>
          <div className={styles['mini-player-info']}>
            <span className={styles['mini-player-name']}>
              {playingVoice.fileName || '未命名音频'}
            </span>
            <span className={styles['mini-player-meta']}>
              {playingVoice.duration != null
                ? fmtDuration(playingVoice.duration)
                : ''}
              {playingVoice.artistId &&
              artists.find((a) => a.artistId === playingVoice.artistId)?.name
                ? ` · ${
                    artists.find((a) => a.artistId === playingVoice.artistId)!
                      .name
                  }`
                : ''}
            </span>
          </div>
          <div className={styles['mini-player-actions']}>
            <span
              className={styles['mini-player-btn']}
              onClick={togglePlayerPlay}
            >
              {isAudioPlaying ? (
                <PauseCircleFilled style={{ fontSize: 28 }} />
              ) : (
                <PlayCircleFilled style={{ fontSize: 28 }} />
              )}
            </span>
            <span className={styles['mini-player-close']} onClick={closePlayer}>
              <CloseCircleFilled style={{ fontSize: 18 }} />
            </span>
          </div>
        </div>
      )}

      {/* 编辑/查看弹窗 */}
      <Modal
        title={isEditing ? '编辑音频' : '音频详情'}
        open={editModalVisible}
        onCancel={handleEditCancel}
        footer={
          isEditing ? (
            <>
              <Button onClick={handleEditCancel}>取消</Button>
              <Button
                type="primary"
                onClick={handleEditSubmit}
                loading={editLoading}
              >
                保存
              </Button>
            </>
          ) : (
            <>
              <Button
                icon={<DeleteOutlined />}
                danger
                ghost
                onClick={() => {
                  if (!editingVoice) return;
                  Modal.confirm({
                    title: '确认删除',
                    content: '确定要删除这条音频吗？',
                    okText: '删除',
                    cancelText: '取消',
                    okButtonProps: { danger: true },
                    onOk: async () => {
                      try {
                        await deleteVoice(editingVoice.id);
                        message.success('删除成功');
                        setSelectedIds((prev) => {
                          const n = new Set(prev);
                          n.delete(editingVoice.id);
                          return n;
                        });
                        setSelectedRowKeys((prev) =>
                          prev.filter((k) => k !== editingVoice.id),
                        );
                        setEditModalVisible(false);
                        setEditingVoice(null);
                        setIsEditing(false);
                        Object.keys(groups).forEach((ym) => {
                          if (
                            groups[ym].voices.some(
                              (v) => v.id === editingVoice.id,
                            )
                          ) {
                            const nextGroups = {
                              ...groups,
                              [ym]: {
                                ...groups[ym],
                                loaded: false,
                                voices: [],
                              },
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
                }}
              >
                删除
              </Button>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setIsEditing(true)}
              >
                编辑
              </Button>
            </>
          )
        }
        width={560}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          className={styles['voice-edit-form']}
          style={{ marginTop: 16 }}
          disabled={!isEditing}
        >
          {/* 音频预览 - 仅编辑模式展示 */}
          {isEditing && (
            <Form.Item label="音频">
              {editingVoice && (
                <div className={styles['edit-voice-preview']}>
                  <div className={styles['edit-voice-preview-thumb']}>
                    {editCoverUrl || editingVoice.coverUrl ? (
                      <img
                        src={getImageUrl(
                          editCoverUrl || editingVoice.coverUrl!,
                        )}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <SoundOutlined
                        className={styles['edit-voice-preview-icon']}
                      />
                    )}
                  </div>
                  <div className={styles['edit-voice-preview-info']}>
                    <span className={styles['edit-voice-preview-name']}>
                      {editingVoice.fileName || '未命名音频'}
                    </span>
                    {editingVoice.duration != null && (
                      <span className={styles['edit-voice-preview-meta']}>
                        {fmtDuration(editingVoice.duration)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Form.Item>
          )}

          {/* 编辑封面上传 - 仅编辑模式展示 */}
          {isEditing && (
            <Form.Item label="更换封面（选填）">
              {editCoverUrl ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    background: '#0a0a0a',
                    border: '1px solid #262626',
                  }}
                >
                  <img
                    src={getImageUrl(editCoverUrl)}
                    alt=""
                    style={{ width: 64, height: 48, objectFit: 'cover' }}
                  />
                  <span style={{ fontSize: 13, color: '#ccc' }}>
                    新封面已上传
                  </span>
                  <Button
                    size="small"
                    danger
                    onClick={() => {
                      setEditCoverFileList([]);
                      setEditCoverUrl('');
                    }}
                  >
                    移除
                  </Button>
                </div>
              ) : (
                <Upload
                  accept=".jpg,.jpeg,.png,.webp"
                  fileList={editCoverFileList}
                  customRequest={async (options: any) => {
                    const { file, onSuccess, onError } = options;
                    try {
                      const res = await uploadVoiceCover(file as File);
                      if (!res?.url) {
                        onError(new Error('上传失败'));
                        return;
                      }
                      setEditCoverUrl(res.url);
                      onSuccess({ url: res.url }, file);
                    } catch {
                      message.error('封面上传失败');
                      onError(new Error('上传失败'));
                    }
                  }}
                  onChange={(info: any) =>
                    setEditCoverFileList([...info.fileList])
                  }
                  maxCount={1}
                >
                  <Button icon={<UploadOutlined />}>选择新封面</Button>
                </Upload>
              )}
            </Form.Item>
          )}

          {/* 查看模式下显示 audio 播放器 */}
          {!isEditing && editingVoice && (
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <audio
                src={getImageUrl(
                  editingVoice.playUrl || editingVoice.originalUrl,
                )}
                controls
                style={{ width: '100%', maxWidth: 480, outline: 'none' }}
              >
                您的浏览器不支持音频播放
              </audio>
            </div>
          )}

          {/* 文件名称（只读） */}
          <Form.Item name="fileName" label="文件名称">
            <Input
              disabled={!isEditing}
              placeholder="文件名称"
              maxLength={100}
            />
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

          {/* 音频类型（暂不展示）
          <Form.Item name="voiceTypeId" label="音频类型">
            <Select
              placeholder="请选择音频类型"
              allowClear
              loading={typesLoading}
            >
              {voiceTypes.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          */}

          {/* 拍摄地点（暂不展示）
          <Form.Item name="voiceLocationId" label="拍摄地点">
            <Select
              placeholder="请选择拍摄地点"
              allowClear
              loading={locationsLoading}
            >
              {voiceLocations.map((l) => (
                <Select.Option key={l.id} value={l.id}>
                  {l.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          */}

          {/* 发布平台（暂不展示）
          <Form.Item name="voicePlatformId" label="发布平台">
            <Select
              placeholder="请选择发布平台"
              allowClear
              loading={platformsLoading}
            >
              {voicePlatforms.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          */}

          {/* 行程（暂不展示）
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
          */}

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
        title="音频预览"
        open={previewModalVisible}
        onCancel={() => {
          setPreviewModalVisible(false);
          setPreviewingVoice(null);
          setPreviewIndex(-1);
        }}
        footer={null}
        width={1200}
        destroyOnClose
        bodyStyle={{ height: 800, overflow: 'hidden' }}
      >
        {previewingVoice && (
          <div className={styles['preview-content']}>
            <span
              className={`${styles['preview-nav-btn']} ${
                styles['preview-nav-prev']
              } ${previewIndex <= 0 ? styles['nav-disabled'] : ''}`}
              onClick={handlePrevVoice}
            >
              ‹
            </span>

            {/* 左边：音频播放 */}
            <div className={styles['preview-audio']}>
              <audio
                src={getImageUrl(
                  previewingVoice.playUrl || previewingVoice.originalUrl,
                )}
                controls
                style={{
                  width: '100%',
                  maxWidth: 480,
                  display: 'block',
                }}
              >
                您的浏览器不支持音频播放
              </audio>
              <span
                className={styles['preview-download-btn']}
                onClick={(e) => {
                  e.stopPropagation();
                  const url = getImageUrl(
                    previewingVoice.hdUrl || previewingVoice.originalUrl,
                  );
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = previewingVoice.fileName || 'audio.mp3';
                  a.target = '_blank';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                <DownloadOutlined />
                下载原音频
              </span>
            </div>

            {/* 右边：详细信息 */}
            <div className={styles['preview-info']}>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>文件名称</span>
                <span className={styles['preview-info-value']}>
                  {previewingVoice.fileName || '-'}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>艺人</span>
                <span className={styles['preview-info-value']}>
                  {artists.find((a) => a.artistId === previewingVoice.artistId)
                    ?.name || '-'}
                </span>
              </div>
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>拍摄日期</span>
                <span className={styles['preview-info-value']}>
                  {previewingVoice.shootDate || '-'}
                </span>
              </div>
              {/* 音频类型（暂不展示）
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>音频类型</span>
                <span className={styles['preview-info-value']}>
                  {previewingVoice.tagType?.name || '-'}
                </span>
              </div>
              */}
              {/* 拍摄地点（暂不展示）
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>拍摄地点</span>
                <span className={styles['preview-info-value']}>
                  {previewingVoice.tagLocation?.name || '-'}
                </span>
              </div>
              */}
              {/* 发布平台（暂不展示）
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>发布平台</span>
                <span className={styles['preview-info-value']}>
                  {previewingVoice.tagPlatform?.name || '-'}
                </span>
              </div>
              */}
              {/* 行程（暂不展示）
              <div className={styles['preview-info-item']}>
                <span className={styles['preview-info-label']}>行程</span>
                <span className={styles['preview-info-value']}>
                  {previewingVoice.itinerary
                    ? `${previewingVoice.itinerary.title}${
                        previewingVoice.itinerary.location
                          ? ` · ${previewingVoice.itinerary.location}`
                          : ''
                      }`
                    : '-'}
                </span>
              </div>
              */}
              <div
                className={styles['preview-info-item']}
                style={{ alignItems: 'flex-start' }}
              >
                <span className={styles['preview-info-label']}>描述</span>
                <span className={styles['preview-info-value']}>
                  {previewingVoice.description || '-'}
                </span>
              </div>
            </div>

            <span
              className={`${styles['preview-nav-btn']} ${
                styles['preview-nav-next']
              } ${
                previewIndex >= flatVoices.length - 1
                  ? styles['nav-disabled']
                  : ''
              }`}
              onClick={handleNextVoice}
            >
              ›
            </span>

            {flatVoices.length > 1 && (
              <div className={styles['preview-counter']}>
                {previewIndex + 1} / {flatVoices.length}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 批量设置弹窗 */}
      <Modal
        title={`批量设置（已选 ${selectedIds.size} 条音频）`}
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
          className={styles['voice-edit-form']}
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

          {/* 音频类型（暂不展示）
          <Form.Item name="voiceTypeId" label="音频类型">
            <Select
              placeholder="请选择音频类型（可选）"
              allowClear
              loading={typesLoading}
            >
              {voiceTypes.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          */}

          {/* 拍摄地点（暂不展示）
          <Form.Item name="voiceLocationId" label="拍摄地点">
            <Select
              placeholder="请选择拍摄地点（可选）"
              allowClear
              loading={locationsLoading}
            >
              {voiceLocations.map((l) => (
                <Select.Option key={l.id} value={l.id}>
                  {l.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          */}

          {/* 发布平台（暂不展示）
          <Form.Item name="voicePlatformId" label="发布平台">
            <Select
              placeholder="请选择发布平台（可选）"
              allowClear
              loading={platformsLoading}
            >
              {voicePlatforms.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          */}

          {/* 行程（暂不展示）
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
          */}

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

export default VoicePage;
