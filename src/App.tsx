/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ToolType, 
  AppStep, 
  Language, 
  UploadedFile, 
  ProcessingProgress, 
  ResultItem,
  SplitMode,
  SplitRange,
  SignatureSettings,
  EncryptionSettings,
  PageOrganizeItem,
  CompressSettings,
  PageNumberSettings,
  MetadataSettings,
  AppStatistics,
  ImageConvertOptions,
  RedactSettings
} from './types';
import { Header } from './components/Header';
import { ToolGrid } from './components/ToolGrid';
import { FileUploadArea } from './components/FileUploadArea';
import { ToolMergeView } from './components/ToolMergeView';
import { ToolSplitView } from './components/ToolSplitView';
import { ToolConvertView } from './components/ToolConvertView';
import { ToolSignView } from './components/ToolSignView';
import { ToolEncryptView } from './components/ToolEncryptView';
import { ToolOrganizeView } from './components/ToolOrganizeView';
import { ToolCompressView } from './components/ToolCompressView';
import { ToolWatermarkView } from './components/ToolWatermarkView';
import { ToolExtractTextView } from './components/ToolExtractTextView';
import { ToolPageNumberView } from './components/ToolPageNumberView';
import { ToolMetadataView } from './components/ToolMetadataView';
import { ToolImageCompressView } from './components/ToolImageCompressView';
import { ToolFlattenView } from './components/ToolFlattenView';
import { ToolImageConvertView } from './components/ToolImageConvertView';
import { ToolAnnotateView } from './components/ToolAnnotateView';
import { ToolCompareView } from './components/ToolCompareView';
import { ToolVisualCompareView } from './components/ToolVisualCompareView';
import { ToolPdfArchiveView } from './components/ToolPdfArchiveView';
import { ToolImpositionView } from './components/ToolImpositionView';
import { ToolFormBuilderView } from './components/ToolFormBuilderView';
import { ToolTocView } from './components/ToolTocView';
import { ToolRedactView } from './components/ToolRedactView';
import { ToolMassRenameView } from './components/ToolMassRenameView';
import { ToolExtraSpecializedView } from './components/ToolExtraSpecializedView';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { PresetProfilesModal } from './components/PresetProfilesModal';
import { ProcessingStatsDashboard } from './components/ProcessingStatsDashboard';
import { SmartAutoProcessBanner } from './components/SmartAutoProcessBanner';
import { ProcessingModal } from './components/ProcessingModal';
import { ResultView } from './components/ResultView';
import { ToolSkeletonLoader } from './components/ToolSkeletonLoader';
import { RecentFilesBar } from './components/RecentFilesBar';
import { Footer } from './components/Footer';
import { Activity, Grid, Sparkles, UploadCloud, X, AlertTriangle, Unlock, Wrench, RefreshCw } from 'lucide-react';
import { PresetProfile } from './types';
import { motion, AnimatePresence } from 'motion/react';

import { 
  mergePdfsAndImages, 
  splitPdfByRanges, 
  splitPdfEachPage, 
  splitPdfAtCutPoints, 
  signPdfDocument,
  flattenPdfDocument 
} from './utils/pdfOperations';
import { convertOfficeFile } from './utils/convertOperations';
import { 
  compressImage, 
  ImageCompressOptions, 
  convertImageFileFormat 
} from './utils/imageCompressor';
import { encryptFileLocal, decryptFileLocal } from './utils/cryptoOperations';
import { processPdfOrganize, compressPdfDocument } from './utils/pdfOrganize';
import { 
  addWatermarkToPdf, 
  addPageNumbersToPdf, 
  editPdfMetadata, 
  WatermarkOptions, 
  PageNumberOptions 
} from './utils/pdfExtraFeatures';
import { convertToPdfA, ConvertToPdfAOptions } from './utils/pdfArchive';
import { processImposition, ImpositionOptions } from './utils/pdfImposition';
import { buildInteractiveForm, FormBuilderOptions } from './utils/pdfInteractiveForm';
import { generateDynamicTocMerge, DynamicTocOptions } from './utils/pdfDynamicToc';
import { redactPdfDocument } from './utils/pdfRedact';
import { getBaseFileName, createUploadedFileFromFile, readMultipleUploadedFiles } from './utils/fileHelpers';
import { applyNamingTemplate } from './utils/namingTemplate';

