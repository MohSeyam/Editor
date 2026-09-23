import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Layers, 
  Eye, 
  X,
  FileText,
  Sparkles
} from 'lucide-react';
import { Language } from '../types';

// Ensure PDF.js worker is properly configured across all browsers
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  }
}

interface PdfDocumentPreviewProps {
  pdfData: Uint8Array;
  fileName?: string;
  lang: Language;
  initialPage?: number;
  className?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const PdfDocumentPreview: React.FC<PdfDocumentPreviewProps> = ({
  pdfData,
  fileName = 'Document.pdf',
  lang,
  initialPage = 1,
  className = '',
  onClose,
  isModal = false,
}) => {
  const isAr = lang === 'ar';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(1.0);
  const [viewRotation, setViewRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showThumbSidebar, setShowThumbSidebar] = useState<boolean>(true);
  const [pageThumbnails, setPageThumbnails] = useState<Record<number, string>>({});

  // 1. Load PDF document
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    const loadDoc = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({
          data: pdfData.slice(0),
          useSystemFonts: true,
        });
        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(Math.min(initialPage, doc.numPages));
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('Failed to load PDF document for preview:', err);
        if (!isCancelled) {
          setError(isAr ? 'تعذر تحميل معاينة ملف PDF' : 'Failed to load PDF preview');
          setIsLoading(false);
        }
      }
    };

    loadDoc();

    return () => {
      isCancelled = true;
    };
  }, [pdfData, initialPage, isAr]);

  // 2. Render active page on canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || currentPage < 1 || currentPage > totalPages) {
      return;
    }

    let isCancelled = false;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const viewport = page.getViewport({
          scale: scale * 1.5, // render with high DPI clarity
          rotation: (page.rotate + viewRotation) % 360,
        });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / 1.5)}px`;
        canvas.style.height = `${Math.floor(viewport.height / 1.5)}px`;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Page render warning:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfDoc, currentPage, scale, viewRotation, totalPages]);

  // 3. Load quick mini-thumbnails for sidebar
  useEffect(() => {
    if (!pdfDoc || totalPages === 0) return;
    let isCancelled = false;

    const loadMiniThumbs = async () => {
      const thumbs: Record<number, string> = {};
      const count = Math.min(totalPages, 20); // load first 20 thumbnails
      for (let p = 1; p <= count; p++) {
        if (isCancelled) break;
        try {
          const page = await pdfDoc.getPage(p);
          const vp = page.getViewport({ scale: 0.25 });
          const c = document.createElement('canvas');
          c.width = Math.floor(vp.width);
          c.height = Math.floor(vp.height);
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, c.width, c.height);
            await page.render({ canvasContext: ctx, viewport: vp }).promise;
            thumbs[p] = c.toDataURL('image/jpeg', 0.8);
            if (p === 1 || p % 4 === 0) {
              setPageThumbnails({ ...thumbs });
            }
          }
        } catch {
          // ignore
        }
      }
      if (!isCancelled) {
        setPageThumbnails(thumbs);
      }
    };

    loadMiniThumbs();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, totalPages]);

  const handlePrevPage = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  };

  const handleZoomIn = () => {
    setScale((s) => Math.min(2.5, +(s + 0.15).toFixed(2)));
  };

  const handleZoomOut = () => {
    setScale((s) => Math.max(0.5, +(s - 0.15).toFixed(2)));
  };

  const handleResetZoom = () => {
    setScale(1.0);
    setViewRotation(0);
  };

  const handleRotate = () => {
    setViewRotation((r) => (r + 90) % 360);
  };

  const content = (
    <div className={`flex flex-col bg-neutral-100 dark:bg-[#151516] rounded-3xl border border-neutral-200/80 dark:border-white/10 overflow-hidden shadow-md ${className}`}>
      {/* Top Toolbar */}
      <div className="px-4 py-3 bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-md border-b border-neutral-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowThumbSidebar((v) => !v)}
            title={isAr ? 'عرض/إخفاء شريط الصفحات' : 'Toggle Thumbnails'}
            className={`p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              showThumbSidebar
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-semibold truncate max-w-[140px] sm:max-w-[220px]">
              {fileName}
            </span>
          </div>
        </div>

        {/* Page Navigation & Controls */}
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-[#2c2c2e] p-1 rounded-xl border border-neutral-200/60 dark:border-white/5">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            title={isAr ? 'الصفحة السابقة' : 'Previous Page'}
            className="p-1 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <span className="text-xs font-mono font-medium px-2 text-neutral-800 dark:text-neutral-200">
            {currentPage} / {totalPages || 1}
          </span>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            title={isAr ? 'الصفحة التالية' : 'Next Page'}
            className="p-1 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            title={isAr ? 'تصغير' : 'Zoom Out'}
            className="p-1.5 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            title={isAr ? 'إعادة ضبط الحجم' : 'Reset Scale'}
            className="px-2 py-1 rounded-xl text-xs font-mono text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            title={isAr ? 'تكبير' : 'Zoom In'}
            className="p-1.5 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleRotate}
            title={isAr ? 'تدوير المعاينة' : 'Rotate Preview'}
            className="p-1.5 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title={isAr ? 'إغلاق المعاينة' : 'Close Preview'}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors cursor-pointer mr-1 rtl:mr-1 rtl:ml-0 ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas & Thumbnails Area */}
      <div className="flex-1 flex overflow-hidden min-h-[380px] max-h-[620px] relative">
        {/* Thumbnails Sidebar */}
        {showThumbSidebar && totalPages > 1 && (
          <div className="w-24 sm:w-28 bg-white/70 dark:bg-[#1a1a1c]/70 border-r rtl:border-r-0 rtl:border-l border-neutral-200/70 dark:border-white/5 overflow-y-auto p-2 space-y-2 shrink-0">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              const isActive = currentPage === pageNum;
              const thumbUrl = pageThumbnails[pageNum];

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-full rounded-xl p-1.5 text-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-500 shadow-sm'
                      : 'border border-neutral-200 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="w-full aspect-[3/4] rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={`Page ${pageNum}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {pageNum}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mt-1 block">
                    {isAr ? `ص ${pageNum}` : `p. ${pageNum}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Canvas Display Viewport */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-neutral-200/40 dark:bg-[#0c0c0e]">
          {isLoading && (
            <div className="flex flex-col items-center gap-2 text-xs text-neutral-400">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>{isAr ? 'جارٍ تحضير المعاينة...' : 'Rendering preview...'}</span>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-500 p-4 text-center">
              {error}
            </div>
          )}

          <canvas
            ref={canvasRef}
            className={`rounded-xl shadow-lg border border-neutral-300 dark:border-white/10 transition-transform duration-200 ${
              isLoading || error ? 'hidden' : 'block'
            }`}
          />
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
        <div className="w-full max-w-4xl max-h-[90vh] flex flex-col">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
