import React, { useState, useRef, useMemo } from 'react';
import { 
  Sparkles, 
  UploadCloud, 
  Layers, 
  Minimize2, 
  ArrowLeftRight, 
  Scissors, 
  PenTool, 
  Lock, 
  Unlock, 
  FileText, 
  Image as ImageIcon, 
  Hash, 
  X, 
  Zap, 
  CheckCircle, 
  Highlighter, 
  RefreshCw, 
  GitCompare,
  ShieldCheck,
  Printer,
  FormInput,
  ListTree,
  FolderUp,
  ChevronDown,
  ChevronUp,
  Search,
  RotateCw,
  Eraser,
  FilePlus,
  Stamp,
  QrCode,
  Languages,
  Sliders,
  ShieldAlert,
  FileCode,
  Binary,
  Split,
  Archive,
  Wrench,
  Receipt
} from 'lucide-react';
import { ToolType, Language } from '../types';
import { formatFileSize, extractFilesFromDataTransfer } from '../utils/fileHelpers';

interface SmartAutoProcessBannerProps {
  lang: Language;
  onSelectToolWithFiles: (tool: ToolType, files: File[]) => void;
  onOpenToolsModal?: () => void;
}

interface DetectedSuggestion {
  tool: ToolType;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  isPrimary?: boolean;
  reason?: string;
  badge?: string;
  category?: 'pages' | 'convert' | 'security' | 'advanced';
}

