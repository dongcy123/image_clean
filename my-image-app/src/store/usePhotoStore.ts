import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { PhotoStatus, PhotoState } from '../utils/constants';

export const usePhotoStore = create<PhotoState>()(
  persist(
    (set, get) => ({
      photoMap: {}, // 确保默认为空对象
      setPhotoStatus: (id, status) => {
        // 只有当 status 不是 NONE 时才记录，否则删除键值，保持 map 纯净
        set((state) => {
          const newMap = { ...state.photoMap };
          if (status === PhotoStatus.NONE) {
            delete newMap[id];
          } else {
            newMap[id] = status;
          }
          return { photoMap: newMap };
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
      clearAllStatus: () => set({ photoMap: {} }), // 提供手动重置接口
    }),
    {
      name: 'photo-butler-storage', // 尝试更换这个 key 名，可以强制重置本地缓存
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);