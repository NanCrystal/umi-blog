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

/** 创建导入任务（上传 zip + 元数据）
 *  返回 { promise, abort }，promise 为请求结果，abort() 可取消上传 */
export function createImportTask(data: {
  name: string;
  file: File;
  type?: string;
  onProgress?: (percent: number) => void;
}) {
  const formData = new FormData();
  formData.append('file', data.file);
  formData.append('name', data.name);
  if (data.type) formData.append('type', data.type);

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
