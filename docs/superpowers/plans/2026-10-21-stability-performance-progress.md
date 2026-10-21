# SDD ledger — plan: docs/superpowers/plans/2026-10-21-stability-performance-fix-plan.md

## Uygulama kararları

- Ruling: Planın yalnız inceleme kısıtı yeni uygulama talebiyle kaldırıldı. Kullanıcının açık talebi doğrultusunda mevcut kirli checkout kullanılıyor; worktree, alt ajan, commit, push veya release yapılmıyor. Değişiklikler review için çalışma ağacında kalıyor.
- Ruling: Skill shell yardımcıları yerine Windows üzerinde bu ledger ve node:test kullanılıyor. Plan standart task-start biçiminde değil; 22 işin checklist ve kanıtları burada izleniyor.
- Pre-flight: T05 hata / T10 persistence → T01 migration → T02/T03 hedef; T06 revision → T07 auto-install; T03/T05/T10 → T08/T09; T03 → T13–T15; T04/T18 → T19/T21. Paylaşılan sözleşmeler planla uyumlu; tüketiciler birlikte taşınacak.

## Doğrulama

- T10 temeli: tam server.js yükleyen sahte disk/process/network harness. writeFailureIsNotReportedSaved, invalidConfigTypesAreRejected, atomicReplacePreservesLastGoodState, transferGetDoesNotWriteToDisk: önce 4 FAIL, düzeltme sonrası 4 PASS. Atomik temp/replace + .bak, bozuk config üzerine yazmayı engelleme, GET disk yazısını kaldırma. T10 tamamı henüz bitmedi.


## Uygulanan dilimler (son cihazsız doğrulama aşağıda; release kabulü değildir)

