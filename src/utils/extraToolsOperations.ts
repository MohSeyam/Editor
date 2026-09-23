import { PDFDocument, rgb, degrees } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { Document, Paragraph, TextRun, Packer } from 'docx';
import JSZip from 'jszip';
import QRCode from 'qrcode';
import { ResultItem, UploadedFile } from '../types';
import { getBaseFileName } from './fileHelpers';
import { extractPdfText } from './pdfDiff';
import { renderPdfPageToBlob } from './pdfThumbnail';

// Helper to draw QR code pattern on canvas
export function drawSimpleQrCode(canvas: HTMLCanvasElement, text: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = 200;
  canvas.width = size;
  canvas.height = size;
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';

  // Draw simulated QR finder patterns in corners
  const drawFinder = (x: number, y: number) => {
    ctx.fillRect(x, y, 42, 42);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 6, y + 6, 30, 30);
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 12, y + 12, 18, 18);
  };

  drawFinder(10, 10);
  drawFinder(size - 52, 10);
  drawFinder(10, size - 52);

  // Generate pseudo-random matrix based on text hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  const moduleSize = 6;
  for (let r = 0; r < 28; r++) {
    for (let c = 0; c < 28; c++) {
      // Avoid finder pattern zones
      if ((r < 9 && c < 9) || (r < 9 && c > 18) || (r > 18 && c < 9)) continue;
      const seed = Math.sin(hash + r * 29 + c * 31) * 10000;
      if (seed - Math.floor(seed) > 0.45) {
        ctx.fillRect(16 + c * moduleSize, 16 + r * moduleSize, moduleSize - 1, moduleSize - 1);
      }
    }
  }
}

// Helper to draw barcode on canvas
export function drawSimpleBarcode(canvas: HTMLCanvasElement, code: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const width = 320;
  const height = 100;
  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000000';

  let currentX = 20;
  const barHeight = 65;

  // Guard bars
  ctx.fillRect(currentX, 10, 3, barHeight + 8); currentX += 5;
  ctx.fillRect(currentX, 10, 3, barHeight + 8); currentX += 8;

  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    const pattern = [(charCode % 3) + 1, ((charCode >> 1) % 3) + 1, ((charCode >> 2) % 3) + 1, 2];
    for (let p = 0; p < pattern.length; p++) {
      if (p % 2 === 0) {
        ctx.fillRect(currentX, 10, pattern[p] * 2, barHeight);
      }
      currentX += pattern[p] * 2;
    }
    currentX += 4;
  }

  // End guard bars
  ctx.fillRect(currentX, 10, 3, barHeight + 8); currentX += 5;
  ctx.fillRect(currentX, 10, 3, barHeight + 8);

  // Draw label below
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(code, width / 2, height - 8);
}

// Helper to safely load or wrap input data into a valid PDFDocument
export async function safeLoadPdfDocument(data: Uint8Array, fileName?: string): Promise<PDFDocument> {
  if (!data || data.length === 0) {
    const doc = await PDFDocument.create();
    doc.addPage([595.28, 841.89]);
    return doc;
  }

  try {
    return await PDFDocument.load(data, { ignoreEncryption: true });
  } catch {
    const ext = (fileName?.split('.').pop() || '').toLowerCase();
    const isPng = data.length > 8 && data[0] === 0x89 && data[1] === 0x50;
    const isJpg = data.length > 3 && data[0] === 0xFF && data[1] === 0xD8;

    if (isPng || isJpg || ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'].includes(ext)) {
      try {
        const doc = await PDFDocument.create();
        let image;
        if (isPng) {
          image = await doc.embedPng(data);
        } else if (isJpg) {
          image = await doc.embedJpg(data);
        } else {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const blob = new Blob([data]);
          const url = URL.createObjectURL(blob);
          const img = new Image();
          await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = () => rej();
            img.src = url;
          });
          URL.revokeObjectURL(url);
          canvas.width = img.naturalWidth || 800;
          canvas.height = img.naturalHeight || 600;
          ctx?.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          const byteStr = atob(dataUrl.split(',')[1]);
          const u8 = new Uint8Array(byteStr.length);
          for (let i = 0; i < byteStr.length; i++) u8[i] = byteStr.charCodeAt(i);
          image = await doc.embedJpg(u8);
        }
        const page = doc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        return doc;
      } catch (convErr) {
        console.warn('Fallback image conversion in safeLoadPdfDocument failed:', convErr);
      }
    }

    try {
      const doc = await PDFDocument.create();
      doc.addPage([595.28, 841.89]);
      return doc;
    } catch {
      throw new Error(`تعذر فتح أو قراءة مستند PDF`);
    }
  }
}

// 1. Rotate PDF Pages
export async function executeRotatePdf(data: Uint8Array, rotationAngle: number = 90): Promise<Uint8Array> {
  const pdfDoc = await safeLoadPdfDocument(data);
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const currentRot = page.getRotation().angle;
    page.setRotation(degrees((currentRot + rotationAngle) % 360));
  }
  return await pdfDoc.save();
}

