#!/usr/bin/env node
/**
 * scripts/redact.js — Build the public mirror of the trip site.
 *
 * Reads:
 *   - index.html, README.md, SKILL.md, images/, trips/  (current dir)
 *   - scripts/redact.config.js                          (rules)
 * Writes:
 *   - public/index.html, public/README.md, public/images/, public/trips/
 *
 * Strategy: pure copy + string transformation, no markdown parser. Each .md
 * file is processed line-by-line; YAML frontmatter and item field blocks
 * are recognized by their syntactic markers.
 *
 * Usage:
 *   node scripts/redact.js
 *
 * In a Cloudflare Pages build:
 *   Build command:           node scripts/redact.js
 *   Build output directory:  public
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT  = path.join(ROOT, 'public');
const config = require(path.join(ROOT, 'scripts/redact.config.js'));

let stats = { files: 0, lines: 0, removed: 0, redacted: 0, sectionsDropped: 0, blocksDropped: 0 };

/* ---------- filesystem helpers ---------- */

function rmRecursive(p) {
  if (!fs.existsSync(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}

function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dst, name));
    }
  } else {
    fs.copyFileSync(src, dst);
  }
}

function walkMarkdown(dir, callback) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walkMarkdown(full, callback);
    else if (name.endsWith('.md')) callback(full);
  }
}

/* ---------- redaction logic ---------- */

/**
 * Drop multi-line blocks wrapped in <!-- redact-start --> ... <!-- redact-end -->.
 * Both markers (and everything between them, including a trailing newline) are
 * removed. Markers are HTML comments so they don't render in normal markdown.
 * Use this for description-body content that the field-level rules can't reach
 * (e.g. embedded QR images, one-time-token URLs, booking-specific snippets).
 */
function dropRedactBlocks(content) {
  return content.replace(
    /<!--\s*redact-start\s*-->[\s\S]*?<!--\s*redact-end\s*-->\n?/g,
    () => { stats.blocksDropped++; return ''; }
  );
}

/** Strip leading "HH:MM " or trailing "HH:MM" from a timestamp value, leaving the date+place. */
function stripTime(value) {
  // Matches: "2026-01-24 07:55 桃園 TPE"  →  "2026-01-24 桃園 TPE"
  return String(value).replace(/(\d{4}-\d{2}-\d{2})\s+\d{1,2}:\d{2}/, '$1');
}

/** Apply all string-substitution patterns to a line. */
function applyPatterns(line) {
  let out = line;
  for (const p of config.redactPatterns) {
    out = out.replace(p.re, (...args) => {
      stats.redacted++;
      return typeof p.replace === 'function' ? p.replace(...args) : p.replace;
    });
  }
  return out;
}

/**
 * Process a single markdown file.
 * Returns the redacted content as a string.
 *
 * State machine: we walk top-to-bottom and track whether we're inside
 * frontmatter (between --- markers), inside a removed section, or normal.
 * Field-level removal is per-line, applied wherever a `- **key**: value`
 * line is found (these can appear under any item).
 */
function redactMarkdown(content) {
  content = dropRedactBlocks(content);
  const lines = content.split('\n');
  const out = [];
  let inFrontmatter = false;
  let frontmatterDone = false;
  let removedSection = null;  // current section being dropped, or null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    stats.lines++;

    // ---- frontmatter boundaries ----
    if (line.trim() === '---') {
      if (!frontmatterDone && !inFrontmatter) { inFrontmatter = true; out.push(line); continue; }
      if (inFrontmatter) { inFrontmatter = false; frontmatterDone = true; out.push(line); continue; }
    }

    // ---- inside frontmatter: drop configured fields ----
    if (inFrontmatter) {
      const fmMatch = line.match(/^([\w_]+)\s*:/);
      if (fmMatch && config.removeFrontmatterFields.includes(fmMatch[1])) {
        stats.removed++;
        continue;
      }
      out.push(line);
      continue;
    }

    // ---- section-level removal (## Heading … until next ## ) ----
    const secMatch = line.match(/^## (.+)$/);
    if (secMatch) {
      if (config.removeSections.includes(secMatch[1].trim())) {
        removedSection = secMatch[1].trim();
        stats.sectionsDropped++;
        continue;
      } else {
        removedSection = null; // entered a different section
      }
    }
    if (removedSection) continue; // still inside removed section's body

    // ---- item field line: `- **field**: value` ----
    const fieldMatch = line.match(/^(\s*)-\s+\*\*([\w_]+)\*\*:\s*(.+)$/);
    if (fieldMatch) {
      const [, indent, key, val] = fieldMatch;
      if (config.removeItemFields.includes(key)) {
        stats.removed++;
        continue;
      }
      if (config.stripTimeFromFields.includes(key)) {
        out.push(`${indent}- **${key}**: ${stripTime(val)}`);
        continue;
      }
      // Apply text patterns to the value (e.g. PNR-looking strings inside notes)
      out.push(`${indent}- **${key}**: ${applyPatterns(val)}`);
      continue;
    }

    // ---- regular content (description paragraphs, headings) ----
    out.push(applyPatterns(line));
  }

  return out.join('\n');
}

