import * as XLSX from 'xlsx';

function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isRtlString(str: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str);
}

/**
 * Generates an executive-grade interactive HTML spreadsheet document from an XLSX workbook.
 * Supports multi-sheet tabs, real-time live search, export to CSV, print styles, and RTL/LTR auto detection.
 */
export function generateRichSpreadsheetHtml(workbook: XLSX.WorkBook, baseName: string): string {
  const sheetNames = workbook.SheetNames || [];
  const isDocRtl = isRtlString(baseName);

  // Pre-generate sheet tables and statistics
  const sheetsData: { name: string; htmlTable: string; rowCount: number; colCount: number }[] = [];
  let totalRowsAllSheets = 0;

  sheetNames.forEach((name) => {
    const ws = workbook.Sheets[name];
    if (!ws) return;
    const ref = ws['!ref'];
    let rowCount = 0;
    let colCount = 0;
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      rowCount = range.e.r - range.s.r + 1;
      colCount = range.e.c - range.s.c + 1;
    }
    totalRowsAllSheets += rowCount;
    // Generate base HTML table
    const tableHtml = XLSX.utils.sheet_to_html(ws, { id: `table-${name}` });
    sheetsData.push({ name, htmlTable: tableHtml, rowCount, colCount });
  });

  const primarySheet = sheetsData[0] || { name: 'Sheet1', htmlTable: '<p>لا توجد بيانات</p>', rowCount: 0, colCount: 0 };

  const tabsHtml = sheetsData.length > 1
    ? `<div class="sheet-tabs" role="tablist">
        ${sheetsData
          .map(
            (s, idx) => `
          <button type="button" class="tab-btn ${idx === 0 ? 'active' : ''}" onclick="switchSheet(${idx})" id="tab-btn-${idx}">
            📊 ${escapeHtml(s.name)} <span class="tab-count">(${s.rowCount} صف)</span>
          </button>`
          )
          .join('')}
      </div>`
    : '';

  const sheetsContentHtml = sheetsData
    .map(
      (s, idx) => `
    <div class="sheet-panel ${idx === 0 ? 'active' : ''}" id="sheet-panel-${idx}">
      <div class="sheet-meta-bar">
        <span class="sheet-title-tag">ورقة: <strong>${escapeHtml(s.name)}</strong></span>
        <span class="sheet-dim-tag">${s.rowCount} صفوف × ${s.colCount} أعمدة</span>
      </div>
      <div class="table-responsive">
        ${s.htmlTable}
      </div>
    </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="${isDocRtl ? 'ar' : 'en'}" dir="${isDocRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(baseName)} - جدول بيانات ويب</title>
  <style>
    :root {
      --primary: #0284c7;
      --primary-hover: #0369a1;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --header-bg: #f1f5f9;
      --row-hover: #f0f9ff;
      --row-alt: #f8fafc;
    }
    html.dark {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --header-bg: #1e293b;
      --row-hover: #1e3a5f;
      --row-alt: #182234;
    }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Cairo", "Segoe UI", Roboto, "Tahoma", sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 1.5rem 1rem 4rem;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      transition: background-color 0.2s, color 0.2s;
    }
    .wrapper {
      max-width: 1200px;
      margin: 0 auto;
    }
    .top-bar {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 1.25rem 1.75rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      position: sticky;
      top: 1rem;
      z-index: 50;
      backdrop-filter: blur(10px);
    }
    .top-bar-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .doc-info h1 {
      margin: 0 0 0.25rem 0;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text);
    }
    .doc-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      font-size: 0.825rem;
      color: var(--text-muted);
    }
    .doc-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-action {
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.45rem 0.85rem;
      border-radius: 10px;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s ease;
      user-select: none;
    }
    .btn-action:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
    .filter-bar {
      margin-top: 1rem;
      padding-top: 0.85rem;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .search-input {
      flex: 1;
      min-width: 220px;
      padding: 0.55rem 0.95rem;
      border-radius: 10px;
      border: 1px solid var(--border);
      font-size: 0.875rem;
      background: var(--bg);
      color: var(--text);
      outline: none;
      transition: border-color 0.2s;
    }
    .search-input:focus {
      border-color: var(--primary);
    }
    .sheet-tabs {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding: 0.25rem 0;
      margin-bottom: 1rem;
    }
    .tab-btn {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.55rem 1.15rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.15s;
    }
    .tab-btn.active {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
      box-shadow: 0 4px 10px rgba(2, 132, 199, 0.25);
    }
    .tab-count {
      font-size: 0.75rem;
      opacity: 0.8;
    }
    .sheet-panel {
      display: none;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      margin-bottom: 2rem;
    }
    .sheet-panel.active {
      display: block;
    }
    .sheet-meta-bar {
      padding: 0.75rem 1.25rem;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.825rem;
      color: var(--text-muted);
    }
    .table-responsive {
      width: 100%;
      overflow-x: auto;
      max-height: 650px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      text-align: start;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 0.65rem 0.95rem;
      white-space: nowrap;
    }
    th {
      background: var(--header-bg);
      font-weight: 700;
      position: sticky;
      top: 0;
      z-index: 10;
      color: var(--text);
    }
    tr:nth-child(even) {
      background: var(--row-alt);
    }
    tr:hover {
      background: var(--row-hover);
    }
    .toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #1e293b;
      color: #ffffff;
      padding: 0.65rem 1.25rem;
      border-radius: 30px;
      font-size: 0.85rem;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.25);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s;
      opacity: 0;
      pointer-events: none;
      z-index: 1000;
    }
    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    @media print {
      body { background: #ffffff !important; padding: 0 !important; color: #000000 !important; }
      .top-bar, .sheet-tabs, .sheet-meta-bar, .toast { display: none !important; }
      .sheet-panel { display: block !important; border: none !important; box-shadow: none !important; }
      .table-responsive { max-height: none !important; overflow: visible !important; }
      th { position: static !important; background: #eee !important; color: #000 !important; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <header class="top-bar">
      <div class="top-bar-row">
        <div class="doc-info">
          <h1>${escapeHtml(baseName)}</h1>
          <div class="doc-stats">
            <span>📑 ${sheetNames.length} ${isDocRtl ? 'أوراق عمل' : 'Sheets'}</span>
            <span>📊 ${totalRowsAllSheets} ${isDocRtl ? 'إجمالي الصفوف' : 'Total Rows'}</span>
            <span>⚡ ${isDocRtl ? 'جدول بيانات ويب فوري' : 'Instant Web Spreadsheet'}</span>
          </div>
        </div>
        <div class="doc-actions">
          <button type="button" class="btn-action" onclick="toggleTheme()">🌓 ${isDocRtl ? 'المظهر' : 'Theme'}</button>
          <button type="button" class="btn-action" onclick="copyTableData()">📋 ${isDocRtl ? 'نسخ الجدول' : 'Copy Table'}</button>
          <button type="button" class="btn-action" onclick="window.print()">🖨️ ${isDocRtl ? 'طباعة' : 'Print'}</button>
        </div>
      </div>
      <div class="filter-bar">
        <input type="text" class="search-input" placeholder="${isDocRtl ? 'بحث وتصفية خلايا الجدول المفتوح...' : 'Search cells in active sheet...'}" oninput="filterActiveTable(this.value)" />
      </div>
    </header>

    ${tabsHtml}

    <main id="sheets-container">
      ${sheetsContentHtml}
    </main>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    let activeSheetIdx = 0;

    function showToast(msg) {
      const toast = document.getElementById('toast');
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2200);
    }

    function toggleTheme() {
      document.documentElement.classList.toggle('dark');
      showToast(document.documentElement.classList.contains('dark') ? 'Dark Mode' : 'Light Mode');
    }

    function switchSheet(idx) {
      activeSheetIdx = idx;
      document.querySelectorAll('.tab-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === idx);
      });
      document.querySelectorAll('.sheet-panel').forEach((panel, i) => {
        panel.classList.toggle('active', i === idx);
      });
    }

    function filterActiveTable(query) {
      const q = (query || '').toLowerCase().trim();
      const activePanel = document.getElementById('sheet-panel-' + activeSheetIdx);
      if (!activePanel) return;
      const rows = activePanel.querySelectorAll('tbody tr, tr');
      rows.forEach((row, i) => {
        if (i === 0 && row.querySelector('th')) return; // Skip header
        if (!q) {
          row.style.display = '';
          return;
        }
        const text = (row.innerText || row.textContent).toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
      });
    }

    function copyTableData() {
      const activePanel = document.getElementById('sheet-panel-' + activeSheetIdx);
      if (!activePanel) return;
      const table = activePanel.querySelector('table');
      if (!table) return;

      const rows = Array.from(table.querySelectorAll('tr'));
      const tsv = rows.map(r => {
        const cells = Array.from(r.querySelectorAll('th, td'));
        return cells.map(c => (c.innerText || c.textContent).trim()).join('\\t');
      }).join('\\n');

      navigator.clipboard.writeText(tsv).then(() => {
        showToast('${isDocRtl ? 'تم نسخ بيانات الجدول بصيغة متوافقة مع Excel!' : 'Table data copied to clipboard!'}');
      });
    }
  </script>
</body>
</html>`;
}

