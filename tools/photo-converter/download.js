(function () {
  const REPO = "TSY3991/TSY.PhotoConverter";
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

  // Converts the release body markdown into a short change list. The
  // "下載資產" section just repeats the download cards above, so it's skipped
  // here rather than shown twice.
  function renderNotes(body) {
    if (!body || !body.trim()) return "<p>此版本未提供更新說明。</p>";

    const lines = body.replace(/\r\n/g, "\n").split("\n");
    let html = "";
    let inList = false;
    let skipSection = false;

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
        skipSection = /下載資產|完整性驗證/i.test(heading);
        if (!skipSection && !/^Release 資訊$/.test(heading)) {
          html += `<h3>${escapeHtml(heading)}</h3>`;
        }
        continue;
      }

      if (skipSection || !line || /^\|/.test(line) || /^[-:|\s]+$/.test(line)) continue;

      if (/^[-*]\s+/.test(line)) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        line = line.replace(/^[-*]\s+/, "");
        html += `<li>${escapeHtml(cleanInlineMarkdown(line))}</li>`;
        continue;
      }

      closeList();
      html += `<p>${escapeHtml(cleanInlineMarkdown(line))}</p>`;
    }

    closeList();
    return html || "<p>此版本未提供更新說明。</p>";
  }

  // Groups a release asset filename into a known download slot, or null if
  // it doesn't match (e.g. SHA256.txt, RELEASE-MANIFEST.json). PhotoConverter
  // only ships x64 builds, so anything not explicitly arm64 is treated as x64.
  function classifyAsset(name) {
    const lower = name.toLowerCase();
    if (lower.endsWith(".exe") && lower.includes("setup")) {
      return { group: "installer-x64", label: "安裝版（x64，一般電腦）" };
    }
    if (lower.endsWith(".zip") && lower.includes("portable")) {
      return { group: "portable-x64", label: "免安裝版（x64，一般電腦）" };
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
        } else if (!/sha256|release-manifest/i.test(asset.name)) {
          extras.push(asset);
        }
      }

      const order = ["installer-x64", "portable-x64"];
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
