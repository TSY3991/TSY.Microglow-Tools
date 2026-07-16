(function () {
  const REPO = "TSY3991/TSY.PortableBackupTool";
  const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;

  const versionEl = document.querySelector("[data-version]");
  const publishedEl = document.querySelector("[data-published]");
  const notesEl = document.querySelector("[data-notes]");
  const downloadsEl = document.querySelector("[data-downloads]");
  const shaEl = document.querySelector("[data-sha]");
  const statusEl = document.querySelector("[data-status]");
  const fallbackEl = document.querySelector("[data-fallback]");

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "";
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });
  }

  function cleanInlineMarkdown(value) {
    return String(value)
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();
  }

  function simplifyNote(value) {
    const text = cleanInlineMarkdown(value);

    if (text.includes("無預警關閉（跳掉）")) {
      return "修正程式可能突然關閉的問題；如果遇到錯誤，現在會顯示原因並保留診斷紀錄，方便回報。";
    }
    if (text.includes("手機備份整體時限")) {
      return "大型相簿的備份時間上限已延長到 4 小時，幾萬張照片或影片較不容易在途中被中止；手機斷線時會立即提醒。";
    }
    if (text.includes("若仍遇到程式異常關閉")) {
      return "如果仍遇到程式突然關閉，可從側邊欄匯出診斷紀錄，再附在問題回報中。";
    }
    if (text.includes("備份後驗證檔案完整性")) {
      return "新增可選擇的「備份完成後再檢查」，會重新比對手機與備份檔案，確認內容完整；這項檢查需要較長時間，預設不開啟。";
    }
    if (text.includes("iPhone 同月份分割資料夾")) {
      return "iPhone 將同一月份拆成多個資料夾時，備份後會自動整理到同一個月份資料夾。";
    }
    if (text.includes("進度顯示改用位元組")) {
      return "進度現在會顯示百分比、預估剩餘時間，以及目前正在處理的月份。";
    }
    if (text.includes("備份完成／取消／失敗後")) {
      return "備份結束後會用綠、黃、紅色清楚顯示成功、取消或失敗，離開座位回來也能立刻看懂結果。";
    }
    if (text.includes("iPhone 照片讀取仍受 Windows MTP")) {
      return "使用 iPhone 備份時，請保持手機解鎖、螢幕開啟，並在手機上選擇信任這台電腦；若手機斷線，備份會停止並顯示原因。";
    }

    return text;
  }

  function userHeading(value) {
    const headings = {
      "手機備份穩定性（重點）": "手機備份更穩定",
      "手機備份功能": "手機備份更好用",
      "介面": "操作畫面更清楚"
    };
    return headings[value] || value;
  }

  // Converts the release body into a short, user-facing change list. Technical
  // checksum tables stay in the dedicated SHA-256 section above.
  function renderNotes(body) {
    if (!body || !body.trim()) return "<p>此版本未提供更新說明。</p>";

    const lines = body.replace(/\r\n/g, "\n").split("\n");
    let html = "";
    let inList = false;
    let skipVerification = false;

    function closeList() {
      if (!inList) return;
      html += "</ul>";
      inList = false;
    }

    for (const rawLine of lines) {
      let line = rawLine.trim();
      const headingMatch = line.match(/^#{1,6}\s+(.+)$/);

      if (headingMatch) {
        closeList();
        const heading = cleanInlineMarkdown(headingMatch[1]);
        if (/檔案驗證|SHA-?256/i.test(heading)) {
          skipVerification = true;
          continue;
        }
        skipVerification = false;
        if (heading === "這次更新了什麼") continue;
        html += `<h3>${escapeHtml(userHeading(heading))}</h3>`;
        continue;
      }

      if (skipVerification) {
        if (/^iPhone\s+照片讀取/.test(line)) {
          skipVerification = false;
          html += "<h3>使用手機備份時</h3>";
        } else {
          continue;
        }
      }

      if (!line || /^\|/.test(line) || /^[-:|\s]+$/.test(line)) continue;

      const isBullet = /^[-*]\s+/.test(line);
      if (isBullet) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        line = line.replace(/^[-*]\s+/, "");
        html += `<li>${escapeHtml(simplifyNote(line))}</li>`;
        continue;
      }

      closeList();
      html += `<p>${escapeHtml(simplifyNote(line))}</p>`;
    }

    closeList();
    return html || "<p>此版本未提供更新說明。</p>";
  }
  // Groups a release asset filename into one of four known download slots, or
  // null if it doesn't match (e.g. SHA256.txt, ReadMe.txt, LICENSE.txt).
  function classifyAsset(name) {
    const lower = name.toLowerCase();
    const isArm64 = lower.includes("arm64");
    if (lower.endsWith(".exe") && lower.includes("setup")) {
      return {
        group: isArm64 ? "installer-arm64" : "installer-x64",
        label: isArm64 ? "安裝版（ARM64）" : "安裝版（x64，一般電腦）"
      };
    }
    if (lower.endsWith(".zip") && lower.includes("portable")) {
      return {
        group: isArm64 ? "portable-arm64" : "portable-x64",
        label: isArm64 ? "免安裝版（ARM64）" : "免安裝版（x64，一般電腦）"
      };
    }
    return null;
  }

  function buildDownloadCard(asset, meta) {
    return `
      <article class="download-card">
        <div class="download-card-copy">
          <p>${escapeHtml(meta.label)}</p>
          <strong>${escapeHtml(asset.name)}</strong>
          <span>${formatBytes(asset.size)}</span>
        </div>
        <a class="download-button" href="${escapeHtml(asset.browser_download_url)}">
          <span>下載</span>
          <span class="arrow-symbol" aria-hidden="true"></span>
        </a>
      </article>`;
  }

  function buildExtraLink(asset) {
    return `<a href="${escapeHtml(asset.browser_download_url)}">${escapeHtml(asset.name)}（${formatBytes(asset.size)}）</a>`;
  }

  async function loadShaText(assets) {
    if (!shaEl) return;
    const shaAsset = assets.find((asset) => /sha256/i.test(asset.name));
    if (!shaAsset) {
      shaEl.textContent = "此版本未附上 SHA256.txt。";
      return;
    }
    try {
      const response = await fetch(shaAsset.browser_download_url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      shaEl.textContent = await response.text();
    } catch {
      shaEl.innerHTML = `無法自動載入雜湊值內容，請直接下載 <a href="${escapeHtml(shaAsset.browser_download_url)}">${escapeHtml(shaAsset.name)}</a> 查看。`;
    }
  }

  async function init() {
    try {
      const response = await fetch(API_URL, { headers: { Accept: "application/vnd.github+json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const release = await response.json();
      const assets = Array.isArray(release.assets) ? release.assets : [];

      if (versionEl) versionEl.textContent = release.tag_name || "未知版本";
      if (publishedEl && release.published_at) {
        publishedEl.textContent = `發布於 ${formatDate(release.published_at)}`;
      }
      if (notesEl) notesEl.innerHTML = renderNotes(release.body);

      const grouped = {};
      const extras = [];
      for (const asset of assets) {
        const meta = classifyAsset(asset.name);
        if (meta) {
          grouped[meta.group] = { asset, meta };
        } else if (!/sha256/i.test(asset.name)) {
          extras.push(asset);
        }
      }

      const order = ["installer-x64", "portable-x64", "installer-arm64", "portable-arm64"];
      const cardsHtml = order
        .filter((key) => grouped[key])
        .map((key) => buildDownloadCard(grouped[key].asset, grouped[key].meta))
        .join("");

      if (downloadsEl) {
        downloadsEl.innerHTML = cardsHtml || "<p>目前找不到可下載的檔案，請直接前往 GitHub Releases 頁面。</p>";
      }

      if (extras.length && fallbackEl) {
        fallbackEl.innerHTML = `其他檔案：${extras.map(buildExtraLink).join("、")}`;
      }

      await loadShaText(assets);
    } catch {
      if (statusEl) {
        statusEl.textContent = "無法自動載入最新版本資訊，請直接前往下方「GitHub Releases 完整頁面」下載。";
        statusEl.hidden = false;
        statusEl.classList.add("is-error");
      }
      if (downloadsEl) downloadsEl.innerHTML = "";
      if (shaEl) shaEl.textContent = "無法載入，請前往 GitHub Releases 頁面查看 SHA256.txt。";
      if (notesEl) notesEl.innerHTML = "<p>無法載入更新說明。</p>";
    }
  }

  init();
})();
