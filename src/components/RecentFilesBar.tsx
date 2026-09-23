import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Download, 
  Trash2, 
  FileText, 
  ExternalLink, 
  Shield, 
  Sparkles,
  Lock,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Language } from '../types';
import { getRecentFiles, clearRecentFiles, RecentFileRecord } from '../utils/recentFiles';
import { formatFileSize } from '../utils/fileHelpers';

interface RecentFilesBarProps {
  lang: Language;
}

export const RecentFilesBar: React.FC<RecentFilesBarProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [recentFiles, setRecentFiles] = useState<RecentFileRecord[]>([]);

  const refreshFiles = () => {
    setRecentFiles(getRecentFiles());
  };

  useEffect(() => {
    refreshFiles();
    const handleStorage = () => refreshFiles();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  if (recentFiles.length === 0) return null;

  const handleClear = () => {
    clearRecentFiles();
    setRecentFiles([]);
  };

  const handleDownload = (file: RecentFileRecord) => {
    if (file.previewDataUrl) {
      const a = document.createElement('a');
      a.href = file.previewDataUrl;
      a.download = file.downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div 
      id="recent-files-history-section"
      className="max-w-7xl mx-auto px-4 pt-3 pb-1 animate-in fade-in duration-300"
    >
      <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-2xl border border-neutral-200/80 dark:border-white/10 p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-black/[0.05] dark:border-white/[0.05]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <span>{isAr ? 'الملفات الأخيرة المعالجة' : 'Recent Processed Files'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {recentFiles.length}
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-neutral-400">
              <Shield className="w-3 h-3 text-emerald-500" />
              <span>{isAr ? 'محفوظ محلياً فقط' : 'Local device storage'}</span>
            </span>
            <button
              onClick={handleClear}
              className="p-1 rounded-lg text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
              title={isAr ? 'مسح السجل' : 'Clear history'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Horizontal scroll of last 5 files */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {recentFiles.map((file) => (
            <div
              key={file.id}
              className="group flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-white/[0.03] hover:bg-neutral-100 dark:hover:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.05] transition-all"
            >
              <div className="flex items-center gap-2 min-w-0 pr-1 rtl:pr-0 rtl:pl-1">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {file.name}
                    </p>
                    {(file.isEncrypted || file.toolUsed === 'encrypt' || file.name.toLowerCase().includes('encrypt') || file.name.includes('مشفر')) && (
                      <span 
                        className="inline-flex items-center shrink-0 p-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        title={file.encryptionType || (isAr ? 'ملف مشفر ومحمي بكلمة مرور - تشفير AES القياسي' : 'Password Protected & Encrypted (AES-256)')}
                      >
                        <Lock className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-400 truncate">
                    {formatFileSize(file.size, lang)} • {file.formattedDate}
                  </p>
                </div>
              </div>

              {file.previewDataUrl && (
                <button
                  onClick={() => handleDownload(file)}
                  className="p-1.5 rounded-lg bg-white dark:bg-white/10 text-neutral-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-white shadow-2xs transition-colors shrink-0 cursor-pointer"
                  title={isAr ? 'تحميل مجدداً' : 'Download again'}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
