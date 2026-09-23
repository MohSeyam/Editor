import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Download, 
  RotateCcw, 
  Home, 
  FileText, 
  Eye, 
  ExternalLink,
  ShieldCheck,
  FolderDown,
  Archive,
  Layers,
  Sparkles,
  Maximize2,
  Copy,
  Check,
  Code,
  Music,
  Video,
  FileCheck2,
  FileSpreadsheet,
  X,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Minimize2,
  Stamp,
  PenTool,
  Lock,
  ArrowUpRight
} from 'lucide-react';
import JSZip from 'jszip';
import { ResultItem, Language, ToolType } from '../types';
import { getTranslation } from '../i18n';
import { formatFileSize, triggerDownload } from '../utils/fileHelpers';
import { saveRecentFile } from '../utils/recentFiles';
import { PdfDocumentPreview } from './PdfDocumentPreview';

interface ResultViewProps {
  results: ResultItem[];
  lang: Language;
  onProcessAnother: () => void;
  onBackToHome: () => void;
  onChainTool?: (item: ResultItem, targetTool: ToolType) => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  results,
  lang,
  onProcessAnother,
  onBackToHome,
  onChainTool,
}) => {
  const t = getTranslation(lang);
  const isMultiple = results.length > 1;
  const isAr = lang === 'ar';
  const [previewItem, setPreviewItem] = useState<ResultItem | null>(() => results[0] || null);
  const [isZipping, setIsZipping] = useState(false);
  const [activePdfBytes, setActivePdfBytes] = useState<Uint8Array | null>(null);
  const [activeHtmlText, setActiveHtmlText] = useState<string | null>(null);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeTextContent, setActiveTextContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isModalPreviewOpen, setIsModalPreviewOpen] = useState(false);
  const [isCopiedHtml, setIsCopiedHtml] = useState(false);
  const [isCopiedText, setIsCopiedText] = useState(false);

  // Track all generated Object URLs to automatically revoke them and prevent memory leaks
  const generatedUrlsRef = useRef<Set<string>>(new Set());

  const getTrackedUrl = (blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    generatedUrlsRef.current.add(url);
    return url;
  };

  // Automatic cleanup function that revokes object URLs when user leaves the result screen
  useEffect(() => {
    return () => {
      generatedUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      generatedUrlsRef.current.clear();
    };
  }, []);

  // Also track URLs that came with results
  useEffect(() => {
    results.forEach((item) => {
      if (item.url) {
        generatedUrlsRef.current.add(item.url);
      }
    });
  }, [results]);

  // Keyboard shortcut to close fullscreen modal with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalPreviewOpen) {
        setIsModalPreviewOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalPreviewOpen]);

  // Load appropriate preview content when previewItem changes
  useEffect(() => {
    let isCancelled = false;
    setPreviewLoading(true);
    setActivePdfBytes(null);
    setActiveHtmlText(null);
    setActiveImageUrl(null);
    setActiveAudioUrl(null);
    setActiveVideoUrl(null);
    setActiveTextContent(null);

    if (!previewItem) {
      setPreviewLoading(false);
      return;
    }

    const lowerName = (previewItem.downloadName || previewItem.name || '').toLowerCase();
    const mime = (previewItem.type || '').toLowerCase();

    // Direct pre-extracted text
    if (previewItem.previewText || previewItem.text) {
      setActiveTextContent(previewItem.previewText || previewItem.text || '');
    }

    const isPdf = mime.includes('pdf') || lowerName.endsWith('.pdf');
    const isHtml = mime.includes('html') || lowerName.endsWith('.html') || lowerName.endsWith('.htm');
    const isImg = mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp|ico|avif)$/i.test(lowerName);
    const isAudio = mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(lowerName);
    const isVideo = mime.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(lowerName);
    const isTxt = (mime.includes('text') || /\.(txt|md|markdown|json|csv|xml|log|js|ts|jsx|tsx|css|scss|sql|yaml|yml|ini|sh|bat)$/i.test(lowerName)) && !isHtml;

    if (isPdf) {
      previewItem.blob.arrayBuffer().then((buffer) => {
        if (!isCancelled) {
          setActivePdfBytes(new Uint8Array(buffer));
          setPreviewLoading(false);
        }
      }).catch((err) => {
        console.error('Failed to load PDF preview buffer:', err);
        if (!isCancelled) setPreviewLoading(false);
      });
    } else if (isHtml) {
      previewItem.blob.text().then((text) => {
        if (!isCancelled) {
          setActiveHtmlText(text);
          setPreviewLoading(false);
        }
      }).catch((err) => {
        console.error('Failed to load HTML preview text:', err);
        if (!isCancelled) setPreviewLoading(false);
      });
    } else if (isImg) {
      const url = getTrackedUrl(previewItem.blob);
      if (!isCancelled) {
        setActiveImageUrl(url);
        setPreviewLoading(false);
      }
    } else if (isAudio) {
      const url = getTrackedUrl(previewItem.blob);
      if (!isCancelled) {
        setActiveAudioUrl(url);
        setPreviewLoading(false);
      }
    } else if (isVideo) {
      const url = getTrackedUrl(previewItem.blob);
      if (!isCancelled) {
        setActiveVideoUrl(url);
        setPreviewLoading(false);
      }
    } else if (isTxt && !previewItem.previewText) {
      previewItem.blob.text().then((text) => {
        if (!isCancelled) {
          setActiveTextContent(text);
          setPreviewLoading(false);
        }
      }).catch((err) => {
        console.error('Failed to load text preview:', err);
        if (!isCancelled) setPreviewLoading(false);
      });
    } else {
      setPreviewLoading(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [previewItem]);

  // Auto-record results in Recent Files history
  useEffect(() => {
    results.forEach((item) => {
      const isEncryptedFile = item.downloadName.toLowerCase().includes('encrypt') || item.downloadName.includes('مشفر') || item.downloadName.toLowerCase().includes('protected');
      saveRecentFile({
        name: item.downloadName || item.name,
        size: item.size,
        type: item.type,
        toolUsed: isMultiple ? 'batch' : 'tool',
        downloadName: item.downloadName || item.name,
        isEncrypted: isEncryptedFile,
        encryptionType: isEncryptedFile ? (isAr ? 'ملف مشفر ومحمي بكلمة مرور (تشفير AES القياسي)' : 'Password Protected & Encrypted (AES-256)') : undefined,
      });
    });
  }, [results, isMultiple, isAr]);

  const handleDownloadAll = () => {
    results.forEach((item, index) => {
      setTimeout(() => {
        triggerDownload(item.blob, item.downloadName);
      }, index * 250);
    });
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      for (const item of results) {
        zip.file(item.downloadName, item.blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = getTrackedUrl(zipBlob);
      const tempLink = document.createElement('a');
      tempLink.href = zipUrl;
      tempLink.download = `AlMoharrer_Batch_${Date.now()}.zip`;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
    } catch (err) {
      console.error('ZIP generation failed', err);
      handleDownloadAll();
    } finally {
      setIsZipping(false);
    }
  };

  const totalSize = results.reduce((acc, curr) => acc + (curr.size || 0), 0);

  const openFullPreview = (item: ResultItem) => {
    setPreviewItem(item);
    setIsModalPreviewOpen(true);
  };

  const handleCopyHtml = () => {
    if (!activeHtmlText) return;
    navigator.clipboard.writeText(activeHtmlText).then(() => {
      setIsCopiedHtml(true);
      setTimeout(() => setIsCopiedHtml(false), 2000);
    });
  };

  const handleCopyText = () => {
    if (!activeTextContent) return;
    navigator.clipboard.writeText(activeTextContent).then(() => {
      setIsCopiedText(true);
      setTimeout(() => setIsCopiedText(false), 2000);
    });
  };

  return (
    <div id="result-view-container" className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in zoom-in-95 duration-400">
      {/* Success Badge & Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-9 h-9 stroke-[2]" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-neutral-900 dark:text-white">
          {t.successTitle}
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
          {isMultiple 
            ? (isAr ? `تمت معالجة جميع الملفات بنجاح (${results.length} ملفات)` : `All ${results.length} files processed successfully`)
            : t.successSub}
        </p>
      </div>

      {/* Batch Processing Summary Card */}
      {isMultiple && (
        <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <span>{isAr ? 'حزمة المعالجة المتعددة (Batch Package)' : 'Batch Processed Package'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-600 text-white">
                  {results.length} {isAr ? 'ملفات' : 'files'}
                </span>
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {isAr ? 'إجمالي الحجم:' : 'Total size:'} {formatFileSize(totalSize, lang)} • {isAr ? 'تم حفظ النتائج في السجل السريع' : 'Saved to recent history'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="btn-download-zip-results"
              type="button"
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex-1 sm:flex-none text-xs font-semibold px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 transition-all"
            >
              <FolderDown className="w-4 h-4" />
              <span>{isZipping ? (isAr ? 'جارٍ ضغط الحزمة...' : 'Zipping...') : (isAr ? 'تحميل الكل كملف ZIP' : 'Download All as ZIP')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Result Cards */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/5">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {isAr ? `الملفات الناتجة (${results.length})` : `Output Files (${results.length})`}
          </span>
          <div className="flex items-center gap-2">
            <button
              id="btn-download-zip-top"
              type="button"
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              title={isAr ? 'تحميل جميع الملفات في أرشيف ZIP مضغوط واحد' : 'Download all files in a single ZIP archive'}
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>{isZipping ? (isAr ? 'جارٍ الضغط...' : 'Zipping...') : (isAr ? 'تحميل كملف ZIP' : 'Download as ZIP')}</span>
            </button>
            {isMultiple && (
              <button
                id="btn-download-all-results"
                type="button"
                onClick={handleDownloadAll}
                className="text-xs font-medium px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isAr ? 'تحميل منفصل' : 'Download Individually'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto p-1">
          {results.map((item, idx) => {
            const isSelected = previewItem === item;
            return (
              <div
                key={idx}
                id={`result-file-row-${idx}`}
                onClick={() => setPreviewItem(item)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 dark:border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                    : 'bg-neutral-50 dark:bg-[#252528] border-neutral-200/60 dark:border-white/5 hover:border-neutral-300 dark:hover:border-white/15'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2 rtl:pr-0 rtl:pl-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate max-w-xs sm:max-w-md">
                        {item.downloadName}
                      </p>
                      {isSelected && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
                          {isAr ? 'معروض' : 'Viewing'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      {formatFileSize(item.size, lang)} • {isAr ? 'جاهز للتحميل والمعاينة' : 'Ready to download & preview'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    id={`btn-preview-item-${idx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openFullPreview(item);
                    }}
                    className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                    title={isAr ? 'تكبير ملء الشاشة' : 'Fullscreen Preview'}
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
                    <span className="hidden sm:inline">{isAr ? 'ملء الشاشة' : 'Fullscreen'}</span>
                  </button>

                  <button
                    type="button"
                    id={`btn-download-item-${idx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerDownload(item.blob, item.downloadName);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.btnDownload}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Embedded High-Fidelity Document Previewer */}
      {previewItem && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2 truncate">
                  <span>{isAr ? 'معاينة المستند:' : 'Document Preview:'}</span>
                  <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400 truncate max-w-xs">
                    {previewItem.downloadName}
                  </span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeHtmlText && (
                <>
                  <button
                    type="button"
                    onClick={handleCopyHtml}
                    className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                    title={isAr ? 'نسخ كود HTML بالكامل' : 'Copy Full HTML Code'}
                  >
                    {isCopiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopiedHtml ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ كود HTML' : 'Copy HTML')}</span>
                  </button>
                  <a
                    href={previewItem.url || URL.createObjectURL(previewItem.blob)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isAr ? 'فتح في تبويب' : 'Open Tab'}</span>
                  </a>
                </>
              )}

              {activeTextContent && (
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                  title={isAr ? 'نسخ النص المستخرج بالكامل' : 'Copy Extracted Text'}
                >
                  {isCopiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopiedText ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ النص' : 'Copy Text')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsModalPreviewOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{isAr ? 'تكبير ملء الشاشة' : 'Fullscreen'}</span>
              </button>
            </div>
          </div>

          <div className="w-full rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-white/10 bg-neutral-100 dark:bg-black">
            {previewLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-xs text-neutral-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span>{isAr ? 'جارٍ تحضير المعاينة...' : 'Loading preview...'}</span>
              </div>
            ) : activePdfBytes ? (
              <PdfDocumentPreview
                pdfData={activePdfBytes}
                fileName={previewItem.downloadName}
                lang={lang}
                isModal={false}
                className="border-0 rounded-2xl"
              />
            ) : activeHtmlText ? (
              <iframe
                title={previewItem.downloadName}
                srcDoc={activeHtmlText}
                sandbox="allow-scripts allow-same-origin allow-popups"
                className="w-full h-[520px] bg-white border-0 rounded-2xl shadow-inner"
              />
            ) : activeImageUrl ? (
              <div className="flex items-center justify-center p-6 bg-neutral-900/5 dark:bg-black min-h-[360px]">
                <img
                  src={activeImageUrl}
                  alt={previewItem.downloadName}
                  className="max-h-[500px] max-w-full object-contain rounded-xl shadow-md"
                />
              </div>
            ) : activeAudioUrl ? (
              <div className="p-8 flex flex-col items-center justify-center gap-4 bg-white dark:bg-[#18181b]">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Music className="w-7 h-7" />
                </div>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{previewItem.downloadName}</p>
                <audio controls src={activeAudioUrl} className="w-full max-w-md shadow-sm rounded-lg" />
              </div>
            ) : activeVideoUrl ? (
              <div className="p-4 flex items-center justify-center bg-black min-h-[360px]">
                <video controls src={activeVideoUrl} className="max-h-[500px] max-w-full rounded-xl" />
              </div>
            ) : activeTextContent ? (
              <div className="relative">
                <pre className="p-6 bg-neutral-900 text-neutral-100 font-mono text-xs overflow-auto max-h-[480px] leading-relaxed select-text">
                  <code>{activeTextContent}</code>
                </pre>
              </div>
            ) : (
              <div className="p-10 flex flex-col items-center justify-center text-center space-y-4 bg-white dark:bg-[#18181b]">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileCheck2 className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h4 className="text-base font-semibold text-neutral-900 dark:text-white">
                    {previewItem.downloadName}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {formatFileSize(previewItem.size, lang)} • {previewItem.type || (isAr ? 'ملف جاهز' : 'Ready file')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerDownload(previewItem.blob, previewItem.downloadName)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.btnDownload}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Modal Preview */}
      {isModalPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 text-white">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold truncate max-w-md">{previewItem?.downloadName}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsModalPreviewOpen(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 w-full rounded-2xl overflow-hidden bg-neutral-950 border border-white/10 flex items-center justify-center">
            {activePdfBytes ? (
              <PdfDocumentPreview
                pdfData={activePdfBytes}
                fileName={previewItem?.downloadName || 'Document.pdf'}
                lang={lang}
                isModal={true}
                onClose={() => setIsModalPreviewOpen(false)}
              />
            ) : activeHtmlText ? (
              <iframe
                title={previewItem?.downloadName || 'HTML Preview'}
                srcDoc={activeHtmlText}
                sandbox="allow-scripts allow-same-origin allow-popups"
                className="w-full h-full bg-white border-0"
              />
            ) : activeImageUrl ? (
              <img
                src={activeImageUrl}
                alt={previewItem?.downloadName}
                className="max-h-full max-w-full object-contain"
              />
            ) : activeAudioUrl ? (
              <div className="p-8 flex flex-col items-center justify-center gap-4 bg-neutral-900 text-white rounded-2xl">
                <Music className="w-12 h-12 text-blue-400" />
                <audio controls src={activeAudioUrl} className="w-full max-w-md" />
              </div>
            ) : activeVideoUrl ? (
              <video controls src={activeVideoUrl} className="max-h-full max-w-full" />
            ) : activeTextContent ? (
              <pre className="w-full h-full p-6 text-neutral-200 font-mono text-xs overflow-auto select-text">
                <code>{activeTextContent}</code>
              </pre>
            ) : (
              <div className="p-8 text-center text-white space-y-4">
                <FileCheck2 className="w-12 h-12 mx-auto text-blue-400" />
                <p className="text-sm">{previewItem?.downloadName}</p>
                <button
                  type="button"
                  onClick={() => previewItem && triggerDownload(previewItem.blob, previewItem.downloadName)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.btnDownload}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tool Chaining (سلسلة العمليات المتتالية) */}
      {onChainTool && previewItem && (
        <div id="tool-chaining-card" className="p-5 rounded-3xl bg-neutral-50/80 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                  {isAr ? 'متابعة المعالجة بأداة أخرى (سلسلة العمليات)' : 'Continue Processing with Another Tool'}
                </h4>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {isAr ? `تطبيق عملية إضافية فوراً على "${previewItem.downloadName}" دون إعادة رفعه` : `Apply another tool directly to "${previewItem.downloadName}" without re-uploading`}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 self-start sm:self-center">
              Zero-Reupload
            </span>
          </div>

          {/* Quick Chaining Action Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* If PDF */}
            {(previewItem.downloadName.toLowerCase().endsWith('.pdf') || previewItem.type.includes('pdf')) ? (
              <>
                <button
                  type="button"
                  onClick={() => onChainTool(previewItem, 'compress')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-neutral-700 dark:text-neutral-200 text-xs font-medium border border-neutral-200/80 dark:border-white/10 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>{isAr ? 'ضغط الحجم' : 'Compress'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChainTool(previewItem, 'watermark')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-neutral-700 dark:text-neutral-200 text-xs font-medium border border-neutral-200/80 dark:border-white/10 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <Stamp className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isAr ? 'علامة مائية' : 'Watermark'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChainTool(previewItem, 'sign')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-neutral-700 dark:text-neutral-200 text-xs font-medium border border-neutral-200/80 dark:border-white/10 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <PenTool className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isAr ? 'توقيع المستند' : 'Sign PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChainTool(previewItem, 'encrypt')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-neutral-700 dark:text-neutral-200 text-xs font-medium border border-neutral-200/80 dark:border-white/10 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isAr ? 'حماية وتشفير' : 'Encrypt'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChainTool(previewItem, 'extract-text')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-neutral-700 dark:text-neutral-200 text-xs font-medium border border-neutral-200/80 dark:border-white/10 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-500" />
                  <span>{isAr ? 'استخراج النصوص OCR' : 'Extract Text (OCR)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChainTool(previewItem, 'pdf-to-word')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-neutral-700 dark:text-neutral-200 text-xs font-medium border border-neutral-200/80 dark:border-white/10 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>{isAr ? 'تحويل لـ Word' : 'PDF to Word'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChainTool(previewItem, 'flatten')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-neutral-700 dark:text-neutral-200 text-xs font-medium border border-neutral-200/80 dark:border-white/10 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <Layers className="w-3.5 h-3.5 text-purple-500" />
                  <span>{isAr ? 'تسطيح المستند' : 'Flatten'}</span>
                </button>
              </>
            ) : (
              /* If Image or Other file */
              <>
                <button
                  type="button"
                  onClick={() => onChainTool(previewItem, 'images-to-pdf')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-neutral-700 dark:text-neutral-200 text-xs font-medium border border-neutral-200/80 dark:border-white/10 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>{isAr ? 'تحويل لـ PDF' : 'Convert to PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChainTool(previewItem, 'image-compress')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-neutral-700 dark:text-neutral-200 text-xs font-medium border border-neutral-200/80 dark:border-white/10 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isAr ? 'ضغط الصورة' : 'Compress Image'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChainTool(previewItem, 'image-convert')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-neutral-700 dark:text-neutral-200 text-xs font-medium border border-neutral-200/80 dark:border-white/10 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-purple-500" />
                  <span>{isAr ? 'تحويل الصيغة' : 'Convert Format'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChainTool(previewItem, 'extract-text')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-neutral-700 dark:text-neutral-200 text-xs font-medium border border-neutral-200/80 dark:border-white/10 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-500" />
                  <span>{isAr ? 'استخراج النصوص OCR' : 'Extract Text (OCR)'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          id="btn-process-another"
          type="button"
          onClick={onProcessAnother}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 text-neutral-900 dark:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{t.btnProcessAnother}</span>
        </button>

        <button
          id="btn-back-home"
          type="button"
          onClick={onBackToHome}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300 text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>{t.btnBackToHome}</span>
        </button>
      </div>
    </div>
  );
};
