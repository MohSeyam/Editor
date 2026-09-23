import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import heic2any from 'heic2any';
import { getBaseFileName } from './fileHelpers';
import { renderPdfPageToBlob } from './pdfThumbnail';
import { compressImage } from './imageCompressor';
import { renderTiffToCanvas } from './imageFormatUtils';
import { renderTextToPdfPages, renderSpreadsheetToPdfPages } from './pdfCanvasGenerator';
import { executePdfToHtml, executePdfToWord, executePdfToExcel } from './extraToolsOperations';
import { extractPdfText } from './pdfDiff';
import { executeMarkdownToHtml } from './markdownToHtml';
import {
  generateRichSpreadsheetHtml,
  generateRichWordHtml,
  generateRichPresentationHtml,
} from './htmlGenerators';

export interface ConversionResult {
  blob: Blob;
  downloadName: string;
  mimeType: string;
  previewText?: string;
}

export async function convertOfficeFile(
  file: File,
  data: Uint8Array,
  targetExt: string,
  options?: { quality?: string },
  onProgress?: (percent: number, msg: string) => void
): Promise<ConversionResult> {
  const baseName = getBaseFileName(file.name);
  const srcExt = (file.name.split('.').pop() || '').toLowerCase();
  targetExt = targetExt.toLowerCase();

  onProgress?.(20, 'جارٍ فحص ومعالجة بنية الملف...');

  // 1. HEIC / HEIF handling
  if (['heic', 'heif'].includes(srcExt)) {
    onProgress?.(40, 'جارٍ فك ترميز ملف HEIC...');
    const rawBlob = new Blob([data]);
    let convertedBlob: Blob;
    try {
      const conv = await heic2any({
        blob: rawBlob,
        toType: targetExt === 'png' ? 'image/png' : 'image/jpeg',
        quality: options?.quality === 'low' ? 0.7 : options?.quality === 'medium' ? 0.85 : 0.95,
      });
      convertedBlob = Array.isArray(conv) ? conv[0] : conv;
    } catch (err: any) {
      throw new Error(`تعذر تحويل ملف HEIC: ${err?.message || 'خطأ غير معروف'}`);
    }

    if (targetExt === 'jpg' || targetExt === 'jpeg') {
      return {
        blob: convertedBlob,
        downloadName: `${baseName}.jpg`,
        mimeType: 'image/jpeg',
      };
    }

    if (targetExt === 'png') {
      return {
        blob: convertedBlob,
        downloadName: `${baseName}.png`,
        mimeType: 'image/png',
      };
    }

    if (targetExt === 'webp') {
      onProgress?.(70, 'جارٍ التحويل إلى WebP...');
      const img = new Image();
      const url = URL.createObjectURL(convertedBlob);
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const webpBlob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/webp', 0.92));
      return {
        blob: webpBlob,
        downloadName: `${baseName}.webp`,
        mimeType: 'image/webp',
      };
    }

    if (targetExt === 'pdf') {
      onProgress?.(70, 'جارٍ تضمين الصورة في مستند PDF...');
      const jpegBytes = new Uint8Array(await convertedBlob.arrayBuffer());
      const pdfDoc = await PDFDocument.create();
      const image = await pdfDoc.embedJpg(jpegBytes);
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      const margin = 20;
      const maxW = pageWidth - margin * 2;
      const maxH = pageHeight - margin * 2;
      const scale = Math.min(maxW / image.width, maxH / image.height, 1);
      const imgW = image.width * scale;
      const imgH = image.height * scale;
      const x = (pageWidth - imgW) / 2;
      const y = (pageHeight - imgH) / 2;

      page.drawImage(image, { x, y, width: imgW, height: imgH });
      const bytes = await pdfDoc.save();
      return {
        blob: new Blob([bytes], { type: 'application/pdf' }),
        downloadName: `${baseName}.pdf`,
        mimeType: 'application/pdf',
      };
    }
  }

  // 2. Image (jpg, jpeg, png, webp, bmp, svg, tiff, tif) -> PDF
  if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'svg', 'tiff', 'tif'].includes(srcExt) && targetExt === 'pdf') {
    onProgress?.(50, 'جارٍ تحويل الصورة إلى مستند PDF...');
    const pdfDoc = await PDFDocument.create();
    let image;

    if (srcExt === 'tiff' || srcExt === 'tif') {
      onProgress?.(55, 'فك ترميز مستند TIFF وتحويله إلى صيغة ملائمة...');
      const canvas = await renderTiffToCanvas(data);
      const jpegBlob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.95));
      const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
      image = await pdfDoc.embedJpg(jpegBytes);
    } else {
      // Check if compression or downscaling is beneficial
      const shouldCompress = options?.quality === 'medium' || options?.quality === 'low' || data.byteLength > 2 * 1024 * 1024;
    
    if (shouldCompress) {
      onProgress?.(45, 'تحسين وضغط الصورة لتسريع المعالجة وتقليل الحجم...');
      try {
        const qualityVal = options?.quality === 'low' ? 0.7 : 0.85;
        const comp = await compressImage(data, file.name, {
          quality: qualityVal,
          maxDimension: options?.quality === 'low' ? 1280 : 1920,
          outputFormat: 'image/jpeg',
        });
        image = await pdfDoc.embedJpg(comp.data);
      } catch {
        // Fallback to standard flow
      }
    }

    if (!image) {
      if (srcExt === 'png') {
        try {
          image = await pdfDoc.embedPng(data);
        } catch {
          // Fallback via canvas
        }
      } else if (srcExt === 'jpg' || srcExt === 'jpeg') {
        try {
          image = await pdfDoc.embedJpg(data);
        } catch {
          // Fallback via canvas
        }
      }
    }

    if (!image) {
      // webp / bmp / svg or failed direct embed: draw to canvas first
      let mime = 'image/png';
      if (srcExt === 'webp') mime = 'image/webp';
      else if (srcExt === 'svg') mime = 'image/svg+xml';
      else if (srcExt === 'bmp') mime = 'image/bmp';

      const imgBlob = new Blob([data], { type: mime });
      const imgUrl = URL.createObjectURL(imgBlob);
      const imgEl = new Image();
      await new Promise((res, rej) => {
        imgEl.onload = res;
        imgEl.onerror = rej;
        imgEl.src = imgUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = imgEl.width;
      canvas.height = imgEl.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(imgEl, 0, 0);
      URL.revokeObjectURL(imgUrl);
      const jpegBlob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.92));
      const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
      image = await pdfDoc.embedJpg(jpegBytes);
    }
  }

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    const margin = 20;
    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 2;
    const scale = Math.min(maxW / image.width, maxH / image.height, 1);
    const imgW = image.width * scale;
    const imgH = image.height * scale;
    const x = (pageWidth - imgW) / 2;
    const y = (pageHeight - imgH) / 2;

    page.drawImage(image, { x, y, width: imgW, height: imgH });
    const bytes = await pdfDoc.save();
    return {
      blob: new Blob([bytes], { type: 'application/pdf' }),
      downloadName: `${baseName}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  // 3. Image -> Image (webp ↔ png ↔ jpg ↔ bmp)
  if (
    ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'svg'].includes(srcExt) &&
    ['png', 'jpg', 'jpeg', 'webp'].includes(targetExt) &&
    srcExt !== targetExt
  ) {
    onProgress?.(50, `جارٍ تحويل الصورة إلى .${targetExt}...`);
    let srcMime = 'image/png';
    if (['jpg', 'jpeg'].includes(srcExt)) srcMime = 'image/jpeg';
    else if (srcExt === 'webp') srcMime = 'image/webp';
    else if (srcExt === 'svg') srcMime = 'image/svg+xml';
    else if (srcExt === 'bmp') srcMime = 'image/bmp';

    const imgBlob = new Blob([data], { type: srcMime });
    const imgUrl = URL.createObjectURL(imgBlob);
    const imgEl = new Image();
    await new Promise((res, rej) => {
      imgEl.onload = res;
      imgEl.onerror = rej;
      imgEl.src = imgUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = imgEl.width;
    canvas.height = imgEl.height;
    const ctx = canvas.getContext('2d');
    if (targetExt === 'jpg' || targetExt === 'jpeg') {
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    ctx?.drawImage(imgEl, 0, 0);
    URL.revokeObjectURL(imgUrl);

    let targetMime = 'image/png';
    let targetQuality: number | undefined = undefined;
    if (targetExt === 'jpg' || targetExt === 'jpeg') {
      targetMime = 'image/jpeg';
      targetQuality = 0.92;
    } else if (targetExt === 'webp') {
      targetMime = 'image/webp';
      targetQuality = 0.92;
    }

    const outBlob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b!), targetMime, targetQuality)
    );

    return {
      blob: outBlob,
      downloadName: `${baseName}.${targetExt}`,
      mimeType: targetMime,
    };
  }

  // 2. Word (.docx, .doc) -> Markdown / Text / HTML / PDF
  if (srcExt === 'docx' || srcExt === 'doc') {
    onProgress?.(40, 'جارٍ قراءة محتوى مستند Word...');
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

    if (targetExt === 'md' || targetExt === 'txt') {
      const textResult = await mammoth.extractRawText({ arrayBuffer });
      const textContent = textResult.value;
      const mime = targetExt === 'md' ? 'text/markdown' : 'text/plain';
      return {
        blob: new Blob([textContent], { type: `${mime};charset=utf-8` }),
        downloadName: `${baseName}.${targetExt}`,
        mimeType: mime,
        previewText: textContent.slice(0, 1000),
      };
    }

    if (targetExt === 'html') {
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
      const fullHtml = generateRichWordHtml(htmlResult.value, baseName);
      return {
        blob: new Blob([fullHtml], { type: 'text/html;charset=utf-8' }),
        downloadName: `${baseName}.html`,
        mimeType: 'text/html',
        previewText: htmlResult.value.slice(0, 1000),
      };
    }

    if (targetExt === 'pdf') {
      onProgress?.(60, 'جارٍ تحويل مستند Word إلى PDF...');
      const textResult = await mammoth.extractRawText({ arrayBuffer });
      const text = textResult.value || 'مستند بدون نص';
      const pdfBytes = await generateSimplePdfFromText(text, baseName);
      return {
        blob: new Blob([pdfBytes], { type: 'application/pdf' }),
        downloadName: `${baseName}.pdf`,
        mimeType: 'application/pdf',
      };
    }

    if (targetExt === 'xlsx') {
      onProgress?.(60, 'جارٍ استخراج الجداول والبيانات من مستند Word إلى Excel...');
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlResult.value, 'text/html');
      const tables = doc.querySelectorAll('table');
      const wb = XLSX.utils.book_new();

      if (tables.length > 0) {
        tables.forEach((table, idx) => {
          const ws = XLSX.utils.table_to_sheet(table);
          XLSX.utils.book_append_sheet(wb, ws, `Table_${idx + 1}`);
        });
      } else {
        const lines = (doc.body.textContent || '').split('\n').map((l) => l.trim()).filter(Boolean);
        const rows = lines.map((l) => [l]);
        const ws = XLSX.utils.aoa_to_sheet(rows.length > 0 ? rows : [['المستند لا يحتوي على جداول صريحة']]);
        XLSX.utils.book_append_sheet(wb, ws, 'Word_Data');
      }

      const outBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      return {
        blob: new Blob([outBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        downloadName: `${baseName}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }
  }

  // 2.5 PowerPoint (.pptx, .ppt) -> PDF / Word (.docx) / Markdown / HTML / TXT
  if (srcExt === 'pptx' || srcExt === 'ppt') {
    onProgress?.(40, 'جارٍ فك حزم شرائح العرض التقديمي PowerPoint...');
    let slides: { slideIndex: number; title: string; texts: string[] }[] = [];
    try {
      slides = await parsePptxSlides(data);
    } catch (zipErr) {
      console.warn('PPTX parsing error:', zipErr);
      slides = [{ slideIndex: 1, title: baseName, texts: ['عرض تقديمي بدون شرائح قابلة للقراءة التلقائية'] }];
    }

    if (targetExt === 'pdf') {
      onProgress?.(70, 'جارٍ إنشاء مستند PDF أفقي للشرائح...');
      const pdfBytes = await generatePdfFromPptxSlides(slides, baseName);
      return {
        blob: new Blob([pdfBytes], { type: 'application/pdf' }),
        downloadName: `${baseName}.pdf`,
        mimeType: 'application/pdf',
      };
    }

    if (targetExt === 'docx') {
      onProgress?.(70, 'جارٍ تحويل الشرائح إلى مستند Word منسق...');
      const paragraphs: Paragraph[] = [];
      paragraphs.push(new Paragraph({ text: baseName, heading: HeadingLevel.TITLE }));

      for (const slide of slides) {
        paragraphs.push(
          new Paragraph({
            text: `الشريحة ${slide.slideIndex}: ${slide.title}`,
            heading: HeadingLevel.HEADING_1,
          })
        );
        for (const t of slide.texts) {
          paragraphs.push(new Paragraph({ children: [new TextRun(`• ${t}`)] }));
        }
      }

      const doc = new Document({ sections: [{ children: paragraphs }] });
      const docxBlob = await Packer.toBlob(doc);
      return {
        blob: docxBlob,
        downloadName: `${baseName}.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    }

    if (targetExt === 'md') {
      let md = `# ${baseName}\n\n`;
      for (const s of slides) {
        md += `## الشريحة ${s.slideIndex}: ${s.title}\n\n`;
        for (const t of s.texts) {
          md += `- ${t}\n`;
        }
        md += `\n---\n\n`;
      }
      return {
        blob: new Blob([md], { type: 'text/markdown;charset=utf-8;' }),
        downloadName: `${baseName}.md`,
        mimeType: 'text/markdown',
        previewText: md.slice(0, 1000),
      };
    }

    if (targetExt === 'html') {
      const fullHtml = generateRichPresentationHtml(slides, baseName);
      return {
        blob: new Blob([fullHtml], { type: 'text/html;charset=utf-8;' }),
        downloadName: `${baseName}.html`,
        mimeType: 'text/html',
      };
    }

    if (targetExt === 'txt') {
      let txt = `${baseName}\n========================\n\n`;
      for (const s of slides) {
        txt += `[شريحة ${s.slideIndex}] ${s.title}\n`;
        for (const t of s.texts) {
          txt += `  - ${t}\n`;
        }
        txt += '\n';
      }
      return {
        blob: new Blob([txt], { type: 'text/plain;charset=utf-8;' }),
        downloadName: `${baseName}.txt`,
        mimeType: 'text/plain',
        previewText: txt.slice(0, 1000),
      };
    }
  }

  // 3. Markdown / Plain text (md, markdown, txt) -> Word (.docx) or PDF or HTML
  if (['md', 'markdown', 'txt'].includes(srcExt)) {
    const textContent = new TextDecoder('utf-8').decode(data);

    if (targetExt === 'docx') {
      onProgress?.(50, 'جارٍ إنشاء مستند Word (.docx)...');
      const lines = textContent.split('\n');
      const paragraphs: Paragraph[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ')) {
          paragraphs.push(
            new Paragraph({
              text: trimmed.replace('# ', ''),
              heading: HeadingLevel.HEADING_1,
            })
          );
        } else if (trimmed.startsWith('## ')) {
          paragraphs.push(
            new Paragraph({
              text: trimmed.replace('## ', ''),
              heading: HeadingLevel.HEADING_2,
            })
          );
        } else if (trimmed.startsWith('### ')) {
          paragraphs.push(
            new Paragraph({
              text: trimmed.replace('### ', ''),
              heading: HeadingLevel.HEADING_3,
            })
          );
        } else {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun(line)],
            })
          );
        }
      }

      const doc = new Document({
        sections: [{ properties: {}, children: paragraphs }],
      });

      const docxBlob = await Packer.toBlob(doc);
      return {
        blob: docxBlob,
        downloadName: `${baseName}.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    }

    if (targetExt === 'pdf') {
      onProgress?.(50, 'جارٍ إنشاء ملف PDF من النص...');
      const pdfBytes = await generateSimplePdfFromText(textContent, baseName);
      return {
        blob: new Blob([pdfBytes], { type: 'application/pdf' }),
        downloadName: `${baseName}.pdf`,
        mimeType: 'application/pdf',
      };
    }

    if (targetExt === 'html') {
      onProgress?.(60, 'جارٍ إنشاء صفحة HTML متجاوبة...');
      const res = executeMarkdownToHtml(textContent, baseName);
      return {
        blob: res.blob,
        downloadName: res.downloadName,
        mimeType: 'text/html',
        previewText: res.previewText,
      };
    }

    if (targetExt === 'txt' && (srcExt === 'md' || srcExt === 'markdown')) {
      return {
        blob: new Blob([textContent], { type: 'text/plain;charset=utf-8' }),
        downloadName: `${baseName}.txt`,
        mimeType: 'text/plain',
      };
    }
  }

  // 4. Excel & Spreadsheets (xlsx ↔ csv ↔ json ↔ md ↔ html)
  if (['xlsx', 'xls', 'csv'].includes(srcExt)) {
    onProgress?.(40, 'جارٍ فحص جداول البيانات...');
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    if (targetExt === 'csv') {
      onProgress?.(70, 'جارٍ تصدير البيانات إلى CSV...');
      const csvData = XLSX.utils.sheet_to_csv(worksheet);
      return {
        blob: new Blob([csvData], { type: 'text/csv;charset=utf-8;' }),
        downloadName: `${baseName}.csv`,
        mimeType: 'text/csv',
        previewText: csvData.slice(0, 1000),
      };
    }

    if (targetExt === 'xlsx') {
      onProgress?.(70, 'جارٍ إنشاء ملف Excel الحديث (.xlsx)...');
      const outBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      return {
        blob: new Blob([outBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        downloadName: `${baseName}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    if (targetExt === 'json') {
      onProgress?.(70, 'جارٍ تحويل الصفوف إلى JSON...');
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const jsonStr = JSON.stringify(jsonData, null, 2);
      return {
        blob: new Blob([jsonStr], { type: 'application/json;charset=utf-8;' }),
        downloadName: `${baseName}.json`,
        mimeType: 'application/json',
        previewText: jsonStr.slice(0, 1000),
      };
    }

    if (targetExt === 'md') {
      onProgress?.(70, 'جارٍ إنشاء جدول Markdown...');
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      let mdTable = '';
      if (rows.length > 0) {
        const header = rows[0];
        mdTable += `| ${header.map((h) => String(h ?? '')).join(' | ')} |\n`;
        mdTable += `| ${header.map(() => '---').join(' | ')} |\n`;
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length === 0) continue;
          mdTable += `| ${header.map((_, colIdx) => String(row[colIdx] ?? '')).join(' | ')} |\n`;
        }
      }
      return {
        blob: new Blob([mdTable], { type: 'text/markdown;charset=utf-8;' }),
        downloadName: `${baseName}.md`,
        mimeType: 'text/markdown',
        previewText: mdTable.slice(0, 1000),
      };
    }

    if (targetExt === 'html') {
      onProgress?.(70, 'جارٍ إنشاء جدول HTML متجاوب...');
      const fullHtml = generateRichSpreadsheetHtml(workbook, baseName);
      return {
        blob: new Blob([fullHtml], { type: 'text/html;charset=utf-8;' }),
        downloadName: `${baseName}.html`,
        mimeType: 'text/html',
      };
    }

    if (targetExt === 'pdf') {
      onProgress?.(70, 'جارٍ تحويل جدول البيانات إلى مستند PDF...');
      const pdfBytes = await generatePdfFromSpreadsheet(worksheet, baseName);
      return {
        blob: new Blob([pdfBytes], { type: 'application/pdf' }),
        downloadName: `${baseName}.pdf`,
        mimeType: 'application/pdf',
      };
    }
  }

  // 5. JSON -> Excel (.xlsx) / CSV / HTML / TXT
  if (srcExt === 'json') {
    onProgress?.(40, 'جارٍ قراءة بيانات JSON وتحليل الجداول...');
    const textContent = new TextDecoder('utf-8').decode(data);
    let parsed: any;
    try {
      parsed = JSON.parse(textContent);
    } catch {
      throw new Error('ملف JSON غير صالح أو به خطأ في البنية');
    }

    const arrayData = Array.isArray(parsed) ? parsed : [parsed];
    const ws = XLSX.utils.json_to_sheet(arrayData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    if (targetExt === 'xlsx') {
      const outBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      return {
        blob: new Blob([outBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        downloadName: `${baseName}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    if (targetExt === 'csv') {
      const csvStr = XLSX.utils.sheet_to_csv(ws);
      return {
        blob: new Blob([csvStr], { type: 'text/csv;charset=utf-8;' }),
        downloadName: `${baseName}.csv`,
        mimeType: 'text/csv',
        previewText: csvStr.slice(0, 1000),
      };
    }

    if (targetExt === 'html') {
      const fullHtml = generateRichSpreadsheetHtml(wb, baseName);
      return {
        blob: new Blob([fullHtml], { type: 'text/html;charset=utf-8;' }),
        downloadName: `${baseName}.html`,
        mimeType: 'text/html',
      };
    }

    if (targetExt === 'txt') {
      const pretty = JSON.stringify(parsed, null, 2);
      return {
        blob: new Blob([pretty], { type: 'text/plain;charset=utf-8;' }),
        downloadName: `${baseName}.txt`,
        mimeType: 'text/plain',
      };
    }
  }

  // 6. HTML -> Markdown (.md) / Text (.txt) / Word (.docx) / PDF (.pdf)
  if (srcExt === 'html' || srcExt === 'htm') {
    const textContent = new TextDecoder('utf-8').decode(data);
    const parser = new DOMParser();
    const doc = parser.parseFromString(textContent, 'text/html');
    const cleanText = doc.body.textContent || '';

    if (targetExt === 'txt') {
      return {
        blob: new Blob([cleanText], { type: 'text/plain;charset=utf-8;' }),
        downloadName: `${baseName}.txt`,
        mimeType: 'text/plain',
        previewText: cleanText.slice(0, 1000),
      };
    }

    if (targetExt === 'md') {
      let md = '';
      doc.body.childNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();
          const t = el.textContent?.trim() || '';
          if (tag === 'h1') md += `# ${t}\n\n`;
          else if (tag === 'h2') md += `## ${t}\n\n`;
          else if (tag === 'h3') md += `### ${t}\n\n`;
          else if (tag === 'p') md += `${t}\n\n`;
          else if (tag === 'li') md += `- ${t}\n`;
        }
      });
      if (!md) md = cleanText;

      return {
        blob: new Blob([md], { type: 'text/markdown;charset=utf-8;' }),
        downloadName: `${baseName}.md`,
        mimeType: 'text/markdown',
        previewText: md.slice(0, 1000),
      };
    }

    if (targetExt === 'docx') {
      const lines = cleanText.split('\n').filter((l) => l.trim().length > 0);
      const paragraphs = lines.map((l) => new Paragraph({ children: [new TextRun(l)] }));
      const wordDoc = new Document({ sections: [{ children: paragraphs }] });
      const docxBlob = await Packer.toBlob(wordDoc);
      return {
        blob: docxBlob,
        downloadName: `${baseName}.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    }

    if (targetExt === 'pdf') {
      onProgress?.(60, 'جارٍ تحويل صفحة HTML إلى PDF...');
      const pdfBytes = await generateSimplePdfFromText(cleanText || baseName, baseName);
      return {
        blob: new Blob([pdfBytes], { type: 'application/pdf' }),
        downloadName: `${baseName}.pdf`,
        mimeType: 'application/pdf',
      };
    }
  }

  // 7. PDF -> Image (PNG, JPG, WebP), Word (.docx), Excel (.xlsx), Text (.txt), Markdown (.md), HTML
  if (srcExt === 'pdf') {
    if (['png', 'jpg', 'jpeg', 'webp'].includes(targetExt)) {
      onProgress?.(60, 'جارٍ استخراج وتصدير صفحة PDF كصورة...');
      const targetFormat: 'png' | 'jpeg' | 'webp' = targetExt === 'png' ? 'png' : targetExt === 'webp' ? 'webp' : 'jpeg';
      const imageBlob = await renderPdfPageToBlob(data, 1, targetFormat, 2.0);
      const mime = targetFormat === 'png' ? 'image/png' : targetFormat === 'webp' ? 'image/webp' : 'image/jpeg';
      return {
        blob: imageBlob,
        downloadName: `${baseName}_page1.${targetExt}`,
        mimeType: mime,
      };
    }

    if (targetExt === 'docx') {
      onProgress?.(60, 'جارٍ استخراج نصوص ومحتوى PDF إلى مستند Word (.docx)...');
      let extractedText = '';
      try {
        const ext = await extractPdfText(data);
        extractedText = ext.fullText;
      } catch {
        extractedText = '';
      }
      const wordRes = await executePdfToWord(extractedText || `مستند مستخرج من ${file.name}`, baseName);
      return {
        blob: wordRes.blob,
        downloadName: wordRes.downloadName,
        mimeType: wordRes.type,
      };
    }

    if (targetExt === 'xlsx') {
      onProgress?.(60, 'جارٍ استخراج الجداول وبيانات PDF إلى مصنف Excel...');
      let extractedText = '';
      try {
        const ext = await extractPdfText(data);
        extractedText = ext.fullText;
      } catch {
        extractedText = '';
      }
      const excelRes = await executePdfToExcel(extractedText || `بيانات مستخرجة من ${file.name}`, baseName);
      return {
        blob: excelRes.blob,
        downloadName: excelRes.downloadName,
        mimeType: excelRes.type,
      };
    }

    if (targetExt === 'txt') {
      onProgress?.(60, 'جارٍ استخراج المحتوى النصي الفعلي من PDF...');
      let extractedText = '';
      try {
        const ext = await extractPdfText(data);
        extractedText = ext.fullText;
      } catch {
        extractedText = '';
      }
      const finalTxt = extractedText.trim() || `المستند: ${file.name}\n(لم يتم العثور على طبقة نصية مباشرة في هذا المستند)`;
      return {
        blob: new Blob([finalTxt], { type: 'text/plain;charset=utf-8' }),
        downloadName: `${baseName}.txt`,
        mimeType: 'text/plain',
        previewText: finalTxt.slice(0, 1000),
      };
    }

    if (targetExt === 'md') {
      onProgress?.(60, 'جارٍ تحويل PDF إلى مستند Markdown منظم...');
      const mdLines: string[] = [`# ${baseName}\n`];
      try {
        const ext = await extractPdfText(data);
        ext.pages.forEach((p) => {
          mdLines.push(`\n## صفحة ${p.pageNum}\n`);
          p.lines.forEach((l) => {
            const trimmed = l.trim();
            if (!trimmed) return;
            if (/^[•\-\*]\s/.test(trimmed)) {
              mdLines.push(trimmed);
            } else if (/^\d+[\.\)]\s/.test(trimmed)) {
              mdLines.push(trimmed);
            } else {
              mdLines.push(`\n${trimmed}\n`);
            }
          });
        });
      } catch {
        mdLines.push(`\n(لم يتم العثور على طبقة نصية في هذا المستند)\n`);
      }
      const fullMd = mdLines.join('\n');
      return {
        blob: new Blob([fullMd], { type: 'text/markdown;charset=utf-8' }),
        downloadName: `${baseName}.md`,
        mimeType: 'text/markdown',
        previewText: fullMd.slice(0, 1000),
      };
    }

    if (targetExt === 'html') {
      const res = await executePdfToHtml(data, baseName);
      return {
        blob: res.blob,
        downloadName: res.downloadName,
        mimeType: 'text/html',
      };
    }
  }

  throw new Error(`التحويل من صيغة .${srcExt} إلى .${targetExt} غير مدعوم حالياً.`);
}

