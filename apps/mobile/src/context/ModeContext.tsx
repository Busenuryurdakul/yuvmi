import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadPrefs, savePrefs, type AppPrefs, type UserMode } from "@/lib/local";

type ModeContextValue = {
  mode: UserMode;
  hard: boolean;
  loading: boolean;
  setMode: (mode: UserMode) => Promise<void>;
  prefs: AppPrefs | null;
  patchPrefs: (next: Partial<AppPrefs>) => Promise<void>;
};

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AppPrefs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadPrefs().then((p) => {
      setPrefs(p);
      setLoading(false);
    });
  }, []);

  const patchPrefs = useCallback(async (next: Partial<AppPrefs>) => {
    setPrefs((prev) => {
      const base =
        prev ??
        ({
          quietWeek: false,
          darkMode: false,
          appLock: true,
          morningReminder: "08:00",
          eveningReminder: "21:30",
          mode: "soft",
          energy: "mid",
          tohum: 48,
          survivalMode: false,
        } satisfies AppPrefs);
      const merged = { ...base, ...next };
      // `tohum` is a local cache of the İnci balance. It is never pushed back
      // to the server: the backend owns the ledger (users.pearl_balance) and
      // hands out pearls through the award endpoints, which enforce the daily
      // caps. Writing the local value up would let a client mint its own.
      void savePrefs(merged);
      return merged;
    });
  }, []);

  const setMode = useCallback(
    async (mode: UserMode) => {
      await patchPrefs({ mode });
    },
    [patchPrefs],
  );

  const value = useMemo<ModeContextValue>(
    () => ({
      mode: prefs?.mode ?? "soft",
      hard: (prefs?.mode ?? "soft") === "hard",
      loading,
      setMode,
      prefs,
      patchPrefs,
    }),
    [prefs, loading, setMode, patchPrefs],
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within ModeProvider");
  return ctx;
}
