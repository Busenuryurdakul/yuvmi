# Yuvmi — Bilgi Mimarisi

> **Durum:** Taslak — 2026-08-13  
> **Bu belge:** Uygulama bilgi mimarisinin güncel kaynağı.  
> **Önceki ağaç:** [`PRD.md`](./PRD.md) §06–08 (IA v1). Silinmedi; karşılaştırma ve geri dönüş için duruyor.  
> **Geri almak:** Bu dosyayı kaldır, PRD / PRODUCT / INSA-PLANI / README içindeki “IA.md” işaretlerini sil. Eski ağaç PRD’de olduğu gibi kalır.

Özellikler menü maddesi değildir. Ekranlar **tek bir yaşam döngüsünün kesitleri**dir.

2026-08-13 yazdırma paketinden (niyet planı, ritim, dönüş karşılama, kopya kuralları) yalnızca omurgaya oturanlar alındı. Paket `docs/` altına kopyalanmadı — ikinci kaynak olmasın diye.

---

## 01 — Omurga

Navigasyon ağacı değil; ürünün bilgi sırası:

```text
Gelecekteki Ben
  → Neden
  → Hedef
  → Davranış
  → Plan (niyet: ne / neye bağlı / en küçük hâl)
  → Bugünün küçük adımı
  → Bugünkü hâlin
  → Hizalanma
  → Haftalık bakış
  → Plan değişir
  → Geçmişteki Ben
  → tekrar Gelecekteki Ben
```

Kullanıcı bunu her gün 12 adım yürümez.

| Ritim | Görünen kesit |
|-------|----------------|
| **İlk kez** | Ben → Neden → Hedef → Davranış → Plan → ilk odak |
| **Her gün** | Bugünkü hâlin → odak (yaptım / küçük hâli / bugün olmadı) → hizalanma |
| **Hafta** | Review → gerekirse plan vN |
| **Dönem** | Geçmişteki Ben ↔ Gelecekteki Ben |
| **Tetiklenen** | 4+ gün sonra dönüş karşılama; yoldan çıktım; deneme haftası bitti |

Bir ekranın var olma testi: bu omurgada bir kesiti mi gösteriyor, yoksa yeni bir menü mü?

---

## 02 — Beş ev (tab)

Mevcut 5 tab korunur. Tab adı **Ben** olmaz (Profil ve Bugün ile çakışır). Ürün kelimesi **Gelecekteki Ben** tab’da kalır.

```text
Bugün            günlük eylem
Gelecekteki Ben  kim olmak istediğin
Yolculuk         nasıl değiştiğin
Alanlar          seçerek birlikte
Profil           hesap + kısa indeks
```

Her tab bir **ev**. Altındakiler ayrı destinasyon değil, o evin odaları.

**Web:** aynı beş ev, desktop’ta sidebar. Bildirimler tab değildir; Profil veya modal.

---

## 03 — Sayfa olmayanlar

Ayrı destinasyon açılmaz. Durum, bölüm, alan veya tetiklenen akış olarak yaşar.

| Fikir | Nerede yaşar |
|-------|----------------|
| Niyet planı (ne / bağ / en küçük hâl) | Plan adımının üç alanı; hero’da kullanıcının cümlesi |
| Minimum / küçük hâl | Bugün hero’sunun ikinci aksiyonu; `minimumVersion` yoksa buton yok |
| İki kez kaçırma koruması | Görev üretimi: dün atlandıysa bugün küçük hâl önde |
| Ritim şeridi | Bugün’de streak yerine; son 14 gün |
| Enerji / süre | Plan adımında süre tahmini; ayrı ekran değil |
| Why ladder | Gelecekteki Ben bölümü (en fazla 3 basamak) |
| Identity → davranış | Gelecekteki Ben + hedef detayı |
| Plan sağlığı | Plan sayfasının üst bölümü (skor değil durum) |
| Geri dönüş metriği | Yolculuk’ta sayı; ayrı sayfa yok |
| Dönüş karşılama | 4+ gün sonra tetiklenen açılış; kaç gün yazılmaz |
| Deneme haftası | Plan oluştururken bayrak + 7. günde tetiklenen ekran |
| Yoldan çıktım | Bugün’den sheet → plan revizyonu |
| Örüntü | Haftalık review içinde; eşik yoksa hiç gösterilmez |
| Kanıtlarım | Mevcut `/archive` ürün adı |
| Benim Yuvmi’m | Profil kartı; ikinci ana sayfa değil |
| Paylaşımlar | Alan detayı |

