/**
 * 构建脚本：将模块化代码合并成单个文件
 * 支持两种模式：
 * 1. 开发模式：生成控制台测试文件
 * 2. 生产模式：生成油猴脚本文件
 */

const fs = require('fs');
const path = require('path');

const MODE = process.argv.includes('--production') ? 'production' : 'development';

console.log(`\n📦 开始构建 (${MODE} 模式)...\n`);

// 读取 package.json 获取版本号（统一版本管理）
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);
const VERSION = packageJson.version;
console.log(`📌 版本号: ${VERSION}\n`);

// 文件加载顺序（重要！）- v5.0 精简版
const SOURCE_FILES = [
  'src/utils/constants.js',
  'src/utils/logger.js',
  'src/utils/validator.js',
  'src/core/ReviewExtractor.js',
  'src/core/ReviewCache.js',          // 字典缓存（精简版）
  'src/core/QuickSearcher.js',        // 快速搜索
  'src/core/SteamAPI.js',
  'src/ui/UIRenderer.js',             // UI渲染器
  'src/ui/PageDetector.js',           // 页面检测器
  'src/ui/SettingsPanel.js',          // 设置面板
  'src/main.js'
];

// 读取所有源文件
let combinedCode = '';

SOURCE_FILES.forEach(file => {
  const filePath = path.join(__dirname, '..', file);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${file}`);
    process.exit(1);
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 自动替换 constants.js 中的版本号
  if (file === 'src/utils/constants.js') {
    content = content.replace(/VERSION:\s*['"][^'"]+['"]/, `VERSION: '${VERSION}'`);
  }

  console.log(`✓ 加载: ${file}`);

  combinedCode += `\n// ==================== ${file} ====================\n\n`;
  combinedCode += content;
  combinedCode += '\n';
});

// 根据模式生成不同的输出
if (MODE === 'development') {
  // 开发模式：生成控制台测试文件
  const devFile = path.join(__dirname, '..', 'dist', 'frf-dev-test.js');

  const devCode = `
/**
 * FRF v${VERSION} - 开发测试版本
 * 智能缓存 + 设置面板
 *
 * 使用方法：
 * 1. 访问 Steam 好友评测页面（如 steamcommunity.com/app/413150/reviews/?browsefilter=createdbyfriends）
 * 2. 打开浏览器控制台（F12）
 * 3. 复制粘贴此文件全部内容并回车
 * 4. FRF会自动检测并修复Steam渲染bug
 *
 * 工作原理：
 * - 首次访问：快速搜索 (~42秒)，结果自动缓存
 * - 再次访问：秒加载缓存，后台静默检查更新
 * - 发现改动：页面顶部提示，点击可刷新
 *
 * 常用命令：
 * - FRF.renderUI()     渲染好友评测到页面
 * - FRF.renderUI(true) 强制刷新重新获取
 * - FRF.quick(413150)  快速搜索星露谷物语
 * - FRF.stats()        查看缓存统计
 * - FRF.help()         查看帮助
 */

(function() {
  'use strict';

${combinedCode}

})();
`;

  fs.writeFileSync(devFile, devCode, 'utf8');
  console.log(`\n✅ 开发版本已生成: dist/frf-dev-test.js`);
  console.log(`📋 文件大小: ${(devCode.length / 1024).toFixed(2)} KB\n`);

} else {
  // 生产模式：生成油猴脚本文件
  const prodFile = path.join(__dirname, '..', 'dist', 'steam-friend-reviews-fixer.user.js');

  const userscriptHeader = `// ==UserScript==
// @name         Steam 好友评测修复工具
// @name:en      Steam Friend Reviews Fixer
// @namespace    https://github.com/JohnS3248/FRF
// @version      ${VERSION}
// @description  自动修复 Steam 好友评测页面渲染 Bug，显示完整的好友评测列表
// @description:en Auto-fix Steam friend reviews rendering bug, display complete friend review list
// @author       JohnS3248
// @match        https://steamcommunity.com/app/*/reviews/*
// @match        https://steamcommunity.com/app/*
// @icon         https://raw.githubusercontent.com/JohnS3248/FRF/main/icon/FRFicon.png
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// @license      MIT
// @homepage     https://github.com/JohnS3248/FRF
// @supportURL   https://github.com/JohnS3248/FRF/issues
// ==/UserScript==

(function() {
  'use strict';

${combinedCode}

  // FRF 自动启动逻辑已内置于 main.js
  // 脚本会自动检测好友评测页面并修复渲染bug

})();
`;

  fs.writeFileSync(prodFile, userscriptHeader, 'utf8');
  console.log(`\n✅ 生产版本已生成: dist/steam-friend-reviews-fixer.user.js`);
  console.log(`📋 文件大小: ${(userscriptHeader.length / 1024).toFixed(2)} KB\n`);
}

console.log('🎉 构建完成！\n');
