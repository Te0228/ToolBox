# AI-Desktop-X 项目规范

## 项目概述

从 0 开始构建一个名为 **AI-Desktop-X** 的现代化 Electron 应用。

---

## 1. 核心技术栈与版本控制

### 框架与语言
- **框架**: Electron + Vite + React (latest) + TypeScript
- **构建工具**: 使用 electron-vite 官方推荐结构

### UI 与样式
- **UI 库**: Tailwind CSS + shadcn/ui (必须使用其最新 CLI 初始化)
- **图标**: Lucide React
- **动画**: Framer Motion (用于平滑的界面切换)

---

## 2. 视觉与主题规范

### 主题设置
- **主题**: 原生支持深色模式 (Dark Mode)
- **主色调**: 使用 Zinc (石墨色) 风格

### 窗口效果
- **窗口类型**: 启用 Electron 的无边框窗口 (Frameless Window)
- **标题栏**: 实现自定义标题栏（包含最小化、关闭按钮）

### 视觉效果
- **材质**: 主窗口要求实现毛玻璃 (Glassmorphism) 效果
- **背景**: 使用 `bg-background/80` 配合 `backdrop-blur`

---

## 3. 布局结构 (Layout)

### 侧边栏
- **位置**: 左侧
- **宽度**: 240px
- **类型**: 持久化侧边栏 (Sidebar)
- **内容**: 包含导航菜单和用户头像

### 主内容区
- **位置**: 右侧
- **类型**: 响应式内容区
- **导航**: 顶部带有面包屑导航

### 组件示例
在主页面展示：
- 一个 shadcn/ui 的 Card 组件
- 一个带有 Loading 状态的 Button

---

## 4. 核心功能与 IPC 注入

### 主进程配置
- 配置好 Vite 的 preload 脚本
- 将一个名为 `electronAPI` 的对象暴露给全局 `window`

### 通信示例
实现一个"获取系统内存信息"的 IPC 调用：
- 从渲染进程发起请求
- 主进程返回数据
- 由 React 状态显示

---

## 5. 任务流程

### 第一步：项目初始化
给出完整的终端初始化命令（包括安装 shadcn/ui 的命令）

### 第二步：配置文件生成
生成以下配置文件：
- `package.json`
- `electron-builder.yml`

### 第三步：主进程文件生成
生成主进程相关文件：
- `main/index.ts`
- `preload/index.ts`

### 第四步：渲染进程组件生成
生成渲染进程的核心布局组件：
- `App.tsx`
- `layout.tsx`

---

## 注意事项

- 所有依赖应使用最新稳定版本
- 遵循 TypeScript 严格模式
- 确保代码风格统一
- 遵循 Electron 安全最佳实践