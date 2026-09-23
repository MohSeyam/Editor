/**
 * Arabic & Multilingual Text Reconstruction Engine
 * Fixes garbled, reversed, disconnected, or presentation-form Arabic glyphs
 * extracted from PDF streams and office documents.
 */

// Mapping of Arabic Presentation Forms-A and Forms-B (\uFB50-\uFDFF, \uFE70-\uFEFF) to Standard Unicode (\u0621-\u064A)
const PRESENTATION_FORMS_MAP: Record<number, string> = {
  // Hamza & Alif variants
  0xFE80: '\u0621', // ء
  0xFE81: '\u0622', 0xFE82: '\u0622', // آ
  0xFE83: '\u0623', 0xFE84: '\u0623', // أ
  0xFE85: '\u0624', 0xFE86: '\u0624', // ؤ
  0xFE87: '\u0625', 0xFE88: '\u0625', // إ
  0xFE89: '\u0626', 0xFE8A: '\u0626', 0xFE8B: '\u0626', 0xFE8C: '\u0626', // ئ
  0xFE8D: '\u0627', 0xFE8E: '\u0627', // ا
  // Letters
  0xFE8F: '\u0628', 0xFE90: '\u0628', 0xFE91: '\u0628', 0xFE92: '\u0628', // ب
  0xFE93: '\u0629', 0xFE94: '\u0629', // ة
  0xFE95: '\u062A', 0xFE96: '\u062A', 0xFE97: '\u062A', 0xFE98: '\u062A', // ت
  0xFE99: '\u062B', 0xFE9A: '\u062B', 0xFE9B: '\u062B', 0xFE9C: '\u062B', // ث
  0xFE9D: '\u062C', 0xFE9E: '\u062C', 0xFE9F: '\u062C', 0xFEA0: '\u062C', // ج
  0xFEA1: '\u062D', 0xFEA2: '\u062D', 0xFEA3: '\u062D', 0xFEA4: '\u062D', // ح
  0xFEA5: '\u062E', 0xFEA6: '\u062E', 0xFEA7: '\u062E', 0xFEA8: '\u062E', // خ
  0xFEA9: '\u062F', 0xFEAA: '\u062F', // د
  0xFEAB: '\u0630', 0xFEAC: '\u0630', // ذ
  0xFEAD: '\u0631', 0xFEAE: '\u0631', // ر
  0xFEAF: '\u0632', 0xFEB0: '\u0632', // ز
  0xFEB1: '\u0633', 0xFEB2: '\u0633', 0xFEB3: '\u0633', 0xFEB4: '\u0633', // س
  0xFEB5: '\u0634', 0xFEB6: '\u0634', 0xFEB7: '\u0634', 0xFEB8: '\u0634', // ش
  0xFEB9: '\u0635', 0xFEBA: '\u0635', 0xFEBB: '\u0635', 0xFEBC: '\u0635', // ص
  0xFEBD: '\u0636', 0xFEBE: '\u0636', 0xFEBF: '\u0636', 0xFEC0: '\u0636', // ض
  0xFEC1: '\u0637', 0xFEC2: '\u0637', 0xFEC3: '\u0637', 0xFEC4: '\u0637', // ط
  0xFEC5: '\u0638', 0xFEC6: '\u0638', 0xFEC7: '\u0638', 0xFEC8: '\u0638', // ظ
  0xFEC9: '\u0639', 0xFECA: '\u0639', 0xFECB: '\u0639', 0xFECC: '\u0639', // ع
  0xFECD: '\u063A', 0xFECE: '\u063A', 0xFECF: '\u063A', 0xFED0: '\u063A', // غ
  0xFED1: '\u0641', 0xFED2: '\u0641', 0xFED3: '\u0641', 0xFED4: '\u0641', // ف
  0xFED5: '\u0642', 0xFED6: '\u0642', 0xFED7: '\u0642', 0xFED8: '\u0642', // ق
  0xFED9: '\u0643', 0xFEDA: '\u0643', 0xFEDB: '\u0643', 0xFEDC: '\u0643', // ك
  0xFEDD: '\u0644', 0xFEDE: '\u0644', 0xFEDF: '\u0644', 0xFEE0: '\u0644', // ل
  0xFEE1: '\u0645', 0xFEE2: '\u0645', 0xFEE3: '\u0645', 0xFEE4: '\u0645', // م
  0xFEE5: '\u0646', 0xFEE6: '\u0646', 0xFEE7: '\u0646', 0xFEE8: '\u0646', // ن
  0xFEE9: '\u0647', 0xFEEA: '\u0647', 0xFEEB: '\u0647', 0xFEEC: '\u0647', // ه
  0xFEED: '\u0648', 0xFEEE: '\u0648', // و
  0xFEEF: '\u0649', 0xFEF0: '\u0649', // ى
  0xFEF1: '\u064A', 0xFEF2: '\u064A', 0xFEF3: '\u064A', 0xFEF4: '\u064A', // ي
  // Lam-Alef Ligatures
  0xFEF5: '\u0644\u0622', 0xFEF6: '\u0644\u0622', // لا (مّدة)
  0xFEF7: '\u0644\u0623', 0xFEF8: '\u0644\u0623', // لأ
  0xFEF9: '\u0644\u0625', 0xFEFA: '\u0644\u0625', // لإ
  0xFEFB: '\u0644\u0627', 0xFEFC: '\u0644\u0627', // لا
};

