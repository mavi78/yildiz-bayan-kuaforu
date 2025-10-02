<!--
Sync Impact Report
Version: 0.0.0 → 1.0.0
Modified Principles:
- Core prensipler ilk kez tanımlandı
Added Sections:
- Operasyonel Standartlar
- Geliştirme Süreci
Removed Sections:
- None
Templates requiring updates:
- ✅ `.specify/templates/plan-template.md`
- ✅ `.specify/templates/spec-template.md`
- ✅ `.specify/templates/tasks-template.md`
Follow-up TODOs:
- None
-->

# Yıldız Bayan Kuaförü Constitution

## Core Principles

### I. Güvenli ve Resmi Kaynak Tabanlı Geliştirme

- Her teknoloji, kütüphane ve çerçeve, resmi Context7 MCP dokümantasyonu okunup özetlendiğinde uygulanabilir; referans bağlantıları tasarım ve kod incelemelerinde kayıt altına alınır.
- Tüm servisler Helmet, CORS, @nestjs/throttler, JWT ve bcrypt yapı taşlarını varsayılan olarak etkinleştirerek en az ayrıcalık prensibini uygular.
- Çevresel gizli bilgiler `.env` yönetimine kapalı, güvenli gizli yönetim (ör. Vault, parameter store) üzerinden sürdürülür; sır dökümü ve rotasyonu yarıyıllık olarak belgelenir.
  Rasyonel: Yetkisiz erişim ve konfigürasyon sapmaları, salon verilerinin gizliliğini ve KVKK uyumunu doğrudan etkiler.

### II. Katmanlı Domain Odaklı Mimari

- Kod yapısı domain → repository → service → usecase → UI sıralamasını takip eder; her katman yalnızca bir alt katmana bağımlı olabilir.
- Veri tabanı erişimi repository katmanıyla sınırlıdır; Prisma istemcisi başka hiçbir katmanda kullanılamaz.
- Usecase katmanı iş kurallarını orkestra eder ve UI ya da API katmanına yalnızca DTO/mapper üzerinden veri taşır.
- Domain modelleri, müşteri, randevu, ödeme ve bildirim bağlamlarını açıkça ayırır; çapraz bağımlılıklar antikorruption katmanlarıyla sınırlandırılır.
  Rasyonel: Katman disiplini sürdürülmediğinde bakım maliyeti, test edilebilirlik ve ölçeklenebilirlik dramatik biçimde düşer.

### III. Kimlik, Yetki ve Davet Akışı Bütünlüğü

- Kimlik doğrulama JWT ile yapılır; rollere (Admin, Staff, Customer) göre guard ve decorator seviyesinde kontrol sağlanır.
- Kayıtlar yalnızca davet bağlantısı üzerinden ve son kullanma tarihini doğrulayarak yapılabilir; e-posta ve telefon numarası benzersizliği veritabanı ve domain seviyesinde enforcedir.
- Parola politikası, bcrypt ile hashlenmiş saklama, başarısız giriş throttling’i, oturum iptali ve cihaz denetimini içerir.
- Offboarding süreçleri hesapları kilitler, davetleri iptal eder ve açık oturumları derhal geçersiz kılar.
  Rasyonel: Güzellik salonu müşteri verileri yüksek hassasiyettedir; hatalı davet/rol süreçleri itibar ve regülasyon risklerini büyütür.

### IV. Test, Gözlemlenebilirlik ve Kayıt Disiplini

- TDD uygulaması zorunludur: servis katmanı için birim testleri, repository+veritabanı için entegrasyon testleri, kritik kullanıcı akışları için e2e testleri yazılmadan uygulama kodu birleşemez.
- Audit loglar (randevu değişiklikleri, yorum silmeleri, ödeme güncellemeleri) veritabanına yazılır; 90 günü aşan kayıtlar fiziksel append-only dosyalara aktarılıp veritabanından silinir.
- İzlenebilirlik; yapılandırılmış loglama, metrikler ve kritik uyarılar için tetikte olacak alarm planını içerir.
- Test ve log çıktıları sürdürülebilirlik için CI/CD’de zorunlu adımlardır; başarısızlıklar blokerdir.
  Rasyonel: Ölçülemeyen ve geriye dönük incelenemeyen sistemler güvenlikle çelişir, karar alma süreçlerini zayıflatır.

