"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import type {
  AlignmentResponse,
  CheckinResponse,
  DailyTaskResponse,
  FutureSelfResponse,
  GoalResponse,
  PlanResponse,
} from "@/lib/api/types";
import {
  fetchActiveGoal,
  fetchActivePlan,
  fetchAlignmentHistory,
  fetchFutureSelf,
  fetchTodayAlignment,
  fetchTodayCheckin,
  fetchTodayTask,
} from "@/lib/api/yuvmi";
import { useAuth } from "@/context/AuthContext";

export function useTodayDashboard() {
  const { user } = useAuth();
  const token = user?.token;
  const [checkin, setCheckin] = useState<CheckinResponse | null>(null);
  const [task, setTask] = useState<DailyTaskResponse | null>(null);
  const [alignment, setAlignment] = useState<AlignmentResponse | null>(null);
  const [history, setHistory] = useState<AlignmentResponse[]>([]);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [futureSelf, setFutureSelf] = useState<FutureSelfResponse | null>(null);
  const [goal, setGoal] = useState<GoalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [checkinResult, taskResult, alignmentResult, historyResult, planResult, futureResult, goalResult] =
        await Promise.allSettled([
          fetchTodayCheckin(token),
          fetchTodayTask(token),
          fetchTodayAlignment(token),
          fetchAlignmentHistory(token),
          fetchActivePlan(token),
          fetchFutureSelf(token),
          fetchActiveGoal(token),
        ]);

      setCheckin(checkinResult.status === "fulfilled" ? checkinResult.value : null);
      setTask(taskResult.status === "fulfilled" ? taskResult.value : null);
      setAlignment(alignmentResult.status === "fulfilled" ? alignmentResult.value : null);
      setHistory(historyResult.status === "fulfilled" ? historyResult.value : []);
      setPlan(planResult.status === "fulfilled" ? planResult.value : null);
      setFutureSelf(futureResult.status === "fulfilled" ? futureResult.value : null);
      setGoal(goalResult.status === "fulfilled" ? goalResult.value : null);

      if (
        checkinResult.status === "rejected" &&
        taskResult.status === "rejected" &&
        alignmentResult.status === "rejected"
      ) {
        const err = checkinResult.reason;
        setError(err instanceof ApiError ? err.message : "Veriler yüklenemedi.");
      } else {
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      await refresh();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, token]);

  return {
    checkin,
    task,
    alignment,
    history,
    plan,
    futureSelf,
    goal,
    loading,
    error,
    refresh,
    setCheckin,
    setTask,
  };
}
