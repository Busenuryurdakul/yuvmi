import { useCallback, useEffect, useRef, useState } from "react";
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
  fetchPlans,
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
  const [history, setHistory] = useState<AlignmentResponse[]>([]);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [futureSelf, setFutureSelf] = useState<FutureSelfResponse | null>(null);
  const [goal, setGoal] = useState<GoalResponse | null>(null);
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError(null);
    try {
      const [checkinResult, taskResult, alignmentResult, historyResult, planResult, futureResult, goalResult, plansResult] =
        await Promise.allSettled([
          fetchTodayCheckin(user.token),
          fetchTodayTask(user.token),
          fetchTodayAlignment(user.token),
          fetchAlignmentHistory(user.token),
          fetchActivePlan(user.token),
          fetchFutureSelf(user.token),
          fetchActiveGoal(user.token),
          fetchPlans(user.token),
        ]);

      if (!mountedRef.current) return;

      setCheckin(checkinResult.status === "fulfilled" ? checkinResult.value : null);
      setTask(taskResult.status === "fulfilled" ? taskResult.value : null);
      setAlignment(alignmentResult.status === "fulfilled" ? alignmentResult.value : null);
      setHistory(historyResult.status === "fulfilled" ? historyResult.value : []);
      setPlan(planResult.status === "fulfilled" ? planResult.value : null);
      setFutureSelf(futureResult.status === "fulfilled" ? futureResult.value : null);
      setGoal(goalResult.status === "fulfilled" ? goalResult.value : null);
      setPlans(plansResult.status === "fulfilled" ? plansResult.value : []);

      if (
        checkinResult.status === "rejected" &&
        taskResult.status === "rejected" &&
        alignmentResult.status === "rejected"
      ) {
        const err = checkinResult.reason;
        setError(err instanceof ApiError ? err.message : "Veriler yüklenemedi.");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { checkin, task, alignment, history, plan, futureSelf, goal, plans, loading, error, refresh, setCheckin, setTask };
}
