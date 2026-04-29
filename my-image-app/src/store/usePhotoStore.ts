import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { PhotoStatus, PhotoState } from '../utils/constants';

export const usePhotoStore = create<PhotoState>()(
  persist(
    (set, get) => ({
      photoMap: {}, // 确保默认为空对象
      albumAssignmentMap: {}, // photoId → albumId 归档映射
      visibleAlbumIds: [], // 相册 Tab 栏可见的相册 ID 列表（持久化）
      setPhotoStatus: (id, status) => {
        // 只有当 status 不是 NONE 时才记录，否则删除键值，保持 map 纯净
        set((state) => {
          const newMap = { ...state.photoMap };
          if (status === PhotoStatus.NONE) {
            delete newMap[id];
            // 同步清理归档映射
            const newAlbumMap = { ...state.albumAssignmentMap };
            delete newAlbumMap[id];
            return { photoMap: newMap, albumAssignmentMap: newAlbumMap };
          } else {
            newMap[id] = status;
            return { photoMap: newMap };
          }
        });
      },
      setAlbumAssignment: (photoId, albumId) => {
        set((state) => {
          const newAlbumMap = { ...state.albumAssignmentMap };
          if (albumId === null) {
            delete newAlbumMap[photoId];
          } else {
            newAlbumMap[photoId] = albumId;
          }
          return { albumAssignmentMap: newAlbumMap };
        });
      },
      commitAndClear: async () => {
        const { photoMap } = get();
        const pendingDeleteIds = Object.keys(photoMap).filter(id => photoMap[id] === PhotoStatus.PENDING_DELETE);
        if (pendingDeleteIds.length > 0) {
          try {
            await MediaLibrary.deleteAssetsAsync(pendingDeleteIds);
          } catch (e) {
            console.log("Delete cancelled or failed");
          }
        }
        // 仅移除已执行删除操作的记录，保留 PROCESSED（已处理/已保留）的状态
        set((state) => {
          const newMap = { ...state.photoMap };
          pendingDeleteIds.forEach((id) => delete newMap[id]);
          return { photoMap: newMap };
        });
      },
      clearAllStatus: () => set({ photoMap: {}, albumAssignmentMap: {} }), // 提供手动重置接口
      /**
       * 初始化：将纯保留（PROCESSED 无相册归属）的照片还原为未处理
       * 有相册归属的保持 PROCESSED 不变
       * @returns { resetCount: number } 被还原的照片数量
       */
      initializeProcessedPhotos: (): number => {
        const { photoMap, albumAssignmentMap } = get();
        const newPhotoMap = { ...photoMap };
        let resetCount = 0;

        Object.keys(newPhotoMap).forEach(id => {
          if (
            newPhotoMap[id] === PhotoStatus.PROCESSED &&
            !albumAssignmentMap[id]
          ) {
            delete newPhotoMap[id];
            resetCount++;
          }
        });

        set({ photoMap: newPhotoMap });
        return resetCount;
      },
      /** 更新可见相册 ID 集合 */
      setVisibleAlbumIds: (ids: string[]) => set({ visibleAlbumIds: ids }),
    }),
    {
      name: 'photo-butler-storage', // 尝试更换这个 key 名，可以强制重置本地缓存
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);