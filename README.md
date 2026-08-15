# Yuvmi

**Bugününü gör. Gelecekteki kendine yaklaş.**

Yuvmi, bugünkü halinle hayalindeki gelecekteki sen arasındaki yolculuğu görünür kılan bir kişisel gelişim platformudur. Web ve mobilde çalışır; kişisel, çift, arkadaş ve aile alanları sunar.

## Monorepo Yapısı

| Paket | Açıklama |
|-------|----------|
| `apps/web` | Next.js web uygulaması |
| `apps/mobile` | Expo React Native mobil uygulama |
| `packages/shared` | Paylaşılan TypeScript tipleri ve sabitler |

Backend (Go) henüz kurulmadı — bkz. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Dokümantasyon

| Dosya | İçerik |
|-------|--------|
| [`docs/PRODUCT.md`](./docs/PRODUCT.md) | Ürün vizyonu, MVP, premium, rakipler |
| [`docs/PRD.md`](./docs/PRD.md) | Tam UX/UI/veri mimarisi (AI hariç MVP) |
| [`docs/PRD-AI.md`](./docs/PRD-AI.md) | AI fazı gereksinimleri (sonra) |
| [`docs/INSA-PLANI.md`](./docs/INSA-PLANI.md) | Faz bazlı inşa planı ve mevcut durum |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Backend ihtiyaçları, Go yönü |
| [`docs/COLLABORATION.md`](./docs/COLLABORATION.md) | Branch, PR ve ekip akışı (2 kişi) |

## Ekip çalışması

Branch adlandırma, PR kuralları ve review süreci için [`docs/COLLABORATION.md`](./docs/COLLABORATION.md) dosyasına bakın.

**Özet:** `main` korumalı → `feat/<ad>-<konu>` branch → PR → karşı taraf onayı → merge.

## Başlangıç

Gereksinim: Node.js 20 veya üzeri.

```bash
# Bağımlılıkları yükle
npm ci

# Web geliştirme sunucusu
npm run dev:web

# Mobil geliştirme sunucusu
npm run dev:mobile
```

## Geliştirme

```bash
npm run dev        # Tüm uygulamaları başlat
npm run build      # Production build
npm run typecheck  # TypeScript kontrolü
npm run lint       # Lint
```

## Ürün Dokümantasyonu

Detaylı vizyon için [`docs/PRODUCT.md`](./docs/PRODUCT.md), backend planı için [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) dosyalarına bakın.

## Lisans

Private — tüm hakları saklıdır.
