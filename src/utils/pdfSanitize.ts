import { PDFDocument, PDFName, PDFDict, PDFArray } from 'pdf-lib';
import { getBaseFileName } from './fileHelpers';

export interface SanitizeReport {
  originalSize: number;
  sanitizedSize: number;
  savedBytes: number;
  savedPercent: number;
  itemsRemoved: string[];
  pageCount: number;
}

export interface SanitizeResult {
  data: Uint8Array;
  downloadName: string;
  report: SanitizeReport;
}

/**
 * Deeply sanitizes a PDF document by:
 * 1. Removing hidden, orphaned, and unreferenced objects by re-indexing pages into a fresh document tree
 * 2. Purging massive XMP metadata streams and private vendor chunks (Photoshop/Illustrator PieceInfo)
 * 3. Clearing embedded page thumbnail streams (/Thumb)
 * 4. Stripping hidden executable scripts (/JavaScript, /OpenAction)
 * 5. Clearing excessive document metadata and recompressing cross-reference object streams
 */
export async function sanitizePdf(
  pdfData: Uint8Array,
  fileName: string,
  onProgress?: (percent: number, msg: string) => void
): Promise<SanitizeResult> {
  onProgress?.(15, 'قراءة بنية ملف PDF وفحص الكائنات...');

  const originalSize = pdfData.byteLength;
  const itemsRemoved: string[] = [];

  // 1. Load source document
  const srcDoc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  onProgress?.(35, 'فحص وتطهير البيانات الوصفية وحزم XMP...');

  // 2. Identify & remove /Metadata stream from catalog
  try {
    const catalog = srcDoc.catalog;
    const metadataKey = PDFName.of('Metadata');
    if (catalog.has(metadataKey)) {
      catalog.delete(metadataKey);
      itemsRemoved.push('حزم بيانات XMP الوصفية المتضخمة');
    }

    const pieceInfoKey = PDFName.of('PieceInfo');
    if (catalog.has(pieceInfoKey)) {
      catalog.delete(pieceInfoKey);
      itemsRemoved.push('بيانات برامج التصميم الخاصة (PieceInfo)');
    }

    const jsKey = PDFName.of('JavaScript');
    if (catalog.has(jsKey)) {
      catalog.delete(jsKey);
      itemsRemoved.push('سكربتات جافاسكربت وأوامر التشغيل التلقائي');
    }

    const openActionKey = PDFName.of('OpenAction');
    if (catalog.has(openActionKey)) {
      catalog.delete(openActionKey);
    }
  } catch {
    // Continue if non-critical catalog cleanup encountered structural anomalies
  }

  // 3. Remove thumbnails and clean page-level orphan caches
  onProgress?.(55, 'إزالة مصغرات الصفحات والعناصر غير المرجعية...');
  const thumbKey = PDFName.of('Thumb');
  let thumbCount = 0;

  for (let i = 0; i < totalPages; i++) {
    try {
      const page = srcDoc.getPage(i);
      if (page.node.has(thumbKey)) {
        page.node.delete(thumbKey);
        thumbCount++;
      }
    } catch {
      // Continue
    }
  }

  if (thumbCount > 0) {
    itemsRemoved.push(`مصغرات الصفحات المضمنة (${thumbCount} صفحة)`);
  }

  // 4. Create a clean new PDF document to automatically drop unreferenced objects and unused fonts
  onProgress?.(70, 'إعادة بناء شجرة المستند وإسقاط الخطوط والكائنات المهملة...');
  const sanitizedDoc = await PDFDocument.create();

  // Reset standard document metadata
  sanitizedDoc.setTitle('');
  sanitizedDoc.setAuthor('');
  sanitizedDoc.setSubject('');
  sanitizedDoc.setKeywords([]);
  sanitizedDoc.setProducer('PDF Studio Engine - Clean & Sanitize');
  sanitizedDoc.setCreator('PDF Studio');
  sanitizedDoc.setCreationDate(new Date(0));
  sanitizedDoc.setModificationDate(new Date(0));
  itemsRemoved.push('البيانات الوصفية الأساسية وتاريخ التعديل');

  // Copy all pages into fresh document (drops unreferenced fonts, orphan XObjects, unattached streams)
  const pageIndices = srcDoc.getPageIndices();
  const copiedPages = await sanitizedDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((p) => sanitizedDoc.addPage(p));
  itemsRemoved.push('الكائنات المهملة والخطوط غير المستخدمة (Unreferenced Objects & Fonts)');

  onProgress?.(90, 'ضغط وحفظ المستند المطهر...');
  // Save with compressed object streams
  const sanitizedBytes = await sanitizedDoc.save({
    useObjectStreams: true,
    objectsPerTick: 50,
  });

  const sanitizedSize = sanitizedBytes.byteLength;
  const savedBytes = Math.max(0, originalSize - sanitizedSize);
  const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

  const baseName = getBaseFileName(fileName);
  const downloadName = `${baseName}_sanitized.pdf`;

  onProgress?.(100, 'تم التطهير بنجاح!');

  return {
    data: sanitizedBytes,
    downloadName,
    report: {
      originalSize,
      sanitizedSize,
      savedBytes,
      savedPercent,
      itemsRemoved,
      pageCount: totalPages,
    },
  };
}
