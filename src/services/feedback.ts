import request from '@/utils/request';

export interface FeedbackUser {
  id: number;
  nickName: string | null;
  avatarUrl: string | null;
}

export interface FeedbackItem {
  id: number;
  userId: number;
  user: FeedbackUser;
  type: string;
  description: string;
  image: string | null;
  contact: string | null;
  status: 'unresolved' | 'resolved';
  resolveResult: string | null;
  resolveContent: string | null;
  resolveImage: string | null;
  resolveRemark: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackListResponse {
  list: FeedbackItem[];
  total: number;
}

export async function getFeedbackList(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.status) query.set('status', params.status);

  return request<FeedbackListResponse>(`/feedback?${query.toString()}`);
}

export async function getFeedbackDetail(id: number) {
  return request<FeedbackItem>(`/feedback/${id}`);
}

export async function updateFeedback(
  id: number,
  data: {
    type?: string;
    description?: string;
    image?: string;
    contact?: string;
    status?: string;
  },
) {
  return request(`/feedback/${id}`, { method: 'PUT', data });
}

export async function deleteFeedback(id: number) {
  return request(`/feedback/${id}`, { method: 'DELETE' });
}

export async function resolveFeedback(
  id: number,
  data: {
    resolveResult: string;
    resolveContent?: string;
    resolveImage?: string;
    resolveRemark?: string;
    resolvedBy: string;
  },
) {
  return request(`/feedback/${id}/resolve`, { method: 'PUT', data });
}
