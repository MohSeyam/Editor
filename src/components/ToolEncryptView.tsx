import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Printer, 
  Copy, 
  FileEdit, 
  ArrowLeft, 
  ArrowRight, 
  Play,
  AlertCircle 
} from 'lucide-react';
import { UploadedFile, Language, EncryptionSettings } from '../types';
import { getTranslation } from '../i18n';
import { formatFileSize } from '../utils/fileHelpers';

interface ToolEncryptViewProps {
  file: UploadedFile;
  lang: Language;
  initialMode?: 'encrypt' | 'decrypt';
  onExecute: (settings: EncryptionSettings) => void;
  onBack: () => void;
}

export const ToolEncryptView: React.FC<ToolEncryptViewProps> = ({
  file,
  lang,
  initialMode,
  onExecute,
  onBack,
}) => {
  const t = getTranslation(lang);
  const isAr = lang === 'ar';
  const isLockedFile = file.name.endsWith('.locked');

  const [mode, setMode] = useState<'encrypt' | 'decrypt'>(
    initialMode || (isLockedFile ? 'decrypt' : 'encrypt')
  );
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Permissions
  const [preventPrinting, setPreventPrinting] = useState<boolean>(true);
  const [preventCopying, setPreventCopying] = useState<boolean>(true);
  const [preventModifying, setPreventModifying] = useState<boolean>(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartProcess = () => {
    setErrorMsg(null);
    if (!password) {
      setErrorMsg(isAr ? 'أدخل كلمة المرور' : 'Enter password');
      return;
    }

    if (mode === 'encrypt') {
      if (password.length < 6) {
        setErrorMsg(t.passwordTooShort);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg(t.passwordMismatch);
        return;
      }
    }

    onExecute({
      mode,
      password,
      confirmPassword,
      preventPrinting,
      preventCopying,
      preventModifying,
    });
  };

  return (
    <div id="tool-encrypt-view" className="max-w-4xl mx-auto px-4 py-4 space-y-4 animate-fadeIn">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          <span>{isAr ? 'رجوع' : 'Back'}</span>
        </button>

        {/* Mode Toggle */}
        <div className="p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('encrypt');
              setErrorMsg(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
              mode === 'encrypt'
                ? 'bg-white dark:bg-[#1c1c1e] text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isAr ? 'قفل' : 'Lock'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('decrypt');
              setErrorMsg(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
              mode === 'decrypt'
                ? 'bg-white dark:bg-[#1c1c1e] text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>{isAr ? 'فك القفل' : 'Unlock'}</span>
          </button>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-5">
        {/* File Overview Banner */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              mode === 'encrypt' 
                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' 
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              {mode === 'encrypt' ? <Lock className="w-4.5 h-4.5" /> : <Unlock className="w-4.5 h-4.5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white truncate">
                {file.name}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {formatFileSize(file.size, lang)}
              </p>
            </div>
          </div>

          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            mode === 'encrypt'
              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}>
            {mode === 'encrypt' ? 'AES-256' : (isAr ? 'فك القفل' : 'Unlock')}
          </span>
        </div>

        {/* Password Inputs */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {t.passwordLabel}
            </label>
            <div className="relative">
              <input
                id="input-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartProcess()}
                placeholder="••••••••"
                autoFocus
                className="w-full px-9 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 text-xs sm:text-sm outline-none focus:border-purple-500"
              />
              <KeyRound className="w-4 h-4 text-neutral-400 absolute start-3 top-3 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'encrypt' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {t.confirmPasswordLabel}
              </label>
              <div className="relative">
                <input
                  id="input-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartProcess()}
                  placeholder="••••••••"
                  className="w-full px-9 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 text-xs sm:text-sm outline-none focus:border-purple-500"
                />
                <KeyRound className="w-4 h-4 text-neutral-400 absolute start-3 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-500/10 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Security Permissions (Encrypt Mode Only) */}
        {mode === 'encrypt' && (
          <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-white/5">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              {t.advancedPermissions}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPreventPrinting(!preventPrinting)}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  preventPrinting 
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400' 
                    : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-white/10 text-neutral-500'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t.preventPrinting}</span>
                </div>
                <span className="text-[10px] font-bold">{preventPrinting ? '✓' : '—'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPreventCopying(!preventCopying)}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  preventCopying 
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400' 
                    : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-white/10 text-neutral-500'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t.preventCopying}</span>
                </div>
                <span className="text-[10px] font-bold">{preventCopying ? '✓' : '—'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPreventModifying(!preventModifying)}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  preventModifying 
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400' 
                    : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-white/10 text-neutral-500'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>{t.preventModifying}</span>
                </div>
                <span className="text-[10px] font-bold">{preventModifying ? '✓' : '—'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          id="btn-execute-encrypt"
          type="button"
          onClick={handleStartProcess}
          className={`w-full py-3 px-4 rounded-2xl text-white font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99] ${
            mode === 'encrypt'
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          {mode === 'encrypt' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          <span>{mode === 'encrypt' ? t.encryptActionBtn : t.decryptActionBtn}</span>
        </button>
      </div>
    </div>
  );
};
