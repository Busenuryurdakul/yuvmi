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
| **Durum** | Açık |
| **Faz** | Pre-prod (Faz 2 sonrası veya Faz 2.5) |
| **Sorun** | Google/Apple token backend'de doğrulanmıyor. Mobil `DEV_OAUTH_PASSWORD` ile e-posta register/login yapıyor. |
| **Risk** | Prod'da sahte OAuth hesabı açılabilir. |
| **Çözüm** | `POST /api/v1/auth/oauth` — id_token doğrula, `auth_provider` + `provider_subject` ekle, dev köprüsünü prod build'de kapat. |
| **Dosyalar** | `apps/mobile/src/context/AuthContext.tsx`, `apps/api/internal/infrastructure/http/handler/iam/` |

### 🔴 P0 — JWT refresh token

| Alan | Detay |
|------|-------|
| **Durum** | Açık |
| **Faz** | Pre-prod |
| **Sorun** | Mobil yalnızca access token tutuyor; süre dolunca sessiz oturum düşer. |
| **Çözüm** | Refresh endpoint + SecureStore'da refresh token rotasyonu. |
| **Dosyalar** | `apps/mobile/src/lib/auth/session.ts`, masterfabric IAM |

### 🟡 P1 — Push bildirim zamanlayıcısı

| Alan | Detay |
|------|-------|
| **Durum** | Açık |
| **Faz** | Faz 2 (kısmi) |
| **Sorun** | Haftalık/günlük push yalnızca olay tetiklemeli (review oluşunca); cron/worker yok. |
| **Çözüm** | Background job veya Expo scheduled local notifications + backend cron. |
| **Dosyalar** | `apps/api/internal/infrastructure/notification/` |

### 🟡 P1 — Offline kuyruk çakışma çözümü

| Alan | Detay |
|------|-------|
| **Durum** | Açık |
| **Faz** | Faz 2 (kısmi) |
| **Sorun** | Offline queue basit FIFO; aynı gün çift check-in veya stale task id riski. |
| **Çözüm** | Idempotency key, server-side merge kuralları. |
| **Dosyalar** | `apps/mobile/src/hooks/useOfflineQueue.ts` |

### 🟡 P1 — Plan diff UI (gelişmiş)

| Alan | Detay |
|------|-------|
| **Durum** | Açık |
| **Faz** | Faz 2 (kısmi) |
| **Sorun** | Adım bazlı side-by-side diff yok; özet metrik + yeni sürüm onayı var. |
| **Çözüm** | `PlanDiff` component ile adım ekleme/çıkarma/changed highlight. |
| **Dosyalar** | `apps/mobile/src/components/plan/` |

### 🔴 P0 — Ödeme entegrasyonu

| Alan | Detay |
|------|-------|
| **Durum** | Açık |
| **Faz** | Faz 4 (kısmi) |
| **Sorun** | Abonelik yalnızca `free` / `premium` tier kaydı; gerçek ödeme akışı yok. `POST /subscription/dev-upgrade` geliştirme köprüsü. |
| **Risk** | Prod'da gelir kapısı çalışmaz; dev endpoint yanlışlıkla açık kalırsa ücretsiz premium. |
| **Çözüm** | Iyzico (TR) veya Stripe (global) webhook + `provider_subscription_id` senkronu; prod'da dev-upgrade kapat. |
| **Dosyalar** | `apps/api/internal/application/yuvmi/usecase/faz4.go`, `apps/mobile/app/premium.tsx` |

### 🟡 P1 — PremiumGate mobil entegrasyonu

| Alan | Detay |
|------|-------|
| **Durum** | Açık |
| **Faz** | Faz 4 (kısmi) |
| **Sorun** | `PremiumGate` component var; ikinci hedef / ek alan oluşturma akışlarında 402 hatası upsell'e yönlendirilmiyor. |
| **Çözüm** | Goal create, space create ve journey ekranlarında `isPremiumRequiredError` → `/premium` modal. |
| **Dosyalar** | `apps/mobile/src/components/premium/PremiumGate.tsx`, `apps/mobile/app/(tabs)/journey.tsx`, `apps/mobile/app/spaces/` |

### 🟡 P1 — Object storage yapılandırması

| Alan | Detay |
|------|-------|
| **Durum** | Açık |
| **Faz** | Faz 3 (kısmi) |
| **Sorun** | S3-compatible storage env yoksa `UploadAsset` "storage not configured" döner; asset upload mobilde kırık kalır. |
| **Çözüm** | MinIO/S3 env (`S3_*`) dokümante et; staging bucket + signed URL veya proxy download. |
| **Dosyalar** | `apps/api/internal/infrastructure/storage/`, `apps/api/cmd/server/main.go` |

### 🟡 P1 — Asset paylaşım ve geri çekme UI

| Alan | Detay |
|------|-------|
| **Durum** | Açık |
| **Faz** | Faz 3 (kısmi) |
| **Sorun** | Backend'de asset CRUD + space visibility var; `ShareVisibilityPicker`, `revokedFromSpaceAt` mobil akışı yok. |
| **Çözüm** | Space detail'de görünürlük seçici + "ortak alandan geri çek" aksiyonu. |
| **Dosyalar** | `apps/mobile/app/spaces/`, `apps/api/internal/application/yuvmi/usecase/faz3_assets.go` |

### 🟡 P1 — Veri dışa aktarma (ZIP + kapsam)

| Alan | Detay |
|------|-------|
| **Durum** | Açık |
| **Faz** | Faz 4 (kısmi) |
| **Sorun** | Export yalnızca JSON; check-in kayıtları export paketine dahil değil; ZIP arşiv yok. |
| **Çözüm** | Check-in listesi ekle; `application/zip` veya client-side zip; indirme UX (FileSystem). |
| **Dosyalar** | `apps/api/internal/application/yuvmi/usecase/faz4.go`, `apps/mobile/app/premium.tsx` |

### 🟡 P1 — Abonelik yaşam döngüsü

| Alan | Detay |
|------|-------|
| **Durum** | Açık |
| **Faz** | Faz 4 (kısmi) |
| **Sorun** | İptal, yenileme, `past_due` geçişi ve süre bitince free'ye düşme yok. |
| **Çözüm** | Webhook handler + `current_period_end` cron kontrolü; mobilde abonelik durumu ekranı. |
| **Dosyalar** | `apps/api/internal/domain/subscription/`, `apps/api/internal/infrastructure/postgres/subscription/` |

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
| Push token + in-app bildirimler | 2026-08-11 | Faz 2 — cron eksik (bkz. açık maddeler) |
| Space API + davet akışı | 2026-08-11 | Faz 3 — asset UI kısmi |
| Subscription API + kota kapıları | 2026-08-11 | Faz 4 — ödeme eksik |

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
