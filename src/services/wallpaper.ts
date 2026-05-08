import request from '@/utils/request';

export interface WallPaperImage {
  id?: number;
  url: string;
  thumbUrl: string;
}

export interface WallPaperItem {
  id: number;
  title: string;
  cover: string;
  images: WallPaperImage[];
  createdAt: string;
  updatedAt: string;
}

export interface WechatPublishSchedule {
  id: number;
  wallpaperId: number;
  publishDate: string;
  scheduledAt: string;
  status: string;
  publishId?: string | null;
  publishStatus?: number | null;
  errorMessage?: string | null;
  submittedAt?: string | null;
  publishedAt?: string | null;
  updatedAt?: string;
  wallpaper?: WallPaperItem;
}

export interface PublishRecord {
  id: number;
  platform: 'wechat' | 'douyin' | 'xiaohongshu';
  wallpaperId: number;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  wallpaper?: WallPaperItem;
}

export async function getWallPaperList() {
  return request('/wallpapers');
}

export async function getWallPaperDetail(id: number) {
  return request(`/wallpapers/${id}`);
}

export async function createWallPaper(data: any) {
  return request('/wallpapers', {
    method: 'POST',
    data,
  });
}

export async function updateWallPaper(id: number, data: any) {
  return request(`/wallpapers/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteWallPaper(id: number) {
  return request(`/wallpapers/${id}`, {
    method: 'DELETE',
  });
}

export async function syncWallPaperToWechatDraft(id: number) {
  const result: any = await request(`/wallpapers/${id}/sync/wechat-draft`, {
    method: 'POST',
    timeout: 60000,
  });

  if (result?.statusCode >= 400 || result?.error || result?.errcode) {
    const errorMessage = Array.isArray(result?.message)
      ? result.message.join('，')
      : result?.message || result?.errmsg || '同步到公众号草稿箱失败';
    throw new Error(errorMessage);
  }

  if (!result?.mediaId) {
    throw new Error('公众号草稿创建失败，未返回 mediaId');
  }

  return result;
}

export async function scheduleWallPaperWechatPublish(
  id: number,
  publishDate: string,
) {
  const result: any = await request(`/wallpapers/${id}/publish/wechat`, {
    method: 'POST',
    data: { publishDate },
    timeout: 15000,
  });

  if (result?.statusCode >= 400 || result?.error || result?.errcode) {
    const errorMessage = Array.isArray(result?.message)
      ? result.message.join('，')
      : result?.message || result?.errmsg || '创建公众号发布排期失败';
    throw new Error(errorMessage);
  }

  if (!result?.id) {
    throw new Error('公众号发布排期创建失败，未返回计划信息');
  }

  return result;
}

export async function getWechatPublishSchedules() {
  const result: any = await request('/wallpapers/publish/wechat/schedules');

  if (result?.statusCode >= 400 || result?.error || result?.errcode) {
    const errorMessage = Array.isArray(result?.message)
      ? result.message.join('，')
      : result?.message || result?.errmsg || '获取公众号发布排期失败';
    throw new Error(errorMessage);
  }

  return Array.isArray(result) ? result : result?.data || [];
}

export async function cancelWechatPublishSchedule(scheduleId: number) {
  const result: any = await request(
    `/wallpapers/publish/wechat/schedules/${scheduleId}`,
    {
      method: 'DELETE',
    },
  );

  if (result?.statusCode >= 400 || result?.error || result?.errcode) {
    const errorMessage = Array.isArray(result?.message)
      ? result.message.join('，')
      : result?.message || result?.errmsg || '取消公众号发布排期失败';
    throw new Error(errorMessage);
  }

  return result;
}

/* ── 抖音 ── */

export async function checkDouyinLoginStatus() {
  const result: any = await request('/wallpapers/douyin/login-status');

  if (result?.statusCode >= 400 || result?.error) {
    const errorMessage = Array.isArray(result?.message)
      ? result.message.join('，')
      : result?.message || '检查抖音登录状态失败';
    throw new Error(errorMessage);
  }

  return result;
}

export async function douyinLogin() {
  const result: any = await request('/wallpapers/douyin/login', {
    method: 'POST',
    timeout: 200000,
  });

  if (result?.statusCode >= 400 || result?.error) {
    const errorMessage = Array.isArray(result?.message)
      ? result.message.join('，')
      : result?.message || '抖音登录失败';
    throw new Error(errorMessage);
  }

  return result;
}

export async function syncWallPaperToDouyin(id: number) {
  const result: any = await request(`/wallpapers/${id}/sync/douyin`, {
    method: 'POST',
    timeout: 120000,
  });

  if (result?.statusCode >= 400 || result?.error) {
    const errorMessage = Array.isArray(result?.message)
      ? result.message.join('，')
      : result?.message || '同步到抖音图文失败';
    throw new Error(errorMessage);
  }

  if (!result?.success) {
    throw new Error('抖音图文发布失败，请重试');
  }

  return result;
}

/* ── 小红书 ── */

export async function checkXiaohongshuLoginStatus() {
  const result: any = await request('/wallpapers/xiaohongshu/login-status');

  if (result?.statusCode >= 400 || result?.error) {
    const errorMessage = Array.isArray(result?.message)
      ? result.message.join('，')
      : result?.message || '检查小红书登录状态失败';
    throw new Error(errorMessage);
  }

  return result;
}

export async function xiaohongshuLogin() {
  const result: any = await request('/wallpapers/xiaohongshu/login', {
    method: 'POST',
    timeout: 200000,
  });

  if (result?.statusCode >= 400 || result?.error) {
    const errorMessage = Array.isArray(result?.message)
      ? result.message.join('，')
      : result?.message || '小红书登录失败';
    throw new Error(errorMessage);
  }

  return result;
}

export async function syncWallPaperToXiaohongshu(id: number) {
  const result: any = await request(`/wallpapers/${id}/sync/xiaohongshu`, {
    method: 'POST',
    timeout: 120000,
  });

  if (result?.statusCode >= 400 || result?.error) {
    const errorMessage = Array.isArray(result?.message)
      ? result.message.join('，')
      : result?.message || '同步到小红书图文失败';
    throw new Error(errorMessage);
  }

  if (!result?.success) {
    throw new Error('小红书图文发布失败，请重试');
  }

  return result;
}

/* ── 发布记录 ── */

export async function getPublishRecords(
  platform?: string,
): Promise<PublishRecord[]> {
  const params = platform ? `?platform=${platform}` : '';
  const result: any = await request(`/wallpapers/publish/records${params}`);

  if (result?.statusCode >= 400 || result?.error) {
    throw new Error(result?.message || '获取发布记录失败');
  }

  return Array.isArray(result) ? result : result?.data || [];
}

export async function retryPublishRecord(recordId: number) {
  const result: any = await request(
    `/wallpapers/publish/records/${recordId}/retry`,
    {
      method: 'POST',
      timeout: 120000,
    },
  );

  if (result?.statusCode >= 400 || result?.error) {
    const errorMessage = Array.isArray(result?.message)
      ? result.message.join('，')
      : result?.message || '重新发布失败';
    throw new Error(errorMessage);
  }

  return result;
}
