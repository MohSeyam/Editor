import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ArrowLeft, 
  ArrowRight, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  FileCode,
  Table as TableIcon,
  Languages,
  FileSpreadsheet,
  Layers,
  RefreshCw
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
import { UploadedFile, Language } from '../types';
import { extractDocumentText } from '../utils/pdfExtraFeatures';
import { exportOcrToExcel, exportSearchablePdf } from '../utils/ocrSearchablePdf';

interface ToolExtractTextViewProps {
  file: UploadedFile;
  lang: Language;
  onBack: () => void;
}

export const ToolExtractTextView: React.FC<ToolExtractTextViewProps> = ({
  file,
  lang,
  onBack,
}) => {
  const isAr = lang === 'ar';
  const [extractedText, setExtractedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [stats, setStats] = useState<{ pages: number; words: number }>({ pages: 1, words: 0 });

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const runExtract = async () => {
      try {
        const res = await extractDocumentText(file.file, file.data);
        if (isMounted) {
          setExtractedText(res.text);
          setStats({ pages: res.pageCount, words: res.wordCount });
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Text extract error', err);
        if (isMounted) {
          setExtractedText(isAr ? 'تعذر استخراج النص من هذا الملف' : 'Failed to extract text from file');
          setIsLoading(false);
        }
      }
    };

    runExtract();

    return () => {
      isMounted = false;
    };
  }, [file]);

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}_text.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadDocx = async () => {
    try {
      const lines = extractedText.split('\n');
      const docChildren: any[] = [];

      for (const line of lines) {
        // Table row recognition
        if (line.includes('|') && line.split('|').length > 2) {
          const cells = line.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
          if (cells.length > 1) {
            docChildren.push(
              new Table({
                rows: [
                  new TableRow({
                    children: cells.map(
                      (cellText) =>
                        new TableCell({
                          width: { size: Math.round(100 / cells.length), type: WidthType.PERCENTAGE },
                          children: [new Paragraph({ children: [new TextRun({ text: cellText, size: 20 })] })],
                        })
                    ),
                  }),
                ],
              })
            );
            continue;
          }
        }

        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: line, size: 22 })],
            spacing: { after: 100 },
          })
        );
      }

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: docChildren.length > 0 ? docChildren : [new Paragraph({ children: [new TextRun(extractedText)] })],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace(/\.[^/.]+$/, '')}_extracted.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Failed to create DOCX:', err);
    }
  };

  const handleDownloadExcel = () => {
    try {
      const blob = exportOcrToExcel(extractedText, 'OCR_Extracted');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace(/\.[^/.]+$/, '')}_tables.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Failed to create XLSX:', err);
    }
  };

  const handleDownloadSearchablePdf = async () => {
    try {
      const isPdf = file.extension === 'pdf' || file.type.includes('pdf');
      const blob = await exportSearchablePdf(file.data, 1, extractedText, isPdf);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace(/\.[^/.]+$/, '')}_searchable.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Failed to create searchable PDF:', err);
    }
  };

  const handleRerunExtraction = async () => {
    setIsLoading(true);
    try {
      const res = await extractDocumentText(file.file, file.data);
      setExtractedText(res.text);
      setStats({ pages: res.pageCount, words: res.wordCount });
    } catch (err) {
      console.error('Re-scan error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-4 space-y-6">
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

      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5 dark:border-white/5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">{isAr ? 'استخراج النصوص والتعرف الضوئي (OCR)' : 'OCR & Text Extraction'}</h2>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Fast OCR ara+eng
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                    <TableIcon className="w-2.5 h-2.5" />
                    <span>{isAr ? 'تعرف على الجداول' : 'Tables'}</span>
                  </span>
                </div>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {stats.pages} {isAr ? 'صفحات' : 'pages'} • {stats.words} {isAr ? 'كلمة' : 'words'} • {extractedText.length} {isAr ? 'حرف' : 'characters'}
              </p>
            </div>
          </div>

          {/* Export and Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={handleRerunExtraction}
              disabled={isLoading}
              title={isAr ? 'إعادة مسح OCR' : 'Re-run OCR'}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleCopy}
              disabled={isLoading || !extractedText}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ النص' : 'Copy')}</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              disabled={isLoading || !extractedText}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>TXT</span>
            </button>

            <button
              onClick={handleDownloadExcel}
              disabled={isLoading || !extractedText}
              title={isAr ? 'تصدير الجداول إلى Excel' : 'Export Tables to Excel'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel (XLSX)</span>
            </button>

            <button
              onClick={handleDownloadSearchablePdf}
              disabled={isLoading || !extractedText}
              title={isAr ? 'تصدير كـ PDF قابل للبحث والتحديد' : 'Export Searchable PDF'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>PDF قابل للبحث</span>
            </button>

            <button
              onClick={handleDownloadDocx}
              disabled={isLoading || !extractedText}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Word (DOCX)</span>
            </button>
          </div>
        </div>

        {/* Text Viewer Box */}
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-neutral-400 space-y-2">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">{isAr ? 'جارٍ الاستخراج...' : 'Extracting text...'}</span>
          </div>
        ) : (
          <textarea
            readOnly
            value={extractedText}
            rows={14}
            className="w-full p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm font-mono leading-relaxed outline-none resize-y"
          />
        )}
      </div>
    </div>
  );
};
