import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { usePhotoStore } from '../../src/store/usePhotoStore';
import { fontFamily } from '../../src/utils/fonts';

const { width } = Dimensions.get('window');
const ITEM_SIZE = width / 3;
/** 目标展示数量：始终补位到此数 */
const TARGET_COUNT = 300;

export default function Index() {
  const router = useRouter();
  const { photoMap } = usePhotoStore();
  const [allPhotos, setAllPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [albumTotalCount, setAlbumTotalCount] = useState(0);

  /** 加载相册：多取 + 补位，确保过滤后接近 TARGET_COUNT */
  const loadPhotos = useCallback(async () => {
    setLoading(true);
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      try {
        // 先获取总数（first: 0 仅返回 totalCount，不返回 assets）
        const countRes = await MediaLibrary.getAssetsAsync({
          mediaType: 'photo',
          first: 0,
        });
        setAlbumTotalCount(countRes.totalCount);

        // 多取一些来补偿已归档/已删除的空位
        const targetFetch = Math.max(TARGET_COUNT * 2, 600);
        let assets: MediaLibrary.Asset[] = [];
        let after: string | undefined;

        // 分页加载，直到取够或无更多数据
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
      } catch (e) {
        console.error('Index: 加载相册失败', e);
      }
    }
    setLoading(false);
  }, []);

  // 每次回到首页时刷新
  useFocusEffect(
    useCallback(() => {
      loadPhotos();
      return undefined;
    }, [loadPhotos])
  );

  // 过滤已归档照片 + 截取前 TARGET_COUNT 张
  const displayPhotos = useMemo(() => {
    const filtered = allPhotos.filter(p => !photoMap[p.id]);
    return filtered.slice(0, TARGET_COUNT);
  }, [allPhotos, photoMap]);

  if (loading && allPhotos.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Less is Happiness</Text>
        <Text style={styles.infoText}>共 {albumTotalCount} 张照片</Text>
      </View>

      <FlatList
        data={displayPhotos}
        numColumns={3}
        keyExtractor={item => item.id}
        onRefresh={loadPhotos}
        refreshing={loading}
        renderItem={({ item, index }) => (
          <TouchableOpacity 
            style={styles.item} 
            onPress={() => router.push({ 
              pathname: "/process", 
              params: { startIndex: index } 
            })}
          >
            <Image source={{ uri: item.uri }} style={styles.img} contentFit="cover" transition={200} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 25, paddingTop: 60, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '600', color: '#1a1a1a', fontFamily },
  infoText: { fontSize: 13, color: '#888', fontFamily, marginTop: 6 },
  item: { width: ITEM_SIZE, height: ITEM_SIZE, padding: 1 },
  img: { flex: 1, backgroundColor: '#f2f2f7' },
});
