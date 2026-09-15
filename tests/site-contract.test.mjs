import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const path = (...parts) => join(root, ...parts);
const read = (...parts) => readFileSync(path(...parts), 'utf8');

const legacySourceFiles = [
  ['src', 'content', 'legacy'],
  ['src', 'components', 'LegacyPagination.astro'],
  ['src', 'layouts', 'LegacyPostLayout.astro'],
  ['src', 'pages', 'posts', 'index.astro'],
  ['src', 'pages', 'categories', 'index.astro'],
  ['src', 'pages', 'page2', 'index.astro'],
  ['src', 'pages', 'page3', 'index.astro'],
  ['src', 'pages', 'page4', 'index.astro'],
];

const obsoleteOutputRoutes = [
  ['posts', 'index.html'],
  ['categories', 'index.html'],
  ['page2', 'index.html'],
  ['page3', 'index.html'],
  ['page4', 'index.html'],
  ['前端', 'webpack基础', 'index.html'],
  ['工具', '玩转GitHub-1-GitHub-Gist', 'index.html'],
  ['vue从零开始', 'Vue从零开始-1-前端环境搭建', 'index.html'],
  ['服务器', 'Nginx负载均衡', 'index.html'],
];

test('declares the required Astro travel stack', () => {
  const pkg = JSON.parse(read('package.json'));

  assert.match(pkg.scripts.build, /astro build/);
  assert.match(pkg.scripts.check, /astro check/);
  for (const dependency of ['astro', '@astrojs/mdx', '@astrojs/sitemap', 'photoswipe', 'leaflet']) {
    assert.ok(pkg.dependencies[dependency], `${dependency} must be installed`);
  }
});

test('defines a validated travel-only content collection', () => {
  const config = read('src', 'content.config.ts');

  for (const field of ['title', 'date', 'location', 'coordinates', 'cover', 'description', 'tags', 'gallery']) {
    assert.match(config, new RegExp(`${field}:`), `${field} must be present in the travel schema`);
  }
  assert.match(config, /defineCollection/);
  assert.match(config, /export const collections = \{ travel \}/);
  assert.doesNotMatch(config, /const legacy = defineCollection|collections = \{ travel, legacy \}/);
});

