/**
 * Client-side image format conversion using HTML5 Canvas API
 */

import { ImageConvertOptions } from '../types';
import { decodeImageToCanvas } from './imageFormatUtils';

export interface ImageConvertResult {
  blob: Blob;
  url: string;
  downloadName: string;
  originalSize: number;
  newSize: number;
  format: string;
}

export async function convertImageWithCanvas(
  file: File | { name: string; size: number; data?: Uint8Array; type?: string },
  options: ImageConvertOptions,
  onProgress?: (percent: number, message: string) => void
): Promise<ImageConvertResult> {
  onProgress?.(20, 'جارٍ تحميل وفك ترميز الصورة...');

  let rawBytes: Uint8Array;
  if ('data' in file && file.data instanceof Uint8Array) {
    rawBytes = file.data;
  } else if (file instanceof File) {
    rawBytes = new Uint8Array(await file.arrayBuffer());
  } else {
    throw new Error('بيانات الصورة غير صالحة');
  }

  const ext = (file.name.split('.').pop() || '').toLowerCase();
  
  onProgress?.(45, 'معالجة الصورة عبر محرك Canvas...');
  const sourceCanvas = await decodeImageToCanvas(rawBytes, ext);

  let targetWidth = sourceCanvas.width;
  let targetHeight = sourceCanvas.height;

  if (options.maxWidth && targetWidth > options.maxWidth) {
    const scale = options.maxWidth / targetWidth;
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;
  const ctx = finalCanvas.getContext('2d');
  if (!ctx) throw new Error('تعذر إنشاء سياق Canvas 2D');

  if (options.format === 'image/jpeg') {
    ctx.fillStyle = options.backgroundColor || '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

  onProgress?.(80, 'جارٍ تصدير الصورة بالصيغة المختارة...');

  const outBlob: Blob = await new Promise((resolve, reject) => {
    finalCanvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('فشل تحويل الصورة عبر Canvas'));
      },
      options.format,
      options.quality
    );
  });

  const outExt = options.format === 'image/png'
    ? 'png'
    : options.format === 'image/jpeg'
      ? 'jpg'
      : 'webp';

  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const downloadName = `${baseName}.${outExt}`;
  const url = URL.createObjectURL(outBlob);

  onProgress?.(100, 'اكتمل التحويل بنجاح!');

  return {
    blob: outBlob,
    url,
    downloadName,
    originalSize: file.size,
    newSize: outBlob.size,
    format: outExt,
  };
}
