#!/usr/bin/env node
/**
 * scripts/build-manifest.js — Generate trips/index.json
 *
 * Walks trips/ and writes a manifest the frontend can read in "local mode"
 * (Cloudflare Pages / custom domains / file://). Without this manifest, the
 * frontend would have no way to discover trips since it can't enumerate
 * directories from the browser.
 *
 * Output schema (trips/index.json):
 *   [
 *     { "trip": "2026-tokyo-romantic", "versions": ["v1"] },
 *     { "trip": "2026-finland-aurora", "versions": ["v1"] },
 *     ...
 *   ]
 *
 * Run automatically:
 *   - From scripts/redact.js (so public/trips/index.json gets generated too)
 *   - As a Cloudflare Pages build command: `node scripts/build-manifest.js`
 *
 * Run manually before push (optional):
 *   node scripts/build-manifest.js
 */
const fs = require('fs');
const path = require('path');

function buildManifest(tripsDir) {
  if (!fs.existsSync(tripsDir)) return [];
  const out = [];
  for (const tripName of fs.readdirSync(tripsDir).sort()) {
    const tripPath = path.join(tripsDir, tripName);
    if (!fs.statSync(tripPath).isDirectory()) continue;
    const versions = fs.readdirSync(tripPath)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace(/\.md$/, ''))
      .sort();
    if (versions.length) out.push({ trip: tripName, versions });
  }
  return out;
}

if (require.main === module) {
  const root = process.cwd();
  const tripsDir = path.join(root, 'trips');
  const manifest = buildManifest(tripsDir);
  const outPath = path.join(tripsDir, 'index.json');
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`✓ Wrote ${outPath} — ${manifest.length} trips:`);
  for (const t of manifest) console.log(`  ${t.trip} (${t.versions.length} versions)`);
}

module.exports = { buildManifest };