**Ayrı sayfa hak edenler:** hedef detay, plan, plan geçmişi/diff, bugünkü hâlin, hizalanma detay, haftalık review, tetiklenen deneme sonucu, tetiklenen dönüş karşılama.

**Sonra (Katman C):** Geçmişteki Ben karşılaştırması, mektup, hayatım değişti, katkı ızgarası, widget, vizyon panosu UI, kural tabanlı korelasyon ekranı.

---

## 04 — Evler

### Bugün — varsayılan tab

Tek bakışta: bugün ne yapacağım?

```text
Selam, Ayşenur.
Bugünkü hâlin  →  veya  Enerji: orta · Bugün: sakin

Ritmin  ●●●◐○●●  ●●○●●●●   11/14 gün

BUGÜNÜN ODAĞI
“Kahvemi içtikten sonra, 10 dakika günlük yazacağım.”
[ Yaptım ]  [ Küçük hâliyle: tek cümle ]  [ Bugün olmadı ]

Gelecekteki sen: “Daha sakin ve düzenli…”
Bu adım onunla bağlı.

Bugün biraz daha yaklaştın.
✓ odak  ✓ geri dönüş  · ruh hâli puanı değiştirmedi

Akşam: Bugün kendinle ilgili ne fark ettin?  [tek satır]
```

- “Check-in” yazılmaz. Ekran adı: **Bugünkü hâlin**. CTA: **Kaydet** / **Başla**.
- Hero, jenerik görev başlığı değil; kullanıcının niyet cümlesidir (`anchor` + `title`).
- `minimumVersion` boşsa ikinci buton **gizlenir** — uydurma minimum yok.
- Bugün ekranı `%74` göstermez. Yaklaşma **nedeniyle** anlatılır.
- `Yoldan çıktım` sheet: çok yoğun / enerji düşüktü / hedef büyüktü / ilgim kayboldu / başka öncelik → plan revizyonu.

**Ritim şeridi** streak’in yerini alır. Kırılacak bir şey yoktur; 14 günlük pencere kayar.

| İşaret | Anlam |
|--------|-------|
| ● | Tamamlandı |
| ◐ | Küçük hâliyle |
| ○ | Olmadı |
| Kırmızı yok | — |

**Dün atlandıysa** hero küçülür (iki kez kaçırma koruması):

> Küçük başlayalım. Dün olmadı — bugün eşiği düşürdük.  
> [ Yaptım ]  [ Tam hâlini göster ]

Kopya: “dün yapmadın” değil, **“dün olmadı”**.

**Bugünkü hâlin (modal)**

- Ruh hâli ve enerji zorunlu; minnet ve yansıma **opsiyonel** (ekranda yazılır).
- Yansıma kutusu sabit “kısa yansıma” değil, dönen soru: *Bugün ne kolaydı? / Ne seni yavaşlattı? / Neyi tekrar yapardın?*
- Ruh hâli 1–2 kaydedilince: **“Bugünkü hâlin skorunu düşürmedi.”** İlke görülmeden vaat sayılmaz.

Route: `(tabs)/index` · `check-in` (modal) · `task/[id]` · `alignment`

### Gelecekteki Ben — kimlik evi

Statik profil değil. Üç bölüm, tek kaydırma:

1. **Kim olacağım?** nasıl yaşıyorum, neyi bırakıyorum, sabahım
2. **Neden?** en fazla 3 basamak
3. **Öyle biri olunca ne yapıyorum?** 2–5 davranış

Alta: düzenle. Mektup bu evin sonraki odasıdır; ilk sürümde bölüm olarak koyulmaz.

Hedef onboarding’i bu tab’ın çıktısından **alıntı** gösterir; textarea’nın ilk satırları anlamlı olmalı. Placeholder soruyu tekrar etmez: *“Birkaç cümle yeter.”*

Route: `(tabs)/future-self` · `future-self/edit`

### Yolculuk — hikâye evi

```text
YOLCULUK
Bu hafta harekete geçtin.   ← puan değil

Aktif hedef: İngilizcemi geliştirmek
Bu hafta: 4 odak · 2 geri dönüş · 1 plan güncellemesi

Plan v3 · deneme günü 5/7
Durum: biraz yoğun          [ Planı gör ]
```

