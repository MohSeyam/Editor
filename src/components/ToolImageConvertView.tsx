import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Play, 
  Image as ImageIcon, 
  Sparkles, 
  Sliders, 
  CheckCircle2, 
  Maximize2,
  FileCheck,
  Palette
} from 'lucide-react';
import { UploadedFile, Language, ImageConvertOptions } from '../types';
import { formatFileSize } from '../utils/fileHelpers';
import { getTranslation } from '../i18n';

interface ToolImageConvertViewProps {
  file: UploadedFile;
  files?: UploadedFile[];
  lang: Language;
  onExecute: (options: ImageConvertOptions) => void;
  onBack: () => void;
}

export const ToolImageConvertView: React.FC<ToolImageConvertViewProps> = ({
  file,
  files,
  lang,
  onExecute,
  onBack,
}) => {
  const t = getTranslation(lang);
  const isAr = lang === 'ar';
  const allFiles = files && files.length > 0 ? files : [file];
  const isBatch = allFiles.length > 1;

  const [targetFormat, setTargetFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/png');
  const [quality, setQuality] = useState<number>(0.92);
  const [maxDimension, setMaxDimension] = useState<number>(0); // 0 = original
  const [bgColor, setBgColor] = useState<string>('#FFFFFF');

  const handleStart = () => {
    onExecute({
      format: targetFormat,
      quality,
      maxWidth: maxDimension > 0 ? maxDimension : undefined,
      backgroundColor: bgColor,
    });
  };

  const formatLabels: Record<string, { title: string; subtitle: string }> = {
    'image/png': {
      title: 'PNG',
      subtitle: isAr ? 'يدعم الشفافية وجودة فائقة' : 'Transparent & Lossless',
    },
    'image/jpeg': {
      title: 'JPEG / JPG',
      subtitle: isAr ? 'أفضل توافق وحجم مضغوط' : 'Universal & Compressed',
    },
    'image/webp': {
      title: 'WebP',
      subtitle: isAr ? 'صيغة الويب الحديثة الخفيفة' : 'Modern Web Format',
    },
  };

  return (
    <div id="tool-image-convert-view" className="max-w-4xl mx-auto px-4 py-4 space-y-4 animate-fadeIn">
      {/* Top Navigation */}
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
          {isBatch && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              {isAr ? `دفعة متعددة (${allFiles.length} صور)` : `Batch (${allFiles.length} images)`}
            </span>
          )}
          <span className="text-xs font-medium text-neutral-500">
            {file.name}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Left: Preview & File Details */}
        <div className="md:col-span-6 p-5 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-purple-500" />
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {isAr ? 'الصورة المصدر' : 'Source Image'}
            </h3>
          </div>

          <div className="h-64 rounded-2xl bg-neutral-100 dark:bg-black/40 overflow-hidden flex items-center justify-center p-2 border border-neutral-200/60 dark:border-white/5">
            {file.thumbnailUrl ? (
              <img
                src={file.thumbnailUrl}
                alt={file.name}
                className="max-h-full max-w-full object-contain rounded-lg shadow-xs"
              />
            ) : (
              <ImageIcon className="w-12 h-12 text-neutral-400" />
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-white/5 text-xs text-neutral-600 dark:text-neutral-400">
            <div className="flex justify-between">
              <span>{isAr ? 'اسم الملف:' : 'File name:'}</span>
              <span className="font-medium text-neutral-900 dark:text-white truncate max-w-[200px]">{file.name}</span>
            </div>
            <div className="flex justify-between">
              <span>{isAr ? 'الحجم الأصلي:' : 'Original size:'}</span>
              <span className="font-mono">{formatFileSize(file.size)}</span>
            </div>
            <div className="flex justify-between">
              <span>{isAr ? 'المعالجة:' : 'Engine:'}</span>
              <span className="text-purple-600 dark:text-purple-400 font-medium">{isAr ? 'Canvas API مباشر 100%' : '100% In-browser Canvas'}</span>
            </div>
          </div>
        </div>

        {/* Right: Conversion Settings */}
        <div className="md:col-span-6 p-5 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-500" />
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {isAr ? 'إعدادات تحويل الصيغة' : 'Target Format & Settings'}
            </h3>
          </div>

          {/* Format Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {isAr ? 'اختر الصيغة المستهدفة:' : 'Choose Target Format:'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['image/png', 'image/jpeg', 'image/webp'] as const).map((fmt) => {
                const isSelected = targetFormat === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setTargetFormat(fmt)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                        : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span className="text-sm font-bold">{formatLabels[fmt].title}</span>
                    <span className="text-[10px] text-neutral-400 leading-tight">{formatLabels[fmt].subtitle}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quality Slider (for JPEG & WebP) */}
          {targetFormat !== 'image/png' && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/60 dark:border-white/5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-neutral-700 dark:text-neutral-300">{isAr ? 'مستوى جودة الضغط:' : 'Quality Level:'}</span>
                <span className="font-mono text-purple-600 dark:text-purple-400">{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-400">
                <span>{isAr ? 'حجم أصغر' : 'Smaller'}</span>
                <span>{isAr ? 'جودة أعلى' : 'High Quality'}</span>
              </div>
            </div>
          )}

          {/* Background Color replacement for JPEG */}
          {targetFormat === 'image/jpeg' && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/60 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-neutral-500" />
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {isAr ? 'لون الخلفية البديل للشفافية:' : 'Background Fill Color (for JPEG):'}
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer"
                />
                <span className="text-xs font-mono text-neutral-500">{bgColor}</span>
              </div>
            </div>
          )}

          {/* Max Resolution Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {isAr ? 'أقصى دقة للصورة (اختياري):' : 'Max Resolution constraint:'}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { val: 0, label: isAr ? 'الأصلية' : 'Original' },
                { val: 1920, label: '1080p' },
                { val: 1280, label: '720p' },
                { val: 800, label: '800px' },
              ].map((res) => (
                <button
                  key={res.val}
                  type="button"
                  onClick={() => setMaxDimension(res.val)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                    maxDimension === res.val
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {res.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            id="btn-execute-image-convert"
            type="button"
            onClick={handleStart}
            className="w-full py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>
              {isBatch
                ? (isAr ? `تحويل جميع الصور (${allFiles.length}) الآن` : `Convert All (${allFiles.length}) Images Now`)
                : (isAr ? `تحويل إلى ${formatLabels[targetFormat].title}` : `Convert to ${formatLabels[targetFormat].title}`)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
