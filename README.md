<div align="center">

<img src="./icon/FRFicon.png" alt="FRF Icon" width="128">

# FRF - Friend Review Fixer

**Steam 好友评测修复工具** | **Steam Friend Reviews Fixer**

[![Version](https://img.shields.io/badge/version-5.3.2-blue.svg)](https://github.com/JohnS3248/FRF/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Greasy Fork](https://img.shields.io/greasyfork/v/556679?label=Greasy%20Fork)](https://greasyfork.org/zh-CN/scripts/556679)

**[中文](#中文) | [English](#english)**

修复 Steam 好友评测页面的随机不正常渲染问题，并且可以自定义完整显示所有好友的游戏评测

</div>

<p align="center">
  <img src="./assets/gifs/脚本主要演示.gif" alt="FRF 演示" width="800">
</p>

<div align="center">

安装后无需任何操作，FRF 会自动工作：访问 Steam 游戏的好友评测页面 → 自动检测 → 自动修复并显示

</div>

---

## 中文

### 这是什么？

当你在 Steam 商店看到「XX 位好友推荐了这款游戏」，点击「查看好友的所有评测」后经常会遇到：
- 页面显示深蓝色，评测列表不加载
- 但是又有部分页面显示正常，问题非常随机

**FRF 可以帮你修复这些问题，完整显示所有好友对该游戏的评测。**
- FRF 可以主动帮你查找好友的评测并渲染显示
- FRF 的渲染比官方的更好，可以显示发布时间、修改时间、评测时的小时数、头像框等信息
- FRF 支持截图渲染，可以直接在评测卡片中查看好友分享的截图
- FRF 支持评测投票，可以直接在卡片中对好友的评测进行「是/否/欢乐」投票
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

[点击安装 - Greasy Fork](https://greasyfork.org/zh-CN/scripts/556679)

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
- **手动刷新**：点击「FRF 刷新」按钮重新获取最新数据
- **缓存有效期**：可自定义（默认 7 天）

#### 设置面板

点击「FRF 设置」打开设置面板：

**常规设置**

| 选项 | 说明 | 默认值 |
|------|------|--------|
| 每次渲染评测数 | 找到 N 篇评测后立即显示 | 3 |
| 评测内容截断长度 | 评测文本最大显示字数（0 = 不截断） | 300 |
| 缓存有效期 | 缓存数据的保存时长 | 7 天 |

**缓存管理**

| 操作 | 说明 |
|------|------|
| 清除缓存 | 删除所有缓存数据 |
| 导出缓存 | 下载 JSON 备份文件 |
| 导入缓存 | 从备份文件恢复 |

**高级设置**（一般无需修改）

| 选项 | 说明 | 默认值 |
|------|------|--------|
| 批次大小 | 每次并发请求的好友数量 | 15 |
| 批次延迟 | 每批请求之间的等待时间 | 50ms |
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

When you see "XX friends recommend this game" on Steam store and click "View all friend reviews", you often encounter:
- Page shows dark blue background, reviews don't load
- Some pages work fine while others don't - the issue is very random

**FRF fixes these issues and displays all your friends' reviews for the game.**
- FRF proactively finds and renders your friends' reviews
- FRF's rendering is better than Steam's official one, showing publish date, update date, hours at review time, avatar frames, etc.
- FRF supports screenshot rendering - view screenshots shared by friends directly in the review card
- FRF supports review voting - vote Yes/No/Funny on friends' reviews directly from the card
- FRF has customizable settings - choose custom text truncation or show full content
- FRF can even refresh pages where Steam's official rendering works (only for "Friends" filter)

### Other Features

FRF allows you to customize the preview character count for each friend's review card. Default is 300. You can adjust this freely based on your preference. Set it to "0" to show full content, so you don't need to click each review to see details.

<p align="center">
  <img src="./assets/gifs/取消好友评测截断.gif" alt="Disable truncation demo" width="700">
</p>

FRF can also replace Steam's official friend review rendering. The script's rendering shows more comprehensive information than Steam.

<p align="center">
  <img src="./assets/gifs/改变原有的评测显示.gif" alt="Replace rendering demo" width="700">
</p>

### Installation

#### Step 1: Install a Userscript Manager

If you haven't installed a userscript manager, please install one of the following extensions:

| Browser | Recommended Extension |
|---------|----------------------|
| Chrome / Edge | [Tampermonkey](https://www.tampermonkey.net/) |
| Firefox | [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) |
| Safari | [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) |

#### Step 2: Install FRF

**Option 1: Install from Greasy Fork (Recommended)**

[Click to Install - Greasy Fork](https://greasyfork.org/zh-CN/scripts/556679)

**Option 2: Manual Install**

1. Open [dist/steam-friend-reviews-fixer.user.js](dist/steam-friend-reviews-fixer.user.js)
2. Click the "Raw" button
3. Your userscript manager will prompt for installation, click "Install"

### Manual Refresh

Two buttons appear at the top of the page:

- **FRF Refresh**: Re-scan all friends' reviews (ignores cache)
- **FRF Settings**: Open settings panel

Click "FRF Refresh" to force fetch the latest data.

### Features

#### Smart Caching

- **First visit**: ~40 seconds to scan (depends on friend count)
- **Return visits**: Instant loading (from cache)
- **Manual refresh**: Click "FRF Refresh" button to fetch latest data
- **Cache duration**: Customizable (default 7 days)

#### Settings Panel

Click "FRF Settings" to open the settings panel:

**General Settings**

| Option | Description | Default |
|--------|-------------|---------|
| Reviews per render | Display after finding N reviews | 3 |
| Content truncate length | Max characters to show (0 = no truncation) | 300 |
| Cache duration | How long to keep cached data | 7 days |

**Cache Management**

| Action | Description |
|--------|-------------|
| Clear Cache | Delete all cached data |
| Export Cache | Download JSON backup file |
| Import Cache | Restore from backup file |

**Advanced Settings** (usually no need to modify)

| Option | Description | Default |
|--------|-------------|---------|
| Batch size | Number of concurrent friend requests | 15 |
| Batch delay | Wait time between batches | 50ms |
| Debug mode | Show detailed logs in console | Off |

### How it Works

FRF bypasses Steam's rendering bug by fetching data directly from each friend's personal review page:

```
1. Get your Steam friends list
2. Concurrently check if each friend reviewed the current game
3. Extract review details (recommendation, playtime, content, etc.)
4. Render review cards in Steam style
5. Cache results locally for instant loading next time
```

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

**Q: Why is the first load so slow? How long does it take?**

A: First load scans all friends for reviews. Testing shows 229 friends takes 40-50 seconds. Subsequent visits use cache for instant loading.

**Q: How to force refresh data?**

A: Click "FRF Refresh" button on the page, or run `FRF.renderUI(true)` in console.

**Q: Where is cache stored?**

A: In browser's localStorage, local to current device only. Use "Export Cache" to backup.

**Q: Why are some friends' reviews not showing?**

A: Possible reasons:
- Friend's review is set to private
- Friend deleted the review
- Cache expired, click "FRF Refresh" to re-fetch

### Feedback

Found a bug? Please submit an issue on [GitHub Issues](https://github.com/JohnS3248/FRF/issues).

---

## License

MIT License - See [LICENSE](LICENSE)

## Links

- [GitHub Repository](https://github.com/JohnS3248/FRF)
- [Issue Tracker](https://github.com/JohnS3248/FRF/issues)
- [Greasy Fork](https://greasyfork.org/zh-CN/scripts/556679)
