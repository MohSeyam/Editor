import React from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Play, 
  FileCheck2, 
  ShieldCheck, 
  Printer, 
  Lock,
  FileText
} from 'lucide-react';
import { UploadedFile, Language } from '../types';
import { formatFileSize } from '../utils/fileHelpers';

interface ToolFlattenViewProps {
  file: UploadedFile;
  lang: Language;
  onExecute: () => void;
  onBack: () => void;
}

export const ToolFlattenView: React.FC<ToolFlattenViewProps> = ({
  file,
  lang,
  onExecute,
  onBack,
}) => {
  const isAr = lang === 'ar';

  return (
    <div id="tool-flatten-view" className="max-w-3xl mx-auto px-4 py-4 space-y-4 animate-fadeIn">
      {/* Top Bar */}
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

      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              {isAr ? 'تسطيح وتثبيت مستند PDF (Flatten PDF)' : 'Flatten & Lock PDF'}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isAr 
                ? 'تحويل الحقول التفاعلية والأختام والملاحظات إلى محتوى ثابت غير قابل للتعديل' 
                : 'Turn interactive form fields and annotations into permanent, read-only graphics.'}
            </p>
          </div>
        </div>

        {/* Benefits list */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-white/5 space-y-1.5">
            <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h4 className="text-xs font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'منع التعديل' : 'Tamper-Proof'}
            </h4>
            <p className="text-[11px] text-neutral-500">
              {isAr ? 'يمنع المتلقي من تغيير محتويات الحقول' : 'Prevents recipients from changing form values'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-white/5 space-y-1.5">
            <Printer className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-xs font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'طباعة مطابقة 100%' : 'Consistent Printing'}
            </h4>
            <p className="text-[11px] text-neutral-500">
              {isAr ? 'يضمن ظهور كل العناصر في أي طابعة أو برنامج' : 'Ensures graphics render identically on all devices'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-white/5 space-y-1.5">
            <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'حماية التواقيع' : 'Lock Signatures'}
            </h4>
            <p className="text-[11px] text-neutral-500">
              {isAr ? 'يدمج التوقيع داخل نسيج الصفحة بالكامل' : 'Merges digital signatures into document base layers'}
            </p>
          </div>
        </div>

        {/* Selected File Details */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-500/20 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="font-semibold text-neutral-900 dark:text-white truncate">
              {file.name}
            </span>
          </div>
          <span className="text-neutral-500 font-mono shrink-0">
            {formatFileSize(file.size, lang)} {file.pageCount ? `• ${file.pageCount} ${isAr ? 'صفحات' : 'pages'}` : ''}
          </span>
        </div>

        {/* Start Button */}
        <button
          id="btn-execute-flatten"
          type="button"
          onClick={onExecute}
          className="w-full py-3.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>{isAr ? 'بدء تسطيح وتثبيت المستند الآن' : 'Start Flattening PDF Now'}</span>
        </button>
      </div>
    </div>
  );
};
