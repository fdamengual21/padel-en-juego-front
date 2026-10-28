import { useEffect } from "react";
import { applyDocumentTheme, useSettingsStore } from "@/stores/settingsStore";

export default function SettingsThemeSync() {
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    applyDocumentTheme(theme);
  }, [theme]);

  return null;
}
