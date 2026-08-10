# Yuvmi — Ürün Vizyonu

> **Slogan:** Bugününü gör. Gelecekteki kendine yaklaş.
>
> **Manifesto başlığı:** Bugünkü seni keşfet. Gelecekteki seni inşa et.

## Marka

| Alan | Değer |
|------|-------|
| Proje adı (görünen) | **Yuvmi** |
| Teknik ad / slug | `yuvmi` |
| Platform | Web + Mobil |
| İlk dil | Türkçe |
| Çoklu dil | Mimari ilk günden i18n'e hazır (`packages/shared` sabitlerinde `tr` / `en` yapısı) |

## Ne?

Yuvmi, bireyin **bugünkü halini** ve **gelecekteki ideal halini** yan yana görünür kılan, kişisel gelişim odaklı bir platformdur. Web ve mobilde çalışır.

**Temel değer önerisi:** Yuvmi, olmak istediğin kişiyle bugünkü hâlin arasındaki yolu görünür kılar; hedeflerini uygulanabilir bir plana dönüştürür ve her gün atabileceğin en doğru küçük adımı belirler.

> Yuvmi terapi, psikolojik teşhis veya gelecek tahmini sunmaz.

## Ana Ürün Döngüsü

1. **Gelecekteki Ben** profili
2. **90 günlük hedef**
3. **30 günlük aktif plan**
4. **Günlük kişiselleştirilmiş görev**
5. **Haftalık AI değerlendirmesi**
6. **Sonuca göre planın güncellenmesi**

### İlk uçtan uca akış

Kayıt → Onboarding → Gelecekteki Ben profili → Kullanıcı onayı/düzenlemesi → 30 günlük plan → Bugünün görevi → Görev tamamlama → Haftalık değerlendirme

## Çekirdek Kavramlar

