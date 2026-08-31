# 微光工具箱

可被 TSY 微光創作室入口網站連接的獨立靜態工具箱專案，集中放置桌面小工具與網頁工具的下載／使用入口。

- 入口網站：https://tsy3991.github.io/TSY.Microglow-Website/
- GitHub Pages repo name：`TSY.Microglow-Tools`
- 工具箱：https://tsy3991.github.io/TSY.Microglow-Tools/
- PriceRadar 價格雷達：https://tsy3991.github.io/TSY.Microglow-Tools/tools/price-radar/
- 隨身硬碟同步備份工具：https://tsy3991.github.io/TSY.Microglow-Tools/tools/portable-backup-tool/
- 舊車機 MP3／MP4 轉檔工具：https://tsy3991.github.io/TSY.Microglow-Tools/tools/car-media-converter/
- PhotoConverter 照片轉檔工具：https://tsy3991.github.io/TSY.Microglow-Tools/tools/photo-converter/

## Structure

```text
Tools/
  index.html
  shared/
    base.css          — 全站色彩、reset、大廳版型（.lobby-shell/.tool-card 等）
    tool-detail.css    — 工具詳情頁共用樣板（.detail-hero/.download-card 等）
    portal-return.js
  assets/
    logo-mark.png
  tools/
    price-radar/
      index.html        — PriceRadar 網頁／App
    portable-backup-tool/
      index.html
      download.js      — 讀取對應 GitHub repo 的 Releases API，自動帶入最新版本
    car-media-converter/
      index.html
      download.js      — 讀取 TSY.CarMediaConverter 最新 Release
    photo-converter/
      index.html
      download.js      — 讀取 TSY.PhotoConverter 最新 Release
```

## Current Tools

- `tools/price-radar/`：PriceRadar 價格雷達，提供條碼掃描、價格回報與比較功能。
- `tools/portable-backup-tool/`：隨身硬碟同步備份工具，頁面會自動抓取
  [TSY.PortableBackupTool](https://github.com/TSY3991/TSY.PortableBackupTool) 的
  GitHub Releases 最新版本（版本號、更新說明、各架構下載連結、SHA256），新版發布後
  不需要回來改這個頁面。
- `tools/car-media-converter/`：舊車機 MP3／MP4 轉檔工具，頁面會自動抓取
  [TSY.CarMediaConverter](https://github.com/TSY3991/TSY.CarMediaConverter) 的
  最新 Release，提供 Windows x64 安裝版、免安裝版、SHA-256 與版本說明。
- `tools/photo-converter/`：PhotoConverter 照片轉檔工具，頁面會自動抓取
  [TSY.PhotoConverter](https://github.com/TSY3991/TSY.PhotoConverter) 的
  最新 Release，提供 Windows x64 安裝版、免安裝版、SHA-256 與版本說明。

## 新增工具時

1. 在 `tools/<tool-id>/` 建立新資料夾
2. 桌面下載型工具：複製 `tools/portable-backup-tool/` 的結構，改 `download.js` 裡的 `REPO` 常數指到對應的 GitHub repo，套用 `shared/base.css` + `shared/tool-detail.css`
3. 網頁／App 型工具：視需求另外設計頁面，或直接把 `primary-link` 指到外部網址
4. 回到 `index.html` 的 `.tool-grid` 裡加一張 `.tool-card`

## Deployment

這是純靜態專案，不需要建置流程。GitHub Pages 可直接以 repo root 部署。
