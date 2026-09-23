import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { SplitRange } from '../types';
import { decodeImageToCanvas } from './imageFormatUtils';

export async function mergePdfsAndImages(
  items: Array<{ name: string; data: Uint8Array; extension: string }>,
  onProgress?: (percent: number, msg: string) => void
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  const total = items.length;

  for (let i = 0; i < total; i++) {
    const item = items[i];
    const ext = item.extension.toLowerCase();
    onProgress?.(Math.round(((i + 0.1) / total) * 100), `جارٍ معالجة ${item.name}...`);

    if (ext === 'pdf') {
      try {
        const srcPdf = await PDFDocument.load(item.data, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      } catch (err) {
        console.error('Error loading PDF item during merge:', item.name, err);
        throw new Error(`تعذر قراءة ملف الـ PDF: ${item.name}`);
      }
    } else if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'bmp', 'svg', 'tiff', 'tif'].includes(ext)) {
      try {
        let image;
        if (ext === 'png') {
          try {
            image = await mergedPdf.embedPng(item.data);
          } catch {
            // fallback via canvas
          }
        } else if (ext === 'jpg' || ext === 'jpeg') {
          try {
            image = await mergedPdf.embedJpg(item.data);
          } catch {
            // fallback via canvas
          }
        }

        if (!image) {
          const canvas = await decodeImageToCanvas(item.data, ext);
          const jpegBlob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.95));
          const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
          image = await mergedPdf.embedJpg(jpegBytes);
        }

        // Standard A4 size in points: 595.28 x 841.89
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const page = mergedPdf.addPage([pageWidth, pageHeight]);

        // Fit image within margins (30pt)
        const margin = 30;
        const maxW = pageWidth - margin * 2;
        const maxH = pageHeight - margin * 2;
        const scale = Math.min(maxW / image.width, maxH / image.height, 1);
        const imgW = image.width * scale;
        const imgH = image.height * scale;
        const x = (pageWidth - imgW) / 2;
        const y = (pageHeight - imgH) / 2;

        page.drawImage(image, {
          x,
          y,
          width: imgW,
          height: imgH,
        });
      } catch (err) {
        console.error('Error embedding image during merge:', item.name, err);
        throw new Error(`تعذر تضمين الصورة: ${item.name}`);
      }
    } else if (['docx', 'doc', 'txt', 'md'].includes(ext)) {
      try {
        let textContent = '';
        if (ext === 'docx' || ext === 'doc') {
          const mammoth = (await import('mammoth')).default;
          const buffer = item.data.buffer.slice(item.data.byteOffset, item.data.byteOffset + item.data.byteLength);
          const res = await mammoth.extractRawText({ arrayBuffer: buffer });
          textContent = res.value || '';
        } else {
          textContent = new TextDecoder('utf-8').decode(item.data);
        }

        const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
        const fontSize = 11;
        const lineHeight = 16;
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = 40;
        const maxTextWidth = pageWidth - margin * 2;
        const maxY = pageHeight - margin;
        const minY = margin;

        const lines: string[] = [];
        const paragraphs = textContent.split('\n');
        for (const p of paragraphs) {
          if (p.trim() === '') {
            lines.push('');
            continue;
          }
          const words = p.split(' ');
          let curLine = '';
          for (const word of words) {
            const testLine = curLine ? `${curLine} ${word}` : word;
            const width = font.widthOfTextAtSize(testLine, fontSize);
            if (width <= maxTextWidth) {
              curLine = testLine;
            } else {
              lines.push(curLine);
              curLine = word;
            }
          }
          if (curLine) lines.push(curLine);
        }

        let curPage = mergedPdf.addPage([pageWidth, pageHeight]);
        let curY = maxY;

        for (const line of lines) {
          if (curY - lineHeight < minY) {
            curPage = mergedPdf.addPage([pageWidth, pageHeight]);
            curY = maxY;
          }
          if (line.trim()) {
            const clean = line.replace(/[^\x00-\x7F]/g, '');
            curPage.drawText(clean || line.slice(0, 40), {
              x: margin,
              y: curY,
              size: fontSize,
              font,
              color: rgb(0.12, 0.12, 0.12),
            });
          }
          curY -= lineHeight;
        }
      } catch (err) {
        console.error('Error embedding document in merge:', item.name, err);
      }
    }
  }

  onProgress?.(95, 'جارٍ تجميع المستند النهائي...');
  const mergedBytes = await mergedPdf.save();
  onProgress?.(100, 'اكتمل الدمج بنجاح!');
  return mergedBytes;
}

export async function splitPdfByRanges(
  srcData: Uint8Array,
  ranges: SplitRange[],
  baseName: string,
  onProgress?: (percent: number, msg: string) => void
): Promise<Array<{ name: string; data: Uint8Array }>> {
  const srcPdf = await PDFDocument.load(srcData, { ignoreEncryption: true });
  const totalPages = srcPdf.getPageCount();
  const results: Array<{ name: string; data: Uint8Array }> = [];

  for (let idx = 0; idx < ranges.length; idx++) {
    const r = ranges[idx];
    onProgress?.(Math.round(((idx + 1) / ranges.length) * 100), `جارٍ استخراج الجزء ${idx + 1}...`);

    const newPdf = await PDFDocument.create();
    const pageIndices: number[] = [];
    const start = Math.max(1, Math.min(r.from, totalPages));
    const end = Math.max(start, Math.min(r.to, totalPages));

    for (let p = start; p <= end; p++) {
      pageIndices.push(p - 1);
    }

    if (pageIndices.length > 0) {
      const pages = await newPdf.copyPages(srcPdf, pageIndices);
      pages.forEach((p) => newPdf.addPage(p));
      const bytes = await newPdf.save();
      results.push({
        name: `${baseName}_part_${idx + 1}_p${start}-${end}.pdf`,
        data: bytes,
      });
    }
  }

  return results;
}

