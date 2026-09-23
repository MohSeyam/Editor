import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Play, 
  RotateCw, 
  Eraser, 
  FilePlus, 
  RefreshCw, 
  Printer, 
  Maximize2, 
  Wrench, 
  QrCode, 
  Hash, 
  FileText, 
  FileSpreadsheet, 
  FileCode, 
  Binary, 
  Split, 
  Sparkles, 
  Languages, 
  Receipt, 
  FileCheck2, 
  Layers, 
  Image as ImageIcon,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  Tag
} from 'lucide-react';
import { UploadedFile, Language, ToolType, ResultItem } from '../types';
import { getBaseFileName, formatFileSize } from '../utils/fileHelpers';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import { renderPdfPageToBlob } from '../utils/pdfThumbnail';
import { extractDocumentText } from '../utils/pdfExtraFeatures';
import { 
  executeRotatePdf, 
  executeDeletePages, 
  executeExtractPages, 
  executeReversePages, 
  executeGrayscalePdf, 
  executeCropPdf, 
  executeRepairPdf, 
  executeRemoveWatermark, 
  executeLinearizePdf, 
  executeStampQr, 
  executeStampBarcode, 
  executePdfToWord, 
  executePdfToExcel, 
  executeCsvToExcel, 
  executeChecksumHasher, 
  executeBase64Converter, 
  executeFileSplitter,
  executeWordToMarkdown,
  executeExcelToMarkdown,
  executePdfToHtml,
  executeMetadataWiper,
  executeColorInvert,
  executeJsonToExcel,
  executeExcelToJson,
  executePdfFlattenForms,
  executeMultiColumnPdf,
  executeSanitizePdf,
  executeScanQr,
  safeLoadPdfDocument
} from '../utils/extraToolsOperations';
import { convertOfficeFile } from '../utils/convertOperations';
import { convertImageWithCanvas } from '../utils/imageConverter';
import { applyNamingTemplate } from '../utils/namingTemplate';
import { executeMarkdownToHtml } from '../utils/markdownToHtml';

interface ToolExtraSpecializedViewProps {
  tool: ToolType;
  file?: UploadedFile;
  files?: UploadedFile[];
  lang: Language;
  onFinished: (results: ResultItem[]) => void;
  onBack: () => void;
}

