import { useState, useEffect, useCallback } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { usePhotoStore } from '../store/usePhotoStore';

export const useMediaSync = () => {
  const [unprocessedPhotos, setUnprocessedPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // 订阅 Zustand 仓库中的照片状态字典
  const photoMap = usePhotoStore((state) => state.photoMap);

  const loadPhotos = useCallback(async () => {
    // 1. 获取权限
    const { status } = await MediaLibrary.requestPermissionsAsync();
    setHasPermission(status === 'granted');
    if (status !== 'granted') return;

    try {
      // 2. 读取最近的 100 张照片（为了测试流畅度，先限定数量）
      const { assets } = await MediaLibrary.getAssetsAsync({
        first: 100,
        sortBy: ['creationTime'],
        mediaType: ['photo'],
      });

      // 3. 核心过滤逻辑：只保留字典中“没有记录”的照片
      const filtered = assets.filter(asset => !photoMap[asset.id]);
      
      setUnprocessedPhotos(filtered);
    } catch (error) {
      console.error("相册同步失败:", error);
    }
  }, [photoMap]); // 关键：当 photoMap 发生变化时，重新执行过滤

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  return { unprocessedPhotos, hasPermission, reload: loadPhotos };
};