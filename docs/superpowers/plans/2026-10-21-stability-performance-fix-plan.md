# BRQ Transfer Bug ve Performans İyileştirme Implementation Plan

> **Uygulama durumu (21 Ekim 2026):** Sonraki kullanıcı talebiyle uygulama mevcut checkout'ta başladı. Kullanıcı isteği gereği alt ajan/worktree/commit/push/release yok. İşaretlenen maddeler uygulanan dilimlerdir; açık maddeler ve doğrulama kanıtları [progress ledger](2026-10-21-stability-performance-progress.md) içindedir. Tüm plan veya release kabulü tamamlanmış değildir.

**Goal:** Tek fiziksel telefonun tek kayıt olarak yönetildiği, işlemlerin doğru hedefte ve bir kez çalıştığı, başarısızlıkların anlaşılır bildirildiği, kaynak kullanımının sınırlandığı bir BRQ Transfer sürümü hazırlamak.

**Architecture:** Mevcut Node.js/Express/WebSocket, vanilla JavaScript, Electron ve Java Android yapısı korunacak. Telefon kimliği bağlantı adresinden ayrılacak; mevcut fonksiyonlarda ortak hedef doğrulama, işlem sahipliği, hata sözleşmesi ve sınırlı kuyruklar kullanılacak. Büyük framework geçişi veya genel mimari yeniden yazımı yapılmayacak.

**Tech Stack:** Node.js, Express 4, ws, multer, chokidar, Electron; Android Java/WebView; isteğe bağlı Unity Editor C# eklentileri; node:test.

**Spec:** Bu dosyanın “Kapsam ve kurallar” bölümü; 21 Ekim 2026 kullanıcı talebi ve oturumda verilen AGENTS.md kuralları. Ayrı bir tasarım belgesi yoktur.

## Kapsam ve kurallar

- Başlangıçta yalnız TO DO planıydı; sonraki uygulama talebiyle kod değişiklikleri yetkilendirildi. Mevcut kullanıcı değişiklikleri korunacak.
- Öncelik: doğruluk → okunabilirlik → sürdürülebilirlik → performans → mimari güzellik.
- Özellikle telefon ekleme, telefon bulma, kayıtlı/bağlı telefon listeleri ve yanlış/tekrarlı işlem davranışları düzeltilecek.
- Yeni dependency varsayılan çözüm değildir. Gerekirse neden ve maliyet uygulanmadan önce açıklanacak.
- Unity kuralları yalnızca `plugins/Editor/` C# koduna uygulanacak; `.meta` dosyaları elle değiştirilmeyecek. İlgili C# metotları anlamlı `#region` gruplarında tutulacak.
- Pairing code, pano içeriği, token ve credential loglanmayacak. Hata detayında kullanıcıya yararsız tam komut veya özel dosya yolu gösterilmeyecek.
- Eski kayıtları birleştirme/migration veri kaybettirmeyecek; doğrulanamayan iki telefonu aynı model/ad/IP yüzünden birleştirmeyecek.
- Bu plan gerçek telefonda ölçülmüş performans artışı iddia etmez. Ölçümler ve fiziksel cihaz testleri uygulama aşamasının kabul koşuludur.

## İnceleme sonucu ve kanıt düzeyi

**İncelenen alanlar:** `server.js`, PC/mobil web arayüzleri, Electron, Windows/Linux launcher dosyaları, Android companion/build, Unity eklentileri, ClipWatch, package metadata ve mevcut testler. Binary araçların iç kodu ve APK'nın kaynakla birebir eşleşmesi doğrulanmadı.

**Çalışma alanı:** İnceleme başlangıcında 9 tracked dosyada kullanıcı değişikliği ve untracked `tests/` vardı. Özellikle `server.js` ve `public/pc.js` değişiklikleri korunacak; plan HEAD yerine bu çalışma ağacına dayanır. Kaynak satırları 21 Ekim 2026 anlık görüntüsüne aittir.

**Çalıştırılan doğrulama:**

- `node --check server.js`, `node --check public/pc.js`, `node --check electron.js`: başarılı.
- `npm test`: ortamın alt süreç kısıtı nedeniyle `spawn EPERM`; bu bir ürün test başarısızlığı olarak yorumlanmadı.
- `node --test --test-isolation=none`: **60 test geçti, 0 başarısız**. Testler çoğunlukla pairing/disconnect/forget akışlarında; bütün ürünün sorunsuz olduğunu kanıtlamaz.
- Gerçek fonksiyonlar Node `vm` içinde sahte dosya/ADB bağımlılıklarıyla çalıştırıldı. Gerçek telefona komut gönderilmedi, sunucu açılmadı, config veya transfer verisi değiştirilmedi.

| İzole senaryo | Gözlenen sonuç | İlgili iş |
|---|---|---|
| Aynı telefon IP:port ve mDNS transport adıyla ADB listesinde | 2 ayrı bağlı cihaz satırı | T01 |
| Aynı mDNS service IPv4 ve IPv6 ile duyuruluyor | 2 keşif kaydı | T01 |
| Seri numarası boş; aynı telefonun service adı değişiyor | 2 kayıtlı telefon | T01 |
| İki farklı telefon aynı anda kaydediliyor | Beklenen 2 kayıttan yalnızca 1'i kalıyor | T02 |
| Aynı klasörde `one.apk` ve `two.apk` | Aynı APK id | T06 |
| Aynı APK aynı anda iki kez register ediliyor | 2 kayıt | T06 |
| Remote key için bracket içeren IPv6 deviceId | `-s` tamamen atılıyor, hedef belirtilmiyor | T03 |
| APK install child process'i | `error` listener sayısı 0 | T03 |

Diğer maddelerde **kaynak bulgusu** kodda gözlenen kusuru; **cihaz testi** gerçek ağ, OS veya donanımdaki etkisinin ayrıca ölçüleceğini ifade eder. Kullanıcının yaşadığı olayın canlı logu olmadığı için tek bir senaryonun o olayın kesin nedeni olduğu iddia edilmez.

## Review Focus

1. Aynı telefon USB + Wi-Fi + IPv4 + IPv6 ile görünürken başka bir aynı-model telefon da bağlı: yanlış birleştirme ve yanlış hedef olmamalı. T01/T03.
2. Pair/connect/reconnect/disconnect/forget istekleri ters sırada tamamlanıyor: eski sonuç yeni tercihi geri almamalı. T02/T17.
3. 2 GB sınırı, dolu disk, aynı dosya adı, iptal ve ağ kopması: yarım dosya tamamlandı sayılmamalı. T08/T09/T10/T19.
4. ADB/aapt/scrcpy yok veya child process başlatılamıyor: uygulama ayakta kalmalı, tek anlamlı hata dönmeli. T03/T05/T14/T18.
5. Birden fazla pencere/telefon bağlı; biri yayını kapatıyor veya eski pano süreci bitiyor: diğer oturumun yeni işlemi bozulmamalı. T13/T15/T17.

## Öncelik ve uygulama sırası

**P0:** Yanlış cihaz/dosya işlemi, komut çalıştırma riski veya temel kimlik/veri bütünlüğü sorunu; sonraki sürüm için engel. **P1:** Günlük kullanımda bozulma/çökme/yanlış sonuç; release öncesi kapatılacak. **P2:** Ölçümle iyileştirme, ikincil entegrasyon ve kalan UX sorunları.

| Dilim | İşler | Çıkış koşulu |
|---|---|---|
| 1. Telefon doğruluğu ve komut güvenliği | T05/T10 temel sözleşmeleri, ardından T01–T04 | Tek fiziksel kimlik, doğru hedef, kontrollü hata |
| 2. APK ve transfer bütünlüğü | T06–T09, T11 | Doğru dosya, tek işlem, kalıcı ve doğru durum |
| 3. Sürekli çalışan işler | T12–T15 | Sınırlı polling/kuyruk, sahipliği belirli süreçler |
| 4. İstemci ve kurulum | T16–T21 | Güvenilir UI, açılış, Companion ve build |
| 5. Sürüm doğrulaması | T22 | Regresyon, cihaz matrisi, performans ve temiz kurulum geçer |

Her işte önce mevcut kusuru gösteren test eklenir ve başarısızlığı görülür; sonra en küçük düzeltme yapılır. Aşağıdaki test dosyaları **oluşturulacak veya genişletilecek hedeflerdir**, şu an mevcut oldukları iddia edilmez. Her bağımsız dilim doğrulandıktan sonra ayrı commit hazırlanabilir; bu planı hazırlamak commit/push yetkisi olarak kullanılmaz.

