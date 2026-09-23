import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Play, 
  Image as ImageIcon, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  Maximize2,
  FileCheck
} from 'lucide-react';
import { UploadedFile, Language } from '../types';
import { getTranslation } from '../i18n';
import { formatFileSize } from '../utils/fileHelpers';
import { ImageCompressOptions } from '../utils/imageCompressor';

interface ToolImageCompressViewProps {
  file: UploadedFile;
  files?: UploadedFile[];
  lang: Language;
  onExecute: (options: ImageCompressOptions) => void;
  onBack: () => void;
}

export const ToolImageCompressView: React.FC<ToolImageCompressViewProps> = ({
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
  const [qualityPreset, setQualityPreset] = useState<'high' | 'balanced' | 'aggressive'>('balanced');
  const [maxDimension, setMaxDimension] = useState<number>(1920);
  const [outputFormat, setOutputFormat] = useState<'image/jpeg' | 'image/webp' | 'image/png'>('image/webp');

  const qualityValues = {
    high: 0.9,
    balanced: 0.78,
    aggressive: 0.6,
  };

  const handleStart = () => {
    onExecute({
      quality: qualityValues[qualityPreset],
      maxDimension: maxDimension === 0 ? undefined : maxDimension,
      outputFormat,
    });
  };

  return (
    <div id="tool-image-compress-view" className="max-w-4xl mx-auto px-4 py-4 space-y-4 animate-fadeIn">
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

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Left: Image Preview & Details */}
        <div className="md:col-span-6 p-5 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {isAr ? 'معاينة الصورة الأصلية' : 'Original Image'}
            </h3>
          </div>

          <div className="h-64 rounded-2xl bg-neutral-100 dark:bg-black/40 overflow-hidden flex items-center justify-center p-2 border border-neutral-200/60 dark:border-white/5">
            {file.thumbnailUrl ? (
              <img
                src={file.thumbnailUrl}
                alt={file.name}
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            ) : (
              <ImageIcon className="w-12 h-12 text-neutral-400" />
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
            <span>{isAr ? 'الحجم الحالي:' : 'Current Size:'}</span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">
              {formatFileSize(file.size, lang)}
            </span>
          </div>
        </div>

        {/* Right: Compression Controls */}
        <div className="md:col-span-6 p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {isAr ? 'إعدادات الضغط الذكي' : 'Smart Compression'}
            </h3>
          </div>

          {/* Quality Presets */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {isAr ? 'درجة الضغط وتوفير الحجم' : 'Compression Intensity'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setQualityPreset('high')}
                className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  qualityPreset === 'high'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="font-semibold">{isAr ? 'خفيف' : 'High'}</div>
                <div className="text-[10px] opacity-80 mt-0.5">{isAr ? 'أعلى دقة' : '90%'}</div>
              </button>
              <button
                type="button"
                onClick={() => setQualityPreset('balanced')}
                className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  qualityPreset === 'balanced'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="font-semibold">{isAr ? 'متوازن' : 'Balanced'}</div>
                <div className="text-[10px] opacity-80 mt-0.5">{isAr ? 'توفير 60-80%' : 'Recommended'}</div>
              </button>
              <button
                type="button"
                onClick={() => setQualityPreset('aggressive')}
                className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  qualityPreset === 'aggressive'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="font-semibold">{isAr ? 'أقصى ضغط' : 'Max Shrink'}</div>
                <div className="text-[10px] opacity-80 mt-0.5">{isAr ? 'أصغر حجم' : '60%'}</div>
              </button>
            </div>
          </div>

          {/* Max Resolution (Downscaling) */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
              <span>{isAr ? 'أقصى أبعاد للصورة (Resolution)' : 'Max Dimension'}</span>
              <span className="text-[11px] text-neutral-400">
                {maxDimension === 0 ? (isAr ? 'أبعاد أصلية' : 'Original') : `${maxDimension}px`}
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMaxDimension(1920)}
                className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  maxDimension === 1920
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                Full HD (1920)
              </button>
              <button
                type="button"
                onClick={() => setMaxDimension(1280)}
                className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  maxDimension === 1280
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                HD (1280)
              </button>
              <button
                type="button"
                onClick={() => setMaxDimension(0)}
                className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  maxDimension === 0
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {isAr ? 'الأصلية بدون تصغير' : 'Original'}
              </button>
            </div>
          </div>

          {/* Target Output Format */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {isAr ? 'صيغة الإخراج المطلوبة' : 'Output Format'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOutputFormat('image/webp')}
                className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  outputFormat === 'image/webp'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                WebP (عصري)
              </button>
              <button
                type="button"
                onClick={() => setOutputFormat('image/jpeg')}
                className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  outputFormat === 'image/jpeg'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                JPG (شامل)
              </button>
              <button
                type="button"
                onClick={() => setOutputFormat('image/png')}
                className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  outputFormat === 'image/png'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                PNG (حواف حادة)
              </button>
            </div>
          </div>

          {/* Action Button */}
          <button
            id="btn-execute-image-compress"
            type="button"
            onClick={handleStart}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>
              {isBatch
                ? (isAr ? `بدء ضغط جميع الصور (${allFiles.length}) الآن` : `Compress All (${allFiles.length}) Images Now`)
                : (isAr ? 'بدء ضغط الصورة الآن' : 'Compress Image Now')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