| İş | Kod ve kanıt | Açık kabul |
|---|---|---|
| T01 | Serial doğrulama, USB/Wi-Fi tek satır/transports, dual-stack service tekilleştirme, belirsiz kimlik pending, sürümlü/idempotent migration + .bak. Alias/concurrent/unknown serial testleri RED→GREEN. | Gerçek USB+Wi-Fi, DHCP/IP devri ve aynı model iki telefon |
| T02 | Remember mutation await sonrasına taşındı; mutation version eski sonuçları reddediyor; seçim fallback kaldırıldı; QR cancel inactive; kalıcı reconnect tercihi README ile uyumlu. | Gerçek telefonda 20 reconnect/disconnect ve ağ değişimi |
| T03 | ADB shell exec kaldırıldı; argüman listesi, zorunlu online hedef, IPv6, typed error, output/deadline sınırları. Veri işleri serial bazlı kuyrukta ve başlangıçta kimlik tekrar doğrulanıyor. | Gerçek ADB/Android sürümlerinde komut matrisi |
| T04 | Yerel dosyada saklanan bootstrap, HTTP-only admin/mobile cookie ayrımı, Host/Origin + WS denetimi. Reverse loopback admin değildir; Unity ayrı yerel header ister. Gerçek HTTP middleware + mobil INIT testleri geçti. | Android reverse + Unity canlı entegrasyon |
| T05 | Async Express wrapper, typed JSON error middleware, requestJson, stop HTTP başarısı kontrolü; transfer terminal olayları ayrıldı. | Gerçek cihaz hatalarının son kullanıcı akışı |
| T06 | Canonical path SHA-256, pending registration dedupe, size+mtime revision, metadata unknown; PC/mobile upsert ve 50 sınırı. Install sabit kopyadan; revision değişimi reddediliyor. | Doğru dosyanın gerçek cihazda kurulması/indirilmesi |
| T07 | Startup/mobile upload auto-install tetiklemez; watcher+hook aynı revision dedupe. Watcher swap seri ve superseded ara klasör atlanır; unlink/error handling. ZIP son kaydı eksik/bozuk APK reddediliyor; offset-zero hang regresyonu kapandı. | Ağ klasöründe/cihaz build akışında saha doğrulaması |
| T08 | UUID, persist-before-push, queued/transferring/saved/error, tek requestId reservation; kuyrukta kaybolan hedef error olur. Slow/failure/double request testleri RED→GREEN. | Gerçek telefon bağlantı kopması ve retry |
| T09 | UUID .part adları, single file/50 files, PC concurrency=2, server aktif upload sınırı=4; mobile snapshot+isUploading; UTF-8 dosya adı düzeltmesi. Gerçek multipart paralel aynı ad/hash, alan reddi ve abort cleanup testi geçti. PC büyük dosyayı ağdan önce reddeder, upload deadline 15 dakika. | Gerçek 1 GiB LAN aktarımında throughput/hash ve disk baskısı |
| T10 | Atomic temp/rename+.bak, save hatası caller'a gider, config rollback, bozuk JSON üzerine yazma engeli; GET/WS disk taramaz. Received add/change index ve nested wireless tip doğrulaması eklendi. Dashboard session dosyası da atomic replace kullanır. | Gerçek kullanımda restart/disk izinleri; 10.000 dosya ve recovery fixture doğrulandı |
| T11 | Silme hatasında kayıt korunur, açma kayıt id/canonical root ister; screenshot PNG kontrolü, iki klasör birlikte mtime sıralaması, implicit capture kaldırıldı; stream pipeline. | Telefonda screenshot/pull/download |
| T12 | Shared poll, 20 sn battery cache, reverse yeni transport'ta; charging snapshot ve QR URL cache. Deterministik sayaç testleri geçti. | 0 telefon yerel ölçüm tamam; gerçek 1/2 telefon ADB-per-minute/TTL/ağ değişimi |
| T13 | Session owner/process nesnesi; stop-before-start, stale callback guard, 4/1 MiB backpressure ve 5 sn stall; global pkill yok; UI hedef değişiminde durur. | Gerçek cihazda 10+ dakika, rotation, iki browser ve yavaş LAN |
| T14 | Doğrudan scrcpy -s, process handle, spawn/error/status; yalnız sahip olunan process kill. Fake process testi RED→GREEN. | Araç checkout'ta yok; iki gerçek telefon/harici scrcpy |
| T15 | UTF-8/BOM framing, latest-only kuyruk, başarı sonrası dedupe/retry/generation; 64 KiB geçici payload ve doğrulanmış jar cache. ClipWatch timer retry kaynak/exe. | 64 KiB payload protokolü ve 20 gerçek mode değişimi |
| T16 | Duplicate escapeHtml kaldırıldı; cihaz kartları DOM text node, mobile quote escaping, download URL id'den; privacy QR/URL/tooltip. 100 APK upsert ve gerçek Electron render testleri geçti. | Gerçek kullanımda privacy kontrolü; adversarial DOM ve capture delegation geçti |
| T17 | Patch config, revision/dirty folder uzlaştırma; late battery guard, geç bağlantıda phone handler; WS reconnect/backoff/parse; URL revoke, 50 capture; chime context close. 650 px taşma gerçek render'da düzeltildi. | Gerçek iki sekme/izin davranışı; 100 capture/chime fixture ve dar pencere doğrulandı |
| T18 | Health ADB'siz; Electron probe identity+deadline; readiness/retry; PORT validation; launcher errorlevel/Node check; sahipli shutdown. Eski Electron kodunda timeout/identity FAIL, yenide PASS. | 20 izole canlı sunucu döngüsü ve launcher hata matrisi tamam; kullanıcının günlük desktop ortamı |
| T19 | Picker/cancel/multi, origin sınırı, cookie ile download, timeout/cancel/unique part, APK validation, 100 ms progress, Activity cleanup ve provider canonical root. Java/resource/dex build geçti. | Android cihaz/Activity recreation/izin/disk/1 GiB |
| T20 | Kalıcı dış keystore konumu, native exit kontrolleri, verify-before-replace, ValidateOnly; Node >=22.12, lock adı uyumlu. chokidar 4.0.3 / multer 2.4.0; temiz npm ci ve ağ erişimli audit 0 bulgu. | Companion binary güncellemesi kapsam dışında; gerçek cihazda update yapılmadı |
| T21 | JSON DTO/dispose, health, tek request/cancel, kapanış guard, ortak port; yerel hook header. Unity 6000 API referanslarıyla C# derlemesi geçti. | Gerçek Unity Android build + hub hook akışı; Editor compile ve 20 pencere lifecycle geçti |
| T22 | Eski 60 test korundu; toplam 173 test, tam server/script harness, gerçek HTTP/multipart/hash/watcher ve Electron 650/980 render eklendi. Windows Node 22/24 + UI + Android ValidateOnly CI hazır. İzole klasörde temiz npm ci geçti. | Uzak CI push yasağı nedeniyle çalıştırılmadı; cihazlı 30 dakika ve release kapıları açık |

