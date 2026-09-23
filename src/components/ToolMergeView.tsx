import React, { useState, useRef, useEffect } from 'react';
import { 
  Layers, 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Play, 
  GripVertical,
  Plus,
  FileText,
  FileImage,
  ArrowUpDown,
  LayoutGrid,
  List,
  Eye,
  X,
  FileCheck
} from 'lucide-react';
import { UploadedFile, Language } from '../types';
import { formatFileSize, createUploadedFileFromFile, readMultipleUploadedFiles } from '../utils/fileHelpers';
import { generateFileThumbnail } from '../utils/pdfThumbnail';

interface ToolMergeViewProps {
  files: UploadedFile[];
  lang: Language;
  onFilesChange: (files: UploadedFile[]) => void;
  onExecute: (outputName: string) => void;
  onBack: () => void;
}

export const ToolMergeView: React.FC<ToolMergeViewProps> = ({
  files,
  lang,
  onFilesChange,
  onExecute,
  onBack,
}) => {
  const isAr = lang === 'ar';
  const [outputName, setOutputName] = useState('merged_document.pdf');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPages = files.reduce((acc, curr) => acc + (curr.pageCount || 1), 0);
  const totalBytes = files.reduce((acc, curr) => acc + curr.size, 0);

  const moveItem = (index: number, direction: 'prev' | 'next') => {
    const target = direction === 'prev' ? index - 1 : index + 1;
    if (target < 0 || target >= files.length) return;
    const copy = [...files];
    const item = copy[index];
    copy[index] = copy[target];
    copy[target] = item;
    onFilesChange(copy);
  };

  const reverseList = () => {
    onFilesChange([...files].reverse());
  };

  const removeItem = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${index}`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (targetIndex !== index) {
      setTargetIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropTargetIdx: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropTargetIdx) {
      setDraggedIndex(null);
      setTargetIndex(null);
      return;
    }
    const updated = [...files];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(dropTargetIdx, 0, moved);
    onFilesChange(updated);
    setDraggedIndex(null);
    setTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setTargetIndex(null);
  };

  // Asynchronously generate thumbnails for any files in merge view that lack one
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

  const handleAddMoreFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const added = await readMultipleUploadedFiles(Array.from(fileList));
    if (added.length > 0) {
      onFilesChange([...files, ...added]);
    }
  };

  return (
    <div id="tool-merge-view" className="w-full max-w-6xl mx-auto py-2 space-y-4 animate-fadeIn">
      {/* Top Bar with One-Click Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#1c1c1e] p-3 sm:p-4 rounded-2xl border border-neutral-200/80 dark:border-white/10 shadow-2xs">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          <span>{isAr ? 'رجوع' : 'Back'}</span>
        </button>

        {/* View Mode & Utility Actions */}
        <div className="flex items-center gap-2">
          {/* Grid vs List Toggle */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
              title={isAr ? 'عرض بطاقات المعاينة' : 'Grid Preview'}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
              title={isAr ? 'عرض القائمة' : 'List View'}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reverse order */}
          <button
            onClick={reverseList}
            title={isAr ? 'عكس ترتيب الملفات' : 'Reverse'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAr ? 'عكس الترتيب' : 'Reverse'}</span>
          </button>

          {/* Add more files */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,image/*,.webp,.heic,.heif"
            className="hidden"
            onChange={(e) => handleAddMoreFiles(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAr ? 'إضافة ملفات' : 'Add Files'}</span>
          </button>
        </div>
      </div>

      {/* Main Single-Screen Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Files Reorder Container */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {isAr ? 'رتّب الملفات بالسحب والإفلات' : 'Drag & Drop to Reorder'} ({files.length})
            </span>
            <span className="text-xs text-neutral-400">
              {totalPages} {isAr ? 'صفحة إجمالاً' : 'total pages'} • {formatFileSize(totalBytes, lang)}
            </span>
          </div>

          {/* MODE 1: VISUAL GRID VIEW (WITH RICH THUMBNAILS & PREVIEWS) */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3.5">
              {files.map((file, idx) => {
                const isDragging = draggedIndex === idx;
                const isOver = targetIndex === idx && draggedIndex !== idx;

                return (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`group relative flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden bg-white dark:bg-[#1c1c1e] select-none ${
                      isDragging
                        ? 'opacity-40 scale-95 border-blue-500 ring-2 ring-blue-500/20'
                        : isOver
                        ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-900/20 scale-[1.02]'
                        : 'border-neutral-200/80 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20 shadow-xs'
                    }`}
                  >
                    {/* Card Top Banner: Position and Move Buttons */}
                    <div className="p-2.5 bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-100 dark:border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5">
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveItem(idx, 'prev')}
                          disabled={idx === 0}
                          title={isAr ? 'تقديم' : 'Move prev'}
                          className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                        >
                          {isAr ? <ChevronDown className="w-3.5 h-3.5 rotate-90" /> : <ChevronUp className="w-3.5 h-3.5 -rotate-90" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(idx, 'next')}
                          disabled={idx === files.length - 1}
                          title={isAr ? 'تأخير' : 'Move next'}
                          className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                        >
                          {isAr ? <ChevronUp className="w-3.5 h-3.5 rotate-90" /> : <ChevronDown className="w-3.5 h-3.5 -rotate-90" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(file.id)}
                          className="p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                          title={isAr ? 'حذف' : 'Remove'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Large Visual Thumbnail Area */}
                    <div 
                      onClick={() => setPreviewFile(file)}
                      className="h-36 sm:h-40 bg-neutral-100 dark:bg-neutral-900/60 flex items-center justify-center overflow-hidden relative cursor-pointer group-hover:brightness-[1.02] transition-all"
                    >
                      {file.thumbnailUrl ? (
                        <img
                          src={file.thumbnailUrl}
                          alt={file.name}
                          className="w-full h-full object-contain p-2"
                        />
                      ) : file.extension === 'pdf' ? (
                        <div className="flex flex-col items-center gap-2 text-neutral-400">
                          <FileText className="w-10 h-10 text-red-500/80" />
                          <span className="text-[11px] font-mono">PDF Document</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-neutral-400">
                          <FileImage className="w-10 h-10 text-blue-500/80" />
                          <span className="text-[11px] font-mono">Image</span>
                        </div>
                      )}

                      {/* Hover Preview Overlay */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-white text-xs font-medium backdrop-blur-[2px] transition-opacity">
                        <Eye className="w-4 h-4" />
                        <span>{isAr ? 'معاينة' : 'Preview'}</span>
                      </div>

                      {/* Page Count Badge */}
                      {file.pageCount && file.pageCount > 1 && (
                        <span className="absolute bottom-2 left-2 rtl:left-auto rtl:right-2 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono backdrop-blur-sm">
                          {file.pageCount} {isAr ? 'صفحات' : 'pages'}
                        </span>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="p-3 space-y-1">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-mono">
                        {formatFileSize(file.size, lang)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* MODE 2: DETAILED LIST VIEW */
            <div className="space-y-2">
              {files.map((file, idx) => {
                const isDragging = draggedIndex === idx;
                const isOver = targetIndex === idx && draggedIndex !== idx;

                return (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-150 ${
                      isDragging
                        ? 'opacity-40 scale-[0.98] border-blue-500 bg-blue-50/20'
                        : isOver
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'bg-white dark:bg-[#1c1c1e] border-neutral-200/80 dark:border-white/10 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-neutral-300 dark:text-neutral-600 cursor-grab active:cursor-grabbing p-1">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <span className="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-500 flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>

                      {/* Thumbnail Preview */}
                      <div 
                        onClick={() => setPreviewFile(file)}
                        className="w-12 h-14 rounded-lg overflow-hidden border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500/40 transition-all"
                      >
                        {file.thumbnailUrl ? (
                          <img
                            src={file.thumbnailUrl}
                            alt={file.name}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : file.extension === 'pdf' ? (
                          <FileText className="w-5 h-5 text-red-500" />
                        ) : (
                          <FileImage className="w-5 h-5 text-blue-500" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-white truncate max-w-[180px] sm:max-w-xs">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {formatFileSize(file.size, lang)}
                          {file.pageCount && ` • ${file.pageCount} ${isAr ? 'صفحات' : 'pages'}`}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer"
                        title={isAr ? 'معاينة' : 'Preview'}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(idx, 'prev')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-25 hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(idx, 'next')}
                        disabled={idx === files.length - 1}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-25 hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(file.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Unified Control & Start Box */}
        <div className="lg:col-span-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-4 sticky top-24">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-blue-500" />
              <span>{isAr ? 'إعداد ملف الدمج' : 'Merge Setup'}</span>
            </h3>

            {/* Output filename */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                {isAr ? 'اسم المستند النهائي' : 'Output Filename'}
              </label>
              <input
                type="text"
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>

            {/* Summary details */}
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/50 dark:border-white/5 space-y-1.5 text-xs text-neutral-500">
              <div className="flex justify-between">
                <span>{isAr ? 'عدد الملفات:' : 'Files count:'}</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{files.length}</span>
              </div>
              <div className="flex justify-between">
                <span>{isAr ? 'إجمالي الصفحات:' : 'Total pages:'}</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{totalPages}</span>
              </div>
              <div className="flex justify-between">
                <span>{isAr ? 'الحجم التقريبي:' : 'Approx size:'}</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{formatFileSize(totalBytes, lang)}</span>
              </div>
            </div>

            {/* Execute Button */}
            <button
              id="btn-execute-merge"
              type="button"
              onClick={() => onExecute(outputName)}
              disabled={files.length === 0}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isAr ? 'بدء دمج المستندات الآن' : 'Start Merging Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual Preview Modal / Lightbox */}
      {previewFile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setPreviewFile(null)}
        >
          <div 
            className="w-full max-w-lg bg-white dark:bg-[#1c1c1e] rounded-3xl p-5 border border-neutral-200 dark:border-white/10 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/5">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                  {previewFile.name}
                </h3>
                <p className="text-[11px] text-neutral-400">
                  {formatFileSize(previewFile.size, lang)} {previewFile.pageCount ? `• ${previewFile.pageCount} ${isAr ? 'صفحات' : 'pages'}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-80 w-full bg-neutral-100 dark:bg-black/40 rounded-2xl overflow-hidden flex items-center justify-center p-2">
              {previewFile.thumbnailUrl ? (
                <img
                  src={previewFile.thumbnailUrl}
                  alt={previewFile.name}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                />
              ) : (
                <div className="text-center space-y-2 text-neutral-400">
                  <FileText className="w-12 h-12 mx-auto text-blue-500" />
                  <p className="text-xs">{previewFile.name}</p>
                </div>
              )}
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="px-6 py-2 rounded-xl bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 text-xs font-semibold text-neutral-700 dark:text-neutral-200"
              >
                {isAr ? 'إغلاق المعاينة' : 'Close Preview'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
