# Yuvmi — Product Requirements Document (PRD)

> **Durum:** Canlı tasarım dokümanı  
> **Son güncelleme:** 2026-08-13  
> **Not:** AI destekli özellikler bu sürümde **kapsam dışı** bırakıldı; ayrı faz olarak [`PRD-AI.md`](./PRD-AI.md) dosyasında tanımlıdır. İnşa sırası için [`INSA-PLANI.md`](./INSA-PLANI.md).  
> **Bilgi mimarisi:** Güncel kaynak [`IA.md`](./IA.md). Bu dosyadaki §06–08 **IA v1** olarak durur; çelişirse `IA.md` geçerlidir.

---

### 01 — Product Vision

**Ürün adı:** Yuvmi  
**Slogan:** Bugününü gör. Gelecekteki kendine yaklaş.  
**Manifesto:** Bugünkü seni keşfet. Gelecekteki seni inşa et.

**Temel amaç**  
Yuvmi, bireyin bugünkü halini ve hayalindeki gelecekteki halini yan yana görünür kılan, kişisel gelişim odaklı bir eylem platformudur. Tahmin, terapi veya içerik tüketimi değil; **hedef → plan → günlük adım → haftalık gözden geçirme** döngüsü üzerine kuruludur.

**Ana değer önerisi**  
Olmak istediğin kişi ile bugünkü hâlin arasındaki yolu görünür kılar; hedeflerini uygulanabilir bir plana dönüştürür; her gün atabileceğin en doğru küçük adımı belirler — baskı ve suçluluk üretmeden.

**Ürün sınırları (açık)**  
- Terapi, psikolojik teşhis veya gelecek tahmini sunmaz  
- Kullanıcıları birbirleriyle karşılaştırmaz  
- Ruh hâli düşük olduğu için hizalanma puanını düşürmez  

**Ana ürün döngüsü (AI olmadan MVP)**

Güncel kesitler ve ekranlar: [`IA.md`](./IA.md).

```text
Gelecekteki Ben (kim + neden + davranış)
    → Hedef (süre kişisel)
    → Plan (kullanıcı yazar; denenebilir)
    → Bugünün odağı + Bugünü kaydet
    → Haftalık gözden geçirme
    → Plan güncelleme
    → (Faz 3+) Seçili paylaşım ile ortak alanlar
```

**Platform:** Web + Mobil (Expo) — ilk dil Türkçe, i18n hazır mimari.

---

### 02 — Target Users

| Persona | Profil | Temel problem | Yuvmi'den beklediği |
|---------|--------|---------------|---------------------|
| **Ayşe — Bireysel dönüşüm** | 26–38, kariyer/kişisel gelişim odaklı | Hedefleri var ama günlük uygulamaya dökemiyor; motivasyon dalgalı | Net plan, tek günlük adım, suçluluk hissettirmeyen ilerleme |
| **Emre — Çift alanı** | 28–40, ilişkisinde ortak vizyon arayan | Partneriyle aynı yönde büyümek istiyor | İki taraflı onaylı, seçici paylaşımlı ortak alan |
| **Selin — Arkadaş desteği** | 22–32, accountability buddy arayan | Yalnız ilerlemek zor; sosyal baskı değil destek istiyor | Seçili ilerleme paylaşımı, karşılaştırma yok |
| **Deniz — Aile bağlantısı** | 35–50, aile hedefleri | Aile üyeleriyle sınırlı ortak hedef/vizyon | Kontrollü görünürlük, geri çekilebilir içerik |

**Birincil hedef kullanıcı (MVP):** Bireysel dönüşüm yolculuğuna başlayan, kişisel gelişim uygulamalarından sıkılmış ama eylem odaklı bir çözüm arayan yetişkinler.

**İkincil (Faz 2):** Çift, arkadaş ve aile alanlarına davet edilen kullanıcılar.

---

### 03 — Core Features

#### Modül 1 — Kimlik & Onboarding
- Kayıt / giriş (e-posta + OAuth)
- Hoş geldin akışı
- Gelecekteki Ben profili oluşturma (kullanıcı rehberli form)