test('preserves Chongqing as a complete ten-photo travel entry and compatibility route', () => {
  const post = read('src', 'content', 'travel', 'chongqing.md');
  const images = readdirSync(path('src', 'assets', 'travel', 'chongqing')).filter((file) => /\.(?:jpe?g|png|webp)$/i.test(file));

  assert.match(post, /title:\s*["']?清明假期重庆游/);
  assert.match(post, /date:\s*2024-04-08/);
  assert.match(post, /location:\s*["']?重庆/);
  assert.match(post, /coordinates:/);
  assert.match(post, /cover:/);
  assert.match(post, /description:/);
  assert.match(post, /tags:/);
  assert.match(post, /gallery:/);
  assert.equal((post.match(/- src:/g) ?? []).length, 10);
  assert.equal(images.length, 10);
  assert.match(post, /legacyPath:\s*["']\/旅游\/重庆\/["']/);
  assert.match(read('src', 'pages', '[...path].astro'), /getCollection\('travel'/);
  assert.doesNotMatch(read('src', 'pages', '[...path].astro'), /legacyEntry|LegacyPostLayout|getCollection\('legacy'/);
});

test('removes every technical legacy source, navigation item, and archive-only route', () => {
  for (const file of legacySourceFiles) assert.ok(!existsSync(path(...file)), `${file.join('/')} must be removed`);

  const source = [
    read('src', 'pages', 'index.astro'),
    read('src', 'layouts', 'BaseLayout.astro'),
    read('src', 'pages', 'rss.xml.ts'),
    read('src', 'pages', 'tags', 'index.astro'),
  ].join('\n');
  for (const forbidden of [/getCollection\('legacy'/, /旧日笔记/, /旧文/, /home-legacy/, /LegacyPagination/, /LegacyPostLayout/]) {
    assert.doesNotMatch(source, forbidden);
  }
});

test('accepts only canonical hosted travel JPEG URLs while preserving local Astro assets', () => {
  const config = read('src', 'content.config.ts');
  const gallery = read('src', 'components', 'PhotoSwipeGallery.astro');
  const css = read('src', 'styles', 'global.css');
  const card = read('src', 'components', 'TravelCard.astro');
  const layout = read('src', 'layouts', 'TravelPostLayout.astro');
  const home = read('src', 'pages', 'index.astro');

  assert.ok(config.includes('figure-b\\.ricardolsw\\.com\\/blog-images'));
  assert.ok(config.includes('v1-[a-f0-9]{64}\\.jpg'));
  assert.match(config, /z\.union\(\[image\(\), hostedTravelImage\]\)/);
  assert.match(config, /Hosted cover must match a gallery image with declared dimensions/);
  assert.match(gallery, /typeof item\.src === 'string'/);
  assert.match(gallery, /<img src=\{item\.src\}/);
  assert.equal((css.match(/\.travel-hero > img/g) ?? []).length, 2);
  assert.match(card, /width=\{hostedCover\?\.width\} height=\{hostedCover\?\.height\}/);
  assert.match(layout, /width=\{coverGalleryImage\?\.width\} height=\{coverGalleryImage\?\.height\}/);
  assert.match(home, /<img src=\{image\.src\} width=\{image\.width\} height=\{image\.height\}/);
});

test('keeps travel-only RSS and tag pages reusable for future travel entries', () => {
  const rss = read('src', 'pages', 'rss.xml.ts');
  const tags = read('src', 'pages', 'tags', 'index.astro');

  assert.match(rss, /getCollection\('travel'/);
  assert.match(rss, /\/travel\/\$\{entry\.id\}\//);
  assert.doesNotMatch(rss, /legacy/);
  assert.match(tags, /getCollection\('travel'/);
  assert.doesNotMatch(tags, /legacy|旧博客|技术文章/);
});

test('provides the required travel pages and interactive components', () => {
  const requiredFiles = [
    ['src', 'pages', 'index.astro'],
    ['src', 'pages', 'travel', 'index.astro'],
    ['src', 'pages', 'travel', 'map.astro'],
    ['src', 'pages', 'travel', '[...slug].astro'],
    ['src', 'pages', 'about.astro'],
    ['src', 'components', 'PhotoSwipeGallery.astro'],
    ['src', 'components', 'TripMap.astro'],
  ];

  for (const file of requiredFiles) {
    assert.ok(existsSync(path(...file)), `${file.join('/')} must exist`);
  }

  assert.match(read('src', 'components', 'PhotoSwipeGallery.astro'), /photoswipe/);
  assert.match(read('src', 'components', 'TripMap.astro'), /leaflet/);
});

test('constrains gallery rows and captions without hover transforms', () => {
  const css = read('src', 'styles', 'global.css');

  assert.match(css, /\.photo-gallery\s*\{[^}]*grid-auto-rows:/s);
  assert.match(css, /\.gallery-item\s*\{[^}]*display:\s*grid/s);
  assert.doesNotMatch(css, /\.gallery-item a:hover img\s*\{[^}]*transform:/s);
  assert.doesNotMatch(css, /\.home-legacy/);
});

test('generates travel-only output while preserving Chongqing and its legacy URL', () => {
  assert.ok(existsSync(path('dist', 'travel', 'chongqing', 'index.html')));
  assert.ok(existsSync(path('dist', '旅游', '重庆', 'index.html')));
  for (const route of obsoleteOutputRoutes) assert.ok(!existsSync(path('dist', ...route)), `dist/${route.join('/')} must be absent`);

  const home = read('dist', 'index.html');
  const rss = read('dist', 'rss.xml');
  const tags = read('dist', 'tags', 'index.html');
  assert.match(home, /清明假期重庆游/);
  assert.doesNotMatch(home, /旧日笔记|Vue从零开始|webpack基础/);
  assert.match(rss, /清明假期重庆游/);
  assert.doesNotMatch(rss, /Vue从零开始|webpack基础|gitflow流程示例/);
  assert.match(tags, /摄影|城市夜景|重庆/);
  assert.doesNotMatch(tags, /JavaScript|Vue3|Flutter/);
});

test('publishes the complete Suzhou essay with an authorized city marker and no invented publication date', () => {
  const post = read('src', 'content', 'travel', 'suzhou.md');
  const page = read('dist', 'travel', 'suzhou', 'index.html');
  assert.match(post, /date: 2021-05-08/);
  assert.doesNotMatch(post, /publishedDate:|编辑信息与待确认项|私有编排索引|source_key|localhost|OSSAccessKeyId|Signature=/);
  assert.match(post, /coordinates:\s*\n\s+lat: 31\.3\s*\n\s+lng: 120\.62/);
  assert.equal((post.match(/  - src:/g) ?? []).length, 44);
  assert.equal((page.match(/data-pswp-width=/g) ?? []).length, 44);
  assert.match(page, /树影、桥洞与水上的灯/);
  assert.match(page, /拍摄日期/);
  assert.match(page, /class="article-map"/);
  assert.match(page, /抵达苏州市/);
  assert.doesNotMatch(page, /坐标待确认/);
  for (const route of [['travel', 'index.html'], ['tags', 'index.html']]) {
    assert.match(read('dist', ...route), /\/travel\/suzhou\//);
  }
  assert.match(read('dist', 'sitemap-0.xml'), /\/travel\/suzhou\//);
  const items = read('dist', 'rss.xml').match(/<item>[^]*?<\/item>/g) ?? [];
  const item = items.find((item) => item.includes('<title>树影、桥洞与水上的灯</title>'));
  assert.ok(item);
  assert.doesNotMatch(item, /<pubDate>/);
});

test('shows the authorized Suzhou marker while preserving Chongqing markers', () => {
  for (const route of [['index.html'], ['travel', 'map', 'index.html']]) {
    const page = read('dist', ...route);
    const payload = page.match(/data-markers="([^"]*)"/)?.[1];
    assert.ok(payload);
    const markers = JSON.parse(payload.replaceAll('&#34;', '"').replaceAll('&quot;', '"').replaceAll('&amp;', '&'));
    assert.equal(markers.length, 2);
    const chongqing = markers.find((marker) => marker.href === '/travel/chongqing/');
    const suzhou = markers.find((marker) => marker.href === '/travel/suzhou/');
    assert.equal(chongqing.lat, 29.56301);
    assert.equal(chongqing.lng, 106.55156);
    assert.equal(suzhou.lat, 31.3);
    assert.equal(suzhou.lng, 120.62);
  }
  const chongqing = read('dist', 'travel', 'chongqing', 'index.html');
  assert.match(chongqing, /class="coordinate-line"/);
  assert.match(chongqing, /class="article-map"/);
  assert.equal((chongqing.match(/data-pswp-width=/g) ?? []).length, 10);
});

test('serves all ten Chongqing gallery images and the original cover through immutable OSS URLs', () => {
  const post = read('src', 'content', 'travel', 'chongqing.md');
  const urls = [...post.matchAll(/- src: (https:\/\/figure-b\.ricardolsw\.com\/blog-images\/chongqing\/v1-[a-f0-9]{64}\.jpg)/g)].map((match) => match[1]);
  assert.equal(urls.length, 10);
  assert.equal(new Set(urls).size, 10);
  assert.ok(post.includes(`cover: ${urls[4]}\n`));
  assert.doesNotMatch(post, /\.\.\/\.\.\/assets\/travel\/chongqing|Signature=|OSSAccessKeyId|localhost/);
  assert.equal((post.match(/width: 2400\n\s+height: 1600/g) ?? []).length, 9);
  assert.equal((post.match(/width: 1600\n\s+height: 2400/g) ?? []).length, 1);
  for (const route of [['travel', 'chongqing', 'index.html'], ['旅游', '重庆', 'index.html']]) {
    const page = read('dist', ...route);
    assert.equal((page.match(/data-pswp-width=/g) ?? []).length, 10);
    for (const url of urls) assert.ok(page.includes(url));
  }
});

test('uses the official GitHub Pages deployment flow without Jekyll', () => {
  const workflow = read('.github', 'workflows', 'actions.yml');

  assert.match(workflow, /actions\/configure-pages@/);
  assert.match(workflow, /actions\/upload-pages-artifact@/);
  assert.match(workflow, /actions\/deploy-pages@/);
  assert.doesNotMatch(workflow, /jekyll/i);
});
