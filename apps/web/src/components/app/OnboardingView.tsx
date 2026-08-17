"use client";

import { useEffect, useRef, useState } from "react";
import { LIFE_DOMAINS, PLAN_TEMPLATES, type LifeDomain, type PlanTemplate } from "@yuvmi/shared";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api/client";
import type { FutureSelfResponse } from "@/lib/api/types";
import {
  activatePlan,
  approveFutureSelf,
  createFutureSelf,
  createGoal,
  createPlan,
  fetchActiveGoal,
  fetchActivePlan,
  fetchFutureSelf,
  updateFutureSelf,
} from "@/lib/api/yuvmi";
import { AppButton, AppInput, AppLoading, AppTextarea } from "./ui";

const ALL_DOMAINS = Object.keys(LIFE_DOMAINS) as LifeDomain[];

type Step = "future-self" | "review" | "goal" | "plan";

export function OnboardingView() {
  const { user, markOnboardingComplete, refreshProfile } = useAuth();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [step, setStep] = useState<Step>("future-self");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("Gelecekteki Ben");
  const [description, setDescription] = useState("");
  const [domains, setDomains] = useState<LifeDomain[]>(["personal_growth"]);
  const [affirmation, setAffirmation] = useState("");
  const [profile, setProfile] = useState<FutureSelfResponse | null>(null);

  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalId, setGoalId] = useState<string | null>(null);

  const [selected, setSelected] = useState<PlanTemplate>(PLAN_TEMPLATES[0]);
  const didBootstrap = useRef(false);

  useEffect(() => {
    if (!user?.token || didBootstrap.current) return;
    didBootstrap.current = true;

    (async () => {
      try {
        const [futureResult, goalResult, planResult] = await Promise.allSettled([
          fetchFutureSelf(user.token),
          fetchActiveGoal(user.token),
          fetchActivePlan(user.token),
        ]);

        const future = futureResult.status === "fulfilled" ? futureResult.value : null;
        const goal = goalResult.status === "fulfilled" ? goalResult.value : null;
        const plan = planResult.status === "fulfilled" ? planResult.value : null;

        if (plan) {
          markOnboardingComplete();
          await refreshProfile();
          return;
        }

        if (future) {
          setProfile(future);
          setTitle(future.title);
          setDescription(future.description);
          setDomains(future.domains.length ? future.domains : ["personal_growth"]);
          setAffirmation(future.affirmations[0] ?? "");
        }
        if (goal) {
          setGoalId(goal.id);
          setGoalTitle(goal.title);
          setGoalDescription(goal.description);
        }

        if (goal) setStep("plan");
        else if (future?.status === "approved") setStep("goal");
        else if (future) setStep("review");
        else setStep("future-self");
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [markOnboardingComplete, refreshProfile, user?.token]);

  function toggleDomain(domain: LifeDomain) {
    setDomains((prev) =>
      prev.includes(domain) ? prev.filter((item) => item !== domain) : [...prev, domain],
    );
  }

  async function saveFutureSelf() {
    if (!user?.token || domains.length === 0) {
      setError("En az bir yaşam alanı seç.");
      return;
    }
    setLoading(true);
    setError(null);
    if (profile?.status === "approved") {
      setStep("goal");
      setLoading(false);
      return;
    }
    try {
      const body = {
        title: title.trim() || "Gelecekteki Ben",
        description: description.trim(),
        domains,
        affirmations: affirmation.trim() ? [affirmation.trim()] : [],
        visionItems: domains.slice(0, 2).map((domain, index) => ({
          domain,
          title: `${title.trim() || "Gelecekteki Ben"} — ${LIFE_DOMAINS[domain].label.tr}`,
          sortOrder: index,
        })),
      };
      const next = profile
        ? await updateFutureSelf(user.token, body)
        : await createFutureSelf(user.token, body);
      setProfile(next);
      setStep("review");
    } catch (err) {
      if (err instanceof ApiError && err.code === 409) {
        const existing = await fetchFutureSelf(user.token);
        setProfile(existing);
        setStep("review");
      } else {
        setError(err instanceof Error ? err.message : "Kaydedilemedi.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!user?.token) return;
    setLoading(true);
    setError(null);
    try {
      const next = await approveFutureSelf(user.token);
      setProfile(next);
      setStep("goal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onaylanamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function saveGoal() {
    if (!user?.token || !goalTitle.trim()) {
      setError("Hedef başlığı gerekli.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const future = profile ?? (await fetchFutureSelf(user.token));
      const goal = await createGoal(user.token, {
        futureSelfId: future.id,
        title: goalTitle.trim(),
        description: goalDescription.trim(),
      });
      setGoalId(goal.id);
      setStep("plan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hedef kaydedilemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function savePlan() {
    if (!user?.token || !goalId) {
      setError("Hedef bulunamadı. Geri dönüp hedefi kaydet.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const plan = await createPlan(user.token, {
        goalId,
        title: selected.title,
        description: selected.description,
        steps: selected.steps.map((item, index) => ({
          dayOffset: item.dayOffset,
          title: item.title,
          description: item.description,
          sortOrder: index,
        })),
      });
      await activatePlan(user.token, plan.id);
      markOnboardingComplete();
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan aktifleştirilemedi.");
    } finally {
      setLoading(false);
    }
  }

  if (bootstrapping) {
    return (
      <div className="app-auth-screen">
        <AppLoading label="Kurulum hazırlanıyor…" />
      </div>
    );
  }

  const stepIndex = { "future-self": 1, review: 2, goal: 3, plan: 4 }[step];

  return (
    <div className="app-auth-screen">
      <div className="app-auth-card app-onboarding-card">
        <p className="app-kicker">Kurulum · {stepIndex}/4</p>
        {step === "future-self" ? (
          <>
            <h1 className="app-auth-title">Gelecekteki Ben</h1>
            <p className="app-muted">Hayalindeki halini tanımla. Plan buradan beslenir.</p>
            <div className="app-form">
              <AppInput label="Başlık" value={title} onChange={(event) => setTitle(event.target.value)} />
              <AppTextarea
                label="Gelecekteki halin nasıl biri?"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Kendini nasıl hissetmek istiyorsun?"
              />
              <fieldset className="app-field">
                <legend>Hangi alanlarda büyümek istiyorsun?</legend>
                <div className="app-chips">
                  {ALL_DOMAINS.map((domain) => (
                    <button
                      key={domain}
                      type="button"
                      className={`app-chip ${domains.includes(domain) ? "is-active" : ""}`}
                      onClick={() => toggleDomain(domain)}
                    >
                      {LIFE_DOMAINS[domain].emoji} {LIFE_DOMAINS[domain].label.tr}
                    </button>
                  ))}
                </div>
              </fieldset>
              <AppInput
                label="Bir olumlama (opsiyonel)"
                value={affirmation}
                onChange={(event) => setAffirmation(event.target.value)}
              />
              {error ? <p className="app-banner app-banner-error">{error}</p> : null}
              <AppButton loading={loading} onClick={() => void saveFutureSelf()}>
                Devam
              </AppButton>
            </div>
          </>
        ) : null}

        {step === "review" ? (
          <>
            <h1 className="app-auth-title">Profili onayla</h1>
            <p className="app-muted">Dilediğin zaman güncelleyebilirsin.</p>
            <blockquote className="app-quote">“{profile?.description || profile?.title}”</blockquote>
            <div className="app-chips">
              {profile?.domains.map((domain) => (
                <span key={domain} className="app-chip is-active">
                  {LIFE_DOMAINS[domain]?.label.tr ?? domain}
                </span>
              ))}
            </div>
            {profile?.affirmations[0] ? (
              <p className="app-muted">“{profile.affirmations[0]}”</p>
            ) : null}
            {error ? <p className="app-banner app-banner-error">{error}</p> : null}
            <div className="app-form-row">
              <AppButton variant="secondary" onClick={() => setStep("future-self")}>
                Düzenle
              </AppButton>
              <AppButton loading={loading} onClick={() => void handleApprove()}>
                Onayla ve devam et
              </AppButton>
            </div>
          </>
        ) : null}

        {step === "goal" ? (
          <>
            <h1 className="app-auth-title">Hedefin</h1>
            <p className="app-muted">90 gün zorunlu değil — kendi tempon.</p>
            <div className="app-form">
              <AppInput
                label="Hedef başlığı"
                value={goalTitle}
                onChange={(event) => setGoalTitle(event.target.value)}
                placeholder="Örn. Daha disiplinli sabah rutini"
              />
              <AppTextarea
                label="Bu hedef sana ne ifade ediyor?"
                value={goalDescription}
                onChange={(event) => setGoalDescription(event.target.value)}
                rows={4}
              />
              {error ? <p className="app-banner app-banner-error">{error}</p> : null}
              <AppButton loading={loading} onClick={() => void saveGoal()}>
                Devam
              </AppButton>
            </div>
          </>
        ) : null}

        {step === "plan" ? (
          <>
            <h1 className="app-auth-title">Planın</h1>
            <p className="app-muted">Bir şablon seç. İlk günün görevi onayda otomatik atanır.</p>
            <div className="app-template-list">
              {PLAN_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`app-template ${selected.id === template.id ? "is-active" : ""}`}
                  onClick={() => setSelected(template)}
                >
                  <strong>{template.title}</strong>
                  <span>{template.description}</span>
                </button>
              ))}
            </div>
            {error ? <p className="app-banner app-banner-error">{error}</p> : null}
            <AppButton loading={loading} onClick={() => void savePlan()}>
              Planı onayla
            </AppButton>
          </>
        ) : null}
      </div>
    </div>
  );
}
