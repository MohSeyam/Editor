import { PresetProfile, ToolType } from '../types';

const PROFILES_STORAGE_KEY = 'docstudio_user_profiles';

export const DEFAULT_PROFILES: PresetProfile[] = [
  {
    id: 'default-web-compression',
    name: 'أقصى ضغط للويب والمشاركة',
    description: 'ضغط PDF فائق أو تحويل صور إلى WebP بجودة 70% وحجم مثالي للإرسال بالبريد والواتساب',
    iconName: 'Zap',
    isCustom: false,
    createdAt: 1700000000000,
    tool: 'compress',
    settings: {
      compressSettings: { level: 'extreme' },
      imageConvertOptions: {
        format: 'image/webp',
        quality: 0.7,
        maxWidth: 1600,
      },
    },
  },
  {
    id: 'default-archive-official',
    name: 'أرشفة رسمية بدون فقدان جودة',
    description: 'تسطيح حقول النماذج، إزالة العناصر غير الضرورية مع الحفاظ التام على وضوح الخطوط والرسوم',
    iconName: 'ShieldCheck',
    isCustom: false,
    createdAt: 1700000001000,
    tool: 'compress',
    settings: {
      compressSettings: { level: 'recommended' },
      metadataSettings: {
        title: 'مستند مؤرشف',
        author: 'DocStudio Engine',
        subject: 'وثيقة رسمية مؤرشفة',
        keywords: 'أرشيف, رسمي, PDF/A',
        creator: 'DocStudio',
      },
    },
  },
  {
    id: 'default-highres-photos',
    name: 'تحويل صور عالي الدقة (Lossless)',
    description: 'تصدير صور PNG عالية الجودة بخلفية شفافة والحفاظ على كافة التفاصيل',
    iconName: 'Image',
    isCustom: false,
    createdAt: 1700000002000,
    tool: 'image-convert',
    settings: {
      imageConvertOptions: {
        format: 'image/png',
        quality: 1.0,
      },
    },
  },
  {
    id: 'default-confidential-stamp',
    name: 'علامة مائية: سري للغاية',
    description: 'إضافة ختم مائل أحمر شبه شفاف بعبارة "سري للغاية - CONFIDENTIAL"',
    iconName: 'Lock',
    isCustom: false,
    createdAt: 1700000003000,
    tool: 'watermark',
    settings: {
      watermarkSettings: {
        text: 'سري للغاية - CONFIDENTIAL',
        opacity: 0.22,
        fontSize: 34,
        rotation: 45,
        color: '#dc2626',
      },
    },
  },
  {
    id: 'default-text-extract',
    name: 'استخراج نصوص المستند والجداول محلياً',
    description: 'استخراج وتنسيق النصوص والقوائم من ملفات PDF وWord بسرعة وأمان تام بدون إنترنت',
    iconName: 'FileText',
    isCustom: false,
    createdAt: 1700000004000,
    tool: 'extract-text',
    settings: {},
  },
];

export function getSavedProfiles(): PresetProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILES;
    const customProfiles: PresetProfile[] = JSON.parse(raw);
    return [...DEFAULT_PROFILES, ...customProfiles];
  } catch (e) {
    console.warn('Failed to parse profiles from localStorage', e);
    return DEFAULT_PROFILES;
  }
}

export function saveUserProfile(profile: Omit<PresetProfile, 'id' | 'createdAt' | 'isCustom'>): PresetProfile {
  const newProfile: PresetProfile = {
    ...profile,
    id: `custom-profile-${Date.now()}`,
    isCustom: true,
    createdAt: Date.now(),
  };

  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    const existing: PresetProfile[] = raw ? JSON.parse(raw) : [];
    existing.push(newProfile);
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Failed to save user profile', e);
  }

  return newProfile;
}

export function deleteUserProfile(profileId: string): void {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) return;
    const existing: PresetProfile[] = JSON.parse(raw);
    const filtered = existing.filter((p) => p.id !== profileId);
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to delete user profile', e);
  }
}
