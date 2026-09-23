import { ToolType, Language } from '../types';

export interface ToolMetadata {
  title: string;
  description: string;
  badge: string;
}

export const TOOL_DEFINITIONS_MAP: Record<ToolType, { ar: ToolMetadata; en: ToolMetadata }> = {
  // Core Document Operations
  'merge': {
    ar: { title: 'دمج الملفات والمستندات', description: 'دمج ملفات Word وExcel وPowerPoint وPDF والصور في مستند موحد', badge: 'دمج' },
    en: { title: 'Merge Files & Documents', description: 'Combine Word, Excel, PPT, PDF, and images into one document', badge: 'Merge' }
  },
  'universal-merge': {
    ar: { title: 'دمج شامل لكافة الصيغ', description: 'تجميع ملفات متعددة ومتباينة الأنواع في ملف PDF واحد متناسق', badge: 'دمج شامل' },
    en: { title: 'Universal Multi-Format Merge', description: 'Combine different file types into one unified document', badge: 'Merge' }
  },
  'split': {
    ar: { title: 'تقسيم واستخراج الصفحات', description: 'فصل الصفحات واستخراج نطاقات محددة من المستندات والملفات', badge: 'تقسيم' },
    en: { title: 'Split & Extract Pages', description: 'Extract pages and split document into multiple files', badge: 'Split' }
  },
  'organize': {
    ar: { title: 'تنظيم وترتيب الصفحات', description: 'إعادة ترتيب وتدوير وحذف صفحات المستندات بصرياً', badge: 'ترتيب' },
    en: { title: 'Organize Pages', description: 'Reorder, rotate, and delete document pages visually', badge: 'Pages' }
  },
  'rotate-pdf': {
    ar: { title: 'تدوير الصفحات', description: 'تدوير صفحات المستند 90° أو 180° وتصحيح الاتجاه', badge: 'تدوير' },
    en: { title: 'Rotate Pages', description: 'Rotate document pages by 90 or 180 degrees', badge: 'Rotate' }
  },
  'delete-pages': {
    ar: { title: 'حذف صفحات محددة', description: 'إزالة صفحات معينة وتصدير نسخة نظيفة من المستند', badge: 'حذف' },
    en: { title: 'Delete Pages', description: 'Remove specific unwanted pages cleanly', badge: 'Delete' }
  },
  'extract-pages': {
    ar: { title: 'استخراج صفحات في مستند مستقل', description: 'تحديد صفحات محددة وتصديرها كملف منفصل فورياً', badge: 'استخراج' },
    en: { title: 'Extract Pages', description: 'Select and save specific pages to a new document', badge: 'Extract' }
  },
  'reverse-pages': {
    ar: { title: 'عكس ترتيب الصفحات', description: 'قلب تسلسل صفحات المستند من الأخير إلى الأول تلقائياً', badge: 'عكس' },
    en: { title: 'Reverse Page Order', description: 'Reverse page sequence from last to first', badge: 'Reverse' }
  },
  'grayscale-pdf': {
    ar: { title: 'تحويل إلى تدرج الرمادي (أبيض وأسود)', description: 'تحويل المستند إلى درجات الرمادي لتوفير حبر الطباعة وتخفيف الحجم', badge: 'رمادي' },
    en: { title: 'Grayscale Document', description: 'Convert colors to monochrome grayscale for print economy', badge: 'Grayscale' }
  },
  'crop-pdf': {
    ar: { title: 'قص هوامش المستند', description: 'قص الهوامش البيضاء وحواف الصفحات بدقة وسهولة', badge: 'قص' },
    en: { title: 'Crop Margins', description: 'Trim white margins and page borders cleanly', badge: 'Crop' }
  },
  'repair-pdf': {
    ar: { title: 'إصلاح المستندات التالفة', description: 'استعادة وبناء هيكل الملفات والمستندات غير القابلة للفتح', badge: 'إصلاح' },
    en: { title: 'Repair Documents', description: 'Rebuild corrupt headers and recover unreadable files', badge: 'Repair' }
  },
  'color-invert': {
    ar: { title: 'الوضع الليلي / عكس الألوان', description: 'عكس ألوان المستند للقراءة الليلية أو لتقليل إجهاد العين', badge: 'وضع ليلي' },
    en: { title: 'Night Mode / Invert Colors', description: 'Invert colors for night reading and dark viewing', badge: 'Theme' }
  },
  'booklet-maker': {
    ar: { title: 'إعداد وطباعة الكتيبات (Booklet)', description: 'ترتيب الصفحات وجهين ككتيب جاهز للطباعة والطي المباشر', badge: 'كتيب' },
    en: { title: 'Booklet / Imposition Maker', description: 'Arrange pages 2-up for double-sided booklet printing', badge: 'Booklet' }
  },
  'linearize-pdf': {
    ar: { title: 'تحسين الويب (Fast Web View)', description: 'إعادة هيكلة المستند للفتح الفوري عبر الإنترنت صفحة بصفحة', badge: 'تسريع' },
    en: { title: 'Linearize (Fast Web View)', description: 'Optimize document for instant byte-streaming on web', badge: 'Speed' }
  },
  'pdfa': {
    ar: { title: 'معيار الأرشفة طويل المدى (PDF/A)', description: 'تحويل المستند إلى صيغة قياسية متوافقة مع الأرشفة القانونية', badge: 'أرشفة' },
    en: { title: 'Long-Term Archive (PDF/A)', description: 'Convert document to compliant standard archive format', badge: 'Archive' }
  },
  'pdf-flatten-forms': {
    ar: { title: 'تسطيح النماذج والتواقيع', description: 'تثبيت حقول الإدخال والتواقيع لمنع تعديلها أو حذفها', badge: 'تثبيت' },
    en: { title: 'Flatten Forms & Signatures', description: 'Lock interactive fields and stamps into permanent layers', badge: 'Lock' }
  },

  // Stamps & Security
  'watermark': {
    ar: { title: 'إضافة علامة مائية', description: 'إضافة نص أو شعار شفاف لحماية الملكية الفكرية والسرية', badge: 'علامة مائية' },
    en: { title: 'Add Watermark', description: 'Apply custom text or logo watermark for brand protection', badge: 'Watermark' }
  },
  'batch-watermark': {
    ar: { title: 'علامة مائية دفعة واحدة', description: 'تطبيق نفس العلامة المائية أو الشعار على عدة مستندات معاً', badge: 'دفعة' },
    en: { title: 'Batch Watermark Multi-Files', description: 'Apply identical watermark across multiple documents at once', badge: 'Batch' }
  },
  'remove-watermark': {
    ar: { title: 'إزالة العلامات المائية', description: 'تنظيف المستند من العلامات المائية والنصوص الشفافة المزعجة', badge: 'إزالة' },
    en: { title: 'Remove Watermark', description: 'Clean and strip background watermark layers from document', badge: 'Clean' }
  },
  'page-number': {
    ar: { title: 'ترقيم الصفحات', description: 'إدراج أرقام الصفحات بتنسيقات متعددة ومواضع مخصصة', badge: 'ترقيم' },
    en: { title: 'Add Page Numbers', description: 'Insert customized page numbering headers and footers', badge: 'Numbers' }
  },
  'qr-stamper': {
    ar: { title: 'ختم رمز QR الذكي', description: 'توليد وختم رمز استجابة سريعة للروابط والبيانات في المستند', badge: 'رمز QR' },
    en: { title: 'Stamp QR Code', description: 'Generate and stamp dynamic QR codes directly on pages', badge: 'QR Code' }
  },
  'barcode-stamper': {
    ar: { title: 'ختم الباركود التسلسلي (Code 128)', description: 'إدراج باركود تتبعي للوثائق والمستودعات والشحنات الرسمية', badge: 'باركود' },
    en: { title: 'Stamp Barcode', description: 'Generate Code-128 or EAN tracking barcodes onto pages', badge: 'Barcode' }
  },
  'sign': {
    ar: { title: 'توقيع المستند رسمياً', description: 'إضافة توقيع يدوي، رفع توقيع ممسوح، أو الختم بالكاميرا', badge: 'توقيع' },
    en: { title: 'Sign Document', description: 'Draw signature, upload stamp, or sign via camera scan', badge: 'Sign' }
  },
  'encrypt': {
    ar: { title: 'قفل وتشفير الملف بكلمة سر', description: 'حماية وتشفير محتوى الملف والتحكم بصلاحيات الطباعة والنسخ', badge: 'تشفير' },
    en: { title: 'Password Encrypt Document', description: 'Protect file with password and restrict printing permissions', badge: 'Encrypt' }
  },
  'decrypt': {
    ar: { title: 'إلغاء قفل وفك تشفير الملف', description: 'إزالة كلمة المرور والقيود من المستند بعد المصادقة', badge: 'فك تشفير' },
    en: { title: 'Unlock & Decrypt File', description: 'Remove password restrictions and permit unrestricted access', badge: 'Decrypt' }
  },
  'redact': {
    ar: { title: 'طمس وتنقيح المعلومات الحساسة', description: 'حذف وتعتيم البيانات الخاصة وأرقام الهوية بأمان دائم', badge: 'طمس' },
    en: { title: 'Redact Confidential Data', description: 'Black out sensitive text, national IDs, and financial records', badge: 'Redact' }
  },
  'metadata': {
    ar: { title: 'تعديل الخصائص والبيانات الوصفية', description: 'تعديل العنوان، المؤلف، الكلمات المفتاحية، وبرنامج الإنشاء', badge: 'بيانات' },
    en: { title: 'Edit Document Metadata', description: 'Inspect and edit title, author, subject, and keywords', badge: 'Metadata' }
  },
  'metadata-wiper': {
    ar: { title: 'مسح البيانات الوصفية والخصوصية', description: 'إزالة بيانات الكاميرا والـ GPS وهوية الجهاز والمؤلف نهائياً', badge: 'خصوصية' },
    en: { title: 'Strip & Wipe Metadata', description: 'Permanently remove author tags, GPS, and device traces', badge: 'Privacy' }
  },
  'flatten': {
    ar: { title: 'تسطيح المستند بالكامل', description: 'دمج كافة العناصر والتعليقات لمنع استخراجها أو التعديل عليها', badge: 'تسطيح' },
    en: { title: 'Flatten Entire Document', description: 'Rasterize and convert annotations into permanent base layer', badge: 'Flatten' }
  },

  // Conversion & Formats
  'convert': {
    ar: { title: 'تحويل الصيغ الشامل', description: 'تحويل متبادل بين Word وExcel وPowerPoint وPDF والصور', badge: 'تحويل' },
    en: { title: 'Universal Format Converter', description: 'Convert between Word, Excel, PPT, PDF, images and text', badge: 'Convert' }
  },
  'word-to-pdf': {
    ar: { title: 'تحويل Word إلى PDF', description: 'تحويل مستندات Word (.docx/.doc) إلى PDF بدقة عالية', badge: 'Word لـ PDF' },
    en: { title: 'Word to PDF', description: 'Convert Word documents (.docx, .doc) to pristine PDF', badge: 'Word to PDF' }
  },
  'excel-to-pdf': {
    ar: { title: 'تحويل Excel إلى PDF', description: 'تحويل جداول البيانات والتقارير المالية إلى مستند جاهز للطباعة', badge: 'Excel لـ PDF' },
    en: { title: 'Excel to PDF', description: 'Render spreadsheets, tables, and sheets into tidy PDF pages', badge: 'Excel to PDF' }
  },
  'ppt-to-pdf': {
    ar: { title: 'تحويل PowerPoint إلى PDF', description: 'تحويل عروض الشرائح والتقديمية إلى مستند PDF للقراءة والعرض', badge: 'PPT لـ PDF' },
    en: { title: 'PowerPoint to PDF', description: 'Convert PPT slides into high-resolution PDF handouts', badge: 'PPT to PDF' }
  },
  'pdf-to-word': {
    ar: { title: 'تحويل PDF إلى Word قابل للتعديل', description: 'استخراج الجداول والنصوص إلى ملف docx جاهز للتحرير والطباعة', badge: 'PDF لـ Word' },
    en: { title: 'PDF to Editable Word', description: 'Extract text, formatting, and tables into editable .docx', badge: 'PDF to Word' }
  },
  'pdf-to-excel': {
    ar: { title: 'تحويل PDF إلى Excel', description: 'التعرف على الجداول الرقمية وتصديرها كشيت إكسل منظم', badge: 'PDF لـ Excel' },
    en: { title: 'PDF to Excel Spreadsheet', description: 'Parse data tables from PDF into structured Excel sheets', badge: 'PDF to Excel' }
  },
  'word-to-markdown': {
    ar: { title: 'Word إلى Markdown', description: 'تحويل مستندات Word الغنية إلى نصوص مهيكلة بصيغة Markdown', badge: 'Word لـ MD' },
    en: { title: 'Word to Markdown', description: 'Convert rich Word documents into structured Markdown (.md)', badge: 'Word to MD' }
  },
  'excel-to-markdown': {
    ar: { title: 'Excel إلى جداول Markdown', description: 'تحويل جداول البيانات إلى صيغة Markdown المتوافقة مع GitHub', badge: 'Excel لـ MD' },
    en: { title: 'Excel to Markdown Tables', description: 'Convert spreadsheets to Markdown pipe-table syntax', badge: 'Excel to MD' }
  },
  'pdf-to-html': {
    ar: { title: 'PDF إلى صفحة ويب HTML', description: 'تصدير صفحات المستند ككود ويب متجاوب مع الخطوط والصور', badge: 'PDF لـ HTML' },
    en: { title: 'PDF to Web HTML', description: 'Export document pages into responsive HTML layout', badge: 'PDF to HTML' }
  },
  'markdown-to-word': {
    ar: { title: 'Markdown إلى مستند Word', description: 'تحويل ملفات .md إلى مستند Word منسق بالعناوين والقوائم', badge: 'MD لـ Word' },
    en: { title: 'Markdown to Word (.docx)', description: 'Convert markdown text into a styled Microsoft Word file', badge: 'MD to Word' }
  },
  'html-to-word': {
    ar: { title: 'HTML إلى مستند Word', description: 'تحويل صفحات الويب ومقتطفات HTML إلى ملف Word قابل للتعديل', badge: 'HTML لـ Word' },
    en: { title: 'HTML to Word (.docx)', description: 'Convert clean HTML web pages into Microsoft Word docx', badge: 'HTML to Word' }
  },
  'markdown-to-pdf': {
    ar: { title: 'تحويل Markdown إلى PDF', description: 'تنسيق وإخراج ملفات Markdown بتصميم طباعي احترافي', badge: 'MD لـ PDF' },
    en: { title: 'Markdown to PDF', description: 'Render GitHub and Obsidian Markdown into formatted PDF', badge: 'MD to PDF' }
  },
  'markdown-to-html': {
    ar: { title: 'تحويل Markdown إلى صفحة HTML', description: 'تحويل مستندات Markdown إلى صفحة ويب HTML متجاوبة مع الجداول والأكواد', badge: 'MD لـ HTML' },
    en: { title: 'Markdown to HTML Web Page', description: 'Convert Markdown documents into responsive styled HTML web pages', badge: 'MD to HTML' }
  },
  'html-to-pdf': {
    ar: { title: 'تحويل HTML إلى PDF', description: 'تحويل كود وصفحات HTML إلى مستند PDF مع الحفاظ على الأنماط', badge: 'HTML لـ PDF' },
    en: { title: 'HTML to PDF', description: 'Convert HTML documents or web snippets into PDF', badge: 'HTML to PDF' }
  },
  'text-to-pdf': {
    ar: { title: 'تحويل نص خام TXT إلى PDF', description: 'تحويل الملاحظات والنصوص المكتوبة إلى وثيقة رسمية منسقة', badge: 'TXT لـ PDF' },
    en: { title: 'Text (.txt) to PDF', description: 'Convert plain text notes into styled printable document', badge: 'TXT to PDF' }
  },
  'csv-to-excel': {
    ar: { title: 'تحويل CSV إلى Excel ملون ومنسق', description: 'تحويل وتنسيق ملفات CSV إلى جداول Excel احترافية وفلاتر', badge: 'CSV لـ Excel' },
    en: { title: 'CSV to Styled Excel', description: 'Transform raw CSV files into formatted styled Excel workbooks', badge: 'CSV to Excel' }
  },
  'json-to-excel': {
    ar: { title: 'تحويل JSON إلى جداول Excel', description: 'تسطيح كائنات ومصفوفات JSON وتحويلها لشيت إكسل منظم', badge: 'JSON لـ Excel' },
    en: { title: 'JSON to Excel Spreadsheet', description: 'Flatten JSON arrays and objects into organized Excel rows', badge: 'JSON to Excel' }
  },
  'excel-to-json': {
    ar: { title: 'تحويل Excel إلى بيانات JSON', description: 'استخراج صفوف وأعمدة الإكسل ككائنات برمجية بصيغة JSON', badge: 'Excel لـ JSON' },
    en: { title: 'Excel to JSON Data', description: 'Convert worksheet rows and columns into structured JSON', badge: 'Excel to JSON' }
  },
  'json-to-pdf': {
    ar: { title: 'عرض وطباعة JSON كـ PDF', description: 'تنسيق شجرة بيانات JSON بألوان برمجية جاهزة للمعاينة والطباعة', badge: 'JSON لـ PDF' },
    en: { title: 'JSON to Formatted PDF', description: 'Pretty-print hierarchical JSON with syntax coloring into PDF', badge: 'JSON to PDF' }
  },
  'code-to-pdf': {
    ar: { title: 'تصدير الأكواد البرمجية لـ PDF', description: 'طباعة الشيفرات البرمجية مع ترقيم الأسطر وتلوين القواعد (Syntax)', badge: 'كود لـ PDF' },
    en: { title: 'Code to Syntax PDF', description: 'Export code snippets with line numbers and syntax highlighting', badge: 'Code to PDF' }
  },

  // Compression & Optimization
  'compress': {
    ar: { title: 'ضغط وتقليل حجم الملف', description: 'تقليل حجم ملفات Word وPowerPoint وPDF والصور حتى 80%', badge: 'ضغط' },
    en: { title: 'Compress File Size', description: 'Reduce document weight up to 80% maintaining readability', badge: 'Compress' }
  },
  'pdf-compress-heavy': {
    ar: { title: 'أقصى ضغط للبريد والواتساب', description: 'ضغط فائق لملفات PDF الكبيرة لتناسب حدود الإرسال والمشاركة', badge: 'أقصى ضغط' },
    en: { title: 'Maximum Compression for Sharing', description: 'Heavy compression tuned for WhatsApp and email limits', badge: 'Max Compress' }
  },

  // Inspection & Text
  'extract-text': {
    ar: { title: 'استخراج النصوص من المستند', description: 'نسخ واستخراج كافة النصوص والمحتوى المكتوب بنقرة واحدة', badge: 'استخراج نص' },
    en: { title: 'Extract Text', description: 'Extract all readable text and tables into text or word', badge: 'Text' }
  },
  'compare': {
    ar: { title: 'مقارنة المستندات وإبراز الفروقات', description: 'مقارنة نسختين من ملفات Word أو PDF وعرض التعديلات بصرياً', badge: 'مقارنة' },
    en: { title: 'Compare Documents & Diffs', description: 'Compare two document versions and highlight changes', badge: 'Compare' }
  },
  'visual-compare': {
    ar: { title: 'المقارنة البصرية المتقدمة (Visual Compare)', description: 'مقارنة بصرية دقيقة صفحة بصفحة مع كشف الفروقات الموضعية وتراكب الاختلافات', badge: 'مقارنة بصرية' },
    en: { title: 'Visual Document Compare', description: 'Side-by-side visual comparison with page discrepancy highlighting and overlay', badge: 'Visual Diff' }
  },
  'annotate': {
    ar: { title: 'إضافة ملاحظات ورسم على المستند', description: 'التظليل، الكتابة، وضع الأسهم والملاحظات التوضيحية بسهولة', badge: 'ملاحظات' },
    en: { title: 'Annotate & Markup', description: 'Add highlights, sticky notes, shapes, and freehand markup', badge: 'Annotate' }
  },
  'form-builder': {
    ar: { title: 'بناء النماذج التفاعلية', description: 'إضافة حقول إدخال وخانات اختيار وتواقيع تفاعلية للمستند', badge: 'نماذج' },
    en: { title: 'Interactive Form Builder', description: 'Add text inputs, checkboxes, and fillable fields', badge: 'Form' }
  },
  'imposition': {
    ar: { title: 'فرز وتخطيط الطباعة (N-Up)', description: 'طباعة صفحتين أو أكثر في ورقة واحدة لتوفير الورق', badge: 'طباعة' },
    en: { title: 'Print Layout (N-Up / Imposition)', description: 'Fit 2 or 4 pages per sheet for compact printing', badge: 'Print' }
  },
  'toc': {
    ar: { title: 'فهرس المحتويات الذكي (Dynamic TOC)', description: 'بناء جدول محتويات تفاعلي وروابط تنقل مباشرة بين الفصول', badge: 'فهرس' },
    en: { title: 'Table of Contents (Dynamic TOC)', description: 'Generate interactive table of contents with bookmarks', badge: 'TOC' }
  },

  // Media & Images
  'pdf-to-images': {
    ar: { title: 'استخراج الصفحات كصور', description: 'تحويل وتصدير كل صفحة من المستند كصورة PNG أو JPG فائقة الدقة', badge: 'استخراج صور' },
    en: { title: 'Extract Pages to Images', description: 'Render each page as high-resolution PNG or JPG image', badge: 'Images' }
  },
  'images-to-pdf': {
    ar: { title: 'تجميع الصور في مستند', description: 'تحويل ألبوم الصور ودمجها في مستند موحد ومرتب', badge: 'صور لـ PDF' },
    en: { title: 'Images to Document', description: 'Combine multiple photos into a neat formatted document', badge: 'Album' }
  },
  'image-compress': {
    ar: { title: 'ضغط الصور الذكي', description: 'تقليل حجم الصور بنسبة تصل إلى 80% دون تأثير مرئي', badge: 'ضغط صور' },
    en: { title: 'Smart Image Compression', description: 'Shrink image weight without visible quality loss', badge: 'Compress' }
  },
  'image-convert': {
    ar: { title: 'تحويل صيغ الصور', description: 'التحويل بين PNG, JPG, WebP, SVG, HEIC بجودة عالية', badge: 'تحويل صور' },
    en: { title: 'Image Format Converter', description: 'Convert between PNG, JPG, WebP, SVG, and HEIC', badge: 'Convert' }
  },
  'heic-to-jpg': {
    ar: { title: 'تحويل HEIC إلى JPG', description: 'تحويل صور الآيفون HEIC إلى صيغة JPG القياسية بسرعة', badge: 'HEIC' },
    en: { title: 'HEIC to JPG (iPhone Photos)', description: 'Convert Apple HEIC photos to standard JPEG', badge: 'HEIC' }
  },
  'webp-to-png': {
    ar: { title: 'تحويل WebP إلى PNG', description: 'تحويل صور مواقع الويب WebP إلى صيغة PNG عالية الوضوح', badge: 'WebP' },
    en: { title: 'WebP to PNG', description: 'Convert modern WebP images to lossless PNG', badge: 'WebP' }
  },
  'svg-to-pdf': {
    ar: { title: 'تحويل SVG لرسوم متجهة PDF', description: 'تصدير رسومات الفيكتور والشعارات بدقة لا متناهية دون بكسلة', badge: 'SVG' },
    en: { title: 'SVG Vector to PDF', description: 'Convert vector SVG graphics into lossless vector PDF', badge: 'SVG' }
  },
  'pdf-to-svg': {
    ar: { title: 'تصدير صفحات PDF لـ SVG', description: 'تحويل المستند إلى رسوم خطية قابلة للتحرير في برامج التصميم', badge: 'PDF لـ SVG' },
    en: { title: 'PDF Pages to Vector SVG', description: 'Convert document vector layers to editable SVG', badge: 'SVG' }
  },
  'resize-image': {
    ar: { title: 'تعديل أبعاد ومقاسات الصور', description: 'تغيير العرض والارتفاع بدقة وفق مقاسات مخصصة', badge: 'مقاسات' },
    en: { title: 'Resize Image Dimensions', description: 'Adjust image width and height proportionally', badge: 'Resize' }
  },

  // Utilities & Advanced
  'checksum-hasher': {
    ar: { title: 'فحص البصمة الرقمية (SHA-256 / MD5)', description: 'حساب والتحقق من سلامة الملفات عبر الهاش الرقمي المشفر', badge: 'بصمة' },
    en: { title: 'File Checksum Hasher', description: 'Calculate SHA-256 and MD5 hash to verify integrity', badge: 'Hash' }
  },
  'base64-converter': {
    ar: { title: 'ترميز / فك ترميز Base64', description: 'تحويل الملفات والمستندات إلى نصوص Base64 برمجية وبالعكس', badge: 'Base64' },
    en: { title: 'Base64 Encode / Decode', description: 'Convert documents into data-URI strings or back to binary', badge: 'Base64' }
  },
  'file-splitter': {
    ar: { title: 'تقسيم الملف لأجزاء حسب الحجم (MB)', description: 'تجزئة الملفات الضخمة إلى قطع صغيرة وتجميعها لاحقاً', badge: 'تجزئة' },
    en: { title: 'Split Binary File by Size', description: 'Slice large files into chunks for easy transport', badge: 'Chunk' }
  },
  'mass-rename': {
    ar: { title: 'إعادة تسمية الملفات دفعة واحدة', description: 'إضافة بادئات، ترقيم تسلسلي، وتعديل أسماء الملفات تلقائياً', badge: 'تسمية' },
    en: { title: 'Batch Bulk Renamer', description: 'Rename multiple files with numbering patterns and prefixes', badge: 'Rename' }
  },
  'multi-column-pdf': {
    ar: { title: 'تخطيط الأعمدة المتعددة (جريدة / مجلة)', description: 'إعادة ترتيب النصوص والصفحات في عمودين أو ثلاثة كجريدة', badge: 'أعمدة' },
    en: { title: 'Multi-Column Document Layout', description: 'Reformat text content into 2 or 3 newspaper columns', badge: 'Columns' }
  },
  'sanitize': {
    ar: { title: 'تطهير وإزالة الكائنات المخفية', description: 'إزالة الخطوط غير المستخدمة، الكائنات اليتيمة، وبيانات XMP المتضخمة لتقليل الحجم بأمان', badge: 'تطهير' },
    en: { title: 'Sanitize & Purge Hidden Data', description: 'Remove orphaned objects, hidden fonts, and bloated XMP metadata automatically', badge: 'Sanitize' }
  },
  'qr-reader': {
    ar: { title: 'قراءة واستخراج رموز QR', description: 'مسح وقراءة أكواد QR والباركود واستخراج الروابط والنصوص المضمنة في المستندات', badge: 'قارئ QR' },
    en: { title: 'QR Code Reader & Scanner', description: 'Scan and extract QR codes, URLs, and text from PDF pages and images', badge: 'QR Reader' }
  }
};

export const getToolMetadata = (tool: ToolType, lang: Language): ToolMetadata => {
  const entry = TOOL_DEFINITIONS_MAP[tool];
  if (entry) {
    return lang === 'ar' ? entry.ar : entry.en;
  }
  // Fallback
  return {
    title: tool,
    description: '',
    badge: tool
  };
};
