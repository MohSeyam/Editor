import React, { useState, useMemo, useRef, useDeferredValue } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, 
  Scissors, 
  ArrowLeftRight, 
  PenTool, 
  Lock, 
  Unlock, 
  RotateCw, 
  Minimize2, 
  Stamp, 
  FileText, 
  ArrowUpRight, 
  Hash, 
  SlidersHorizontal,
  Image as ImageIcon,
  ShieldCheck,
  Search,
  LayoutGrid,
  FileCheck2,
  Sparkles,
  Zap,
  FolderOpen,
  GitCompare,
  ShieldAlert,
  FileEdit,
  FileSpreadsheet,
  QrCode,
  Languages,
  BookOpen,
  FileCode,
  Code,
  Binary,
  Split,
  Printer,
  Archive,
  Eraser,
  Maximize2,
  Wrench,
  Receipt,
  FilePlus,
  RefreshCw,
  Sliders,
  Camera,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Volume2,
  EyeOff,
  Eye,
  ScanLine,
  Star
} from 'lucide-react';
import { ToolType, Language, PresetProfile } from '../types';
import { getTranslation } from '../i18n';
import { getToolMetadata } from '../utils/toolNamesMap';

interface ToolGridProps {
  lang: Language;
  onSelectTool: (tool: ToolType) => void;
  onSelectToolWithFiles?: (tool: ToolType, files: File[]) => void;
  onApplyProfile?: (profile: PresetProfile) => void;
  onOpenCustomProfileCreator?: () => void;
}

export type ToolCategory = 'all' | 'pdf' | 'security' | 'convert' | 'media' | 'workflow';

export interface ToolDef {
  id: ToolType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  acceptedFormats: string;
  category: ToolCategory;
  tags: string[];
  isEssential?: boolean;
}

export const getToolBeginnerBenefit = (toolId: ToolType, lang: Language): string => {
  const isAr = lang === 'ar';
  switch (toolId) {
    case 'merge':
    case 'universal-merge':
      return isAr
        ? 'تجميع عدة مستندات وصور في ملف واحد مرتب يسهل إرساله ومشاركته.'
        : 'Combine multiple documents and images into a single clean, shareable file.';
    case 'split':
      return isAr
        ? 'قص واستخراج صفحات معينة أو تقسيم ملف كبير إلى أجزاء أصغر لتسهيل إرسالها.'
        : 'Extract specific pages or split a large file into smaller parts for easy sharing.';
    case 'organize':
      return isAr
        ? 'ترتيب وحذف وتدوير صفحات المستند بصرياً وسحبها وإفلاتها بكل سهولة.'
        : 'Visually reorder, delete, and rotate pages with easy drag-and-drop.';
    case 'rotate-pdf':
      return isAr
        ? 'تصحيح اتجاه الصفحات المقلوبة أو الأفقية لتصبح جاهزة للقراءة والطباعة بشكل صحيح.'
        : 'Fix orientation of upside-down or sideways pages for comfortable reading and printing.';
    case 'delete-pages':
      return isAr
        ? 'إزالة أي صفحات غير مرغوبة أو سرية من الملف نهائياً وتصدير المستند الصافي.'
        : 'Permanently remove unwanted or blank pages and save a clean document.';
    case 'extract-pages':
      return isAr
        ? 'حفظ صفحات معينة فقط في ملف مستقل جديد دون المساس بالملف الأصلي.'
        : 'Save selected pages into a new standalone file without touching the original.';
    case 'reverse-pages':
      return isAr
        ? 'قلب ترتيب صفحات المستند ليصبح من الأخير إلى الأول بضغطة زر واحدة.'
        : 'Flip page order from end to start in one quick click.';
    case 'compress':
      return isAr
        ? 'تقليل حجم الملف لسهولة إرساله عبر البريد والواتساب مع الحفاظ على وضوحه.'
        : 'Reduce file size for faster emailing and sharing while preserving quality.';
    case 'pdf-compress-heavy':
      return isAr
        ? 'ضغط فائق ومكثف للملفات الضخمة لتوفير أكبر قدر ممكن من المساحة.'
        : 'Maximum heavy compression for oversized files to save disk and upload space.';
    case 'watermark':
    case 'batch-watermark':
      return isAr
        ? 'إضافة اسمك أو شعارك كعلامة مائية لحفظ حقوق ملكية المستند ومنع نسخه.'
        : 'Stamp your name or brand watermark to protect copyright and prevent unauthorized copies.';
    case 'page-number':
      return isAr
        ? 'ترقيم صفحات المستند بأرقام واضحة ومواقع منسقة لتسهيل التصفح والطباعة.'
        : 'Add page numbers with custom positions and styles for easy reading.';
    case 'sign':
      return isAr
        ? 'إضافة توقيعك الشخصي أو ختمك الإلكتروني على الملف دون الحاجة لطباعته وورقياً.'
        : 'Add your signature or stamp directly onto the document without needing a printer.';
    case 'encrypt':
      return isAr
        ? 'قفل الملف بكلمة سر قوية لحماية بياناتك من الفتح والاطلاع غير المصرح.'
        : 'Lock your file with a strong password to protect confidential data.';
    case 'decrypt':
      return isAr
        ? 'إزالة كلمة المرور من الملف لفتحه واستخدامه بحرية دون الحاجة لإدخالها كل مرة.'
        : 'Remove password restrictions from your file for unrestricted access.';
    case 'extract-text':
      return isAr
        ? 'نسخ النصوص والجداول من داخل الملف لتعديلها بحرية في أي برنامج آخر.'
        : 'Extract and copy text and tables from documents for editing elsewhere.';
    case 'metadata':
      return isAr
        ? 'عرض وتعديل أو تنظيف بيانات الملف المخفية (مثل اسم الكاتب وتاريخ الإنشاء).'
        : 'View, edit, or wipe hidden document metadata (author, created date).';
    case 'image-compress':
      return isAr
        ? 'تقليل حجم الصور بسرعة لتوفير مساحة الهاتف أو الحاسوب وتسريع إرسالها.'
        : 'Shrink image file size quickly to save space and upload faster.';
    case 'flatten':
    case 'pdf-flatten-forms':
      return isAr
        ? 'دمج وتثبيت طبقات الملف لمنع أي تعديل لاحق على الحقول والنصوص.'
        : 'Flatten all form fields and layers into uneditable, printable pages.';
    case 'image-convert':
      return isAr
        ? 'تحويل صيغ الصور بين PNG و JPG و WebP بجودة عالية لتناسب متطلباتك.'
        : 'Convert image formats between PNG, JPG, and WebP with high quality.';
    case 'annotate':
      return isAr
        ? 'إضافة ملاحظات وتعليقات وتظليل النصوص المهمة بألوان مختلفة للمراجعة.'
        : 'Add notes, comments, and colorful highlights to review documents.';
    case 'compare':
    case 'visual-compare':
      return isAr
        ? 'المقارنة البصرية والنصية بين نسختين من ملفين لاكتشاف الفروقات والتعديلات بدقة.'
        : 'Compare two files side-by-side to spot changes and diffs automatically.';
    case 'pdfa':
      return isAr
        ? 'تحويل الملف إلى معيار الأرشفة طويل الأمد لضمان فتحه مستقبلاً دون مشاكل.'
        : 'Convert to PDF/A archiving standard to ensure future compatibility.';
    case 'imposition':
    case 'booklet-maker':
      return isAr
        ? 'ترتيب وفرز الصفحات لطباعة كتيب أو مطوية جاهزة للطي والتدبيس.'
        : 'Arrange pages for booklet printing, saddle-stitch binding, and folding.';
    case 'form-builder':
      return isAr
        ? 'إنشاء حقول إدخال وتعبئة تفاعلية ليقوم المستخدمون بكتابة بياناتهم فيها.'
        : 'Create fillable forms with text fields, checkboxes, and buttons.';
    case 'toc':
      return isAr
        ? 'إنشاء جدول محتويات وفهرس تفاعلي يتيح القفز السريع للصفحات بمجرد النقر.'
        : 'Generate an interactive table of contents with one-click page navigation.';
    case 'redact':
      return isAr
        ? 'حجب وطمس الأسماء والأرقام والبيانات الحساسة نهائياً من المستند قبل النشر.'
        : 'Permanently black out and redact private or sensitive text and numbers.';
    case 'mass-rename':
      return isAr
        ? 'إعادة تسمية مجموعة كبيرة من الملفات دفعة واحدة بنمط منتظم ومرتب.'
        : 'Rename dozens of files in batch using clear sequential patterns.';
    case 'pdf-to-word':
      return isAr
        ? 'تحويل ملف PDF إلى مستند Word لتتمكن من تعديل نصوصه وفقراته بحرية.'
        : 'Convert PDF into an editable Word document with preserved layout.';
    case 'word-to-pdf':
      return isAr
        ? 'تحويل مستند Word إلى PDF لضمان ثبات التنسيق والخطوط عند فتحه على أي جهاز.'
        : 'Turn Word files into standard PDF so formatting stays consistent everywhere.';
    case 'excel-to-pdf':
      return isAr
        ? 'تحويل جداول وحسابات Excel إلى صفحات PDF أنيقة وجاهزة للعرض والطباعة.'
        : 'Render Excel spreadsheets into clean, printable PDF documents.';
    case 'pdf-to-excel':
      return isAr
        ? 'استخراج الجداول والأرقام من PDF ونقلها إلى Excel لحسابها وتعديلها.'
        : 'Extract tables and numbers from PDF directly into editable Excel sheets.';
    case 'ppt-to-pdf':
      return isAr
        ? 'تحويل عروض PowerPoint إلى PDF لعرض الشرائح بسلاسة دون الحاجة لبرنامج PowerPoint.'
        : 'Export PowerPoint slides to PDF for viewing on any phone or computer.';
    case 'images-to-pdf':
      return isAr
        ? 'تجميع عدة صور في مستند PDF واحد مرتب يسهل مشاركته وطباعته.'
        : 'Compile multiple photos into a single neat PDF album or document.';
    case 'pdf-to-images':
      return isAr
        ? 'استخراج كل صفحة من صفحات مستند PDF كصورة PNG منفصلة عالية الجودة.'
        : 'Extract each PDF page as an individual high-resolution PNG image.';
    case 'markdown-to-html':
      return isAr
        ? 'تحويل ملاحظات وكود Markdown فورياً إلى صفحة ويب مستقلة مع دعم الجداول والتنسيق.'
        : 'Convert Markdown notes instantly into a standalone HTML webpage with full styling.';
    default:
      return isAr
        ? 'معالجة محلية سريعة للملف بدون الحاجة لإنترنت أو تثبيت برامج خارجية.'
        : 'Fast local processing without requiring software installation or cloud uploads.';
  }
};

