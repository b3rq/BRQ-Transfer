# BRQ Transfer — İnceleme, Düzeltmeler ve Geliştirme Planı

Tarih: 2026-11-12 · Dal: `codex/web-file-transfer`

Bu belge üç şeyi anlatır: uygulamanın bugün nasıl çalıştığı, bu incelemede neyin
düzeltildiği ve sırada ne yapılması gerektiği. Plan, en az riskle en çok kazanç
getiren işler önce gelecek şekilde sıralandı.

---

## 0. Uygulama durumu (2026-11-13)

| Plan maddesi | Durum | Not |
| --- | --- | --- |
| Önce ölç | ✅ | `npm run bench`, `npm run bench:web` (başka bir kopyayla kıyas için `BRQ_BENCH_WEB_ROOT`) |
| 1.1–1.3 Web protokolü | ✅ | Yerel döngüde 15,0 → 18,7 MiB/s. Daha büyük parça/pencere ile 20–22 MiB/s; bu Chromium'un DataChannel tavanı. Asıl fark gecikmeli Wi-Fi'da beklenir, orada ölçülmedi. |
| 1.4 ADB çağrıları | ✅ | Gönderim başına ~8 → ~4 `adb.exe` |
| 1.5 `track-devices` | ✅ | İzleyici çalışırken yoklama 20 sn (pil) |
| 1.6 Geçmiş yazımını birleştirme | ⏸ Bilerek yapılmadı | Geri alma (rollback) davranışı eşzamanlı yazıma dayanıyor; kazanç küçük, risk yüksek. Faz 2'deki modül ayrımıyla birlikte ele alınmalı. |
| 1.7 Dosya başına yükleme | ✅ | Devam eden yükleme ile birlikte yapıldı |
| 2.1–2.2 Test altyapısı + `server.js` bölme | ⏸ Ayrı iş | Bu turda da üç değişiklik yalnızca testlerin kaynak kodu dilimlemesi yüzünden kırıldı (sorunun kanıtı). Davranış değiştirmeyen, kendi dalında yapılması gereken ~1 haftalık iş. |
| 2.3 Mesaj sözleşmesi | ✅ (test olarak) | `tests/message-contract.test.js`; ortak sabit dosyası modül ayrımına bırakıldı |
| 2.4 Hata kodları | ✅ Panel | Telefon sayfası hâlâ sunucu metnini gösteriyor |
| 2.5 `pc.js` bölme | ⏸ Ayrı iş | 2.1 ile aynı gerekçe |
| ADB'siz PC→telefon | ✅ | Telefon sayfasında "PC'den Al" sekmesi |
| Telefon erişim anahtarı | ✅ | QR anahtarı + panelden onay + sıfırlama. Companion APK artık ilk açılışta erişim isteği gösterir. |
| Devam eden yükleme | ✅ | 4 MiB parça, 2 paralel dosya, 1 saat içinde yeniden seçilince devam |
| Kurulum paketi | ⏸ Karar gerekli | `electron-builder` + imzalama + güncelleme sunucusu dağıtım kararı ister |
| STUN/TURN + IP sınırı | ✅ | `BRQ_WEB_ICE_SERVERS`, `BRQ_WEB_MAX_PER_IP`, `BRQ_WEB_TRUST_PROXY` |
| Tanılama | ✅ | `/api/diagnostics` + panelde kopyalama düğmesi |
| §5 küçük konular | ✅ | `DEVICES_UPDATED` atlama sorunu `track-devices` ile pratikte kapandı |

---

## 1. Uygulama bugün nasıl çalışıyor?

Projede birbirinden bağımsız üç parça var:

| Parça | Dosyalar | Ne yapar |
| --- | --- | --- |
| **Masaüstü merkez** | `server.js` (≈2750 satır), `electron.js`, `public/index.html`, `public/pc.js` | PC'de 4500 portunda çalışan Express + WebSocket sunucusu. ADB ile telefona dosya iter, APK kurar, kablosuz eşleştirme yapar, pano senkronu ve ekran yayını sağlar. Electron bunu masaüstü penceresi olarak açar. |
| **Telefon sayfası** | `public/mobile.html` | Telefon QR'ı okutunca açılan sayfa. Telefondan PC'ye dosya yükler (`received/`) ve APK listesini indirir. ADB gerektirmez. |
| **Web sürümü** | `web-server.js`, `web/app.js`, `web/protocol.js` | İki tarayıcıyı eşleştirip dosyaları **WebRTC** ile doğrudan aktarır. Sunucu yalnızca tanıştırma (signaling) yapar, dosya görmez. Port 4600. |