**Bağımlılıklar:** T05 hata sözleşmesi ve T10 güvenli persistence, T01 migration'dan önce tamamlanır. T01 kimlik sözleşmesi T02/T03 hedef yönetimini; T06 kimlik/dedupe T07 auto-install'ı; T03/T05/T10 ise T08/T09 transfer işlemlerini besler. T13/T14/T15, T03 process runner'ını; T19/T21, T04 erişim ve T18 health/port sözleşmesini kullanır. T22 test altyapısı ilk işten itibaren geliştirilir, release kapısı en son uygulanır. Kod yapısını değiştirerek büyük tek PR oluşturmak yerine bu bağımlılıklar üzerinden küçük, doğrulanabilir dilimler çıkarılır.

## T01 — Tek fiziksel telefon kimliği ve eski kayıtları birleştirme [P0]

**Dosyalar:** `server.js:476,683,874,889,918,940`; `public/pc.js:817,892,2187`; `tests/adb-pairing.test.js`.

**Bulgu:** `getAdbDevices()` her transport satırını ayrı cihaz yapıyor. `wirelessPhoneServices()` yalnız IP'ye göre birleştiriyor. `rememberWirelessDevice()` service adı değişip serial boşsa eski kaydı tanımıyor. Aktif liste, keşif listesi ve kayıtlı liste aynı kimlik kuralını kullanmıyor.

**Sözleşme:** `phoneId` fiziksel kayda ait kalıcı id; `transportId` ADB komutuna verilen geçerli bağlantı; `aliases` doğrulanmış serial/service/endpoint ilişkileri. `getAdbDevices()` dış yanıtına `phoneId` ve `transports` eklenirken mevcut `id` geçiş sırasında korunur. Yeni registry/service sınıfı gerekmez; mevcut fonksiyonlarla başlanır.

- [x] `samePhoneTransportAliasesProduceOneRow`, `dualStackServiceProducesOneDiscoveryRow`, `rotatedServiceWithoutSerialDoesNotCreateConfirmedDuplicate`, `sameModelDifferentSerialsRemainSeparate` testlerini ekle. Eski/sahipsiz IP başka telefona geçince kimlik devredilmediğini doğrula.
- [x] Önce doğrulanmış serial, sonra normalleştirilmiş service kimliği/alias ilişkisi kullan. IP yalnızca güncel keşif içindeki endpoint ilişkisi olsun; isim/model kalıcı kimlik olmasın. Kimliği eksik kaydı doğrulama bekleyen kayıt olarak tut; kanıtsız birleştirme yapma.
- [x] Config'e sürümlü migration ekle: snapshot/yedek al, doğrulanmış duplicate kayıtları birleştir, seçimi ve reconnect tercihini taşı. İkinci migration çalışması değişiklik üretmesin. USB ve Wi-Fi tek kartın bağlantı seçenekleri olsun; yalnız Wi-Fi bağlantısını kesmek USB'yi silmesin.
- [ ] `node --test --test-isolation=none tests/adb-pairing.test.js`: yeni ve mevcut testler geçmeli. Cihazda USB+Wi-Fi ve dual-stack deneyinde her fiziksel telefon başına tek kart/kayıt görülmeli.

## T02 — Telefon işlemlerinde yarış, kayıt kaybı ve yanlış hedefe geçiş [P1]

**Dosyalar:** `server.js:918,969,1006,1748,1791,1856,1930`; `public/pc.js:1000,1190,2187,2246,2339`; `tests/adb-pairing.test.js`.

**Bulgu:** `rememberWirelessDevice()` await öncesi aldığı listeyi sonradan yazarak başka eklemeyi kaybediyor. Reconnect, manuel connect ve disconnect aynı kilit sözleşmesini paylaşmıyor. `renderDevices()` seçim kaybolunca başka telefona otomatik geçebiliyor; UI seçimi ile config farklı kalabiliyor. Disconnect için kaydedilen `autoReconnect=false`, README'deki “yeniden başlatınca devam” açıklamasıyla uyuşmuyor.

**Sözleşme:** `runPhoneOperation(phoneId, operation, work)` aynı telefonda çelişen mutasyonları sıraya alır veya `DEVICE_BUSY` döndürür. Tamamlanma yalnız güncel operation/generation için uygulanır. Listeye yazma, await'lerden sonra güncel liste üzerinde tek senkron mutation olarak yapılır.

- [ ] `concurrentRememberPreservesBothPhones`, `disconnectDuringConnectDoesNotResurrectPhone`, `forgetDuringReconnectStaysForgotten`, `lateResultCannotReplaceSelection` testlerini kontrollü Promise tamamlanma sırasıyla yaz.
- [x] Connect/pair/reconnect/disconnect/forget için ortak işlem sahipliği kullan. QR iptali session'ı gerçekten inactive yapsın; eski callback yeni session'ı değiştirmesin. Retried işlemler tekrar kayıt/yan etki üretmesin.
- [x] Seçili telefon kaybolursa kullanıcıya bağlantının kesildiğini göster; kurulum/aktarım/pano hedefini başka telefona sessizce taşıma. Disconnect'in restart sonrası davranışını mevcut kalıcı tercih yönünde açıkça belgele ve test et; yeniden manuel connect tercih kilidini kaldırmalı.
- [ ] Eşzamanlı HTTP + WS + timer testlerini ve ADB testlerini çalıştır; 20 connect/disconnect döngüsünden sonra kayıt sayısı, seçim ve işlem kilitleri tutarlı olmalı.

## T03 — ADB komutları, child process hataları ve zorunlu hedef doğrulama [P0]

**Dosyalar:** `server.js:449,476,522,575,595,1383,1515,1783,1971–2093,2163,2361`; `tests/adb-commands.test.js`.

**Bulgu:** Bazı endpoint'lerde request `deviceId`, `port` veya dosya adı shell komutuna doğrudan giriyor. Bazılarında geçersiz deviceId reddedilmek yerine `-s` atlanıyor; IPv6 ile izole olarak doğrulandı. Install/stop/uninstall/key/touch/screenshot gibi süreçlerde `error` handler eksik; ADB yoksa EventEmitter hatası uygulamayı sonlandırabilir.

**Sözleşme:** `resolveTargetDevice(phoneIdOrTransport)` doğrulanmış online transport döndürür veya typed error üretir. `runAdbCommand(args, options)` mevcut helper'ın kontrollü genişletilmiş hali olur; `options` timeout, çıktı sınırı ve iptal sinyalini kapsar. Eski sayısal timeout çağrıları aynı iş içinde taşınır; stdout/stderr ve exit sonucu tek yerde değerlendirilir.

- [x] `missingAdbReturnsErrorWithoutCrash`, `invalidTargetNeverOmitsSerial`, `ipv6TargetPreserved`, `specialCharactersStayLiteralArguments`, `offlineTargetDoesNotFallBackToAnotherPhone` testlerini yaz. Sahte process hata/close/timeout olaylarını farklı sırada üret.
- [x] Host shell `exec` kullanımını ADB için `execFile/spawn` argüman listelerine taşı; uzak Android shell argümanlarını ayrıca doğrula/quote et. TCP port 1–65535, finite koordinat ve izin verilen işlem türünü kontrol et; hedef eksikse fail closed.
- [x] Her child process için `error`, stderr, exit, timeout ve request abort cleanup ekle; sonucu bir kez tamamla. Kısa sorgulara sınırlı timeout, uzun transfer/install için ayrı ve büyük dosyaya uygun yapılandırılabilir deadline kullan. Başlatma başarısını işlem başarısı sayma.
- [x] `node --test --test-isolation=none tests/adb-commands.test.js`: sahte shell metni hiçbir komut olarak çalışmamalı; ADB yok/hung/exit-zero-but-Failure testleri geçmeli; telefon seçimi bütün endpoint'lerde aynı davranmalı.

## T04 — LAN yönetim API'si ve WebSocket erişim sınırı [P0]

**Dosyalar:** `server.js:18,1211,1249,1469,1584,1783,2389,2477`; `public/mobile.html`; `tests/api-access.test.js`.

**Bulgu:** Sunucu `0.0.0.0` üzerinde; yönetim endpoint'leri ve WS komutları auth/origin ayrımı olmadan açık. `cors()` bütün origin'lere izin veriyor. Ağdan config değiştirme, ADB komutu başlatma, yerel dosya açma ve APK yolu kaydetme mümkün; bu, T03'teki shell kullanımının etkisini artırıyor. Mobil istemci INIT mesajında yönetim config'i ve yerel yolları da alıyor.

