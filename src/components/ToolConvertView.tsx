import React, { useState } from 'react';
import { 
  ArrowLeftRight, 
  ArrowLeft, 
  ArrowRight, 
  Play, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  FileText, 
  CheckSquare, 
  Square, 
  SlidersHorizontal,
  FolderSync
} from 'lucide-react';
import { UploadedFile, Language, ConvertTarget } from '../types';
import { getTranslation } from '../i18n';
import { formatFileSize, getFileExtension } from '../utils/fileHelpers';

interface ToolConvertViewProps {
  file: UploadedFile;
  files?: UploadedFile[];
  lang: Language;
  onExecute: (targetFormat: string, options: { quality: string }, selectedFiles?: UploadedFile[]) => void;
  onBack: () => void;
  isBatchMode?: boolean;
  onToggleBatchMode?: (enabled: boolean) => void;
}

export const ToolConvertView: React.FC<ToolConvertViewProps> = ({
  file,
  files,
  lang,
  onExecute,
  onBack,
  isBatchMode: propIsBatchMode,
  onToggleBatchMode,
}) => {
  const t = getTranslation(lang);
  const isAr = lang === 'ar';
  const allFiles = files && files.length > 0 ? files : [file];
  const hasMultipleFiles = allFiles.length > 1;

  // Local or controlled batch mode
  const [localBatchMode, setLocalBatchMode] = useState<boolean>(true);
  const isBatchMode = propIsBatchMode !== undefined ? propIsBatchMode : localBatchMode;
  const setBatchMode = (enabled: boolean) => {
    setLocalBatchMode(enabled);
    onToggleBatchMode?.(enabled);
  };

  // Selection state for batch items
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(
    () => new Set(allFiles.map((f) => f.id))
  );

  const [activeSingleFileId, setActiveSingleFileId] = useState<string>(file.id);
  const activeSingleFile = allFiles.find((f) => f.id === activeSingleFileId) || file;
  const currentSubjectFile = isBatchMode && hasMultipleFiles ? allFiles[0] : activeSingleFile;
  const srcExt = getFileExtension(currentSubjectFile.name);

  // Toggle single file inclusion in batch
  const handleToggleFileInBatch = (id: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // keep at least 1
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiles = () => {
    setSelectedFileIds(new Set(allFiles.map((f) => f.id)));
  };

  const selectedBatchFiles = allFiles.filter((f) => selectedFileIds.has(f.id));
  const totalBatchSize = selectedBatchFiles.reduce((acc, f) => acc + f.size, 0);

  // Determine available target formats based on source
  const getAvailableTargets = (ext: string): ConvertTarget[] => {
    switch (ext) {
      case 'docx':
      case 'doc':
        return [
          { id: 'pdf', label: 'PDF (.pdf)', extension: 'pdf', description: isAr ? 'مستند PDF قياسي' : 'Standard PDF' },
          { id: 'xlsx', label: 'Excel (.xlsx)', extension: 'xlsx', description: isAr ? 'استخراج الجداول والبيانات' : 'Extract Tables to Sheet' },
          { id: 'txt', label: 'Text (.txt)', extension: 'txt', description: isAr ? 'نص مجرد' : 'Plain Text' },
          { id: 'md', label: 'Markdown (.md)', extension: 'md', description: isAr ? 'ماركداون' : 'Markdown' },
          { id: 'html', label: 'HTML (.html)', extension: 'html', description: isAr ? 'صفحة ويب' : 'Web Page' },
        ];
      case 'pptx':
      case 'ppt':
        return [
          { id: 'pdf', label: 'PDF (.pdf)', extension: 'pdf', description: isAr ? 'مستند شرائح PDF' : 'Slide Deck PDF' },
          { id: 'docx', label: 'Word (.docx)', extension: 'docx', description: isAr ? 'مستند Word منسق' : 'Formatted Word' },
          { id: 'md', label: 'Markdown (.md)', extension: 'md', description: isAr ? 'شرائح ماركداون' : 'Markdown Slides' },
          { id: 'html', label: 'HTML (.html)', extension: 'html', description: isAr ? 'عرض ويب تفاعلي' : 'HTML Presentation' },
          { id: 'txt', label: 'Text (.txt)', extension: 'txt', description: isAr ? 'نص الشرائح' : 'Slide Text' },
        ];
      case 'xlsx':
      case 'xls':
        return [
          { id: 'pdf', label: 'PDF (.pdf)', extension: 'pdf', description: isAr ? 'مستند PDF منسق بالجداول' : 'Formatted PDF Sheet' },
          { id: 'csv', label: 'CSV (.csv)', extension: 'csv', description: isAr ? 'قيم مفصولة بفواصل' : 'Comma Separated' },
          { id: 'json', label: 'JSON (.json)', extension: 'json', description: isAr ? 'بيانات برمجية' : 'JSON Array' },
          { id: 'md', label: 'Markdown (.md)', extension: 'md', description: isAr ? 'جدول ماركداون' : 'Table' },
          { id: 'html', label: 'HTML (.html)', extension: 'html', description: isAr ? 'جدول ويب' : 'HTML Table' },
        ];
      case 'csv':
        return [
          { id: 'xlsx', label: 'Excel (.xlsx)', extension: 'xlsx', description: isAr ? 'جدول إكسل' : 'Spreadsheet' },
          { id: 'pdf', label: 'PDF (.pdf)', extension: 'pdf', description: isAr ? 'مستند PDF' : 'PDF Document' },
          { id: 'json', label: 'JSON (.json)', extension: 'json', description: isAr ? 'بيانات JSON' : 'JSON Object' },
          { id: 'md', label: 'Markdown (.md)', extension: 'md', description: isAr ? 'جدول ماركداون' : 'Table' },
        ];
      case 'json':
        return [
          { id: 'xlsx', label: 'Excel (.xlsx)', extension: 'xlsx', description: isAr ? 'جدول إكسل' : 'Spreadsheet' },
          { id: 'csv', label: 'CSV (.csv)', extension: 'csv', description: isAr ? 'ملف CSV' : 'CSV File' },
          { id: 'html', label: 'HTML (.html)', extension: 'html', description: isAr ? 'جدول ويب' : 'HTML Table' },
          { id: 'txt', label: 'Text (.txt)', extension: 'txt', description: isAr ? 'نص منسق' : 'Plain Text' },
        ];
      case 'html':
      case 'htm':
        return [
          { id: 'pdf', label: 'PDF (.pdf)', extension: 'pdf', description: isAr ? 'مستند PDF' : 'PDF Document' },
          { id: 'docx', label: 'Word (.docx)', extension: 'docx', description: isAr ? 'مستند وورد' : 'Word Doc' },
          { id: 'md', label: 'Markdown (.md)', extension: 'md', description: isAr ? 'نص ماركداون' : 'Markdown' },
          { id: 'txt', label: 'Text (.txt)', extension: 'txt', description: isAr ? 'نص مجرد' : 'Plain Text' },
        ];
      case 'md':
      case 'markdown':
      case 'txt':
        return [
          { id: 'html', label: 'HTML (.html)', extension: 'html', description: isAr ? 'صفحة ويب منسقة ومتجاوبة' : 'Styled HTML Web Page' },
          { id: 'pdf', label: 'PDF (.pdf)', extension: 'pdf', description: isAr ? 'مستند PDF' : 'PDF Document' },
          { id: 'docx', label: 'Word (.docx)', extension: 'docx', description: isAr ? 'مستند وورد' : 'Word Doc' },
        ];
      case 'heic':
      case 'heif':
        return [
          { id: 'jpg', label: 'JPG (.jpg)', extension: 'jpg', description: isAr ? 'صورة قياسية متوافقة' : 'Standard JPG' },
          { id: 'png', label: 'PNG (.png)', extension: 'png', description: isAr ? 'صورة عالية الجودة' : 'Lossless PNG' },
          { id: 'webp', label: 'WebP (.webp)', extension: 'webp', description: isAr ? 'صيغة ويب عصرية' : 'Modern WebP' },
          { id: 'pdf', label: 'PDF (.pdf)', extension: 'pdf', description: isAr ? 'مستند PDF' : 'PDF Document' },
        ];
      case 'webp':
        return [
          { id: 'pdf', label: 'PDF (.pdf)', extension: 'pdf', description: isAr ? 'مستند PDF' : 'PDF Document' },
          { id: 'png', label: 'PNG (.png)', extension: 'png', description: isAr ? 'صورة PNG' : 'Lossless PNG' },
          { id: 'jpg', label: 'JPG (.jpg)', extension: 'jpg', description: isAr ? 'صورة JPG' : 'Standard JPG' },
        ];
      case 'png':
        return [
          { id: 'pdf', label: 'PDF (.pdf)', extension: 'pdf', description: isAr ? 'مستند PDF' : 'PDF Document' },
          { id: 'webp', label: 'WebP (.webp)', extension: 'webp', description: isAr ? 'صيغة ويب عصرية خفيفة' : 'Modern WebP' },
          { id: 'jpg', label: 'JPG (.jpg)', extension: 'jpg', description: isAr ? 'صورة JPG مضغوطة' : 'Standard JPG' },
        ];
      case 'jpg':
      case 'jpeg':
        return [
          { id: 'pdf', label: 'PDF (.pdf)', extension: 'pdf', description: isAr ? 'مستند PDF' : 'PDF Document' },
          { id: 'webp', label: 'WebP (.webp)', extension: 'webp', description: isAr ? 'صيغة ويب عصرية خفيفة' : 'Modern WebP' },
          { id: 'png', label: 'PNG (.png)', extension: 'png', description: isAr ? 'صورة PNG بدون ضغط' : 'Lossless PNG' },
        ];
      case 'bmp':
      case 'svg':
        return [
          { id: 'pdf', label: 'PDF (.pdf)', extension: 'pdf', description: isAr ? 'مستند PDF' : 'PDF Document' },
          { id: 'png', label: 'PNG (.png)', extension: 'png', description: isAr ? 'صورة PNG' : 'Lossless PNG' },
          { id: 'webp', label: 'WebP (.webp)', extension: 'webp', description: isAr ? 'صيغة ويب خفيفة' : 'Modern WebP' },
        ];
      case 'pdf':
        return [
          { id: 'docx', label: 'Word (.docx)', extension: 'docx', description: isAr ? 'مستند Word قابل للتعديل' : 'Editable Word' },
          { id: 'xlsx', label: 'Excel (.xlsx)', extension: 'xlsx', description: isAr ? 'جداول وبيانات Excel' : 'Excel Spreadsheet' },
          { id: 'png', label: 'PNG (.png)', extension: 'png', description: isAr ? 'صورة عالية الدقة' : 'High-Res Image' },
          { id: 'webp', label: 'WebP (.webp)', extension: 'webp', description: isAr ? 'صورة ويب خفيفة' : 'Lightweight WebP' },
          { id: 'jpg', label: 'JPG (.jpg)', extension: 'jpg', description: isAr ? 'صورة JPG' : 'Standard JPEG' },
          { id: 'txt', label: 'Text (.txt)', extension: 'txt', description: isAr ? 'استخراج النص' : 'Extract Text' },
          { id: 'md', label: 'Markdown (.md)', extension: 'md', description: isAr ? 'تنسيق ماركداون' : 'Markdown' },
        ];
      default:
        return [
          { id: 'pdf', label: 'PDF (.pdf)', extension: 'pdf', description: isAr ? 'مستند PDF' : 'PDF File' },
          { id: 'txt', label: 'Text (.txt)', extension: 'txt', description: isAr ? 'نص مجرد' : 'Plain Text' },
        ];
    }
  };

  const availableTargets = getAvailableTargets(srcExt);
  const [selectedTarget, setSelectedTarget] = useState<string>(
    availableTargets[0]?.extension || 'pdf'
  );
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high');

  return (
    <div id="tool-convert-view" className="max-w-4xl mx-auto px-4 py-4 space-y-4 animate-fadeIn">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          <span>{isAr ? 'رجوع' : 'Back'}</span>
        </button>

        <span className="text-xs font-semibold text-neutral-500">
          {file.name}
        </span>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-5">
        {/* File Banner & Batch Processing Mode Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {hasMultipleFiles && isBatchMode ? <FolderSync className="w-5 h-5" /> : (srcExt || 'FILE')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white truncate">
                  {hasMultipleFiles && isBatchMode
                    ? (isAr ? `نمط المعالجة المجمّعة (${selectedBatchFiles.length} من ${allFiles.length} ملف)` : `Batch Processing Mode (${selectedBatchFiles.length}/${allFiles.length} files)`)
                    : activeSingleFile.name}
                </h3>
                {hasMultipleFiles && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    {isBatchMode ? (isAr ? 'مجمّع نشط' : 'Batch Active') : (isAr ? 'فردي' : 'Single')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">
                {hasMultipleFiles && isBatchMode
                  ? (isAr 
                      ? `إجمالي الحجم: ${formatFileSize(totalBatchSize, lang)} • سيتم تطبيق الصيغة على جميع الملفات بنقرة واحدة` 
                      : `Total size: ${formatFileSize(totalBatchSize, lang)} • Apply settings and convert all files with 1-click`)
                  : formatFileSize(activeSingleFile.size, lang)}
              </p>
            </div>
          </div>

          {/* Toggle Batch Mode Switch when multiple files are loaded */}
          {hasMultipleFiles && (
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setBatchMode(!isBatchMode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isBatchMode
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 border-transparent text-neutral-600 dark:text-neutral-300'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isBatchMode ? (isAr ? 'تعطيل المعالجة المجمّعة' : 'Disable Batch') : (isAr ? 'تفعيل المعالجة المجمّعة' : 'Enable Batch')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Single File Picker when batch mode is turned off but multiple files exist */}
        {hasMultipleFiles && !isBatchMode && (
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 space-y-2">
            <span className="text-xs font-semibold text-neutral-500 block">
              {isAr ? 'حدد الملف المراد تحويله بشكل فردي:' : 'Select file to convert individually:'}
            </span>
            <div className="flex flex-wrap gap-2">
              {allFiles.map((f) => {
                const isCurrent = f.id === activeSingleFileId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveSingleFileId(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                      isCurrent
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100'
                    }`}
                  >
                    <span className="truncate max-w-[160px]">{f.name}</span>
                    <span className="text-[10px] opacity-75">({formatFileSize(f.size, lang)})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Batch Queue Checklist Card when Batch Mode is ON */}
        {hasMultipleFiles && isBatchMode && (
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {isAr ? 'قائمة ملفات المعالجة المجمّعة' : 'Batch Files Queue'}
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  ({selectedBatchFiles.length} {isAr ? 'محدد' : 'selected'})
                </span>
              </div>

              <button
                type="button"
                onClick={handleSelectAllFiles}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {isAr ? 'تحديد الكل' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {allFiles.map((f) => {
                const isSelected = selectedFileIds.has(f.id);
                return (
                  <div
                    key={f.id}
                    onClick={() => handleToggleFileInBatch(f.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white dark:bg-neutral-800 border-emerald-500/40 shadow-xs'
                        : 'bg-white/50 dark:bg-neutral-900/50 border-neutral-200/60 dark:border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                          {f.name}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {formatFileSize(f.size, lang)}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 shrink-0">
                      {getFileExtension(f.name)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Target Format Choices as Smart Toggles */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              {isAr ? 'اختر الصيغة المستهدفة' : 'Target Format'}
            </span>
            {hasMultipleFiles && isBatchMode && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                {isAr ? 'سيتم تطبيق هذه الصيغة على جميع ملفات الدفعة' : 'Applies to all batch files'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {availableTargets.map((target) => {
              const isSelected = selectedTarget === target.extension;
              return (
                <button
                  key={target.id}
                  id={`btn-target-${target.id}`}
                  type="button"
                  onClick={() => setSelectedTarget(target.extension)}
                  className={`p-3 rounded-2xl border text-start transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/[0.08] text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-neutral-200/80 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20 bg-neutral-50/50 dark:bg-[#252528]/50'
                  }`}
                >
                  <div className="min-w-0 pr-2 rtl:pr-0 rtl:pl-2">
                    <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white block">
                      {target.label}
                    </span>
                    <span className="text-[11px] text-neutral-400 truncate block mt-0.5">
                      {target.description}
                    </span>
                  </div>

                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-300 dark:text-neutral-600'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-4 h-4 fill-emerald-500 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Image Pre-Compression & Quality Tuning */}
        {['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'bmp'].includes(srcExt) && (
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200/60 dark:border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isAr ? 'الضغط الذكي للصور قبل التحويل' : 'Smart Image Compression'}</span>
              </span>
              <span className="text-[11px] text-neutral-400">
                {isAr ? 'يسرع المعالجة ويقلل حجم ملف الـ PDF' : 'Faster processing & smaller PDF'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setQuality('high')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  quality === 'high'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {isAr ? 'دقة أصلية (عالية)' : 'Original (High)'}
              </button>
              <button
                type="button"
                onClick={() => setQuality('medium')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  quality === 'medium'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {isAr ? 'ضغط متوازن (مستحسن)' : 'Balanced (85%)'}
              </button>
              <button
                type="button"
                onClick={() => setQuality('low')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  quality === 'low'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {isAr ? 'أقصى توفير (فائق الخفة)' : 'Max Shrink (70%)'}
              </button>
            </div>
          </div>
        )}

        {/* Action Button: 1-Click Batch or Single Execution */}
        <button
          id="btn-execute-convert"
          type="button"
          onClick={() => {
            if (hasMultipleFiles && isBatchMode) {
              onExecute(selectedTarget, { quality }, selectedBatchFiles);
            } else {
              onExecute(selectedTarget, { quality }, [activeSingleFile]);
            }
          }}
          className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-medium text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>
            {hasMultipleFiles && isBatchMode
              ? (isAr 
                  ? `تطبيق الإعدادات وتحويل جميع الملفات (${selectedBatchFiles.length}) بنقرة واحدة` 
                  : `Apply Settings & Convert All (${selectedBatchFiles.length}) Files with 1-Click`)
              : (isAr ? 'تحويل الملف الآن' : 'Convert File Now')}
          </span>
        </button>
      </div>
    </div>
  );
};