## Ek kararlar ve maliyetleri

- Ruling: Kullanıcının alt ajan açmama talebi nedeniyle son inceleme self-review olarak yapılacak. Bağımsız reviewer yok; merge/release için ikinci göz hâlâ değerli.
- Ruling: adb reverse nedeniyle IP/UA tabanlı yetki yeterli değil. Yerel bootstrap ve ayrı Unity header kullanıldı; manuel panel açmak için npm run panel, Unity için Hub Folder ayarı gerekiyor. Maliyeti bir yerel session dosyası ve küçük open-dashboard.js helper'ı.
- Ruling: APK kurulumu sabit kopyadan yapılıyor. Build sırasında yanlış revision kurulumunu engeller; büyük APK için ek disk alanı ve I/O gerekir, gerçek throughput henüz ölçülmedi.
- Ruling: clip.jar kaynağı yok; protokolü tahmin ederek yeniden yazmak yerine pano metnine açık 4 KiB sınırı kondu. Büyük metin dosya olarak aktarılmalı; T15'in stdin/temp payload işi açık.
- Ruling: Watcher polling ölçüm yapılmadan kapatılmadı. Doğruluk korunuyor; P2 idle hedefi ölçülmüş sayılmıyor.
- Ruling: Dağıtılan Companion SHA-256 signer: 6055544704576c284ddca0e019fca243cf16571b1dfddd6220576dcd1ffad128. Eski anahtar bulunmadığı için public APK değiştirilmedi ve yeni anahtar üretilmedi. Uninstall/update geçişi uygulanmadı.
- Harness düzeltmesi: Tam script fixture'ında os/dgram de stub edildi; testler LAN keşfi açmaz. HTTP/multipart testleri yalnız loopback ve kendilerine ait geçici dizin kullanır.

## Kaydedilen doğrulamalar

- Node v24.13.1: npm run check geçti.
- npm test sandbox'ta spawn EPERM; sandbox dışı izinli son tam çalıştırmada **122/122 geçti**, 0 fail/skip. npm run check de geçti.
- node --test --test-isolation=none son ara çalıştırmalarında tüm testler geçti.
- Electron UI: 980 px body/client 965/965; 650 px önce 751/635 taşma, düzeltmeden sonra 635/635. Cihaz kartında gerçek img elementi 0; fixture kartı 1. Privacy QR visibility testi geçti. Bu bir performans benchmark'ı değildir.
- Android build-companion.ps1 -ValidateOnly: resources/Java/dex geçti, deprecated API/bootstrap classpath uyarıları var. Public APK korunuyor.
- Unity C#: kurulu Unity 6000.0.72f1 Roslyn + API reference assembly'leriyle compile geçti. Unity Editor açılmadı.
- ClipWatch.cs Windows .NET csc ile derlendi; tools/clipwatch.exe güncellendi. Gerçek pano içeriği okunmadı.
- Audit düzeltmesi: ağ kısıtlı ortamın ilk 0 sonucu güvenilir kabul edilmedi. Ağ erişimli temiz kurulum/audit, braces üzerinden chokidar için 2 high bulgu verdi ([advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)). chokidar 4.0.3 glob bağımlılığını kaldırır; proje literal klasör izlediği için API geçişi küçüktür. Desteklenmeyen multer 1.x de 2.4.0'a taşındı. Son ağ erişimli npm audit toplam 0 bulgu; bu binary araçlar veya tüm ürün için güvenlik garantisi değildir.
- Son package/lock ile izole, kişisel veri içermeyen klasörde npm ci: 121 paket, exit 0, 0 audit bulgusu. Gerçek chokidar add/change/unlink testi brace içeren literal klasörü de kapsar; multipart abort/hash testleri yeni multer ile geçti.
- Son Unity API-reference compile exit 0, uyarısız. Son Electron 650/980 render exit 0; taşma yok. git diff --check exit 0 (Git yalnız mevcut CRLF dönüşüm uyarıları veriyor). public/UnityCompanion.apk için diff yok.

