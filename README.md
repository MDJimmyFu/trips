# 旅誌 · Trip Journal

一個單檔 HTML 的 GitHub Pages 行程站。把行程寫成 Markdown，網站會自動讀取並渲染成有地圖、卡片、Modal、版本切換、搜尋的旅遊頁面。

---

## 一、初次部署（5 分鐘）

### 1. 建一個新 repo

例如 `mdjimmyfu/trips`，public，初始一個 README。

### 2. 把這四種檔案放進去

```
trips/                              ← 行程資料夾（每個資料夾＝一趟）
├── 2026-tokyo-weekend/
│   ├── v1.md                       ← 一個版本＝一個 .md
│   └── v2-with-parents.md
└── 2026-hokkaido-ski/
    └── v1.md
images/                             ← 圖片資料夾（每個行程一個子資料夾）
├── 2026-tokyo-weekend/
│   ├── cover.jpg
│   ├── gracery.jpg
│   └── ...
└── 2026-hokkaido-ski/
    └── ...
SKILL.md                            ← 給未來 AI agent 看的 schema 規範
index.html                          ← 整個網站（單檔）
```

### 3. 啟用 GitHub Pages

repo → Settings → Pages → Source 選 `main` branch，root 目錄 → Save。

幾分鐘後就能用 `https://你的帳號.github.io/repo名/` 打開。

---

## 二、CONFIG（通常不用改）

`index.html` 預設會從網址自動推斷你的 `owner` 和 `repo`：

| 部署網址                          | 自動推斷                    |
|-----------------------------------|-----------------------------|
| `mdjimmyfu.github.io/trips/`      | owner=`mdjimmyfu`、repo=`trips` |
| `mdjimmyfu.github.io/`            | owner=`mdjimmyfu`、repo=`mdjimmyfu.github.io` |

如果要手動覆寫（例如想用 fork 的 repo、或測試其他分支），在 `<script>` 主邏輯**之前**加一段：

```html
<script>
window.TRIP_CONFIG = {
  owner: 'mdjimmyfu',
  repo: 'my-trips',
  branch: 'main',          // 預設 main
  tripsDir: 'trips',       // 預設 trips
};
</script>
```

放在現有 `<script src="https://cdn.jsdelivr.net/...">` 那群之後、最後那個 `<script>` 之前即可。

---

## 三、新增 / 編輯行程

### 自己手寫
照 `SKILL.md` 規格寫一個 `.md` 檔，commit、push，網站立刻更新（不用 build）。

### 請 AI agent 幫你寫
把這個 repo 連結到 Claude（或附上 `SKILL.md`），然後說：

> 幫我在 `trips/` 加一個新行程：2026 北海道滑雪 6 天，從 1/18 到 1/23...

agent 會照 schema 產出 `.md` 檔。重點是**叫它先讀 `SKILL.md`**，產出的格式才會跟既有檔案相容。

### 加新版本
在同一個 `trips/{trip-slug}/` 資料夾新增 `.md` 檔即可（例如 `v2-shorter.md`、`final.md`）。版本下拉會自動更新。

---

## 四、URL 深連結（分享某一頁、某一張卡）

| URL 範例                                                | 行為                          |
|---------------------------------------------------------|-------------------------------|
| `?trip=2026-tokyo-weekend`                              | 開該行程，最新版本             |
| `?trip=2026-tokyo-weekend&v=v2-with-parents`            | 指定版本                      |
| `?trip=2026-tokyo-weekend&v=v1&tab=餐廳`                | 直接跳到「餐廳」分頁           |
| `?trip=2026-tokyo-weekend&v=v1&tab=住宿&item=住宿:Hotel%20Gracery%20Shinjuku` | 直接彈出某張卡片的 modal |

URL 會隨著操作自動更新，所以可以隨時複製分享。

---

## 五、SKILL.md 是給誰看的？

兩種用法：

1. **未來叫 AI agent 編輯時放在 context** — 把 SKILL.md 內容貼給 Claude，或在 Claude Project 裡附上這個 repo，agent 就會照規格產出可用的 `.md`。
2. **作為自己的 reference** — 忘記欄位有哪些時直接翻 SKILL.md，所有 schema 一目了然。

---

## 六、重要細節

### 圖片路徑
md 檔裡寫**從 repo 根目錄的相對路徑**，不是從 .md 檔的位置：

```markdown
![](images/2026-tokyo-weekend/gracery.jpg)
```

`cover` 也一樣：
```yaml
cover: images/2026-tokyo-weekend/cover.jpg
```

### 座標
`coordinates: 35.6951, 139.7016`（緯度,經度，逗號分隔）。**有座標才會出現在地圖上**。

Google Maps 取座標：在地圖點某地 → 右下角的座標數字 → 點一下複製。

### 行程 stops 跟卡片配對
`#### 09:00–12:00 淺草寺` 下面寫：
```markdown
- **ref**: 景點:淺草寺
```
`ref` 的後半要**跟 `### 景點 / 淺草寺` 那個項目名稱完全一樣**（含空白），點 stop 才會彈出該景點的 modal。

### GitHub API rate limit
未認證 60 req/hour/IP。一般個人使用足夠（每次載入網站只用 1 個 API call 抓檔案樹）。

如果共享給很多人看可能會撞到限制 — 那就改用快取或預先生成索引（之後再考慮）。

---

## 七、本機測試（不部署也能跑）

直接打開 `index.html` 不行（CORS 限制）。最簡單的做法：

```bash
cd 你的repo根目錄
python3 -m http.server 8000
# 然後打開 http://localhost:8000
```

或：
```bash
npx serve .
```

但因為 CONFIG 會從 URL 推 owner/repo，本機測試時要手動設：
```html
<script>
window.TRIP_CONFIG = { owner: 'mdjimmyfu', repo: 'trips' };
</script>
```
（依然會去 GitHub 抓資料；如果想完全離線測試，需要自己加一個 fetchText 的 file path fallback — 目前 `loadTripMd` 已經會試 raw URL → 相對路徑兩種，應該可以用）。

---

## 八、自訂

### 改配色
所有顏色都在 `index.html` 開頭的 `:root { ... }` CSS 變數裡。要改主色就改 `--accent`，要改背景就改 `--bg`，深色模式在 `[data-theme="dark"] { ... }` 區塊。

### 改字體
`<link>` 那行的 Google Fonts URL 改一下，再把 `--serif` / `--sans` 變數改成你選的字體名即可。

### 加新分頁類型
**不用改任何 code** — 直接在 md 裡 `## 購物`、`## 溫泉`、`## 學日語`，網站自動產生 tab。你想加任何欄位也是 — md 寫什麼前端就顯示什麼。

---

## 九、檔案清單

| 檔案                  | 用途                                                      |
|-----------------------|-----------------------------------------------------------|
| `index.html`          | 整個網站（CSS + JS 都在裡面）                              |
| `SKILL.md`            | 給 AI agent 看的 md 格式規範                              |
| `README.md`           | 你正在看的這個                                            |
| `trips/{slug}/{v}.md` | 行程資料                                                  |
| `images/{slug}/*`     | 行程圖片                                                  |

---

製作於 2026 春，給愛旅行的人。
