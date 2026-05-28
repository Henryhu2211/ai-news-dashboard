#!/usr/bin/env node
/**
 * AI News Fetcher v2
 * 从多个权威 RSS 源抓取 AI 行业资讯
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'latest.json');

// 每个分类配置多个 RSS 源，确保有足够内容
const CATEGORIES = [
  {
    id: 'tech',
    name: '技术突破',
    icon: '📰',
    feeds: [
      { name: 'Hacker News AI/ML', url: 'https://hnrss.org/newest?q=AI%20OR%20%22machine%20learning%22%20OR%20%22large%20language%22&limit=15' },
      { name: 'MIT Tech Review AI', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' },
      { name: 'Ars Technica AI', url: 'https://feeds.arstechnica.com/arstechnica/index/tech-layout' }
    ],
    keywords: ['model', 'research', 'paper', 'openai', 'anthropic', 'google', 'meta', 'llm', 'gpt', 'claude', 'training', 'benchmark']
  },
  {
    id: 'bigtech',
    name: '大厂动态',
    icon: '🏢',
    feeds: [
      { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml' },
      { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/' },
      { name: 'Microsoft AI Blog', url: 'https://blogs.microsoft.com/ai/feed/' },
      { name: 'Meta AI Blog', url: 'https://ai.meta.com/blog/rss/' },
      { name: 'Anthropic News', url: 'https://www.anthropic.com/news/rss' },
      { name: 'Hacker News AI', url: 'https://hnrss.org/newest?q=openai%20OR%20google%20OR%20anthropic%20OR%20meta%20ai&limit=10' }
    ],
    keywords: ['openai', 'google', 'microsoft', 'meta', 'anthropic', 'amazon', 'apple', 'nvidia']
  },
  {
    id: 'industry',
    name: '行业咨询',
    icon: '💼',
    feeds: [
      { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' },
      { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
      { name: 'Wired AI', url: 'https://www.wired.com/feed/tag/ai/latest/rss' },
      { name: 'Hacker News', url: 'https://hnrss.org/newest?accuracy=upcoming&q=AI%20startup%20OR%20funding%20OR%20market&limit=10' }
    ],
    keywords: ['startup', 'funding', 'investment', 'market', 'billion', 'million', 'valuation', 'IPO', 'acquisition']
  },
  {
    id: 'application',
    name: '商业应用',
    icon: '💡',
    feeds: [
      { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' },
      { name: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml' },
      { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' }
    ],
    keywords: ['launch', 'product', 'app', 'service', 'feature', 'release', 'deploy', 'adopt', 'enterprise', 'customer']
  },
  {
    id: 'policy',
    name: '政策监管',
    icon: '📜',
    feeds: [
      { name: 'EU AI Act', url: 'https://artificialintelligenceact.eu/feed/' },
      { name: 'Hacker News', url: 'https://hnrss.org/newest?q=AI%20regulation%20OR%20AI%20law%20OR%20government%20AI&limit=10' },
      { name: 'Wired AI Policy', url: 'https://www.wired.com/feed/tag/ai/latest/rss' },
      { name: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml' }
    ],
    keywords: ['regulation', 'law', 'government', 'policy', 'ban', 'restrict', 'EU', 'China', 'Congress', 'commission', 'privacy', 'GDPR']
  }
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    console.log(`  🌐 获取: ${url}`);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 AI-News-Fetcher/2.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      timeout: 15000
    }, (res) => {
      // 处理重定向
      if (res.statusCode === 301 || res.statusCode === 302) {
        console.log(`  🔀 重定向到: ${res.headers.location}`);
        resolve(fetchUrl(res.headers.location));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', (e) => {
      console.log(`  ❌ 请求失败: ${e.message}`);
      reject(e);
    }).on('timeout', () => {
      console.log(`  ⏰ 超时`);
      reject(new Error('Timeout'));
    });
  });
}

function parseRSS(xml, catKeywords) {
  if (!xml || xml.length < 100) return [];

  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const titleMatch = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i.exec(block);
    const descMatch = /<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/i.exec(block) ||
                      /<content:encoded>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/content:encoded>/i.exec(block);
    const linkMatch = /<link>(.*?)<\/link>/i.exec(block);
    const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/i.exec(block);
    const dcCreatorMatch = /<dc:creator>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/dc:creator>/i.exec(block);

    if (titleMatch) {
      const rawTitle = decodeHTML(titleMatch[1].trim());
      const rawDesc = descMatch ? decodeHTML(descMatch[1]) : '';
      const rawLink = linkMatch ? linkMatch[1].trim() : '';

      // 清理描述：去除 HTML 标签，保留文字
      const cleanDesc = rawDesc
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ').trim().substring(0, 200);

      const pubDate = pubDateMatch ? new Date(pubDateMatch[1]) : null;
      const timeStr = pubDate && !isNaN(pubDate) ? pubDate.toISOString().split('T')[0] : '';

      // 关键词过滤：如果有关键词且有描述，进行匹配
      if (catKeywords && catKeywords.length > 0 && cleanDesc.length > 20) {
        const combined = (rawTitle + ' ' + cleanDesc).toLowerCase();
        const hasKeyword = catKeywords.some(kw => combined.includes(kw.toLowerCase()));
        if (!hasKeyword) continue;
      }

      items.push({
        title: rawTitle,
        summary: cleanDesc || '暂无摘要',
        source: dcCreatorMatch ? dcCreatorMatch[1].trim() : '',
        url: rawLink || '#',
        time: timeStr
      });
    }
  }
  return items;
}

function decodeHTML(str) {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&#xA0;/g, ' ');
}

function extractDomain(url) {
  try {
    const m = url.match(/https?:\/\/([^/]+)/);
    return m ? m[1].replace('www.', '') : '';
  } catch { return ''; }
}

async function fetchCategory(cat) {
  console.log(`\n📂 ${cat.icon} ${cat.name}...`);
  const allNews = [];

  for (const feed of cat.feeds) {
    try {
      const xml = await fetchUrl(feed.url);
      const items = parseRSS(xml, cat.keywords);

      items.forEach(item => {
        // 优先用 feed 名作为 source
        if (!item.source || item.source.length < 2) {
          item.source = feed.name;
        }
        // 如果没有 URL 域名，尝试从标题推断
        if (item.url === '#' || !item.url) {
          item.url = '#';
        }
      });

      console.log(`  ✅ ${feed.name}: ${items.length} 条`);
      allNews.push(...items);
    } catch (e) {
      console.log(`  ⚠️ ${feed.name}: 获取失败`);
    }
  }

  // 去重（按标题前60字符）
  const seen = new Set();
  return allNews.filter(item => {
    const key = item.title.substring(0, 60).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  console.log('🤖 AI News Fetcher v2 开始抓取...\n');
  console.log('⏰ 时间:', new Date().toISOString());

  const categories = [];

  for (const cat of CATEGORIES) {
    const news = await fetchCategory(cat);
    console.log(`  → 最终获得: ${news.length} 条`);
    categories.push({ id: cat.id, name: cat.name, icon: cat.icon, news });
  }

  const now = new Date();
  const data = {
    updateTime: now.toISOString(),
    date: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours()}时${now.getMinutes()}分`,
    categories
  };

  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');

  const total = categories.reduce((s, c) => s + c.news.length, 0);
  console.log(`\n✅ 完成！共 ${total} 条资讯`);
  console.log(`📁 已写入: data/latest.json`);
  console.log(`⏰ 更新于: ${now.toLocaleString('zh-CN', { timeZone: 'Pacific/Auckland' })} NZT`);
}

main().catch(console.error);
