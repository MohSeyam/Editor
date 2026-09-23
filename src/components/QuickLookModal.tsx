import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  FileText, 
  ExternalLink,
  Eye,
  Layers,
  Sparkles,
  Loader2
} from 'lucide-react';
import { UploadedFile, Language, ToolType } from '../types';
import { formatFileSize, getFileExtension } from '../utils/fileHelpers';
import { renderPdfPageThumbnail } from '../utils/pdfThumbnail';
import { decodeImageToCanvas } from '../utils/imageFormatUtils';
import mammoth from 'mammoth';

interface QuickLookModalProps {
  file: UploadedFile | null;
  lang: Language;
  onClose: () => void;
  onSelectTool?: (tool: ToolType, file: UploadedFile) => void;
}

export const QuickLookModal: React.FC<QuickLookModalProps> = ({
  file,
  lang,
  onClose,
  onSelectTool,
}) => {
  const isAr = lang === 'ar';
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pdfPageUrl, setPdfPageUrl] = useState<string>('');
  const [imageCanvasUrl, setImageCanvasUrl] = useState<string>('');
  const [docHtml, setDocHtml] = useState<string>('');
  const [docText, setDocText] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file) return;

    setCurrentPage(1);
    setZoom(1);
    setRotation(0);
    setIsLoading(true);
    setPdfPageUrl('');
    setImageCanvasUrl('');
    setDocHtml('');
    setDocText('');
    setImageDimensions(null);

    const ext = getFileExtension(file.name).toLowerCase();
    let isCancelled = false;

    async function loadContent() {
      try {
        if (ext === 'pdf') {
          setTotalPages(file.pageCount || 1);
          const url = await renderPdfPageThumbnail(file.data, 1, 1200);
          if (!isCancelled) {
            setPdfPageUrl(url);
            setIsLoading(false);
          }
        } else if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'svg', 'gif', 'heic', 'heif', 'tiff', 'tif'].includes(ext)) {
          const canvas = await decodeImageToCanvas(file.data, ext);
          if (!isCancelled) {
            setImageDimensions({ width: canvas.width, height: canvas.height });
            setImageCanvasUrl(canvas.toDataURL('image/jpeg', 0.95));
            setIsLoading(false);
          }
        } else if (ext === 'docx' || ext === 'doc') {
          try {
            const buffer = file.data.buffer.slice(file.data.byteOffset, file.data.byteOffset + file.data.byteLength);
            const res = await mammoth.convertToHtml({ arrayBuffer: buffer });
            if (!isCancelled) {
              setDocHtml(res.value);
              setIsLoading(false);
            }
          } catch {
            if (!isCancelled) {
              setDocText(isAr ? 'مستند Word جاهز للمعالجة والتحويل إلى PDF' : 'Word Document ready for conversion to PDF');
              setIsLoading(false);
            }
          }
        } else if (['txt', 'md', 'json', 'csv', 'html', 'htm'].includes(ext)) {
          const text = new TextDecoder('utf-8').decode(file.data);
          if (!isCancelled) {
            setDocText(text.slice(0, 10000));
            setIsLoading(false);
          }
        } else {
          if (!isCancelled) {
            setDocText(isAr ? 'ملف جاهز للمزامنة والتشفير والتحويل المباشر' : 'Binary file ready for processing');
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error('Quick look error', err);
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadContent();

    return () => {
      isCancelled = true;
    };
  }, [file, isAr]);

  // Handle PDF page change
  const handlePageChange = async (newPage: number) => {
    if (!file || newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    setIsLoading(true);
    try {
      const url = await renderPdfPageThumbnail(file.data, newPage, 1200);
      setPdfPageUrl(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadOriginal = () => {
    if (!file) return;
    const blob = new Blob([file.data], { type: file.type || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!file) return null;

  const ext = getFileExtension(file.name).toLowerCase();
  const isPdf = ext === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'svg', 'gif', 'heic', 'heif', 'tiff', 'tif'].includes(ext);
  const isWord = ext === 'docx' || ext === 'doc';
  const isText = ['txt', 'md', 'json', 'csv', 'html', 'htm'].includes(ext);

  return (
    <div 
      id="quick-look-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl h-[88vh] max-h-[860px] bg-white/95 dark:bg-[#18181b]/95 border border-white/40 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/50 dark:bg-black/20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
                  {file.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
                  {ext}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {formatFileSize(file.size)}
                {imageDimensions && ` • ${imageDimensions.width} × ${imageDimensions.height}px`}
                {isPdf && totalPages > 1 && ` • ${totalPages} ${isAr ? 'صفحات' : 'pages'}`}
              </p>
            </div>
          </div>

          {/* Controls & Close */}
          <div className="flex items-center gap-2">
            {(isPdf || isImage) && (
              <div className="hidden sm:flex items-center bg-neutral-100 dark:bg-white/5 rounded-xl p-1 border border-black/5 dark:border-white/5">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                  title="تصغير"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono px-2 text-neutral-500">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                  title="تكبير"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                {isImage && (
                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 cursor-pointer ml-1"
                    title="تدوير"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            <button
              id="btn-quicklook-close"
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-neutral-50/50 dark:bg-neutral-900/50 relative">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-neutral-400 animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-xs font-medium">
                {isAr ? 'جارٍ تحضير المعاينة الفورية عالية الدقة...' : 'Generating high-res preview...'}
              </span>
            </div>
          ) : isPdf && pdfPageUrl ? (
            <div 
              className="transition-transform duration-200 ease-out origin-center flex flex-col items-center"
              style={{ transform: `scale(${zoom})` }}
            >
              <img
                src={pdfPageUrl}
                alt={`PDF page ${currentPage}`}
                className="max-h-[60vh] sm:max-h-[68vh] w-auto rounded-lg shadow-xl border border-black/10 dark:border-white/10 object-contain"
              />
            </div>
          ) : isImage && imageCanvasUrl ? (
            <div 
              className="transition-transform duration-200 ease-out origin-center"
              style={{ 
                transform: `scale(${zoom}) rotate(${rotation}deg)` 
              }}
            >
              <img
                src={imageCanvasUrl}
                alt={file.name}
                className="max-h-[60vh] sm:max-h-[68vh] max-w-full rounded-xl shadow-xl object-contain"
              />
            </div>
          ) : isWord && docHtml ? (
            <div className="w-full max-w-3xl h-full bg-white dark:bg-[#1f1f23] p-6 sm:p-8 rounded-2xl shadow-md overflow-y-auto prose dark:prose-invert max-w-none text-neutral-800 dark:text-neutral-200 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: docHtml }}
            />
          ) : isText && docText ? (
            <div className="w-full max-w-3xl h-full bg-white dark:bg-[#1f1f23] p-6 rounded-2xl shadow-md overflow-auto font-mono text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
              {docText}
            </div>
          ) : (
            <div className="text-center p-8 text-neutral-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-400 stroke-1" />
              <p className="text-sm font-medium">
                {isAr ? 'ملف جاهز للمعالجة السريعة' : 'File ready for direct operations'}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                {file.name} ({formatFileSize(file.size)})
              </p>
            </div>
          )}
        </div>

        {/* Footer with Page Flip & Quick Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-black/30">
          {/* PDF Page Navigation */}
          {isPdf && totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                {isAr ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr ? 'معاينة فورية محلية آمنة 100%' : '100% Private Client-Side Quick Look'}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleDownloadOriginal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isAr ? 'تحميل الأصل' : 'Download Original'}</span>
            </button>

            {onSelectTool && (
              <>
                {isPdf && (
                  <button
                    onClick={() => {
                      onClose();
                      onSelectTool('compress', file);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAr ? 'ضغط المستند' : 'Compress PDF'}</span>
                  </button>
                )}

                {isImage && (
                  <button
                    onClick={() => {
                      onClose();
                      onSelectTool('convert', file);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تحويل لـ PDF' : 'Convert to PDF'}</span>
                  </button>
                )}

                {isWord && (
                  <button
                    onClick={() => {
                      onClose();
                      onSelectTool('convert', file);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تحويل فوري إلى PDF' : 'Convert to PDF'}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
