import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Environment } from "./types";

export type ThemePreference = "light" | "dark" | "system";
export type Density = "comfortable" | "compact";

interface UiState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  density: Density;
  setDensity: (d: Density) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      environment: "production",
      setEnvironment: (environment) => set({ environment }),
      density: "comfortable",
      setDensity: (density) => set({ density }),
      commandPaletteOpen: false,
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
    }),
    {
      name: "visionserve-ui",
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? ({
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            } as unknown as Storage)
          : window.localStorage,
      ),
      partialize: (s) => ({
        theme: s.theme,
        sidebarCollapsed: s.sidebarCollapsed,
        environment: s.environment,
        density: s.density,
      }),
    },
  ),
);

export function resolveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
}

/** Applies the resolved theme class to <html> and keeps it in sync. */
export function useApplyTheme() {
  const theme = useUiStore((s) => s.theme);
  if (typeof window !== "undefined") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
  }
  return theme;
}

export function applyThemeClass(pref: ThemePreference) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(pref);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}
