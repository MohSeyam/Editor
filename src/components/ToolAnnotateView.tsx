import React, { useRef, useState, useEffect } from 'react';
import { 
  PenTool, 
  Highlighter, 
  Type, 
  Square, 
  RotateCcw, 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  ChevronLeft, 
  ChevronRight,
  Palette,
  CheckCircle2
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { UploadedFile, Language, ResultItem } from '../types';
import { renderPdfPageThumbnail } from '../utils/pdfThumbnail';

interface ToolAnnotateViewProps {
  file: UploadedFile;
  lang: Language;
  onFinished: (result: ResultItem) => void;
  onBack: () => void;
}

interface AnnotationItem {
  id: string;
  page: number;
  tool: 'pen' | 'highlighter' | 'text' | 'rect';
  color: string;
  strokeWidth: number;
  opacity: number;
  points?: Array<{ x: number; y: number }>; // in percentage 0-100
  text?: string;
  x?: number; // percentage
  y?: number; // percentage
  width?: number; // percentage
  height?: number; // percentage
  fontSize?: number;
}

export const ToolAnnotateView: React.FC<ToolAnnotateViewProps> = ({
  file,
  lang,
  onFinished,
  onBack,
}) => {
  const isAr = lang === 'ar';
  const totalPages = file.pageCount || 1;

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeTool, setActiveTool] = useState<'pen' | 'highlighter' | 'text' | 'rect'>('pen');
  const [activeColor, setActiveColor] = useState<string>('#ef4444');
  const [strokeSize, setStrokeSize] = useState<number>(3);
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [pageThumbnailUrl, setPageThumbnailUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Canvas drawing ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const currentPathRef = useRef<Array<{ x: number; y: number }>>([]);

  // Text insertion state
  const [textInput, setTextInput] = useState<string>('');
  const [textPlacement, setTextPlacement] = useState<{ x: number; y: number } | null>(null);

  // Load thumbnail for current page
  useEffect(() => {
    let isMounted = true;
    renderPdfPageThumbnail(file.data, currentPage, 800)
      .then((url) => {
        if (isMounted && url) {
          setPageThumbnailUrl(url);
        }
      })
      .catch((err) => console.warn('Could not load page for annotation:', err));

    return () => {
      isMounted = false;
    };
  }, [file.data, currentPage]);

  // Redraw annotations on canvas whenever page or annotations change
  const redrawCanvas = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, cvs.width, cvs.height);

    const pageAnns = annotations.filter((a) => a.page === currentPage);
    for (const ann of pageAnns) {
      ctx.save();
      ctx.globalAlpha = ann.opacity;

      if ((ann.tool === 'pen' || ann.tool === 'highlighter') && ann.points && ann.points.length > 1) {
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.strokeWidth * (cvs.width / 500);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();

        const p0 = ann.points[0];
        ctx.moveTo((p0.x / 100) * cvs.width, (p0.y / 100) * cvs.height);

        for (let i = 1; i < ann.points.length; i++) {
          const pt = ann.points[i];
          ctx.lineTo((pt.x / 100) * cvs.width, (pt.y / 100) * cvs.height);
        }
        ctx.stroke();
      } else if (ann.tool === 'text' && ann.text && ann.x !== undefined && ann.y !== undefined) {
        ctx.fillStyle = ann.color;
        const fontPx = (ann.fontSize || 16) * (cvs.width / 500);
        ctx.font = `600 ${fontPx}px system-ui, sans-serif`;
        ctx.fillText(ann.text, (ann.x / 100) * cvs.width, (ann.y / 100) * cvs.height);
      } else if (ann.tool === 'rect' && ann.x !== undefined && ann.y !== undefined && ann.width && ann.height) {
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.strokeWidth * (cvs.width / 500);
        ctx.strokeRect(
          (ann.x / 100) * cvs.width,
          (ann.y / 100) * cvs.height,
          (ann.width / 100) * cvs.width,
          (ann.height / 100) * cvs.height
        );
      }

      ctx.restore();
    }
  };

  useEffect(() => {
    redrawCanvas();
  }, [annotations, currentPage, pageThumbnailUrl]);

  // Pointer event handlers for drawing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeTool === 'text') {
      setTextPlacement({ x: xPct, y: yPct });
      return;
    }

    setIsDrawing(true);
    currentPathRef.current = [{ x: xPct, y: yPct }];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const cvs = canvasRef.current;
    const rect = cvs.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    currentPathRef.current.push({ x: xPct, y: yPct });

    // Live preview of current stroke
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = activeTool === 'highlighter' ? 0.35 : 1.0;
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = (activeTool === 'highlighter' ? strokeSize * 3 : strokeSize) * (cvs.width / 500);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const pts = currentPathRef.current;
    if (pts.length > 1) {
      const prev = pts[pts.length - 2];
      ctx.beginPath();
      ctx.moveTo((prev.x / 100) * cvs.width, (prev.y / 100) * cvs.height);
      ctx.lineTo((xPct / 100) * cvs.width, (yPct / 100) * cvs.height);
      ctx.stroke();
    }
    ctx.restore();
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPathRef.current.length > 1) {
      const newAnn: AnnotationItem = {
        id: Math.random().toString(36).substring(7),
        page: currentPage,
        tool: activeTool === 'highlighter' ? 'highlighter' : 'pen',
        color: activeColor,
        strokeWidth: activeTool === 'highlighter' ? strokeSize * 3 : strokeSize,
        opacity: activeTool === 'highlighter' ? 0.35 : 1.0,
        points: [...currentPathRef.current],
      };
      setAnnotations((prev) => [...prev, newAnn]);
    }
    currentPathRef.current = [];
  };

  const addTextAnnotation = () => {
    if (!textInput.trim() || !textPlacement) return;
    const newAnn: AnnotationItem = {
      id: Math.random().toString(36).substring(7),
      page: currentPage,
      tool: 'text',
      color: activeColor,
      strokeWidth: 1,
      opacity: 1.0,
      text: textInput.trim(),
      x: textPlacement.x,
      y: textPlacement.y,
      fontSize: 16,
    };
    setAnnotations((prev) => [...prev, newAnn]);
    setTextInput('');
    setTextPlacement(null);
  };

  const undoLastAnnotation = () => {
    setAnnotations((prev) => {
      const pageAnns = prev.filter((a) => a.page === currentPage);
      if (pageAnns.length === 0) return prev;
      const lastId = pageAnns[pageAnns.length - 1].id;
      return prev.filter((a) => a.id !== lastId);
    });
  };

  const clearPageAnnotations = () => {
    setAnnotations((prev) => prev.filter((a) => a.page !== currentPage));
  };

  // Convert hex color to rgb [0-1]
  const hexToRgb01 = (hex: string) => {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = ((num >> 16) & 255) / 255;
    const g = ((num >> 8) & 255) / 255;
    const b = (num & 255) / 255;
    return rgb(r, g, b);
  };

  // Burn annotations into PDF using pdf-lib
  const handleSaveAndExport = async () => {
    try {
      setIsSaving(true);
      const pdfDoc = await PDFDocument.load(file.data);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();

      for (const ann of annotations) {
        const pageIdx = ann.page - 1;
        if (pageIdx < 0 || pageIdx >= pages.length) continue;
        const page = pages[pageIdx];
        const { width, height } = page.getSize();
        const colorRgb = hexToRgb01(ann.color);

        if ((ann.tool === 'pen' || ann.tool === 'highlighter') && ann.points && ann.points.length > 1) {
          for (let i = 1; i < ann.points.length; i++) {
            const p1 = ann.points[i - 1];
            const p2 = ann.points[i];
            // Invert Y axis for PDF coordinates (origin at bottom-left)
            page.drawLine({
              start: { x: (p1.x / 100) * width, y: height - (p1.y / 100) * height },
              end: { x: (p2.x / 100) * width, y: height - (p2.y / 100) * height },
              thickness: Math.max(1, ann.strokeWidth * (width / 500)),
              color: colorRgb,
              opacity: ann.opacity,
            });
          }
        } else if (ann.tool === 'text' && ann.text && ann.x !== undefined && ann.y !== undefined) {
          const fontSize = Math.max(10, (ann.fontSize || 14) * (width / 500));
          page.drawText(ann.text, {
            x: (ann.x / 100) * width,
            y: height - (ann.y / 100) * height - fontSize,
            size: fontSize,
            font: helveticaFont,
            color: colorRgb,
            opacity: ann.opacity,
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const downloadName = `${baseName}_annotated.pdf`;

      const result: ResultItem = {
        name: downloadName,
        downloadName,
        blob,
        url: URL.createObjectURL(blob),
        size: blob.size,
        type: 'application/pdf',
      };

      setIsSaving(false);
      onFinished(result);
    } catch (err) {
      console.error('Save annotations error:', err);
      setIsSaving(false);
    }
  };

  const paletteColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#1c1c1e'];

  return (
    <div id="tool-annotate-view" className="max-w-5xl mx-auto px-4 py-4 space-y-4 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          <span>{isAr ? 'رجوع' : 'Back'}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'تدوين الملاحظات والرسم على PDF' : 'PDF Annotations & Markup'}
          </span>
          <span className="text-xs text-neutral-400">({file.name})</span>
        </div>

        <button
          type="button"
          onClick={handleSaveAndExport}
          disabled={isSaving}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium text-xs shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ وتصدير النسخة المعدلة' : 'Save & Export PDF')}</span>
        </button>
      </div>

      {/* Toolbar & Canvas Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Left / Top: Tools Palette */}
        <div className="md:col-span-4 p-4 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-xs space-y-4">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              {isAr ? 'أدوات التدوين' : 'Annotation Tools'}
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'pen', icon: PenTool, label: isAr ? 'قلم' : 'Pen' },
                { id: 'highlighter', icon: Highlighter, label: isAr ? 'تمييز' : 'Highlight' },
                { id: 'text', icon: Type, label: isAr ? 'نص' : 'Text' },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = activeTool === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTool(t.id as any)}
                    className={`py-2 px-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                        : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              {isAr ? 'اللون' : 'Color'}
            </span>
            <div className="flex items-center gap-2">
              {paletteColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                    activeColor === c ? 'scale-115 border-blue-500 shadow-xs' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Stroke Width */}
          {activeTool !== 'text' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
                <span>{isAr ? 'سمك الخط:' : 'Stroke Size:'}</span>
                <span className="font-mono">{strokeSize}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={strokeSize}
                onChange={(e) => setStrokeSize(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          )}

          {/* Text Insertion Form */}
          {activeTool === 'text' && (
            <div className="space-y-2 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block">
                {textPlacement
                  ? (isAr ? 'أدخل نص الملاحظة واضغط إضافة:' : 'Enter text note and click Add:')
                  : (isAr ? 'انقر على موضع في الصفحة لإدراج النص' : 'Click on page to place text')}
              </span>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={isAr ? 'اكتب ملاحظتك هنا...' : 'Type your note here...'}
                className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 text-xs bg-white dark:bg-black/40 text-neutral-900 dark:text-white"
              />
              <button
                type="button"
                onClick={addTextAnnotation}
                disabled={!textInput.trim() || !textPlacement}
                className="w-full py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
              >
                {isAr ? 'إدراج الملاحظة' : 'Place Note'}
              </button>
            </div>
          )}

          {/* Page Navigation & Undo */}
          <div className="pt-2 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded-md border border-neutral-200 dark:border-neutral-700 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
              <span className="px-2 font-mono font-medium text-neutral-600 dark:text-neutral-400">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded-md border border-neutral-200 dark:border-neutral-700 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={undoLastAnnotation}
                title={isAr ? 'تراجع عن آخر خطوة' : 'Undo'}
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer text-xs flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isAr ? 'تراجع' : 'Undo'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Document Page Stage with Drawing Overlay Canvas */}
        <div className="md:col-span-8 p-4 rounded-3xl bg-neutral-100 dark:bg-black/30 border border-neutral-200/80 dark:border-white/10 flex items-center justify-center min-h-[520px] overflow-auto">
          <div className="relative rounded-xl shadow-lg border border-neutral-300 dark:border-white/10 bg-white overflow-hidden max-w-full">
            {pageThumbnailUrl ? (
              <img
                src={pageThumbnailUrl}
                alt={`Page ${currentPage}`}
                className="max-h-[640px] w-auto block select-none pointer-events-none"
              />
            ) : (
              <div className="w-[450px] h-[600px] flex items-center justify-center text-xs text-neutral-400">
                {isAr ? 'جارٍ تحميل معاينة الصفحة...' : 'Loading page preview...'}
              </div>
            )}

            {/* Interactive Overlay Canvas */}
            <canvas
              ref={canvasRef}
              width={800}
              height={1100}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
