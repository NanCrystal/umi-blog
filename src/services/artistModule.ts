import request from '@/utils/request';

// 艺人模块配置项
export interface ArtistModuleConfig {
  id: number;
  name: string;
  key: string;
  description: string | null;
  image: string | null;
  enabled: boolean;
  sortOrder: number;
  status: number;
  hasConfig: boolean; // 是否有艺人级别的配置（非默认值）
}

// 保存模块配置的请求体
export interface SaveArtistModulesPayload {
  modules: {
    moduleId: number;
    sortOrder: number;
    status: number; // 1=启用, 0=禁用
  }[];
}

/** 获取艺人的所有模块配置 */
export async function getArtistModules(artistId: number) {
  return request<ArtistModuleConfig[]>(
    `/app-modules/artists/${artistId}/modules`,
  );
}

/** 批量保存艺人的模块配置（启用/禁用 + 排序） */
export async function saveArtistModules(
  artistId: number,
  data: SaveArtistModulesPayload,
) {
  return request(`/app-modules/artists/${artistId}/modules/sort`, {
    method: 'PUT',
    data,
  });
}
