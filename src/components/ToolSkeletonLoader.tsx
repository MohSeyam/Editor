import React from 'react';
import { Language } from '../types';

interface ToolSkeletonLoaderProps {
  lang: Language;
}

export const ToolSkeletonLoader: React.FC<ToolSkeletonLoaderProps> = ({ lang }) => {
  const isAr = lang === 'ar';

  return (
    <div 
      id="tool-skeleton-loader"
      className="w-full max-w-5xl mx-auto px-4 py-8 animate-pulse space-y-8 transition-opacity duration-300"
    >
      {/* Top Header Skeleton */}
      <div className="flex items-center justify-between pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-neutral-200/80 dark:bg-neutral-800/80" />
          <div className="space-y-2">
            <div className="h-5 w-40 bg-neutral-200/80 dark:bg-neutral-800/80 rounded-lg" />
            <div className="h-3 w-64 bg-neutral-200/50 dark:bg-neutral-800/50 rounded-md" />
          </div>
        </div>
        <div className="h-9 w-24 bg-neutral-200/80 dark:bg-neutral-800/80 rounded-xl" />
      </div>

      {/* Main Canvas / Preview Stage Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Stage / Canvas Area (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="h-[420px] rounded-3xl bg-neutral-200/60 dark:bg-neutral-800/60 border border-black/5 dark:border-white/5 flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Shimmer light pass */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
            
            <div className="w-20 h-28 rounded-xl bg-neutral-300/70 dark:bg-neutral-700/70 mb-4 shadow-sm" />
            <div className="h-4 w-48 bg-neutral-300/60 dark:bg-neutral-700/60 rounded-md mb-2" />
            <div className="h-3 w-32 bg-neutral-300/40 dark:bg-neutral-700/40 rounded-md" />
          </div>

          {/* Bottom thumbnails ribbon */}
          <div className="flex items-center gap-3 overflow-x-auto py-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className="w-16 h-22 rounded-xl bg-neutral-200/80 dark:bg-neutral-800/80 shrink-0 border border-black/5 dark:border-white/5" 
              />
            ))}
          </div>
        </div>

        {/* Right Settings & Execution Panel (1 col) */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-neutral-200/60 dark:bg-neutral-800/60 border border-black/5 dark:border-white/5 space-y-5">
            <div className="h-4 w-28 bg-neutral-300/80 dark:bg-neutral-700/80 rounded-md" />
            
            <div className="space-y-3">
              <div className="h-12 w-full bg-neutral-300/50 dark:bg-neutral-700/50 rounded-xl" />
              <div className="h-12 w-full bg-neutral-300/50 dark:bg-neutral-700/50 rounded-xl" />
              <div className="h-12 w-full bg-neutral-300/50 dark:bg-neutral-700/50 rounded-xl" />
            </div>

            <div className="pt-4 border-t border-black/5 dark:border-white/5">
              <div className="h-12 w-full bg-blue-500/20 rounded-xl animate-pulse" />
            </div>
          </div>

          {/* Privacy badge skeleton */}
          <div className="h-8 w-full bg-neutral-200/40 dark:bg-neutral-800/40 rounded-xl" />
        </div>
      </div>
    </div>
  );
};
