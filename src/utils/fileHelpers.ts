import { PDFDocument } from 'pdf-lib';
import { generateFileThumbnail } from './pdfThumbnail';
import { UploadedFile } from '../types';

export function formatFileSize(bytes: number, lang: 'ar' | 'en' = 'ar'): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizesAr = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const sizesEn = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const sizes = lang === 'ar' ? sizesAr : sizesEn;
  const formattedVal = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${formattedVal} ${sizes[i]}`;
}

export const formatBytes = (bytes: number) => formatFileSize(bytes, 'ar');

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts.pop()?.toLowerCase() || '';
}

export function getBaseFileName(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return filename;
  return filename.substring(0, lastDot);
}

export async function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export async function readFileAsText(file: File): Promise<string> {
  return await file.text();
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Ultra-fast sub-millisecond PDF page count detection without parsing the entire PDF AST.
 * Reads linearized headers or root /Pages dictionary directly from the byte stream.
 */
export function fastDetectPdfPageCount(data: Uint8Array): number | null {
  try {
    const decoder = new TextDecoder('latin1');

    // 1. Check linearized metadata near the start (first 64KB)
    const startSample = Math.min(data.length, 64 * 1024);
    const headText = decoder.decode(data.subarray(0, startSample));
    
    // /Linearized 1 ... /N <pageCount>
    const linMatch = headText.match(/\/Linearized\s+1[\s\S]{1,300}\/N\s+(\d+)/);
    if (linMatch && linMatch[1]) {
      const c = parseInt(linMatch[1], 10);
      if (c > 0 && c < 100000) return c;
    }

    // 2. Search for root /Type /Pages /Count N or /Count N /Type /Pages
    let maxCount: number | null = null;
    const pagesRegex = /\/Type\s*\/Pages[\s\S]{1,400}?\/Count\s+(\d+)|\/Count\s+(\d+)[\s\S]{1,400}?\/Type\s*\/Pages/g;
    
    let match;
    while ((match = pagesRegex.exec(headText)) !== null) {
      const numStr = match[1] || match[2];
      if (numStr) {
        const val = parseInt(numStr, 10);
        if (val > 0 && val < 100000) {
          if (maxCount === null || val > maxCount) {
            maxCount = val;
          }
        }
      }
    }

    // Also check the end of the document (last 128KB where catalog/xref dictionaries typically reside)
    if (data.length > startSample) {
      const tailSample = Math.min(data.length, 128 * 1024);
      const tailText = decoder.decode(data.subarray(data.length - tailSample));
      while ((match = pagesRegex.exec(tailText)) !== null) {
        const numStr = match[1] || match[2];
        if (numStr) {
          const val = parseInt(numStr, 10);
          if (val > 0 && val < 100000) {
            if (maxCount === null || val > maxCount) {
              maxCount = val;
            }
          }
        }
      }
    }

    if (maxCount !== null && maxCount > 0) {
      return maxCount;
    }
  } catch {
    // Fall back to complete parser
  }
  return null;
}

export async function detectPdfPageCount(data: Uint8Array): Promise<number> {
  const fast = fastDetectPdfPageCount(data);
  if (fast !== null && fast > 0) {
    return fast;
  }
  try {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true, updateMetadata: false });
    return pdfDoc.getPageCount();
  } catch (err) {
    console.warn('Could not read PDF page count:', err);
    return 1;
  }
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return u8arr;
}

export async function createUploadedFileFromFile(
  file: File,
  options?: { generateThumbnailEagerly?: boolean }
): Promise<UploadedFile> {
  const ext = getFileExtension(file.name);
  const data = await readFileAsUint8Array(file);
  let pages: number | undefined;

  if (ext === 'pdf') {
    pages = await detectPdfPageCount(data);
  }

  let thumbUrl: string | undefined;

  // Instant zero-cost thumbnail for image files via Blob URL (0 ms!)
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext)) {
    try {
      thumbUrl = URL.createObjectURL(file);
    } catch {
      // ignore
    }
  } else if (options?.generateThumbnailEagerly) {
    try {
      thumbUrl = await generateFileThumbnail(data, ext, 220);
    } catch (err) {
      console.warn('Thumbnail generation skipped:', err);
    }
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name: file.name,
    size: file.size,
    type: file.type,
    extension: ext,
    file,
    data,
    pageCount: pages,
    thumbnailUrl: thumbUrl || undefined,
  };
}

/**
 * High-performance parallel file reader with worker concurrency limiter.
 * Reads multiple files simultaneously without blocking the UI thread.
 */
export async function readMultipleUploadedFiles(
  files: File[],
  options?: {
    concurrency?: number;
    onProgress?: (loaded: number, total: number) => void;
    generateThumbnailEagerly?: boolean;
  }
): Promise<UploadedFile[]> {
  const total = files.length;
  if (total === 0) return [];
  
  const concurrency = Math.min(options?.concurrency || 6, total);
  let loadedCount = 0;
  const results: UploadedFile[] = new Array(total);

  let currentIndex = 0;

  const worker = async () => {
    while (currentIndex < total) {
      const idx = currentIndex++;
      const file = files[idx];
      try {
        const uploaded = await createUploadedFileFromFile(file, {
          generateThumbnailEagerly: options?.generateThumbnailEagerly,
        });
        results[idx] = uploaded;
      } catch (err) {
        console.error(`Error reading file ${file.name}:`, err);
      } finally {
        loadedCount++;
        options?.onProgress?.(loadedCount, total);
      }
    }
  };

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  return results.filter(Boolean);
}

/**
 * Recursively extracts all valid files from a DataTransfer event (supporting drag-and-drop folders)
 */
export async function extractFilesFromDataTransfer(
  dataTransfer: DataTransfer,
  allowedExts?: string[]
): Promise<File[]> {
  const resultFiles: File[] = [];
  const normalizedAllowed = allowedExts && allowedExts.length > 0 && !allowedExts.includes('*')
    ? allowedExts.map((e) => e.trim().replace(/^\./, '').toLowerCase())
    : null;

  const isFileAllowed = (file: File) => {
    // Ignore hidden or OS system files
    if (file.name.startsWith('.') || file.name === 'Thumbs.db' || file.name === 'desktop.ini') {
      return false;
    }
    if (!normalizedAllowed) return true;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    return normalizedAllowed.includes(ext);
  };

  const items = dataTransfer.items;
  if (items && items.length > 0) {
    const queue: any[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        if (entry) queue.push(entry);
      } else if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f && isFileAllowed(f)) resultFiles.push(f);
      }
    }

    const traverseEntry = async (entry: any) => {
      if (entry.isFile) {
        try {
          const file: File = await new Promise((resolve, reject) => {
            entry.file(resolve, reject);
          });
          if (isFileAllowed(file)) {
            resultFiles.push(file);
          }
        } catch (err) {
          console.warn('Could not read file from entry:', entry.name, err);
        }
      } else if (entry.isDirectory) {
        try {
          const dirReader = entry.createReader();
          const readBatch = async (): Promise<any[]> => {
            const entries: any[] = await new Promise((resolve, reject) => {
              dirReader.readEntries(resolve, reject);
            });
            if (entries.length > 0) {
              const nextEntries = await readBatch();
              return [...entries, ...nextEntries];
            }
            return entries;
          };
          const allEntries = await readBatch();
          await Promise.all(allEntries.map((subEntry) => traverseEntry(subEntry)));
        } catch (dirErr) {
          console.warn('Could not read directory:', entry.name, dirErr);
        }
      }
    };

    await Promise.all(queue.map((topEntry) => traverseEntry(topEntry)));

    if (resultFiles.length > 0) {
      return resultFiles;
    }
  }

  // Fallback to dataTransfer.files if items/entries yielded nothing
  if (dataTransfer.files && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const f = dataTransfer.files[i];
      if (isFileAllowed(f)) {
        resultFiles.push(f);
      }
    }
  }

  return resultFiles;
}


