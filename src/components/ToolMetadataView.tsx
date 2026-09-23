import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, ArrowLeft, ArrowRight, Check, FileText } from 'lucide-react';
import { UploadedFile, Language, MetadataSettings } from '../types';
import { getPdfMetadata } from '../utils/pdfExtraFeatures';

interface ToolMetadataViewProps {
  file: UploadedFile;
  lang: Language;
  onExecute: (settings: MetadataSettings) => void;
  onBack: () => void;
}

export const ToolMetadataView: React.FC<ToolMetadataViewProps> = ({
  file,
  lang,
  onExecute,
  onBack,
}) => {
  const isAr = lang === 'ar';
  const [title, setTitle] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [keywords, setKeywords] = useState<string>('');
  const [creator, setCreator] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    getPdfMetadata(file.data)
      .then((meta) => {
        if (!mounted) return;
        setTitle(meta.title || file.name.replace(/\.[^/.]+$/, ''));
        setAuthor(meta.author || '');
        setSubject(meta.subject || '');
        setKeywords(meta.keywords || '');
        setCreator(meta.creator || 'محرر المستندات');
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
        setCreator('محرر المستندات');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [file]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExecute({
      title,
      author,
      subject,
      keywords,
      creator,
    });
  };

  return (
    <div id="tool-metadata-view" className="w-full max-w-4xl mx-auto py-4 space-y-6 animate-fadeIn">
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
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'بيانات المستند (Metadata)' : 'Document Metadata'}
            </h2>
            <p className="text-xs text-neutral-400">
              {isAr ? 'قراءة وتعديل عنوان المستند والمؤلف والكلمات الدلالية' : 'View and update PDF document properties'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-neutral-400">
            {isAr ? 'جارٍ قراءة الخصائص...' : 'Reading document properties...'}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  {isAr ? 'عنوان المستند' : 'Document Title'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isAr ? 'أدخل عنوان المستند...' : 'Document title...'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-white outline-none focus:border-teal-500"
                />
              </div>

              {/* Author */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  {isAr ? 'المؤلف / الكاتب' : 'Author'}
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder={isAr ? 'اسم الكاتب أو المنشأة...' : 'Author name...'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-white outline-none focus:border-teal-500"
                />
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  {isAr ? 'الموضوع' : 'Subject'}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={isAr ? 'موضوع المستند...' : 'Subject description...'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-white outline-none focus:border-teal-500"
                />
              </div>

              {/* Keywords */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  {isAr ? 'الكلمات المفتاحية (مفصولة بفاصلة)' : 'Keywords (comma-separated)'}
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder={isAr ? 'تقرير, عمل, 2026' : 'report, business, 2026'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-white outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Creator / Application */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                {isAr ? 'التطبيق المنشئ' : 'Creator / Application'}
              </label>
              <input
                type="text"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                placeholder="PDF Producer / Software"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-white outline-none focus:border-teal-500"
              />
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.99] shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isAr ? 'حفظ البيانات وتحديث المستند' : 'Save Properties & Update'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