#### Modül 2 — Hedef & Plan
- 90 günlük dönüşüm hedefi (Gelecekteki Ben'e bağlı)
- 30 günlük uygulanabilir plan (şablon + kullanıcı düzenleme)
- Plan versiyonlama (haftalık güncelleme sonrası)

#### Modül 3 — Günlük Eylem
- Bugün check-in (ruh hâli, enerji, minnet, yansıma, alan skorları)
- Günlük mikro görev (plandan veya kullanıcı tanımlı — tek odak)
- Görev tamamlama / atlama (atlamada ceza yok)

#### Modül 4 — Hizalanma & İlerleme
- Açıklamalı hizalanma skoru (`AlignmentSnapshot`)
- Faktör dökümü (görev, plana dönüş, hedef ilerlemesi, tutarlılık)
- Kişisel zaman çizelgesi (kullanıcı vs kullanıcı değil)

#### Modül 5 — Haftalık Döngü
- Haftalık gözden geçirme özeti (sistem tarafından hesaplanan metrikler + kullanıcı yansıması)
- Plan uyarlaması (kullanıcı manuel düzenler veya şablondan seçer)
- Onay ile yeni plan versiyonu

#### Modül 6 — Alanlar & Paylaşım (Faz 2)
- Kişisel / çift / arkadaş / aile alanları
- İki taraflı onaylı davet
- İçerik bazlı görünürlük ve geri çekme
- Görsel ve belge arşivi

#### Modül 7 — Hesap & Abonelik
- Profil, ayarlar, bildirim tercihleri
- Ücretsiz / Premium kapıları
- Veri dışa aktarma (Premium), hesap silme

---

### 04 — Feature Prioritization

#### P0 — Core (MVP — uygulama çalışmaz)

| Özellik | Açıklama |
|---------|----------|
| Auth | Kayıt, giriş, oturum, şifre sıfırlama |
| Onboarding | Gelecekteki Ben → hedef → plan → ilk görev |
| Gelecekteki Ben | Rehberli form + kullanıcı onayı/düzenleme |
| Hedef & Plan | 90g hedef, 30g plan, versiyon takibi |
| Günlük görev | Plana bağlı görev, tamamlama, atlama |
| Bugün check-in | Ruh hâli, enerji, minnet, yansıma |
| Hizalanma | Skor + faktör açıklaması |
| Haftalık gözden geçirme | Metrik özeti + plan uyarlaması |
| Dashboard (Bugün) | Ana giriş noktası |
| Bildirimler (temel) | Günlük görev + haftalık özet hatırlatıcı |

#### P1 — Important (ürünü ciddi geliştirir)

| Özellik | Açıklama |
|---------|----------|
| Ortak alanlar | Çift / arkadaş / aile |
| Davet sistemi | İki taraflı onay |
| İçerik paylaşımı | Seçili görünürlük, geri çekme |
| Arşiv | Görsel/belge yükleme (sınırlı kota) |
| Premium abonelik | Kota ve özellik kapıları |
| Push bildirimleri | Mobil tam entegrasyon |
| Gelecekteki Ben detay | Vizyon panosu, alan kartları |
| Plan geçmişi | Versiyon karşılaştırma |
| Offline check-in | Senkronizasyon kuyruğu |
| Plan şablon kütüphanesi | Yaşam alanına göre hazır plan iskeletleri |

#### P2 — Nice to have (MVP sonrası)

| Özellik | Açıklama |
|---------|----------|
| Uzun dönem karşılaştırmaları | Kişisel geçmiş grafikleri |
| Veri dışa aktarma | JSON/ZIP |
| OAuth genişletme | Apple, Google dışı sağlayıcılar |
| Karanlık mod otomatik | Sistem tercihi |
| Sabah/akşam ritüelleri | Günlük rutin modülü |

#### P3 — AI Genişlemesi (sonra, ayrı faz)

> Detaylar [Ek A](#ek-a--ai-genişlemesi-sonra) bölümünde. MVP'ye dahil değildir.

| Özellik | Açıklama |
|---------|----------|
| AI profil oluşturma | Gelecekteki Ben taslağı |
| AI plan üretimi | 30g plan otomasyonu |
| AI günlük görev | Kişiselleştirilmiş mikro adım |
| AI haftalık değerlendirme | Özet + plan uyarlaması |
| AI consent yönetimi | Kapsam bazlı onay |
| Gelişmiş AI sohbeti | Premium |
| Sesli olumlamalar | Premium |
| AI görsel üretimi | Premium |
| Belge analizi | Premium |

---

### 05 — User Flows

#### Flow 1 — İlk kez kayıt ve onboarding

| Adım | Kullanıcı aksiyonu | Sistem davranışı | Sonuç |
|------|-------------------|------------------|-------|
| 1 | Landing → "Başla" | Auth ekranına yönlendir | — |
| 2 | E-posta + şifre veya OAuth | Hesap oluştur, kişisel alan provision | Oturum açık |
| 3 | Hoş geldin ekranı | Ürün vaadi, yolculuk özeti | — |
| 4 | Gelecekteki Ben formu | Adım adım sorular (alanlar, değerler, hayal) | Taslak profil |
| 5 | Profili okur, düzenler | Değişiklikleri kaydet | Onay bekleyen profil |
| 6 | "Onayla" | Profili kilitle, hedef akışına geç | Aktif FutureSelf |
| 7 | 90g hedef tanımlar | Şablon plan öner (düzenlenebilir) | Plan taslağı |
| 8 | Planı inceler, onaylar | Plan v1 aktif, bugünün görevi atanır | Dashboard'a yönlendir |

**Hata durumları:**
- Onay vermeden ilerleme → soft gate; "Profilini onaylamadan plan oluşturamayız"
- E-posta zaten kayıtlı → "Giriş yap" CTA
- Form yarım bırakıldı → draft localStorage'da saklanır, "Kaldığın yerden devam et"

---

#### Flow 2 — Günlük rutin (dönen kullanıcı)

| Adım | Aksiyon | Sistem | Sonuç |
|------|---------|--------|-------|
| 1 | Uygulamayı açar / bildirime tıklar | Bugün dashboard yüklenir | — |
| 2 | Check-in yapar (2 dk) | TodayEntry kaydedilir | Hizalanma faktörü güncellenir |
| 3 | Günlük görevi okur | Task detayı gösterilir | — |
| 4a | "Tamamladım" | status=completed, AlignmentSnapshot yeniden hesaplanır | Başarı toast + kutlama mikro animasyon |
| 4b | "Bugün atla" | skippedReason iste (opsiyonel), ceza yok | Nazik mesaj: "Yarın devam ederiz" |
| 5 | Dashboard'a döner | Streak + hizalanma güncel | — |

**Hata:** Offline → check-in/görev lokal kuyruğa alınır, bağlantı gelince senkronize edilir.

---

#### Flow 3 — Haftalık gözden geçirme

| Adım | Aksiyon | Sistem | Sonuç |
|------|---------|--------|-------|
| 1 | Bildirim: "Haftalık özetin hazır" | WeeklyReview ekranı | — |
| 2 | Metrik özetini okur | Tamamlanan görevler, check-in sayısı, hizalanma trendi | — |
| 3 | Kısa yansıma yazar (opsiyonel) | Review kaydedilir | — |
| 4 | Plan uyarlamasını düzenler | Diff görünümü (eski vs yeni) | — |
| 5a | "Planı güncelle" | Plan v2 aktif, eski superseded | Toast + dashboard |
| 5b | "Mevcut plana devam" | Review applied, plan değişmez | — |

**Hata:** Veri eksik → "Bu hafta yeterli veri yok" + nazik CTA (check-in yap)

---

#### Flow 4 — Ortak alana davet (Faz 2)

| Adım | Aksiyon | Sistem | Sonuç |
|------|---------|--------|-------|
| 1 | Alanlar → "Çift alanı oluştur" | Space draft | — |
| 2 | Partner e-postası girer | Davet gönderilir (pending) | — |
| 3 | Partner daveti kabul eder | İki taraf onayı → membership active | Ortak alan açılır |
| 4 | Vizyon kartını paylaşır | Visibility=space_members | Partner görür |
| 5 | Paylaşımı geri çeker | revokedFromSpaceAt set | Partner artık göremez |

**Hata:** Davet süresi doldu → "Yeniden gönder" CTA

---

#### Flow 5 — Premium yükseltme

| Adım | Aksiyon | Sistem | Sonuç |
|------|---------|--------|-------|
| 1 | İkinci hedef oluşturmaya çalışır | Free limit gate | Premium upsell modal |
| 2 | Plan seçer | Ödeme akışı | Abonelik aktif |
| 3 | Özellik kilidi açılır | Kota güncellenir | Devam |

---

### 06 — Information Architecture

> **Superseded (IA v1).** Güncel omurga, beş ev, route ve model: [`IA.md`](./IA.md).  
> Aşağıdaki ağaç 2026-08-13 öncesi yapıdır (Gelecekteki Ben Yolculuk altında; sekmeler Bugün / Yolculuk / Alanlar / Bildirimler / Hesap). Geri dönüş için silinmedi.

```text
Yuvmi
├── Public (marketing)
│   ├── Landing / Manifesto
│   └── Waitlist
│
├── Auth (unauthenticated)
│   ├── Login
│   ├── Register
│   └── Forgot Password
│
├── Onboarding (authenticated, incomplete)
│   ├── Welcome
│   ├── Future Self Builder
│   ├── Goal Setup
│   └── Plan Review
│
├── App Shell (authenticated, onboarded)
│   ├── Bugün (Home / Dashboard)
│   ├── Yolculuk
│   │   ├── Gelecekteki Ben
│   │   ├── Hedefler
│   │   ├── Plan
│   │   └── Geçmiş & Hizalanma
│   ├── Alanlar (Faz 2)
│   │   ├── Kişisel
│   │   ├── Çift / Arkadaş / Aile
│   │   └── Arşiv
│   ├── Bildirimler
│   └── Hesap
│       ├── Profil
│       ├── Ayarlar
│       ├── Abonelik
│       └── Gizlilik & Veri
│
└── System
    ├── 404 / Error
    ├── Offline
    └── Permission Denied
```

**Bilgi hiyerarşisi prensibi:** Bugünün görevi ve check-in her zaman bir tık uzakta; derin analiz ve geçmiş ikinci katmanda.

---

### 07 — Navigation Tree

> **IA v1.** Güncel ağaç: [`IA.md`](./IA.md) §02 ve §06.

```text
APP
│
├── Public
│   ├── Landing (/)
│   ├── Manifesto (/manifesto)
│   └── Waitlist (modal / section)
│
├── Authentication
│   ├── Login
│   ├── Register
│   ├── Forgot Password
│   └── Reset Password
│
├── Onboarding (linear, geri dönülebilir)
│   ├── Welcome
│   ├── Future Self — Create
│   ├── Future Self — Review & Approve
│   ├── Goal — 90 Day
│   ├── Plan — 30 Day Review
│   └── Onboarding Complete → Dashboard
│
├── Main App
│   ├── Bugün (Dashboard)                    ★ default
│   │
│   ├── Yolculuk
│   │   ├── Gelecekteki Ben
│   │   │   ├── Overview
│   │   │   ├── Domains
│   │   │   ├── Affirmations
│   │   │   └── Vision Board
│   │   ├── Hedefler
│   │   │   ├── List
│   │   │   ├── Detail
│   │   │   └── Create (Premium gate)
│   │   ├── Plan
│   │   │   ├── Active Plan
│   │   │   ├── Plan History
│   │   │   └── Weekly Review Detail
│   │   └── İlerleme
│   │       ├── Alignment Detail
│   │       └── Timeline
│   │
│   ├── Bugün Modülü
│   │   ├── Check-in
│   │   ├── Daily Task Detail
│   │   └── Task History
│   │
│   ├── Alanlar (Faz 2)
│   │   ├── Space List
│   │   ├── Space Detail
│   │   │   ├── Shared Vision
│   │   │   ├── Members
│   │   │   └── Shared Content
│   │   ├── Invite / Accept
│   │   └── Archive
│   │       ├── Upload
│   │       └── Asset Detail
│   │
│   ├── Bildirimler
│   │   └── Notification Detail
│   │
│   └── Hesap
│       ├── Profile
│       ├── Settings
│       │   ├── Notifications
│       │   ├── Privacy
│       │   ├── Language
│       │   └── Theme
│       ├── Subscription
│       └── Data & Security
│           ├── Export (Premium)
│           └── Delete Account
│
└── System
    ├── Offline Banner (global)
    ├── Loading / Skeleton
    ├── Empty States
    ├── Error Boundary
    └── 403 Forbidden
```

**Web primary nav:** Sidebar (desktop) / Bottom tab (mobile)  
**Sekmeler:** Bugün | Yolculuk | Alanlar | Bildirimler | Hesap

---

### 08 — Screen Inventory

> **IA v1 envanter.** Güncel “sayfa / bölüm / tetiklenen” ayrımı: [`IA.md`](./IA.md) §03–§06.

| # | Ekran | Amaç | Erişim |
|---|-------|------|--------|
| 1 | Landing | Dönüşüm vaadi, waitlist, giriş CTA | Public |
| 2 | Manifesto | Marka hikayesi, duygusal bağ | Public |
| 3 | Login | Oturum açma | Guest |
| 4 | Register | Hesap oluşturma | Guest |
| 5 | Forgot Password | Şifre sıfırlama | Guest |
| 6 | Welcome (Onboarding) | Beklenti yönetimi | Auth, onboarding |
| 7 | Future Self Builder | Rehberli profil oluşturma | Auth, onboarding |
| 8 | Future Self Review | Onay/düzenleme | Auth, onboarding |
| 9 | Goal Setup | 90g hedef | Auth, onboarding |
| 10 | Plan Review | 30g plan onayı | Auth, onboarding |
| 11 | **Dashboard (Bugün)** | Günlük ana ekran | Auth, onboarded |
| 12 | Check-in | Günlük snapshot | Auth |
| 13 | Daily Task Detail | Görev tamamlama | Auth |
| 14 | Task History | Geçmiş görevler | Auth |
| 15 | Future Self Overview | Vizyon özeti | Auth |
| 16 | Future Self Domains | 8 yaşam alanı | Auth |
| 17 | Affirmations | Olumlamalar listesi | Auth |
| 18 | Vision Board | Görsel vizyon kartları | Auth |
| 19 | Goals List | Hedef listesi | Auth |
| 20 | Goal Detail | Hedef detay + ilerleme | Auth |
| 21 | Goal Create | Yeni hedef (Premium gate) | Auth |
| 22 | Active Plan | Aktif 30g plan | Auth |
| 23 | Plan History | Versiyon geçmişi | Auth |
| 24 | Weekly Review Detail | Haftalık özet | Auth |
| 25 | Alignment Detail | Skor + faktör dökümü | Auth |
| 26 | Progress Timeline | Kişisel zaman çizelgesi | Auth |
| 27 | Spaces List | Alan listesi | Auth (Faz 2) |
| 28 | Space Detail | Ortak alan ana ekran | Space member |
| 29 | Space Invite | Davet gönder/kabul | Auth |
| 30 | Archive | Dosya listesi | Auth |
| 31 | Asset Upload | Yükleme + görünürlük | Auth |
| 32 | Asset Detail | Dosya detay, paylaşım | Auth / member |
| 33 | Notifications | Bildirim merkezi | Auth |
| 34 | Profile | Kullanıcı profili | Auth |
| 35 | Settings | Uygulama ayarları | Auth |
| 36 | Privacy | Veri ve paylaşım tercihleri | Auth |
| 37 | Subscription | Plan karşılaştırma | Auth |
| 38 | Data Export | Veri indirme | Premium |
| 39 | Delete Account | Hesap silme | Auth |
| 40 | Offline | Bağlantı yok | Auth |
| 41 | 403 Forbidden | Yetki yok | Auth |

---

### 09 — Screen-by-Screen UX/UI

#### Dashboard (Bugün) — Ana ekran
**Amaç:** Kullanıcının günü tek bakışta yönetmesi.  
**Bölümler:** Greeting + tarih → Check-in durumu → Bugünün görevi (hero card) → Hizalanma özeti → Haftalık review banner (varsa) → Son aktivite.  
**Aksiyonlar:** Check-in başlat, görevi aç, hizalanma detayına git, haftalık özeti aç.  
**Sonraki ekranlar:** Check-in, Task Detail, Alignment Detail, Weekly Review.

#### Future Self Builder
**Amaç:** Rehberli profil oluşturma.  
**Bölümler:** Adım göstergesi, soru kartları (yaşam alanları, değerler, hayal), taslak önizleme.  
**UI:** Stepper, textarea, chip selector (LifeDomain).

#### Check-in
**Amaç:** Bugünkü hal snapshot.  
**Bölümler:** Mood slider (1–5), energy slider, minnet (3 chip max), kısa yansıma, opsiyonel alan skorları.  
**Ton:** "Nasıl hissediyorsun?" — yargısız, kısa.

#### Daily Task Detail
**Amaç:** Tek odak adım.  
**Bölümler:** Görev başlığı, açıklama, plan bağlamı ("Bu adım X hedefine bağlı"), tamamla / atla.  
**CTA:** Primary "Tamamladım", Secondary "Bugün atla".

#### Alignment Detail
**Amaç:** Skorun şeffaf açıklaması.  
**Bölümler:** Overall score ring, faktör listesi (contribution + explanation), summaryExplanation, "Ruh hâlin skorunu düşürmedi" bilgi notu.

#### Weekly Review Detail
**Amaç:** Haftalık gözden geçirme.  
**Bölümler:** Metrik özeti (tamamlanan görev, check-in sayısı), kullanıcı yansıması alanı, plan diff, onay CTA.

#### Space Detail (Faz 2)
**Amaç:** Ortak alan hub.  
**Bölümler:** Üye listesi, paylaşılan vizyon, son paylaşımlar, davet butonu (owner).  
**Kural:** Kişisel günlük otomatik görünmez.

---

### 10 — Design System

**Karakter:** Sakin · Samimi · Premium-soft · Baskısız · Modern-minimal  
**Ton:** "Gürültü yok, izleyen yok" — sıcak nötr zemin, yumuşak vurgular.

#### Renkler

| Token | Değer | Kullanım |
|-------|-------|----------|
| **Primary** | `#C4717B` (Dusty Rose) | CTA, aktif nav, vurgu |
| **Secondary** | `#5B8A8A` (Muted Teal) | İkincil CTA, bilgi, hizalanma pozitif |
| **Background** | `#FDF8F5` (Warm Cream) | Sayfa zemini |
| **Surface** | `#FFFFFF` / raised | Kartlar, modal |
| **Surface Sunken** | `#F6EEE9` | Input arka plan, bölüm ayrımı |
| **Text Primary** | `#3A3335` | Başlıklar, gövde |
| **Text Secondary** | `#5C5153` | Alt metin |
| **Text Tertiary** | `#7A6E70` | Placeholder, meta |
| **Error / Destructive** | `#8D3B45` | Hata, hesap silme |
| **Warning** | `#D4A574` (Gold) | Dikkat, pending review |
| **Success** | `#5B8A8A` (Teal) | Tamamlama, onay |
| **Border Soft** | `#E8DEDA` | Kart kenarı |
| **Border Firm** | `#D9CCC7` | Input border |

#### Tipografi

| Seviye | Boyut | Ağırlık | Kullanım |
|--------|-------|---------|----------|
| Display | 32–40px | 600 | Landing hero |
| H1 | 28px | 600 | Sayfa başlığı |
| H2 | 22px | 600 | Bölüm başlığı |
| H3 | 18px | 500 | Kart başlığı |
| Body | 16px | 400 | Gövde |
| Body Small | 14px | 400 | Meta, açıklama |
| Caption | 12px | 400 | Etiket, timestamp |
| **Font:** Geist (web), System (mobil) |

#### Spacing (4px grid)

`xs:4 · sm:8 · md:12 · lg:16 · xl:24 · xxl:32 · xxxl:48`

#### Border Radius

`sm:8 · md:12 · lg:16 · pill:999`

#### Shadow

| Token | Değer | Kullanım |
|-------|-------|----------|
| sm | `0 1px 3px rgba(58,51,53,0.06)` | Kart |
| md | `0 4px 12px rgba(58,51,53,0.08)` | Modal, dropdown |
| lg | `0 8px 24px rgba(58,51,53,0.10)` | Hero card |

#### Motion

- Geçişler: 200–300ms ease-out  
- Başarı: hafif scale + fade (abartısız)  
- Loading: shimmer, spinner değil pulse skeleton tercih  

#### Dark Mode (P2, altyapı hazır)

Warm cream → `#141210`, rose/teal tonları yumuşatılmış.

---

### 11 — Component Architecture

#### Global Components

| Component | Açıklama |
|-----------|----------|
| `AppShell` | Layout wrapper, nav, offline banner |
| `Sidebar` / `BottomNav` | Platform nav |
| `TopBar` | Sayfa başlığı, geri, aksiyonlar |
| `Button` | primary / secondary / ghost / destructive |
| `Input`, `Textarea` | Form elemanları |
| `Select`, `Chip`, `Slider` | Seçim ve mood/energy |
| `Modal`, `Dialog`, `Sheet` | Onay, upsell |
| `Toast` | Geri bildirim |
| `Badge` | status, streak, premium |
| `Avatar` | Kullanıcı / üye |
| `Skeleton` | Loading |
| `EmptyState` | Veri yok |
| `ErrorState` | Hata |
| `OfflineBanner` | Bağlantı kesildi |
| `Stepper` | Onboarding adımları |
| `Tooltip` | Faktör açıklamaları |

#### Feature Components

| Component | Modül |
|-----------|-------|
| `FutureSelfCard` | Gelecekteki Ben özeti |
| `DomainChipGrid` | 8 yaşam alanı |
| `VisionBoardGrid` | Vizyon kartları |
| `GoalProgressCard` | Hedef ilerleme |
| `PlanWeekView` | 30g plan haftalık görünüm |
| `DailyTaskHero` | Bugünün görevi (dashboard) |
| `CheckInForm` | Mood, energy, gratitude |
| `AlignmentRing` | Skor halkası |
| `AlignmentFactorList` | Faktör dökümü |
| `WeeklyReviewCard` | Haftalık özet kartı |
| `PlanDiffView` | Plan versiyon karşılaştırma |
| `PlanTemplatePicker` | Şablon seçici |
| `SpaceMemberList` | Alan üyeleri |
| `ShareVisibilityPicker` | İçerik görünürlük seçici |
| `AssetUploader` | Dosya yükleme |
| `PremiumGate` | Upsell overlay |
| `StreakIndicator` | Seri gün sayacı |

#### Page Components

| Component | Ekran |
|-----------|-------|
| `DashboardPage` | Bugün |
| `CheckInPage` | Check-in akışı |
| `FutureSelfBuilderPage` | Onboarding profil |
| `WeeklyReviewPage` | Haftalık gözden geçirme |
| `SpacesListPage` | Alan listesi |
| `SettingsPage` | Ayarlar hub |

---

### 12 — Wireframes

#### Dashboard (Bugün)

```text
┌──────────────────────────────────────────────────────────┐
│ ☰  Yuvmi                              🔔  👤             │
├──────────┬───────────────────────────────────────────────┤
│          │  Günaydın, Ayşe · 11 Ağu                      │
│  Bugün ★ │                                               │
│  Yolculuk│  ┌─ Check-in ─────────────────────────────┐  │
│  Alanlar │  │  🌤 Bugünkü halini kaydet    [Başla →]│  │
│  Bildirim│  └────────────────────────────────────────┘  │
│  Hesap   │                                               │
│          │  ┌─ BUGÜNÜN ADIMI ────────────────────────┐  │
│          │  │  "10 dakika sabah günlüğü yaz"          │  │
│          │  │  Hedef: Daha disiplinli sabah rutini    │  │
│          │  │  [ Tamamladım ]    [ Bugün atla ]       │  │
│          │  └────────────────────────────────────────┘  │
│          │                                               │
│          │  ┌ Hizalanma ┐  ┌ Seri ┐  ┌ Plan Günü ┐     │
│          │  │   72     │  │  5   │  │  12/30  │     │
│          │  │  ↑ +4    │  │ gün  │  │         │     │
│          │  └──────────┘  └──────┘  └─────────┘     │
│          │                                               │
│          │  📋 Haftalık özetin hazır — [İncele →]        │
│          │                                               │
│          │  Son aktivite                                 │
│          │  · Dün görev tamamlandı                       │
│          │  · 9 Ağu check-in yapıldı                    │
└──────────┴───────────────────────────────────────────────┘
```

#### Future Self Builder (Onboarding)

```text
┌──────────────────────────────────────────┐
│  ←  Gelecekteki Ben          Adım 2/4    │
├──────────────────────────────────────────┤
│  ████████░░░░░░░░  Stepper               │
│                                          │
│  Hangi alanlarda büyümek istiyorsun?     │
│                                          │
│  [💼 Kariyer] [💕 İlişkiler] [🌿 Sağlık] │
│  [💰 Finans]  [🌱 Gelişim]   [🎨 Yarat.] │
│  [🕊 Huzur]   [✨ Özgürlük]              │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Gelecekteki halin nasıl biri?      │  │
│  │ ________________________________   │  │
│  └────────────────────────────────────┘  │
│                                          │
│              [ Devam → ]                 │
└──────────────────────────────────────────┘
```

#### Check-in

```text
┌──────────────────────────────────────────┐
│  ←  Bugünkü Hal                          │
├──────────────────────────────────────────┤
│  Ruh hâlin nasıl?                        │
│  😔 ────●──────── 😊   (3/5)             │
│                                          │
│  Enerjin?                                │
│  🔋 ──────●────── ⚡   (4/5)             │
│                                          │
│  Minnet (en fazla 3)                     │
│  [+] Kahve  [+] Güneş  [+] Arkadaşım     │
│                                          │
│  Kısa yansıma (opsiyonel)                │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│         [ Kaydet ]                       │
└──────────────────────────────────────────┘
```

#### Alignment Detail

```text
┌──────────────────────────────────────────┐
│  ←  Hizalanma                            │
├──────────────────────────────────────────┤
│           ┌─────────┐                    │
│           │   72    │  ring chart        │
│           └─────────┘                    │
│  "Küçük adımlarını sürdürüyorsun."       │
│                                          │
│  Nasıl oluştu?                           │
│  ┌ Görev tamamlama    +18 ────────────┐  │
│  │ 2/3 görev bu hafta tamamlandı      │  │
│  ├ Plana dönüş        +12 ────────────┤  │
│  │ 4 gün üst üste check-in             │  │
│  ├ Hedef ilerlemesi   +22 ────────────┤  │
│  ├ Tutarlılık         +20 ────────────┤  │
│  └ Yansıma            +10 ────────────┘  │
│                                          │
│  ℹ️ Ruh hâlin skorunu düşürmedi.         │
└──────────────────────────────────────────┘
```

#### Weekly Review

```text
┌──────────────────────────────────────────┐
│  ←  Haftalık Gözden Geçirme · Hafta 2    │
├──────────────────────────────────────────┤
│  Bu hafta                                │
│  · 4/5 görev tamamlandı                  │
│  · 5 check-in                            │
│  · Hizalanma: 68 → 72                    │
│                                          │
│  Yansıman (opsiyonel)                    │
│  ┌────────────────────────────────────┐  │
│  │ Bu hafta ne işe yaradı?            │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Plan düzenleme                          │
│  ┌ Mevcut         │  Güncellenmiş       │
│  │ 30dk günlük    │  15dk + akşam prep  │
│  └────────────────┴─────────────────────┘  │
│                                          │
│  [ Planı güncelle ]  [ Devam et ]        │
└──────────────────────────────────────────┘
```

#### Space Detail (Faz 2)

```text
┌──────────────────────────────────────────┐
│  ←  Çift Alanım · Emre & Ayşe            │
├──────────────────────────────────────────┤
│  👤 Emre  👤 Ayşe                        │
│                                          │
│  Ortak Vizyon                            │
│  ┌────┐ ┌────┐ ┌────┐                    │
│  │ 🏠 │ │ ✈️ │ │ 💕 │  vision cards    │
│  └────┘ └────┘ └────┘                    │
│                                          │
│  Paylaşılan                              │
│  · Ayşe — "Haftalık hedef tamamlandı"    │
│                                          │
│  [ + Paylaş ]  [ Davet gönder ]          │
└──────────────────────────────────────────┘
```

#### Settings

```text
┌──────────────────────────────────────────┐
│  ←  Ayarlar                              │
├──────────────────────────────────────────┤
│  Bildirimler                        →    │
│  Gizlilik                           →    │
│  Dil · Türkçe                       →    │
│  Tema · Açık                        →    │
│  Abonelik · Ücretsiz                →    │
│  Veri & Güvenlik                    →    │
│  ─────────────────────────────────       │
│  Çıkış yap                               │
└──────────────────────────────────────────┘
```

---

### 13 — Responsive Strategy

| Breakpoint | Genişlik | Nav | Layout |
|------------|----------|-----|--------|
| **Desktop** | ≥1024px | Sol sidebar sabit (240px) | 2–3 kolon KPI grid, geniş chart |
| **Tablet** | 768–1023px | Dar sidebar (icon-only, 64px) veya collapsible | 2 kolon KPI, chart full width |
| **Mobile** | <768px | Bottom tab (5 ikon) | Tek kolon stack, hero card full bleed |

#### Ekran bazlı davranış

| Ekran | Desktop | Tablet | Mobile |
|-------|---------|--------|--------|
| Dashboard | Sidebar + 3 KPI yan yana | 2 KPI + 1 alt satır | Stack, görev hero üstte |
| Check-in | Merkezi modal (480px) | Full page | Full page, büyük slider |
| Future Self | 2 kolon (soru + önizleme) | Tek kolon | Tek kolon + sticky CTA |
| Plan History | Tablo | Kart listesi | Kart listesi |
| Weekly Review | Side-by-side diff | Accordion diff | Accordion diff |
| Spaces | Grid 2 kolon | Grid 2 kolon | Liste |
| Vision Board | Masonry 3 kolon | 2 kolon | 1 kolon swipe |

**Mobile-first prensip:** Günlük görev ve check-in tek elle erişilebilir; primary CTA thumb zone'da (alt 1/3).

---

### 14 — State & Interaction Design

#### Global state matrisi

| Durum | Davranış | UI |
|-------|----------|-----|
| **Default** | Veri yüklü | Normal içerik |
| **Loading** | İlk fetch | Skeleton, shimmer |
| **Empty** | Veri yok | EmptyState + CTA ("İlk check-in'ini yap") |
| **Success** | İşlem tamam | Toast + hafif animasyon |
| **Error** | API hatası | ErrorState + retry |
| **Disabled** | Koşul sağlanmadı | Gri CTA + tooltip |
| **Offline** | Ağ yok | Banner + lokal kuyruk |
| **Permission denied** | 403 | "Bu alana erişimin yok" + geri |

#### Ekran bazlı

| Ekran / Component | Özel state'ler |
|-------------------|----------------|
| Dashboard | check-in: done/pending · task: pending/completed/skipped · review: ready/pending |
| Future Self Builder | draft · approved |
| Weekly Review | pending · ready · applied |
| Daily Task | pending · in_progress · completed · skipped |
| Space Invite | pending · expired · accepted |
| Premium Gate | locked · upgrading · active |

#### Ürün davranışları

| Senaryo | Davranış |
|---------|----------|
| Butona basıldığında | Optimistic UI (check-in, task complete); hata → rollback + toast |
| İşlem başarısız | Retry butonu; 3 deneme sonrası destek linki |
| Sayfa yenileme | Oturum korunur; form draft localStorage (onboarding) |
| Geri dönüş | Scroll position korunur (listeler); wizard adımı korunur |
| Yetkisiz sayfa | 403 ekranı, dashboard'a yönlendirme |
| Veri yok | EmptyState — asla boş beyaz ekran yok |
| Offline | Banner + "Değişiklikler senkronize edilecek"; read-only mod |
| Uzun işlem | Progress mesajı + arka planda devam + push bildirimi |
| Görev atlama | Ceza yok; nazik copy; streak kırılmaz (check-in streak ayrı) |
| Ruh hâli düşük | Hizalanma skoru düşürülmez; destekleyici mesaj |

---

### 15 — Data Architecture

#### Entity listesi

```text
User
├── FutureSelf (1 free, N premium)
│   └── VisionItem[]
├── Goal (1 active free, N premium)
│   └── Plan (versioned)
│       ├── DailyTask[]
│       └── WeeklyReview[]
├── TodayEntry (daily, unique per date)
├── AlignmentSnapshot (daily)
├── ProgressSnapshot (periodic)
├── DailyRitual (morning/evening, P2)
├── Space (personal default + shared)
│   ├── SpaceMembership[]
│   ├── SpaceInvite[]
│   └── SpacePermission[]
├── Asset (image/document)
├── FriendConnection
├── Notification
├── Subscription
└── AuditLog (system)
```

> **Not:** `Consent` entity'si AI fazında eklenecek. Bkz. [Ek A](#ek-a--ai-genişlemesi-sonra).

#### Entity ilişkileri (ER)

```text
User 1──N FutureSelf
User 1──N Goal
Goal 1──N Plan
Plan 1──N DailyTask
Plan 1──N WeeklyReview
User 1──N TodayEntry (unique: userId+date)
User 1──N AlignmentSnapshot
User 1──N Space (owner)
Space N──M User (via SpaceMembership)
Space 1──N Asset
Asset N──N SpacePermission
User 1──N Notification
Goal N──1 FutureSelf (optional link)
AlignmentSnapshot N──1 Goal, Plan (optional)
```

#### Kullanıcı verileri

| Veri | Hassasiyet | Varsayılan |
|------|------------|------------|
| E-posta, profil | Orta | Private |
| TodayEntry (yansıma) | Yüksek | Private |
| FutureSelf | Orta | Private |
| AlignmentSnapshot | Düşük | Private |

#### Uygulama verileri

- Plan versiyonları, görev geçmişi, haftalık review'lar
- Bildirim kuyruğu
- Offline sync queue (istemci)

#### Ayarlar

- locale, timezone, theme
- notification preferences (günlük hatırlatıcı saati, haftalık özet günü)

#### Loglar

- AuditLog: paylaşım, izin değişikliği, hesap silme
- AlignmentSnapshot: hesaplama anlık görüntüsü (immutable)

---

### 16 — Permission Architecture

#### Authentication

- E-posta/şifre + OAuth (Google, Apple)
- JWT access + refresh token
- Cihaz bazlı oturum (web + mobil ayrı)
- Oturum iptali, hesap silme

#### Authorization katmanları

| Katman | Kural |
|--------|-------|
| **Route** | Auth guard; onboarding guard; premium gate |
| **Resource** | userId ownership |
| **Space** | SpaceMembership.status=active + role |
| **Content** | VisibilityLevel + SpacePermission |

#### Roller

| Rol | Kapsam | Yetkiler |
|-----|--------|----------|
| **Guest** | Public | Landing, auth |
| **User** | Kişisel alan | CRUD own data |
| **Space Owner** | Ortak alan | Davet, üye yönetimi, paylaşım |
| **Space Member** | Ortak alan | Seçili içerik görüntüleme, paylaşım (izinle) |
| **Space Viewer** | Ortak alan | Salt okunur |
| **Premium User** | Abonelik | Kota artışı, ek özellikler |

#### Protected routes

- `/app/*` → auth required
- `/onboarding/*` → auth + incomplete onboarding
- `/spaces/:id` → active membership
- `/settings/export` → premium
- `/goals/create` (2+) → premium

#### Sensitive data kuralları

- Kişisel günlük varsayılan olarak private
- Paylaşılan asset geri çekilince storage ACL güncellenir
- Secret/token istemciye sızmaz

---

### 17 — System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                         USER                                 │
│              (Web Browser / Mobile App)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                          │
│  ┌─────────────────┐         ┌─────────────────┐            │
│  │   apps/web      │         │  apps/mobile    │            │
│  │   Next.js       │         │  Expo / RN      │            │
│  └────────┬────────┘         └────────┬────────┘            │
│           └─────────────┬─────────────┘                     │
│                         │                                    │
│              packages/shared (types, tokens, i18n)         │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / REST
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER (Go API)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │   Auth   │ │  Users   │ │  Goals   │ │  Spaces  │       │
│  │  Service │ │ & Profile│ │ & Plans  │ │ & Invites│       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Alignment│ │  Assets  │ │  Notify  │ │ Billing  │       │
│  │  Engine  │ │  Service │ │  Service │ │  Service │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐                                               │
│  │  Audit   │                                               │
│  │   Log    │                                               │
│  └──────────┘                                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐
│ PostgreSQL  │   │   Object    │   │  EXTERNAL SERVICES  │
│             │   │   Storage   │   │  · Push (FCM/APNs)  │
│ Users       │   │  (S3-compat)│   │  · Email (optional) │
│ Goals/Plans │   │  Images/Docs│   │  · Payment gateway  │
│ Spaces      │   │             │   │  · OAuth providers  │
└─────────────┘   └─────────────┘   └─────────────────────┘
```

#### Alignment Engine

```text
TodayEntry + DailyTask history + Goal progress + Plan adherence
    → Factor calculation (mood excluded from penalty)
    → AlignmentSnapshot (immutable daily record)
```

#### Weekly Review Engine (AI olmadan)

```text
Haftalık DailyTask + TodayEntry + AlignmentSnapshot agregasyonu
    → Metrik özeti (tamamlanan görev, check-in, trend)
    → Kullanıcı yansıması + manuel plan düzenleme
    → WeeklyReview kaydı
```

> AI Orchestration katmanı sonradan eklenecek. Bkz. [Ek A](#ek-a--ai-genişlemesi-sonra).

---

### 18 — MVP Definition

**MVP = P0 özelliklerinin tamamı — tek platformda uçtan uca döngü (AI olmadan).**

#### MVP kapsamında olan

1. Kayıt, giriş, şifre sıfırlama  
2. Tam onboarding: Future Self (form) → Goal → Plan (şablon)  
3. Dashboard (Bugün)  
4. Günlük check-in  
5. Günlük görev (plandan, tamamlama, atlama)  
6. Hizalanma skoru + faktör açıklaması  
7. Haftalık gözden geçirme (metrik özeti + manuel plan güncelleme)  
8. Gelecekteki Ben görüntüleme (read-only post-onboarding)  
9. Aktif plan görüntüleme  
10. Temel bildirimler (in-app + push iskelet)  
11. Profil + temel ayarlar  
12. Web + Mobil (aynı akışlar)  

#### MVP kapsamında olmayan

- AI destekli profil, plan, görev veya değerlendirme  
- Ortak alanlar, davet, paylaşım  
- Arşiv / dosya yükleme  
- Premium ödeme (UI gate placeholder olabilir)  
- Veri dışa aktarma  
- Karanlık mod  

#### MVP başarı kriterleri

- Kullanıcı 15 dk içinde onboarding'i tamamlayıp ilk görevi görebilir  
- 7 gün içinde ≥3 check-in + ≥2 görev tamamlama  
- Haftalık review otomatik hesaplanır ve plan güncellenebilir  
- Hizalanma skoru her zaman faktör açıklaması içerir  

---

### 19 — Future Features

| Faz | Özellik | Değer |
|-----|---------|-------|
| **Faz 2 — Sosyal** | Çift/arkadaş/aile alanları, davet, seçici paylaşım, arşiv | Birlikte büyüme, viral loop |
| **Faz 3 — Premium** | Çoklu hedef, abonelik, export | Gelir, derinleşme |
| **Faz 4 — AI** | Profil/plan/görev/review otomasyonu, consent, gelişmiş sohbet | Kişiselleştirme derinliği |
| **Faz 5 — Premium AI** | Sesli olumlamalar, görsel üretim, belge analizi | Premium değer |
| **Faz 6 — Zenginleştirme** | Sabah/akşam ritüelleri, uzun dönem grafikler | Retention |

---

### 20 — Open Questions

| # | Soru | Etki | Önerilen varsayılan |
|---|------|------|---------------------|
| 1 | Onboarding kaç adım olmalı — tek oturum mu, çok günlük mü? | Completion rate | Tek oturum (~10–15 dk), "Sonra devam et" draft kaydı |
| 2 | Günlük görev kaç tane — kesinlikle 1 mi? | Odak vs esneklik | MVP: **1 hero görev**; opsiyonel "bonus" P2 |
| 3 | Check-in zorunlu mu görev tamamlamak için? | Engagement | Hayır — bağımsız; check-in hizalanmayı güçlendirir ama gate değil |
| 4 | Haftalık review hangi gün tetiklenir? | Bildirim zamanlaması | Pazar akşamı veya kullanıcı seçimi (ayarlarda) |
| 5 | Plan şablonları kaç adet olmalı (MVP)? | Onboarding hızı | **Kapandı (2026-08-13):** sıfır. Yapı niyet alanları, içerik kullanıcıya ait. [`IA.md`](./IA.md) §05 |
| 6 | Çift alanında "progress comparison" ne gösterir? | Sosyal tasarım | Karşılaştırma değil; yan yana **kendi** ilerlemeleri (no ranking) |
| 7 | OAuth önceliği — Google mı Apple mı? | TR pazar | Her ikisi MVP; e-posta fallback |
| 8 | Ödeme sağlayıcı — Stripe vs Iyzico? | TR compliance | Iyzico (TR), Stripe (global) — Phase 3 kararı |
| 9 | Offline kapsam MVP'de ne kadar? | Mobil UX | Check-in + task complete queue |
| 10 | Landing / Manifesto ayrı mı birleşik mi? | Marketing | Manifesto ayrı route (`/manifesto`), landing kısa CTA |

---

## Ek A — AI Genişlemesi

> MVP'ye dahil değildir. Tam gereksinimler, akışlar, mimari ve faz planı: **[`docs/PRD-AI.md`](./PRD-AI.md)**  
> İnşa sırası (AI = Faz 5): **[`docs/INSA-PLANI.md`](./INSA-PLANI.md)**

Özet: AI; profil, plan, günlük görev ve haftalık değerlendirme için **opt-in** kişiselleştirme katmanıdır. `Consent` modeli ve `Asset.aiProcessingAllowed` `packages/shared` içinde hazırdır. Manuel akışlar AI olmadan tam MVP'yi oluşturur.

---

*Bu doküman canlıdır — her fazda güncellenir.*
