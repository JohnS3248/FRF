// ========================================
// v3.2 最终完善版：修复今年更新时间提取
// ========================================
// 在Steam社区页面运行：https://steamcommunity.com/

const STARDEW_APPID = 413150;
const DEBUG = false; // 关闭调试模式（已验证成功）

class FriendReviewFinder {
    constructor() {
        this.friends = [];
        this.reviews = [];
        this.rejectedReviews = [];
        this.currentIndex = 0;
        this.isPaused = false;
        this.isStopped = false;
        this.debugInfo = [];
    }
    
    // 调试日志
    log(message, data = null) {
        if(DEBUG) {
            const logEntry = {time: new Date().toISOString(), message, data};
            this.debugInfo.push(logEntry);
        }
    }
    
    // 检测当前页面是否在社区域名
    checkDomain() {
        if(!window.location.hostname.includes('steamcommunity.com')) {
            throw new Error('域名错误：必须在steamcommunity.com运行');
        }
    }
    
    // 获取好友列表
    async getFriends() {
        this.checkDomain();
        console.log('📋 获取好友列表...\n');
        
        const url = '/my/friends/';
        const response = await fetch(url, {credentials: 'include'});
        
        if(response.status !== 200) {
            throw new Error('无法获取好友列表');
        }
        
        const html = await response.text();
        const regex = /data-steamid="(\d+)"/g;
        const matches = [...html.matchAll(regex)];
        
        this.friends = [...new Set(matches.map(m => m[1]))];
        console.log(`✅ 找到 ${this.friends.length} 个好友\n`);
        
        return this.friends;
    }
    
    // 检查单个好友
    async checkFriend(steamId) {
        const originalUrl = `/profiles/${steamId}/recommended/${STARDEW_APPID}/`;
        
        try {
            const response = await fetch(originalUrl, {
                credentials: 'include',
                redirect: 'follow'
            });
            
            if(response.status !== 200) {
                this.log(`${steamId}: 状态码 ${response.status}`);
                return null;
            }
            
            const html = await response.text();
            const finalUrl = response.url;
            
            // ===== 验证1：检查URL =====
            const isReviewPage = finalUrl.includes('/recommended/') && 
                               (finalUrl.includes(`/${STARDEW_APPID}/`) || 
                                finalUrl.includes(`/${STARDEW_APPID}`));
            
            if(!isReviewPage) {
                this.log(`${steamId}: ❌ URL重定向`);
                this.rejectedReviews.push({steamId, reason: 'URL重定向'});
                return null;
            }
            
            // ===== 验证2：检查页面内容 =====
            const hasRatingSummary = html.includes('ratingSummary');
            const hasRecommendation = html.includes('推荐') || html.includes('不推荐') ||
                                     html.includes('Recommended') || html.includes('Not Recommended');
            
            if(!hasRatingSummary || !hasRecommendation) {
                this.log(`${steamId}: ❌ 无评测内容`);
                this.rejectedReviews.push({steamId, reason: '无评测内容'});
                return null;
            }
            
            // ===== 验证3：确认是星露谷物语 =====
            const isStardew = html.includes('Stardew Valley') ||
                            html.includes('星露谷物语') ||
                            html.includes('星露谷') ||
                            html.includes(`app/${STARDEW_APPID}`) ||
                            html.includes(`appid=${STARDEW_APPID}`) ||
                            html.includes(`"appid":${STARDEW_APPID}`);
            
            if(!isStardew) {
                this.log(`${steamId}: ❌ 不是星露谷物语`);
                this.rejectedReviews.push({steamId, reason: '不是星露谷物语'});
                return null;
            }
            
            // ===== 通过验证，提取信息 =====
            
            // 1. 推荐/不推荐
            const isPositive = html.includes('icon_thumbsUp.png') || 
                             html.includes('ratingSummary">推荐') ||
                             html.includes('ratingSummary">Recommended');
            
            // 2. 提取总时数（支持逗号分隔）
            let totalHours = '未知';
            const totalHoursPatterns = [
                /总时数\s*([\d,]+(?:\.\d+)?)\s*小时/,
                /([\d,]+(?:\.\d+)?)\s*hrs?\s+on\s+record/i
            ];
            
            for(let pattern of totalHoursPatterns) {
                const match = html.match(pattern);
                if(match) {
                    totalHours = match[1].replace(/,/g, '');
                    break;
                }
            }
            
            // 3. 提取发布时间
            let publishDate = '未知';
            const publishPatterns = [
                /发布于[：:]\s*([^<\r\n]+)/,
                /Posted[：:]\s*([^<\r\n]+)/i
            ];
            
            for(let pattern of publishPatterns) {
                const match = html.match(pattern);
                if(match) {
                    publishDate = match[1].trim();
                    break;
                }
            }
            
            // 4. 提取更新时间（修复：支持不带年份的格式）
            let updateDate = null;
            
            // 优先匹配带年份的格式：2024 年 9 月 26 日 下午 1:13
            const updateWithYearPatterns = [
                /更新于[：:]\s*(\d{4}\s*年[^<\r\n]+)/,
                /Updated[：:]\s*([A-Za-z]+\s+\d+,\s*\d{4}[^<\r\n]+)/i
            ];
            
            for(let pattern of updateWithYearPatterns) {
                const match = html.match(pattern);
                if(match) {
                    updateDate = match[1].trim();
                    break;
                }
            }
            
            // 如果没找到带年份的，再匹配不带年份的：5 月 17 日 下午 4:38
            if(!updateDate) {
                const updateWithoutYearPatterns = [
                    /更新于[：:]\s*(\d{1,2}\s*月\s*\d{1,2}\s*日[^<\r\n]*?)(?:<|$)/,
                    /Updated[：:]\s*([A-Za-z]+\s+\d{1,2}[^<\r\n]*?)(?:<|$)/i
                ];
                
                for(let pattern of updateWithoutYearPatterns) {
                    const match = html.match(pattern);
                    if(match) {
                        // 添加当前年份标注
                        const currentYear = new Date().getFullYear();
                        updateDate = `${match[1].trim()} (${currentYear})`;
                        break;
                    }
                }
            }
            
            const result = {
                steamId,
                url: `https://steamcommunity.com${originalUrl}`,
                isPositive,
                totalHours,
                publishDate,
                updateDate
            };
            
            this.log(`${steamId}: ✅`, result);
            
            return result;
            
        } catch(e) {
            this.log(`${steamId}: ❌ ${e.message}`);
            this.rejectedReviews.push({steamId, reason: `请求失败: ${e.message}`});
            return null;
        }
    }
    
