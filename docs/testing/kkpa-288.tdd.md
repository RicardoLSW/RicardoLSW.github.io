# KKPA-288 TDD evidence (historical)

> Historical record of the initial site migration. Its legacy-post preservation claims no longer describe the current travel-only site.

## Source and journeys

Journeys were derived from issue KKPA-288:

- A reader can discover photo-first travel content from the home page, archive, and map.
- A reader can open the Chongqing gallery, zoom/navigate/close it, and use keyboard-accessible controls.
- Historical (superseded): existing readers could continue opening all 19 technical articles at their production Jekyll URLs.
- A maintainer can add a travel Markdown/MDX entry and have pages, map, RSS, sitemap, and deployment update automatically.

## RED → GREEN

- RED: `node --test tests/site-contract.test.mjs` ran 6 tests before implementation; 0 passed and 6 failed because the Astro manifest, collections, pages, PhotoSwipe/Leaflet components, and official Pages workflow did not exist.
- Historical GREEN: `npm test` ran 7 contract tests covering the initial migration, including legacy-post preservation. Those assertions were superseded by the travel-only contract.

## Test specification

| Guarantee | Evidence | Type |
| --- | --- | --- |
| Astro, MDX, sitemap, PhotoSwipe, and Leaflet are declared | `tests/site-contract.test.mjs` | Contract |
| Travel metadata is schema-validated | `tests/site-contract.test.mjs` + `npm run check` | Contract / type |
| Chongqing retains ten ordered photos with dimensions | `tests/site-contract.test.mjs` | Content |
| Historical (superseded): all 19 non-travel posts remain available | Initial migration contract | Content |
| Historical (superseded): Jekyll-normalized production paths are preserved | Initial migration regression test | Regression |
| Historical (superseded): home, archive, map, gallery, and legacy route render | Initial migration smoke | E2E smoke |
| PhotoSwipe opens and advances from image 1 to 2 | Browser accessibility snapshot (`1 / 10` → `2 / 10`) | E2E interaction |
| Mobile layout has no horizontal overflow | Browser check at the mobile breakpoint | Responsive smoke |
| Browser console remains clean | Chrome DevTools console inspection | Runtime smoke |

## Coverage and gaps

This was a static content-site migration with no business-logic unit surface. It is retained only as historical evidence; current guarantees live in `tests/site-contract.test.mjs` and the travel-only validation commands. No instrumentation-based line coverage is configured.
