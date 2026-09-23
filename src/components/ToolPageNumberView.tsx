import React, { useState } from 'react';
import { Hash, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { UploadedFile, Language, PageNumberSettings } from '../types';

interface ToolPageNumberViewProps {
  file: UploadedFile;
  lang: Language;
  onExecute: (settings: PageNumberSettings) => void;
  onBack: () => void;
}

export const ToolPageNumberView: React.FC<ToolPageNumberViewProps> = ({
  file,
  lang,
  onExecute,
  onBack,
}) => {
  const isAr = lang === 'ar';
  const [position, setPosition] = useState<PageNumberSettings['position']>('bottom-center');
  const [format, setFormat] = useState<PageNumberSettings['format']>('number');
  const [startNumber, setStartNumber] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(11);
  const [color, setColor] = useState<string>('dark');

  const positions: Array<{ id: PageNumberSettings['position']; labelAr: string; labelEn: string }> = [
    { id: 'bottom-center', labelAr: 'أسفل الوسط', labelEn: 'Bottom Center' },
    { id: 'bottom-right', labelAr: 'أسفل اليمين', labelEn: 'Bottom Right' },
    { id: 'bottom-left', labelAr: 'أسفل اليسار', labelEn: 'Bottom Left' },
    { id: 'top-center', labelAr: 'أعلى الوسط', labelEn: 'Top Center' },
    { id: 'top-right', labelAr: 'أعلى اليمين', labelEn: 'Top Right' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExecute({
      position,
      format,
      startNumber,
      fontSize,
      color,
    });
  };

  return (
    <div id="tool-page-number-view" className="w-full max-w-4xl mx-auto py-4 space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          <span>{isAr ? 'رجوع' : 'Back'}</span>
        </button>
        <span className="text-xs font-semibold text-neutral-500">{file.name}</span>
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 sm:p-8 shadow-sm border border-neutral-200/80 dark:border-white/10 space-y-6">
        <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-white/5 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'ترقيم الصفحات' : 'Page Numbers'}
            </h2>
            <p className="text-xs text-neutral-400">
              {isAr ? 'إدراج أرقام تسلسلية احترافية في صفحات المستند' : 'Add clean numbering to all pages'}
            </p>
          </div>
        </div>

        {/* Position Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {isAr ? 'موضع الرقم' : 'Number Position'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {positions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPosition(p.id)}
                className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  position === p.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100'
                }`}
              >
                {isAr ? p.labelAr : p.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Format and Color Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Format Toggle */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-white/5 space-y-2">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {isAr ? 'صيغة الترقيم' : 'Number Format'}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormat('number')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  format === 'number'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {isAr ? '1, 2, 3' : '1, 2, 3'}
              </button>
              <button
                type="button"
                onClick={() => setFormat('page_of_total')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  format === 'page_of_total'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {isAr ? '1 / الكل' : '1 / Total'}
              </button>
            </div>
          </div>

          {/* Color Selection */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-white/5 space-y-2">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {isAr ? 'اللون' : 'Color'}
            </label>
            <div className="flex gap-1.5">
              {['dark', 'gray', 'blue', 'red'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium capitalize cursor-pointer transition-all ${
                    color === c
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {c === 'dark' ? (isAr ? 'غامق' : 'Dark') : c === 'gray' ? (isAr ? 'رمادي' : 'Gray') : c === 'blue' ? (isAr ? 'أزرق' : 'Blue') : (isAr ? 'أحمر' : 'Red')}
                </button>
              ))}
            </div>
          </div>

          {/* Start Number */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-white/5 space-y-2">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {isAr ? 'بداية الترقيم' : 'Start Number'}
            </label>
            <input
              type="number"
              min={1}
              value={startNumber}
              onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-white"
            />
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="h-36 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 relative p-4 flex flex-col justify-between select-none">
          <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
            {isAr ? 'معاينة مكان الرقم' : 'Number Placement Preview'}
          </div>

          <div
            className={`w-full flex ${
              position.includes('center')
                ? 'justify-center'
                : position.includes('right')
                ? 'justify-end'
                : 'justify-start'
            } ${position.includes('top') ? 'order-first' : 'order-last'}`}
          >
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                color === 'blue'
                  ? 'text-blue-600 bg-blue-500/10'
                  : color === 'red'
                  ? 'text-red-600 bg-red-500/10'
                  : color === 'gray'
                  ? 'text-neutral-500 bg-neutral-200/40'
                  : 'text-neutral-900 dark:text-white bg-black/10 dark:bg-white/10'
              }`}
            >
              {format === 'page_of_total' ? `${startNumber} / ${file.pageCount || 10}` : `${startNumber}`}
            </span>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            onClick={handleSubmit}
            className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.99] shadow-sm cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isAr ? 'تطبيق أرقام الصفحات' : 'Apply Page Numbers'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