- [x] `lanClientCannotExecuteAdminOperation`, `untrustedOriginCannotUpgradeAdminWs`, `mobileSessionReceivesOnlyTransferData`, `unityLoopbackHookStillWorks` testlerini yaz.
- [x] En küçük başlangıç çözümü olarak yönetim API/WS işlemlerini doğrulanmış loopback dashboard erişimine sınırla; Host/Origin denetimini HTTP ve upgrade yolunda aynı uygula. Mobil upload/download için ayrı izinli yüzey bırak. Ağdan yönetim gerekiyorsa açıkça etkinleştirilen oturum doğrulaması tasarla; yalnız CORS'u yetkilendirme sayma.
- [x] Mobil erişime aktarım oturumu sınırı ekle; dosya açtırma/ADB/config yetkisi verme. Unity hook'u yalnız yerel erişim ve doğrulanmış APK dosyasıyla çalışsın. Token/pairing verilerini API loglarında gizle.
- [ ] Yetkili PC, mobil browser, Android reverse bağlantısı ve Unity hook entegrasyonlarını test et. Loopback görünen `adb reverse` erişimini yalnız IP'ye bakarak admin sayma; origin/oturum ayrımı bu senaryoyu kapsamalı.

## T05 — Ortak, anlamlı hata ve işlem sonucu sözleşmesi [P1]

**Dosyalar:** `server.js` route/error yolları; `public/pc.js:696,2283,2292,2339,2393`; `public/mobile.html:765`; `tests/api-errors.test.js`, `tests/ui-state.test.js`.

**Bulgu:** Ham ADB stderr/JSON/HTML kullanıcıya gidiyor; hata yutuluyor veya başarı gösteriliyor. `stopApp()` HTTP 500 sonucunda bile “Durduruldu” bildiriyor. Multer/JSON hataları için ürünün ortak JSON error middleware'i yok. Express 4 async route rejection'ları bütün endpoint'lerde ele alınmıyor.

**Sözleşme:** Hata yanıtı `{ success:false, error:{ code, message, action, retryable }, operationId }`; log detayı ayrı ve redact edilmiş. Başlatılan uzun işlem `202 + operationId + status`; terminal başarı yalnız işlem gerçekten tamamlandığında. `requestJson(url, options)` istemcide HTTP, JSON ve payload sonucunu birlikte kontrol eder; varsayılan timeout ve iptal destekler.

- [ ] 400 bozuk giriş, 409 busy, 413 büyük dosya, 502 ADB hatası, 503 araç yok, 504 timeout, JSON olmayan hata ve kopan socket testlerini ekle. Tüm Promise rejection'ları kontrollü yanıt veya işlem sonucuna dönüşmeli.
- [x] Ortak error mapper ve async route wrapper ekle; her endpoint'i yeni sözleşmeye taşı. `ENOENT`, unauthorized/offline, yanlış/süresi geçen pairing code, signature mismatch, düşük Android sürümü, dolu disk ve eksik araç için ayrı kod kullan.
- [x] UI handler'larında sonucu doğrulamadan toast üretme; aynı `operationId` için yalnız bir terminal bildirim göster. Toast timer'larını yenile, uzun detayı sarılabilir ayrı alanda sun; kullanıcı mesajlarında `undefined`, stack veya ham HTML bulunmasın.
- [ ] `tests/api-errors.test.js` ve `tests/ui-state.test.js` geçmeli. Her hata mesajı “ne oldu + hangi işlem başarısız + şimdi ne yapmalı” bilgisini içermeli; kesin olmayan neden kesinmiş gibi söylenmemeli.

## T06 — APK id çakışması, kayıt yarışı ve istemci duplicate kartlar [P0]

**Dosyalar:** `server.js:296,344,351,359,361,1973,2406`; `public/pc.js:1654`; `public/mobile.html:871`; `tests/apk-registry.test.js`.

**Bulgu:** `Buffer.from(filePath).toString('hex').slice(0,16)` dosya yolunun ilk 8 byte'ını kullanıyor; aynı klasörün APK'ları aynı id alıyor. `.find(id)` yanlış APK'yı seçebilir. `registerApk()` await öncesi dedupe yaptığından paralel kayıt duplicate üretir. PC ve mobil `NEW_APK` olayında yalnız `unshift` yapar; eski sürüm kartları kalır.

**Sözleşme:** APK id canonical tam dosya yolunun SHA-256 özeti; `revision` size+mtime doğrulamasıyla güncellemeyi temsil eder. `registerApk(filePath, source)` path başına tek uçuş kullanır; aynı revision ikinci kez yan etki doğurmaz. İçerik hash'i yalnız bütünlük kontrolü gerçekten gerektiğinde hesaplanır; her poll'da büyük APK okunmaz.

- [x] `sameDirectoryDifferentApksHaveDifferentIds`, `concurrentSameApkRegistersOnce`, `newRevisionReplacesOldCard`, `downloadAndInstallResolveExactRequestedFile` testlerini yaz; mevcut hataları önce göster.
- [x] Normalize edilmiş tam path kimliğini ve path başına pending Promise dedupe'u uygula. Metadata extraction başarısızsa `com.app.android`, sahte SDK/version üretme; bilinmeyen alanları açıkça işaretle ve paket bilgisi gerektiren launch eylemini engelle.
- [x] PC/mobil listelerinde id ile upsert yap, server ile aynı 50 kayıt sınırını koru; silinen APK için stale kart/indir linkini temizle. `.find(id)` ile seçilen dosyanın revision'ını uzun işlem başlangıcında sabitle.
- [ ] 100 aynı-path build güncellemesinde tek güncel kart; farklı path'lerdeki her indirme/kurulum doğru dosyaya gitmeli. `tests/apk-registry.test.js` geçmeli; bir update yalnız bir bildirim/otomatik install üretmeli.

## T07 — Watcher ve otomatik kurulumun bir kez ve doğru zamanda çalışması [P1]

**Dosyalar:** `server.js:385,398,415,435,441,1427,2389,2485`; `plugins/Editor/UnityDropBuildHook.cs`; `tests/apk-registry.test.js`, `tests/watcher.test.js`.

**Bulgu:** Başlangıç scan'i de `registerApk()` üzerinden auto-install tetikliyor; uygulamayı açmak eski APK'ları tekrar kurabilir. Watcher ve Unity hook aynı build'i eşzamanlı kaydedebilir. Mobile upload da auto-install yoluna girebilir. `usePolling:true` bütün ağaçta 600 ms tarama yapıyor; watcher close await edilmiyor, unlink/error ele alınmıyor.

- [ ] `startupScanNeverAutoInstalls`, `watcherAndBuildHookInstallRevisionOnce`, `partialBuildIsNotRegistered`, `watchFolderSwapClosesOldWatcher` testlerini yaz.
- [x] Metadata kaydı ile “yeni build nedeniyle auto-install” kararını ayır. Startup scan salt liste yüklesin; auto-install yalnız uygun kaynak ve yeni revision için çalışsın. Aynı cihazdaki install'ları seri yürüt; çalışırken gelen aynı revision birleştirilsin.
- [ ] Watcher'ı APK kapsamına daralt, normalize path kullan, yazım tamamlanmadan kayıt alma; eski watcher kapanışını bekle, error/unlink yönet. Native event varsayılanı ile polling fallback'ini yerel disk/ağ klasöründe ölçerek seç; doğruluk pahasına polling'i körlemesine kapatma.
- [ ] 1 ve 10.000 dosyalı klasörde idle CPU/disk ve yeni APK algılama gecikmesini kaydet; 10 kayıt sinyali tek register/install üretmeli. Dosya yazılırken hook ve watcher çakışması testi geçmeli.

## T08 — Transferin gerçek durumu, tek işlem ve doğru başarı bildirimi [P1]

**Dosyalar:** `server.js:1346–1406`; `public/pc.js:1659,1840,2393`; `tests/transfers.test.js`, `tests/ui-state.test.js`.

**Bulgu:** HTTP success push bitmeden dönüyor. Hata halinde de `TRANSFER_COMPLETED` yayınlanıyor; UI başarı sesi çalıyor. `transferring` kartı hata gibi çiziliyor, `saved` sonucu “Cihaza aktarıldı” olabiliyor. Devam eden transfer server listesine yalnız tamamlandığında ekleniyor; yenilemede kayboluyor. `Date.now()` id eşzamanlı isteklerde çakışabilir.

