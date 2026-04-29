import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { usePhotoStore } from '../../src/store/usePhotoStore';
import { usePhotoLoader } from '../../src/hooks/usePhotoLoader';
import { PhotoStatus } from '../../src/utils/constants';
import { fontStyles } from '../../src/utils/fonts';
import * as C from '../../src/utils/colors';

const { width } = Dimensions.get('window');
const ITEM_SIZE = width / 3;

/** 首页：相册网格 + 点击进入处理页 */
export default function Index() {
  const router = useRouter();
  const { photoMap, albumAssignmentMap, initializeProcessedPhotos } = usePhotoStore();
  const { allPhotos, isLoading, albumTotalCount, loadPhotos } = usePhotoLoader({ includeTotalCount: true });

  // 统计纯保留数量（PROCESSED 且无相册归属）
  const pureKeepCount = useMemo(() => {
    return Object.entries(photoMap).filter(
      ([id, status]) => status === PhotoStatus.PROCESSED && !albumAssignmentMap[id],
    ).length;
  }, [photoMap, albumAssignmentMap]);

  /** 初始化：还原纯保留照片为未处理 */
  const handleInitialize = () => {
    if (pureKeepCount === 0) {
      Alert.alert('提示', '当前没有需要初始化的保留照片');
      return;
    }
    Alert.alert(
      '确认初始化',
      `即将将 ${pureKeepCount} 张"已保留"照片还原为未处理状态\n（已归档到相册的照片不受影响）`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          style: 'default',
          onPress: () => {
            const resetCount = initializeProcessedPhotos();
            Alert.alert('完成', `已还原 ${resetCount} 张照片`);
          },
        },
      ],
    );
  };

  // 每次回到首页时刷新
  useFocusEffect(
    React.useCallback(() => {
      loadPhotos();
      return undefined;
    }, [loadPhotos])
  );

  // 过滤已归档照片 + 截取前 TARGET_COUNT 张
  const displayPhotos = useMemo(() => {
    return allPhotos.filter(p => !photoMap[p.id]).slice(0, 300);
  }, [allPhotos, photoMap]);

  if (isLoading && allPhotos.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Less is Happiness</Text>
          <Text style={styles.infoText}>共 {albumTotalCount} 张照片</Text>
        </View>
        <TouchableOpacity onPress={handleInitialize} activeOpacity={0.65}>
          <MaterialIcons name="restart-alt" size={26} color={C.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayPhotos}
        numColumns={3}
        keyExtractor={item => item.id}
        onRefresh={loadPhotos}
        refreshing={isLoading}
        contentInsetAdjustmentBehavior="never"
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
  container: { flex: 1, backgroundColor: C.bg.page },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: C.bg.page,
  },
  headerLeft: {},
  title: { ...fontStyles.subtitle, fontWeight: '600', color: C.text.primary },
  infoText: { fontSize: 13, color: C.text.secondary, marginTop: 6 },
  item: { width: ITEM_SIZE, height: ITEM_SIZE, padding: 1 },
  img: { flex: 1, backgroundColor: C.bg.card },
});
