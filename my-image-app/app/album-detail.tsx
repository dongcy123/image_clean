import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { fontStyles } from '../src/utils/fonts';
import * as C from '../src/utils/colors';

const { width } = Dimensions.get('window');
const ITEM_SIZE = Math.floor(width / 3);
const GAP = 1;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bgDark.page,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: C.bgDark.page,
  },
  backBtn: {
    marginRight: 10,
  },
  title: {
    ...fontStyles.navBtn,
    fontWeight: '600',
    color: C.textDark.primary,
    flex: 1,
  },
  countText: {
    ...fontStyles.count,
    color: C.text.secondary,
    marginLeft: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bgDark.page,
  },
  item: {
    width: ITEM_SIZE - GAP,
    height: ITEM_SIZE - GAP,
    margin: GAP / 2,
  },
  img: {
    flex: 1,
    backgroundColor: C.bgDark.surface,
  },
});

export default function AlbumDetail() {
  const router = useRouter();
  const { id: albumId, name: albumName } = useLocalSearchParams();

  const [photos, setPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);

  /** 加载相册内的所有照片 */
  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted' || status === 'limited') {
        // 通过相册 ID 获取该相册内所有照片
        let assets: MediaLibrary.Asset[] = [];
        let after: string | undefined;
        let hasMore = true;

        while (hasMore) {
          const res = await MediaLibrary.getAssetsAsync({
            album: albumId as string,
            first: 200,
            after,
            mediaType: 'photo',
            sortBy: ['creationTime'],
          });
          assets = assets.concat(res.assets || []);
          hasMore = res.hasNextPage;
          if (hasMore) after = res.endCursor;
        }

        setPhotos(assets);
      }
    } catch (e) {
      console.error('AlbumDetail: 加载失败', e);
    }
    setLoading(false);
  }, [albumId]);

  // 每次进入时加载
  useEffect(() => {
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <MaterialIcons name="chevron-left" size={28} color={C.textDark.primary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{(albumName as string) || '相册'}</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 导航栏 */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="chevron-left" size={28} color={C.textDark.primary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{(albumName as string) || '相册'}</Text>
        <Text style={styles.countText}>{photos.length}</Text>
      </View>

      {/* 照片网格（纯展示，无点击） */}
      {photos.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="photo-library" size={48} color="#333" />
          <Text style={{ color: C.text.tertiary, marginTop: 12, ...fontStyles.small }}>该相册暂无照片</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          numColumns={3}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Image
                source={{ uri: item.uri }}
                style={styles.img}
                contentFit="cover"
                transition={200}
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