**Sözleşme:** UUID `operationId`; `queued → transferring → transferred | error | cancelled`, cihaz yoksa `saved`, restart'ta yarım işlem için `interrupted`. `saved` sadece PC'ye alındığını ifade eder. İşlemin hedefi başlatıldığında sabitlenir; UI seçimi değişince taşınmaz.

- [x] `slowPushRemainsInProgress`, `failedPushNeverReportsSuccess`, `noPhoneMeansSavedOnPc`, `reloadKeepsInFlightTransfer`, `sameRequestIdDoesNotPushTwice` testlerini yaz.
- [x] Kaydı push başlamadan belleğe/kalıcı duruma ekle; HTTP'de kabul/başlangıç bilgisini dön. Sonucu aynı kaydı güncelleyerek WS üzerinden ilet. Retry için operationId/request id idempotency uygula; farklı gerçek transferleri yanlışlıkla birleştirme.
- [x] Durum metinlerini ve renkleri ayrı tanımla; progress ve tamamlanma birbirine karışmasın. Restart'ta otomatik tekrar push ederek dosya çoğaltma; `interrupted` ve açık yeniden dene eylemi göster.
- [ ] Başarısızlık, gecikme, sayfa yenileme, iki sekme ve çift tıklamada her dosya için bir kayıt ve bir terminal bildirim doğrula. İndirilen/gönderilen dosyanın içeriğini test fixture hash'iyle karşılaştır.

## T09 — Upload çakışmaları, sınırlı kuyruk, iptal ve mobil dosya kaybı [P1]

**Dosyalar:** `server.js:1264–1302,1346,1411`; `public/pc.js:2372–2424`; `public/mobile.html:699,740,765`; `public/index.html:152`; `tests/uploads.test.js`, `tests/mobile-ui.test.js`.

**Bulgu:** `existsSync` + timestamp dosya adı üretimi atomik değil; eşzamanlı aynı isim overwrite riski taşır. `/api/upload` `any()` ile birçok dosyayı kabul edip yalnız ilkini işler. PC bütün dosyaları sınırsız paralel gönderiyor. Mobilde A yüklenirken B eklemek gönder düğmesini yeniden açıyor; A bitince B de kuyruktan siliniyor. Bu UI yarışı vm ile doğrulandı.

- [x] `concurrentSameNameUploadsPreserveBothFiles`, `unexpectedMultipartFilesRejected`, `mobileQueuePreservesUnsentFiles`, `uploadCancellationCleansPartialFile`, `limitsReturnReadableError` testlerini ekle.
- [x] Diskte UUID tabanlı güvenli ad ve geçici dosya kullan; kullanıcıya originalName göster. Windows reserved adları, trailing dot/space ve Unicode'u doğrula. Transfer dizini dışına çıkışı hem yerel hem uzak path için engelle; telefondaki aynı ad için sessiz overwrite yerine açık collision politikası uygula.
- [x] PC endpoint'ini tek `file`, mobil endpoint'ini en çok 50 `files` olarak kesinleştir; mevcut dosya başına `2000 * 1024 * 1024` byte sınırını iki UI'da da aynı göster. Disk dolmasını anlamlı hata yap; yarım dosyaları cleanup et. Başlangıç için PC upload concurrency=2, cihaz başına push/install concurrency=1 kullan; toplam aktif upload ve queue limitini yük testine göre sabitle.
- [x] Mobil gönderimde snapshot al, yalnız o snapshot başarıyla tamamlanınca çıkar; yeni eklenen dosyaları koru. `isUploading` ile ikinci submit'i engelle; cancel/timeout/reset'i ele al. PC picker'ı işlem sonrası sıfırla; aynı dosyayı yeniden seçme ve çoklu seçim davranışını tutarlı yap.
- [ ] 0-byte, sınırdaki dosya, sınır+1, 51 dosya, eşzamanlı aynı ad, bağlantı kopması ve disk hatası testleri geçmeli; 20 dosyalık PC drop'unda en fazla iki upload ve cihaz başına tek ADB veri işlemi çalışmalı.

## T10 — Config ve transfer geçmişinin doğrulanmış, atomik saklanması [P1]

**Dosyalar:** `server.js:34–59,202–294,1322,1335,1555,1584`; `tests/persistence.test.js`.

**Bulgu:** JSON dosyaları doğrudan `writeFileSync` ile üzerine yazılıyor; hata yalnız loglanıp API başarı dönebiliyor. Config yüklenirken tip/schema denetimi yok; örneğin `knownWirelessDevices` array değilse akışlar kırılabilir. `syncTransfersWithDisk()` GET/WS bağlantısında bütün klasörü tarayıp dosyayı yeniden yazıyor; `.gitkeep` de transfer sayılabilir. Screenshot kaydı hemen persist edilmiyor.

**Sözleşme:** `saveConfig()` / `saveTransfers()` persistence başarısızlığını çağırana iletir. Aynı dizinde temp-write + atomic replace ve son sağlam kopya; dosya başına sıralı write. Okuma/tarama sonucu doğrulanan alanlar dışında bellek state'i bozulmaz.

- [x] `corruptJsonPreservesLastGoodState`, `invalidConfigTypesAreRejected`, `writeFailureIsNotReportedSaved`, `gitkeepAndPartialFilesAreIgnored`, `screenshotSurvivesRestartWithSameId` testlerini yaz.
- [x] Config tip/range/enum kontrolü ve sürüm migration ekle; mevcut dosya bozuksa önce koru, sessizce üstüne yazma. Aynı anda config değiştiren istekleri güncel state üzerinde merge et; `watchFolder` gerçekten okunabilir dizin olmalı.
- [x] GET ve WS connect sırasında disk tarama/yazmayı kaldır. Startup reconciliation + watcher ile bellekte index tut; `.gitkeep`, temp ve başarısız upload parçalarını dışla. İsim karşılaştırmasından çok canonical path kullan; geçmiş silme ile dosya silmeyi ayrı ve tutarlı davranışlar yap.
- [x] Disk izin reddi, rename hatası, bozuk/BOM'lu JSON ve 10.000 dosyalı received dizini fixture'ları geçmeli. Kritik kayıtlar yanıt verilmeden persist edilmeli; telemetry gibi geçici veri diske yazılmamalı.

## T11 — Dosya silme/açma, indirme ve screenshot doğruluğu [P1]

**Dosyalar:** `server.js:1328,1469,1494,1515,2084,2406,2417`; `public/pc.js:1407,1941,1965`; `tests/transfers.test.js`, `tests/adb-commands.test.js`.

**Bulgu:** Silme hatası yutulup kayıt kaldırılıyor; dosya sonraki taramada geri gelebilir. File-open response gönderildikten sonra process error ikinci response yazabilir. Download stream error/abort cleanup eksik. “Son screenshot” iki klasörün zamanlarını karşılaştırmıyor; ADB listeleme hatasında sessizce yeni screenshot çekiyor. Screenshot endpoint'i hata/boş çıktıyı PNG gibi sunabiliyor; UI boş blob'u başarıyla galeriye ekliyor.

- [ ] `failedDeleteKeepsRecord`, `openFailureRespondsOnce`, `downloadMissingMidStreamDoesNotCrash`, `latestScreenshotComparesBothDirectories`, `emptyScreenshotIsRejected` testlerini ekle.
- [x] Silme işlemini gerçek dosya sonucuna bağla; yalnız geçmişi kaldırma seçeneği varsa ayrı belirt. File-open/folder-open yalnız kayıt id ile doğrulanmış canonical path üzerinde çalışsın; process hata/başarı yanıtını bir kez tamamla.
- [x] Download'larda `pipeline`/error ve client abort cleanup kullan. Screenshot'ta exit/stderr ve PNG geçerliliğini kontrol et; istemci response.ok, content type, boyut ve image decode sonucunu doğrulasın. Metadata gerçek decoded boyuttan gelsin.
- [x] Son screenshot için iki dizinin timestamp'lerini karşılaştır; “bulunamadı”, “cihaz okunamadı” ve “yeni çek” davranışlarını ayır. Hata halinde kullanıcının istemediği yeni capture üretme; gerekli dizin/izin kontrolünü yap.
- [ ] Dosya kullanımda/izin yok, indirme sırasında dosya silinmesi, bağlantı kesilmesi, ADB offline ve bozuk PNG senaryoları kontrollü sonuç vermeli. Fotoğraf/transfer başarılıysa kalıcı kaydı T10 üzerinden yazılmalı.

## T12 — Cihaz polling, batarya, keşif ve QR maliyetini azaltma [P2]

