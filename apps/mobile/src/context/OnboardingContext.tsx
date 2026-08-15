import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type OnboardingContextValue = {
  goalId: string | null;
  setGoalId: (id: string) => void;
  planId: string | null;
  setPlanId: (id: string) => void;
  reset: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [goalId, setGoalId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setGoalId(null);
    setPlanId(null);
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({ goalId, setGoalId, planId, setPlanId, reset }),
    [goalId, planId, reset],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding OnboardingProvider içinde kullanılmalı.");
  return ctx;
}
