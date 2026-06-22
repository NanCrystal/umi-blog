import request from '@/utils/request';

/** 获取导入任务列表 */
export async function getImportTaskList(params?: {
  page?: number;
  pageSize?: number;
}) {
  return request('/import-tasks', { params });
}

/** 获取单个导入任务 */
export async function getImportTaskDetail(id: number) {
  return request(`/import-tasks/${id}`);
}

/** 获取七牛上传凭证（前端直传用） */
export async function getQiniuUploadToken() {
  return request('/import-tasks/upload-token');
}

/**
 * 前端直传七牛（绕过 VPS，走国内节点）
 * 返回 { promise, abort }，promise resolve 为 { key: string }
 */
export function uploadToQiniuDirect(
  file: File,
  token: string,
  uploadUrl: string,
  onProgress?: (percent: number) => void,
): { promise: Promise<{ key: string }>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const key = `uploads/import-tasks/${Date.now()}-${Math.round(
    Math.random() * 1e6,
  )}-${file.name}`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('token', token);
  formData.append('key', key);

  const promise = new Promise<{ key: string }>((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.key) {
            resolve({ key: res.key });
          } else {
            reject(new Error('上传成功但未返回文件 key'));
          }
        } catch {
          reject(new Error('解析上传响应失败'));
        }
      } else {
        let errMsg = '七牛上传失败';
        try {
          const res = JSON.parse(xhr.responseText);
          errMsg = res?.error || res?.message || errMsg;
        } catch {
          /* ignore */
        }
        reject(new Error(errMsg));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('网络错误')));
    xhr.addEventListener('abort', () => reject(new Error('上传已取消')));

    xhr.open('POST', uploadUrl);
    xhr.send(formData);
  });

  return {
    promise,
    abort: () => xhr.abort(),
  };
}

/** 前端直传完成后通知后端创建任务 */
export async function notifyQiniuUploadComplete(data: {
  name: string;
  qiniuKey: string;
  fileSize: number;
  artistId?: string;
  artistName?: string;
  type?: string;
}) {
  return request('/import-tasks/from-qiniu', {
    method: 'POST',
    data,
  });
}

/** 创建导入任务（上传 zip + 元数据）
 *  返回 { promise, abort }，promise 为请求结果，abort() 可取消上传 */
export function createImportTask(data: {
  name: string;
  file: File;
  type?: string;
  artistId?: string;
  artistName?: string;
  onProgress?: (percent: number) => void;
}) {
  const formData = new FormData();
  formData.append('file', data.file);
  formData.append('name', data.name);
  if (data.type) formData.append('type', data.type);
  if (data.artistId) formData.append('artistId', data.artistId);
  if (data.artistName) formData.append('artistName', data.artistName);

  const xhr = new XMLHttpRequest();

  const promise = new Promise<any>((resolve, reject) => {
    const token = localStorage.getItem('token');

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        data.onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve(xhr.responseText);
        }
      } else {
        let errMsg = '上传失败';
        try {
          const res = JSON.parse(xhr.responseText);
          errMsg = res?.message || res?.error || errMsg;
        } catch {
          /* ignore */
        }
        reject(new Error(errMsg));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('网络错误')));
    xhr.addEventListener('abort', () => reject(new Error('上传已取消')));

    xhr.open('POST', '/api/import-tasks');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });

  return {
    promise,
    abort: () => xhr.abort(),
  };
}

/** 更新导入任务 */
export async function updateImportTask(
  id: number,
  data: {
    name?: string;
    artistId?: string;
    artistName?: string;
    type?: string | null;
  },
) {
  return request(`/import-tasks/${id}`, {
    method: 'PUT',
    data,
  });
}

/** 删除单个导入任务 */
export async function deleteImportTask(id: number) {
  return request(`/import-tasks/${id}`, {
    method: 'DELETE',
  });
}

/** 重新处理导入任务（更新已存在记录的艺人/平台信息） */
export async function reprocessImportTask(id: number) {
  return request(`/import-tasks/${id}/reprocess`, {
    method: 'POST',
  });
}

/** 批量删除导入任务 */
export async function batchDeleteImportTasks(ids: number[]) {
  return request('/import-tasks/batch-delete', {
    method: 'POST',
    data: { ids },
  });
}

/** 通过后端代理下载导入任务的 ZIP 文件 */
export function downloadImportTask(id: number, filename: string): void {
  const token = localStorage.getItem('token');
  const xhr = new XMLHttpRequest();
  xhr.open('GET', `/api/import-tasks/${id}/download`);
  if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.responseType = 'blob';

  xhr.addEventListener('load', () => {
    if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
      const blob = new Blob([xhr.response], { type: 'application/zip' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  });

  xhr.send();
}
