import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { fontStyles } from '../../src/utils/fonts';
import * as C from '../../src/utils/colors';

// ---- 样式 ----

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg.page,
  },
  header: {
    padding: 25,
    paddingTop: 60,
    backgroundColor: C.bg.page,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...fontStyles.subtitle,
    fontWeight: '600',
    color: C.text.primary,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: C.primary,
  },
  createBtnText: {
    color: C.textDark.primary,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    ...fontStyles.small,
  },
  // 列表项
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.bg.border,
  },
  itemIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: C.bg.item,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  itemThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  itemEmptyText: {
    color: C.text.tertiary,
    ...fontStyles.small,
  },
  itemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    ...fontStyles.navBtn,
    color: C.text.primary,
  },
  itemCount: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  itemArrow: {
    marginLeft: 8,
  },
});

// ---- 组件 ----

export default function Albums() {
  const router = useRouter();
  const [albums, setAlbums] = useState<MediaLibrary.Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<string>('');
  /** 每个相册首张照片的 URI（key: albumId） */
  const [firstPhotos, setFirstPhotos] = useState<Record<string, string>>({});
  /** 每个相册的纯照片数量（不含视频，key: albumId） */
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});

  /** 加载相册列表 */
  const loadAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setPermissionStatus(status);

      if (status === 'granted' || status === 'limited') {
        const result = await MediaLibrary.getAlbumsAsync({
          includeSmart: false,
        });
        setAlbums(result);
      }
    } catch (e) {
      console.error('Albums: 加载相册失败', e);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAlbums();
      return undefined;
    }, [loadAlbums])
  );

  /** 加载每个相册的首张照片 + 纯照片数量 */
  useEffect(() => {
    if (albums.length === 0 || permissionStatus !== 'granted' && permissionStatus !== 'limited') return;

    let cancelled = false;
    (async () => {
      const thumbMap: Record<string, string> = {};
      const countMap: Record<string, number> = {};
      for (const album of albums) {
        try {
          // first: 0 仅获取 totalCount，不返回 assets，用于获取纯照片数量
          const [thumbRes, countRes] = await Promise.all([
            MediaLibrary.getAssetsAsync({ album, first: 1, mediaType: 'photo' }),
            MediaLibrary.getAssetsAsync({ album, first: 0, mediaType: 'photo' }),
          ]);
          if (!cancelled) {
            countMap[album.id] = countRes.totalCount;
            if (thumbRes.assets.length > 0) {
              thumbMap[album.id] = thumbRes.assets[0].uri;
            }
          }
        } catch {
          // 单个相册加载失败不阻断整体
        }
      }
      if (!cancelled) {
        setFirstPhotos(thumbMap);
        setPhotoCounts(countMap);
      }
    })();

    return () => { cancelled = true; };
  }, [albums, permissionStatus]);

  /** 创建新相册 */
  const handleCreate = useCallback(() => {
    Alert.prompt(
      '新建相册',
      '请输入相册名称',
      async (text) => {
        if (!text || !text.trim()) return;
        try {
          const newAlbum = await MediaLibrary.createAlbumAsync(text.trim());
          setAlbums(prev => [...prev, newAlbum]);
        } catch (e) {
          if (e instanceof Error && e.message?.includes('duplicate')) {
            Alert.alert('创建失败', '已存在同名相册');
          } else {
            console.error('Albums: 创建相册失败', e);
            Alert.alert('创建失败', '无法创建相册，请检查权限');
          }
        }
      },
      undefined,
      'default',
      '',
    );
  }, []);

  /** 权限拒绝提示 */
  if (!loading && permissionStatus !== 'granted' && permissionStatus !== 'limited') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>相册管理</Text>
        </View>
        <View style={styles.center}>
          <MaterialIcons name="folder-off-outline" size={48} color="#ccc" />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>需要相册访问权限</Text>
          <TouchableOpacity onPress={loadAlbums} style={{ marginTop: 16 }}>
            <Text style={{ color: C.primary, fontSize: 15, ...fontStyles.small }}>重新授权</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /** 加载中 */
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>相册管理</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <Text style={styles.title}>相册管理</Text>

        {/* 新建按钮 */}
        <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
          <MaterialIcons name="add-circle-outline" size={16} color={C.textDark.primary} />
          <Text style={styles.createBtnText}>新建相册</Text>
        </TouchableOpacity>
      </View>

      {/* 相册列表 */}
      {albums.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="folder-open" size={48} color="#ccc" />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>暂无相册</Text>
        </View>
      ) : (
        <FlatList
          data={albums}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.65}
              onPress={() => router.push({
                pathname: '/album-detail',
                params: { id: item.id, name: item.title },
              })}
            >
              {/* 左侧缩略图 */}
              <View style={styles.itemIconWrap}>
                {firstPhotos[item.id] ? (
                  <Image source={{ uri: firstPhotos[item.id] }} style={styles.itemThumb} contentFit="cover" />
                ) : (
                  <Text style={styles.itemEmptyText}>空</Text>
                )}
              </View>

              {/* 名称 + 数量 */}
              <View style={styles.itemContent}>
                <Text style={styles.itemName}>{item.title}</Text>
                <Text style={styles.itemCount}>{photoCounts[item.id] ?? 0} 张照片</Text>
              </View>

              {/* 箭头 */}
              <MaterialIcons name="chevron-right" size={22} color="#c7c7cc" style={styles.itemArrow} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
