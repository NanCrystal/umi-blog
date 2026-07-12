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

/** 上传音频 ZIP 压缩包（仅上传，返回 URL） */
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

/**
 * ZIP 批量上传音频（上传 ZIP + 自动解压入库）
 * 返回 { promise, abort }，支持取消上传
 */
export function uploadAudioZipBatch(data: {
  file: File;
  artistId: string;
  shootDate?: string;
  description?: string;
  tagTypeId?: number;
  tagLocationId?: number;
  tagPlatformId?: number;
  itineraryId?: number;
  onProgress?: (percent: number) => void;
}) {
  const formData = new FormData();
  formData.append('file', data.file);
  formData.append('artistId', data.artistId);
  if (data.shootDate) formData.append('shootDate', data.shootDate);
  if (data.description) formData.append('description', data.description);
  if (data.tagTypeId) formData.append('tagTypeId', String(data.tagTypeId));
  if (data.tagLocationId)
    formData.append('tagLocationId', String(data.tagLocationId));
  if (data.tagPlatformId)
    formData.append('tagPlatformId', String(data.tagPlatformId));
  if (data.itineraryId)
    formData.append('itineraryId', String(data.itineraryId));

  const xhr = new XMLHttpRequest();

  const promise = new Promise<any>((resolve, reject) => {
    const token = localStorage.getItem('token');

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        data.onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve(xhr.responseText);
        }
      } else {
        let errMsg = 'ZIP 上传失败';
        try {
          const res = JSON.parse(xhr.responseText);
          errMsg = res?.message || res?.error || errMsg;
        } catch {
          /* ignore */
        }
        reject(new Error(errMsg));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('网络错误')));
    xhr.addEventListener('abort', () => reject(new Error('上传已取消')));

    xhr.open('POST', '/api/audios/upload-zip');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });

  return {
    promise,
    abort: () => xhr.abort(),
  };
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

/** 简单分页列表（供媒体库弹窗选择） */
export async function getVoices(params: {
  page?: number;
  pageSize?: number;
  artistIds?: string[];
}) {
  return request('/audios', {
    method: 'GET',
    params: {
      page: params.page,
      pageSize: params.pageSize,
      artistIds: params.artistIds?.join(','),
    },
  });
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
