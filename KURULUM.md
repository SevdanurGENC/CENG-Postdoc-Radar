# Postdoc Radarı — Kurulum ve Geliştirici Rehberi

> Kısa tanıtım için [README](README.md). Bu dosya botu kendi GitHub hesabında sıfırdan kurmak ve ayarlarını değiştirmek isteyenler içindir.

Makine öğrenimi, kuantum, nöroinformatik, biyoinformatik ve yazılım test otomasyonu alanlarındaki postdoc ilanlarını Avrupa ve ABD/Kanada sitelerinden toplayan bir sistem. Bu depo üç parçadan oluşur:

| Parça | Ne yapar | Nerede çalışır |
|---|---|---|
| **Bot** (`bot/`) | Günde 3 kez siteleri tarar, yeni ilanları `docs/jobs.json`'a yazar, Telegram'a özet gönderir | GitHub Actions (GitHub'ın sunucuları, ücretsiz) |
| **Web panosu** (`docs/`) | Botun bulduğu ilanları uygulamayla aynı arayüzde gösterir | GitHub Pages: `https://KULLANICI-ADIN.github.io/postdoc-radar/` |
| **Android uygulaması** (`android/`) | Telefonda kendi başına tarar, Gmail'i hazır başvuru metniyle açar | Telefonun |

---

## Kurulum: adım adım

Toplam 20–30 dakika sürer. Her adımın sonunda “Kontrol” satırı var; o tutuyorsa sonraki adıma geç.

### Adım 1 — GitHub hesabı

[github.com](https://github.com) adresinden ücretsiz hesap aç (varsa giriş yap). Kullanıcı adını not et; web sayfanın adresinde görünecek.

### Adım 2 — Depoyu oluştur

1. Sağ üstteki **+** → **New repository**.
2. **Repository name:** `postdoc-radar`
3. **Public** seçili olsun (GitHub Pages ücretsiz sürümde yalnızca herkese açık depolarda çalışır).
4. “Add a README file” kutusunu **işaretleme**.
5. **Create repository**.

> Kontrol: Boş bir depo sayfası ve “Quick setup” yazısı görüyorsun.

### Adım 3 — Dosyaları yükle

1. Bu zip'i bilgisayarında aç. İçinde `postdoc-radar` klasörü var.
2. Depo sayfasındaki **uploading an existing file** bağlantısına tıkla.
3. `postdoc-radar` klasörünün **içindekileri** (klasörün kendisini değil) sürükleyip sayfaya bırak: `bot`, `docs`, `web`, `android`, `tools`, `.github`, `package.json`, `package-lock.json`, `README.md`, `.gitignore`, `build-apk.sh`.
4. Alttaki **Commit changes** düğmesine bas.

**Dikkat — `.github` klasörü:** Adı nokta ile başladığı için bazı bilgisayarlarda gizlidir.
- **Mac:** Finder'da `Cmd + Shift + .` tuşlarına basınca görünür.
- **Windows:** Dosya Gezgini > Görünüm > Gizli öğeler.

> Not: Yüklemeden hemen sonra **Actions** sekmesinde kırmızı ✖ işaretli bir çalışma görebilirsin. GitHub Pages henüz açılmadığı için (Adım 6) böyle olur; normaldir, görmezden gel.

> Kontrol: Depoda `.github/workflows/scan.yml` dosyası var. Yoksa: **Add file → Create new file**, dosya adı kutusuna `.github/workflows/scan.yml` yaz (eğik çizgiler klasör oluşturur), zip'teki aynı dosyanın içeriğini yapıştır, **Commit changes**.

### Adım 4 — Telegram botunu oluştur

1. Telegram'da **@BotFather**'ı aç (mavi tikli olan), **Start**'a bas.
2. `/newbot` yaz.
3. Bota bir ad ver, örneğin `Postdoc Radarı`.
4. Kullanıcı adı ver; `bot` ile bitmeli, örneğin `sevdanur_postdoc_bot`.
5. BotFather sana uzun bir **token** verir (`123456789:AA…` gibi). Kopyala ve kimseyle paylaşma.
6. BotFather'ın mesajındaki bağlantıdan **kendi botunu aç**, **Start**'a bas ve `merhaba` yaz. (Bot, kendisine hiç yazmamış birine mesaj atamaz.)
7. **Sohbet kimliğini (chat ID) bul:** tarayıcıda şu adresi aç (TOKEN yerine kendi token'ını yaz):
   `https://api.telegram.org/botTOKEN/getUpdates`
   Çıkan metinde `"chat":{"id":123456789` kısmındaki sayı senin sohbet kimliğindir.
   Boş (`"result":[]`) gelirse bota bir mesaj daha yaz ve sayfayı yenile.

> Kontrol: Elinde bir **token** ve bir **sohbet kimliği** (sadece rakamlardan oluşan sayı) var.

### Adım 5 — Gizli bilgileri GitHub'a ekle

Token'ı dosyalara yazma; GitHub'ın şifreli “Secrets” alanına koy:

1. Depoda **Settings** → sol menüde **Secrets and variables** → **Actions**.
2. **New repository secret**:
   - Name: `TELEGRAM_BOT_TOKEN` · Secret: Telegram token'ı → **Add secret**
3. Bir daha **New repository secret**:
   - Name: `TELEGRAM_CHAT_ID` · Secret: sohbet kimliğin → **Add secret**

> Kontrol: “Repository secrets” listesinde iki satır var. (Değerleri bir daha göremezsin; bu normal.)

### Adım 6 — GitHub Pages'i aç

1. **Settings** → sol menüde **Pages**.
2. **Build and deployment → Source:** **GitHub Actions** seç.

> Kontrol: Source kutusunda “GitHub Actions” yazıyor.

### Adım 7 — Botun yazma iznini kontrol et

1. **Settings** → **Actions** → **General**.
2. **Actions permissions:** “Allow all actions and reusable workflows” seçili olsun.
3. Sayfanın altında **Workflow permissions:** **Read and write permissions** seç → **Save**.

### Adım 8 — Telegram'ı test et

1. Deponun üstündeki **Actions** sekmesi. “Workflows aren't being run on this repository” uyarısı çıkarsa **I understand my workflows, go ahead and enable them**'a bas.
2. Soldan **Postdoc taraması** → sağda **Run workflow** → “Sadece Telegram bağlantısını test et” kutusunu **işaretle** → yeşil **Run workflow**.
3. Birkaç saniye sonra listede bir çalışma belirir; yaklaşık 30 saniyede biter.

> Kontrol: Yeşil tik ✅ ve Telegram'da “✅ Postdoc Radarı bağlantısı çalışıyor” mesajı.
> Kırmızı ✖ görürsen çalışmaya tıkla → **scan** → **Telegram testi** adımını aç; hatanın ne olduğu orada yazar (aşağıdaki Sorun giderme tablosuna bak).

### Adım 9 — İlk taramayı başlat

1. Yine **Run workflow**, bu kez kutuyu **işaretlemeden** çalıştır.
2. İki iş sırayla çalışır: **scan** (3–6 dk, siteleri tarar) ve **pages** (1 dk, panoyu yayınlar).
3. Bitince **pages** işinin yanında web adresin görünür.

> Kontrol:
> - Telegram'a yeni ilanların özeti gelir (sadece ★★ ve ★★★ olanlar; ayar `bot/config.json` içinde).
> - `https://KULLANICI-ADIN.github.io/postdoc-radar/` adresinde pano açılır.
> - Depoda `docs/jobs.json` dosyasının yanında “Tarama: …” diye bir kayıt görünür.

### Adım 10 — Artık otomatik

Bot her gün **08:07, 13:07 ve 19:07**'de (Türkiye saati) kendiliğinden çalışır. GitHub yoğunken birkaç dakikadan yarım saate kadar gecikebilir. İlk otomatik çalışma bir sonraki saat diliminde başlar.

---

## Ayarları değiştirme

Hepsini GitHub'da, tarayıcıdan yapabilirsin: dosyayı aç → sağ üstteki kalem ✏️ → değiştir → **Commit changes**.

**`bot/config.json`**

| Alan | Ne işe yarar |
|---|---|
| `regions` | `eu` Avrupa, `na` ABD ve Kanada. `false` yaparsan o bölge taranmaz. |
| `sources` | Her kaynak için `true` / `false`. Kodların adları `_kaynak_adlari` altında. |
| `search` | Sitelerde aranan terimler. Her terim sayfa sayısını artırır; 15'ten fazlası kullanılmaz. |
| `keywords` | Alanlara (ML, Kuantum, Nöro, Biyo, Yazılım) göre eşleştirme kelimeleri ve yıldızlar. |
| `exclude` | Başlıkta geçerse ilanı eleyen kelimeler (PhD student, professor…). |
| `languages` | Kartta etiket olarak gösterilen programlama dilleri ve araçlar. |
| `telegram.minStars` | Bildirime girecek en düşük yıldız: 1, 2 veya 3. |
| `telegram.maxItems` | Bir mesajdaki en fazla ilan. |
| `telegram.sendWhenNothingNew` | `true` ise yeni ilan yokken de “yeni ilan yok” mesajı gelir. |
| `cleanup` | Süresi geçmiş ilanların dosyadan kaç gün sonra silineceği. |

JSON'da virgül ve tırnaklara dikkat: liste elemanları arasında virgül olur, son elemandan sonra olmaz. Commit'ten önce [jsonlint.com](https://jsonlint.com) ile kontrol edebilirsin.

**Tarama saatleri:** `.github/workflows/scan.yml` içindeki `cron` satırı. Saatler **UTC**'dir (Türkiye = UTC+3).
- `"7 5,10,16 * * *"` → 08:07, 13:07, 19:07
- `"7 4,9,15 * * *"` → 07:07, 12:07, 18:07
- `"7 5 * * 1-5"` → hafta içi her gün 08:07

[crontab.guru](https://crontab.guru) ile deneyebilirsin. Dakikayı 0 yerine 7 gibi bir değer yapmak, GitHub'ın en yoğun olduğu tam saatlerden kaçınmak içindir.

---

## Sorun giderme

| Ne görüyorsun | Ne yapmalı |
|---|---|
| Telegram adımında `chat not found` | Sohbet kimliği yanlış ya da bota hiç `Start` / mesaj göndermedin (Adım 4.6). |
| `Unauthorized` | Token yanlış kopyalanmış. Secret'ı sil ve yeniden ekle (Adım 5). |
| `TELEGRAM_BOT_TOKEN veya TELEGRAM_CHAT_ID tanımlı değil` | Secret adları birebir aynı olmalı, büyük harfle. |
| “Sonuçları depoya kaydet” adımında `403` / `Permission denied` | Adım 7'deki **Read and write permissions** ayarı. |
| **pages** işinde `Get Pages site failed` | Adım 6: Source **GitHub Actions** olmalı. |
| Pano açılıyor ama ilan yok | İlk tarama bitmemiş olabilir. Panoda **Yenile**'ye bas. |
| Günlükte bazı kaynaklar “açılmadı” | O site GitHub sunucularından gelen otomatik istekleri engelliyor (EURAXESS, Science Careers sık yapar). Diğer kaynaklar çalışmaya devam eder; bu siteleri telefondaki uygulama tarayabilir. |
| Otomatik taramalar durdu | GitHub, 60 gün boyunca hiç değişiklik olmayan depolarda zamanlanmış işleri durdurur. Bot her taramada kayıt yaptığı için genelde olmaz; olursa Actions sekmesinde **Enable workflow**'a bas. |

**Çalışma geçmişi:** Actions sekmesinde her çalışmaya tıklayınca **scan → İlanları tara** adımında hangi sitelerin açıldığını ve bulunan her ilanı görürsün.

---

## Güvenlik

- Token ve sohbet kimliği yalnızca **Secrets** içinde durur. Dosyalara, commit mesajlarına ya da issue'lara yazma.
- Token'ın bir yerde göründüyse: BotFather'da `/revoke` ile iptal et, `/token` ile yenisini al ve Secret'ı güncelle.
- Panoda kaydettiğin, başvurduğun ve gizlediğin ilanlar ile profil bilgilerin (ORCID, LinkedIn…) **yalnızca kendi tarayıcında** saklanır, depoya yazılmaz. Depo herkese açık olduğu için `docs/jobs.json`'daki ilan listesi ve `bot/config.json`'daki anahtar kelimeler herkes tarafından görülebilir.
- Android imza anahtarını (`keys/`) depoya **koyma**; `.gitignore` bunu zaten engeller.

---

## Geliştirici notları

```
bot/run.mjs          ana betik (tara → kaydet → Telegram)
bot/scanner.mjs      tarama çekirdeği. web/app.template.html'den OTOMATİK üretilir, elle düzenleme
bot/telegram.mjs     Telegram mesajı
bot/test.mjs         internetsiz test (npm test)
bot/config.json      ayarlar
docs/index.html      Pages panosu (web/app.template.html'den üretilir)
docs/jobs.json       botun veritabanı
web/app.template.html  arayüz + tarama kodunun tek kaynağı (Android, web ve bot)
web/seed.json        uygulamanın başlangıç ilanları
android/             Android projesi (apktool düzeni, smali)
tools/bundle.py      şablondan android/assets/index.html, docs/index.html ve bot/scanner.mjs üretir
```

Arayüzde ya da tarama mantığında değişiklik yaptıysan bilgisayarında:

```bash
python3 tools/bundle.py     # üç dosyayı yeniden üretir
npm install && npm test     # botu internetsiz test eder
node bot/run.mjs --dry-run  # gerçek sitelerle tarar ama hiçbir şey yazmaz
```

**Android APK derlemek:** Java 11+, Python 3, Node.js 18+ gerekir (Android SDK gerekmez). İmza anahtarını `keys/key8.pem` ve `keys/cert.pem` olarak koy, sonra `./build-apk.sh` çalıştır. Telefondaki uygulamanın üzerine kurulabilmesi için her sürüm **aynı anahtarla** imzalanmalı ve `android/apktool.yml` içindeki `versionCode` bir artırılmalı.
