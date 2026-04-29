/**
 * 全局颜色常量 — 统一项目中所有硬编码色值
 *
 * 命名规则：按语义分类（primary/success/danger/text/background）
 * 新增色值在此处添加，业务文件直接引用，一处修改全局生效。
 */

// ---- 品牌 / 强调色 ----
/** iOS 系统蓝：按钮、链接、ActivityIndicator */
export const primary = '#007AFF';
/** 成功/保留状态绿 */
export const success = '#34C759';
/** 错误/删除状态红（纯色） */
export const danger = '#FF3B30';

// ---- 文字色（浅色背景）----
export const text = {
  /** 主文字：标题、重要内容 */
  primary: '#1A1A1A',
  /** 次要文字：说明、提示信息 */
  secondary: '#888',
  /** 辅助文字：占位符、空状态 */
  tertiary: '#BBB',
} as const;

// ---- 文字色（深色背景）----
export const textDark = {
  /** 主文字：导航栏、按钮文字 */
  primary: '#FFF',
  /** 弱化文字：计数器、禁用态 */
  disabled: '#3A3A3C',
  /** 中性灰文字：计数显示 */
  muted: '#48484A',
} as const;

// ---- 背景色（浅色页面）----
export const bg = {
  /** 页面底色 */
  page: '#FFF',
  /** 卡片/区块底色 */
  card: '#F2F2F7',
  /** 列表项底色（略深于 card）*/
  item: '#F0F0F5',
  /** 分隔线 */
  border: '#F2F2F7',
} as const;

// ---- 背景色（深色页面 process/random/album-detail）----
export const bgDark = {
  /** 容器底色 */
  page: '#000',
  /** 卡片/内容区底色 */
  surface: '#1C1C1E',
  /** 按钮底色（略亮于 surface） */
  elevated: '#2C2C2E',
  /** 禁用态按钮（同 surface） */
  disabled: '#1C1C1E',
} as const;

// ---- 渐变蒙版预设 ----
export const gradient = {
  /** 删除状态红渐变（从上到下淡出） */
  delete: ['rgba(255,59,48,0.6)', 'rgba(255,59,48,0.15)', 'rgba(255,59,48,0)'],
  /** 保留状态绿渐变（从上到下淡出） */
  keep: ['rgba(52,199,89,0.6)', 'rgba(52,199,89,0.15)', 'rgba(52,199,89,0)'],
  /** SwipeCard 删除蒙版（上浓下无） */
  swipeDeleteTop: ['rgba(255, 59, 48, 0.7)', 'transparent'],
  /** SwipeCard 已处理蒙版（下浓上无） */
  swipeKeepBottom: ['transparent', 'rgba(52, 199, 89, 0.7)'],
} as const;
