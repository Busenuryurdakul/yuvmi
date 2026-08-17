"use client";

import { useEffect, useState } from "react";
import { LIFE_DOMAINS, type LifeDomain } from "@yuvmi/shared";
import { useAuth } from "@/context/AuthContext";
import type { FutureSelfResponse } from "@/lib/api/types";
import { approveFutureSelf, fetchFutureSelf, updateFutureSelf } from "@/lib/api/yuvmi";
import { shortStamp } from "@/lib/formatDate";
import { AppButton, AppCard, AppEmpty, AppInput, AppLoading, AppTextarea } from "./ui";

const ALL_DOMAINS = Object.keys(LIFE_DOMAINS) as LifeDomain[];

export function FutureSelfView() {
  const { user } = useAuth();
  const token = user?.token;
  const [profile, setProfile] = useState<FutureSelfResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const next = await fetchFutureSelf(token);
        if (cancelled) return;
        setProfile(next);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function startEditing() {
    setEditing(true);
  }

  async function approve() {
    if (!user?.token) return;
    setSaving(true);
    setError(null);
    try {
      setProfile(await approveFutureSelf(user.token));
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onaylanamadı.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AppLoading label="Vizyon yükleniyor…" />;
  if (!profile) {
    return (
      <div className="app-page">
        <AppEmpty
          title="Profil bulunamadı"
          body="Gelecekteki Ben profilin henüz oluşmamış. Kurulumu tamamladığında burada görünür."
        />
      </div>
    );
  }

  return (
    <div className="app-page">
      <header className="app-page-header">
        <p className="app-kicker">
          {profile.status === "approved"
            ? `Onaylandı · ${shortStamp(profile.updatedAt)}`
            : "Taslak"}
        </p>
        <h1>Gelecekteki Ben</h1>
        <p className="app-muted">Kendi cümlelerinle yazdın. Plan buradan besleniyor.</p>
      </header>

      {error ? <p className="app-banner app-banner-error">{error}</p> : null}

      {editing && profile ? (
        <FutureSelfEditor
          profile={profile}
          token={user?.token}
          saving={saving}
          onCancel={() => setEditing(false)}
          onSaving={setSaving}
          onError={setError}
          onSaved={(next) => {
            setProfile(next);
            setEditing(false);
            setError(null);
          }}
        />
      ) : (
        <>
          <AppCard>
            <blockquote className="app-quote app-quote-lg">“{profile.description || profile.title}”</blockquote>
            {profile.status === "draft" ? (
              <div className="app-form-row">
                <AppButton variant="secondary" onClick={startEditing}>
                  Düzenle
                </AppButton>
                <AppButton loading={saving} onClick={() => void approve()}>
                  Onayla
                </AppButton>
              </div>
            ) : null}
          </AppCard>

          <AppCard>
            <p className="app-kicker">Yaşam alanları</p>
            <div className="app-chips">
              {profile.domains.map((domain) => (
                <span key={domain} className="app-chip is-active">
                  {LIFE_DOMAINS[domain]?.emoji} {LIFE_DOMAINS[domain]?.label.tr ?? domain}
                </span>
              ))}
            </div>
          </AppCard>

          <AppCard>
            <p className="app-kicker">Olumlamalar</p>
            {profile.affirmations.length ? (
              <ul className="app-list">
                {profile.affirmations.map((item) => (
                  <li key={item}>“{item}”</li>
                ))}
              </ul>
            ) : (
              <p className="app-muted">Henüz olumlama yok.</p>
            )}
          </AppCard>
        </>
      )}
    </div>
  );
}

function FutureSelfEditor({
  profile,
  token,
  saving,
  onCancel,
  onSaving,
  onError,
  onSaved,
}: {
  profile: FutureSelfResponse;
  token?: string;
  saving: boolean;
  onCancel: () => void;
  onSaving: (value: boolean) => void;
  onError: (message: string | null) => void;
  onSaved: (next: FutureSelfResponse) => void;
}) {
  const [title, setTitle] = useState(profile.title);
  const [description, setDescription] = useState(profile.description);
  const [domains, setDomains] = useState<LifeDomain[]>(profile.domains);
  const [affirmation, setAffirmation] = useState(profile.affirmations[0] ?? "");

  function toggleDomain(domain: LifeDomain) {
    setDomains((prev) =>
      prev.includes(domain) ? prev.filter((item) => item !== domain) : [...prev, domain],
    );
  }

  async function save() {
    if (!token || domains.length === 0) {
      onError("En az bir yaşam alanı seç.");
      return;
    }
    onSaving(true);
    onError(null);
    try {
      const next = await updateFutureSelf(token, {
        title: title.trim() || "Gelecekteki Ben",
        description: description.trim(),
        domains,
        affirmations: affirmation.trim() ? [affirmation.trim()] : [],
        visionItems: domains.slice(0, 2).map((domain, index) => ({
          domain,
          title: `${title.trim() || "Gelecekteki Ben"} — ${LIFE_DOMAINS[domain].label.tr}`,
          sortOrder: index,
        })),
      });
      onSaved(next);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      onSaving(false);
    }
  }

  return (
    <AppCard>
      <div className="app-form">
        <AppInput label="Başlık" value={title} onChange={(event) => setTitle(event.target.value)} />
        <AppTextarea
          label="Vizyon"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
        />
        <fieldset className="app-field">
          <legend>Yaşam alanları</legend>
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
          label="Olumlama"
          value={affirmation}
          onChange={(event) => setAffirmation(event.target.value)}
        />
        <div className="app-form-row">
          <AppButton variant="secondary" onClick={onCancel}>
            Vazgeç
          </AppButton>
          <AppButton loading={saving} onClick={() => void save()}>
            Kaydet
          </AppButton>
        </div>
      </div>
    </AppCard>
  );
}
