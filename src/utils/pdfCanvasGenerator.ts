import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';

/**
 * Checks if a string contains Arabic or Right-to-Left script
 */
export function isRtlString(str: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str);
}

/**
 * Helper to convert canvas to PNG byte array
 */
function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Canvas to blob failed'));
        return;
      }
      const buffer = await blob.arrayBuffer();
      resolve(new Uint8Array(buffer));
    }, 'image/png');
  });
}

/**
 * Renders raw text / Word content into a multi-page PDF supporting full Arabic, English, and Unicode
 * Eliminates WinAnsi encoding errors completely.
 */
export async function renderTextToPdfPages(text: string, title: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // A4 dimensions in PDF points (portrait)
  const pdfWidth = 595.28;
  const pdfHeight = 841.89;

  // 2x high-resolution canvas for crisp printing & viewing
  const scale = 2;
  const canvasWidth = pdfWidth * scale;
  const canvasHeight = pdfHeight * scale;

  const margin = 45 * scale;
  const usableWidth = canvasWidth - margin * 2;
  const lineHeight = 24 * scale;
  const fontSize = 13 * scale;
  const titleFontSize = 18 * scale;

  const isRtl = isRtlString(text) || isRtlString(title);

  // Clean lines
  const rawLines = text.split(/\r?\n/);
  const wrappedLines: string[] = [];

  // Temporary canvas to measure text wrapping accurately
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d')!;
  mCtx.font = `${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", "Tahoma", sans-serif`;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      wrappedLines.push('');
      continue;
    }

    const words = trimmed.split(' ');
    let curLine = '';

    for (const word of words) {
      const candidate = curLine ? `${curLine} ${word}` : word;
      const width = mCtx.measureText(candidate).width;
      if (width > usableWidth) {
        if (curLine) wrappedLines.push(curLine);
        curLine = word;
      } else {
        curLine = candidate;
      }
    }
    if (curLine) {
      wrappedLines.push(curLine);
    }
  }

  // Calculate lines per page
  const headerHeight = 75 * scale;
  const usableHeightFirstPage = canvasHeight - margin * 2 - headerHeight;
  const usableHeightSubsequent = canvasHeight - margin * 2;

  const maxLinesFirst = Math.floor(usableHeightFirstPage / lineHeight);
  const maxLinesOther = Math.floor(usableHeightSubsequent / lineHeight);

  let currentLineIndex = 0;
  let pageNumber = 1;
  const totalPages = Math.max(
    1,
    1 + Math.ceil(Math.max(0, wrappedLines.length - maxLinesFirst) / maxLinesOther)
  );

  while (currentLineIndex < wrappedLines.length || pageNumber === 1) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const isFirstPage = pageNumber === 1;
    let y = margin;

    // Header on first page
    if (isFirstPage) {
      ctx.direction = isRtl ? 'rtl' : 'ltr';
      ctx.textAlign = isRtl ? 'right' : 'left';
      const titleX = isRtl ? canvasWidth - margin : margin;

      ctx.fillStyle = '#1e3a8a';
      ctx.font = `bold ${titleFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", "Tahoma", sans-serif`;
      ctx.fillText(title, titleX, y + titleFontSize);

      // Subtle divider
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      ctx.moveTo(margin, y + headerHeight - 12 * scale);
      ctx.lineTo(canvasWidth - margin, y + headerHeight - 12 * scale);
      ctx.stroke();

      y += headerHeight;
    }

    // Body text
    ctx.direction = isRtl ? 'rtl' : 'ltr';
    ctx.textAlign = isRtl ? 'right' : 'left';
    ctx.fillStyle = '#1e293b';
    ctx.font = `${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", "Tahoma", sans-serif`;

    const textX = isRtl ? canvasWidth - margin : margin;
    const linesThisPage = isFirstPage ? maxLinesFirst : maxLinesOther;
    const endLineIndex = Math.min(wrappedLines.length, currentLineIndex + linesThisPage);

    for (let i = currentLineIndex; i < endLineIndex; i++) {
      const line = wrappedLines[i];
      if (line) {
        ctx.fillText(line, textX, y + fontSize);
      }
      y += lineHeight;
    }
    currentLineIndex = endLineIndex;

    // Page footer
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${10 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(`${pageNumber} / ${totalPages}`, canvasWidth / 2, canvasHeight - margin / 2);

    // Convert canvas to PNG and embed in PDF
    const pngBytes = await canvasToPngBytes(canvas);
    const pngImage = await pdfDoc.embedPng(pngBytes);
    const pdfPage = pdfDoc.addPage([pdfWidth, pdfHeight]);
    pdfPage.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: pdfWidth,
      height: pdfHeight,
    });

    pageNumber++;
    if (currentLineIndex >= wrappedLines.length) break;
  }

  return await pdfDoc.save();
}

