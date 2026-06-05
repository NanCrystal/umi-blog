/**
 * 视频标签服务
 * 标签表与照片共用 PhotoType / PhotoLocation / PhotoPlatform，
 * 此处仅做别名导出，方便 VideoMgt 页面语义化调用。
 */
export {
  getPhotoTypes as getVideoTypes,
  createPhotoType as createVideoType,
  updatePhotoType as updateVideoType,
  deletePhotoType as deleteVideoType,
  updateTypeSortOrder as updateVideoTypeSortOrder,
  getPhotoLocations as getVideoLocations,
  createPhotoLocation as createVideoLocation,
  updatePhotoLocation as updateVideoLocation,
  deletePhotoLocation as deleteVideoLocation,
  updateLocationSortOrder as updateVideoLocationSortOrder,
  getPhotoPlatforms as getVideoPlatforms,
  createPhotoPlatform as createVideoPlatform,
  updatePhotoPlatform as updateVideoPlatform,
  deletePhotoPlatform as deleteVideoPlatform,
  updatePlatformSortOrder as updateVideoPlatformSortOrder,
} from './photoTag';
