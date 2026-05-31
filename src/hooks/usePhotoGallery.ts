// hooks/usePhotoGallery.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { request } from 'umi';
import type { TimelineMonth, PhotoGroup } from '../types/photo';

const PHOTO_SIZE = 128 + 8; // 图片宽 + gap
const TITLE_HEIGHT = 48;
const PADDING = 20;
const COLS = 9; // 根据容器宽度动态算，这里写死示例

function calcGroupHeight(count: number): number {
  const rows = Math.ceil(Math.min(count, 50) / COLS);
  return rows * PHOTO_SIZE + TITLE_HEIGHT + PADDING;
}

export function usePhotoGallery() {
  const [timelineIndex, setTimelineIndex] = useState<TimelineMonth[]>([]);
  const [groups, setGroups] = useState<Record<string, PhotoGroup>>({});
  const [scrollRatio, setScrollRatio] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. 初始化：拉取时间轴索引
  useEffect(() => {
    request('/api/photos/timeline').then((data: TimelineMonth[]) => {
      const totalCount = data.reduce((s, m) => s + m.count, 0);
      let currentTop = 0;
      const withLayout = data.map((month) => {
        const height = calcGroupHeight(month.count);
        const item = {
          ...month,
          percent: month.count / totalCount,
          top: currentTop,
          height,
        };
        currentTop += height;
        return item;
      });

      // 初始化 groups（占位状态，图片未加载）
      const initialGroups: Record<string, PhotoGroup> = {};
      withLayout.forEach((m) => {
        initialGroups[m.yearMonth] = {
          yearMonth: m.yearMonth,
          photos: [],
          total: m.count,
          top: m.top,
          height: m.height,
          loaded: false,
          recycled: m.top > 2000, // 首屏只渲染前 2000px
        };
      });

      setTimelineIndex(withLayout);
      setGroups(initialGroups);
      setContainerHeight(currentTop);

      // 加载首屏数据
      const firstMonths = withLayout
        .filter((m) => m.top < 2000)
        .map((m) => m.yearMonth);
      firstMonths.forEach(loadMonth);
    });
  }, []);

  // 2. 按月份懒加载图片
  const loadMonth = useCallback(
    async (yearMonth: string) => {
      if (groups[yearMonth]?.loaded) return;
      const { items } = await request('/api/photos', {
        params: { yearMonth, pageSize: 50 },
      });
      setGroups((prev) => ({
        ...prev,
        [yearMonth]: { ...prev[yearMonth], photos: items, loaded: true },
      }));
    },
    [groups],
  );

  // 3. 滚动监听：虚拟化 + 懒加载触发
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setScrollRatio(scrollTop / scrollHeight);

    const visibleTop = scrollTop - 500; // buffer
    const visibleBottom = scrollTop + clientHeight + 500;

    setGroups((prev) => {
      const next = { ...prev };
      const toLoad: string[] = [];

      Object.values(next).forEach((group) => {
        const inView =
          group.top + group.height > visibleTop && group.top < visibleBottom;

        if (inView) {
          next[group.yearMonth] = { ...group, recycled: false };
          if (!group.loaded) toLoad.push(group.yearMonth);
        } else if (group.top + group.height < scrollTop - 2000) {
          next[group.yearMonth] = { ...group, recycled: true };
        }
      });

      toLoad.forEach(loadMonth);
      return next;
    });
  }, [loadMonth]);

  // 4. 点击时间轴跳转
  const scrollToMonth = useCallback(
    (yearMonth: string) => {
      const month = timelineIndex.find((m) => m.yearMonth === yearMonth);
      if (!month || !containerRef.current) return;
      containerRef.current.scrollTo({ top: month.top, behavior: 'smooth' });
    },
    [timelineIndex],
  );

  return {
    timelineIndex,
    groups,
    scrollRatio,
    containerHeight,
    containerRef,
    handleScroll,
    scrollToMonth,
  };
}
