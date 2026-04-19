import request from '@/utils/request';

/**
 * 上传图片（包含原图和缩略图）
 */
export async function uploadImageFull(
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
