---
name: trip-itinerary-md
description: |
  Use this skill whenever Jimmy asks you to create, edit, or update a travel
  itinerary that will be displayed on his trip site (mdjimmyfu.github.io
  or similar GitHub Pages repo backed by this template). Trigger this for
  any request like "幫我寫一份 XX 的行程"、"在 XX 行程加一個版本"、
  "整理 XX 的旅遊資訊"、"安排 XX 天的行程" — the deliverable is always a
  single Markdown file at `trips/{trip-folder}/{version}.md` that conforms
  to the schema described here. Do NOT use this skill for trips that won't
  be published to the trip site.
---

# Trip Itinerary Markdown Skill

## What this skill does

Generates a single `.md` file that the trip-site web app parses and renders
into a structured, multi-tab itinerary page (with map, image cards, modal
detail views, search, and version switching).

## File location & naming

```
trips/
└── {trip-slug}/                    ← one folder per TRIP
    ├── v1.md                       ← one file per VERSION
    ├── v2-with-parents.md
    └── final.md
images/
└── {trip-slug}/                    ← matching image folder
    ├── cover.jpg
    └── ...
```

- `trip-slug`: lowercase, hyphenated, English or romaji
  (e.g. `2026-tokyo-weekend`, `2026-hokkaido-ski`)
- Version filename: anything descriptive (`v1.md`, `final.md`,
  `with-grandma.md`). Sorted alphabetically in the dropdown.

## Schema overview

A trip file has TWO parts:

1. **YAML frontmatter** — trip-level metadata (between `---` markers)
2. **Body sections** — one `## Heading` per tab. Tabs appear dynamically:
   any `## XXX` becomes a tab named "XXX". The order of `##` sections
   determines tab order.

The web app expects these conventions but tolerates extra fields. **Adding
a new field to an item just makes it show up in the card** — schema is
intentionally extensible.

---

## Frontmatter (required)

```yaml
---
trip: 東京週末小旅行           # display name on dashboard
version: v1                   # display name in version dropdown
start_date: 2026-05-15        # YYYY-MM-DD, used for countdown & Day numbering
end_date: 2026-05-18          # YYYY-MM-DD
summary: 4 天 3 夜淺草 + 新宿  # one-line on dashboard
cover: images/2026-tokyo-weekend/cover.jpg   # hero image (optional)
travelers: 2 大人              # optional, free text
tags: [週末, 城市, 美食]        # optional, displayed as chips
---
```

---

## Body sections — recommended structure

Use the following `##` headings when applicable. Order is up to you, but
this order matches what Jimmy tends to use:

| Heading       | Purpose                                          |
|---------------|--------------------------------------------------|
| `## 行程`     | Day-by-day timeline (special: see below)         |
| `## 住宿`     | Hotels & lodging                                 |
| `## 餐廳`     | Restaurants                                      |
| `## 景點`     | Attractions / sights                             |
| `## 票券`     | Tickets (passes, attraction tickets, vouchers)   |
| `## 交通`     | Transit (flights, trains, buses, public transit) |
| `## 醫療`     | Medical (clinics, pharmacies, emergency contacts)|
| `## 備案`     | Backup plans (rain, fatigue, contingencies)      |
| `## 語言`     | Useful phrases for the destination               |

You may add others (e.g. `## 購物`、`## 溫泉`). They become tabs automatically.

---

## Item format (used in 住宿 / 餐廳 / 景點 / 票券 / 交通 / 醫療)

Every item is a `### Item Name` followed by `- **key**: value` lines, then
optionally an image, then a long-form description in markdown.

```markdown
### Hotel Gracery Shinjuku
- **check_in**: 2026-05-15
- **check_out**: 2026-05-18
- **address**: 東京都新宿区歌舞伎町 1-19-1
- **coordinates**: 35.6951, 139.7016
- **google_maps**: https://maps.app.goo.gl/xxx
- **website**: https://gracery.com/shinjuku/
- **booking_url**: https://booking.com/...
- **booking_ref**: BK123456
- **price**: NTD 4,500 / 晚
- **tag**: 四星 / 哥吉拉酒店
- **notes**: 可 4 點 early check-in；申請了高樓層

![](images/2026-tokyo-weekend/gracery.jpg)

熟人推薦的新宿酒店，地點極佳，從新宿車站步行 5 分鐘。
房間雖小但設計用心，哥吉拉客房有特色...
```

### Field reference (all optional unless noted; add custom fields freely)

**Common across all item types:**
- `coordinates` — `lat, lng` (decimal). **Required** if you want the item
  to appear on the daily map.
- `google_maps` — direct Google Maps URL (used for the navigation button)
- `website` — official website
- `booking_url` — booking / reservation URL
- `booking_ref` — confirmation / booking number
- `price` — free text (e.g. `NTD 4,500 / 晚`、`¥2,580`)
- `tag` — short label shown on the card (e.g. `必訪`、`雨天備案`)
- `notes` — short reminder, shown prominently on the card
- `phone` — phone number (auto-linked to `tel:`)

**Hotel-specific:**
- `check_in`, `check_out` — `YYYY-MM-DD`
- `address`

**Restaurant-specific:**
- `type` — cuisine (拉麵、洋食、和食、etc.)
- `price_range` — `$`, `$$`, `$$$`, `$$$$`
- `recommended` — recommended dishes
- `dietary` — vegetarian / dietary notes

