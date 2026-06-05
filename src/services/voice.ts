import request from '@/utils/request';

/** 上传音频文件 */
export async function uploadVoiceFile(
  file: File,
): Promise<{ url: string; key: string; duration?: number }> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/upload/audio', {
    method: 'POST',
    data: formData,
    requestType: 'form',
    timeout: 600000,
  });
}

/** 上传音频封面图 */
export async function uploadVoiceCover(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/upload/audio-cover', {
    method: 'POST',
    data: formData,
    requestType: 'form',
    timeout: 60000,
  });
}

/** 上传音频 ZIP 压缩包 */
export async function uploadVoiceZip(
  file: File,
): Promise<{ url: string; key: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/upload/zip', {
    method: 'POST',
    data: formData,
    requestType: 'form',
    timeout: 600000,
  });
}

/** 单条创建音频 */
export async function createVoice(data: {
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
  codec?: string;
  bitrate?: number;
}) {
  return request('/audios', { method: 'POST', data });
}

/** 时间轴（按月份统计） */
export async function getVoicesTimeline(params: {
  typeIds?: number[];
  locationIds?: number[];
  platformIds?: number[];
  artistIds?: string[];
}) {
  return request('/audios/timeline', {
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
export async function getVoicesByMonth(params: {
  yearMonth: string;
  page?: number;
  pageSize?: number;
  typeIds?: number[];
  locationIds?: number[];
  platformIds?: number[];
  artistIds?: string[];
}) {
  return request('/audios/by-month', {
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

/** 更新单条音频 */
export async function updateVoice(
  id: number,
  data: {
    title?: string;
    fileName?: string;
    artistId?: string;
    coverUrl?: string;
    shootDate?: string;
    tagTypeId?: number;
    tagLocationId?: number;
    tagPlatformId?: number;
    itineraryId?: number;
    description?: string;
    playUrl?: string;
    hdUrl?: string;
    status?: string;
  },
) {
  return request(`/audios/${id}`, { method: 'PUT', data });
}

/** 批量更新音频 */
export async function batchUpdateVoices(
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
  },
) {
  return request('/audios/batch', { method: 'PATCH', data: { ids, data } });
}

/** 删除单条音频 */
export async function deleteVoice(id: number) {
  return request(`/audios/${id}`, { method: 'DELETE' });
}

/** 批量删除音频 */
export async function batchDeleteVoices(ids: number[]) {
  return request('/audios/batch-delete', { method: 'POST', data: { ids } });
}
