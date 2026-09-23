import React from 'react';
import { Lock } from 'lucide-react';
import { Language } from '../types';

interface FooterProps {
  lang: Language;
}

export const Footer: React.FC<FooterProps> = ({ lang }) => {
  const isAr = lang === 'ar';

  return (
    <footer
      id="app-footer"
      className="w-full border-t border-black/[0.06] dark:border-white/[0.08] py-8 mt-12 text-xs text-neutral-400 dark:text-neutral-500"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-start">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <span className="font-medium text-neutral-700 dark:text-neutral-200">
            {isAr
              ? '© 2026 المحرر - تم التطوير بواسطة م. محمد عبد السلام'
              : '© 2026 Al-Moharer - Developed by Eng. Mohammed Abd Elsalam'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] flex-wrap justify-center">
          <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
            <Lock className="w-3 h-3" />
            <span>AES-256</span>
          </span>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <span>v2.0</span>
        </div>
      </div>
    </footer>
  );
};
