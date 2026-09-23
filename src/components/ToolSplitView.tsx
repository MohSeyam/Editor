import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  ArrowLeft, 
  ArrowRight, 
  Play, 
  Check, 
  AlertCircle, 
  Maximize2, 
  X, 
  Sparkles,
  Layers
} from 'lucide-react';
import { UploadedFile, Language, SplitMode, SplitRange } from '../types';
import { renderPdfPageThumbnail } from '../utils/pdfThumbnail';

interface ToolSplitViewProps {
  file: UploadedFile;
  lang: Language;
  onExecute: (mode: SplitMode, ranges: SplitRange[], cutPoints: number[]) => void;
  onBack: () => void;
}

export const ToolSplitView: React.FC<ToolSplitViewProps> = ({
  file,
  lang,
  onExecute,
  onBack,
}) => {
  const isAr = lang === 'ar';
  const totalPages = file.pageCount || 1;

  const [mode, setMode] = useState<SplitMode>('range');
  const [rangeInput, setRangeInput] = useState<string>(
    totalPages > 1 ? `1-${Math.ceil(totalPages / 2)}, ${Math.ceil(totalPages / 2) + 1}-${totalPages}` : '1-1'
  );
  const [cutPoints, setCutPoints] = useState<number[]>([Math.max(1, Math.floor(totalPages / 2))]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Thumbnail state: pageNumber -> dataUrl
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [zoomPage, setZoomPage] = useState<number | null>(null);

  // Load thumbnails
  useEffect(() => {
    let isMounted = true;
    const loadAllPages = async () => {
      const pagesToLoad = Math.min(totalPages, 50);
      for (let i = 1; i <= pagesToLoad; i++) {
        if (!isMounted) return;
        try {
          const thumb = await renderPdfPageThumbnail(file.data, i, 220);
          if (thumb && isMounted) {
            setThumbnails((prev) => ({ ...prev, [i]: thumb }));
          }
        } catch (err) {
          console.warn(`Thumb error ${i}`, err);
        }
      }
    };
    loadAllPages();
    return () => {
      isMounted = false;
    };
  }, [file.data, totalPages]);

  const toggleCutPoint = (pageIndex: number) => {
    if (pageIndex >= totalPages) return;
    if (cutPoints.includes(pageIndex)) {
      setCutPoints(cutPoints.filter((cp) => cp !== pageIndex));
    } else {
      setCutPoints([...cutPoints, pageIndex].sort((a, b) => a - b));
    }
  };

  const parseRanges = (input: string): SplitRange[] => {
    const parts = input.split(',').map((s) => s.trim()).filter(Boolean);
    const ranges: SplitRange[] = [];
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const from = parseInt(startStr, 10);
        const to = parseInt(endStr, 10);
        if (!isNaN(from) && !isNaN(to) && from <= to) {
          ranges.push({ from, to });
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p)) {
          ranges.push({ from: p, to: p });
        }
      }
    }
    return ranges;
  };

  const handleStartSplit = () => {
    setErrorMsg(null);
    if (mode === 'all') {
      onExecute('all', [], []);
      return;
    }
    if (mode === 'custom' || mode === 'cut') {
      if (cutPoints.length === 0) {
        setErrorMsg(isAr ? 'حدد نقطة فصل' : 'Select cut point');
        return;
      }
      onExecute('cut', [], cutPoints);
      return;
    }
    if (mode === 'range') {
      const ranges = parseRanges(rangeInput);
      if (ranges.length === 0) {
        setErrorMsg(isAr ? 'نطاق غير صحيح' : 'Invalid range');
        return;
      }
      onExecute('range', ranges, []);
    }
  };

  const getGroupIndex = (pageNum: number): number => {
    let group = 0;
    for (const cp of cutPoints) {
      if (pageNum > cp) group++;
    }
    return group;
  };

  const groupColors = [
    'border-blue-500/50',
    'border-emerald-500/50',
    'border-purple-500/50',
    'border-amber-500/50',
  ];

  return (
    <div id="tool-split-view" className="w-full max-w-5xl mx-auto py-2 space-y-4 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          <span>{isAr ? 'رجوع' : 'Back'}</span>
        </button>

        {/* Quick Toggles */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const mid = Math.ceil(totalPages / 2);
              setMode('range');
              setRangeInput(totalPages > 1 ? `1-${mid}, ${mid + 1}-${totalPages}` : '1-1');
            }}
            className="px-2.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
          >
            {isAr ? 'نصفين' : 'Half'}
          </button>
          <button
            type="button"
            onClick={() => setMode('all')}
            className="px-2.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
          >
            {isAr ? 'كل صفحة' : 'Each page'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Pages Grid */}
        <div className="lg:col-span-8 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {isAr ? 'الصفحات' : 'Pages'} ({totalPages})
            </span>
            <span className="text-xs text-neutral-400">
              {mode === 'custom' ? (isAr ? 'انقر للفصل' : 'Click to cut') : (isAr ? 'معاينة' : 'Preview')}
            </span>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 max-h-[540px] overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: totalPages }, (_, idx) => {
                const pageNum = idx + 1;
                const isCutAfter = cutPoints.includes(pageNum);
                const thumb = thumbnails[pageNum];
                const groupIndex = getGroupIndex(pageNum);

                return (
                  <div key={pageNum} className="flex flex-col items-center">
                    <div
                      className={`w-full aspect-[3/4] rounded-2xl bg-neutral-50 dark:bg-neutral-900 border p-1 flex flex-col relative overflow-hidden transition-all ${
                        mode === 'custom'
                          ? groupColors[groupIndex % groupColors.length]
                          : 'border-neutral-200 dark:border-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] text-neutral-500 px-1">
                        <span>ص {pageNum}</span>
                        {thumb && (
                          <button
                            type="button"
                            onClick={() => setZoomPage(pageNum)}
                            className="hover:text-blue-500 cursor-pointer"
                          >
                            <Maximize2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div
                        className="flex-1 flex items-center justify-center overflow-hidden cursor-pointer"
                        onClick={() => thumb && setZoomPage(pageNum)}
                      >
                        {thumb ? (
                          <img src={thumb} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
                        )}
                      </div>
                    </div>

                    {/* Cut button */}
                    {pageNum < totalPages && (
                      <button
                        type="button"
                        onClick={() => {
                          if (mode !== 'custom') setMode('custom');
                          toggleCutPoint(pageNum);
                        }}
                        className={`mt-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full border transition-colors cursor-pointer ${
                          isCutAfter && mode === 'custom'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700 hover:border-indigo-400'
                        }`}
                      >
                        {isCutAfter && mode === 'custom'
                          ? (isAr ? 'نقطة فصل' : 'Cut')
                          : (isAr ? 'فصل هنا' : 'Cut here')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Side Controls with Smart Toggles */}
        <div className="lg:col-span-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {isAr ? 'طريقة التقسيم' : 'Split Mode'}
            </h3>

            {/* Smart Segmented Toggle */}
            <div className="p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex flex-col gap-1">
              {[
                { id: 'range', label: isAr ? 'نطاق صفحات' : 'Page Range' },
                { id: 'all', label: isAr ? 'كل صفحة بمفردها' : 'Each Page' },
                { id: 'custom', label: isAr ? 'فواصل بصرية' : 'Visual Cuts' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id as SplitMode)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-between cursor-pointer transition-all ${
                    mode === m.id
                      ? 'bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
                  }`}
                >
                  <span>{m.label}</span>
                  {mode === m.id && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                </button>
              ))}
            </div>

            {/* Range input */}
            {mode === 'range' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  {isAr ? 'نطاق الصفحات' : 'Ranges'}
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="1-2, 3-5"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 text-xs sm:text-sm outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-500/10 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Execute Button */}
            <button
              id="btn-execute-split"
              type="button"
              onClick={handleStartSplit}
              className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-medium text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isAr ? 'تقسيم الآن' : 'Split Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Zoom Modal */}
      {zoomPage !== null && thumbnails[zoomPage] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setZoomPage(null)}
        >
          <div
            className="max-w-xl w-full bg-white dark:bg-[#1c1c1e] rounded-3xl p-4 shadow-2xl border border-neutral-200 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5 text-xs font-semibold">
              <span>ص {zoomPage}</span>
              <button onClick={() => setZoomPage(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 max-h-[70vh] flex items-center justify-center">
              <img src={thumbnails[zoomPage]} alt="" className="max-h-[65vh] object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
