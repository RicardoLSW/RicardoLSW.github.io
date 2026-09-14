# KKPA-288 TDD evidence

## Source and journeys

Journeys were derived from issue KKPA-288:

- A reader can discover photo-first travel content from the home page, archive, and map.
- A reader can open the Chongqing gallery, zoom/navigate/close it, and use keyboard-accessible controls.
- Existing readers can continue opening all 19 technical articles at their production Jekyll URLs.
- A maintainer can add a travel Markdown/MDX entry and have pages, map, RSS, sitemap, and deployment update automatically.

## RED → GREEN

- RED: `node --test tests/site-contract.test.mjs` ran 6 tests before implementation; 0 passed and 6 failed because the Astro manifest, collections, pages, PhotoSwipe/Leaflet components, and official Pages workflow did not exist.
- GREEN: `npm test` runs 7 contract tests covering the required stack, content schema, ten-photo Chongqing entry, 19 legacy posts, production URL normalization, required pages/components, and official Pages workflow.

## Test specification

| Guarantee | Evidence | Type |
| --- | --- | --- |
| Astro, MDX, sitemap, PhotoSwipe, and Leaflet are declared | `tests/site-contract.test.mjs` | Contract |
| Travel metadata is schema-validated | `tests/site-contract.test.mjs` + `npm run check` | Contract / type |
| Chongqing retains ten ordered photos with dimensions | `tests/site-contract.test.mjs` | Content |
| All 19 non-travel posts remain available | `tests/site-contract.test.mjs` | Content |
| Jekyll-normalized production paths are preserved | Production `sitemap.xml` comparison + route regression test | Regression |
| Home, archive, map, gallery, and legacy route render | Browser snapshots and manual interaction | E2E smoke |
| PhotoSwipe opens and advances from image 1 to 2 | Browser accessibility snapshot (`1 / 10` → `2 / 10`) | E2E interaction |
| Mobile layout has no horizontal overflow | Browser check at the mobile breakpoint | Responsive smoke |
| Browser console remains clean | Chrome DevTools console inspection | Runtime smoke |

## Coverage and gaps

This is a static content site with no business-logic unit surface; deterministic contract tests cover the migration invariants, while `astro check`, production build, and browser smoke tests cover generated behavior. No instrumentation-based line coverage is configured. External legacy image availability remains dependent on the existing image host.
