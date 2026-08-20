# Yuvmi — İki Kişilik Ekip Git Akışı

Bu doküman Yuvmi'nin **2 geliştirici** ile nasıl branch ve PR yöneteceğini tanımlar.

> Repo sahibi: [`Busenuryurdakul`](https://github.com/Busenuryurdakul) — Buse Nur Yurdakul  
> Proje arkadaşı: [`ayse-solmaz`](https://github.com/ayse-solmaz) — Ayşe Solmaz

---

## Branch modeli

```
main          ← her zaman çalışır durumda; doğrudan push yok
  └── feat/*  ← günlük geliştirme
  └── fix/*   ← hata düzeltmeleri
  └── docs/*  ← yalnızca dokümantasyon
  └── chore/* ← araç, CI, bağımlılık
```

| Branch | Amaç |
|--------|------|
| `main` | Üretime hazır kod. Yalnızca **onaylı PR** ile güncellenir. |
| `feat/<kısa-ad>-<konu>` | Yeni özellik veya faz işi |
| `fix/<kısa-ad>-<konu>` | Bugfix |
| `docs/<kısa-ad>-<konu>` | PRODUCT, ARCHITECTURE, README vb. |
| `chore/<kısa-ad>-<konu>` | Lint, CI, turbo, git hooks |

**`develop` branch'i kullanmıyoruz** — iki kişilik ekipte gereksiz karmaşıklık. Her şey `main`'e PR ile gider.

---

## Branch adlandırma

Format:

```
<tür>/<geliştirici-kısa-adı>-<konu>
```

| Geliştirici | Kısa ad | GitHub | Alanlar |
|-------------|---------|--------|---------|
| Buse Nur | `busenur` | `@Busenuryurdakul` | Web, backend (Phase 1) |
| Ayşe Solmaz | `ayse` | `@ayse-solmaz` | Mobil, shared review |

### Örnekler

```
feat/busenur-foundation-hardening   ← Phase 0 işi
feat/ayse-mobile-onboarding         ← mobil onboarding
feat/busenur-api-scaffold           ← Go API iskeleti
fix/ayse-alignment-score            ← hizalanma bugfix
docs/busenur-collaboration          ← bu doküman
chore/ayse-ci-setup                 ← GitHub Actions
```

**Kurallar:**
- Küçük harf, tire ile ayır (`-`), Türkçe karakter kullanma
- Bir branch = bir mantıksal iş (çok büyük PR'lardan kaçın)
- Başkasının açık branch'ine commit atma — yeni branch aç veya PR'da yorum bırak

---

## Sahiplik alanları (çakışmayı azaltmak için)

| Alan | Dizin | Birincil sorumlu (örnek) |
|------|-------|--------------------------|
| Web | `apps/web/` | Buse (`busenur`) |
| Mobil | `apps/mobile/` | Ayşe (`ayse`) |
| Shared tipler | `packages/shared/` | **İkisi de** — PR zorunlu, küçük PR |
| Backend (Go) | `apps/api/` *(henüz yok)* | Buse veya Ayşe — Phase 1'de netleştir |
| Ürün / mimari | `docs/` | **İkisi de** — kararları PR açıklamasında yaz |

Shared veya `docs/PRODUCT.md` değişecekse **önce kısa mesajla haberleş**, ardından PR aç.

---

## Günlük akış

### 1. Güncel kal

```bash
git checkout main
git pull origin main
```

### 2. Yeni iş için branch

```bash
git checkout -b feat/ayse-mobile-onboarding
```

### 3. Commit

```bash
git add .
git commit -m "feat(mobile): add onboarding shell"
```

**Commit mesajı formatı** (Conventional Commits):

```
<tür>(<kapsam>): <kısa açıklama>

feat(web): add waitlist form
fix(shared): align Goal status types
docs: update collaboration guide
chore: add GitHub PR template
```

Türler: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`

### 4. Push ve PR

```bash
git push -u origin feat/ayse-mobile-onboarding
gh pr create --base main --title "feat(mobile): onboarding shell" --body "..."
```

### 5. Review

- Her PR'da **en az 1 onay** (diğer geliştirici)
- Kendi PR'ını kendin merge etme — karşı taraf onaylasın
- CI yeşil olmadan merge yok

### 6. Merge sonrası

```bash
git checkout main
git pull origin main
git branch -d feat/ayse-mobile-onboarding   # yerel temizlik
```

---

## PR kuralları

| Kural | Açıklama |
|-------|----------|
| Hedef branch | Her zaman `main` |
| Boyut | Mümkünse **< 400 satır**; büyük işi parçala |
| Açıklama | Ne, neden, nasıl test edildi |
| Draft PR | WIP ise draft olarak aç |
| Conflict | Branch sahibi çözer |
| Squash merge | Önerilir — temiz `main` geçmişi |

PR şablonu: [`.github/pull_request_template.md`](../.github/pull_request_template.md)

---

## İlk yerel kurulum

```bash
git clone https://github.com/Busenuryurdakul/yuvmi.git
cd yuvmi
npm ci
git switch main
git pull origin main
git switch -c feat/ayse-<ilk-is>
```

---

## GitHub repo ayarları (repo sahibi)

Settings → Branches → **Branch protection rule** (`main`):

- [x] Require a pull request before merging
- [x] Require approvals: **1**
- [x] Require status checks: `quality`
- [x] Do not allow bypassing the above settings

Settings → Collaborators → proje arkadaşını **Write** veya **Maintain** olarak ekle.

---

## Repo ayarı kontrol listesi

- Varsayılan branch `main` olmalı.
- `main` için branch protection etkin olmalı.
- Doğrudan push kapalı, en az 1 karşı taraf onayı zorunlu olmalı.
- Zorunlu durum kontrolü olarak `quality` seçilmeli.
- Merge yöntemi olarak squash merge tercih edilmeli.

---

## Hızlı referans

```bash
# Durum
git status --short --branch

# Main'e dön ve güncelle
git checkout main && git pull

# Yeni feature
git checkout -b feat/<ad>-<konu>

# PR oluştur
gh pr create --base main

# Açık PR'ları listele
gh pr list
```

---

*Bu doküman ekip veya GitHub ayarları değiştiğinde aynı PR içinde güncellenir.*
