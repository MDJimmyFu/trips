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
  branch: 'main',                  // 預設 main
  tripsDir: 'trips',               // 預設 trips
};
</script>
```

放在現有 `<script src="https://cdn.jsdelivr.net/...">` 那群之後、最後那個 `<script>` 之前即可。

> ⚠️ **不要**在 `TRIP_CONFIG` 裡放 API key。GitHub Pages 部署的網站是公開的，任何人都看得到 source。API key 應該透過下面 ⚙ 設定面板存進瀏覽器 localStorage。

### 航班即時狀態（選用）

每張機票卡片在 modal 內**預設都有**一個「🛫 即時航班狀態」按鈕，點擊會跳到 FlightAware 對應航班頁面（自動把 IATA 轉成 ICAO callsign，例如 BR184→EVA184、AY0533→FIN0533），免註冊、免 API key、永遠可用。

如果想讓即時狀態（航班 ETA / 延誤分鐘 / 登機口 / 航廈 / 機型 / 即時飛機位置）**直接內嵌在頁面上**，並讓地圖上的航線會根據狀態變色（飛行中橙、預定青、降落灰、取消紅）甚至加上即時飛機 icon，可以申請 AeroDataBox 或 AviationStack 的免費 API key。

#### API key 該放哪？

GitHub Secrets **不適用**這個場景 — 它只給 GitHub Actions（伺服端）用。trip-site 是純靜態 HTML，所有 fetch 從你瀏覽器發出；瀏覽器看得到的東西其他訪客也看得到。把 key 寫進 `TRIP_CONFIG`、寫進 source code、用 GitHub Action 在 build 時注入，最後都會出現在 deployed HTML。

**正確做法**：點右上角 ⚙ 圖示 → 把 key 貼進去 → 儲存。Key 只存在你瀏覽器的 `localStorage`，不會 commit 到 repo、不會出現在 deployed HTML。換瀏覽器 / 換裝置時要重新輸入一次（這正是 key 不擴散的證據）。

> 規則：絕對不要把 API key 放進 source code。同樣道理也適用 ntfy.sh topic、未來任何敏感字串。

#### AeroDataBox（推薦）

[RapidAPI 註冊](https://rapidapi.com/aedbx-aedbx/api/aerodatabox) → 訂閱 BASIC 免費方案 → 在 ⚙ 設定面板貼進 RapidAPI key。

- **每天 100 次**（vs AviationStack 每月 100 次，60× 額度）
- **HTTPS 原生支援**（GitHub Pages HTTPS 站點不會混合內容錯誤）
- 資料豐富：機型、出發/抵達航廈、登機口、行李轉盤、code-share 標記、即時飛機位置（lat/lon/heading）

#### AviationStack（備援）

[aviationstack.com](https://aviationstack.com/) 註冊 → ⚙ 設定面板貼進。

- 免費方案僅支援 HTTP（非 HTTPS）。如果你的站開了 HTTPS，瀏覽器會封鎖混合內容請求。解法：升級付費方案（key 開頭加 `paid_` 前綴自動切 HTTPS），或設定 AeroDataBox 取代它。
- 每月只有 100 次。

#### 通用機制

- 兩個 key 都設定時，AeroDataBox 優先；它失敗或沒資料才 fallback 到 AviationStack。
- 為節省 quota，僅在航班日期 ±2 天內才實際查詢；其餘時候顯示「日期超出範圍」。
- 沒設 key 時內嵌區塊不顯示，不佔版面。FlightAware 連結始終都在。

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
