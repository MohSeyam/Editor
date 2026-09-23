import { getBaseFileName } from './fileHelpers';

export interface NamingTemplateOptions {
  originalName: string;
  index: number; // 1-based index: 1, 2, 3...
  totalFiles: number;
  toolSuffix?: string;
  targetExt?: string;
}

/**
 * Applies a naming template pattern to an output file.
 * Supports tokens:
 * - {name} or [name]: Original file base name
 * - {index} or [index] or {i} or [i]: Sequential index (1, 2, 3)
 * - {0index} or [0index] or [padIndex]: Padded index (01, 02... or 001...)
 * - {date} or [date]: Current date (YYYY-MM-DD)
 * - {suffix} or [suffix]: Tool suffix (e.g. compressed, sanitized, rotated)
 */
export function applyNamingTemplate(
  template: string,
  options: NamingTemplateOptions
): string {
  const baseName = getBaseFileName(options.originalName);
  const srcExt = options.originalName.split('.').pop() || '';
  const ext = options.targetExt || srcExt;
  const rawTemplate = (template || '').trim();

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const padLength = Math.max(2, String(options.totalFiles || 10).length);
  const paddedIndex = String(options.index).padStart(padLength, '0');
  const toolSuffix = options.toolSuffix || 'processed';

  if (!rawTemplate) {
    return `${baseName}_${toolSuffix}.${ext}`;
  }

  // Check if template contains any standard placeholder
  const hasPlaceholders = /\{name\}|\[name\]|\{index\}|\[index\]|\{i\}|\[i\]|\{0index\}|\[0index\]|\{date\}|\[date\]|\{suffix\}|\[suffix\]/i.test(rawTemplate);

  let formatted = rawTemplate;

  if (hasPlaceholders) {
    formatted = formatted
      .replace(/\{name\}|\[name\]/gi, baseName)
      .replace(/\{0index\}|\[0index\]|\{padIndex\}|\[padIndex\]/gi, paddedIndex)
      .replace(/\{index\}|\[index\]|\{i\}|\[i\]/gi, String(options.index))
      .replace(/\{date\}|\[date\]/gi, dateStr)
      .replace(/\{suffix\}|\[suffix\]/gi, toolSuffix);
  } else {
    // If user provided a pure prefix/string without braces (e.g. "archive_")
    if (options.totalFiles > 1) {
      formatted = `${rawTemplate}${baseName}_${paddedIndex}`;
    } else {
      formatted = `${rawTemplate}${baseName}`;
    }
  }

  // Remove existing extension if typed by user inside template
  formatted = formatted.replace(new RegExp(`\\.${ext}$`, 'i'), '');

  // Sanitize filename for operating system compatibility
  formatted = formatted.replace(/[\\/:*?"<>|]/g, '_').trim();

  return `${formatted}.${ext}`;
}
