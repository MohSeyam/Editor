import { useEffect } from 'react';

export interface UseKeyboardShortcutsOptions {
  onDownload?: () => void;
  onUndo?: () => void;
  onEscape?: () => void;
  onUpload?: () => void;
  onToggleTheme?: () => void;
  onToggleLanguage?: () => void;
  onOpenShortcuts?: () => void;
  onToggleShortcuts?: () => void;
  onHome?: () => void;
  onOpenStats?: () => void;
  onOpenTools?: () => void;
  onBack?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onDownload,
  onUndo,
  onEscape,
  onUpload,
  onToggleTheme,
  onToggleLanguage,
  onOpenShortcuts,
  onToggleShortcuts,
  onHome,
  onOpenStats,
  onOpenTools,
  onBack,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys if typing inside an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.getAttribute('contenteditable') === 'true');

      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // 1. Esc key
      if (e.key === 'Escape') {
        if (onEscape) {
          e.preventDefault();
          onEscape();
        } else if (onBack) {
          e.preventDefault();
          onBack();
        }
        return;
      }

      // If user is actively typing in a text field, do not hijack normal typing
      if (isInput) return;

      // 2. Ctrl/Cmd + S: Quick Download
      if (isCtrlOrCmd && (e.key === 's' || e.key === 'S')) {
        if (onDownload) {
          e.preventDefault();
          onDownload();
        }
        return;
      }

      // 3. Ctrl/Cmd + Z: Undo / Step Back
      if (isCtrlOrCmd && (e.key === 'z' || e.key === 'Z')) {
        if (onUndo) {
          e.preventDefault();
          onUndo();
        } else if (onBack) {
          e.preventDefault();
          onBack();
        }
        return;
      }

      // 4. Ctrl/Cmd + O: Open Upload Picker
      if (isCtrlOrCmd && (e.key === 'o' || e.key === 'O')) {
        if (onUpload) {
          e.preventDefault();
          onUpload();
        }
        return;
      }

      // 5. Ctrl/Cmd + D: Toggle Dark Mode
      if (isCtrlOrCmd && (e.key === 'd' || e.key === 'D')) {
        if (onToggleTheme) {
          e.preventDefault();
          onToggleTheme();
        }
        return;
      }

      // 6. Ctrl/Cmd + L: Toggle Language
      if (isCtrlOrCmd && (e.key === 'l' || e.key === 'L')) {
        if (onToggleLanguage) {
          e.preventDefault();
          onToggleLanguage();
        }
        return;
      }

      // 7. Ctrl/Cmd + H: Return Home
      if (isCtrlOrCmd && (e.key === 'h' || e.key === 'H')) {
        if (onHome) {
          e.preventDefault();
          onHome();
        }
        return;
      }

      // 8. ?: Show Shortcuts Cheatsheet
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        const handler = onOpenShortcuts || onToggleShortcuts;
        if (handler) {
          e.preventDefault();
          handler();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    onDownload,
    onUndo,
    onEscape,
    onUpload,
    onToggleTheme,
    onToggleLanguage,
    onOpenShortcuts,
    onToggleShortcuts,
    onHome,
    onOpenStats,
    onOpenTools,
    onBack,
  ]);
}
