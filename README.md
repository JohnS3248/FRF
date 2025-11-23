<div align="center">

# FRF - Friend Review Finder

**Steam 好友评测修复工具** | **Steam Friend Reviews Fixer**

[![Version](https://img.shields.io/badge/version-5.1.6-blue.svg)](https://github.com/JohnS3248/FRF/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Greasy Fork](https://img.shields.io/badge/Greasy%20Fork-即将发布-orange.svg)](https://greasyfork.org/)

修复 Steam 好友评测页面的随机不正常渲染问题，并且可以自定义完整显示所有好友的游戏评测

</div>

<p align="center">
  <img src="./assets/gifs/脚本主要演示.gif" alt="FRF 演示" width="800">
</p>

<div align="center">

安装后无需任何操作，FRF 会自动工作：访问 Steam 游戏的好友评测页面 → 自动检测 → 自动修复并显示

**[中文](#中文) | [English](#english)**

</div>

---

## 中文

### 这是什么？

当你在 Steam 商店看到「XX 位好友推荐了这款游戏」，点击「查看好友的所有评测」后经常会遇到：
- 页面显示深蓝色，评测列表不加载
- 但是又有部分页面显示正常，问题非常随机

**FRF 可以帮你修复这些问题，完整显示所有好友对该游戏的评测。**
- FRF 可以主动帮你查找好友的评测并渲染显示
- FRF 的渲染比官方的更好，可以显示发布时间、修改时间和评测时的小时数等信息
- FRF 具有自定义设置，可以根据偏好选择自定义字数截断/全部显示
- FRF 甚至可以刷新官方正常渲染的好友评测界面（仅「来自好友的评测」筛选可用）

### 其他功能

FRF 可以自定义每个好友卡片评测的预览字数,默认是300.这个值可以自由调整,取决于你的偏好.如果填“0”就是全部显示,这样就可以不需要单独点击每个好友的评测查看详情,直接显示完整的好友评测

<p align="center">
  <img src="./assets/gifs/取消好友评测截断.gif" alt="取消截断演示" width="700">
</p>

FRF 还可以改变steam来自好友的评测的官方渲染,脚本的渲染相比steam展示的信息更加全面

<p align="center">
  <img src="./assets/gifs/改变原有的评测显示.gif" alt="改变渲染演示" width="700">
</p>

### 安装方法

#### 第一步：安装脚本管理器

如果你还没有安装油猴脚本管理器，请先安装以下任一扩展：

| 浏览器 | 推荐扩展 |
|--------|----------|
| Chrome / Edge | [Tampermonkey](https://www.tampermonkey.net/) |
| Firefox | [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/) |
| Safari | [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) |

#### 第二步：安装 FRF 脚本

**方式一：从 Greasy Fork 安装（推荐）**

即将发布，敬请期待...

**方式二：手动安装**

1. 打开 [dist/steam-friend-reviews-fixer.user.js](dist/steam-friend-reviews-fixer.user.js)
2. 点击「Raw」按钮
3. 脚本管理器会自动弹出安装确认，点击「安装」

### 手动刷新

页面顶部会显示两个按钮：

- **FRF 刷新**：重新搜索所有好友的评测（忽略缓存）
- **FRF 设置**：打开设置面板

点击「FRF 刷新」可以强制重新获取最新数据。

### 功能特性

#### 智能缓存

- **首次访问**：约 40 秒完成搜索（取决于好友数量）
- **再次访问**：秒加载（从缓存读取）
- **后台更新**：缓存加载后自动检查是否有新评测
- **缓存有效期**：7 天

#### 设置面板

点击「FRF 设置」打开设置面板：

**常规设置**

| 选项 | 说明 | 默认值 |
|------|------|--------|
| 每次渲染评测数 | 找到 N 篇评测后立即显示 | 3 |
| 评测内容截断长度 | 评测文本最大显示字数（0 = 不截断） | 300 |
| 后台静默更新 | 缓存加载后自动检查新评测 | 开启 |

**缓存管理**

| 操作 | 说明 |
|------|------|
| 清除缓存 | 删除所有缓存数据 |
| 导出缓存 | 下载 JSON 备份文件 |
| 导入缓存 | 从备份文件恢复 |

**高级设置**（一般无需修改）

| 选项 | 说明 | 默认值 |
|------|------|--------|
| 批次大小 | 每次并发请求的好友数量 | 30 |
| 批次延迟 | 每批请求之间的等待时间 | 0ms |
| 调试模式 | 在控制台显示详细日志 | 关闭 |

### 工作原理

FRF 绕过 Steam 的渲染 Bug，直接从每个好友的个人评测页面获取数据：

```
1. 获取你的 Steam 好友列表
2. 并发检查每个好友是否评测了当前游戏
3. 提取评测详情（推荐状态、游戏时长、评测内容等）
4. 使用 Steam 风格渲染评测卡片
5. 将结果缓存到本地，下次秒加载
```

### 控制台命令（高级用户）

在浏览器控制台（F12）输入以下命令：

```javascript
FRF.help()           // 显示帮助信息
FRF.renderUI()       // 渲染好友评测
FRF.renderUI(true)   // 强制刷新（忽略缓存）
FRF.stats()          // 查看缓存统计
FRF.clearCache()     // 清除缓存
FRF.openSettings()   // 打开设置面板
```

### 常见问题

**Q: 首次使用为什么这么慢？大概需要多久？**

A: 首次需要遍历所有好友检查评测，实测229个好友需要加载40～50秒。之后会使用缓存，秒加载。

**Q: 如何强制刷新数据？**

A: 点击页面上的「FRF 刷新」按钮，或在控制台输入 `FRF.renderUI(true)`。

**Q: 缓存数据保存在哪里？**

A: 保存在浏览器的 localStorage 中，仅在当前设备有效。可通过「导出缓存」功能备份。

**Q: 为什么有些好友的评测没显示？**

A: 可能原因：
- 好友的评测设为了仅自己可见
- 好友删除了评测
- 缓存数据过期，点击「FRF 刷新」重新获取

### 问题反馈

遇到问题？请在 [GitHub Issues](https://github.com/JohnS3248/FRF/issues) 提交反馈。

---

## English

### What is this?

FRF is a userscript that fixes the long-standing friend reviews display issue on Steam Community.

When you see "XX friends recommend this game" on Steam store and click "View all friend reviews", you often encounter:
- HTTP 500 error
- Blank page with no reviews loading
- Only partial friend reviews showing

**FRF fixes these issues and displays all your friends' reviews for the game.**

### Installation

#### Step 1: Install a Userscript Manager

| Browser | Recommended Extension |
|---------|----------------------|
| Chrome / Edge | [Tampermonkey](https://www.tampermonkey.net/) |
| Firefox | [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) |
| Safari | [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) |

#### Step 2: Install FRF

**Option 1: Install from Greasy Fork (Recommended)**

Coming soon...

**Option 2: Manual Install**

1. Open [dist/steam-friend-reviews-fixer.user.js](dist/steam-friend-reviews-fixer.user.js)
2. Click the "Raw" button
3. Your userscript manager will prompt for installation

### How to Use

#### Automatic Mode (Recommended)

No action needed after installation:

1. Visit any Steam game's friend reviews page
2. FRF automatically detects page status
3. If Steam rendering fails, FRF auto-fixes and displays friend reviews

#### Manual Refresh

Two buttons appear at the top of the page:

- **FRF Refresh**: Re-scan all friends' reviews (ignores cache)
- **FRF Settings**: Open settings panel

### Features

#### Smart Caching

- **First visit**: ~40 seconds to scan (depends on friend count)
- **Return visits**: Instant loading (from cache)
- **Background updates**: Auto-checks for new reviews after cache load
- **Cache duration**: 7 days

#### Settings Panel

**General Settings**

| Option | Description | Default |
|--------|-------------|---------|
| Reviews per render | Display after finding N reviews | 3 |
| Content truncate length | Max characters to show (0 = full) | 300 |
| Background update | Auto-check for new reviews | On |

**Cache Management**

| Action | Description |
|--------|-------------|
| Clear Cache | Delete all cached data |
| Export Cache | Download JSON backup |
| Import Cache | Restore from backup |

### Console Commands (Advanced)

Open browser console (F12) and type:

```javascript
FRF.help()           // Show help
FRF.renderUI()       // Render friend reviews
FRF.renderUI(true)   // Force refresh (ignore cache)
FRF.stats()          // View cache statistics
FRF.clearCache()     // Clear cache
FRF.openSettings()   // Open settings panel
```

### FAQ

**Q: Why is the first load so slow?**

A: First load scans all friends for reviews (~42s for 229 friends). Subsequent visits use cache for instant loading.

**Q: How to force refresh?**

A: Click "FRF Refresh" button or run `FRF.renderUI(true)` in console.

**Q: Where is cache stored?**

A: In browser's localStorage, local to current device. Use "Export Cache" to backup.

### Feedback

Found a bug? Please submit an issue on [GitHub Issues](https://github.com/JohnS3248/FRF/issues).

---

## License

MIT License - See [LICENSE](LICENSE)

## Links

- [GitHub Repository](https://github.com/JohnS3248/FRF)
- [Issue Tracker](https://github.com/JohnS3248/FRF/issues)
- Greasy Fork (Coming soon)