## Son self-review ve açık sınırlar

- Ruling: Kullanıcı alt ajan istemediğinden bağımsız reviewer kullanılmadı. Beş Review Focus alanı diff ve testler üzerinden tekrar incelendi.
- Kimlik/hedef: aynı serial transport birleştirmesi, aynı model farklı serial ayrımı, eski IP'nin yeni telefona devredilmemesi ve hedef kaybolunca fallback yapılmaması testlerle kontrol edildi. İki fiziksel telefonda USB/Wi-Fi/DHCP matrisi açık.
- Ters sonuç sırası: remember yarışları, disconnect sırasında eski poll, geç config yanıtı ve iptal edilmiş QR callback testleri geçti. T02'de ortak lifecycle sahipliği ve bütün işlem kombinasyonları henüz kapanmadı.
- Dosya bütünlüğü: gerçek multipart aynı-ad hash ve abort cleanup, yarım/bozuk APK, atomic persistence ve sabit install revision testleri geçti. Telefonda aynı adlı dosya collision politikası, retry UI, 2000 MiB/51 dosya/dolu disk matrisi açık.
- Araç hataları: missing ADB, hedef doğrulama, Electron deadline/yanlış uygulama, scrcpy handle ve shutdown testleri geçti. Tüm eski UI handler'larının ortak helper'a taşınması ve tam hata/abort matrisi açık.
- Oturum/kaynak: stream owner, stop-before-spawn, backpressure, clipboard generation ve ObjectURL cleanup kontrol edildi. 20 gerçek döngü/10 dakika stream/30 dakika karma kullanım ölçülmedi; large clipboard protokolü açık.
- Son incelemede iki ek hata RED→GREEN kapatıldı: yapılandırılmış launch hatasının `undefined` görünmesi ve dashboard session dosyasının yarım yazılabilmesi. Önceki regression eklerinde büyük upload deadline/limit ve background error toast da RED→GREEN doğrulandı.
- Dağıtım APK'sı kullanıcının açıklaması doğrultusunda korunuyor; imza dosyası tekrar istenmeyecek. Commit/push/tag/release yapılmadı. Açık maddeler nedeniyle 22 işin tümünün bittiği veya sürümün yayına hazır olduğu iddia edilmiyor.

## Telefon gerektirmeyen kalan işler — 21 Ekim devamı

- Ruling: Kullanıcı kalan cihazsız işleri tamamlamayı istedi. Önceki APK/anahtar, commit/push/release ve alt ajan kısıtları korunuyor. Donanım sonucu tahmin edilmeyecek.
- T02: Ortak lifecycle busy kontrolüne disconnect/reconnect dahil edildi. Disconnect tamamlanmadan ikinci disconnect veya connect başlamaz. Config seçimi için ayrı version, geç connect/pair sonucunun açık kullanıcı tercihini ezmesini engeller. Yeni iki yarış testi RED→GREEN; eski 60 regresyon korundu.
- T03/T05: HTTP client disconnect için AsyncLocalStorage üzerinden AbortSignal ortak ADB runner’a aktarılıyor. Kabul edilmiş arka plan transferleri yanıt bitti diye iptal edilmez. Gerçek Node child process ile deadline ve literal shell karakteri testleri geçti; gerçek ADB çağrılmadı. PC fetch çağrıları ortak JSON/HTTP/timeout helper’ına taşındı. Caller abort + deadline birlikte çalışır.
- T08/T10: Kesilmiş/hatalı kaydı aynı id ve özgün telefon serial’iyle yeniden deneme API/UI eklendi; çift retry tek push üretir. Eski serial’siz kayıtlar otomatik hedeflenmez, yeniden yükleme açıklaması verir. Bozuk transfer schema’sı başlangıcı çökertmez; .bak varsa yalnız okumak için yüklenir, bozuk asıl dosya korunur. Restart interrupted ve screenshot id testleri geçti.
- T09: PC kuyruğu 100 bekleyen iş, aktif upload 4, UI upload 2, mobil toplam istek 4000 MiB ve 50 dosya, dosya başına 2000 MiB sınırı. Sınır byte sayacı bütün dosyaları toplar. Field/part limitleri de var. Mobil HTTP 200 + success:false kuyruğu silmez. Mobil APK unlink ve sayfa kapanışında XHR/WS cleanup eklendi.
- T11: Bozuk PNG boyutları reddediliyor; Companion indirmesi de pipeline/error/abort cleanup kullanır. Akış hatası testleri RED→GREEN. Silme canonical kayıt kökünü doğrular.
- T13/T18: İkinci stream izleyicisi busy sonucu alır; 20 sahte encoder döngüsünde eski callback yeni işi bozmaz. Electron ready-to-show listener load’dan önce bağlandı. Recovery eski pencereyi temizlerken uygulamayı yanlışlıkla kapatmaz.
- T15: 64 KiB üst sınır; büyük base64 payload özel UUID geçici dosyada taşınır, Android tarafında mevcut jar protokolüne cat ile verilir. Host argümanları sabit boyutludur, iki geçici kopya finally’de temizlenir. Küçük metin hızlı yolunu korur. Jar cache serial ile doğrulanır, 60 saniye ve 100 kayıtla sınırlıdır; mode kapatmada temizlenir. Maliyet: büyük metin başına ek push ve cleanup; Android uygulaması fiziksel testte doğrulanacak.
- Ara doğrulama: 144/144 test ve syntax geçti; devamındaki dosya/stream/native testleri kendi paketlerinde geçti. Son tam paket tekrar çalıştırılacak.
- Gerçek loopback HTTP/WS + gerçek disk/chokidar, fake ADB/UDP ile 20 sunucu lifecycle ve 100/1000/10000 dosya ölçüm aracı tests/local-validation.cjs eklendi. Beş dakikalık ölçüm devam ediyor; sonuç çıkmadan performans kazanımı iddia edilmiyor.

