# Yuvmi — İnşa Planı

> **Durum:** Aktif yol haritası  
> **Son güncelleme:** 2026-08-11  
> **Referanslar:** [`PRD.md`](./PRD.md) · [`PRD-AI.md`](./PRD-AI.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## 01 — Mevcut Durum Özeti

### Tamamlanan / iskelet halinde

| Katman | Durum | Detay |
|--------|-------|-------|
| **Monorepo** | ✅ | `apps/web`, `apps/mobile`, `packages/shared`, turbo |
| **Shared types** | ✅ | User, Goal, Plan, DailyTask, Space, Alignment, Consent, Asset |
| **Design tokens** | ✅ | `packages/shared/src/tokens/` (color, space, radius) |
| **Web** | 🟡 | Landing + Manifesto lab deneyimi; uygulama shell yok |
| **Mobile shell** | ✅ | Expo Router, 5 tab, auth iskeleti, UI kit |
| **Backend** | ❌ | `apps/api` yok |
| **Veritabanı** | ❌ | — |
| **AI** | ❌ | [`PRD-AI.md`](./PRD-AI.md) planlandı, implementasyon yok |

### Mobil uygulama — dosya haritası

```text
apps/mobile/
├── app/
│   ├── _layout.tsx              ✅ Root + AuthProvider
│   ├── index.tsx                ✅ Entry redirect
│   ├── (auth)/
│   │   ├── _layout.tsx          ✅
│   │   └── welcome.tsx          ✅ Google/Apple giriş UI
│   └── (tabs)/
│       ├── _layout.tsx          ✅ 5 tab nav (PRD ile uyumlu)
│       ├── index.tsx            🟡 Bugün — empty state
│       ├── future-self.tsx      🟡 Empty state
│       ├── journey.tsx          🟡 Empty state
│       ├── spaces.tsx           🟡 Placeholder
│       └── profile.tsx          🟡 Placeholder
├── src/
│   ├── theme/index.ts           ✅ @yuvmi/shared tokens
│   ├── context/AuthContext.tsx  ✅ Oturum (dev mock + OAuth hazır)
│   ├── lib/auth/                ✅ Google, Apple, session
│   └── components/ui/           ✅ Screen, Card, Button, EmptyState, …
├── babel.config.js              ✅
├── metro.config.js              ✅ @ alias
└── .env.example                 ✅ OAuth env şablonu
```

### Shared paket — son değişiklikler

| Değişiklik | Anlam |
|------------|-------|
| `Goal` / `Plan` esnek süre | Sabit 30/90 gün kaldırıldı — PRD ve mobil copy ile uyumlu |
| `SpaceFeature` sadeleştirme | `dream_journal`, `compatibility_insights` kaldırıldı |
| `Consent` tipi mevcut | AI fazına hazır, henüz kullanılmıyor |
| `tokens/` | Web + mobil ortak renk/spacing |

### PRD ile uyum kontrolü

| PRD maddesi | Mobil karşılık | Durum |
|-------------|----------------|-------|
| 5 tab navigation | `(tabs)/_layout.tsx` | ✅ |
| Bugün dashboard | `index.tsx` | 🟡 UI var, veri yok |
| Gelecekteki Ben | `future-self.tsx` | 🟡 Empty state |
| Yolculuk (hedef/plan) | `journey.tsx` | 🟡 Empty state |
| Alanlar | `spaces.tsx` | 🟡 Placeholder |
| Auth (OAuth) | `welcome.tsx` + auth lib | 🟡 UI hazır, backend yok |
| Onboarding akışı | — | ❌ Eksik |
| Check-in | — | ❌ Eksik |
| AI | — | ⏸️ PRD-AI'ya ertelendi |

---

## 02 — Faz Mimarisi

```text
Faz 0 ──► Faz 1 ──► Faz 2 ──► Faz 3 ──► Faz 4 ──► Faz 5
İskelet    MVP Core   Haftalık    Sosyal    Premium    AI
(DONE)     (sıradaki)  döngü      alanlar   abonelik   katmanı
```

| Faz | Hedef | PRD referansı | AI |
|-----|-------|---------------|-----|
| **0** | Monorepo + mobil shell + tipler | — | Hayır |
| **1** | Uçtan uca manuel döngü | PRD P0 | Hayır |
| **2** | Haftalık review + bildirimler | PRD P0 | Hayır |
| **3** | Ortak alanlar + arşiv | PRD P1 | Hayır |
| **4** | Premium + ödeme | PRD P1 | Hayır |
| **5** | AI kişiselleştirme | PRD-AI | Evet |

---

## 03 — Faz 0 — İskelet ✅

**Hedef:** Geliştirme ortamı, paylaşılan tipler, mobil navigasyon iskeleti.

### Tamamlanan işler

- [x] Expo Router geçişi (`expo-router/entry`)
- [x] 5 tab: Bugün, Gelecekteki Ben, Yolculuk, Alanlar, Profil
- [x] Auth welcome ekranı (Google / Apple)
- [x] UI component kit (Screen, Card, Button, EmptyState, PageHeader, LoadingScreen)
- [x] Theme → `@yuvmi/shared` tokens
- [x] Shared domain tipleri ve esnek Goal/Plan modeli
- [x] Space özellikleri sadeleştirme (fal/rüya özellikleri yok)

### Kalan (Faz 0 cleanup)

- [ ] `README.md` mobil başlangıç notları (expo-router, env)
- [ ] Web `apps/web` — uygulama route'ları yok (Faz 1'de veya paralel)

