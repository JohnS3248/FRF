// ==UserScript==
// @name         Steam好友评测修复工具
// @name:en      Steam Friend Reviews Fixer
// @namespace    https://github.com/yourusername/steam-friend-reviews-fix
// @version      0.1.0
// @description  修复Steam社区好友评测页面500错误，通过遍历好友个人页面重建评测列表
// @description:en Fix Steam Community friend reviews 500 error by rebuilding the review list
// @author       YourName
// @match        https://steamcommunity.com/app/*/reviews/*
// @match        https://steamcommunity.com/app/*
// @icon         https://store.steampowered.com/favicon.ico
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ========================================
    // 配置常量
    // ========================================
    const CONFIG = {
        DEBUG: false,
        BATCH_SIZE: 5,
        REQUEST_DELAY: 800,
        CACHE_DURATION: 3600000, // 1小时缓存
    };

    // ========================================
    // 工具函数
    // ========================================
    const Utils = {
        // 从URL提取App ID
        getAppId() {
            const match = window.location.pathname.match(/\/app\/(\d+)/);
            return match ? match[1] : null;
        },

        // 从URL提取Steam ID
        extractSteamId(url) {
            const match = url.match(/\/(profiles|id)\/([^\/]+)/);
            return match ? match[2] : null;
        },

        // 延迟函数
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        // 安全的HTML转义
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        // 格式化时间
        formatDate(dateStr) {
            // 处理各种日期格式
            return dateStr || '未知';
        },

        // 日志输出
        log(...args) {
            if (CONFIG.DEBUG) {
                console.log('[Steam Friend Reviews]', ...args);
            }
        }
    };

    // ========================================
    // Steam API 交互类
    // ========================================
    class SteamAPI {
        constructor(appId) {
            this.appId = appId;
            this.sessionId = this.getSessionId();
        }

        // 获取会话ID
        getSessionId() {
            const sessionScript = document.querySelector('script');
            if (sessionScript) {
                const match = sessionScript.textContent.match(/g_sessionID = "([^"]+)"/);
                return match ? match[1] : null;
            }
            return null;
        }

        // 获取好友列表
        async getFriendsList() {
            Utils.log('获取好友列表...');
            
            try {
                const response = await fetch('/my/friends/', {
                    credentials: 'include'
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const html = await response.text();
                const regex = /data-steamid="(\d+)"/g;
                const matches = [...html.matchAll(regex)];
                const friends = [...new Set(matches.map(m => m[1]))];
                
                Utils.log(`找到 ${friends.length} 个好友`);
                return friends;
                
            } catch (error) {
                console.error('获取好友列表失败:', error);
                return [];
            }
        }

        // 检查单个好友的评测
        async checkFriendReview(steamId) {
            const url = `/profiles/${steamId}/recommended/${this.appId}/`;
            
            try {
                const response = await fetch(url, {
                    credentials: 'include',
                    redirect: 'follow'
                });
                
                if (!response.ok) {
                    return null;
                }
                
                const html = await response.text();
                const finalUrl = response.url;
                
                // 验证是否是正确的游戏评测
                if (!this.validateReview(html, finalUrl)) {
                    return null;
                }
                
                // 提取评测信息
                return this.extractReviewData(html, steamId);
                
            } catch (error) {
                Utils.log(`获取好友 ${steamId} 评测失败:`, error);
                return null;
            }
        }

        // 验证评测有效性
        validateReview(html, url) {
            // 检查URL是否包含正确的App ID
            const hasCorrectUrl = url.includes(`/${this.appId}/`) || 
                                 url.includes(`/${this.appId}`);
            
            // 检查页面是否包含评测内容
            const hasReviewContent = html.includes('ratingSummary') || 
                                    html.includes('reviewInfo');
            
            // 检查是否包含游戏相关内容
            const hasGameContent = html.includes(`app/${this.appId}`) || 
                                  html.includes(`appid=${this.appId}`);
            
            return hasCorrectUrl && hasReviewContent && hasGameContent;
        }

        // 提取评测数据
        extractReviewData(html, steamId) {
            const data = {
                steamId: steamId,
                appId: this.appId,
                url: `https://steamcommunity.com/profiles/${steamId}/recommended/${this.appId}/`
            };
            
            // 提取推荐状态
            data.isPositive = html.includes('icon_thumbsUp.png') || 
                            html.includes('推荐') || 
                            html.includes('Recommended');
            
            // 提取游戏时长
            const hoursMatch = html.match(/总时数\s*([\d,]+(?:\.\d+)?)\s*小时/) ||
                             html.match(/([\d,]+(?:\.\d+)?)\s*hrs?\s+on\s+record/i);
            data.hours = hoursMatch ? hoursMatch[1].replace(/,/g, '') : '0';
            
            // 提取发布日期
            const dateMatch = html.match(/发布于[：:]\s*([^<\r\n]+)/) ||
                            html.match(/Posted[：:]\s*([^<\r\n]+)/i);
            data.publishDate = dateMatch ? dateMatch[1].trim() : '未知';
            
            // 提取用户名和头像
            const nameMatch = html.match(/<a[^>]+class="[^"]*persona[^"]*"[^>]*>([^<]+)</);
            data.username = nameMatch ? nameMatch[1].trim() : `用户 ${steamId}`;
            
            const avatarMatch = html.match(/<img[^>]+src="([^"]+avatar[^"]+)"/);
            data.avatar = avatarMatch ? avatarMatch[1] : '';
            
            // 提取评测文本（截取前200字）
            const textMatch = html.match(/<div[^>]+class="[^"]*review[^"]*"[^>]*>([^]*?)<\/div>/);
            if (textMatch) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = textMatch[1];
                data.reviewText = tempDiv.textContent.trim().substring(0, 200);
            } else {
                data.reviewText = '';
            }
            
            return data;
        }
    }

    // ========================================
    // UI 管理类
    // ========================================
    class UIManager {
        constructor() {
            this.container = null;
            this.progressModal = null;
            this.fixButton = null;
            this.addStyles();
        }

        // 添加自定义样式
        addStyles() {
            const styles = `
                /* 修复按钮样式 */
                .friend-reviews-fix-btn {
                    background: linear-gradient(to right, #47bfff 5%, #1a9cff 95%);
                    color: #fff !important;
                    padding: 5px 15px;
                    border-radius: 2px;
                    display: inline-block;
                    cursor: pointer;
                    text-decoration: none !important;
                    font-size: 13px;
                    line-height: 20px;
                    margin: 10px;
                    transition: all 0.2s;
                }
                
                .friend-reviews-fix-btn:hover {
                    background: linear-gradient(to right, #57cfff 5%, #2aacff 95%);
                    text-decoration: none !important;
                }
                
                /* 进度条模态框 */
                .friend-reviews-progress-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.85);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .progress-container {
                    background: #1b2838;
                    border: 1px solid #2a475e;
                    padding: 20px;
                    border-radius: 4px;
                    min-width: 400px;
                    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
                }
                
                .progress-container h3 {
                    color: #67c1f5;
                    margin: 0 0 15px 0;
                    font-size: 16px;
                }
                
                .progress-bar {
                    height: 24px;
                    background: #000;
                    border-radius: 3px;
                    overflow: hidden;
                    margin: 10px 0;
                    border: 1px solid #2a475e;
                }
                
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(to right, #47bfff, #1a9cff);
                    transition: width 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    font-size: 12px;
                    font-weight: bold;
                }
                
                .status-text {
                    color: #8f98a0;
                    margin: 10px 0;
                    font-size: 13px;
                }
                
                .cancel-btn {
                    background: #d94e45;
                    color: #fff;
                    border: none;
                    padding: 6px 16px;
                    border-radius: 2px;
                    cursor: pointer;
                    font-size: 13px;
                    margin-top: 10px;
                }
                
                .cancel-btn:hover {
                    background: #e95549;
                }
                
                /* 错误提示 */
                .friend-reviews-error {
                    background: #4c1c1c;
                    border: 1px solid #6b2424;
                    color: #ffaaaa;
                    padding: 15px;
                    border-radius: 3px;
                    margin: 10px 0;
                }
                
                /* 成功提示 */
                .friend-reviews-success {
                    background: #1c4c1c;
                    border: 1px solid #246b24;
                    color: #aaffaa;
                    padding: 15px;
                    border-radius: 3px;
                    margin: 10px 0;
                }
            `;
            
            GM_addStyle(styles);
        }

        // 检测是否需要修复
        needsFix() {
            const url = window.location.href;
            const hasFilter = url.includes('browsefilter=createdbyfriends');
            const hasError = document.body.textContent.includes('500') || 
                           document.querySelector('.error_ctn') !== null;
            const noContent = !document.querySelector('.apphub_Card');
            
            return hasFilter && (hasError || noContent);
        }

        // 注入修复按钮
        injectFixButton(callback) {
            // 查找合适的插入位置
            const insertPoints = [
                '.apphub_OtherSiteInfo',
                '.apphub_HomeHeaderContent',
                '.rightcol',
                '#AppHubContent'
            ];
            
            let insertPoint = null;
            for (const selector of insertPoints) {
                insertPoint = document.querySelector(selector);
                if (insertPoint) break;
            }
            
            if (!insertPoint) {
                console.error('无法找到插入点');
                return;
            }
            
            // 创建按钮
            this.fixButton = document.createElement('a');
            this.fixButton.className = 'friend-reviews-fix-btn';
            this.fixButton.textContent = '🔧 修复好友评测';
            this.fixButton.href = '#';
            this.fixButton.onclick = (e) => {
                e.preventDefault();
                callback();
            };
            
            insertPoint.appendChild(this.fixButton);
        }

        // 显示进度条
        showProgress() {
            this.progressModal = document.createElement('div');
            this.progressModal.className = 'friend-reviews-progress-modal';
            this.progressModal.innerHTML = `
                <div class="progress-container">
                    <h3>🔄 正在获取好友评测...</h3>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%">0%</div>
                    </div>
                    <p class="status-text">正在初始化...</p>
                    <button class="cancel-btn">取消</button>
                </div>
            `;
            
            document.body.appendChild(this.progressModal);
            
            // 绑定取消按钮
            const cancelBtn = this.progressModal.querySelector('.cancel-btn');
            cancelBtn.onclick = () => {
                this.hideProgress();
                window.location.reload();
            };
        }

        // 更新进度
        updateProgress(current, total, found) {
            if (!this.progressModal) return;
            
            const percent = Math.round((current / total) * 100);
            const fill = this.progressModal.querySelector('.progress-fill');
            const status = this.progressModal.querySelector('.status-text');
            
            fill.style.width = `${percent}%`;
            fill.textContent = `${percent}%`;
            status.textContent = `已检查 ${current}/${total} 个好友，找到 ${found} 篇评测`;
        }

        // 隐藏进度条
        hideProgress() {
            if (this.progressModal) {
                this.progressModal.remove();
                this.progressModal = null;
            }
        }

        // 创建评测卡片
        createReviewCard(review) {
            const card = document.createElement('div');
            card.className = 'apphub_Card modalContentLink interactable';
            card.setAttribute('data-modal-content-url', review.url);
            
            const ratingIcon = review.isPositive ? 
                'https://community.fastly.steamstatic.com/public/shared/images/userreviews/icon_thumbsUp.png' : 
                'https://community.fastly.steamstatic.com/public/shared/images/userreviews/icon_thumbsDown.png';
            
            const ratingText = review.isPositive ? '推荐' : '不推荐';
            
            card.innerHTML = `
                <div class="apphub_CardContentMain">
                    <div class="apphub_UserReviewCardContent">
                        <div class="vote_header">
                            <div class="reviewInfo">
                                <div class="thumb">
                                    <img src="${ratingIcon}" width="44" height="44">
                                </div>
                                <div class="title">${ratingText}</div>
                                <div class="hours">总时数 ${review.hours} 小时</div>
                            </div>
                            <div style="clear: left"></div>
                        </div>
                        <div class="apphub_CardTextContent">
                            <div class="date_posted">发布于：${review.publishDate}</div>
                            ${review.reviewText ? Utils.escapeHtml(review.reviewText) : ''}
                        </div>
                    </div>
                </div>
                <div class="apphub_CardContentAuthorBlock tall">
                    <div class="apphub_friend_block_container">
                        <a href="https://steamcommunity.com/profiles/${review.steamId}">
                            <div class="apphub_friend_block">
                                <div class="appHubIconHolder">
                                    ${review.avatar ? `<img src="${review.avatar}">` : ''}
                                </div>
                                <div class="apphub_CardContentAuthorName ellipsis">
                                    <a href="https://steamcommunity.com/profiles/${review.steamId}">${Utils.escapeHtml(review.username)}</a>
                                </div>
                            </div>
                        </a>
                    </div>
                </div>
            `;
            
            return card;
        }

        // 渲染评测列表
        renderReviews(reviews) {
            // 查找或创建容器
            let container = document.getElementById('AppHubContent');
            if (!container) {
                container = document.querySelector('.apphub_AppHubContent');
            }
            if (!container) {
                container = document.createElement('div');
                container.id = 'AppHubContent';
                container.className = 'apphub_AppHubContent';
                
                const mainContent = document.querySelector('#responsive_page_template_content') || 
                                  document.querySelector('.responsive_page_content');
                if (mainContent) {
                    mainContent.appendChild(container);
                }
            }
            
            // 清空现有内容
            container.innerHTML = '';
            
            // 添加标题
            const header = document.createElement('div');
            header.className = 'apphub_HeaderBottom';
            header.innerHTML = `
                <div class="apphub_AppName">好友评测</div>
                <div style="clear: both"></div>
            `;
            container.appendChild(header);
            
            // 添加统计信息
            const stats = document.createElement('div');
            stats.className = 'friend-reviews-success';
            const positive = reviews.filter(r => r.isPositive).length;
            const negative = reviews.length - positive;
            stats.innerHTML = `
                ✅ 成功获取 ${reviews.length} 篇好友评测
                （👍 推荐: ${positive} | 👎 不推荐: ${negative}）
            `;
            container.appendChild(stats);
            
            // 添加评测卡片
            reviews.forEach(review => {
                const card = this.createReviewCard(review);
                container.appendChild(card);
            });
        }

        // 显示错误信息
        showError(message) {
            this.hideProgress();
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'friend-reviews-error';
            errorDiv.innerHTML = `❌ 错误: ${message}`;
            
            const container = document.querySelector('#AppHubContent') || 
                           document.querySelector('.apphub_AppHubContent');
            if (container) {
                container.insertBefore(errorDiv, container.firstChild);
            }
        }
    }

    // ========================================
    // 主控制器
    // ========================================
    class FriendReviewsFixer {
        constructor() {
            this.appId = Utils.getAppId();
            if (!this.appId) {
                console.error('无法获取App ID');
                return;
            }
            
            this.api = new SteamAPI(this.appId);
            this.ui = new UIManager();
            this.reviews = [];
            this.isRunning = false;
            
            this.init();
        }

        // 初始化
        init() {
            // 检查是否需要修复
            if (this.ui.needsFix()) {
                Utils.log('检测到需要修复的页面');
                this.ui.injectFixButton(() => this.startFix());
                
                // 自动尝试修复（可选）
                // this.startFix();
            } else {
                Utils.log('页面正常，无需修复');
            }
        }

        // 开始修复
        async startFix() {
            if (this.isRunning) return;
            this.isRunning = true;
            
            Utils.log('开始修复流程');
            this.ui.showProgress();
            
            try {
                // 获取好友列表
                const friends = await this.api.getFriendsList();
                if (friends.length === 0) {
                    throw new Error('无法获取好友列表，请确保已登录');
                }
                
                // 批量获取评测
                this.reviews = [];
                for (let i = 0; i < friends.length; i += CONFIG.BATCH_SIZE) {
                    const batch = friends.slice(i, i + CONFIG.BATCH_SIZE);
                    
                    const promises = batch.map(steamId => 
                        this.api.checkFriendReview(steamId)
                    );
                    
                    const results = await Promise.all(promises);
                    const validReviews = results.filter(r => r !== null);
                    this.reviews.push(...validReviews);
                    
                    // 更新进度
                    this.ui.updateProgress(
                        Math.min(i + CONFIG.BATCH_SIZE, friends.length),
                        friends.length,
                        this.reviews.length
                    );
                    
                    // 延迟，避免请求过快
                    if (i + CONFIG.BATCH_SIZE < friends.length) {
                        await Utils.delay(CONFIG.REQUEST_DELAY);
                    }
                }
                
                // 隐藏进度条
                this.ui.hideProgress();
                
                // 渲染结果
                if (this.reviews.length > 0) {
                    this.ui.renderReviews(this.reviews);
                    
                    // 缓存结果
                    this.cacheResults();
                } else {
                    this.ui.showError('没有找到好友评测');
                }
                
            } catch (error) {
                console.error('修复失败:', error);
                this.ui.showError(error.message);
            } finally {
                this.isRunning = false;
            }
        }

        // 缓存结果
        cacheResults() {
            const cacheKey = `friend_reviews_${this.appId}`;
            const cacheData = {
                timestamp: Date.now(),
                reviews: this.reviews
            };
            
            GM_setValue(cacheKey, JSON.stringify(cacheData));
        }

        // 加载缓存
        loadCache() {
            const cacheKey = `friend_reviews_${this.appId}`;
            const cacheStr = GM_getValue(cacheKey);
            
            if (cacheStr) {
                try {
                    const cacheData = JSON.parse(cacheStr);
                    const age = Date.now() - cacheData.timestamp;
                    
                    if (age < CONFIG.CACHE_DURATION) {
                        return cacheData.reviews;
                    }
                } catch (error) {
                    console.error('缓存解析失败:', error);
                }
            }
            
            return null;
        }
    }

    // ========================================
    // 启动脚本
    // ========================================
    function main() {
        // 等待页面加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', main);
            return;
        }
        
        // 初始化修复器
        const fixer = new FriendReviewsFixer();
    }

    // 启动
    main();

})();
