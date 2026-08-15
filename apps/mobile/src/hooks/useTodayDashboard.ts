import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import type { AlignmentResponse, CheckinResponse, DailyTaskResponse } from "@/lib/api/types";
import {
  fetchTodayAlignment,
  fetchTodayCheckin,
  fetchTodayTask,
} from "@/lib/api/yuvmi";
import { useAuth } from "@/context/AuthContext";

export function useTodayDashboard() {
  const { user } = useAuth();
  const [checkin, setCheckin] = useState<CheckinResponse | null>(null);
  const [task, setTask] = useState<DailyTaskResponse | null>(null);
  const [alignment, setAlignment] = useState<AlignmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError(null);
    try {
      const [checkinResult, taskResult, alignmentResult] = await Promise.allSettled([
        fetchTodayCheckin(user.token),
        fetchTodayTask(user.token),
        fetchTodayAlignment(user.token),
      ]);

      setCheckin(checkinResult.status === "fulfilled" ? checkinResult.value : null);
      setTask(taskResult.status === "fulfilled" ? taskResult.value : null);
      setAlignment(alignmentResult.status === "fulfilled" ? alignmentResult.value : null);

      if (
        checkinResult.status === "rejected" &&
        taskResult.status === "rejected" &&
        alignmentResult.status === "rejected"
      ) {
        const err = checkinResult.reason;
        setError(err instanceof ApiError ? err.message : "Veriler yüklenemedi.");
      }
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { checkin, task, alignment, loading, error, refresh };
}