### V. Deneyim, Erişilebilirlik ve Performans Mükemmelliği

- Next.js App Router ile üretilen her sayfa WCAG 2.1 AA kriterlerine uymalı, form ve interaktif bileşenler React Hook Form + Zod ile erişilebilir doğrulamalara sahip olmalıdır.
- SEO stratejisi; `Metadata` API üzerinden meta etiketler, schema.org `LocalBusiness` JSON-LD ve yapılandırılmış veri doğrulamalarını içerir.
- Gerçek zamanlı bildirimler (Socket.io), e-posta (Gmail) ve SMS (İleti Merkezi) kanalları yapılandırılabilir; Admin her olayı kanal bazında açıp kapatabilir.
- Performans hedefleri: SSR yanıtları p95 < 400ms, kritik kullanıcı etkileşimleri < 100ms, rapor işlemleri için artımlı veri önbellekleme uygulanır.
  Rasyonel: Tek şubeli salon uygulamasında bile kullanıcı güveni, görünürlük ve hızlı deneyim müşteri sadakatini belirler.

## Operasyonel Standartlar

- **Randevu Yönetimi**: Çakışma önleme, personel vardiyaları ve iptal politikaları domain kuralları olarak kodlanır; manuel override yalnızca Admin tarafından ve audit log’a neden belirterek yapılabilir.
- **Ödemeler**: Sistem sadece nakit, banka transferi, POS kart ve veresiye kayıtlarını tutar; online ödeme entegrasyonu yasaktır. Veresiye kayıtları vade, teminat ve tahsilat sorumlusunu içermek zorundadır.
- **Davet Akışı**: Her davet tek kullanımlık token içerir, 72 saat sonra otomatik iptal olur ve Admin paneli üzerinden yeniden gönderilebilir.
- **Bildirimler**: Her olay için aktif kanal seçimi zorunlu form alanıdır; başarısız teslimatlar tekrar kuyruğa alınır ve günlük raporlanır.
- **Audit Arşivleme**: Arşiv dosyaları WORM (write once read many) medyada saklanır, taranabilir hash zinciri ile bütünlüğü garanti edilir ve saklama süresi minimum 5 yıldır.
- **Raporlama**: Finansal ve operasyonel raporlar yetkiye göre segmentlenir; veriler maskeleme kurallarıyla sunulur ve performans için önceden optimize edilmiş sorgular kullanılır.

## Geliştirme Süreci

1. Her çalışma paketinde kullanılacak teknoloji için resmi Context7 dokümantasyonuna atıf yapılır ve logbook’a eklenir.
2. Tasarım incelemesi, katmanlı mimari uyumu, veri erişim izolasyonu ve güvenlik varsayımlarını kontrol eder; başarısız inceleme kodlanamaz.
3. Test senaryoları (unit, integration, e2e) koddan önce yazılır ve CI’da başarısızlıkları gözlemlenene kadar implementasyon bekletilir.
4. Kod incelemeleri güvenlik, performans, sürdürülebilirlik ve Davet/Ödeme/Audit kurallarına uyumu doğrular; eksikler için ret sebebi yazılır.
5. Her fonksiyon ve sınıf Türkçe JSDoc ile belgelenir; her özellik klasörü kendi README dosyasını içerir.
6. Semantic versioning politikası: uyumsuz değişiklikler major, yeni zorunlu kurallar minor, açıklama düzeltmeleri patch artış gerektirir.

## Governance

- Bu anayasa, proje için bağlayıcıdır; planlar, görev listeleri ve kod incelemeleri bu kurallara göre değerlendirilir.
- Değişiklik teklifleri, etki analizi ve versiyon artış gerekçesi ile birlikte yazılı olarak sunulur; Admin onayı olmadan yürürlüğe girmez.
- Uygulama dışı tespitler derhal raporlanır ve düzeltici görevler açılmadan PR kapatılamaz.
- Audit arşiv süreçleri ve kritik güvenlik güncellemeleri yılda en az bir kez bağımsız gözden geçirmeye tabi tutulur.

**Version**: 1.0.0 | **Ratified**: 2025-10-02 | **Last Amended**: 2025-10-02
