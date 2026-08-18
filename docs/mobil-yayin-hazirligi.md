# Mobil Yayın Hazırlığı

Uygulamayı App Store ve Play Store'a göndermeden önce kapatılması gereken
maddeler. "Kodda tamam" olanlar işaretli; kalanlar hesap sahibi olarak yalnızca
Ayşe'nin üretebileceği değerler.

---

## Kodda tamamlandı ✅

| Madde | Nerede |
|---|---|
| Uygulama ikonu bağlandı (iOS + Android adaptive + monochrome + web favicon) | `apps/mobile/app.json` |
| Galeri izni metni Türkçeleştirildi; kullanılmayan kamera/mikrofon izinleri kapatıldı | `apps/mobile/app.json` → `expo-image-picker` eklentisi |
| Gizlilik politikası uygulama içinde gerçek bir ekran | `apps/mobile/app/legal/privacy.tsx` |
| Destek/geri bildirim uygulama içinde gerçek bir ekran | `apps/mobile/app/legal/support.tsx` |
| Her iki satır da yayımlanmış URL varsa ona yönleniyor | `apps/mobile/src/lib/links.ts` |

`expo-document-picker` eklentisi **bilerek eklenmedi**: temel belge seçimi için
gerekli değil, yalnızca iCloud yetkilendirmesi ekliyor. Apple App ID'sinde iCloud
açık değilse eklemek derlemeyi kırar.

---

## Senin sağlaman gerekenler ⏳

### 1. EAS proje kimliği

`app.json` içinde hâlâ `"projectId": "YOUR_EAS_PROJECT_ID"` duruyor. Bu değer
Expo hesabında proje oluşturulunca üretilir — uydurulamaz, elle yazılamaz.

```bash
cd apps/mobile && npx eas init
```

Komut projeyi Expo hesabında açar ve gerçek UUID'yi `app.json`'a kendisi yazar.
Bu yapılmadan **push bildirimi token'ı alınamaz** (`usePushNotifications.ts`
placeholder'ı fark edip sessizce devre dışı kalıyor) ve **hiçbir EAS derlemesi
başlatılamaz**.

### 2. App Store Connect değerleri

`eas.json` → `submit.production.ios` üç placeholder içeriyor:

| Alan | Nereden |
|---|---|
| `appleId` | Apple Developer hesabının e-postası |
| `ascAppId` | App Store Connect → uygulamanı oluştur → App Information → "Apple ID" (10 haneli sayı) |
| `appleTeamId` | developer.apple.com → Membership → Team ID (10 karakter) |

Apple Developer Program üyeliği (yıllık $99) bunlardan önce gerekiyor.

### 3. Google Play servis hesabı anahtarı

`eas.json` `./google-play-service-account.json` dosyasını bekliyor. Play Console
→ Setup → API access → yeni servis hesabı → JSON anahtar indir.

Dosya adı `apps/mobile/.gitignore` içinde zaten listeli, yani indirdiğin anahtar
yanlışlıkla commit edilmez.

### 4. Yayımlanmış gizlilik politikası URL'si

Uygulama içi ekran kullanıcı için yeterli, ama mağaza **kaydı** ayrıca herkese
açık bir URL istiyor (App Store Connect → App Privacy; Play Console → Store
listing). Statik bir sayfa yeterli.

Sayfa yayımlandığında uygulamadaki satırı da ona yönlendirmek için:

```bash
EXPO_PUBLIC_PRIVACY_URL=https://…
EXPO_PUBLIC_SUPPORT_URL=https://…
EXPO_PUBLIC_SUPPORT_EMAIL=…
```

`eas.json` içindeki `production.env` bloğuna eklenmeleri gerekiyor. Hiçbiri
ayarlanmazsa uygulama kırılmaz — uygulama içi ekranlara düşer.

`apps/mobile/app/legal/privacy.tsx` içindeki metin, şemadan doğrulanmış gerçek
bir veri akışı dökümü; **hukuki inceleme görmedi.** Yayımlamadan önce bir
hukukçuya okutulması gerekiyor.

### 5. Destek e-posta kutusu

`EXPO_PUBLIC_SUPPORT_EMAIL` ayarlanmazsa destek ekranında e-posta düğmesi hiç
görünmez. Apple inceleme formunda ayrıca bir iletişim adresi istiyor.

---

## Sıra

1. `eas init` → projectId (her şeyin önkoşulu)
2. Apple Developer + Play Console hesapları → kimlik değerleri
3. Gizlilik politikası sayfasını yayımla → URL'yi `eas.json`'a ekle
4. `npx eas build --profile preview` ile iç dağıtım derlemesi al, cihazda dene
5. `npx eas build --profile production` → `npx eas submit`
