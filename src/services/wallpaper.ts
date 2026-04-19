import request from '@/utils/request';

export interface WallPaperImage {
  id?: number;
  url: string;
  thumbUrl: string;
}

export interface WallPaperItem {
  id: number;
  title: string;
  cover: string;
  images: WallPaperImage[];
  createdAt: string;
  updatedAt: string;
}

export async function getWallPaperList() {
  return request('/wallpapers');
}

export async function getWallPaperDetail(id: number) {
  return request(`/wallpapers/${id}`);
}

export async function createWallPaper(data: any) {
  return request('/wallpapers', {
    method: 'POST',
    data,
  });
}

export async function updateWallPaper(id: number, data: any) {
  return request(`/wallpapers/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteWallPaper(id: number) {
  return request(`/wallpapers/${id}`, {
    method: 'DELETE',
  });
}
