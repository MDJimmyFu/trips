/**
 * Redact configuration — defines what gets stripped from trips/ when
 * building the public mirror.
 *
 * Edit this file to change what's hidden on the public site.
 * The script (scripts/redact.js) reads this and applies it to every .md
 * file under trips/, writing the redacted version to public/trips/.
 */
module.exports = {
  /**
   * Frontmatter fields to remove entirely. The line `field: value`
   * disappears from the YAML block.
   */
  removeFrontmatterFields: [
    'travelers',  // "2 大人 + 媽媽 (洗腎)" — leaks personal info
  ],

  /**
   * Item-level fields to remove entirely. The line `- **field**: value`
   * disappears from any item.
   */
  removeItemFields: [
    'booking_ref',  // PNR / 票號 / 訂位代號 — most sensitive
    'phone',        // 個人電話
    // Keep: price (it's useful for sharing recommendations),
    //       address (people need it to navigate),
    //       coordinates, local_name (functional),
    //       check_in/check_out (informational dates).
  ],

  /**
   * Item-level fields where we strip the time portion but keep the date.
   * "2026-01-24 07:55 桃園 TPE" → "2026-01-24 桃園 TPE"
   * Useful to obscure exact flight times while still showing the day.
   * Set to [] to keep full timestamps.
   */
  stripTimeFromFields: [
    // 'depart',
    // 'arrive',
  ],

  /**
   * Sections to remove entirely. Their `## Heading` and all content
   * up to the next `## ` are dropped.
   */
  removeSections: [
    '醫療',  // 個人醫療資訊不對外
  ],

  /**
   * Regex patterns matched against any line. Matching substrings get
   * replaced with `[已遮蔽]`. Use this for free-form text where sensitive
   * data slipped into descriptions / notes.
   *
   * NOTE on PNR detection: PNRs are 6-letter (or letter+digit mix) codes
   * that look identical to flight numbers (`BR184`, `AY0533`), JR train
   * codes, image-URL hashes, etc. There is no way to distinguish them
   * by pattern alone. Strategy: we ONLY match codes that appear in
   * obvious "PNR context" — preceded by keywords like PNR/訂位/票號/確認碼.
   * If you accidentally leak a bare code in a `notes:` field, redaction
   * via removeItemFields (`booking_ref`, `phone`) is the primary defense.
   *
   * Order matters — earlier patterns run first.
   */
  redactPatterns: [
    // PNR codes — only when preceded by a context keyword (e.g. "PNR ABC123")
    {
      name: 'pnr-with-context',
      re: /(PNR|訂位代號|訂位編號|票號|確認碼|booking ref(?:erence)?)\s*[:：]?\s*[A-Z0-9]{6,}/gi,
      replace: (match) => match.replace(/[A-Z0-9]{6,}\s*$/i, '[已遮蔽]'),
    },
    // E-ticket numbers — long digit strings (12+, narrower than before)
    { name: 'eticket', re: /\b\d{12,}\b/g, replace: '[已遮蔽]' },
    // Email addresses — but skip image-CDN URLs by requiring "@" not preceded by a slash
    {
      name: 'email',
      re: /(?<![\/\w.-])[\w.-]+@[\w.-]+\.\w{2,}\b/g,
      replace: '[已遮蔽]',
    },
    // Phone numbers — international (+xx) and Taiwan/Japan-style local formats
    {
      name: 'phone-intl',
      re: /\+\d{1,3}[-\s]?\d{1,4}[-\s]?\d{2,4}[-\s]?\d{3,4}/g,
      replace: '[已遮蔽]',
    },
    // Taiwan mobile (09xx-xxx-xxx)
    {
      name: 'tw-mobile',
      re: /\b0?9\d{2}[-\s]?\d{3}[-\s]?\d{3}\b/g,
      replace: '[已遮蔽]',
    },
    // Local landline patterns: 0xx-xxx-xxxx (Taiwan), xxx-xxx-xxxx (Japan local)
    {
      name: 'landline',
      re: /\b0\d{1,3}[-\s]\d{3,4}[-\s]\d{3,4}\b/g,
      replace: '[已遮蔽]',
    },
  ],

  /**
   * The PUBLIC_BANNER constant gets injected into the parsed frontmatter
   * and the index.html banner area. The frontend reads it and shows
   * a "this is the public version" notice.
   */
  publicBanner: '🌐 這是公開分享版，部分敏感資訊已遮蔽',
};
