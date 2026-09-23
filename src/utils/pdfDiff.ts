import * as pdfjsLib from 'pdfjs-dist';
import { sanitizeAndReconstructText } from './arabicTextEngine';

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  lineA?: string;
  lineB?: string;
  lineNumA?: number;
  lineNumB?: number;
}

export interface DiffStats {
  totalLinesA: number;
  totalLinesB: number;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  unchangedCount: number;
  similarityPercent: number;
  wordCountA: number;
  wordCountB: number;
}

export interface ExtractedPdfContent {
  fullText: string;
  pages: { pageNum: number; text: string; lines: string[] }[];
  pageCount: number;
}

interface TextItemObj {
  x: number;
  str: string;
  width: number;
}

/**
 * Extract clean textual content from each page of a PDF file using pdfjs-dist.
 */
export async function extractPdfText(pdfData: Uint8Array): Promise<ExtractedPdfContent> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfData.slice(0),
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages: { pageNum: number; text: string; lines: string[] }[] = [];
  let combinedFullText = '';

  for (let i = 1; i <= numPages; i++) {
    try {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();

      // Group items by vertical position (transform[5]) to retain line breaks accurately
      const lineMap = new Map<number, TextItemObj[]>();
      textContent.items.forEach((item: any) => {
        if (!item.str && item.str !== ' ') return;
        // Approximate Y coordinate (rounded to 3px buckets)
        const yCoord = Math.round((item.transform ? item.transform[5] : 0) / 3) * 3;
        const currentLine = lineMap.get(yCoord) || [];
        currentLine.push({
          x: item.transform ? item.transform[4] : 0,
          str: item.str,
          width: item.width || 0,
        });
        lineMap.set(yCoord, currentLine);
      });

      // Sort lines top-to-bottom (in PDF coordinate space, larger Y is at the top)
      const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
      const rawLines: string[] = [];

      for (const y of sortedY) {
        const items = lineMap.get(y) || [];
        // Sort items horizontally by X position
        items.sort((a, b) => a.x - b.x);

        let lineText = '';
        let lastEnd = -1;

        for (const it of items) {
          const itStr = it.str;
          if (!itStr) continue;

          if (lineText.length > 0 && lastEnd >= 0) {
            // If there is an evident horizontal gap, insert a single space
            const gap = it.x - lastEnd;
            if (gap > 2.0 && !lineText.endsWith(' ') && !itStr.startsWith(' ')) {
              lineText += ' ';
            }
          }
          lineText += itStr;
          lastEnd = Math.max(lastEnd, it.x + (it.width || 0));
        }

        if (lineText.trim().length > 0) {
          rawLines.push(lineText.trim());
        }
      }

      // Sanitize and reconstruct Arabic/bilingual text, repair disjointed letters, fix reversed words
      const sanitizedFullPageText = sanitizeAndReconstructText(rawLines.join('\n'));
      const pageLines = sanitizedFullPageText.split('\n').filter((l) => l.trim().length > 0);

      pages.push({
        pageNum: i,
        text: sanitizedFullPageText,
        lines: pageLines,
      });

      combinedFullText += (combinedFullText ? '\n\n' : '') + sanitizedFullPageText;
    } catch (e) {
      console.warn(`Could not extract text from page ${i}`, e);
      pages.push({
        pageNum: i,
        text: '',
        lines: [],
      });
    }
  }

  return {
    fullText: combinedFullText,
    pages,
    pageCount: numPages,
  };
}

/**
 * Perform LCS-based (Longest Common Subsequence) diff comparison between two text blocks.
 */
export function computeTextDiff(textA: string, textB: string): { diffLines: DiffLine[]; stats: DiffStats } {
  const linesA = textA ? textA.split(/\r?\n/) : [];
  const linesB = textB ? textB.split(/\r?\n/) : [];

  const wordCountA = textA ? (textA.match(/\S+/g) || []).length : 0;
  const wordCountB = textB ? (textB.match(/\S+/g) || []).length : 0;

  const n = linesA.length;
  const m = linesB.length;

  // Build DP table for LCS
  // Cap at 800 lines to maintain immediate response time; truncate gracefully if huge
  const maxLines = 800;
  const safeLinesA = linesA.slice(0, maxLines);
  const safeLinesB = linesB.slice(0, maxLines);
  const lenA = safeLinesA.length;
  const lenB = safeLinesB.length;

  const dp: number[][] = Array.from({ length: lenA + 1 }, () => new Array(lenB + 1).fill(0));

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      if (safeLinesA[i - 1].trim() === safeLinesB[j - 1].trim()) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  let i = lenA;
  let j = lenB;
  const rawDiff: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && safeLinesA[i - 1].trim() === safeLinesB[j - 1].trim()) {
      rawDiff.push({
        type: 'unchanged',
        lineA: safeLinesA[i - 1],
        lineB: safeLinesB[j - 1],
        lineNumA: i,
        lineNumB: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.push({
        type: 'added',
        lineB: safeLinesB[j - 1],
        lineNumB: j,
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawDiff.push({
        type: 'removed',
        lineA: safeLinesA[i - 1],
        lineNumA: i,
      });
      i--;
    }
  }

  // Reverse backtrack order to get natural document progression
  const diffLines = rawDiff.reverse();

  let addedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;

  for (const item of diffLines) {
    if (item.type === 'added') addedCount++;
    else if (item.type === 'removed') removedCount++;
    else if (item.type === 'unchanged') unchangedCount++;
  }

  const totalEvaluated = lenA + lenB;
  const matchedLines = unchangedCount * 2;
  const similarityPercent = totalEvaluated > 0 ? Math.round((matchedLines / totalEvaluated) * 100) : 100;

  const stats: DiffStats = {
    totalLinesA: linesA.length,
    totalLinesB: linesB.length,
    addedCount,
    removedCount,
    modifiedCount: 0,
    unchangedCount,
    similarityPercent,
    wordCountA,
    wordCountB,
  };

  return { diffLines, stats };
}
