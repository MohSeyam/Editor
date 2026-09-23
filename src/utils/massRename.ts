import { MassRenameRule, UploadedFile } from '../types';

export interface RenameResultItem {
  originalName: string;
  newName: string;
  file: UploadedFile;
}

/**
 * Transforms string casing according to the specified case rule
 */
export function applyCaseTransform(
  str: string,
  transform: MassRenameRule['caseTransform'] = 'none'
): string {
  if (!transform || transform === 'none') return str;

  switch (transform) {
    case 'lowercase':
      return str.toLowerCase();
    case 'uppercase':
      return str.toUpperCase();
    case 'title':
      return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
    case 'kebab':
      return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    case 'snake':
      return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
    default:
      return str;
  }
}

/**
 * Generates formatted date stamp string
 */
export function getDateStamp(format: MassRenameRule['dateStampFormat'] = 'none'): string {
  if (!format || format === 'none') return '';
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'YYYYMMDD':
      return `${year}${month}${day}`;
    case 'YYYY-MM-DD_HHmm':
      return `${year}-${month}-${day}_${hours}${minutes}`;
    default:
      return '';
  }
}

/**
 * Computes the renamed list of files based on user rules
 */
export function computeMassRename(
  files: UploadedFile[],
  rule: MassRenameRule
): RenameResultItem[] {
  const dateStr = getDateStamp(rule.dateStampFormat);
  const startNum = rule.startNumber !== undefined ? rule.startNumber : 1;
  const padding = rule.numberPadding || 3;

  return files.map((fileItem, idx) => {
    const originalName = fileItem.name;
    const dotIdx = originalName.lastIndexOf('.');
    const baseName = dotIdx !== -1 ? originalName.substring(0, dotIdx) : originalName;
    const ext = dotIdx !== -1 ? originalName.substring(dotIdx) : '';

    const currentNumber = startNum + idx;
    const numStr = String(currentNumber).padStart(padding, '0');

    let processedBase = baseName;

    switch (rule.mode) {
      case 'replace': {
        if (rule.findText) {
          try {
            if (rule.isRegex) {
              const flags = rule.caseSensitive ? 'g' : 'gi';
              const regex = new RegExp(rule.findText, flags);
              processedBase = processedBase.replace(regex, rule.replaceText || '');
            } else {
              if (rule.caseSensitive) {
                processedBase = processedBase.split(rule.findText).join(rule.replaceText || '');
              } else {
                const escaped = rule.findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escaped, 'gi');
                processedBase = processedBase.replace(regex, rule.replaceText || '');
              }
            }
          } catch (err) {
            console.warn('Regex replacement error:', err);
          }
        }
        break;
      }

      case 'prefix-suffix': {
        const p = rule.prefix || '';
        const s = rule.suffix || '';
        const d = dateStr ? `_${dateStr}` : '';
        processedBase = `${p}${processedBase}${s}${d}`;
        break;
      }

      case 'numbering': {
        const p = rule.prefix || '';
        const s = rule.suffix || '';
        processedBase = `${p}${numStr}_${processedBase}${s}`;
        break;
      }

      case 'template':
      default: {
        const template = rule.template || '{name}_{date}_{num}';
        processedBase = template
          .replace(/{name}/gi, baseName)
          .replace(/{date}/gi, dateStr || getDateStamp('YYYY-MM-DD'))
          .replace(/{num}/gi, numStr)
          .replace(/{0+1}/g, numStr);
        break;
      }
    }

    // Apply casing
    processedBase = applyCaseTransform(processedBase, rule.caseTransform);

    // Clean any invalid filename characters
    processedBase = processedBase.replace(/[<>:"/\\|?*]/g, '_').trim();
    if (!processedBase) processedBase = `file_${numStr}`;

    const newName = `${processedBase}${ext}`;

    return {
      originalName,
      newName,
      file: fileItem,
    };
  });
}
