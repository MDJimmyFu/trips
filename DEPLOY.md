# 部署：Cloudflare Pages + Access

完整把 trip-site 從 GitHub Pages 搬到 Cloudflare Pages，並用 Cloudflare Access 鎖私人版。整個過程 30-45 分鐘，不需要花錢。

## 架構

```
            ┌──────────────────────────────────┐
            │  GitHub repo (private)            │
            │  trips/ (full data, not deployed) │
            └─────────┬───────────┬─────────────┘
                      │           │
        ┌─────────────┘           └─────────────┐
        │ Cloudflare 自動偵測 push                │
        │                                         │
        ↓                                         ↓
  ┌──────────────────┐                  ┌──────────────────┐
  │ Cloudflare Pages │                  │ Cloudflare Pages │
  │ (private)        │                  │ (public)         │
  │ Build: 無         │                  │ Build: redact.js  │
  │ Output: /         │                  │ Output: public/   │
  │ + Cloudflare      │                  │ (no Access)       │
  │   Access          │                  │                   │
  └──────────────────┘                  └──────────────────┘
   private.jimmyfu.dpdns.org             public.jimmyfu.dpdns.org
   登入後完整資料                          公開分享，已遮蔽
```

---

## 階段 1：申請 dpdns.org 子網域

1. 開 https://dash.domain.digitalplat.org/
2. 用 GitHub OAuth 登入（KYC 驗證）
3. Domain Registration → 搜尋 `jimmyfu`
4. 選 `.dpdns.org` → Register
5. **Name Servers 欄位先別填**（或填佔位）— 等下面 Cloudflare 才知道你的 NS

---

## 階段 2：Cloudflare 開帳號 + 加網域

1. https://dash.cloudflare.com 註冊（免費）
2. Add a Site → 輸入 `jimmyfu.dpdns.org`（**不是** `dpdns.org`）
3. 選 **Free** 方案
4. Cloudflare 會說「無法掃描現有 DNS records」— 這正常，因為 dpdns.org 沒有
5. 進到 Quick Start，**記下 Cloudflare 給你的兩個 NS**：
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
   （實際名字會不同，是 Cloudflare 隨機指派的）

---

## 階段 3：回 dpdns.org 設 NS

1. 回 dpdns.org dashboard
2. My Domains → 編輯 `jimmyfu.dpdns.org`
3. Name Servers 改成 Cloudflare 那兩個（用全部小寫，結尾不要句點）
4. Save

等 5-30 分鐘 propagation。檢查方法：

```bash
dig NS jimmyfu.dpdns.org +short
```

回傳兩個 `*.ns.cloudflare.com` 就表示完成。Cloudflare dashboard 上狀態會從 Pending 變 **Active**。

---

## 階段 4：Cloudflare Pages — 私人版

進 Cloudflare → Workers & Pages → Pages → **Create application** → **Connect to Git**：

1. Connect 你的 GitHub
2. 選 trip-site repo
3. Set up builds:
   - Project name: `trips-private`
   - Production branch: `main`
   - Framework preset: **None**
   - Build command: **留空**
   - Build output directory: `/`
   - Root directory: `/`
4. Save and Deploy

第一次部署完後，會有個 `trips-private.pages.dev` URL（先別開放，下一步要鎖）。

### 綁自訂網域

Pages site → Custom domains → Set up a custom domain:
- Domain: `private.jimmyfu.dpdns.org`
- Cloudflare 會自動幫你開 CNAME

---

## 階段 5：Cloudflare Access — 鎖私人版

Cloudflare → Zero Trust（左下選單）→ Access → Applications → **Add an application**：

### 選 Application type

**Self-hosted**

### Configure application

- Application name: `Trips Private`
- Session Duration: `24 hours`（24 小時內不用重新登入）
- Application domain:
  - Subdomain: `private`
  - Domain: `jimmyfu.dpdns.org`
  - Path: 留空（保護整站）

### Identity providers — 三個都開

下一頁會有 IdP 選擇。預設只有 Cloudflare 內建的 One-time PIN。要加 Google 跟 WebAuthn 需要先到 **Settings → Authentication** 設定：

#### A) Email OTP（內建，自動可用）
無需設定，預設啟用。User 輸入 email → 收 6 位數驗證碼。

