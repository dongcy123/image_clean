import { useState, useEffect, useCallback } from 'react';
import * as MediaLibrary from 'expo-media-library';

/** 默认目标展示数量（与 gallery 一致） */
const TARGET_COUNT = 300;

/** 每批获取数量 */
const BATCH_SIZE = 200;

/**
 * 统一的相册照片加载 Hook
 * - 自动请求相册权限
 * - 分页循环加载，多取补位确保过滤后接近 TARGET_COUNT
 * - 仅加载 photo 类型，按 creationTime 排序
 *
 * @example
 * ```ts
 * const { allPhotos, isLoading, albumTotalCount, loadPhotos } = usePhotoLoader({ includeTotalCount: true });
 * ```
 */
export function usePhotoLoader(options?: {
  /** mount 时自动加载（默认 true） */
  autoLoad?: boolean;
  /** 是否额外查询相册总照片数（首页需要展示） */
  includeTotalCount?: boolean;
}) {
  const { autoLoad = true, includeTotalCount = false } = options ?? {};

  const [allPhotos, setAllPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [albumTotalCount, setAlbumTotalCount] = useState(0);

  const loadPhotos = useCallback(async () => {
    try {
      setIsLoading(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;

      // 可选：查询相册总数量
      if (includeTotalCount) {
        const countRes = await MediaLibrary.getAssetsAsync({
          mediaType: 'photo',
          first: 0,
        });
        setAlbumTotalCount(countRes.totalCount);
      }

      // 多取一些来补偿已归档/已删除的空位
      const targetFetch = Math.max(TARGET_COUNT * 2, 600);
      let assets: MediaLibrary.Asset[] = [];
      let after: string | undefined;

      while (assets.length < targetFetch) {
        const res = await MediaLibrary.getAssetsAsync({
          first: Math.min(BATCH_SIZE, targetFetch - assets.length),
          after,
          sortBy: ['creationTime'],
          mediaType: 'photo',
        });
        assets = assets.concat(res.assets || []);
        if (!res.hasNextPage) break;
        after = res.endCursor;
      }

      setAllPhotos(assets);
    } catch (e) {
      console.error('usePhotoLoader: 加载相册失败', e);
    } finally {
      setIsLoading(false);
    }
  }, [includeTotalCount]);

  useEffect(() => {
    if (autoLoad) loadPhotos();
  }, [autoLoad, loadPhotos]);

  return { allPhotos, isLoading, albumTotalCount, loadPhotos };
}
