import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Sparkles, BookOpen, FileCheck } from 'lucide-react';
import { UploadedFile, Language } from '../types';
import { validatePdfA, PdfAValidationResult, ConvertToPdfAOptions } from '../utils/pdfArchive';

interface ToolPdfArchiveViewProps {
  file: UploadedFile;
  lang: Language;
  onExecute: (options: ConvertToPdfAOptions) => void;
  onBack: () => void;
}

export const ToolPdfArchiveView: React.FC<ToolPdfArchiveViewProps> = ({
  file,
  lang,
  onExecute,
  onBack,
}) => {
  const isAr = lang === 'ar';
  const [standard, setStandard] = useState<'PDF/A-1b' | 'PDF/A-2b'>('PDF/A-1b');
  const [docTitle, setDocTitle] = useState(file.name.replace(/\.[^/.]+$/, ''));
  const [docAuthor, setDocAuthor] = useState('DocStudio Verified User');
  const [embedSrgb, setEmbedSrgb] = useState(true);
  const [validation, setValidation] = useState<PdfAValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  // Run initial validation check
  useEffect(() => {
    let isCancelled = false;
    const runCheck = async () => {
      try {
        setIsValidating(true);
        const res = await validatePdfA(file.data);
        if (!isCancelled) setValidation(res);
      } catch (err) {
        console.error('PDF/A check failed:', err);
      } finally {
        if (!isCancelled) setIsValidating(false);
      }
    };
    runCheck();
    return () => {
      isCancelled = true;
    };
  }, [file]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExecute({
      standard,
      title: docTitle.trim(),
      author: docAuthor.trim(),
      embedSrgbOutputIntent: embedSrgb,
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
        <span className="text-xs font-semibold text-neutral-500 truncate max-w-xs">
          {file.name}
        </span>
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5 dark:border-white/5 space-y-6">
        <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'التحقق والتحويل لمعايير الأرشفة القياسية (PDF/A)' : 'PDF/A Long-term Archiving Compliance'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'فحص وحقن مواصفات ISO 19005 لضمان قراءة الوثائق لعقود قادمة بدون فقدان في التنسيق'
                : 'Conform document to ISO 19005 standards for preserved long-term electronic archiving'}
            </p>
          </div>
        </div>

        {/* Real-time Audit Report */}
        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              {isAr ? 'تقرير فحص الامتثال الحالي للمستند:' : 'Document Compliance Audit:'}
            </span>
            {validation && (
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                validation.isCompliant 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}>
                {validation.isCompliant ? (isAr ? 'مطابق بنسبة 100%' : '100% Compliant') : (isAr ? 'يتطلب معالجة وحقن XMP' : 'Requires Conformance Fixes')}
              </span>
            )}
          </div>

          {isValidating ? (
            <div className="py-4 text-center text-xs text-neutral-400 animate-pulse">
              {isAr ? 'جارٍ تدقيق البنية الرقمية ومساحات الألوان...' : 'Auditing PDF structure...'}
            </div>
          ) : validation ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {validation.checks.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-white dark:bg-neutral-900/60 border border-neutral-200/50 dark:border-white/5 flex items-start gap-2.5">
                  {c.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                      {c.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Standard Version */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                {isAr ? 'معيار الأرشفة المستهدف:' : 'Target PDF/A Standard:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStandard('PDF/A-1b')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    standard === 'PDF/A-1b'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                      : 'border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  PDF/A-1b (الأكثر انتشاراً)
                </button>
                <button
                  type="button"
                  onClick={() => setStandard('PDF/A-2b')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    standard === 'PDF/A-2b'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                      : 'border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  PDF/A-2b (الشفافية الموسعة)
                </button>
              </div>
            </div>

            {/* Document Title */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                {isAr ? 'عنوان المستند المعتمد بالأرشفة:' : 'Document Title in Metadata:'}
              </label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                {isAr ? 'جهة الإصدار / المؤلف:' : 'Author / Issuer:'}
              </label>
              <input
                type="text"
                value={docAuthor}
                onChange={(e) => setDocAuthor(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="check-srgb"
                checked={embedSrgb}
                onChange={(e) => setEmbedSrgb(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="check-srgb" className="text-xs font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer">
                {isAr ? 'تضمين توصيف ألوان sRGB العالمي (OutputIntent)' : 'Attach sRGB OutputIntent'}
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>{isAr ? `توليد وتثبيت صيغة الأرشفة القياسية (${standard})` : `Generate ${standard} Compliant PDF`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
