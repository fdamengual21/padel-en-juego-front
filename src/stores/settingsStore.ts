import { create } from "zustand";
import { persist } from "zustand/middleware";

export const SETTINGS_STORE_KEY = "padel-en-juego.settings";

export type AppTheme = "light" | "dark";

interface SettingsPersisted {
  theme: AppTheme;
}

interface SettingsStore extends SettingsPersisted {
  setTheme: (theme: AppTheme) => void;
}

function isAppTheme(value: unknown): value is AppTheme {
  return value === "light" || value === "dark";
}

function readPersistedTheme(): AppTheme {
  if (typeof window === "undefined") return "light";
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORE_KEY);
    if (!raw) return "light";
    const parsed = JSON.parse(raw) as { state?: { theme?: unknown } };
    return isAppTheme(parsed.state?.theme) ? parsed.state.theme : "light";
  } catch {
    return "light";
  }
}

const THEME_COLOR = {
  light: "#f4f6f8",
  dark: "#1b2030",
} as const;

export function applyDocumentTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const isDark = theme === "dark";
  const colorSchemeOnly = isDark ? "only dark" : "only light";

  root.classList.toggle("dark", isDark);
  root.classList.toggle("light", !isDark);
  root.style.colorScheme = colorSchemeOnly;

  const schemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (schemeMeta) schemeMeta.setAttribute("content", colorSchemeOnly);

  const supportedMeta = document.querySelector('meta[name="supported-color-schemes"]');
  if (supportedMeta) supportedMeta.setAttribute("content", theme);

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", THEME_COLOR[theme]);
}

const initialTheme = readPersistedTheme();

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: initialTheme,
      setTheme: (theme) => {
        set({ theme });
        applyDocumentTheme(theme);
      },
    }),
    {
      name: SETTINGS_STORE_KEY,
      version: 1,
      partialize: (state): SettingsPersisted => ({ theme: state.theme }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<SettingsPersisted>;
        return {
          ...currentState,
          theme: isAppTheme(persisted.theme) ? persisted.theme : "light",
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) applyDocumentTheme(state.theme);
      },
    },
  ),
);

applyDocumentTheme(initialTheme);
