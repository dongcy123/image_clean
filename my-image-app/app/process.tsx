import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { usePhotoLoader } from '../src/hooks/usePhotoLoader';
import { useSessionProcessor } from '../src/hooks/useSessionProcessor';
import ProcessView from '../src/components/ProcessView';
import { usePhotoStore } from '../src/store/usePhotoStore';

/**
 * 相册入口的处理页
 * 从首页点击某张照片进入，startIndex 由路由参数传入
 */
export default function Process() {
  const router = useRouter();
  const { startIndex } = useLocalSearchParams();

  const { allPhotos, isLoading } = usePhotoLoader();
  const { visibleAlbumIds: storedVisibleIds, setVisibleAlbumIds: setStoredVisibleIds } = usePhotoStore();

  /** 相册列表（用于归档 Tab 栏） */
  const [albums, setAlbums] = useState<MediaLibrary.Album[]>([]);
  /** 标记是否已完成初始化（防止 onVisibleChange 更新 store 后循环触发 useEffect） */
  const initialized = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === MediaLibrary.PermissionStatus.GRANTED) {
          // @ts-ignore — includeSmart 在部分 expo-media-library 版本可用
          const result = await MediaLibrary.getAlbumsAsync({ includeSmart: false });
          if (!cancelled) {
            const newAlbums = result as unknown as MediaLibrary.Album[];
            setAlbums(newAlbums);

            if (!initialized.current) {
              // 首次加载：智能合并已有选择 + 自动追加新相册
              initialized.current = true;
              if (storedVisibleIds.length > 0) {
                const existingSet = new Set(storedVisibleIds);
                const merged = [...storedVisibleIds];
                newAlbums.forEach(a => {
                  if (!existingSet.has(a.id)) {
                    merged.push(a.id); // 新相册自动加入可见列表
                  }
                });
                setStoredVisibleIds(merged);
              } else {
                // 首次且无缓存，默认全选
                setStoredVisibleIds(newAlbums.map(a => a.id));
              }
            }
          }
        }
      } catch {
        // 权限问题静默处理
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setStoredVisibleIds]);

  /** 将数组转为 Set 传给 AlbumTabBar */
  const visibleAlbumIdSet = useMemo(() => new Set(storedVisibleIds), [storedVisibleIds]);

  const processor = useSessionProcessor({
    allPhotos,
    initialIndex: startIndex ? parseInt(startIndex as string, 10) : undefined,
    onFinish: () => router.back(),
  });

  return (
    <ProcessView
      isLoading={isLoading}
      processor={processor}
      onBack={processor.handleBack}
      onDone={processor.showCommitConfirm}
      loadingText="读取相册中..."
      backBtnText="返回"
      albumBar={
        albums.length > 0
          ? {
              albums,
              visibleAlbumIds: visibleAlbumIdSet,
              onAlbumPress: processor.assignToAlbum,
              onVisibleChange: (ids) => setStoredVisibleIds(Array.from(ids)),
            }
          : undefined
      }
    />
  );
}
