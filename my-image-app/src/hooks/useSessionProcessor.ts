import { useState, useMemo, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { usePhotoStore } from '../store/usePhotoStore';
import { PhotoStatus } from '../utils/constants';
import { classifySessionMarks, buildCommitSummary, CommitSummary } from '../utils/commitUtils';
import { executeSystemOperations } from '../services/commitExecutor';

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
  /** 当前照片的待归档相册ID（中间态） */
  currentPendingAlbumId: string | undefined;
  /** 当前索引 */
  currentIndex: number;
  /** 总数 */
  totalCount: number;
  /** 待保留数量 */
  keepCount: number;
  /** 待删除数量 */
  deleteCount: number;
  /** 待归档数量 */
  archiveCount: number;
  /** 标记当前照片并翻页（保留/删除） */
  handleAction: (status: PhotoStatus) => void;
  /** 将当前照片归档到指定相册（中间态，自动翻页） */
  assignToAlbum: (albumId: string) => void;
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
  const { photoMap, setPhotoStatus, setAlbumAssignment } = usePhotoStore();

  // ---- 状态 ----
  const [sessionMarks, setSessionMarks] = useState<SessionMarks>({});
  /** 会话内归档映射：photoId → albumId（中间态，提交后才写入 store） */
  const [sessionAlbumAssignments, setSessionAlbumAssignments] = useState<Record<string, string>>({});
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
  const currentPendingAlbumId: string | undefined = currentPhoto
    ? sessionAlbumAssignments[currentPhoto.id]
    : undefined;
  const totalCount = displayPhotos.length;

  const keepCount = Object.values(sessionMarks).filter(s => s === PhotoStatus.PENDING_KEEP).length;
  const deleteCount = Object.values(sessionMarks).filter(s => s === PhotoStatus.PENDING_DELETE).length;
  const archiveCount = Object.keys(sessionAlbumAssignments).length;

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

  /** 将当前照片归档到指定相册（中间态，覆盖之前的归档选择）+ 翻页 */
  const assignToAlbum = useCallback((albumId: string) => {
    if (!currentPhoto) return;
    setSessionAlbumAssignments(prev => ({ ...prev, [currentPhoto.id]: albumId }));
    // 归档操作同时清除该照片的保留/删除标记（最后操作为准）
    setSessionMarks(prev => {
      const next = { ...prev };
      delete next[currentPhoto.id];
      return next;
    });
    if (currentIndex < totalCount - 1) {
      setCurrentIndex(v => v + 1);
    }
  }, [currentPhoto, currentIndex, totalCount]);

  /** 执行批量提交：归档到相册 / 待保留→归档，待删除→真删 */
  const executeCommit = useCallback(async () => {
    try {
      // 1. 分类
      const marks = classifySessionMarks(sessionMarks, sessionAlbumAssignments);

      // 2. 执行系统操作（删除 + 归档 API）
      await executeSystemOperations(marks);

      // 3. 写入本地状态
      marks.archiveEntries.forEach(([photoId, albumId]) => {
        setPhotoStatus(photoId, PhotoStatus.PROCESSED);
        setAlbumAssignment(photoId, albumId);
      });
      marks.keepIds.forEach(id => setPhotoStatus(id, PhotoStatus.PROCESSED));

      // 4. 清空会话并退出
      setSessionMarks({});
      setSessionAlbumAssignments({});
      onFinish();
    } catch (e) {
      console.error('提交失败', e);
    }
  }, [sessionMarks, sessionAlbumAssignments, setPhotoStatus, setAlbumAssignment, onFinish]);

  /** 构建操作摘要（供弹窗使用） */
  const summary: CommitSummary = useMemo(
    () => buildCommitSummary(archiveCount, keepCount, deleteCount),
    [archiveCount, keepCount, deleteCount],
  );

  /** 提交确认弹窗 */
  const showCommitConfirm = useCallback(() => {
    if (summary.total === 0) {
      onFinish();
      return;
    }
    Alert.alert(
      '确认提交',
      `即将处理 ${summary.total} 张照片\n${summary.parts.join(' · ')}`,
      [
        { text: '取消', style: 'cancel' },
        { text: '确认', style: 'default', onPress: async () => await executeCommit() },
      ],
    );
  }, [summary, executeCommit, onFinish]);

  /** 返回拦截：有未提交标记时弹窗确认 */
  const handleBack = useCallback(() => {
    if (summary.total === 0) {
      onFinish();
      return;
    }
    Alert.alert(
      '未保存的更改',
      `您已标记 ${summary.total} 张照片（${summary.parts.join(' / ')}）\n是否要保存这些更改？`,
      [
        { text: '放弃', style: 'destructive', onPress: () => { setSessionMarks({}); setSessionAlbumAssignments({}); onFinish(); } },
        { text: '保存', style: 'default', onPress: async () => await executeCommit() },
      ],
    );
  }, [summary, executeCommit, onFinish]);

  return {
    displayPhotos,
    currentPhoto,
    currentSessionStatus,
    currentPendingAlbumId,
    currentIndex,
    totalCount,
    keepCount,
    deleteCount,
    archiveCount,
    handleAction,
    assignToAlbum,
    showCommitConfirm,
    handleBack,
    setCurrentIndex,
  };
}
