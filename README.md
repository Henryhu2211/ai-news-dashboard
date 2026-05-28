# 🤖 AI 行业资讯站

> 每日自动更新的 AI 行业资讯聚合平台

## 📋 功能特性

- 🏢 **大厂动态** - OpenAI、Google、Meta、Anthropic 等最新动向
- 📰 **技术突破** - 新模型、新论文、新工具发布
- 💼 **行业咨询** - 行业趋势、市场分析、融资并购
- 💡 **商业应用** - 落地案例、商业化进展
- 📜 **政策监管** - 各国 AI 法规、政策动态

## 🔄 自动更新

- 每天早上 8:00 (NZT) 自动抓取最新资讯
- GitHub Actions 全自动运行，无需人工干预
- 数据来源：Hacker News、The Verge、TechCrunch 等

## 🛠️ 技术架构

- **前端**：纯 HTML + CSS + JavaScript（无需后端）
- **数据**：JSON 文件存储
- **托管**：GitHub Pages（免费）
- **自动化**：GitHub Actions

## 🌐 在线访问

部署后访问：`https://henryhu2211.github.io/ai-news-dashboard`

## 📝 本地开发

```bash
# 直接用浏览器打开
open index.html

# 或用本地服务器
python3 -m http.server 8080
# 访问 http://localhost:8080
```

## 🔧 自动更新原理

```
每天 UTC 20:00 (= NZT 08:00)
        ↓
GitHub Actions 触发
        ↓
抓取 AI 资讯 → 生成 latest.json
        ↓
GitHub Pages 自动部署更新
```
