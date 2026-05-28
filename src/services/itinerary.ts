import request from '@/utils/request';

export interface ItineraryItem {
  id: number;
  user: string;
  title: string;
  location: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'ongoing' | 'completed' | 'cancelled';
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryListResponse {
  list: ItineraryItem[];
  total: number;
}

/** 获取当前登录用户 */
export function getCurrentUser(): string {
  return localStorage.getItem('user') || '';
}

export async function getItineraryList(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const user = getCurrentUser();
  const query = new URLSearchParams();
  query.set('user', user);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.status) query.set('status', params.status);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  return request<ItineraryListResponse>(`/itineraries?${query.toString()}`);
}

export async function getItineraryDetail(id: number) {
  return request<ItineraryItem>(`/itineraries/${id}`);
}

export async function createItinerary(data: {
  title: string;
  location: string;
  startTime: string;
  endTime: string;
  status?: string;
  description?: string;
}) {
  const user = getCurrentUser();
  return request('/itineraries', {
    method: 'POST',
    data: { ...data, user },
  });
}

export async function updateItinerary(
  id: number,
  data: {
    title?: string;
    location?: string;
    startTime?: string;
    endTime?: string;
    status?: string;
    description?: string;
  },
) {
  return request(`/itineraries/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteItinerary(id: number) {
  const user = getCurrentUser();
  return request(`/itineraries/${id}?user=${encodeURIComponent(user)}`, {
    method: 'DELETE',
  });
}

export async function batchDeleteItinerary(ids: number[]) {
  const user = getCurrentUser();
  return request('/itineraries/batch-delete', {
    method: 'POST',
    data: { ids, user },
  });
}
