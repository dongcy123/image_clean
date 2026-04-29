import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { usePhotoStore } from '../src/store/usePhotoStore';
import { PhotoStatus } from '../src/utils/constants';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { fontFamily } from '../src/utils/fonts';

// ---- 常量 ----

/** 目标展示数量（与 gallery 一致） */
const TARGET_COUNT = 300;

type SessionMarks = Record<string, PhotoStatus>;

// ---- 样式常量（避免组件内重复创建）----

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#888',
    marginTop: 10,
    fontSize: 16,
  },
  backBtn: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backBtnText: {
    color: '#007AFF',
    fontSize: 16,
  },

  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    alignItems: 'center',
  },
  navBtnText: {
    color: '#fff',
    fontSize: 16,
  },
  doneText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  countText: {
    color: '#48484a',
    fontWeight: 'bold',
    fontSize: 16,
  },

  content: {
    flex: 1,
    padding: 10,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1c1c1e',
  },
  fullImg: {
    flex: 1,
  },
  mask: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  maskLabel: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 40,
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgGray: {
    backgroundColor: '#2c2c2e',
  },
  btnDisabled: {
    backgroundColor: '#1c1c1e',
    opacity: 0.5,
  },
});

// ---- 组件 ----

export default function Process() {
  const router = useRouter();
  const { startIndex } = useLocalSearchParams();
  const { photoMap, setPhotoStatus } = usePhotoStore();

  // 数据层
  const [allPhotos, setAllPhotos] = useState<MediaLibrary.Asset[]>([]);
  // 会话内中间态标记（不写入 store）
  const [sessionMarks, setSessionMarks] = useState<SessionMarks>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitializedIndex, setHasInitializedIndex] = useState(false);

  // 加载系统相册（多取补位，与 gallery 一致）
  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          const targetFetch = Math.max(TARGET_COUNT * 2, 600);
          let assets: MediaLibrary.Asset[] = [];
          let after: string | undefined;

          while (assets.length < targetFetch) {
            const res = await MediaLibrary.getAssetsAsync({
              first: Math.min(200, targetFetch - assets.length),
              after,
              sortBy: ['creationTime'],
              mediaType: 'photo',
            });
            assets = assets.concat(res.assets || []);
            if (!res.hasNextPage) break;
            after = res.endCursor;
          }

          setAllPhotos(assets);
        }
      } catch (e) {
        console.error('Process: 加载相册失败', e);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // 过滤已归档 + 截取前 TARGET_COUNT（与 gallery 一致）
  const displayPhotos = useMemo(() => {
    const filtered = allPhotos.filter(p => !photoMap[p.id]);
    return filtered.slice(0, TARGET_COUNT);
  }, [allPhotos, photoMap]);

  // 照片加载完成后，同步首页点击的 startIndex
  useEffect(() => {
    if (!hasInitializedIndex && displayPhotos.length > 0) {
      const parsed = startIndex ? parseInt(startIndex as string, 10) : 0;
      const index = Number.isNaN(parsed) ? 0 : parsed;
      setCurrentIndex(Math.min(Math.max(0, index), displayPhotos.length - 1));
      setHasInitializedIndex(true);
    }
  }, [displayPhotos, startIndex, hasInitializedIndex]);

  // 当前照片 & 状态（优先从 sessionMarks 读，其次 photoMap）
  const currentPhoto = displayPhotos[currentIndex] ?? null;
  const currentSessionStatus: PhotoStatus | undefined = currentPhoto
    ? sessionMarks[currentPhoto.id]
    : undefined;
  const totalCount = displayPhotos.length;

  // 统计本次会话的标记数量
  const keepCount = Object.values(sessionMarks).filter(s => s === PhotoStatus.PENDING_KEEP).length;
  const deleteCount = Object.values(sessionMarks).filter(s => s === PhotoStatus.PENDING_DELETE).length;

  // ---- 操作方法 ----

  /** 标记当前照片：写入 sessionMarks + 自动翻到下一张 */
  const handleAction = useCallback((status: PhotoStatus) => {
    if (!currentPhoto) return;
    setSessionMarks(prev => ({ ...prev, [currentPhoto.id]: status }));
    if (currentIndex < totalCount - 1) {
      setCurrentIndex(v => v + 1);
    }
  }, [currentPhoto, currentIndex, totalCount]);

  /** 提交确认弹窗 */
  const showCommitConfirm = useCallback(() => {
    const totalMarked = keepCount + deleteCount;
    if (totalMarked === 0) {
      // 无标记直接返回
      router.back();
      return;
    }

    Alert.alert(
      '确认提交',
      `即将处理 ${totalMarked} 张照片\n保留 ${keepCount} 张 · 删除 ${deleteCount} 张`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          style: 'default',
          onPress: async () => await executeCommit(),
        },
      ]
    );
  }, [keepCount, deleteCount, router]);

  /** 执行批量提交：待保留→归档，待删除→真删 */
  const executeCommit = useCallback(async () => {
    try {
      const keepIds: string[] = [];
      const deleteIds: string[] = [];

      Object.entries(sessionMarks).forEach(([id, status]) => {
        if (status === PhotoStatus.PENDING_KEEP) {
          keepIds.push(id);
        } else if (status === PhotoStatus.PENDING_DELETE) {
          deleteIds.push(id);
        }
      });

      // 1. 待删除的执行真删
      if (deleteIds.length > 0) {
        try {
          await MediaLibrary.deleteAssetsAsync(deleteIds);
        } catch (e) {
          console.log('Process: 部分删除被取消或失败', e);
        }
      }

      // 2. 待保留的写入 photoMap（归档）
      keepIds.forEach(id => setPhotoStatus(id, PhotoStatus.PROCESSED));

      // 3. 清空会话标记
      setSessionMarks({});

      router.back();
    } catch (e) {
      console.error('Process: 提交失败', e);
    }
  }, [sessionMarks, setPhotoStatus, router]);

  /** 返回拦截：有未提交标记时弹窗确认 */
  const handleBack = useCallback(() => {
    const totalMarked = keepCount + deleteCount;
    if (totalMarked === 0) {
      router.back();
      return;
    }

    Alert.alert(
      '未保存的更改',
      `您已标记 ${totalMarked} 张照片（保留 ${keepCount} / 删除 ${deleteCount}）\n是否要保存这些更改？`,
      [
        { text: '放弃', style: 'destructive', onPress: () => { setSessionMarks({}); router.back(); } },
        { text: '保存', style: 'default', onPress: async () => await executeCommit() },
      ]
    );
  }, [keepCount, deleteCount, router, executeCommit]);

  // ---- 渲染分支 ----

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>读取相册中...</Text>
      </View>
    );
  }

  if (totalCount === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>未发现可处理的照片</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---- 主界面 ----

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部导航 */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.navBtnText}>返回</Text>
        </TouchableOpacity>
        <Text style={styles.countText}>
          {currentIndex + 1} / {totalCount}
        </Text>
        <TouchableOpacity onPress={showCommitConfirm}>
          <Text style={styles.doneText}>完成</Text>
        </TouchableOpacity>
      </View>

      {/* 图片卡片 */}
      <View style={styles.content}>
        <View style={styles.card}>
          {currentPhoto && (
            <Image
              source={{ uri: currentPhoto.uri }}
              style={styles.fullImg}
              contentFit="contain"
            />
          )}

          {/* 蒙版：渐变 + 线稿 icon */}
          {currentSessionStatus !== undefined && (
            <LinearGradient
              style={styles.mask}
              colors={
                currentSessionStatus === PhotoStatus.PENDING_DELETE
                  ? ['rgba(255,59,48,0.6)', 'rgba(255,59,48,0.15)', 'rgba(255,59,48,0)']
                  : ['rgba(52,199,89,0.6)', 'rgba(52,199,89,0.15)', 'rgba(52,199,89,0)']
              }
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <MaterialIcons
                name={currentSessionStatus === PhotoStatus.PENDING_DELETE ? 'delete-outline' : 'check-circle-outline'}
                size={60}
                color="#fff"
              />
              <Text style={styles.maskLabel}>
                {currentSessionStatus === PhotoStatus.PENDING_DELETE ? '待删除' : '待保留'}
              </Text>
            </LinearGradient>
          )}
        </View>
      </View>

      {/* 底部操作栏 — 四个等大圆形按钮均匀分布 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.circle, styles.bgGray, currentIndex <= 0 && styles.btnDisabled]}
          disabled={currentIndex <= 0}
          onPress={() => setCurrentIndex((v) => v - 1)}
        >
          <MaterialIcons
            name="chevron-left"
            size={28}
            color={currentIndex <= 0 ? '#3a3a3c' : '#fff'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.circle, styles.bgGray]}
          onPress={() => handleAction(PhotoStatus.PENDING_DELETE)}
        >
          <MaterialIcons name="delete-outline" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.circle, styles.bgGray]}
          onPress={() => handleAction(PhotoStatus.PENDING_KEEP)}
        >
          <MaterialIcons name="check-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.circle, styles.bgGray, currentIndex >= totalCount - 1 && styles.btnDisabled]}
          disabled={currentIndex >= totalCount - 1}
          onPress={() => setCurrentIndex((v) => v + 1)}
        >
          <MaterialIcons
            name="chevron-right"
            size={28}
            color={currentIndex >= totalCount - 1 ? '#3a3a3c' : '#fff'}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
