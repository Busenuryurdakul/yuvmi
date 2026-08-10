# Yuvmi — Mimari ve Backend

Bu doküman Phase 0 kapsamında backend **seçimini kilitlemez**; ihtiyaçları ve **Go** tabanlı altyapı yönünü tanımlar. Henüz `apps/api` veya benzeri bir servis **kurulmamıştır**.

## Mevcut Durum

| Katman | Durum |
|--------|-------|
| `apps/web` | Next.js — statik/landing + ileride istemci |
| `apps/mobile` | Expo — mobil istemci iskeleti |
| `packages/shared` | Domain tipleri ve sabitler |
| Backend / API | **Yok** |
| Veritabanı | **Yok** |
| Auth | **Yok** |
| Dosya depolama | **Yok** |

## Backend Teknoloji Yönü: Go

Altyapı servisleri **Go** ile geliştirilecek. Karar gerekçesi (Phase 0):

- Tek binary ile deploy edilebilir servisler
- Yüksek eşzamanlılık (AI çağrıları, bildirimler, dosya işleme)
- Net sınır: istemciler (web/mobil) ↔ REST veya gRPC API ↔ Go servisleri
- Monorepo içinde `apps/api` (veya `services/api`) olarak konumlandırılacak — **henüz oluşturulmadı**

### Henüz açık karar kapıları

| Konu | Durum |
|------|-------|
| HTTP framework (chi, echo, fiber, stdlib) | Karar bekliyor |
| ORM / query (sqlc, ent, GORM) | Karar bekliyor |
| PostgreSQL barındırma | Karar bekliyor |
| Object storage sağlayıcı (S3 uyumlu) | Karar bekliyor |
| Auth protokolü (JWT + refresh, OAuth) | Karar bekliyor |
| AI sağlayıcı (OpenAI, Anthropic, gateway) | Karar bekliyor |
| Ödeme (Stripe, Iyzico vb.) | Karar bekliyor |
| Push (FCM, APNs, Expo Push) | Karar bekliyor |

**Bilinçli olarak seçilmedi / kurulmadı:** Supabase, Firebase, özel Node API veya başka BaaS — Phase 0'da kurulum yapılmaz.

## Backend'in Karşılaması Gereken İhtiyaçlar

### 1. Authentication

- E-posta / OAuth kayıt ve giriş
- Oturum ve refresh token yönetimi
- Cihaz bazlı oturum (mobil + web)
- Hesap silme ve oturum iptali

### 2. Veritabanı

- Kullanıcı, profil, hedef, plan, görev, haftalık değerlendirme
- Alan üyelikleri, davetler, izinler
- Onay kayıtları (`Consent`)
- Hizalanma anlık görüntüleri (`AlignmentSnapshot`)
- Audit-friendly şema (oluşturma/güncelleme zaman damgaları)

### 3. Dosya depolama

- Görsel ve belge yükleme (sınırlı kota — ücretsiz / premium)
- İçerik bazlı görünürlük ve geri çekme
- MIME doğrulama, boyut limiti, virüs taraması (ileride)

### 4. Davet ve üyelik sistemi

- Çift taraflı onaylı alan davetleri
- Üyelik durumu: `pending` → `active` → `left` / `removed`
- Davet süresi ve iptali

### 5. Yetkilendirme

- Kişisel veri varsayılan özel
- Alan bazlı rol: owner, member, viewer
- İçerik bazlı `SpacePermission` (view, edit, share, revoke)
- AI yalnızca `Consent` kapsamındaki veriyi kullanır

### 6. AI çağrıları

MVP kapsamı (PRODUCT.md ile uyumlu):

1. Gelecekteki Ben profili oluşturma
2. 30 günlük plan üretimi
3. Günlük görev üretimi
4. Haftalık değerlendirme ve plan uyarlaması

Go servisi: prompt şablonları, rate limit, maliyet takibi, yanıt doğrulama, kullanıcı onay kuyruğu.

### 7. Bildirimler

- Günlük görev hatırlatıcısı
- Haftalık değerlendirme hazır bildirimi
- Davet ve alan güncellemeleri
- Push (mobil) + e-posta (opsiyonel)

### 8. Ödeme / üyelik

- Premium abonelik durumu
- Kota ve özellik kapıları (PRODUCT.md premium sınırı)
- Tek seferlik analiz satışı **yok** (ürün ilkesi)

### 9. Veri silme ve dışa aktarma

- GDPR/KVKK uyumlu hesap silme
- Paylaşılan içeriğin geri çekilmesi
- Premium: veri dışa aktarma (JSON/ZIP)

### 10. Audit ve güvenlik kayıtları

- Hassas işlem logları (paylaşım, izin değişikliği, AI çağrısı)
- Secret/token asla istemciye sızmamalı
- Rate limiting, CORS, input validation

## Önerilen Servis Sınırları (Go)

```
┌─────────────┐     ┌─────────────┐
│  apps/web   │     │ apps/mobile │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └─────────┬─────────┘
                 │ HTTPS
                 ▼
       ┌─────────────────────┐
       │   apps/api (Go)     │
       │  - auth             │
       │  - users & spaces   │
       │  - goals & plans    │
       │  - ai orchestration │
       │  - assets           │
       └─────────┬───────────┘
                 │
     ┌───────────┼───────────┐
     ▼           ▼           ▼
 PostgreSQL   Object      AI / Push /
              Storage     Payment
```

## İstemci ↔ Shared Paket

- `packages/shared`: TypeScript domain tipleri — API sözleşmesi için referans
- Go tarafında eşdeğer struct'lar ileride `apps/api` içinde tanımlanacak
- OpenAPI veya protobuf ile şema senkronizasyonu — **karar bekliyor**

## Sonraki Adım (Phase 1 önerisi)

1. `apps/api` Go modül iskeleti (`go mod init github.com/.../yuvmi/api`)
2. Health check + OpenAPI taslağı
3. Auth + User CRUD (PostgreSQL)
4. `FutureSelf` → `Goal` → `Plan` → `DailyTask` uçtan uca API

---

*Backend sağlayıcı ve barındırma seçimi Phase 1 karar kapısında netleştirilecek.*
