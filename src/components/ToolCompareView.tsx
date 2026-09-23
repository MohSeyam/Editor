import React, { useState, useEffect } from 'react';
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
  ListFilter, 
  Layers, 
  Percent, 
  Plus, 
  Minus, 
  RefreshCw,
  Eye,
  FileCheck
} from 'lucide-react';
import { UploadedFile, Language, ResultItem } from '../types';
import { extractPdfText, computeTextDiff, DiffLine, DiffStats } from '../utils/pdfDiff';
import { renderPdfPageThumbnail } from '../utils/pdfThumbnail';
import { formatFileSize, readFileAsUint8Array, triggerDownload } from '../utils/fileHelpers';

interface ToolCompareViewProps {
  initialFiles: UploadedFile[];
  lang: Language;
  onFinished: (results: ResultItem[]) => void;
  onBack: () => void;
}

export const ToolCompareView: React.FC<ToolCompareViewProps> = ({
  initialFiles,
  lang,
  onFinished,
  onBack,
}) => {
  const isAr = lang === 'ar';

  const [fileA, setFileA] = useState<UploadedFile | null>(initialFiles[0] || null);
  const [fileB, setFileB] = useState<UploadedFile | null>(initialFiles[1] || null);

  const [thumbA, setThumbA] = useState<string>('');
  const [thumbB, setThumbB] = useState<string>('');

  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [diffResult, setDiffResult] = useState<{ diffLines: DiffLine[]; stats: DiffStats } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'sideBySide' | 'unified'>('sideBySide');
  const [filterMode, setFilterMode] = useState<'all' | 'diffsOnly'>('all');

  // Load thumbnails for file A and B
  useEffect(() => {
    if (fileA) {
      renderPdfPageThumbnail(fileA.data, 1, 300)
        .then(setThumbA)
        .catch(() => setThumbA(''));
    } else {
      setThumbA('');
    }
  }, [fileA]);

  useEffect(() => {
    if (fileB) {
      renderPdfPageThumbnail(fileB.data, 1, 300)
        .then(setThumbB)
        .catch(() => setThumbB(''));
    } else {
      setThumbB('');
    }
  }, [fileB]);

  // Handle uploading file for Slot A or B
  const handleSlotUpload = async (slot: 'A' | 'B', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await readFileAsUint8Array(file);
      const newUploaded: UploadedFile = {
        id: `comp-${slot}-${Date.now()}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/pdf',
        data,
        extension: 'pdf',
      };

      if (slot === 'A') {
        setFileA(newUploaded);
      } else {
        setFileB(newUploaded);
      }
      setDiffResult(null);
    } catch (e: any) {
      setError(isAr ? 'فشل تحميل الملف' : 'Failed to load file');
    }
  };

  const handleRunComparison = async () => {
    if (!fileA || !fileB) {
      setError(isAr ? 'يرجى اختيار ملفين PDF لبدء المقارنة' : 'Please select two PDF documents to compare');
      return;
    }

    setIsComparing(true);
    setError(null);
    setProgressMsg(isAr ? 'استخراج النصوص من المستند الأول (A)...' : 'Extracting text from Document A...');

    try {
      const extractedA = await extractPdfText(fileA.data);
      setProgressMsg(isAr ? 'استخراج النصوص من المستند الثاني (B)...' : 'Extracting text from Document B...');
      const extractedB = await extractPdfText(fileB.data);

      setProgressMsg(isAr ? 'حساب الفروقات وتدقيق النصوص...' : 'Computing differences...');
      const result = computeTextDiff(extractedA.fullText, extractedB.fullText);

      setDiffResult(result);
    } catch (err: any) {
      console.error('Diff error:', err);
      setError(err.message || (isAr ? 'تعذر إتمام مقارنة المستندين' : 'Failed to compare documents'));
    } finally {
      setIsComparing(false);
      setProgressMsg('');
    }
  };

  const handleExportReport = () => {
    if (!diffResult || !fileA || !fileB) return;

    const { stats, diffLines } = diffResult;
    const reportDate = new Date().toLocaleString(isAr ? 'ar-EG' : 'en-US');

    let reportText = `=================================================\n`;
    reportText += `${isAr ? 'تقرير مقارنة المستندات - DocStudio' : 'Document Comparison Report - DocStudio'}\n`;
    reportText += `=================================================\n`;
    reportText += `${isAr ? 'التاريخ والوقت' : 'Date & Time'}: ${reportDate}\n`;
    reportText += `${isAr ? 'المستند الأصلي (A)' : 'Document A (Original)'}: ${fileA.name}\n`;
    reportText += `${isAr ? 'المستند المقارن (B)' : 'Document B (Modified)'}: ${fileB.name}\n\n`;

    reportText += `-------------------------------------------------\n`;
    reportText += `${isAr ? 'ملخص الإحصاءات' : 'Summary Statistics'}:\n`;
    reportText += `- ${isAr ? 'نسبة التطابق' : 'Similarity'}: ${stats.similarityPercent}%\n`;
    reportText += `- ${isAr ? 'الأسطر المضافة (+)' : 'Added lines (+)'}: ${stats.addedCount}\n`;
    reportText += `- ${isAr ? 'الأسطر المحذوفة (-)' : 'Removed lines (-)'}: ${stats.removedCount}\n`;
    reportText += `- ${isAr ? 'الأسطر المتطابقة' : 'Identical lines'}: ${stats.unchangedCount}\n`;
    reportText += `- ${isAr ? 'إجمالي كلمات A' : 'Word count A'}: ${stats.wordCountA}\n`;
    reportText += `- ${isAr ? 'إجمالي كلمات B' : 'Word count B'}: ${stats.wordCountB}\n`;
    reportText += `-------------------------------------------------\n\n`;

    reportText += `${isAr ? 'تفاصيل الفروقات' : 'Detailed Differences'}:\n`;
    diffLines.forEach((line, idx) => {
      if (line.type === 'added') {
        reportText += `[+] [L:${line.lineNumB || ''}] ${line.lineB}\n`;
      } else if (line.type === 'removed') {
        reportText += `[-] [L:${line.lineNumA || ''}] ${line.lineA}\n`;
      } else if (filterMode === 'all') {
        reportText += `[=] ${line.lineA || line.lineB}\n`;
      }
    });

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const reportFilename = `DocStudio_Compare_${fileA.name.replace(/\.[^/.]+$/, '')}_vs_${fileB.name.replace(/\.[^/.]+$/, '')}.txt`;
    triggerDownload(blob, reportFilename);
  };

  const handleSaveToResults = () => {
    if (!diffResult || !fileA || !fileB) return;

    const { stats, diffLines } = diffResult;
    const reportDate = new Date().toLocaleString(isAr ? 'ar-EG' : 'en-US');

    let reportText = `DocStudio PDF Comparison Report\nDate: ${reportDate}\n\n`;
    reportText += `Doc A: ${fileA.name}\nDoc B: ${fileB.name}\n\n`;
    reportText += `Similarity: ${stats.similarityPercent}%\nAdded: ${stats.addedCount} lines\nRemoved: ${stats.removedCount} lines\n\n`;

    diffLines.forEach((line) => {
      if (line.type === 'added') reportText += `[+] ${line.lineB}\n`;
      else if (line.type === 'removed') reportText += `[-] ${line.lineA}\n`;
    });

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const reportFilename = `DocStudio_Diff_${fileA.name.replace(/\.[^/.]+$/, '')}_vs_${fileB.name.replace(/\.[^/.]+$/, '')}.txt`;

    onFinished([
      {
        blob,
        name: reportFilename,
        downloadName: reportFilename,
        type: 'text/plain',
        size: blob.size,
      },
    ]);
  };

  const displayedLines = diffResult
    ? diffResult.diffLines.filter((l) => (filterMode === 'diffsOnly' ? l.type !== 'unchanged' : true))
    : [];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            id="btn-back-from-compare"
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-2xl hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            {isAr ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              {isAr ? 'مقارنة مستندين PDF (Diff Checker)' : 'Compare PDF Documents'}
            </h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {isAr ? 'مقارنة النصوص بدقة وإبراز الإضافات والتعديلات بين نسختين' : 'Highlight additions, deletions, and differences side-by-side'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {diffResult && (
            <>
              <button
                id="btn-export-diff-report"
                type="button"
                onClick={handleExportReport}
                className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isAr ? 'تصدير التقرير' : 'Export Report'}</span>
              </button>
              <button
                id="btn-save-diff-result"
                type="button"
                onClick={handleSaveToResults}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>{isAr ? 'حفظ النتيجة' : 'Save Result'}</span>
              </button>
            </>
          )}

          <button
            id="btn-execute-compare"
            type="button"
            onClick={handleRunComparison}
            disabled={!fileA || !fileB || isComparing}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
          >
            {isComparing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{isAr ? 'جارٍ المقارنة...' : 'Comparing...'}</span>
              </>
            ) : (
              <>
                <GitCompare className="w-4 h-4" />
                <span>{isAr ? 'بدء المقارنة الآن' : 'Compare Documents'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Progress Message */}
      {progressMsg && (
        <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-2.5">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
          <span>{progressMsg}</span>
        </div>
      )}

      {/* Document Selection Slots (Slot A & Slot B) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Slot A: Original */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[11px] font-bold">
                A
              </span>
              <span>{isAr ? 'المستند الأصلي (الأساس)' : 'Original Document (Base)'}</span>
            </span>
            <label className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer">
              {fileA ? (isAr ? 'تغيير' : 'Change') : (isAr ? 'اختيار ملف' : 'Select File')}
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => handleSlotUpload('A', e)}
              />
            </label>
          </div>

          {fileA ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5">
              {thumbA ? (
                <div className="w-12 h-16 rounded-lg overflow-hidden border border-neutral-200 dark:border-white/10 shrink-0 bg-neutral-100 shadow-2xs">
                  <img src={thumbA} alt={fileA.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-16 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                  {fileA.name}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {formatFileSize(fileA.size, lang)} {fileA.pageCount ? `• ${fileA.pageCount} ${isAr ? 'صفحات' : 'pages'}` : ''}
                </p>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer bg-neutral-50/50 dark:bg-white/[0.01]">
              <Upload className="w-8 h-8 text-neutral-400 mb-2" />
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {isAr ? 'انقر لرفع المستند الأصلي A' : 'Click to upload original PDF'}
              </p>
              <p className="text-[11px] text-neutral-400 mt-1">PDF</p>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => handleSlotUpload('A', e)}
              />
            </label>
          )}
        </div>

        {/* Slot B: Modified */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[11px] font-bold">
                B
              </span>
              <span>{isAr ? 'المستند المقارن (المعدل)' : 'Modified Document (Target)'}</span>
            </span>
            <label className="text-xs text-purple-600 dark:text-purple-400 font-medium hover:underline cursor-pointer">
              {fileB ? (isAr ? 'تغيير' : 'Change') : (isAr ? 'اختيار ملف' : 'Select File')}
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => handleSlotUpload('B', e)}
              />
            </label>
          </div>

          {fileB ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5">
              {thumbB ? (
                <div className="w-12 h-16 rounded-lg overflow-hidden border border-neutral-200 dark:border-white/10 shrink-0 bg-neutral-100 shadow-2xs">
                  <img src={thumbB} alt={fileB.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-16 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                  {fileB.name}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {formatFileSize(fileB.size, lang)} {fileB.pageCount ? `• ${fileB.pageCount} ${isAr ? 'صفحات' : 'pages'}` : ''}
                </p>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-white/10 hover:border-purple-500 dark:hover:border-purple-400 transition-colors cursor-pointer bg-neutral-50/50 dark:bg-white/[0.01]">
              <Upload className="w-8 h-8 text-neutral-400 mb-2" />
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {isAr ? 'انقر لرفع المستند المعدل B' : 'Click to upload modified PDF'}
              </p>
              <p className="text-[11px] text-neutral-400 mt-1">PDF</p>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => handleSlotUpload('B', e)}
              />
            </label>
          )}
        </div>
      </div>

      {/* Comparison Results Card */}
      {diffResult && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-5">
          {/* Summary Stats Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                <Percent className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                  {isAr ? 'نسبة التطابق' : 'Similarity'}
                </p>
                <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                  {diffResult.stats.similarityPercent}%
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                  {isAr ? 'أسطر مضافة (+)' : 'Added (+)'}
                </p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  +{diffResult.stats.addedCount}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-sm">
                <Minus className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                  {isAr ? 'أسطر محذوفة (-)' : 'Removed (-)'}
                </p>
                <p className="text-base font-bold text-rose-600 dark:text-rose-400">
                  -{diffResult.stats.removedCount}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200/60 dark:border-white/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-600 text-white flex items-center justify-center font-bold text-sm">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                  {isAr ? 'إجمالي السطور' : 'Total Lines'}
                </p>
                <p className="text-base font-bold text-neutral-800 dark:text-neutral-200">
                  {diffResult.diffLines.length}
                </p>
              </div>
            </div>
          </div>

          {/* Diff View Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-100 dark:border-white/5">
            {/* View Mode */}
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-white/[0.05] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('sideBySide')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  viewMode === 'sideBySide'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>{isAr ? 'جنباً إلى جنب' : 'Side-by-Side'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('unified')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  viewMode === 'unified'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isAr ? 'عرض موحد' : 'Unified'}</span>
              </button>
            </div>

            {/* Filter Mode */}
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-white/[0.05] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <span>{isAr ? 'جميع الأسطر' : 'All Lines'}</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('diffsOnly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  filterMode === 'diffsOnly'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>{isAr ? 'الفروقات فقط' : 'Diffs Only'}</span>
              </button>
            </div>
          </div>

          {/* Diff Content Viewer */}
          <div className="border border-neutral-200 dark:border-white/10 rounded-2xl overflow-hidden bg-neutral-50/50 dark:bg-[#141416]">
            {/* Header Columns */}
            {viewMode === 'sideBySide' ? (
              <div className="grid grid-cols-2 bg-neutral-100 dark:bg-white/[0.04] border-b border-neutral-200 dark:border-white/10 text-xs font-semibold text-neutral-600 dark:text-neutral-400 p-2.5">
                <div className="px-2 truncate">{fileA.name} ({isAr ? 'النسخة A' : 'Doc A'})</div>
                <div className="px-2 truncate">{fileB.name} ({isAr ? 'النسخة B' : 'Doc B'})</div>
              </div>
            ) : (
              <div className="bg-neutral-100 dark:bg-white/[0.04] border-b border-neutral-200 dark:border-white/10 text-xs font-semibold text-neutral-600 dark:text-neutral-400 p-2.5 px-4">
                {isAr ? 'الفروقات الموحدة (+ مضاف / - محذوف)' : 'Unified Diffs (+ Added / - Removed)'}
              </div>
            )}

            {/* Lines List */}
            <div className="max-h-[500px] overflow-y-auto divide-y divide-neutral-200/40 dark:divide-white/[0.03] font-mono text-xs">
              {displayedLines.length === 0 ? (
                <div className="p-8 text-center text-neutral-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                    {isAr ? 'لا توجد فروقات في هذا العرض' : 'No differences found'}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {isAr ? 'كلا المستندين متطابقان تماماً' : 'Both documents are completely identical'}
                  </p>
                </div>
              ) : (
                displayedLines.map((line, idx) => {
                  if (viewMode === 'sideBySide') {
                    return (
                      <div
                        key={idx}
                        className={`grid grid-cols-2 transition-colors ${
                          line.type === 'added'
                            ? 'bg-emerald-500/10 dark:bg-emerald-950/20'
                            : line.type === 'removed'
                            ? 'bg-rose-500/10 dark:bg-rose-950/20'
                            : 'hover:bg-neutral-100/50 dark:hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Side A */}
                        <div className="p-2 border-r border-neutral-200/40 dark:border-white/[0.03] flex items-start gap-2 overflow-x-auto">
                          <span className="text-[10px] text-neutral-400 select-none w-6 shrink-0 text-right">
                            {line.lineNumA || ''}
                          </span>
                          <span
                            className={`flex-1 whitespace-pre-wrap break-words ${
                              line.type === 'removed'
                                ? 'text-rose-700 dark:text-rose-300 font-semibold line-through decoration-rose-400'
                                : line.type === 'added'
                                ? 'text-neutral-400 opacity-40'
                                : 'text-neutral-800 dark:text-neutral-200'
                            }`}
                          >
                            {line.lineA || (line.type === 'added' ? '—' : '')}
                          </span>
                        </div>

                        {/* Side B */}
                        <div className="p-2 flex items-start gap-2 overflow-x-auto">
                          <span className="text-[10px] text-neutral-400 select-none w-6 shrink-0 text-right">
                            {line.lineNumB || ''}
                          </span>
                          <span
                            className={`flex-1 whitespace-pre-wrap break-words ${
                              line.type === 'added'
                                ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                                : line.type === 'removed'
                                ? 'text-neutral-400 opacity-40'
                                : 'text-neutral-800 dark:text-neutral-200'
                            }`}
                          >
                            {line.lineB || (line.type === 'removed' ? '—' : '')}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // Unified Mode
                  return (
                    <div
                      key={idx}
                      className={`p-2 px-4 flex items-start gap-3 transition-colors ${
                        line.type === 'added'
                          ? 'bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                          : line.type === 'removed'
                          ? 'bg-rose-500/10 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300'
                          : 'text-neutral-800 dark:text-neutral-300 hover:bg-neutral-100/50 dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      <span className="text-[10px] font-bold w-4 shrink-0 select-none">
                        {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                      </span>
                      <span className="text-[10px] text-neutral-400 select-none w-8 shrink-0">
                        {line.lineNumB || line.lineNumA || ''}
                      </span>
                      <span
                        className={`flex-1 whitespace-pre-wrap break-words ${
                          line.type === 'removed' ? 'line-through' : ''
                        }`}
                      >
                        {line.lineB || line.lineA}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
