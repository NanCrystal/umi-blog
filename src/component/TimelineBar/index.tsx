// components/TimelineBar/index.tsx
import React, { useRef, useState, useEffect } from 'react';
import styles from './index.less';
import type { TimelineMonth } from '../../types/photo';

interface Props {
  data: TimelineMonth[];
  scrollRatio: number; // 0~1，当前页面滚动比例
  onSelect: (yearMonth: string) => void;
  offsetTop: number; // 时间轴距窗口顶部的 px
}

function formatYearMonth(ym: string) {
  return `${ym.slice(0, 4)}年${ym.slice(4, 6)}月`;
}

const TimelineBar: React.FC<Props> = ({
  data,
  scrollRatio,
  onSelect,
  offsetTop,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [hoverTop, setHoverTop] = useState<number | null>(null);
  const [hoverLabel, setHoverLabel] = useState('');

  // 把 0~1 的 percent 转成时间轴上的累计 Y 坐标
  const getYFromRatio = (ruler: HTMLDivElement, targetRatio: number) => {
    const { height } = ruler.getBoundingClientRect();
    return targetRatio * height;
  };

  // 根据鼠标 offsetY 反查对应月份
  const getMonthByOffsetY = (offsetY: number, rulerHeight: number) => {
    let consumed = 0;
    for (const month of data) {
      const h = (month.percent ?? 0) * rulerHeight;
      if (offsetY < consumed + h) return month;
      consumed += h;
    }
    return data[data.length - 1];
  };

  useEffect(() => {
    const ruler = rulerRef.current;
    if (!ruler) return;
    const { top: rulerTop, height } = ruler.getBoundingClientRect();

    const onMove = (e: MouseEvent) => {
      const offsetY = e.clientY - rulerTop;
      if (offsetY < 0 || offsetY > height) return;
      const month = getMonthByOffsetY(offsetY, height);
      setHoverTop(offsetY);
      setHoverLabel(formatYearMonth(month.yearMonth));
    };
    const onLeave = () => {
      setHoverTop(null);
      setHoverLabel('');
    };
    const onClick = (e: MouseEvent) => {
      const offsetY = e.clientY - rulerTop;
      const month = getMonthByOffsetY(offsetY, height);
      onSelect(month.yearMonth);
    };

    ruler.addEventListener('mousemove', onMove);
    ruler.addEventListener('mouseleave', onLeave);
    ruler.addEventListener('click', onClick);
    return () => {
      ruler.removeEventListener('mousemove', onMove);
      ruler.removeEventListener('mouseleave', onLeave);
      ruler.removeEventListener('click', onClick);
    };
  }, [data, onSelect]);

  // 年份刻度：累计 percent 算 top
  const yearRulers: React.ReactNode[] = [];
  let consumed = 0;
  const yearMap: Record<string, number> = {};
  data.forEach((month) => {
    const year = month.yearMonth.slice(0, 4);
    if (!yearMap[year]) {
      yearMap[year] = consumed;
      yearRulers.push(
        <div
          key={year}
          className={styles.yearLabel}
          style={{ top: `${consumed * 100}%` }}
        >
          {year}
          <span className={styles.tick} />
        </div>,
      );
    }
    consumed += month.percent ?? 0;
  });

  return (
    <div
      className={styles.wrapper}
      style={{ top: offsetTop, height: `calc(100vh - ${offsetTop + 25}px)` }}
      ref={rulerRef}
    >
      {/* 年份刻度 */}
      {yearRulers}

      {/* 当前滚动位置（蓝线） */}
      <div
        className={styles.currentLine}
        style={{ top: `${scrollRatio * 100}%` }}
      />

      {/* hover 线 + tooltip */}
      {hoverTop !== null && (
        <>
          <div className={styles.hoverLine} style={{ top: hoverTop }} />
          <div className={styles.tooltip} style={{ top: hoverTop - 15 }}>
            {hoverLabel}
          </div>
        </>
      )}
    </div>
  );
};

export default TimelineBar;
