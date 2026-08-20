import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchSubscription } from "@/lib/api/yuvmi";
import type { SubscriptionResponse } from "@/lib/api/types";

export function useSubscription() {
  const { user } = useAuth();
  const token = user?.token ?? null;
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchSubscription();
      setSubscription(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Abonelik bilgisi alınamadı");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isPremium = subscription?.premiumActive ?? false;

  return { subscription, loading, error, isPremium, refresh };
}

export function isPremiumRequiredError(code: number) {
  return code === 402;
}
