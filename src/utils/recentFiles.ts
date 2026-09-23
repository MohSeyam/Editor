export interface RecentFileRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  toolUsed: string;
  timestamp: number;
  formattedDate: string;
  downloadName: string;
  previewDataUrl?: string;
  isEncrypted?: boolean;
  encryptionType?: string;
}

const STORAGE_KEY = 'docstudio_recent_files_v1';
const MAX_RECENT = 5;

export function getRecentFiles(): RecentFileRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_RECENT);
    }
  } catch (e) {
    console.error('Failed to parse recent files from localStorage', e);
  }
  return [];
}

export function saveRecentFile(file: Omit<RecentFileRecord, 'id' | 'timestamp' | 'formattedDate'>): RecentFileRecord {
  const current = getRecentFiles();
  const date = new Date();
  const newRecord: RecentFileRecord = {
    ...file,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    formattedDate: date.toLocaleDateString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    }),
  };

  // Filter out any record with exact same downloadName and prepend new
  const updated = [newRecord, ...current.filter((item) => item.downloadName !== newRecord.downloadName)].slice(0, MAX_RECENT);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    // If quota exceeded due to dataUrl, remove previewDataUrl and retry
    try {
      const lightweight = updated.map(({ previewDataUrl, ...rest }) => rest);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
    } catch (err) {
      console.warn('Could not save to localStorage', err);
    }
  }

  return newRecord;
}

export function clearRecentFiles(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear recent files', e);
  }
}
