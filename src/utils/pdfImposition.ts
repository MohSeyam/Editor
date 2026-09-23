import { PDFDocument, rgb } from 'pdf-lib';

export type ImpositionMode = 'booklet' | '2up' | '4up';
export type ReadingOrder = 'rtl' | 'ltr';
export type MarginOption = 'none' | 'compact' | 'standard';

export interface ImpositionOptions {
  mode: ImpositionMode;
  readingOrder: ReadingOrder;
  cropMarks: boolean;
  margin: MarginOption;
  outputPageSize?: 'A4' | 'Letter';
}

/**
 * Imposition Engine for Booklets & N-Up Sheet Assembly
 */
export async function processImposition(
  srcPdfBytes: Uint8Array,
  options: ImpositionOptions,
  onProgress?: (pct: number, msg: string) => void
): Promise<Uint8Array> {
  onProgress?.(10, 'جاري قراءة صفحات المستند الأصلي...');

  const srcDoc = await PDFDocument.load(srcPdfBytes);
  const outDoc = await PDFDocument.create();

  const numSrcPages = srcDoc.getPageCount();
  if (numSrcPages === 0) {
    throw new Error('المستند فارغ ولا يحتوي على صفحات');
  }

  // Margin in points (72pt = 1 inch)
  const marginPts = options.margin === 'none' ? 0 : options.margin === 'compact' ? 14 : 28;

  // Standard sheet dimensions (A4 Landscape: 841.89 x 595.28 pt)
  const sheetWidth = 841.89;
  const sheetHeight = 595.28;

  // Helper to draw crop marks
  const drawCropMarks = (page: any, x: number, y: number, w: number, h: number) => {
    if (!options.cropMarks) return;
    const markLen = 10;
    const markColor = rgb(0.5, 0.5, 0.5);

    // Top-left
    page.drawLine({ start: { x: x - markLen, y: y + h }, end: { x: x, y: y + h }, color: markColor, thickness: 0.5 });
    page.drawLine({ start: { x: x, y: y + h }, end: { x: x, y: y + h + markLen }, color: markColor, thickness: 0.5 });

    // Top-right
    page.drawLine({ start: { x: x + w, y: y + h }, end: { x: x + w + markLen, y: y + h }, color: markColor, thickness: 0.5 });
    page.drawLine({ start: { x: x + w, y: y + h }, end: { x: x + w, y: y + h + markLen }, color: markColor, thickness: 0.5 });

    // Bottom-left
    page.drawLine({ start: { x: x - markLen, y: y }, end: { x: x, y: y }, color: markColor, thickness: 0.5 });
    page.drawLine({ start: { x: x, y: y }, end: { x: x, y: y - markLen }, color: markColor, thickness: 0.5 });

    // Bottom-right
    page.drawLine({ start: { x: x + w, y: y }, end: { x: x + w + markLen, y: y }, color: markColor, thickness: 0.5 });
    page.drawLine({ start: { x: x + w, y: y }, end: { x: x + w, y: y - markLen }, color: markColor, thickness: 0.5 });
  };

  if (options.mode === 'booklet') {
    onProgress?.(30, 'حساب أزواج طي الكتيب (Saddle-Stitch)...');

    // Total pages must be a multiple of 4 for folded saddle-stitch booklet
    const totalBookletPages = Math.ceil(numSrcPages / 4) * 4;

    // Embed all source pages into outDoc
    const embeddedSrcPages = await outDoc.embedPages(srcDoc.getPages());

    // Pairings calculation
    // E.g., for 8 pages:
    // Sheet 1 Front: [8, 1], Sheet 1 Back: [2, 7]
    // Sheet 2 Front: [6, 3], Sheet 2 Back: [4, 5]
    let low = 0;
    let high = totalBookletPages - 1;
    let isFront = true;
    let currentSheetIndex = 0;
    const totalSheets = totalBookletPages / 2;

    while (low < high) {
      onProgress?.(
        35 + Math.round((currentSheetIndex / totalSheets) * 55),
        `فرز الصفحة الورقية ${currentSheetIndex + 1} من ${totalSheets}...`
      );

      const sheet = outDoc.addPage([sheetWidth, sheetHeight]);
      const halfWidth = (sheetWidth - marginPts * 3) / 2;
      const targetHeight = sheetHeight - marginPts * 2;

      let leftPageIndex: number;
      let rightPageIndex: number;

      if (isFront) {
        // Front side of sheet
        leftPageIndex = options.readingOrder === 'rtl' ? low : high;
        rightPageIndex = options.readingOrder === 'rtl' ? high : low;
      } else {
        // Back side of sheet
        leftPageIndex = options.readingOrder === 'rtl' ? high : low;
        rightPageIndex = options.readingOrder === 'rtl' ? low : high;
      }

      // Draw Left Page
      if (leftPageIndex < numSrcPages) {
        const embeddedPage = embeddedSrcPages[leftPageIndex];
        const scale = Math.min(halfWidth / embeddedPage.width, targetHeight / embeddedPage.height);
        const drawW = embeddedPage.width * scale;
        const drawH = embeddedPage.height * scale;
        const posX = marginPts + (halfWidth - drawW) / 2;
        const posY = marginPts + (targetHeight - drawH) / 2;

        sheet.drawPage(embeddedPage, { x: posX, y: posY, width: drawW, height: drawH });
        drawCropMarks(sheet, posX, posY, drawW, drawH);
      }

      // Draw Right Page
      if (rightPageIndex < numSrcPages) {
        const embeddedPage = embeddedSrcPages[rightPageIndex];
        const scale = Math.min(halfWidth / embeddedPage.width, targetHeight / embeddedPage.height);
        const drawW = embeddedPage.width * scale;
        const drawH = embeddedPage.height * scale;
        const posX = marginPts * 2 + halfWidth + (halfWidth - drawW) / 2;
        const posY = marginPts + (targetHeight - drawH) / 2;

        sheet.drawPage(embeddedPage, { x: posX, y: posY, width: drawW, height: drawH });
        drawCropMarks(sheet, posX, posY, drawW, drawH);
      }

      // Draw center fold line marker
      if (options.cropMarks) {
        const centerX = sheetWidth / 2;
        sheet.drawLine({
          start: { x: centerX, y: sheetHeight - 8 },
          end: { x: centerX, y: sheetHeight },
          color: rgb(0.6, 0.6, 0.6),
          thickness: 0.5,
        });
        sheet.drawLine({
          start: { x: centerX, y: 0 },
          end: { x: centerX, y: 8 },
          color: rgb(0.6, 0.6, 0.6),
          thickness: 0.5,
        });
      }

      if (isFront) {
        low++;
        high--;
        isFront = false;
      } else {
        low++;
        high--;
        isFront = true;
      }
      currentSheetIndex++;
    }

  } else if (options.mode === '2up') {
    onProgress?.(30, 'تجميع صفحتين في كل ورقة (2-Up)...');
    const embeddedSrcPages = await outDoc.embedPages(srcDoc.getPages());
    const totalPairs = Math.ceil(numSrcPages / 2);

    for (let i = 0; i < numSrcPages; i += 2) {
      onProgress?.(35 + Math.round((i / numSrcPages) * 55), `معالجة الورقة ${Math.floor(i / 2) + 1} من ${totalPairs}...`);

      const sheet = outDoc.addPage([sheetWidth, sheetHeight]);
      const halfWidth = (sheetWidth - marginPts * 3) / 2;
      const targetHeight = sheetHeight - marginPts * 2;

      const p1 = options.readingOrder === 'rtl' ? i + 1 : i;
      const p2 = options.readingOrder === 'rtl' ? i : i + 1;

      if (p1 < numSrcPages) {
        const embedded = embeddedSrcPages[p1];
        const scale = Math.min(halfWidth / embedded.width, targetHeight / embedded.height);
        const dw = embedded.width * scale;
        const dh = embedded.height * scale;
        const px = marginPts + (halfWidth - dw) / 2;
        const py = marginPts + (targetHeight - dh) / 2;
        sheet.drawPage(embedded, { x: px, y: py, width: dw, height: dh });
        drawCropMarks(sheet, px, py, dw, dh);
      }

      if (p2 < numSrcPages) {
        const embedded = embeddedSrcPages[p2];
        const scale = Math.min(halfWidth / embedded.width, targetHeight / embedded.height);
        const dw = embedded.width * scale;
        const dh = embedded.height * scale;
        const px = marginPts * 2 + halfWidth + (halfWidth - dw) / 2;
        const py = marginPts + (targetHeight - dh) / 2;
        sheet.drawPage(embedded, { x: px, y: py, width: dw, height: dh });
        drawCropMarks(sheet, px, py, dw, dh);
      }
    }

  } else if (options.mode === '4up') {
    onProgress?.(30, 'تجميع 4 صفحات في كل ورقة (4-Up)...');
    const embeddedSrcPages = await outDoc.embedPages(srcDoc.getPages());
    const totalSheets = Math.ceil(numSrcPages / 4);

    for (let i = 0; i < numSrcPages; i += 4) {
      onProgress?.(35 + Math.round((i / numSrcPages) * 55), `معالجة الورقة ${Math.floor(i / 4) + 1} من ${totalSheets}...`);

      const sheet = outDoc.addPage([sheetWidth, sheetHeight]);
      const halfW = (sheetWidth - marginPts * 3) / 2;
      const halfH = (sheetHeight - marginPts * 3) / 2;

      // Positions: [top-left, top-right, bottom-left, bottom-right]
      const coords = [
        { x: marginPts, y: marginPts * 2 + halfH },
        { x: marginPts * 2 + halfW, y: marginPts * 2 + halfH },
        { x: marginPts, y: marginPts },
        { x: marginPts * 2 + halfW, y: marginPts },
      ];

      for (let slot = 0; slot < 4; slot++) {
        const pageIdx = i + slot;
        if (pageIdx < numSrcPages) {
          const embedded = embeddedSrcPages[pageIdx];
          const scale = Math.min(halfW / embedded.width, halfH / embedded.height);
          const dw = embedded.width * scale;
          const dh = embedded.height * scale;
          const px = coords[slot].x + (halfW - dw) / 2;
          const py = coords[slot].y + (halfH - dh) / 2;
          sheet.drawPage(embedded, { x: px, y: py, width: dw, height: dh });
          drawCropMarks(sheet, px, py, dw, dh);
        }
      }
    }
  }

  onProgress?.(95, 'تصدير وحفظ المستند المفرز للطباعة...');
  const outBytes = await outDoc.save();
  onProgress?.(100, 'اكتمل التجميد والفرز بنجاح!');

  return outBytes;
}
