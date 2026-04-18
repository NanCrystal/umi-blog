import request from '@/utils/request';

export async function getComments() {
  return request('/comments');
}

export async function createComment(data: { content: string }) {
  return request('/comments', { method: 'POST', data });
}

export async function deleteComment(id: number) {
  return request(`/comments/${id}`, { method: 'DELETE' });
}
