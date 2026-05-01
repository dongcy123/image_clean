import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePhotoLoader } from '../src/hooks/usePhotoLoader';
import { useSessionProcessor } from '../src/hooks/useSessionProcessor';
import { useAlbumManager } from '../src/hooks/useAlbumManager';
import ProcessView from '../src/components/ProcessView';

/**
 * 相册入口的处理页
 * 从首页点击某张照片进入，startIndex 由路由参数传入
 */
export default function Process() {
  const router = useRouter();
  const { startIndex } = useLocalSearchParams();

  const { allPhotos, isLoading } = usePhotoLoader();
  const { albums, visibleAlbumIdSet, onVisibleChange } = useAlbumManager();

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
              onVisibleChange,
            }
          : undefined
      }
    />
  );
}
