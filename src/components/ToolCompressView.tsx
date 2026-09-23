import React, { useState } from 'react';
import { 
  Minimize2, 
  ArrowLeft, 
  ArrowRight, 
  Play, 
  CheckCircle2,
  FileArchive,
  Eye,
  EyeOff,
  Bookmark,
  Check,
  Sparkles,
  Layers,
  CheckSquare,
  Square,
  SlidersHorizontal,
  FolderSync
} from 'lucide-react';
import { UploadedFile, Language, CompressSettings } from '../types';
import { getTranslation } from '../i18n';
import { formatFileSize } from '../utils/fileHelpers';
import { PdfDocumentPreview } from './PdfDocumentPreview';
import { saveUserProfile } from '../utils/presetProfiles';

interface ToolCompressViewProps {
  file: UploadedFile;
  files?: UploadedFile[];
  lang: Language;
  onExecute: (settings: CompressSettings, selectedFiles?: UploadedFile[]) => void;
  onBack: () => void;
  isBatchMode?: boolean;
  onToggleBatchMode?: (enabled: boolean) => void;
  initialLevel?: 'recommended' | 'extreme' | 'low';
}

export const ToolCompressView: React.FC<ToolCompressViewProps> = ({
  file,
  files,
  lang,
  onExecute,
  onBack,
  isBatchMode: propIsBatchMode,
  onToggleBatchMode,
  initialLevel = 'recommended',
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

  const [level, setLevel] = useState<'recommended' | 'extreme' | 'low'>(initialLevel);
  const [namingTemplate, setNamingTemplate] = useState<string>('{name}_compressed');
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [savedProfileSuccess, setSavedProfileSuccess] = useState<boolean>(false);

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

  // Approximate savings based on chosen level
  const savingsPct = level === 'extreme' ? 0.70 : level === 'recommended' ? 0.50 : 0.25;
  const estimatedSavingsBytes = Math.round(totalBatchSize * savingsPct);

  const levels: Array<{
    id: 'recommended' | 'extreme' | 'low';
    title: string;
    desc: string;
    badge: string;
  }> = [
    {
      id: 'recommended',
      title: isAr ? 'متوازن' : 'Balanced',
      desc: isAr ? 'موصى به' : 'Recommended',
      badge: '~50%',
    },
    {
      id: 'extreme',
      title: isAr ? 'فائق' : 'Extreme',
      desc: isAr ? 'أصغر حجم' : 'Smallest',
      badge: '~70%',
    },
    {
      id: 'low',
      title: isAr ? 'خفيف' : 'Light',
      desc: isAr ? 'أعلى دقة' : 'Max Quality',
      badge: '~25%',
    },
  ];

  const handleSaveAsProfile = () => {
    saveUserProfile({
      name: isAr ? `ضغط PDF (${level === 'recommended' ? 'متوازن' : level === 'extreme' ? 'فائق' : 'خفيف'})` : `PDF Compress (${level})`,
      description: isAr ? `إعداد ضغط بمستوى ${level}` : `Compress preset with level ${level}`,
      tool: 'compress',
      settings: {
        compressSettings: { level },
      },
    });
    setSavedProfileSuccess(true);
    setTimeout(() => setSavedProfileSuccess(false), 2000);
  };

  return (
    <div id="tool-compress-view" className="max-w-4xl mx-auto px-4 py-4 space-y-4 animate-fadeIn">
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
          {hasMultipleFiles && isBatchMode
            ? (isAr ? `معالجة مجمّعة (${selectedBatchFiles.length} ملفات)` : `Batch Mode (${selectedBatchFiles.length} files)`)
            : activeSingleFile.name}
        </span>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-5">
        {/* File Banner & Batch Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              {hasMultipleFiles && isBatchMode ? <FolderSync className="w-5 h-5" /> : <FileArchive className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white truncate">
                  {hasMultipleFiles && isBatchMode
                    ? (isAr ? `نمط المعالجة المجمّعة (${selectedBatchFiles.length} من ${allFiles.length} ملف)` : `Batch Processing Mode (${selectedBatchFiles.length}/${allFiles.length} files)`)
                    : activeSingleFile.name}
                </h3>
                {hasMultipleFiles && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300">
                    {isBatchMode ? (isAr ? 'مجمّع نشط' : 'Batch Active') : (isAr ? 'فردي' : 'Single')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">
                {hasMultipleFiles && isBatchMode
                  ? (isAr 
                      ? `إجمالي الحجم: ${formatFileSize(totalBatchSize, lang)} • توفير تقريبي: حتى ${formatFileSize(estimatedSavingsBytes, lang)}` 
                      : `Total size: ${formatFileSize(totalBatchSize, lang)} • Est. savings: up to ${formatFileSize(estimatedSavingsBytes, lang)}`)
                  : formatFileSize(activeSingleFile.size, lang)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {/* Toggle Batch Mode Switch when multiple files are loaded */}
            {hasMultipleFiles && (
              <button
                type="button"
                onClick={() => setBatchMode(!isBatchMode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isBatchMode
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300'
                    : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 border-transparent text-neutral-600 dark:text-neutral-300'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isBatchMode ? (isAr ? 'تعطيل المعالجة المجمّعة' : 'Disable Batch') : (isAr ? 'تفعيل المعالجة المجمّعة' : 'Enable Batch')}</span>
              </button>
            )}

            {/* Save as Preset Profile Button */}
            <button
              type="button"
              onClick={handleSaveAsProfile}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                savedProfileSuccess
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-300'
              }`}
              title={isAr ? 'حفظ هذا الإعداد كملف تعريف لتطبيقه سريعاً مستقبلاً' : 'Save as preset profile'}
            >
              {savedProfileSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تم الحفظ!' : 'Saved!'}</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5 text-blue-500" />
                  <span>{isAr ? 'حفظ كملف تعريف' : 'Save as Profile'}</span>
                </>
              )}
            </button>

            {/* Toggle PDF Preview */}
            {(!hasMultipleFiles || !isBatchMode) && (
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showPreview
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-sky-500" />}
                <span>{showPreview ? (isAr ? 'إخفاء المعاينة' : 'Hide Preview') : (isAr ? 'معاينة' : 'Preview')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Single File Picker when batch mode is turned off but multiple files exist */}
        {hasMultipleFiles && !isBatchMode && (
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 space-y-2">
            <span className="text-xs font-semibold text-neutral-500 block">
              {isAr ? 'حدد الملف المراد ضغطه بشكل فردي:' : 'Select file to compress individually:'}
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
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
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
          <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {isAr ? 'قائمة مستندات PDF للضغط المجمّع' : 'Batch PDF Files Queue'}
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  ({selectedBatchFiles.length} {isAr ? 'محدد' : 'selected'})
                </span>
              </div>

              <button
                type="button"
                onClick={handleSelectAllFiles}
                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
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
                        ? 'bg-white dark:bg-neutral-800 border-sky-500/40 shadow-xs'
                        : 'bg-white/50 dark:bg-neutral-900/50 border-neutral-200/60 dark:border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
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
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 shrink-0">
                      PDF
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Embedded PDF Document Preview using pdf.js */}
        {showPreview && activeSingleFile.extension === 'pdf' && (
          <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-black/30 border border-neutral-200/80 dark:border-white/10">
            <PdfDocumentPreview
              pdfData={activeSingleFile.data}
              fileName={activeSingleFile.name}
              lang={lang}
              className="max-h-[500px]"
            />
          </div>
        )}

        {/* Compression Level Picker as Smart Toggles */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              {isAr ? 'مستوى الضغط المستهدف' : 'Compression Level'}
            </span>
            {hasMultipleFiles && isBatchMode && (
              <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                {isAr ? 'سيتم تطبيق هذا المستوى على جميع ملفات الدفعة' : 'Applies to all batch files'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {levels.map((lvl) => {
              const isSelected = level === lvl.id;
              return (
                <button
                  key={lvl.id}
                  id={`btn-level-${lvl.id}`}
                  type="button"
                  onClick={() => setLevel(lvl.id)}
                  className={`p-3.5 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? 'border-sky-500 bg-sky-500/[0.08] text-sky-950 dark:text-sky-100 ring-2 ring-sky-500/20 shadow-xs'
                      : 'border-neutral-200/80 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20 bg-neutral-50/50 dark:bg-[#252528]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
                      {lvl.badge}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 fill-sky-500 text-white" />}
                  </div>

                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white block">
                      {lvl.title}
                    </span>
                    <span className="text-[11px] text-neutral-400 block mt-0.5">
                      {lvl.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Batch Naming Template Options */}
        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
              {isAr ? 'قالب تسمية الملفات الناتجة (Naming Template)' : 'Output Files Naming Template'}
            </span>
            <span className="text-[10px] text-neutral-400">
              {isAr ? 'يدعم {name} و {index} و {date}' : 'Supports {name}, {index}, {date}'}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={namingTemplate}
              onChange={(e) => setNamingTemplate(e.target.value)}
              placeholder="{name}_compressed"
              className="flex-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-mono text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { label: '{name}_compressed', text: '{name}_compressed' },
              { label: 'doc_{0index}', text: 'doc_{0index}' },
              { label: '{date}_{name}', text: '{date}_{name}' },
              { label: 'compressed_{index}', text: 'compressed_{index}' },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setNamingTemplate(chip.text)}
                className="text-[10px] font-mono px-2 py-1 rounded-lg bg-neutral-200/70 dark:bg-white/10 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/40 text-neutral-600 dark:text-neutral-300 cursor-pointer transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button: 1-Click Batch or Single Execution */}
        <button
          id="btn-execute-compress"
          type="button"
          onClick={() => {
            if (hasMultipleFiles && isBatchMode) {
              onExecute({ level, namingTemplate }, selectedBatchFiles);
            } else {
              onExecute({ level, namingTemplate }, [activeSingleFile]);
            }
          }}
          className="w-full py-3.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white font-medium text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>
            {hasMultipleFiles && isBatchMode
              ? (isAr 
                  ? `تطبيق الإعدادات وضغط جميع الملفات (${selectedBatchFiles.length}) بنقرة واحدة` 
                  : `Apply Settings & Compress All (${selectedBatchFiles.length}) Files with 1-Click`)
              : (isAr ? 'ضغط المستند الآن' : 'Compress Document Now')}
          </span>
        </button>
      </div>
    </div>
  );
};
