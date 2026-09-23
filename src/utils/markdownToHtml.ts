/**
 * High-performance, zero-dependency Markdown to HTML parser and document generator.
 * Fully supports GitHub Flavored Markdown (GFM), tables, code blocks, checklists,
 * auto-RTL Arabic detection, reading stats, and printable standalone HTML.
 */

import { ResultItem } from '../types';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function hasArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * Parses markdown inline formatting (bold, italic, links, images, code, strikethrough).
 */
function parseInlineMarkdown(text: string): string {
  // Images: ![alt](url)
  let out = text.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="md-img" loading="lazy" />');

  // Links: [text](url)
  out = out.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');

  // Inline code: `code`
  out = out.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // Bold & Italic: ***text*** or ___text___
  out = out.replace(/(\*\*\*|___)(.*?)\1/g, '<strong><em>$2</em></strong>');

  // Bold: **text** or __text__
  out = out.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

  // Italic: *text* or _text_
  out = out.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

  // Strikethrough: ~~text~~
  out = out.replace(/~~(.*?)~~/g, '<del>$1</del>');

  return out;
}

/**
 * Converts Markdown string into semantic HTML content.
 */
export function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';

  const lines = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const htmlParts: string[] = [];

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockContent: string[] = [];

  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  let inList: 'ul' | 'ol' | null = null;
  let inBlockquote = false;
  let blockquoteLines: string[] = [];

  const flushBlockquote = () => {
    if (inBlockquote && blockquoteLines.length > 0) {
      const bqText = blockquoteLines.join(' ');
      const rtl = hasArabic(bqText);
      htmlParts.push(
        `<blockquote class="md-blockquote" dir="${rtl ? 'rtl' : 'ltr'}">${parseInlineMarkdown(bqText)}</blockquote>`
      );
      blockquoteLines = [];
      inBlockquote = false;
    }
  };

  const flushList = () => {
    if (inList) {
      htmlParts.push(`</${inList}>`);
      inList = null;
    }
  };

  const flushTable = () => {
    if (inTable) {
      let tHtml = '<div class="md-table-wrap"><table class="md-table"><thead><tr>';
      tableHeaders.forEach((h) => {
        const rtl = hasArabic(h);
        tHtml += `<th dir="${rtl ? 'rtl' : 'ltr'}">${parseInlineMarkdown(h.trim())}</th>`;
      });
      tHtml += '</tr></thead><tbody>';
      tableRows.forEach((row) => {
        tHtml += '<tr>';
        row.forEach((cell, idx) => {
          const content = cell ? parseInlineMarkdown(cell.trim()) : '';
          const rtl = hasArabic(content);
          tHtml += `<td dir="${rtl ? 'rtl' : 'ltr'}">${content}</td>`;
        });
        tHtml += '</tr>';
      });
      tHtml += '</tbody></table></div>';
      htmlParts.push(tHtml);
      inTable = false;
      tableHeaders = [];
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Code block boundary
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        const codeText = escapeHtml(codeBlockContent.join('\n'));
        const blockId = `code-block-${Math.random().toString(36).substring(2, 8)}`;
        htmlParts.push(`
        <div class="md-code-block-frame">
          <div class="md-code-header">
            <span class="md-code-lang">${codeBlockLang || 'code'}</span>
            <button type="button" class="btn-copy-code" onclick="copyCode('${blockId}')">📋 نسخ الكود</button>
          </div>
          <pre><code id="${blockId}" class="md-code-text">${codeText}</code></pre>
        </div>`);
        inCodeBlock = false;
        codeBlockLang = '';
        codeBlockContent = [];
      } else {
        // Start code block
        flushList();
        flushTable();
        flushBlockquote();
        inCodeBlock = true;
        codeBlockLang = trimmed.replace(/^```/, '').trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(rawLine);
      continue;
    }

    // 2. Empty line resets paragraphs/lists/quotes
    if (!trimmed) {
      flushList();
      flushTable();
      flushBlockquote();
      continue;
    }

    // 3. Blockquotes
    if (trimmed.startsWith('>')) {
      flushList();
      flushTable();
      inBlockquote = true;
      blockquoteLines.push(trimmed.replace(/^>\s?/, ''));
      continue;
    } else if (inBlockquote) {
      flushBlockquote();
    }

    // 4. Horizontal Rule
    if (/^(?:---|\*\*\*|___)$/.test(trimmed)) {
      flushList();
      flushTable();
      flushBlockquote();
      htmlParts.push('<hr class="md-hr" />');
      continue;
    }

    // 5. Headings (# H1 to ###### H6)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      flushTable();
      flushBlockquote();
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      const rtl = hasArabic(headingText);
      const cleanInline = parseInlineMarkdown(headingText);
      htmlParts.push(
        `<h${level} class="md-heading md-h${level}" dir="${rtl ? 'rtl' : 'ltr'}">${cleanInline}</h${level}>`
      );
      continue;
    }

    // 6. Tables: | Header | Header |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      flushBlockquote();
      const rawCols = trimmed.slice(1, -1).split('|');

      // Check if it's the divider row |---|---|
      const isDivider = rawCols.every((c) => /^[\s:-]+$/.test(c.trim()));
      if (isDivider) {
        inTable = true;
        continue;
      }

      if (!inTable && tableHeaders.length === 0) {
        tableHeaders = rawCols;
        continue;
      }

      if (inTable || tableHeaders.length > 0) {
        tableRows.push(rawCols);
        inTable = true;
        continue;
      }
    } else if (inTable) {
      flushTable();
    }

    // 7. Checklists / Task lists: - [x] or - [ ]
    const taskMatch = trimmed.match(/^[-*+]\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      flushTable();
      flushBlockquote();
      if (inList !== 'ul') {
        flushList();
        inList = 'ul';
        htmlParts.push('<ul class="md-list md-task-list">');
      }
      const isChecked = taskMatch[1].toLowerCase() === 'x';
      const taskText = parseInlineMarkdown(taskMatch[2].trim());
      const rtl = hasArabic(taskText);
      htmlParts.push(
        `<li class="md-task-item ${isChecked ? 'completed' : ''}" dir="${rtl ? 'rtl' : 'ltr'}">
          <input type="checkbox" ${isChecked ? 'checked' : ''} disabled class="md-checkbox" />
          <span>${taskText}</span>
        </li>`
      );
      continue;
    }

    // 8. Unordered Lists: - item or * item or + item
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      flushTable();
      flushBlockquote();
      if (inList !== 'ul') {
        flushList();
        inList = 'ul';
        htmlParts.push('<ul class="md-list md-ul">');
      }
      const itemText = parseInlineMarkdown(ulMatch[1].trim());
      const rtl = hasArabic(itemText);
      htmlParts.push(`<li dir="${rtl ? 'rtl' : 'ltr'}">${itemText}</li>`);
      continue;
    }

    // 9. Ordered Lists: 1. item
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      flushTable();
      flushBlockquote();
      if (inList !== 'ol') {
        flushList();
        inList = 'ol';
        htmlParts.push('<ol class="md-list md-ol">');
      }
      const itemText = parseInlineMarkdown(olMatch[1].trim());
      const rtl = hasArabic(itemText);
      htmlParts.push(`<li dir="${rtl ? 'rtl' : 'ltr'}">${itemText}</li>`);
      continue;
    }

    // 10. Standard Paragraph
    flushList();
    flushTable();
    flushBlockquote();

    const pText = parseInlineMarkdown(trimmed);
    const rtl = hasArabic(pText);
    htmlParts.push(`<p class="md-p" dir="${rtl ? 'rtl' : 'ltr'}">${pText}</p>`);
  }

  flushList();
  flushTable();
  flushBlockquote();

  return htmlParts.join('\n');
}

/**
 * Wraps parsed markdown HTML into a standalone, styled HTML document with controls.
 */
export function generateMarkdownHtmlDocument(markdown: string, baseName: string): string {
  const contentHtml = parseMarkdownToHtml(markdown);
  const wordsCount = markdown.trim().split(/\s+/).filter(Boolean).length;
  const charsCount = markdown.length;
  const readMinutes = Math.max(1, Math.ceil(wordsCount / 200));

  const isDocRtl = hasArabic(markdown.slice(0, 1000));

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
      --card: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --code-bg: #1e293b;
      --code-text: #f8fafc;
      --radius: 14px;
    }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Cairo", "Segoe UI", Roboto, "Tahoma", sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 2.5rem 1rem;
      line-height: 1.8;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 860px;
      margin: 0 auto;
    }
    .header-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.75rem 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1.25rem;
    }
    .doc-meta h1 {
      margin: 0 0 0.4rem 0;
      font-size: 1.5rem;
      color: var(--text);
    }
    .doc-meta .meta-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      font-size: 0.825rem;
      color: var(--text-muted);
    }
    .meta-tag {
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .actions-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn {
      background: #f8fafc;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.55rem 1rem;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s ease;
    }
    .btn:hover {
      background: #e2e8f0;
      border-color: #cbd5e1;
    }
    .search-input {
      width: 100%;
      margin-top: 1rem;
      padding: 0.65rem 1rem;
      border-radius: 10px;
      border: 1px solid var(--border);
      font-size: 0.875rem;
      background: #f8fafc;
      outline: none;
      box-sizing: border-box;
    }
    .search-input:focus {
      border-color: var(--primary);
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }
    .article-sheet {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 3rem 2.5rem;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.04), 0 4px 6px -4px rgba(0,0,0,0.04);
    }
    .md-h1 { font-size: 2rem; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; margin-top: 2rem; }
    .md-h2 { font-size: 1.55rem; border-bottom: 1px solid var(--border); padding-bottom: 0.4rem; margin-top: 1.75rem; }
    .md-h3 { font-size: 1.3rem; margin-top: 1.5rem; }
    .md-h4 { font-size: 1.15rem; margin-top: 1.25rem; }
    .md-h5 { font-size: 1rem; margin-top: 1rem; }
    .md-h6 { font-size: 0.9rem; color: var(--text-muted); margin-top: 0.75rem; }
    .md-p { margin: 1rem 0; font-size: 1rem; line-height: 1.8; }
    .md-inline-code {
      background: #f1f5f9;
      color: #b91c1c;
      padding: 2px 6px;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.875em;
      border: 1px solid #e2e8f0;
    }
    .md-code-block-frame {
      background: var(--code-bg);
      border-radius: 12px;
      overflow: hidden;
      margin: 1.5rem 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      border: 1px solid #334155;
    }
    .md-code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #0f172a;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid #334155;
    }
    .md-code-lang {
      font-size: 0.75rem;
      font-family: monospace;
      color: #94a3b8;
      text-transform: uppercase;
    }
    .btn-copy-code {
      background: #1e293b;
      border: 1px solid #475569;
      color: #cbd5e1;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      cursor: pointer;
    }
    .btn-copy-code:hover {
      background: #334155;
      color: #ffffff;
    }
    .md-code-text {
      display: block;
      padding: 1.25rem;
      margin: 0;
      color: var(--code-text);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.9rem;
      line-height: 1.6;
      overflow-x: auto;
      white-space: pre;
    }
    .md-table-wrap {
      overflow-x: auto;
      margin: 1.5rem 0;
      border-radius: 10px;
      border: 1px solid var(--border);
    }
    .md-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
      text-align: inherit;
    }
    .md-table th {
      background: #f1f5f9;
      font-weight: 700;
      padding: 0.75rem 1rem;
      border-bottom: 2px solid var(--border);
      border-inline-end: 1px solid var(--border);
    }
    .md-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      border-inline-end: 1px solid var(--border);
    }
    .md-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .md-blockquote {
      border-inline-start: 4px solid var(--primary);
      margin: 1.5rem 0;
      padding: 0.75rem 1.25rem;
      background: #f8fafc;
      border-radius: 0 8px 8px 0;
      color: #334155;
      font-style: italic;
    }
    .md-list {
      margin: 1rem 0;
      padding-inline-start: 1.75rem;
    }
    .md-list li {
      margin-bottom: 0.4rem;
    }
    .md-task-list {
      list-style: none;
      padding-inline-start: 0.5rem;
    }
    .md-task-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.4rem;
    }
    .md-task-item.completed span {
      text-decoration: line-through;
      color: var(--text-muted);
    }
    .md-checkbox {
      width: 16px;
      height: 16px;
      accent-color: var(--primary);
    }
    .md-hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 2.5rem 0;
    }
    .md-img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 1rem 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .md-link {
      color: var(--primary);
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .footer {
      text-align: center;
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 3rem;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .header-card, .footer, .btn-copy-code { display: none !important; }
      .article-sheet { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <header class="header-card">
      <div class="doc-meta">
        <h1>${escapeHtml(baseName)}</h1>
        <div class="meta-stats">
          <span class="meta-tag">📄 ${wordsCount} كلمة</span>
          <span class="meta-tag">🔤 ${charsCount} حرف</span>
          <span class="meta-tag">⏱️ ${readMinutes} دقيقة قراءة</span>
        </div>
      </div>
      <div class="actions-bar">
        <button type="button" class="btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
        <button type="button" class="btn" onclick="copyRawText()">📑 نسخ النص</button>
      </div>
      <input type="text" class="search-input" placeholder="بحث داخل المستند..." oninput="searchInDoc(this.value)" />
    </header>

    <main class="article-sheet" id="document-content">
      ${contentHtml}
    </main>

    <footer class="footer">
      تم التصدير محلياً بنجاح عبر محرر المستندات السريع • خصوصية وأمان تام 100%
    </footer>
  </div>

  <script>
    function copyCode(id) {
      const el = document.getElementById(id);
      if (!el) return;
      navigator.clipboard.writeText(el.innerText || el.textContent).then(() => {
        alert('تم نسخ الكود البرمجي!');
      });
    }

    function copyRawText() {
      const content = document.getElementById('document-content');
      if (!content) return;
      navigator.clipboard.writeText(content.innerText || content.textContent).then(() => {
        alert('تم نسخ نص المستند بنجاح!');
      });
    }

    function searchInDoc(q) {
      const query = (q || '').toLowerCase().trim();
      const elements = document.querySelectorAll('#document-content > *');
      elements.forEach((el) => {
        if (!query) {
          el.style.display = '';
          return;
        }
        const text = (el.innerText || el.textContent).toLowerCase();
        el.style.display = text.includes(query) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;
}

/**
 * High-level execution for Markdown to HTML.
 */
export function executeMarkdownToHtml(markdown: string, baseName: string): ResultItem {
  const htmlDoc = generateMarkdownHtmlDocument(markdown, baseName);
  const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
  const downloadName = `${baseName}.html`;

  return {
    name: downloadName,
    downloadName,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    type: 'text/html',
    previewText: markdown.slice(0, 1200),
  };
}
