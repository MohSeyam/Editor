import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface TocItem {
  title: string;
  pdfBytes: Uint8Array;
}

export interface DynamicTocOptions {
  documentTitle: string;
  includePageNumbers: boolean;
  addHeaderFooter: boolean;
}

/**
 * Merges multiple documents and inserts a dynamic, professional Table of Contents (TOC) page
 */
export async function generateDynamicTocMerge(
  items: TocItem[],
  options: DynamicTocOptions,
  onProgress?: (pct: number, msg: string) => void
): Promise<Uint8Array> {
  onProgress?.(10, 'بدء الدمج الديناميكي وتهيئة فهرس المحتويات...');

  const mergedDoc = await PDFDocument.create();
  const fontHelvetica = await mergedDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await mergedDoc.embedFont(StandardFonts.HelveticaBold);

  // We will insert 1 TOC page at the beginning
  const tocPage = mergedDoc.addPage([595.28, 841.89]); // A4 Portrait
  const { width: tocWidth, height: tocHeight } = tocPage.getSize();

  // Draw TOC Header
  const titleText = options.documentTitle || 'جدول المحتويات / Table of Contents';
  tocPage.drawText(titleText, {
    x: 50,
    y: tocHeight - 70,
    size: 20,
    font: fontHelveticaBold,
    color: rgb(0.1, 0.2, 0.4),
  });

  // Divider line
  tocPage.drawLine({
    start: { x: 50, y: tocHeight - 85 },
    end: { x: tocWidth - 50, y: tocHeight - 85 },
    thickness: 1.5,
    color: rgb(0.2, 0.4, 0.8),
  });

  let currentPageCounter = 2; // Page 1 is the TOC itself
  const tocEntries: { title: string; page: number }[] = [];

  // Iterate and merge pages
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress?.(
      20 + Math.round(((i + 1) / items.length) * 50),
      `دمج المستند ${i + 1} من ${items.length}: ${item.title}...`
    );

    const docToMerge = await PDFDocument.load(item.pdfBytes, { ignoreEncryption: true });
    const copiedPages = await mergedDoc.copyPages(docToMerge, docToMerge.getPageIndices());

    tocEntries.push({
      title: item.title,
      page: currentPageCounter,
    });

    for (const page of copiedPages) {
      mergedDoc.addPage(page);
      currentPageCounter++;
    }
  }

  // Draw TOC Entries on Page 1
  let entryY = tocHeight - 120;
  for (let i = 0; i < tocEntries.length; i++) {
    const entry = tocEntries[i];
    if (entryY < 60) break; // prevent overflow

    // Section title
    const truncatedTitle = entry.title.length > 50 ? entry.title.substring(0, 47) + '...' : entry.title;
    tocPage.drawText(`${i + 1}.  ${truncatedTitle}`, {
      x: 50,
      y: entryY,
      size: 11,
      font: fontHelvetica,
      color: rgb(0.2, 0.2, 0.25),
    });

    // Page number text
    const pageNumStr = `صـ ${entry.page}`;
    tocPage.drawText(pageNumStr, {
      x: tocWidth - 90,
      y: entryY,
      size: 11,
      font: fontHelveticaBold,
      color: rgb(0.2, 0.4, 0.8),
    });

    // Dotted leader line
    tocPage.drawLine({
      start: { x: 260, y: entryY + 3 },
      end: { x: tocWidth - 100, y: entryY + 3 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
      dashArray: [2, 3],
    });

    entryY -= 28;
  }

  // Optional: unified headers and footers throughout the document
  if (options.addHeaderFooter) {
    onProgress?.(80, 'توحيد ترويسات وأرقام الصفحات...');
    const allPages = mergedDoc.getPages();
    const totalPages = allPages.length;

    for (let idx = 1; idx < totalPages; idx++) {
      const page = allPages[idx];
      const { width, height } = page.getSize();

      // Footer page number
      page.drawText(`${idx + 1} / ${totalPages}`, {
        x: width / 2 - 15,
        y: 20,
        size: 9,
        font: fontHelvetica,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Header document title
      page.drawText(titleText, {
        x: 40,
        y: height - 25,
        size: 8,
        font: fontHelvetica,
        color: rgb(0.6, 0.6, 0.6),
      });
    }
  }

  onProgress?.(95, 'تصدير المستند المدمج ذو الفهرس التفاعلي...');
  const finalBytes = await mergedDoc.save();
  onProgress?.(100, 'اكتمل الدمج وبناء الفهرس بنجاح!');

  return finalBytes;
}
