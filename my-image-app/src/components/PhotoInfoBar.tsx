import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as C from '../utils/colors';
import { fontStyles } from '../utils/fonts';

interface PhotoInfoBarProps {
  /** 格式化时间，如 "2024-01-15 14:30" */
  time: string;
  /** 中文地址或 null */
  location: string | null;
  /** 地址是否正在加载 */
  locationLoading?: boolean;
}

/**
 * 照片信息栏：单行紧凑展示拍摄时间与地点
 * 位于相册归档 Tab 栏下方、图片卡片上方
 */
export default function PhotoInfoBar({ time, location, locationLoading }: PhotoInfoBarProps) {
  // 无数据时不渲染
  if (!time && !location) return null;

  return (
    <View style={s.row}>
      {/* 时间 */}
      {time ? (
        <>
          <MaterialIcons name="schedule" size={14} color={C.text.tertiary} />
          <Text style={s.text}>{time}</Text>
        </>
      ) : null}

      {/* 分隔符 */}
      {time && location !== null ? (
        <Text style={s.separator}>·</Text>
      ) : null}

      {/* 地点 */}
      {locationLoading ? (
        <>
          <MaterialIcons name="place" size={14} color={C.text.tertiary} />
          <Text style={[s.text, s.dim]}>定位中...</Text>
        </>
      ) : location ? (
        <>
          <MaterialIcons name="place" size={14} color={C.text.tertiary} />
          <Text style={s.text} numberOfLines={1}>{location}</Text>
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 4,
  },
  text: {
    fontSize: 12,
    color: C.text.secondary,
    ...fontStyles.info,
    flexShrink: 1,
  },
  dim: {
    opacity: 0.5,
  },
  separator: {
    fontSize: 12,
    color: C.text.tertiary,
    marginHorizontal: 2,
  },
});