**Dosyalar:** `server.js:449–519,794–870,969,1305,2146,2447–2474`; `public/pc.js:1092,2102–2119`; `tests/device-monitor.test.js`.

**Bulgu:** `getAdbDevices()` salt listeleme değildir: her çağrıda tüm online transport'ların bataryasını okur ve `adb reverse` çalıştırır. 4 saniyelik monitor dışında status, WS INIT ve bazı mutasyonlar da bunu çağırır. PC ayrıca 20 saniyede batarya sorgular. Poll interval'inde in-flight koruması yok; yavaş sorgular üst üste binebilir. Battery yüzde değişimi QR'ı yeniden üretir; snapshot `isCharging` değişimini içermez.

- [x] Sahte ADB sayaçlarıyla `concurrentDeviceReadsShareOnePoll`, `batteryReadIsCachedAcrossClients`, `reverseRunsOnlyOnNewTransport`, `chargingChangeBroadcastsWithoutQrRegeneration` testlerini yaz.
- [x] Cihaz listesi snapshot'ını ortak tek uçuşla 4 saniyelik cadence'de al; telemetry'yi 20 saniyelik cache'e ayır. İlk bağlantıda reverse kur; endpoint değişimi veya hata sonrası doğrula. Her UI okuyucusu yeni ADB process üretmesin; ardışık poll bir önceki tamamlanmadan başlamasın.
- [x] QR'ı yalnız URL/IP/port değişince üret. Snapshot'ta state/model/charging gibi gösterilen alanları karşılaştır. Keşif için mevcut shared Promise/cache'i koru; manuel refresh yeni sonuç istemeli, aynı anda gelen refresh'ler tek keşfi paylaşmalı. DNS TTL=0/eski endpoint ve birden fazla adapter testlerini ekle.
- [ ] 1 ve 5 istemci için komut/dakika, discovery socket sayısı, UI güncellik gecikmesi ölç. Kaynaktan türetilen mevcut monitor alt yükü yaklaşık `15 * (1 + 2 * onlineTransportSayısı)` komut/dakika; bu ölçülmüş cihaz benchmark'ı değildir. İyileştirmede idle komut sayısı istemci sayısıyla büyümemeli; hedef baseline'a göre en az %50 azalma ve cihaz durumu en geç bir poll + sorgu süresinde güncelleme.

## T13 — Web ekran yayını sahipliği, yanlış cihaza dokunma ve backpressure [P1]

**Dosyalar:** `server.js:1121–1246,2041,2070`; `public/pc.js:1224–1400,1595,1727,1734,2246`; `tests/screen-stream.test.js`, `tests/ui-state.test.js`.

**Bulgu:** Global `screenStreamProcess` eski process callback'leriyle yeni yayına karışabilir; stop-before-start callback'i yeniden başlatabilir. Her WS istemcisi global STOP gönderebilir. Veri `bufferedAmount` kontrolü olmadan gönderilir. Start başarılı olmadan “canlı” yayınlanır; hata exit'inde sınırsız 100 ms restart döngüsü oluşabilir. A görüntülenirken hedef B seçilirse UI dokunma/navigation komutunu B'ye gönderir. Sabit `720x1520` yayın ve physical-only boyut okuma rotation/override ile uyuşmayabilir.

**Sözleşme:** Aktif yayın `{ streamId, ownerWs, phoneId, transportId, process, generation, state }`; `STARTING/RUNNING/STOPPING/ERROR` sonuçları streamId ile eşlenir. `stopScreenStream(streamId, reason)` yalnız sahibi/güncel işlem için etkilidir. Yerel UI cleanup, sunucuya STOP gönderme işinden ayrılır.

- [ ] `stopBeforeSpawnPreventsLateStart`, `oldProcessCloseCannotRestartNewStream`, `otherClientCannotStopOwnerStream`, `touchUsesDisplayedPhone`, `wsDisconnectCleansStream`, `slowClientDoesNotGrowQueueUnbounded` testlerini yaz.
- [x] Process/error/close callback'lerini generation ile bağla; socket kapandıysa yeni spawn yapma. Normal 180 saniyelik screenrecord bitişi ile hata exit'ini ayır; hata için sınırlı retry/backoff ve görünür hata, kullanıcı stop'u için kesin iptal kullan. Kullanıcıya ait başka screenrecord süreçlerini genel `pkill` ile sonlandırma.
- [x] İstemci hedef değişiminde yayını kontrollü durdurup yeniden başlatsın; touch/back/home/power yalnız görüntülenen stream transport'una gitsin. Gerçek display override ve rotation'a göre aspect ratio ve koordinatları güncelle; letterbox alanına tıklama komut üretmesin.
- [ ] Başlangıç backpressure sınırı olarak WS kuyruğu 4 MiB üstünde stdout'u duraklat, 1 MiB altında sürdür; 5 saniyeden uzun stall'da kontrollü hata/cleanup. H.264 akışından rastgele byte/chunk atma. Eşikler gerçek LAN ölçümüyle doğrulanmalı; düşük gecikme ile bellek sınırı arasındaki maliyeti kaydet.
- [ ] 20 start/stop, iki browser, yavaş istemci, Wi-Fi kopması ve 10 dakikayı aşan yayın testinde tek sahipli süreç, sınırlı buffer ve doğru hedef doğrulansın. İlk frame gelmeden UI “Canlı” dememeli.

## T14 — Native scrcpy'nin doğru cihaza, izlenebilir süreç olarak açılması [P1]

**Dosyalar:** `server.js:2095–2143`; `start-screen.bat:9`; `README.md`; `tests/native-tools.test.js`.

**Bulgu:** Seçilen `targetDevice` bat dosyasına aktarılmıyor; iki cihazda scrcpy hedefi belirsiz. `activeScrcpyProcess` start'ta hiç atanmıyor, status sürekli false olabilir. Start hemen başarı döndürüyor; stop bütün `scrcpy.exe` süreçlerini öldürüyor ve pano/harici kullanıcı oturumunu etkileyebilir. Mevcut checkout'ta `tools/scrcpy/` bulunmuyor.

- [ ] `scrcpyReceivesSelectedTransport`, `startFailureNeverPublishesRunning`, `stopKillsOnlyOwnedPid`, `statusMatchesActualProcess` testlerini yaz.
- [x] `spawn(SCRCPY_BIN, ['-s', target, ...])` ile gerçek process handle sakla; binary'yi doğrulanmış config/PATH veya belgeli araç dizininden çöz. Batch üzerinden görünmez alt süreç oluşturmayı ana kontrol yolu olmaktan çıkar; native ekranın görünürlüğü kullanıcı talebine uygun kalsın.
- [ ] Başlatma/çıkış/error olaylarını doğru yayınla; process name ile global taskkill yerine yalnız sahip olunan PID ağacını kapat. Eksik scrcpy durumunda diğer uygulama işlevleri çalışsın, ilgili buton açıklamalı devre dışı olsun.
- [ ] Temiz clone ve iki telefon senaryosunu dene; harici açılmış scrcpy/pano oturumu BRQ ekranı kapatılınca yaşamaya devam etmeli. Dağıtılacak araç sürümü ve checksum release belgesinde sabitlensin.

## T15 — Pano senkronizasyonunda frame, işlem sırası ve süreç ömrü [P1]

**Dosyalar:** `server.js:2163–2385`; `tools/ClipWatch.cs:23–42`; `public/pc.js:2122–2184`; `tests/clipboard.test.js`.

**Bulgu:** `stdout` chunk'ı satır sınırı sanılıyor; `CLIP:` veya base64 parçalara bölünürse içerik kaybolur/bozulur. Başarısız aktarımda `lastSentClipboardB64` çoktan güncellenir, aynı içerik tekrar denenmez. Mode change await sırasında yarışabilir; eski process exit'i yeni process/mode'u temizleyebilir. `ensureClipJar()` sonucu send-text yolunda yok sayılıyor; `error` olayları eksik. Clipboard kilidinde ClipWatch UI thread'i Sleep ile durur ve event sessiz kaybolabilir.

