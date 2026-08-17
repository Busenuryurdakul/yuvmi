"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api/client";
import type {
  AlignmentResponse,
  GoalResponse,
  PlanResponse,
  WeeklyReviewResponse,
} from "@/lib/api/types";
import {
  applyWeeklyReview,
  fetchActiveGoal,
  fetchActivePlan,
  fetchAlignmentHistory,
  fetchCurrentWeeklyReview,
  fetchTodayAlignment,
} from "@/lib/api/yuvmi";
import { shortStamp, toDateKey } from "@/lib/formatDate";
import { AlignmentRing, AppButton, AppCard, AppLoading } from "./ui";

function healthCopy(alignment: AlignmentResponse | null) {
  if (!alignment) {
    return { title: "Ritim kuruluyor", body: "Günlük adımlar birikince planın nabzı burada görünecek." };
  }
  if (alignment.overallScore >= 75) return { title: "Ritim yerinde", body: alignment.summaryExplanation };
  if (alignment.overallScore >= 45) return { title: "Biraz yoğun", body: alignment.summaryExplanation };
  return { title: "Hafifletilebilir", body: alignment.summaryExplanation };
}

export function ProgressView() {
  const { user } = useAuth();
  const token = user?.token;
  const [goal, setGoal] = useState<GoalResponse | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [alignment, setAlignment] = useState<AlignmentResponse | null>(null);
  const [history, setHistory] = useState<AlignmentResponse[]>([]);
  const [review, setReview] = useState<WeeklyReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const [goalResult, planResult, alignmentResult, historyResult, reviewResult] = await Promise.allSettled([
        fetchActiveGoal(token),
        fetchActivePlan(token),
        fetchTodayAlignment(token),
        fetchAlignmentHistory(token),
        fetchCurrentWeeklyReview(token),
      ]);
      if (cancelled) return;
      setGoal(goalResult.status === "fulfilled" ? goalResult.value : null);
      setPlan(planResult.status === "fulfilled" ? planResult.value : null);
      setAlignment(alignmentResult.status === "fulfilled" ? alignmentResult.value : null);
      setHistory(historyResult.status === "fulfilled" ? historyResult.value : []);
      if (reviewResult.status === "fulfilled") setReview(reviewResult.value);
      else if (reviewResult.reason instanceof ApiError && reviewResult.reason.code === 404) setReview(null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const ticks = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (const snap of history) byDate[toDateKey(snap.date)] = snap.overallScore;
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - index));
      return byDate[toDateKey(date)] ?? null;
    });
  }, [history]);

  async function handleApply() {
    if (!token || !review) return;
    setApplying(true);
    setNotice(null);
    try {
      const nextPlan = await applyWeeklyReview(token, review.id);
      setNotice(`Plan v${nextPlan.version} aktif.`);
      const [planResult, alignmentResult, reviewResult] = await Promise.allSettled([
        fetchActivePlan(token),
        fetchTodayAlignment(token),
        fetchCurrentWeeklyReview(token),
      ]);
      if (planResult.status === "fulfilled") setPlan(planResult.value);
      if (alignmentResult.status === "fulfilled") setAlignment(alignmentResult.value);
      if (reviewResult.status === "fulfilled") setReview(reviewResult.value);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Plan güncellenemedi.");
    } finally {
      setApplying(false);
    }
  }

  if (loading) return <AppLoading label="İlerleme yükleniyor…" />;

  const health = healthCopy(alignment);

  return (
    <div className="app-page">
      <header className="app-page-header">
        <p className="app-kicker">{goal?.title ?? "İlerleme"}</p>
        <h1>İlerleme ve analiz</h1>
        <p className="app-muted">Skor değil, anlayış. Mobildekiyle aynı hizalanma ve haftalık ritim.</p>
      </header>

      {notice ? <p className="app-banner app-banner-ok">{notice}</p> : null}

      <div className="app-grid">
        <AppCard className="app-align-card">
          <p className="app-kicker">Bugünkü hizalanma</p>
          <div className="app-align-row">
            <AlignmentRing score={alignment?.overallScore ?? 0} />
            <div>
              <p className="app-card-title">{health.title}</p>
              <p className="app-muted">{health.body}</p>
            </div>
          </div>
          <div className="app-spark" aria-label="Son 14 gün">
            {ticks.map((score, index) => (
              <span
                key={index}
                className={`app-spark-bar ${score == null ? "is-empty" : ""}`}
                style={{ height: `${score == null ? 12 : Math.max(12, score)}%` }}
              />
            ))}
          </div>
        </AppCard>

        <AppCard>
          <p className="app-kicker">{plan ? `Plan v${plan.version}` : "Plan"}</p>
          <h2 className="app-card-title">{plan?.title ?? "Aktif plan yok"}</h2>
          <p className="app-muted">
            {plan
              ? `${shortStamp(plan.createdAt)} · ${plan.steps.length} adım`
              : "Onboarding’de bir plan seçtiğinde burada görünür."}
          </p>
          {plan?.steps.length ? (
            <ol className="app-list app-steps">
              {plan.steps.map((step, index) => (
                <li key={step.id}>
                  <strong>
                    {String(index + 1).padStart(2, "0")} · {step.title}
                  </strong>
                  {step.description ? <span>{step.description}</span> : null}
                </li>
              ))}
            </ol>
          ) : null}
        </AppCard>
      </div>

      {alignment?.factors.length ? (
        <AppCard>
          <p className="app-kicker">Nasıl oluştu?</p>
          <ul className="app-factor-list">
            {alignment.factors.map((factor) => (
              <li key={factor.type}>
                <div>
                  <strong>{factor.label}</strong>
                  <span>+{factor.contribution}</span>
                </div>
                <p>{factor.explanation}</p>
              </li>
            ))}
          </ul>
          <p className="app-muted">Ruh hâlin skoru düşürmez.</p>
        </AppCard>
      ) : null}

      <AppCard>
        <p className="app-kicker">Haftalık değerlendirme</p>
        {review ? (
          <>
            <h2 className="app-card-title">{review.weekStartDate} haftası</h2>
            <div className="app-stat-row">
              <div>
                <strong>{review.metrics.daysActive}/7</strong>
                <span>dolu gün</span>
              </div>
              <div>
                <strong>{review.metrics.taskCompleted}</strong>
                <span>tamamlanan</span>
              </div>
              <div>
                <strong>{Math.round(review.metrics.avgAlignment)}</strong>
                <span>ort. hizalanma</span>
              </div>
              <div>
                <strong>{review.metrics.avgMood.toFixed(1)}</strong>
                <span>ort. ruh hali</span>
              </div>
            </div>
            <p className="app-muted">{review.summary || "Henüz yeterince örüntü yok."}</p>
            <p>{review.adaptations[0] ?? "Plan sana uymuyorsa plan değişir. Sen değil."}</p>
            {review.status !== "applied" && review.nextPlanVersion ? (
              <AppButton loading={applying} onClick={() => void handleApply()}>
                Planı güncelle
              </AppButton>
            ) : null}
          </>
        ) : (
          <p className="app-muted">7 günlük check-in ve görev verisi birikince otomatik oluşur.</p>
        )}
      </AppCard>
    </div>
  );
}