    // 显示进度
    showProgress() {
        const total = this.friends.length;
        const progress = ((this.currentIndex / total) * 100).toFixed(1);
        const bar = '█'.repeat(Math.floor(progress / 2)) + '░'.repeat(50 - Math.floor(progress / 2));
        
        console.clear();
        console.log('=====================================');
        console.log('  好友评测查找器 v3.2');
        console.log('=====================================\n');
        console.log(`进度: [${bar}] ${progress}%`);
        console.log(`已检查: ${this.currentIndex} / ${total}`);
        console.log(`已找到: ${this.reviews.length} 篇星露谷物语评测\n`);
        
        if(this.reviews.length > 0) {
            console.log('最新发现:');
            this.reviews.slice(-3).forEach(r => {
                console.log(`  • ${r.steamId} ${r.isPositive ? '👍' : '👎'} (${r.totalHours}小时)`);
            });
            console.log('');
        }
        
        if(this.isPaused) {
            console.log('⏸️  已暂停 - finder.resume()');
        } else if(!this.isStopped) {
            console.log('⏹️  停止 - finder.stop()');
        }
        
        console.log('=====================================');
    }
    
    // 开始搜索
    async search() {
        try {
            this.checkDomain();
        } catch(e) {
            console.error(e.message);
            return;
        }
        
        console.log('🚀 开始搜索星露谷物语的好友评测...\n');
        
        if(this.friends.length === 0) {
            await this.getFriends();
        }
        
        this.isStopped = false;
        this.isPaused = false;
        this.debugInfo = [];
        this.rejectedReviews = [];
        
        const batchSize = 5;
        
        while(this.currentIndex < this.friends.length && !this.isStopped) {
            while(this.isPaused && !this.isStopped) {
                await new Promise(r => setTimeout(r, 1000));
            }
            
            if(this.isStopped) break;
            
            const batch = this.friends.slice(
                this.currentIndex, 
                Math.min(this.currentIndex + batchSize, this.friends.length)
            );
            
            const promises = batch.map(id => this.checkFriend(id));
            const results = await Promise.all(promises);
            
            results.forEach(result => {
                if(result) {
                    this.reviews.push(result);
                }
            });
            
            this.currentIndex += batch.length;
            this.showProgress();
            
            await new Promise(r => setTimeout(r, 800));
        }
        
        if(!this.isStopped) {
            this.showFinalResults();
        }
    }
    
