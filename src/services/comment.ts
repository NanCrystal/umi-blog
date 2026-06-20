import request from '@/utils/request';

export interface CommentItem {
  id: number;
  content: string;
  userId: number;
  nickName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CommentListResult {
  data: CommentItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 获取留言列表（分页） */
export async function getCommentList(params?: {
  page?: number;
  pageSize?: number;
}) {
  return request<CommentListResult>('/comments', { params });
}

/** 获取单个留言详情 */
export async function getCommentDetail(id: number) {
  return request<CommentItem>(`/comments/${id}`);
}

/** 新增留言 */
export async function createComment(data: {
  content: string;
  userId?: number;
  nickName?: string;
  avatarUrl?: string;
}) {
  return request('/comments', { method: 'POST', data });
}

/** 更新留言 */
export async function updateComment(id: number, data: { content: string }) {
  return request(`/comments/${id}`, { method: 'PUT', data });
}

/** 删除留言 */
export async function deleteComment(id: number) {
  return request(`/comments/${id}`, { method: 'DELETE' });
}
