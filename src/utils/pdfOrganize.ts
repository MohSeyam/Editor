import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { PageOrganizeItem } from '../types';

/**
 * Organizes a PDF by rotating pages and removing deleted pages.
 */
export async function processPdfOrganize(
  pdfData: Uint8Array,
  pages: PageOrganizeItem[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();

  const totalSrcPages = srcDoc.getPageCount();

  for (let i = 0; i < pages.length; i++) {
    const item = pages[i];
    if (item.deleted || item.pageIndex >= totalSrcPages) {
      continue;
    }

    const [copiedPage] = await newDoc.copyPages(srcDoc, [item.pageIndex]);

    // Apply rotation if any (cumulative with existing rotation)
    const currentRotation = copiedPage.getRotation().angle;
    const extraRotation = ((item.rotation % 360) + 360) % 360;
    copiedPage.setRotation(degrees((currentRotation + extraRotation) % 360));

    newDoc.addPage(copiedPage);
  }

  if (newDoc.getPageCount() === 0) {
    throw new Error('لا يمكن حفظ المستند بدون أي صفحات (تم حذف جميع الصفحات)');
  }

  return await newDoc.save({ useObjectStreams: true });
}

/**
 * High-performance real PDF compressor that genuinely reduces file size
 * by combining structural object stream optimization and deep raster downsampling.
 */
export async function compressPdfDocument(
  pdfData: Uint8Array,
  level: 'recommended' | 'extreme' | 'low',
  onProgress?: (percent: number, message: string) => void
): Promise<Uint8Array> {
  onProgress?.(10, 'تحليل بنية المستند وعناصر الوسائط...');

  // Stage 1: Fast structural purge (removes orphaned objects, cleans metadata, deflates object streams)
  let structuralBytes: Uint8Array | null = null;
  try {
    const srcDoc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();
    const cleanDoc = await PDFDocument.create();

    cleanDoc.setTitle('');
    cleanDoc.setAuthor('');
    cleanDoc.setSubject('');
    cleanDoc.setKeywords([]);
    cleanDoc.setProducer('المحرر');
    cleanDoc.setCreator('المحرر');

    const pageIndices = Array.from({ length: totalPages }, (_, i) => i);
    const copiedPages = await cleanDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((p) => cleanDoc.addPage(p));

    structuralBytes = await cleanDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50,
    });
  } catch (e) {
    console.warn('Structural purge error:', e);
  }

  // If low compression and structural optimization reduced size by > 12%, return it immediately
  if (level === 'low' && structuralBytes && structuralBytes.byteLength < pdfData.byteLength * 0.88) {
    onProgress?.(100, 'اكتمل الضغط الهيكلي الخفيف بنجاح!');
    return structuralBytes;
  }

  // Stage 2: Deep content & raster re-encoding via pdfjs-dist
  onProgress?.(25, 'بدء الضغط المتقدم وإعادة ترميز الصور والطبقات...');

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData.slice(0),
      useSystemFonts: true,
    });
    const doc = await loadingTask.promise;
    const numPages = doc.numPages;

    let renderScale = 1.45; // crisp 105-115 DPI
    let jpegQuality = 0.76;
    if (level === 'extreme') {
      renderScale = 1.15; // 80-90 DPI (standard screen clarity)
      jpegQuality = 0.58; // huge file reduction
    } else if (level === 'low') {
      renderScale = 1.85; // ~135 DPI
      jpegQuality = 0.85;
    }

    const compressedDoc = await PDFDocument.create();
    compressedDoc.setProducer('المحرر');
    compressedDoc.setCreator('المحرر');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    for (let p = 1; p <= numPages; p++) {
      const stepPct = Math.round(25 + (p / numPages) * 65);
      onProgress?.(stepPct, `ضغط وتحسين الصفحة (${p}/${numPages})...`);

      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: renderScale });

      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      await page.render({
        canvasContext: ctx!,
        viewport,
        canvas,
        background: 'white',
      } as any).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
      const base64Data = dataUrl.split(',')[1];
      const binaryString = atob(base64Data);
      const imgBytes = new Uint8Array(binaryString.length);
      for (let j = 0; j < binaryString.length; j++) {
        imgBytes[j] = binaryString.charCodeAt(j);
      }

      const embeddedImg = await compressedDoc.embedJpg(imgBytes);
      const origViewport = page.getViewport({ scale: 1.0 });
      const newPage = compressedDoc.addPage([origViewport.width, origViewport.height]);
      newPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: origViewport.width,
        height: origViewport.height,
      });
    }

    const rasterBytes = await compressedDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    onProgress?.(95, 'مقارنة الحجم واختيار النتيجة الأصغر حجماً...');

    // Evaluate candidates
    const candidates: Uint8Array[] = [rasterBytes];
    if (structuralBytes && structuralBytes.byteLength < pdfData.byteLength) {
      candidates.push(structuralBytes);
    }

    candidates.sort((a, b) => a.byteLength - b.byteLength);
    let chosen = candidates[0];

    // If still not smaller than original in extreme/recommended, do emergency low-scale pass
    if (chosen.byteLength >= pdfData.byteLength && level !== 'low') {
      const emergencyDoc = await PDFDocument.create();
      for (let p = 1; p <= numPages; p++) {
        const page = await doc.getPage(p);
        const viewport = page.getViewport({ scale: 0.95 });
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        await page.render({ canvasContext: ctx!, viewport, canvas } as any).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.48);
        const base64 = dataUrl.split(',')[1];
        const bin = atob(base64);
        const b = new Uint8Array(bin.length);
        for (let j = 0; j < bin.length; j++) b[j] = bin.charCodeAt(j);
        const img = await emergencyDoc.embedJpg(b);
        const origViewport = page.getViewport({ scale: 1.0 });
        const pg = emergencyDoc.addPage([origViewport.width, origViewport.height]);
        pg.drawImage(img, { x: 0, y: 0, width: origViewport.width, height: origViewport.height });
      }
      const emergencyBytes = await emergencyDoc.save({ useObjectStreams: true });
      if (emergencyBytes.byteLength < pdfData.byteLength) {
        chosen = emergencyBytes;
      }
    }

    onProgress?.(100, 'اكتمل تقليص حجم المستند بنجاح!');
    return chosen;
  } catch (err) {
    console.warn('Deep raster compression failed, falling back to structural:', err);
    if (structuralBytes && structuralBytes.byteLength < pdfData.byteLength) {
      return structuralBytes;
    }
    return structuralBytes || pdfData;
  }
}
