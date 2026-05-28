# AI 行业资讯站 - 提醒任务

## 定时提醒（待设置）
- ⏰ 每天早上 8:00（NZT）提醒查看当日 AI 资讯
- 提醒文案：🌷 早安！AI 行业资讯已更新，去看看今天有什么新鲜事吧 👉 /projects/ai-news-dashboard/index.html

> ⚠️ cron 工具当前有权限问题，需后续解决

## GitHub Actions 配置
- 定时任务：每天 UTC 20:00（= NZT 次日 08:00）自动运行
- workflow 文件：`.github/workflows/update.yml`
- 需要配置：`OPENCLAW_TOKEN` secret

## 下一步
1. 将项目推送到 GitHub
2. 启用 GitHub Pages
3. 配置 OPENCLAW_TOKEN secret
4. 解决 cron 工具权限问题