- [ ] `splitClipboardLineReassembles`, `failedSendCanRetrySameContent`, `lateExitDoesNotStopNewMode`, `offDuringStartupStaysOff`, `missingJarStopsBeforeSend` testlerini yaz; Türkçe/emoji/uzun metin ve hızlı art arda kopyalama ekle.
- [x] Tam satır gelene kadar bir buffer kullan; UTF-8 decode ve base64 bütünlüğünü doğrula. Kuyruğu sınırlı tut; bekleyen pano güncellemelerinde yalnız en yenisini sakla, başarılı aktarım sonrası dedupe state'ini güncelle. Büyük metni shell command-line limitine zorlamak yerine boyut kontrollü stdin/geçici payload aktarımı kullan.
- [x] Mode/device seçiminde generation token kullan; önce yeni ayarı doğrula, sonra eski süreci kapat. Başlatma başarısızsa mode `off` ve device boş olmalı. Jar hazırlığını cihaz oturumu başına doğrulanmış cache ile yap; device değişiminde invalidate et.
- [ ] ClipWatch listener kayıt sonucunu bildir; clipboard kilidi retry'ını message loop'u uyutmadan timer ile birleştir. 20 mode değişimi ve metin akışında yalnız bir aktif watcher, sıfır yetim process, hatada açık retry davranışı doğrula.

## T16 — Güvenli render, duplicate helper ve gizlilik modu [P1]

**Dosyalar:** `public/pc.js:534,748,1655,1777,1840,2088,2218,2429`; `public/mobile.html:810,838`; `tests/ui-rendering.test.js`.

**Bulgu:** Dosyanın sonundaki ikinci `escapeHtml()` güvenli ilk tanımı eziyor; tırnaklar kaçmıyor. Dosya adı attribute içinde markup bozabilir; cihaz kartında model/id ve mobil versionName ham HTML'e giriyor. İlk helper'ı tek başına test etmek dosyanın gerçek sonucunu kaçırıyor. Privacy mode tooltip, QR/URL, bazı toast ve pairing alanlarında gerçek bilgileri açık bırakıyor.

- [x] Gerçek script'in bütün yükleme sırasını kapsayan testte `'`, `"`, `<`, `>`, Unicode içeren filename/model/version render et; yalnız metin olarak görünmeli. Numeric transfer id zaten `String(t.id)` ile çevriliyor; normal akışta sayısal id crash'i varmış gibi test yazma.
- [x] Tek escaping/DOM yaklaşımı bırak; dynamic içerik için `textContent`, dataset ve event delegation kullan. URL/attribute bağlamlarını ayrıca doğrula; inline HTML event handler'larını dışarı al. Server payload'larını da şema bakımından denetle.
- [x] Gizlilik modunda tooltip, cihaz ad/seri/IP, QR ve adres etiketlerini aynı görüntüleme politikasından geçir; QR'ı gizle. Kopyalanan gerçek adres gerekiyorsa yalnız açık kullanıcı tıklamasıyla kopyala, toast içinde adresi tekrar açığa çıkarma.
- [x] DOM testlerinde işlevsel buton dataset'leri bozulmamalı; privacy açıkken görünür metin/title/QR üzerinde adres/serial kalmamalı. 100 APK update sonrası tek kart ve aktif sekmeye ait doğru sayaç kontrolü T06 ile birlikte geçmeli.

## T17 — UI async state, ayar kaydı ve kaynak temizliği [P1]

**Dosyalar:** `public/pc.js:675,696,775,1190,1407–1524,1595,1703,2102,2246,2315–2349`; `public/mobile.html:831–889`; `public/app.css:1379,1433`; `tests/ui-state.test.js`, `tests/mobile-ui.test.js`.

**Bulgu:** Cihaz seçimi/otomasyon değişimi kaydedilmemiş watchFolder taslağını da gönderiyor; geçersiz klasör yüzünden cihaz tercihi backend'de kaydolmazken UI seçili görünüyor. CONFIG_UPDATED bütün form alanlarını yenilemiyor. İlk açılışta cihaz yoksa “Telefonda Aç” handler'ı bağlanmıyor; sonradan düğme görünür ama işlevsiz. Geç batarya cevabı eski cihaz verisini yeni cihaza uygulayabilir. WS kopmasında stale durum, screenshot ObjectURL ve her chime'da yeni AudioContext birikimi var.

- [ ] `deviceSelectionDoesNotSaveFolderDraft`, `configFailureRestoresConfirmedSelection`, `lateBatteryCannotUpdateDifferentPhone`, `openOnPhoneWorksAfterLateConnect`, `reconnectShowsFreshSnapshot`, `captureDeleteRevokesUrl` testlerini yaz.
- [x] `saveSettings(patch)` yalnız değişen alanları yollasın; taslak ile onaylanmış ayarı ayır. Config revision/request version ile geç yanıtı reddet. Hata halinde görünür açıklama ve son onaylanmış state; iki sekmede gelen config değişikliğini yerel kirli taslağı sessiz silmeden uzlaştır.
- [x] Handler'ları bir kez bağla; render yalnız görünürlük/disabled durumunu yönetsin. Seçimi normalize ettikten sonra header çiz. WS parse/error/close handling, tek reconnect timer, backoff ve sayfa kapanışında cleanup ekle; offline iken değişiklik yapan butonlar anlamlı durum göstersin.
- [x] Tek AudioContext kullan veya ses bitince kapat. Capture için tek Blob tut, silmede/kapanışta ObjectURL revoke et; başlangıç galeri sınırı 50, otomatik temizleme yalnız bellekteki en eski preview'ı kapsasın. Uzun dosya adları/dar pencere için actions wrap ve overflow kontrolünü gerçek render'da doğrula.
- [ ] 100 chime ve 100 capture ekle/sil döngüsünde kaynak sayıları büyümemeli; iki sekme, geç cevap, clipboard permission rejection, 650/980 px ve uzun hata metni testleri geçmeli. Tam DOM'u her telemetry değişiminde yeniden kurma ancak profiler gereksiz layout gösteriyorsa hedefli güncelleme yap.

## T18 — Electron/launcher açılışı, health ve kontrollü kapanış [P1]

**Dosyalar:** `electron.js:24–62,94–96,150–172`; `server.js:15,1305,2477–2502`; `start.bat:22–48`; `launch.bat`, `launch.vbs`, `start-hub.bat`, `start-hub.sh`; `tests/startup.test.js`.

**Bulgu:** Electron `http.get` için gerçek socket timeout koymuyor; süre kontrolü response/error gelmezse çalışmıyor. Her HTTP yanıtı mevcut backend sayılıyor, readiness false sonucu yok sayılıyor. Ağır `/api/status` ADB'yi bekliyor. Port hatası için server error handling yok. `%ERRORLEVEL%` parantezli npm-install bloğunda eski değerle değerlendiriliyor; gizli launcher `pause` üzerinde görünmez bekleyebilir. Server shutdown watcher/socket/screen/scrcpy işlerini kapsamıyor.

**Sözleşme:** `/api/health` ADB çağırmadan `{ app:'brq-transfer', version, ready }` döner. `startServer()` kontrollü hata, `shutdown()` ise uygulamanın sahip olduğu server/watcher/process/timeout/socket'leri kapatan Promise döndürür. Headless ve Electron aynı kapanış yolunu kullanır; dışarıda zaten çalışan hub Electron kapanınca öldürülmez.

- [x] `silentHttpServerTimesOut`, `differentAppOnPortIsRejected`, `readinessFailureShowsRecovery`, `npmInstallFailureStopsLauncher`, `shutdownLeavesNoOwnedChildren` testlerini yaz.
- [x] HTTP probe'a istek timeout + toplam deadline, response consumption ve app identity kontrolü ekle. Başlangıç hatasında görünür retry/quit/log eylemi sun; `loadURL`/`did-fail-load` hatalarını ele al. `server.on('error')` EADDRINUSE/izin hatasını anlamlı raporlasın.
- [x] Launcher'da güncel exit code kullan; yarım `node_modules` kurulumunu tespit et. Browser yalnız health hazır olduktan sonra açılsın; sessiz başlatmada hata görünür olsun. `PORT` 1–65535 doğrulaması ve ortak URL çözümü desktop/launcher'a uygulansın.
- [x] Kapanışta interval ve retry'ları durdur, watcher close'u bekle, yalnız sahip olunan child PID'leri kapat, WS ve HTTP'yi sonlandır. Exit event içinde bitmesi beklenen async cleanup başlatma; shutdown'ı before-quit/SIGTERM yolunda tamamla.
- [ ] Port dolu, Node yok, npm başarısız, ADB yok, yavaş açılış, `PORT=4501`, iki kez açma ve 20 aç/kapat döngüsü testleri geçmeli. Arka planda kalan server/clipwatch/screenrecord/scrcpy olmamalı.

## T19 — Android Companion dosya seçimi, güvenilir indirme ve UI maliyeti [P1]

