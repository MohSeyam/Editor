export type ToolType = 
  | 'universal-merge'
  | 'merge' 
  | 'split' 
  | 'compare'
  | 'imposition'
  | 'pdfa'
  | 'form-builder'
  | 'toc'
  | 'redact'
  | 'mass-rename'
  | 'convert' 
  | 'image-convert'
  | 'annotate'
  | 'sign' 
  | 'encrypt' 
  | 'decrypt' 
  | 'organize' 
  | 'compress' 
  | 'watermark' 
  | 'extract-text'
  | 'page-number'
  | 'metadata'
  | 'image-compress'
  | 'flatten'
  // Specialized Offline Tools
  | 'word-to-pdf'
  | 'excel-to-pdf'
  | 'ppt-to-pdf'
  | 'pdf-to-word'
  | 'pdf-to-excel'
  | 'pdf-to-images'
  | 'images-to-pdf'
  | 'markdown-to-pdf'
  | 'markdown-to-html'
  | 'html-to-pdf'
  | 'text-to-pdf'
  | 'csv-to-excel'
  | 'json-to-pdf'
  | 'code-to-pdf'
  | 'rotate-pdf'
  | 'delete-pages'
  | 'extract-pages'
  | 'reverse-pages'
  | 'grayscale-pdf'
  | 'crop-pdf'
  | 'repair-pdf'
  | 'remove-watermark'
  | 'linearize-pdf'
  | 'qr-stamper'
  | 'barcode-stamper'
  | 'heic-to-jpg'
  | 'webp-to-png'
  | 'svg-to-pdf'
  | 'resize-image'
  | 'checksum-hasher'
  | 'base64-converter'
  | 'file-splitter'
  | 'word-to-markdown'
  | 'excel-to-markdown'
  | 'pdf-to-html'
  | 'pdf-to-svg'
  | 'markdown-to-word'
  | 'html-to-word'
  | 'batch-watermark'
  | 'metadata-wiper'
  | 'booklet-maker'
  | 'color-invert'
  | 'json-to-excel'
  | 'excel-to-json'
  | 'pdf-flatten-forms'
  | 'pdf-compress-heavy'
  | 'multi-column-pdf'
  | 'visual-compare'
  | 'sanitize'
  | 'qr-reader';

export type AppStep = 'select-tool' | 'upload' | 'options' | 'processing' | 'result';

export type Language = 'ar' | 'en';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  file: File;
  data: Uint8Array;
  previewUrl?: string;
  thumbnailUrl?: string;
  pageCount?: number;
}

export interface SplitRange {
  from: number;
  to: number;
}

export type SplitMode = 'range' | 'all' | 'custom' | 'cut';

export interface ConvertTarget {
  id: string;
  label: string;
  extension: string;
  description?: string;
}

export interface SignatureSettings {
  mode: 'draw' | 'type' | 'image';
  signatureDataUrl: string;
  typedName: string;
  fontFamily: string;
  penColor: string;
  penWidth: number;
  pageNumber: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  addDateStamp: boolean;
  dateStampText: string;
}

export interface EncryptionSettings {
  mode: 'encrypt' | 'decrypt';
  password: string;
  confirmPassword?: string;
  preventPrinting: boolean;
  preventCopying: boolean;
  preventModifying: boolean;
}

export interface PageOrganizeItem {
  pageIndex: number;
  rotation: number; // 0, 90, 180, 270
  deleted: boolean;
  thumbnailUrl?: string;
}

export interface OrganizeSettings {
  pages: PageOrganizeItem[];
}

export interface CompressSettings {
  level: 'recommended' | 'extreme' | 'low';
  namingTemplate?: string;
}

export interface PageNumberSettings {
  position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right';
  format: 'number' | 'page_of_total';
  startNumber: number;
  fontSize: number;
  color: string;
}

export interface MetadataSettings {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
}

export interface WatermarkSettings {
  text: string;
  opacity: number;
  fontSize: number;
  rotation: number;
  color: string;
}

export interface ProcessingProgress {
  percent: number;
  message: string;
}

export interface ResultItem {
  name: string;
  blob: Blob;
  url: string;
  size: number;
  type: string;
  downloadName: string;
  previewText?: string;
  text?: string;
}

export interface ImageConvertOptions {
  format: 'image/png' | 'image/jpeg' | 'image/webp';
  quality: number; // 0.1 to 1.0
  maxWidth?: number;
  backgroundColor?: string;
}

export interface PdfAnnotationItem {
  id: string;
  type: 'draw' | 'text' | 'highlight';
  pageNumber: number;
  color: string;
  strokeWidth?: number;
  points?: Array<{ x: number; y: number }>;
  text?: string;
  x?: number;
  y?: number;
  fontSize?: number;
}

export interface AppStatistics {
  totalFilesProcessed: number;
  totalPagesProcessed: number;
  totalBytesSaved: number;
  operationsCount?: Record<string, number>;
  history: Array<{ date: string; files: number; bytesSaved: number }>;
}

export interface PresetProfile {
  id: string;
  name: string;
  description?: string;
  iconName?: string;
  isCustom?: boolean;
  createdAt: number;
  tool: ToolType;
  settings: {
    compressSettings?: CompressSettings;
    imageConvertOptions?: ImageConvertOptions;
    watermarkSettings?: WatermarkSettings;
    pageNumberSettings?: PageNumberSettings;
    metadataSettings?: MetadataSettings;
    ocrOptions?: { language: string; format: 'text' | 'markdown' };
  };
}

export interface OcrOptions {
  language: 'auto' | 'ar' | 'en' | 'fr';
  format: 'text' | 'markdown';
  isHandwritten?: boolean;
  documentType?: 'standard' | 'handwritten' | 'historical' | 'table';
}

export interface OcrResult {
  text: string;
  model: string;
  pageNumber?: number;
}

export interface RedactionBox {
  id: string;
  pageNumber: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  fillColor?: 'black' | 'white';
  labelText?: string;
}

export interface RedactSettings {
  boxes: RedactionBox[];
  scrubMetadata: boolean;
  defaultFill: 'black' | 'white';
  defaultLabel?: string;
}

export interface MassRenameRule {
  mode: 'template' | 'replace' | 'numbering' | 'prefix-suffix';
  prefix?: string;
  suffix?: string;
  findText?: string;
  replaceText?: string;
  isRegex?: boolean;
  caseSensitive?: boolean;
  caseTransform?: 'none' | 'lowercase' | 'uppercase' | 'title' | 'kebab' | 'snake';
  dateStampFormat?: 'none' | 'YYYY-MM-DD' | 'YYYYMMDD' | 'YYYY-MM-DD_HHmm';
  startNumber?: number;
  numberPadding?: number;
  template?: string; // e.g. "{name}_{date}_{001}"
}

