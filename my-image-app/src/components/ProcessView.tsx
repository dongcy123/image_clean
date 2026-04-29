import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { fontStyles } from '../utils/fonts';
import { PhotoStatus } from '../utils/constants';
import * as C from '../utils/colors';
import type { UseSessionProcessorReturn } from '../hooks/useSessionProcessor';

export interface ProcessViewProps {
  /** 是否正在加载 */
  isLoading: boolean;
  /** useSessionProcessor 返回值 */
  processor: UseSessionProcessorReturn;
  /** 返回按钮回调 */
  onBack: () => void;
  /** 完成按钮回调 */
  onDone: () => void;
  /** 加载中的提示文字 */
  loadingText?: string;
  /** 空状态时的返回按钮文字 */
  backBtnText?: string;
  /** 导航栏计数区右侧额外内容（如 random 模式的"已完成"标签） */
  navExtra?: React.ReactNode;
}

/**
 * 统一的照片处理界面组件
 * 包含：导航栏 / 图片卡片+蒙版 / 底部操作栏
 *
 * process 和 random 页面共用此组件，仅注入不同的回调与文案。
 */
export default function ProcessView({
  isLoading,
  processor,
  onBack,
  onDone,
  loadingText = '读取相册中...',
  backBtnText = '返回',
  navExtra,
}: ProcessViewProps) {
  const {
    currentPhoto,
    currentSessionStatus,
    currentIndex,
    totalCount,
    handleAction,
    setCurrentIndex,
  } = processor;

  // ---- 加载态 ----
  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={[s.loadingText, fontStyles.loading]}>{loadingText}</Text>
      </View>
    );
  }

  // ---- 空态 ----
  if (totalCount === 0) {
    return (
      <View style={s.center}>
        <Text style={[s.loadingText, fontStyles.loading]}>未发现可处理的照片</Text>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backBtnTxt}>{backBtnText}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 是否到达末尾
  const isAtEnd = totalCount > 0 && currentIndex >= totalCount - 1;

  return (
    <SafeAreaView style={s.container}>
      {/* ===== 顶部导航 ===== */}
      <View style={s.nav}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[s.navBtnText, fontStyles.navBtn]}>返回</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={s.countText}>
            {currentIndex + 1} / {totalCount}
          </Text>
          {navExtra}
        </View>
        <TouchableOpacity onPress={onDone}>
          <Text style={s.doneText}>完成</Text>
        </TouchableOpacity>
      </View>

      {/* ===== 图片卡片 ===== */}
      <View style={s.content}>
        <View style={s.card}>
          {currentPhoto && (
            <Image
              source={{ uri: currentPhoto.uri }}
              style={s.fullImg}
              contentFit="contain"
            />
          )}

          {/* 蒙版：渐变 + icon + 文字 */}
          {currentSessionStatus !== undefined && (
            <LinearGradient
              style={s.mask}
              colors={
                currentSessionStatus === PhotoStatus.PENDING_DELETE
                  ? C.gradient.delete
                  : C.gradient.keep
              }
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <MaterialIcons
                name={currentSessionStatus === PhotoStatus.PENDING_DELETE ? 'delete-outline' : 'check-circle-outline'}
                size={60}
                color={C.textDark.primary}
              />
              <Text style={s.maskLabel}>
                {currentSessionStatus === PhotoStatus.PENDING_DELETE ? '待删除' : '待保留'}
              </Text>
            </LinearGradient>
          )}
        </View>
      </View>

      {/* ===== 底部操作栏 ===== */}
      <View style={s.footer}>
        {/* 上一张 */}
        <TouchableOpacity
          style={[s.circle, s.bgGray, currentIndex <= 0 && s.btnDisabled]}
          disabled={currentIndex <= 0}
          onPress={() => setCurrentIndex(v => v - 1)}
        >
          <MaterialIcons
            name="chevron-left"
            size={28}
            color={currentIndex <= 0 ? '#BBB' : C.text.primary}
          />
        </TouchableOpacity>

        {/* 删除 */}
        <TouchableOpacity
          style={[s.circle, s.bgGray]}
          onPress={() => handleAction(PhotoStatus.PENDING_DELETE)}
        >
          <MaterialIcons name="delete-outline" size={28} color={C.text.primary} />
        </TouchableOpacity>

        {/* 保留 */}
        <TouchableOpacity
          style={[s.circle, s.bgGray]}
          onPress={() => handleAction(PhotoStatus.PENDING_KEEP)}
        >
          <MaterialIcons name="check-circle-outline" size={28} color={C.text.primary} />
        </TouchableOpacity>

        {/* 下一张 */}
        <TouchableOpacity
          style={[s.circle, s.bgGray, isAtEnd && s.btnDisabled]}
          disabled={isAtEnd}
          onPress={() => setCurrentIndex(v => v + 1)}
        >
          <MaterialIcons
            name="chevron-right"
            size={28}
            color={isAtEnd ? '#BBB' : C.text.primary}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---- 样式（集中定义，引用颜色常量）----

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg.page,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg.page,
  },
  loadingText: {
    color: C.text.secondary,
    marginTop: 10,
  },
  backBtn: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backBtnTxt: {
    color: C.primary,
    ...fontStyles.btnText,
  },

  /* 导航 */
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    alignItems: 'center',
  },
  navBtnText: {
    color: C.text.primary,
  },
  doneText: {
    color: C.primary,
    ...fontStyles.navBtn,
    fontWeight: 'bold',
  },
  countText: {
    color: C.text.secondary,
    fontWeight: 'bold',
    ...fontStyles.count,
  },

  /* 内容区 */
  content: {
    flex: 1,
    padding: 10,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'transparent',
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
    color: C.textDark.primary,
    ...fontStyles.maskLabel,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },

  /* 底部操作栏 */
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
    backgroundColor: '#E5E5EA',
  },
  btnDisabled: {
    backgroundColor: '#F2F2F7',
    opacity: 0.5,
  },
});