export const ToolExtraSpecializedView: React.FC<ToolExtraSpecializedViewProps> = ({
  tool,
  file,
  files = [],
  lang,
  onFinished,
  onBack,
}) => {
  const isAr = lang === 'ar';
  const targetFile = file || files[0];
  const totalPages = targetFile?.pageCount || 1;
  const baseName = targetFile ? getBaseFileName(targetFile.name) : 'document';

  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tool Specific States
  const [rotationAngle, setRotationAngle] = useState<number>(90);
  const [pagesInput, setPagesInput] = useState<string>('1');
  const [qrText, setQrText] = useState<string>('https://ai.studio');
  const isStandaloneQr = targetFile?.id === 'qr-standalone' || targetFile?.name?.includes('QRCode_');
  const [qrExportMode, setQrExportMode] = useState<'stamp' | 'png' | 'pdf'>(
    isStandaloneQr ? 'png' : (targetFile?.data?.length > 0 ? 'stamp' : 'png')
  );
  const [barcodeText, setBarcodeText] = useState<string>(`DOC-${Math.floor(100000 + Math.random() * 900000)}`);
  const [cropMargin, setCropMargin] = useState<number>(36);
  const [chunkSizeMb, setChunkSizeMb] = useState<number>(5);
  const [imageResizeWidth, setImageResizeWidth] = useState<number>(1280);
  const [namingTemplate, setNamingTemplate] = useState<string>('');

  if (!targetFile) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-neutral-500">{isAr ? 'لم يتم تحديد ملف للمعالجة' : 'No file selected for processing'}</p>
        <button onClick={onBack} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer">
          {isAr ? 'العودة للاختيار' : 'Back'}
        </button>
      </div>
    );
  }

  const parsePageNumbers = (str: string): number[] => {
    const list: number[] = [];
    const parts = str.split(/[,;\s]+/).map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n, 10));
        if (!isNaN(start) && !isNaN(end)) {
          const s = Math.min(start, end);
          const e = Math.max(start, end);
          for (let i = s; i <= e; i++) list.push(i);
        }
      } else {
        const n = parseInt(part, 10);
        if (!isNaN(n)) list.push(n);
      }
    }
    return list;
  };

  const handleRunTool = async () => {
    setIsExecuting(true);
    setErrorMsg(null);

    try {
      let finalResult: ResultItem | ResultItem[] | null = null;

      switch (tool) {
        case 'rotate-pdf': {
          const rotated = await executeRotatePdf(targetFile.data, rotationAngle);
          const blob = new Blob([rotated], { type: 'application/pdf' });
          const name = `${baseName}_rotated_${rotationAngle}.pdf`;
          finalResult = { name, downloadName: name, blob, url: URL.createObjectURL(blob), size: blob.size, type: 'application/pdf' };
          break;
        }

        case 'delete-pages': {
          const pages = parsePageNumbers(pagesInput);
          const cleaned = await executeDeletePages(targetFile.data, pages);
          const blob = new Blob([cleaned], { type: 'application/pdf' });
          const name = `${baseName}_deleted_pages.pdf`;
          finalResult = { name, downloadName: name, blob, url: URL.createObjectURL(blob), size: blob.size, type: 'application/pdf' };
          break;
        }

        case 'extract-pages': {
          const pages = parsePageNumbers(pagesInput);
          const extracted = await executeExtractPages(targetFile.data, pages);
          const blob = new Blob([extracted], { type: 'application/pdf' });
          const name = `${baseName}_extracted_pages.pdf`;
          finalResult = { name, downloadName: name, blob, url: URL.createObjectURL(blob), size: blob.size, type: 'application/pdf' };
          break;
        }

        case 'reverse-pages': {
          const reversed = await executeReversePages(targetFile.data);
          const blob = new Blob([reversed], { type: 'application/pdf' });
          const name = `${baseName}_reversed.pdf`;
          finalResult = { name, downloadName: name, blob, url: URL.createObjectURL(blob), size: blob.size, type: 'application/pdf' };
          break;
        }

        case 'grayscale-pdf': {
          const gray = await executeGrayscalePdf(targetFile.data);
          const blob = new Blob([gray], { type: 'application/pdf' });
          const name = `${baseName}_grayscale.pdf`;
          finalResult = { name, downloadName: name, blob, url: URL.createObjectURL(blob), size: blob.size, type: 'application/pdf' };
          break;
        }

        case 'crop-pdf': {
          const cropped = await executeCropPdf(targetFile.data, cropMargin);
          const blob = new Blob([cropped], { type: 'application/pdf' });
          const name = `${baseName}_cropped.pdf`;
          finalResult = { name, downloadName: name, blob, url: URL.createObjectURL(blob), size: blob.size, type: 'application/pdf' };
          break;
        }

        case 'repair-pdf': {
          const repaired = await executeRepairPdf(targetFile.data);
          const blob = new Blob([repaired], { type: 'application/pdf' });
          const name = `${baseName}_repaired.pdf`;
          finalResult = { name, downloadName: name, blob, url: URL.createObjectURL(blob), size: blob.size, type: 'application/pdf' };
          break;
        }

        case 'remove-watermark': {
          const cleaned = await executeRemoveWatermark(targetFile.data);
          const blob = new Blob([cleaned], { type: 'application/pdf' });
          const name = `${baseName}_cleaned.pdf`;
          finalResult = { name, downloadName: name, blob, url: URL.createObjectURL(blob), size: blob.size, type: 'application/pdf' };
          break;
        }

        case 'linearize-pdf': {
          const webPdf = await executeLinearizePdf(targetFile.data);
          const blob = new Blob([webPdf], { type: 'application/pdf' });
          const name = `${baseName}_fastweb.pdf`;
          finalResult = { name, downloadName: name, blob, url: URL.createObjectURL(blob), size: blob.size, type: 'application/pdf' };
          break;
        }

        case 'qr-stamper': {
          const res = await executeStampQr(targetFile.data, qrText, { exportMode: qrExportMode });
          if (res instanceof Uint8Array) {
            const blob = new Blob([res], { type: 'application/pdf' });
            const name = `${baseName}_qr_stamped.pdf`;
            finalResult = { name, downloadName: name, blob, url: URL.createObjectURL(blob), size: blob.size, type: 'application/pdf' };
          } else {
            finalResult = res;
          }
          break;
        }

        case 'barcode-stamper': {
          const stamped = await executeStampBarcode(targetFile.data, barcodeText);
          const blob = new Blob([stamped], { type: 'application/pdf' });
          const name = `${baseName}_barcode_stamped.pdf`;
          finalResult = { name, downloadName: name, blob, url: URL.createObjectURL(blob), size: blob.size, type: 'application/pdf' };
          break;
        }

        case 'word-to-pdf':
        case 'excel-to-pdf':
        case 'ppt-to-pdf':
        case 'markdown-to-pdf':
        case 'html-to-pdf':
        case 'text-to-pdf':
        case 'json-to-pdf':
        case 'code-to-pdf':
        case 'svg-to-pdf': {
          const conv = await convertOfficeFile(targetFile.file, targetFile.data, 'pdf');
          finalResult = {
            name: conv.downloadName,
            downloadName: conv.downloadName,
            blob: conv.blob,
            url: URL.createObjectURL(conv.blob),
            size: conv.blob.size,
            type: conv.mimeType,
            previewText: conv.previewText,
          };
          break;
        }

        case 'pdf-to-images': {
          let totalPages = 1;
          try {
            const pdfDoc = await safeLoadPdfDocument(targetFile.data, targetFile.name);
            totalPages = pdfDoc.getPageCount();
          } catch {
            totalPages = 1;
          }
          const pageBlobs: ResultItem[] = [];

          for (let p = 1; p <= totalPages; p++) {
            const pageBlob = await renderPdfPageToBlob(targetFile.data, p, 'png', 2.0);
            const pName = `${baseName}_page_${p}.png`;
            pageBlobs.push({
              name: pName,
              downloadName: pName,
              blob: pageBlob,
              url: URL.createObjectURL(pageBlob),
              size: pageBlob.size,
              type: 'image/png',
            });
          }

          if (pageBlobs.length === 1) {
            finalResult = pageBlobs[0];
          } else {
            const zip = new JSZip();
            pageBlobs.forEach((pb) => {
              zip.file(pb.downloadName, pb.blob);
            });
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const zipName = `${baseName}_all_pages_images.zip`;
            finalResult = [
              {
                name: zipName,
                downloadName: zipName,
                blob: zipBlob,
                url: URL.createObjectURL(zipBlob),
                size: zipBlob.size,
                type: 'application/zip',
              },
              ...pageBlobs,
            ];
          }
          break;
        }

        case 'images-to-pdf': {
          const imagesList = files.length > 0 ? files : [targetFile];
          const compiledPdf = await PDFDocument.create();

          for (const imgFile of imagesList) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            const rawBlob = imgFile.file instanceof Blob ? imgFile.file : new Blob([imgFile.data]);
            const objectUrl = URL.createObjectURL(rawBlob);

            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error(`فشل تحميل الصورة: ${imgFile.name}`));
              img.src = objectUrl;
            });
            URL.revokeObjectURL(objectUrl);

            canvas.width = img.naturalWidth || img.width || 800;
            canvas.height = img.naturalHeight || img.height || 600;
            ctx?.drawImage(img, 0, 0);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            const byteString = atob(dataUrl.split(',')[1]);
            const u8 = new Uint8Array(byteString.length);
            for (let j = 0; j < byteString.length; j++) {
              u8[j] = byteString.charCodeAt(j);
            }

            const embedded = await compiledPdf.embedJpg(u8);
            const page = compiledPdf.addPage([canvas.width, canvas.height]);
            page.drawImage(embedded, {
              x: 0,
              y: 0,
              width: canvas.width,
              height: canvas.height,
            });
          }

          const pdfBytes = await compiledPdf.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          const name = `${baseName}_compiled_images.pdf`;
          finalResult = {
            name,
            downloadName: name,
            blob,
            url: URL.createObjectURL(blob),
            size: blob.size,
            type: 'application/pdf',
          };
          break;
        }

        case 'pdf-to-word': {
          let text = '';
          try {
            const extRes = await extractDocumentText(targetFile.file, targetFile.data);
            text = extRes.text;
          } catch {
            text = new TextDecoder('utf-8').decode(targetFile.data);
          }
          finalResult = await executePdfToWord(text || `مستند مستخرج من ${targetFile.name}`, baseName);
          break;
        }

        case 'pdf-to-excel': {
          let text = '';
          try {
            const extRes = await extractDocumentText(targetFile.file, targetFile.data);
            text = extRes.text;
          } catch {
            text = new TextDecoder('utf-8').decode(targetFile.data);
          }
          finalResult = await executePdfToExcel(text || `بيانات مستخرجة من ${targetFile.name}`, baseName);
          break;
        }

        case 'markdown-to-word': {
          let mdText = '';
          try {
            mdText = new TextDecoder('utf-8').decode(targetFile.data);
          } catch {
            mdText = targetFile.name;
          }
          const paragraphs: Paragraph[] = [];
          const lines = mdText.split('\n');
          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) {
              paragraphs.push(new Paragraph({ text: '' }));
              continue;
            }
            if (line.startsWith('# ')) {
              paragraphs.push(new Paragraph({ text: line.replace(/^#\s+/, ''), heading: HeadingLevel.HEADING_1 }));
            } else if (line.startsWith('## ')) {
              paragraphs.push(new Paragraph({ text: line.replace(/^##\s+/, ''), heading: HeadingLevel.HEADING_2 }));
            } else if (line.startsWith('### ')) {
              paragraphs.push(new Paragraph({ text: line.replace(/^###\s+/, ''), heading: HeadingLevel.HEADING_3 }));
            } else if (line.startsWith('- ') || line.startsWith('* ')) {
              paragraphs.push(new Paragraph({ text: '• ' + line.replace(/^[-*]\s+/, ''), bullet: { level: 0 } }));
            } else {
              paragraphs.push(new Paragraph({ children: [new TextRun({ text: line, size: 24 })] }));
            }
          }
          const doc = new Document({ sections: [{ properties: {}, children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: baseName })] }] });
          const blob = await Packer.toBlob(doc);
          const name = `${baseName}.docx`;
          finalResult = {
            name,
            downloadName: name,
            blob,
            url: URL.createObjectURL(blob),
            size: blob.size,
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          };
          break;
        }

        case 'markdown-to-html': {
          let mdText = '';
          try {
            mdText = new TextDecoder('utf-8').decode(targetFile.data);
          } catch {
            mdText = targetFile.name;
          }
          finalResult = executeMarkdownToHtml(mdText, baseName);
          break;
        }

        case 'html-to-word': {
          let htmlText = '';
          try {
            htmlText = new TextDecoder('utf-8').decode(targetFile.data);
          } catch {
            htmlText = targetFile.name;
          }
          const parser = new DOMParser();
          const docHtml = parser.parseFromString(htmlText, 'text/html');
          const bodyText = docHtml.body.innerText || docHtml.body.textContent || '';
          const paragraphs = bodyText.split('\n').filter(Boolean).map((p) => new Paragraph({
            children: [new TextRun({ text: p.trim(), size: 24 })],
          }));
          const doc = new Document({
            sections: [{ properties: {}, children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: baseName })] }],
          });
          const blob = await Packer.toBlob(doc);
          const name = `${baseName}.docx`;
          finalResult = {
            name,
            downloadName: name,
            blob,
            url: URL.createObjectURL(blob),
            size: blob.size,
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          };
          break;
        }

        case 'pdf-to-svg': {
          const pageBlob = await renderPdfPageToBlob(targetFile.data, 1, 'png', 2.0);
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(pageBlob);
          });
          const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 1131" width="100%" height="100%">
  <title>${baseName}</title>
  <image width="800" height="1131" xlink:href="${dataUrl}" />
</svg>`;
          const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
          const name = `${baseName}.svg`;
          finalResult = {
            name,
            downloadName: name,
            blob: svgBlob,
            url: URL.createObjectURL(svgBlob),
            size: svgBlob.size,
            type: 'image/svg+xml',
          };
          break;
        }

        case 'csv-to-excel': {
          const csvText = new TextDecoder('utf-8').decode(targetFile.data);
          finalResult = await executeCsvToExcel(csvText, baseName);
          break;
        }

        case 'checksum-hasher': {
          finalResult = await executeChecksumHasher(targetFile.data, targetFile.name);
          break;
        }

        case 'base64-converter': {
          finalResult = await executeBase64Converter(targetFile.data, targetFile.name);
          break;
        }

        case 'file-splitter': {
          finalResult = await executeFileSplitter(targetFile.data, targetFile.name, chunkSizeMb);
          break;
        }

        case 'heic-to-jpg': {
          const converted = await convertImageWithCanvas(targetFile.file, { format: 'image/jpeg', quality: 0.95 });
          finalResult = {
            name: converted.downloadName,
            downloadName: converted.downloadName,
            blob: converted.blob,
            url: converted.url,
            size: converted.newSize,
            type: converted.format,
          };
          break;
        }

        case 'webp-to-png': {
          const converted = await convertImageWithCanvas(targetFile.file, { format: 'image/png', quality: 1 });
          finalResult = {
            name: converted.downloadName,
            downloadName: converted.downloadName,
            blob: converted.blob,
            url: converted.url,
            size: converted.newSize,
            type: converted.format,
          };
          break;
        }

        case 'resize-image': {
          const converted = await convertImageWithCanvas(targetFile.file, { 
            format: 'image/jpeg', 
            quality: 0.92,
            maxWidth: imageResizeWidth,
          });
          finalResult = {
            name: converted.downloadName,
            downloadName: converted.downloadName,
            blob: converted.blob,
            url: converted.url,
            size: converted.newSize,
            type: converted.format,
          };
          break;
        }

        case 'word-to-markdown': {
          finalResult = await executeWordToMarkdown(targetFile.data, baseName);
          break;
        }

        case 'excel-to-markdown': {
          finalResult = await executeExcelToMarkdown(targetFile.data, baseName);
          break;
        }

        case 'pdf-to-html': {
          finalResult = await executePdfToHtml(targetFile.data, baseName);
          break;
        }

        case 'metadata-wiper': {
          finalResult = await executeMetadataWiper(targetFile.data, baseName);
          break;
        }

        case 'color-invert': {
          finalResult = await executeColorInvert(targetFile.data, baseName);
          break;
        }

        case 'json-to-excel': {
          const jsonText = new TextDecoder('utf-8').decode(targetFile.data);
          finalResult = await executeJsonToExcel(jsonText, baseName);
          break;
        }

        case 'excel-to-json': {
          finalResult = await executeExcelToJson(targetFile.data, baseName);
          break;
        }

        case 'pdf-flatten-forms': {
          finalResult = await executePdfFlattenForms(targetFile.data, baseName);
          break;
        }

        case 'multi-column-pdf': {
          finalResult = await executeMultiColumnPdf(targetFile.data, baseName);
          break;
        }

        case 'sanitize': {
          finalResult = await executeSanitizePdf(targetFile.data, targetFile.name);
          break;
        }

        case 'qr-reader': {
          finalResult = await executeScanQr(targetFile.data, targetFile.name);
          break;
        }

        default: {
          // General fallback: convert or wrap
          const conv = await convertOfficeFile(targetFile.file, targetFile.data, 'pdf');
          finalResult = {
            name: conv.downloadName,
            downloadName: conv.downloadName,
            blob: conv.blob,
            url: URL.createObjectURL(conv.blob),
            size: conv.blob.size,
            type: conv.mimeType,
            previewText: conv.previewText,
          };
          break;
        }
      }

      if (finalResult) {
        const list = Array.isArray(finalResult) ? finalResult : [finalResult];
        if (namingTemplate.trim()) {
          list.forEach((item, idx) => {
            const ext = (item.downloadName || '').split('.').pop() || 'pdf';
            const renamed = applyNamingTemplate(namingTemplate, {
              originalName: targetFile.name,
              index: idx + 1,
              totalFiles: list.length,
              toolSuffix: tool,
              targetExt: ext,
            });
            item.name = renamed;
            item.downloadName = renamed;
          });
        }
        onFinished(list);
      }
    } catch (err: any) {
      console.error('Execution error:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء معالجة المستند');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{isAr ? 'العودة' : 'Back'}</span>
        </button>

        <div className="text-end">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
            {tool.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Target File Info Card */}
      <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#1e1e20] border border-neutral-200/80 dark:border-white/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
              {targetFile.name}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
              {formatFileSize(targetFile.size, lang)} • {totalPages} {isAr ? 'صفحة/عنصر' : 'pages/items'}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{isAr ? 'تم الفحص والتحقق' : 'Verified'}</span>
        </div>
      </div>

      {/* Specific Config Controls Based on Tool */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-6">
        
        {/* Rotate PDF Options */}
        {tool === 'rotate-pdf' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'اختر زاوية التدوير لجميع الصفحات' : 'Select Page Rotation Angle'}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => setRotationAngle(deg)}
                  className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer font-bold text-sm ${
                    rotationAngle === deg
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <RotateCw className="w-5 h-5 mx-auto mb-1.5" />
                  <span>{deg}° {isAr ? 'باتجاه عقارب الساعة' : 'CW'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Delete or Extract Pages Options */}
        {(tool === 'delete-pages' || tool === 'extract-pages') && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              {tool === 'delete-pages' 
                ? (isAr ? 'أرقام الصفحات المراد حذفها (مثال: 1, 3, 5-8)' : 'Pages to delete (e.g. 1, 3, 5-8)')
                : (isAr ? 'أرقام الصفحات المراد استخراجها (مثال: 1-5, 8)' : 'Pages to extract (e.g. 1-5, 8)')}
            </h3>
            <input
              type="text"
              value={pagesInput}
              onChange={(e) => setPagesInput(e.target.value)}
              placeholder="1, 2, 4-6"
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr ? `إجمالي صفحات المستند الحالي: ${totalPages} صفحة` : `Total document pages: ${totalPages}`}
            </p>
          </div>
        )}

        {/* QR Stamper Options */}
        {tool === 'qr-stamper' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <QrCode className="w-4 h-4 text-violet-500" />
              <span>{isAr ? 'النص، الرقم، أو الرابط المشفر داخل رمز QR' : 'Text, number, or URL encoded in QR Code'}</span>
            </h3>
            <input
              type="text"
              value={qrText}
              onChange={(e) => setQrText(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {isAr ? 'صيغة التصدير المطلوبة:' : 'Export format:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setQrExportMode('png')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    qrExportMode === 'png'
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 ring-2 ring-violet-500/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <span className="font-bold">{isAr ? 'صورة PNG مستقلة' : 'PNG Image'}</span>
                  <span className="text-[10px] text-neutral-400 font-normal">{isAr ? 'صورة عالية الدقة' : 'High-res image'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQrExportMode('pdf')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    qrExportMode === 'pdf'
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 ring-2 ring-violet-500/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <span className="font-bold">{isAr ? 'مستند PDF لرمز QR' : 'PDF Document'}</span>
                  <span className="text-[10px] text-neutral-400 font-normal">{isAr ? 'صفحة جاهزة للطباعة' : 'Printable page'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQrExportMode('stamp')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    qrExportMode === 'stamp'
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 ring-2 ring-violet-500/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <span className="font-bold">{isAr ? 'ختم على ملف PDF' : 'Stamp on PDF'}</span>
                  <span className="text-[10px] text-neutral-400 font-normal">{isAr ? 'إدراج بأسفل الصفحات' : 'Bottom corner of pages'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Barcode Stamper Options */}
        {tool === 'barcode-stamper' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Hash className="w-4 h-4 text-indigo-500" />
              <span>{isAr ? 'رمز الباركود التسلسلي (Code128)' : 'Barcode Serial Code (Code128)'}</span>
            </h3>
            <input
              type="text"
              value={barcodeText}
              onChange={(e) => setBarcodeText(e.target.value)}
              placeholder="DOC-123456"
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Crop PDF Options */}
        {tool === 'crop-pdf' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                {isAr ? 'مقدار قص الهوامش (نقاط)' : 'Margin crop amount (points)'}
              </h3>
              <span className="font-mono text-xs font-bold text-blue-600">{cropMargin} pt</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="2"
              value={cropMargin}
              onChange={(e) => setCropMargin(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr ? 'يتم قص الهوامش البيضاء المتساوية من جميع الحواف الأربعة' : 'Uniformly trims white borders from all 4 edges'}
            </p>
          </div>
        )}

        {/* File Splitter Options */}
        {tool === 'file-splitter' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'حجم الجزء الواحد (ميجابايت)' : 'Chunk size (MB)'}
            </h3>
            <div className="grid grid-cols-4 gap-2.5">
              {[2, 5, 10, 25].map((mb) => (
                <button
                  key={mb}
                  type="button"
                  onClick={() => setChunkSizeMb(mb)}
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                    chunkSizeMb === mb
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {mb} MB
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Resize Image Options */}
        {tool === 'resize-image' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'العرض الأقصى المستهدف (بكسل)' : 'Target Max Width (Pixels)'}
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {[800, 1280, 1920, 2560].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setImageResizeWidth(w)}
                  className={`py-2 px-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                    imageResizeWidth === w
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sanitize PDF Options */}
        {tool === 'sanitize' && (
          <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-500/20 space-y-2">
            <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>{isAr ? 'تطهير عميق وحذف الكائنات والخطوط الزائدة (Sanitization)' : 'Deep PDF Sanitization & Bloat Removal'}</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {isAr
                ? 'تقوم هذه الأداة بحذف الكائنات غير المرجعية العالقة (Unreferenced Objects)، وإلغاء تعريفات الخطوط المخفية المدمجة، وحذف بيانات الميتا الحساسة وتفريغ شجرة الكتالوج، وإعادة تجميع المستند في ملف PDF نقي وأصغر حجماً بكثير.'
                : 'Strips orphan objects, unreferenced fonts, deep metadata, and structural bloat, recompiling into a clean, lightweight PDF.'}
            </p>
          </div>
        )}

        {/* QR & Barcode Reader Options */}
        {tool === 'qr-reader' && (
          <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-500/20 space-y-2">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs">
              <ScanLine className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{isAr ? 'مسح وقراءة باركود وأكواد QR' : 'QR & Barcode Scanner'}</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {isAr
                ? 'يتم فحص صفحات المستند أو ملفات الصور بدقة عالية، واكتشاف أي باركود أو رمز QR واستخراج النصوص والروابط فورياً في تقرير منسق.'
                : 'High-speed local scanner decodes barcodes & QR codes directly from document pages and images, extracting raw text and links.'}
            </p>
          </div>
        )}

        {/* Output Naming Template for Output / Batch */}
        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {isAr ? 'قالب تسمية الملف الناتج (Naming Template)' : 'Output Naming Template'}
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              {isAr ? 'يدعم {name} و {index} و {date}' : 'Supports {name}, {index}, {date}'}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={namingTemplate}
              onChange={(e) => setNamingTemplate(e.target.value)}
              placeholder={isAr ? 'اتركه فارغاً للاسم الافتراضي أو اكتب قالباً (مثال: {name}_processed)' : 'Leave empty for default or enter custom template'}
              className="flex-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-mono text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { label: '{name}_output', text: '{name}_output' },
              { label: '{name}_{index}', text: '{name}_{index}' },
              { label: 'doc_{0index}', text: 'doc_{0index}' },
              { label: '{date}_{name}', text: '{date}_{name}' },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setNamingTemplate(chip.text)}
                className="text-[10px] font-mono px-2 py-1 rounded-lg bg-neutral-200/70 dark:bg-white/10 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 text-neutral-600 dark:text-neutral-300 cursor-pointer transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Informational descriptions for other tools */}
        {['repair-pdf', 'grayscale-pdf', 'remove-watermark', 'linearize-pdf', 'reverse-pages', 'pdf-to-word', 'pdf-to-excel', 'checksum-hasher', 'base64-converter'].includes(tool) && (
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-white/5 space-y-1">
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {isAr ? 'جميع الإعدادات القياسية محددة تلقائياً للحصول على أفضل دقة وأعلى جودة. اضغط على الزر أدناه لبدء المعالجة الفورية.' : 'Optimal presets configured automatically for highest precision and output quality. Click below to execute.'}
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isExecuting}
            onClick={handleRunTool}
            className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isExecuting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>
              {isExecuting
                ? (isAr ? 'جارٍ تنفيذ العملية...' : 'Processing...')
                : (isAr ? 'تنفيذ العملية وحفظ النتيجة' : 'Execute & Save Result')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
