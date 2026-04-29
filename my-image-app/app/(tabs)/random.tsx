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
import { useRouter, useFocusEffect } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { usePhotoStore } from '../../src/store/usePhotoStore';
import { PhotoStatus } from '../../src/utils/constants';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { fontFamily } from '../../src/utils/fonts';

// ---- 常量 ----

const TARGET_COUNT = 300;

type SessionMarks = Record<string, PhotoStatus>;

// ---- 样式表（与 process 共享）----

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
  finishedText: {
    color: '#34c759',
    fontSize: 14,
    fontStyle: 'italic',
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

export default function RandomMode() {
  const router = useRouter();
  const { photoMap, setPhotoStatus } = usePhotoStore();

  // 数据层
  const [allPhotos, setAllPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [sessionMarks, setSessionMarks] = useState<SessionMarks>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  // 标记是否已初始化过（用于区分首次进入和重新聚焦）
  const [isInitialized, setIsInitialized] = useState(false);

  /** 重置会话状态（每次进入 tab 时调用） */
  const resetSession = useCallback(() => {
    setSessionMarks({});
    setCurrentIndex(0);
    setIsInitialized(false);
    setIsLoading(true);
    setAllPhotos([]);
  }, []);

  /** 加载相册 + 随机选起点 */
  useEffect(() => {
    if (!isInitialized) return;

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

          // 过滤 + 截取后，从未处理照片中随机取一个索引
          const filtered = assets.filter(p => !photoMap[p.id]).slice(0, TARGET_COUNT);
          if (filtered.length > 0) {
            const randomIndex = Math.floor(Math.random() * filtered.length);
            setCurrentIndex(randomIndex);
          }
        }
      } catch (e) {
        console.error('Random: 加载相册失败', e);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [isInitialized, photoMap]);

  // 每次获得焦点时重置并重新加载（确保每次进 tab 都是新的随机起点）
  useFocusEffect(
    useCallback(() => {
      resetSession();
      // 延迟一帧触发初始化，等 resetSession 的状态更新生效
      setTimeout(() => setIsInitialized(true), 0);
      return undefined;
    }, [resetSession])
  );

  // 过滤已归档 + 截取前 TARGET_COUNT（与 gallery 一致）
  const displayPhotos = useMemo(() => {
    const filtered = allPhotos.filter(p => !photoMap[p.id]);
    return filtered.slice(0, TARGET_COUNT);
  }, [allPhotos, photoMap]);

  // 当前照片 & 状态
  const currentPhoto = displayPhotos[currentIndex] ?? null;
  const currentSessionStatus: PhotoStatus | undefined = currentPhoto
    ? sessionMarks[currentPhoto.id]
    : undefined;
  const totalCount = displayPhotos.length;
  // 是否已到达末尾（当前是最后一张）
  const isAtEnd = totalCount > 0 && currentIndex >= totalCount - 1;

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
      router.replace('/');
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

  /** 执行批量提交 */
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

      if (deleteIds.length > 0) {
        try {
          await MediaLibrary.deleteAssetsAsync(deleteIds);
        } catch (e) {
          console.log('Random: 部分删除被取消或失败', e);
        }
      }

      keepIds.forEach(id => setPhotoStatus(id, PhotoStatus.PROCESSED));
      setSessionMarks({});

      // 提交完成后回到首页
      router.replace('/');
    } catch (e) {
      console.error('Random: 提交失败', e);
    }
  }, [sessionMarks, setPhotoStatus, router]);

  /** 返回首页 */
  const handleBack = useCallback(() => {
    const totalMarked = keepCount + deleteCount;
    if (totalMarked === 0) {
      router.replace('/');
      return;
    }

    Alert.alert(
      '未保存的更改',
      `您已标记 ${totalMarked} 张照片（保留 ${keepCount} / 删除 ${deleteCount}）\n是否要保存这些更改？`,
      [
        { text: '放弃', style: 'destructive', onPress: () => { setSessionMarks({}); router.replace('/'); } },
        { text: '保存', style: 'default', onPress: async () => await executeCommit() },
      ]
    );
  }, [keepCount, deleteCount, router, executeCommit]);

  // ---- 渲染分支 ----

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>随机选取中...</Text>
      </View>
    );
  }

  if (totalCount === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>未发现可处理的照片</Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.replace('/')}>
          <Text style={{ color: '#007AFF', fontSize: 16, fontFamily }}>返回首页</Text>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.countText}>
            {currentIndex + 1} / {totalCount}
          </Text>
          {isAtEnd && (
            <Text style={styles.finishedText}>已完成</Text>
          )}
        </View>
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
          style={[styles.circle, styles.bgGray, isAtEnd && styles.btnDisabled]}
          disabled={isAtEnd}
          onPress={() => setCurrentIndex((v) => v + 1)}
        >
          <MaterialIcons
            name="chevron-right"
            size={28}
            color={isAtEnd ? '#3a3a3c' : '#fff'}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