Veri akışı kısaca:

```
PC → Telefon : tarayıcı → POST /api/upload → uploads/ kopyası → adb push → /sdcard/Download
Telefon → PC : mobile.html → POST /api/upload/mobile-to-pc → received/
Web sürümü   : tarayıcı A ⇄ (WebRTC DataChannel, 16 KiB parçalar) ⇄ tarayıcı B
Durum        : sunucu her 4 sn'de `adb devices` çalıştırır, değişiklikleri WebSocket ile yayınlar
```

Genel değerlendirme: kod savunmacı yazılmış (yarış durumları için sürüm sayaçları,
atomik dosya yazma, kimlik doğrulaması, sınırlar) ve testler kapsamlı. Asıl
zayıflıklar **dev tek dosyalar**, **eşzamanlı işler arasındaki küçük durum hataları**
ve **aktarım hızını kısan protokol tercihleri**.

---

## 2. Bu incelemede düzeltilenler

### Sunucu (`server.js`)

| Sorun | Etkisi | Düzeltme |
| --- | --- | --- |
| PC→telefon yüklemelerinin `uploads/` kopyaları hiç silinmiyordu | Geçmişten kayıt silinince veya 100 kayıt sınırı aşılınca dosya diskte kalıyordu; klasör sınırsız büyüyordu (şu an 4,7 GB, tamamı geçmişte kayıtlı) | Kayıt silinince/kırpılınca kopya ve ona bağlı APK kartı da kaldırılıyor. Açılışta çökme artığı `.part`, `.install-*`, `.clip-*` dosyaları temizleniyor. |
| Windows'ta dosya zamanı karşılaştırması hiç tutmuyordu | NTFS milisaniyenin altını tuttuğu için her telefon yüklemesi izleyici tarafından ikinci kez indekslenip geçmiş tekrar yazılıyor ve yayınlanıyordu | Karşılaştırma 1 ms toleransla yapılıyor; yükleme kaydı dosyanın kendi zamanını kullanıyor. |
| QR eşleştirme şifresi `Math.random` ile üretiliyordu | ADB erişimi veren şifre tahmin edilebilir bir üreteçten geliyordu | `crypto.randomInt` kullanılıyor. |
| Telefon yüklemesinde kategori listesi ayrı kopyalanmıştı | `.flv`, `.m4v`, `.wma` gibi uzantılar iki yolda farklı sınıflanıyordu | Tek fonksiyon (`getTargetAndroidDir`) kullanılıyor. |
| Mobil tarayıcı tespiti iki farklı regex ile yapılıyordu | Bazı tarayıcılar mobil sayfayı alıp yükleme çerezini alamıyordu | Tek `isMobileUserAgent` fonksiyonu. |
| APK indirme adı yüzde-kodlu görünüyordu (`Oyunum%20v2.apk`) | Türkçe/boşluklu isimler bozuk iniyordu | `res.attachment()` (RFC 5987). |
| Cihaz izleyici her 4 sn'de her telefon için seri numarası soruyordu ve telefonları sırayla işliyordu | Her telefon için sürekli `adb.exe` süreci; yavaş bir Wi-Fi telefonu tüm listeyi geciktiriyordu | Seri numarası 30 sn önbelleklenir (bağlantı düşünce silinir), telefonlar paralel sorgulanır. Kritik işlemler hâlâ seriyi doğrudan doğrular. |
| Ekran yayını mesaj dinleyicisi ilk `await`ten sonra bağlanıyordu | Bağlanır bağlanmaz gönderilen "yayını başlat" kayboluyordu | Dinleyici en başta bağlanıyor. |

### Masaüstü paneli (`public/pc.js`) ve telefon sayfası (`public/mobile.html`)

