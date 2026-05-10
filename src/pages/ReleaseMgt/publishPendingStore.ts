/**
 * 小红书发布任务本地状态
 * 点击发布时立即插入一条"审核中"记录到列表，无需等待后端返回
 */

export type PlatformType = 'xiaohongshu' | 'douyin';

export interface PendingPublishItem {
  tempId: string;
  platform: PlatformType;
  wallpaperId: number;
  wallpaper?: any;
  title: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
}

let pendingItems: PendingPublishItem[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

/** 添加一条待发布记录（点击发布时立即调用） */
export function addPendingPublish(
  item: Omit<PendingPublishItem, 'status' | 'createdAt'>,
): PendingPublishItem {
  const record: PendingPublishItem = {
    ...item,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  pendingItems = [record, ...pendingItems];
  notify();
  return record;
}

/** 更新某条待发布记录的状态（发布接口返回时调用） */
export function updatePendingPublish(
  tempId: string,
  updates: Partial<Pick<PendingPublishItem, 'status' | 'errorMessage'>>,
) {
  pendingItems = pendingItems.map((item) =>
    item.tempId === tempId ? { ...item, ...updates } : item,
  );
  notify();
}

/** 移除某条待发布记录（已被后端正式记录替代时调用） */
export function removePendingPublish(tempId: string) {
  pendingItems = pendingItems.filter((i) => i.tempId !== tempId);
  notify();
}

/** 获取当前所有待发布记录 */
export function getPendingPublishes(): PendingPublishItem[] {
  return [...pendingItems];
}

/** 订阅状态变化 */
export function subscribePendingPublish(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
