# FRF - Friend Review Finder

**[中文](#中文) | [English](#english)**

---

## 中文

### 项目简介

FRF (Friend Review Finder) 是一个油猴脚本，用于修复 Steam 社区长期存在的"好友评测页面 500 错误"问题。

### 问题背景

在 Steam 商店或社区页面，经常会看到"XX 位好友推荐了这款游戏"的提示，但点击"查看好友的所有评测"后，页面会返回 HTTP 500 错误或显示空白内容。

- **问题 URL**: `https://steamcommunity.com/app/{appid}/reviews/?browsefilter=createdbyfriends`
- **影响范围**: 大多数活跃游戏都存在此问题
- **持续时间**: Steam 官方多年未修复

### 解决方案

FRF 通过以下方式绕过 Steam 的 bug：

1. 获取你的好友列表
2. 遍历每个好友的个人评测页面
3. 提取目标游戏的评测数据
4. 使用 Steam 原生样式重新渲染评测列表

### 安装方法

**即将推出...**

1. 安装油猴脚本管理器（[Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/)）
2. 点击安装链接：[安装 FRF]()
3. 访问任意 Steam 游戏页面即可使用

### 使用截图

_开发中..._

### 技术特性

- ✅ 自动检测并修复 500 错误页面
- ✅ 完整提取评测信息（推荐状态、游戏时长、发布时间等）
- ✅ 使用 Steam 官方样式渲染
- 🚧 多语言支持（中文、英文）
- 🚧 本地缓存机制
- 🚧 性能优化

### 项目状态

🚧 **开发中** - 当前版本：0.1.0 (Pre-release)

### 参与贡献

欢迎提交 Issue 和 Pull Request！

### 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

## English

### Introduction

FRF (Friend Review Finder) is a userscript that fixes the long-standing "Friend Reviews 500 Error" issue on Steam Community.

### Problem Background

On Steam store or community pages, you often see "XX friends recommend this game", but clicking "View all friend reviews" results in an HTTP 500 error or blank page.

- **Problem URL**: `https://steamcommunity.com/app/{appid}/reviews/?browsefilter=createdbyfriends`
- **Scope**: Most active games are affected
- **Duration**: Steam has not fixed this for years

### Solution

FRF bypasses Steam's bug by:

1. Fetching your friends list
2. Iterating through each friend's personal review page
3. Extracting review data for the target game
4. Re-rendering the review list using Steam's native styles

### Installation

**Coming soon...**

1. Install a userscript manager ([Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/))
2. Click install link: [Install FRF]()
3. Visit any Steam game page to use

### Screenshots

_In development..._

### Features

- ✅ Auto-detect and fix 500 error pages
- ✅ Extract complete review information (recommendation, playtime, dates, etc.)
- ✅ Render using Steam's official styles
- 🚧 Multi-language support (Chinese, English)
- 🚧 Local caching mechanism
- 🚧 Performance optimization

### Project Status

🚧 **In Development** - Current version: 0.1.0 (Pre-release)

### Contributing

Issues and Pull Requests are welcome!

### License

MIT License - See [LICENSE](LICENSE)

---

## 相关链接 / Links

- [前期调研文档](前期调研文档/Steam%20好友评测页面修复项目完整文档（前期调研文档）.md)
- [Greasy Fork]() (即将发布)
- [问题反馈](https://github.com/JohnS3248/FRF/issues)
