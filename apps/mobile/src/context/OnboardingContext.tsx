import { createContext, useContext, useState, type ReactNode } from "react";

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

  return (
    <OnboardingContext.Provider
      value={{
        goalId,
        setGoalId,
        planId,
        setPlanId,
        reset: () => {
          setGoalId(null);
          setPlanId(null);
        },
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding OnboardingProvider içinde kullanılmalı.");
  return ctx;
}