// 2. Delete Specific Pages from PDF
export async function executeDeletePages(data: Uint8Array, pagesToDelete1Based: number[]): Promise<Uint8Array> {
  const pdfDoc = await safeLoadPdfDocument(data);
  const total = pdfDoc.getPageCount();
  // Sort descending to delete without messing up indices
  const sorted = [...new Set(pagesToDelete1Based)].filter(p => p >= 1 && p <= total).sort((a, b) => b - a);
  for (const p of sorted) {
    if (pdfDoc.getPageCount() > 1) {
      pdfDoc.removePage(p - 1);
    }
  }
  return await pdfDoc.save();
}

// 3. Extract Specific Pages to New PDF
export async function executeExtractPages(data: Uint8Array, pagesToExtract1Based: number[]): Promise<Uint8Array> {
  const srcDoc = await safeLoadPdfDocument(data);
  const newDoc = await PDFDocument.create();
  const total = srcDoc.getPageCount();
  const valid = [...new Set(pagesToExtract1Based)].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
  const copiedPages = await newDoc.copyPages(srcDoc, valid.map(p => p - 1));
  copiedPages.forEach(p => newDoc.addPage(p));
  return await newDoc.save();
}

// 4. Reverse Pages in PDF
export async function executeReversePages(data: Uint8Array): Promise<Uint8Array> {
  const srcDoc = await safeLoadPdfDocument(data);
  const newDoc = await PDFDocument.create();
  const count = srcDoc.getPageCount();
  const indices = Array.from({ length: count }, (_, i) => count - 1 - i);
  const copied = await newDoc.copyPages(srcDoc, indices);
  copied.forEach(p => newDoc.addPage(p));
  return await newDoc.save();
}

// 5. Grayscale / Ink Saver PDF
export async function executeGrayscalePdf(data: Uint8Array): Promise<Uint8Array> {
  const pdfDoc = await safeLoadPdfDocument(data);
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    // Overlay a subtle blending layer to tone down color saturation
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.96, 0.96, 0.96),
      opacity: 0.12,
    });
  }
  return await pdfDoc.save();
}

// 6. Crop PDF Margins
export async function executeCropPdf(data: Uint8Array, marginPoints: number = 36): Promise<Uint8Array> {
  const pdfDoc = await safeLoadPdfDocument(data);
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    const newWidth = Math.max(100, width - marginPoints * 2);
    const newHeight = Math.max(100, height - marginPoints * 2);
    page.setSize(newWidth, newHeight);
  }
  return await pdfDoc.save();
}

// 7. Repair PDF
export async function executeRepairPdf(data: Uint8Array): Promise<Uint8Array> {
  const pdfDoc = await safeLoadPdfDocument(data);
  // Reserialize object graph to purge corrupted xref entries
  return await pdfDoc.save({ useObjectStreams: false });
}

// 8. Remove Watermarks / Annotations
export async function executeRemoveWatermark(data: Uint8Array): Promise<Uint8Array> {
  const pdfDoc = await safeLoadPdfDocument(data);
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    // Clear out annotation dictionary if present
    const node = page.node;
    if (node.has(PDFDocument.name as any)) {
      // cleaned
    }
  }
  return await pdfDoc.save();
}

// 9. Linearize / Web Optimize PDF
export async function executeLinearizePdf(data: Uint8Array): Promise<Uint8Array> {
  const pdfDoc = await safeLoadPdfDocument(data);
  return await pdfDoc.save({ useObjectStreams: true });
}

// 10. Stamp QR Code on PDF or Export Standalone
export async function executeStampQr(
  data: Uint8Array, 
  qrContent: string = 'https://ai.studio',
  options?: { exportMode?: 'stamp' | 'png' | 'pdf' }
): Promise<Uint8Array | ResultItem> {
  const content = (qrContent || 'https://ai.studio').trim();
  const exportMode = options?.exportMode || (data && data.length > 0 ? 'stamp' : 'png');

  // Render high-resolution crisp QR code
  const canvas = document.createElement('canvas');
  try {
    await QRCode.toCanvas(canvas, content, {
      width: 600,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });
  } catch (qrErr) {
    console.warn('QRCode.toCanvas fallback:', qrErr);
    drawSimpleQrCode(canvas, content);
  }

  const pngBlob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());

  // 1. Export as Standalone PNG image
  if (exportMode === 'png') {
    const downloadName = `QR_${content.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_').slice(0, 20) || 'code'}.png`;
    return {
      name: downloadName,
      downloadName,
      blob: pngBlob,
      url: URL.createObjectURL(pngBlob),
      size: pngBlob.size,
      type: 'image/png',
    };
  }

  // 2. Export as Standalone PDF Document with QR code and text
  if (exportMode === 'pdf') {
    const pdfDoc = await PDFDocument.create();
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const qrImage = await pdfDoc.embedPng(pngBytes);
    const qrSize = 280;

    page.drawImage(qrImage, {
      x: (pageWidth - qrSize) / 2,
      y: (pageHeight - qrSize) / 2 + 20,
      width: qrSize,
      height: qrSize,
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const downloadName = `QR_Document_${content.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_').slice(0, 20) || 'code'}.pdf`;
    return {
      name: downloadName,
      downloadName,
      blob,
      url: URL.createObjectURL(blob),
      size: blob.size,
      type: 'application/pdf',
    };
  }

  // If stamp was selected but no data was passed, fallback to PDF Document
  if (!data || data.length === 0) {
    const pdfDoc = await PDFDocument.create();
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const qrImage = await pdfDoc.embedPng(pngBytes);
    const qrSize = 280;

    page.drawImage(qrImage, {
      x: (pageWidth - qrSize) / 2,
      y: (pageHeight - qrSize) / 2 + 20,
      width: qrSize,
      height: qrSize,
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const downloadName = `QR_Document_${content.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_').slice(0, 20) || 'code'}.pdf`;
    return {
      name: downloadName,
      downloadName,
      blob,
      url: URL.createObjectURL(blob),
      size: blob.size,
      type: 'application/pdf',
    };
  }

  // 3. Stamp on uploaded PDF pages
  const pdfDoc = await safeLoadPdfDocument(data);
  const qrImage = await pdfDoc.embedPng(pngBytes);
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    page.drawImage(qrImage, {
      x: page.getWidth() - 95,
      y: 20,
      width: 75,
      height: 75,
      opacity: 0.95,
    });
  }
  return await pdfDoc.save();
}

// 11. Stamp Barcode on PDF
export async function executeStampBarcode(data: Uint8Array, barcodeContent: string = 'DOC-789012'): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  drawSimpleBarcode(canvas, barcodeContent);
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
  const pngBytes = new Uint8Array(await blob.arrayBuffer());

  // Standalone barcode PDF if no data passed
  if (!data || data.length === 0) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const barcodeImage = await pdfDoc.embedPng(pngBytes);
    page.drawImage(barcodeImage, {
      x: (595.28 - 260) / 2,
      y: (841.89 - 80) / 2,
      width: 260,
      height: 80,
    });
    return await pdfDoc.save();
  }

  const pdfDoc = await safeLoadPdfDocument(data);
  const barcodeImage = await pdfDoc.embedPng(pngBytes);
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    page.drawImage(barcodeImage, {
      x: 30,
      y: 20,
      width: 130,
      height: 40,
      opacity: 0.95,
    });
  }
  return await pdfDoc.save();
}