    // 显示最终结果
    showFinalResults() {
        console.clear();
        console.log('\n=====================================');
        console.log('  🎉 搜索完成！');
        console.log('=====================================\n');
        console.log(`检查了 ${this.currentIndex} 个好友`);
        console.log(`找到 ${this.reviews.length} 篇星露谷物语评测\n`);
        
        const positive = this.reviews.filter(r => r.isPositive);
        const negative = this.reviews.filter(r => !r.isPositive);
        
        console.log(`👍 推荐: ${positive.length} 篇`);
        console.log(`👎 不推荐: ${negative.length} 篇\n`);
        
        console.log('详细列表:\n');
        this.reviews.forEach((r, i) => {
            console.log(`${i+1}. ${r.isPositive ? '👍' : '👎'} | ${r.totalHours}小时 | ${r.publishDate}`);
            console.log(`   Steam ID: ${r.steamId}`);
            console.log(`   ${r.url}`);
            if(r.updateDate) {
                console.log(`   更新: ${r.updateDate}`);
            }
            console.log('');
        });
        
        window.friendReviews = this.reviews;
        console.log('✅ 结果已保存到 window.friendReviews');
        
        if(this.reviews.length === 25) {
            console.log('\n🎊 完美！找到了全部25篇评测！');
        }
    }
    
    // 暂停
    pause() {
        this.isPaused = true;
        console.log('\n⏸️  已暂停');
    }
    
    // 继续
    resume() {
        this.isPaused = false;
        console.log('\n▶️  继续搜索...');
    }
    
    // 停止
    stop() {
        this.isStopped = true;
        console.log('\n⏹️  已停止');
        this.showFinalResults();
    }
    
    // 重置
    reset() {
        this.reviews = [];
        this.rejectedReviews = [];
        this.currentIndex = 0;
        this.isPaused = false;
        this.isStopped = false;
        this.debugInfo = [];
        console.log('✅ 已重置');
    }
    
    // 导出为JSON
    exportJSON() {
        return JSON.stringify(this.reviews, null, 2);
    }
    
    // 导出为CSV
    exportCSV() {
        const headers = ['序号', 'Steam ID', '推荐', '总时数', '发布时间', '更新时间', 'URL'];
        const rows = this.reviews.map((r, i) => [
            i + 1,
            r.steamId,
            r.isPositive ? '推荐' : '不推荐',
            r.totalHours,
            r.publishDate,
            r.updateDate || '',
            r.url
        ]);
        
        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        
        return csv;
    }
}

// 创建实例
const finder = new FriendReviewFinder();

// 检查域名并显示使用说明
if(!window.location.hostname.includes('steamcommunity.com')) {
    console.log('❌ 必须在Steam社区页面运行！');
    console.log('请访问: https://steamcommunity.com/\n');
} else {
    console.log('=====================================');
    console.log('  好友评测查找器 v3.2');
    console.log('  (最终完善版)');
    console.log('=====================================\n');
    console.log('✅ 所有功能已完善');
    console.log('✅ 支持今年更新时间提取');
    console.log('✅ 支持逗号分隔的时间');
    console.log('✅ 严格验证星露谷物语评测\n');
    console.log('使用方法：\n');
    console.log('1. 开始搜索：');
    console.log('   finder.search()\n');
    console.log('2. 查看结果：');
    console.log('   finder.reviews\n');
    console.log('3. 导出数据：');
    console.log('   finder.exportJSON()  // JSON格式');
    console.log('   finder.exportCSV()   // CSV格式\n');
    console.log('4. 控制：');
    console.log('   finder.pause()');
    console.log('   finder.resume()');
    console.log('   finder.stop()\n');
    console.log('=====================================\n');
}

window.finder = finder;