export const ToolGrid: React.FC<ToolGridProps> = ({ 
  lang, 
  onSelectTool,
  onSelectToolWithFiles,
  onApplyProfile,
  onOpenCustomProfileCreator,
}) => {
  const t = getTranslation(lang);
  const isAr = lang === 'ar';
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [dragOverTool, setDragOverTool] = useState<ToolType | null>(null);

  // Favorite / Pinned Tools State
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('almoharrer_favorite_tools');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return ['merge', 'split', 'compress', 'pdf-to-word', 'sign', 'watermark'];
  });

  const toggleFavorite = (e: React.MouseEvent, toolId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setFavorites((prev) => {
      const next = prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId];
      try {
        localStorage.setItem('almoharrer_favorite_tools', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const getCategoryBadgeStyle = (category: string) => {
    switch (category) {
      case 'pdf':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20';
      case 'security':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20';
      case 'convert':
        return 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20';
      case 'media':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20';
      default:
        return 'bg-neutral-500/10 text-neutral-700 dark:text-neutral-400 border border-neutral-500/20';
    }
  };

  // Comprehensive Catalog of 75+ Tools across Word, Excel, PPT, PDF, MD, HTML, Images
  const tools: ToolDef[] = useMemo(() => [
    // 1. Core Document Operations (Universal Formats)
    {
      id: 'merge',
      title: isAr ? 'دمج الملفات والمستندات' : 'Merge Files & Documents',
      description: isAr ? 'دمج وترتيب ملفات Word وExcel وPowerPoint وPDF والصور في مستند موحد' : 'Combine and order Word, Excel, PPT, PDF, and images into one document',
      icon: Layers,
      badge: 'Merge',
      acceptedFormats: isAr ? 'Word • Excel • PPT • PDF • MD • HTML • صور' : 'Word • Excel • PPT • PDF • MD • HTML • Images',
      category: 'pdf',
      tags: ['دمج', 'merge', 'pdf', 'word', 'excel', 'powerpoint', 'combine', 'جمع'],
      isEssential: true,
    },
    {
      id: 'split',
      title: isAr ? 'تقسيم المستندات والملفات' : 'Split Documents & Files',
      description: isAr ? 'فصل الصفحات ونطاقات الأوراق من ملفات Word وExcel وPDF وMD' : 'Split pages and extract ranges from Word, Excel, PDF, and MD files',
      icon: Scissors,
      badge: 'Split',
      acceptedFormats: isAr ? 'Word • Excel • PowerPoint • PDF • MD • HTML' : 'Word • Excel • PPT • PDF • MD • HTML',
      category: 'pdf',
      tags: ['تقسيم', 'split', 'فصل', 'cut', 'استخراج', 'word', 'excel'],
      isEssential: true,
    },
    {
      id: 'organize',
      title: isAr ? 'تنظيم وترتيب الصفحات' : 'Organize Pages',
      description: isAr ? 'إعادة ترتيب وتدوير وحذف صفحات مستندات Word وPDF والصور بصرياً' : 'Reorder, rotate, and delete pages visually for Word, PDF, and images',
      icon: RotateCw,
      badge: 'Pages',
      acceptedFormats: isAr ? 'Word • PowerPoint • PDF • صور' : 'Word • PPT • PDF • Images',
      category: 'pdf',
      tags: ['تنظيم', 'organize', 'تدوير', 'حذف', 'ترتيب'],
      isEssential: true,
    },
    {
      id: 'rotate-pdf',
      title: isAr ? 'تدوير الصفحات' : 'Rotate Pages',
      description: isAr ? 'تدوير صفحات المستند 90°، 180° أو 270° وتصحيح الاتجاه' : 'Rotate document pages by 90, 180, or 270 degrees',
      icon: RotateCw,
      badge: 'Rotate',
      acceptedFormats: isAr ? 'PDF • Word • PowerPoint • صور' : 'PDF • Word • PPT • Images',
      category: 'pdf',
      tags: ['تدوير', 'rotate', 'orientation', 'اتجاه'],
      isEssential: true,
    },
    {
      id: 'delete-pages',
      title: isAr ? 'حذف صفحات محددة' : 'Delete Pages',
      description: isAr ? 'إزالة صفحات معينة وتصدير الملف الصافي مباشرة' : 'Remove specific pages from your document',
      icon: Eraser,
      badge: 'Delete',
      acceptedFormats: isAr ? 'PDF • Word • PowerPoint' : 'PDF • Word • PPT',
      category: 'pdf',
      tags: ['حذف صفحات', 'delete pages', 'ازالة'],
    },
    {
      id: 'extract-pages',
      title: isAr ? 'استخراج صفحات محددة' : 'Extract Pages',
      description: isAr ? 'استخراج صفحات ونطاقات معينة وحفظها في مستند مستقل' : 'Extract selected pages into a standalone document',
      icon: FilePlus,
      badge: 'Extract',
      acceptedFormats: isAr ? 'PDF • Word • PowerPoint' : 'PDF • Word • PPT',
      category: 'pdf',
      tags: ['استخراج', 'extract', 'صفحات'],
    },
    {
      id: 'reverse-pages',
      title: isAr ? 'عكس ترتيب الصفحات' : 'Reverse Page Order',
      description: isAr ? 'قلب ترتيب صفحات المستند من الأخير إلى الأول' : 'Invert page sequence from end to start',
      icon: RefreshCw,
      badge: 'Reverse',
      acceptedFormats: isAr ? 'PDF • Word • PowerPoint' : 'PDF • Word • PPT',
      category: 'pdf',
      tags: ['عكس', 'reverse', 'قلب الصفحات'],
    },
    {
      id: 'compress',
      title: isAr ? 'ضغط المستندات والملفات' : 'Compress Documents & Files',
      description: isAr ? 'تقليل حجم الملفات بنسب تصل إلى 80% مع الحفاظ على الوضوح' : 'Reduce document weight by up to 80% preserving clarity',
      icon: Minimize2,
      badge: 'Compress',
      acceptedFormats: isAr ? 'Word • Excel • PowerPoint • PDF • صور' : 'Word • Excel • PPT • PDF • Images',
      category: 'pdf',
      tags: ['ضغط', 'compress', 'تصغير حجم', 'توفير المساحة'],
      isEssential: true,
    },
    {
      id: 'sanitize',
      title: isAr ? 'تطهير وإزالة البيانات العالقة (Sanitize)' : 'Sanitize Document',
      description: isAr ? 'إزالة الخطوط المخفية والكائنات غير المستخدمة وميتا داتا الملف لتقليل الحجم وتسريعه' : 'Strip unreferenced objects, hidden fonts & deep metadata',
      icon: Sparkles,
      badge: 'Sanitize',
      acceptedFormats: isAr ? 'PDF • Word' : 'PDF • Word',
      category: 'pdf',
      tags: ['تطهير', 'تنظيف', 'sanitize', 'ازالة الخطوط', 'حذف البيانات', 'تقليل الحجم'],
      isEssential: true,
    },
    {
      id: 'qr-reader',
      title: isAr ? 'قارئ ومستخرج باركود QR' : 'QR & Barcode Reader',
      description: isAr ? 'مسح واستخراج نصوص وروابط أكواد الـ QR والباركود من المستندات والصور' : 'Scan and extract QR codes & barcodes from PDFs and images',
      icon: ScanLine,
      badge: 'QR Reader',
      acceptedFormats: isAr ? 'PDF • صور • JPEG • PNG' : 'PDF • Images • JPEG • PNG',
      category: 'security',
      tags: ['qr', 'باركود', 'قراءة qr', 'scan', 'قارئ', 'كود'],
      isEssential: true,
    },
    {
      id: 'grayscale-pdf',
      title: isAr ? 'تحويل للتدرج الرمادي (توفير الحبر)' : 'Grayscale (Ink Saver)',
      description: isAr ? 'تحويل ألوان المستند للأبيض والأسود لتوفير حبر الطباعة' : 'Convert document colors to monochrome to save printer ink',
      icon: Printer,
      badge: 'Ink Saver',
      acceptedFormats: isAr ? 'PDF • Word • PowerPoint • صور' : 'PDF • Word • PPT • Images',
      category: 'pdf',
      tags: ['رمادي', 'grayscale', 'طباعة', 'توفير الحبر', 'اسود وابيض'],
    },
    {
      id: 'crop-pdf',
      title: isAr ? 'قص هوامش المستند' : 'Crop Margins',
      description: isAr ? 'قص الهوامش البيضاء وحواف الصفحات بدقة وسهولة' : 'Trim white margins and borders cleanly',
      icon: Maximize2,
      badge: 'Crop',
      acceptedFormats: isAr ? 'PDF • Word • PowerPoint • صور' : 'PDF • Word • PPT • Images',
      category: 'pdf',
      tags: ['قص', 'crop', 'هوامش', 'margins'],
    },
    {
      id: 'repair-pdf',
      title: isAr ? 'إصلاح المستندات التالفة' : 'Repair Documents',
      description: isAr ? 'استعادة وبناء هيكل الملفات والمستندات غير القابلة للفتح' : 'Rebuild corrupt headers and recover unreadable files',
      icon: Wrench,
      badge: 'Repair',
      acceptedFormats: isAr ? 'PDF • Word • Excel' : 'PDF • Word • Excel',
      category: 'pdf',
      tags: ['إصلاح', 'repair', 'استعادة', 'تالف'],
    },
    {
      id: 'color-invert',
      title: isAr ? 'الوضع الليلي / عكس الألوان' : 'Night Mode / Invert Colors',
      description: isAr ? 'عكس ألوان المستند للقراءة الليلية أو لتقليل إجهاد العين' : 'Invert colors for night reading and dark viewing',
      icon: EyeOff,
      badge: 'Theme',
      acceptedFormats: isAr ? 'PDF • Word • PowerPoint • صور' : 'PDF • Word • PPT • Images',
      category: 'pdf',
      tags: ['عكس الالوان', 'invert', 'night mode', 'وضع ليلي'],
    },
    {
      id: 'booklet-maker',
      title: isAr ? 'إعداد وطباعة الكتيبات (Booklet)' : 'Booklet / Imposition Maker',
      description: isAr ? 'ترتيب الصفحات وجهين ككتيب جاهز للطباعة والطي المباشر' : 'Arrange pages 2-up for double-sided booklet printing',
      icon: BookOpen,
      badge: 'Booklet',
      acceptedFormats: isAr ? 'PDF • Word • PowerPoint' : 'PDF • Word • PPT',
      category: 'pdf',
      tags: ['كتيب', 'booklet', 'طباعة', 'ملازم'],
    },
    {
      id: 'linearize-pdf',
      title: isAr ? 'تحسين الويب (Linearize Fast Web View)' : 'Linearize (Fast Web View)',
      description: isAr ? 'إعادة هيكلة المستند للفتح الفوري عبر الإنترنت صفحة بصفحة' : 'Optimize document for instant byte-streaming on web',
      icon: Zap,
      badge: 'Speed',
      acceptedFormats: isAr ? 'PDF • Word' : 'PDF • Word',
      category: 'pdf',
      tags: ['linearize', 'تسريع', 'ويب', 'fast web view'],
    },
    {
      id: 'pdfa',
      title: isAr ? 'معيار الأرشفة طويل المدى (PDF/A)' : 'Long-Term Archive (PDF/A)',
      description: isAr ? 'تحويل المستند إلى صيغة قياسية متوافقة مع الأرشفة القانونية' : 'Convert document to compliant standard archive format',
      icon: Archive,
      badge: 'Archive',
      acceptedFormats: isAr ? 'PDF • Word • Excel • PowerPoint' : 'PDF • Word • Excel • PPT',
      category: 'pdf',
      tags: ['pdfa', 'أرشفة', 'archive', 'معيار'],
    },
    {
      id: 'pdf-flatten-forms',
      title: isAr ? 'تسطيح النماذج والتواقيع' : 'Flatten Forms & Signatures',
      description: isAr ? 'تثبيت حقول الإدخال والتواقيع لمنع تعديلها أو حذفها' : 'Lock interactive fields and stamps into permanent layers',
      icon: Layers,
      badge: 'Lock',
      acceptedFormats: isAr ? 'PDF • Word' : 'PDF • Word',
      category: 'pdf',
      tags: ['تسطيح', 'flatten', 'تثبيت النماذج'],
    },
    {
      id: 'imposition',
      title: isAr ? 'فرز وتخطيط الطباعة (N-Up)' : 'Print Layout (N-Up / Imposition)',
      description: isAr ? 'طباعة صفحتين أو 4 صفحات في ورقة واحدة لتوفير الورق' : 'Fit 2 or 4 pages per sheet for compact printing',
      icon: Printer,
      badge: 'N-Up',
      acceptedFormats: isAr ? 'PDF • Word • PowerPoint' : 'PDF • Word • PPT',
      category: 'pdf',
      tags: ['imposition', 'n-up', 'طباعة صفحتين', 'تخطيط'],
    },
    {
      id: 'form-builder',
      title: isAr ? 'بناء النماذج التفاعلية' : 'Interactive Form Builder',
      description: isAr ? 'إضافة حقول إدخال وخانات اختيار وتواقيع تفاعلية للمستند' : 'Add text inputs, checkboxes, and fillable fields',
      icon: FileCheck2,
      badge: 'Form',
      acceptedFormats: 'PDF',
      category: 'pdf',
      tags: ['نماذج', 'form', 'حقول', 'تفاعلي'],
    },
    {
      id: 'toc',
      title: isAr ? 'فهرس المحتويات الذكي (Dynamic TOC)' : 'Table of Contents (Dynamic TOC)',
      description: isAr ? 'بناء جدول محتويات تفاعلي وروابط تنقل مباشرة بين الفصول' : 'Generate interactive table of contents with bookmarks',
      icon: BookOpen,
      badge: 'TOC',
      acceptedFormats: isAr ? 'PDF • Word' : 'PDF • Word',
      category: 'pdf',
      tags: ['فهرس', 'toc', 'جدول المحتويات', 'روابط'],
    },
    {
      id: 'annotate',
      title: isAr ? 'إضافة ملاحظات ورسم على المستند' : 'Annotate & Markup',
      description: isAr ? 'التظليل، الكتابة، وضع الأسهم والملاحظات التوضيحية بسهولة' : 'Add highlights, sticky notes, shapes, and freehand markup',
      icon: PenTool,
      badge: 'Annotate',
      acceptedFormats: isAr ? 'PDF • Word • صور' : 'PDF • Word • Images',
      category: 'pdf',
      tags: ['ملاحظات', 'رسم', 'annotate', 'تظليل', 'تمييز'],
    },
    {
      id: 'flatten',
      title: isAr ? 'تسطيح المستند بالكامل' : 'Flatten Entire Document',
      description: isAr ? 'دمج كافة العناصر والتعليقات لمنع استخراجها أو التعديل عليها' : 'Rasterize and convert annotations into permanent base layer',
      icon: Layers,
      badge: 'Flatten',
      acceptedFormats: isAr ? 'PDF • Word' : 'PDF • Word',
      category: 'pdf',
      tags: ['تسطيح', 'flatten', 'تثبيت'],
    },
    {
      id: 'pdf-compress-heavy',
      title: isAr ? 'أقصى ضغط للواتساب والبريد' : 'Maximum Compression for Sharing',
      description: isAr ? 'ضغط فائق لملفات PDF الكبيرة لتناسب حدود الإرسال والمشاركة' : 'Heavy compression tuned for WhatsApp and email limits',
      icon: Minimize2,
      badge: 'Extreme',
      acceptedFormats: isAr ? 'PDF • Word • PowerPoint' : 'PDF • Word • PPT',
      category: 'pdf',
      tags: ['أقصى ضغط', 'واتساب', 'whatsapp', 'compress', 'بريد'],
    },
    {
      id: 'multi-column-pdf',
      title: isAr ? 'تخطيط الأعمدة المتعددة (جريدة)' : 'Multi-Column Document Layout',
      description: isAr ? 'إعادة ترتيب النصوص والصفحات في عمودين أو ثلاثة كجريدة' : 'Reformat text content into 2 or 3 newspaper columns',
      icon: Split,
      badge: 'Columns',
      acceptedFormats: isAr ? 'PDF • Word • TXT • MD' : 'PDF • Word • TXT • MD',
      category: 'pdf',
      tags: ['أعمدة', 'جريدة', 'columns', 'multi-column'],
    },

    // 2. Stamps & Page Marks
    {
      id: 'watermark',
      title: isAr ? 'إضافة علامة مائية' : 'Add Watermark',
      description: isAr ? 'إضافة نص أو شعار شفاف لحماية الملكية الفكرية والسرية' : 'Apply custom text or logo watermark for brand protection',
      icon: Stamp,
      badge: 'Watermark',
      acceptedFormats: isAr ? 'Word • Excel • PowerPoint • PDF • صور' : 'Word • Excel • PPT • PDF • Images',
      category: 'security',
      tags: ['علامة مائية', 'watermark', 'ختم', 'شعار'],
      isEssential: true,
    },
    {
      id: 'batch-watermark',
      title: isAr ? 'علامة مائية دفعة واحدة' : 'Batch Watermark Multi-Files',
      description: isAr ? 'تطبيق نفس العلامة المائية أو الشعار على عدة مستندات معاً' : 'Apply identical watermark across multiple documents at once',
      icon: Stamp,
      badge: 'Batch',
      acceptedFormats: isAr ? 'Word • Excel • PPT • PDF • صور' : 'Word • Excel • PPT • PDF • Images',
      category: 'security',
      tags: ['علامة مائية', 'batch', 'دفعة', 'watermark'],
    },
    {
      id: 'page-number',
      title: isAr ? 'ترقيم الصفحات' : 'Add Page Numbers',
      description: isAr ? 'إدراج أرقام الصفحات بتنسيقات متعددة ومواضع مخصصة' : 'Insert customized page numbering headers and footers',
      icon: Hash,
      badge: 'Numbers',
      acceptedFormats: isAr ? 'Word • PowerPoint • PDF' : 'Word • PPT • PDF',
      category: 'pdf',
      tags: ['ترقيم', 'page number', 'أرقام'],
    },
    {
      id: 'qr-stamper',
      title: isAr ? 'ختم رمز QR الذكي' : 'Stamp QR Code',
      description: isAr ? 'توليد وختم رمز استجابة سريعة للروابط والبيانات في المستند' : 'Generate and stamp dynamic QR codes directly on pages',
      icon: QrCode,
      badge: 'QR Code',
      acceptedFormats: isAr ? 'Word • Excel • PowerPoint • PDF' : 'Word • Excel • PPT • PDF',
      category: 'security',
      tags: ['qr', 'رمز استجابة', 'ختم qr'],
    },
    {
      id: 'barcode-stamper',
      title: isAr ? 'ختم باركود تسلسلي' : 'Stamp Barcode',
      description: isAr ? 'إدراج باركود Code128 قياسي لضبط الأرشيف وتتبع المعاملات' : 'Insert Code128 standard barcode for serial tracking',
      icon: Binary,
      badge: 'Barcode',
      acceptedFormats: isAr ? 'Word • Excel • PowerPoint • PDF' : 'Word • Excel • PPT • PDF',
      category: 'security',
      tags: ['barcode', 'باركود', 'تتبع'],
    },
    {
      id: 'remove-watermark',
      title: isAr ? 'إزالة العلامة المائية' : 'Remove Watermark',
      description: isAr ? 'تطهير وإزالة الشعارات والطبقات المائية النصية' : 'Scrub off unwanted watermark overlays and logos',
      icon: Eraser,
      badge: 'Clean',
      acceptedFormats: isAr ? 'PDF • Word • PowerPoint' : 'PDF • Word • PPT',
      category: 'pdf',
      tags: ['إزالة علامة مائية', 'remove watermark'],
    },

    // 3. Security, Privacy & Signing (Universal to ALL Formats)
    {
      id: 'encrypt',
      title: isAr ? 'تشفير وقفل المستندات' : 'Encrypt & Lock Documents',
      description: isAr ? 'حماية وقفل أي ملف بكلمة مرور وتشفير قوي ومحلي' : 'Protect and lock any file locally with high-strength password encryption',
      icon: Lock,
      badge: 'Encrypt',
      acceptedFormats: isAr ? 'جميع الصيغ: Word • Excel • PPT • PDF • صور • ملفات' : 'All Formats: Word • Excel • PPT • PDF • Images • Files',
      category: 'security',
      tags: ['تشفير', 'encrypt', 'قفل', 'password', 'كلمة سر', 'حماية', 'word', 'excel'],
      isEssential: true,
    },
    {
      id: 'decrypt',
      title: isAr ? 'فك تشفير المستندات' : 'Decrypt & Unlock Documents',
      description: isAr ? 'فتح وإزالة كلمة المرور والقيود من الملفات المحمية' : 'Unlock and remove password restrictions from protected files',
      icon: Unlock,
      badge: 'Decrypt',
      acceptedFormats: isAr ? 'جميع الصيغ: Word • Excel • PPT • PDF • صور' : 'All Formats: Word • Excel • PPT • PDF • Images',
      category: 'security',
      tags: ['فك تشفير', 'unlock', 'فتح قفل', 'decrypt'],
      isEssential: true,
    },
    {
      id: 'sign',
      title: isAr ? 'توقيع المستندات والأختام' : 'Sign & Stamp Documents',
      description: isAr ? 'إضافة توقيع يدوي أو نصي أو ختم رسمي لجميع مستندات Office وPDF' : 'Add handwritten signatures and company stamps to Office & PDF documents',
      icon: PenTool,
      badge: 'Signature',
      acceptedFormats: isAr ? 'Word • Excel • PowerPoint • PDF • صور' : 'Word • Excel • PPT • PDF • Images',
      category: 'security',
      tags: ['توقيع', 'sign', 'ختم', 'stamp', 'توقيع إلكتروني'],
      isEssential: true,
    },
    {
      id: 'redact',
      title: isAr ? 'طمس وحجب البيانات الحساسة' : 'Redact Sensitive Data',
      description: isAr ? 'تظليل وتفريغ أرقام الهويات والبيانات الخاصة لمنع تسريبها' : 'Permanently black out personal and sensitive data',
      icon: ShieldAlert,
      badge: 'Redact',
      acceptedFormats: isAr ? 'Word • PowerPoint • PDF • نصوص' : 'Word • PPT • PDF • Text',
      category: 'security',
      tags: ['طمس', 'redact', 'حجب', 'بيانات شخصية'],
    },
    {
      id: 'metadata-wiper',
      title: isAr ? 'مسح البيانات الوصفية والخصوصية' : 'Wipe Metadata & History',
      description: isAr ? 'حذف اسم الكاتب وتاريخ الإنشاء والبرامج المستخدمة لضمان الخصوصية' : 'Strip author, timestamps, and hidden tracking metadata',
      icon: EyeOff,
      badge: 'Privacy',
      acceptedFormats: isAr ? 'PDF • Word • Excel • PowerPoint • صور' : 'PDF • Word • Excel • PPT • Images',
      category: 'security',
      tags: ['بيانات وصفية', 'metadata', 'مسح', 'خصوصية'],
    },
    {
      id: 'metadata',
      title: isAr ? 'تعديل الخصائص والبيانات الوصفية' : 'Edit Document Metadata',
      description: isAr ? 'تعديل العنوان، المؤلف، الكلمات المفتاحية، ومعلومات المستند' : 'Inspect and edit title, author, subject, and keywords',
      icon: SlidersHorizontal,
      badge: 'Metadata',
      acceptedFormats: isAr ? 'PDF • Word • Excel • PowerPoint' : 'PDF • Word • Excel • PPT',
      category: 'security',
      tags: ['بيانات وصفية', 'metadata', 'خصائص', 'مؤلف'],
    },
    {
      id: 'compare',
      title: isAr ? 'مقارنة نسختين وإبراز الفروقات' : 'Compare Two Versions',
      description: isAr ? 'مقارنة مستندين وإبراز التعديلات والإضافات والمحذوفات' : 'Compare two documents and highlight exact differences side-by-side',
      icon: GitCompare,
      badge: 'Diff',
      acceptedFormats: isAr ? 'Word • PDF • نصوص • Markdown' : 'Word • PDF • Text • Markdown',
      category: 'security',
      tags: ['مقارنة', 'compare', 'فروقات', 'diff'],
    },
    {
      id: 'visual-compare',
      title: isAr ? 'المقارنة البصرية المتقدمة' : 'Visual Compare',
      description: isAr ? 'مقارنة بصرية دقيقة صفحة بصفحة واكتشاف الفروقات والتعديلات الموضعية' : 'Side-by-side visual comparison with page discrepancy highlighting and overlay',
      icon: Eye,
      badge: 'Visual',
      acceptedFormats: isAr ? 'PDF • Word • صور' : 'PDF • Word • Images',
      category: 'security',
      tags: ['مقارنة بصرية', 'visual', 'compare', 'diff', 'تطابق'],
    },
    {
      id: 'checksum-hasher',
      title: isAr ? 'فحص البصمة الرقمية (SHA-256)' : 'Digital Hash Checksum',
      description: isAr ? 'توليد بصمة التجزئة SHA-256 للتحقق من سلامة وصحة الملفات' : 'Generate cryptographic SHA-256 hash to verify integrity',
      icon: Hash,
      badge: 'Hash',
      acceptedFormats: isAr ? 'جميع الملفات والصيغ دون استثناء' : 'All Files & Formats',
      category: 'security',
      tags: ['sha256', 'hash', 'تجزئة', 'بصمة'],
    },

    // 4. Conversion & Office Suite (Universal)
    {
      id: 'convert',
      title: isAr ? 'تحويل شامل لكافة الصيغ' : 'Universal File Converter',
      description: isAr ? 'تحويل بين Word وExcel وPowerPoint وPDF والصور وHTML' : 'Seamlessly convert between Word, Excel, PPT, PDF, Images, and HTML',
      icon: ArrowLeftRight,
      badge: 'Convert',
      acceptedFormats: isAr ? 'Word • Excel • PPT • PDF • صور • HTML • MD' : 'Word • Excel • PPT • PDF • Images • HTML • MD',
      category: 'convert',
      tags: ['تحويل', 'convert', 'office', 'pdf', 'word', 'excel'],
      isEssential: true,
    },
    {
      id: 'word-to-pdf',
      title: isAr ? 'تحويل Word إلى PDF' : 'Word to PDF',
      description: isAr ? 'تحويل ملفات Docx وDoc بدقة عالية وتنسيق متطابق' : 'Convert Word documents to clean formatted PDF',
      icon: FileText,
      badge: 'Word',
      acceptedFormats: '.docx, .doc',
      category: 'convert',
      tags: ['word to pdf', 'وورد لـ pdf', 'docx'],
    },
    {
      id: 'excel-to-pdf',
      title: isAr ? 'تحويل Excel إلى PDF' : 'Excel to PDF',
      description: isAr ? 'تحويل جداول البيانات XLSX وXLS إلى مستندات PDF منسقة' : 'Convert Excel spreadsheets to professional PDF tables',
      icon: FileSpreadsheet,
      badge: 'Excel',
      acceptedFormats: '.xlsx, .xls, .csv',
      category: 'convert',
      tags: ['excel to pdf', 'اكسل لـ pdf', 'xlsx'],
    },
    {
      id: 'ppt-to-pdf',
      title: isAr ? 'تحويل PowerPoint إلى PDF' : 'PowerPoint to PDF',
      description: isAr ? 'تحويل شرائح العروض التقديمية PPTX إلى PDF' : 'Convert presentation slides to ready PDF',
      icon: Layers,
      badge: 'PPT',
      acceptedFormats: '.pptx, .ppt',
      category: 'convert',
      tags: ['powerpoint to pdf', 'بوربوينت لـ pdf', 'pptx'],
    },
    {
      id: 'pdf-to-word',
      title: isAr ? 'تحويل PDF إلى Word' : 'PDF to Word (.docx)',
      description: isAr ? 'استخراج المحتوى والجداول إلى مستند Word قابل للتحرير بالكامل' : 'Convert PDF contents to an editable Word document',
      icon: FileText,
      badge: 'DOCX',
      acceptedFormats: '.pdf',
      category: 'convert',
      tags: ['pdf to word', 'تحويل وورد', 'docx'],
    },
    {
      id: 'pdf-to-excel',
      title: isAr ? 'تحويل PDF إلى Excel' : 'PDF to Excel (.xlsx)',
      description: isAr ? 'استخراج الجداول والأرقام إلى ملف إكسل منسق بالأعمدة' : 'Extract tabular data into structured Excel spreadsheet',
      icon: FileSpreadsheet,
      badge: 'XLSX',
      acceptedFormats: '.pdf',
      category: 'convert',
      tags: ['pdf to excel', 'تحويل اكسل', 'xlsx'],
    },
    {
      id: 'word-to-markdown',
      title: isAr ? 'Word إلى Markdown (.md)' : 'Word to Markdown',
      description: isAr ? 'تحويل مستندات Word إلى نصوص Markdown منسقة للمطورين' : 'Convert Word documents to clean Markdown syntax',
      icon: FileCode,
      badge: 'MD',
      acceptedFormats: '.docx, .doc',
      category: 'convert',
      tags: ['word to md', 'markdown', 'وورد الى ماركداون'],
    },
    {
      id: 'excel-to-markdown',
      title: isAr ? 'Excel إلى جداول Markdown' : 'Excel to Markdown Tables',
      description: isAr ? 'تحويل جداول إكسل إلى جداول Markdown متوافقة مع GitHub والتوثيق' : 'Convert Excel tables to formatted Markdown tables',
      icon: FileSpreadsheet,
      badge: 'MD Table',
      acceptedFormats: '.xlsx, .xls, .csv',
      category: 'convert',
      tags: ['excel to md', 'جداول ماركداون', 'github table'],
    },
    {
      id: 'pdf-to-html',
      title: isAr ? 'تحويل PDF إلى صفحة ويب HTML' : 'PDF to HTML Page',
      description: isAr ? 'تحويل المستند إلى كود وصفحة HTML متجاوبة للنشر' : 'Convert PDF document into responsive web HTML',
      icon: FileCode,
      badge: 'HTML',
      acceptedFormats: '.pdf',
      category: 'convert',
      tags: ['pdf to html', 'ويب', 'html'],
    },
    {
      id: 'markdown-to-pdf',
      title: isAr ? 'تحويل Markdown إلى PDF' : 'Markdown to PDF',
      description: isAr ? 'تحويل كود ومستندات Markdown إلى صفحات PDF احترافية' : 'Render Markdown notes into typography-styled PDF',
      icon: FileCode,
      badge: 'MD',
      acceptedFormats: '.md, .markdown',
      category: 'convert',
      tags: ['markdown', 'md to pdf'],
    },
    {
      id: 'markdown-to-html',
      title: isAr ? 'تحويل Markdown إلى HTML' : 'Markdown to HTML',
      description: isAr ? 'تحويل مستندات Markdown إلى صفحة ويب HTML متجاوبة مع الجداول والأكواد' : 'Convert Markdown documents into responsive styled HTML web pages',
      icon: Code,
      badge: 'HTML',
      acceptedFormats: '.md, .markdown',
      category: 'convert',
      tags: ['markdown', 'md to html', 'html', 'ماركداون'],
    },
    {
      id: 'html-to-pdf',
      title: isAr ? 'تحويل HTML إلى PDF' : 'HTML to PDF',
      description: isAr ? 'تحويل صفحات وكود HTML إلى مستندات PDF منسقة' : 'Render HTML web documents to print-ready PDF',
      icon: FileCode,
      badge: 'HTML',
      acceptedFormats: '.html, .htm',
      category: 'convert',
      tags: ['html to pdf', 'صفحات الويب', 'كود'],
    },
    {
      id: 'text-to-pdf',
      title: isAr ? 'تحويل نص خام TXT إلى PDF' : 'Text (.txt) to PDF',
      description: isAr ? 'تحويل الملاحظات والنصوص المكتوبة إلى وثيقة رسمية منسقة' : 'Convert plain text notes into styled printable document',
      icon: FileText,
      badge: 'TXT',
      acceptedFormats: '.txt',
      category: 'convert',
      tags: ['txt to pdf', 'نص لـ pdf', 'ملاحظات'],
    },
    {
      id: 'json-to-pdf',
      title: isAr ? 'عرض وطباعة JSON كـ PDF' : 'JSON to Formatted PDF',
      description: isAr ? 'تنسيق شجرة بيانات JSON بألوان برمجية جاهزة للمعاينة والطباعة' : 'Pretty-print hierarchical JSON with syntax coloring into PDF',
      icon: Code,
      badge: 'JSON',
      acceptedFormats: '.json',
      category: 'convert',
      tags: ['json to pdf', 'طباعة json'],
    },
    {
      id: 'code-to-pdf',
      title: isAr ? 'تصدير الأكواد البرمجية لـ PDF' : 'Code to Syntax PDF',
      description: isAr ? 'طباعة الشيفرات البرمجية مع ترقيم الأسطر وتلوين القواعد' : 'Export code snippets with line numbers and syntax highlighting',
      icon: FileCode,
      badge: 'Code',
      acceptedFormats: '.js, .ts, .py, .java, .cpp, .html, .css, .json, .sql',
      category: 'convert',
      tags: ['كود', 'code', 'برمجة', 'syntax'],
    },
    {
      id: 'markdown-to-word',
      title: isAr ? 'Markdown إلى مستند Word' : 'Markdown to Word (.docx)',
      description: isAr ? 'تحويل ملفات .md إلى مستند Word منسق بالعناوين والقوائم' : 'Convert markdown text into a styled Microsoft Word file',
      icon: FileText,
      badge: 'MD->Word',
      acceptedFormats: '.md, .markdown',
      category: 'convert',
      tags: ['markdown to word', 'docx', 'ماركداون الى وورد'],
    },
    {
      id: 'html-to-word',
      title: isAr ? 'HTML إلى مستند Word' : 'HTML to Word (.docx)',
      description: isAr ? 'تحويل صفحات الويب ومقتطفات HTML إلى ملف Word قابل للتعديل' : 'Convert clean HTML web pages into Microsoft Word docx',
      icon: FileText,
      badge: 'HTML->Word',
      acceptedFormats: '.html, .htm',
      category: 'convert',
      tags: ['html to word', 'وورد من html', 'docx'],
    },
    {
      id: 'json-to-excel',
      title: isAr ? 'تحويل JSON إلى جداول Excel' : 'JSON to Excel Sheet',
      description: isAr ? 'تحويل كائنات ومصفوفات JSON إلى ملف إكسل XLSX منظم' : 'Convert JSON arrays into structured Excel spreadsheet',
      icon: FileSpreadsheet,
      badge: 'JSON->XLSX',
      acceptedFormats: '.json',
      category: 'convert',
      tags: ['json to excel', 'تحويل json الى اكسل'],
    },
    {
      id: 'excel-to-json',
      title: isAr ? 'استخراج Excel كملف JSON' : 'Excel to JSON Data',
      description: isAr ? 'تحويل أوراق وجداول الإكسل إلى بيانات JSON برمجية' : 'Export Excel spreadsheets into JSON object format',
      icon: Binary,
      badge: 'XLSX->JSON',
      acceptedFormats: '.xlsx, .xls',
      category: 'convert',
      tags: ['excel to json', 'اكسل الى json'],
    },
    {
      id: 'csv-to-excel',
      title: isAr ? 'تحويل CSV إلى مصنف Excel' : 'CSV to Excel Workbook',
      description: isAr ? 'تحويل ملفات CSV مع ضبط التشفير العربي والترميز' : 'Convert CSV to multi-sheet Excel with proper UTF-8',
      icon: FileSpreadsheet,
      badge: 'CSV',
      acceptedFormats: '.csv',
      category: 'convert',
      tags: ['csv', 'excel', 'تحويل'],
    },
    {
      id: 'extract-text',
      title: isAr ? 'استخراج النصوص والبيانات' : 'Extract Text & Data',
      description: isAr ? 'استخراج وقراءة النصوص الصافية من Word وExcel وPDF وMD' : 'Extract raw text from Word, Excel, PDF, and MD documents',
      icon: FileText,
      badge: 'Text',
      acceptedFormats: isAr ? 'Word • Excel • PPT • PDF • صور • MD' : 'Word • Excel • PPT • PDF • Images • MD',
      category: 'convert',
      tags: ['استخراج النص', 'text', 'قراءة', 'word', 'pdf'],
    },
    {
      id: 'mass-rename',
      title: isAr ? 'إعادة التسمية الجماعية' : 'Batch Mass Rename',
      description: isAr ? 'تغيير أسماء عشرات الملفات دفعة واحدة بالترقيم أو الختم الزمني' : 'Batch rename files by numbering, date, or pattern',
      icon: FileEdit,
      badge: 'Rename',
      acceptedFormats: isAr ? 'جميع الصيغ والملفات' : 'All Formats & Files',
      category: 'convert',
      tags: ['تسمية', 'rename', 'تعديل الاسماء', 'batch'],
    },
    {
      id: 'base64-converter',
      title: isAr ? 'تشفير وفك Base64' : 'Base64 Encoder/Decoder',
      description: isAr ? 'تحويل الملفات إلى سلاسل Base64 واسترجاعها بدقة' : 'Convert files to Base64 strings and reconstruct them',
      icon: Binary,
      badge: 'Base64',
      acceptedFormats: isAr ? 'جميع الملفات' : 'All Files',
      category: 'convert',
      tags: ['base64', 'ترميز', 'تشفير'],
    },
    {
      id: 'file-splitter',
      title: isAr ? 'تقسيم الملفات الكبيرة (ZIP)' : 'Large File Splitter (ZIP)',
      description: isAr ? 'تجزئة الملفات الضخمة إلى أجزاء صغيرة لسهولة الإرسال' : 'Split large files into ZIP parts for easier sharing',
      icon: Split,
      badge: 'Splitter',
      acceptedFormats: isAr ? 'جميع الملفات' : 'All Files',
      category: 'convert',
      tags: ['تقسيم ملفات', 'zip chunks', 'file splitter'],
    },

    // 5. Media & Image Operations
    {
      id: 'pdf-to-images',
      title: isAr ? 'استخراج الصفحات كصور' : 'Extract Pages to Images',
      description: isAr ? 'تحويل وتصدير كل صفحة من المستند كصورة PNG أو JPG فائقة الدقة' : 'Render each page as high-resolution PNG or JPG image',
      icon: ImageIcon,
      badge: 'PNG/JPG',
      acceptedFormats: isAr ? 'PDF • Word • PowerPoint' : 'PDF • Word • PPT',
      category: 'media',
      tags: ['pdf to image', 'استخراج صور', 'png', 'jpg'],
      isEssential: true,
    },
    {
      id: 'images-to-pdf',
      title: isAr ? 'تجميع الصور في مستند' : 'Images to Document',
      description: isAr ? 'تحويل ألبوم الصور ودمجها في مستند موحد ومرتب' : 'Combine multiple photos into a neat formatted document',
      icon: Layers,
      badge: 'Album',
      acceptedFormats: '.png, .jpg, .jpeg, .webp, .heic',
      category: 'media',
      tags: ['صور لـ pdf', 'images to pdf', 'البوم'],
    },
    {
      id: 'image-compress',
      title: isAr ? 'ضغط الصور الذكي' : 'Smart Image Compression',
      description: isAr ? 'تقليل حجم الصور بنسبة تصل إلى 80% دون تأثير مرئي' : 'Shrink image weight without visible quality loss',
      icon: Minimize2,
      badge: 'Compress',
      acceptedFormats: '.jpg, .png, .webp, .jpeg',
      category: 'media',
      tags: ['ضغط صور', 'image compress'],
    },
    {
      id: 'heic-to-jpg',
      title: isAr ? 'تحويل HEIC إلى JPG' : 'HEIC to JPG (iPhone Photos)',
      description: isAr ? 'تحويل صور الآيفون HEIC إلى صيغة JPG القياسية بسرعة' : 'Convert Apple HEIC photos to standard JPEG',
      icon: Camera,
      badge: 'HEIC',
      acceptedFormats: '.heic, .heif',
      category: 'media',
      tags: ['heic', 'ايفون', 'jpg'],
    },
    {
      id: 'webp-to-png',
      title: isAr ? 'تحويل WebP إلى PNG' : 'WebP to PNG',
      description: isAr ? 'تحويل صور مواقع الويب WebP إلى صيغة PNG عالية الوضوح' : 'Convert modern WebP images to lossless PNG',
      icon: ImageIcon,
      badge: 'WebP',
      acceptedFormats: '.webp',
      category: 'media',
      tags: ['webp', 'png', 'تحويل'],
    },
    {
      id: 'resize-image',
      title: isAr ? 'تعديل أبعاد ومقاسات الصور' : 'Resize Image Dimensions',
      description: isAr ? 'تغيير العرض والارتفاع بدقة وفق مقاسات مخصصة' : 'Adjust image width and height proportionally',
      icon: Sliders,
      badge: 'Resize',
      acceptedFormats: '.png, .jpg, .webp, .bmp',
      category: 'media',
      tags: ['تغيير الحجم', 'resize', 'مقاسات'],
    },
    {
      id: 'image-convert',
      title: isAr ? 'تحويل صيغ الصور الشامل' : 'Image Format Converter',
      description: isAr ? 'التحويل بين PNG, JPG, WebP, SVG, HEIC بجودة عالية' : 'Convert between PNG, JPG, WebP, SVG, and HEIC',
      icon: ArrowLeftRight,
      badge: 'Convert',
      acceptedFormats: '.png, .jpg, .jpeg, .webp, .svg, .heic, .bmp',
      category: 'media',
      tags: ['تحويل صور', 'image convert', 'صيغ'],
    },
    {
      id: 'svg-to-pdf',
      title: isAr ? 'تحويل SVG لرسوم متجهة PDF' : 'SVG Vector to PDF',
      description: isAr ? 'تصدير رسومات الفيكتور والشعارات بدقة لا متناهية دون بكسلة' : 'Convert vector SVG graphics into lossless vector PDF',
      icon: ImageIcon,
      badge: 'SVG',
      acceptedFormats: '.svg',
      category: 'media',
      tags: ['svg to pdf', 'فيكتور', 'شعار'],
    },
    {
      id: 'pdf-to-svg',
      title: isAr ? 'تصدير صفحات PDF لـ SVG' : 'PDF Pages to Vector SVG',
      description: isAr ? 'تحويل المستند إلى رسوم خطية قابلة للتحرير في برامج التصميم' : 'Convert document vector layers to editable SVG',
      icon: ImageIcon,
      badge: 'SVG',
      acceptedFormats: '.pdf',
      category: 'media',
      tags: ['pdf to svg', 'فيكتور', 'svg'],
    }
  ], [isAr]);

  // Categories config
  const categories = useMemo(() => [
    { id: 'all', label: isAr ? 'كافة الأدوات' : 'All Tools' },
    { id: 'pdf', label: isAr ? 'المستندات والصفحات' : 'Docs & Pages' },
    { id: 'security', label: isAr ? 'الأمان والتشفير والأختام' : 'Security & Stamps' },
    { id: 'convert', label: isAr ? 'التحويل ومستندات Office' : 'Convert & Office' },
    { id: 'media', label: isAr ? 'الصور والوسائط' : 'Images & Media' },
  ], [isAr]);

  // Filtering with deferred search for zero input latency
  const filteredTools = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return tools.filter((tool) => {
      const matchCategory = selectedCategory === 'all' || tool.category === selectedCategory;
      if (!matchCategory) return false;

      if (!q) return true;

      const matchTitle = tool.title.toLowerCase().includes(q);
      const matchDesc = tool.description.toLowerCase().includes(q);
      const matchBadge = tool.badge.toLowerCase().includes(q);
      const matchFormats = tool.acceptedFormats.toLowerCase().includes(q);
      const matchTags = tool.tags.some(tag => tag.toLowerCase().includes(q));

      return matchTitle || matchDesc || matchBadge || matchFormats || matchTags;
    });
  }, [tools, selectedCategory, deferredSearch]);

  // Displayed tools: either all filtered tools, or empty if collapsed and on 'all' without search
  const isFilterActive = deferredSearch.trim().length > 0 || selectedCategory !== 'all';
  const displayedTools = useMemo(() => {
    if (isExpanded || isFilterActive) {
      return filteredTools;
    }
    // Collapsed mode: fold all tools including merge and split
    return [];
  }, [filteredTools, isExpanded, isFilterActive]);

  // Drag & drop directly on a tool card
  const handleCardDragOver = (e: React.DragEvent, toolId: ToolType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTool(toolId);
  };

  const handleCardDragLeave = (e: React.DragEvent, toolId: ToolType) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverTool === toolId) {
      setDragOverTool(null);
    }
  };

  const handleCardDrop = (e: React.DragEvent, toolId: ToolType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTool(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      if (onSelectToolWithFiles) {
        onSelectToolWithFiles(toolId, filesArray);
      } else {
        onSelectTool(toolId);
      }
    } else {
      onSelectTool(toolId);
    }
  };

  return (
    <div id="tool-catalog-section" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-12">
      {/* CATEGORY TABS, SEARCH, AND EXPAND/COLLAPSE CONTROL */}
      <section className="space-y-4 pt-2">
        {/* Row 1: Search Input & Master Single Expand Toggle */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-3 rtl:right-3 rtl:left-auto left-auto top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث في كافة الأدوات والصيغ...' : 'Search tools & formats...'}
              className="w-full pr-8 pl-3 rtl:pr-8 rtl:pl-3 py-2 rounded-xl bg-white dark:bg-[#1c1c1e] border border-neutral-200 dark:border-white/10 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* SINGLE EXPAND / COLLAPSE BUTTON (Only one in the entire interface) */}
          <button
            id="btn-toggle-all-tools"
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 text-neutral-800 dark:text-neutral-100 transition-all shrink-0 cursor-pointer border border-neutral-200/80 dark:border-white/10 shadow-2xs"
            title={isExpanded ? (isAr ? 'طي الكل' : 'Collapse All') : (isAr ? 'عرض الكل' : 'Show All')}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 text-blue-500 transition-transform duration-200" />
                <span>{isAr ? 'طي الكل' : 'Collapse All'}</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 text-blue-500 transition-transform duration-200" />
                <span>{isAr ? 'عرض الكل' : 'Show All'}</span>
              </>
            )}
          </button>
        </div>

        {/* Animate expandable tools section */}
        <AnimatePresence>
          {(isExpanded || isFilterActive || searchQuery) && (
            <motion.div
              key="catalog-expanded-container"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4 overflow-hidden pt-1"
            >
              {/* Row 2: Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] py-1 flex-nowrap w-full">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id as ToolCategory)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 active:scale-95 ${
                        isSelected
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs scale-[1.02]'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200/50 dark:border-white/5'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Count Info */}
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 px-1">
                <div>
                  <span>
                    {isAr 
                      ? `عرض ${displayedTools.length} أداة من أصل ${tools.length}+ أداة متخصصة`
                      : `Showing ${displayedTools.length} of ${tools.length}+ tools`}
                  </span>
                  {searchQuery && (
                    <span className="font-medium text-blue-600 dark:text-blue-400 ms-2">
                      {isAr ? `(نتائج: "${searchQuery}")` : `(Results: "${searchQuery}")`}
                    </span>
                  )}
                </div>
              </div>

              {/* PINNED FAVORITES SECTION */}
              {favorites.length > 0 && selectedCategory === 'all' && !searchQuery && (
                <div id="pinned-favorites-container" className="p-4 sm:p-5 rounded-3xl bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border border-amber-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                      <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                        {isAr ? 'الأدوات المفضلة والمثبتة' : 'Pinned & Favorite Tools'}
                      </h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                        {tools.filter(t => favorites.includes(t.id)).length}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:inline">
                      {isAr ? 'انقر على النجمة بأي بطاقة لإضافتها أو إزالتها' : 'Click star on any card to pin or unpin'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
                    {tools.filter(t => favorites.includes(t.id)).map(favTool => {
                      const FavIcon = favTool.icon;
                      const favMeta = getToolMetadata(favTool.id, lang);
                      return (
                        <button
                          key={`fav-${favTool.id}`}
                          type="button"
                          onClick={() => onSelectTool(favTool.id)}
                          className="flex items-center gap-2 p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-[#1c1c1e] hover:bg-amber-500/[0.08] dark:hover:bg-amber-500/[0.12] border border-amber-200/60 dark:border-white/10 text-start transition-all cursor-pointer shadow-2xs group active:scale-95"
                        >
                          <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <FavIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                            {favMeta.title || favTool.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. HIGH-DENSITY TOOLS GRID (Vertical Layout across all screens) */}
              {displayedTools.length > 0 && (
                <div 
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 w-full"
                >
                  {displayedTools.map((tool) => {
                    const Icon = tool.icon;
                    const isHoveredByDrag = dragOverTool === tool.id;
                    const meta = getToolMetadata(tool.id, lang);
                    const displayTitle = meta.title || tool.title;
                    const displayDesc = meta.description || tool.description;
                    const displayBadge = meta.badge || tool.badge;
                    const beginnerTip = getToolBeginnerBenefit(tool.id, lang);
                    const isFav = favorites.includes(tool.id);

                    return (
                      <button
                        key={tool.id}
                        id={`tool-card-${tool.id}`}
                        type="button"
                        onClick={() => onSelectTool(tool.id)}
                        onDragOver={(e) => handleCardDragOver(e, tool.id)}
                        onDragLeave={(e) => handleCardDragLeave(e, tool.id)}
                        onDrop={(e) => handleCardDrop(e, tool.id)}
                        className={`group relative flex flex-col justify-between p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border tool-card-optim transition-all duration-200 ease-out text-start cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-full h-full hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] ${
                          isHoveredByDrag
                            ? 'border-blue-500 bg-blue-500/[0.05] ring-2 ring-blue-500/20 scale-[1.01]'
                            : 'border-neutral-200/80 dark:border-white/[0.08] shadow-2xs hover:shadow-md hover:border-neutral-300 dark:hover:border-white/20'
                        }`}
                      >
                        {/* Beginner Usability Tooltip (Shown on Hover) */}
                        <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 max-w-[calc(100vw-32px)] p-3 rounded-2xl bg-neutral-900/95 dark:bg-neutral-800/95 text-white shadow-2xl border border-white/15 z-50 backdrop-blur-md text-start">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-400 mb-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{isAr ? 'فائدة الأداة للمبتدئين:' : 'Beginner Benefit:'}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-neutral-200 font-normal">
                            {beginnerTip}
                          </p>
                          {/* Downward arrow indicator */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900/95 dark:border-t-neutral-800/95" />
                        </div>

                        <div className="space-y-2">
                          {/* Top Bar: Subtle Icon, Color-coded Category Badge, and Star Toggle */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-neutral-400 dark:text-neutral-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:scale-110 transition-all duration-200 shrink-0" />
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${getCategoryBadgeStyle(tool.category)}`}>
                                {displayBadge}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => toggleFavorite(e, tool.id)}
                                title={isFav ? (isAr ? 'إزالة من المفضلة' : 'Unpin favorite') : (isAr ? 'تثبيت في المفضلة' : 'Pin to favorites')}
                                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                  isFav 
                                    ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400' 
                                    : 'text-neutral-300 dark:text-neutral-600 hover:text-amber-400 opacity-60 hover:opacity-100'
                                }`}
                              >
                                <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-500' : ''}`} />
                              </button>
                              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform shrink-0" />
                            </div>
                          </div>

                          {/* Title & Description */}
                          <div className="space-y-1 pt-0.5">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {displayTitle}
                            </h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                              {displayDesc}
                            </p>
                          </div>
                        </div>

                        {/* Bottom Bar: Formats list (Clean, readable, no circle backgrounds) */}
                        <div className="pt-2.5 mt-2.5 border-t border-neutral-100 dark:border-white/[0.06]">
                          <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 block truncate" dir={isAr ? 'rtl' : 'ltr'}>
                            {tool.acceptedFormats}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty Search State */}
        {filteredTools.length === 0 && (
          <div className="py-16 text-center text-neutral-400 dark:text-neutral-500 space-y-3">
            <FolderOpen className="w-10 h-10 mx-auto stroke-1 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm font-semibold">
              {isAr ? 'لم يتم العثور على أداة مطابقة للبحث' : 'No matching tools found'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {isAr ? `عرض جميع الأدوات (${tools.length}+)` : `Show all ${tools.length}+ tools`}
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
