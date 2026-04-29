# Changelog

All notable changes to this project will be documented in this file.

---

## [0.1.1] — 2026-04-29

### 新增功能
- **照片信息栏** — 处理界面新增拍摄时间 + 中文地理位置显示（`PhotoInfoBar` 组件）
  - 时间精确到分钟格式展示
  - 通过 `expo-location` 反解坐标为中文地址（如：上海市浦东新区）
  - 内置地理缓存，避免重复请求
- **相册管理全选按钮** — 归档相册选择弹窗新增「全选 / 取消全选」快捷操作
- **首页初始化按钮** — 导航栏右侧新增 🔄 图标，一键将纯保留照片还原为未处理状态
  - 带二次确认弹窗，显示即将还原的照片数量
  - 已归档到相册的照片不受影响
- **组件化重构** — 提交逻辑拆分为独立模块：
  - `src/utils/commitUtils.ts` — 纯工具函数（分类、摘要构建）
  - `src/services/commitExecutor.ts` — 系统 API 操作层（删除、归档）

### Bug 修复
- **归档功能修复** — 选择归档后现在会正确调用 `MediaLibrary.addAssetsToAlbumAsync()` 写入系统相册
- **时间显示修复** — 修复年份显示为 58243 的问题（`creationTime` 已是毫秒，移除多余的 `*1000`）
- **位置显示修复** — 修复 iOS 端 `lat.toFixed is not a function` 崩溃（iOS 返回字符串类型坐标，已添加 `Number()` 转换）
- **位置数据获取修复** — `Asset.location` 不在默认字段中，改为通过 `getAssetInfoAsync()` 单独请求
- **首页间隙修复** — 修复切换到首页时标题与列表间异常间隙的问题（设置 FlatList `contentInsetAdjustmentBehavior="never"`）
- **相册选择保持** — 新增相册后或页面切换时，用户之前的相册勾选状态不再被重置为全选（持久化到 Zustand Store）

### UI 优化
- 初始化图标放大至 26px，颜色统一为主题色 `#007AFF`
- 底部 Tab 栏高亮颜色与「新建相册」背景色统一为 `#007AFF`
- 新增 `info` 字体样式用于信息栏文字

### 文件变更清单
| 类型 | 文件 |
|------|------|
| **新增** | `src/components/AlbumTabBar.tsx` |
| **新增** | `src/components/PhotoInfoBar.tsx` |
| **新增** | `src/hooks/usePhotoInfo.ts` |
| **新增** | `src/utils/commitUtils.ts` |
| **新增** | `src/services/commitExecutor.ts` |
| **修改** | `app/(tabs)/index.tsx` — 初始化按钮 + 间隙修复 |
| **修改** | `app/(tabs)/random.tsx` — 相册选择持久化 |
| **修改** | `app/process.tsx` — 相册选择持久化 |
| **修改** | `src/components/ProcessView.tsx` — 集成 PhotoInfoBar |
| **修改** | `src/hooks/useSessionProcessor.ts` — 使用重构后的模块 |
| **修改** | `src/store/usePhotoStore.ts` — 初始化方法 + visibleAlbumIds 持久化 |
| **修改** | `src/utils/constants.ts` — 类型定义扩展 |
| **修改** | `src/utils/fonts.ts` — info 样式 |
| **修改** | `constants/theme.ts` — Tab 高亮色统一 |

---

## [0.1.0] — 初始版本

### 功能
- 相册网格浏览与点击进入处理
- 滑动卡片式照片处理界面（保留 / 删除）
- 自定义相册归档功能
- 随机模式入口
- Zustand 状态持久化
