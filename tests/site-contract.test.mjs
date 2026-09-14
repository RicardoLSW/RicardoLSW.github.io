import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const path = (...parts) => join(root, ...parts);
const read = (...parts) => readFileSync(path(...parts), 'utf8');

test('declares the required Astro travel stack', () => {
  const pkg = JSON.parse(read('package.json'));

  assert.match(pkg.scripts.build, /astro build/);
  assert.match(pkg.scripts.check, /astro check/);
  for (const dependency of ['astro', '@astrojs/mdx', '@astrojs/sitemap', 'photoswipe', 'leaflet']) {
    assert.ok(pkg.dependencies[dependency], `${dependency} must be installed`);
  }
});

test('defines a validated travel content collection', () => {
  const config = read('src', 'content.config.ts');

  for (const field of ['title', 'date', 'location', 'coordinates', 'cover', 'description', 'tags', 'gallery']) {
    assert.match(config, new RegExp(`${field}:`), `${field} must be present in the travel schema`);
  }
  assert.match(config, /defineCollection/);
  assert.match(config, /travel/);
});

test('migrates Chongqing as a complete ten-photo travel entry', () => {
  const post = read('src', 'content', 'travel', 'chongqing.md');

  assert.match(post, /title:\s*["']?清明假期重庆游/);
  assert.match(post, /date:\s*2024-04-08/);
  assert.match(post, /location:\s*["']?重庆/);
  assert.match(post, /coordinates:/);
  assert.match(post, /cover:/);
  assert.match(post, /description:/);
  assert.match(post, /tags:/);
  assert.match(post, /gallery:/);
  assert.equal((post.match(/- src:/g) ?? []).length, 10);
});

test('keeps every non-travel legacy post available', () => {
  const legacyDirectory = path('src', 'content', 'legacy');
  assert.ok(existsSync(legacyDirectory));
  assert.equal(readdirSync(legacyDirectory).filter((file) => file.endsWith('.md')).length, 19);
});

test('preserves the normalized Jekyll routes from the production sitemap', () => {
  const expectedRoutes = [
    '/vue从零开始/Vue从零开始-1-前端环境搭建/',
    '/工具/玩转GitHub-1-GitHub-Gist/',
    '/前端/关于Object.entries()-你还知道Object.fromEntries()吗/',
    '/blog/Flutter-WebSocket封装-实现心跳-重连机制/',
    '/vue/Vue3前传-创建工程时必须要做的事/',
    '/工具/番外篇-自动部署-GitHub-Actions/',
  ];
  const content = readdirSync(path('src', 'content', 'legacy'))
    .filter((file) => file.endsWith('.md'))
    .map((file) => read('src', 'content', 'legacy', file))
    .join('\n');

  for (const route of expectedRoutes) assert.ok(content.includes(`legacyPath: "${route}"`), `${route} must be preserved`);
});

test('provides the required travel pages and interactive components', () => {
  const requiredFiles = [
    ['src', 'pages', 'index.astro'],
    ['src', 'pages', 'travel', 'index.astro'],
    ['src', 'pages', 'travel', 'map.astro'],
    ['src', 'pages', 'travel', '[...slug].astro'],
    ['src', 'pages', 'about.astro'],
    ['src', 'pages', 'page2', 'index.astro'],
    ['src', 'pages', 'page3', 'index.astro'],
    ['src', 'pages', 'page4', 'index.astro'],
    ['src', 'components', 'PhotoSwipeGallery.astro'],
    ['src', 'components', 'TripMap.astro'],
  ];

  for (const file of requiredFiles) {
    assert.ok(existsSync(path(...file)), `${file.join('/')} must exist`);
  }

  assert.match(read('src', 'components', 'PhotoSwipeGallery.astro'), /photoswipe/);
  assert.match(read('src', 'components', 'TripMap.astro'), /leaflet/);
});

test('uses the official GitHub Pages deployment flow without Jekyll', () => {
  const workflow = read('.github', 'workflows', 'actions.yml');

  assert.match(workflow, /actions\/configure-pages@/);
  assert.match(workflow, /actions\/upload-pages-artifact@/);
  assert.match(workflow, /actions\/deploy-pages@/);
  assert.doesNotMatch(workflow, /jekyll/i);
});
