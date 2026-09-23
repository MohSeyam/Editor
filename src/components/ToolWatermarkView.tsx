import React, { useState } from 'react';
import { Stamp, ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { UploadedFile, Language } from '../types';
import { WatermarkOptions } from '../utils/pdfExtraFeatures';

interface ToolWatermarkViewProps {
  file: UploadedFile;
  lang: Language;
  onExecute: (options: WatermarkOptions) => void;
  onBack: () => void;
}

export const ToolWatermarkView: React.FC<ToolWatermarkViewProps> = ({
  file,
  lang,
  onExecute,
  onBack,
}) => {
  const isAr = lang === 'ar';
  const [text, setText] = useState<string>(isAr ? 'سري للغاية' : 'CONFIDENTIAL');
  const [opacity, setOpacity] = useState<number>(0.25);
  const [rotation, setRotation] = useState<number>(45);
  const [color, setColor] = useState<'gray' | 'red' | 'blue' | 'black'>('gray');
  const [fontSize, setFontSize] = useState<number>(55);

  const presets = isAr
    ? ['سري للغاية', 'مسودة', 'نسخة معتمدة', 'للاطلاع فقط', 'خاص']
    : ['CONFIDENTIAL', 'DRAFT', 'APPROVED', 'FOR REVIEW ONLY', 'PRIVATE'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onExecute({
      text: text.trim(),
      opacity,
      rotation,
      color,
      fontSize,
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
          {file.name}
        </span>
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5 dark:border-white/5 space-y-6">
        <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Stamp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">{isAr ? 'علامة مائية' : 'Watermark'}</h2>
            <p className="text-xs text-neutral-400">{isAr ? 'إضافة علامة نصية' : 'Add text watermark'}</p>
          </div>
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {isAr ? 'نص العلامة' : 'Watermark Text'}
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setText(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  text === p
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm outline-none focus:border-amber-500"
            placeholder={isAr ? 'اكتب نص العلامة...' : 'Type watermark text...'}
          />
        </div>

        {/* Smart Toggles: Angle, Color, Opacity */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Angle Toggle */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-black/5 dark:border-white/5 space-y-2">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {isAr ? 'الاتجاه' : 'Angle'}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRotation(45)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  rotation === 45
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {isAr ? 'مائل 45°' : 'Diagonal 45°'}
              </button>
              <button
                type="button"
                onClick={() => setRotation(0)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  rotation === 0
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {isAr ? 'أفقي 0°' : 'Horizontal 0°'}
              </button>
            </div>
          </div>

          {/* Color Toggle */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-black/5 dark:border-white/5 space-y-2">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {isAr ? 'اللون' : 'Color'}
            </label>
            <div className="flex gap-1.5">
              {(['gray', 'red', 'blue', 'black'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium capitalize cursor-pointer transition-all ${
                    color === c
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {c === 'gray' ? (isAr ? 'رمادي' : 'Gray') : c === 'red' ? (isAr ? 'أحمر' : 'Red') : c === 'blue' ? (isAr ? 'أزرق' : 'Blue') : (isAr ? 'أسود' : 'Black')}
                </button>
              ))}
            </div>
          </div>

          {/* Opacity Toggle */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-black/5 dark:border-white/5 space-y-2">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {isAr ? 'الشفافية' : 'Opacity'}
            </label>
            <div className="flex gap-2">
              {[0.15, 0.3, 0.6].map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setOpacity(op)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                    opacity === op
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {Math.round(op * 100)}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="h-32 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-700 relative overflow-hidden flex items-center justify-center">
          <div
            style={{
              transform: `rotate(${rotation === 45 ? -45 : 0}deg)`,
              opacity,
              fontSize: `${fontSize * 0.4}px`,
              color: color === 'red' ? '#dc2626' : color === 'blue' ? '#2563eb' : color === 'black' ? '#171717' : '#6b7280',
            }}
            className="font-bold select-none tracking-widest whitespace-nowrap"
          >
            {text || (isAr ? 'معاينة العلامة' : 'Preview')}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            onClick={handleSubmit}
            className="w-full py-3.5 px-6 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.99] shadow-sm cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isAr ? 'تطبيق العلامة المائية' : 'Apply Watermark'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