async function generateSimplePdfFromText(text: string, title: string): Promise<Uint8Array> {
  return await renderTextToPdfPages(text, title);
}

/**
 * Renders an Excel or CSV spreadsheet cleanly into a multi-page PDF with table gridlines and headers
 */
async function generatePdfFromSpreadsheet(worksheet: XLSX.WorkSheet, title: string): Promise<Uint8Array> {
  return await renderSpreadsheetToPdfPages(worksheet, title);
}

/**
 * Parses slide titles and contents from a PowerPoint (.pptx) file using JSZip
 */
async function parsePptxSlides(data: Uint8Array): Promise<{ slideIndex: number; title: string; texts: string[] }[]> {
  const zip = await JSZip.loadAsync(data);
  const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name));

  slideFiles.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
    const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
    return numA - numB;
  });

  const parser = new DOMParser();
  const slides: { slideIndex: number; title: string; texts: string[] }[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const xmlStr = await zip.file(slideFiles[i])!.async('text');
    const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
    const tNodes = xmlDoc.getElementsByTagName('a:t');
    const texts: string[] = [];
    for (let j = 0; j < tNodes.length; j++) {
      const txt = tNodes[j].textContent?.trim();
      if (txt) texts.push(txt);
    }
    const title = texts.length > 0 ? texts[0] : `Slide ${i + 1}`;
    slides.push({
      slideIndex: i + 1,
      title,
      texts: texts.length > 1 ? texts.slice(1) : texts,
    });
  }

  return slides;
}

