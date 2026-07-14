import request from '@/utils/request';

/** 上传视频文件 */
export async function uploadVideoFile(
  file: File,
): Promise<{ url: string; key: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/upload/video', {
    method: 'POST',
    data: formData,
    requestType: 'form',
    timeout: 600000,
  });
}

/** 单条创建视频 */
export async function createVideo(data: {
  fileName: string;
  artistId: string;
  qiniuKey: string;
  originalUrl: string;
  coverUrl?: string;
  shootDate: string;
  tagTypeId?: number;
  tagLocationId?: number;
  tagPlatformId?: number;
  itineraryId?: number;
  description?: string;
  mimeType?: string;
  size?: number;
  duration?: number;
  width?: number;
  height?: number;
  codec?: string;
}) {
  return request('/videos', { method: 'POST', data });
}

/** 时间轴（按月份统计） */
export async function getVideosTimeline(params: {
  typeIds?: number[];
  locationIds?: number[];
  platformIds?: number[];
  artistIds?: string[];
}) {
  return request('/videos/timeline', {
    method: 'GET',
    params: {
      typeIds: params.typeIds?.join(','),
      locationIds: params.locationIds?.join(','),
      platformIds: params.platformIds?.join(','),
      artistIds: params.artistIds?.join(','),
    },
  });
}

/** 按月份分页查询 */
export async function getVideosByMonth(params: {
  yearMonth: string;
  page?: number;
  pageSize?: number;
  typeIds?: number[];
  locationIds?: number[];
  platformIds?: number[];
  artistIds?: string[];
}) {
  return request('/videos/by-month', {
    method: 'GET',
    params: {
      yearMonth: params.yearMonth,
      page: params.page,
      pageSize: params.pageSize,
      typeIds: params.typeIds?.join(','),
      locationIds: params.locationIds?.join(','),
      platformIds: params.platformIds?.join(','),
      artistIds: params.artistIds?.join(','),
    },
  });
}

/** 更新单条视频 */
export async function updateVideo(
  id: number,
  data: {
    title?: string;
    fileName?: string;
    artistId?: string;
    shootDate?: string;
    qiniuKey?: string;
    originalUrl?: string;
    tagTypeId?: number;
    tagLocationId?: number;
    tagPlatformId?: number;
    itineraryId?: number;
    description?: string;
    coverUrl?: string;
    playUrl?: string;
    hdUrl?: string;
    duration?: number;
    width?: number;
    height?: number;
    codec?: string;
    size?: number;
    pfopId?: string;
    pfopStatus?: string;
    status?: string;
  },
) {
  return request(`/videos/${id}`, { method: 'PUT', data });
}

/** 简单分页列表（供媒体库弹窗选择） */
export async function getVideos(params: {
  page?: number;
  pageSize?: number;
  artistIds?: string[];
}) {
  return request('/videos', {
    method: 'GET',
    params: {
      page: params.page,
      pageSize: params.pageSize,
      artistIds: params.artistIds?.join(','),
    },
  });
}

/** 批量更新视频 */
export async function batchUpdateVideos(
  ids: number[],
  data: {
    tagTypeId?: number;
    tagLocationId?: number;
    tagPlatformId?: number;
    artistId?: string;
    shootDate?: string;
    description?: string;
    itineraryId?: number;
    status?: string;
    hidden?: boolean;
  },
) {
  return request('/videos/batch', { method: 'PATCH', data: { ids, data } });
}

/** 删除单条视频 */
export async function deleteVideo(id: number) {
  return request(`/videos/${id}`, { method: 'DELETE' });
}

/** 批量删除视频 */
export async function batchDeleteVideos(ids: number[]) {
  return request('/videos/batch-delete', { method: 'POST', data: { ids } });
}

/** 一键清空所有视频 */
export async function clearAllVideos() {
  return request('/videos/clear-all', { method: 'DELETE' });
}

/** 获取单个视频详情（用于编辑回显） */
export async function getVideoById(id: number) {
  return request(`/videos/${id}`, { method: 'GET' });
}