## Son cihazsız kabul — 21 Ekim 2026

Cihazsız kod düzeltmeleri ve bu ortamda yapılabilen yerel doğrulamalar tamamlandı. Ana plandaki açık kutuların bir kısmı aynı satırda gerçek cihaz/haricî ortam kabulünü de içerdiği için açık bırakıldı; bunlar otomatik olarak başarısız kod işi sayılmamalı. Gerçek telefon, gerçek LAN throughput'u, canlı UNC share, imzalı Companion update ve uzak GitHub CI/release kabulü tamamlanmış değildir.

| Kontrol | Sonuç |
|---|---|
| Node 24.13.1 npm run check + npm test | 173/173 PASS, 0 fail/skip |
| Node 22.23.3 tam test paketi | 173/173 PASS, 0 fail/skip |
| Electron gerçek DOM/render | APK ve aktarım sekmeleri, 650/980 px: taşma yok; unsafe img/script yok; retry dataset ve capture open/delete delegation çalışıyor; privacy geçti |
| Kaynak ömrü | 100 capture ekle/sil URL sayısı başlangıca döner; aynı milisaniye id çakışması RED→GREEN; 100 chime context kapanır; 20 fake encoder döngüsü eski callback'leri reddeder |
| Sunucu yaşam döngüsü | Gerçek loopback HTTP/WS + gerçek disk/chokidar, fake ADB/UDP ile 20 aç/kapat; HTTP dinleme, WS istemcileri ve sahipli tool handle'ları kapanır |
| Başlatıcı | İzole fake araçlarla Node yok/eski ve npm ci başarısız: exit 1; desktop/server başlamaz, sessiz mod beklemez |
| Unity 6000.0.72f1 | İzole projede gerçek Editor import/compile; 20 pencere aç/kapat, paralel status engeli, Unicode/quote JSON round-trip: PASS |
| Android kaynakları | Boşluklu Türkçe fixture dizininde resource/Java/dex ValidateOnly PASS; bozuk Java ve eksik SDK reddedildi; yalnız mevcut deprecated/source-8 uyarıları |
| APK | public/UnityCompanion.apk Git blob hash'i HEAD ile aynı; binary değiştirilmedi |
| Kurulum/dependency | Son dependency lock ile izole npm ci PASS; ağ erişimli npm audit 0 bulgu (önceki doğrulama); yeni production dependency eklenmedi |

### Yerel ölçüm (telefon performansı değildir)

