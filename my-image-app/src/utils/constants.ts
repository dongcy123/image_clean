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
  setPhotoStatus: (id: string, status: PhotoStatus) => void;
  commitAndClear: () => Promise<void>;
  clearAllStatus: () => void;
}

export const STORAGE_KEYS = {
  PHOTO_STORE: 'photo-butler-storage',
} as const;