`72 / 100` ve `Gün 37/90` bar’ı habit tracker dilidir. Süre varsa “37. gün” metin olarak yeter.

Drill-down:

```text
Yolculuk
  → Hedef
      → Plan
          → sağlık (bölüm)
          → geçmiş / diff
      → (Katman C) Geçmişteki Ben
      → (Katman C) Kanıtlar = arşiv
```

Geri dönüş: “Son 60 günde 7 kez plana geri döndün.” Streak yok.

Plan sağlığı skor değil durum: **iyi gidiyor / biraz yoğun / dokunulmuyor / sık değişiyor**.

Örüntü kartı **haftalık review içinde** durur, Bugün’e taşınmaz. Eşik aşılmazsa kart yok.

Route: `(tabs)/journey` · `goal/[id]` · `plan/[id]` · `plan/[id]/history` · `weekly-review`

### Alanlar — birlikte, sıralamasız

Ortak görünüm: **Ayşe 4 · sen 6 · birlikte 10**. Asla önde/geride.

Ekranda yazılı durur:

> Burada kimse kimseyle yarışmıyor. Herkes kendi yolunda.

Route: `(tabs)/spaces` · `spaces/[id]` · `spaces/invite`

### Profil — yönetim + indeks

```text
BENİM YUVMI'M
2 hedef · 7 geri dönüş · 3 plan sürümü
```

Kart Yolculuk ve Gelecekteki Ben’e gider. Satırlar gruplu ve dokunulabilir: hesap, bildirim, gizlilik, abonelik, verilerim, çıkış.

Route: `(tabs)/profile` · `notifications` · `archive` (Kanıtlarım) · `premium` · `settings/*`

---

## 05 — Onboarding

Omurganın ilk yürüyüşü. Adım sayısı **4’ü geçmez**. Şablon-first plan yok.

```text
Hoş geldin
  → Gelecekteki Ben (kim + neden + birkaç davranış)
  → Hedef (Future Self alıntısı + tek soru + süre chip)
  → Plan (niyet adımları + “7 gün deneyelim”)
  → Tamamlandı → Bugün
```

Why ve davranış ayrı onboarding adımı olmaz. `future-self-review` ayrı onay tiyatrosu olmaz.

**Hedef sayfası**

- Üstte bir önceki adımın çıktısı: *Yazdığın gelecekteki sen: “…”*
- Tek soru: *Oraya giden yolda ilk büyük değişiklik ne olsun?*
- Neden sorulduğu söylenir: *Günlük adımların bu cümleden çıkacak.*
- “Nasıl bir cümle?” örnekleri **okunur, tıklanınca forma dolmaz** (şablon kılığı).
- Süre chip: 30 / 60 / 90 / Belirsiz — zorunlu boş tarih değil.
- Onboarding **tek hedef**. Çoklu hedef paywall’ı ilk oturuma çekmez. Satır: *Sonra Yolculuk’tan yeni hedef ekleyebilirsin.*

**Plan sayfası — niyet, boş kutu değil**

Yapıyı uygulama verir, içeriği kullanıcı yazar. Her adım:

1. Ne yapacaksın?
2. Bunu neye bağlayacaksın? *(zaten yaptığın bir şey — hatırlamak kolaylaşır)*
3. Zor bir günde en küçük hâli?
4. Sıklık: her gün / hafta içi / haftada N
5. Süre tahmini (opsiyonel chip)

Canlı önizleme (uygulama kelime eklemez):

> *“Kahvemi içtikten sonra, 10 dakika günlük yazacağım.”*

En fazla 5 adım; tek adımla başlamak serbest. `PlanTemplatePicker` ve `plan-templates.ts` bu akışta kullanılmaz.

Push izni onboarding açılışında **istenmez**. İlk plan kaydından / ilk değer anından sonra sorulur.

---

## 06 — Route haritası

