import request from '@/utils/request';

/**
 * 上传视频文件
 */
export async function uploadVideoFile(
  file: File,
): Promise<{ url: string; key: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/upload/video', {
    method: 'POST',
    data: formData,
    requestType: 'form',
    timeout: 600000, // 视频上传较慢，设置 10 分钟超时
  });
}

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

/**
 * 上传压缩包（用于批量照片上传）
 */
export async function uploadZip(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/upload/zip', {
    method: 'POST',
    data: formData,
    requestType: 'form',
    timeout: 300000, // ZIP 包上传较慢，设置 5 分钟超时
  });
}
