import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Text, StyleSheet } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as C from '../../src/utils/colors';
import { useRouter, useFocusEffect } from 'expo-router';
import { usePhotoLoader } from '../../src/hooks/usePhotoLoader';
import { useSessionProcessor } from '../../src/hooks/useSessionProcessor';
import ProcessView from '../../src/components/ProcessView';
import { usePhotoStore } from '../../src/store/usePhotoStore';

/**
 * 随机模式入口的处理页
 * - 每次进入 tab 重新加载照片并随机选起点
 * - 完成后回到首页（replace）
 * - 显示"已完成"末尾提示
 */

/** 内部组件：接收 allPhotos 后构建 processor + 渲染 UI */
function RandomInner({
  allPhotos,
  isLoading,
  albums,
  visibleAlbumIds,
  onVisibleChange,
}: {
  allPhotos: ReturnType<typeof usePhotoLoader>['allPhotos'];
  isLoading: boolean;
  albums: MediaLibrary.Album[];
  visibleAlbumIds: Set<string>;
  onVisibleChange: (ids: Set<string>) => void;
}) {
  const router = useRouter();

  // 从过滤后的列表中随机取起点
  const randomIndex = allPhotos.length > 0
    ? Math.floor(Math.random() * Math.min(allPhotos.length, 300))
    : 0;

  const processor = useSessionProcessor({
    allPhotos,
    initialIndex: randomIndex,
    onFinish: () => router.replace('/'),
  });

  // 是否到达末尾
  const isAtEnd = processor.totalCount > 0 && processor.currentIndex >= processor.totalCount - 1;

  return (
    <ProcessView
      isLoading={isLoading}
      processor={processor}
      onBack={processor.handleBack}
      onDone={processor.showCommitConfirm}
      loadingText="随机选取中..."
      backBtnText="返回首页"
      navExtra={
        isAtEnd ? (
          <Text style={s.finishedText}>已完成</Text>
        ) : undefined
      }
      albumBar={
        albums.length > 0
          ? {
              albums,
              visibleAlbumIds,
              onAlbumPress: processor.assignToAlbum,
              onVisibleChange,
            }
          : undefined
      }
    />
  );
}

/** 包装组件：通过 key 机制实现 focus 时完整重置会话状态 */
export default function RandomMode() {
  const { allPhotos, isLoading, loadPhotos } = usePhotoLoader({ autoLoad: false });
  const [sessionKey, setSessionKey] = useState(0);
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
        // 静默处理
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setStoredVisibleIds]);

  /** 将数组转为 Set 传给 AlbumTabBar */
  const visibleAlbumIdSet = useMemo(() => new Set(storedVisibleIds), [storedVisibleIds]);

  // 每次 tab 获得焦点时：重新加载相册 + 重置会话（key 变化 → RandomInner 重新挂载）
  useFocusEffect(
    useCallback(() => {
      setSessionKey(k => k + 1);
      loadPhotos();
      return undefined;
    }, [loadPhotos])
  );

  return <RandomInner key={sessionKey} allPhotos={allPhotos} isLoading={isLoading} albums={albums} visibleAlbumIds={visibleAlbumIdSet} onVisibleChange={(ids) => setStoredVisibleIds(Array.from(ids))} />;
}

const s = StyleSheet.create({
  finishedText: {
    color: C.success,
    fontSize: 14,
    fontStyle: 'italic',
  },
});
