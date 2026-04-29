export enum PhotoStatus {
  NONE = 'NONE',               // 无状态
  UNPROCESSED = 'UNPROCESSED', // 未处理
  PROCESSED = 'PROCESSED',     // 已处理（保留/归档）
  PENDING_KEEP = 'PENDING_KEEP',   // 待保留（中间态，process页内）
  PENDING_DELETE = 'PENDING_DELETE' // 待删除（中间态，process页内）
}

export interface PhotoItem {
  id: string;
  uri: string;
  width: number;
  height: number;
  creationTime: number;
  status: PhotoStatus;
}

export interface PhotoState {
  photoMap: Record<string, PhotoStatus>;
  /** 照片 → 相册ID 的归档映射（仅 PROCESSED 且已归档的照片） */
  albumAssignmentMap: Record<string, string>;
  /** 相册 Tab 栏可见的相册 ID 列表（持久化，跨页面保持选择状态） */
  visibleAlbumIds: string[];
  setPhotoStatus: (id: string, status: PhotoStatus) => void;
  setAlbumAssignment: (photoId: string, albumId: string | null) => void;
  commitAndClear: () => Promise<void>;
  clearAllStatus: () => void;
  /** 初始化：将纯保留（无相册归属）的 PROCESSED 照片还原为未处理，返回还原数量 */
  initializeProcessedPhotos: () => number;
  /** 更新可见相册ID集合 */
  setVisibleAlbumIds: (ids: string[]) => void;
}

export const STORAGE_KEYS = {
  PHOTO_STORE: 'photo-butler-storage',
} as const;