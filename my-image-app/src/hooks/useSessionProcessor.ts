import { useState, useMemo, useCallback, useEffect } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';
import { usePhotoStore } from '../store/usePhotoStore';
import { PhotoStatus } from '../utils/constants';

/** 默认目标展示数量 */
const TARGET_COUNT = 300;

type SessionMarks = Record<string, PhotoStatus>;

export interface UseSessionProcessorReturn {
  /** 过滤后的可展示照片列表 */
  displayPhotos: MediaLibrary.Asset[];
  /** 当前照片 */
  currentPhoto: MediaLibrary.Asset | null;
  /** 当前照片的会话标记状态 */
  currentSessionStatus: PhotoStatus | undefined;
  /** 当前索引 */
  currentIndex: number;
  /** 总数 */
  totalCount: number;
  /** 待保留数量 */
  keepCount: number;
  /** 待删除数量 */
  deleteCount: number;
  /** 标记当前照片并翻页 */
  handleAction: (status: PhotoStatus) => void;
  /** 显示提交确认弹窗 */
  showCommitConfirm: () => void;
  /** 返回拦截（有未提交标记时弹窗确认） */
  handleBack: () => void;
  /** 手动设置当前索引 */
  setCurrentIndex: (index: number | ((prev: number) => number)) => void;
}

/**
 * 统一的照片会话处理 Hook
 * 管理 sessionMarks、标记/翻页、批量提交、返回拦截等逻辑。
 *
 * 差异化点通过 options 注入：
 * - initialIndex: 起始位置（process 从 params 来，random 随机）
 * - onFinish: 提交完成后的导航动作（process=back, random=replace '/'）
 *
 * @example
 * ```ts
 * const processor = useSessionProcessor({
 *   allPhotos,
 *   initialIndex: parseInt(startIndex),
 *   onFinish: () => router.back(),
 * });
 * ```
 */
export function useSessionProcessor(options: {
  allPhotos: MediaLibrary.Asset[];
  initialIndex?: number;
  onFinish: () => void;
}): UseSessionProcessorReturn {
  const { allPhotos, initialIndex, onFinish } = options;
  const { photoMap, setPhotoStatus } = usePhotoStore();

  // ---- 状态 ----
  const [sessionMarks, setSessionMarks] = useState<SessionMarks>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasInitializedIndex, setHasInitializedIndex] = useState(false);

  // ---- 派生数据 ----
  const displayPhotos = useMemo(() => {
    const filtered = allPhotos.filter(p => !photoMap[p.id]);
    return filtered.slice(0, TARGET_COUNT);
  }, [allPhotos, photoMap]);

  const currentPhoto = displayPhotos[currentIndex] ?? null;
  const currentSessionStatus: PhotoStatus | undefined = currentPhoto
    ? sessionMarks[currentPhoto.id]
    : undefined;
  const totalCount = displayPhotos.length;

  const keepCount = Object.values(sessionMarks).filter(s => s === PhotoStatus.PENDING_KEEP).length;
  const deleteCount = Object.values(sessionMarks).filter(s => s === PhotoStatus.PENDING_DELETE).length;

  // ---- 初始化索引 ----
  useEffect(() => {
    if (!hasInitializedIndex && displayPhotos.length > 0) {
      const idx = initialIndex !== undefined ? initialIndex : 0;
      setCurrentIndex(Math.min(Math.max(0, idx), displayPhotos.length - 1));
      setHasInitializedIndex(true);
    }
  }, [displayPhotos, initialIndex, hasInitializedIndex]);

  // ---- 操作方法 ----

  /** 标记当前照片：写入 sessionMarks + 自动翻到下一张 */
  const handleAction = useCallback((status: PhotoStatus) => {
    if (!currentPhoto) return;
    setSessionMarks(prev => ({ ...prev, [currentPhoto.id]: status }));
    if (currentIndex < totalCount - 1) {
      setCurrentIndex(v => v + 1);
    }
  }, [currentPhoto, currentIndex, totalCount]);

  /** 执行批量提交：待保留→归档，待删除→真删 */
  const executeCommit = useCallback(async () => {
    try {
      const keepIds: string[] = [];
      const deleteIds: string[] = [];

      Object.entries(sessionMarks).forEach(([id, status]) => {
        if (status === PhotoStatus.PENDING_KEEP) keepIds.push(id);
        else if (status === PhotoStatus.PENDING_DELETE) deleteIds.push(id);
      });

      // 1. 待删除的执行真删
      if (deleteIds.length > 0) {
        try {
          await MediaLibrary.deleteAssetsAsync(deleteIds);
        } catch (e) {
          console.log('部分删除被取消或失败', e);
        }
      }

      // 2. 待保留的写入 store（归档）
      keepIds.forEach(id => setPhotoStatus(id, PhotoStatus.PROCESSED));

      // 3. 清空会话标记并退出
      setSessionMarks({});
      onFinish();
    } catch (e) {
      console.error('提交失败', e);
    }
  }, [sessionMarks, setPhotoStatus, onFinish]);

  /** 提交确认弹窗 */
  const showCommitConfirm = useCallback(() => {
    const totalMarked = keepCount + deleteCount;
    if (totalMarked === 0) {
      onFinish();
      return;
    }

    Alert.alert(
      '确认提交',
      `即将处理 ${totalMarked} 张照片\n保留 ${keepCount} 张 · 删除 ${deleteCount} 张`,
      [
        { text: '取消', style: 'cancel' },
        { text: '确认', style: 'default', onPress: async () => await executeCommit() },
      ]
    );
  }, [keepCount, deleteCount, executeCommit, onFinish]);

  /** 返回拦截：有未提交标记时弹窗确认 */
  const handleBack = useCallback(() => {
    const totalMarked = keepCount + deleteCount;
    if (totalMarked === 0) {
      onFinish();
      return;
    }

    Alert.alert(
      '未保存的更改',
      `您已标记 ${totalMarked} 张照片（保留 ${keepCount} / 删除 ${deleteCount}）\n是否要保存这些更改？`,
      [
        { text: '放弃', style: 'destructive', onPress: () => { setSessionMarks({}); onFinish(); } },
        { text: '保存', style: 'default', onPress: async () => await executeCommit() },
      ]
    );
  }, [keepCount, deleteCount, executeCommit, onFinish]);

  return {
    displayPhotos,
    currentPhoto,
    currentSessionStatus,
    currentIndex,
    totalCount,
    keepCount,
    deleteCount,
    handleAction,
    showCommitConfirm,
    handleBack,
    setCurrentIndex,
  };
}