| Ev / oda | Mevcut | Hedef |
|----------|--------|--------|
| Bugün | `(tabs)/index` | niyet cümlesi + ritim + küçük hâl |
| Bugünkü hâlin | `check-in` | dil Türkçe; opsiyonel yansıma; düşük ruh teyidi |
| Odak | `task/[id]` | yaptım / küçük hâl / bugün olmadı |
| Hizalanma | `alignment` | `plan_return` = gerçek geri dönüş; küçük hâl sayılır |
| Gelecekteki Ben | `(tabs)/future-self` | why + davranış bölümleri |
| Yolculuk | `(tabs)/journey` | hikâye; skor halkası ev sahibi değil |
| Plan | onboarding şablon | niyet formu + sağlık + geçmiş |
| Review | `weekly-review` | deneme sonucu + örüntü (eşikli) |
| Arşiv | `archive` | Kanıtlarım |
| Alanlar | `spaces` | yarış yok cümlesi |
| Profil | `(tabs)/profile` | indeks kartı |

**Yeni route (az):** `goal/[id]`, `plan/[id]`, `plan/[id]/history`, `future-self/edit`.

**Tetiklenen (browse edilmez):** deneme haftası bitti, yoldan çıktım → revizyon, hayatım değişti, **4+ gün sonra dönüş karşılama**.

**Sonra:** `past-self`, `letters`.

**Dönüş karşılama (4+ gün):** “Tekrar hoş geldin. Ara vermek yolculuğun bir parçası.” Küçük adım + planı gözden geçir. **Kaç gün yoksun yazılmaz.** 14+ günde planı gözden geçir öne çıkar.

---

## 07 — Model (yeni bounded context yok)

Mevcut tipler genişler. Yeni domain açılmaz.

Plan **takvim değil**: adım havuzu + sıklık. Günlük odak, `dayOffset` sırasıyla değil sıklığa göre havuzdan seçilir.

| Tip | Ekleme |
|-----|--------|
| `FutureSelf` | `portrait` · `why: string[]` (max 3) · `behaviors: string[]` |
| `Goal` | `why?: string` (tek cümle) |
| `Plan` | `trialEndsAt?` · versiyonda `revisionReason?` · sağlık hesaplanır |
| `PlanStep` | `title` · `anchor?` · `minimumVersion?` · `frequency` (`daily` \| `weekdays` \| `weekly_n`) · `weeklyCount?` · `estimatedMinutes?` |
| `DailyTask` | status: `completed \| minimum_done \| skipped` · `servedAsMinimum?` |
| `AlignmentSnapshot` | `plan_return` = boş/atlanan günden sonra hareket · yanıtta `rhythm` (14 gün: completed / minimum / skipped) · `consistency` streak değil |

`minimum_done` hizalanmada sıfır değildir (tamamın bir bölümü; oran tek yerde, ayarlanabilir). Faktör metni: *“Küçük hâliyle yaptığın günler de sayıldı.”*

`anchor` ve `minimumVersion` opsiyonel — mevcut planlar bozulmaz.

Kanıt = mevcut `Asset` + not tipi. Mektup ve “hayatım değişti” Katman C.

---

## 08 — Dil

Her metin: **Bunu sakin, iyi niyetli bir arkadaş söyler mi?** Söylemezse yeniden yazılır. Dizeler ekrana gömülmez; `packages/shared` i18n üzerinden gider.

### Yasak

| Kalıp | Neden |
|-------|-------|
| “unuttun”, “kaçırdın”, “başarısız” | suçluluk |
| “X kişiden daha iyisin”, sıralama | karşılaştırma |
| “olacaksın”, “kaderin”, “uyumluluk” | tahmin |
| “seri kırıldı”, “sıfırlandı” | kayıp çerçevesi |
| “yapmalısın”, “-meli/-malı” | emir |
| Ünlem yığını | gürültü |

Olumsuz sonuçta özne yok: *“Dün olmadı.”* Öneri soru: *“…ister misin?”* Başarı sade: *“Kaydedildi.”*

### Evlere göre

| Yer | Dil |
|-----|-----|
| Bugün | “biraz daha yaklaştın” + neden |
| Yolculuk | hareket: geri dönüş, plan güncellemesi, tamamlanan odak |
| Plan | durum cümlesi; `72 / 100` yok |
| Alanlar | birlikte toplam; “kimse yarışmıyor” |
| Bildirim | aşağıda |

### Bildirim

Günde en fazla 1. Kaçırılan gün için hatırlatma **gönderilmez**. Dönüş kullanıcının kararıdır; karşılama ekranı onu karşılar.

