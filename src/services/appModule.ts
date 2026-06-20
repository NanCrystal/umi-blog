import request from '@/utils/request';

export interface ArtistItem {
  id: number;
  name: string;
  artistId: string;
}

export interface AppModuleItem {
  id: number;
  name: string;
  key: string;
  description: string | null;
  image: string | null;
  type: string;
  sortOrder: number;
  status: number;
  artistIds: ArtistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AppModuleListResponse {
  list: AppModuleItem[];
  total: number;
}

export async function getAppModuleList(params?: {
  page?: number;
  pageSize?: number;
  status?: number;
  keyword?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.status !== undefined) query.set('status', String(params.status));
  if (params?.keyword) query.set('keyword', params.keyword);
  return request<AppModuleListResponse>(`/app-modules?${query.toString()}`);
}

export async function getAppModuleDetail(id: number) {
  return request<AppModuleItem>(`/app-modules/${id}`);
}

export async function createAppModule(data: {
  name: string;
  key: string;
  description?: string;
  image?: string;
  sortOrder?: number;
  status?: number;
  artistIds?: number[];
}) {
  return request('/app-modules', { method: 'POST', data });
}

export async function updateAppModule(
  id: number,
  data: {
    name?: string;
    key?: string;
    description?: string;
    image?: string;
    sortOrder?: number;
    status?: number;
    artistIds?: number[];
  },
) {
  return request(`/app-modules/${id}`, { method: 'PUT', data });
}

export async function deleteAppModule(id: number) {
  return request(`/app-modules/${id}`, { method: 'DELETE' });
}

export async function batchDeleteAppModule(ids: number[]) {
  return request('/app-modules/batch-delete', {
    method: 'POST',
    data: { ids },
  });
}

export async function updateAppModuleStatus(id: number, status: number) {
  return request(`/app-modules/${id}/status`, {
    method: 'PUT',
    data: { status },
  });
}
