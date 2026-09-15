# Ricardo 的旅行影像日志

这是一个部署在 GitHub Pages 的 Astro 静态站点，专注记录旅行照片与沿途笔记。

## 技术栈

- Astro 7，静态输出
- Astro Content Collections（Markdown / MDX）
- Astro Assets + Sharp（响应式 AVIF/WebP）
- PhotoSwipe 5（相册大图、缩放、键盘切换）
- Leaflet + OpenStreetMap（旅行足迹）
- GitHub Actions + GitHub Pages

## 本地开发

需要 Node.js 22.12 或更高版本。

```bash
npm ci
npm run dev
```

常用验证命令：

```bash
npm run check
npm run build
npm test
# 或一次执行全部验证（先生成站点，再验证输出）
npm run verify
```

生产构建输出到 `dist/`，本地检查构建结果可运行：

```bash
npm run preview
```

## 新增一次旅行

1. 将已清除 GPS 等 EXIF 信息、尺寸适合网页构建的照片放入 `src/assets/travel/<slug>/`。
2. 在 `src/content/travel/` 新增 `<slug>.md` 或 `<slug>.mdx`。
3. 按以下结构填写 Front Matter；页面、归档、地图、RSS 和站点地图会自动更新，不需要修改核心模板。

```yaml
---
title: "旅行标题"
date: 2026-09-14
location: "城市名"
coordinates:
  lat: 00.0000
  lng: 00.0000
cover: ../../assets/travel/example/cover.jpg
description: "用于列表和搜索分享的简短说明。"
tags:
  - 摄影
  - 城市
gallery:
  - src: ../../assets/travel/example/01.jpg
    alt: "准确描述画面内容的替代文本"
    caption: "可选图注"
    width: 2560
    height: 1707
draft: false
---

游记正文写在这里。
```

`coordinates` 应采用城市级公共坐标，不要提交住所、酒店或其他私人精确位置。`width` 和 `height` 必须与图片纵横比一致，PhotoSwipe 会用它们预留空间并避免布局跳动。

## 图片策略

重庆示例的十张照片来自原文章引用的仓库既有图床资源。迁移时下载、缩放至最长边 2560px，并重新编码以移除原始 EXIF。Astro 在构建期继续生成多尺寸 AVIF/WebP；首页和相册只按视口加载合适的版本，懒加载非首屏图片，不会默认下载全部大图。

## URL 兼容

- 重庆原 URL `/旅游/重庆/` 仍可访问，Canonical 指向新的 `/travel/chongqing/`。
- `/travel/`、`/travel/map/`、`/tags/`、`/about/` 和 `/404.html` 均由 Astro 生成。
- 旧技术文章及其归档路由不再随站点发布。

## 部署

`.github/workflows/actions.yml` 会：

1. 对目标为 `dev` 或 `master` 的 Pull Request 执行干净安装、契约测试、Astro 检查和生产构建。
2. 在代码推送到 `master` 后构建并使用官方 Pages actions 部署 `dist/`。

仓库首次切换时，需要在 GitHub **Settings → Pages → Build and deployment → Source** 中将旧的分支/Jekyll 发布方式改为 **GitHub Actions**。站点地址配置为 `https://ricardolsw.github.io`，无子路径和自定义域名。
