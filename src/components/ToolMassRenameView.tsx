import React, { useState, useMemo } from 'react';
import { 
  FileEdit, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Sliders, 
  Calendar, 
  Hash, 
  Search, 
  FolderArchive, 
  FileCheck, 
  Download, 
  RotateCcw,
  Sparkles,
  Layers
} from 'lucide-react';
import { UploadedFile, Language, MassRenameRule, ResultItem } from '../types';
import { computeMassRename } from '../utils/massRename';
import { triggerDownload } from '../utils/fileHelpers';
import JSZip from 'jszip';

interface ToolMassRenameViewProps {
  files: UploadedFile[];
  lang: Language;
  onFinished: (result: ResultItem | ResultItem[]) => void;
  onBack: () => void;
}

export const ToolMassRenameView: React.FC<ToolMassRenameViewProps> = ({
  files,
  lang,
  onFinished,
  onBack,
}) => {
  const isAr = lang === 'ar';

  const [rule, setRule] = useState<MassRenameRule>({
    mode: 'template',
    template: '{name}_{date}_{num}',
    prefix: '',
    suffix: '',
    findText: '',
    replaceText: '',
    isRegex: false,
    caseSensitive: false,
    caseTransform: 'none',
    dateStampFormat: 'YYYY-MM-DD',
    startNumber: 1,
    numberPadding: 3,
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Live preview computation
  const previewList = useMemo(() => {
    return computeMassRename(files, rule);
  }, [files, rule]);

  const handleFinalizeZip = async () => {
    setIsProcessing(true);
    try {
      const zip = new JSZip();
      previewList.forEach((item) => {
        zip.file(item.newName, item.file.data);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipName = `Renamed_Files_${Date.now()}.zip`;

      onFinished({
        name: zipName,
        blob: zipBlob,
        url: URL.createObjectURL(zipBlob),
        size: zipBlob.size,
        type: 'application/zip',
        downloadName: zipName,
      });
    } catch (err) {
      console.error('Failed to create rename zip:', err);
    } finally {
      setIsProcessing(false);
    }
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
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <FileEdit className="w-3.5 h-3.5" />
            <span>{isAr ? 'إعادة التسمية الجماعية الذكية' : 'Mass Rename Utility'}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Rename Rules Config */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/5">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-500" />
              <span>{isAr ? 'قواعد ونمط التسمية' : 'Naming Pattern & Rules'}</span>
            </h3>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-neutral-100 dark:bg-[#252528] text-xs">
            <button
              type="button"
              onClick={() => setRule((r) => ({ ...r, mode: 'template' }))}
              className={`py-2 px-2.5 rounded-xl font-medium transition-all ${
                rule.mode === 'template'
                  ? 'bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500'
              }`}
            >
              {isAr ? 'قالب مخصص' : 'Template'}
            </button>
            <button
              type="button"
              onClick={() => setRule((r) => ({ ...r, mode: 'replace' }))}
              className={`py-2 px-2.5 rounded-xl font-medium transition-all ${
                rule.mode === 'replace'
                  ? 'bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500'
              }`}
            >
              {isAr ? 'استبدال / Regex' : 'Replace / Regex'}
            </button>
            <button
              type="button"
              onClick={() => setRule((r) => ({ ...r, mode: 'numbering' }))}
              className={`py-2 px-2.5 rounded-xl font-medium transition-all ${
                rule.mode === 'numbering'
                  ? 'bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500'
              }`}
            >
              {isAr ? 'ترقيم تسلسلي' : 'Sequential'}
            </button>
            <button
              type="button"
              onClick={() => setRule((r) => ({ ...r, mode: 'prefix-suffix' }))}
              className={`py-2 px-2.5 rounded-xl font-medium transition-all ${
                rule.mode === 'prefix-suffix'
                  ? 'bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500'
              }`}
            >
              {isAr ? 'بادئة ولاحقة' : 'Prefix / Suffix'}
            </button>
          </div>

          {/* TEMPLATE MODE OPTIONS */}
          {rule.mode === 'template' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {isAr ? 'صيغة القالب' : 'Template String'}
              </label>
              <input
                type="text"
                value={rule.template || ''}
                onChange={(e) => setRule((r) => ({ ...r, template: e.target.value }))}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-neutral-50 dark:bg-[#252528] border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="{name}_{date}_{num}"
              />
              <div className="flex flex-wrap gap-1.5 text-[11px] pt-1">
                <button
                  type="button"
                  onClick={() => setRule((r) => ({ ...r, template: (r.template || '') + '{name}' }))}
                  className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-[#252528] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 font-mono"
                >
                  {'{name}'}
                </button>
                <button
                  type="button"
                  onClick={() => setRule((r) => ({ ...r, template: (r.template || '') + '_{date}' }))}
                  className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-[#252528] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 font-mono"
                >
                  {'{date}'}
                </button>
                <button
                  type="button"
                  onClick={() => setRule((r) => ({ ...r, template: (r.template || '') + '_{num}' }))}
                  className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-[#252528] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 font-mono"
                >
                  {'{num}'}
                </button>
              </div>
            </div>
          )}

          {/* REPLACE MODE OPTIONS */}
          {rule.mode === 'replace' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {isAr ? 'البحث عن نص أو نمط' : 'Find Text / Pattern'}
                </label>
                <input
                  type="text"
                  value={rule.findText || ''}
                  onChange={(e) => setRule((r) => ({ ...r, findText: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-[#252528] border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder={isAr ? 'مثال: scan_ أو [0-9]+' : 'e.g. IMG_ or [0-9]+'}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {isAr ? 'استبدال بـ' : 'Replace With'}
                </label>
                <input
                  type="text"
                  value={rule.replaceText || ''}
                  onChange={(e) => setRule((r) => ({ ...r, replaceText: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-[#252528] border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder={isAr ? 'النص الجديد (أو اتركه فارغاً للحذف)' : 'Replacement (or blank to delete)'}
                />
              </div>

              <div className="flex items-center gap-4 text-xs pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.isRegex || false}
                    onChange={(e) => setRule((r) => ({ ...r, isRegex: e.target.checked }))}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Regex</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.caseSensitive || false}
                    onChange={(e) => setRule((r) => ({ ...r, caseSensitive: e.target.checked }))}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{isAr ? 'مطابقة حالة الأحرف' : 'Match Case'}</span>
                </label>
              </div>
            </div>
          )}

          {/* PREFIX / SUFFIX OR NUMBERING OPTIONS */}
          {(rule.mode === 'prefix-suffix' || rule.mode === 'numbering') && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {isAr ? 'بادئة (في البداية)' : 'Prefix'}
                </label>
                <input
                  type="text"
                  value={rule.prefix || ''}
                  onChange={(e) => setRule((r) => ({ ...r, prefix: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-[#252528] border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Doc_"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {isAr ? 'لاحقة (في النهاية)' : 'Suffix'}
                </label>
                <input
                  type="text"
                  value={rule.suffix || ''}
                  onChange={(e) => setRule((r) => ({ ...r, suffix: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-[#252528] border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="_v1"
                />
              </div>
            </div>
          )}

          {/* DATE STAMP SETTING */}
          <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-white/5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              <span>{isAr ? 'إلحاق ختم التاريخ' : 'Date Stamp'}</span>
            </label>
            <select
              value={rule.dateStampFormat || 'none'}
              onChange={(e) => setRule((r) => ({ ...r, dateStampFormat: e.target.value as any }))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-[#252528] border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="none">{isAr ? 'بدون تاريخ' : 'None'}</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (2026-09-14)</option>
              <option value="YYYYMMDD">YYYYMMDD (20260914)</option>
              <option value="YYYY-MM-DD_HHmm">YYYY-MM-DD_HHmm (مع الوقت)</option>
            </select>
          </div>

          {/* NUMBERING SETTING */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {isAr ? 'البدء من الرقم' : 'Start Number'}
              </label>
              <input
                type="number"
                min="0"
                value={rule.startNumber || 1}
                onChange={(e) => setRule((r) => ({ ...r, startNumber: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-[#252528] border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {isAr ? 'خانة الترقيم' : 'Zero Padding'}
              </label>
              <select
                value={rule.numberPadding || 3}
                onChange={(e) => setRule((r) => ({ ...r, numberPadding: parseInt(e.target.value) || 3 }))}
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-[#252528] border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value={1}>1, 2, 3</option>
                <option value={2}>01, 02, 03</option>
                <option value={3}>001, 002, 003</option>
                <option value={4}>0001, 0002</option>
              </select>
            </div>
          </div>

          {/* CASE CONVERSION */}
          <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-white/5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {isAr ? 'تنسيق حالة الأحرف' : 'Letter Casing'}
            </label>
            <select
              value={rule.caseTransform || 'none'}
              onChange={(e) => setRule((r) => ({ ...r, caseTransform: e.target.value as any }))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-[#252528] border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="none">{isAr ? 'الإبقاء كما هي' : 'Keep Original'}</option>
              <option value="lowercase">lowercase (أحرف صغيرة)</option>
              <option value="uppercase">UPPERCASE (أحرف كبيرة)</option>
              <option value="title">Title Case (بداية كل كلمة كبيرة)</option>
              <option value="kebab">kebab-case (فواصل شرطات)</option>
              <option value="snake">snake_case (شرطات سفلية)</option>
            </select>
          </div>
        </div>

        {/* Right 2 Columns: Live Before & After Preview List & Download */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/5">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {isAr ? 'معاينة فورية للأسماء الجديدة' : 'Live Filename Preview'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {isAr
                    ? `إجمالي الملفات: ${files.length} ملف`
                    : `Total files: ${files.length} files`}
                </p>
              </div>

              <button
                type="button"
                onClick={handleFinalizeZip}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FolderArchive className="w-4 h-4" />
                )}
                <span>{isAr ? 'حفظ وتنزيل كل الملفات بحزمة ZIP' : 'Save & Download All as ZIP'}</span>
              </button>
            </div>

            {/* List of files */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {previewList.map((item, idx) => (
                <div
                  key={item.file.id || idx}
                  className="p-3 rounded-2xl bg-neutral-50 dark:bg-[#252528] border border-neutral-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] truncate">
                      <span className="font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">#{idx + 1}</span>
                      <span className="truncate line-through opacity-70">{item.originalName}</span>
                    </div>
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 truncate flex items-center gap-1">
                      <span>{item.newName}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([item.file.data], { type: item.file.type });
                      triggerDownload(blob, item.newName);
                    }}
                    className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-white dark:bg-[#1c1c1e] hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-neutral-700 dark:text-neutral-200 hover:text-emerald-600 border border-neutral-200 dark:border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={isAr ? 'تنزيل هذا الملف منفرداً' : 'Download this file'}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تنزيل' : 'Download'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
