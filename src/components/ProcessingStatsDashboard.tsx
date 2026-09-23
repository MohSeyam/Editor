import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  Activity, 
  Layers, 
  HardDrive, 
  Sparkles, 
  TrendingUp, 
  CheckCircle2,
  X
} from 'lucide-react';
import { Language, AppStatistics } from '../types';

interface ProcessingStatsDashboardProps {
  stats: AppStatistics;
  lang: Language;
  onClose?: () => void;
}

export const ProcessingStatsDashboard: React.FC<ProcessingStatsDashboardProps> = ({
  stats,
  lang,
  onClose,
}) => {
  const isAr = lang === 'ar';

  const toolLabels: Record<string, { ar: string; en: string; color: string }> = {
    merge: { ar: 'دمج PDF', en: 'Merge PDF', color: '#3b82f6' },
    split: { ar: 'تقسيم', en: 'Split', color: '#10b981' },
    compress: { ar: 'ضغط', en: 'Compress', color: '#f59e0b' },
    sign: { ar: 'توقيع', en: 'Sign', color: '#8b5cf6' },
    watermark: { ar: 'علامة مائية', en: 'Watermark', color: '#ec4899' },
    reorder: { ar: 'ترتيب', en: 'Reorder', color: '#6366f1' },
    extract: { ar: 'استخراج نصوص', en: 'Extract Text', color: '#06b6d4' },
    annotate: { ar: 'ملاحظات', en: 'Annotate', color: '#14b8a6' },
    'image-convert': { ar: 'تحويل صور', en: 'Convert Images', color: '#f97316' },
  };

  // Convert operationsCount to chart data
  const chartData = Object.entries(stats.operationsCount || {})
    .filter(([_, count]) => typeof count === 'number' && (count as number) > 0)
    .map(([toolKey, count]) => {
      const numCount = Number(count) || 0;
      const info = toolLabels[toolKey] || { ar: toolKey, en: toolKey, color: '#3b82f6' };
      return {
        name: isAr ? info.ar : info.en,
        count: numCount,
        color: info.color,
      };
    })
    .sort((a, b) => b.count - a.count);

  // If empty, provide default zero-state or seed
  const displayData = chartData.length > 0 ? chartData : [
    { name: isAr ? 'دمج' : 'Merge', count: 0, color: '#3b82f6' },
    { name: isAr ? 'ضغط' : 'Compress', count: 0, color: '#f59e0b' },
    { name: isAr ? 'توقيع' : 'Sign', count: 0, color: '#8b5cf6' },
    { name: isAr ? 'استخراج' : 'Extract', count: 0, color: '#06b6d4' },
  ];

  const mbSaved = (stats.bytesSaved / (1024 * 1024)).toFixed(1);

  return (
    <div id="processing-stats-dashboard" className="w-full rounded-3xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 p-5 sm:p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'لوحة إحصائيات المعالجة' : 'Processing Analytics'}
            </h3>
            <p className="text-[11px] text-neutral-400">
              {isAr ? 'بيانات حية للعمليات المنجزة ومقدار التوفير' : 'Live overview of processed documents & efficiency'}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Documents */}
        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/60 dark:border-white/5 space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>{isAr ? 'الملفات المعالجة' : 'Processed Files'}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-white">
            {stats.totalFiles}
          </div>
          <span className="text-[10px] text-neutral-400">
            {isAr ? 'عمليات معالجة محلية' : 'Client-side operations'}
          </span>
        </div>

        {/* Total Pages */}
        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/60 dark:border-white/5 space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>{isAr ? 'إجمالي الصفحات' : 'Pages Handled'}</span>
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-white">
            {stats.totalPages}
          </div>
          <span className="text-[10px] text-neutral-400">
            {isAr ? 'صفحة تم تحليلها وتعديلها' : 'Pages analyzed & rendered'}
          </span>
        </div>

        {/* Storage Saved */}
        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/60 dark:border-white/5 space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>{isAr ? 'المساحة الموفرة' : 'Storage Saved'}</span>
            <HardDrive className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-white flex items-baseline gap-1">
            <span>{mbSaved}</span>
            <span className="text-xs font-normal text-neutral-400">MB</span>
          </div>
          <span className="text-[10px] text-neutral-400">
            {isAr ? 'وفورات الضغط والتحسين' : 'Savings from compression'}
          </span>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            {isAr ? 'توزيع العمليات الأكثر استخداماً' : 'Most Used Operations'}
          </span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: '#888' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#888' }} 
                axisLine={false} 
                tickLine={false} 
                allowDecimals={false} 
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '12px', 
                  backgroundColor: 'rgba(28, 28, 30, 0.95)', 
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {displayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
