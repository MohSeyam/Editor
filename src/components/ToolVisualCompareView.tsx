import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  GitCompare, 
  ArrowLeft, 
  ArrowRight, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Columns, 
  Layers, 
  Sliders, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2,
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  Sparkles,
  Split,
  Eye,
  ArrowLeftRight
} from 'lucide-react';
import { UploadedFile, Language, ResultItem } from '../types';
import { readFileAsUint8Array, formatFileSize, triggerDownload, getBaseFileName } from '../utils/fileHelpers';
import { convertOfficeFile } from '../utils/convertOperations';

interface ToolVisualCompareViewProps {
  initialFiles: UploadedFile[];
  lang: Language;
  onFinished: (results: ResultItem[]) => void;
  onBack: () => void;
}

interface PageDiffInfo {
  pageNum: number;
  diffPercent: number;
  hasDiff: boolean;
  pixelCount: number;
}

export const ToolVisualCompareView: React.FC<ToolVisualCompareViewProps> = ({
  initialFiles,
  lang,
  onFinished,
  onBack,
}) => {
  const isAr = lang === 'ar';

  // Document Slots
  const [fileA, setFileA] = useState<UploadedFile | null>(initialFiles[0] || null);
  const [fileB, setFileB] = useState<UploadedFile | null>(initialFiles[1] || null);

  // Converted PDF Data (if input was Word/Office)
  const [pdfDataA, setPdfDataA] = useState<Uint8Array | null>(null);
  const [pdfDataB, setPdfDataB] = useState<Uint8Array | null>(null);

  // PDF Docs
  const [pdfDocA, setPdfDocA] = useState<any>(null);
  const [pdfDocB, setPdfDocB] = useState<any>(null);

  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Navigation & Page State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [viewMode, setViewMode] = useState<'sideBySide' | 'slider' | 'overlay'>('sideBySide');

  // Slider comparison split position (0 to 100%)
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);

  // Page Discrepancy Cache
  const [pageDiffs, setPageDiffs] = useState<Record<number, PageDiffInfo>>({});
  const [isAnalyzingPages, setIsAnalyzingPages] = useState<boolean>(false);

  // Canvas Refs
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sliderContainerRef = useRef<HTMLDivElement | null>(null);

  // Helper to convert non-PDF files into PDF Uint8Array
  const preparePdfData = async (fileObj: UploadedFile): Promise<Uint8Array> => {
    if (fileObj.extension === 'pdf') {
      return fileObj.data;
    }
    // Office / Word / PPT / Image conversion
    const converted = await convertOfficeFile(fileObj.file, fileObj.data, 'pdf');
    return new Uint8Array(await converted.blob.arrayBuffer());
  };

  // Load and prepare Document A
  useEffect(() => {
    let active = true;
    if (!fileA) {
      setPdfDataA(null);
      setPdfDocA(null);
      return;
    }

    const loadA = async () => {
      try {
        setIsLoadingDocs(true);
        setStatusMessage(isAr ? 'جارٍ تحضير المستند الأصلي (A)...' : 'Preparing Document A...');
        const bytes = await preparePdfData(fileA);
        if (!active) return;
        setPdfDataA(bytes);

        const task = pdfjsLib.getDocument({ data: bytes.slice(0), useSystemFonts: true });
        const doc = await task.promise;
        if (!active) return;
        setPdfDocA(doc);
      } catch (err: any) {
        console.error('Error loading Doc A:', err);
        if (active) setErrorMessage(isAr ? 'فشل تحميل ومعالجة المستند الأصلي (A)' : 'Failed to load Document A');
      } finally {
        if (active) setIsLoadingDocs(false);
      }
    };

    loadA();
    return () => { active = false; };
  }, [fileA]);

  // Load and prepare Document B
  useEffect(() => {
    let active = true;
    if (!fileB) {
      setPdfDataB(null);
      setPdfDocB(null);
      return;
    }

    const loadB = async () => {
      try {
        setIsLoadingDocs(true);
        setStatusMessage(isAr ? 'جارٍ تحضير المستند المقارن (B)...' : 'Preparing Document B...');
        const bytes = await preparePdfData(fileB);
        if (!active) return;
        setPdfDataB(bytes);

        const task = pdfjsLib.getDocument({ data: bytes.slice(0), useSystemFonts: true });
        const doc = await task.promise;
        if (!active) return;
        setPdfDocB(doc);
      } catch (err: any) {
        console.error('Error loading Doc B:', err);
        if (active) setErrorMessage(isAr ? 'فشل تحميل ومعالجة المستند المقارن (B)' : 'Failed to load Document B');
      } finally {
        if (active) setIsLoadingDocs(false);
      }
    };

    loadB();
    return () => { active = false; };
  }, [fileB]);

  // Calculate max pages when docs are ready
  useEffect(() => {
    if (pdfDocA || pdfDocB) {
      const countA = pdfDocA?.numPages || 0;
      const countB = pdfDocB?.numPages || 0;
      const maxPages = Math.max(1, Math.max(countA, countB));
      setTotalPages(maxPages);
      setCurrentPage((prev) => Math.min(prev, maxPages));
    }
  }, [pdfDocA, pdfDocB]);

  // Render Page onto Canvas and Compute Visual Diff
  useEffect(() => {
    let active = true;

    const renderActivePages = async () => {
      if (!pdfDocA && !pdfDocB) return;

      try {
        const renderScale = 1.6 * zoomScale; // High resolution crisp rendering

        let pageAImgData: ImageData | null = null;
        let pageBImgData: ImageData | null = null;
        let renderWidth = 600;
        let renderHeight = 840;

        // 1. Render Page A
        if (pdfDocA && canvasRefA.current && currentPage <= pdfDocA.numPages) {
          const pageA = await pdfDocA.getPage(currentPage);
          const viewportA = pageA.getViewport({ scale: renderScale });
          const canvasA = canvasRefA.current;
          canvasA.width = Math.floor(viewportA.width);
          canvasA.height = Math.floor(viewportA.height);
          renderWidth = canvasA.width;
          renderHeight = canvasA.height;

          const ctxA = canvasA.getContext('2d', { alpha: false })!;
          ctxA.fillStyle = '#ffffff';
          ctxA.fillRect(0, 0, canvasA.width, canvasA.height);

          await pageA.render({ canvasContext: ctxA, viewport: viewportA }).promise;
          pageAImgData = ctxA.getImageData(0, 0, canvasA.width, canvasA.height);
        } else if (canvasRefA.current) {
          const canvasA = canvasRefA.current;
          canvasA.width = 400;
          canvasA.height = 600;
          const ctxA = canvasA.getContext('2d')!;
          ctxA.fillStyle = '#f8fafc';
          ctxA.fillRect(0, 0, canvasA.width, canvasA.height);
          ctxA.fillStyle = '#94a3b8';
          ctxA.font = '14px sans-serif';
          ctxA.textAlign = 'center';
          ctxA.fillText(isAr ? 'الصفحة غير موجودة في المستند A' : 'Page does not exist in Doc A', 200, 300);
        }

        // 2. Render Page B
        if (pdfDocB && canvasRefB.current && currentPage <= pdfDocB.numPages) {
          const pageB = await pdfDocB.getPage(currentPage);
          const viewportB = pageB.getViewport({ scale: renderScale });
          const canvasB = canvasRefB.current;
          canvasB.width = Math.floor(viewportB.width);
          canvasB.height = Math.floor(viewportB.height);
          if (!renderWidth || renderWidth === 400) {
            renderWidth = canvasB.width;
            renderHeight = canvasB.height;
          }

          const ctxB = canvasB.getContext('2d', { alpha: false })!;
          ctxB.fillStyle = '#ffffff';
          ctxB.fillRect(0, 0, canvasB.width, canvasB.height);

          await pageB.render({ canvasContext: ctxB, viewport: viewportB }).promise;
          pageBImgData = ctxB.getImageData(0, 0, canvasB.width, canvasB.height);
        } else if (canvasRefB.current) {
          const canvasB = canvasRefB.current;
          canvasB.width = 400;
          canvasB.height = 600;
          const ctxB = canvasB.getContext('2d')!;
          ctxB.fillStyle = '#f8fafc';
          ctxB.fillRect(0, 0, canvasB.width, canvasB.height);
          ctxB.fillStyle = '#94a3b8';
          ctxB.font = '14px sans-serif';
          ctxB.textAlign = 'center';
          ctxB.fillText(isAr ? 'الصفحة غير موجودة في المستند B' : 'Page does not exist in Doc B', 200, 300);
        }

        // 3. Compute Visual Pixel Diff for Overlay Canvas
        if (overlayCanvasRef.current && pageAImgData && pageBImgData) {
          const ovCanvas = overlayCanvasRef.current;
          ovCanvas.width = renderWidth;
          ovCanvas.height = renderHeight;
          const ovCtx = ovCanvas.getContext('2d')!;
          const diffImgData = ovCtx.createImageData(renderWidth, renderHeight);

          const len = Math.min(pageAImgData.data.length, pageBImgData.data.length);
          let diffPixels = 0;
          const totalPixels = len / 4;

          for (let i = 0; i < len; i += 4) {
            const r1 = pageAImgData.data[i];
            const g1 = pageAImgData.data[i + 1];
            const b1 = pageAImgData.data[i + 2];

            const r2 = pageBImgData.data[i];
            const g2 = pageBImgData.data[i + 1];
            const b2 = pageBImgData.data[i + 2];

            const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);

            if (diff > 45) {
              diffPixels++;
              // Highlight discrepancy in glowing red
              diffImgData.data[i] = 239;     // R
              diffImgData.data[i + 1] = 68;  // G
              diffImgData.data[i + 2] = 68;  // B
              diffImgData.data[i + 3] = 240; // Alpha
            } else {
              // Muted grayscale background of page A
              const gray = Math.round((r1 * 0.299) + (g1 * 0.587) + (b1 * 0.114));
              diffImgData.data[i] = gray;
              diffImgData.data[i + 1] = gray;
              diffImgData.data[i + 2] = gray;
              diffImgData.data[i + 3] = 160;
            }
          }

          ovCtx.putImageData(diffImgData, 0, 0);

          const diffPct = parseFloat(((diffPixels / Math.max(totalPixels, 1)) * 100).toFixed(2));
          if (active) {
            setPageDiffs((prev) => ({
              ...prev,
              [currentPage]: {
                pageNum: currentPage,
                diffPercent: diffPct,
                hasDiff: diffPct > 0.05,
                pixelCount: diffPixels,
              },
            }));
          }
        }
      } catch (err) {
        console.error('Render error:', err);
      }
    };

    renderActivePages();
    return () => { active = false; };
  }, [pdfDocA, pdfDocB, currentPage, zoomScale]);

  // Handle Dragging Split Slider
  const handleSliderMouseDown = () => {
    setIsDraggingSlider(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSlider || !sliderContainerRef.current) return;
      const rect = sliderContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
      setSliderPosition(pct);
    };

    const handleMouseUp = () => {
      setIsDraggingSlider(false);
    };

    if (isDraggingSlider) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSlider]);

  // Upload handler for Slot A or B
  const handleSlotUpload = async (slot: 'A' | 'B', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await readFileAsUint8Array(file);
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const uploaded: UploadedFile = {
        id: `vcomp-${slot}-${Date.now()}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/pdf',
        extension: ext,
        data,
      };

      if (slot === 'A') {
        setFileA(uploaded);
      } else {
        setFileB(uploaded);
      }
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(isAr ? 'فشل تحميل الملف' : 'Failed to load file');
    }
  };

  // Swap Slot A and B
  const handleSwapSlots = () => {
    const tempA = fileA;
    setFileA(fileB);
    setFileB(tempA);
  };

  // Jump to Next Difference
  const handleJumpNextDiff = () => {
    for (let p = currentPage + 1; p <= totalPages; p++) {
      if (pageDiffs[p]?.hasDiff) {
        setCurrentPage(p);
        return;
      }
    }
    // Wrap around
    for (let p = 1; p <= currentPage; p++) {
      if (pageDiffs[p]?.hasDiff) {
        setCurrentPage(p);
        return;
      }
    }
  };

  // Export current visual diff page as PNG
  const handleExportDiffImage = () => {
    if (!overlayCanvasRef.current) return;
    overlayCanvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const name = `VisualDiff_Page${currentPage}_${Date.now()}.png`;
      triggerDownload(blob, name);
    }, 'image/png');
  };

  // Export Complete Audit Report
  const handleExportReport = () => {
    if (!fileA || !fileB) return;
    const diffEntries: PageDiffInfo[] = Object.values(pageDiffs);
    const pagesWithDiff = diffEntries.filter((d) => d.hasDiff);

    let report = `========================================================\n`;
    report += `${isAr ? 'تقرير المقارنة البصرية للمستندات - DocStudio' : 'Visual Document Comparison Report - DocStudio'}\n`;
    report += `========================================================\n\n`;
    report += `${isAr ? 'تاريخ التقرير' : 'Report Date'}: ${new Date().toLocaleString()}\n`;
    report += `${isAr ? 'المستند الأصلي (A)' : 'Document A (Original)'}: ${fileA.name} (${formatFileSize(fileA.size, lang)})\n`;
    report += `${isAr ? 'المستند المقارن (B)' : 'Document B (Modified)'}: ${fileB.name} (${formatFileSize(fileB.size, lang)})\n`;
    report += `${isAr ? 'إجمالي الصفحات المفحوصة' : 'Total Pages Audited'}: ${totalPages}\n`;
    report += `${isAr ? 'الصفحات التي تحتوي على فروقات' : 'Pages with Visual Differences'}: ${pagesWithDiff.length}\n\n`;

    report += `--------------------------------------------------------\n`;
    report += `${isAr ? 'تفاصيل كل صفحة' : 'Page-by-Page Discrepancies'}:\n`;
    for (let p = 1; p <= totalPages; p++) {
      const info = pageDiffs[p];
      if (info) {
        report += `${isAr ? 'صفحة' : 'Page'} ${p}: ${info.hasDiff ? (isAr ? `توجد فروقات (${info.diffPercent}% من مساحة الصفحة)` : `Differences detected (${info.diffPercent}% of page)`) : (isAr ? 'متطابقة تماماً (100%)' : 'Identical (100%)')}\n`;
      } else {
        report += `${isAr ? 'صفحة' : 'Page'} ${p}: ${isAr ? 'لم يتم فحصها بعد' : 'Not yet reviewed'}\n`;
      }
    }
    report += `--------------------------------------------------------\n`;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const name = `VisualCompare_Report_${getBaseFileName(fileA.name)}_vs_${getBaseFileName(fileB.name)}.txt`;
    triggerDownload(blob, name);
  };

  const currentDiff = pageDiffs[currentPage];

  return (
    <div id="visual-compare-view" className="w-full max-w-7xl mx-auto space-y-4 animate-fadeIn pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
            title={isAr ? 'العودة' : 'Back'}
          >
            {isAr ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? 'المقارنة البصرية للمستندات' : 'Visual Document Compare'}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 font-semibold">
                PRO
              </span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr ? 'مقارنة دقيقة صفحة بصفحة وإبراز الفروقات والتعديلات بصرياً' : 'Page-by-page visual difference audit and side-by-side comparison'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportDiffImage}
            className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title={isAr ? 'تنزيل صورة الفروقات للصفحة الحالية' : 'Download diff image'}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAr ? 'تصدير صورة الفروقات' : 'Export Diff Image'}</span>
          </button>
          <button
            onClick={handleExportReport}
            className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isAr ? 'تقرير المقارنة' : 'Full Report'}</span>
          </button>
        </div>
      </div>

      {/* Document Selection Slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
        {/* Slot A */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
              {isAr ? 'المستند الأصلي (A)' : 'Original Document (A)'}
            </span>
            <label className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold cursor-pointer flex items-center gap-1">
              <Upload className="w-3.5 h-3.5" />
              <span>{fileA ? (isAr ? 'تغيير الملف' : 'Change') : (isAr ? 'اختيار ملف' : 'Select')}</span>
              <input type="file" accept=".pdf,.docx,.doc,.pptx,.png,.jpg,.jpeg" onChange={(e) => handleSlotUpload('A', e)} className="hidden" />
            </label>
          </div>
          {fileA ? (
            <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300 truncate">
              <span className="font-medium truncate">{fileA.name}</span>
              <span className="font-mono text-neutral-400 shrink-0 ml-2">{formatFileSize(fileA.size, lang)}</span>
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">{isAr ? 'لم يتم اختيار ملف' : 'No document selected'}</p>
          )}
        </div>

        {/* Swap Button In Middle */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <button
            onClick={handleSwapSlots}
            className="p-2 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-md hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-transform active:scale-95 cursor-pointer"
            title={isAr ? 'تبديل المستندين (A <-> B)' : 'Swap Documents'}
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* Slot B */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
              {isAr ? 'المستند المقارن (B)' : 'Modified Document (B)'}
            </span>
            <label className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold cursor-pointer flex items-center gap-1">
              <Upload className="w-3.5 h-3.5" />
              <span>{fileB ? (isAr ? 'تغيير الملف' : 'Change') : (isAr ? 'اختيار ملف' : 'Select')}</span>
              <input type="file" accept=".pdf,.docx,.doc,.pptx,.png,.jpg,.jpeg" onChange={(e) => handleSlotUpload('B', e)} className="hidden" />
            </label>
          </div>
          {fileB ? (
            <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300 truncate">
              <span className="font-medium truncate">{fileB.name}</span>
              <span className="font-mono text-neutral-400 shrink-0 ml-2">{formatFileSize(fileB.size, lang)}</span>
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">{isAr ? 'لم يتم اختيار ملف' : 'No document selected'}</p>
          )}
        </div>
      </div>

      {/* View Mode & Page Navigation Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
        {/* Comparison Modes */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs">
          <button
            onClick={() => setViewMode('sideBySide')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'sideBySide'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>{isAr ? 'جنباً إلى جنب' : 'Side-by-Side'}</span>
          </button>

          <button
            onClick={() => setViewMode('slider')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'slider'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isAr ? 'شريط التمرير' : 'Split Slider'}</span>
          </button>

          <button
            onClick={() => setViewMode('overlay')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'overlay'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isAr ? 'تراكب الفروقات' : 'Diff Overlay'}</span>
          </button>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <span className="text-xs font-mono font-bold px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
            {isAr ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          <button
            onClick={handleJumpNextDiff}
            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title={isAr ? 'الانتقال للصفحة التالية التي تحوي تعديلات' : 'Jump to next modified page'}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">{isAr ? 'الفرق التالي' : 'Next Diff'}</span>
          </button>
        </div>

        {/* Zoom Controls & Difference Indicator */}
        <div className="flex items-center gap-3">
          {currentDiff && (
            <div className="flex items-center gap-1.5 text-xs">
              {currentDiff.hasDiff ? (
                <span className="flex items-center gap-1 font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-900/40">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{isAr ? `فروقات: ${currentDiff.diffPercent}%` : `Diff: ${currentDiff.diffPercent}%`}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/40">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'متطابقة 100%' : '100% Identical'}</span>
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 border border-neutral-200 dark:border-neutral-700 rounded-lg p-0.5">
            <button
              onClick={() => setZoomScale((z) => Math.max(0.6, z - 0.2))}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-400 cursor-pointer"
              title={isAr ? 'تصغير' : 'Zoom Out'}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1 text-neutral-600 dark:text-neutral-300">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={() => setZoomScale((z) => Math.min(2.2, z + 0.2))}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-400 cursor-pointer"
              title={isAr ? 'تكبير' : 'Zoom In'}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Comparison Canvas Stage */}
      <div className="w-full min-h-[550px] p-4 rounded-3xl bg-neutral-100/80 dark:bg-neutral-950/60 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-center overflow-auto shadow-inner">
        {/* MODE 1: SIDE-BY-SIDE */}
        {viewMode === 'sideBySide' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl items-start justify-items-center">
            {/* Page A Container */}
            <div className="flex flex-col items-center space-y-2 w-full">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shadow-2xs">
                {isAr ? 'المستند A' : 'Document A'} ({fileA?.name || 'Empty'})
              </span>
              <div className="p-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-lg max-w-full overflow-hidden">
                <canvas ref={canvasRefA} className="max-w-full h-auto rounded-xl shadow-xs" />
              </div>
            </div>

            {/* Page B Container */}
            <div className="flex flex-col items-center space-y-2 w-full">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 shadow-2xs">
                {isAr ? 'المستند B' : 'Document B'} ({fileB?.name || 'Empty'})
              </span>
              <div className="p-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-lg max-w-full overflow-hidden">
                <canvas ref={canvasRefB} className="max-w-full h-auto rounded-xl shadow-xs" />
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: SPLIT SLIDER SWIPE */}
        {viewMode === 'slider' && (
          <div className="flex flex-col items-center space-y-3 max-w-3xl w-full">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-500" />
              <span>{isAr ? 'اسحب الخط العمودي في المنتصف للمقارنة التفاعلية قبل وبعد' : 'Drag the vertical divider to compare before and after'}</span>
            </div>

            <div
              ref={sliderContainerRef}
              className="relative select-none overflow-hidden rounded-2xl border border-neutral-300 dark:border-neutral-700 shadow-2xl bg-white dark:bg-neutral-900 cursor-ew-resize max-w-full"
              style={{ width: canvasRefA.current?.width ? `${canvasRefA.current.width}px` : '600px' }}
              onMouseDown={handleSliderMouseDown}
            >
              {/* Bottom Layer: Document A */}
              <canvas ref={canvasRefA} className="w-full h-auto block" />

              {/* Top Clipped Layer: Document B */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)` }}
              >
                <canvas ref={canvasRefB} className="w-full h-auto block" />
              </div>

              {/* Interactive Divider Handle */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-blue-600 cursor-ew-resize z-20 flex items-center justify-center shadow-lg"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl border-2 border-white pointer-events-none">
                  <Split className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Labels on sides */}
              <span className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 text-white text-[10px] font-bold z-10">
                {isAr ? 'مستند A' : 'Doc A'}
              </span>
              <span className="absolute top-3 right-3 px-2 py-1 rounded bg-black/60 text-white text-[10px] font-bold z-10">
                {isAr ? 'مستند B' : 'Doc B'}
              </span>
            </div>
          </div>
        )}

        {/* MODE 3: VISUAL DIFF OVERLAY */}
        {viewMode === 'overlay' && (
          <div className="flex flex-col items-center space-y-3 max-w-3xl w-full">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-500" />
              <span>
                {isAr 
                  ? 'يتم إبراز النصوص والمخططات والرسومات المعدلة أو المضافة باللون الأحمر المتوهج' 
                  : 'Modified, added, or deleted areas are highlighted in red'}
              </span>
            </div>

            <div className="p-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-full overflow-hidden">
              <canvas ref={overlayCanvasRef} className="max-w-full h-auto rounded-xl shadow-xs" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Page Thumbnail Strip */}
      <div className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 shrink-0 px-2">
          {isAr ? 'الصفحات:' : 'Pages:'}
        </span>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
          const diff = pageDiffs[p];
          const isSelected = p === currentPage;
          return (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <span>{p}</span>
              {diff && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    diff.hasDiff ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                  title={diff.hasDiff ? (isAr ? 'يوجد تعديلات' : 'Has differences') : (isAr ? 'متطابقة' : 'Identical')}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
