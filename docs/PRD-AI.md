# Yuvmi — AI Product Requirements Document

> **Durum:** Planlama — MVP sonrası faz  
> **Son güncelleme:** 2026-08-11  
> **Ana PRD:** [`PRD.md`](./PRD.md) (AI olmadan MVP)  
> **Ürün vizyonu:** [`PRODUCT.md`](./PRODUCT.md)

---

## 01 — AI Vision

**Amaç**  
Yuvmi'nin AI katmanı, kullanıcının kendi kelimeleriyle tanımladığı yolculuğu **daha hızlı başlatmak**, **günlük adımı kişiselleştirmek** ve **haftalık ritmi uyarlamak** için vardır. AI bir oracle, terapist veya falci değildir — **eylem sisteminin kişiselleştirme motorudur**.

**Temel ilke:** AI çıktısı her zaman **kullanıcı onayından** geçer. Otomatik uygulanmaz.

**Yuvmi AI olmayan şeyler sunmaz:**
- Rüya yorumu, tarot, gelecek tahmini, uyumluluk okuması
- Psikolojik teşhis veya terapi
- Kullanıcılar arası karşılaştırma veya sıralama
- Parça başı analiz satışı (Azora modeli yok)

> `packages/shared` içinde `dream_journal` ve `compatibility_insights` alan özellikleri bilinçli olarak kaldırıldı — AI fazında da geri gelmeyecek.

---

## 02 — AI vs Manuel Mod

| Akış | MVP (manuel) | AI fazı |
|------|--------------|---------|
| Gelecekteki Ben | Rehberli form | AI taslağı + kullanıcı düzenleme/onayı |
| Hedef | Kullanıcı tanımlar | AI önerisi (opsiyonel) |
| Plan | Şablon + düzenleme | AI plan üretimi + onay |
| Günlük görev | Plandan/manuel | AI kişiselleştirilmiş mikro adım |
| Haftalık döngü | Metrik özeti + manuel plan | AI özet + uyarlanmış plan önerisi |

**Geçiş stratejisi:** Manuel akışlar korunur. AI, "Öneri al" / "AI ile oluştur" olarak **opt-in** eklenir. Consent verilmemişse manuel mod devam eder.

---

## 03 — AI Özellik Kapsamı

### Faz AI-1 — Çekirdek (ücretsiz, consent gerekli)

| # | Özellik | Girdi | Çıktı | Consent scope |
|---|---------|-------|-------|---------------|
| 1 | Gelecekteki Ben profili | Onboarding cevapları, seçili alanlar | `FutureSelf` taslağı (title, description, domains, affirmations) | `ai_profile_generation` |
| 2 | Plan oluşturma | Onaylı FutureSelf + Goal | `Plan` taslağı (title, description, adım listesi) | `ai_plan_generation` |
| 3 | Günlük görev | Aktif Plan, son check-in'ler, tamamlanan görevler | Tek `DailyTask` (title, description) | `ai_daily_task` |
| 4 | Haftalık değerlendirme | Haftalık metrikler + opsiyonel yansıma | `WeeklyReview` (summary, adaptations[], plan diff) | `ai_weekly_review` |

### Faz AI-2 — Premium

| # | Özellik | Açıklama | Consent / gate |
|---|---------|----------|----------------|
| 5 | Gelişmiş AI sohbet | Gelecekteki Ben ile sürekli dialog | Premium + `ai_profile_generation` |
| 6 | Gelişmiş haftalık analiz | Daha derin faktör analizi, uzun dönem bağlam | Premium + `ai_weekly_review` |
| 7 | Sesli olumlamalar | TTS ile affirmation okuma | Premium |
| 8 | AI görsel üretimi | Vision board görselleri | Premium + asset consent |
| 9 | Belge analizi | Yüklenen belge özeti | Premium + `Asset.aiProcessingAllowed` |

### Faz AI-3 — Sosyal (Faz 2 ürünü + AI)

| # | Özellik | Açıklama | Consent |
|---|---------|----------|---------|
| 10 | Ortak alan AI | Paylaşılan vizyon/ilerleme özeti | `ai_shared_space` + her iki taraf onayı |

### Kapsam dışı (kalıcı)

- Ses klonlama
- Rüya yorumu, tarot, uyumluluk skoru
- Otomatik paylaşım (AI çıktısı varsayılan private)
- Kullanıcılar arası AI karşılaştırması

---

## 04 — Consent & Gizlilik

### Consent modeli (`packages/shared`)

