import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/stores/settingsStore";

interface ThemeAppearanceSwitchProps {
  onClub?: boolean;
}

export default function ThemeAppearanceSwitch({
  onClub = false,
}: ThemeAppearanceSwitchProps) {
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const isDark = theme === "dark";

  return (
    <div
      className="flex items-center justify-between gap-3 px-1.5 py-1.5"
      data-testid="theme-appearance"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <span className="text-sm">Claro/Oscuro</span>
      <Switch
        checked={isDark}
        aria-label="Tema oscuro"
        className={onClub ? "data-unchecked:bg-sidebar-foreground/25" : undefined}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      />
    </div>
  );
}