**Dosyalar:** `android-companion/src/main/java/com/unity/apkhub/MainActivity.java:33,100,116–215`; `GenericFileProvider.java:28`; `public/mobile.html:510`; Android cihaz test senaryoları.

**Bulgu:** Varsayılan `WebChromeClient` ile file chooser callback'i yok; Companion upload akışı tamamlanmıyor. Default davranış dosya isteklerini iptal eder: [Android WebChromeClient API](https://developer.android.com/reference/android/webkit/WebChromeClient#onShowFileChooser(android.webkit.WebView,%20android.webkit.ValueCallback%3Candroid.net.Uri[]%3E,%20android.webkit.WebChromeClient.FileChooserParams)). İndirmede connect/read timeout, cancel, failure cleanup ve Activity sahipliği yok; bütün indirmeler `game_latest.apk` üzerine yazılıyor. Her en fazla 8 KB chunk için yeni UI Runnable post ediliyor.

- [x] File picker tek/çoklu seçim ve iptal; aynı anda ikinci indirme; bağlantı cevapsızlığı; indirme ortasında Wi-Fi kesilmesi; Activity recreation; unknown-source izni verme/reddetme senaryolarını cihaz test listesine ekle.
- [x] `onShowFileChooser(...)` ve bekleyen callback/result cleanup uygula. Boş IP'de URL yükleme; hostname/IP/host:port girişini doğrula. WebView yalnız seçilmiş hub origin'inde kalsın; dış link/download açıkça doğrulansın. İlk yükleme ve HTTP hatasında kullanılabilir geri dön/yeniden dene ekranı sun.
- [x] İndirme için tek aktif iş, connect/read timeout, iptal ve lifecycle cleanup ekle. `try-with-resources`, finally disconnect, benzersiz `.part` ve tamamlandığında atomik final dosya; eksik boyut/yanlış türü installer'a verme. İzin dönüşü bekleyen isteği kontrollü devam ettirsin, yeni Activity eski işi sahiplenmesin.
- [x] Progress'i yalnız yüzde değiştiğinde ve en çok 100 ms'de bir gönder; bilinmeyen boyutta indeterminate göster. Activity yok edilmişse UI/installer callback'i çalışmasın; WebView'i doğru lifecycle'da temizle. FileProvider canonical-root/izinli dosya kontrolü ekle; mevcut `exported=false` nedeniyle kanıtlanmamış dış erişim exploit'i varmış gibi raporlama yapma.
- [ ] 1 GiB aktarım, dosya seçimi, disk hatası ve çık/gir testleri geçmeli; yarım APK kurulmaya çalışılmamalı, açık stream/thread sayısı birikmemeli. Mevcut kod 1 GiB için yaklaşık en az 131.072 progress işi üretebilir; bu koddan hesaplanan sayı, ölçülmüş frame kaybı değildir.

## T20 — Android imzası, build doğrulaması ve temiz kurulum [P1]

**Dosyalar:** `android-companion/build-companion.ps1:3–16,24,41,53–61`; `android-companion/src/main/AndroidManifest.xml`; `package.json`, `package-lock.json`, `README.md:84`; `.gitignore`.

**Bulgu:** Build dizini silindikten sonra aynı dizindeki keystore yeniden yaratılıyor; ardışık APK'lar farklı sertifikayla imzalanıyor. Bu, veri korunarak mevcut kurulumun güncellenmesini bozar; imza sürekliliği [Android signing kurallarının](https://developer.android.com/studio/publish/app-signing#considerations) gereğidir. Native tool exit code'ları denetlenmiyor; boşluklu `cmd /c` yolları kırılabilir. README Node 18 önerirken lock içindeki Electron araçları `>=22.12.0` ister; lock root adı hâlâ `unity-apk-hub`.

- [ ] Önce mevcut dağıtılan APK'nın sertifika fingerprint'ini kontrol et; mevcut anahtar bulunabiliyorsa koru. Keystore'u build/temp dışında kalıcı ve Git dışı konuma taşı. Eski anahtar yoksa veri kayıpsız update mümkünmüş gibi davranma; geçiş etkisini kullanıcıyla kararlaştırmadan uninstall uygulama.
- [x] SDK/JDK yollarını env/argümanlardan çöz ve preflight doğrula. Her native tool sonrası `$LASTEXITCODE` kontrolü; güvenli argüman aktarımı; çalışma dizinini finally geri yükleme. Build başarısızsa `public/UnityCompanion.apk` değişmemeli; kopyalama yalnız dex/manifest/imza doğrulandıktan sonra yapılmalı.
- [x] Node minimumunu package engines/README/launcher ile uyumlu belirle; mevcut lock için alt sınır en az 22.12.0 olacak şekilde desteklenen test matrisini oluştur. package/lock adı ve version uyumunu düzelt; tool binary/source sürüm ve checksum kayıtlarını oluştur. `npm audit`/dependency değerlendirmesini o günkü verilerle yap; bu incelemede belirli CVE varlığı iddia edilmedi.
- [ ] İki build'in signer fingerprint'i aynı olmalı; ikinci APK ilkini uygulama verisi korunarak güncelleyebilmeli. Bozuk Java kaynağı, eksik SDK, boşluklu kullanıcı/proje yolu ve temiz clone `npm ci` senaryoları geçmeli. Android build/kurulum bu plan oturumunda çalıştırılmadı.

## T21 — Unity entegrasyonunda hata ayrımı ve istek ömrü [P2]

**Dosyalar:** `plugins/Editor/UnityDropBuildHook.cs:16–51`; `plugins/Editor/UnityDropWindow.cs:22–44,101`; `server.js:2389`; Unity Editor doğrulaması.

**Bulgu:** Hook JSON'u yalnız backslash kaçar; quote/control karakterli path bozulabilir. HTTP content/response dispose edilmiyor; bütün hatalar sessiz. Window açılışta iki status sorgusu yapabiliyor; refresh istekleri yarışabilir ve kapanmış pencereye dönebilir. Port her yerde 4500 sabit.

- [x] Başarılı Android APK build, AAB, başarısız build, quote/Unicode path, offline hub, 400/500, kapanan pencere ve hızlı refresh senaryolarını tanımla.
- [x] Unity'nin mevcut JSON serializer'ı ile küçük DTO kullan; `StringContent`/response dispose et. Beklenen hub-kapalı durumunu build hatası yapma; hub işleme/protokol hatasını tek açıklamalı uyarı olarak ayır. Hook+watcher dedupe T07 üzerinden tek install üretmeli.
- [x] Status için T18 health sözleşmesini kullan; tek aktif request veya request generation/cancellation uygula. Kapanmış pencereye UI güncelleme yapma; endpoint/port ayarı hook ve window arasında tutarlı olsun. Yalnız dokunulan C# alan/metotları AGENTS.md naming ve region kurallarıyla düzenle.
- [ ] Desteklenen Unity sürümünde Editor compile ve yukarıdaki manuel senaryolar geçmeli; hub kapalıyken build sonucu değişmemeli. Gerekmedikçe yeni manager/service veya dosya oluşturma.

## T22 — Regresyon, performans bütçesi ve GitHub sürüm kapısı [P1]

**Dosyalar:** `tests/adb-pairing.test.js` ve T03–T18'de listelenen testler; `tests/helpers/server-harness.js` gerekirse; `.github/workflows/ci.yml` oluşturulacak; `package.json`, `package-lock.json`, `README.md`; release notları.

**Bulgu:** Mevcut testler bazı fonksiyonları kaynak metninden keserek izole ediyor. Gerçek dosyanın sonundaki helper override'ı, route middleware hataları, gerçek UI event zinciri ve native lifecycle bu şekilde gözden kaçabiliyor. Otomatik build/CI workflow'u yok.

