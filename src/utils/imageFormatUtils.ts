import UTIF from 'utif';
import heic2any from 'heic2any';

/**
 * Converts a TIFF Uint8Array into an HTMLCanvasElement
 */
export async function renderTiffToCanvas(data: Uint8Array): Promise<HTMLCanvasElement> {
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const ifds = UTIF.decode(buffer);
  if (!ifds || ifds.length === 0) {
    throw new Error('الملف لا يحتوي على صور TIFF صالحة');
  }

  const page = ifds[0];
  UTIF.decodeImage(buffer, page);
  const rgba = UTIF.toRGBA8(page);

  const canvas = document.createElement('canvas');
  canvas.width = page.width;
  canvas.height = page.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('تعذر إنشاء سياق رسم 2D');
  }

  const imgData = ctx.createImageData(page.width, page.height);
  imgData.data.set(rgba);
  ctx.putImageData(imgData, 0, 0);

  return canvas;
}

/**
 * Converts HEIC Uint8Array into a Blob or Canvas
 */
export async function renderHeicToBlob(data: Uint8Array, quality: number = 0.92): Promise<Blob> {
  const rawBlob = new Blob([data]);
  const conv = await heic2any({
    blob: rawBlob,
    toType: 'image/jpeg',
    quality,
  });
  return Array.isArray(conv) ? conv[0] : conv;
}

/**
 * General image decoder: takes any supported image (JPEG, PNG, WebP, GIF, BMP, SVG, TIFF, HEIC)
 * and returns an HTMLCanvasElement ready for PDF embedding, compression, or OCR.
 */
export async function decodeImageToCanvas(
  data: Uint8Array,
  ext: string
): Promise<HTMLCanvasElement> {
  const cleanExt = ext.toLowerCase().replace('.', '');

  if (cleanExt === 'tiff' || cleanExt === 'tif') {
    return renderTiffToCanvas(data);
  }

  let blob: Blob;
  if (cleanExt === 'heic' || cleanExt === 'heif') {
    blob = await renderHeicToBlob(data);
  } else {
    let mimeType = 'image/jpeg';
    if (cleanExt === 'png') mimeType = 'image/png';
    else if (cleanExt === 'webp') mimeType = 'image/webp';
    else if (cleanExt === 'bmp') mimeType = 'image/bmp';
    else if (cleanExt === 'svg') mimeType = 'image/svg+xml';
    else if (cleanExt === 'gif') mimeType = 'image/gif';

    blob = new Blob([data], { type: mimeType });
  }

  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject(new Error('تعذر تجهيز سياق الرسم'));
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('فشل قراءة بيانات الصورة في المتصفح'));
    };
    img.src = url;
  });
}