export async function splitPdfEachPage(
  srcData: Uint8Array,
  baseName: string,
  onProgress?: (percent: number, msg: string) => void
): Promise<Array<{ name: string; data: Uint8Array }>> {
  const srcPdf = await PDFDocument.load(srcData, { ignoreEncryption: true });
  const totalPages = srcPdf.getPageCount();
  const results: Array<{ name: string; data: Uint8Array }> = [];

  for (let p = 0; p < totalPages; p++) {
    onProgress?.(Math.round(((p + 1) / totalPages) * 100), `جارٍ حفظ الصفحة ${p + 1} من ${totalPages}...`);
    const newPdf = await PDFDocument.create();
    const [page] = await newPdf.copyPages(srcPdf, [p]);
    newPdf.addPage(page);
    const bytes = await newPdf.save();
    results.push({
      name: `${baseName}_page_${p + 1}.pdf`,
      data: bytes,
    });
  }

  return results;
}

export async function splitPdfAtCutPoints(
  srcData: Uint8Array,
  cutPoints: number[], // e.g. after page 1, page 3 -> [1, 3]
  baseName: string,
  onProgress?: (percent: number, msg: string) => void
): Promise<Array<{ name: string; data: Uint8Array }>> {
  const srcPdf = await PDFDocument.load(srcData, { ignoreEncryption: true });
  const totalPages = srcPdf.getPageCount();
  
  const sortedPoints = [...new Set(cutPoints.filter((cp) => cp >= 1 && cp < totalPages))].sort((a, b) => a - b);
  const ranges: SplitRange[] = [];

  let currentStart = 1;
  for (const cp of sortedPoints) {
    ranges.push({ from: currentStart, to: cp });
    currentStart = cp + 1;
  }
  if (currentStart <= totalPages) {
    ranges.push({ from: currentStart, to: totalPages });
  }

  return splitPdfByRanges(srcData, ranges, baseName, onProgress);
}

export async function signPdfDocument(
  pdfData: Uint8Array,
  signaturePngDataUrl: string,
  options: {
    pageIndex: number;
    xPercent: number; // 0 to 100
    yPercent: number; // 0 to 100 (from top)
    widthPercent: number; // 0 to 100
    heightPercent: number;
    addDateStamp?: boolean;
    dateText?: string;
  },
  onProgress?: (percent: number, msg: string) => void
): Promise<Uint8Array> {
  onProgress?.(20, 'جارٍ تحميل مستند الـ PDF...');
  const pdfDoc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();
  const pageIdx = Math.max(0, Math.min(options.pageIndex, totalPages - 1));
  const page = pdfDoc.getPage(pageIdx);
  const { width: pWidth, height: pHeight } = page.getSize();

  onProgress?.(50, 'جارٍ معالجة التوقيع...');
  // Convert signature PNG data url
  const pngBase64 = signaturePngDataUrl.split(',')[1];
  const pngBytes = Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0));
  const signatureImage = await pdfDoc.embedPng(pngBytes);

  // Calculate coordinates
  const sigW = (options.widthPercent / 100) * pWidth;
  const sigH = (options.heightPercent / 100) * pHeight;
  const sigX = (options.xPercent / 100) * pWidth;
  // In PDF coordinates, y=0 is at the bottom!
  const sigY = pHeight - ((options.yPercent / 100) * pHeight) - sigH;

  page.drawImage(signatureImage, {
    x: Math.max(0, Math.min(sigX, pWidth - sigW)),
    y: Math.max(0, Math.min(sigY, pHeight - sigH)),
    width: sigW,
    height: sigH,
  });

  if (options.addDateStamp) {
    onProgress?.(80, 'جارٍ إضافة الطابع الزمني...');
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const dateStr = options.dateText || new Date().toISOString().split('T')[0];
    const fontSize = 10;
    const textWidth = helveticaFont.widthOfTextAtSize(dateStr, fontSize);
    
    // Draw date box and text below or beside signature
    page.drawText(dateStr, {
      x: Math.max(10, sigX + (sigW - textWidth) / 2),
      y: Math.max(10, sigY - 14),
      size: fontSize,
      font: helveticaFont,
      color: rgb(0.2, 0.25, 0.35),
    });
  }

  onProgress?.(95, 'جارٍ حفظ المستند الموقع...');
  const signedBytes = await pdfDoc.save();
  onProgress?.(100, 'تم التوقيع بنجاح!');
  return signedBytes;
}

export async function flattenPdfDocument(
  pdfBytes: Uint8Array,
  onProgress?: (percent: number, msg: string) => void
): Promise<Uint8Array> {
  onProgress?.(25, 'جارٍ قراءة بنية المستند...');
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  onProgress?.(55, 'جارٍ تسطيح الحقول التفاعلية والأختام...');
  try {
    const form = pdfDoc.getForm();
    form.flatten();
  } catch (err) {
    console.log('No form fields to flatten or already flattened:', err);
  }

  onProgress?.(85, 'جارٍ تثبيت الطبقات وتأمين الملف...');
  const outputBytes = await pdfDoc.save();
  onProgress?.(100, 'تم تسطيح وتأمين المستند بنجاح!');
  return outputBytes;
}

