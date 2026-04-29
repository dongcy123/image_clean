# Less is Happiness

> 一款极简主义的照片管理工具，帮助你快速清理手机相册，只留下真正值得保留的瞬间。

**平台**: iOS（Expo Go） | **技术栈**: React Native + Expo Router + Zustand + TypeScript

---

## 功能特性

### 核心功能
- **相册网格浏览** — 首页以三列网格展示所有未处理照片，点击进入处理界面
- **滑动卡片处理** — 在处理界面通过底部操作栏快速标记每张照片：**保留 / 删除**
- **归档管理** — 将保留的照片归档到自定义系统相册中
- **随机模式** — 随机选取起点，适合碎片时间快速整理
- **一键初始化** — 将纯保留状态的照片还原为未处理，支持二次整理

### 信息展示
- **拍摄时间显示** — 精确到分钟的拍摄时间
- **地理位置解析** — 通过坐标反解中文地址（如：上海市浦东新区）
- **相册 Tab 栏** — 横向滑动的归档相册选择栏，支持管理弹窗筛选可见相册

### 数据持久化
- 照片处理状态本地持久化（Zustand + AsyncStorage）
- 相册可见性选择跨页面保持
- 应用重启后进度不丢失

---

## 项目结构

```
my-image-app/
├── app/                        # 路由页面 (Expo Router)
│   ├── (tabs)/
│   │   ├── index.tsx           # 首页：相册网格 + 初始化按钮
│   │   ├── random.tsx          # 随机模式入口
│   │   └── _layout.tsx         # Tab 布局配置
│   ├── process.tsx             # 照片处理页面
│   └── _layout.tsx             # 根布局
├── src/
│   ├── components/
│   │   ├── AlbumTabBar.tsx     # 相册归档 Tab 栏（含全选/管理弹窗）
│   │   ├── PhotoInfoBar.tsx    # 照片信息栏（时间+地点）
│   │   ├── ProcessView.tsx     # 统一处理界面组件
│   │   └── SwipeCard.tsx       # 滑动卡片组件
│   ├── hooks/
│   │   ├── usePhotoInfo.ts     # 照片元数据提取 Hook
│   │   ├── useSessionProcessor.ts  # 会话级处理逻辑编排
│   │   ├── useMediaSync.ts     # 系统相册同步 Hook
│   │   └── usePhotoLoader.ts   # 照片列表加载 Hook
│   ├── services/
│   │   └── commitExecutor.ts   # 系统操作执行层（删除/归档 API）
│   ├── store/
│   │   └── usePhotoStore.ts    # Zustand 全局状态管理
│   └── utils/
│       ├── commitUtils.ts      # 提交分类与摘要构建工具函数
│       ├── colors.ts           # 颜色常量
│       ├── constants.ts        # 类型定义与枚举
│       └── fonts.ts            # 字体样式常量
└── constants/theme.ts          # 主题配置
```

## 快速开始

```bash
# 克隆项目
git clone <repo-url>
cd my-image-app

# 安装依赖
npm install

# 启动开发服务器
npx expo start

# 用 Expo Go 扫码在手机上运行
# 按 t 切换 Tunnel 模式（跨网络时使用）
```

### 依赖要求

| 包名 | 用途 |
|------|------|
| `expo-media-library` | 系统相册读写、权限管理 |
| `expo-location` | GPS 坐标 → 中文地址反解析 |
| `expo-image` | 高性能图片加载 |
| `expo-linear-gradient` | 卡片蒙版渐变效果 |
| `zustand` | 轻量级全局状态管理 |
| `@react-navigation/bottom-tabs` | 底部 Tab 导航 |

### 权限说明

应用需要以下 iOS 权限：
- **相册访问权限** (`NSPhotoLibraryUsageDescription`) — 读取和写入系统相册
- **定位权限** (`NSLocationWhenInUseUsageDescription`) — 获取拍摄地点信息（仅用于地址展示）

## 照片状态流转

```
                    ┌─────────────┐
                    │   未处理     │ (NONE)
                    └──────┬──────┘
                           │ 保留
              ┌────────────▼────────────┐
              │   待保留 (PENDING_KEEP)   │  ← 处理页中间态
              ├────────────┬────────────┤
              │ 归档到相册  │ 直接确认    │
              ▼            ▼            │
      ┌──────────────┐  ┌─────────────┤
      │ 已处理(有归属) │  │已处理(无归属)│
      └──────────────┘  └──────┬──────┘
                                │ 初始化还原
                                ▼
                          ┌──────────┐
                          │  未处理   │
                          └──────────┘
```

## 开发日志

详见 [CHANGELOG.md](./CHANGELOG.md)

## License

MIT
