import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Cpu, ShieldCheck, Timer, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { ProcessingProgress, Language } from '../types';
import { getTranslation } from '../i18n';

interface ProcessingModalProps {
  progress: ProcessingProgress;
  lang: Language;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({ progress, lang }) => {
  const t = getTranslation(lang);
  const isAr = lang === 'ar';
  
  const startTimeRef = useRef<number>(Date.now());
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [finalTimeSec, setFinalTimeSec] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (progress.percent < 100) {
        setElapsedMs(Date.now() - startTimeRef.current);
      } else if (finalTimeSec === null) {
        const totalSec = Math.max(0.2, (Date.now() - startTimeRef.current) / 1000);
        setFinalTimeSec(totalSec);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [progress.percent, finalTimeSec]);

  const currentSeconds = finalTimeSec !== null 
    ? finalTimeSec.toFixed(1) 
    : (elapsedMs / 1000).toFixed(1);

  const isComplete = progress.percent >= 100;

  return (
    <motion.div
      id="processing-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
    >
      <motion.div
        id="processing-card"
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1c1c1e] p-7 shadow-2xl border border-neutral-200/80 dark:border-white/10 text-center space-y-6"
      >
        {/* Apple-style smooth loader */}
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-neutral-100 dark:border-white/5"></div>
          {isComplete ? (
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-in zoom-in-75">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          ) : (
            <>
              <div
                className="absolute inset-0 rounded-full border-4 border-blue-600 dark:border-blue-400 border-t-transparent animate-spin"
                style={{ animationDuration: '1.2s' }}
              ></div>
              <span className="text-sm font-semibold text-neutral-900 dark:text-white font-mono">
                {progress.percent}%
              </span>
            </>
          )}
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white tracking-tight">
            {isComplete ? (isAr ? 'اكتملت المعالجة بنجاح' : 'Processing Completed') : t.processingTitle}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
            {progress.message || t.processingSub}
          </p>
        </div>

        {/* Dynamic Timing Banner */}
        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/60 dark:border-white/10 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          <Timer className="w-3.5 h-3.5 text-blue-500" />
          <span>
            {isComplete
              ? (isAr ? `تم الإنجاز في ${currentSeconds} ثانية` : `Completed in ${currentSeconds}s`)
              : (isAr ? `الوقت المستغرق: ${currentSeconds} ثانية` : `Elapsed: ${currentSeconds}s`)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-neutral-100 dark:bg-white/10 h-2 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${
              isComplete
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-blue-500 to-blue-600'
            }`}
            style={{ width: `${Math.max(5, Math.min(100, progress.percent))}%` }}
          ></div>
        </div>

        <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <Cpu className="w-3.5 h-3.5 text-blue-500" />
          <span>{isAr ? 'المعالجة تجري محلياً على جهازك بسرعة فائقة وبخصوصية تامة' : 'Client-side instant in-memory processing'}</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

