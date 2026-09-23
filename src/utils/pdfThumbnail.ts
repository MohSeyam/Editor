import * as pdfjsLib from 'pdfjs-dist';
import heic2any from 'heic2any';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  try {
    // In Vite, new URL with import.meta.url creates an asset URL or relative bundle path
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();
  } catch (err) {
    // Fallback CDN if URL constructor encounters environment constraints
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  }
}

// In-memory cache for rendered thumbnails: key -> dataUrl
const thumbnailCache = new Map<string, string>();

/**
 * Render a specific page of a PDF document as an image Data URL.
 * @param pdfData Uint8Array of the PDF
 * @param pageNumber 1-indexed page number
 * @param maxWidth Target maximum width for the thumbnail
 */
export async function renderPdfPageThumbnail(
  pdfData: Uint8Array,
  pageNumber: number = 1,
  maxWidth: number = 240
): Promise<string> {
  const cacheKey = `${pdfData.length}_${pageNumber}_${maxWidth}`;
  if (thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey)!;
  }

  try {
    // Make a copy of Uint8Array buffer if needed
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData.slice(0),
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const safePageNum = Math.max(1, Math.min(pageNumber, pdfDoc.numPages));
    const page = await pdfDoc.getPage(safePageNum);

    const initialViewport = page.getViewport({ scale: 1.0 });
    const scale = maxWidth / initialViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
      canvas: canvas,
    };

    await page.render(renderContext as any).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    
    thumbnailCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch (error) {
    console.warn(`Failed to render PDF thumbnail for page ${pageNumber}:`, error);
    // Return empty string or fallback
    return '';
  }
}

/**
 * Render a high-resolution page of a PDF document as an Image Blob (PNG / JPEG / WebP).
 */
export async function renderPdfPageToBlob(
  pdfData: Uint8Array,
  pageNumber: number = 1,
  format: 'png' | 'jpeg' | 'webp' = 'png',
  scale: number = 2.0
): Promise<Blob> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfData.slice(0),
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const safePageNum = Math.max(1, Math.min(pageNumber, pdfDoc.numPages));
  const page = await pdfDoc.getPage(safePageNum);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext('2d', { alpha: format === 'png' });
  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  if (format !== 'png') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  await page.render({
    canvasContext: ctx,
    viewport: viewport,
    canvas: canvas,
  } as any).promise;

  return new Promise((resolve, reject) => {
    let mime = 'image/png';
    let quality: number | undefined = undefined;
    if (format === 'jpeg') {
      mime = 'image/jpeg';
      quality = 0.92;
    } else if (format === 'webp') {
      mime = 'image/webp';
      quality = 0.92;
    }

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create image blob'));
      },
      mime,
      quality
    );
  });
}

export async function generateFileThumbnail(
  data: Uint8Array,
  extension: string,
  maxWidth: number = 240
): Promise<string> {
  const ext = extension.toLowerCase();
  if (ext === 'pdf') {
    return renderPdfPageThumbnail(data, 1, maxWidth);
  } else if (['heic', 'heif'].includes(ext)) {
    try {
      const rawBlob = new Blob([data]);
      const conv = await heic2any({ blob: rawBlob, toType: 'image/jpeg', quality: 0.7 });
      const resBlob = Array.isArray(conv) ? conv[0] : conv;
      return URL.createObjectURL(resBlob);
    } catch {
      return '';
    }
  } else if (ext === 'tiff' || ext === 'tif') {
    try {
      const UTIF = (await import('utif')).default;
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const ifds = UTIF.decode(buffer);
      if (ifds && ifds.length > 0) {
        const page = ifds[0];
        UTIF.decodeImage(buffer, page);
        const rgba = UTIF.toRGBA8(page);
        const canvas = document.createElement('canvas');
        canvas.width = page.width;
        canvas.height = page.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imgData = ctx.createImageData(page.width, page.height);
          imgData.data.set(rgba);
          ctx.putImageData(imgData, 0, 0);
          return canvas.toDataURL('image/jpeg', 0.8);
        }
      }
    } catch {
      return '';
    }
  } else if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'svg'].includes(ext)) {
    return new Promise((resolve) => {
      try {
        let mimeType = 'image/jpeg';
        if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'webp') mimeType = 'image/webp';
        else if (ext === 'svg') mimeType = 'image/svg+xml';
        else if (ext === 'bmp') mimeType = 'image/bmp';

        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = Math.min(maxWidth / img.width, 1);
          canvas.width = Math.floor(img.width * scale);
          canvas.height = Math.floor(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const thumbUrl = canvas.toDataURL('image/jpeg', 0.85);
            URL.revokeObjectURL(url);
            resolve(thumbUrl);
          } else {
            resolve(url);
          }
        };
        img.onerror = () => {
          resolve('');
        };
        img.src = url;
      } catch {
        resolve('');
      }
    });
  }
  return '';
}
