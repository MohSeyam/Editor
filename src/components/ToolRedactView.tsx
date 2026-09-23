import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  Trash2, 
  Plus, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  EyeOff,
  FileText,
  Sliders,
  Sparkles,
  Lock
} from 'lucide-react';
import { UploadedFile, Language, RedactionBox, RedactSettings } from '../types';
import { renderPdfPageThumbnail } from '../utils/pdfThumbnail';

interface ToolRedactViewProps {
  file: UploadedFile;
  lang: Language;
  onExecute: (settings: RedactSettings) => void;
  onBack: () => void;
}

export const ToolRedactView: React.FC<ToolRedactViewProps> = ({
  file,
  lang,
  onExecute,
  onBack,
}) => {
  const isAr = lang === 'ar';
  const totalPages = file.pageCount || 1;

  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [pagePreviewUrl, setPagePreviewUrl] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<RedactionBox[]>([]);
  const [fillColor, setFillColor] = useState<'black' | 'white'>('black');
  const [scrubMetadata, setScrubMetadata] = useState<boolean>(true);
  const [addLabel, setAddLabel] = useState<boolean>(false);
  const [labelText, setLabelText] = useState<string>(isAr ? 'محجوب' : 'REDACTED');

  // Interactive drawing on preview container
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);

  // Load thumbnail of current page
  useEffect(() => {
    let isCurrent = true;
    renderPdfPageThumbnail(file.data, selectedPage, 800)
      .then((url) => {
        if (isCurrent && url) setPagePreviewUrl(url);
      })
      .catch((err) => console.warn('Could not load redact page thumbnail:', err));

    return () => {
      isCurrent = false;
    };
  }, [file.data, selectedPage]);

  // Handle drag to draw redaction box
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPos || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setCurrentPos({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !startPos || !currentPos) {
      setIsDrawing(false);
      setStartPos(null);
      setCurrentPos(null);
      return;
    }

    const xPercent = Math.min(startPos.x, currentPos.x);
    const yPercent = Math.min(startPos.y, currentPos.y);
    const widthPercent = Math.abs(currentPos.x - startPos.x);
    const heightPercent = Math.abs(currentPos.y - startPos.y);

    // Only add if box is non-trivial (at least 1% width & height)
    if (widthPercent > 1.5 && heightPercent > 1.5) {
      const newBox: RedactionBox = {
        id: `box-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        pageNumber: selectedPage,
        xPercent,
        yPercent,
        widthPercent,
        heightPercent,
        fillColor,
        labelText: addLabel ? labelText : undefined,
      };
      setBoxes((prev) => [...prev, newBox]);
    }

    setIsDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
  };

  const removeBox = (id: string) => {
    setBoxes((prev) => prev.filter((b) => b.id !== id));
  };

  const clearCurrentPageBoxes = () => {
    setBoxes((prev) => prev.filter((b) => b.pageNumber !== selectedPage));
  };

  const currentPageBoxes = boxes.filter((b) => b.pageNumber === selectedPage);

  const handleSubmit = () => {
    onExecute({
      boxes,
      scrubMetadata,
      defaultFill: fillColor,
      defaultLabel: addLabel ? labelText : undefined,
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Top Header */}
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
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{isAr ? 'حجب وتعتيم النصوص الحساسة' : 'Permanent Redaction'}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Document Viewer & Interactive Redaction Canvas */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <EyeOff className="w-4 h-4 text-rose-500" />
                <span>{isAr ? 'حدد المناطق المراد حجبها نهائياً' : 'Draw boxes over sensitive data'}</span>
              </h3>
              <p className="text-xs text-neutral-500">
                {isAr ? 'انقر واسحب فوق النصوص أو الأرقام أو الصور لحجبها بشكل لا يمكن استرجاعه' : 'Click & drag over text or regions to permanently blackout'}
              </p>
            </div>

            {/* Page Navigation */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-[#2c2c2e] p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedPage((p) => Math.max(1, p - 1))}
                  disabled={selectedPage <= 1}
                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                >
                  {isAr ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                </button>
                <span className="font-mono px-2 font-medium">
                  {selectedPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPage((p) => Math.min(totalPages, p + 1))}
                  disabled={selectedPage >= totalPages}
                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                >
                  {isAr ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Canvas area */}
          <div className="flex justify-center bg-neutral-100/70 dark:bg-[#151517] p-4 rounded-2xl border border-neutral-200/50 dark:border-white/5 overflow-hidden">
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="relative select-none cursor-crosshair max-w-full shadow-lg rounded-sm overflow-hidden"
              style={{ minHeight: '450px', maxHeight: '70vh' }}
            >
              {pagePreviewUrl ? (
                <img
                  src={pagePreviewUrl}
                  alt={`Page ${selectedPage}`}
                  className="w-auto h-full max-h-[70vh] object-contain pointer-events-none block"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-[450px] h-[600px] flex items-center justify-center text-xs text-neutral-400">
                  <div className="w-5 h-5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin mr-2" />
                  {isAr ? 'جارٍ تحميل الصفحة...' : 'Loading page preview...'}
                </div>
              )}

              {/* Render existing redaction boxes on this page */}
              {currentPageBoxes.map((box) => (
                <div
                  key={box.id}
                  style={{
                    left: `${box.xPercent}%`,
                    top: `${box.yPercent}%`,
                    width: `${box.widthPercent}%`,
                    height: `${box.heightPercent}%`,
                  }}
                  className={`absolute flex items-center justify-center font-bold text-[10px] tracking-wider transition-all group ${
                    (box.fillColor || fillColor) === 'white'
                      ? 'bg-white text-black border border-neutral-300'
                      : 'bg-black text-white border border-neutral-700'
                  }`}
                >
                  <span className="opacity-75">{box.labelText || (addLabel ? labelText : '')}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeBox(box.id);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                    title={isAr ? 'حذف هذا الحجب' : 'Remove box'}
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Render active drawing box */}
              {isDrawing && startPos && currentPos && (
                <div
                  style={{
                    left: `${Math.min(startPos.x, currentPos.x)}%`,
                    top: `${Math.min(startPos.y, currentPos.y)}%`,
                    width: `${Math.abs(currentPos.x - startPos.x)}%`,
                    height: `${Math.abs(currentPos.y - startPos.y)}%`,
                  }}
                  className={`absolute border-2 border-dashed pointer-events-none ${
                    fillColor === 'white' ? 'bg-white/80 border-black' : 'bg-black/80 border-rose-500'
                  }`}
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
            <span>
              {isAr
                ? `عدد المناطق المحجوبة في هذه الصفحة: ${currentPageBoxes.length} (الإجمالي: ${boxes.length})`
                : `Redactions on this page: ${currentPageBoxes.length} (Total: ${boxes.length})`}
            </span>
            {currentPageBoxes.length > 0 && (
              <button
                type="button"
                onClick={clearCurrentPageBoxes}
                className="text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isAr ? 'مسح حجب هذه الصفحة' : 'Clear page'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Col: Options & Final Execution */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5 pb-2 border-b border-neutral-100 dark:border-white/5">
              <Sliders className="w-4 h-4 text-neutral-500" />
              <span>{isAr ? 'خيارات الحجب والأمان' : 'Redaction Options'}</span>
            </h4>

            {/* Fill Color */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {isAr ? 'لون شريط الحجب' : 'Redaction Color'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFillColor('black')}
                  className={`p-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    fillColor === 'black'
                      ? 'border-neutral-900 dark:border-white bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-black border border-white/30" />
                  <span>{isAr ? 'أسود أمني' : 'Blackout'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFillColor('white')}
                  className={`p-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    fillColor === 'white'
                      ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold'
                      : 'border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-white border border-neutral-400" />
                  <span>{isAr ? 'أبيض ناصع' : 'Whiteout'}</span>
                </button>
              </div>
            </div>

            {/* Label Option */}
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={addLabel}
                  onChange={(e) => setAddLabel(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>{isAr ? 'كتابة نص توضيحي فوق الحجب' : 'Overlay text on redaction'}</span>
              </label>
              {addLabel && (
                <input
                  type="text"
                  value={labelText}
                  onChange={(e) => setLabelText(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-[#252528] border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder={isAr ? 'مثال: محجوب / سري' : 'e.g. REDACTED'}
                />
              )}
            </div>

            {/* Metadata Scrubbing */}
            <div className="pt-2 border-t border-neutral-100 dark:border-white/5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scrubMetadata}
                  onChange={(e) => setScrubMetadata(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-500" />
                    <span>{isAr ? 'تطهير وإزالة البيانات الوصفية (Metadata Scrubbing)' : 'Sanitize & Scrub Metadata'}</span>
                  </span>
                  <p className="text-[11px] text-neutral-400 pt-0.5">
                    {isAr
                      ? 'حذف اسم المؤلف، عنوان المستند، تواريخ الإنشاء والتعديل، والبرامج المستخدمة لمنع تتبع المستند'
                      : 'Remove author, title, creation timestamps, and software signatures'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Action Card */}
          <div className="p-5 rounded-3xl bg-neutral-50 dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 space-y-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={boxes.length === 0 && !scrubMetadata}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{isAr ? 'تطبيق الحجب وتطهير المستند' : 'Apply Redactions & Sanitize'}</span>
            </button>
            <p className="text-[11px] text-neutral-400 text-center leading-relaxed">
              {isAr
                ? 'الحجب نهائي ودائم ويتم إعدام البكسلات المحجوبة دون إمكانية استرجاعها.'
                : 'Redaction is permanent. Covered text and image layers are permanently destroyed.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
