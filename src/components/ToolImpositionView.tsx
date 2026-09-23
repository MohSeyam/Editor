import React, { useState } from 'react';
import { BookOpen, ArrowLeft, ArrowRight, Printer, Sparkles, Scissors, CheckCircle } from 'lucide-react';
import { UploadedFile, Language } from '../types';
import { ImpositionOptions, ImpositionMode, ReadingOrder, MarginOption } from '../utils/pdfImposition';

interface ToolImpositionViewProps {
  file: UploadedFile;
  lang: Language;
  onExecute: (options: ImpositionOptions) => void;
  onBack: () => void;
}

export const ToolImpositionView: React.FC<ToolImpositionViewProps> = ({
  file,
  lang,
  onExecute,
  onBack,
}) => {
  const isAr = lang === 'ar';
  const [mode, setMode] = useState<ImpositionMode>('booklet');
  const [readingOrder, setReadingOrder] = useState<ReadingOrder>(isAr ? 'rtl' : 'ltr');
  const [cropMarks, setCropMarks] = useState<boolean>(true);
  const [margin, setMargin] = useState<MarginOption>('compact');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExecute({
      mode,
      readingOrder,
      cropMarks,
      margin,
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
          {file.name} {file.pageCount ? `(${file.pageCount} ${isAr ? 'صفحات' : 'pages'})` : ''}
        </span>
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5 dark:border-white/5 space-y-6">
        <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'محرك تجميد وفرز الصفحات للطباعة والكتيبات (Imposition & Booklet)' : 'Print Imposition & Booklet Engine'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'إعادة ترتيب وتوزيع الصفحات لطباعة الكتيبات المطوية (Saddle-Stitch) أو صفحتين/أربع في ورقة واحدة مع علامات القص'
                : 'Reorder pages for saddle-stitch folded booklets or 2-up / 4-up sheet layouts with print crop marks'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {isAr ? 'نمط الفرز والطباعة المطلوب:' : 'Imposition Layout Mode:'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setMode('booklet')}
                className={`p-4 rounded-2xl border text-start cursor-pointer transition-all ${
                  mode === 'booklet'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-500'
                    : 'border-neutral-200 dark:border-white/10 hover:border-neutral-300'
                }`}
              >
                <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-2" />
                <p className="text-xs font-bold text-neutral-900 dark:text-white">
                  {isAr ? 'كتيب مطوي (Booklet)' : 'Saddle-Stitch Booklet'}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  {isAr ? 'ترتيب الصفحات تلقائياً للطباعة المزدوجة والطي من المنتصف لتكوين كتيب متسلسل' : 'Automatic sheet pairing so folded paper forms a correctly numbered booklet'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('2up')}
                className={`p-4 rounded-2xl border text-start cursor-pointer transition-all ${
                  mode === '2up'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-500'
                    : 'border-neutral-200 dark:border-white/10 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center gap-1 mb-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                  <span className="w-4 h-5 border border-current rounded-xs inline-block" />
                  <span className="w-4 h-5 border border-current rounded-xs inline-block" />
                </div>
                <p className="text-xs font-bold text-neutral-900 dark:text-white">
                  {isAr ? 'صفحتان بالورقة (2-Up)' : '2 Pages Per Sheet (2-Up)'}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  {isAr ? 'وضع صفحتين جنبًا إلى جنب على ورقة أفقية لتوفير الورق وسرعة المراجعة' : 'Place two pages side-by-side on each physical sheet'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('4up')}
                className={`p-4 rounded-2xl border text-start cursor-pointer transition-all ${
                  mode === '4up'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-500'
                    : 'border-neutral-200 dark:border-white/10 hover:border-neutral-300'
                }`}
              >
                <div className="grid grid-cols-2 gap-0.5 w-6 h-5 mb-2 text-amber-600 dark:text-amber-400">
                  <span className="border border-current rounded-xs" />
                  <span className="border border-current rounded-xs" />
                  <span className="border border-current rounded-xs" />
                  <span className="border border-current rounded-xs" />
                </div>
                <p className="text-xs font-bold text-neutral-900 dark:text-white">
                  {isAr ? '4 صفحات بالورقة (4-Up)' : '4 Pages Per Sheet (4-Up)'}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  {isAr ? 'شبكة مصغرة من 4 صفحات في كل ورقة لتلخيص المحاضرات والكتالوجات' : '4-page grid layout per sheet for compact printing'}
                </p>
              </button>
            </div>
          </div>

          {/* Reading Order & Margins */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                {isAr ? 'اتجاه القراءة وترتيب الصفحات:' : 'Reading Order:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReadingOrder('rtl')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    readingOrder === 'rtl'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                      : 'border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {isAr ? 'من اليمين لليسار (عربي)' : 'Right-to-Left (Arabic/RTL)'}
                </button>
                <button
                  type="button"
                  onClick={() => setReadingOrder('ltr')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    readingOrder === 'ltr'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                      : 'border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {isAr ? 'من اليسار لليمين (إنجليزي)' : 'Left-to-Right (English/LTR)'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                {isAr ? 'هوامش الطباعة:' : 'Print Margins:'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['none', 'compact', 'standard'] as MarginOption[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMargin(m)}
                    className={`py-2 px-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all capitalize ${
                      margin === m
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                        : 'border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {m === 'none' ? (isAr ? 'بدون هوامش' : 'Zero') : m === 'compact' ? (isAr ? 'مضغوطة' : 'Compact') : (isAr ? 'قياسية' : 'Standard')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Crop Marks Option */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scissors className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                  {isAr ? 'إضافة علامات القص والطي (Crop & Fold Marks)' : 'Draw Crop Marks & Fold Guides'}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {isAr ? 'خطوط إرشادية دقيقة على الحواف ومنتصف الورقة لتسهيل القص والتجليد المطبعي' : 'Precise guide ticks for clean trimming and spine folding'}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={cropMarks}
              onChange={(e) => setCropMarks(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? 'تجميد وفرز المستند للطباعة الآن' : 'Process Imposition Now'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