| Kavram | Açıklama |
|--------|----------|
| **Bugün** | Günlük check-in — ruh hâli, enerji, minnet, yansıma |
| **Gelecekteki Ben** | Hayalindeki hal; alanlar, affirmasyonlar, vizyon |
| **Hedef** | 90 günlük dönüşüm hedefi (Gelecekteki Ben'e bağlı) |
| **30 günlük plan** | Hedefin uygulanabilir fazı; haftalık güncellenebilir |
| **Günlük mikro görev** | Plana göre kişiselleştirilmiş tek odak adım |
| **Haftalık değerlendirme** | AI destekli özet ve plan uyarlaması |
| **İlerleme / hizalanma** | Skor + açıklama; baskı veya suçluluk üretmez |
| **Kişisel alan** | Varsayılan özel alan |
| **Çift alanı** | İki tarafın onayıyla ortak alan |
| **Arkadaş alanı** | Seçili paylaşım ve destek |
| **Aile alanı** | Aile üyeleriyle sınırlı ortak alan |
| **Görsel ve belge arşivi** | İçerik bazlı görünürlük izinli varlıklar |

## Hizalanma Metriği İlkeleri

1. Kullanıcının ruh hâli düşük olduğu için puanı **düşürülmemeli**.
2. Kullanıcılar birbirleriyle **karşılaştırılmamalı**.
3. Tamamlanan küçük adımlar, plana geri dönüş ve hedef ilerlemesi dikkate alınmalı.
4. Metrik suçluluk veya baskı **üretmemeli**.
5. Kullanıcıya yalnızca skor değil, skorun **nasıl oluştuğu** da açıklanmalı.

Teknik model: `AlignmentSnapshot` (`packages/shared`).

## MVP AI Kapsamı

### Dahil (MVP)

1. Gelecekteki Ben profilinin oluşturulması
2. Hedefin 30 günlük plana bölünmesi
3. Günlük kişiselleştirilmiş görev üretilmesi
4. Haftalık değerlendirme ve plan uyarlaması

### Kapsam dışı (şimdilik)

- Gelecekteki Ben ile sürekli AI sohbeti
- Ses üretimi
- Kullanıcının kendi sesini klonlama
- AI görsel üretimi
- Gelişmiş belge analizi
- Rüya yorumu
- Tarot veya gelecek tahmini

## Alan ve Gizlilik İlkeleri

- Kişisel veriler varsayılan olarak **özeldir**.
- Kişisel günlük ve AI geçmişi **otomatik paylaşılmaz**.
- Ortak alana yalnızca kullanıcının **seçtiği** içerikler eklenir.
- Partner, arkadaş veya aile daveti **iki tarafın onayıyla** tamamlanır.
- Görsel ve belgeler için **içerik bazlı görünürlük** izni bulunur.
- Kullanıcı ortak alandan ayrılabilir ve paylaştığı içeriği **geri çekebilir**.
- AI yalnızca kullanıcının **izin verdiği** bilgileri kullanır (`Consent` modeli).
- Birlikte büyümek, aynı kişiye dönüşmek veya birbirini gözetlemek **değildir**.

## Premium Sınırı

### Ücretsiz

- Bir Gelecekteki Ben profili
- Bir aktif hedef
- Günlük check-in
- Temel 30 günlük plan
- Günlük görev
- Haftalık özet
- Sınırlı dosya yükleme
- Bir ortak alan

### Premium

- Birden fazla hedef ve ortak alan
- Gelişmiş AI sohbeti
- Gelişmiş haftalık analiz
- Sesli olumlamalar
- AI görsel üretimi
- Belge analizi
- Daha fazla depolama
- Uzun dönem karşılaştırmaları *(kişisel geçmiş; kullanıcılar arası değil)*
- Veri dışa aktarma

**Ürün ilkesi:** Tek bir yorum veya analiz için ayrı ücret alınmayacak (Azora tarzı parça parça satış yok).

## Rakip Konumlandırma

| Rakip | Odak | Yuvmi farkı |
|-------|------|-------------|
| **Aya** | Olumlama, manifestasyon, vizyon panosu | Yuvmi eylem planı + günlük görev + haftalık adaptasyon sunar; sosyal alan katmanı vardır |
| **Azora** | Rüya, tarot, uyumluluk okumaları | Yuvmi tahmin veya okuma satmaz; kişiselleştirilmiş eylem sistemidir |
| **Meditopia** | Meditasyon, uyku, içerik kütüphanesi | Yuvmi içerik tüketimi değil; bugünden gelecekteki benliğe uzanan kişisel yolculuktur |

### Rakip detay notları

Aşağıdaki maddeler mağaza sayfalarından alınmıştır; kesin rakamlar zamanla değişebilir — **doğrulama gerekli**:

| Rakip | Kaynakta görülen | Not |
|-------|------------------|-----|
| Aya | Yüksek indirme, yüksek puan, agresif paywall şikâyetleri | Fiyat: ~£10/hafta (kullanıcı yorumu — doğrulama gerekli) |
| Aya | Platform | Mağaza: mobil odaklı (doğrulama gerekli) |
| Azora | Yüksek parça başı fiyat (₺799+ okuma) | Mağaza fiyat listesi — doğrulama gerekli |
| Azora | Platform | Mağaza: mobil (doğrulama gerekli) |
| Meditopia | Meditasyon / uyku kütüphanesi | Genel wellness; hedef-plan-görev döngüsü yok |

**Yuvmi konumu:** Bugünkü durumdan gelecekteki benliğe uzanan **kişiselleştirilmiş eylem sistemi**.

## Çekirdek Özellikler (Yol Haritası)

### Faz 1 — Temel (MVP)
- [ ] Kullanıcı kayıt / giriş
- [ ] Gelecekteki Ben profili + kullanıcı onayı
- [ ] 90 günlük hedef + 30 günlük plan
- [ ] Günlük görev + check-in
- [ ] Hizalanma görünümü (açıklamalı skor)
- [ ] Haftalık AI değerlendirme + plan güncelleme

### Faz 2 — Sosyal
- [ ] Davet ve çift taraflı onay
- [ ] Kişisel / çift / arkadaş / aile alanları
- [ ] İçerik bazlı paylaşım ve geri çekme
- [ ] Görsel ve belge arşivi

### Faz 3 — Premium derinlik
- [ ] Gelişmiş AI sohbeti
- [ ] Sesli olumlamalar
- [ ] AI görsel üretimi
- [ ] Belge analizi
- [ ] Veri dışa aktarma

## Teknik Mimari (Özet)

```
yuvmi/
├── apps/
│   ├── web/          → Next.js (App Router)
│   └── mobile/       → Expo / React Native
├── packages/
│   └── shared/       → Tipler, sabitler, paylaşılan mantık
└── docs/
    ├── PRODUCT.md    → Bu dosya
    └── ARCHITECTURE.md → Backend ihtiyaçları ve Go kararı
```

Backend henüz uygulanmadı. Altyapı dili olarak **Go** planlandı; ayrıntılar [`ARCHITECTURE.md`](./ARCHITECTURE.md) dosyasında.

## Tasarım Dili

- **Renkler:** Dusty rose (#C4717B), muted teal (#5B8A8A), warm cream (#FDF8F5)
- **Ton:** Sakin, samimi, baskısız — "gürültü yok, izleyen yok"
- **Tipografi:** Geist (web), system (mobil)

---

*Bu doküman canlıdır — her fazda güncellenir.*
