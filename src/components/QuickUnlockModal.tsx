import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Eye, 
  EyeOff, 
  FileText, 
  UploadCloud,
  FileCheck,
  Sparkles
} from 'lucide-react';
import { Language } from '../types';
import { verifyLockedFilePassword, isLockedFile } from '../utils/cryptoOperations';
import { formatBytes } from '../utils/fileHelpers';

interface QuickUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const QuickUnlockModal: React.FC<QuickUnlockModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [decryptedResult, setDecryptedResult] = useState<{
    data: Uint8Array;
    filename: string;
    mimeType: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setFileBytes(null);
      setPassword('');
      setVerificationStatus('idle');
      setDecryptedResult(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handleFileSelect = async (f: File) => {
    setFile(f);
    setVerificationStatus('idle');
    setDecryptedResult(null);
    setErrorMessage(null);
    try {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setFileBytes(bytes);

      if (!isLockedFile(bytes)) {
        setErrorMessage(isAr ? 'الملف ليس مستنداً مشفراً بصيغة صحيحة' : 'File is not in locked format');
      }
    } catch {
      setErrorMessage(isAr ? 'تعذرت قراءة الملف' : 'Could not read file');
    }
  };

  // Instant verification effect as user types
  useEffect(() => {
    if (!fileBytes || !password || password.length < 1) {
      setVerificationStatus('idle');
      setDecryptedResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsVerifying(true);
      const check = await verifyLockedFilePassword(fileBytes, password);
      setIsVerifying(false);

      if (check.valid && check.result) {
        setVerificationStatus('valid');
        setDecryptedResult(check.result);
        setErrorMessage(null);
      } else {
        setVerificationStatus('invalid');
        setDecryptedResult(null);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [fileBytes, password]);

  const handleDownload = () => {
    if (!decryptedResult) return;
    const blob = new Blob([decryptedResult.data], { type: decryptedResult.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = decryptedResult.filename.startsWith('unlocked_')
      ? decryptedResult.filename
      : `unlocked_${decryptedResult.filename}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fadeIn">
      <div 
        id="quick-unlock-card"
        className="w-full max-w-lg bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden text-neutral-900 dark:text-neutral-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-900/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {isAr ? 'إلغاء حماية ملف' : 'Unprotect File'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isAr ? 'فتح فوري' : 'Instant Unlock'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* File Picker or Drag */}
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
              }}
              className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-neutral-50/30 dark:bg-neutral-900/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".locked,application/octet-stream,*/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold mb-1">
                {isAr ? 'اسحب المستند المحمي هنا' : 'Drop protected file here'}
              </span>
              <span className="text-xs text-neutral-400">
                {isAr ? 'أو انقر للاختيار (.locked)' : 'or click to browse (.locked)'}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-neutral-400">{formatBytes(file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setFileBytes(null);
                  setPassword('');
                  setVerificationStatus('idle');
                  setDecryptedResult(null);
                }}
                className="text-xs text-neutral-400 hover:text-red-500 font-medium px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                {isAr ? 'تغيير' : 'Change'}
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Password Input with Instant Live Check */}
          {file && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  {isAr ? 'كلمة المرور' : 'Password'}
                </label>
                {/* Real-time verification badge */}
                {password && (
                  <div className="flex items-center gap-1 text-xs">
                    {isVerifying ? (
                      <span className="text-neutral-400 animate-pulse">
                        {isAr ? 'جارٍ الفحص...' : 'Checking...'}
                      </span>
                    ) : verificationStatus === 'valid' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isAr ? 'كلمة السر صحيحة' : 'Password correct'}
                      </span>
                    ) : verificationStatus === 'invalid' ? (
                      <span className="text-red-500 dark:text-red-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {isAr ? 'كلمة السر غير صحيحة' : 'Wrong password'}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isAr ? 'أدخل كلمة المرور...' : 'Enter password...'}
                  autoFocus
                  className={`w-full px-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border text-sm outline-none transition-all ${
                    verificationStatus === 'valid'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                      : verificationStatus === 'invalid'
                      ? 'border-red-500 ring-2 ring-red-500/20'
                      : 'border-neutral-200 dark:border-neutral-700 focus:border-blue-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Instant Unlock Outcome */}
          {decryptedResult && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold">{decryptedResult.filename}</p>
                    <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                      {formatBytes(decryptedResult.data.length)} • {decryptedResult.mimeType}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isAr ? 'تحميل المستند الآن' : 'Download Document Now'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-black/5 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-900/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
