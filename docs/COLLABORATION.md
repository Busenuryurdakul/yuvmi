# Yuvmi — İki Kişilik Ekip Git Akışı

Bu doküman Yuvmi'nin **2 geliştirici** ile nasıl branch ve PR yöneteceğini tanımlar.

> Repo sahibi: [`Busenuryurdakul/yumvi`](https://github.com/Busenuryurdakul/yumvi)  
> İkinci geliştirici: GitHub'da **Collaborator** olarak eklenmeli (Settings → Collaborators).

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
| `chore/<konu>` | Lint, CI, turbo, git hooks |

**`develop` branch'i kullanmıyoruz** — iki kişilik ekipte gereksiz karmaşıklık. Her şey `main`'e PR ile gider.

---

## Branch adlandırma

Format:

```
<tür>/<geliştirici-kısa-adı>-<konu>
```

| Geliştirici | Kısa ad (öneri) | Alanlar |
|-------------|-----------------|---------|
| Repo sahibi | `busenur` | *(GitHub kullanıcı adına göre güncelle)* |
| Proje arkadaşı | `partner` | *(kendi kısa adını seç — örn. `ahmet`)* |

### Örnekler

```
feat/busenur-foundation-hardening   ← Phase 0 işi
feat/partner-mobile-onboarding      ← mobil onboarding
feat/busenur-api-scaffold           ← Go API iskeleti
fix/partner-alignment-score         ← hizalanma bugfix
docs/busenur-collaboration          ← bu doküman
chore/partner-ci-setup              ← GitHub Actions
```

**Kurallar:**
- Küçük harf, tire ile ayır (`-`), Türkçe karakter kullanma
- Bir branch = bir mantıksal iş (çok büyük PR'lardan kaçın)
- Başkasının açık branch'ine commit atma — yeni branch aç veya PR'da yorum bırak

---

## Sahiplik alanları (çakışmayı azaltmak için)

| Alan | Dizin | Birincil sorumlu (örnek) |
|------|-------|--------------------------|
| Web | `apps/web/` | Geliştirici A |
| Mobil | `apps/mobile/` | Geliştirici B |
| Shared tipler | `packages/shared/` | **İkisi de** — PR zorunlu, küçük PR |
| Backend (Go) | `apps/api/` *(henüz yok)* | Geliştirici A veya B — Phase 1'de netleştir |
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
git checkout -b feat/partner-mobile-onboarding
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
git push -u origin feat/partner-mobile-onboarding
gh pr create --base main --title "feat(mobile): onboarding shell" --body "..."
```

### 5. Review

- Her PR'da **en az 1 onay** (diğer geliştirici)
- Kendi PR'ını kendin merge etme — karşı taraf onaylasın
- CI yeşil olmadan merge yok *(CI kurulunca)*

### 6. Merge sonrası

```bash
git checkout main
git pull origin main
git branch -d feat/partner-mobile-onboarding   # yerel temizlik
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

## İlk kurulum (repo henüz commit'siz)

Repo şu an **commit içermiyor**. İlk bootstrap önerisi:

### Adım 1 — İlk commit (repo sahibi)

```bash
git checkout main
git add .
git commit -m "chore: initial Yuvmi monorepo scaffold"
git push -u origin main
```

### Adım 2 — Phase 0 PR (mevcut iş)

Foundation hardening ayrı PR olarak gitsin:

```bash
git checkout -b feat/busenur-foundation-hardening
# ... Phase 0 değişiklikleri zaten bu branch'te
git add .
git commit -m "docs: Phase 0 foundation hardening"
git push -u origin feat/busenur-foundation-hardening
gh pr create --base main --title "Phase 0: Foundation hardening"
```

### Adım 3 — Proje arkadaşı

```bash
git clone https://github.com/Busenuryurdakul/yumvi.git
cd yumvi   # veya yuvmi — klasör adı
npm install
git checkout -b feat/partner-<ilk-is>
```

---

## GitHub repo ayarları (repo sahibi)

Settings → Branches → **Branch protection rule** (`main`):

- [x] Require a pull request before merging
- [x] Require approvals: **1**
- [ ] Require status checks *(CI eklenince aç)*
- [x] Do not allow bypassing the above settings

Settings → Collaborators → proje arkadaşını **Write** veya **Maintain** olarak ekle.

---

## Mevcut branch durumu

| Branch | Durum | Öneri |
|--------|-------|-------|
| `main` | Commit yok | İlk scaffold commit'i buraya veya squash merge ile |
| `feat/yuvmi-foundation-hardening` | Commit yok, Phase 0 değişiklikleri | → `feat/busenur-foundation-hardening` olarak yeniden adlandır ve PR aç |

Branch yeniden adlandırma:

```bash
git branch -m feat/busenur-foundation-hardening
```

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

*Proje arkadaşının GitHub kullanıcı adını ve kısa branch adını netleştirdikten sonra bu dosyadaki `partner` placeholder'larını güncelle.*