---

## 04 — Faz 1 — MVP Core (sıradaki)

**Hedef:** Kullanıcı kayıt olur → Gelecekteki Ben → Hedef → Plan → Check-in → Günlük görev → Hizalanma. **AI yok.**

**Tahmini süre:** 4–6 hafta (2 geliştirici)

### 1.1 Backend iskelet

```text
apps/api/          ← YENİ (Go)
├── cmd/server/
├── internal/
│   ├── auth/
│   ├── users/
│   ├── goals/
│   ├── plans/
│   ├── tasks/
│   ├── checkins/
│   └── alignment/
└── migrations/
```

| Görev | Çıktı |
|-------|-------|
| Go modül + health check | `GET /health` |
| PostgreSQL + migration | users, future_selfs, goals, plans, daily_tasks, today_entries |
| Auth API | JWT + refresh; Google/Apple token doğrulama |
| User CRUD | Profil |
| FutureSelf CRUD | Onboarding sonrası profil |
| Goal / Plan CRUD | Versiyonlama |
| DailyTask CRUD | Günlük görev atama/tamamlama |
| TodayEntry CRUD | Check-in |
| Alignment engine | `AlignmentSnapshot` hesaplama |
| OpenAPI taslağı | `packages/shared` ile uyum |

### 1.2 Mobil — onboarding

| Route | Ekran | Görev |
|-------|-------|-------|
| `(onboarding)/welcome` | Hoş geldin | Mevcut auth sonrası yönlendirme |
| `(onboarding)/future-self` | Profil formu | Stepper, domain chip, affirmations |
| `(onboarding)/future-self-review` | Onay | Düzenle / Onayla |
| `(onboarding)/goal` | Hedef | title, description, opsiyonel targetDate |
| `(onboarding)/plan` | Plan | Şablon picker + düzenleme |
| `(onboarding)/complete` | Tamamlandı | Dashboard'a yönlendir |

**Guard:** `AuthContext` + `onboardingComplete` flag → tamamlanmamışsa onboarding'e yönlendir.

### 1.3 Mobil — core ekranlar

| Mevcut dosya | Yapılacak |
|--------------|-----------|
| `(tabs)/index.tsx` | Check-in durumu, günlük görev hero, hizalanma KPI, API entegrasyonu |
| `(tabs)/future-self.tsx` | Profil görüntüleme/düzenleme, vision board placeholder |
| `(tabs)/journey.tsx` | Aktif hedef, plan, görev geçmişi, hizalanma detay linki |
| `(tabs)/profile.tsx` | Profil, ayarlar linkleri, çıkış |

**Yeni route'lar:**

```text
app/
├── check-in.tsx                 ← modal veya stack
├── task/[id].tsx
├── alignment.tsx
└── settings/
    ├── index.tsx
    └── notifications.tsx
```

### 1.4 Yeni component'ler (Faz 1)

