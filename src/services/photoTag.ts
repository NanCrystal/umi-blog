import request from '@/utils/request';

/** 照片类型 */
export async function getPhotoTypes() {
  return request('/photo-types');
}

export async function createPhotoType(name: string) {
  return request('/photo-types', { method: 'POST', data: { name } });
}

export async function updatePhotoType(id: number, name: string) {
  return request(`/photo-types/${id}`, { method: 'PUT', data: { name } });
}

export async function deletePhotoType(id: number) {
  return request(`/photo-types/${id}`, { method: 'DELETE' });
}

export async function updateTypeSortOrder(
  items: { id: number; sortOrder: number }[],
) {
  return request('/photo-types/sort', { method: 'PUT', data: items });
}

/** 拍摄地点 */
export async function getPhotoLocations() {
  return request('/photo-locations');
}

export async function createPhotoLocation(name: string) {
  return request('/photo-locations', { method: 'POST', data: { name } });
}

export async function updatePhotoLocation(id: number, name: string) {
  return request(`/photo-locations/${id}`, { method: 'PUT', data: { name } });
}

export async function deletePhotoLocation(id: number) {
  return request(`/photo-locations/${id}`, { method: 'DELETE' });
}

export async function updateLocationSortOrder(
  items: { id: number; sortOrder: number }[],
) {
  return request('/photo-locations/sort', { method: 'PUT', data: items });
}

/** 问题反馈 */
export async function getPhotoFeedbacks() {
  return request('/photo-feedback');
}

export async function createPhotoFeedback(name: string) {
  return request('/photo-feedback', { method: 'POST', data: { name } });
}

export async function updatePhotoFeedback(id: number, name: string) {
  return request(`/photo-feedback/${id}`, { method: 'PUT', data: { name } });
}

export async function deletePhotoFeedback(id: number) {
  return request(`/photo-feedback/${id}`, { method: 'DELETE' });
}

export async function updateFeedbackSortOrder(
  items: { id: number; sortOrder: number }[],
) {
  return request('/photo-feedback/sort', { method: 'PUT', data: items });
}

/** 发布平台 */
export async function getPhotoPlatforms() {
  return request('/photo-platforms');
}

export async function createPhotoPlatform(name: string, uuid: string) {
  return request('/photo-platforms', { method: 'POST', data: { name, uuid } });
}

export async function updatePhotoPlatform(
  id: number,
  name: string,
  uuid: string,
) {
  return request(`/photo-platforms/${id}`, {
    method: 'PUT',
    data: { name, uuid },
  });
}

export async function deletePhotoPlatform(id: number) {
  return request(`/photo-platforms/${id}`, { method: 'DELETE' });
}

export async function updatePlatformSortOrder(
  items: { id: number; sortOrder: number }[],
) {
  return request('/photo-platforms/sort', { method: 'PUT', data: items });
}

/** 小卡类型 */
export async function getPhotoCardTypes() {
  return request('/photo-card-types');
}

export async function createPhotoCardType(name: string) {
  return request('/photo-card-types', { method: 'POST', data: { name } });
}

export async function updatePhotoCardType(id: number, name: string) {
  return request(`/photo-card-types/${id}`, { method: 'PUT', data: { name } });
}

export async function deletePhotoCardType(id: number) {
  return request(`/photo-card-types/${id}`, { method: 'DELETE' });
}

export async function updateCardTypeSortOrder(
  items: { id: number; sortOrder: number }[],
) {
  return request('/photo-card-types/sort', { method: 'PUT', data: items });
}