```typescript
ConsentScope =
  | "ai_profile_generation"
  | "ai_plan_generation"
  | "ai_daily_task"
  | "ai_weekly_review"
  | "ai_shared_space"
  | "data_export"
```

### Kurallar

1. Her scope **ayrı ayrı** onaylanır; toplu "hepsini kabul et" yalnızca onboarding'de sunulabilir, ayarlardan tek tek kapatılabilir.
2. AI yalnızca `granted: true` olan scope'taki veriyi kullanır.
3. `TodayEntry.reflection` yalnızca `ai_weekly_review` consent ile AI'ya gider.
4. `Asset.aiProcessingAllowed` belge/görsel analizi için ek anahtar.
5. Ortak alan AI'sı: space'teki **her aktif üyenin** ilgili consent'i gerekir.
6. Consent geri çekildiğinde: devam eden AI job iptal edilir; geçmiş çıktılar silinmez (kullanıcı manuel silebilir).
7. AI prompt'larına PII minimizasyonu: e-posta, tam ad API'ye gönderilmez.

### Consent ekranları

| Ekran | Konum | İçerik |
|-------|-------|--------|
| AI Consent (onboarding) | Onboarding adım 2 (Welcome sonrası) | Scope listesi, ne kullanılır/ne kullanılmaz |
| Privacy & AI | Settings → Gizlilik | Scope toggle'ları, geçmiş AI işlemleri |
| Asset AI toggle | Asset upload/detail | `aiProcessingAllowed` per asset |
| Space AI consent | Space detail (Faz AI-3) | İki taraf onay akışı |

---

## 05 — AI Kullanıcı Akışları

### Flow A — AI ile Gelecekteki Ben

```text
Onboarding → AI Consent (ai_profile_generation)
    → Kullanıcı soruları cevaplar
    → [AI Generating…] (15–30 sn)
    → Taslak profil önizleme
    → Düzenle / Onayla
    → FutureSelf kaydedilir (status: approved)
```

**Hata:** Timeout → "Manuel devam et" CTA; form verisi korunur.

### Flow B — AI günlük görev

```text
Gece 00:00 veya sabah cron → Consent check
    → Plan + son 7 gün check-in/task
    → DailyTask üretilir
    → Push: "Bugünün adımın hazır"
```

**Consent yok:** Plana bağlı sıradaki manuel adım veya boş görev + "Adım ekle" CTA.

### Flow C — AI haftalık değerlendirme

```text
Hafta sonu → Metrik agregasyonu
    → Consent check (ai_weekly_review)
    → AI summary + adaptations
    → WeeklyReview status: ready
    → Kullanıcı inceler → Plan güncelle / Devam et
```

**Consent yok:** Mevcut manuel haftalık gözden geçirme (PRD MVP akışı).

### Flow D — Premium AI sohbet

```text
Gelecekteki Ben → "Sohbet et" (Premium gate)
    → Consent check
    → AIChatPanel açılır
    → Mesaj geçmişi private, paylaşılmaz
```

---

## 06 — AI Ekranları & UI

### Yeni / genişletilecek ekranlar

| Ekran | Route (mobil öneri) | Değişiklik |
|-------|---------------------|------------|
| AI Consent | `(onboarding)/ai-consent` | Yeni |
| Future Self Builder | `(onboarding)/future-self` | "AI ile oluştur" butonu |
| Plan Review | `(onboarding)/plan-review` | AI diff + onay |
| Daily Task | `(tabs)/index` veya modal | AI badge: "Sana özel" |
| Weekly Review | `journey/weekly-review` | AI summary bölümü |
| AI Chat | `future-self/chat` | Premium |
| Privacy & AI | `profile/privacy` | Consent toggles |

### AI UI component'leri