| Component | Konum |
|-----------|-------|
| `CheckInForm` | `src/components/checkin/` |
| `DailyTaskHero` | `src/components/task/` |
| `AlignmentRing` | `src/components/alignment/` |
| `DomainChipGrid` | `src/components/future-self/` |
| `PlanTemplatePicker` | `src/components/plan/` |
| `Stepper` | `src/components/ui/` |

### 1.5 Shared genişletme

| Ek | Açıklama |
|----|----------|
| `PlanTemplate` tipi | Şablon kütüphanesi için |
| `PlanStep` tipi | Plan içi adımlar (opsiyonel) |
| API response tipleri | `{ data, error }` wrapper |

### 1.6 Faz 1 çıkış kriterleri

- [ ] Kullanıcı OAuth ile giriş yapar (gerçek backend)
- [ ] Onboarding'i tamamlar (Future Self → Goal → Plan)
- [ ] Bugün ekranında check-in yapar
- [ ] Günlük görevi tamamlar veya atlar
- [ ] Hizalanma skoru faktörleriyle görünür
- [ ] `npm run typecheck` temiz (web + mobile + shared)

---

## 05 — Faz 2 — Haftalık Döngü & Bildirimler

**Hedef:** Haftalık gözden geçirme, plan versiyonlama, push hatırlatıcılar.

**Tahmini süre:** 2–3 hafta

| Görev | Detay |
|-------|-------|
| WeeklyReview API | Metrik agregasyonu (AI yok) |
| Plan versiyonlama | `superseded` status, diff UI |
| `journey/weekly-review.tsx` | Metrik + yansıma + plan düzenleme |
| Expo push | Günlük görev + haftalık özet |
| In-app notifications | `(tabs)` dışı stack veya modal |
| Offline queue | Check-in + task complete AsyncStorage kuyruğu |

### Faz 2 çıkış kriterleri

- [ ] 7 günlük kullanımda haftalık review otomatik oluşur
- [ ] Plan v2 onaylanabilir
- [ ] Push bildirimi gelir (test cihaz)

---

## 06 — Faz 3 — Sosyal Alanlar

**Hedef:** Çift / arkadaş / aile alanları, davet, seçici paylaşım, arşiv.

**Tahmini süre:** 3–4 hafta

| Görev | Detay |
|-------|-------|
| Space API | CRUD, membership, invite |
| `(tabs)/spaces.tsx` | Alan listesi |
| `spaces/[id].tsx` | Space detail |
| `spaces/invite.tsx` | Davet akışı |
| Asset upload | S3-compatible storage |
| ShareVisibilityPicker | İçerik bazlı görünürlük |
| Geri çekme | `revokedFromSpaceAt` |

**Not:** `progress_comparison` = yan yana kendi ilerlemen, karşılaştırma/sıralama yok.

---

## 07 — Faz 4 — Premium

**Hedef:** Abonelik, kota kapıları, export.

| Görev | Detay |
|-------|-------|
| Subscription API | Free vs Premium durumu |
| PremiumGate component | İkinci hedef, ek alan |
| Ödeme entegrasyonu | Iyzico / Stripe (karar bekliyor) |
| Data export | JSON/ZIP (Premium) |
| Web parity | `apps/web` uygulama shell (opsiyonel paralel) |

---

## 08 — Faz 5 — AI Katmanı

**Hedef:** [`PRD-AI.md`](./PRD-AI.md) AI-P0 + AI-P1.

**Önkoşul:** Faz 1–2 tamamlanmış olmalı (manuel akışlar çalışıyor).

| Sıra | Görev | PRD-AI |
|------|-------|--------|
| 5.1 | Consent API + UI | §04, §06 |
| 5.2 | AI Orchestrator (Go) | §08 |
| 5.3 | `ai_profile_generation` | Flow A |
| 5.4 | `ai_plan_generation` | — |
| 5.5 | `ai_daily_task` + cron | Flow B |
| 5.6 | `ai_weekly_review` | Flow C |
| 5.7 | AI UI components | AIGeneratingSkeleton, AIProposalCard |
| 5.8 | Premium AI (sohbet, ses, görsel) | AI-P2 |

**Kritik:** Manuel mod her zaman fallback olarak kalır.

---

## 09 — Paralel İş Akışı (2 kişilik ekip)

[`COLLABORATION.md`](./COLLABORATION.md) branch kurallarına uygun öneri:

