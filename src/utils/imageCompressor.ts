import heic2any from 'heic2any';
import { getBaseFileName } from './fileHelpers';

export interface ImageCompressOptions {
  quality: number; // 0.1 to 1.0 (e.g., 0.8)
  maxDimension?: number; // e.g. 1920, 1280
  outputFormat?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export interface ImageCompressResult {
  blob: Blob;
  data: Uint8Array;
  url: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercent: number;
  width: number;
  height: number;
  downloadName: string;
}

/**
 * Loads an image from a blob or Uint8Array, decoding HEIC if needed
 */
export async function loadImageElement(
  data: Uint8Array | Blob,
  extension: string
): Promise<{ img: HTMLImageElement; originalBlob: Blob }> {
  let blob = data instanceof Blob ? data : new Blob([data]);
  const ext = extension.toLowerCase().replace('.', '');

  if (ext === 'heic' || ext === 'heif') {
    try {
      const conv = await heic2any({
        blob,
        toType: 'image/jpeg',
        quality: 0.95,
      });
      blob = Array.isArray(conv) ? conv[0] : conv;
    } catch (err: any) {
      throw new Error(`تعذر قراءة ملف HEIC: ${err?.message || 'خطأ غير معروف'}`);
    }
  }

  const url = URL.createObjectURL(blob);
  const img = new Image();

  await new Promise((resolve, reject) => {
    img.onload = () => resolve(true);
    img.onerror = (e) => reject(new Error('فشل تحميل الصورة في الذاكرة'));
    img.src = url;
  });

  return { img, originalBlob: blob };
}

/**
 * Compresses an image with smart canvas downscaling and quality tuning
 */
export async function compressImage(
  data: Uint8Array | Blob,
  fileName: string,
  options: ImageCompressOptions,
  onProgress?: (percent: number, msg: string) => void
): Promise<ImageCompressResult> {
  const ext = (fileName.split('.').pop() || 'jpg').toLowerCase();
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const originalSize = data instanceof Blob ? data.size : data.byteLength;

  onProgress?.(25, 'فك ترميز وتحليل أبعاد الصورة...');
  const { img, originalBlob } = await loadImageElement(data, ext);

  let targetWidth = img.naturalWidth || img.width;
  let targetHeight = img.naturalHeight || img.height;

  // Downscale if exceeds maxDimension
  if (options.maxDimension && (targetWidth > options.maxDimension || targetHeight > options.maxDimension)) {
    if (targetWidth >= targetHeight) {
      targetHeight = Math.round((targetHeight * options.maxDimension) / targetWidth);
      targetWidth = options.maxDimension;
    } else {
      targetWidth = Math.round((targetWidth * options.maxDimension) / targetHeight);
      targetHeight = options.maxDimension;
    }
  }

  onProgress?.(55, `تطبيق الضغط الذكي (${targetWidth}x${targetHeight})...`);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('فشل إنشاء بيئة المعالجة الرسومية');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill with white background if saving as jpeg or source had transparency
  if (options.outputFormat === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Format selection
  const outputFormat = options.outputFormat || 'image/jpeg';
  const quality = Math.max(0.1, Math.min(1.0, options.quality));

  onProgress?.(80, 'توليد الصورة المضغوطة...');
  const compressedBlob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('فشل ضغط الصورة'));
      },
      outputFormat,
      quality
    );
  });

  let finalBlob: Blob = compressedBlob;
  if (finalBlob.size >= originalSize && quality > 0.4) {
    // Second optimization pass with tighter compression to guarantee space reduction
    const tunedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), outputFormat, Math.max(0.35, quality * 0.72));
    });
    if (tunedBlob && tunedBlob.size < originalSize) {
      finalBlob = tunedBlob;
    }
  }

  const compressedArrayBuffer = await finalBlob.arrayBuffer();
  const compressedData = new Uint8Array(compressedArrayBuffer);
  const compressedSize = finalBlob.size;
  const savedBytes = Math.max(0, originalSize - compressedSize);
  const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/png': 'png',
  };
  const outExt = extMap[outputFormat] || 'jpg';
  const downloadName = `${baseName}_compressed.${outExt}`;
  const url = URL.createObjectURL(finalBlob);

  onProgress?.(100, 'اكتمل ضغط الصورة بنجاح!');

  return {
    blob: finalBlob,
    data: compressedData,
    url,
    originalSize,
    compressedSize,
    savedBytes,
    savedPercent,
    width: targetWidth,
    height: targetHeight,
    downloadName,
  };
}

export async function convertImageFileFormat(
  file: { name: string; data: Uint8Array; type: string },
  options: {
    format: 'image/png' | 'image/jpeg' | 'image/webp';
    quality: number;
    maxWidth?: number;
    backgroundColor?: string;
  },
  onProgress?: (percent: number, message: string) => void
): Promise<{
  blob: Blob;
  downloadName: string;
  size: number;
  url: string;
}> {
  onProgress?.(20, 'تحميل الصورة للمعالجة...');
  const baseName = getBaseFileName(file.name);
  const blob = new Blob([file.data], { type: file.type });
  const objectUrl = URL.createObjectURL(blob);

  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = () => resolve(true);
    img.onerror = (e) => reject(new Error('فشل فك تشفير وتنسيق الصورة'));
    img.src = objectUrl;
  });

  URL.revokeObjectURL(objectUrl);

  let targetWidth = img.naturalWidth || img.width;
  let targetHeight = img.naturalHeight || img.height;

  if (options.maxWidth && options.maxWidth > 0 && targetWidth > options.maxWidth) {
    const scale = options.maxWidth / targetWidth;
    targetWidth = options.maxWidth;
    targetHeight = Math.round(targetHeight * scale);
  }

  onProgress?.(50, 'التحويل عبر Canvas Engine...');

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('فشل إنشاء بيئة الرسم Canvas');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Background color handling
  if (options.format === 'image/jpeg' || options.backgroundColor) {
    ctx.fillStyle = options.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  onProgress?.(80, 'تصدير الصيغة المطلوبة...');

  const outBlob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('فشل استخراج الصورة بالصيغة المحددة'));
      },
      options.format,
      options.quality
    );
  });

  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  };
  const targetExt = extMap[options.format] || 'png';
  const downloadName = `${baseName}.${targetExt}`;
  const outUrl = URL.createObjectURL(outBlob);

  onProgress?.(100, 'اكتمل التحويل بنجاح!');

  return {
    blob: outBlob,
    downloadName,
    size: outBlob.size,
    url: outUrl,
  };
}