#### B) Google login（要先設）
1. Settings → Authentication → Login methods → **Add new**
2. 選 **Google**
3. 跟著步驟到 [Google Cloud Console](https://console.cloud.google.com/) 建 OAuth credentials：
   - Create Project → APIs & Services → Credentials
   - Create OAuth client ID → Web application
   - Authorized redirect URI: 從 Cloudflare 對話框複製貼進去
   - 把 Client ID 跟 Secret 填回 Cloudflare
4. Save

#### C) WebAuthn / Passkey（要先設）
1. Settings → Authentication → Login methods → **Add new**
2. 選 **One-time PIN with WebAuthn**（注意：CF 的 passkey 是綁 OTP 的）
3. 啟用就好

回到你的 Application → Authentication tab，把這三個 IdP 都勾起來。

### Add a policy

- Policy name: `Allow family`
- Action: **Allow**
- Configure rules → Include → **Emails**：
  - `jimmy@yourgmail.com`
  - `wife@yourgmail.com`
  - 其他要給看的人
- Save

或如果你想要「自己 + 任何 google.com / yahoo.com 結尾的家人 email」，可以用 Email domain 規則。

### Save

點 Save。從現在起 `private.jimmyfu.dpdns.org` 沒登入就 401，登入後 24 小時內暢行。

---

## 階段 6：Cloudflare Pages — 公開版

回 Pages → Create application → 同一個 GitHub repo：

1. Project name: `trips-public`
2. Production branch: `main`
3. Build command: `node scripts/redact.js`
4. Build output directory: `public`
5. Root directory: `/`
6. Environment variables: 不用設

第一次 build 跑完後，綁自訂網域：

- Custom domains → Set up → `public.jimmyfu.dpdns.org`

**這個 site 不要套 Access**，要保持公開。

---

## 階段 7：關閉 GitHub Pages

GitHub repo → Settings → Pages → Source → **None** → Save

原本的 `mdjimmyfu.github.io/...` URL 會 404。從現在起兩個入口：

- 👤 **私人**：https://private.jimmyfu.dpdns.org（要登入）
- 🌐 **公開**：https://public.jimmyfu.dpdns.org（任何人都能看，已遮蔽敏感資訊）

---

## 日常工作流程

1. 編輯 `trips/2026-xxx/v1.md`
2. `git push`
3. Cloudflare 自動偵測 → 兩個 site 同時開始 build
4. 30-60 秒後兩個都完成，新內容上線

要改 redact 規則：編 `scripts/redact.config.js`，push 即可。

要本地測 redact：
```bash
npm run test:redact
# 或
node scripts/redact.js && head -80 public/trips/2026-tokyo-romantic/v1.md
```

---

## 公開版上看到什麼 vs 看不到什麼

**看得到**：
- 行程結構（Day 1, Day 2, ...）
- 住宿/餐廳/景點/票券/交通（含位置、地圖、照片、描述）
- 航班路線地圖、即時狀態（如果該訪客自己設了 API key）
- Google Maps 導航

**看不到**：
- 訂位代號 / PNR / 票號（`booking_ref` 欄位移除）
- 電話（`phone` 欄位移除 + 自由文字裡的電話 pattern 替換成 `[已遮蔽]`）
- Frontmatter 的 `travelers` 欄位（避免人數/狀況外洩）
- 整個 `## 醫療` section
- Email、長串 e-ticket 編號
- 任何標明 "PNR ABC123" / "訂位代號 XYZ123" 的字串

要改防護，編 `scripts/redact.config.js`：
- `removeFrontmatterFields` — 加更多 frontmatter 欄位
- `removeItemFields` — 加更多 item 欄位
- `removeSections` — 加更多整段不公開
- `redactPatterns` — 加更多 regex 替換

---

## 故障排除

**Cloudflare Pages build 失敗**：
- 看 build log。常見問題：`scripts/` 目錄沒 push 上去 → 確認 git status。
- Node version：Cloudflare 預設 Node 18，腳本相容。如果想固定，repo 加 `.node-version` 檔內容寫 `20`。

**Custom domain 卡在 "Verifying"**：
- 確認 dpdns.org NS 已經指向 Cloudflare（`dig NS jimmyfu.dpdns.org`）
- 等 30 分鐘再回頭看

**Access 登入不了**：
- 檢查 policy 的 email 是不是真的你輸入的那個（Gmail 的 alias 算不同 email）
- Zero Trust → Logs → Access → 看登入嘗試記錄

**API key 跑哪去了**：
- localStorage 存在 origin 為單位。`private.jimmyfu.dpdns.org` 跟 `public.jimmyfu.dpdns.org` 是不同 origin，要各設一次。
- 通常公開版不需要設 — 那邊本來就是給沒帳號的人看的。

---

## 成本

- dpdns.org：$0
- Cloudflare 帳號：$0
- Cloudflare Pages：$0（每月 500 次 build、無流量限制）
- Cloudflare Access：$0（free tier 50 user）
- GitHub repo (private)：$0（個人 unlimited private repos）

**總計：$0/月**
