import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { usePhotoStore } from '../store/usePhotoStore';

export interface AlbumManagerReturn {
  /** 系统相册列表（实时从系统加载） */
  albums: MediaLibrary.Album[];
  /** 可见相册 ID 集合（Set 格式，传给 AlbumTabBar） */
  visibleAlbumIdSet: Set<string>;
  /** 用户在管理弹窗确认后的回调 */
  onVisibleChange: (ids: Set<string>) => void;
  /** 手动刷新相册列表（如用户新增相册后） */
  refreshAlbums: () => void;
}

/**
 * 统一的相册管理 Hook
 *
 * 核心原则：Store 中的 visibleAlbumIds 是用户选择的唯一权威来源。
 * - 首次加载：store 为空 → 默认全选；store 有值 → 直接使用
 * - 后续加载/刷新：只更新 albums 列表，绝不覆盖用户选择
 * - 用户主动修改（点确定）：直接写入 store
 *
 * process 和 random 两个入口共用此 Hook，保证行为一致。
 */
export function useAlbumManager(): AlbumManagerReturn {
  const { visibleAlbumIds: storedVisibleIds, setVisibleAlbumIds: setStoredVisibleIds } = usePhotoStore();

  const [albums, setAlbums] = useState<MediaLibrary.Album[]>([]);
  const refreshCounter = useRef(0);
  /** 是否已完成首次初始化（防止 async 水合期间重复执行默认全选） */
  const initialized = useRef(false);

  /**
   * 加载系统相册列表
   *
   * 只负责两件事：
   * 1. 将系统相册写入 local state (albums)
   * 2. 首次加载时若 store 为空，则默认全选写入 store
   *
   * 绝不在后续调用中修改 store 的 visibleAlbumIds。
   */
  const loadAlbums = useCallback(async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== MediaLibrary.PermissionStatus.GRANTED) return;

      // @ts-ignore — includeSmart 在部分 expo-media-library 版本可用
      const result = await MediaLibrary.getAlbumsAsync({ includeSmart: false });
      const newAlbums = result as unknown as MediaLibrary.Album[];
      setAlbums(newAlbums);

      // 仅首次加载时处理默认值（async 水合完成后 storedVisibleIds 即为持久化值）
      if (!initialized.current) {
        initialized.current = true;
        if (storedVisibleIds.length === 0) {
          // 无缓存记录 → 默认全选
          setStoredVisibleIds(newAlbums.map(a => a.id));
        }
        // 有缓存 → 直接使用 store 中的值，不做任何修改
      }
    } catch {
      // 权限问题静默处理
    }
  }, [storedVisibleIds, setStoredVisibleIds]);

  // 组件挂载时 + refreshCounter 变化时重新加载相册列表
  useEffect(() => {
    let cancelled = false;
    loadAlbums().then(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
  }, [loadAlbums, refreshCounter.current]);

  /** 将数组转为 Set 供 AlbumTabBar 使用 */
  const visibleAlbumIdSet = useMemo(
    () => new Set(storedVisibleIds),
    [storedVisibleIds]
  );

  /** 用户在管理弹窗中确认选择后回调 — 直接写入 store */
  const handleVisibleChange = useCallback((ids: Set<string>) => {
    setStoredVisibleIds(Array.from(ids));
  }, [setStoredVisibleIds]);

  /** 外部触发刷新相册列表（仅重载 albums，不触碰可见性） */
  const refreshAlbums = useCallback(() => {
    refreshCounter.current += 1;
  }, []);

  return {
    albums,
    visibleAlbumIdSet,
    onVisibleChange: handleVisibleChange,
    refreshAlbums,
  };
}
