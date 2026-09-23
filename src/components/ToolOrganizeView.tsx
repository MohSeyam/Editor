import React, { useState, useEffect } from 'react';
import { 
  RotateCw, 
  Trash2, 
  Undo2, 
  ArrowLeft, 
  ArrowRight, 
  Play, 
  RotateCcw,
  ArrowUpDown,
  MoveLeft,
  MoveRight,
  GripVertical,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles
} from 'lucide-react';
import { UploadedFile, Language, PageOrganizeItem } from '../types';
import { getTranslation } from '../i18n';
import { renderPdfPageThumbnail } from '../utils/pdfThumbnail';

interface ToolOrganizeViewProps {
  file: UploadedFile;
  lang: Language;
  onExecute: (pages: PageOrganizeItem[]) => void;
  onBack: () => void;
}

export const ToolOrganizeView: React.FC<ToolOrganizeViewProps> = ({
  file,
  lang,
  onExecute,
  onBack,
}) => {
  const t = getTranslation(lang);
  const isAr = lang === 'ar';
  const totalPages = file.pageCount || 1;

  const [pages, setPages] = useState<PageOrganizeItem[]>(() => {
    return Array.from({ length: totalPages }, (_, i) => ({
      pageIndex: i,
      rotation: 0,
      deleted: false,
    }));
  });

  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadThumbnails = async () => {
      const thumbs: Record<number, string> = {};
      const count = Math.min(totalPages, 40);
      for (let i = 0; i < count; i++) {
        if (isCancelled) break;
        try {
          const url = await renderPdfPageThumbnail(file.data, i + 1, 240);
          thumbs[i] = url;
          if (i === 0 || (i + 1) % 4 === 0) {
            setThumbnails({ ...thumbs });
          }
        } catch {
          // ignore
        }
      }
      if (!isCancelled) {
        setThumbnails(thumbs);
      }
    };

    loadThumbnails();

    return () => {
      isCancelled = true;
    };
  }, [file, totalPages]);

  // Reorder operations
  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length || fromIndex === toIndex) return;
    setPages((prev) => {
      const newPages = [...prev];
      const [movedItem] = newPages.splice(fromIndex, 1);
      newPages.splice(toIndex, 0, movedItem);
      return newPages;
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      movePage(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleRotatePage = (index: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const handleToggleDelete = (index: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, deleted: !p.deleted } : p))
    );
  };

  const handleRotateAll = () => {
    setPages((prev) =>
      prev.map((p) => ({ ...p, rotation: (p.rotation + 90) % 360 }))
    );
  };

  const handleReverseAll = () => {
    setPages((prev) => [...prev].reverse());
  };

  const handleSortOddEven = (oddFirst: boolean) => {
    setPages((prev) => {
      const odds = prev.filter((p) => (p.pageIndex + 1) % 2 !== 0);
      const evens = prev.filter((p) => (p.pageIndex + 1) % 2 === 0);
      return oddFirst ? [...odds, ...evens] : [...evens, ...odds];
    });
  };

  const handleReset = () => {
    setPages(
      Array.from({ length: totalPages }, (_, i) => ({
        pageIndex: i,
        rotation: 0,
        deleted: false,
      }))
    );
  };

  const activePagesCount = pages.filter((p) => !p.deleted).length;

  return (
    <div id="tool-organize-view" className="max-w-6xl mx-auto px-4 py-6 space-y-5 animate-fadeIn">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          <span>{isAr ? 'رجوع' : 'Back'}</span>
        </button>

        <span className="text-xs font-semibold text-neutral-500 truncate max-w-sm">
          {file.name}
        </span>
      </div>

      {/* Action Header Bar */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="w-11 h-11 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <ArrowUpDown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
              {isAr ? 'إعادة ترتيب صفحات المستند كاملة' : 'Complete Page Reordering'}
            </h3>
            <p className="text-xs text-neutral-400">
              {isAr
                ? 'اسحب وأفلت الصفحات بالماوس أو استخدم الأسهم لإعادة ترتيب صفحات PDF بكل حرية'
                : 'Drag and drop pages to reorder or use quick sequence buttons'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <button
            type="button"
            onClick={handleReverseAll}
            title={isAr ? 'عكس ترتيب جميع الصفحات' : 'Reverse Order'}
            className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-medium text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-teal-500" />
            <span>{isAr ? 'عكس الترتيب' : 'Reverse All'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSortOddEven(true)}
            title={isAr ? 'ترتيب: الصفحات الفردية أولاً ثم الزوجية' : 'Odd Pages First'}
            className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-medium text-neutral-700 dark:text-neutral-200 cursor-pointer transition-colors"
          >
            <span>{isAr ? 'فردي ثم زوجي' : 'Odd then Even'}</span>
          </button>

          <button
            type="button"
            onClick={handleRotateAll}
            className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-medium text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{isAr ? 'تدوير الكل' : 'Rotate All'}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
          </button>

          <button
            type="button"
            onClick={() => onExecute(pages)}
            disabled={activePagesCount === 0}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.99] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-teal-600/30 cursor-pointer transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{isAr ? `حفظ الترتيب الجديد (${activePagesCount})` : `Save Order (${activePagesCount})`}</span>
          </button>
        </div>
      </div>

      {/* Pages Grid with Drag & Drop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
        {pages.map((p, idx) => {
          const originalPageNum = p.pageIndex + 1;
          const thumb = thumbnails[p.pageIndex];
          const isDragging = draggedIndex === idx;
          const isDragOver = dragOverIndex === idx;

          return (
            <div
              key={`${p.pageIndex}_${idx}`}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              className={`relative rounded-2xl p-3 bg-white dark:bg-[#1c1c1e] border select-none transition-all cursor-grab active:cursor-grabbing ${
                isDragging
                  ? 'opacity-40 scale-95 border-dashed border-teal-500 shadow-none'
                  : isDragOver
                  ? 'border-2 border-teal-500 scale-102 shadow-lg bg-teal-50/20 dark:bg-teal-950/30'
                  : p.deleted
                  ? 'opacity-35 border-red-300 dark:border-red-900/40 bg-red-50/20'
                  : 'border-neutral-200/80 dark:border-white/10 hover:border-teal-400 hover:shadow-md'
              }`}
            >
              {/* Drag Handle & Page Badges */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <div className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-grab">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-500/20">
                    #{idx + 1}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {p.rotation !== 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      {p.rotation}°
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-neutral-400">
                    (ص {originalPageNum})
                  </span>
                </div>
              </div>

              {/* Thumbnail Container */}
              <div className="w-full aspect-[3/4] rounded-xl bg-neutral-100 dark:bg-[#252528] flex items-center justify-center overflow-hidden border border-neutral-200/60 dark:border-white/5 relative">
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    style={{ transform: `rotate(${p.rotation}deg)` }}
                    className="w-full h-full object-contain transition-transform duration-200 pointer-events-none"
                  />
                ) : (
                  <div className="text-[11px] text-neutral-400">ص {originalPageNum}</div>
                )}

                {p.deleted && (
                  <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center backdrop-blur-[1px]">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white">
                      {isAr ? 'محذوفة' : 'Deleted'}
                    </span>
                  </div>
                )}
              </div>

              {/* Position Shift & Rotate & Delete Controls */}
              <div className="flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-neutral-100 dark:border-white/5">
                {/* Left/Right Move Arrows */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      movePage(idx, idx - 1);
                    }}
                    disabled={idx === 0}
                    title={isAr ? 'تحريك للخلف' : 'Move Back'}
                    className="p-1 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                  >
                    {isAr ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      movePage(idx, idx + 1);
                    }}
                    disabled={idx === pages.length - 1}
                    title={isAr ? 'تحريك للأمام' : 'Move Forward'}
                    className="p-1 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                  >
                    {isAr ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Rotate & Delete */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRotatePage(idx);
                    }}
                    disabled={p.deleted}
                    title={isAr ? 'تدوير 90 درجة' : 'Rotate'}
                    className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-teal-500/10 hover:text-teal-600 disabled:opacity-30 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleDelete(idx);
                    }}
                    title={p.deleted ? (isAr ? 'استرجاع' : 'Restore') : (isAr ? 'حذف' : 'Delete')}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      p.deleted
                        ? 'text-emerald-600 hover:bg-emerald-500/10'
                        : 'text-neutral-400 hover:text-red-600 hover:bg-red-500/10'
                    }`}
                  >
                    {p.deleted ? <Undo2 className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