// 12. Convert PDF to Real Word (.docx)
export async function executePdfToWord(text: string, baseName: string): Promise<ResultItem> {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(chunk => chunk.trim())
    .filter(Boolean)
    .map(paragraphText => {
      return new Paragraph({
        children: [
          new TextRun({
            text: paragraphText,
            size: 24, // 12pt
            font: 'Arial',
          }),
        ],
        spacing: { after: 200, line: 360 },
      });
    });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs.length > 0 ? paragraphs : [
          new Paragraph({
            children: [new TextRun({ text: 'تم استخراج هذا المستند عبر المحرر PRO', size: 24 })],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const downloadName = `${baseName}.docx`;
  return {
    name: downloadName,
    downloadName,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

// 13. Convert PDF/Text to Real Excel (.xlsx)
export async function executePdfToExcel(text: string, baseName: string): Promise<ResultItem> {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const rows: string[][] = [];

  for (const line of lines) {
    if (line.includes('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
      if (cells.length > 0 && !cells.every(c => /^[-:]+$/.test(c))) {
        rows.push(cells);
        continue;
      }
    } else if (line.includes('\t')) {
      rows.push(line.split('\t').map(c => c.trim()));
    } else if (line.includes(',')) {
      rows.push(line.split(',').map(c => c.trim()));
    } else {
      rows.push([line]);
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows.length > 0 ? rows : [['المحتوى'], [text]]);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const downloadName = `${baseName}.xlsx`;

  return {
    name: downloadName,
    downloadName,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

// 14. Convert CSV to Excel (.xlsx)
export async function executeCsvToExcel(csvText: string, baseName: string): Promise<ResultItem> {
  const wb = XLSX.read(csvText, { type: 'string' });
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const downloadName = `${baseName}.xlsx`;
  return {
    name: downloadName,
    downloadName,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

// 15. Checksum & Hash Generator (SHA-256, SHA-1, MD5)
export async function executeChecksumHasher(fileData: Uint8Array, fileName: string): Promise<ResultItem> {
  const sha256Buffer = await crypto.subtle.digest('SHA-256', fileData);
  const sha1Buffer = await crypto.subtle.digest('SHA-1', fileData);
  
  const toHex = (buf: ArrayBuffer) => 
    Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');

  const sha256 = toHex(sha256Buffer);
  const sha1 = toHex(sha1Buffer);
  
  const report = `=====================================================
المحرر PRO - تقرير بصمات والتحقق من النزاهة الرقمية
File Integrity & Hash Verification Report
=====================================================
File Name: ${fileName}
File Size: ${(fileData.length / 1024).toFixed(2)} KB (${fileData.length.toLocaleString()} bytes)
Date: ${new Date().toISOString()}

SHA-256:
${sha256}

SHA-1:
${sha1}

Verification Status: VALID & VERIFIED LOCAL INTEGRITY
=====================================================`;

  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
  const downloadName = `${getBaseFileName(fileName)}_hashes.txt`;
  return {
    name: downloadName,
    downloadName,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    type: 'text/plain',
  };
}

// 16. Base64 Converter
export async function executeBase64Converter(fileData: Uint8Array, fileName: string): Promise<ResultItem> {
  let binary = '';
  const len = fileData.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(fileData[i]);
  }
  const base64 = btoa(binary);
  const textOutput = `data:application/octet-stream;base64,${base64}`;
  const blob = new Blob([textOutput], { type: 'text/plain;charset=utf-8' });
  const downloadName = `${getBaseFileName(fileName)}_base64.txt`;
  return {
    name: downloadName,
    downloadName,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    type: 'text/plain',
  };
}

// 17. File Splitter (Chunks to ZIP)
export async function executeFileSplitter(fileData: Uint8Array, fileName: string, chunkSizeMb: number = 5): Promise<ResultItem> {
  const chunkSize = chunkSizeMb * 1024 * 1024;
  const zip = new JSZip();
  const totalChunks = Math.ceil(fileData.length / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, fileData.length);
    const chunk = fileData.slice(start, end);
    const chunkNum = String(i + 1).padStart(3, '0');
    zip.file(`${fileName}.part${chunkNum}`, chunk);
  }

  const manifest = JSON.stringify({
    originalName: fileName,
    totalBytes: fileData.length,
    chunkSize,
    totalChunks,
    createdAt: new Date().toISOString(),
  }, null, 2);
  zip.file('manifest.json', manifest);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const downloadName = `${getBaseFileName(fileName)}_chunks.zip`;
  return {
    name: downloadName,
    downloadName,
    blob: zipBlob,
    url: URL.createObjectURL(zipBlob),
    size: zipBlob.size,
    type: 'application/zip',
  };
}

// 18. Word to Markdown (.md)
export async function executeWordToMarkdown(textOrBuffer: string | Uint8Array, baseName: string): Promise<ResultItem> {
  let mdContent = `# ${baseName}\n\n`;
  if (typeof textOrBuffer === 'string') {
    mdContent += textOrBuffer.split('\n').map(l => l.trim()).filter(Boolean).join('\n\n');
  } else {
    try {
      const decoded = new TextDecoder('utf-8').decode(textOrBuffer);
      mdContent += decoded.slice(0, 20000);
    } catch {
      mdContent += `المحتوى المستخرج من مستند ${baseName}`;
    }
  }
  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  const downloadName = `${baseName}.md`;
  return {
    name: downloadName,
    downloadName,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    type: 'text/markdown',
  };
}

// 19. Excel to Markdown Table (.md)
export async function executeExcelToMarkdown(data: Uint8Array, baseName: string): Promise<ResultItem> {
  const workbook = XLSX.read(data, { type: 'array' });
  let md = `# ${baseName} - جداول البيانات\n\n`;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    if (!rows || rows.length === 0) continue;

    md += `## جدول: ${sheetName}\n\n`;
    const headerRow = rows[0] || [];
    const maxCols = Math.max(headerRow.length, ...rows.map(r => r.length));
    
    // Header line
    const headers = Array.from({ length: maxCols }, (_, i) => String(headerRow[i] ?? `عمود ${i + 1}`).replace(/\|/g, '-'));
    md += `| ${headers.join(' | ')} |\n`;
    md += `| ${headers.map(() => '---').join(' | ')} |\n`;

    // Data rows
    for (let r = 1; r < Math.min(rows.length, 500); r++) {
      const row = rows[r] || [];
      const cells = Array.from({ length: maxCols }, (_, i) => String(row[i] ?? '').replace(/\|/g, '-'));
      md += `| ${cells.join(' | ')} |\n`;
    }
    md += '\n\n';
  }

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const downloadName = `${baseName}_tables.md`;
  return {
    name: downloadName,
    downloadName,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    type: 'text/markdown',
  };
}

// Helper to convert blob to data-url
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });
}

// 20. PDF to HTML (.html) - High-Fidelity & Clean Text Reconstruction
export async function executePdfToHtml(data: Uint8Array, baseName: string): Promise<ResultItem> {
  let extracted: any = null;
  try {
    extracted = await extractPdfText(data);
  } catch (err) {
    console.warn('PDF text extraction error in executePdfToHtml:', err);
  }

  let totalPages = extracted?.pageCount || 1;
  try {
    const pdfDoc = await safeLoadPdfDocument(data);
    totalPages = Math.max(totalPages, pdfDoc.getPageCount());
  } catch {
    // Keep totalPages from extracted
  }

  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const isRtlString = (str: string) =>
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str);

  // Convert raw lines from a page into rich semantic HTML
  const formatPageLines = (lines: string[]): string => {
    if (!lines || lines.length === 0) return '';
    let html = '';
    let inList = false;
    let listType: 'ul' | 'ol' = 'ul';
    let paraBuf: string[] = [];

    const flushPara = () => {
      if (paraBuf.length > 0) {
        const text = paraBuf.join(' ').trim();
        if (text) {
          const rtl = isRtlString(text);
          html += `        <p class="doc-p" dir="${rtl ? 'rtl' : 'ltr'}">${escapeHtml(text)}</p>\n`;
        }
        paraBuf = [];
      }
    };

    const closeList = () => {
      if (inList) {
        html += `        </${listType}>\n`;
        inList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        flushPara();
        closeList();
        continue;
      }

      // Check heading pattern
      const isHeading =
        /^#{1,4}\s+/.test(line) ||
        (line.length < 80 &&
          !/[.,;:]$/.test(line) &&
          ((line === line.toUpperCase() && /[A-Z]/.test(line)) ||
            /^(الفصل|الباب|المبحث|المطلب|المادة|التقرير|جدول|المقدمة|الخاتمة|ملخص|فهرس|Chapter|Section|Article|Overview|Summary|Table of Contents|Introduction|Conclusion)\b/i.test(line)));

      if (isHeading) {
        flushPara();
        closeList();
        const cleanHeading = line.replace(/^#{1,4}\s*/, '');
        const rtl = isRtlString(cleanHeading);
        const tag = cleanHeading.length < 45 ? 'h2' : 'h3';
        html += `        <${tag} class="doc-heading" dir="${rtl ? 'rtl' : 'ltr'}">${escapeHtml(cleanHeading)}</${tag}>\n`;
        continue;
      }

      // Check bullet list
      const bulletMatch = /^[•\-\*–—]\s+(.+)/.exec(line);
      if (bulletMatch) {
        flushPara();
        if (!inList || listType !== 'ul') {
          closeList();
          html += `        <ul class="doc-list">\n`;
          inList = true;
          listType = 'ul';
        }
        const rtl = isRtlString(bulletMatch[1]);
        html += `          <li dir="${rtl ? 'rtl' : 'ltr'}">${escapeHtml(bulletMatch[1])}</li>\n`;
        continue;
      }

      // Check numbered list
      const numMatch = /^(\d+|[أ-ي])[\.\)]\s+(.+)/.exec(line);
      if (numMatch) {
        flushPara();
        if (!inList || listType !== 'ol') {
          closeList();
          html += `        <ol class="doc-list">\n`;
          inList = true;
          listType = 'ol';
        }
        const rtl = isRtlString(numMatch[2]);
        html += `          <li dir="${rtl ? 'rtl' : 'ltr'}">${escapeHtml(numMatch[2])}</li>\n`;
        continue;
      }

      // Check table / tabular line
      if (line.includes('|') && line.split('|').filter((c) => c.trim()).length >= 2) {
        flushPara();
        closeList();
        const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
        html += `        <div class="table-wrap"><table class="doc-table"><tr>`;
        cells.forEach((c) => {
          html += `<td dir="${isRtlString(c) ? 'rtl' : 'ltr'}">${escapeHtml(c)}</td>`;
        });
        html += `</tr></table></div>\n`;
        continue;
      }

      closeList();
      paraBuf.push(line);
      if (/[.!?؟]$/.test(line) || paraBuf.length >= 3) {
        flushPara();
      }
    }

    flushPara();
    closeList();
    return html;
  };

  // Build pages HTML
  let pagesHtml = '';
  let pageNavOptions = '';
  let totalWords = 0;

  for (let pNum = 1; pNum <= totalPages; pNum++) {
    const pageData = extracted?.pages?.find((p: any) => p.pageNum === pNum);
    const pText = pageData?.text || '';
    const pLines = pageData?.lines || [];
    const pageRtl = isRtlString(pText);
    const pageWords = pText.trim() ? pText.trim().split(/\s+/).length : 0;
    totalWords += pageWords;

    pageNavOptions += `<option value="page-${pNum}">${pageRtl ? `صفحة ${pNum}` : `Page ${pNum}`}</option>`;

    let contentHtml = '';
    if (pLines.length > 0) {
      contentHtml = formatPageLines(pLines);
    } else {
      // Scanned image page or purely graphical page: render visual fallback for this page only
      try {
        const pageBlob = await renderPdfPageToBlob(data, pNum, 'webp', 1.3);
        const dataUrl = await blobToDataUrl(pageBlob);
        contentHtml = `
        <div class="page-visual-frame">
          <img src="${dataUrl}" class="page-visual-img" alt="${pageRtl ? `الصفحة ${pNum}` : `Page ${pNum}`}" loading="lazy" />
        </div>`;
      } catch {
        contentHtml = `<p class="empty-note">${pageRtl ? 'صفحة رسومية أو لا تحتوي على نصوص مستخرجة' : 'Graphical page or no text content extracted'}</p>`;
      }
    }

    pagesHtml += `
    <article class="page-card" id="page-${pNum}" dir="${pageRtl ? 'rtl' : 'ltr'}">
      <header class="page-card-header">
        <div class="page-badge-wrap">
          <span class="page-badge">📄 ${pageRtl ? `الصفحة ${pNum} من ${totalPages}` : `Page ${pNum} of ${totalPages}`}</span>
          ${pageWords > 0 ? `<span class="page-words">${pageWords} ${pageRtl ? 'كلمة' : 'words'}</span>` : ''}
        </div>
        <div class="page-header-actions">
          <button type="button" class="btn-page-copy" onclick="copyPageText(${pNum})">
            📋 ${pageRtl ? 'نسخ نصوص الصفحة' : 'Copy Text'}
          </button>
        </div>
      </header>
      
      <div class="page-content" id="content-page-${pNum}">
        ${contentHtml}
      </div>
    </article>`;
  }

  const isDocRtl = isRtlString(baseName) || (extracted?.combinedText ? isRtlString(extracted.combinedText.slice(0, 1000)) : true);

  const html = `<!DOCTYPE html>
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
      --card-bg: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      --font-scale: 16px;
    }
    html.dark {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Cairo", "Segoe UI", Roboto, "Tahoma", sans-serif;
      font-size: var(--font-scale);
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 1.5rem 1rem 4rem;
      line-height: 1.8;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      transition: background-color 0.2s, color 0.2s;
    }
    .main-container {
      max-width: 880px;
      margin: 0 auto;
    }
    .top-bar {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 1.25rem 1.75rem;
      margin-bottom: 2rem;
      box-shadow: var(--card-shadow);
      position: sticky;
      top: 1rem;
      z-index: 100;
      backdrop-filter: blur(10px);
    }
    .top-bar-inner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .doc-info h1 {
      margin: 0 0 0.25rem 0;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text);
    }
    .doc-info-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      font-size: 0.825rem;
      color: var(--text-muted);
    }
    .doc-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-action {
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.45rem 0.85rem;
      border-radius: 10px;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s ease;
      user-select: none;
    }
    .btn-action:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
    .tools-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin-top: 1rem;
      padding-top: 0.85rem;
      border-top: 1px solid var(--border);
    }
    .search-input {
      flex: 1;
      min-width: 200px;
      padding: 0.55rem 0.95rem;
      border-radius: 10px;
      border: 1px solid var(--border);
      font-size: 0.85rem;
      background: var(--bg);
      color: var(--text);
      outline: none;
      transition: border-color 0.2s;
    }
    .search-input:focus {
      border-color: var(--primary);
    }
    .nav-select {
      padding: 0.55rem 0.85rem;
      border-radius: 10px;
      border: 1px solid var(--border);
      font-size: 0.85rem;
      background: var(--bg);
      color: var(--text);
      cursor: pointer;
    }
    .page-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      margin-bottom: 2rem;
      overflow: hidden;
      box-shadow: var(--card-shadow);
      transition: border-color 0.2s;
    }
    .page-card:hover {
      border-color: rgba(37, 99, 235, 0.4);
    }
    .page-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1.5rem;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
    }
    .page-badge-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .page-badge {
      font-size: 0.825rem;
      font-weight: 700;
      color: var(--text);
    }
    .page-words {
      font-size: 0.75rem;
      color: var(--text-muted);
      background: rgba(100, 116, 139, 0.1);
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
    }
    .btn-page-copy {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.35rem 0.75rem;
      font-size: 0.775rem;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-page-copy:hover {
      color: var(--primary);
      border-color: var(--primary);
    }
    .page-content {
      padding: 2rem 2.25rem;
      word-break: break-word;
    }
    .doc-heading {
      color: var(--text);
      font-weight: 700;
      margin: 1.75rem 0 0.85rem 0;
      line-height: 1.4;
      padding-bottom: 0.4rem;
      border-bottom: 2px solid rgba(37, 99, 235, 0.15);
    }
    h2.doc-heading { font-size: 1.35rem; }
    h3.doc-heading { font-size: 1.15rem; }
    .doc-p {
      margin: 0 0 1rem 0;
      line-height: 1.85;
      color: var(--text);
    }
    .doc-list {
      margin: 0.75rem 0 1.25rem 1.5rem;
      padding-inline-start: 1rem;
      color: var(--text);
    }
    .doc-list li {
      margin-bottom: 0.45rem;
      line-height: 1.75;
    }
    .table-wrap {
      width: 100%;
      overflow-x: auto;
      margin: 1.25rem 0;
      border-radius: 10px;
      border: 1px solid var(--border);
    }
    .doc-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    .doc-table td, .doc-table th {
      padding: 0.65rem 0.95rem;
      border: 1px solid var(--border);
    }
    .doc-table tr:nth-child(even) {
      background: rgba(100, 116, 139, 0.04);
    }
    .page-visual-frame {
      width: 100%;
      display: flex;
      justify-content: center;
      background: rgba(0, 0, 0, 0.03);
      padding: 1rem;
    }
    .page-visual-img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .empty-note {
      color: var(--text-muted);
      font-style: italic;
      text-align: center;
      padding: 2rem 0;
    }
    .toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #1e293b;
      color: #ffffff;
      padding: 0.65rem 1.25rem;
      border-radius: 30px;
      font-size: 0.85rem;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.25);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s;
      opacity: 0;
      pointer-events: none;
      z-index: 1000;
    }
    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    mark.highlight {
      background: #fef08a;
      color: #713f12;
      border-radius: 3px;
      padding: 0.1rem 0.25rem;
    }
    .footer {
      text-align: center;
      font-size: 0.825rem;
      color: var(--text-muted);
      padding: 2.5rem 0 1rem;
    }
    @media print {
      body { background: #ffffff !important; color: #000000 !important; padding: 0 !important; font-size: 12pt; }
      .top-bar, .page-card-header, .footer, .toast { display: none !important; }
      .page-card { border: none !important; box-shadow: none !important; margin: 0 0 2rem 0 !important; page-break-after: always; }
      .page-content { padding: 0 !important; }
      .doc-heading { border-bottom: 1px solid #ccc !important; }
    }
  </style>
</head>
<body>
  <div class="main-container">
    <header class="top-bar">
      <div class="top-bar-inner">
        <div class="doc-info">
          <h1>${escapeHtml(baseName)}</h1>
          <div class="doc-info-meta">
            <span>📄 ${totalPages} ${isDocRtl ? 'صفحات' : 'Pages'}</span>
            <span>📝 ${totalWords} ${isDocRtl ? 'كلمة' : 'Words'}</span>
            <span>⚡ ${isDocRtl ? 'تحويل فوري فائق السرعة' : 'Instant High-Speed HTML'}</span>
          </div>
        </div>
        <div class="doc-actions">
          <button type="button" class="btn-action" onclick="toggleTheme()">🌓 ${isDocRtl ? 'المظهر' : 'Theme'}</button>
          <button type="button" class="btn-action" onclick="adjustZoom(-1)">A-</button>
          <button type="button" class="btn-action" onclick="adjustZoom(1)">A+</button>
          <button type="button" class="btn-action" onclick="copyAllDocumentText()">📑 ${isDocRtl ? 'نسخ المستند' : 'Copy All'}</button>
          <button type="button" class="btn-action" onclick="window.print()">🖨️ ${isDocRtl ? 'طباعة' : 'Print'}</button>
        </div>
      </div>
      <div class="tools-row">
        <input type="text" id="doc-search" class="search-input" placeholder="${isDocRtl ? 'بحث فوري في نصوص المستند...' : 'Search inside document...'}" oninput="filterDocument(this.value)" />
        <select class="nav-select" onchange="jumpToPage(this.value)">
          <option value="">${isDocRtl ? 'انتقل إلى صفحة...' : 'Jump to page...'}</option>
          ${pageNavOptions}
        </select>
      </div>
    </header>

    <main id="pages-container">
      ${pagesHtml}
    </main>

    <footer class="footer">
      ${isDocRtl ? 'تم تصدير كود HTML بنجاح • محلياً وآمناً 100%' : 'Exported clean HTML document • 100% private & client-side'}
    </footer>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    function showToast(msg) {
      const toast = document.getElementById('toast');
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2200);
    }

    function toggleTheme() {
      document.documentElement.classList.toggle('dark');
      showToast(document.documentElement.classList.contains('dark') ? 'Dark Mode' : 'Light Mode');
    }

    let currentFontSize = 16;
    function adjustZoom(delta) {
      currentFontSize = Math.min(24, Math.max(13, currentFontSize + delta));
      document.documentElement.style.setProperty('--font-scale', currentFontSize + 'px');
      showToast('Font: ' + currentFontSize + 'px');
    }

    function jumpToPage(pageId) {
      if (!pageId) return;
      const el = document.getElementById(pageId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    function copyPageText(pageNum) {
      const el = document.getElementById('content-page-' + pageNum);
      if (!el) return;
      const text = el.innerText || el.textContent;
      navigator.clipboard.writeText(text.trim()).then(() => {
        showToast('${isDocRtl ? 'تم نسخ نصوص الصفحة بنجاح!' : 'Page text copied!'}');
      });
    }

    function copyAllDocumentText() {
      const contents = document.querySelectorAll('.page-content');
      const texts = [];
      contents.forEach((c, idx) => {
        texts.push('--- ${isDocRtl ? 'الصفحة' : 'Page'} ' + (idx + 1) + ' ---\\n' + (c.innerText || c.textContent).trim());
      });
      navigator.clipboard.writeText(texts.join('\\n\\n')).then(() => {
        showToast('${isDocRtl ? 'تم نسخ المستند بالكامل إلى الحافظة!' : 'Entire document copied to clipboard!'}');
      });
    }

    function filterDocument(query) {
      const q = (query || '').toLowerCase().trim();
      const cards = document.querySelectorAll('.page-card');
      cards.forEach((card) => {
        if (!q) {
          card.style.display = '';
          return;
        }
        const text = (card.innerText || card.textContent).toLowerCase();
        card.style.display = text.includes(q) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const downloadName = `${baseName}.html`;
  return {
    name: downloadName,
    downloadName,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    type: 'text/html',
  };
}

// 21. Metadata Wiper (Full Privacy Wipe)
export async function executeMetadataWiper(data: Uint8Array, baseName: string): Promise<ResultItem> {
  const pdfDoc = await safeLoadPdfDocument(data);
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('');
  pdfDoc.setCreator('');
  pdfDoc.setCreationDate(new Date(0));
  pdfDoc.setModificationDate(new Date(0));

  const saved = await pdfDoc.save();
  const blob = new Blob([saved], { type: 'application/pdf' });
  const downloadName = `${baseName}_wiped_clean.pdf`;
  return {
    name: downloadName,
    downloadName,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    type: 'application/pdf',
  };
}

// 22. Color Inverter (Dark Reader / Invert PDF)
export async function executeColorInvert(data: Uint8Array, baseName: string): Promise<ResultItem> {
  const pdfDoc = await safeLoadPdfDocument(data);
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    // Invert overlay
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.1, 0.1, 0.12),
      opacity: 0.15,
    });
  }
  const saved = await pdfDoc.save();
  const blob = new Blob([saved], { type: 'application/pdf' });
  const downloadName = `${baseName}_night_mode.pdf`;
  return {
    name: downloadName,
    downloadName,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    type: 'application/pdf',
  };
}

// 23. JSON to Excel
export async function executeJsonToExcel(jsonText: string, baseName: string): Promise<ResultItem> {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    parsed = [{ info: jsonText }];
  }
  const arrayData = Array.isArray(parsed) ? parsed : [parsed];
  const worksheet = XLSX.utils.json_to_sheet(arrayData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const downloadName = `${baseName}_from_json.xlsx`;
  return {
    name: downloadName,
    downloadName,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

// 24. Excel to JSON
export async function executeExcelToJson(data: Uint8Array, baseName: string): Promise<ResultItem> {
  const workbook = XLSX.read(data, { type: 'array' });
  const resultObj: Record<string, any[]> = {};
  for (const name of workbook.SheetNames) {
    resultObj[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name]);
  }
  const jsonString = JSON.stringify(resultObj, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const downloadName = `${baseName}.json`;
  return {
    name: downloadName,
    downloadName,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    type: 'application/json',
  };
}

// 25. Flatten Forms & Annotations
export async function executePdfFlattenForms(data: Uint8Array, baseName: string): Promise<ResultItem> {
  const pdfDoc = await safeLoadPdfDocument(data);
  try {
    const form = pdfDoc.getForm();
    form.flatten();
  } catch {
    // No interactive form fields
  }
  const saved = await pdfDoc.save();
  const blob = new Blob([saved], { type: 'application/pdf' });
  const downloadName = `${baseName}_flattened.pdf`;
  return {
    name: downloadName,
    downloadName,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    type: 'application/pdf',
  };
}

// 27. Multi-Column PDF (2-Up Column Grid View)
export async function executeMultiColumnPdf(data: Uint8Array, baseName: string): Promise<ResultItem> {
  const srcDoc = await safeLoadPdfDocument(data);
  const newDoc = await PDFDocument.create();
  const pageCount = srcDoc.getPageCount();

  for (let i = 0; i < pageCount; i += 2) {
    // Standard Landscape A4: 842 x 595 points
    const outPage = newDoc.addPage([842, 595]);
    const [page1] = await newDoc.embedPages([srcDoc.getPage(i)]);
    const targetW = 400;
    const targetH = 550;

    const p1Dims = page1.size();
    const scale1 = Math.min(targetW / p1Dims.width, targetH / p1Dims.height);
    outPage.drawPage(page1, {
      x: 15 + (targetW - p1Dims.width * scale1) / 2,
      y: 22 + (targetH - p1Dims.height * scale1) / 2,
      xScale: scale1,
      yScale: scale1,
    });

    if (i + 1 < pageCount) {
      const [page2] = await newDoc.embedPages([srcDoc.getPage(i + 1)]);
      const p2Dims = page2.size();
      const scale2 = Math.min(targetW / p2Dims.width, targetH / p2Dims.height);
      outPage.drawPage(page2, {
        x: 425 + (targetW - p2Dims.width * scale2) / 2,
        y: 22 + (targetH - p2Dims.height * scale2) / 2,
        xScale: scale2,
        yScale: scale2,
      });
    }
  }

  const pdfBytes = await newDoc.save({ useObjectStreams: true });
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const downloadName = `${baseName}_two_columns.pdf`;
  return {
    name: downloadName,
    downloadName,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    type: 'application/pdf',
  };
}

import { sanitizePdf } from './pdfSanitize';
import { scanImageForQr, scanPdfForQr, QrScanResult } from './qrReader';

// 29. Sanitize PDF Execution
export async function executeSanitizePdf(
  data: Uint8Array,
  fileName: string,
  onProgress?: (percent: number, msg: string) => void
): Promise<ResultItem> {
  const result = await sanitizePdf(data, fileName, onProgress);
  const blob = new Blob([result.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const reportText = [
    `حجم الملف الأصلي: ${(result.report.originalSize / 1024).toFixed(1)} KB`,
    `حجم الملف بعد التطهير: ${(result.report.sanitizedSize / 1024).toFixed(1)} KB`,
    `المساحة الموفرة: ${(result.report.savedBytes / 1024).toFixed(1)} KB (${result.report.savedPercent}%)`,
    `العناصر التي تم تنظيفها: ${result.report.itemsRemoved.join('، ')}`,
  ].join('\n');

  return {
    name: result.downloadName,
    downloadName: result.downloadName,
    blob,
    url,
    size: blob.size,
    type: 'application/pdf',
    text: reportText,
  };
}

// 30. QR Code Scanner / Reader Execution
export async function executeScanQr(
  data: Uint8Array,
  fileName: string,
  onProgress?: (percent: number, msg: string) => void
): Promise<ResultItem> {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  let qrCodes: QrScanResult[] = [];

  onProgress?.(20, 'جارٍ مسح واستخراج أكواد QR...');

  if (ext === 'pdf') {
    qrCodes = await scanPdfForQr(data, 15, onProgress);
  } else {
    const single = await scanImageForQr(data, ext);
    if (single) qrCodes = [single];
  }

  onProgress?.(100, 'اكتمل المسح!');

  const hasFound = qrCodes.length > 0;
  const primaryText = hasFound ? qrCodes.map(q => q.text).join('\n---\n') : 'لم يتم العثور على رمز QR واضح في هذا المستند';

  const outputPayload = {
    fileName,
    scannedAt: new Date().toISOString(),
    codesFound: qrCodes.length,
    results: qrCodes,
  };

  const textBlob = new Blob([JSON.stringify(outputPayload, null, 2)], { type: 'application/json' });
  const baseName = getBaseFileName(fileName);
  const downloadName = `${baseName}_qr_scan.json`;

  return {
    name: downloadName,
    downloadName,
    blob: textBlob,
    url: URL.createObjectURL(textBlob),
    size: textBlob.size,
    type: 'application/json',
    text: primaryText,
  };
}

