import React, { useRef, useState, useEffect } from 'react';
import { 
  UploadCloud, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  File, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  ArrowLeft, 
  ArrowRight, 
  ShieldAlert, 
  ShieldCheck, 
  GripVertical, 
  FolderUp, 
  Eye, 
  ArrowUpDown,
  SortAsc,
  Sparkles,
  LayoutGrid,
  List,
  QrCode
} from 'lucide-react';
import { ToolType, Language, UploadedFile } from '../types';
import { getTranslation } from '../i18n';
import { formatFileSize, createUploadedFileFromFile, extractFilesFromDataTransfer, detectPdfPageCount, getBaseFileName } from '../utils/fileHelpers';
import { generateFileThumbnail } from '../utils/pdfThumbnail';
import { convertOfficeFile } from '../utils/convertOperations';
import { getToolMetadata } from '../utils/toolNamesMap';
import { PDFDocument } from 'pdf-lib';

interface FileUploadAreaProps {
  tool: ToolType;
  lang: Language;
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  onContinue: (overrideFiles?: UploadedFile[]) => void;
  onBack: () => void;
  onQuickLook?: (file: UploadedFile) => void;
}

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  tool,
  lang,
  files,
  onFilesChange,
  onContinue,
  onBack,
  onQuickLook,
}) => {
  const t = getTranslation(lang);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [dropSuccessPulse, setDropSuccessPulse] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Asynchronously generate thumbnails for any uploaded files that lack one
  useEffect(() => {
    let cancelled = false;
    const generateMissing = async () => {
      const missingIndex = files.findIndex((f) => !f.thumbnailUrl);
      if (missingIndex === -1) return;

      const copy = [...files];
      let hasUpdates = false;

      for (let i = 0; i < copy.length; i++) {
        if (!copy[i].thumbnailUrl) {
          try {
            const thumb = await generateFileThumbnail(copy[i].data, copy[i].extension, 260);
            if (thumb && !cancelled) {
              copy[i] = { ...copy[i], thumbnailUrl: thumb };
              hasUpdates = true;
            }
          } catch {
            // continue
          }
        }
      }

      if (hasUpdates && !cancelled) {
        onFilesChange(copy);
      }
    };

    generateMissing();
    return () => {
      cancelled = true;
    };
  }, [files]);

  // Multi-file tools supporting Batch Processing
  const isMultiFileTool = [
    'universal-merge',
    'merge',
    'convert',
    'image-convert',
    'compress',
    'pdf-compress-heavy',
    'image-compress',
    'flatten',
    'encrypt',
    'mass-rename',
    'images-to-pdf',
    'batch-watermark',
    'toc',
    'pdf-to-images',
    'organize',
    'extract-text',
    'watermark',
    'pdfa',
    'grayscale-pdf',
    'ocr'
  ].includes(tool);

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const totalEstPages = files.reduce((acc, f) => acc + (f.pageCount || (f.extension === 'pdf' ? 1 : 0)), 0);
  const extCounts = files.reduce((acc, f) => {
    acc[f.extension] = (acc[f.extension] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getAcceptString = (t: ToolType): string => {
    switch (t) {
      case 'merge':
      case 'universal-merge':
      case 'split':
      case 'sign':
      case 'redact':
      case 'organize':
      case 'compress':
      case 'watermark':
      case 'page-number':
      case 'metadata':
      case 'flatten':
      case 'pdfa':
      case 'imposition':
      case 'form-builder':
      case 'toc':
      case 'compare':
      case 'rotate-pdf':
      case 'delete-pages':
      case 'extract-pages':
      case 'reverse-pages':
      case 'grayscale-pdf':
      case 'crop-pdf':
      case 'repair-pdf':
      case 'remove-watermark':
      case 'linearize-pdf':
      case 'qr-stamper':
      case 'barcode-stamper':
      case 'pdf-to-word':
      case 'pdf-to-excel':
      case 'pdf-to-images':
      case 'annotate':
      case 'pdf-to-html':
      case 'metadata-wiper':
      case 'color-invert':
      case 'booklet-maker':
      case 'pdf-flatten-forms':
        return '.pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.html,.htm,.md,.txt';
      case 'word-to-pdf':
      case 'word-to-markdown':
        return '.docx,.doc';
      case 'excel-to-pdf':
      case 'excel-to-markdown':
      case 'excel-to-json':
        return '.xlsx,.xls,.csv';
      case 'json-to-excel':
        return '.json';
      case 'ppt-to-pdf':
        return '.pptx,.ppt';
      case 'images-to-pdf':
        return '.png,.jpg,.jpeg,.webp,.heic,.heif,.bmp,.svg,.tiff,.tif';
      case 'markdown-to-pdf':
      case 'markdown-to-html':
        return '.md,.markdown';
      case 'html-to-pdf':
      case 'html-to-word':
        return '.html,.htm';
      case 'pdf-to-svg':
      case 'sanitize':
        return '.pdf';
      case 'qr-reader':
        return '.pdf,.png,.jpg,.jpeg,.webp,.bmp,.gif,.svg';
      case 'multi-column-pdf':
        return '.pdf,.docx,.doc,.txt,.md';
      case 'text-to-pdf':
        return '.txt';
      case 'csv-to-excel':
        return '.csv';
      case 'json-to-pdf':
        return '.json';
      case 'code-to-pdf':
        return '.js,.ts,.tsx,.jsx,.py,.java,.cpp,.c,.html,.css,.json,.sql,.sh';
      case 'heic-to-jpg':
        return '.heic,.heif';
      case 'webp-to-png':
        return '.webp';
      case 'svg-to-pdf':
        return '.svg';
      case 'resize-image':
        return '.png,.jpg,.jpeg,.webp,.bmp';
      case 'image-compress':
        return '.webp,.heic,.heif,.jpg,.jpeg,.png,.bmp';
      case 'image-convert':
        return '.webp,.png,.jpg,.jpeg,.bmp,.svg,.heic,.heif,.tiff';
      case 'extract-text':
        return '.pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.html,.htm,.json';
      case 'convert':
        return '.docx,.doc,.pptx,.ppt,.xlsx,.xls,.csv,.json,.md,.txt,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.svg,.bmp,.html,.htm';
      case 'encrypt':
      case 'decrypt':
      case 'checksum-hasher':
      case 'base64-converter':
      case 'file-splitter':
      case 'mass-rename':
        return '*';
      default:
        return '*';
    }
  };

  const getFileIcon = (ext: string) => {
    switch (ext) {
      case 'pdf':
        return <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs">PDF</div>;
      case 'docx':
      case 'doc':
        return <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center"><FileText className="w-5 h-5" /></div>;
      case 'pptx':
      case 'ppt':
        return <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xs">PPT</div>;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><FileSpreadsheet className="w-5 h-5" /></div>;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
        return <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center"><FileImage className="w-5 h-5" /></div>;
      default:
        return <div className="w-10 h-10 rounded-xl bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 flex items-center justify-center"><File className="w-5 h-5" /></div>;
    }
  };

  const getSupportedExtensions = (t: ToolType): string[] => {
    const raw = getAcceptString(t);
    if (raw === '*') return ['*'];
    return raw.split(',').map((s) => s.trim().replace('.', '').toLowerCase());
  };

  const scanEntry = async (entry: any, supportedExts: string[]): Promise<File[]> => {
    const fileList: File[] = [];

    const traverse = async (cur: any) => {
      if (cur.isFile) {
        try {
          const file: File = await new Promise((res, rej) => cur.file(res, rej));
          const ext = (file.name.split('.').pop() || '').toLowerCase();
          if (supportedExts.includes('*') || supportedExts.includes(ext)) {
            fileList.push(file);
          }
        } catch (e) {
          console.warn('File read from entry failed', e);
        }
      } else if (cur.isDirectory) {
        try {
          const reader = cur.createReader();
          const readAllEntries = async (): Promise<any[]> => {
            const batch: any[] = await new Promise((res, rej) => reader.readEntries(res, rej));
            if (batch.length > 0) {
              const nextBatch = await readAllEntries();
              return [...batch, ...nextBatch];
            }
            return batch;
          };
          const children = await readAllEntries();
          for (const child of children) {
            await traverse(child);
          }
        } catch (dirErr) {
          console.warn('Directory scan failed', dirErr);
        }
      }
    };

    await traverse(entry);
    return fileList;
  };

  const handleProcessIncomingFiles = async (newFileList: FileList | File[]) => {
    setErrorMessage(null);
    const incoming = Array.from(newFileList);
    if (incoming.length === 0) return;

    // For single-file tools, gracefully take the first document from the dropped batch/folder
    const filesToProcess = isMultiFileTool ? incoming : [incoming[0]];

    setIsReadingFiles(true);

    const isPdfTargetTool = [
      'merge', 'universal-merge', 'split', 'sign', 'redact', 'organize',
      'compress', 'watermark', 'page-number', 'metadata', 'flatten',
      'pdfa', 'imposition', 'form-builder', 'toc', 'compare',
      'rotate-pdf', 'delete-pages', 'extract-pages', 'reverse-pages',
      'grayscale-pdf', 'crop-pdf', 'repair-pdf', 'remove-watermark',
      'linearize-pdf', 'qr-stamper', 'barcode-stamper',
      'pdf-to-word', 'pdf-to-excel', 'pdf-to-images', 'annotate',
      'pdf-to-html', 'metadata-wiper', 'color-invert', 'booklet-maker',
      'pdf-flatten-forms'
    ].includes(tool);

    const readTasks = filesToProcess.map(async (f) => {
      try {
        let uploadedFile = await createUploadedFileFromFile(f);

        // Multi-format support: Automatically convert Office, Markdown, HTML, or Image files into PDF on the fly!
        if (isPdfTargetTool && uploadedFile.extension !== 'pdf') {
          const convertibleExts = ['docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'md', 'html', 'htm', 'txt', 'png', 'jpg', 'jpeg', 'webp', 'heic', 'tiff'];
          if (convertibleExts.includes(uploadedFile.extension)) {
            try {
              const conv = await convertOfficeFile(f, uploadedFile.data, 'pdf');
              const pdfBytes = new Uint8Array(await conv.blob.arrayBuffer());
              const pdfPages = await detectPdfPageCount(pdfBytes);
              const baseName = getBaseFileName(f.name);
              uploadedFile = {
                ...uploadedFile,
                name: `${baseName}.pdf`,
                extension: 'pdf',
                data: pdfBytes,
                size: conv.blob.size,
                type: 'application/pdf',
                pageCount: pdfPages || 1,
              };
            } catch (convErr) {
              console.warn('Auto conversion to PDF failed, preserving original:', convErr);
            }
          }
        }

        return uploadedFile;
      } catch (err) {
        console.error('Error reading file:', err);
        setErrorMessage(lang === 'ar' ? `تعذر معالجة أو تحويل الملف: ${f.name}` : `Failed processing or converting file: ${f.name}`);
        return null;
      }
    });

    const results = await Promise.all(readTasks);
    const processedList: UploadedFile[] = results.filter((item): item is UploadedFile => item !== null);

    setIsReadingFiles(false);

    if (isMultiFileTool) {
      onFilesChange([...files, ...processedList]);
    } else {
      const updated = processedList.slice(0, 1);
      onFilesChange(updated);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    try {
      const supported = getSupportedExtensions(tool);
      const extracted = await extractFilesFromDataTransfer(e.dataTransfer, supported);

      if (extracted.length > 0) {
        setDropSuccessPulse(true);
        setTimeout(() => setDropSuccessPulse(false), 700);
        await handleProcessIncomingFiles(extracted);
        return;
      }

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        setDropSuccessPulse(true);
        setTimeout(() => setDropSuccessPulse(false), 700);
        await handleProcessIncomingFiles(e.dataTransfer.files);
      } else {
        setErrorMessage(lang === 'ar' ? 'لم يتم العثور على ملفات متوافقة داخل المجلد المختار' : 'No supported files found in dropped folder');
      }
    } catch (dropErr) {
      console.error('Drop error:', dropErr);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        setDropSuccessPulse(true);
        setTimeout(() => setDropSuccessPulse(false), 700);
        await handleProcessIncomingFiles(e.dataTransfer.files);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= files.length) return;
    const copy = [...files];
    const item = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = item;
    onFilesChange(copy);
  };

  // Reorder algorithms
  const sortAlphabetical = () => {
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    onFilesChange(sorted);
  };

  const sortBySize = () => {
    const sorted = [...files].sort((a, b) => b.size - a.size);
    onFilesChange(sorted);
  };

  const reverseOrder = () => {
    onFilesChange([...files].reverse());
  };

  // Drag-and-drop reordering handlers
  const handleItemDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${index}`);
  };

  const handleItemDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleItemDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) {
      setDraggedItemIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...files];
    const [moved] = updated.splice(draggedItemIndex, 1);
    updated.splice(targetIndex, 0, moved);
    onFilesChange(updated);

    setDraggedItemIndex(null);
    setDragOverIndex(null);
  };

  const handleItemDragEnd = () => {
    setDraggedItemIndex(null);
    setDragOverIndex(null);
  };

  const toolMeta = getToolMetadata(tool, lang);

  return (
    <div id="file-upload-section" className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <button
          id="btn-upload-back"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          {lang === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{t.btnBack}</span>
        </button>

        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {isMultiFileTool ? t.dropHintMulti : t.dropHintSingle}
          </span>
        </div>

        {files.length > 0 ? (
          <button
            id="btn-clear-files"
            onClick={() => onFilesChange([])}
            className="text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400 transition-colors cursor-pointer"
          >
            {t.clearAll}
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Selected Task Header Banner */}
      <div className="text-center py-1">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
          {toolMeta.title}
        </h2>
      </div>

      {/* Direct QR Generator Option for qr-stamper (Does not require files) */}
      {tool === 'qr-stamper' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="text-right rtl:text-right ltr:text-left">
              <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                {lang === 'ar' ? 'توليد وتصدير رمز QR مباشرة من رابط، رقم، أو نص' : 'Generate & export QR code directly from URL, number, or text'}
              </p>
              <p className="text-[11px] text-indigo-600/90 dark:text-indigo-400">
                {lang === 'ar' ? 'تصدير كصورة PNG عالية الدقة أو مستند PDF بدون الحاجة لرفع أي ملف' : 'Export as high-resolution PNG or PDF without uploading any file'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const pdfDoc = await PDFDocument.create();
                pdfDoc.addPage([595.28, 841.89]);
                const pdfBytes = await pdfDoc.save();
                const dummyFile = new File([pdfBytes], 'QRCode_Generator.pdf', { type: 'application/pdf' });
                const standaloneQrFile: UploadedFile = {
                  id: 'qr-standalone',
                  name: 'QRCode_Generator.pdf',
                  size: pdfBytes.length,
                  type: 'application/pdf',
                  extension: 'pdf',
                  data: pdfBytes,
                  file: dummyFile,
                  pageCount: 1,
                };
                onFilesChange([standaloneQrFile]);
                onContinue([standaloneQrFile]);
              } catch (err) {
                console.error('QR standalone file error:', err);
                const fallbackFile: UploadedFile = {
                  id: 'qr-standalone',
                  name: 'QRCode_Generator.pdf',
                  size: 1024,
                  type: 'application/pdf',
                  extension: 'pdf',
                  data: new Uint8Array(),
                  file: new File([], 'QRCode_Generator.pdf'),
                  pageCount: 1,
                };
                onFilesChange([fallbackFile]);
                onContinue([fallbackFile]);
              }
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm"
          >
            {lang === 'ar' ? 'إنشاء وتصدير QR الآن' : 'Create & Export QR'}
          </button>
        </div>
      )}

      {/* Interactive Drop-Zone Thumbnail for Single File Tool */}
      {!isMultiFileTool && files.length === 1 && files[0] ? (
        <div
          id="interactive-single-file-thumbnail-card"
          className="relative p-6 sm:p-8 rounded-3xl bg-white/95 dark:bg-[#1c1c1e]/95 border border-blue-500/30 shadow-lg backdrop-blur-md space-y-5"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple={false}
            accept={getAcceptString(tool)}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                handleProcessIncomingFiles(e.target.files);
              }
            }}
          />

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Live Rendered Thumbnail or Format Badge */}
            <div className="relative shrink-0 group">
              {files[0].thumbnailUrl ? (
                <img
                  src={files[0].thumbnailUrl}
                  alt={files[0].name}
                  className="w-28 sm:w-32 h-36 sm:h-40 object-cover rounded-2xl shadow-md border border-neutral-200 dark:border-white/10"
                />
              ) : (
                <div className="w-28 sm:w-32 h-36 sm:h-40 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 flex flex-col items-center justify-center p-3 text-center shadow-xs">
                  <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400 mb-2" />
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase font-mono">
                    {files[0].extension}
                  </span>
                </div>
              )}
              {files[0].pageCount && files[0].pageCount > 0 && (
                <span className="absolute bottom-2 right-2 rtl:right-auto rtl:left-2 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-mono backdrop-blur-xs font-semibold">
                  {files[0].pageCount} {lang === 'ar' ? 'ص' : 'p'}
                </span>
              )}
            </div>

            {/* Document Details & Status */}
            <div className="flex-1 text-center sm:text-start space-y-2.5 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {lang === 'ar' ? '✓ تم فحص الملف وهو جاهز للمعالجة' : '✓ File Ready for Processing'}
                </span>
                <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                  {formatFileSize(files[0].size, lang)}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white truncate" title={files[0].name}>
                {files[0].name}
              </h3>

              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xl">
                {lang === 'ar' 
                  ? 'تم تحميل الملف وقراءة محتواه محلياً على جهازك بأمان تام. يمكنك المتابعة الآن لضبط خيارات الأداة وتطبيق المعالجة.' 
                  : 'File loaded and verified securely on your local device. Click continue to configure tool options.'}
              </p>

              {/* Action Buttons for the Thumbnail Card */}
              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <button
                  type="button"
                  id="btn-thumbnail-continue"
                  onClick={() => onContinue()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <span>{lang === 'ar' ? 'متابعة إلى خيارات الأداة' : 'Continue to Options'}</span>
                  {lang === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-300 text-xs font-medium cursor-pointer transition-colors"
                >
                  {lang === 'ar' ? 'تغيير الملف' : 'Replace File'}
                </button>

                {onQuickLook && (
                  <button
                    type="button"
                    onClick={() => onQuickLook(files[0])}
                    className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                    <span>{lang === 'ar' ? 'معاينة سريعة' : 'Quick Look'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onFilesChange([])}
                  className="px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 text-xs font-medium cursor-pointer transition-colors"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Dashed Drop Zone */
        <div
          id="drop-zone-container"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer text-center ${
            isDragging
              ? 'border-blue-500 bg-blue-500/[0.12] ring-4 ring-blue-500/25 scale-[1.015] shadow-lg shadow-blue-500/10'
              : dropSuccessPulse
              ? 'border-emerald-500 bg-emerald-500/[0.1] ring-4 ring-emerald-500/30 scale-[1.02] shadow-md animate-pulse'
              : 'border-neutral-300/80 dark:border-white/15 bg-white/70 dark:bg-[#1c1c1e]/70 hover:bg-neutral-50 dark:hover:bg-[#222225] hover:border-blue-400 dark:hover:border-blue-400/40'
          } backdrop-blur-md shadow-xs`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple={isMultiFileTool}
            accept={getAcceptString(tool)}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                handleProcessIncomingFiles(e.target.files);
              }
            }}
          />

          <input
            ref={folderInputRef}
            type="file"
            {...({ webkitdirectory: '', directory: '' } as any)}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                handleProcessIncomingFiles(e.target.files);
              }
            }}
          />

          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-105 shadow-2xs">
            <UploadCloud className="w-7 h-7 stroke-[1.8]" />
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
            <span className="hidden sm:inline">{t.dropTitle}</span>
            <span className="sm:hidden">{lang === 'ar' ? 'انقر لاختيار الملفات أو المجلد' : 'Tap to select files or folder'}</span>
          </h3>

          {/* Action Buttons for Individual Files and Folders */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 shrink-0" />
              <span>{lang === 'ar' ? 'اختيار ملفات' : 'Select Files'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                folderInputRef.current?.click();
              }}
              className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white text-xs font-semibold shadow-xs flex items-center gap-2 border border-neutral-300 dark:border-neutral-600 transition-colors cursor-pointer"
            >
              <FolderUp className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{lang === 'ar' ? 'رفع مجلد كامل' : 'Upload Folder'}</span>
            </button>
          </div>

          {isReadingFiles && (
            <div className="mt-3 text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">
              {lang === 'ar' ? 'جارٍ قراءة الملفات...' : 'Reading files...'}
            </div>
          )}
        </div>
      )}

      {/* Error notification if any */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Uploaded Files Miniature List (قائمة مصغرة للملفات المضافة) */}
      {files.length > 0 && (
        <div id="mini-uploaded-files-list" className="space-y-3 pt-2">
          {/* Header of the Miniature List */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1.5 border-b border-neutral-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-900 dark:text-white">
                {lang === 'ar' ? 'الملفات المضافة' : 'Added Files'} ({files.length})
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
                {formatFileSize(totalSize, lang)}
              </span>
              {totalEstPages > 0 && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                  {totalEstPages} {lang === 'ar' ? 'صفحة' : 'pages'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {isMultiFileTool && files.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={sortAlphabetical}
                    title={lang === 'ar' ? 'ترتيب أبجدي' : 'Sort A-Z'}
                    className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 text-[11px] text-neutral-700 dark:text-neutral-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <SortAsc className="w-3 h-3 text-blue-500" />
                    <span>A-Z</span>
                  </button>

                  <button
                    type="button"
                    onClick={sortBySize}
                    title={lang === 'ar' ? 'ترتيب حسب الحجم' : 'Sort by size'}
                    className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 text-[11px] text-neutral-700 dark:text-neutral-300 cursor-pointer transition-colors"
                  >
                    {lang === 'ar' ? 'الحجم' : 'Size'}
                  </button>

                  <button
                    type="button"
                    onClick={reverseOrder}
                    title={lang === 'ar' ? 'عكس الترتيب' : 'Reverse order'}
                    className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 text-[11px] text-neutral-700 dark:text-neutral-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>{lang === 'ar' ? 'عكس' : 'Reverse'}</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => onFilesChange([])}
                className="px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-[11px] text-red-500 hover:text-red-600 dark:text-red-400 font-medium transition-colors cursor-pointer"
              >
                {t.clearAll}
              </button>
            </div>
          </div>

          {/* Miniature Files List */}
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {files.map((f, idx) => {
              const isBeingDragged = draggedItemIndex === idx;
              const isTargetHover = dragOverIndex === idx;

              return (
                <div
                  key={f.id}
                  id={`mini-file-item-${idx}`}
                  draggable={isMultiFileTool}
                  onDragStart={(e) => handleItemDragStart(e, idx)}
                  onDragOver={(e) => handleItemDragOver(e, idx)}
                  onDrop={(e) => handleItemDrop(e, idx)}
                  onDragEnd={handleItemDragEnd}
                  className={`group flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#1c1c1e] border transition-all duration-200 ${
                    isBeingDragged
                      ? 'opacity-40 scale-[0.98] border-blue-500 border-dashed'
                      : isTargetHover
                      ? 'border-blue-500 shadow-md bg-blue-50/40 dark:bg-blue-950/20'
                      : 'border-neutral-200/80 dark:border-white/10 shadow-2xs hover:border-neutral-300 dark:hover:border-white/20'
                  } ${isMultiFileTool ? 'cursor-grab active:cursor-grabbing' : ''}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-1 rtl:pr-0 rtl:pl-1">
                    {/* Index & Drag Grip */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isMultiFileTool && (
                        <GripVertical className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-300" />
                      )}
                      <span className="text-[10px] font-bold w-5 text-center text-neutral-400 dark:text-neutral-500 font-mono">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Compact Thumbnail Preview or Extension Badge */}
                    {f.thumbnailUrl ? (
                      <img
                        src={f.thumbnailUrl}
                        alt={f.name}
                        className="w-7 h-7 rounded-lg object-cover border border-neutral-200 dark:border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 font-bold text-[9px] uppercase flex items-center justify-center shrink-0 font-mono">
                        {f.extension.slice(0, 4)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate max-w-[180px] sm:max-w-xs md:max-w-md" title={f.name}>
                        {f.name}
                      </p>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                        {formatFileSize(f.size, lang)} {f.pageCount ? `• ${f.pageCount} ${t.pagesCount}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {onQuickLook && (
                      <button
                        id={`btn-quicklook-${idx}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickLook(f);
                        }}
                        title={lang === 'ar' ? 'معاينة سريعة' : 'Quick Look'}
                        className="p-1 rounded-md text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isMultiFileTool && files.length > 1 && (
                      <div className="flex items-center">
                        <button
                          id={`btn-moveup-${idx}`}
                          type="button"
                          onClick={() => moveFile(idx, 'up')}
                          disabled={idx === 0}
                          title={t.moveUp}
                          className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-20 cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-movedown-${idx}`}
                          type="button"
                          onClick={() => moveFile(idx, 'down')}
                          disabled={idx === files.length - 1}
                          title={t.moveDown}
                          className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-20 cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      id={`btn-remove-file-${idx}`}
                      type="button"
                      onClick={() => removeFile(f.id)}
                      title={t.removeFile}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add more files / folder if multi-file */}
          {isMultiFileTool && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                id="btn-add-more-files"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl border border-dashed border-neutral-300 dark:border-white/15 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:border-blue-400 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addMoreFiles}</span>
              </button>

              <button
                id="btn-add-folder-more"
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl border border-dashed border-neutral-300 dark:border-white/15 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:border-amber-400 dark:hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FolderUp className="w-3.5 h-3.5 text-amber-500" />
                <span>{lang === 'ar' ? 'إضافة مجلد كامل' : 'Add Entire Folder'}</span>
              </button>
            </div>
          )}

          {/* Bottom Continue Button */}
          <div className="pt-4 flex justify-end">
            <button
              id="btn-upload-continue"
              type="button"
              onClick={onContinue}
              disabled={files.length === 0}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium shadow-sm shadow-blue-600/30 hover:shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>{t.btnContinue}</span>
              {lang === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
