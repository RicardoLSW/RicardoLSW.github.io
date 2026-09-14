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

test('uses the official GitHub Pages deployment flow without Jekyll', () => {
  const workflow = read('.github', 'workflows', 'actions.yml');

  assert.match(workflow, /actions\/configure-pages@/);
  assert.match(workflow, /actions\/upload-pages-artifact@/);
  assert.match(workflow, /actions\/deploy-pages@/);
  assert.doesNotMatch(workflow, /jekyll/i);
});