export const SmartAutoProcessBanner: React.FC<SmartAutoProcessBannerProps> = ({
  lang,
  onSelectToolWithFiles,
}) => {
  const isAr = lang === 'ar';
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isExpandedAll, setIsExpandedAll] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'pages' | 'convert' | 'security' | 'advanced'>('all');

  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (filesList: FileList | File[] | null) => {
    if (!filesList) return;
    const array = Array.from(filesList);
    if (array.length === 0) return;
    setSelectedFiles(array);
  };

  const handleDropAsync = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const files = await extractFilesFromDataTransfer(e.dataTransfer);
      if (files.length > 0) {
        handleFiles(files);
      }
    } catch (err) {
      console.warn('Folder/files extraction failed:', err);
      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    }
  };

  const clearSelection = () => {
    setSelectedFiles([]);
    setFilterQuery('');
    if (inputRef.current) inputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  // Primary top recommendations
  const getPrimarySuggestions = (files: File[]): DetectedSuggestion[] => {
    if (files.length === 0) return [];

    const isMultiple = files.length > 1;
    const firstExt = (files[0].name.split('.').pop() || '').toLowerCase();
    const allPdfs = files.every((f) => (f.name.split('.').pop() || '').toLowerCase() === 'pdf');
    const allImages = files.every((f) => 
      ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'bmp', 'svg'].includes((f.name.split('.').pop() || '').toLowerCase())
    );
    const hasLargePdf = files.some(
      (f) => (f.name.split('.').pop() || '').toLowerCase() === 'pdf' && f.size > 2 * 1024 * 1024
    );

    if (isMultiple) {
      if (files.length === 2 && allPdfs) {
        return [
          {
            tool: 'visual-compare',
            title: isAr ? 'مقارنة بصرية جنباً إلى جنب' : 'Visual Side-by-Side Compare',
            icon: GitCompare,
            accentColor: 'bg-indigo-600 hover:bg-indigo-700 text-white',
            isPrimary: true,
            badge: isAr ? 'مقارنة' : 'Compare',
            reason: isAr ? 'مقارنة بصرية دقيقة وإبراز الفروقات' : 'Side-by-side visual difference overlay',
          },
          {
            tool: 'merge',
            title: isAr ? 'دمج الملفين في مستند واحد' : 'Merge into Single PDF',
            icon: Layers,
            accentColor: 'bg-blue-600 hover:bg-blue-700 text-white',
            isPrimary: true,
            badge: isAr ? 'دمج' : 'Merge',
            reason: isAr ? 'جمع الملفين في مستند PDF منظم' : 'Combine both files into one PDF',
          },
          {
            tool: 'compress',
            title: isAr ? 'ضغط الملفين دفعة واحدة' : 'Batch Compress Both Files',
            icon: Minimize2,
            accentColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
            badge: 'Batch',
            reason: isAr ? 'تقليل حجم الملفين بنقرة واحدة' : 'Compress both files simultaneously',
          },
        ];
      }

      if (allPdfs || allImages) {
        return [
          {
            tool: 'merge',
            title: isAr ? 'دمج الملفات في مستند واحد' : 'Merge into Single Document',
            icon: Layers,
            accentColor: 'bg-blue-600 hover:bg-blue-700 text-white',
            isPrimary: true,
            badge: isAr ? 'دمج شامل' : 'Merge All',
            reason: isAr ? `دمج ${files.length} ملفات مع إعادة الترتيب` : `Combine ${files.length} files in order`,
          },
          {
            tool: 'compress',
            title: isAr ? `ضغط متعدّد لـ (${files.length}) ملفات` : `Batch Compress (${files.length}) Files`,
            icon: Minimize2,
            accentColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
            isPrimary: hasLargePdf,
            badge: 'Batch',
            reason: isAr ? 'تقليل حجم الملفات دفعة واحدة' : 'Shrink all files in one go',
          },
        ];
      }
    }

    // PDF files
    if (firstExt === 'pdf') {
      return [
        {
          tool: hasLargePdf ? 'compress' : 'convert',
          title: hasLargePdf 
            ? (isAr ? 'ضغط وتقليل حجم PDF الذكي' : 'Smart Compress PDF')
            : (isAr ? 'تحويل PDF إلى Word أو صور' : 'Convert PDF to Word / Images'),
          icon: hasLargePdf ? Minimize2 : ArrowLeftRight,
          accentColor: hasLargePdf ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white',
          isPrimary: true,
          badge: hasLargePdf ? (isAr ? 'موصى به' : 'Recommended') : (isAr ? 'الأكثر طلباً' : 'Popular'),
          reason: hasLargePdf
            ? (isAr ? `الملف بحجم كبير (${formatFileSize(files[0].size, lang)})، ننصح بضغطه` : 'Large file size, compress recommended')
            : (isAr ? 'تصدير المحتوى إلى Word أو صور عالية الدقة' : 'Export content to editable Word or images'),
        },
        {
          tool: 'organize',
          title: isAr ? 'تنظيم وترتيب وحذف الصفحات' : 'Organize & Rotate Pages',
          icon: Layers,
          accentColor: 'bg-indigo-600 text-white',
          reason: isAr ? 'ترتيب الصفحات بصرياً وحذف أو تدوير أي صفحة' : 'Visually reorder, rotate, or delete pages',
        },
        {
          tool: 'sign',
          title: isAr ? 'توقيع المستند رسمياً' : 'Sign PDF Document',
          icon: PenTool,
          accentColor: 'bg-teal-600 text-white',
          reason: isAr ? 'إدراج توقيعك وختمه على الصفحات' : 'Draw or stamp your digital signature',
        },
        {
          tool: 'extract-text',
          title: isAr ? 'استخراج نصوص المستند' : 'Extract Document Text',
          icon: FileText,
          accentColor: 'bg-neutral-800 text-white',
          reason: isAr ? 'تصدير نصوص الصفحات بصيغة نصية' : 'Extract readable content cleanly',
        }
      ];
    }

    // Word documents
    if (['docx', 'doc'].includes(firstExt)) {
      return [
        {
          tool: 'convert',
          title: isAr ? 'تحويل Word إلى PDF مع الحفاظ على التنسيق' : 'Convert Word to PDF',
          icon: ArrowLeftRight,
          accentColor: 'bg-blue-600 text-white',
          isPrimary: true,
          badge: isAr ? 'موصى به' : 'Recommended',
          reason: isAr ? 'تثبيت التنسيق والخطوط في ملف PDF قياسي' : 'Lock layout and fonts into standard PDF',
        },
        {
          tool: 'word-to-markdown',
          title: isAr ? 'تحويل Word إلى Markdown' : 'Convert Word to Markdown',
          icon: FileCode,
          accentColor: 'bg-neutral-800 text-white',
          reason: isAr ? 'تصدير المستند إلى نصوص Markdown نظيفة' : 'Export clean markdown formatting',
        },
        {
          tool: 'extract-text',
          title: isAr ? 'استخراج نصوص المستند' : 'Extract Document Text',
          icon: FileText,
          accentColor: 'bg-indigo-600 text-white',
          reason: isAr ? 'تصدير محتوى المستند كنص نظيف' : 'Clean text extraction',
        },
      ];
    }

    // Spreadsheets
    if (['xlsx', 'xls', 'csv'].includes(firstExt)) {
      return [
        {
          tool: 'convert',
          title: isAr ? 'تحويل الجداول إلى مستند PDF' : 'Convert Spreadsheet to PDF',
          icon: ArrowLeftRight,
          accentColor: 'bg-emerald-600 text-white',
          isPrimary: true,
          badge: isAr ? 'موصى به' : 'Recommended',
          reason: isAr ? 'تصدير جداول البيانات إلى صفحات PDF منسقة للطباعة' : 'Export sheet tables into clean PDF',
        },
        {
          tool: 'excel-to-json',
          title: isAr ? 'تحويل Excel إلى بيانات JSON' : 'Convert Excel to JSON',
          icon: Binary,
          accentColor: 'bg-sky-600 text-white',
          reason: isAr ? 'تصدير البيانات البرمجية بتنسيق JSON' : 'Export structured data to JSON',
        },
        {
          tool: 'extract-text',
          title: isAr ? 'استخراج البيانات والجداول' : 'Extract Data & Tables',
          icon: FileText,
          accentColor: 'bg-teal-600 text-white',
          reason: isAr ? 'استخراج النصوص والأرقام' : 'Extract text and tabular numbers',
        },
      ];
    }

    // Images
    if (allImages) {
      return [
        {
          tool: 'convert',
          title: isAr ? 'تحويل الصور إلى مستند PDF' : 'Convert Images to PDF',
          icon: ArrowLeftRight,
          accentColor: 'bg-blue-600 text-white',
          isPrimary: true,
          badge: isAr ? 'شائع' : 'Popular',
          reason: isAr ? 'تجميع الصور في ملف PDF منسق' : 'Combine into printable PDF',
        },
        {
          tool: 'image-compress',
          title: isAr ? 'ضغط الصور وتقليل الحجم' : 'Compress Images',
          icon: Minimize2,
          accentColor: 'bg-emerald-600 text-white',
          reason: isAr ? 'تقليل حجم الصور دون تأثير مرئي' : 'Reduce file weight losslessly',
        },
        {
          tool: 'image-convert',
          title: isAr ? 'تحويل صيغة الصورة (PNG/JPG/WebP)' : 'Convert Image Format',
          icon: RefreshCw,
          accentColor: 'bg-indigo-600 text-white',
          reason: isAr ? 'تغيير الصيغة لـ WebP أو PNG أو JPG' : 'Export to PNG, JPG, or WebP',
        },
      ];
    }

    return [
      {
        tool: 'convert',
        title: isAr ? 'تحويل الصيغة' : 'Convert Format',
        icon: ArrowLeftRight,
        accentColor: 'bg-blue-600 text-white',
        isPrimary: true,
        reason: isAr ? 'تحويل الملف إلى PDF أو صيغ أخرى متوافقة' : 'Convert file to PDF or compatible formats',
      },
    ];
  };

  // Full comprehensive list of ALL operations available for the uploaded file format
  const getAllAvailableOperations = (files: File[]): DetectedSuggestion[] => {
    if (files.length === 0) return [];

    const firstExt = (files[0].name.split('.').pop() || '').toLowerCase();
    const allImages = files.every((f) => 
      ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'bmp', 'svg'].includes((f.name.split('.').pop() || '').toLowerCase())
    );

    // 1. PDF Complete Catalog (25+ Tools)
    if (firstExt === 'pdf') {
      return [
        // Pages & Structure
        { tool: 'organize', title: isAr ? 'تنظيم وترتيب الصفحات' : 'Organize & Rotate Pages', icon: RotateCw, accentColor: 'bg-blue-500', category: 'pages', reason: isAr ? 'إعادة ترتيب، تدوير، أو حذف صفحات' : 'Reorder, rotate, or delete pages' },
        { tool: 'split', title: isAr ? 'تقسيم واستخراج صفحات' : 'Split & Extract Pages', icon: Scissors, accentColor: 'bg-pink-500', category: 'pages', reason: isAr ? 'فصل نطاق صفحات في مستند مستقل' : 'Split page ranges into new docs' },
        { tool: 'merge', title: isAr ? 'دمج مع ملفات ومستندات أخرى' : 'Merge with other files', icon: Layers, accentColor: 'bg-indigo-500', category: 'pages', reason: isAr ? 'دمج مع ملفات PDF أو Word أو صور' : 'Combine with other docs & images' },
        { tool: 'rotate-pdf', title: isAr ? 'تدوير اتجاه الصفحات' : 'Rotate Pages', icon: RotateCw, accentColor: 'bg-sky-500', category: 'pages', reason: isAr ? 'تدوير الصفحات 90°، 180° أو 270°' : 'Rotate orientation by 90/180/270' },
        { tool: 'delete-pages', title: isAr ? 'حذف صفحات محددة' : 'Delete Specific Pages', icon: Eraser, accentColor: 'bg-rose-500', category: 'pages', reason: isAr ? 'حذف صفحات غير مرغوبة وتصدير الصافي' : 'Remove unwanted pages' },
        { tool: 'extract-pages', title: isAr ? 'استخراج صفحات محددة' : 'Extract Specific Pages', icon: FilePlus, accentColor: 'bg-teal-500', category: 'pages', reason: isAr ? 'استخراج صفحات معينة إلى ملف مستقل' : 'Export selected pages' },
        { tool: 'reverse-pages', title: isAr ? 'عكس ترتيب الصفحات' : 'Reverse Page Order', icon: RefreshCw, accentColor: 'bg-amber-500', category: 'pages', reason: isAr ? 'قلب ترتيب المستند من الأخير للأول' : 'Flip document page order' },
        { tool: 'booklet-maker', title: isAr ? 'إعداد كتيب وفرز الصفحات' : 'Booklet & Imposition', icon: Printer, accentColor: 'bg-purple-500', category: 'pages', reason: isAr ? 'ترتيب الصفحات للطباعة المزدوجة ككتيب' : 'Prepare 2-up booklet printing' },
        
        // Convert & Export
        { tool: 'convert', title: isAr ? 'تحويل PDF إلى Word / صور / Excel' : 'Convert PDF to Word/Images', icon: ArrowLeftRight, accentColor: 'bg-blue-600', category: 'convert', reason: isAr ? 'تصدير إلى Word أو PNG أو Excel' : 'Export to Word, PNG, or Excel' },
        { tool: 'pdf-to-html', title: isAr ? 'تحويل PDF إلى صفحة ويب HTML' : 'Convert PDF to HTML', icon: FileCode, accentColor: 'bg-orange-500', category: 'convert', reason: isAr ? 'تحويل محتوى PDF إلى شفرة HTML نقية' : 'Export PDF content to clean HTML' },
        { tool: 'pdfa', title: isAr ? 'تحويل إلى PDF/A للأرشفة الرسمية' : 'Convert to PDF/A Archive', icon: Archive, accentColor: 'bg-emerald-600', category: 'convert', reason: isAr ? 'مطابقة معايير الحفظ طويل الأمد' : 'Long-term preservation standard' },
        
        // Optimization
        { tool: 'compress', title: isAr ? 'ضغط ذكي متوازن' : 'Smart Compression', icon: Minimize2, accentColor: 'bg-emerald-500', category: 'advanced', reason: isAr ? 'تقليل الحجم مع الحفاظ على جودة القراءة' : 'Balance size reduction and clarity' },
        { tool: 'pdf-compress-heavy', title: isAr ? 'ضغط فائق (أقصى توفير)' : 'Heavy High Compression', icon: Minimize2, accentColor: 'bg-teal-600', category: 'advanced', reason: isAr ? 'ضغط بنسبة تصل إلى 80% للبريد والواتساب' : 'Up to 80% reduction for emails' },
        { tool: 'crop-pdf', title: isAr ? 'قص الهوامش البيضاء' : 'Crop White Margins', icon: Scissors, accentColor: 'bg-amber-600', category: 'advanced', reason: isAr ? 'قص الهوامش الزائدة لتكبير المحتوى' : 'Trim excess empty page borders' },
        { tool: 'grayscale-pdf', title: isAr ? 'تحويل لتدرج رمادي' : 'Grayscale PDF (B&W)', icon: Sliders, accentColor: 'bg-neutral-600', category: 'advanced', reason: isAr ? 'توفير حبر الطباعة وإزالة الألوان' : 'Save ink with black & white' },
        { tool: 'linearize-pdf', title: isAr ? 'تهيئة للويب (Fast Web View)' : 'Linearize for Fast Web', icon: Zap, accentColor: 'bg-yellow-500', category: 'advanced', reason: isAr ? 'تمكين العرض الفوري السريع عبر الإنترنت' : 'Enable instant page streaming' },

        // Security & Stamps
        { tool: 'sign', title: isAr ? 'توقيع المستند رسمياً' : 'Sign PDF Document', icon: PenTool, accentColor: 'bg-teal-600', category: 'security', reason: isAr ? 'رسم أو ختم توقيعك على أي صفحة' : 'Draw or stamp digital signature' },
        { tool: 'watermark', title: isAr ? 'إضافة علامة مائية' : 'Add Watermark', icon: Stamp, accentColor: 'bg-purple-600', category: 'security', reason: isAr ? 'حماية الحقوق بنص أو شعار مخصص' : 'Protect with custom text/logo' },
        { tool: 'encrypt', title: isAr ? 'تشفير وحماية بكلمة سر' : 'Encrypt with Password', icon: Lock, accentColor: 'bg-red-600', category: 'security', reason: isAr ? 'قفل الملف وتعيين صلاحيات القراءة' : 'Protect with strong password' },
        { tool: 'decrypt', title: isAr ? 'إزالة كلمة المرور والحماية' : 'Unlock & Decrypt PDF', icon: Unlock, accentColor: 'bg-amber-600', category: 'security', reason: isAr ? 'إلغاء قيود الطباعة والتعديل' : 'Remove password restrictions' },
        { tool: 'redact', title: isAr ? 'حجب وطمس البيانات الحساسة' : 'Redact Sensitive Data', icon: ShieldAlert, accentColor: 'bg-neutral-900', category: 'security', reason: isAr ? 'طمس أرقام الهويات والبيانات السرية نهائياً' : 'Permanently black out private info' },
        { tool: 'qr-stamper', title: isAr ? 'ختم رمز QR أو توليد رمز' : 'Stamp or Generate QR', icon: QrCode, accentColor: 'bg-indigo-600', category: 'security', reason: isAr ? 'إدراج باركود QR ذكي للتحقق' : 'Embed scannable QR verification' },
        { tool: 'barcode-stamper', title: isAr ? 'ختم باركود تسلسلي (Code128)' : 'Stamp Barcode Serial', icon: Hash, accentColor: 'bg-sky-600', category: 'security', reason: isAr ? 'إضافة باركود أرقام المعاملات' : 'Stamp document serial barcode' },
        { tool: 'page-number', title: isAr ? 'ترقيم الصفحات' : 'Add Page Numbers', icon: Hash, accentColor: 'bg-blue-500', category: 'security', reason: isAr ? 'إضافة أرقام متسلسلة بتنسيقات متعددة' : 'Add sequential page numbers' },

        // Comparison, Forms & Structure
        { tool: 'visual-compare', title: isAr ? 'مقارنة بصرية جنباً إلى جنب' : 'Visual Compare', icon: GitCompare, accentColor: 'bg-indigo-600', category: 'advanced', reason: isAr ? 'مقارنة دقيقة بالصور واكتشاف التعديلات' : 'Side-by-side visual difference view' },
        { tool: 'compare', title: isAr ? 'مقارنة نصية دقيقة' : 'Text Diff Compare', icon: GitCompare, accentColor: 'bg-violet-600', category: 'advanced', reason: isAr ? 'مقارنة نصوص المستندات سطراً بسطر' : 'Line-by-line textual diff analysis' },
        { tool: 'form-builder', title: isAr ? 'بناء وتعديل النماذج التفاعلية' : 'Interactive Form Builder', icon: FormInput, accentColor: 'bg-sky-600', category: 'pages', reason: isAr ? 'إضافة حقول إدخال وخانات اختيار' : 'Add text fields and checkboxes' },
        { tool: 'flatten', title: isAr ? 'تسطيح وتثبيت النماذج' : 'Flatten Form Fields', icon: Layers, accentColor: 'bg-neutral-600', category: 'pages', reason: isAr ? 'قفل الحقول وجعلها جزءاً ثابتاً من الصفحة' : 'Lock form fields into static page' },
        { tool: 'toc', title: isAr ? 'فهرس المحتويات الذكي' : 'Table of Contents (TOC)', icon: ListTree, accentColor: 'bg-indigo-600', category: 'pages', reason: isAr ? 'إنشاء فهرس تنقل تفاعلي للصفحات' : 'Build interactive bookmarks' },
        
        // Data & Dev
        { tool: 'extract-text', title: isAr ? 'استخراج النصوص بالكامل' : 'Extract Document Text', icon: FileText, accentColor: 'bg-neutral-700', category: 'advanced', reason: isAr ? 'تصدير نصوص المستند إلى ملف نصي' : 'Export raw document text' },
        { tool: 'pdf-to-images', title: isAr ? 'استخراج الصفحات كصور (PNG)' : 'Extract Pages as Images (PNG)', icon: ImageIcon, accentColor: 'bg-pink-600', category: 'advanced', reason: isAr ? 'استخراج صفحات المستند كصور عالية الجودة' : 'Extract pages as high-res images' },
        { tool: 'metadata-wiper', title: isAr ? 'مسح البيانات الوصفية (Privacy)' : 'Wipe Metadata & EXIF', icon: ShieldCheck, accentColor: 'bg-emerald-600', category: 'advanced', reason: isAr ? 'إزالة اسم الكاتب والبرامج وتاريخ الإنشاء' : 'Clean author and creation tags' },
        { tool: 'checksum-hasher', title: isAr ? 'بصمة الملف والهاش Checksum' : 'File Checksum Hasher', icon: Hash, accentColor: 'bg-neutral-800', category: 'advanced', reason: isAr ? 'حساب SHA-256 و MD5 للتحقق' : 'Compute SHA-256 & MD5 digest' },
        { tool: 'file-splitter', title: isAr ? 'تجزئة الملف إلى أجزاء صغيرة' : 'Chunk File Splitter', icon: Split, accentColor: 'bg-indigo-500', category: 'advanced', reason: isAr ? 'تجزئة الملف لأحجام تناسب الرفع والمشاركة' : 'Split large file into chunks' },
        { tool: 'repair-pdf', title: isAr ? 'إصلاح ملفات PDF التالفة' : 'Repair Corrupt PDF', icon: Wrench, accentColor: 'bg-amber-600', category: 'advanced', reason: isAr ? 'معالجة أخطاء هيكل المستند وإعادة بنائه' : 'Rebuild corrupt PDF structure' },
      ];
    }

    // 2. Word (.docx, .doc) Complete Catalog
    if (['docx', 'doc'].includes(firstExt)) {
      return [
        { tool: 'convert', title: isAr ? 'تحويل Word إلى PDF رسمي' : 'Convert Word to PDF', icon: ArrowLeftRight, accentColor: 'bg-blue-600', category: 'convert', reason: isAr ? 'تثبيت التنسيق والخطوط في ملف PDF' : 'Export standard fixed-layout PDF' },
        { tool: 'word-to-markdown', title: isAr ? 'تحويل Word إلى Markdown' : 'Convert Word to Markdown', icon: FileCode, accentColor: 'bg-neutral-800', category: 'convert', reason: isAr ? 'تصدير إلى شفرة Markdown منسقة' : 'Clean Markdown output' },
        { tool: 'extract-text', title: isAr ? 'استخراج النصوص والجداول' : 'Extract Text & Tables', icon: FileText, accentColor: 'bg-indigo-600', category: 'convert', reason: isAr ? 'استخراج النصوص المنظمة' : 'Extract readable content' },
        { tool: 'visual-compare', title: isAr ? 'مقارنة مع مستند آخر' : 'Compare with another document', icon: GitCompare, accentColor: 'bg-violet-600', category: 'advanced', reason: isAr ? 'كشف التعديلات والإضافات' : 'Inspect differences' },
        { tool: 'encrypt', title: isAr ? 'تشفير وحماية المستند' : 'Encrypt & Protect File', icon: Lock, accentColor: 'bg-red-600', category: 'security', reason: isAr ? 'حماية الملف بكلمة مرور' : 'Protect file with password' },
        { tool: 'checksum-hasher', title: isAr ? 'حساب البصمة الرقمية Checksum' : 'File Checksum Hasher', icon: Hash, accentColor: 'bg-neutral-700', category: 'advanced', reason: isAr ? 'التأكد من سلامة وأصالة الملف' : 'Verify integrity hash' },
      ];
    }

    // 3. Excel & CSV (.xlsx, .xls, .csv) Complete Catalog
    if (['xlsx', 'xls', 'csv'].includes(firstExt)) {
      return [
        { tool: 'convert', title: isAr ? 'تحويل الجداول إلى مستند PDF' : 'Convert Spreadsheet to PDF', icon: ArrowLeftRight, accentColor: 'bg-emerald-600', category: 'convert', reason: isAr ? 'تصدير صفحات PDF جاهزة للطباعة' : 'Export clean printable PDF' },
        { tool: 'excel-to-json', title: isAr ? 'تحويل البيانات إلى JSON' : 'Convert to JSON', icon: Binary, accentColor: 'bg-sky-600', category: 'convert', reason: isAr ? 'تصدير البيانات البرمجية بصيغة JSON' : 'Structured JSON data export' },
        { tool: 'excel-to-markdown', title: isAr ? 'تحويل الجداول إلى Markdown' : 'Convert Tables to Markdown', icon: FileCode, accentColor: 'bg-neutral-800', category: 'convert', reason: isAr ? 'جداول Markdown نصية سهلة المشاركة' : 'Markdown table format' },
        { tool: 'extract-text', title: isAr ? 'استخراج البيانات والجداول' : 'Extract Data & Tables', icon: FileText, accentColor: 'bg-teal-600', category: 'convert', reason: isAr ? 'تصدير البيانات كنصوص نقية' : 'Raw data export' },
        { tool: 'encrypt', title: isAr ? 'تشفير وحماية المصنف' : 'Encrypt Spreadsheet', icon: Lock, accentColor: 'bg-red-600', category: 'security', reason: isAr ? 'حماية الأرقام الحساسة بكلمة سر' : 'Password protection' },
        { tool: 'checksum-hasher', title: isAr ? 'حساب بصمة الملف Checksum' : 'Checksum Hasher', icon: Hash, accentColor: 'bg-neutral-700', category: 'advanced', reason: isAr ? 'حساب هاش SHA-256' : 'Verify file hash' },
      ];
    }

    // 4. PowerPoint (.pptx, .ppt) Complete Catalog
    if (['pptx', 'ppt'].includes(firstExt)) {
      return [
        { tool: 'convert', title: isAr ? 'تحويل العرض التقديمي إلى PDF' : 'Convert PPT to PDF', icon: ArrowLeftRight, accentColor: 'bg-orange-600', category: 'convert', reason: isAr ? 'تثبيت الشرائح للعرض والمشاركة الآمنة' : 'Export slides to PDF' },
        { tool: 'extract-text', title: isAr ? 'استخراج النصوص من الشرائح' : 'Extract Slide Content', icon: FileText, accentColor: 'bg-blue-600', category: 'convert', reason: isAr ? 'تجميع نصوص العرض التقديمي' : 'Extract presentation text' },
        { tool: 'encrypt', title: isAr ? 'تشفير وحماية العرض' : 'Encrypt Presentation', icon: Lock, accentColor: 'bg-red-600', category: 'security', reason: isAr ? 'قفل العرض بكلمة سر قوية' : 'Protect with password' },
      ];
    }

    // 5. Images Complete Catalog
    if (allImages) {
      return [
        { tool: 'convert', title: isAr ? 'تحويل الصور إلى مستند PDF' : 'Convert Images to PDF', icon: ArrowLeftRight, accentColor: 'bg-blue-600', category: 'convert', reason: isAr ? 'تجميع الصور في ألبوم أو مستند PDF' : 'Combine into neat PDF' },
        { tool: 'image-compress', title: isAr ? 'ضغط الصور الذكي' : 'Smart Image Compression', icon: Minimize2, accentColor: 'bg-emerald-600', category: 'advanced', reason: isAr ? 'تقليل الحجم بنسبة تصل إلى 80%' : 'Shrink image weight losslessly' },
        { tool: 'image-convert', title: isAr ? 'تحويل صيغة الصورة (PNG/JPG/WebP)' : 'Convert Image Format', icon: RefreshCw, accentColor: 'bg-indigo-600', category: 'convert', reason: isAr ? 'تغيير الصيغة لـ WebP أو PNG أو JPG' : 'Export to PNG, JPG, or WebP' },
        { tool: 'resize-image', title: isAr ? 'تعديل أبعاد ومقاسات الصورة' : 'Resize Image Dimensions', icon: Sliders, accentColor: 'bg-sky-600', category: 'advanced', reason: isAr ? 'تغيير العرض والارتفاع بدقة' : 'Adjust width & height' },
        { tool: 'heic-to-jpg', title: isAr ? 'تحويل صور آيفون HEIC إلى JPG' : 'HEIC to JPG Converter', icon: ImageIcon, accentColor: 'bg-purple-600', category: 'convert', reason: isAr ? 'جعل صور الآبل متوافقة في كل مكان' : 'Convert Apple photos to JPEG' },
        { tool: 'webp-to-png', title: isAr ? 'تحويل WebP إلى PNG' : 'WebP to PNG', icon: ImageIcon, accentColor: 'bg-blue-500', category: 'convert', reason: isAr ? 'تحويل صور الويب إلى PNG عالي الوضوح' : 'Lossless PNG export' },
        { tool: 'metadata-wiper', title: isAr ? 'مسح بيانات EXIF والموقع الجغرافي' : 'Wipe Photo EXIF & Location', icon: ShieldCheck, accentColor: 'bg-emerald-600', category: 'security', reason: isAr ? 'حذف معلومات الكاميرا والإحداثيات' : 'Privacy: strip GPS & camera tags' },
        { tool: 'checksum-hasher', title: isAr ? 'حساب بصمة الصورة Checksum' : 'Image Checksum Hasher', icon: Hash, accentColor: 'bg-neutral-700', category: 'advanced', reason: isAr ? 'بصمة رقمية فريدة للتحقق' : 'Unique SHA-256 fingerprint' },
      ];
    }

    // Default Fallback
    return [
      { tool: 'convert', title: isAr ? 'تحويل صيغة الملف' : 'Convert File Format', icon: ArrowLeftRight, accentColor: 'bg-blue-600', category: 'convert', reason: isAr ? 'تحويل الملف إلى PDF أو صيغ أخرى' : 'Convert file to compatible formats' },
      { tool: 'encrypt', title: isAr ? 'تشفير وحماية الملف' : 'Encrypt & Protect File', icon: Lock, accentColor: 'bg-red-600', category: 'security', reason: isAr ? 'حماية الملف بكلمة مرور' : 'Password protection' },
      { tool: 'checksum-hasher', title: isAr ? 'بصمة الملف Checksum' : 'File Checksum Hasher', icon: Hash, accentColor: 'bg-neutral-800', category: 'advanced', reason: isAr ? 'حساب بصمة SHA-256' : 'Verify SHA-256 hash' },
    ];
  };

  const primarySuggestions = useMemo(() => getPrimarySuggestions(selectedFiles), [selectedFiles, isAr, lang]);
  const allOperations = useMemo(() => getAllAvailableOperations(selectedFiles), [selectedFiles, isAr, lang]);

  // Filtered all operations
  const displayedAllOperations = useMemo(() => {
    return allOperations.filter((op) => {
      const matchCat = activeCategory === 'all' || op.category === activeCategory;
      if (!matchCat) return false;
      if (!filterQuery.trim()) return true;
      const q = filterQuery.toLowerCase();
      return op.title.toLowerCase().includes(q) || (op.reason && op.reason.toLowerCase().includes(q));
    });
  }, [allOperations, activeCategory, filterQuery]);

  const categoriesList = useMemo(() => [
    { id: 'all', label: isAr ? 'الكل' : 'All' },
    { id: 'pages', label: isAr ? 'الصفحات والتنظيم' : 'Pages & Organize' },
    { id: 'convert', label: isAr ? 'التحويل والتصدير' : 'Convert & Export' },
    { id: 'security', label: isAr ? 'الأمان والتوقيع' : 'Security & Sign' },
    { id: 'advanced', label: isAr ? 'التحسين والمتقدمة' : 'Optimize & Tools' },
  ], [isAr]);

  return (
    <div 
      id="smart-auto-process-banner" 
      className="w-full max-w-4xl mx-auto mb-8 animate-fadeIn"
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {selectedFiles.length === 0 ? (
        /* Minimalist Home Screen File Drop Box */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDropAsync}
          onClick={() => inputRef.current?.click()}
          className={`group relative py-8 sm:py-11 px-5 sm:px-10 rounded-3xl border-2 border-dashed transition-all duration-200 cursor-pointer text-center overflow-hidden flex flex-col items-center justify-center gap-3.5 ${
            isDragOver
              ? 'border-blue-500 bg-blue-500/10 scale-[1.01] ring-4 ring-blue-500/15'
              : 'border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-[#1c1c1e]/85 hover:border-blue-500 dark:hover:border-blue-400 shadow-xs'
          }`}
        >
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs">
            <UploadCloud className="w-5 h-5" />
          </div>

          <div className="space-y-0.5">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
              <span className="hidden sm:inline">
                {isAr ? 'اسحب وأفلت الملفات أو المجلد هنا للمعالجة الذكية' : 'Drop your files or folder here for smart processing'}
              </span>
              <span className="sm:hidden">
                {isAr ? 'انقر لاختيار الملفات أو المجلد' : 'Tap to choose files or folder'}
              </span>
            </h2>
          </div>

          {/* Direct File or Folder Choice Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? 'اختيار ملفات' : 'Select Files'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                folderInputRef.current?.click();
              }}
              className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white text-xs font-semibold flex items-center gap-2 border border-neutral-300 dark:border-neutral-600 shadow-xs transition-colors cursor-pointer"
            >
              <FolderUp className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>{isAr ? 'رفع مجلد كامل' : 'Upload Folder'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active State: File Detected -> Expanded Full Operations View */
        <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-blue-500/30 dark:border-blue-500/20 shadow-lg ring-1 ring-blue-500/10 space-y-6">
          {/* Top File Summary Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {isAr ? 'الملف الجاهز للمعالجة' : 'File Detected'}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono font-bold">
                    {selectedFiles.length === 1 ? selectedFiles[0].name.split('.').pop()?.toUpperCase() : `${selectedFiles.length} files`}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white truncate mt-0.5">
                  {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} ${isAr ? 'ملفات مختارة' : 'files selected'}`}
                  <span className="text-xs font-normal text-neutral-400 mx-1.5 font-mono">
                    ({formatFileSize(selectedFiles.reduce((acc, f) => acc + f.size, 0), lang)})
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={clearSelection}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title={isAr ? 'إلغاء واختيار ملف آخر' : 'Clear & Pick another'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1. Primary Suggested Operations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                {isAr ? 'العمليات الأساسية المقترحة لهذا الملف:' : 'Primary Suggested Actions:'}
              </span>
              {primarySuggestions[0]?.badge && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {primarySuggestions[0].badge}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {primarySuggestions.map((sug, idx) => {
                const Icon = sug.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectToolWithFiles(sug.tool, selectedFiles)}
                    className={`p-3.5 rounded-2xl border text-start transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 group ${
                      sug.isPrimary
                        ? 'bg-blue-50/70 dark:bg-blue-950/25 border-blue-500/40 hover:border-blue-500 ring-1 ring-blue-500/20 shadow-xs'
                        : 'bg-neutral-50/80 dark:bg-[#252528]/60 border-neutral-200/80 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        sug.isPrimary ? 'bg-blue-600 text-white shadow-xs' : 'bg-neutral-200/80 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {sug.title}
                          </span>
                          {sug.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shrink-0">
                              {sug.badge}
                            </span>
                          )}
                        </div>
                        {sug.reason && (
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                            {sug.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. EXPANDABLE ALL COMPATIBLE OPERATIONS FOR THIS FILE FORMAT */}
          <div className="pt-2 border-t border-neutral-100 dark:border-white/5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setIsExpandedAll(!isExpandedAll)}
                className="flex items-center gap-2 text-xs font-bold text-neutral-800 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                <span>
                  {isAr 
                    ? `جميع العمليات المتاحة لهذه الصيغة (${allOperations.length} عملية متوافقة)`
                    : `All Available Operations for this format (${allOperations.length} operations)`}
                </span>
                {isExpandedAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {/* Quick Operation Search */}
              {isExpandedAll && (
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute start-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder={isAr ? 'بحث في العمليات المتاحة...' : 'Search operations...'}
                    className="w-full ps-8 pe-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {filterQuery && (
                    <button
                      type="button"
                      onClick={() => setFilterQuery('')}
                      className="absolute end-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {isExpandedAll && (
              <div className="space-y-3 animate-fadeIn">
                {/* Category filter pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                  {categoriesList.map((cat) => {
                    const isActive = activeCategory === cat.id;
                    const count = cat.id === 'all' 
                      ? allOperations.length 
                      : allOperations.filter(o => o.category === cat.id).length;
                    if (cat.id !== 'all' && count === 0) return null;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-neutral-100 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        <span>{cat.label}</span>
                        <span className={`text-[10px] px-1 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Operations Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {displayedAllOperations.map((op, idx) => {
                    const Icon = op.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onSelectToolWithFiles(op.tool, selectedFiles)}
                        className="p-3 rounded-xl border border-neutral-200/70 dark:border-white/[0.07] bg-neutral-50/50 dark:bg-[#202023]/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-700/50 text-start transition-all duration-150 cursor-pointer flex items-start gap-2.5 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                            {op.title}
                          </h4>
                          {op.reason && (
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                              {op.reason}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {displayedAllOperations.length === 0 && (
                  <div className="py-6 text-center text-xs text-neutral-400">
                    {isAr ? 'لا توجد عمليات تطابق البحث' : 'No operations match your search'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
