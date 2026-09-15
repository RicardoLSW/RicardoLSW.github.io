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

test('uses the official GitHub Pages deployment flow without Jekyll', () => {
  const workflow = read('.github', 'workflows', 'actions.yml');

  assert.match(workflow, /actions\/configure-pages@/);
  assert.match(workflow, /actions\/upload-pages-artifact@/);
  assert.match(workflow, /actions\/deploy-pages@/);
  assert.doesNotMatch(workflow, /jekyll/i);
});
