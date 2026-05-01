import React, { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import * as C from '../../src/utils/colors';
import { usePhotoLoader } from '../../src/hooks/usePhotoLoader';
import { useSessionProcessor } from '../../src/hooks/useSessionProcessor';
import { useAlbumManager } from '../../src/hooks/useAlbumManager';
import ProcessView from '../../src/components/ProcessView';

/**
 * 随机模式入口的处理页
 * - 每次进入 tab 重新加载照片并随机选起点
 * - 完成后回到首页（replace）
 * - 显示"已完成"末尾提示
 */

/** 内部组件：接收数据后构建 processor + 渲染 UI */
function RandomInner({
  allPhotos,
  isLoading,
  albums,
  visibleAlbumIds,
  onVisibleChange,
}: {
  allPhotos: ReturnType<typeof usePhotoLoader>['allPhotos'];
  isLoading: boolean;
  albums: ReturnType<typeof useAlbumManager>['albums'];
  visibleAlbumIds: ReturnType<typeof useAlbumManager>['visibleAlbumIdSet'];
  onVisibleChange: ReturnType<typeof useAlbumManager>['onVisibleChange'];
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
  const { albums, visibleAlbumIdSet, onVisibleChange, refreshAlbums } = useAlbumManager();

  // 每次 tab 获得焦点时：刷新相册 + 重置会话
  useFocusEffect(
    useCallback(() => {
      setSessionKey(k => k + 1);
      loadPhotos();
      refreshAlbums(); // 每次进入都刷新相册列表，确保新增相册可见
      return undefined;
    }, [loadPhotos, refreshAlbums])
  );

  return <RandomInner key={sessionKey} allPhotos={allPhotos} isLoading={isLoading} albums={albums} visibleAlbumIds={visibleAlbumIdSet} onVisibleChange={onVisibleChange} />;
}

const s = StyleSheet.create({
  finishedText: {
    color: C.success,
    fontSize: 14,
    fontStyle: 'italic',
  },
});
