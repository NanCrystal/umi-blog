import request from '@/utils/request';

export async function getArticlesList() {
  return request('/articles');
}

export async function getArticlesDetail(id: number) {
  return request(`/articles/${id}`);
}

export async function createArticle(data: any) {
  return request('/articles', {
    method: 'POST',
    data,
  });
}

export async function updateArticle(id: number, data: any) {
  return request(`/articles/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteArticle(id: number) {
  return request(`/articles/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 上传封面图片，返回 { url: '/uploads/xxx.jpg' }
 */
export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/upload/image', {
    method: 'POST',
    data: formData,
    // umi-request 传 FormData 不能设置 Content-Type，让浏览器自动设置 boundary
    requestType: 'form',
  });
}
