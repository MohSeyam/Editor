import jsQR from 'jsqr';
import * as pdfjsLib from 'pdfjs-dist';
import { decodeImageToCanvas } from './imageFormatUtils';

export interface QrScanResult {
  text: string;
  isUrl: boolean;
  format: string;
  page?: number;
  location?: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
  };
}

/**
 * Scans an HTMLCanvasElement for QR Codes
 */
export async function scanCanvasForQr(canvas: HTMLCanvasElement): Promise<QrScanResult | null> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);

  // 1. Try native BarcodeDetector API if available
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new (window as any).BarcodeDetector({
        formats: ['qr_code', 'data_matrix', 'aztec', 'code_128', 'ean_13'],
      });
      const barcodes = await detector.detect(canvas);
      if (barcodes && barcodes.length > 0) {
        const primary = barcodes[0];
        const rawValue = primary.rawValue || '';
        const isUrl = /^https?:\/\//i.test(rawValue);
        return {
          text: rawValue,
          isUrl,
          format: primary.format || 'qr_code',
        };
      }
    } catch {
      // Fall through to jsQR
    }
  }

  // 2. Fallback to jsQR engine
  try {
    const code = jsQR(imageData.data, width, height, {
      inversionAttempts: 'attemptBoth',
    });

    if (code && code.data) {
      const text = code.data;
      const isUrl = /^https?:\/\//i.test(text);
      return {
        text,
        isUrl,
        format: 'QR_CODE',
        location: {
          topLeft: code.location.topLeftCorner,
          topRight: code.location.topRightCorner,
          bottomLeft: code.location.bottomLeftCorner,
          bottomRight: code.location.bottomRightCorner,
        },
      };
    }
  } catch (err) {
    console.warn('jsQR scanning exception:', err);
  }

  return null;
}

/**
 * Scans an image file (PNG, JPG, WebP, TIFF, HEIC, SVG, BMP) for QR codes
 */
export async function scanImageForQr(data: Uint8Array, extension: string): Promise<QrScanResult | null> {
  const canvas = await decodeImageToCanvas(data, extension);
  return scanCanvasForQr(canvas);
}

/**
 * Scans a PDF file page by page for QR codes
 */
export async function scanPdfForQr(
  pdfData: Uint8Array,
  maxPagesToScan: number = 10,
  onProgress?: (percent: number, msg: string) => void
): Promise<QrScanResult[]> {
  const results: QrScanResult[] = [];
  const loadingTask = pdfjsLib.getDocument({
    data: pdfData.slice(0),
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const pagesToCheck = Math.min(pdfDoc.numPages, maxPagesToScan);

  for (let pageNum = 1; pageNum <= pagesToCheck; pageNum++) {
    onProgress?.(
      Math.round((pageNum / pagesToCheck) * 90),
      `فحص الصفحة ${pageNum} من ${pagesToCheck} للبحث عن رموز QR...`
    );

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for crisp QR code detection

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) continue;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    } as any).promise;

    const detected = await scanCanvasForQr(canvas);
    if (detected) {
      results.push({
        ...detected,
        page: pageNum,
      });
    }
  }

  return results;
}
