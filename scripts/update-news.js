#!/usr/bin/env node
/**
 * AI News Fetcher
 * 从多个来源抓取 AI 行业资讯，生成 data/latest.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'latest.json');

const CATEGORIES = [
  {
    id: 'tech',
    name: '技术突破',
    icon: '📰',
    feeds: [
      { name: 'Hacker News AI', url: 'https://hnrss.org/newest?q=AI%20OR%20artificial%20intelligence%20OR%20machine%20learning&limit=10' },
      { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' }
    ]
  },
  {
    id: 'bigtech',
    name: '大厂动态',
    icon: '🏢',
    feeds: [
      { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/' },
      { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml' },
      { name: 'Anthropic', url: 'https://www.anthropic.com/news/rss' }
    ]
  },
  {
    id: 'industry',
    name: '行业咨询',
    icon: '💼',
    feeds: [
      { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' }
    ]
  },
  {
    id: 'application',
    name: '商业应用',
    icon: '💡',
    feeds: []
  },
  {
    id: 'policy',
    name: '政策监管',
    icon: '📜',
    feeds: [
      { name: 'EU AI Act', url: 'https://artificialintelligenceact.eu/feed/' }
    ]
  }
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'AI-News-Fetcher/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/gi;
  const descRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/gi;
  const linkRegex = /<link>(.*?)<\/link>/gi;
  const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/gi;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/.exec(block);
    const descMatch = /<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/.exec(block);
    const linkMatch = /<link>(.*?)<\/link>/.exec(block);
    const dateMatch = /<pubDate>(.*?)<\/pubDate>/.exec(block);

    if (titleMatch) {
      const rawDesc = descMatch ? descMatch[1] : '';
      const cleanDesc = rawDesc
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 200);

      items.push({
        title: titleMatch[1].trim(),
        summary: cleanDesc || '暂无摘要',
        source: '',
        url: linkMatch ? linkMatch[1].trim() : '#',
        time: dateMatch ? new Date(dateMatch[1]).toISOString().split('T')[0] : ''
      });
    }
  }
  return items;
}

async function fetchCategory(cat) {
  const allNews = [];
  for (const feed of cat.feeds) {
    try {
      const xml = await fetchUrl(feed.url);
      const items = parseRSS(xml);
      items.forEach(item => item.source = feed.name);
      allNews.push(...items);
    } catch (e) {
      console.warn(`  ⚠️ ${feed.name} 获取失败: ${e.message}`);
    }
  }
  // 去重
  const seen = new Set();
  return allNews.filter(item => {
    const key = item.title.substring(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  console.log('🤖 AI News Fetcher 开始抓取...\n');

  const categories = [];

  for (const cat of CATEGORIES) {
    console.log(`📂 ${cat.icon} ${cat.name}...`);
    const news = await fetchCategory(cat);
    console.log(`   获取到 ${news.length} 条`);
    categories.push({ ...cat, news });
  }

  const now = new Date();
  const data = {
    updateTime: now.toISOString(),
    date: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`,
    categories
  };

  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');

  const total = categories.reduce((s, c) => s + c.news.length, 0);
  console.log(`\n✅ 完成！共 ${total} 条资讯，已写入 data/latest.json`);
  console.log(`⏰ 更新时间: ${now.toISOString()}`);
}

main().catch(console.error);