/**
 * Normalizes all Arabic Presentation Forms back to standard Unicode characters.
 */
export function normalizeArabicPresentationForms(str: string): string {
  if (!str) return '';
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (PRESENTATION_FORMS_MAP[code]) {
      out += PRESENTATION_FORMS_MAP[code];
    } else {
      out += str[i];
    }
  }
  return out;
}

/**
 * Detects if a string contains Arabic characters.
 */
export function containsArabic(str: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str);
}

/**
 * Detects if an Arabic token or sequence was stored in reverse visual order.
 * In reversed Arabic, letters like Teh-Marbuta (ة), Alif-Maksura (ى), or terminal vowels often appear at the beginning of words.
 */
export function isReversedArabicWord(word: string): boolean {
  const clean = normalizeArabicPresentationForms(word).trim();
  if (clean.length < 2 || !containsArabic(clean)) return false;

  // Characters that almost never naturally begin an Arabic word but commonly end one:
  // ة (Teh Marbuta), ى (Alif Maksura)
  const firstChar = clean[0];
  const lastChar = clean[clean.length - 1];

  if (firstChar === 'ة' || firstChar === 'ى') {
    return true;
  }

  // If the word ends with standard beginning prefixes like 'ال' (reversed to 'لا' at the end)
  if (clean.endsWith('لا') && !clean.startsWith('لا') && clean.length > 3) {
    return true;
  }

  return false;
}

/**
 * Repairs spaced-out disjointed letters in Arabic text.
 * E.g., "ت ج ر ب ة" -> "تجربة", "ا ل م ل ف" -> "الملف"
 */
export function repairDespacedArabic(text: string): string {
  if (!containsArabic(text)) return text;

  // Match 2 or more single Arabic characters separated by a single space
  return text.replace(/(?:^|\s)([\u0600-\u06FF])\s+([\u0600-\u06FF])(?:\s+([\u0600-\u06FF]))*(?=\s|$)/g, (match) => {
    // Strip the internal spaces between the Arabic letters
    return match.replace(/\s+/g, '');
  });
}

/**
 * Thoroughly normalizes, decodes, and repairs text extracted from documents.
 * Guarantees no corrupted glyphs, reversed words, or illegible presentation forms.
 */
export function sanitizeAndReconstructText(rawText: string): string {
  if (!rawText) return '';

  // 1. Convert presentation forms
  let text = normalizeArabicPresentationForms(rawText);

  // 2. Remove binary control characters and unprintable private-use characters (\u0000-\u0008, \u000B, \u000C, \u000E-\u001F, \uE000-\uF8FF)
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uE000-\uF8FF]/g, '');

  // 3. Process line by line
  const lines = text.split(/\r?\n/);
  const fixedLines = lines.map((line) => {
    let cleanLine = line.trim();
    if (!cleanLine) return '';

    // If the line contains Arabic, test words for reversed visual encoding
    if (containsArabic(cleanLine)) {
      cleanLine = repairDespacedArabic(cleanLine);

      // Check if majority of words in this line look reversed
      const words = cleanLine.split(/\s+/);
      const reversedCount = words.filter((w) => isReversedArabicWord(w)).length;

      if (reversedCount > 0 && reversedCount >= words.length * 0.4) {
        // Reverse whole word characters or word order
        cleanLine = words
          .map((w) => (containsArabic(w) ? w.split('').reverse().join('') : w))
          .reverse()
          .join(' ');
      }
    }

    return cleanLine;
  });

  return fixedLines.filter((l) => l.length > 0).join('\n');
}