/* ---------- index.html public banner injection ---------- */

function injectPublicBanner(html) {
  // Mark the build as public so the frontend can reflect it.
  // We expose two things:
  //   1. A meta tag the JS can read
  //   2. A small visible banner above <main>
  const meta = `<meta name="trip-site-mode" content="public">\n  <meta name="trip-site-public-banner" content="${config.publicBanner.replace(/"/g, '&quot;')}">`;
  const banner = `<div id="public-mode-banner" style="background:#1F3A2D;color:#FAF6EE;padding:0.6rem 1rem;text-align:center;font-family:system-ui,-apple-system,sans-serif;font-size:0.85rem;letter-spacing:0.02em;">${config.publicBanner}</div>`;

  let out = html;
  // Inject meta into <head>
  out = out.replace(/<\/head>/i, `  ${meta}\n</head>`);
  // Inject banner right after <body ...>
  out = out.replace(/(<body[^>]*>)/i, `$1\n${banner}`);
  return out;
}

/* ---------- main ---------- */

function main() {
  console.log('Redacting → public/');
  rmRecursive(OUT);
  fs.mkdirSync(OUT, { recursive: true });

  // 1. Copy static assets (images, README, SKILL stays as-is for transparency)
  copyRecursive(path.join(ROOT, 'images'), path.join(OUT, 'images'));
  if (fs.existsSync(path.join(ROOT, 'README.md'))) {
    fs.copyFileSync(path.join(ROOT, 'README.md'), path.join(OUT, 'README.md'));
  }
  // robots.txt — keep the public site equally un-indexable
  if (fs.existsSync(path.join(ROOT, 'robots.txt'))) {
    fs.copyFileSync(path.join(ROOT, 'robots.txt'), path.join(OUT, 'robots.txt'));
  }

  // 2. Process & inject banner into index.html
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  fs.writeFileSync(path.join(OUT, 'index.html'), injectPublicBanner(html));

  // 3. Walk trips/, redact each .md, write to public/trips/
  walkMarkdown(path.join(ROOT, 'trips'), (srcPath) => {
    const rel = path.relative(ROOT, srcPath);
    const dstPath = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dstPath), { recursive: true });
    const content = fs.readFileSync(srcPath, 'utf8');
    fs.writeFileSync(dstPath, redactMarkdown(content));
    stats.files++;
  });

  // 4. Generate public/trips/index.json so the frontend can discover trips
  //    without GitHub API access (local mode on Cloudflare Pages, etc.)
  const { buildManifest } = require('./build-manifest.js');
  const publicTripsDir = path.join(OUT, 'trips');
  if (fs.existsSync(publicTripsDir)) {
    const manifest = buildManifest(publicTripsDir);
    fs.writeFileSync(
      path.join(publicTripsDir, 'index.json'),
      JSON.stringify(manifest, null, 2) + '\n'
    );
    console.log(`  Manifest:           ${manifest.length} trips`);
  }

  console.log(`✓ Done.`);
  console.log(`  Files processed:    ${stats.files}`);
  console.log(`  Lines scanned:      ${stats.lines}`);
  console.log(`  Field lines removed: ${stats.removed}`);
  console.log(`  Sections dropped:   ${stats.sectionsDropped}`);
  console.log(`  Blocks dropped:     ${stats.blocksDropped}`);
  console.log(`  Pattern matches:    ${stats.redacted}`);
}

main();
