import request from '@/utils/request';

// ─── 原有接口（保持兼容，小文件仍可用） ───

/**
 * 上传视频文件（原始单次上传，适合小文件<100MB）
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

// ═══════════════════════════════════════
// 🚀 分片上传接口（支持500MB~2GB大文件）
// ═══════════════════════════════════════

/** 上传会话信息 */
export interface VideoUploadSession {
  sessionId: string;
  totalParts: number;
  partSize: number;
  fileName: string;
  fileSize: number;
}

/** 分片上传结果 */
export interface ChunkResult {
  partNumber: number;
  uploaded: boolean;
}

/** 会话状态 */
export interface SessionStatus {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedParts: number[];
  totalParts: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  createdAt: string;
}

/** 创建分片上传会话 */
export async function createVideoUploadSession(
  fileName: string,
  fileSize: number,
): Promise<VideoUploadSession> {
  return request('/upload/video/session', {
    method: 'POST',
    data: { fileName, fileSize },
  });
}

/** 上传单个分片 */
export async function uploadVideoChunk(
  sessionId: string,
  partNumber: number,
  chunk: Blob,
): Promise<ChunkResult> {
  const formData = new FormData();
  formData.append('chunk', chunk);
  return request(
    `/upload/video/chunk?sessionId=${sessionId}&partNumber=${partNumber}`,
    {
      method: 'POST',
      data: formData,
      requestType: 'form',
      timeout: 30000, // 单片30s超时（前端有3次重试兜底）
    },
  );
}

/** 完成分片上传合并 */
export async function completeVideoUpload(
  sessionId: string,
): Promise<{ url: string; key: string }> {
  return request('/upload/video/complete', {
    method: 'POST',
    data: { sessionId },
  });
}

/** 查询上传进度 */
export async function getUploadSessionStatus(
  sessionId: string,
): Promise<SessionStatus | { error: string }> {
  return request(`/upload/video/status/${sessionId}`);
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
    timeout: 120000, // 图片上传设置 2 分钟超时
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

// ═══════════════════════════════════════
// 🔥 前端直传七牛（大文件 >= 50MB）
// ═══════════════════════════════════════

/** 直传凭证（含 persistentOps 自动触发 PFOP） */
export interface DirectUploadToken {
  token: string;
  key: string;
  uploadUrl: string;
  policy: {
    persistentOps: string;
    persistentNotifyUrl?: string;
  };
}

/** 直传完成通知结果 */
export interface NotifyDirectUploadResult {
  id: number;
  status: string;
  message: string;
}

/** 获取前端直传七牛的凭证 */
export async function getDirectUploadToken(
  fileName: string,
  fileSize: number,
): Promise<DirectUploadToken> {
  return request('/upload/video/direct-token', {
    method: 'POST',
    data: { fileName, fileSize },
  });
}

/** 直传完成后通知后端入库 */
export async function notifyDirectUpload(data: {
  qiniuKey: string;
  fileName: string;
  size?: number;
  artistId?: string;
  coverUrl?: string;
  mimeType?: string;
  shootDate?: string;
  tagTypeId?: number;
  tagLocationId?: number;
  tagPlatformId?: number;
  itineraryId?: number;
  description?: string;
  title?: string;
}): Promise<NotifyDirectUploadResult> {
  return request('/upload/video/notify-direct-upload', {
    method: 'POST',
    data,
  });
}
