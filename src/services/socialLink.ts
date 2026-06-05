import request from '@/utils/request';

// ─── 社交关联管理 ───

/** 关联媒体到帖子 */
export async function linkMedia(data: {
  socialPostId: number;
  mediaId: number;
  mediaType: 'PHOTO' | 'VIDEO';
  sortOrder?: number;
}) {
  return request('/social-links', { method: 'POST', data });
}

/** 取消关联 */
export async function unlinkMedia(data: {
  socialPostId: number;
  mediaId: number;
  mediaType: 'PHOTO' | 'VIDEO';
}) {
  return request('/social-links', { method: 'DELETE', data });
}

/** 批量关联（一条帖子关联多个媒体） */
export async function batchLinkMedia(data: {
  socialPostId: number;
  items: {
    mediaId: number;
    mediaType: 'PHOTO' | 'VIDEO';
    sortOrder?: number;
  }[];
}) {
  return request('/social-links/batch', { method: 'POST', data });
}

/** 查询帖子关联的所有媒体 */
export async function getPostMedia(socialPostId: number) {
  return request(`/social-posts/${socialPostId}/media`);
}

/** 查询照片关联的所有帖子 */
export async function getPhotoLinkedPosts(photoId: number) {
  return request(`/photos/${photoId}/linked-posts`);
}

/** 查询视频关联的所有帖子 */
export async function getVideoLinkedPosts(videoId: number) {
  return request(`/videos/${videoId}/linked-posts`);
}
