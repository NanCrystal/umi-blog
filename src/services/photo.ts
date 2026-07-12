import request from '@/utils/request';

/** 创建单张照片 */
export async function createPhoto(data: {
  fileName: string;
  url: string;
  size?: number;
  artistId: string;
  shootDate: string;
  photoTypeId?: number;
  photoLocationId?: number;
  photoPlatformId?: number;
  itineraryId?: number;
  description?: string;
}) {
  return request('/photos', { method: 'POST', data });
}

/** 批量创建照片 */
export async function batchCreatePhotos(
  data: {
    artistId: string;
    shootDate?: string;
    photoTypeId: number;
    photoLocationId?: number;
    photoPlatformId?: number;
    description?: string;
    fileUrl: string;
  },
  opts?: { timeout?: number },
) {
  return request('/photos/batch', {
    method: 'POST',
    data,
    ...opts,
  });
}

/** 上传照片文件 */
export async function uploadPhotoFile(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/upload/image', {
    method: 'POST',
    data: formData,
    requestType: 'form',
  });
}

/** 获取时间轴数据（按月份统计图片数量） */
export async function getPhotosTimeline(params: {
  typeIds?: number[];
  locationIds?: number[];
  platformIds?: number[];
  artistIds?: string[];
}) {
  return request('/photos/timeline', {
    method: 'GET',
    params: {
      typeIds: params.typeIds?.join(','),
      locationIds: params.locationIds?.join(','),
      platformIds: params.platformIds?.join(','),
      artistIds: params.artistIds?.join(','),
    },
  });
}

/** 按月份分页查询图片 */
export async function getPhotosByMonth(params: {
  yearMonth: string;
  page?: number;
  pageSize?: number;
  typeIds?: number[];
  locationIds?: number[];
  platformIds?: number[];
  artistIds?: string[];
}) {
  return request('/photos/by-month', {
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

/** 更新单张照片 */
export async function updatePhoto(
  id: number,
  data: {
    fileName?: string;
    url?: string;
    size?: number;
    artistId?: string;
    shootDate?: string;
    photoTypeId?: number;
    photoLocationId?: number;
    photoPlatformId?: number;
    itineraryId?: number;
    description?: string;
  },
) {
  return request(`/photos/${id}`, { method: 'PUT', data });
}

/** 简单分页列表（供媒体库弹窗选择） */
export async function getPhotos(params: {
  page?: number;
  pageSize?: number;
  artistIds?: string[];
}) {
  return request('/photos', {
    method: 'GET',
    params: {
      page: params.page,
      pageSize: params.pageSize,
      artistIds: params.artistIds?.join(','),
    },
  });
}

/** 删除单张照片 */
export async function deletePhoto(id: number) {
  return request(`/photos/${id}`, { method: 'DELETE' });
}

/** 批量删除照片 */
export async function batchDeletePhotos(ids: number[]) {
  return request('/photos/batch-delete', { method: 'POST', data: { ids } });
}

/** 一键清空所有照片 */
export async function clearAllPhotos() {
  return request('/photos/clear-all', { method: 'DELETE' });
}

/** 批量更新照片 */
export async function batchUpdatePhotos(
  ids: number[],
  data: {
    photoTypeId?: number;
    photoLocationId?: number;
    artistId?: string;
    shootDate?: string;
    itineraryId?: number;
    description?: string;
  },
) {
  return request('/photos/batch', { method: 'PATCH', data: { ids, data } });
}
