# Yuvmi — Teknik Denetim Raporu

**Tarih:** 17 Ağustos 2026
**Kapsam:** `apps/mobile`, `apps/api`, `packages/shared`, `apps/web`
**Denetlenen kod:** çalışma dizini (commit'lenmemiş 43 dosya + `00030_add_pearl_economy.sql` dahil)
**Branch:** `feat/ayse-mobile-atolye-yuvmi-experience`
**Yayın durumu:** geliştirme aşaması — "yayından önce" listesi buna göre kalibre edildi

---

## Özet

Kod tabanı üç farklı olgunluk seviyesinde:

- **`apps/api` altyapı katmanı** (repository, auth, middleware) iyi durumda. SQL'lerin tamamı parametreli, asset yetkilendirmesi doğru, inci ekonomisi advisory lock ile yarışa kapalı, CORS varsayılanı güvenli.
- **`apps/api` iş mantığı katmanı** hata yönetiminde zayıf: 31 satır tarama döngüsünün 2'sinde `rows.Err()` var, use-case katmanında ~22 yerde hata açıkça yutuluyor, çok adımlı yazma işlemleri transaction'sız.
- **`apps/mobile`** en çok bulgu üreten yer: hiç `FlatList` yok, 274 dokunulabilir öğeden 9'unda erişilebilirlik özelliği var, kullanıcının profil ekranında açıp kapattığı 6 ayarın hiçbiri bir şey yapmıyor, ve çıkış yaptığında yerel verisi cihazda kalıyor.

**Doğrulanan pozitifler:** `tsc --noEmit` mobil/web/shared'da temiz, `eslint` web'de temiz, `go vet ./...` temiz.

**En kritik üç bulgu:** JWT secret'ın koda gömülü varsayılanı (#E12), çıkışta temizlenmeyen kullanıcı verisi (#S7), auth uçlarında rate limit olmaması (#E13).

---

## 1. Mimari — klasör yapısı, katman ayrımı, bağımlılık yönü

| # | Dosya:satır | Sorun | Neden önemli | Önem | Efor |
|---|---|---|---|---|---|
| M1 | `apps/api/internal/application/yuvmi/usecase/service.go:22,32,54` | Use-case katmanı somut Postgres tipine bağımlı: `pgProfile "…/infrastructure/postgres/profile"` import ediliyor, `profilePG *pgProfile.ProfileRepo` alanı tutuluyor | DDD katmanlamasının tek kuralı ihlal edilmiş: application → infrastructure. Repository'yi değiştirmek use-case'i kırar, use-case'i test etmek gerçek DB gerektirir | Yüksek | 2-3 sa |
| M2 | `service.go:51-70` | `NewService` 18 pozisyonel parametre alıyor; 6 tanesi benzer arayüz tipinde | Aynı tipten iki argümanın yeri değişirse derleyici yakalamaz, çalışma zamanında yanlış repo'ya yazar | Orta | 1-2 sa |
| M3 | `usecase/faz2.go`, `faz3.go`, `faz3_assets.go`, `faz4.go` | Dosyalar alan adına değil proje fazına göre isimlendirilmiş | "Abonelik mantığı nerede?" sorusunun cevabı `faz4.go` — dosya adı hiçbir bilgi taşımıyor, dosyalar 231-432 satır | Orta | 2 sa |
| M4 | `apps/api/internal/infrastructure/http/router/router.go:217-307` | masterfabric şablonundan gelen tenant/org/apps/endpoints/gateway/audit/websocket rota ağacı Yuvmi tarafından hiç kullanılmadığı hâlde canlıda açık | Kullanılmayan ~90 satırlık yetkili yüzey; her biri ayrıca güvenlik incelemesi gerektirir. `maybeRequirePermission` RBAC nil ise izni tamamen atlıyor (satır 32-37) | Yüksek | 4-6 sa |
| M5 | `router.go:87` | `/metrics` Prometheus ucu kimlik doğrulamasız | Rota isimleri, istek sayıları, gecikme dağılımları herkese açık | Yüksek | 15 dk |
| M6 | `apps/api/cmd/server/main.go` (DB init) + `router.go:93,104,110,113` | Postgres bağlanamazsa `db = nil` ile devam ediliyor; router'daki `if deps.X != nil` blokları o rotaları sessizce hiç kaydetmiyor | Yanlış yapılandırılmış sunucu ayağa kalkıyor ve API'nin yarısı 404 dönüyor. Hata, mobil tarafta "endpoint yok" olarak görünür — gerçek sebep gizlenir | Yüksek | 1 sa |
| M7 | `apps/mobile/src/lib/api/yuvmi.ts` (456 satır, ~60 fonksiyon) | Her fonksiyon `token` parametresi alıyor; oturumu bilen bir istemci katmanı yok | Her ekran `user?.token` kontrolü yapmak zorunda; 49 route boyunca tekrarlanan `if (!user?.token) return` kalıbı. Token'ı unutan bir çağrı derleme zamanında değil çalışma zamanında patlar | Orta | 3-4 sa |
| M8 | `tsconfig.json` (repo kökü) | Kökteki tsconfig bir Expo *uygulama* konfigürasyonu (`extends: expo/tsconfig.base`, `paths: {"@/*": ["./src/*"]}`) ve `apps/mobile/tsconfig.json` ile birebir aynı. `packages/shared/tsconfig.json` bunu extend ediyor | Kök dizinde `npx tsc --noEmit` çalıştırınca yüzlerce `TS17004: Cannot use JSX` hatası veriyor (doğrulandı). Shared paketi, mobil uygulama için tasarlanmış bir config altında derleniyor | Düşük | 30 dk |
| M9 | `apps/mobile/package.json` | `lint` script'i yok, ESLint bağımlılığı yok, `.eslintrc`/`eslint.config` yok. `packages/shared` `lint` script'i: `echo "No lint configured yet"` | `turbo lint` mobil için hiçbir şey çalıştırmıyor. `react-hooks/exhaustive-deps`, `no-floating-promises` gibi bu raporda tespit edilen hata sınıflarını otomatik yakalayacak araç yok | Orta | 1 sa |
| M10 | `packages/shared/src/types/goal.ts:6-50` ↔ `apps/mobile/src/lib/api/types.ts:51-90` | Aynı alan iki kez modellenmiş: shared'da `Goal`/`Plan`/`DailyTask`, mobilde `GoalResponse`/`PlanResponse`/`DailyTaskResponse` | Shared'daki tip tanımları neredeyse kullanılmıyor — mobil sadece `LifeDomain`, `LIFE_DOMAINS`, `isCannedPlanStep`, `radius`, `space` alıyor. İki tanım birbirinden bağımsız sürükleniyor | Orta | 3 sa |
| M11 | `apps/api` — 20 `_test.go` dosyası | Testlerin tamamı şablon altyapısında (`shared/*`, `gateway/*`, `auth/*`, `tenant/*`). `internal/application/yuvmi/` ve `internal/domain/{goal,futureself,profile,asset,space}` için **sıfır test**. Mobilde de hiç test yok | Ürünün gerçek iş mantığı — hizalama skoru, plan versiyonlama, inci ekonomisi, paylaşım izinleri — hiç test edilmiyor | Yüksek | 3-5 gün |

---

## 2. State yönetimi — gereksiz re-render, prop drilling, senkronizasyon

| # | Dosya:satır | Sorun | Neden önemli | Önem | Efor |
|---|---|---|---|---|---|
| S1 | `src/components/AppEffects.tsx:9` + `app/check-in.tsx:15` | `useOfflineQueue` iki ayrı yerde çağrılıyor → iki bağımsız 30 sn'lik `setInterval` (`useOfflineQueue.ts:167`). `flushingRef` hook örneği başına olduğu için (satır 97) iki örnek birbirini engellemiyor | Check-in ekranı açıkken iki flush aynı kuyruğu paralel işler. İkisi de aynı `upsertCheckin`/`completeTask` çağrısını yapar; ardından `saveQueue(remaining)` (satır 152) diğerinin sonucunu ezer | Yüksek | 1-2 sa |
| S2 | `useOfflineQueue.ts:104-123` ↔ `174-188` | `enqueue` (hook içi) ve `enqueueOfflineItem` (modül seviyesi) aynı mantığın iki kopyası. Modül versiyonu `refreshCount()` çağırmıyor | Modül fonksiyonuyla kuyruğa eklenen öğe sayacı güncellemez; kullanıcı "bekleyen" göstergesinde görmez | Orta | 1 sa |
| S3 | `src/context/AuthContext.tsx:106-113`, `src/context/ModeContext.tsx:26-45` | `setUser`/`setPrefs` güncelleyicisinin **içinde** yan etki: `void persistSession(next)` ve `void savePrefs(merged)` | React güncelleyiciyi iki kez çağırabilir (StrictMode, eşzamanlı render). O zaman iki kez diske yazılır. `focus.tsx` versiyonunda bu çift inci ödülüne dönüşüyor (bkz. S10) | Orta | 1 sa |
| S4 | `ModeContext.tsx:26-45` | `patchPrefs` `async` imzalı ama içinde `await` yok; asıl yazma `void savePrefs(...)` ile ateşlenip unutuluyor | `await patchPrefs({ energy: lvl })` (ör. `(tabs)/index.tsx:304`) yazma bitmeden döner. Hemen sonra ekran kapanırsa tercih kaydedilmemiş olabilir | Orta | 30 dk |
| S5 | `AuthContext.tsx:286-292` ve `:306-320` | `refreshProfile` bağımlılığı `[user]` — kullanıcı nesnesinin her değişiminde yeniden üretiliyor, o da `useMemo`'daki `value`'yu tazeliyor | `AuthContext` tüketicisi olan her ekran, token yenilenmesi gibi ilgisiz bir değişimde de yeniden render oluyor. `user?.token`'a daraltmak yeterli | Orta | 1 sa |
| S6 | `app/(tabs)/index.tsx:272-442` | `handleDeleteIntention`, `handleAddMoodForDay`, `handlePick`, `handleMood`, `saveNote`, `drawCard` bileşen gövdesinde düz `async function` olarak tanımlı ve çocuklara prop geçiliyor (`MoodGrid` :526, `IntentionCard` :645) | Her render'da yeni referans; `MoodGrid` (152 satır, 30 hücre) ve `IntentionCard` memoize edilemez. 952 satırlık ekranın tamamı her state değişiminde yeniden hesaplanıyor | Orta | 2 sa |
| S7 | `AuthContext.tsx:301-304` | `signOut` yalnızca `clearStoredSession()` çağırıyor. `src/lib/local.ts`'teki 12 AsyncStorage anahtarı (`yuvmi.mood-history`, `yuvmi.vision-board`, `yuvmi.letter`, `yuvmi.area-notes`, `yuvmi.prefs`, …) ve `yuvmi_offline_queue` cihazda kalıyor | **Kullanıcı A çıkış yapıp kullanıcı B giriş yaptığında, B; A'nın ruh hâli geçmişini, vizyon panosunu, gelecek mektubunu ve alan notlarını görür.** Ayrıca A'nın kuyrukta bekleyen check-in'i B'nin token'ıyla gönderilir | **Kritik** | 1 sa |
| S8 | `src/hooks/useSubscription.ts:32-34` + `src/components/premium/PremiumGate.tsx:15` | Her `PremiumGate` ve her ekran kendi `useSubscription`'ını mount ediyor; paylaşılan önbellek yok | Bir ekranda üç `PremiumGate` varsa `/api/v1/subscription` üç kez çağrılır. Yanıtlar farklı zamanlarda gelirse gate'ler tutarsız açılıp kapanır | Orta | 1-2 sa |
| S9 | `src/lib/local.ts:99-103, 109-116, 139-143` | Oku-değiştir-yaz kalıbı kilitsiz: `loadMoodHistory()` → `all[date] = level` → `writeJson(...)` | İki eşzamanlı çağrı (ör. `handleAddMoodForDay` + `handleMood`, `index.tsx:290-301`'de arka arkaya tetikleniyor) birbirinin yazımını kaybettirir | Orta | 2 sa |
| S10 | `app/atolye/focus.tsx:57-73` | `setLeft` güncelleyicisinin içinde `setLastFind`, `setFinds`, `setPhase` ve `void patchPrefs({ tohum: tohum + 3 })`. `tohum` (satır 27) `start()` anındaki closure'dan geliyor | 25 dakikalık sayaç boyunca inci bakiyesi başka yerden değiştiyse bu yazma onu ezer. Güncelleyici iki kez çalışırsa 3 yerine 6 inci verilir | Yüksek | 1 sa |

---

## 3. Performans — liste render'ları, görsel, bundle, soğuk açılış

| # | Dosya:satır | Sorun | Neden önemli | Önem | Efor |
|---|---|---|---|---|---|
| P1 | Tüm uygulama — `FlatList`/`FlashList` kullanımı: **0** | Her liste `.map()` ile `ScrollView` içinde render ediliyor: `archive.tsx:121` (varlıklar + görseller), `atolye/notifications.tsx`, `spaces/[id].tsx:94`, `plan-history.tsx`, `vision/affirmations.tsx`, `notifications.tsx` | Sanallaştırma yok — 200 varlıklı bir arşiv 200 `<Image>` bileşenini aynı anda mount eder. Liste büyüdükçe kaydırma donar ve bellek doğrusal artar | Yüksek | 3-4 sa |
| P2 | `app/(tabs)/index.tsx:465-732` | Yatay pager'daki üç panel (`İstatistik`, `Plan`, `Hâl`) koşulsuz render ediliyor; tembel yükleme yok | Uygulamanın açılış sekmesi; kullanıcı hiç kaydırmasa bile 30 günlük mood grid'i iki kez (satır 526 ve 725), ritim şeridi, tüm niyet kartları ve ses kartı birlikte mount ediliyor | Orta | 2 sa |
| P3 | `src/hooks/useTodayDashboard.ts:47-57` + `app/(tabs)/index.tsx:165-186` | `useFocusEffect` her odaklanmada `refresh()` çağırıyor; `refresh` 8 paralel API isteği atıyor. Ayrıca `loadRituals`, `loadDailyCard`, `loadDeck` da her odakta | Modal'dan (`check-in`, `task/[id]`) her dönüşte 8 istek. Throttle veya `staleTime` yok. Ayrıca `setLoading(true)` (satır 44) her seferinde tam ekran yükleme titremesi yaratıyor | Yüksek | 2 sa |
| P4 | `apps/api/internal/infrastructure/postgres/goal/goal_repository.go:183-205` | `ListByUserID` her plan için ayrı `attachSteps` sorgusu atıyor (N+1). Üstelik dış `rows` hâlâ açıkken, aynı havuzdan ikinci bağlantı isteyerek | 12 planı olan kullanıcı için 13 sorgu. `fetchPlans` hem Bugün (`useTodayDashboard.ts:56`) hem Profil (`profile.tsx:62`) ekranında çağrılıyor. Havuz doluluğunda kilitlenme riski | Yüksek | 1 sa |
| P5 | `app/atolye/focus.tsx:50-55` | 25 dakikalık (`total * 1000` ms) `Animated.timing`, `useNativeDriver: false` ile layout `top` değerini interpole ediyor | Animasyon JS thread'inde 25 dakika boyunca kare kare köprüden geçiyor. `transform: translateY` + native driver'a taşınmalı | Orta | 30 dk |
| P6 | `src/components/today/SwipeableCard.tsx:19,27,36` | Sürükleme animasyonu `useNativeDriver: false` | Her parmak hareketi JS thread'ine gidiyor; yatay pager içinde ayrıca jest çakışması var | Düşük | 30 dk |
| P7 | `app/archive.tsx:126-132`, `app/asset/[id].tsx:109`, `app/spaces/[id].tsx:94` | React Native `<Image>` + `Authorization` header ile uzak görsel; `expo-image` kullanılmıyor | Disk önbelleği/downsampling kontrolü yok; ekrana her dönüşte tam çözünürlüklü indirme. Backend `Cache-Control: private, max-age=3600` gönderiyor (`handler.go:762`) ama RN Image bunu güvenilir kullanmıyor | Orta | 1-2 sa |
| P8 | `app/_layout.tsx:12-16` | Font yüklenene kadar boş `View` dönülüyor; `expo-splash-screen` / `preventAutoHideAsync` yok | Soğuk açılışta kullanıcı boş mavi ekran görüyor — süresi cihaza göre değişir, geri bildirim yok | Orta | 30 dk |
| P9 | `apps/mobile/assets/icon.png` | 393 KB (klasör toplamı 524 KB'ın %75'i) | Optimize edilirse ~40 KB'a iner | Düşük | 15 dk |
| P10 | `apps/web/src/app/manifesto/lab.css` | 5387 satırlık tek CSS dosyası | Manifesto sayfası bu CSS'in tamamını yüklüyor; kritik CSS ayrımı yok | Düşük | 2 sa |

---

## 4. Hata yönetimi — try/catch, yutulan hatalar, offline davranışı

| # | Dosya:satır | Sorun | Neden önemli | Önem | Efor |
|---|---|---|---|---|---|
| E12 | `apps/api/internal/shared/config/config.go:185` + `cmd/server/main.go` (JWT kontrolü) | `JWT_SECRET` varsayılanı `"change-me-in-production"`. `main.go` bunu yalnızca `log.Warn` ile geçiyor, çalışmaya devam ediyor | Env değişkeni unutulursa **herkes bu repodaki string'le geçerli token üretebilir**. Ayrıca `DB_SSLMODE` varsayılanı `disable` (satır 174), `DB_PASSWORD` varsayılanı `yuvmi` (satır 172). Config'de hiçbir `Validate()` yok | **Kritik** | 30 dk |
| E13 | `router.go:92-101` | `/auth/register`, `/auth/login`, `/auth/oauth`, `/auth/forgot-password`, `/auth/reset-password` üzerinde rate limit yok. `internal/shared/middleware/` içinde rate limit middleware'i hiç bulunmuyor — sadece gateway pipeline'ında var ve o da Yuvmi grubuna (satır 109) uygulanmıyor | Parola deneme saldırısı, hesap sayımı ve `forgot-password` üzerinden e-posta bombardımanı serbest | **Kritik** | 2-3 sa |
| E1 | `src/lib/api/client.ts:87-96` ve `:150-162` | `fetch` çağrılarında `AbortController`/timeout yok | Zayıf bağlantıda istek süresiz asılı kalır; `loading` state hiç kapanmaz, kullanıcı sonsuz spinner görür. Mobilde en sık görülen "uygulama dondu" şikâyeti bu | Yüksek | 1 sa |
| E2 | `client.ts:108-129` | 401 alan her istek bağımsız olarak `refreshAuthToken` çağırıyor; tekilleştirme (single-flight) yok | `useTodayDashboard` 8 isteği paralel atıyor (`useTodayDashboard.ts:47`). Token süresi dolmuşsa 8'i birden yenileme dener. Backend refresh token rotasyonu yapıyorsa ilk yenileme diğer 7'yi geçersizler → **kullanıcı Bugün sekmesini açtığında oturumdan atılır** | Yüksek | 2 sa |
| E3 | `app/check-in.tsx:35-39` + `src/hooks/useOfflineQueue.ts:81-83` | `catch` her hatayı offline sayıp kuyruğa atıyor ve "Çevrimdışı kaydedildi" diyor. Kuyruk yalnızca 404/409'u kalıcı hata sayıp düşürüyor | 400 (doğrulama) veya 403 alan bir check-in sonsuza kadar kuyrukta kalır, 30 saniyede bir tekrar denenir. Kullanıcı verinin gönderildiğini sanır. `ApiError.code === 0` (ağ hatası) kontrolü yapılmalı | Yüksek | 1 sa |
| E4 | `app/(tabs)/index.tsx:363-364` ve `:380-382` | `handleMood` ve `saveNote` içinde `catch { /* ignore */ }` | Kullanıcının ruh hâli seçimi ve günlük notu sunucuya gitmezse hiçbir uyarı yok — UI başarılıymış gibi davranıyor. Sessiz veri kaybı | Yüksek | 1 sa |
| E6 | `apps/api/internal/infrastructure/postgres/**` | 31 adet `rows.Next()` döngüsü, yalnızca 2 adet `rows.Err()` kontrolü | Sorgu ortasında bağlantı koparsa döngü sessizce biter ve **kısmi liste hatasız döner**. Kullanıcı planlarının/varlıklarının bir kısmını görür, hata mesajı almaz | Yüksek | 2 sa |
| E7 | `usecase/service.go:340, 358, 435` | `_, _ = s.engine.Recalculate(ctx, userID, todayUTC())` üç yerde | Hizalama skoru ürünün ana metriği. Hesaplama başarısız olursa kimse bilmiyor; skor sessizce donuyor | Yüksek | 1 sa |
| E9 | `usecase/faz3_assets.go:115, 130, 143` | `_ = s.assets.RevokePermissionsForAsset(...)` ve `_ = s.assets.UpsertPermission(...)` | `ShareAsset` görünürlüğü daraltırken önce revoke edip sonra yeniden veriyor. Revoke sessizce başarısız olursa **önceki paylaşımdan kalan kişi erişimini korur, ama arayüz "yalnızca sen" der.** Ters yönde: grant başarısız olursa sahibi paylaştığını sanır, karşı taraf göremez | Yüksek | 1-2 sa |
| E11 | `usecase/service.go:289-314` | `ActivatePlan` sırayla `SupersedeOthers` → `Activate` → `tasks.Create` → `goals.Activate` → `SetOnboardingComplete` çağırıyor; **transaction yok** | Ortada bir adım patlarsa: eski planlar superseded, yeni plan active, ama günlük görev yok ve onboarding tamamlanmamış. Kullanıcı arada kalır. `firstStepForDay` fallback'i (satır 473-483) bu durumu maskeler | Yüksek | 2 sa |
| E16 | `app/_layout.tsx` | Uygulamada hiç Error Boundary yok | Herhangi bir render hatası tüm uygulamayı beyaz ekrana düşürür; kurtarma yolu yok | Yüksek | 1-2 sa |
| E5 | `app/archive.tsx:39-41` | `catch { setAssets([]) }` | Ağ hatasında kullanıcı "Arşiv boş — Vizyon kartları, PDF'ler veya fotoğraflarını buraya ekle" mesajı görüyor. **Verisinin silindiğini düşünebilir.** Aynı kalıp `(onboarding)/future-self.tsx:44` ve `vision/affirmations.tsx:36`'da da var | Orta | 30 dk |
| E8 | `usecase/service.go:133` | `if existing, _ := s.futureSelf.GetByUserID(ctx, userID); existing != nil` — hata yok sayılıyor | DB geçici hata verirse "kayıt yok" kabul edilip ikinci bir future-self oluşturulur | Orta | 15 dk |
| E10 | `goal_repository.go:77-79` ve `:170-172` | `if err != nil \|\| tag.RowsAffected() == 0 { return ErrNotFound }` | Gerçek bir veritabanı hatası istemciye 404 olarak dönüyor. Mobil taraf "hedef bulunamadı" gösterir, log'da sebep kaybolur | Orta | 30 dk |
| E14 | `src/hooks/usePushNotifications.ts:18,43,44-46` | `registered.current` bir kez `true` olunca sıfırlanmıyor; hata `.catch(() => {})` ile yutuluyor. Ayrıca `getExpoPushTokenAsync()` `projectId` olmadan çağrılıyor ve `app.json`'da `extra.eas.projectId` yok | Kullanıcı çıkış yapıp başka hesapla girerse push token yeni kullanıcıya kaydedilmez — **bildirimler eski hesaba gitmeye devam eder.** EAS build'de `projectId` olmadan bu çağrı hata verir ve sessizce yutulur | Orta | 1 sa |
| E15 | `src/lib/fonts.ts:11-21` + `app/_layout.tsx:12` | `useFonts` `[loaded, error]` döndürüyor; `error` atılıyor. `_layout` `loaded` false iken sonsuza kadar boş view gösteriyor | Font yükleme hatası **kalıcı boş ekrana** dönüşür, kurtarma yolu yok | Orta | 30 dk |
| E18 | `router.go:312-318` ve `:325-340` | Bilinmeyen `/api/v1/*` yolları için 404 gövdesi: `"Define the endpoint first using POST /api/v1/organizations/{orgId}/apps/{appId}/endpoints"` | Kimliksiz çağrılara iç API yönetim mimarisi sızdırılıyor. İki blok ayrıca birbirinin neredeyse kopyası | Orta | 15 dk |
| E17 | `client.ts:92-95` ve `:158-161` | Kullanıcıya gösterilen hata metni: `"API'ye ulaşılamadı (http://192.168.x.x:8080). Backend çalışıyor mu?"` | Son kullanıcıya iç ağ adresi ve geliştirici sorusu gösteriliyor | Düşük | 15 dk |

---

## 5. Bellek/kaynak sızıntıları

| # | Dosya:satır | Sorun | Neden önemli | Önem | Efor |
|---|---|---|---|---|---|
| L1 | `app/(tabs)/yuvmi.tsx:79-92` | `setTimeout(..., 3500)` hiçbir yerde temizlenmiyor; ref'e de atanmıyor | "Kayıt" sırasında ekrandan çıkılırsa timer unmount sonrası `setMsgs` çağırır | Orta | 15 dk |
| L2 | `app/(tabs)/index.tsx:430-433` | `setTimeout(() => setVoicePhase("prop"), 1600)` temizlenmiyor | Aynı sorun; ayrıca ekran her odaklandığında yeni timer birikir | Orta | 15 dk |
| L3 | `app/atolye/focus.tsx:37-41` | Unmount cleanup yalnızca `clearInterval` yapıyor; `diverPos.stopAnimation()` çağrılmıyor (bu sadece `surface()`/`resetTimer()`'da var) | 25 dakikalık `Animated.timing` ekran kapandıktan sonra da çalışmaya devam eder | Düşük | 15 dk |
| L4 | `src/hooks/useOfflineQueue.ts:164-169` | 30 saniyelik interval uygulama arka plandayken de dönüyor; `AppState` dinleyicisi yok, ağ durumu kontrolü yok (`@react-native-community/netinfo` bağımlılıkta yok) | Bataryayı boşuna tüketir; çevrimdışıyken 30 saniyede bir başarısız istek denemesi yapar. Ayrıca öne gelince anında flush olmuyor | Orta | 1 sa |
| L5 | `app/(tabs)/profile.tsx:57-75` | 5 paralel istek sonrası 5 `setState`; `mounted` guard'ı yok | Ekran hızlı kapatılırsa unmount sonrası state güncellemesi | Düşük | 30 dk |
| L6 | `src/context/AuthContext.tsx:144-148` | Refresh yolunda `await`'ten sonra `setUser(next)` çağrılıyor; `mounted` kontrolü yalnızca satır 127'de | Aynı sınıf sorun, açılış akışında | Düşük | 15 dk |

**Temiz olanlar:** `atolye/breath.tsx`, `atolye/candle.tsx`, `(tabs)/index.tsx:230-234` (urge interval) düzgün temizleniyor. Web'de `LabScene3D.tsx:331-336` `cancelAnimationFrame` + `dispose()` + `removeEventListener` ile doğru kapatılmış.

---

## 6. Ölü kod, kopyala-yapıştır, kullanılmayan bağımlılıklar

| # | Dosya:satır | Sorun | Neden önemli | Önem | Efor |
|---|---|---|---|---|---|
| D1 | `app/(tabs)/profile.tsx:160, 190, 207, 219` + `src/lib/local.ts:51-61` | `survivalMode`, `quietWeek`, `darkMode`, `appLock`, `morningReminder`, `eveningReminder` — hepsi yalnızca profil ekranında okunup yazılıyor. Kod tabanında başka **hiçbir yerde** okunmuyorlar (doğrulandı: grep tüm `app/` + `src/`) | **Altı ayar anahtarı hiçbir şey yapmıyor.** "Uygulama kilidi" varsayılan olarak açık görünüyor ama kilit yok — bu bir güvenlik vaadi. "Sessiz hafta açıkken bildirim gelmez" yazıyor (satır 198), gelir. "Karanlık mod" açılır, tema değişmez | Yüksek | 2 sa |
| D2 | `profile.tsx:227-228` | `<Kv label="Ana ekran widget'ı" value="açık" />` ve `<Kv label="Dil" value="Türkçe" />` sabit metin | Widget yok; dil seçimi yok | Orta | 15 dk |
| D3 | `profile.tsx:245-254` | "Yardım ve geri bildirim" → `alert("...yakında burada olacak.")`; "Gizlilik politikası" → `alert("Verilerin varsayılan olarak özeldir.")` | App Store ve Play Store gerçek bir gizlilik politikası URL'si zorunlu tutuyor. Bu hâliyle inceleme geçmez | Yüksek | 2-4 sa |
| D4 | `app/(tabs)/yuvmi.tsx:22-37, 63-94` | Yuvmi YZ sekmesinin tamamı sahte: `REPLIES` sabit sözlüğü + `setTimeout(3500)` ile uydurulmuş ses kaydı transkripti. Yanıt metni "Sabah yürüyüşünü ve iş sunumunu **tamamlandı olarak işaretledim**" diyor — hiçbir görev işaretlenmiyor | Sayfa "Önizleme" etiketli (satır 100) ve dipnot var (satır 163-165), bu hafifletiyor. Ama ses kartı "Yuvmi, işaretlerini düzenler" (satır 109) diyerek çalışan bir özellik vaat ediyor | Yüksek | 1 sa (dürüst etiketleme) |
| D5 | `app/(tabs)/index.tsx:430-442, 670-696` | Aynı sahte ses akışı Bugün sekmesinde ikinci kez uygulanmış; satır 678-681'de sabit transkript | Aynı sahte özelliğin iki kopyası; `applyVoice()` (satır 435-442) gerçekten görev tamamlıyor ve ruh hâli yazıyor — yani sahte "dinleme" gerçek veri yazıyor | Yüksek | 1 sa |
| D6 | `app/atolye/focus.tsx:32` | `useState<string[]>(["🐚 Deniz kabuğu", "🪸 Mercan", "🔑 Paslı anahtar"])` | Kullanıcı hiç dalış yapmadan üç "buluntu"su varmış gibi görünüyor | Orta | 15 dk |
| D7 | `apps/web/src/app/page.tsx:227-238` | `<form>` etiketinde `onSubmit` ve `action` yok | Varsayılan tarayıcı davranışı devreye girer: **e-posta adresi sorgu parametresi olarak URL'ye yazılır**, sayfa yeniden yüklenir, adres hiçbir yere kaydedilmez. PII tarayıcı geçmişine ve sunucu log'larına düşer | Yüksek | 1-2 sa |
| D8 | `apps/web/src/components/manifesto/variants/LabCloseVisual.tsx:71-88` | Bekleme listesi e-postası yalnızca `localStorage.setItem("yuvmi-waitlist-email", ...)` ile saklanıp `setPhase("success")` çağrılıyor | Kullanıcı bekleme listesine katıldığını görüyor; e-posta cihazdan hiç çıkmıyor | Yüksek | 1-2 sa |
| D9 | `src/theme/index.ts:43-52` | `brand.rose`, `brand.teal`, `roseText`, `tealText`, `roseDeep`, `tealDeep`, `roseBtn`, `tealBtn` — sekizi de mavi tonlarına eşlenmiş. Ayrıca `accent`=`blue`, `paper`=`mist`, `surface.base`=`mist`, `inkMuted`=`ink40`, `destructive`=`danger` | Rebrand sonrası kalıntı. `brand.rose` okuyan biri pembe bekler, mavi alır. Beş çift eşdeğer token | Orta | 1-2 sa |
| D10 | `app/(tabs)/index.tsx:881` | `bsmYOff` stili tanımlı, hiç kullanılmıyor | Ölü stil | Düşük | 5 dk |
| D11 | `apps/api/internal/infrastructure/postgres/iam/user_repository.go:229-241` | `nullIfEmpty` ve `nullIfEmptyHash` gövdeleri birebir aynı | Kopyala-yapıştır | Düşük | 5 dk |
| D12 | `apps/api/internal/infrastructure/http/handler/yuvmi/handler.go` (953 satır) | ~50 handler aynı 4 satırlık kalıbı tekrarlıyor: userID al → decode → svc çağır → yanıtla. Üstelik **iki farklı kalıp**: `GetMe`/`UpdateMe` (satır 26-30) `middleware.UserIDFromContext` + elle kontrol, geri kalanı `mustUserID` (satır 59-62) | Yeni uç eklerken hangi kalıbın kullanılacağı belirsiz; `mustUserID`'nin `uuid.Nil` sentinel'i unutulursa yetkisiz erişim doğar | Orta | 3-4 sa |
| D13 | `app/(tabs)/atolye.tsx:152`, `app/atolye/focus.tsx:411`, `app/vision/letter.tsx:746` | `balance`/`balanceText` stili ve `🫧 {tohum}` bileşeni üç yerde kopyalanmış | Ortak bir `PearlBalance` bileşeni yok | Düşük | 1 sa |
| D14 | `apps/mobile/package.json` | `expo-linear-gradient` — kod tabanında **0 kullanım**. `expo-crypto` ve `expo-linking` de doğrudan 0 kullanım (*doğrulanmalı* — `expo-auth-session`/`expo-router` dolaylı gerektiriyor olabilir) | Gereksiz native modül, build süresi ve paket boyutu | Düşük | 30 dk |
| D15 | 80 ayrı `StyleSheet.create` bloğu | Glass/kart/rozet kalıpları ekranlar arasında kopyalanmış; `(tabs)/index.tsx`'te 205 satır stil tanımı var | Tasarım değişikliği 80 dosyaya dokunmayı gerektiriyor | Orta | 1-2 gün |

---

## 7. Erişilebilirlik

| # | Dosya:satır | Sorun | Neden önemli | Önem | Efor |
|---|---|---|---|---|---|
| A1 | Tüm `apps/mobile` | **274** `Pressable`/`TouchableOpacity` örneğine karşılık erişilebilirlik özelliği içeren yalnızca **7 dosya, 9 özellik** (`Button.tsx`, `Switch.tsx`, `GlassTabBar.tsx`, `SubpageBar.tsx`, `MoodGrid.tsx`, `AccordionStat.tsx`, `FutureSelfExpandableCard.tsx`) | Ekran okuyucu kullanıcısı için uygulamanın büyük bölümü isimsiz düğmelerden oluşuyor. `(tabs)/index.tsx`'in 952 satırında tek bir `accessibilityLabel` yok | Yüksek | 1-2 gün |
| A2 | `app/(tabs)/index.tsx:901-909` (`pk`, ~35pt), `:801-809` (`mo`, ~39pt), `app/(tabs)/yuvmi.tsx:227-232` (`chip`, ~30pt) | Dokunma hedefleri Apple'ın 44pt / Android'in 48dp minimumunun altında | Enerji seçici ve ruh hâli düğmeleri günlük kullanılan ana etkileşimler; motor becerisi kısıtlı kullanıcılar için isabet zor. `Button.tsx:59` `minHeight: 48` ile doğru yapılmış — kalıp mevcut, uygulanmamış | Orta | 2-3 sa |
| A3 | `src/theme/index.ts:11` (`ink40 = rgba(11,18,32,0.40)`) | `mist` (#E7ECF9) zemin üzerinde efektif kontrast ≈ **2.6:1** — WCAG AA'nın 4.5:1 eşiğinin altında. Gövde metninde kullanılıyor: `index.tsx:799` (`offtrackText`), `profile.tsx:359-364` (`hint`), `yuvmi.tsx:261-268` (`note`), tüm `placeholderTextColor` değerleri | Açıklama ve ipucu metinleri — yani kullanıcıya "ritmin bozulmadı" diyen sakinleştirici metinlerin çoğu — okunması en zor metinler | Orta | 2 sa |
| A4 | `src/components/today/SwipeableCard.tsx` + `app/(tabs)/index.tsx:636` | Niyet silme yalnızca kaydırma jestiyle yapılabiliyor; onay diyaloğu yok, geri alma yok, erişilebilir alternatif yok | Ekran okuyucu kullanıcısı niyet silemez. Yatay pager içinde (satır 465-473) jest çakışması var — kazara kaydırma planı kalıcı siler ve `revisePlan` yeni sürüm oluşturur | Yüksek | 2-3 sa |
| A5 | `app.json:8` + `app/_layout.tsx:23` | `userInterfaceStyle: "automatic"` ilan edilmiş ama tema tek (açık) ve `StatusBar style="dark"` sabit | Sistemi karanlık moda almış kullanıcı açık temayla karşılaşıyor; durum çubuğu bazı ekranlarda okunmaz olabilir | Orta | 30 dk (`"light"` yapmak) |
| A6 | Tüm asenkron ekranlar | `accessibilityLiveRegion` / `AccessibilityInfo.announceForAccessibility` kullanımı yok | "Kaydedildi", "Çevrimdışı kaydedildi" gibi durum değişiklikleri ekran okuyucuya duyurulmuyor | Düşük | 2 sa |

**Web tarafı iyi:** `apps/web` `aria-label`, `aria-current`, `aria-hidden`, `prefers-reduced-motion` (`lab.css:5164`, `LabChrome.tsx:128`, `LabCloseVisual.tsx:40`) ve `lang="tr"` doğru kullanılmış.

---

## 8. Tip güvenliği

| # | Dosya:satır | Sorun | Neden önemli | Önem | Efor |
|---|---|---|---|---|---|
| T1 | `src/lib/api/types.ts:57` (`GoalResponse.status: string`), `:66` (`PlanResponse.status: string`) | Union yerine düz `string`. Oysa `packages/shared/src/types/goal.ts:3,19` doğru union'ları (`GoalStatus`, `PlanStatus`) zaten tanımlıyor | `app/(tabs)/index.tsx:260` `plans.filter((p) => p.status === "superseded")` — yazım hatası derleyiciden geçer, sayaç sessizce 0 kalır. Aynı risk `task.status === "completed"` (satır 250, 627-633) için de var | Orta | 1 sa |
| T2 | `src/lib/api/client.ts:135-139` ve `:192-195` | `if ("data" in payload) return payload.data as T` — hiçbir doğrulama yok | Backend şeması değişirse mobil taraf çalışma zamanında `undefined.map is not a function` ile patlar; TypeScript hiçbir koruma sağlamaz. Tüm API yüzeyinde geçerli | Orta | 1 gün (zod vb.) |
| T3 | `src/hooks/useOfflineQueue.ts:50` (`JSON.parse(raw) as OfflineQueueItem[]`), `:111` ve `:180` (`as OfflineQueueItem`) | Depolanmış kuyruk doğrulanmadan cast ediliyor; şema değişince eski kayıtlar tip iddiasını yalanlar | Uygulama güncellemesinden sonra eski formattaki kuyruk öğesi `item.payload.taskId` erişiminde patlar — hem de arka plandaki 30 sn'lik flush içinde | Orta | 1 sa |
| T4 | `src/lib/auth/session.ts:33` | `JSON.parse(raw) as AuthUser` | Bozuk/eski oturum verisi tip kontrolsüz geçiyor; `AuthUser.refreshToken` opsiyonel olduğu hâlde kod bazı yerlerde varlığını varsayıyor | Düşük | 30 dk |
| T5 | 7 tip kaçışı: `app/(tabs)/index.tsx:395`, `app/atolye/focus.tsx:104`, `app/vision/letter.tsx:355`, `app/vision/board.tsx:484`, `app/vision/letter.tsx:1185`, `src/components/today/SwipeableCard.tsx:69`, `src/lib/api/yuvmi.ts:393` | `as any` / `as unknown as Blob` / `StyleSheet.absoluteFill as any` | `router.push("/atolye/shop" as any)` — `app.json:30`'da `typedRoutes: true` açık olmasına rağmen tip üretimi kullanılmıyor. Yanlış rota adı derlemeden geçer | Düşük | 1 sa |
| T6 | `tsconfig.json` (kök) ↔ `packages/shared/tsconfig.json:2` | Shared paketi, Expo uygulaması için yazılmış kök config'i extend ediyor | Bkz. M8 | Düşük | 30 dk |
| T7 | `apps/mobile` — ESLint yok | `@typescript-eslint/no-floating-promises` ve `react-hooks/exhaustive-deps` çalışmıyor | Bu rapordaki E14, L1, L2, S5 sınıfı hataları statik analiz otomatik yakalardı. `archive.tsx:47` `load()` — `void` olmadan yüzen promise; kod tabanında benzerleri var | Orta | 1 sa |

---

## Bu hafta düzeltilmeli (sıralı)

| Sıra | Bulgu | Neden ilk | Efor |
|---|---|---|---|
| 1 | **E12** — `config.go:185` JWT secret varsayılanı + `main.go`'nun sadece uyarması | Tek satırlık env hatası tüm kimlik doğrulamayı çökertir. `Load()` sonrası bir `Validate()` ekleyip production'da fatal yap; `DB_SSLMODE=disable` ve `DB_PASSWORD=yuvmi` varsayılanlarını da aynı anda ele al | 30 dk |
| 2 | **S7** — `AuthContext.tsx:301-304` çıkışta yerel veri temizlenmiyor | Kullanıcı A'nın mektubu ve ruh hâli geçmişi kullanıcı B'ye görünüyor. Ortak cihazda gerçek gizlilik ihlali. `signOut`'a `local.ts` anahtarlarını ve `yuvmi_offline_queue`'yu temizleyen çağrı ekle | 1 sa |
| 3 | **E13** — `router.go:92-101` auth uçlarında rate limit yok | Parola deneme ve e-posta bombardımanı serbest. IP başına basit bir token-bucket middleware'i `internal/shared/middleware/` altına ekleyip auth grubuna uygula | 2-3 sa |
| 4 | **D1** — `profile.tsx` altı sahte ayar (özellikle "Uygulama kilidi") | Kullanıcıya çalışmayan bir güvenlik özelliği vaat ediliyor. En hızlı çözüm: bağlanana kadar hepsini "Yakında" rozetiyle devre dışı bırak | 2 sa |
| 5 | **E2** — `client.ts:108-129` paralel token yenileme | Bugün sekmesini açan kullanıcı oturumdan atılabiliyor. Modül seviyesinde tek bir `refreshPromise` tutup tüm 401'leri ona bağla | 2 sa |
| 6 | **E1** — `client.ts:87` fetch timeout yok | Zayıf bağlantıda sonsuz spinner. `AbortController` + 15 sn timeout, `ApiError(code 0)` ile dön | 1 sa |
| 7 | **E4 + E3** — `index.tsx:363,380` sessiz kayıt hatası ve `check-in.tsx:35` yanlış offline kuyruklama | İkisi birlikte "veri kaydedildi sanılıyor ama kaydedilmedi" sınıfını oluşturuyor. `ApiError.code === 0` ayrımı yap, kalan hatalarda kullanıcıya söyle | 2 sa |
| 8 | **S1** — çift `useOfflineQueue` örneği ve çift interval | Aynı check-in iki kez gönderilebiliyor. Kuyruğu tek bir provider'a taşı veya `flushingRef`'i modül seviyesine çıkar | 1-2 sa |
| 9 | **E6** — 31 tarama döngüsünde 2 `rows.Err()` | Sessiz kısmi veri. Mekanik düzeltme, düşük risk, yüksek getiri | 2 sa |
| 10 | **E11** — `service.go:289-314` `ActivatePlan` transaction'sız | Onboarding'in son adımı; yarım kalırsa kullanıcı uygulamaya giremez. Repository'lere `tx` geçirecek şekilde imzayı genişlet | 2 sa |

---

## Yayından önce düzeltilmeli

**Store incelemesini geçmek için zorunlu**

- **D3** — `profile.tsx:245-254`: gerçek gizlilik politikası ve destek/iletişim yolu. Alert placeholder'ı ile inceleme geçilmez.
- **`app.json:16`** — `usesCleartextTraffic: true` kaldırılmalı. `src/lib/api/config.ts:50`'deki `http://localhost:8080` fallback'i production build'de `EXPO_PUBLIC_API_URL` yoksa devreye giriyor; HTTPS zorunlu hâle getirilip fallback kaldırılmalı.
- **`app.json:22-28`** — `expo-image-picker` ve `expo-document-picker` config plugin listesinde yok; iOS izin metinleri (`NSPhotoLibraryUsageDescription`) üretilmiyor. `archive.tsx:52` galeri açtığında iOS'ta reddedilir veya çöker.
- **`app.json`** — `icon`, `splash` ve `android.adaptiveIcon.foregroundImage` tanımlı değil; `assets/icon.png` ve `splash-icon.png` mevcut ama bağlanmamış. Uygulama varsayılan Expo ikonuyla çıkar.
- **`app.json`** — `extra.eas.projectId` yok; `usePushNotifications.ts:41` EAS build'de hata verir (E14).
- **`profile.tsx:93-100`** — "Verilerimi dışa aktar" yalnızca dosya adını alert'te gösteriyor; indirme/paylaşma yok. KVKK veri taşınabilirliği açısından işlevsiz.
- **`settings/delete-account.tsx`** — mevcut, akış uçtan uca doğrulanmalı (Apple hesap silme zorunluluğu).

**Kullanıcıyı yanıltan içerik**

- **D4 + D5** — `(tabs)/yuvmi.tsx` ve `(tabs)/index.tsx:670-696`: sahte YZ asistanı ve sahte ses kaydı. Ya gerçek bir backend'e bağla (bunun için mimari: mobil → JWT → kendi backend'in → LLM sağlayıcısı; API anahtarı asla uygulamaya gömülmez) ya da "demo" olduğunu düğmenin üstünde açıkça yaz. Şu hâliyle "tamamlandı olarak işaretledim" diyen bir mesaj hiçbir şey işaretlemiyor.
- **D6** — `focus.tsx:32` sahte buluntu geçmişi.
- **D7 + D8** — web'deki iki e-posta formu. `page.tsx:227` PII'yı URL'ye yazıyor, `LabCloseVisual.tsx:82` başarı gösterip e-postayı `localStorage`'da bırakıyor. Ya gerçek bir uca bağla ya formu kaldır.

**Sağlamlık ve gizlilik**

- **E16** — Error Boundary (`app/_layout.tsx`). Tek render hatası tüm uygulamayı beyaz ekrana düşürüyor.
- **E15** — `fonts.ts` hata durumunda kalıcı boş ekran.
- **E9** — `faz3_assets.go:115,130` paylaşım izni geri alma hataları sessiz; eski erişim kalabiliyor.
- **M5** — `/metrics` ucunu kapat veya iç ağa al.
- **M4** — kullanılmayan tenant/org/gateway/audit/websocket rota ağacını kaldır ya da derleme dışı bırak. `maybeRequirePermission` (`router.go:32-37`) RBAC nil ise izni tamamen atlıyor.
- **E18** — 404 gövdesindeki iç mimari bilgisini temizle.
- **P1** — en azından `archive.tsx` ve bildirim listelerini `FlatList`'e taşı.
- **A1–A4** — erişilebilirlik taban seviyesi: ana akıştaki (Bugün, Yolculuk, Profil) düğmelere `accessibilityLabel`/`accessibilityRole`, dokunma hedeflerini 44pt'ye çıkar, `ink40` gövde metinlerini `ink70`'e taşı, kaydırarak silmeye onay ve erişilebilir alternatif ekle.
- **M11** — en azından hizalama motoru, plan versiyonlama ve inci ekonomisi için Go testleri.

---

## Sonra bakılır

- **M1, M2, M3** — application katmanının infrastructure bağımlılığını arayüz arkasına al; `NewService`'i bir `Deps` struct'ına çevir; `faz*.go` dosyalarını alan adlarına göre böl.
- **M7** — oturumu bilen bir API istemcisi; `token` parametresini 60 fonksiyondan kaldır.
- **M10 + T1** — tek tip kaynağı: shared'daki `Goal`/`Plan`/`DailyTask` union'larını mobil `*Response` tiplerine bağla.
- **D12** — Go handler'larındaki 50 tekrarlı bloğu jenerik bir yardımcıya indir; `mustUserID` ile `UserIDFromContext` ikiliğini tekleştir.
- **S3, S4, S5, S6, S9** — state güncelleyicilerinden yan etkileri çıkar, `patchPrefs`'i gerçekten await edilebilir yap, context memo bağımlılıklarını daralt, handler'ları `useCallback`'e al, `local.ts`'e yazma sırası (mutex) ekle.
- **S8** — abonelik durumunu tek bir context'e taşı.
- **P2, P3** — pager panellerini tembel yükle, `useFocusEffect` refresh'ine throttle ekle.
- **P4** — `ListByUserID` N+1'ini tek `JOIN`'e indir.
- **P5, P6** — animasyonları native driver'a taşı.
- **P7** — `expo-image`'e geç.
- **P8** — `expo-splash-screen` ekle.
- **D9** — `theme` içindeki rose/teal kalıntılarını ve eşdeğer token çiftlerini temizle.
- **D13, D15** — `PearlBalance` bileşeni; ekran stillerini ortak `ui/` kalıplarına çek.
- **D14** — `expo-linear-gradient`'i kaldır; `expo-crypto`/`expo-linking` gerçekten gerekli mi doğrula.
- **M8, T6** — kök `tsconfig.json`'ı monorepo tabanına çevir, shared'ı ondan ayır.
- **M9, T7** — mobile ESLint kur (`expo lint` + `react-hooks` + `@typescript-eslint`), `turbo lint` gerçekten çalışsın.
- **T2, T3, T4** — API yanıtları ve depolanmış veri için runtime doğrulama (zod).
- **T5** — `typedRoutes` üretimini devreye alıp `as any` rota cast'lerini kaldır.
- **L5, L6** — mounted guard'ları.
- **A5** — `userInterfaceStyle: "light"` veya gerçek karanlık tema.
- **A6** — asenkron durum duyuruları.
- **P9, P10** — ikon optimizasyonu, `lab.css` bölme.
- **E5, E8, E10, E17** — yanıltıcı boş durumlar, yutulan `existing, _`, 404'e eşlenen DB hataları, kullanıcıya sızan geliştirici metni.
- **`local.ts:220-226`** — `moodFromCheckin`'de `if (mood <= 2) return 2; if (mood <= 3) return 2;` — ikinci dal ilkinden ayırt edilemez, mood 3 için ayrı bir seviye tanımlanmış gibi duruyor ama değil. *Kasıtlı mı doğrulanmalı.*
- **`.tmp-masterfabric-go/`** — 1.5 MB'lık şablon kopyası çalışma dizininde duruyor. `.gitignore`'da olduğu için repoya girmemiş; yerel temizlik.

---

## Doğrulanan pozitifler

Bunlar denetimde özellikle arandı ve **sorun bulunmadı** — kayda geçiriyorum ki tekrar tekrar kontrol edilmesin:

- **IDOR yok.** `faz3_assets.go:82-96` ve `:191-207` her varlık erişiminde `requireAssetAccess` çağırıyor; `ShareAsset`/`RevokeAssetFromSpace` sahiplik kontrolü yapıyor (satır 103, 175). Repository sorguları `WHERE id=$1 AND user_id=$2` kalıbını tutarlı kullanıyor (`goal_repository.go:66, 160, 277`).
- **SQL enjeksiyonu yok.** Tüm sorgular parametreli; hiçbir yerde string birleştirme ile SQL kurulmuyor.
- **Token depolama doğru.** `session.ts:6-27` native'de `expo-secure-store` (Keychain/Keystore), yalnızca web'de `AsyncStorage` kullanıyor.
- **İnci ekonomisi yarışa kapalı.** `user_repository.go:150-199` `pg_advisory_xact_lock` + transaction ile günlük tavanı atomik uyguluyor.
- **CORS varsayılanı güvenli.** `middleware/cors.go:19-23` origin listesi boşsa `AllowCredentials`'ı kapatıyor; `*` varsa da kapatıyor.
- **Dev premium ucu korumalı.** `faz4.go:35-37` `AllowDevPremium` bayrağını kontrol ediyor, varsayılanı kapalı (`config.go:197`).
- **Statik analiz temiz.** `tsc --noEmit` mobil/web/shared'da hatasız, `eslint` web'de hatasız, `go vet ./...` hatasız.
- **Web erişilebilirliği iyi.** `aria-label`, `aria-current`, `prefers-reduced-motion`, `lang="tr"` doğru kullanılmış; `LabScene3D.tsx:331-336` three.js kaynaklarını düzgün serbest bırakıyor.
- **`alert.ts` shim'i doğru bir sorunu çözüyor** — react-native-web'de `Alert.alert` sessizce hiçbir şey yapmıyor; wrapper bunu `window.confirm`'e yönlendiriyor.

---

*Bu rapor kodu değiştirmedi. Onayından sonra hangi bölümden başlayacağımızı söyle.*