- 100 / 1000 / 10000 received dosyasında başlangıç: 22,4 / 38,1 / 382,4 ms; son 100 geçmiş kaydı index'lendi. Gizli/part dosyalar hariç. Canonical path Set index'iyle tekrar aramalar azaltıldı.
- 10.000 dosya, 300 saniye, önce 1 sonra 5 gerçek WebSocket istemcisi: health p95 4,31 ms, p99 12,85 ms; transfers p95 4,05 ms; event-loop p95 32,05 ms, p99 32,24 ms. GET/WS geçmiş dosyasını değiştirmedi.
- Fake ADB cihaz sorguları 5 dakikada 75; 1→5 istemci geçişinde cadence artmadı. Gerçek telefon başına komut/dakika veya %50 iyileşme iddiası yok.
- RSS 30. saniyede ~144 MiB, 300. saniyede ~153 MiB; heap GC sonrası azalıyor. Açık kaynak sayısı 10015→10023 değişti (4 ek loopback istemci); WS buffered bytes 0. Bu kısa gözlem, 30 dakika cihazlı leak testinin yerine geçmez.
- Aynı 10.000 dosyada 3 saniyelik watcher örneği: polling 969 ms CPU / 1727 ms algılama; native CPU ölçüm çözünürlüğünün altında / 2140 ms algılama. Native yerel diskte varsayılan; UNC veya hata halinde polling. BRQ_WATCH_POLLING=1 override var. Gerçek ağ share testi yapılmadı.
- Tekrarlanabilir araçlar: npm run validate:local ve npm run benchmark:watcher. Ham sonuçlar .validation/local-validation.json ve .validation/watcher-benchmark.json içinde.

### Son self-review düzeltmeleri ve kararlar

- Final review: self-review (kullanıcının alt ajan açmama talebi korunarak). Kimlik, ters işlem sırası, dosya bütünlüğü, araç hataları ve oturum sahipliği tekrar kontrol edildi.
- Final: fixed kaybolan eski servis kaydının tekil silinememesi — retiredServiceRecordCanBeForgottenByStablePhoneId RED→GREEN. UI boş serviceName yerine phoneId kullanır; boş isimler farklı serial tombstone'larını birleştirmez.
- Final: fixed seçim değişince eski pano hedefinin aktif kalması ve yeni araç yokken eski modun sürmesi — iki clipboard regresyonu RED→GREEN. Onaylanmış seçim değişiminde pano kapanır; yeni telefona otomatik taşınmaz.
- Final: fixed DNS goodbye/port değişiminden sonra eski endpoint'in kalması — gerçek DNS byte fixture ile TTL=0 + yeni SRV ve stale ADB cache testi RED→GREEN. Yeni doğrudan keşif aynı service/type için eski ADB cache'inden önceliklidir.
- Final: fixed kurulumun hedef çözümünde sessiz hata ve HTTP+WS çift terminal toast — ortak operationId, dış hata catch'i ve terminal dedupe testleri RED→GREEN.
- Final: fixed devam eden transferin geçmiş sınırında düşmesi, açık boş hedefin son server seçimine düşmesi — iki transfer regresyonu RED→GREEN. 100 in-flight + son 100 tamamlanmış kayıt sınırı var; yeni aktif işte kapasite doğrulanır.
- Final: fixed bozulan config/transfer için .bak'ın okunamaması ve okunamayan watchFolder'ın kaydedilmesi — koruyucu recovery/access testleri RED→GREEN. Bozuk asıl dosya otomatik değiştirilmez; backup yalnız görüntüleme için yüklenir, kayıt işlemi açık hata verir.
- Final: fixed bozuk/null JSON ve offline fetch'in ham TypeError göstermesi — request helper regresyonları RED→GREEN. Download/screenshot gövdesi de deadline kapsamındadır.
- Final: fixed 403/legacy catch'lerin ortak hata sözleşmesini kaybetmesi — gerçek HTTP middleware ve pairing/disk hatası testleri RED→GREEN. Özel dosya yolu/komut detayı kullanıcı mesajına sızmaz.
- Ruling: Uzun hata için yeni panel eklenmedi — mevcut sarılabilir toast + anlamlı message/action sözleşmesi korundu — maliyet: ayrı ayrıntı geçmişi sunulmaz; mimari/UI kapsamı büyümez.
- Ruling: Büyük dosya limitinin tam sınırını test etmek için 2 GiB kişisel disk doldurulmadı — aynı production limit offset'i 3 byte'a ölçeklenip gerçek multipart parser/disk yolunda 0/sınır/sınır+1 ve 51 dosya cleanup doğrulandı — maliyet: 1 GiB gerçek LAN throughput/hash hâlâ cihaz testi.
- Ruling: Native scrcpy binary bu checkout'ta yok — eksik araç 503 ve sahipli process davranışı fixture ile doğrulandı; binary indirilmedi — maliyet: gerçek native scrcpy çalışması kurulu araç/telefon gerektirir.
- Ruling: İmzalı Companion binary, semver, commit/push/tag/release bu talebin dışındaki önceki kısıtlarla korunuyor. Yerel Node 22/24 kontrolleri geçti; GitHub workflow'u uzak sunucuda çalıştırılmadı.
- Son paket: 173/173 Node 22 ve 173/173 Node 24 PASS. Açık cihazsız test hatası yok. Gerçek cihaz kabulü ve ikinci göz incelemesi tamamlanmış iddia edilmiyor.

