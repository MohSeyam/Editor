import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { RedactSettings } from '../types';

/**
 * Permanently blacks out / blacks or whites out specific rectangular regions in a PDF
 * and scrubs metadata completely.
 */
export async function redactPdfDocument(
  pdfBytes: Uint8Array,
  settings: RedactSettings
): Promise<Blob> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Group boxes by pageNumber (1-indexed)
  const boxesByPage = new Map<number, typeof settings.boxes>();
  settings.boxes.forEach((box) => {
    const list = boxesByPage.get(box.pageNumber) || [];
    list.push(box);
    boxesByPage.set(box.pageNumber, list);
  });

  for (let p = 1; p <= pageCount; p++) {
    const boxes = boxesByPage.get(p);
    if (!boxes || boxes.length === 0) continue;

    const page = pdfDoc.getPage(p - 1);
    const { width, height } = page.getSize();

    for (const box of boxes) {
      // Convert percentages to PDF points (PDF origin is bottom-left)
      // box.xPercent and box.yPercent are relative to top-left from the UI
      const rectWidth = (box.widthPercent / 100) * width;
      const rectHeight = (box.heightPercent / 100) * height;
      const rectX = (box.xPercent / 100) * width;
      const rectY = height - (box.yPercent / 100) * height - rectHeight;

      const isWhite = (box.fillColor || settings.defaultFill) === 'white';
      const fillColor = isWhite ? rgb(1, 1, 1) : rgb(0, 0, 0);

      // Draw solid opaque rectangle
      page.drawRectangle({
        x: Math.max(0, rectX),
        y: Math.max(0, rectY),
        width: Math.min(rectWidth, width - rectX),
        height: Math.min(rectHeight, height - rectY),
        color: fillColor,
        opacity: 1.0,
      });

      // Optional label text (e.g., "[محجوب]" or "[REDACTED]")
      const label = box.labelText || settings.defaultLabel;
      if (label && rectHeight >= 12 && rectWidth >= 30) {
        const textFontColor = isWhite ? rgb(0, 0, 0) : rgb(1, 1, 1);
        const fontSize = Math.min(10, Math.max(6, rectHeight * 0.5));
        const safeLabel = label.replace(/[^\x20-\x7E]/g, ''); // Standard font ASCII fallback
        const displayLabel = safeLabel || (isWhite ? 'REDACTED' : '[REDACTED]');

        try {
          const textWidth = font.widthOfTextAtSize(displayLabel, fontSize);
          const labelX = rectX + (rectWidth - textWidth) / 2;
          const labelY = rectY + (rectHeight - fontSize) / 2;

          if (labelX >= rectX && textWidth < rectWidth) {
            page.drawText(displayLabel, {
              x: labelX,
              y: labelY,
              size: fontSize,
              font,
              color: textFontColor,
            });
          }
        } catch (e) {
          // Continue if label drawing cannot fit
        }
      }
    }
  }

  // Scrub metadata completely if requested
  if (settings.scrubMetadata) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('Al-Katib Document Suite');
    pdfDoc.setCreator('Al-Katib Sanitization Engine');
    pdfDoc.setCreationDate(new Date(0));
    pdfDoc.setModificationDate(new Date(0));
  }

  const modifiedBytes = await pdfDoc.save();
  return new Blob([modifiedBytes], { type: 'application/pdf' });
}