| Component | Açıklama |
|-----------|----------|
| `ConsentToggle` | Scope bazlı switch + açıklama metni |
| `ConsentSheet` | Onboarding toplu onay bottom sheet |
| `AIGeneratingSkeleton` | Shimmer + "Senin için hazırlanıyor…" |
| `AIProposalCard` | AI taslağı + Düzenle / Onayla / Reddet |
| `AIChatPanel` | Mesaj listesi + input (Premium) |
| `AIBadge` | "AI önerisi" etiketi |
| `PlanDiffView` | AI uyarlaması side-by-side (mevcut PRD component'i genişletilir) |

### AI state'leri

| State | UI |
|-------|-----|
| `idle` | Manuel mod veya "Öneri al" CTA |
| `generating` | AIGeneratingSkeleton, iptal butonu |
| `ready` | AIProposalCard |
| `approved` | Normal içerik, AI badge |
| `rejected` | Manuel forma dön |
| `error` | Retry + "Manuel devam et" |
| `consent_denied` | ConsentSheet tekrar göster |

### Ton & copy ilkeleri

- "AI sana söylüyor" değil → "Senin için bir öneri hazırladık"
- Baskı yok: "Bugün atla" her zaman görünür
- Tahmin dili yasak: "olacaksın", "kader", "uyumluluk" kullanılmaz

---

## 07 — AI Veri Modeli

### Mevcut (`packages/shared` — hazır)

- `Consent` — scope, granted, resourceType, resourceId
- `Asset.aiProcessingAllowed`
- `WeeklyReview` — summary, adaptations, status (`generating` | `ready` | `applied`)

### Eklenecek entity'ler

```typescript
/** AI iş kuyruğu kaydı */
interface AIJob {
  id: ID;
  userId: ID;
  scope: ConsentScope;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  inputHash: string;        // PII-safe fingerprint
  outputResourceType?: "future_self" | "plan" | "daily_task" | "weekly_review";
  outputResourceId?: ID;
  errorCode?: string;
  tokensUsed?: number;
  latencyMs?: number;
  createdAt: DateTimeString;
  completedAt?: DateTimeString;
}

/** Premium AI sohbet mesajı */
interface AIChatMessage {
  id: ID;
  userId: ID;
  futureSelfId: ID;
  role: "user" | "assistant";
  content: string;
  createdAt: DateTimeString;
}

/** FutureSelf'e AI durumu ekle (opsiyonel alan) */
interface FutureSelf {
  // ... mevcut alanlar
  source?: "manual" | "ai_assisted";
  approvedAt?: DateTimeString;
}
```

### AI'ya giden veri (scope bazlı)

| Scope | İzin verilen girdi | Asla gönderilmez |
|-------|-------------------|------------------|
| `ai_profile_generation` | Onboarding cevapları, seçili LifeDomain | E-posta, tam ad |
| `ai_plan_generation` | FutureSelf özeti, Goal | Partner verisi |
| `ai_daily_task` | Plan özeti, son 7 gün task/check-in metrikleri | Reflection metni (consent yoksa) |
| `ai_weekly_review` | Haftalık metrikler + reflection (consent varsa) | Diğer kullanıcı verisi |
| `ai_shared_space` | Paylaşılan vizyon/goal özeti | Private journal |

---

## 08 — AI Sistem Mimarisi

```text
┌─────────────┐     ┌─────────────┐
│  apps/web   │     │ apps/mobile │
└──────┬──────┘     └──────┬──────┘
       └─────────┬─────────┘
                 │ POST /ai/*
                 ▼
       ┌─────────────────────┐
       │   apps/api (Go)     │
       │  ┌───────────────┐  │
       │  │ AI Orchestrator│  │
       │  │ · consent gate │  │
       │  │ · prompt build │  │
       │  │ · validation   │  │
       │  │ · rate limit   │  │
       │  │ · cost track   │  │
       │  └───────┬───────┘  │
       └──────────┼───────────┘
                  │
      ┌───────────┼───────────┐
      ▼           ▼           ▼
 PostgreSQL   Job Queue   AI Provider
 (Consent,    (async       (OpenAI /
  AIJob)       weekly,      Anthropic /
               daily)       gateway)
```

### API uçları (taslak)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/consents` | Kullanıcı consent listesi |
| PUT | `/consents/:scope` | Grant / revoke |
| POST | `/ai/future-self/generate` | Profil taslağı |
| POST | `/ai/plans/generate` | Plan taslağı |
| POST | `/ai/daily-tasks/generate` | Günlük görev |
| POST | `/ai/weekly-reviews/generate` | Haftalık değerlendirme |
| GET | `/ai/jobs/:id` | Job durumu (polling) |
| POST | `/ai/chat` | Premium sohbet (streaming) |

### Orchestrator sorumlulukları

1. Consent doğrulama (her istek)
2. Prompt şablonu seçimi (scope + locale)
3. Girdi sanitizasyonu ve token bütçesi
4. Structured output validation (JSON schema)
5. Kullanıcı onay kuyruğu (auto-persist yok)
6. Rate limit: free vs premium kota
7. Audit log (scope, token, latency — içerik loglanmaz)

### Async işler

| İş | Sync/Async | Bildirim |
|----|------------|----------|
| Future Self generate | Sync (<30s) veya async | In-app |
| Plan generate | Sync | In-app |
| Daily task | Async (cron) | Push |
| Weekly review | Async (cron) | Push |
| Chat | Sync streaming | — |

---

## 09 — Prompt & Output Tasarımı

### Çıktı formatları (structured JSON)

**FutureSelf draft:**
```json
{
  "title": "string",
  "description": "string",
  "domains": ["career", "peace"],
  "affirmations": ["string", "string"]
}
```

**DailyTask draft:**
```json
{
  "title": "string",
  "description": "string",
  "estimatedMinutes": 5
}
```

**WeeklyReview draft:**
```json
{
  "summary": "string",
  "adaptations": ["string"],
  "planChanges": { "title": "string", "description": "string" }
}
```

### Prompt guardrails (sistem mesajı özeti)

- Türkçe yanıt (locale'e göre)
- Tahmin/astroloji/terapi dili yasak
- Küçük, uygulanabilir adımlar (5–20 dk)
- Olumsuz ruh hâlinde bile suçlayıcı dil yok
- "Sen" dili, samimi ama profesyonel

---

## 10 — AI Önceliklendirme

### AI-P0 (ilk AI sürümü)

- Consent CRUD (backend + UI)
- `ai_profile_generation`
- `ai_plan_generation`
- `ai_daily_task`
- AIJob kuyruğu + generating state UI

### AI-P1

- `ai_weekly_review`
- Plan diff onay akışı
- Push: görev + review hazır

### AI-P2 (Premium)

- AI sohbet
- Gelişmiş haftalık analiz
- Sesli olumlamalar

### AI-P3

- Görsel üretim
- Belge analizi
- `ai_shared_space`

---

## 11 — AI Başarı Kriterleri

| Metrik | Hedef |
|--------|-------|
| AI profil onay oranı | ≥70% (reddedilen taslaklar manuel devam) |
| Günlük görev tamamlama (AI vs manuel) | AI ≥ manuel +10% |
| Consent opt-in (onboarding) | ≥60% en az 1 scope |
| AI job hata oranı | <2% |
| P95 latency (profil/plan) | <25 sn |
| Kullanıcı şikâyeti (yanlış ton/tahmin) | <1% |

---

## 12 — AI Güvenlik

- API key'ler yalnızca backend'de
- Prompt injection: kullanıcı metni system prompt'tan izole
- Output filter: yasak konu listesi (tıbbi tavsiye, tahmin, korkutma)
- Rate limit: kullanıcı başına günlük AI çağrı limiti
- Premium gate server-side doğrulama
- AI chat geçmişi encrypted at rest
- GDPR/KVKK: consent log + silme hakkı

---

## 13 — AI Test Planı

| Senaryo | Beklenen |
|---------|----------|
| Consent yok → generate | 403 + manuel CTA |
| Consent revoke → pending job | Job cancelled |
| AI timeout | Retry + manuel fallback |
| Geçersiz JSON output | Validation error, retry |
| Düşük mood check-in | Görev tonu destekleyici, skor düşürülmez |
| Premium olmayan chat | 402 + upsell |
| TR locale | Türkçe çıktı |

---

## 14 — Open Questions (AI)

| # | Soru | Önerilen varsayılan |
|---|------|---------------------|
| 1 | AI sağlayıcı (OpenAI vs Anthropic vs gateway)? | Phase AI-0'da gateway (tek abstraction) |
| 2 | Günlük görev cron saati? | Kullanıcı timezone 06:00 |
| 3 | Free kullanıcı AI kotası? | Profil+plan onboarding'de 1'er; günlük görev sınırsız |
| 4 | AI chat geçmişi saklama süresi? | 90 gün, kullanıcı silebilir |
| 5 | Onboarding'de AI zorunlu mu? | Hayır — "Manuel devam et" her zaman |
| 6 | Haftalık review AI + manuel birleşik mi? | Evet — metrikler sistem, yorum AI (consent varsa) |

---

## 15 — İlgili Dosyalar

| Dosya | İlişki |
|-------|--------|
| [`PRD.md`](./PRD.md) | AI olmadan MVP; Ek A bu dosyaya taşındı |
| [`PRODUCT.md`](./PRODUCT.md) | Orijinal AI vizyonu ve premium sınırı |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Backend AI orchestration ihtiyaçları |
| [`INSA-PLANI.md`](./INSA-PLANI.md) | Faz sırası ve mevcut kod durumu |
| `packages/shared/src/types/asset.ts` | `Consent`, `ConsentScope` |
| `packages/shared/src/types/goal.ts` | `WeeklyReview` |

---

*Bu doküman canlıdır — AI fazına başlandığında güncellenir.*
