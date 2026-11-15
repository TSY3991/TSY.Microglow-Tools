// 工具箱大廳：依 data-updated-at（最新版發布日期）由新到舊排列卡片。
// 獨立成外部檔，是因為頁面 CSP 為 script-src 'self'，不允許內嵌 <script>。
document.querySelectorAll("[data-sort-by-updated]").forEach((grid) => {
  const cards = Array.from(grid.children).map((card, index) => {
    const parsedDate = Date.parse(card.dataset.updatedAt || "");
    return {
      card,
      index,
      updatedAt: Number.isNaN(parsedDate) ? 0 : parsedDate,
      sortLast: card.dataset.sortLast === "true"
    };
  });

  cards
    .sort((a, b) => {
      if (a.sortLast !== b.sortLast) return a.sortLast ? 1 : -1;
      return b.updatedAt - a.updatedAt || a.index - b.index;
    })
    .forEach(({ card }) => grid.append(card));
});