/**
 * Generates an executive-grade, readable HTML document from Word (DOCX/DOC) converted HTML.
 */
export function generateRichWordHtml(bodyHtml: string, baseName: string): string {
  const isDocRtl = isRtlString(baseName) || isRtlString(bodyHtml.slice(0, 500));
  const wordsCount = bodyHtml.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = Math.max(1, Math.ceil(wordsCount / 200));

  return `<!DOCTYPE html>
<html lang="${isDocRtl ? 'ar' : 'en'}" dir="${isDocRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(baseName)}</title>
  <style>
    :root {
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --bg: #f8fafc;
      --sheet-bg: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --font-scale: 16px;
    }
    html.dark {
      --bg: #0f172a;
      --sheet-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Cairo", "Segoe UI", Roboto, "Tahoma", sans-serif;
      font-size: var(--font-scale);
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 1.5rem 1rem 4rem;
      line-height: 1.8;
      -webkit-font-smoothing: antialiased;
      transition: background-color 0.2s, color 0.2s;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
    }
    .top-bar {
      background: var(--sheet-bg);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 1.25rem 1.75rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      position: sticky;
      top: 1rem;
      z-index: 50;
      backdrop-filter: blur(10px);
    }
    .doc-info h1 {
      margin: 0 0 0.25rem 0;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text);
    }
    .doc-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      font-size: 0.825rem;
      color: var(--text-muted);
    }
    .doc-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-action {
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.45rem 0.85rem;
      border-radius: 10px;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s ease;
      user-select: none;
    }
    .btn-action:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
    .article-sheet {
      background: var(--sheet-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 3rem 3rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.04);
      word-break: break-word;
    }
    h1, h2, h3, h4, h5, h6 {
      color: var(--text);
      font-weight: 700;
      line-height: 1.4;
      margin-top: 2rem;
      margin-bottom: 0.85rem;
    }
    h1 { font-size: 1.85rem; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; }
    h2 { font-size: 1.45rem; border-bottom: 1px solid var(--border); padding-bottom: 0.4rem; }
    h3 { font-size: 1.25rem; }
    p { margin: 0 0 1.25rem 0; }
    ul, ol { margin: 1rem 0 1.5rem 1.5rem; padding-inline-start: 1rem; }
    li { margin-bottom: 0.45rem; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.75rem 0;
      font-size: 0.9rem;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 0.75rem 1rem;
    }
    th {
      background: rgba(100, 116, 139, 0.06);
      font-weight: 700;
    }
    tr:nth-child(even) {
      background: rgba(100, 116, 139, 0.03);
    }
    blockquote {
      border-inline-start: 4px solid var(--primary);
      margin: 1.5rem 0;
      padding: 0.75rem 1.25rem;
      background: rgba(37, 99, 235, 0.04);
      border-radius: 0 8px 8px 0;
      font-style: italic;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 10px;
      margin: 1rem 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    pre, code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.875rem;
      background: rgba(100, 116, 139, 0.08);
      border-radius: 6px;
    }
    code { padding: 0.2rem 0.4rem; }
    pre { padding: 1rem; overflow-x: auto; }
    .toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #1e293b;
      color: #ffffff;
      padding: 0.65rem 1.25rem;
      border-radius: 30px;
      font-size: 0.85rem;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.25);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s;
      opacity: 0;
      pointer-events: none;
      z-index: 1000;
    }
    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    @media print {
      body { background: #ffffff !important; padding: 0 !important; color: #000000 !important; }
      .top-bar, .toast { display: none !important; }
      .article-sheet { border: none !important; box-shadow: none !important; padding: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="top-bar">
      <div class="doc-info">
        <h1>${escapeHtml(baseName)}</h1>
        <div class="doc-meta">
          <span>📝 ${wordsCount} ${isDocRtl ? 'كلمة' : 'Words'}</span>
          <span>⏱️ ${readMinutes} ${isDocRtl ? 'دقيقة قراءة' : 'min read'}</span>
          <span>✨ ${isDocRtl ? 'مستند ويب متجاوب' : 'Responsive Web Document'}</span>
        </div>
      </div>
      <div class="doc-actions">
        <button type="button" class="btn-action" onclick="toggleTheme()">🌓 ${isDocRtl ? 'المظهر' : 'Theme'}</button>
        <button type="button" class="btn-action" onclick="adjustZoom(-1)">A-</button>
        <button type="button" class="btn-action" onclick="adjustZoom(1)">A+</button>
        <button type="button" class="btn-action" onclick="copyDocumentText()">📋 ${isDocRtl ? 'نسخ النص' : 'Copy'}</button>
        <button type="button" class="btn-action" onclick="window.print()">🖨️ ${isDocRtl ? 'طباعة' : 'Print'}</button>
      </div>
    </header>

    <main class="article-sheet" id="article-sheet">
      ${bodyHtml}
    </main>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    function showToast(msg) {
      const toast = document.getElementById('toast');
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2200);
    }

    function toggleTheme() {
      document.documentElement.classList.toggle('dark');
      showToast(document.documentElement.classList.contains('dark') ? 'Dark Mode' : 'Light Mode');
    }

    let currentFontSize = 16;
    function adjustZoom(delta) {
      currentFontSize = Math.min(24, Math.max(13, currentFontSize + delta));
      document.documentElement.style.setProperty('--font-scale', currentFontSize + 'px');
      showToast('Font: ' + currentFontSize + 'px');
    }

    function copyDocumentText() {
      const sheet = document.getElementById('article-sheet');
      if (!sheet) return;
      navigator.clipboard.writeText(sheet.innerText || sheet.textContent).then(() => {
        showToast('${isDocRtl ? 'تم نسخ نصوص المستند بالكامل بنجاح!' : 'Document text copied!'}');
      });
    }
  </script>
</body>
</html>`;
}