**Attraction-specific:**
- `duration` — estimated time (e.g. `90 分鐘`)
- `ticket` — admission info

**Ticket-specific:**
- `valid` — validity period
- `where_to_buy`

**Transit-specific:**
- `mode` — `flight` | `train` | `bus` | `public_transit` | `taxi` | `car`
  (controls the icon: ✈️ 🚄 🚌 🚇 🚕 🚗)
- `airline` / `operator`
- `depart`, `arrive` — `YYYY-MM-DD HH:MM 機場/站名`

**Medical-specific:**
- `type` — `緊急聯絡`、`國際診所`、`藥局`、etc.

**You can add any custom field.** The web app shows unknown fields as
"Field name: value" rows, so you never need to ask Jimmy to add code
support for new fields.

### Image
Place the markdown image after the field block, before the description:
```markdown
![](images/{trip-slug}/saimi.jpg)
```
Multiple images allowed; the first is used as the card thumbnail.

### Long-form description
Anything below the image is rendered as standard markdown (paragraphs,
lists, links). This is where you write the "story" of each place.

---

## ## 行程 section — DAY/STOP format (special)

This section drives the timeline view and the daily map.

```markdown
## 行程

### Day 1 — 2026-05-15

#### 13:00–14:30 新東京機場入境
- **ref**: 交通:TPE-NRT
- **next**: 60 分鐘 / Skyliner
- **notes**: 入境表先填好

#### 16:30–18:00 淺草寺
- **ref**: 景點:淺草寺
- **next**: 30 分鐘 / 步行 + 銀座線
- **notes**: 黃昏時分人少

#### 19:00–21:00 川村屋洋食
- **ref**: 餐廳:川村屋
- **next**: —
- **notes**: 預約過了

### Day 2 — 2026-05-16
...
```

### Day heading rules
- Format: `### Day {N} — {YYYY-MM-DD}`
- `N` is informational; the actual day number is computed from the date
  vs `start_date` in the frontmatter, so dates determine ordering.
- One blank line below the heading.

### Stop heading rules
- Format: `#### {start}–{end} {place name}`
- `start–end` accepts `13:00–14:30`, `13:00-14:30`, or `13:00 ~ 14:30`
  (en-dash, hyphen, or tilde)
- For arrivals/departures with no end: `#### 09:00– 桃園機場登機`
- The place name should match an item in another section (see `ref`).

### Stop fields (all optional)
- `ref` — `{section}:{item name}` — links the stop to a card in another
  section. When the user clicks the stop, the linked card opens as a modal.
  - Examples: `住宿:Hotel Gracery Shinjuku`、`景點:淺草寺`
  - The name must match the `### Item Name` exactly.
- `next` — predicted travel time + mode to the next stop
  (e.g. `60 分鐘 / 步行 + 地鐵`、`90 分鐘 / Skyliner`、`—` for last stop)
- `notes` — day-specific reminder for this stop (separate from the item's
  default `notes` in 住宿/餐廳/etc.)

When a stop has a `ref` and the referenced item has `coordinates`, the
stop appears on the daily map with a numbered marker matching its order.

---

## ## 備案 section (free-form)

This tab is plain markdown — no item structure required. Use `### XXX`
sub-headings as you like:

```markdown
## 備案

### 雨備
- 改室內景點：晴空塔水族館、teamLab Borderless
- 在飯店休整、看電影院

### 體力備案
- 縮短淺草行程，改坐人力車
- Day 3 改為飯店休息日
```

## ## 語言 section (free-form)

```markdown
## 語言

### 常用句
- すみません — 不好意思
- お会計お願いします — 請結帳

### 料理
- お任せ — 主廚推薦
- 大盛り — 加大
```

---

## Hard rules for agents

1. **One file = one version of one trip.** Never combine versions.
2. **Always write the YAML frontmatter** with at minimum `trip`,
   `version`, `start_date`, `end_date`.
3. **Coordinates are critical** for the map to work. When adding a
   hotel/restaurant/attraction, look up real coordinates if possible.
4. **`ref` values must exactly match** an existing `### Item Name`. If
   you add a new stop to ## 行程, make sure the referenced item exists
   in the corresponding section.
5. **Image paths** are relative to the repo root, not the .md file:
   use `images/{trip-slug}/{file}.jpg`.
6. **Don't invent booking refs / prices.** If unknown, omit the field.
   Use `notes: 待訂` or similar.
7. **Free-form notes go in the long-form description** below the field
   block, not in the field list.
8. When updating an existing trip, **read the current file first** so
   you preserve the exact structure and don't drop existing fields.

## Quick template for a new trip

```markdown
---
trip: <Display Name>
version: v1
start_date: YYYY-MM-DD
end_date: YYYY-MM-DD
summary: <one line>
cover: images/<trip-slug>/cover.jpg
travelers: <e.g. 2 大人 + 1 小孩>
tags: []
---

## 行程

### Day 1 — YYYY-MM-DD

#### HH:MM–HH:MM <place>
- **ref**: <section>:<item>
- **next**: <minutes> / <mode>
- **notes**:

## 住宿

### <hotel name>
- **check_in**:
- **check_out**:
- **coordinates**:
- **google_maps**:
- **website**:
- **booking_url**:
- **price**:
- **notes**:

![](images/<trip-slug>/<file>.jpg)

<description>

## 餐廳
## 景點
## 票券
## 交通
## 醫療
## 備案
## 語言
```
