import React, { useState } from 'react';
import { ListTree, ArrowLeft, ArrowRight, Layers, Sparkles, FileText } from 'lucide-react';
import { UploadedFile, Language } from '../types';
import { DynamicTocOptions } from '../utils/pdfDynamicToc';

interface ToolTocViewProps {
  files: UploadedFile[];
  lang: Language;
  onExecute: (options: DynamicTocOptions) => void;
  onBack: () => void;
}

export const ToolTocView: React.FC<ToolTocViewProps> = ({
  files,
  lang,
  onExecute,
  onBack,
}) => {
  const isAr = lang === 'ar';
  const [docTitle, setDocTitle] = useState<string>(isAr ? 'فهرس المحتويات العام' : 'Table of Contents');
  const [includeNumbers, setIncludeNumbers] = useState<boolean>(true);
  const [addHeadersFooters, setAddHeadersFooters] = useState<boolean>(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExecute({
      documentTitle: docTitle.trim(),
      includePageNumbers: includeNumbers,
      addHeaderFooter: addHeadersFooters,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          <span>{isAr ? 'رجوع' : 'Back'}</span>
        </button>
        <span className="text-xs font-semibold text-neutral-500">
          {files.length} {isAr ? 'ملفات مختارة للدمج والفهرسة' : 'files selected'}
        </span>
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5 dark:border-white/5 space-y-6">
        <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <ListTree className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'الدمج الديناميكي وبناء الفهارس التفاعلية (Dynamic TOC)' : 'Dynamic TOC & Smart Document Bookmarking'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'دمج الملفات المتعددة مع توليد صفحة فهرس في بداية المستند تضم عناوين الفصول وأرقام الصفحات وروابط التنقل'
                : 'Merge documents and generate an automatic Table of Contents page with dotted leaders and unified pagination'}
            </p>
          </div>
        </div>

        {/* Files Order Preview */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            {isAr ? 'ترتيب الفصول والمستندات في الفهرس:' : 'Document Sequence in TOC:'}
          </span>
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-1">
            {files.map((f, i) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-white/5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold flex items-center justify-center font-mono">
                    {i + 1}
                  </span>
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                    {f.name}
                  </p>
                </div>
                <span className="text-[11px] text-neutral-400">
                  {f.pageCount || 1} {isAr ? 'صفحات' : 'pages'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Options */}
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              {isAr ? 'عنوان صفحة الفهرس الرئيسية:' : 'Table of Contents Title:'}
            </label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeNumbers}
                onChange={(e) => setIncludeNumbers(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {isAr ? 'إدراج خطوط التنقيط وأرقام الصفحات المقابلة' : 'Include dotted leaders & page numbers'}
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={addHeadersFooters}
                onChange={(e) => setAddHeadersFooters(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {isAr ? 'توحيد ترويسات وأرقام الصفحات السفلية' : 'Unify headers & bottom pagination'}
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ListTree className="w-4 h-4" />
            <span>{isAr ? 'دمج الملفات وتوليد الفهرس الديناميكي الآن' : 'Merge & Generate Dynamic TOC'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