- [x] Mevcut 60 test korunarak yeni regresyonları ekle. Fake ADB/process/filesystem ile deterministik timeout/race testleri kur; test gerçek config, ADB veya kişisel dosyalara dokunmasın. Testlerin en az bir kısmı tam script yükleme sırası ve gerçek HTTP middleware zincirini içersin; sadece source substring/regex kontrolüne dayanmasın.
- [ ] Windows CI'da desteklenen Node sürümleriyle `npm ci`, syntax check ve `npm test` çalıştır. Android build için toolchain ve imza doğrulamasını ayrı doğrulanabilir job yap; signing secret'ları repoya koyma. Browser DOM entegrasyonu için mevcut araç yeterliyse onu kullan; yeni test dependency ancak kapsam/maliyet gerekçesiyle eklenir.
- [ ] Aşağıdaki cihaz ve performans matrisini çalıştır, önce/sonra aynı ortam sonuçlarını kaydet. CPU, RSS, heap, event-loop p95/p99, ADB process/dakika, açık handle, WS buffered byte ve transfer hash ölç; tek bir “hızlandı” yorumu yeterli değildir.
- [ ] Kullanıcı değişikliklerini geri almadan dilim bazlı diff/review ve commit'leri hazırla. P0/P1 kabul testleri kapanmadan release çıkarma. Son kapsam belli olunca semver'i package/lock ve Companion versionCode/versionName ile tutarlı güncelle; kesin sürüm numarası bu planla atanmadı.
- [ ] Temiz clone kurulum, önceki config migration, mevcut Companion üzerine update ve 30 dakikalık karma kullanım geçince release notları/checksum hazırla. GitHub push/tag/release sonraki uygulama talebi kapsamında yapılacak; bu oturumda yapılmadı.

## Anlamlı hata mesajları için örnek kabul sözlüğü

| Kod / durum | Kullanıcıya gösterilecek örnek | Davranış |
|---|---|---|
| `ADB_NOT_FOUND` | “ADB bulunamadı. Android Platform-Tools yolunu ayarlayıp tekrar deneyin.” | Dosya transfer arayüzü açılmaya devam eder |
| `DEVICE_OFFLINE` | “Seçtiğiniz telefonun bağlantısı kesildi. Kablosuz hata ayıklamayı kontrol edip yeniden bağlanın.” | Başka telefona otomatik gönderilmez |
| `DEVICE_UNAUTHORIZED` | “Bu bilgisayar için hata ayıklama izni gerekli. Telefonda izni onaylayın veya yeniden eşleştirin.” | Pairing/izin eylemi sunulur |
| `PAIRING_FAILED` | “Eşleştirme tamamlanamadı. Kodun güncel olduğunu ve eşleştirme ekranının açık kaldığını kontrol edin.” | Ağ hatası kesin olarak yanlış kod diye etiketlenmez |
| `DEVICE_BUSY` | “Bu telefon için bir işlem sürüyor. Tamamlanmasını bekleyin.” | Çift komut/kayıt oluşmaz |
| `saved` | “Dosya PC'ye kaydedildi. Telefona gönderilmedi; önce bir telefon bağlayın.” | Başarıyla aktarılmış gibi gösterilmez |
| `transferring` | “Dosya seçili telefona gönderiliyor…” | Sonuç beklenir, hata rengi kullanılmaz |
| `TRANSFER_FAILED` | “Aktarım tamamlanamadı. PC'deki dosyanız korunuyor; bağlantıyı kontrol edip yeniden deneyin.” | Hata detayı ayrı, retry kontrollü |
| `UPLOAD_TOO_LARGE` | “Dosya, izin verilen 2000 MiB sınırını aşıyor.” | Sınır UI/server ile aynı byte değerinden gelir |
| `DISK_FULL` | “PC'de dosyayı kaydetmek için yeterli boş alan yok.” | Yarım dosya temizlenir, tamamlandı denmez |
| `INSTALL_SIGNATURE_MISMATCH` | “Telefondaki uygulama farklı bir imzayla kurulmuş. Aynı imzalı APK kullanın.” | Otomatik uninstall yapılmaz |
| `INSTALL_SDK_UNSUPPORTED` | “Bu APK telefonunuzun Android sürümüyle uyumlu değil.” | Genel kurulum hatasından ayrılır |
| `TOOL_MISSING` | “Ekran yansıtma için scrcpy bulunamadı. Araç yolunu ayarlayın.” | Yalnız ilgili özellik devre dışı kalır |
| `PERSISTENCE_FAILED` | “Değişiklik diske kaydedilemedi. Klasör yazma iznini ve boş alanı kontrol edin.” | Kaydedildi/unutuldu iddiası yapılmaz |

## Gerçek cihaz ve ağ test matrisi

| Alan | Zorunlu senaryolar | Geçiş ölçütü |
|---|---|---|
| Telefon kimliği | Tek telefon; aynı telefon USB+Wi-Fi; IP+mDNS; IPv4+IPv6; aynı model iki telefon | Tek fiziksel kayıt; iki gerçek telefon ayrı |
| Ağ değişimi | DHCP IP/port değişimi, Wi-Fi kapat/aç, hotspot, VPN, mDNS engelli ağ | Eski IP başka telefona işlem yaptırmaz; manuel recovery çalışır |
| Yetki | Yanlış/eskimiş code, pairing dialog kapalı, authorization iptali, forget+restart | Açıklamalı hata; unutulan telefon kendiliğinden dönmez |
| Yarış | Çift tıklama, iki sekme, connect sırasında disconnect/forget, eski HTTP cevabı | Son kullanıcı tercihi korunur; tek yan etki |
| Transfer | 0 byte, küçük dosya, 1 GiB, sınır/sınır+1, 50/51 dosya, aynı ad, Unicode | Hash doğru, limit açık, partial cleanup, kayıpsız kuyruk |
| Yayın/pano | İki telefon, hedef değiştirme, iki istemci, rotation, 20 aç/kapat, network loss | Yanlış hedef yok; sahip olunan süreçler dışında etki yok |
| Kurulum | ADB/aapt/scrcpy eksik, disk dolu, port dolu, Node uyumsuz, boşluklu yol | Çökme/sonsuz bekleme/sahte başarı yok |
| Kalıcılık | Eski config, bozuk JSON, yazma reddi, işlemin ortasında restart | Son sağlam veri korunur; yarım işler açık görünür |
| Companion | Picker cancel/multi-select, izin dönüşü, Activity recreation, üstüne update | Kaynak sızıntısı ve veri kaybı yok |

## Performans ölçüm protokolü ve hedefler

Ölçümler aynı PC/telefon/router ile, 60 saniye ısınma ardından en az 5 dakika toplanacak. Birinci ölçüm mevcut sürümün baseline'ı olacak. Aşağıdakiler **önerilen kabul hedefleri**, şu an elde edilmiş sonuçlar değildir.

- **Idle:** 0/1/2 telefon ve 1/5 web istemcisi. ADB komut sayısı istemci sayısıyla büyümemeli; baseline'a göre en az %50 azalma hedefi. UI cihaz güncelliği korunacak.
- **Dosya sayısı:** 100/1.000/10.000 received/watch girdisi. `/api/transfers` GET ve WS reconnect disk write yapmamalı. `/api/health` loopback p95 <100 ms; normal yükte event-loop p95 <50 ms başlangıç hedefi.
- **Toplu aktarım:** 20 dosyada PC upload en fazla 2; telefon başına ADB veri işlemi 1. 1 GiB dosyada RAM dosya boyutuyla doğrusal büyümemeli; timeout ve hashing maliyeti ölçülmeli. Throughput aynı ağ baseline'ına göre %10'dan fazla düşerse neden açıklanıp yeniden değerlendirilir.
- **Screen stream:** 10+ dakika, yavaş alıcı ve kopma. Kuyruk için T13 sınırları geçerli; yalnız bir sahipli encoder/transport. Çözünürlük/bitrate/FPS iddiası ölçüm olmadan release notuna yazılmamalı.
- **Kaynak ömrü:** 100 capture/chime, 20 mirror/pano aç/kapat, 20 cihaz reconnect. Temizlik sonrası açık URL/context/process/timer sayıları başlangıca dönmeli; 30 dakikalık oturumda açıklanamayan sürekli RSS/heap yükselişi olmamalı.
- **Android progress:** En fazla 10 UI progress güncellemesi/saniye; son yüzde ve tamamlanma doğru. Connection timeout/read timeout testleri sonsuz modal bırakmamalı.

## Bu planın tamamlanma ve uygulamanın bitiş tanımı

Planın çıktısı: kaynak kanıtları, 22 uygulanabilir iş, hata sözlüğü, test matrisi ve ölçüm hedefleri. Uygulamanın bitişi: P0/P1 işleri ve ilgili regresyonlar kapanmış, P2 performans sonuçları kaydedilmiş, temiz kurulum/migration/Companion update geçmiş ve sonraki GitHub sürümü için diff ile release notları gözden geçirilmiş olmalıdır.

Bu incelemede gerçek telefon/Electron/Unity/Android build çalıştırılmadı; cihazdaki hata sıklığı, RAM/CPU değerleri ve ağ throughput'u ölçülmedi. Kontrol edilen syntax ve 60 test sonucu ile izole yeniden üretimler, bunların yerine geçmez.