export default function App() {
  // Application State
  const [lang, setLang] = useState<Language>('ar');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [currentTool, setCurrentTool] = useState<ToolType | null>(null);
  const [currentStep, setCurrentStep] = useState<AppStep>('select-tool');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [progress, setProgress] = useState<ProcessingProgress>({ percent: 0, message: '' });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [appError, setAppError] = useState<string | null>(null);
  const [isToolLoading, setIsToolLoading] = useState<boolean>(false);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState<boolean>(false);
  const [batchModeActive, setBatchModeActive] = useState<boolean>(true);

  // LocalStorage processing statistics
  const [stats, setStats] = useState<AppStatistics>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('docstudio_stats');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed reading stats', e);
      }
    }
    return {
      totalFiles: 0,
      totalPages: 0,
      bytesSaved: 0,
      operationsCount: {},
    };
  });

  // LocalStorage tool preferences (e.g. compress level, watermark opacity)
  const [toolPreferences, setToolPreferences] = useState<Record<string, any>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('docstudio_tool_preferences');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  // Home screen mode
  const [homeTab, setHomeTab] = useState<'quick-box' | 'all-tools'>('quick-box');
  const [isStatsModalOpen, setIsStatsModalOpen] = useState<boolean>(false);
  const [isProfilesModalOpen, setIsProfilesModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);

  // Apply a profile
  const handleApplyProfile = (profile: PresetProfile) => {
    setIsProfilesModalOpen(false);
    setCurrentTool(profile.tool);
    if (files.length > 0) {
      setCurrentStep('options');
    } else {
      setCurrentStep('upload');
    }
  };

  // Persist stats
  useEffect(() => {
    try {
      localStorage.setItem('docstudio_stats', JSON.stringify(stats));
    } catch (e) {}
  }, [stats]);

  const recordOperationStats = (
    tool: ToolType,
    filesCount: number,
    pagesCount: number = 1,
    savedBytes: number = 0
  ) => {
    setStats((prev) => ({
      totalFiles: prev.totalFiles + filesCount,
      totalPages: prev.totalPages + pagesCount,
      bytesSaved: prev.bytesSaved + Math.max(0, savedBytes),
      operationsCount: {
        ...prev.operationsCount,
        [tool]: (prev.operationsCount[tool] || 0) + 1,
      },
    }));
  };

  const saveToolPreference = (toolKey: string, prefs: any) => {
    setToolPreferences((prev) => {
      const updated = { ...prev, [toolKey]: { ...prev[toolKey], ...prefs } };
      try {
        localStorage.setItem('docstudio_tool_preferences', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Sync dark mode class and direction with HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Handlers for Navigation & Workflow
  const handleSelectTool = (tool: ToolType) => {
    setCurrentTool(tool);
    setFiles([]);
    setResults([]);
    setAppError(null);
    if (tool === 'compare' || tool === 'visual-compare') {
      setCurrentStep('options');
    } else {
      setCurrentStep('upload');
    }
  };

  const handleSelectToolWithFiles = async (tool: ToolType, rawFiles: File[]) => {
    setCurrentTool(tool);
    setResults([]);
    setAppError(null);

    const loadedFiles = await readMultipleUploadedFiles(rawFiles);

    if (loadedFiles.length > 0) {
      setFiles(loadedFiles);
      setIsToolLoading(true);
      setCurrentStep('options');
      setTimeout(() => setIsToolLoading(false), 240);
    } else {
      setFiles([]);
      setCurrentStep('upload');
    }
  };

  const handleResetToHome = () => {
    setCurrentTool(null);
    setFiles([]);
    setResults([]);
    setAppError(null);
    setCurrentStep('select-tool');
  };

  // Tool Chaining Handler: Send result directly into another tool
  const handleChainTool = async (item: ResultItem, targetTool: ToolType) => {
    try {
      setIsProcessing(true);
      setProgress({ percent: 35, message: lang === 'ar' ? 'جارٍ تهيئة الملف للأداة التالية...' : 'Chaining file to next tool...' });
      
      const fileName = item.downloadName || 'document.pdf';
      const file = new File([item.blob], fileName, { type: item.blob.type || item.type || 'application/pdf' });
      const uploaded = await createUploadedFileFromFile(file, { generateThumbnailEagerly: true });
      
      setFiles([uploaded]);
      setCurrentTool(targetTool);
      setResults([]);
      setIsProcessing(false);
      setCurrentStep('options');
    } catch (err) {
      console.error('Failed to chain tool:', err);
      setIsProcessing(false);
      setAppError(lang === 'ar' ? 'تعذر نقل الملف إلى الأداة التالية' : 'Failed to chain file to next tool');
    }
  };

  // Global Window Drag & Drop
  const [isGlobalDragging, setIsGlobalDragging] = useState<boolean>(false);
  const dragCounterRef = useRef<number>(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current += 1;
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setIsGlobalDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        setIsGlobalDragging(false);
        dragCounterRef.current = 0;
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleGlobalDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsGlobalDragging(false);
      dragCounterRef.current = 0;

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const droppedFiles = Array.from(e.dataTransfer.files);
        if (currentTool && (currentStep === 'upload' || currentStep === 'options')) {
          const processed = await readMultipleUploadedFiles(droppedFiles, { generateThumbnailEagerly: true });
          setFiles((prev) => [...prev, ...processed]);
        } else {
          const first = droppedFiles[0];
          const ext = first.name.split('.').pop()?.toLowerCase() || '';
          let target: ToolType = 'merge';
          if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'svg'].includes(ext)) {
            target = droppedFiles.length > 1 ? 'images-to-pdf' : 'image-convert';
          } else if (['docx', 'doc'].includes(ext)) {
            target = 'word-to-pdf';
          } else if (['xlsx', 'xls'].includes(ext)) {
            target = 'excel-to-pdf';
          } else if (['pptx', 'ppt'].includes(ext)) {
            target = 'ppt-to-pdf';
          } else if (['md', 'markdown'].includes(ext)) {
            target = 'markdown-to-pdf';
          } else if (['txt'].includes(ext)) {
            target = 'text-to-pdf';
          }
          await handleSelectToolWithFiles(target, droppedFiles);
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleGlobalDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleGlobalDrop);
    };
  }, [currentTool, currentStep]);

  // Keyboard Shortcuts Registration
  useKeyboardShortcuts({
    onHome: handleResetToHome,
    onToggleTheme: () => setIsDarkMode((prev) => !prev),
    onToggleLanguage: () => setLang((prev) => (prev === 'ar' ? 'en' : 'ar')),
    onOpenStats: () => setIsStatsModalOpen(true),
    onOpenTools: () => setIsToolsModalOpen(true),
    onOpenShortcuts: () => setIsShortcutsModalOpen(true),
    onBack: () => {
      if (currentStep === 'options') setCurrentStep('upload');
      else if (currentStep === 'upload' || currentStep === 'result') handleResetToHome();
    },
  });

  const handleFilesUploadContinue = () => {
    if (files.length === 0) return;
    setIsToolLoading(true);
    setCurrentStep('options');
    setTimeout(() => setIsToolLoading(false), 240);
  };

  // --- OPERATION 1: MERGE ---
  const handleExecuteMerge = async (outputName: string) => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProgress({ percent: 10, message: 'بدء دمج الملفات...' });
    setAppError(null);

    try {
      const itemsToMerge = files.map((f) => ({
        name: f.name,
        data: f.data,
        extension: f.extension,
      }));

      const mergedBytes = await mergePdfsAndImages(itemsToMerge, (pct, msg) => {
        setProgress({ percent: pct, message: msg });
      });

      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const safeName = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`;

      setResults([
        {
          name: safeName,
          blob,
          url,
          size: blob.size,
          type: 'application/pdf',
          downloadName: safeName,
        },
      ]);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Merge error:', err);
      setAppError(err.message || 'فشل دمج الملفات');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OPERATION 2: SPLIT ---
  const handleExecuteSplit = async (
    mode: SplitMode,
    ranges: SplitRange[],
    cutPoints: number[]
  ) => {
    if (files.length === 0) return;
    const targetFile = files[0];
    const baseName = getBaseFileName(targetFile.name);

    setIsProcessing(true);
    setProgress({ percent: 10, message: 'بدء تقسيم المستند...' });
    setAppError(null);

    try {
      let splitOutputs: Array<{ name: string; data: Uint8Array }> = [];

      if (mode === 'all') {
        splitOutputs = await splitPdfEachPage(targetFile.data, baseName, (pct, msg) => {
          setProgress({ percent: pct, message: msg });
        });
      } else if (mode === 'cut') {
        splitOutputs = await splitPdfAtCutPoints(targetFile.data, cutPoints, baseName, (pct, msg) => {
          setProgress({ percent: pct, message: msg });
        });
      } else {
        splitOutputs = await splitPdfByRanges(targetFile.data, ranges, baseName, (pct, msg) => {
          setProgress({ percent: pct, message: msg });
        });
      }

      const resList: ResultItem[] = splitOutputs.map((item) => {
        const blob = new Blob([item.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        return {
          name: item.name,
          blob,
          url,
          size: blob.size,
          type: 'application/pdf',
          downloadName: item.name,
        };
      });

      setResults(resList);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Split error:', err);
      setAppError(err.message || 'فشل تقسيم المستند');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OPERATION 3: CONVERT ---
  const handleExecuteConvert = async (
    targetFormat: string, 
    options: { quality: string },
    selectedFiles?: UploadedFile[]
  ) => {
    const filesToProcess = selectedFiles && selectedFiles.length > 0 ? selectedFiles : files;
    if (filesToProcess.length === 0) return;
    setIsProcessing(true);
    setAppError(null);

    try {
      const outputResults: ResultItem[] = [];
      const total = filesToProcess.length;

      for (let i = 0; i < total; i++) {
        const targetFile = filesToProcess[i];
        const stepBase = Math.round((i / total) * 100);
        setProgress({
          percent: stepBase,
          message: total > 1
            ? `تحويل ${targetFile.name} (${i + 1}/${total})...`
            : 'جارٍ بدء التحويل...'
        });

        const conversion = await convertOfficeFile(
          targetFile.file,
          targetFile.data,
          targetFormat,
          options,
          (pct, msg) => {
            const scaled = stepBase + Math.round((pct / 100) * (100 / total));
            setProgress({ percent: Math.min(scaled, 99), message: `${targetFile.name}: ${msg}` });
          }
        );

        const url = URL.createObjectURL(conversion.blob);
        outputResults.push({
          name: conversion.downloadName,
          blob: conversion.blob,
          url,
          size: conversion.blob.size,
          type: conversion.mimeType,
          downloadName: conversion.downloadName,
        });
      }

      setResults(outputResults);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Convert error:', err);
      setAppError(err.message || 'فشل تحويل الملفات');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OPERATION 4: SIGN ---
  const handleExecuteSign = async (signatureDataUrl: string, settings: SignatureSettings) => {
    if (files.length === 0) return;
    const targetFile = files[0];
    const baseName = getBaseFileName(targetFile.name);

    setIsProcessing(true);
    setProgress({ percent: 15, message: 'بدء توقيع المستند...' });
    setAppError(null);

    try {
      const signedBytes = await signPdfDocument(
        targetFile.data,
        signatureDataUrl,
        {
          pageIndex: settings.pageNumber - 1,
          xPercent: settings.xPercent,
          yPercent: settings.yPercent,
          widthPercent: settings.widthPercent,
          heightPercent: settings.heightPercent,
          addDateStamp: settings.addDateStamp,
          dateText: settings.dateStampText,
        },
        (pct, msg) => {
          setProgress({ percent: pct, message: msg });
        }
      );

      const blob = new Blob([signedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const downloadName = `${baseName}_signed.pdf`;

      setResults([
        {
          name: downloadName,
          blob,
          url,
          size: blob.size,
          type: 'application/pdf',
          downloadName,
        },
      ]);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Sign error:', err);
      setAppError(err.message || 'فشل توقيع المستند');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OPERATION 5: ENCRYPT / DECRYPT ---
  const handleExecuteEncrypt = async (settings: EncryptionSettings) => {
    if (files.length === 0) return;
    const targetFile = files[0];

    setIsProcessing(true);
    setAppError(null);

    try {
      if (settings.mode === 'encrypt') {
        setProgress({ percent: 30, message: 'جارٍ التشفير بمفتاح AES-256...' });
        const encryptedBlob = await encryptFileLocal(
          targetFile.data,
          targetFile.name,
          targetFile.type,
          settings.password,
          {
            preventPrinting: settings.preventPrinting,
            preventCopying: settings.preventCopying,
            preventModifying: settings.preventModifying,
          }
        );

        const downloadName = `${targetFile.name}.locked`;
        const url = URL.createObjectURL(encryptedBlob);
        setResults([
          {
            name: downloadName,
            blob: encryptedBlob,
            url,
            size: encryptedBlob.size,
            type: 'application/octet-stream',
            downloadName,
          },
        ]);
      } else {
        setProgress({ percent: 30, message: 'جارٍ التحقق من كلمة المرور وفك القفل...' });
        const decrypted = await decryptFileLocal(targetFile.data, settings.password);

        const restoredBlob = new Blob([decrypted.data], { type: decrypted.mimeType });
        const url = URL.createObjectURL(restoredBlob);
        const downloadName = decrypted.filename.startsWith('decrypted_')
          ? decrypted.filename
          : `unlocked_${decrypted.filename}`;

        setResults([
          {
            name: downloadName,
            blob: restoredBlob,
            url,
            size: restoredBlob.size,
            type: decrypted.mimeType,
            downloadName,
          },
        ]);
      }

      setCurrentStep('result');
    } catch (err: any) {
      console.error('Crypto error:', err);
      setAppError(err.message || 'فشلت معالجة التشفير أو فك القفل (تأكد من صحة كلمة المرور)');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OPERATION 6: ORGANIZE PAGES ---
  const handleExecuteOrganize = async (pages: PageOrganizeItem[]) => {
    if (files.length === 0) return;
    const targetFile = files[0];
    const baseName = getBaseFileName(targetFile.name);

    setIsProcessing(true);
    setProgress({ percent: 20, message: 'جارٍ تنظيم وتدوير صفحات المستند...' });
    setAppError(null);

    try {
      const organizedBytes = await processPdfOrganize(targetFile.data, pages);
      const blob = new Blob([organizedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const downloadName = `${baseName}_organized.pdf`;

      setResults([
        {
          name: downloadName,
          blob,
          url,
          size: blob.size,
          type: 'application/pdf',
          downloadName,
        },
      ]);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Organize error:', err);
      setAppError(err.message || 'فشلت معالجة صفحات المستند');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OPERATION 7: COMPRESS PDF ---
  const handleExecuteCompress = async (
    settings: CompressSettings,
    selectedFiles?: UploadedFile[]
  ) => {
    const filesToProcess = selectedFiles && selectedFiles.length > 0 ? selectedFiles : files;
    if (filesToProcess.length === 0) return;
    setIsProcessing(true);
    setAppError(null);

    try {
      const outputResults: ResultItem[] = [];
      const total = filesToProcess.length;
      let totalSavedBytes = 0;
      let totalPagesProcessed = 0;

      for (let i = 0; i < total; i++) {
        const targetFile = filesToProcess[i];
        const baseName = getBaseFileName(targetFile.name);
        const stepBase = Math.round((i / total) * 100);

        const compressedBytes = await compressPdfDocument(
          targetFile.data,
          settings.level,
          (pct, msg) => {
            const scaled = stepBase + Math.round((pct / 100) * (100 / total));
            setProgress({
              percent: Math.min(scaled, 99),
              message: total > 1 ? `[${i + 1}/${total}] ${targetFile.name}: ${msg}` : msg,
            });
          }
        );

        const blob = new Blob([compressedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const downloadName = applyNamingTemplate(settings.namingTemplate || '', {
          originalName: targetFile.name,
          index: i + 1,
          totalFiles: total,
          toolSuffix: 'compressed',
          targetExt: 'pdf',
        });
        const saved = Math.max(0, targetFile.size - blob.size);
        totalSavedBytes += saved;
        totalPagesProcessed += targetFile.pageCount || 1;

        outputResults.push({
          name: downloadName,
          blob,
          url,
          size: blob.size,
          type: 'application/pdf',
          downloadName,
        });
      }

      recordOperationStats('compress', filesToProcess.length, totalPagesProcessed, totalSavedBytes);
      setResults(outputResults);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Compress error:', err);
      setAppError(err.message || 'فشل ضغط ملفات PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OPERATION 8: WATERMARK ---
  const handleExecuteWatermark = async (options: WatermarkOptions) => {
    if (files.length === 0) return;
    const targetFile = files[0];
    const baseName = getBaseFileName(targetFile.name);

    setIsProcessing(true);
    setProgress({ percent: 15, message: 'تطبيق العلامة المائية...' });
    setAppError(null);

    try {
      const watermarkedBytes = await addWatermarkToPdf(targetFile.data, options, (pct, msg) => {
        setProgress({ percent: pct, message: msg });
      });

      const blob = new Blob([watermarkedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const downloadName = `${baseName}_watermarked.pdf`;

      setResults([
        {
          name: downloadName,
          blob,
          url,
          size: blob.size,
          type: 'application/pdf',
          downloadName,
        },
      ]);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Watermark error:', err);
      setAppError(err.message || 'فشل تطبيق العلامة المائية');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OPERATION 9: PAGE NUMBERS ---
  const handleExecutePageNumber = async (settings: PageNumberSettings) => {
    if (files.length === 0) return;
    const targetFile = files[0];
    const baseName = getBaseFileName(targetFile.name);

    setIsProcessing(true);
    setProgress({ percent: 15, message: 'ترقيم صفحات المستند...' });
    setAppError(null);

    try {
      const numberedBytes = await addPageNumbersToPdf(targetFile.data, settings, (pct, msg) => {
        setProgress({ percent: pct, message: msg });
      });

      const blob = new Blob([numberedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const downloadName = `${baseName}_numbered.pdf`;

      setResults([
        {
          name: downloadName,
          blob,
          url,
          size: blob.size,
          type: 'application/pdf',
          downloadName,
        },
      ]);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Page number error:', err);
      setAppError(err.message || 'فشل ترقيم صفحات المستند');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OPERATION 10: METADATA ---
  const handleExecuteMetadata = async (settings: MetadataSettings) => {
    if (files.length === 0) return;
    const targetFile = files[0];
    const baseName = getBaseFileName(targetFile.name);

    setIsProcessing(true);
    setProgress({ percent: 20, message: 'تحديث بيانات المستند...' });
    setAppError(null);

    try {
      const updatedBytes = await editPdfMetadata(targetFile.data, settings, (pct, msg) => {
        setProgress({ percent: pct, message: msg });
      });

      const blob = new Blob([updatedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const downloadName = `${baseName}_updated.pdf`;

      setResults([
        {
          name: downloadName,
          blob,
          url,
          size: blob.size,
          type: 'application/pdf',
          downloadName,
        },
      ]);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Metadata error:', err);
      setAppError(err.message || 'فشل تحديث بيانات المستند');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OPERATION 11: IMAGE COMPRESS ---
  const handleExecuteImageCompress = async (options: ImageCompressOptions) => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setAppError(null);

    try {
      const outputResults: ResultItem[] = [];
      const total = files.length;

      for (let i = 0; i < total; i++) {
        const targetFile = files[i];
        const stepBase = Math.round((i / total) * 100);

        setProgress({
          percent: stepBase,
          message: total > 1
            ? `ضغط الصورة ${targetFile.name} (${i + 1}/${total})...`
            : 'بدء الضغط الذكي للصورة...'
        });

        const compressedResult = await compressImage(
          targetFile.file,
          targetFile.name,
          options,
          (pct, msg) => {
            const scaled = stepBase + Math.round((pct / 100) * (100 / total));
            setProgress({ percent: Math.min(scaled, 99), message: `${targetFile.name}: ${msg}` });
          }
        );

        outputResults.push({
          name: compressedResult.downloadName,
          blob: compressedResult.blob,
          url: compressedResult.url,
          size: compressedResult.compressedSize,
          type: compressedResult.blob.type,
          downloadName: compressedResult.downloadName,
        });
      }

      setResults(outputResults);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Image compress error:', err);
      setAppError(err.message || 'فشل ضغط الصور');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OPERATION 12: FLATTEN PDF ---
  const handleExecuteFlatten = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setAppError(null);

    try {
      const outputResults: ResultItem[] = [];
      const total = files.length;

      for (let i = 0; i < total; i++) {
        const targetFile = files[i];
        const baseName = getBaseFileName(targetFile.name);
        const stepBase = Math.round((i / total) * 100);

        setProgress({
          percent: stepBase,
          message: total > 1
            ? `تسطيح ${targetFile.name} (${i + 1}/${total})...`
            : 'بدء تسطيح وتأمين المستند...'
        });

        const flattenedBytes = await flattenPdfDocument(targetFile.data, (pct, msg) => {
          const scaled = stepBase + Math.round((pct / 100) * (100 / total));
          setProgress({ percent: Math.min(scaled, 99), message: `${targetFile.name}: ${msg}` });
        });

        const blob = new Blob([flattenedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const downloadName = `${baseName}_flattened.pdf`;

        outputResults.push({
          name: downloadName,
          blob,
          url,
          size: blob.size,
          type: 'application/pdf',
          downloadName,
        });
      }

      recordOperationStats('flatten', files.length, files.length, 0);
      setResults(outputResults);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Flatten error:', err);
      setAppError(err.message || 'فشل تسطيح المستندات');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OPERATION 13: IMAGE CONVERT ---
  const handleExecuteImageConvert = async (options: ImageConvertOptions) => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setAppError(null);

    try {
      const outputResults: ResultItem[] = [];
      const total = files.length;

      for (let i = 0; i < total; i++) {
        const targetFile = files[i];
        const stepBase = Math.round((i / total) * 100);

        setProgress({
          percent: stepBase,
          message: total > 1
            ? `تحويل الصورة ${targetFile.name} (${i + 1}/${total})...`
            : 'بدء تحويل صيغة الصورة...'
        });

        const conv = await convertImageFileFormat(
          { name: targetFile.name, data: targetFile.data, type: targetFile.type },
          options,
          (pct, msg) => {
            const scaled = stepBase + Math.round((pct / 100) * (100 / total));
            setProgress({ percent: Math.min(scaled, 99), message: `${targetFile.name}: ${msg}` });
          }
        );

        outputResults.push({
          name: conv.downloadName,
          blob: conv.blob,
          url: conv.url,
          size: conv.size,
          type: conv.blob.type,
          downloadName: conv.downloadName,
        });
      }

      recordOperationStats('image-convert', files.length, files.length, 0);
      saveToolPreference('image-convert', { format: options.format, quality: options.quality });
      setResults(outputResults);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Image convert error:', err);
      setAppError(err.message || 'فشل تحويل صيغة الصور');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OPERATION 14: PDF/A CONFORMANCE ---
  const handleExecutePdfArchive = async (options: ConvertToPdfAOptions) => {
    if (files.length === 0) return;
    const targetFile = files[0];
    const baseName = getBaseFileName(targetFile.name);

    setIsProcessing(true);
    setProgress({ percent: 10, message: 'بدء فحص ومطابقة مواصفات PDF/A الأرشيفية...' });
    setAppError(null);

    try {
      const { pdfBytes } = await convertToPdfA(targetFile.data, options, (pct, msg) => {
        setProgress({ percent: pct, message: msg });
      });

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const downloadName = `${baseName}_${options.standard.replace('/', '_')}.pdf`;

      recordOperationStats('pdfa', 1, targetFile.pageCount || 1, 0);
      setResults([
        {
          name: downloadName,
          blob,
          url,
          size: blob.size,
          type: 'application/pdf',
          downloadName,
        },
      ]);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('PDF/A error:', err);
      setAppError(err.message || 'فشل التحويل لمعايير الأرشفة القياسية');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OPERATION 15: IMPOSITION & BOOKLET ---
  const handleExecuteImposition = async (options: ImpositionOptions) => {
    if (files.length === 0) return;
    const targetFile = files[0];
    const baseName = getBaseFileName(targetFile.name);

    setIsProcessing(true);
    setProgress({ percent: 10, message: 'بدء تجميد وفرز الصفحات للطباعة...' });
    setAppError(null);

    try {
      const outBytes = await processImposition(targetFile.data, options, (pct, msg) => {
        setProgress({ percent: pct, message: msg });
      });

      const blob = new Blob([outBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const downloadName = `${baseName}_${options.mode}.pdf`;

      recordOperationStats('imposition', 1, targetFile.pageCount || 1, 0);
      setResults([
        {
          name: downloadName,
          blob,
          url,
          size: blob.size,
          type: 'application/pdf',
          downloadName,
        },
      ]);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Imposition error:', err);
      setAppError(err.message || 'فشل تجميد وفرز المستند للطباعة');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OPERATION 16: FORM BUILDER ---
  const handleExecuteFormBuilder = async (options: FormBuilderOptions) => {
    if (files.length === 0) return;
    const targetFile = files[0];
    const baseName = getBaseFileName(targetFile.name);

    setIsProcessing(true);
    setProgress({ percent: 10, message: 'بدء حقن وتوليد الحقول التفاعلية...' });
    setAppError(null);

    try {
      const outBytes = await buildInteractiveForm(targetFile.data, options, (pct, msg) => {
        setProgress({ percent: pct, message: msg });
      });

      const blob = new Blob([outBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const downloadName = `${baseName}_interactive_form.pdf`;

      recordOperationStats('form-builder', 1, targetFile.pageCount || 1, 0);
      setResults([
        {
          name: downloadName,
          blob,
          url,
          size: blob.size,
          type: 'application/pdf',
          downloadName,
        },
      ]);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Form builder error:', err);
      setAppError(err.message || 'فشل تحويل النموذج إلى صيغة تفاعلية');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OPERATION 17: DYNAMIC TOC MERGE ---
  const handleExecuteToc = async (options: DynamicTocOptions) => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress({ percent: 10, message: 'بدء دمج المستندات وبناء الفهرس التفاعلي...' });
    setAppError(null);

    try {
      const items = files.map((f) => ({
        title: f.name.replace(/\.[^/.]+$/, ''),
        pdfBytes: f.data,
      }));

      const outBytes = await generateDynamicTocMerge(items, options, (pct, msg) => {
        setProgress({ percent: pct, message: msg });
      });

      const blob = new Blob([outBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const downloadName = `DocStudio_Merged_with_TOC_${Date.now()}.pdf`;

      const totalPages = files.reduce((acc, f) => acc + (f.pageCount || 1), 0);
      recordOperationStats('toc', files.length, totalPages, 0);
      setResults([
        {
          name: downloadName,
          blob,
          url,
          size: blob.size,
          type: 'application/pdf',
          downloadName,
        },
      ]);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Dynamic TOC error:', err);
      setAppError(err.message || 'فشل الدمج وبناء الفهرس التفاعلي');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OPERATION 21: PERMANENT REDACTION & SANITIZATION ---
  const handleExecuteRedact = async (settings: RedactSettings) => {
    if (!files[0]) return;
    try {
      setIsProcessing(true);
      setProgress({
        percent: 30,
        message: lang === 'ar' ? 'جارٍ حجب المناطق المحددة وتطهير البيانات الوصفية...' : 'Applying redactions & sanitizing metadata...',
      });

      const redactedBlob = await redactPdfDocument(files[0].data, settings);

      setProgress({
        percent: 90,
        message: lang === 'ar' ? 'جارٍ إنهاء المستند الآمن...' : 'Finalizing sanitized PDF...',
      });

      const downloadName = files[0].name.replace(/\.[^/.]+$/, '') + '_Redacted.pdf';
      recordOperationStats('redact', 1, files[0].pageCount || 1, 0);

      setResults([
        {
          name: downloadName,
          blob: redactedBlob,
          url: URL.createObjectURL(redactedBlob),
          size: redactedBlob.size,
          type: 'application/pdf',
          downloadName,
        },
      ]);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Redaction error:', err);
      setAppError(err.message || (lang === 'ar' ? 'فشل حجب المستند وتطهيره' : 'Failed to redact document'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfd] dark:bg-[#000000] text-neutral-900 dark:text-neutral-100 selection:bg-blue-500/20 selection:text-blue-600 transition-colors duration-300">
      {/* Sticky Frosted Navigation */}
      <Header
        lang={lang}
        onToggleLang={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        currentTool={currentTool}
        currentStep={currentStep}
        onResetToHome={handleResetToHome}
        onOpenStats={() => setIsStatsModalOpen(true)}
        onOpenProfiles={() => setIsProfilesModalOpen(true)}
        onOpenTools={() => setIsToolsModalOpen(true)}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
      />

      {/* Main Work Area */}
      <main className={currentStep === 'select-tool' ? "flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 flex flex-col justify-center items-center overflow-hidden" : "flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"}>
        {/* Global Smart Error Notice with Actionable Solutions */}
        {appError && (
          <div className="w-full max-w-3xl mx-auto my-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-sm shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    {lang === 'ar' ? 'حدث خطأ أثناء معالجة الملف' : 'An error occurred while processing'}
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {appError}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAppError(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Smart Actionable Solutions */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-500/15">
              <span className="text-[11px] font-medium text-neutral-500">
                {lang === 'ar' ? 'حلول مقترحة:' : 'Suggested solutions:'}
              </span>

              {(appError.toLowerCase().includes('password') || appError.includes('كلمة') || appError.includes('تشفير') || appError.includes('مشفر')) && (
                <button
                  onClick={() => {
                    setAppError(null);
                    setCurrentTool('decrypt');
                    setCurrentStep('options');
                  }}
                  className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'فك تشفير المستند' : 'Unlock Document'}</span>
                </button>
              )}

              {(appError.toLowerCase().includes('corrupt') || appError.includes('تالف') || appError.includes('تلف') || appError.includes('خطأ')) && (
                <button
                  onClick={() => {
                    setAppError(null);
                    setCurrentTool('repair-pdf');
                    setCurrentStep('options');
                  }}
                  className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'إصلاح وترميم الملف' : 'Repair File'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  setAppError(null);
                  if (files.length > 0) {
                    setCurrentStep('options');
                  } else {
                    handleResetToHome();
                  }
                }}
                className="px-3 py-1 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1: SELECT TOOL (HOME) - REBUILT COMPREHENSIVE WORKSPACE */}
          {currentStep === 'select-tool' && (
            <motion.div
              key="select-tool"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex flex-col items-center py-3 space-y-8"
            >
              {/* HERO BRANDING & CLEAN MINIMALIST HEADER */}
              <div className="text-center space-y-1.5 max-w-2xl mx-auto px-4 pt-1">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                  {lang === 'ar' ? 'المحرر' : 'Editor'}
                </h1>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                  {lang === 'ar' 
                    ? 'معالجة الملفات والمستندات محلياً بخصوصية تامة' 
                    : 'Process and convert files securely on your device'}
                </p>
              </div>

              {/* QUICK SMART DROPZONE */}
              <div className="w-full max-w-4xl mx-auto px-4">
                <SmartAutoProcessBanner
                  lang={lang}
                  onSelectToolWithFiles={handleSelectToolWithFiles}
                  onOpenToolsModal={() => setIsToolsModalOpen(true)}
                />
              </div>

              {/* QUICK HISTORY & RECENT FILES BAR */}
              <div className="w-full max-w-4xl mx-auto px-4">
                <RecentFilesBar lang={lang} />
              </div>

              {/* FULL 60+ TOOLS CATALOG & INTEGRATED PRESET WORKFLOWS */}
              <ToolGrid
                lang={lang}
                onSelectTool={handleSelectTool}
                onSelectToolWithFiles={handleSelectToolWithFiles}
                onApplyProfile={handleApplyProfile}
                onOpenCustomProfileCreator={() => setIsProfilesModalOpen(true)}
              />
            </motion.div>
          )}

          {/* STEP 2: FILE UPLOAD */}
          {currentStep === 'upload' && currentTool && (
            <motion.div
              key={`upload-${currentTool}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <FileUploadArea
                tool={currentTool}
                lang={lang}
                files={files}
                onFilesChange={setFiles}
                onContinue={handleFilesUploadContinue}
                onBack={handleResetToHome}
              />
            </motion.div>
          )}

          {/* STEP 3: OPTIONS & PREVIEW ACCORDING TO TOOL */}
          {currentStep === 'options' && currentTool && (
            <motion.div
              key={`options-${currentTool}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              {isToolLoading ? (
                <ToolSkeletonLoader lang={lang} />
              ) : (
                <>
                  {(currentTool === 'merge' || currentTool === 'universal-merge') && (
                    <ToolMergeView
                      files={files}
                      lang={lang}
                      onFilesChange={setFiles}
                      onExecute={handleExecuteMerge}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {currentTool === 'split' && files[0] && (
                    <ToolSplitView
                      file={files[0]}
                      lang={lang}
                      onExecute={handleExecuteSplit}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {currentTool === 'convert' && files[0] && (
                    <ToolConvertView
                      file={files[0]}
                      files={files}
                      lang={lang}
                      onExecute={handleExecuteConvert}
                      onBack={() => setCurrentStep('upload')}
                      isBatchMode={batchModeActive}
                      onToggleBatchMode={setBatchModeActive}
                    />
                  )}

                  {currentTool === 'sign' && files[0] && (
                    <ToolSignView
                      file={files[0]}
                      lang={lang}
                      onExecute={handleExecuteSign}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {(currentTool === 'encrypt' || currentTool === 'decrypt') && files[0] && (
                    <ToolEncryptView
                      file={files[0]}
                      lang={lang}
                      initialMode={currentTool === 'decrypt' ? 'decrypt' : undefined}
                      onExecute={handleExecuteEncrypt}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {currentTool === 'organize' && files[0] && (
                    <ToolOrganizeView
                      file={files[0]}
                      lang={lang}
                      onExecute={handleExecuteOrganize}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {(currentTool === 'compress' || currentTool === 'pdf-compress-heavy') && files[0] && (
                    <ToolCompressView
                      file={files[0]}
                      files={files}
                      lang={lang}
                      initialLevel={currentTool === 'pdf-compress-heavy' ? 'extreme' : 'recommended'}
                      onExecute={handleExecuteCompress}
                      onBack={() => setCurrentStep('upload')}
                      isBatchMode={batchModeActive}
                      onToggleBatchMode={setBatchModeActive}
                    />
                  )}

                  {(currentTool === 'watermark' || currentTool === 'batch-watermark') && files[0] && (
                    <ToolWatermarkView
                      file={files[0]}
                      lang={lang}
                      onExecute={handleExecuteWatermark}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {currentTool === 'extract-text' && files[0] && (
                    <ToolExtractTextView
                      file={files[0]}
                      lang={lang}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {currentTool === 'page-number' && files[0] && (
                    <ToolPageNumberView
                      file={files[0]}
                      lang={lang}
                      onExecute={handleExecutePageNumber}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {currentTool === 'metadata' && files[0] && (
                    <ToolMetadataView
                      file={files[0]}
                      lang={lang}
                      onExecute={handleExecuteMetadata}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {currentTool === 'image-compress' && files[0] && (
                    <ToolImageCompressView
                      file={files[0]}
                      files={files}
                      lang={lang}
                      onExecute={handleExecuteImageCompress}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {currentTool === 'flatten' && files[0] && (
                    <ToolFlattenView
                      file={files[0]}
                      lang={lang}
                      onExecute={handleExecuteFlatten}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {currentTool === 'annotate' && files[0] && (
                    <ToolAnnotateView
                      file={files[0]}
                      lang={lang}
                      onFinished={(result) => {
                        recordOperationStats('annotate', 1, files[0].pageCount || 1, 0);
                        setResults([result]);
                        setCurrentStep('result');
                      }}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {currentTool === 'image-convert' && files[0] && (
                    <ToolImageConvertView
                      file={files[0]}
                      files={files}
                      lang={lang}
                      onExecute={handleExecuteImageConvert}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {currentTool === 'compare' && (
                    <ToolCompareView
                      initialFiles={files}
                      lang={lang}
                      onFinished={(resultList) => {
                        recordOperationStats('compare', 2, 0, 0);
                        setResults(resultList);
                        setCurrentStep('result');
                      }}
                      onBack={handleResetToHome}
                    />
                  )}

                  {currentTool === 'visual-compare' && (
                    <ToolVisualCompareView
                      initialFiles={files}
                      lang={lang}
                      onFinished={(resultList) => {
                        recordOperationStats('visual-compare', 2, 0, 0);
                        setResults(resultList);
                        setCurrentStep('result');
                      }}
                      onBack={handleResetToHome}
                    />
                  )}

                  {currentTool === 'pdfa' && files[0] && (
                    <ToolPdfArchiveView
                      file={files[0]}
                      lang={lang}
                      onExecute={handleExecutePdfArchive}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {(currentTool === 'imposition' || currentTool === 'booklet-maker') && files[0] && (
                    <ToolImpositionView
                      file={files[0]}
                      lang={lang}
                      onExecute={handleExecuteImposition}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {currentTool === 'form-builder' && files[0] && (
                    <ToolFormBuilderView
                      file={files[0]}
                      lang={lang}
                      onExecute={handleExecuteFormBuilder}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {currentTool === 'toc' && files.length > 0 && (
                    <ToolTocView
                      files={files}
                      lang={lang}
                      onExecute={handleExecuteToc}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {currentTool === 'redact' && files[0] && (
                    <ToolRedactView
                      file={files[0]}
                      lang={lang}
                      onExecute={handleExecuteRedact}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {currentTool === 'mass-rename' && files.length > 0 && (
                    <ToolMassRenameView
                      files={files}
                      lang={lang}
                      onFinished={(result) => {
                        recordOperationStats('mass-rename', files.length, 0, 0);
                        setResults(Array.isArray(result) ? result : [result]);
                        setCurrentStep('result');
                      }}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}

                  {/* ROUTING FOR 35+ SPECIALIZED EXTRA TOOLS */}
                  {![
                    'merge', 'universal-merge', 'split', 'convert', 'sign', 'encrypt', 'decrypt',
                    'organize', 'compress', 'pdf-compress-heavy', 'watermark', 'batch-watermark',
                    'extract-text', 'page-number', 'metadata', 'image-compress', 'flatten', 
                    'image-convert', 'annotate', 'compare', 'visual-compare', 'pdfa', 'imposition', 
                    'booklet-maker', 'form-builder', 'toc', 'redact', 'mass-rename'
                  ].includes(currentTool) && files.length > 0 && (
                    <ToolExtraSpecializedView
                      tool={currentTool}
                      file={files[0]}
                      files={files}
                      lang={lang}
                      onFinished={(res) => {
                        recordOperationStats(currentTool, files.length, files[0]?.pageCount || 1, 0);
                        setResults(Array.isArray(res) ? res : [res]);
                        setCurrentStep('result');
                      }}
                      onBack={() => setCurrentStep('upload')}
                    />
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* STEP 5: RESULT VIEW */}
          {currentStep === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.985, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.985, y: -10 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <ResultView
                results={results}
                lang={lang}
                onProcessAnother={() => {
                  setFiles([]);
                  setResults([]);
                  setCurrentStep('upload');
                }}
                onBackToHome={handleResetToHome}
                onChainTool={handleChainTool}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP 4: PROCESSING MODAL */}
        {isProcessing && <ProcessingModal progress={progress} lang={lang} />}
      </main>

      {/* Preset Profiles Modal */}
      <PresetProfilesModal
        lang={lang}
        isOpen={isProfilesModalOpen}
        onClose={() => setIsProfilesModalOpen(false)}
        onApplyProfile={handleApplyProfile}
      />

      {/* Operation Statistics Modal */}
      {isStatsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#1c1c1e] p-6 sm:p-8 shadow-2xl border border-neutral-200 dark:border-white/10">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-white/10 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    {lang === 'ar' ? 'سجل وإحصائيات العمليات' : 'Processing Analytics'}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {lang === 'ar' ? 'ملخص العمليات والصفحات والحجم الموفر محلياً' : 'Summary of files, pages processed, and storage saved'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsStatsModalOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ProcessingStatsDashboard stats={stats} lang={lang} />
          </div>
        </div>
      )}

      {/* All Tools Modal */}
      {isToolsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-[#1c1c1e] shadow-2xl border border-neutral-200/80 dark:border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-white/10 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-md sticky top-0 z-10">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {lang === 'ar' ? 'جميع أدوات المعالجة والتحويل (25+ أداة)' : 'All Processing & Conversion Tools (25+ Tools)'}
              </h3>
              <button
                onClick={() => setIsToolsModalOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-12">
              <ToolGrid
                lang={lang}
                onSelectTool={(tool) => {
                  setIsToolsModalOpen(false);
                  handleSelectTool(tool);
                }}
                onSelectToolWithFiles={(tool, f) => {
                  setIsToolsModalOpen(false);
                  handleSelectToolWithFiles(tool, f);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Global Drag & Drop Overlay */}
      {isGlobalDragging && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-blue-600/15 backdrop-blur-xs border-4 border-dashed border-blue-500 flex items-center justify-center p-4">
          <div className="p-8 rounded-3xl bg-white/95 dark:bg-[#1c1c1e]/95 shadow-2xl border border-blue-500/30 flex flex-col items-center gap-4 text-center pointer-events-auto max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center animate-bounce">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {lang === 'ar' ? 'أفلت الملف في أي مكان!' : 'Drop File Anywhere!'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {lang === 'ar' 
                  ? 'سيتم التعرف على صيغة الملف واختيار الأداة المناسبة لمعالجته محلياً على الفور' 
                  : 'File format will be recognized and processed completely on your device'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
        lang={lang}
      />

      {/* Footer - Only visible when not on home screen to keep home strictly zero-scroll */}
      {currentStep !== 'select-tool' && (
        <Footer lang={lang} />
      )}
    </div>
  );
}
