// types/photo.ts
export interface TimelineMonth {
  yearMonth: string; // "202605"
  count: number;
  percent?: number; // 前端计算：该月占总高度的比例
  top?: number; // 前端计算：在虚拟容器中的绝对 top
}

export interface Photo {
  id: number;
  url: string;
  takenAt: string;
  width?: number;
  height?: number;
}

export interface PhotoGroup {
  yearMonth: string;
  photos: Photo[];
  total: number;
  top: number; // 在虚拟容器中的绝对 top
  height: number; // 占用高度
  loaded: boolean;
  recycled: boolean; // 是否已回收 DOM
}
