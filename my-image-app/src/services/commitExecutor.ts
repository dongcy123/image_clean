import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';
import type { ClassifiedMarks } from '../utils/commitUtils';

/**
 * 执行系统级的照片批量操作
 * - 删除：调用 MediaLibrary.deleteAssetsAsync
 * - 归档：按相册分组后调用 MediaLibrary.addAssetsToAlbumAsync
 *
 * @returns 是否全部成功
 */
export async function executeSystemOperations(marks: ClassifiedMarks): Promise<boolean> {
  let success = true;

  // 1. 删除
  if (marks.deleteIds.length > 0) {
    try {
      await MediaLibrary.deleteAssetsAsync(marks.deleteIds);
    } catch (e) {
      console.log('部分删除被取消或失败', e);
      success = false;
    }
  }

  // 2. 归档到相册
  if (marks.archiveEntries.length > 0) {
    try {
      const byAlbum = groupByAlbum(marks.archiveEntries);
      for (const [albumId, photoIds] of Object.entries(byAlbum)) {
        await MediaLibrary.addAssetsToAlbumAsync(photoIds, albumId);
      }
    } catch (e) {
      console.error('归档到相册失败', e);
      Alert.alert('部分归档失败', '有些照片未能成功加入目标相册');
      success = false;
    }
  }

  return success;
}

// ---- 内部工具 ----

/** 按 albumId 分组 */
function groupByAlbum(
  entries: [string, string][],
): Record<string, string[]> {
  const byAlbum: Record<string, string[]> = {};
  entries.forEach(([photoId, albumId]) => {
    if (!byAlbum[albumId]) byAlbum[albumId] = [];
    byAlbum[albumId].push(photoId);
  });
  return byAlbum;
}