/**
 * Renders an Excel or CSV spreadsheet into landscape PDF pages using Canvas
 * Supporting full Arabic, numbers, and gridlines cleanly.
 */
export async function renderSpreadsheetToPdfPages(worksheet: XLSX.WorkSheet, title: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // A4 Landscape dimensions
  const pdfWidth = 841.89;
  const pdfHeight = 595.28;

  const scale = 2;
  const canvasWidth = pdfWidth * scale;
  const canvasHeight = pdfHeight * scale;

  const margin = 40 * scale;
  const usableWidth = canvasWidth - margin * 2;
  const rowHeight = 28 * scale;
  const fontSize = 11 * scale;
  const headerFontSize = 12 * scale;

  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  const isRtl = isRtlString(title) || rows.slice(0, 5).some((r) => Array.isArray(r) && r.some((c) => isRtlString(String(c))));

  if (!rows || rows.length === 0) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#64748b';
    ctx.font = `${14 * scale}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('جدول بيانات فارغ / Empty Sheet', canvasWidth / 2, canvasHeight / 2);

    const pngBytes = await canvasToPngBytes(canvas);
    const img = await pdfDoc.embedPng(pngBytes);
    const page = pdfDoc.addPage([pdfWidth, pdfHeight]);
    page.drawImage(img, { x: 0, y: 0, width: pdfWidth, height: pdfHeight });
    return await pdfDoc.save();
  }

  // Max columns capped at 10 for clean layout
  const maxCols = Math.min(Math.max(...rows.map((r) => (Array.isArray(r) ? r.length : 0))), 10);
  const colWidth = usableWidth / Math.max(maxCols, 1);

  const headerHeight = 60 * scale;
  const usableRowsHeight = canvasHeight - margin * 2 - headerHeight;
  const rowsPerPage = Math.floor(usableRowsHeight / rowHeight);

  let currentRowIdx = 0;
  let pageNumber = 1;
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));

  while (currentRowIdx < rows.length || pageNumber === 1) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    let y = margin;

    // Title banner
    ctx.direction = isRtl ? 'rtl' : 'ltr';
    ctx.textAlign = isRtl ? 'right' : 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${16 * scale}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", "Tahoma", sans-serif`;
    ctx.fillText(title, isRtl ? canvasWidth - margin : margin, y + 16 * scale);

    y += headerHeight;

    const endRowIdx = Math.min(rows.length, currentRowIdx + rowsPerPage);

    for (let rIdx = currentRowIdx; rIdx < endRowIdx; rIdx++) {
      const row = rows[rIdx];
      const isHeader = rIdx === 0;

      // Row background
      if (isHeader) {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(margin, y, usableWidth, rowHeight);
      } else if (rIdx % 2 === 0) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(margin, y, usableWidth, rowHeight);
      }

      // Row border bottom
      ctx.strokeStyle = isHeader ? '#cbd5e1' : '#e2e8f0';
      ctx.lineWidth = isHeader ? 1.5 * scale : 1 * scale;
      ctx.beginPath();
      ctx.moveTo(margin, y + rowHeight);
      ctx.lineTo(margin + usableWidth, y + rowHeight);
      ctx.stroke();

      // Cells
      for (let c = 0; c < maxCols; c++) {
        const cellVal = String((Array.isArray(row) ? row[c] : '') ?? '').trim();
        if (!cellVal) continue;

        const cellX = isRtl
          ? margin + usableWidth - (c + 1) * colWidth + 8 * scale
          : margin + c * colWidth + 8 * scale;

        ctx.direction = isRtl ? 'rtl' : 'ltr';
        ctx.textAlign = isRtl ? 'right' : 'left';
        ctx.fillStyle = isHeader ? '#0f172a' : '#334155';
        ctx.font = isHeader
          ? `bold ${headerFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", "Tahoma", sans-serif`
          : `${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", "Tahoma", sans-serif`;

        const truncated = cellVal.length > 30 ? cellVal.slice(0, 28) + '...' : cellVal;
        ctx.fillText(truncated, cellX, y + rowHeight * 0.65);
      }

      y += rowHeight;
    }
    currentRowIdx = endRowIdx;

    // Footer
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${10 * scale}px system-ui, sans-serif`;
    ctx.fillText(`${pageNumber} / ${totalPages}`, canvasWidth / 2, canvasHeight - margin / 2);

    const pngBytes = await canvasToPngBytes(canvas);
    const pngImage = await pdfDoc.embedPng(pngBytes);
    const pdfPage = pdfDoc.addPage([pdfWidth, pdfHeight]);
    pdfPage.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: pdfWidth,
      height: pdfHeight,
    });

    pageNumber++;
    if (currentRowIdx >= rows.length) break;
  }

  return await pdfDoc.save();
}

/**
 * Renders PowerPoint slides into landscape presentation PDF pages
 * Full Arabic, English, and Unicode support via Canvas.
 */
export async function renderPptxSlidesToPdfPages(
  slides: { slideIndex: number; title: string; texts: string[] }[],
  presentationTitle: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const pdfWidth = 841.89;
  const pdfHeight = 595.28;

  const scale = 2;
  const canvasWidth = pdfWidth * scale;
  const canvasHeight = pdfHeight * scale;
  const margin = 50 * scale;

  for (const slide of slides) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Top banner
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, canvasWidth, 55 * scale);

    const isRtl = isRtlString(slide.title) || slide.texts.some(isRtlString) || isRtlString(presentationTitle);

    // Banner Text
    ctx.direction = isRtl ? 'rtl' : 'ltr';
    ctx.textAlign = isRtl ? 'right' : 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${14 * scale}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", "Tahoma", sans-serif`;
    const bannerX = isRtl ? canvasWidth - margin : margin;
    ctx.fillText(`${presentationTitle} — ${slide.slideIndex}`, bannerX, 35 * scale);

    // Slide Title
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${22 * scale}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", "Tahoma", sans-serif`;
    ctx.fillText(slide.title, bannerX, 115 * scale);

    // Slide Bullets
    let bulletY = 160 * scale;
    ctx.fillStyle = '#334155';
    ctx.font = `${14 * scale}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", "Tahoma", sans-serif`;

    for (const text of slide.texts) {
      if (bulletY > canvasHeight - margin) break;
      const bulletSymbol = isRtl ? '• ' : '• ';
      ctx.fillText(`${bulletSymbol}${text}`, bannerX, bulletY);
      bulletY += 32 * scale;
    }

    const pngBytes = await canvasToPngBytes(canvas);
    const pngImage = await pdfDoc.embedPng(pngBytes);
    const pdfPage = pdfDoc.addPage([pdfWidth, pdfHeight]);
    pdfPage.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: pdfWidth,
      height: pdfHeight,
    });
  }

  return await pdfDoc.save();
}
