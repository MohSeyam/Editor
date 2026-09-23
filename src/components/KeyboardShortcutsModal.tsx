import React, { useEffect } from 'react';
import { X, Command, Keyboard, Download, RotateCcw, Upload, Moon, HelpCircle } from 'lucide-react';
import { Language } from '../types';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const isAr = lang === 'ar';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    {
      keys: [`${modKey}`, 'S'],
      icon: <Download className="w-4 h-4 text-emerald-500" />,
      desc: isAr ? 'تحميل الملف الناتج فوراً في صفحة النتائج' : 'Quick download result file on result screen',
    },
    {
      keys: [`${modKey}`, 'Z'],
      icon: <RotateCcw className="w-4 h-4 text-blue-500" />,
      desc: isAr ? 'تراجع / العودة للخطوة السابقة' : 'Undo action / return to previous step',
    },
    {
      keys: ['Esc'],
      icon: <X className="w-4 h-4 text-rose-500" />,
      desc: isAr ? 'إغلاق النوافذ المنبثقة أو إلغاء المعاينة والرجوع' : 'Close modals, cancel preview, or go back',
    },
    {
      keys: [`${modKey}`, 'O'],
      icon: <Upload className="w-4 h-4 text-amber-500" />,
      desc: isAr ? 'فتح نافذة اختيار ورفع الملفات' : 'Open file picker to upload documents',
    },
    {
      keys: [`${modKey}`, 'D'],
      icon: <Moon className="w-4 h-4 text-purple-500" />,
      desc: isAr ? 'التبديل بين الوضع الليلي والنهاري' : 'Toggle dark / light theme',
    },
    {
      keys: ['?'],
      icon: <HelpCircle className="w-4 h-4 text-sky-500" />,
      desc: isAr ? 'عرض أو إخفاء دليل اختصارات لوحة المفاتيح' : 'Show or hide keyboard shortcuts help',
    },
  ];

  return (
    <div
      id="keyboard-shortcuts-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-neutral-100 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200/80 dark:border-white/10 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isAr ? 'اختصارات لوحة المفاتيح السريعة' : 'Keyboard Shortcuts'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isAr ? 'تحكم فوري لزيادة الإنتاجية والسرعة' : 'Power user controls for peak efficiency'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-shortcuts-modal"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-neutral-50 dark:bg-[#252528] border border-neutral-100 dark:border-white/5"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white dark:bg-[#1c1c1e] shadow-2xs">
                  {s.icon}
                </div>
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {s.desc}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0" dir="ltr">
                {s.keys.map((k, kIdx) => (
                  <kbd
                    key={kIdx}
                    className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-white dark:bg-[#151516] border border-neutral-300 dark:border-white/20 shadow-xs text-neutral-900 dark:text-neutral-100 min-w-[28px] text-center"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-1">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-medium transition-all shadow-xs cursor-pointer"
          >
            {isAr ? 'فهمت، إغلاق' : 'Got it, close'}
          </button>
        </div>
      </div>
    </div>
  );
};
