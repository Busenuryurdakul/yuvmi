# Yuvmi — Teknik Borç Takibi

> **Son güncelleme:** 2026-08-11  
> **Referans:** [`INSA-PLANI.md`](./INSA-PLANI.md)

Bu dosya bilinçli olarak ertelenen, geçici çözümler ve prod öncesi kapatılması gereken maddeleri takip eder.

---

## Öncelik legendası

| Etiket | Anlam |
|--------|-------|
| 🔴 P0 | Prod/staging öncesi zorunlu |
| 🟡 P1 | Beta öncesi önerilir |
| 🟢 P2 | İyileştirme / nice-to-have |

---

## Açık maddeler

### 🔴 P0 — OAuth token doğrulama (backend)

| Alan | Detay |
|------|-------|
| **Durum** | Kapatıldı (2026-08-11) |
| **Çözüm** | `POST /api/v1/auth/oauth` — Google/Apple id_token JWKS doğrulama; mobil dev köprüsü `YUVMI_ALLOW_DEV_OAUTH` + `EXPO_PUBLIC_ALLOW_DEV_AUTH` ile kapatılır. |

### 🔴 P0 — JWT refresh token

| Alan | Detay |
|------|-------|
| **Durum** | Kapatıldı (2026-08-11) |
| **Çözüm** | `POST /api/v1/auth/refresh` + `refresh_tokens` tablosu; mobil SecureStore'da rotasyon. |

### 🟡 P1 — Push bildirim zamanlayıcısı

| Alan | Detay |
|------|-------|
| **Durum** | Kapatıldı (2026-08-11) |
| **Çözüm** | `PushCron` — günlük (saat 9) ve haftalık (Pazar) hatırlatıcı; `notification_dispatch_log` ile tekrar engeli. |

### 🟡 P1 — Offline kuyruk çakışma çözümü

| Alan | Detay |
|------|-------|
| **Durum** | Kapatıldı (2026-08-11) |
| **Çözüm** | Kuyruk dedupe (tek check-in, task başına son aksiyon); stale 404/409 drop; backend task complete/skip idempotent. |

### 🟡 P1 — Plan diff UI (gelişmiş)

| Alan | Detay |
|------|-------|
| **Durum** | Kapatıldı (2026-08-11) |
| **Çözüm** | `changedPairs` API + `PlanDiffView` yan yana vN→vN+1 karşılaştırma. |

### 🔴 P0 — Ödeme entegrasyonu

| Alan | Detay |
|------|-------|
| **Durum** | Kapatıldı (2026-08-11) |
| **Faz** | Faz 4 |
| **Çözüm** | Stripe Checkout (`POST /subscription/checkout`) + webhook (`POST /subscription/webhook/stripe`) + `provider_subscription_id` senkronu; prod'da `YUVMI_ALLOW_DEV_PREMIUM=0`. |
| **Dosyalar** | `apps/api/internal/infrastructure/payment/stripe/`, `apps/api/internal/application/yuvmi/usecase/faz4_billing.go`, `apps/mobile/app/premium.tsx` |

### 🟡 P1 — PremiumGate mobil entegrasyonu

| Alan | Detay |
|------|-------|
| **Durum** | Kapatıldı (2026-08-11) |
| **Faz** | Faz 4 |
| **Çözüm** | `usePremiumUpsell` + `PremiumGate` — spaces, journey ve goal create akışlarında 402 → `/premium`. |
| **Dosyalar** | `apps/mobile/src/hooks/usePremiumUpsell.ts`, `apps/mobile/app/(tabs)/spaces.tsx`, `apps/mobile/app/(tabs)/journey.tsx` |

### 🟡 P1 — Object storage yapılandırması

| Alan | Detay |
|------|-------|
| **Durum** | Kısmi (2026-08-11) |
| **Çözüm** | Staging `docker-compose.staging.yml` MinIO + env şablonu; prod bucket ayrıca kurulmalı. |

### 🟡 P1 — Asset paylaşım ve geri çekme UI

| Alan | Detay |
|------|-------|
| **Durum** | Kapatıldı (2026-08-11) |
| **Çözüm** | `asset/[id].tsx` — ShareVisibilityPicker, üye seçimi, paylaşım kaydet, alandan geri çek; `archive.tsx` revoked etiketi. |

### 🟡 P1 — Veri dışa aktarma (ZIP + kapsam)

| Alan | Detay |
|------|-------|
| **Durum** | Kapatıldı (2026-08-11) |
| **Faz** | Faz 4 |
| **Çözüm** | Check-in listesi + `yuvmi-export.zip` (base64); mobil FileSystem + Share indirme UX. |
| **Dosyalar** | `apps/api/internal/application/yuvmi/usecase/faz4.go`, `apps/mobile/app/premium.tsx` |

### 🟡 P1 — Abonelik yaşam döngüsü

| Alan | Detay |
|------|-------|
| **Durum** | Kapatıldı (2026-08-11) |
| **Faz** | Faz 4 |
| **Çözüm** | Stripe webhook (update/delete) + `ExpireSubscriptions` cron + `POST /subscription/cancel` + premium ekranı durum/iptal UI. |
| **Dosyalar** | `apps/api/internal/application/yuvmi/usecase/faz4_billing.go`, `apps/api/internal/infrastructure/scheduler/push_cron.go` |

### 🟢 P2 — Web uygulama shell

| Alan | Detay |
|------|-------|
| **Durum** | Açık |
| **Faz** | Faz 4 (opsiyonel) |
| **Sorun** | `apps/web` yalnızca landing; ürün UI yok. |

### 🟢 P2 — AI katmanı

| Alan | Detay |
|------|-------|
| **Durum** | Planlandı |
| **Faz** | Faz 5 |
| **Sorun** | WeeklyReview `summary` / `adaptations` kural tabanlı; AI yok. |
| **Not** | PRD-AI ile değiştirilecek. |

---

## Kapatılan maddeler

| Madde | Kapatıldı | Not |
|-------|-----------|-----|
| Backend API yok | 2026-08-11 | Faz 1 — masterfabric + Yuvmi domain |
| Mobil onboarding yok | 2026-08-11 | Faz 1 |
| Check-in / task / alignment mobil yok | 2026-08-11 | Faz 1 |
| Haftalık review API (kural tabanlı) | 2026-08-11 | Faz 2 — AI yok |
| Push token + in-app bildirimler | 2026-08-11 | Faz 2 — cron eklendi |
| OAuth doğrulama + JWT refresh | 2026-08-11 | Adım 1 pre-prod |
| Şifre sıfırlama + hesap silme API | 2026-08-11 | Adım 2 beta |
| Staging deploy iskeleti | 2026-08-11 | docker-compose.staging + CI |
| Space API + davet akışı | 2026-08-11 | Faz 3 |
| Asset arşivi + paylaşım/geri çekme UI | 2026-08-11 | Faz 3 |
| Subscription API + kota kapıları | 2026-08-11 | Faz 4 |
| Stripe ödeme + webhook | 2026-08-11 | Faz 4 |
| PremiumGate + export ZIP + abonelik yaşam döngüsü | 2026-08-11 | Faz 4 |

---

## Yeni madde ekleme şablonu

```markdown
### [Öncelik] — Başlık

| Alan | Detay |
|------|-------|
| **Durum** | Açık / Devam / Kapatıldı |
| **Faz** | |
| **Sorun** | |
| **Risk** | |
| **Çözüm** | |
| **Dosyalar** | |
```
