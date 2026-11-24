# BİRLİK LEZZETLERİ — Dijital restoran sistemi

Hedef adres: https://birliklezzetleri.netlify.app (henüz yayınlanmadı; isim müsaitliği Netlify'da kontrol edilir).
Bu proje Arifiye Sofrası'ndan bağımsızdır. Statik web arayüzü + Netlify Functions + Supabase PostgreSQL ortak veritabanı kullanır. 6 saniyede bir güncellenir; anlık push değildir.

## Kurulum
1. Bir Supabase projesi oluşturun. SQL Editor'da `database.sql` içeriğini bir kez çalıştırın. Örnek ürünler eklenir; gerçek menü ve fiyatları yönetim ekranından düzenleyin.
2. Supabase proje ayarlarından Project URL ve legacy `service_role` API anahtarını alın. Bu anahtar sadece sunucuda kalmalı; HTML/JS içine veya Git deposuna eklemeyin.
3. ZIP'i açın. Bu klasörü bir Git deposuna yükleyin; Netlify'da Add new project / Import an existing project ile bağlayın. Build command boş, publish directory `public`, functions directory `netlify/functions` (netlify.toml bunları belirtir). Alternatif: Netlify CLI ile proje kökünde `npx netlify-cli deploy --prod --dir=public --functions=netlify/functions` çalıştırın. Yalnızca public klasörünü sürükleyip bırakmak sunucu fonksiyonlarını kurmaz.
4. Netlify Environment variables bölümünde aşağıdaki değişkenleri ekleyin (Functions kapsamı). Her personele farklı, rastgele ve en az 16 karakterli bir anahtar üretin. Örnek üretim: `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`. Anahtarları güvenli biçimde dağıtın.

| Değişken | Değer |
| --- | --- |
| SUPABASE_URL | Supabase proje URL'si |
| SUPABASE_SERVICE_ROLE_KEY | Supabase legacy service_role anahtarı |
| BL_GARSON_KEY | Garson anahtarı |
| BL_MUTFAK_KEY | Mutfak anahtarı |
| BL_GOREVLI_KEY | Görevli anahtarı |
| BL_KASA_KEY | Kasa anahtarı |
| BL_ADMIN_KEY | Yönetim anahtarı |

5. Netlify projesini `birliklezzetleri` olarak adlandırmayı deneyin. Ad alınmışsa başka bir ad seçin. Ortam değişkenlerini ekledikten sonra yeniden deploy edin. Site açıldıktan sonra aşağıdaki akışı farklı cihazlarda kontrol edin.
6. QR kodları hedef adres için oluşturulmuştur. Adres değişirse `python make_qr.py https://YENI-ADRES.netlify.app` komutuyla yeniden oluşturup deploy edin. Python bağımlılığı: `pip install qrcode`. 20 masa varsayılandır; artırmak için SQL kısıtlarını, API `tableNo` fonksiyonunu, app.js içindeki masa sınırlarını ve QR üreticisini birlikte değiştirin.

## Ekranlar
- `/` — Menü; fiyatı boş ürünlerde fiyat gösterilmez.
- `/?masa=1` — Masa 1 menüsü ve çağrılar. 1–20 arası.
- `/garson` — Garson çağrıları, yeni sipariş, hazır siparişlerin teslim edilmesi.
- `/mutfak` — Hazırlanacak siparişler, görevli çağrıları (izleme), Hazır düğmesi.
- `/gorevli` — Görevli çağrıları, ilgileniyorum ve tamamla.
- `/kasa` — Tüm çağrılar ve sipariş durumları, teslim edildi işareti.
- `/admin` — Menü ekleme/düzenleme/gizleme, isteğe bağlı fiyat ve HTTPS fotoğraf URL'si, QR kodları yazdırma/indirme, genel durum.

## Canlıya almadan önce
- Müşteri ekranından garson çağırın: garson ve kasa ekranında görünmeli. İlgileniyorum ve Tamamla durumlarını kontrol edin.
- Görevli çağırın: görevli, kasa ve mutfakta görünmeli; mutfak yalnızca izler.
- Garson ekranından sipariş girin: mutfak ve kasaya düşmeli. Mutfakta Hazır düğmesine basıldığında hazırlık kuyruğundan çıkmalı; kasa ve garson Hazır görmeli. Teslim edildi durumunu kontrol edin.
- Yanlış personel anahtarıyla ve anahtarsız personel API'siyle giriş yapılamamalı. QR'ları gerçek yayın adresinden telefonda okutun.
- Örnek ürünleri, fotoğrafları ve fiyatları gerçek işletme menüsüne göre güncelleyin. Fotoğraf dosyası yükleme yoktur; HTTPS adresi girilir.

## Sınırlar
Bu sürüm bir başlangıç uygulamasıdır; canlı Netlify/Supabase ortamında test edilmemiştir. API'nin ana akışları sahte veritabanı yanıtlarıyla test edilmiştir. Gerçek ödeme, fiş, mali kayıt, kullanıcı bazlı hesaplar, stok, bildirim sesi ve offline destek yoktur. Kasa ekranı bir durum takip ekranıdır. Listeler en yeni 300 kayıtla sınırlıdır. İnternet gereklidir. QR çağrısı herkese açık olduğundan QR bağlantısını bilen biri uzaktan çağrı oluşturabilir; aynı masada aynı türden tek açık çağrıya veritabanı izin verir. Üretim kullanımında IP/cihaz hız sınırı ve kişisel personel oturumları eklenmesi önerilir. Personel anahtarları tarayıcının oturum belleğinde tutulur; ortak cihazlarda çıkış yapın. Veritabanını düzenli yedekleyin.
