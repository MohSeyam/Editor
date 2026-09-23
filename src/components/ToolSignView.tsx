import React, { useRef, useState, useEffect } from 'react';
import { 
  PenTool, 
  Type, 
  Image as ImageIcon, 
  Camera,
  Eraser, 
  Calendar, 
  ArrowLeft, 
  ArrowRight, 
  Play, 
  Move, 
  Check,
  RotateCcw,
  RefreshCw,
  Sliders,
  Sparkles,
  CameraOff
} from 'lucide-react';
import { UploadedFile, Language, SignatureSettings } from '../types';
import { getTranslation } from '../i18n';
import { renderPdfPageThumbnail } from '../utils/pdfThumbnail';

interface ToolSignViewProps {
  file: UploadedFile;
  lang: Language;
  onExecute: (signatureDataUrl: string, settings: SignatureSettings) => void;
  onBack: () => void;
}

export const ToolSignView: React.FC<ToolSignViewProps> = ({
  file,
  lang,
  onExecute,
  onBack,
}) => {
  const t = getTranslation(lang);
  const totalPages = file.pageCount || 1;

  // Signature generation state
  const [signMode, setSignMode] = useState<'draw' | 'type' | 'image' | 'camera'>('draw');
  const [penColor, setPenColor] = useState<string>('#1c1c1e');
  const [penWidth, setPenWidth] = useState<number>(3);
  const [typedName, setTypedName] = useState<string>('Mohammed');
  const [typedFont, setTypedFont] = useState<string>('cursive');
  const [generatedSignatureUrl, setGeneratedSignatureUrl] = useState<string | null>(null);

  // Camera capture state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraThreshold, setCameraThreshold] = useState<number>(180);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [rawCameraSnapshot, setRawCameraSnapshot] = useState<string | null>(null);

  // Canvas drawing ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Signature placement on page
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [boxPosition, setBoxPosition] = useState<{ x: number; y: number }>({ x: 50, y: 70 }); // percentages
  const [boxSize, setBoxSize] = useState<{ w: number; h: number }>({ w: 35, h: 14 }); // percentages
  const [addDateStamp, setAddDateStamp] = useState<boolean>(true);
  const [dateStampText, setDateStampText] = useState<string>(new Date().toISOString().split('T')[0]);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pagePreviewUrl, setPagePreviewUrl] = useState<string | null>(null);

  // Load thumbnail of current page for signature placement
  useEffect(() => {
    let isCurrent = true;
    renderPdfPageThumbnail(file.data, selectedPage, 500)
      .then((url) => {
        if (isCurrent && url) {
          setPagePreviewUrl(url);
        }
      })
      .catch((err) => console.warn('Could not load sign page preview:', err));

    return () => {
      isCurrent = false;
    };
  }, [file.data, selectedPage]);

  // Canvas setup
  useEffect(() => {
    if (signMode === 'draw' && canvasRef.current) {
      const cvs = canvasRef.current;
      cvs.width = 500;
      cvs.height = 200;
      const ctx = cvs.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penWidth;
      }
    }
  }, [signMode]);

  // Update canvas pen styles
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penWidth;
      }
    }
  }, [penColor, penWidth]);

  // Generate signature data URL whenever typed text changes
  useEffect(() => {
    if (signMode === 'type' && typedName.trim()) {
      const tempCvs = document.createElement('canvas');
      tempCvs.width = 500;
      tempCvs.height = 180;
      const ctx = tempCvs.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, tempCvs.width, tempCvs.height);
        ctx.fillStyle = penColor;
        ctx.font = typedFont === 'cursive' ? 'italic 48px "Brush Script MT", "Segoe Script", cursive' : '500 42px "Times New Roman", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, tempCvs.width / 2, tempCvs.height / 2);
        setGeneratedSignatureUrl(tempCvs.toDataURL('image/png'));
      }
    }
  }, [signMode, typedName, typedFont, penColor]);

  // Drawing mouse & touch handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const rect = cvs.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (cvs.width / rect.width);
    const y = (clientY - rect.top) * (cvs.height / rect.height);
    lastPointRef.current = { x, y };

    const ctx = cvs.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = penWidth * 5;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penWidth;
      }
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.1, y + 0.1);
      ctx.stroke();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const cvs = canvasRef.current;
    const rect = cvs.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (cvs.width / rect.width);
    const y = (clientY - rect.top) * (cvs.height / rect.height);
    const ctx = cvs.getContext('2d');

    if (ctx && lastPointRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      // Quadratic curve for smoother handwriting strokes
      const midX = (lastPointRef.current.x + x) / 2;
      const midY = (lastPointRef.current.y + y) / 2;
      ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midX, midY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    lastPointRef.current = { x, y };
  };

  const stopDrawing = () => {
    if (!isDrawing || !canvasRef.current) return;
    setIsDrawing(false);
    lastPointRef.current = null;
    setGeneratedSignatureUrl(canvasRef.current.toDataURL('image/png'));
  };

  const clearCanvas = () => {
    const cvs = canvasRef.current;
    if (cvs) {
      const ctx = cvs.getContext('2d');
      ctx?.clearRect(0, 0, cvs.width, cvs.height);
      setHasDrawn(false);
      setGeneratedSignatureUrl(null);
      lastPointRef.current = null;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setGeneratedSignatureUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Camera Management & Background Removal
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        lang === 'ar'
          ? 'تعذر الوصول إلى الكاميرا. يرجى التأكد من إتاحة صلاحية الكاميرا في المتصفح.'
          : 'Could not access camera. Please allow camera permissions in browser.'
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (signMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [signMode]);

  // Process White Paper Snapshot into Transparent PNG Signature
  const processImageForSignature = (sourceImgDataUrl: string, threshold: number) => {
    const img = new Image();
    img.onload = () => {
      const cvs = document.createElement('canvas');
      cvs.width = img.width;
      cvs.height = img.height;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
      const data = imgData.data;

      let minX = cvs.width, minY = cvs.height, maxX = 0, maxY = 0;
      let inkPixels = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        const pixelIdx = i / 4;
        const px = pixelIdx % cvs.width;
        const py = Math.floor(pixelIdx / cvs.width);

        if (luminance > threshold) {
          // White paper -> make transparent
          data[i + 3] = 0;
        } else {
          // Ink detected
          const alpha = Math.min(255, Math.max(50, Math.round((threshold - luminance) * 3.8)));
          // Normalize to dark, deep navy ink
          data[i] = 20;
          data[i + 1] = 35;
          data[i + 2] = 65;
          data[i + 3] = alpha;

          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
          inkPixels++;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Crop to signature bounds
      if (inkPixels > 50 && maxX > minX && maxY > minY) {
        const pad = 16;
        const cropX = Math.max(0, minX - pad);
        const cropY = Math.max(0, minY - pad);
        const cropW = Math.min(cvs.width - cropX, maxX - minX + pad * 2);
        const cropH = Math.min(cvs.height - cropY, maxY - minY + pad * 2);

        const cropCvs = document.createElement('canvas');
        cropCvs.width = cropW;
        cropCvs.height = cropH;
        const cropCtx = cropCvs.getContext('2d');
        if (cropCtx) {
          cropCtx.drawImage(cvs, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          setGeneratedSignatureUrl(cropCvs.toDataURL('image/png'));
        }
      } else {
        setGeneratedSignatureUrl(cvs.toDataURL('image/png'));
      }
    };
    img.src = sourceImgDataUrl;
  };

  const captureCameraSignature = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const cvs = document.createElement('canvas');
    cvs.width = video.videoWidth || 640;
    cvs.height = video.videoHeight || 480;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, cvs.width, cvs.height);
    const snapDataUrl = cvs.toDataURL('image/jpeg', 0.95);
    setRawCameraSnapshot(snapDataUrl);
    processImageForSignature(snapDataUrl, cameraThreshold);
    stopCamera();
  };

  // Dragging placement box over preview
  const handleMouseDownOnBox = (e: React.MouseEvent) => {
    setIsDraggingBox(true);
    const container = previewContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const currentXpx = (boxPosition.x / 100) * rect.width;
    const currentYpx = (boxPosition.y / 100) * rect.height;
    setDragOffset({
      x: e.clientX - rect.left - currentXpx,
      y: e.clientY - rect.top - currentYpx,
    });
  };

  const handleMouseMoveOnPreview = (e: React.MouseEvent) => {
    if (!isDraggingBox || !previewContainerRef.current) return;
    const container = previewContainerRef.current;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - dragOffset.x;
    const mouseY = e.clientY - rect.top - dragOffset.y;

    const newX = Math.max(0, Math.min(100 - boxSize.w, (mouseX / rect.width) * 100));
    const newY = Math.max(0, Math.min(100 - boxSize.h, (mouseY / rect.height) * 100));

    setBoxPosition({ x: Math.round(newX), y: Math.round(newY) });
  };

  const handleMouseUpPreview = () => {
    setIsDraggingBox(false);
  };

  const handleSubmit = () => {
    let finalUrl = generatedSignatureUrl;

    // Fallback if typed mode and not yet converted
    if (!finalUrl && signMode === 'type' && typedName) {
      const tempCvs = document.createElement('canvas');
      tempCvs.width = 500;
      tempCvs.height = 180;
      const ctx = tempCvs.getContext('2d');
      if (ctx) {
        ctx.fillStyle = penColor;
        ctx.font = 'italic 48px "Brush Script MT", "Segoe Script", cursive';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, 250, 90);
        finalUrl = tempCvs.toDataURL('image/png');
      }
    }

    if (!finalUrl) {
      alert('يرجى إنشاء توقيع أولاً (رسم، كتابة، أو رفع صورة)');
      return;
    }

    onExecute(finalUrl, {
      mode: signMode,
      signatureDataUrl: finalUrl,
      typedName,
      fontFamily: typedFont,
      penColor,
      penWidth,
      pageNumber: selectedPage,
      xPercent: boxPosition.x,
      yPercent: boxPosition.y,
      widthPercent: boxSize.w,
      heightPercent: boxSize.h,
      addDateStamp,
      dateStampText,
    });
  };

  return (
    <div id="tool-sign-view" className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          id="btn-sign-back"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          {lang === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{t.btnBack}</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <PenTool className="w-4 h-4 text-amber-500" />
          <span className="font-medium text-neutral-900 dark:text-white">{t.toolSignTitle}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Column: Signature Creator & Page Placement Preview */}
        <div className="lg:col-span-8 space-y-5">
          {/* Signature Creation Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
                {t.signMethodTitle}
              </h3>

              {/* Mode switch pills */}
              <div className="p-1 rounded-xl bg-neutral-100 dark:bg-[#252528] flex items-center gap-1 text-xs">
                <button
                  type="button"
                  id="btn-sign-mode-draw"
                  onClick={() => setSignMode('draw')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    signMode === 'draw'
                      ? 'bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>{t.signDraw}</span>
                </button>
                <button
                  type="button"
                  id="btn-sign-mode-type"
                  onClick={() => setSignMode('type')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    signMode === 'type'
                      ? 'bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>{t.signType}</span>
                </button>
                <button
                  type="button"
                  id="btn-sign-mode-image"
                  onClick={() => setSignMode('image')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    signMode === 'image'
                      ? 'bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{t.signImage}</span>
                </button>
                <button
                  type="button"
                  id="btn-sign-mode-camera"
                  onClick={() => setSignMode('camera')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    signMode === 'camera'
                      ? 'bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'التقاط بالكاميرا' : 'Camera'}</span>
                </button>
              </div>
            </div>

            {/* DRAW MODE */}
            {signMode === 'draw' && (
              <div className="space-y-3">
                <div className="relative rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-[#252528]/60 overflow-hidden shadow-inner flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-44 cursor-crosshair touch-none"
                  />
                  {!hasDrawn && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-neutral-400">
                      ارسم توقيعك هنا بالماوس أو شاشة اللمس...
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {/* Tool toggle: Pen vs Eraser */}
                  <div className="flex items-center gap-1 bg-neutral-100 dark:bg-[#2c2c2e] p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setIsEraser(false)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                        !isEraser
                          ? 'bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
                      }`}
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'قلم' : 'Pen'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEraser(true)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                        isEraser
                          ? 'bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
                      }`}
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'ممحاة' : 'Eraser'}</span>
                    </button>
                  </div>

                  {/* Stroke thickness */}
                  <div className="flex items-center gap-1 bg-neutral-100 dark:bg-[#2c2c2e] p-1 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setPenWidth(1.5)}
                      className={`px-2 py-1 rounded-lg font-medium transition-all ${
                        penWidth === 1.5
                          ? 'bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white shadow-xs'
                          : 'text-neutral-500'
                      }`}
                    >
                      {lang === 'ar' ? 'رفيع' : 'Fine'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPenWidth(3)}
                      className={`px-2 py-1 rounded-lg font-medium transition-all ${
                        penWidth === 3
                          ? 'bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white shadow-xs'
                          : 'text-neutral-500'
                      }`}
                    >
                      {lang === 'ar' ? 'متوسط' : 'Med'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPenWidth(5.5)}
                      className={`px-2 py-1 rounded-lg font-medium transition-all ${
                        penWidth === 5.5
                          ? 'bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white shadow-xs'
                          : 'text-neutral-500'
                      }`}
                    >
                      {lang === 'ar' ? 'عريض' : 'Bold'}
                    </button>
                  </div>

                  {/* Colors (only relevant when pen active) */}
                  {!isEraser && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-neutral-500">{t.signPenColor}</span>
                      <button
                        type="button"
                        onClick={() => setPenColor('#1c1c1e')}
                        className={`w-6 h-6 rounded-full bg-[#1c1c1e] border-2 transition-all ${
                          penColor === '#1c1c1e' ? 'border-amber-500 scale-110' : 'border-transparent'
                        }`}
                        title={t.signPenBlack}
                      />
                      <button
                        type="button"
                        onClick={() => setPenColor('#002b5c')}
                        className={`w-6 h-6 rounded-full bg-[#002b5c] border-2 transition-all ${
                          penColor === '#002b5c' ? 'border-amber-500 scale-110' : 'border-transparent'
                        }`}
                        title={t.signPenNavy}
                      />
                      <button
                        type="button"
                        onClick={() => setPenColor('#0071e3')}
                        className={`w-6 h-6 rounded-full bg-[#0071e3] border-2 transition-all ${
                          penColor === '#0071e3' ? 'border-amber-500 scale-110' : 'border-transparent'
                        }`}
                        title={t.signPenBlue}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-xs font-medium text-neutral-500 hover:text-red-500 flex items-center gap-1.5 transition-colors px-2 py-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t.signClear}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TYPE MODE */}
            {signMode === 'type' && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder={t.signTypePlaceholder}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-[#252528] border border-neutral-200 dark:border-white/10 text-base text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTypedFont('cursive')}
                    className={`px-3 py-1.5 rounded-lg border text-sm italic font-serif ${
                      typedFont === 'cursive'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'border-neutral-200 dark:border-white/10 text-neutral-500'
                    }`}
                  >
                    {t.signFontCursive}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypedFont('formal')}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-serif ${
                      typedFont === 'formal'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'border-neutral-200 dark:border-white/10 text-neutral-500'
                    }`}
                  >
                    {t.signFontFormal}
                  </button>
                </div>
              </div>
            )}

            {/* IMAGE MODE */}
            {signMode === 'image' && (
              <div className="p-6 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-white/10 text-center space-y-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="upload-signature-img"
                />
                <label
                  htmlFor="upload-signature-img"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold cursor-pointer hover:bg-amber-500/20 transition-colors"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{t.signImageUploadPrompt}</span>
                </label>
                {generatedSignatureUrl && (
                  <div className="pt-2">
                    <img
                      src={generatedSignatureUrl}
                      alt="Signature"
                      className="max-h-24 mx-auto object-contain border rounded-lg p-2 bg-white"
                    />
                  </div>
                )}
              </div>
            )}

            {/* CAMERA MODE - Live Scan with Auto Background Removal */}
            {signMode === 'camera' && (
              <div className="space-y-4">
                {cameraError ? (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <CameraOff className="w-4 h-4" />
                      <span className="font-semibold">{cameraError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium cursor-pointer"
                    >
                      {lang === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
                    </button>
                  </div>
                ) : !rawCameraSnapshot ? (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-neutral-200 dark:border-white/10">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* Guide Box */}
                      <div className="absolute inset-4 sm:inset-10 border-2 border-dashed border-amber-400/80 rounded-2xl flex flex-col items-center justify-between p-3 pointer-events-none shadow-sm">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 text-amber-300 backdrop-blur-md">
                          {lang === 'ar' ? 'ضع توقيعك على ورقة بيضاء داخل الإطار' : 'Place paper signature inside the frame'}
                        </span>
                        <span className="text-[10px] text-white/70 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                          {lang === 'ar' ? 'سيتم عزل الورقة البيضاء واستخراج التوقيع بشفافية تلقائياً' : 'Paper background will be removed automatically'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={captureCameraSignature}
                        className="px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{lang === 'ar' ? 'التقاط وتفريغ التوقيع فوراً' : 'Capture & Remove Background'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        {lang === 'ar' ? 'تم استخراج التوقيع بشفافية فائقة' : 'Signature Extracted (Transparent PNG)'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setRawCameraSnapshot(null);
                          startCamera();
                        }}
                        className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'التقاط مرة أخرى' : 'Retake'}</span>
                      </button>
                    </div>

                    {/* Transparent Preview on checkerboard */}
                    <div 
                      className="h-28 rounded-xl border border-neutral-200 dark:border-white/10 flex items-center justify-center p-3"
                      style={{
                        backgroundImage: `linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)`,
                        backgroundSize: '16px 16px',
                        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                      }}
                    >
                      {generatedSignatureUrl && (
                        <img
                          src={generatedSignatureUrl}
                          alt="Transparent Signature"
                          className="max-h-full object-contain filter drop-shadow-xs"
                        />
                      )}
                    </div>

                    {/* Sensitivity / Threshold Slider */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] text-neutral-500">
                        <span>{lang === 'ar' ? 'حساسية عزل بياض الورقة:' : 'Paper Whitening Sensitivity:'}</span>
                        <span className="font-mono font-medium text-neutral-900 dark:text-white">{cameraThreshold}</span>
                      </div>
                      <input
                        type="range"
                        min="120"
                        max="230"
                        step="5"
                        value={cameraThreshold}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setCameraThreshold(val);
                          if (rawCameraSnapshot) {
                            processImageForSignature(rawCameraSnapshot, val);
                          }
                        }}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive Document Page Visual Placement Preview */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
                  موضع التوقيع على المستند (صفحة {selectedPage} من {totalPages})
                </h3>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                  {t.signPositionHelper}
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-400">
                X: {boxPosition.x}% • Y: {boxPosition.y}%
              </span>
            </div>

            {/* Simulated Page Canvas with movable signature box */}
            <div
              ref={previewContainerRef}
              onMouseMove={handleMouseMoveOnPreview}
              onMouseUp={handleMouseUpPreview}
              onMouseLeave={handleMouseUpPreview}
              className="relative w-full max-w-md mx-auto aspect-[3/4.2] rounded-2xl bg-white dark:bg-[#151517] border-2 border-neutral-200/80 dark:border-white/15 shadow-md overflow-hidden select-none flex flex-col justify-between"
            >
              {/* Real PDF Page Image Background or Skeleton */}
              {pagePreviewUrl ? (
                <img
                  src={pagePreviewUrl}
                  alt={`صفحة ${selectedPage}`}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none p-1"
                />
              ) : (
                <div className="p-6 flex flex-col justify-between h-full">
                  {/* Document Mock Header */}
                  <div className="w-full space-y-2 opacity-30 pointer-events-none">
                    <div className="h-2 bg-neutral-400 rounded-full w-1/3"></div>
                    <div className="h-1.5 bg-neutral-300 rounded-full w-2/3"></div>
                    <div className="h-1 bg-neutral-200 rounded-full w-full"></div>
                  </div>

                  {/* Document Mock Body Text */}
                  <div className="w-full space-y-2 opacity-25 pointer-events-none my-auto">
                    <div className="h-1.5 bg-neutral-300 rounded-full w-full"></div>
                    <div className="h-1.5 bg-neutral-300 rounded-full w-5/6"></div>
                    <div className="h-1.5 bg-neutral-300 rounded-full w-4/5"></div>
                    <div className="h-1.5 bg-neutral-300 rounded-full w-full"></div>
                    <div className="h-1.5 bg-neutral-300 rounded-full w-3/4"></div>
                    <div className="h-1.5 bg-neutral-300 rounded-full w-5/6"></div>
                  </div>
                </div>
              )}

              {/* Movable & Draggable Signature Box */}
              <div
                onMouseDown={handleMouseDownOnBox}
                style={{
                  left: `${boxPosition.x}%`,
                  top: `${boxPosition.y}%`,
                  width: `${boxSize.w}%`,
                  height: `${boxSize.h}%`,
                }}
                className={`absolute rounded-xl border-2 border-dashed border-amber-500 bg-amber-500/10 cursor-move p-1 flex flex-col items-center justify-center transition-shadow shadow-xs hover:shadow-md z-10 ${
                  isDraggingBox ? 'scale-105 border-solid shadow-lg' : ''
                }`}
              >
                <div className="w-full h-full flex items-center justify-center overflow-hidden pointer-events-none">
                  {generatedSignatureUrl ? (
                    <img
                      src={generatedSignatureUrl}
                      alt="Signature placement"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                      التوقيع هنا
                    </span>
                  )}
                </div>

                {/* Optional Date Stamp inside placement */}
                {addDateStamp && (
                  <div className="text-[9px] font-mono font-medium text-neutral-600 dark:text-neutral-300 pointer-events-none mt-0.5">
                    {dateStampText}
                  </div>
                )}

                <div className="absolute -top-2 -right-2 p-0.5 rounded-full bg-amber-500 text-white text-[8px] pointer-events-none">
                  <Move className="w-2.5 h-2.5" />
                </div>
              </div>

              {/* Footer bar indicator */}
              <div className="relative z-10 w-full px-4 py-1.5 flex justify-between text-[10px] text-neutral-500 dark:text-neutral-400 bg-white/80 dark:bg-[#151517]/80 backdrop-blur-xs border-t border-neutral-200/50 dark:border-white/5">
                <span>صفحة {selectedPage} من {totalPages}</span>
                <span>محرر الصيغ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel: Page selection, Date Stamp, and Execution */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-5">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
              خيارات التوقيع
            </h3>

            {/* Page number selector */}
            <div className="space-y-1.5">
              <label htmlFor="select-sign-page" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                {t.signPageSelect}
              </label>
              <select
                id="select-sign-page"
                value={selectedPage}
                onChange={(e) => setSelectedPage(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-[#252528] border border-neutral-200 dark:border-white/10 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {Array.from({ length: totalPages }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    صفحة {i + 1}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Stamp Toggle */}
            <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {t.signAddDate}
                </span>
                <input
                  type="checkbox"
                  id="checkbox-date-stamp"
                  checked={addDateStamp}
                  onChange={(e) => setAddDateStamp(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
              </div>

              {addDateStamp && (
                <div className="space-y-1">
                  <label htmlFor="input-date-text" className="text-[11px] text-neutral-400">
                    نص التاريخ:
                  </label>
                  <input
                    id="input-date-text"
                    type="text"
                    value={dateStampText}
                    onChange={(e) => setDateStampText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-[#252528] border border-neutral-200 dark:border-white/10 text-xs text-neutral-900 dark:text-white font-mono"
                  />
                </div>
              )}
            </div>

            {/* Execute Button */}
            <button
              id="btn-execute-sign"
              type="button"
              onClick={handleSubmit}
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-medium text-sm shadow-sm shadow-amber-600/30 hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{t.signActionBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