| Geliştirici A | Geliştirici B |
|---------------|---------------|
| `apps/api` auth + users | Mobil onboarding ekranları |
| Goals / Plans API | Bugün + check-in UI |
| Alignment engine | Journey + alignment UI |
| Weekly review API (Faz 2) | Push + notifications (Faz 2) |
| Space API (Faz 3) | Spaces UI (Faz 3) |
| AI orchestrator (Faz 5) | AI consent + proposal UI (Faz 5) |

**Branch örneği:**
```text
feat/api-auth-jwt
feat/mobile-onboarding
feat/mobile-checkin
feat/api-alignment
```

---

## 10 — Teknoloji Kararları (henüz açık)

| Konu | Durum | Faz 1 önerisi |
|------|-------|---------------|
| Go HTTP framework | Açık | chi veya stdlib |
| DB query | Açık | sqlc |
| PostgreSQL hosting | Açık | Supabase / Neon / self-host — Faz 1 kapısı |
| Auth protokolü | Açık | JWT + refresh |
| Object storage | Açık | Faz 3 |
| Ödeme | Açık | Faz 4 |
| AI provider | Açık | Faz 5 — gateway abstraction |

---

## 11 — Dosya Oluşturma Sırası (Faz 1 checklist)

### Backend (sırayla)

1. `apps/api/go.mod`
2. `apps/api/cmd/server/main.go`
3. `apps/api/internal/config/`
4. `apps/api/migrations/001_users.sql`
5. `apps/api/internal/auth/`
6. `apps/api/internal/users/`
7. `apps/api/internal/goals/`
8. `apps/api/internal/plans/`
9. `apps/api/internal/tasks/`
10. `apps/api/internal/checkins/`
11. `apps/api/internal/alignment/`

### Mobil (sırayla)

1. `src/lib/api/client.ts`
2. `src/context/OnboardingContext.tsx`
3. `app/(onboarding)/_layout.tsx`
4. `app/(onboarding)/future-self.tsx`
5. `app/(onboarding)/goal.tsx`
6. `app/(onboarding)/plan.tsx`
7. `src/components/checkin/CheckInForm.tsx`
8. `app/check-in.tsx`
9. `(tabs)/index.tsx` — API bağlantısı
10. `(tabs)/journey.tsx` — API bağlantısı

### Shared

1. `src/types/api.ts` — request/response wrapper
2. `src/constants/plan-templates.ts` — şablon kütüphanesi

---

## 12 — Riskler & Bağımlılıklar

| Risk | Etki | Azaltma |
|------|------|---------|
| Backend gecikmesi | Mobil mock'ta kalır | MSW / local JSON fixture ile paralel UI |
| OAuth prod yapılandırması | Apple/Google giriş çalışmaz | Dev mock session (mevcut) + staging env |
| Scope creep (AI erken) | MVP gecikir | AI kesinlikle Faz 5; PRD-AI ayrı |
| Esnek Goal/Plan UX karmaşıklığı | Onboarding uzar | Plan şablonları ile hızlandır |

---

## 13 — Milestone Takvimi (tahmini)

| Milestone | Hedef | Kapsam |
|-----------|-------|--------|
| **M0** | ✅ Tamamlandı | Mobil shell, shared types, tokens |
| **M1** | +4–6 hf | Faz 1 — uçtan uca manuel MVP |
| **M2** | +2–3 hf | Faz 2 — haftalık döngü |
| **M3** | +3–4 hf | Faz 3 — sosyal |
| **M4** | +2–3 hf | Faz 4 — premium |
| **M5** | +4–6 hf | Faz 5 — AI çekirdek |

---

## 14 — Dokümantasyon Haritası

| Dosya | İçerik |
|-------|--------|
| [`PRODUCT.md`](./PRODUCT.md) | Ürün vizyonu, rakipler, premium |
| [`PRD.md`](./PRD.md) | Tam UX/UI/veri mimarisi (AI hariç MVP) |
| [`PRD-AI.md`](./PRD-AI.md) | AI fazı gereksinimleri |
| [`INSA-PLANI.md`](./INSA-PLANI.md) | Bu dosya — fazlar ve görev sırası |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Backend teknoloji yönü |
| [`COLLABORATION.md`](./COLLABORATION.md) | Git/PR akışı |

---

*Her faz tamamlandığında bu dosyadaki checkbox'lar güncellenir.*