| Yazılmaz | Yazılır |
|----------|---------|
| Bugün adımını atmayı unuttun | Bugünün adımı seni bekliyor |
| 3 gündür yoksun | Tekrar hoş geldin |
| Serin tehlikede! | *(gönderilmez)* |
| Hedefinden uzaklaşıyorsun | Planını gözden geçirmek ister misin? |

---

## 09 — Katmanlar (inşa sırası)

[`INSA-PLANI.md`](./INSA-PLANI.md) faz numaraları (0–5) değişmez. Bu katmanlar **ne inşa edileceğini** söyler; iskelet Faz 0’ı yeniden tanımlamaz.

Özellik eklemek uygulamayı bitirmez. Çıkışı bekleyen şey ekran sayısı değil: reddedilen onboarding ve vaadin arayüzde tutulmaması.

**Katman A — döngü yaşasın**

- Hedef sayfası (Future Self alıntısı, tek soru, süre chip, tıklanmayan örnek)
- Niyet planı; şablon picker kalkar
- Bugün: niyet cümlesi, küçük hâl, ritim şeridi, iki kez kaçırma
- Bugünkü hâlin dili + düşük ruh teyidi
- Kopya / bildirim denetimi
- 4+ gün dönüş karşılama
- Profil indeksi, boş durumlarda CTA
- Kademeli push izni

**Katman B — plan hayata uysun**

Deneme haftası, yoldan çıktım, plan sağlığı (durum), plan diff + neden, gerçek geri dönüş metriği, haftalık review içindeki eşikli örüntü.

**Katman C — bellek ve derinlik**

Geçmişteki Ben, kanıtlar, mektup, hayatım değişti, sessiz hafta / nefes günü, katkı ızgarası, widget, vizyon panosu UI, korelasyon içgörüsü (n ≥ 14; nedensellik dili yok), kendi sesiyle olumlama kaydı (TTS/klon değil).

A olmadan C boş kalır. B olmadan A habit tracker’dır.

Korelasyon ve heatmap çıkıştan önce **yazılabilir**; ~14 gün veri yokken gösterilmez.

---

## 10 — Filtre (yeni özellik buradan geçer)

| # | Kural |
|---|-------|
| A1 | Suçluluk veya baskı üretmez |
| A2 | Kullanıcıları karşılaştırmez, sıralamaz |
| A3 | Ruh hâli düşük diye puan düşürmez |
| A4 | Tahmin, fal, terapi, teşhis satmaz |
| A5 | Tek yorum/analiz için ayrı ücret yok |
| A6 | Skor değil, skorun nasıl oluştuğu da açıklanır |

AI gerektiren hiçbir şey bu belgenin katmanlarında yoktur (`PRD-AI.md`, Faz 5, consent).

---

## 11 — Bilinçli olarak yapılmaz

- Klasik streak ödülü (ritim şeridi vardır, kırılır sayı yoktur)
- XP, seviye, rozet, can kaybı
- Sosyal feed, follower, leaderboard, genel challenge
- Sanal evcil hayvan (tonu al, mekaniği alma)
- Finansal ceza
- “Bugün 6 görev”, sınırsız alışkanlık listesi
- Mood düşükse puan kırma
- İçerik kütüphanesi, meditasyon/video platformu
- Fal / rüya / uyumluluk, parça başı analiz
- Ses klonlama, TTS olumlama
- Giyilebilir / sağlık kiti entegrasyonu
- Her yüzey için AI sohbet botu
- Onboarding’de çoklu hedef (paywall’ı ilk beş dakikaya çekmez)

Premium satışında kota artışı **ikinci** sıradır. Önce içgörü ve kişisel geçmiş. Tek yorum için ayrı ücret yok.

---

## 12 — Kuzey yıldızı (çıkışta ölçülür)

| Metrik | Neden |
|--------|-------|
| Kayıt → ilk odak tamamlama (24s) | Aktivasyon |
| Onboarding tamamlama | Hedef + plan sayfalarının sınavı |
| En az bir `anchor` doldurma | Niyet planı işe yarıyor mu |
| Bir gün “olmadı”ktan sonra ertesi gün açma | Ritim / dönüş |
| `minimum_done` kullanım oranı | Küçük hâl gerçek ihtiyaç mı |
| Push opt-in (kademeli izin sonrası) | İzin anı doğru mu |

---

*Canlı belge. Uygulama değişince route ve model tabloları güncellenir.*
