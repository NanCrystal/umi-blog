/** 从 localStorage 读取并解析 token，兼容纯字符串和 JSON 对象两种格式 */
export const checkAdmin = (): boolean => {
  const raw = localStorage.getItem('token');
  if (!raw) return false;
  if (raw === '121414') return true;
  try {
    const parsed = JSON.parse(raw);
    return (parsed && parsed.token) === '121414';
  } catch {
    return false;
  }
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
