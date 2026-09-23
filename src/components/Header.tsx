import React from 'react';
import { Moon, Sun, PenTool, Keyboard } from 'lucide-react';
import { Language, ToolType, AppStep } from '../types';
import { getTranslation } from '../i18n';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  currentTool: ToolType | null;
  currentStep: AppStep;
  onResetToHome: () => void;
  onOpenShortcuts?: () => void;
  onOpenStats?: () => void;
  onOpenProfiles?: () => void;
  onOpenTools?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  isDarkMode,
  onToggleDarkMode,
  currentTool,
  currentStep,
  onResetToHome,
  onOpenShortcuts,
}) => {
  const t = getTranslation(lang);

  return (
    <header
      id="app-header"
      className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/90 dark:bg-[#161618]/90 border-b border-black/[0.06] dark:border-white/[0.08] transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between gap-3">
        {/* Logo & App Name: المحرر */}
        <button
          id="btn-logo-home"
          onClick={onResetToHome}
          className="flex items-center gap-3 text-start group cursor-pointer focus:outline-none min-w-0"
        >
          {/* Refined Luxury Stylized Emblem */}
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 p-[1px] shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-all duration-300 shrink-0">
            <div className="w-full h-full rounded-[15px] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-inner">
              <PenTool className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>

          <div className="min-w-0">
            <span className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors whitespace-nowrap">
              {lang === 'ar' ? 'المحرر' : 'Editor'}
            </span>
          </div>
        </button>

        {/* Lightweight, uncluttered Header Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {currentStep !== 'select-tool' && (
            <button
              id="btn-nav-home"
              onClick={onResetToHome}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl text-neutral-700 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200/70 dark:border-white/10 transition-colors shrink-0 cursor-pointer"
            >
              {t.btnBackToHome}
            </button>
          )}

          {/* Language Switch - Segmented Control */}
          <div
            id="segmented-language-switch"
            className="flex items-center rounded-xl p-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 text-xs shrink-0"
            title={lang === 'ar' ? 'التبديل بين العربية والإنجليزية' : 'Toggle between Arabic and English'}
          >
            <button
              type="button"
              onClick={() => lang !== 'ar' && onToggleLang()}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                lang === 'ar'
                  ? 'bg-white dark:bg-[#2c2c2e] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              عربي
            </button>
            <button
              type="button"
              onClick={() => lang !== 'en' && onToggleLang()}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                lang === 'en'
                  ? 'bg-white dark:bg-[#2c2c2e] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* Keyboard Shortcuts Help */}
          {onOpenShortcuts && (
            <button
              id="btn-open-keyboard-shortcuts"
              type="button"
              onClick={onOpenShortcuts}
              className="w-9 h-9 hidden sm:flex items-center justify-center rounded-xl text-neutral-700 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200/70 dark:border-white/10 transition-colors shrink-0 cursor-pointer"
              title={lang === 'ar' ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}
            >
              <Keyboard className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
            </button>
          )}

          {/* Dark / Light Toggle */}
          <button
            id="btn-toggle-darkmode"
            onClick={onToggleDarkMode}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-neutral-700 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200/70 dark:border-white/10 transition-colors shrink-0 cursor-pointer"
            title={isDarkMode ? t.themeLight : t.themeDark}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-neutral-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
