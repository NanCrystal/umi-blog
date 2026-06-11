import request from '@/utils/request';

export async function getArtistList() {
  return request('/artists');
}

export async function getArtistDetail(id: number) {
  return request(`/artists/${id}`);
}

export async function createArtist(data: {
  name: string;
  artistId: string;
  avatar: string;
  bio?: string;
  weiboId?: string;
  weiboNickname?: string;
  weiboAvatar?: string;
  weiboPlatformId?: number;
  douyinSecUid?: string;
  douyinNickname?: string;
  douyinAvatar?: string;
  douyinPlatformId?: number;
  xhsId?: string;
  xhsNickname?: string;
  xhsAvatar?: string;
  xhsPlatformId?: number;
  igId?: string;
  igToken?: string;
  igNickname?: string;
  igAvatar?: string;
  igPlatformId?: number;
  syncEnabled?: boolean;
  enabled?: boolean;
}) {
  return request('/artists', {
    method: 'POST',
    data,
  });
}

export async function updateArtist(
  id: number,
  data: {
    name?: string;
    artistId?: string;
    avatar?: string;
    bio?: string;
    weiboId?: string;
    weiboNickname?: string;
    weiboAvatar?: string;
    weiboPlatformId?: number;
    douyinSecUid?: string;
    douyinNickname?: string;
    douyinAvatar?: string;
    douyinPlatformId?: number;
    xhsId?: string;
    xhsNickname?: string;
    xhsAvatar?: string;
    xhsPlatformId?: number;
    igId?: string;
    igToken?: string;
    igNickname?: string;
    igAvatar?: string;
    igPlatformId?: number;
    syncEnabled?: boolean;
    enabled?: boolean;
  },
) {
  return request(`/artists/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteArtist(id: number) {
  return request(`/artists/${id}`, {
    method: 'DELETE',
  });
}

// 社交同步相关
export async function runSyncAll(mode = 'incremental') {
  const url = mode === 'full' ? '/sync/full-run' : '/sync/run';
  // 全量同步可能耗时较长（分钟级），单独设置 10 分钟超时
  const timeout = mode === 'full' ? 600000 : undefined;
  return request(url, { method: 'POST', timeout });
}

export async function runSyncForArtist(artistId: number) {
  return request(`/sync/run/${artistId}`, { method: 'POST' });
}

export async function getFullSyncStatus() {
  return request('/sync/full-status');
}

export async function runSyncForArtistPlatform(
  artistId: number,
  platform: string,
  mode = 'incremental',
) {
  const timeout = mode === 'full' ? 600000 : undefined;
  return request(`/sync/run/${artistId}/${platform}?mode=${mode}`, {
    method: 'POST',
    timeout,
  });
}

export async function getSyncPosts(params: {
  artistId?: number;
  platform?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return request('/sync/posts', { params });
}

export async function getSyncPostDetail(id: number) {
  return request(`/sync/posts/${id}`);
}

export async function deleteSyncPost(id: number) {
  return request(`/sync/posts/${id}`, { method: 'DELETE' });
}

export async function batchDeleteSyncPosts(ids: number[]) {
  return request('/sync/posts/batch-delete', {
    method: 'POST',
    data: { ids },
  });
}

/** 一键清空所有同步记录 */
export async function clearAllSyncPosts() {
  return request('/sync/posts/clear-all', {
    method: 'POST',
  });
}

/** 获取同步记录统计 */
export async function getSyncPostsStats() {
  return request('/sync/posts/stats');
}

export async function importSyncData(file: File, platform: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('platform', platform);
  return request('/sync/import', {
    method: 'POST',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/** 导入 Instagram 桌面脚本下载的媒体文件 */
export async function importInstagramScript(data: {
  basePath: string;
  artistId?: number;
  cleanupAfter?: boolean;
}) {
  return request('/sync/import-instagram-script', {
    method: 'POST',
    data,
  });
}