| Sorun | Düzeltme |
| --- | --- |
| Her ilerleme olayında (saniyede bir) 100 kartlık liste baştan çiziliyordu; açık "Konum" detayı kapanıyor, Yeniden dene/Sil tıklamaları kaybolabiliyordu | Yalnızca ilgili kartın ilerleme çubuğu ve yazısı güncelleniyor. |
| "Telefon Bul" araması, rutin cihaz yayını gelince "Aranıyor…" durumunda takılıyordu | Arama yalnızca silme/bağlantı kesme ile geçersiz sayılıyor; geçersiz olursa durum sıfırlanıyor. |
| Panel yenilenince veya WebSocket yeniden bağlanınca eski "Cihaz bağlandı" sesi ve bildirimi tekrar çalıyordu | Açılış durumu sessizce uygulanıyor. |
| Ekran yayını bağlantı yokken "Başlatılıyor…"da sonsuza dek kalabiliyordu; eski oturumun "durdu" mesajı yeni yayını kapatabiliyordu | Bağlantı kontrolü, 15 sn zaman aşımı ve `streamId` eşleştirmesi. |
| Gizlilik modunda bağlantı kesme bildirimi IP:port'u açık gösteriyordu | Maskeleniyor. |
| Telefon değişince eski telefonun pil yüzdesi kalıyordu | Yeni değer gelene kadar temizleniyor. |
| İngilizce arayüzde telefondan dosya bildirimi Türkçe çıkıyordu | Dil sözlüğü kullanılıyor. |
| Telefonda arka arkaya yükleme yapılınca önceki yüklemenin zamanlayıcısı yeni ilerleme çubuğunu gizliyordu | Zamanlayıcı iptal ediliyor. |
| Telefon Wi-Fi'den düşerse yükleme sonsuza dek "yükleniyor"da kalabiliyordu | 60 sn ilerleme olmazsa yükleme iptal edilip hata gösteriliyor. |

### Web sürümü, Electron, başlatıcılar

| Sorun | Düzeltme |
| --- | --- |
| Telefon ağ değiştirince eski soket sunucuda ≤30 sn kalıyor, yeniden bağlanan sayfa `ROOM_BUSY` alıp **kalıcı olarak** bağlanmayı bırakıyordu (dokümandaki "otomatik yeniden bağlanır" vaadine aykırı) | Aynı tarayıcı kimliği kendi eski yerini devralabiliyor; yabancı kimlik yine reddediliyor. Test eklendi. |
| WebRTC `disconnected` durumu (çoğu zaman kısa Wi-Fi kesintisi) aktarımı anında öldürüyordu | 5 sn tolerans; yalnızca `failed` veya süre dolunca hata. |
| Electron'da sunucu açılamazsa "Yeniden dene" sonsuz döngüye giriyordu (modül önbelleği) | Uygulama kendini yeniden başlatıyor. |
| İkinci kopya açılınca kapanmadan önce pencere/sunucu başlatmaya çalışabiliyordu | Kilit alınamadıysa hiçbir şey başlatılmıyor. |
| Kapanışta takılan bir süreç uygulamanın kapanmasını engelleyebiliyordu | Kapanış 5 sn ile sınırlandı. |
| `start-hub.bat` UTF-8 BOM ile başlıyordu (`'﻿@echo' tanınmıyor` hatası) | BOM kaldırıldı. |
| `start.bat` yalnızca 3 paketi kontrol ediyordu; yeni bağımlılık eklenince `npm ci` atlanıp uygulama çöküyordu | `package.json`daki tüm bağımlılıklar kontrol ediliyor. |
| Bir test (`httpDisconnectCancelsOwnedAdbCommand`) tam test koşusunda 3 sn sınırına takılıp düşüyordu | Süre 15 sn yapıldı (testin kendisi değişmedi). |

**Doğrulama:** `npm run check`, `npm test` (214/214, 3 yeni test dahil), `npm run test:ui`,
`npm run test:ux` (46 ekran kontrolü) ve `npm run test:web` (gerçek iki Chromium
oturumu) geçti. Gerçek telefon, gerçek ADB ve Electron'un "yeniden dene / ikinci kopya"
yolları bu ortamda çalıştırılmadı; bunları elle bir kez denemek gerekir.

---

## 3. Optimizasyon planı

### Önce ölç

Şu an hiçbir yolun gerçek hızı ölçülmüyor. Bir şeyi optimize etmeden önce şu üç
sayıyı aynı ağda, aynı 1 GB dosyayla kaydedin (README'deki "30–80 MB/s" iddiası da
ancak böyle doğrulanır):

1. PC → telefon (`adb push`) MB/s
2. Telefon → PC (tarayıcı yükleme) MB/s
3. Web sürümü tarayıcı → tarayıcı MB/s

Bunun için küçük bir `npm run bench` betiği (dosya üret, gönder, süreyi yaz) yeterli.
Her optimizasyon bu tabloyla kıyaslanmalı.

### Faz 1 — Hızlı kazanımlar (1–3 gün, düşük risk)

