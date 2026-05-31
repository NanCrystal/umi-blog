import request from '@/utils/request';

export interface BannerItem {
  id: number;
  title: string | null;
  imageUrl: string[];
  mediaType: 'image' | 'video';
  linkUrl: string | null;
  position: string;
  terminal: string;
  status: 'active' | 'inactive';
  sortOrder: number;
  clickCount: number;
  startTime: string | null;
  endTime: string | null;
  artistId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BannerListResponse {
  list: BannerItem[];
  total: number;
}

export async function getBannerList(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  terminal?: string;
  position?: string;
  artistId?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.status) query.set('status', params.status);
  if (params?.terminal) query.set('terminal', params.terminal);
  if (params?.position) query.set('position', params.position);
  if (params?.artistId) query.set('artistId', params.artistId);

  return request<BannerListResponse>(`/banners?${query.toString()}`);
}

export async function getBannerDetail(id: number) {
  return request<BannerItem>(`/banners/${id}`);
}

export async function createBanner(data: {
  title?: string;
  imageUrl: string[];
  mediaType?: string;
  linkUrl?: string;
  position?: string;
  terminal?: string;
  status?: string;
  sortOrder?: number;
  startTime?: string;
  endTime?: string;
  artistId?: string;
}) {
  return request('/banners', {
    method: 'POST',
    data,
  });
}

export async function updateBanner(
  id: number,
  data: {
    title?: string;
    imageUrl?: string[];
    mediaType?: string;
    linkUrl?: string;
    position?: string;
    terminal?: string;
    status?: string;
    sortOrder?: number;
    startTime?: string;
    endTime?: string;
    artistId?: string;
  },
) {
  return request(`/banners/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteBanner(id: number) {
  return request(`/banners/${id}`, {
    method: 'DELETE',
  });
}

export async function batchDeleteBanner(ids: number[]) {
  return request('/banners/batch-delete', {
    method: 'POST',
    data: { ids },
  });
}

export async function updateBannerStatus(id: number, status: string) {
  return request(`/banners/${id}/status`, {
    method: 'PUT',
    data: { status },
  });
}

export async function updateBannerSortOrder(
  items: { id: number; sortOrder: number }[],
) {
  return request('/banners/sort/batch', {
    method: 'PUT',
    data: { items },
  });
}

export async function recordBannerClick(id: number) {
  return request(`/banners/${id}/click`, {
    method: 'POST',
  });
}
