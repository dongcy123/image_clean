import { PhotoStatus } from './constants';

// ---- 类型 ----

export type ClassifiedMarks = {
  keepIds: string[];
  deleteIds: string[];
  archiveEntries: [string, string][]; // [photoId, albumId]
}

/** 用于弹窗展示的操作摘要 */
export interface CommitSummary {
  total: number;
  parts: string[];
}

// ---- 纯函数 ----

/**
 * 将会话中间态标记按优先级分类
 * 优先级：删除 > 归档相册 > 纯保留
 */
export function classifySessionMarks(
  sessionMarks: Record<string, PhotoStatus>,
  sessionAlbumAssignments: Record<string, string>,
): ClassifiedMarks {
  const keepIds: string[] = [];
  const deleteIds: string[] = [];
  const archiveEntries: [string, string][] = [];

  const allMarkedIds = new Set([
    ...Object.keys(sessionMarks),
    ...Object.keys(sessionAlbumAssignments),
  ]);

  allMarkedIds.forEach(id => {
    const markStatus = sessionMarks[id];
    const assignedAlbumId = sessionAlbumAssignments[id];

    if (markStatus === PhotoStatus.PENDING_DELETE) {
      deleteIds.push(id);
    } else if (assignedAlbumId) {
      archiveEntries.push([id, assignedAlbumId]);
    } else if (markStatus === PhotoStatus.PENDING_KEEP) {
      keepIds.push(id);
    }
  });

  return { keepIds, deleteIds, archiveEntries };
}

/**
 * 构建提交/返回拦截弹窗的摘要文字
 */
export function buildCommitSummary(
  archiveCount: number,
  keepCount: number,
  deleteCount: number,
): CommitSummary {
  const total = archiveCount + keepCount + deleteCount;
  const parts: string[] = [];
  if (archiveCount > 0) parts.push(`归档 ${archiveCount} 张`);
  if (keepCount > 0) parts.push(`保留 ${keepCount} 张`);
  if (deleteCount > 0) parts.push(`删除 ${deleteCount} 张`);
  return { total, parts };
}
