/** 判断当前登录用户是否为管理员 */
export const checkAdmin = (): boolean => {
  return localStorage.getItem('user') === 'admin';
};

/** 判断是否为超时错误 */
export const isTimeoutError = (error: any) => {
  const errorMessage = `${error?.message || ''}`.toLowerCase();
  return (
    error?.name === 'TimeoutError' ||
    error?.type === 'Timeout' ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out')
  );
};

/** 格式化日期为 YYYY-MM-DD */
export const formatDateInputValue = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
};

/** 获取今天日期字符串 */
export const getTodayDateString = () => formatDateInputValue(new Date());

/** 获取默认发布日期（若当前>=9点则返回明天） */
export const getDefaultPublishDate = () => {
  const now = new Date();
  const nextDate = new Date(now);
  if (now.getHours() >= 9) {
    nextDate.setDate(nextDate.getDate() + 1);
  }
  return formatDateInputValue(nextDate);
};

/** 格式化排期显示时间 */
export const formatScheduleDisplay = (dateText: string) => `${dateText} 09:00`;

/** 格式化 ISO 时间字符串为 YYYY-MM-DD HH:mm（不含秒） */
export const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
};

/** 根据路径获取完整图片 URL（自动拼接 CDN 前缀） */
export const getImageUrl = (path?: string): string => {
  if (!path) return '';
  return path.startsWith('http') ? path : `https://cdn.tauol.online${path}`;
};

/** 格式化文件大小为可读字符串（B/KB/MB/GB） */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

/** 获取缩略图
 * imageView2/2  展示完整图片，不裁切
 * imageView2/1 — 所有图片统一切成方形网格，布局整齐
 * imageView2/1/w/200/h/200/q/75 缩放至覆盖 200×200 的最小尺寸，再居中裁剪，不变形
 * imageView2/2/w/400/q/80 按比例缩放到宽度 ≤ 400px，高度自适应 度 400px，高度按原比例，可能不到 400px
 *
 */
export const getThumbFullUrl = (url: string): string => {
  return `${getImageUrl(url)}? imageView2/2`;
};
export const getThumbUrl = (url: string): string => {
  return `${getImageUrl(url)}?imageView2/1/w/200/h/200/q/75`;
};