| # | İş | Neden | Beklenen etki |
| --- | --- | --- | --- |
| 1.1 | **Web sürümü parça boyutu ve onay sıklığı**: 16 KiB → 64 KiB parça, her parça yerine her 256 KiB'de bir `ack` (dosya sonunda mutlaka), pencere 256 KiB → 2–4 MiB; alıcı sınırları da buna göre büyütülmeli | Şu an her 16 KiB için bir JSON onayı, bir `slice().arrayBuffer()` ve birkaç promise dönüşü var. LAN'da asıl darboğaz bu. | Tahminen 2–4 kat hız (ölçülmeli) |
| 1.2 | **Web sürümünde bekleme**: 12 ms `setTimeout` döngüsü yerine `bufferedamountlow` olayı ve `ack` ile çözülen promise | Arka plandaki sekmede zamanlayıcılar 1 sn'ye kısılır; aktarım çok yavaşlar | Arka planda donma biter, ön planda gecikme azalır |
| 1.3 | **Web alıcısında bellek**: kaydetme penceresi olmayan tarayıcılarda parçaları her 4–8 MiB'de bir `Blob`a katla | 100 MiB dosyada an itibarıyla ~200 MiB bellek; telefon sekmesi çökebilir | Tepe bellek yarıya iner |
| 1.4 | **Yükleme başına ADB çağrısı**: tek bir PC→telefon gönderimi, `push`tan önce ~8 ayrı `adb.exe` çalıştırıyor (`devices`, birçok kez `getprop ro.serialno`) | Her biri Windows'ta süreç başlatma + Wi-Fi gidiş dönüşü | Küçük dosyalarda gönderim başlangıcı 0,5–1 sn hızlanır |
| 1.5 | **Cihaz izleme**: 4 sn'lik `adb devices` yoklaması yerine `adb track-devices` (ADB'nin itme tabanlı akışı) | Boşta bile sürekli süreç; değişiklikler 4 sn geç görünür | Boşta CPU ≈ 0, anlık cihaz güncellemesi |
| 1.6 | **Transfer geçmişi yazımı**: her değişiklikte JSON girintili yazılıp ayrıca `.bak` kopyası alınıyor; yoğun anlarda birleştir (debounce 250 ms) | 50 dosyalık yüklemede gereksiz disk yazımı | Disk G/Ç azalır |
| 1.7 | **Telefon yüklemesini dosya başına yap**: 50 dosyayı tek multipart istek yerine 2–3 paralel tek dosyalık istekle gönder | Şu an biri başarısız olursa hepsi tekrar gider; dosya bazında ilerleme yok | Dosya bazında yeniden deneme ve ilerleme |

### Faz 2 — Yapıyı düzeltme (1–2 hafta, orta risk)

Bu faz hız değil **bakım kolaylığı** içindir. Bugün her yeni özellik 2700 satırlık tek
dosyaya ekleniyor ve testler bu dosyayı metin olarak dilimleyerek çalışıyor
(`tests/adb-pairing.test.js` içindeki `section(...)`). Bu yüzden bu incelemedeki
küçük değişiklikler bile testlerde "tanımsız değişken" hatası verdi.

1. **Önce test altyapısı**: testleri `vm` ile kaynak dilimleme yerine açık bağımlılık
   enjeksiyonuna taşıyın (`createServer({ adb, fs, clock })`). Bu yapılmadan dosyayı
   bölmek testleri kırar.
2. **`server.js`'i modüllere ayırın**:
   `adb/` (komut çalıştırma, cihaz listesi, kimlik), `wireless/` (keşif, eşleştirme,
   unutma), `transfers/` (geçmiş, kuyruk, push), `clipboard/`, `screen/`, `http/routes`.
   Her modül kendi durumunu sahiplensin; global `let` değişkenleri azalsın.
3. **Mesaj sözleşmesini tek yerde tanımlayın**: WebSocket mesaj tipleri ve alanları
   için ortak bir `shared/messages.js`. İncelemede istemcinin sunucunun hiç
   göndermediği `CLIPBOARD_SYNC_STATUS`'u dinlediği, sunucunun gönderdiği
   `SCRCPY_STATUS`/`APKS_UPDATED`'i ise istemcinin yok saydığı görüldü.
4. **Hata mesajlarını koda çevirin**: sunucu Türkçe metin yerine yalnızca hata kodu
   (`DEVICE_OFFLINE` gibi) göndersin, metni istemci kendi dilinde göstersin.
   Bugün İngilizce arayüzdeki kullanıcı sunucudan gelen Türkçe hataları görüyor.
5. **`pc.js`'i bölün** (≈2560 satır): `state.js`, `ws.js`, `transfers-view.js`,
   `devices-view.js`, `pairing-view.js`. Listeler için "id ile anahtarlı güncelleme"
   kalıbını genelleştirin (ilerleme için bu turda yapıldı).