/**
 * Generates an interactive presentation viewer for PowerPoint (PPTX) converted slides.
 */
export function generateRichPresentationHtml(
  slides: { slideIndex: number; title: string; texts: string[] }[],
  baseName: string
): string {
  const isDocRtl = isRtlString(baseName);

  const slidesHtml = slides
    .map(
      (s, idx) => `
    <section class="slide-card" id="slide-${idx + 1}">
      <header class="slide-card-header">
        <span class="slide-tag">🎯 ${isDocRtl ? `الشريحة ${s.slideIndex}` : `Slide ${s.slideIndex}`}</span>
      </header>
      <div class="slide-body">
        <h2 class="slide-title">${escapeHtml(s.title || (isDocRtl ? `شريحة ${s.slideIndex}` : `Slide ${s.slideIndex}`))}</h2>
        <ul class="slide-points">
          ${s.texts.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}
        </ul>
      </div>
    </section>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="${isDocRtl ? 'ar' : 'en'}" dir="${isDocRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(baseName)} - عرض الشرائح</title>
  <style>
    :root {
      --primary: #4f46e5;
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Cairo", "Segoe UI", Roboto, "Tahoma", sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 1.5rem 1rem 4rem;
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 900px;
      margin: 0 auto;
    }
    .top-bar {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 1.25rem 1.75rem;
      margin-bottom: 2rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      position: sticky;
      top: 1rem;
      z-index: 50;
      backdrop-filter: blur(10px);
    }
    .doc-info h1 {
      margin: 0 0 0.25rem 0;
      font-size: 1.35rem;
      font-weight: 700;
    }
    .doc-meta {
      font-size: 0.825rem;
      color: var(--text-muted);
    }
    .btn-action {
      background: rgba(255,255,255,0.06);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.45rem 0.85rem;
      border-radius: 10px;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s ease;
    }
    .btn-action:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
    .slide-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      margin-bottom: 2rem;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }
    .slide-card-header {
      padding: 0.85rem 1.5rem;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid var(--border);
    }
    .slide-tag {
      font-size: 0.825rem;
      font-weight: 700;
      color: #818cf8;
    }
    .slide-body {
      padding: 2.5rem 2.5rem;
    }
    .slide-title {
      font-size: 1.45rem;
      font-weight: 700;
      margin: 0 0 1.5rem 0;
      color: #ffffff;
      line-height: 1.4;
    }
    .slide-points {
      margin: 0;
      padding-inline-start: 1.5rem;
      color: #cbd5e1;
      font-size: 1.05rem;
      line-height: 2;
    }
    .slide-points li {
      margin-bottom: 0.65rem;
    }
    @media print {
      body { background: #ffffff !important; color: #000000 !important; padding: 0 !important; }
      .top-bar { display: none !important; }
      .slide-card { background: #ffffff !important; border: 1px solid #ccc !important; box-shadow: none !important; page-break-after: always; color: #000 !important; }
      .slide-title { color: #000 !important; }
      .slide-points { color: #333 !important; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <header class="top-bar">
      <div class="doc-info">
        <h1>${escapeHtml(baseName)}</h1>
        <div class="doc-meta">
          <span>🖥️ ${slides.length} ${isDocRtl ? 'شرائح عرض' : 'Slides'}</span>
        </div>
      </div>
      <div>
        <button type="button" class="btn-action" onclick="window.print()">🖨️ ${isDocRtl ? 'طباعة الشرائح' : 'Print Slides'}</button>
      </div>
    </header>

    <main>
      ${slidesHtml}
    </main>
  </div>
</body>
</html>`;
}
