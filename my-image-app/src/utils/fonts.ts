/**
 * 全局字体配置 - 统一项目中所有文字的字体样式
 */

import { Platform, StyleSheet } from 'react-native';

/** 基础字体系列 */
export const fontFamily = Platform.select({
  ios: '-apple-system, SF Pro Text, Helvetica Neue, sans-serif',
  android: 'Roboto, Noto Sans, sans-serif',
  default: 'system-ui, sans-serif',
  web: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
});

/** 创建带统一字体的样式 */
export function createFontStyle(fontSize: number, fontWeight?: string | number, other?: Record<string, any>) {
  return {
    fontFamily,
    fontSize,
    ...(fontWeight ? { fontWeight } : {}),
    ...other,
  };
}

/** 预设字号常量 */
export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** 预设通用文字样式 */
export const fontStyles = StyleSheet.create({
  // 基础文字
  default: createFontStyle(FontSize.md),
  // 小字
  small: createFontStyle(FontSize.sm),
  // 大标题
  title: createFontStyle(FontSize.xxxl, 'bold'),
  subtitle: createFontStyle(FontSize.xl, '600'),
  // 导航栏
  navBtn: createFontStyle(FontSize.md),
  count: createFontStyle(FontSize.sm, '400'),
  // 按钮
  btnText: createFontStyle(FontSize.md, '500'),
  // 蒙版标签
  maskLabel: createFontStyle(FontSize.lg, '500'),
  loading: createFontStyle(FontSize.md),
});