### Araç/source SHA-256

| Dosya | SHA-256 |
|---|---|
| tools/ClipWatch.cs | DB34C35EECEE6343F6654E26C9D7CCA9D5E10748B7F4465B526DE72484404A80 |
| tools/clipwatch.exe | 3C305479917A82AC5CEBDB4630DD2FCB7C05D876B67C151F19BAD1693BB8C09B |
| tools/clip.jar | 74FE941E85EF9B8778FEBF19BCFF438B7360B86C027AA4A8C516D49CDB15AFAE |

### Telefonda kısa kabul listesi

1. Aynı telefonu USB + Wi-Fi ile bağla: tek kart gör; USB'yi çıkarınca Wi-Fi kalsın. İmkân varsa aynı model ikinci telefonda işlemler seçtiğin cihazda çalışsın.
2. Kod/QR ile eşleştir, QR beklerken iptal et. Disconnect sonrası uygulamayı yeniden aç: kendiliğinden bağlanmasın. Connect açsın; Forget sonrası yeni eşleştirme istesin. Wi-Fi/IP/port değişiminde yeniden dene.
3. İki farklı APK'yı indir/kur; aynı path'te yeni build üret: tek güncel kart ve tek install olsun. Unity kullanıyorsan Hub Folder'ı ayarla; hook + watcher çift kurulum yapmasın.
4. Mobil tarayıcıyla iki yönde küçük ve ~1 GiB dosya, aynı ad ve Türkçe ad dene. Aktarım ortasında Wi-Fi'yi kapat, yeniden bağlanıp Retry yap: yanlış telefona gitmesin, tek kayıt korunsun; dosya içeriğini/hash'ini karşılaştır. Telefon seçili değilken yalnız PC'ye kaydedildi yazsın.
5. Web ekranını 10+ dakika aç, telefonu döndür, dokunma/back/home ve ekran görüntüsü almayı dene. Siyah letterbox'a tıklama işlem üretmesin. İkinci pencere mevcut yayını kapatamasın; hedef değişiminde yayın dursun.
6. Pano iki yönde Türkçe/emoji ve >4 KiB metinle çalışsın. Modları değiştir, kapat; telefon seçiminde eski pano dursun ve yeni telefona kendiliğinden taşınmasın. 64 KiB üstü açık hata versin.
7. Privacy açıkken QR/adres/seri görünmesin. 20 bağlantı/yayın/pano aç-kapat ve toplam ~30 dakika kullanımda duplicate kayıt, takılı süreç veya sürekli bellek büyümesi olmasın.

Companion kaynak düzeltmeleri mevcut dağıtım APK'sına yazılmadı. Bu kabul listesindeki mobil aktarım testlerini mobil tarayıcı üzerinden yap; eski APK'da yeni native picker/lifecycle davranışı varmış gibi test sonucu bekleme.

- Son privacy regresyonu: hızlı connect status badge ve manuel connect toast içindeki adresler de maskIdentifier kullanıyor; privateQuickConnectNeverShowsRawAddressInStatusBadge RED→GREEN. Son tam paket Node 22/24: 173/173; Electron render tekrar PASS.
