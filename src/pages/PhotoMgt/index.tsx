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
  EyeOutlined,
} from '@ant-design/icons';
import { Modal, message, Form, Input, Select, DatePicker } from 'antd';
import styles from './index.less';
import { getPhotoTypes, getPhotoLocations } from '@/services/photoTag';
import {
  getPhotosTimeline,
  getPhotosByMonth,
  deletePhoto,
  updatePhoto,
  batchDeletePhotos,
  batchUpdatePhotos,
} from '@/services/photo';
import { getImageUrl } from '@/utils/utils';
import { getArtistList } from '@/services/artist';
import { getItineraryList } from '@/services/itinerary';
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
  artistId?: string;
  shootDate?: string;
  photoTypeId?: number;
  photoLocationId?: number;
  itineraryId?: number;
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

const ALL_KEY = '__all__';
const PHOTO_SIZE = 128 + 8;
const TITLE_HEIGHT = 48;
const PADDING = 24;
const BUFFER_PX = 600;

function calcCols(w: number) {
  return Math.max(3, Math.floor((w - 80 - 40) / PHOTO_SIZE));
}
function calcGroupHeight(count: number, cols: number) {
  return (
    Math.ceil(Math.min(count, 50) / cols) * PHOTO_SIZE + TITLE_HEIGHT + PADDING
  );
}
function fmtYM(ym: string) {
  return `${ym.slice(0, 4)}年${ym.slice(4, 6)}月`;
}
function thumb(url: string) {
  return `${getImageUrl(url)}?imageView2/1/w/200/h/200/q/75`;
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

  // ── 新增：图片列表 + 时间轴状态 ──────────────────────────
  const [groups, setGroups] = useState<Record<string, PhotoGroup>>({});
  const [timelineIndex, setTimelineIndex] = useState<TimelineMonth[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);
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
  const [artists, setArtists] = useState<any[]>([]);
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);

  // ── 预览弹窗相关 ───────────────────────────────────────
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewingPhoto, setPreviewingPhoto] = useState<Photo | null>(null);

  // ── 批量设置弹窗相关 ─────────────────────────────────────
  const [batchEditModalVisible, setBatchEditModalVisible] = useState(false);
  const [batchForm] = Form.useForm();
  const [batchEditLoading, setBatchEditLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const loadingSet = useRef<Set<string>>(new Set());

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

  // ── 艺人筛选逻辑 ──────────────────────────────────────
  const activeArtistIds = useMemo<string[] | undefined>(() => {
    if (selectedArtists.has(ALL_KEY) || selectedArtists.size === 0)
      return undefined;
    // 支持多选艺人
    const artistIds = Array.from(selectedArtists).filter((v) => v !== ALL_KEY);
    return artistIds.length > 0 ? (artistIds as string[]) : undefined;
  }, [selectedArtists]);

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
        const { items } = await getPhotosByMonth({
          yearMonth,
          page: 1,
          pageSize: 50,
          typeIds: activeTypeIds.length > 0 ? activeTypeIds : undefined,
          locationIds:
            activeLocationIds.length > 0 ? activeLocationIds : undefined,
          artistIds: activeArtistIds?.length ? activeArtistIds : undefined,
        });
        setGroups((prev) => ({
          ...prev,
          [yearMonth]: {
            ...prev[yearMonth],
            photos: items ?? [],
            loaded: true,
          },
        }));
      } catch {
        /* silent */
      } finally {
        loadingSet.current.delete(yearMonth);
      }
    },
    [groups, activeTypeIds, activeLocationIds, activeArtistIds],
  );

  // ── 新增：筛选变化时重新加载时间轴 ──────────────────────
  useEffect(() => {
    getPhotosTimeline({
      typeIds: activeTypeIds,
      locationIds: activeLocationIds,
      artistIds: activeArtistIds?.length ? activeArtistIds : undefined,
    })
      .then((data: { yearMonth: string; count: number }[]) => {
        if (!data?.length) {
          setTimelineIndex([]);
          setGroups({});
          setContainerHeight(0);
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
        setContainerHeight(top);
        withLayout
          .filter((m) => m.top < 2000)
          .forEach((m) => loadMonth(m.yearMonth, initGroups));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTypeIds, activeLocationIds, activeArtistIds, cols]);

  // ── 新增：滚动虚拟化 + 懒加载 ────────────────────────────
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
  }, [loadMonth]);

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
              setGroups((prev) => ({
                ...prev,
                [ym]: { ...prev[ym], loaded: false, photos: [] },
              }));
              loadMonth(ym);
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
        itineraryId: photo.itineraryId,
        description: photo.description || '',
      });
    }, 0);
  };

  // 预览照片（弹窗）
  const handlePreviewPhoto = (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewingPhoto(photo);
    setPreviewModalVisible(true);
  };

  // 编辑提交
  const handleEditSubmit = async () => {
    try {
      if (!editingPhoto) return;
      const values = await editForm.validateFields();
      setEditLoading(true);
      await updatePhoto(editingPhoto.id, {
        fileName: values.fileName,
        artistId: values.artistId,
        shootDate: values.shootDate
          ? values.shootDate.format('YYYY-MM-DD HH:mm:ss')
          : undefined,
        photoTypeId: values.photoTypeId,
        photoLocationId: values.photoLocationId,
        itineraryId: values.itineraryId,
        description: values.description,
      });
      message.success('修改成功');
      setEditModalVisible(false);
      setEditingPhoto(null);
      // 刷新该照片所在月份数据
      Object.keys(groups).forEach((ym) => {
        if (groups[ym].photos.some((p) => p.id === editingPhoto.id)) {
          setGroups((prev) => ({
            ...prev,
            [ym]: { ...prev[ym], loaded: false, photos: [] },
          }));
          loadMonth(ym);
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
    editForm.resetFields();
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
          // 刷新所有已加载月份的数据
          Object.keys(groups).forEach((ym) => {
            if (groups[ym].loaded) {
              setGroups((prev) => ({
                ...prev,
                [ym]: { ...prev[ym], loaded: false, photos: [] },
              }));
              loadMonth(ym);
            }
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
      if (values.photoTypeId !== undefined && values.photoTypeId !== null)
        updateData.photoTypeId = values.photoTypeId;
      if (
        values.photoLocationId !== undefined &&
        values.photoLocationId !== null
      )
        updateData.photoLocationId = values.photoLocationId;
      if (values.itineraryId !== undefined && values.itineraryId !== null)
        updateData.itineraryId = values.itineraryId;
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
          setGroups((prev) => ({
            ...prev,
            [ym]: { ...prev[ym], loaded: false, photos: [] },
          }));
          loadMonth(ym);
        }
      });
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('批量修改失败');
    } finally {
      setBatchEditLoading(false);
    }
  };

  // ── JSX ──────────────────────────────────────────────────
  return (
    <div className={styles['photo-page']}>
      {/* 页面头部（一字未改） */}
      <div className={styles['mgt-page-header']}>
        <div className={styles['mgt-page-header-content']}>
          <div className={styles['mgt-page-title']}>照片墙管理</div>

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
            type="primary"
            icon={<PlusOutlined />}
            className={styles['add-btn']}
            onClick={() => history.push('/admin/photo/add')}
          >
            添加照片
          </Button>
        </div>
      </div>

      {/* ↓↓↓ 列表区域：把占位替换成真实列表 + 时间轴 ↓↓↓ */}
      <div className={styles['photo-list-panel']} ref={panelRef}>
        {/* 滚动区 */}
        <div
          ref={scrollRef}
          className={styles['scroll-container']}
          onScroll={handleScroll}
        >
          <div
            style={{
              height: containerHeight,
              position: 'relative',
              minHeight: 300,
            }}
          >
            {/* 空状态 */}
            {containerHeight === 0 && (
              <div className={styles['photo-list-placeholder']}>
                <PictureOutlined style={{ fontSize: 48, opacity: 0.25 }} />
                <p style={{ color: 'rgba(255,255,255,0.35)', marginTop: 16 }}>
                  照片列表
                </p>
              </div>
            )}

            {/* 月份分组（虚拟化：recycled 的不渲染） */}
            {sortedMonths.map((ym) => {
              const group = groups[ym];
              if (!group || group.recycled) return null;
              return (
                <div
                  key={ym}
                  style={{
                    position: 'absolute',
                    top: group.top,
                    width: '100%',
                    paddingBottom: PADDING,
                  }}
                >
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
                  {/* 图片网格 */}
                  {!group.loaded ? (
                    <div className={styles['group-loading']}>
                      <Spin size="small" />
                    </div>
                  ) : (
                    <div className={styles['photo-grid']}>
                      {group.photos.map((photo) => (
                        <div
                          key={photo.id}
                          className={`${styles['photo-item']} ${
                            selectedIds.has(photo.id)
                              ? styles['photo-selected']
                              : ''
                          }`}
                          onClick={() => toggleSelect(photo.id)}
                        >
                          <img
                            src={thumb(photo.url)}
                            alt=""
                            loading="lazy"
                            className={styles['photo-img']}
                          />
                          <div className={styles['photo-overlay']}>
                            {/* 右上角：勾选 */}
                            <div className={styles['photo-check-top']}>
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
                            {/* 右下角：编辑、删除、预览 */}
                            <div className={styles['photo-actions-bottom']}>
                              <span
                                className={styles['photo-action-btn']}
                                onClick={(e) => handleEditPhoto(photo, e)}
                              >
                                <EditOutlined />
                              </span>
                              <span
                                className={`${styles['photo-action-btn']} ${styles['photo-delete-btn']}`}
                                onClick={(e) => handleDeletePhoto(photo.id, e)}
                              >
                                <DeleteOutlined />
                              </span>
                              <span
                                className={styles['photo-action-btn']}
                                onClick={(e) => handlePreviewPhoto(photo, e)}
                              >
                                <EyeOutlined />
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
          {/* 照片预览（只读） */}
          <Form.Item label="照片">
            {editingPhoto && (
              <img
                src={`${getImageUrl(editingPhoto.url)}?imageView2/2/w/400/q/80`}
                alt=""
                style={{
                  maxWidth: '100%',
                  maxHeight: 240,
                  borderRadius: 8,
                  display: 'block',
                }}
              />
            )}
          </Form.Item>

          {/* 文件名称（只读） */}
          <Form.Item name="fileName" label="文件名称">
            <Input disabled placeholder="文件名称不可修改" maxLength={100} />
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
              showTime
              format="YYYY-MM-DD HH:mm:ss"
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
        }}
        footer={null}
        width={900}
        destroyOnClose
      >
        {previewingPhoto && (
          <div className={styles['preview-content']}>
            {/* 左边：预览大图 */}
            <div className={styles['preview-image']}>
              <img
                src={`${getImageUrl(
                  previewingPhoto.url,
                )}?imageView2/2/w/600/q/90`}
                alt={previewingPhoto.fileName || '照片预览'}
                style={{
                  maxWidth: '100%',
                  maxHeight: 500,
                  borderRadius: 8,
                  objectFit: 'contain',
                }}
              />
              {/* 下载按钮 */}
              <a
                href={getImageUrl(previewingPhoto.url)}
                download={previewingPhoto.fileName || 'photo.jpg'}
                className={styles['preview-download-btn']}
                onClick={(e) => e.stopPropagation()}
              >
                <DownloadOutlined />
                下载原图
              </a>
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
                <span className={styles['preview-info-label']}>描述</span>
                <span className={styles['preview-info-value']}>
                  {previewingPhoto.description || '-'}
                </span>
              </div>
            </div>
          </div>
        )}
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
          {/* 拍摄日期 */}
          <Form.Item name="shootDate" label="拍摄日期">
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
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