/**
 * Renders PowerPoint slides into a landscape presentation PDF
 */
async function generatePdfFromPptxSlides(
  slides: { slideIndex: number; title: string; texts: string[] }[],
  presentationTitle: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 841.89; // Landscape A4
  const pageHeight = 595.28;
  const margin = 50;

  for (const slide of slides) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Top presentation banner
    page.drawRectangle({
      x: 0,
      y: pageHeight - 50,
      width: pageWidth,
      height: 50,
      color: rgb(0.12, 0.22, 0.45),
    });

    page.drawText(`${presentationTitle} — Slide ${slide.slideIndex}`, {
      x: margin,
      y: pageHeight - 32,
      size: 13,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    // Slide Title
    page.drawText(slide.title.slice(0, 70), {
      x: margin,
      y: pageHeight - 110,
      size: 22,
      font: boldFont,
      color: rgb(0.15, 0.15, 0.25),
    });

    // Slide bullets
    let y = pageHeight - 160;
    for (const text of slide.texts) {
      if (y < margin + 30) break;
      page.drawText(`• ${text.slice(0, 95)}`, {
        x: margin + 15,
        y,
        size: 13,
        font,
        color: rgb(0.25, 0.25, 0.3),
      });
      y -= 26;
    }
  }

  return await pdfDoc.save();
}

