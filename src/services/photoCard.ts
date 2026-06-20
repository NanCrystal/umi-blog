import request from '@/utils/request';

/* ============================================================
   PhotoCard - 小卡管理 API
   ============================================================ */

/** 小卡分类树节点 */
export interface PhotoCardCategory {
  id: number;
  name: string;
  coverImage?: string;
  parentId: number | null;
  sortOrder: number;
  children?: PhotoCardCategory[];
}

/** 小卡 */
export interface PhotoCardItem {
  id: number;
  name: string;
  frontImage: string;
  backImage?: string;
  orientation: string; // "portrait" 竖屏(55*85) / "landscape" 横屏(85*55)
  cardTypeId?: number;
  categoryId?: number;
  artistId?: number;
  releaseDate?: string;
  remark?: string;
  createdAt: string;
}

/** 创建小卡参数 */
export interface CreatePhotoCardParams {
  name: string;
  frontImage: string;
  backImage?: string;
  orientation?: string;
  cardTypeId?: number;
  categoryId?: number;
  artistId?: number;
  releaseDate?: string;
  remark?: string;
}

// ─── 分类树 API ───

export async function getPhotoCardCategories() {
  return request<PhotoCardCategory[]>('/photo-card-categories');
}

export async function createPhotoCardCategory(
  name: string,
  parentId?: number | null,
  coverImage?: string,
) {
  return request<PhotoCardCategory>('/photo-card-categories', {
    method: 'POST',
    data: { name, parentId, coverImage },
  });
}

export async function updatePhotoCardCategory(
  id: number,
  name: string,
  coverImage?: string,
) {
  return request<PhotoCardCategory>(`/photo-card-categories/${id}`, {
    method: 'PUT',
    data: { name, coverImage },
  });
}

export async function deletePhotoCardCategory(id: number) {
  return request(`/photo-card-categories/${id}`, { method: 'DELETE' });
}

export async function updateCategorySortOrder(
  items: { id: number; sortOrder: number; parentId: number | null }[],
) {
  return request('/photo-card-categories/sort', { method: 'PUT', data: items });
}

// ─── 小卡 API ───

/** 分页响应 */
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getPhotoCards(params?: {
  categoryId?: number;
  categoryIds?: string;
  artistId?: number;
  artistIds?: string;
  page?: number;
  pageSize?: number;
}) {
  return request<PaginatedResponse<PhotoCardItem>>('/photo-cards', {
    method: 'GET',
    params,
  });
}

export async function createPhotoCard(data: CreatePhotoCardParams) {
  return request<PhotoCardItem>('/photo-cards', {
    method: 'POST',
    data,
  });
}

export async function deletePhotoCard(id: number) {
  return request(`/photo-cards/${id}`, { method: 'DELETE' });
}

export async function getPhotoCardDetail(id: number) {
  return request<PhotoCardItem>(`/photo-cards/${id}`);
}

export async function updatePhotoCard(
  id: number,
  data: Partial<CreatePhotoCardParams>,
) {
  return request<PhotoCardItem>(`/photo-cards/${id}`, {
    method: 'PUT',
    data,
  });
}

// ─── 批量新增 ───

/** 批量新增小卡参数（不含文件） */
export interface BatchCreateParams {
  name?: string;
  orientation?: string;
  categoryId?: number;
  artistId?: number;
  releaseDate?: string;
  remark?: string;
}

/** 批量创建结果 */
export interface BatchCreateResult {
  success: boolean;
  total: number;
  created: number;
  failed: number;
  errors?: string[];
  cards: PhotoCardItem[];
}

/** 批量新增小卡（上传 zip + 表单字段） */
export async function batchCreatePhotoCards(
  params: BatchCreateParams,
  fileUrl: string,
): Promise<BatchCreateResult> {
  return request('/photo-cards/batch', {
    method: 'POST',
    data: { ...params, fileUrl },
    timeout: 5 * 60 * 1000,
  });
}

// ─── 上传图片（返回原图 + 缩略图） ───
export async function uploadCardImage(
  file: File,
): Promise<{ url: string; thumbUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/upload/image-full', {
    method: 'POST',
    data: formData,
    requestType: 'form',
  });
}
