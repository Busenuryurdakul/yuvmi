Faz 1-3 MVP: Go backend, Expo mobil uygulama, shared tipler, haftalık döngü, sosyal alanlar, asset arşivi ve premium abonelik iskeleti.

## Özet

- **Faz 1:** masterfabric-go tabanlı API (auth, onboarding, check-in, görev, hizalanma); Expo Router mobil shell; shared tipler ve plan şablonları
- **Faz 2-4:** Haftalık review, bildirimler, space/asset API, subscription kota kapıları; mobil onboarding, journey, premium ekranları
- **Faz 3 (kısmi):** Asset arşivi, ShareVisibilityPicker, multipart upload client, space paylaşım akışı
- Eksik maddeler [`docs/TEKNIK-BORC.md`](docs/TEKNIK-BORC.md) dosyasına işlendi

## Değişiklik türü

- [x] feat — yeni özellik
- [ ] fix — hata düzeltme
- [x] docs — dokümantasyon
- [ ] chore — araç / bağımlılık / CI
- [ ] refactor — davranış değişmeden kod düzenleme

## Etkilenen alanlar

- [ ] `apps/web`
- [x] `apps/mobile`
- [x] `packages/shared`
- [x] `apps/api` (Go)
- [x] `docs/`

## Test planı

- [x] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [x] Mobil: `npm run typecheck` (`apps/mobile`)
- [x] Manuel test: auth → onboarding → check-in → görev → hizalanma → spaces → arşiv

## Notlar

- OAuth prod doğrulama, gerçek ödeme ve S3 config [`TEKNIK-BORC.md`](docs/TEKNIK-BORC.md) P0/P1 maddelerinde — bu PR kapsam dışı
- Dev köprüleri: `DEV_OAUTH_PASSWORD`, `POST /subscription/dev-upgrade`
- PR #4 ve #6 kapatıldı; bu PR canonical

## Checklist

- [x] Branch adı `feat/ayse-faz1-faz2-mvp` formatında
- [x] Commit mesajları anlamlı (3 commit)
- [x] Secret / `.env` commit'lenmedi
- [x] `packages/shared` değiştiyse diğer geliştiriciyle uyumlu
