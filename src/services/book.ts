import request from '@/utils/request';

/** 获取遗笺列表 */
export async function getBookList(params?: {
  page?: number;
  pageSize?: number;
}) {
  return request('/books', { params });
}

/** 获取单本遗笺 */
export async function getBookDetail(id: number) {
  return request(`/books/${id}`);
}

/** 新增遗笺 */
export async function createBook(data: {
  title: string;
  author: string;
  category?: string;
  cover?: string;
  status?: string;
}) {
  return request('/books', {
    method: 'POST',
    data,
  });
}

/** 更新遗笺 */
export async function updateBook(
  id: number,
  data: {
    title?: string;
    author?: string;
    category?: string;
    cover?: string;
    status?: string;
  },
) {
  return request(`/books/${id}`, {
    method: 'PUT',
    data,
  });
}

/** 删除单本遗笺 */
export async function deleteBook(id: number) {
  return request(`/books/${id}`, {
    method: 'DELETE',
  });
}

/** 批量删除遗笺 */
export async function batchDeleteBooks(ids: number[]) {
  return request('/books/batch-delete', {
    method: 'POST',
    data: { ids },
  });
}

/** 批量设置遗笺 */
export async function batchUpdateBooks(
  ids: number[],
  data: {
    category?: string;
    status?: string;
  },
) {
  return request('/books/batch-update', {
    method: 'POST',
    data: { ids, ...data },
  });
}
