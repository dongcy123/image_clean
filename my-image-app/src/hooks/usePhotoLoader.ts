import { useState, useEffect, useCallback, useRef } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { usePhotoStore } from '../store/usePhotoStore';

/** 默认目标展示数量 */
const DEFAULT_TARGET_DISPLAY = 300;

/** 每批获取数量 */
const BATCH_SIZE = 200;

/**
 * 统一的相册照片加载 Hook
 * - 自动请求相册权限
 * - 自动补位：确保过滤后的未处理照片始终 >= targetDisplayCount
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
  /** 过滤后需要保持的目标数量（默认 300） */
  targetDisplayCount?: number;
}) {
  const { autoLoad = true, includeTotalCount = false, targetDisplayCount = DEFAULT_TARGET_DISPLAY } = options ?? {};
  const { photoMap } = usePhotoStore();

  const [allPhotos, setAllPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [albumTotalCount, setAlbumTotalCount] = useState(0);
  /** 当前已加载到的游标位置 */
  const [afterCursor, setAfterCursor] = useState<string | undefined>();
  /** 是否已加载完所有照片 */
  const [hasMore, setHasMore] = useState(true);
  /** 防止重复触发追加 */
  const appendingRef = useRef(false);

  /**
   * 从头加载照片列表
   *
   * 加载策略：尽量多取，但遇到以下条件提前停止：
   * - 未处理照片数已达目标的 2 倍（足够应对后续处理消耗）
   * - 相册已全部取完
   */
  const loadPhotos = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasMore(true);
      setAfterCursor(undefined);

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

      // 每次重新从头加载（确保数据一致性）
      let assets: MediaLibrary.Asset[] = [];
      let after: string | undefined;
      let localHasMore = true;

      while (localHasMore) {
        const res = await MediaLibrary.getAssetsAsync({
          first: BATCH_SIZE,
          after,
          sortBy: ['creationTime'],
          mediaType: 'photo',
        });
        assets = assets.concat(res.assets || []);

        // 提前终止：未处理量已充足则不再继续加载
        const unprocessedCount = assets.filter(a => !photoMap[a.id]).length;
        if (unprocessedCount >= targetDisplayCount * 2) break;

        if (!res.hasNextPage) {
          localHasMore = false;
          break;
        }
        after = res.endCursor;
      }

      setHasMore(localHasMore);
      setAfterCursor(after);
      setAllPhotos(assets);
    } catch (e) {
      console.error('usePhotoLoader: 加载相册失败', e);
    } finally {
      setIsLoading(false);
    }
  }, [includeTotalCount, targetDisplayCount, photoMap]);

  /**
   * 追加更多照片用于补位
   * 由内部 useEffect 自动触发，无需外部手动调用
   */
  const loadMorePhotos = useCallback(async () => {
    if (!hasMore || isLoading || appendingRef.current) return;
    appendingRef.current = true;

    try {
      setIsLoading(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;

      let newAssets: MediaLibrary.Asset[] = [];
      let after = afterCursor;
      let localHasMore: boolean = hasMore;

      while (localHasMore) {
        const res = await MediaLibrary.getAssetsAsync({
          first: BATCH_SIZE,
          after,
          sortBy: ['creationTime'],
          mediaType: 'photo',
        });
        newAssets = newAssets.concat(res.assets || []);

        // 同样提前终止检查
        const combined = [...allPhotos, ...newAssets];
        const unprocessedCount = combined.filter(a => !photoMap[a.id]).length;
        if (unprocessedCount >= targetDisplayCount * 1.5) break;

        if (!res.hasNextPage) {
          localHasMore = false;
          break;
        }
        after = res.endCursor;
      }

      if (newAssets.length > 0) {
        setHasMore(localHasMore);
        setAfterCursor(after);
        setAllPhotos(prev => [...prev, ...newAssets]);
      }
    } catch (e) {
      console.error('usePhotoLoader: 追加加载失败', e);
    } finally {
      setIsLoading(false);
      appendingRef.current = false;
    }
  }, [afterCursor, hasMore, isLoading, allPhotos, targetDisplayCount, photoMap]);

  // ---- 核心：自动补位 ----
  // 当过滤后的未处理照片不足目标值时，自动追加加载
  const availableCount = allPhotos.filter(p => !photoMap[p.id]).length;

  useEffect(() => {
    if (!isLoading && availableCount < targetDisplayCount && hasMore && !appendingRef.current) {
      loadMorePhotos();
    }
  }, [availableCount, targetDisplayCount, hasMore, isLoading, loadMorePhotos]);

  // mount 时自动加载
  useEffect(() => {
    if (autoLoad) loadPhotos();
  }, [autoLoad, loadPhotos]);

  return { allPhotos, isLoading, albumTotalCount, loadPhotos, loadMorePhotos };
}
