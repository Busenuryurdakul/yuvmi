"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTodayDashboard } from "@/hooks/useTodayDashboard";
import type { CheckinResponse } from "@/lib/api/types";
import { completeTask, skipTask, upsertCheckin } from "@/lib/api/yuvmi";
import { longDate, toDateKey } from "@/lib/formatDate";
import { AlignmentRing, AppButton, AppCard, AppLoading, AppTextarea } from "./ui";

const MOODS = [
  { label: "Ağır", value: 1 },
  { label: "İdare eder", value: 2 },
  { label: "Nötr", value: 3 },
  { label: "İyi", value: 4 },
  { label: "Enerjik", value: 5 },
] as const;

export function TodayView() {
  const { user } = useAuth();
  const { checkin, task, alignment, history, futureSelf, goal, loading, error, refresh, setCheckin, setTask } =
    useTodayDashboard();
  const [taskBusy, setTaskBusy] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const ticks = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (const snap of history) byDate[toDateKey(snap.date)] = snap.overallScore;
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - index));
      const score = index === 13 ? alignment?.overallScore : byDate[toDateKey(date)];
      return score ?? null;
    });
  }, [alignment?.overallScore, history]);

  async function handleComplete() {
    if (!user?.token || !task) return;
    setTaskBusy(true);
    setNotice(null);
    try {
      setTask(await completeTask(user.token, task.id));
      void refresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Görev tamamlanamadı.");
    } finally {
      setTaskBusy(false);
    }
  }

  async function handleSkip() {
    if (!user?.token || !task) return;
    setTaskBusy(true);
    setNotice(null);
    try {
      setTask(await skipTask(user.token, task.id, skipReason.trim() || undefined));
      void refresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Görev atlanamadı.");
    } finally {
      setTaskBusy(false);
    }
  }

  if (loading) return <AppLoading label="Bugün yükleniyor…" />;

  const greeting = user?.displayName ? `Merhaba, ${user.displayName.split(" ")[0]}` : "Merhaba";
  const taskDone = task?.status === "completed" || task?.status === "skipped";

  return (
    <div className="app-page">
      <header className="app-page-header">
        <p className="app-kicker">{longDate()}</p>
        <h1>{greeting}</h1>
        <p className="app-muted">Bugün neredesin, gelecekteki sana ne kadar yakınsın.</p>
      </header>

      {error ? <p className="app-banner app-banner-error">{error}</p> : null}
      {notice ? <p className="app-banner app-banner-ok">{notice}</p> : null}

      <div className="app-grid">
        <AppCard className="app-align-card">
          <p className="app-kicker">Hizalanma</p>
          <div className="app-align-row">
            <AlignmentRing score={alignment?.overallScore ?? 0} />
            <div>
              <p className="app-card-title">{goal?.title ?? "Yolculuk"}</p>
              <p className="app-muted">
                {alignment?.summaryExplanation || "Günlük adımlar birikince skor burada oluşur."}
              </p>
              <Link href="/app/progress" className="app-inline-link">
                Analize git
              </Link>
            </div>
          </div>
          <div className="app-spark" aria-label="Son 14 gün hizalanma">
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
          <p className="app-kicker">Bugünün görevi</p>
          {task ? (
            <>
              <h2 className="app-card-title">{task.title}</h2>
              <p className="app-muted">{task.description}</p>
              <p className="app-status">
                {task.status === "completed"
                  ? "Tamamlandı"
                  : task.status === "skipped"
                    ? "Atlandı"
                    : "Bekliyor"}
              </p>
              {!taskDone ? (
                <div className="app-form">
                  <div className="app-form-row">
                    <AppButton loading={taskBusy} onClick={() => void handleComplete()}>
                      Tamamla
                    </AppButton>
                    <AppButton
                      variant="secondary"
                      loading={taskBusy}
                      onClick={() => void handleSkip()}
                    >
                      Atla
                    </AppButton>
                  </div>
                  <input
                    className="app-inline-input"
                    value={skipReason}
                    onChange={(event) => setSkipReason(event.target.value)}
                    placeholder="Atlama nedeni (opsiyonel)"
                  />
                </div>
              ) : null}
            </>
          ) : (
            <p className="app-muted">Bugün için görev yok. Aktif planın ilk adımı burada görünür.</p>
          )}
        </AppCard>
      </div>

      <CheckinCard
        key={checkin?.id ?? "new-checkin"}
        checkin={checkin}
        token={user?.token}
        onSaved={(next) => {
          setCheckin(next);
          setNotice("Bugünkü check-in kaydedildi.");
          void refresh();
        }}
        onError={(message) => setNotice(message)}
      />

      {futureSelf ? (
        <AppCard>
          <p className="app-kicker">Gelecekteki Ben</p>
          <blockquote className="app-quote">“{futureSelf.description || futureSelf.title}”</blockquote>
          {futureSelf.affirmations[0] ? (
            <p className="app-muted">{futureSelf.affirmations[0]}</p>
          ) : null}
          <Link href="/app/future-self" className="app-inline-link">
            Vizyonu aç
          </Link>
        </AppCard>
      ) : null}
    </div>
  );
}

function CheckinCard({
  checkin,
  token,
  onSaved,
  onError,
}: {
  checkin: CheckinResponse | null;
  token?: string;
  onSaved: (next: CheckinResponse) => void;
  onError: (message: string) => void;
}) {
  const [mood, setMood] = useState(checkin?.mood ?? 3);
  const [energy, setEnergy] = useState(checkin?.energy ?? 3);
  const [reflection, setReflection] = useState(checkin?.reflection ?? "");
  const [gratitude, setGratitude] = useState(checkin?.gratitude[0] ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!token) return;
    setSaving(true);
    try {
      const next = await upsertCheckin(token, {
        mood,
        energy,
        gratitude: gratitude.trim() ? [gratitude.trim()] : [],
        reflection: reflection.trim(),
      });
      onSaved(next);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Check-in kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppCard>
      <p className="app-kicker">Check-in</p>
      <h2 className="app-card-title">Bugün nasıl hissediyorsun?</h2>
      <fieldset className="app-field">
        <legend>Ruh hali</legend>
        <div className="app-chips">
          {MOODS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`app-chip ${mood === item.value ? "is-active" : ""}`}
              onClick={() => setMood(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="app-field">
        <legend>Enerji</legend>
        <div className="app-chips">
          {MOODS.map((item) => (
            <button
              key={`energy-${item.value}`}
              type="button"
              className={`app-chip ${energy === item.value ? "is-active" : ""}`}
              onClick={() => setEnergy(item.value)}
            >
              {item.value}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="app-form">
        <input
          className="app-inline-input"
          value={gratitude}
          onChange={(event) => setGratitude(event.target.value)}
          placeholder="Bugün minnettar olduğun bir şey"
        />
        <AppTextarea
          label="Kısa not"
          value={reflection}
          onChange={(event) => setReflection(event.target.value)}
          rows={3}
          placeholder="Bugünü bir cümleyle bırak"
        />
        <AppButton loading={saving} onClick={() => void save()}>
          Kaydet
        </AppButton>
      </div>
    </AppCard>
  );
}
