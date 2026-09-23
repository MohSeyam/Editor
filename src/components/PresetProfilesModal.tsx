import React, { useState, useEffect } from 'react';
import { 
  Bookmark, 
  Sparkles, 
  Trash2, 
  Check, 
  Plus, 
  X, 
  Sliders, 
  Layers, 
  Zap, 
  ShieldCheck, 
  Image as ImageIcon, 
  Lock,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { PresetProfile, Language, ToolType } from '../types';
import { getSavedProfiles, deleteUserProfile, saveUserProfile } from '../utils/presetProfiles';

interface PresetProfilesModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onApplyProfile: (profile: PresetProfile) => void;
}

export const PresetProfilesModal: React.FC<PresetProfilesModalProps> = ({
  lang,
  isOpen,
  onClose,
  onApplyProfile,
}) => {
  const isAr = lang === 'ar';
  const [profiles, setProfiles] = useState<PresetProfile[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'custom' | 'builtin'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');
  const [newProfileTool, setNewProfileTool] = useState<ToolType>('compress');

  const refreshProfiles = () => {
    setProfiles(getSavedProfiles());
  };

  useEffect(() => {
    if (isOpen) {
      refreshProfiles();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteUserProfile(id);
    refreshProfiles();
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    saveUserProfile({
      name: newProfileName.trim(),
      description: newProfileDesc.trim() || 'ملف تعريف مخصص',
      tool: newProfileTool,
      settings: {
        compressSettings: { level: 'recommended' },
        imageConvertOptions: { format: 'image/webp', quality: 0.8 },
      },
    });

    setNewProfileName('');
    setNewProfileDesc('');
    setShowCreateForm(false);
    refreshProfiles();
  };

  const getProfileIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Zap':
        return <Zap className="w-5 h-5 text-amber-500" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      case 'Image':
        return <ImageIcon className="w-5 h-5 text-blue-500" />;
      case 'Lock':
        return <Lock className="w-5 h-5 text-red-500" />;
      case 'Sparkles':
      default:
        return <Sparkles className="w-5 h-5 text-purple-500" />;
    }
  };

  const filtered = profiles.filter((p) => {
    if (activeFilter === 'custom') return p.isCustom;
    if (activeFilter === 'builtin') return !p.isCustom;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1c1c1e] rounded-3xl border border-neutral-200/80 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {isAr ? 'ملفات المعالجة المسبقة (Profiles)' : 'Processing Profiles'}
              </h3>
              <p className="text-xs text-neutral-400">
                {isAr
                  ? 'إعدادات محفوظة مسبقاً لتطبيقها بنقرة زر واحدة'
                  : 'Saved presets to apply instantly with one click'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Tabs & Add Button */}
        <div className="px-6 py-3 bg-neutral-50/70 dark:bg-white/[0.02] border-b border-neutral-100 dark:border-white/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-neutral-200/60 dark:bg-white/10 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white dark:bg-[#2c2c2e] text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {isAr ? 'الكل' : 'All'} ({profiles.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('builtin')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeFilter === 'builtin'
                  ? 'bg-white dark:bg-[#2c2c2e] text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {isAr ? 'الافتراضية' : 'Defaults'}
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('custom')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeFilter === 'custom'
                  ? 'bg-white dark:bg-[#2c2c2e] text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {isAr ? 'مخصصة' : 'Custom'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAr ? 'إنشاء ملف تعريف' : 'New Profile'}</span>
          </button>
        </div>

        {/* Create Profile Form Drawer */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateCustom}
            className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-200/60 dark:border-blue-500/20 space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {isAr ? 'حفظ ملف تعريف مخصص جديد' : 'Create New Profile'}
              </span>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                required
                placeholder={isAr ? 'اسم ملف التعريف (مثلاً: ضغط تقارير العمل)' : 'Profile Name'}
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#2c2c2e] border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newProfileTool}
                onChange={(e) => setNewProfileTool(e.target.value as ToolType)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#2c2c2e] border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="compress">{isAr ? 'ضغط PDF' : 'PDF Compress'}</option>
                <option value="image-convert">{isAr ? 'تحويل الصور' : 'Image Convert'}</option>
                <option value="watermark">{isAr ? 'علامة مائية' : 'Watermark'}</option>
                <option value="ocr">{isAr ? 'استخراج النصوص (OCR)' : 'Gemini OCR'}</option>
              </select>
            </div>

            <input
              type="text"
              placeholder={isAr ? 'وصف مختصر اختياري' : 'Optional brief description'}
              value={newProfileDesc}
              onChange={(e) => setNewProfileDesc(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#2c2c2e] border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-sm"
              >
                {isAr ? 'حفظ وتثبيت' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}

        {/* Profiles List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-12 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 dark:text-neutral-400 text-xs">
              {isAr ? 'لا توجد ملفات تعريف محفوظة في هذا القسم' : 'No profiles found in this category'}
            </div>
          ) : (
            filtered.map((profile) => (
              <div
                key={profile.id}
                onClick={() => {
                  onApplyProfile(profile);
                  onClose();
                }}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-[#252528] border border-neutral-200/80 dark:border-white/10 hover:border-blue-500/60 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all cursor-pointer shadow-2xs gap-3"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 pr-2 rtl:pr-0 rtl:pl-2">
                  <div className="w-11 h-11 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-neutral-200/80 dark:border-white/10 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    {getProfileIcon(profile.iconName)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {profile.name}
                      </p>
                      {profile.isCustom && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          {isAr ? 'مخصص' : 'Custom'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2 mt-0.5 leading-relaxed">
                      {profile.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0 self-end sm:self-center">
                  {profile.isCustom && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(profile.id, e)}
                      title={isAr ? 'حذف ملف التعريف' : 'Delete Profile'}
                      className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <span className="px-3.5 py-2 rounded-xl bg-blue-600 text-white dark:bg-blue-600 text-xs font-semibold hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-xs">
                    <span>{isAr ? 'تطبيق' : 'Apply'}</span>
                    {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