### Faz 3 — Kullanıcı deneyimi ve güvenilirlik (sıralama size bağlı)

| İş | Neden önemli |
| --- | --- |
| **ADB'siz PC→telefon gönderimi** | Bugün PC'den telefona dosya göndermek için telefonda geliştirici seçenekleri + kablosuz hata ayıklama açık olmalı; sıradan kullanıcı için en büyük engel bu. Telefon sayfası zaten açıkken "PC'den gelenler" listesi ve indirme bağlantısı göstermek ADB'yi yalnızca APK kurulumu için gerekli kılar. Uygulamanın genel kullanımına en çok katkı yapacak tek değişiklik budur. |
| **Telefon sayfası için eşleştirme belirteci** | Şu an aynı ağdaki herkes `/mobile` adresini açınca yükleme çerezi alıyor ve PC'ye dosya bırakabiliyor (README bunu "yalnızca güvenilir ağ" diye uyarıyor). QR koduna tek kullanımlık bir belirteç eklemek bunu kapatır. |
| **Kaldığı yerden devam eden yükleme** | Büyük telefon videoları kesilince baştan gidiyor. Parçalı yükleme (ör. 8 MiB parçalar + ofset) kesintide kaldığı yerden devam eder. |
| **Kurulum paketi** | `start.bat` + `npm ci` yerine `electron-builder` ile tek `.exe` kurulum ve otomatik güncelleme. Node.js kurulumu gereksinimi kalkar. |
| **Web sürümü için isteğe bağlı STUN/TURN** | Mobil tarayıcılar yerel adresleri `.local` adlarıyla gizler; çoklu yayının engellendiği ağlarda (misafir Wi-Fi, mesh router) bağlantı kurulamaz. Ortam değişkeniyle ICE sunucusu tanımlamak ve IP başına bağlantı sınırı eklemek gerekir. |
| **Tanılama sayfası** | `/api/diagnostics`: ADB yolu/sürümü, ağ arayüzleri, son hatalar. Kullanıcıdan "ekran görüntüsü at" yerine tek tıkla rapor. |

---

## 4. Önerilen yol haritası

| Sıra | İş | Efor | Etki |
| --- | --- | --- | --- |
| 1 | Ölçüm betiği (§3 "Önce ölç") | 0,5 gün | Diğer her şeyin ölçütü |
| 2 | Web sürümü protokol hızlandırma (1.1–1.3) | 1–2 gün | Yüksek |
| 3 | ADB çağrılarını azaltma + `track-devices` (1.4–1.5) | 1–2 gün | Orta |
| 4 | ADB'siz PC→telefon gönderimi (Faz 3) | 2–3 gün | Çok yüksek (kullanıcı tabanı) |
| 5 | Test altyapısı + `server.js` bölme (Faz 2.1–2.2) | 1 hafta | Uzun vadede yüksek |
| 6 | Mesaj sözleşmesi + hata kodları + `pc.js` bölme (Faz 2.3–2.5) | 3–4 gün | Orta |
| 7 | Telefon sayfası belirteci, devam eden yükleme, kurulum paketi | 1–2 hafta | Yüksek |

---

## 5. Bu turda düzeltilmeyen, bilinen küçük konular

- `web/app.js`: cihaz adını değiştirmek yeniden bağlanıp süren aktarımı sormadan kesiyor.
- `web/app.js`: karşı taraf sekmeyi kapatınca bazen gereksiz "bağlantı kurulamadı" uyarısı çıkıyor.
- `web/app.js`: `RATE_LIMIT`/`INVALID_HELLO` hataları "eşleşme reddedildi" olarak gösteriliyor.
- `web/app.js`: alıcı diske yazarken (`writer.close()`) gönderen taraf 90 sn sonra yanlış "iptal" gösterebilir (doğrulanmadı).
- `public/pc.js`: bağlantı kesme sürerken gelen `DEVICES_UPDATED` tamamen atlanıyor; bu arada takılan USB cihaz bir sonraki değişikliğe kadar görünmez.
- `launch.vbs`: masaüstü açılamazsa gizli pencerede `node server.js` çalışmaya devam ediyor; yalnızca Görev Yöneticisi'nden kapatılabiliyor.
- `docs/web-transfer.md`: "onaylar disk yazımından sonra gelir" ifadesi, kaydetme penceresi olmayan tarayıcılarda bellek için geçerli; 512 KiB `bufferedAmount` sınırı belgelenmemiş.
