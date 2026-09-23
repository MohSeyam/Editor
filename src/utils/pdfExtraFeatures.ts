import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { decodeImageToCanvas } from './imageFormatUtils';
import { createWorker } from 'tesseract.js';

export interface WatermarkOptions {
  text: string;
  opacity: number; // 0.1 to 1
  fontSize: number;
  rotation: number; // degrees e.g. 45
  color: string; // 'gray' | 'red' | 'blue' | 'black'
}

export async function addWatermarkToPdf(
  srcData: Uint8Array,
  options: WatermarkOptions,
  onProgress?: (percent: number, msg: string) => void
): Promise<Uint8Array> {
  onProgress?.(20, 'فتح المستند...');
  const pdfDoc = await PDFDocument.load(srcData, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const total = pages.length;

  let chosenColor = rgb(0.5, 0.5, 0.5);
  if (options.color === 'red') chosenColor = rgb(0.85, 0.15, 0.15);
  if (options.color === 'blue') chosenColor = rgb(0.12, 0.45, 0.85);
  if (options.color === 'black') chosenColor = rgb(0.1, 0.1, 0.1);

  for (let i = 0; i < total; i++) {
    onProgress?.(Math.round(20 + ((i + 1) / total) * 70), `علامة صفحة ${i + 1}...`);
    const page = pages[i];
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);
    const textHeight = font.heightAtSize(options.fontSize);

    page.drawText(options.text, {
      x: width / 2 - (textWidth / 2) * Math.cos((options.rotation * Math.PI) / 180),
      y: height / 2 - (textHeight / 2) * Math.sin((options.rotation * Math.PI) / 180),
      size: options.fontSize,
      font,
      color: chosenColor,
      opacity: Math.max(0.05, Math.min(1, options.opacity)),
      rotate: degrees(options.rotation),
    });
  }

  onProgress?.(95, 'حفظ المستند...');
  const resultBytes = await pdfDoc.save();
  return resultBytes;
}

