import * as XLSX from 'xlsx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Converts OCR extracted text (especially table detections or structured data) into an Excel (.xlsx) file
 */
export function exportOcrToExcel(text: string, sheetTitle: string = 'OCR Table'): Blob {
  const lines = text.split(/\r?\n/);
  const rows: string[][] = [];
  let inMarkdownTable = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check if line is a markdown table row: | cell1 | cell2 |
    if (line.startsWith('|') && line.endsWith('|')) {
      inMarkdownTable = true;
      // Skip separator rows like |---|---|
      if (/^\|[-:\s|]+\|$/.test(line)) {
        continue;
      }
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      rows.push(cells);
    } else if (line.includes('\t')) {
      // Tab-separated table row
      const cells = line.split('\t').map((c) => c.trim());
      rows.push(cells);
    } else if (line.includes(',') && line.split(',').length >= 2 && !line.includes(' ')) {
      // CSV line
      const cells = line.split(',').map((c) => c.trim());
      rows.push(cells);
    } else {
      // Regular text line: if we were previously in a markdown table, separate with empty row
      if (inMarkdownTable) {
        rows.push([]);
        inMarkdownTable = false;
      }
      // If line has multiple parts separated by 2+ spaces or semicolons
      if (line.includes('  ')) {
        const cells = line.split(/\s{2,}/).map((c) => c.trim());
        rows.push(cells);
      } else {
        rows.push([line]);
      }
    }
  }

  // If no rows detected, put each line as a row
  if (rows.length === 0) {
    lines.forEach((l) => {
      if (l.trim()) rows.push([l.trim()]);
    });
  }

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths based on maximum content length
  const colWidths: { wch: number }[] = [];
  rows.forEach((r) => {
    r.forEach((c, colIdx) => {
      const len = (c || '').toString().length;
      colWidths[colIdx] = { wch: Math.max(colWidths[colIdx]?.wch || 12, Math.min(len + 3, 50)) };
    });
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, sheetTitle.substring(0, 31));
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Creates a Searchable PDF by embedding the original visual image/page
 * and injecting a hidden, selectable transparent text layer on top.
 */
export async function exportSearchablePdf(
  originalData: Uint8Array,
  targetPageNum: number,
  extractedText: string,
  isPdf: boolean
): Promise<Blob> {
  if (isPdf) {
    // Load existing PDF
    const pdfDoc = await PDFDocument.load(originalData, { ignoreEncryption: true });
    const pageIndex = Math.max(0, Math.min(targetPageNum - 1, pdfDoc.getPageCount() - 1));
    const page = pdfDoc.getPage(pageIndex);
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const lines = extractedText.split(/\r?\n/).filter((l) => l.trim().length > 0);

    const fontSize = 10;
    const lineHeight = 14;
    let currentY = height - 40;

    // Draw invisible text layer
    for (const rawLine of lines) {
      if (currentY < 30) break;
      // Sanitize text for standard font to avoid encoding crashes
      const safeText = rawLine.replace(/[^\x20-\x7E]/g, ' ');

      if (safeText.trim()) {
        try {
          page.drawText(safeText, {
            x: 40,
            y: currentY,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
            opacity: 0.001, // Invisible text layer: selectable and searchable via Ctrl+F / Find
          });
        } catch (e) {
          // If individual char fails, continue
        }
      }
      currentY -= lineHeight;
    }

    const modifiedPdfBytes = await pdfDoc.save();
    return new Blob([modifiedPdfBytes], { type: 'application/pdf' });
  } else {
    // Single image file -> create fresh PDF with image background and hidden text layer
    const pdfDoc = await PDFDocument.create();
    let embeddedImg;

    // Detect format or try embedding
    try {
      embeddedImg = await pdfDoc.embedJpg(originalData);
    } catch {
      try {
        embeddedImg = await pdfDoc.embedPng(originalData);
      } catch {
        // Fallback
      }
    }

    const imgWidth = embeddedImg ? embeddedImg.width : 595.28;
    const imgHeight = embeddedImg ? embeddedImg.height : 841.89;

    const page = pdfDoc.addPage([imgWidth, imgHeight]);

    // 1. Draw original visual image
    if (embeddedImg) {
      page.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: imgWidth,
        height: imgHeight,
      });
    }

    // 2. Inject transparent text layer
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const lines = extractedText.split(/\r?\n/).filter((l) => l.trim().length > 0);

    const fontSize = Math.max(10, Math.min(14, Math.floor(imgWidth / 50)));
    const lineHeight = fontSize * 1.4;
    let currentY = imgHeight - fontSize * 3;

    for (const rawLine of lines) {
      if (currentY < fontSize * 2) break;
      const safeText = rawLine.replace(/[^\x20-\x7E]/g, ' ');

      if (safeText.trim()) {
        try {
          page.drawText(safeText, {
            x: fontSize * 2,
            y: currentY,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
            opacity: 0.001, // Selectable & searchable
          });
        } catch {
          // Continue
        }
      }
      currentY -= lineHeight;
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }
}