export async function extractDocumentText(
  file: File,
  data: Uint8Array,
  onProgress?: (percent: number, msg: string) => void
): Promise<{ text: string; pageCount: number; wordCount: number }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf') {
    onProgress?.(20, 'قراءة الصفحات...');
    const loadingTask = pdfjsLib.getDocument({ data: data.slice() });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
      onProgress?.(Math.round(20 + (i / numPages) * 70), `استخراج ${i}/${numPages}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      fullText += `--- [ صفحة ${i} ] ---\n` + pageStrings + '\n\n';
    }

    const words = fullText.trim().split(/\s+/).filter(Boolean).length;

    // If PDF has no extractable text (e.g. scanned document), fallback to OCR on first pages
    if (words === 0 && numPages > 0) {
      try {
        onProgress?.(40, 'لم يتم العثور على نصوص برمجية، جارٍ تشغيل التعرف الضوئي OCR على المستند الممسوح...');
        const worker = await createWorker('ara+eng');
        let ocrText = '';
        const scanPages = Math.min(numPages, 3);
        for (let p = 1; p <= scanPages; p++) {
          onProgress?.(Math.round(40 + (p / scanPages) * 50), `قراءة OCR لصفحة ${p}...`);
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await (page.render({ canvasContext: ctx, viewport, canvas } as any)).promise;
            const res = await worker.recognize(canvas);
            ocrText += `--- [ صفحة ${p} (OCR) ] ---\n` + res.data.text + '\n\n';
          }
        }
        await worker.terminate();
        const ocrWords = ocrText.trim().split(/\s+/).filter(Boolean).length;
        if (ocrWords > 0) {
          return { text: ocrText.trim(), pageCount: numPages, wordCount: ocrWords };
        }
      } catch (ocrErr) {
        console.warn('Scanned PDF OCR fallback error:', ocrErr);
      }
    }

    return { text: fullText.trim(), pageCount: numPages, wordCount: words };
  } else if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'heic', 'heif', 'tiff', 'tif'].includes(ext)) {
    // Direct OCR on image
    onProgress?.(25, 'تحميل وتجهيز محرك OCR...');
    const canvas = await decodeImageToCanvas(data, ext);
    onProgress?.(50, 'جارٍ استخراج الحروف والنصوص من الصورة...');
    const worker = await createWorker('ara+eng');
    const res = await worker.recognize(canvas);
    await worker.terminate();
    const clean = res.data.text.trim();
    const words = clean.split(/\s+/).filter(Boolean).length;
    return { text: clean || 'لم يتم العثور على نصوص واضحة في الصورة', pageCount: 1, wordCount: words };
  } else {
    // Text / HTML / Markdown / JSON
    onProgress?.(50, 'معالجة النص...');
    const raw = new TextDecoder('utf-8').decode(data);
    let clean = raw;
    if (ext === 'html' || ext === 'htm') {
      const doc = new DOMParser().parseFromString(raw, 'text/html');
      clean = doc.body.textContent || '';
    }
    const words = clean.trim().split(/\s+/).filter(Boolean).length;
    return { text: clean.trim(), pageCount: 1, wordCount: words };
  }
}

export interface PageNumberOptions {
  position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right';
  format: 'number' | 'page_of_total';
  startNumber: number;
  fontSize: number;
  color: string;
}

export async function addPageNumbersToPdf(
  srcData: Uint8Array,
  options: PageNumberOptions,
  onProgress?: (percent: number, msg: string) => void
): Promise<Uint8Array> {
  onProgress?.(20, 'فتح المستند...');
  const pdfDoc = await PDFDocument.load(srcData, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const total = pages.length;

  let chosenColor = rgb(0.2, 0.2, 0.2);
  if (options.color === 'blue') chosenColor = rgb(0.1, 0.3, 0.8);
  if (options.color === 'red') chosenColor = rgb(0.8, 0.1, 0.1);
  if (options.color === 'gray') chosenColor = rgb(0.45, 0.45, 0.45);

  for (let i = 0; i < total; i++) {
    onProgress?.(Math.round(20 + ((i + 1) / total) * 70), `ترقيم صفحة ${i + 1}...`);
    const page = pages[i];
    const { width, height } = page.getSize();
    const currentNum = options.startNumber + i;
    const text = options.format === 'page_of_total' ? `${currentNum} / ${total}` : `${currentNum}`;
    const textWidth = font.widthOfTextAtSize(text, options.fontSize);

    let x = (width - textWidth) / 2;
    let y = 30;

    if (options.position === 'bottom-center') {
      x = (width - textWidth) / 2;
      y = 30;
    } else if (options.position === 'bottom-right') {
      x = width - textWidth - 40;
      y = 30;
    } else if (options.position === 'bottom-left') {
      x = 40;
      y = 30;
    } else if (options.position === 'top-center') {
      x = (width - textWidth) / 2;
      y = height - 35;
    } else if (options.position === 'top-right') {
      x = width - textWidth - 40;
      y = height - 35;
    }

    page.drawText(text, {
      x,
      y,
      size: options.fontSize,
      font,
      color: chosenColor,
    });
  }

  onProgress?.(95, 'حفظ المستند المُرقم...');
  return await pdfDoc.save();
}

export interface PdfMetadataInfo {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
}

export async function getPdfMetadata(srcData: Uint8Array): Promise<PdfMetadataInfo> {
  const pdfDoc = await PDFDocument.load(srcData, { ignoreEncryption: true });
  return {
    title: pdfDoc.getTitle() || '',
    author: pdfDoc.getAuthor() || '',
    subject: pdfDoc.getSubject() || '',
    keywords: (pdfDoc.getKeywords() || '').toString(),
    creator: pdfDoc.getCreator() || '',
  };
}

export async function editPdfMetadata(
  srcData: Uint8Array,
  metadata: Partial<PdfMetadataInfo>,
  onProgress?: (percent: number, msg: string) => void
): Promise<Uint8Array> {
  onProgress?.(30, 'تحديث بيانات المستند...');
  const pdfDoc = await PDFDocument.load(srcData, { ignoreEncryption: true });

  if (metadata.title !== undefined) pdfDoc.setTitle(metadata.title);
  if (metadata.author !== undefined) pdfDoc.setAuthor(metadata.author);
  if (metadata.subject !== undefined) pdfDoc.setSubject(metadata.subject);
  if (metadata.creator !== undefined) pdfDoc.setCreator(metadata.creator);
  if (metadata.keywords !== undefined) {
    const kw = metadata.keywords.split(',').map((k) => k.trim()).filter(Boolean);
    pdfDoc.setKeywords(kw);
  }

  onProgress?.(90, 'حفظ التعديلات...');
  return await pdfDoc.save();
}
