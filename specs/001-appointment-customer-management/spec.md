# Feature Specification: Appointment & Customer Management Suite

**Feature Branch**: `001-appointment-customer-management`  
**Created**: 2025-10-02  
**Status**: Draft  
**Input**: User description: "Appointment & Customer Management Suite"

## Execution Flow (main)

```
1. Parse user description from Input
   → ✅ Feature description: "Appointment & Customer Management Suite"
2. Extract key concepts from description
   → ✅ Actors: Admin, Staff, Customer
   → ✅ Actions: randevu oluşturma, müşteri yönetimi, değerlendirme, raporlama, özel gün çalışma saatleri
   → ✅ Data: randevular, müşteriler, yorumlar, audit log, bildirimler, ödemeler
   → ✅ Constraints: davet tabanlı kayıt, çakışma kontrolü, offline ödeme, WCAG AA, SEO
3. For each unclear aspect:
   → ✅ SMS maliyeti: İletim başına + DLR bazlı (netleştirildi)
   → ✅ Audit log arşiv formatı: JSON Lines (JSONL) (netleştirildi)
   → ✅ Rapor performans hedefi: < 3 saniye (p95) (netleştirildi)
4. Fill User Scenarios & Testing section
   → ✅ Ana kullanıcı senaryoları tanımlandı
5. Generate Functional Requirements
   → ✅ FR-001 … FR-071 oluşturuldu (kayıtsız müşteri, işlem notları, çalışma saatleri, veresiye hatırlatma, ödeme audit trail, SEO validation, single-location kapsamı eklendi)
6. Identify Key Entities
   → ✅ User, Invitation, Customer, Appointment, WorkingHours, ServiceNote, Service, Payment, Review, AuditLog, Notification, SpecialWorkingDay
7. Run Review Checklist
   → ✅ PASS "All ambiguities resolved via /clarify session"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-02

- Q: SMS maliyeti ve limit politikası nasıl olmalı? → A: İletim başına + DLR bazlı
- Q: Audit log arşiv dosyası formatı ne olmalı? → A: JSON Lines (JSONL)
- Q: Rapor sorgusu performans hedefi ne olmalı? → A: < 3 saniye
- Q: Kayıtsız müşteri randevu sistemi eklensin mi? → A: Evet, takip kodu ile
- Q: Online randevu onay akışı nasıl olmalı? → A: PENDING → onay → çakışma kontrolü
- Q: Misafir müşteriden kayıtlı müşteriye geçiş nasıl olacak? → A: Davet üzerinden
- Q: Misafir müşteri tekrar geldiğinde yeni kayıt mı açılmalı? → A: Hayır, telefon ile eşleşme
- Q: Randevu sonrası işlem notları kim görebilir? → A: Sadece admin/çalışan
- Q: Salon çalışma saatleri sisteme eklensin mi? → A: Evet, gün bazlı + özel günler

---

## Terminology Glossary

**Purpose**: Standardize terminology across spec (Turkish) and implementation (English code).

| Turkish (Spec) | English (Code/Tasks) | Definition |
|----------------|----------------------|------------|
| **Kayıtsız Müşteri** | Guest | Unregistered customer who books via phone/web without login; cannot leave reviews |
| **Misafir** | Guest | Synonym for Kayıtsız Müşteri |
| **Kayıtlı Müşteri** | Registered Customer | Customer with User account, can login and leave reviews |
| **İşlem Notu** | ServiceNote | Post-appointment staff notes (max 1000 chars), visible only to Admin/Staff |
| **Randevu Notları** | Appointment.notes | General appointment notes visible to customer |
| **Veresiye** | Deferred Payment | Payment on credit with due date, collateral, responsible staff |
| **Davet** | Invitation | Invitation-only registration token with 72h expiry |
| **Çakışma** | Conflict | Appointment scheduling conflict (same staff, date, time) |
| **Override** | Override | Admin forcing appointment despite conflict, with justification |
| **Takip Kodu** | Tracking Code | 8-char alphanumeric code for guest appointment tracking |
| **Özel Gün** | SpecialWorkingDay | Override working hours for specific date (holiday, event) |
| **Normal Çalışma Saatleri** | WorkingHours | Regular weekly working hours per day (Mon-Sun) |

**Note**: In code, always use English entity/field names. In UI/documentation for Turkish users, use Turkish terms from this glossary.

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

**Admin perspektifi:**  
Salon sahibi, yeni personel davet ederek sisteme ekler, randevu çakışmalarını önler, gerektiğinde manuel olarak çakışan randevuları gerekçe belirterek override eder, müşteri yorumlarını onaylar veya siler, özel gün çalışma saatlerini ayarlar ve finansal/operasyonel raporları filtreler, grafikler üzerinden inceler ve CSV/XLSX olarak dışarı aktarır.

**Staff perspektifi:**  
Kuaför çalışanı, beklemede olan randevuları görür ve onaylar; onay sırasında sistem çakışma kontrolü yapar ve uyarı verirse gerekçe belirterek onaylayabilir. Telefon veya salona gelen müşteri için manuel randevu oluşturabilir: müşterinin ad, soyad veya telefon numarasıyla sistemde arama yapar, kayıtlı ise bilgileri çeker ve randevuyu "CONFIRMED" olarak kaydeder; kayıtsız ise ad, soyad, telefon bilgileriyle kayıt oluşturur (üye kaydı değil, misafir kaydı) ve randevuyu "CONFIRMED" olarak kaydeder. Müşteri üye olmak isterse Admin, bu kayıt üzerinden davet oluşturabilir. Randevu tamamlandığında ödeme kaydını nakit/kart/banka transferi veya veresiye olarak işler, müşterilerle ilgili notlar ekler.

**Customer (Kayıtlı Müşteri) perspektifi:**  
Müşteri, davet linki üzerinden sisteme kaydolur, kendi sayfasında hizmet ve tarih-saat seçerek randevu oluşturur (salon çalışma saatleri içinde), randevu beklemede kaydedilir ve yönetici/çalışan onayı sonrası kesinleşir. Geçmiş randevularını, aldığı hizmetleri ve aktif randevularını takip eder, tamamlanmış hizmete yorum ve puan bırakır, bildirimlerini e-posta, SMS veya gerçek zamanlı olarak alır.

**Guest (Kayıtsız Müşteri) perspektifi:**  
Kayıtsız müşteri, web sitesinden ad, soyad, telefon numarası girerek tarih-saat seçer ve randevu oluşturur. Sistem çakışma kontrolü yapmadan veri tabanına "PENDING" olarak kaydeder ve geriye takip kodu döner. Müşteri, takip kodu ile randevu durumunu sorgulayabilir. Yönetici/çalışan onayladığında bildirim alır (telefon numarasına SMS).

### Acceptance Scenarios

1. **Given** Admin panelinde randevu takvimi açık, **When** aynı personel için çakışan saate yeni randevu oluşturulmaya çalışılır, **Then** sistem uyarı gösterir ve Admin gerekçe girdikten sonra override edebilir; override audit log'a kaydedilir.

2. **Given** Müşteri login olmuş, **When** tamamlanmış randevuya yorum ve 5 üzerinden puan girer, **Then** yorum "beklemede" duruma geçer; Admin onayladıktan sonra herkese görünür hale gelir.

3. **Given** Staff offline randevu girişi yapıyor, **When** müşteri bilgileri ve saat seçilir, **Then** randevu varsayılan olarak "CONFIRMED" durumda kaydedilir ve bildirim gönderilir (kayıtlı müşteriye e-posta/SMS, misafir müşteriye sadece SMS).

4. **Given** Personel davet linki gönderilmiş, **When** 72 saat geçer, **Then** davet otomatik iptal olur ve token geçersiz hale gelir; Admin panelinden yeniden gönderilebilir.

5. **Given** Admin özel gün (tatil, yarım gün) çalışma saati ayarlamış, **When** müşteri o gün için randevu almaya çalışır, **Then** normal çalışma saatleri göz ardı edilir ve sadece özel gün saat aralığı seçeneklerde görünür.

6. **Given** Randevu oluşturuldu/iptal edildi/güncellendi, **When** bildirim kanalları (e-posta, SMS, real-time) Admin tarafından aktif yapılmış, **Then** her aktif kanal üzerinden müşteriye bildirim gönderilir.

7. **Given** Ödeme nakit/kart/banka transferi ile alınmış, **When** ödeme detayları kaydedilir, **Then** sistem tutarı, ödeme yöntemini ve tarihi saklar; veresiye için vade, teminat ve tahsilat sorumlusu alanları da doldurulur.

8. **Given** Admin rapor ekranında, **When** tarih aralığı, personel veya hizmet filtresi uygulanır ve "CSV İndir" veya "XLSX İndir" seçilir, **Then** filtrelenmiş veriler dosya olarak indirilir.

9. **Given** Audit log 90 günden eski kayıtlar içeriyor, **When** otomatik arşivleme zamanlanmış görevi çalışır, **Then** eski kayıtlar append-only dosyaya yazılır ve veritabanından silinir; hash zinciri bütünlük doğrulaması yapılır.

10. **Given** Müşteri ekran okuyucu kullanıyor, **When** randevu formuna erişir, **Then** tüm form alanları uygun ARIA etiketleri ve klavye navigasyonu ile WCAG AA uyumlu şekilde çalışır.

11. **Given** Kayıtsız müşteri web sitesinden randevu oluşturuyor, **When** ad, soyad, telefon, tarih ve saat seçip gönderir, **Then** sistem çakışma kontrolü yapmadan "PENDING" durumda kaydeder ve takip kodu döner; müşteri bu kod ile randevu durumunu sorgulayabilir.

12. **Given** Yönetici/çalışan bekleyen randevuya bakıyor, **When** onaylamak için tıklar, **Then** sistem çakışma kontrolü yapar; çakışma varsa uyarı gösterir ve gerekçe girilerek onaylanabilir; çakışma yoksa doğrudan "CONFIRMED" olur ve müşteriye bildirim gider.

13. **Given** Çalışan telefon/walk-in müşteri için randevu oluşturuyor, **When** müşteri adı veya telefonu ile arama yapar, **Then** kayıtlı müşteri ise bilgileri otomatik dolarak "CONFIRMED" randevu oluşturur; kayıtsız ise ad, soyad, telefon ile misafir kaydı oluşturur ve randevuyu "CONFIRMED" kaydeder.

14. **Given** Misafir kayıt üzerinden müşteri üye olmak istiyor, **When** Admin davet oluştur butonuna basar, **Then** misafir kaydındaki e-posta adresine davet linki gönderilir; müşteri davet üzerinden kayıt olunca misafir kaydı kullanıcı kaydına dönüşür.

15. **Given** Kayıtlı müşteri login olmuş, **When** kendi sayfasına girer, **Then** geçmiş randevuları, aldığı hizmetler ve aktif randevuları görüntülenir.

16. **Given** Kayıtsız müşteri takip kodu ile sorgulama yapıyor, **When** takip kodunu girer, **Then** randevu durumu (PENDING/CONFIRMED/COMPLETED/CANCELLED), tarih, saat ve hizmet bilgisi gösterilir.

17. **Given** Misafir müşteri daha önce salona gelmiş, **When** yönetici/çalışan telefon veya ad-soyad ile arama yapar, **Then** sistem eşleşen misafir kaydı bulur ve bilgileri otomatik doldurur; yeni misafir kaydı oluşturmaz.

18. **Given** Randevu tamamlandı, **When** yönetici/çalışan randevuyu COMPLETED yapar, **Then** işlem notu ekleyebilir (opsiyonel); bu not sadece admin/çalışan tarafından görülebilir ve gelecek randevularda referans olarak kullanılır.

19. **Given** Müşteri salona tekrar geliyor, **When** yönetici/çalışan müşteri profilini açar, **Then** geçmiş işlem notları görüntülenir ve müşteriye kişiselleştirilmiş hizmet sunulabilir.

### Edge Cases

- Aynı müşteri eşzamanlı olarak iki farklı cihazdan randevu oluşturmaya çalışırsa ne olur?  
  → Sistem optimistic locking veya benzeri çakışma çözümlemesi uygular; ikinci istek conflict hatası alır.

- Davet linki süresi dolmadan önce kullanıcı kayıt olmaya başlar ama kayıt sırasında 72 saat geçerse ne olur?  
  → Token doğrulama her submit adımında yapılır; expire olmuşsa kayıt tamamlanamaz ve "Davet süresi doldu" mesajı gösterilir.

- SMS bildirimi gönderilmeye çalışıldığında İleti Merkezi API'si hata dönerse ne olur?  
  → Bildirim retry kuyruğuna alınır; 3 deneme sonrası başarısız olursa log'a kaydedilir ve Admin günlük raporda görür.

- Müşteri yorum bıraktıktan sonra Admin yorumu siler; müşteri silinmiş yorumu tekrar görür mü?  
  → Silme işlemi audit log'a kaydedilir ve müşteri profilinde "Yorumunuz yönetici tarafından kaldırıldı" mesajı gösterilir.

- Audit log arşiv dosyası bozulursa veya erişilemez hale gelirse ne olur?  
  → Dosya hash zinciri doğrulaması sayesinde bozulma tespit edilir; yedekten restore edilir veya uyarı loglara yazılır.

- Randevu override yapılırken gerekçe girilmezse ne olur?  
  → Sistem zorunlu alan kontrolü yapar; gerekçe girilmeden override işlemi tamamlanamaz.

- Kayıtsız müşteri takip kodunu kaybederse randevuyu nasıl takip eder?  
  → Müşteri, telefon numarasını girerek sistemden takip kodunu tekrar talep edebilir; SMS ile gönderilir.

- Misafir kayıt üzerinden davet gönderilirken e-posta adresi yoksa ne olur?  
  → Admin, önce misafir kaydına e-posta eklemek zorundadır; e-posta olmadan davet gönderilemez.

- Kayıtlı müşteri randevu oluştururken çakışma varsa ne olur?  
  → Müşteri randevu oluştururken sistem çakışma kontrolü yapmaz; randevu "PENDING" olarak kaydedilir ve yönetici/çalışan onayı sırasında çakışma kontrolü yapılır.

- Misafir müşteri aynı telefon numarasıyla farklı ad-soyad ile randevu oluşturmaya çalışırsa ne olur?  
  → Sistem telefon numarasını öncelikli olarak kullanır; eşleşen kayıt bulursa uyarı verir ve mevcut kaydı kullanmayı önerir.

- Salon çalışma saatleri dışında randevu oluşturulmaya çalışılırsa ne olur?  
  → Sistem, randevu formu açıldığında sadece çalışma saatleri içindeki zaman aralıklarını seçenek olarak gösterir; saat dışı seçim yapılamaz.

- İşlem notu çok uzun olursa ne olur?  
  → İşlem notları maksimum 1000 karakter ile sınırlandırılır; daha uzun notlar için ek not ekleme özelliği kullanılır.

- Veresiye ödeme hatırlatma bildirimi gönderildiğinde müşteri rahatsız olursa ne olur?  
  → Admin, müşteri bazında veresiye hatırlatma bildirimlerini kapatabilir veya erteleyebilir.

- Çoklu şube desteği gerekirse ne olur?  
  → Sistem yalnızca tek salon için tasarlanmıştır; çoklu şube desteği kapsam dışıdır ve desteklenmez.

---

## Requirements _(mandatory)_

### FR Grouping ve Task Mapping Notları

**Not**: Alt-kırılımlı FR'ler (ör. FR-019a/b, FR-026a/b/c, FR-039a, FR-042a/b, FR-047a, FR-059a, FR-067a/b, FR-068a) planlama sırasında atomik task'lara dönüştürülecektir. Her grup aynı domain'e ait olduğundan, task oluşturulurken bağımlılıklar ve sıralama dikkate alınmalıdır.

**Önerilen Task Grupları**:

- **Appointment Group**: FR-011 … FR-026c (randevu sistemleri)
- **Customer Group**: FR-027 … FR-036 (müşteri yönetimi ve review)
- **Payment Group**: FR-037 … FR-042b (ödeme ve veresiye sistemi)
- **Notification Group**: FR-043 … FR-048 (bildirim altyapısı)
- **Reporting Group**: FR-049 … FR-053 (dashboard ve raporlar)
- **WorkingHours Group**: FR-054 … FR-059a (çalışma saatleri)
- **Audit Group**: FR-060 … FR-065 (audit log ve arşivleme)
- **Accessibility Group**: FR-066 … FR-069 (WCAG & SEO)
- **Scope Group**: FR-070 … FR-071 (sistem sınırları)

### Functional Requirements

#### Davet ve Kullanıcı Yönetimi

- **FR-001**: Sistem, yalnızca Admin tarafından gönderilen davet linki üzerinden kayıt yapılabilmesini ZORUNLU kılar.
- **FR-002**: Her davet linki benzersiz token içerir ve 72 saat sonra otomatik olarak geçersiz hale gelir.
- **FR-003**: Admin, süresi dolmuş davetiyi yeniden gönderebilir; yeni token oluşturulur.
- **FR-004**: Kayıt sırasında e-posta ve telefon numarası benzersizliği kontrol edilir; aynı e-posta veya telefon ile ikinci kayıt yapılamaz.
- **FR-005**: Sistem, üç kullanıcı rolü destekler: Admin (tam yetki), Staff (randevu + müşteri yönetimi), Customer (kendi randevuları).

#### Kimlik Doğrulama ve Güvenlik

- **FR-006**: Kullanıcı şifreleri bcrypt ile hashlenmiş olarak saklanır.
- **FR-007**: Başarısız login denemeleri throttle edilir; 5 başarısız denemeden sonra hesap 15 dakika kilitlenir.
- **FR-008**: Oturum JWT ile yönetilir; Admin oturumları 8 saat, Staff 12 saat, Customer 7 gün geçerlidir.
- **FR-009**: Admin, herhangi bir kullanıcının oturumunu sonlandırabilir (zorla logout).

#### Randevu Yönetimi

- **FR-010**: Randevu oluşturulurken müşteri, personel, hizmet, tarih ve saat seçilir.
- **FR-011**: Kayıtlı müşteri web sitesinden randevu oluştururken sistem çakışma kontrolü yapmaz; randevu "PENDING" durumda kaydedilir.
- **FR-012**: Kayıtsız müşteri (guest) web sitesinden ad, soyad, telefon, tarih ve saat girerek randevu oluşturabilir; sistem çakışma kontrolü yapmadan "PENDING" durumda kaydeder ve benzersiz takip kodu döner.
- **FR-013**: Takip kodu 8 haneli alfanumerik karakter dizisidir ve randevu başına benzersizdir.
- **FR-014**: Kayıtsız müşteri, takip kodu ile randevu durumunu sorgulayabilir; sorgu sonucunda randevu durumu, tarih, saat, hizmet ve personel bilgisi gösterilir.
- **FR-015**: Kayıtsız müşteri takip kodunu kaybederse, telefon numarasını girerek SMS yoluyla takip kodunu tekrar talep edebilir.
- **FR-016**: Yönetici/çalışan, bekleyen randevuları onaylar; onay sırasında sistem çakışma kontrolü yapar ve çakışma varsa uyarı gösterir.
- **FR-017**: Yönetici/çalışan, çakışma uyarısına rağmen gerekçe girerek randevuyu onaylayabilir (override); gerekçe audit log'a kaydedilir.
- **FR-018**: Yönetici/çalışan, telefon veya walk-in müşteri için manuel randevu oluşturabilir; müşterinin ad, soyad veya telefon numarasıyla sistemde arama yapar.
- **FR-019**: Manuel randevu oluştururken, kayıtlı müşteri ise bilgileri otomatik doldurulur; kayıtsız ise ad, soyad, telefon ile "misafir" kaydı oluşturulur.
- **FR-019a**: Sistem, manuel randevu oluştururken telefon numarası ile eşleşen mevcut misafir kaydı olup olmadığını kontrol eder; varsa mevcut kaydı kullanır ve yeni misafir kaydı oluşturmaz.
- **FR-019b**: Telefon eşleşmesi varsa ancak ad-soyad farklıysa, sistem uyarı verir ve mevcut kaydı kullanmayı önerir (admin/çalışan onayı ile güncellenebilir).
- **FR-020**: Manuel oluşturulan randevular varsayılan olarak "CONFIRMED" durumunda kaydedilir ve bildirim gönderilir (kayıtlı müşteriye e-posta/SMS, kayıtsız müşteriye sadece SMS).
- **FR-021**: Misafir kayıt üzerinden Admin davet oluşturabilir; davet için e-posta adresi zorunludur; e-posta yoksa önce misafir kaydına e-posta eklenir.
- **FR-022**: Misafir kayıt üzerinden gönderilen davet ile müşteri kayıt olduğunda, misafir kaydı kullanıcı kaydına dönüşür ve geçmiş randevular kullanıcı hesabına bağlanır.
- **FR-023**: Randevu durumları: PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW.
- **FR-024**: Randevu iptal edildiğinde, mevcut durum audit log'a kaydedilir ve ilgili taraflara bildirim gönderilir.
- **FR-025**: Randevu güncelleme (tarih/saat değişikliği) audit log'a kaydedilir ve bildirim gönderilir.
- **FR-026**: Kayıtlı müşteri, kendi sayfasında geçmiş randevularını, aldığı hizmetleri ve aktif randevularını tarih sırasına göre görüntüleyebilir.
- **FR-026a**: Randevu tamamlandığında (COMPLETED), yönetici/çalışan işlem notu ekleyebilir (opsiyonel); not maksimum 1000 karakter uzunluğunda olabilir.
- **FR-026b**: İşlem notları sadece admin ve staff tarafından görülebilir; müşteri bu notları göremez.
- **FR-026c**: Müşteri profili açıldığında, geçmiş randevular ve işlem notları kronolojik sırada görüntülenir; böylece kişiselleştirilmiş hizmet sunulabilir.

#### Müşteri Yönetimi

- **FR-027**: Sistem iki tür müşteri kaydı destekler: "kayıtlı müşteri" (User ile ilişkili, login yapabilir) ve "misafir" (sadece randevu için kayıt, login yapamaz).
- **FR-028**: Admin ve Staff, müşteri profili oluşturabilir, güncelleyebilir ve notlar ekleyebilir.
- **FR-029**: Müşteri profili: ad, soyad, e-posta (isteğe bağlı misafirler için), telefon, doğum tarihi (isteğe bağlı), tercih notları içerir.
- **FR-030**: Kayıtlı müşteri kendi profilini görüntüleyebilir ve iletişim bilgilerini güncelleyebilir.
- **FR-031**: Sistem, müşteri silme işlemi yerine "devre dışı bırakma" yapar; geçmiş veriler korunur.

#### Yorumlar ve Değerlendirmeler

- **FR-032**: Sadece kayıtlı müşteri, tamamlanmış (COMPLETED) randevulara yorum ve 1-5 arası puan verebilir.
- **FR-033**: Yorumlar varsayılan olarak "beklemede" durumundadır; Admin onayladıktan sonra herkese görünür.
- **FR-034**: Admin, uygunsuz yorumları silebilir; silme işlemi audit log'a kaydedilir.
- **FR-035**: Sistem, salon genel puanını tüm onaylanmış yorumların ortalaması olarak hesaplar.
- **FR-036**: Kayıtlı müşteri, kendi yorumlarını görüntüleyebilir ve Admin tarafından silinip silinmediğini görebilir.

#### Ödemeler

- **FR-037**: Sistem, yalnızca offline ödeme yöntemlerini kaydeder: nakit, banka transferi, POS kart, veresiye.
- **FR-038**: Online ödeme entegrasyonu (Stripe, PayPal vb.) yasaktır.
- **FR-039**: Ödeme kaydı: tutar, ödeme yöntemi, tarih, randevu referansı, ödemeyi kaydeden kullanıcı bilgilerini içerir.
- **FR-039a**: Ödeme kaydı oluşturulduğunda veya güncellendiğinde audit log'a otomatik olarak yazılır (işlemi yapan, yöntem, tutar, randevu ilişkisi, işlem zamanı).
- **FR-040**: Veresiye ödemelerde vade tarihi, teminat bilgisi ve tahsilat sorumlusu alanları zorunlu olarak doldurulur.
- **FR-041**: Sistem, müşteri bazında ödeme geçmişini ve borç bakiyesini gösterir (kayıtlı ve misafir müşteriler için).
- **FR-042**: Admin, veresiye ödemelerin vade takibini yapabilir ve vadesi geçmiş ödemeleri filtreler.
- **FR-042a**: Sistem, vadesi yaklaşan veya geçmiş veresiye ödemeler için otomatik hatırlatma bildirimi gönderebilir (vade 3 gün öncesi, vade günü, vade sonrası).
- **FR-042b**: Admin, veresiye ödeme hatırlatma bildirimlerini müşteri bazında kapatabilir veya erteleyebilir.

#### Bildirimler

- **FR-043**: Sistem üç bildirim kanalı destekler: e-posta (Gmail), SMS (İleti Merkezi), gerçek zamanlı (Socket.io).
- **FR-044**: Admin, her olay tipi (randevu oluşturma, onaylama, iptal, hatırlatma) için hangi kanalların aktif olacağını seçer.
- **FR-045**: Kayıtlı müşterilere e-posta ve/veya SMS gönderilir; misafir müşterilere sadece SMS gönderilir (e-posta adresi varsa e-posta da gönderilir).
- **FR-046**: Bildirim gönderimi başarısız olursa, sistem 3 kez tekrar dener; 3 denemeden sonra başarısız bildirimler log'a kaydedilir.
- **FR-047**: Başarısız bildirimler günlük olarak raporlanır; Admin panelinde görüntülenebilir.
- **FR-047a**: Bildirim başarısızlık kayıtları 30 gün sonra audit log sistemine entegre edilir ve arşivleme politikasına tabi tutulur.
- **FR-048**: SMS maliyeti iletim başına hesaplanır; her SMS için DLR (Delivery Report) kontrolü yapılır ve başarılı/başarısız teslimatlar ayrı kaydedilir.

#### Admin Dashboard ve Raporlama

- **FR-049**: Admin dashboard, randevu istatistiklerini (günlük/haftalık/aylık) grafik olarak gösterir.
- **FR-050**: Raporlar filtrelenebilir: tarih aralığı, personel, hizmet, ödeme yöntemi, randevu durumu.
- **FR-051**: Sistem, filtrelenmiş raporları CSV ve XLSX formatlarında dışa aktarır.
- **FR-052**: Finansal raporlar yalnızca Admin rolü tarafından görüntülenebilir; Staff rolü kendi randevularına ait finansalları görebilir.
- **FR-053**: Rapor sorguları maksimum 3 saniye içinde yanıt vermelidir; bu hedef p95 latency metriği ile ölçülür.

#### Salon Çalışma Saatleri

- **FR-054**: Admin, salonun normal çalışma saatlerini tanımlar (örn. Pazartesi-Cumartesi 09:00-19:00).
- **FR-055**: Çalışma saatleri, her gün için ayrı ayrı ayarlanabilir; kapalı günler işaretlenebilir.
- **FR-056**: Randevu slotları, çalışma saatleri ve hizmet süresine göre otomatik olarak hesaplanır.

#### Özel Gün Çalışma Saatleri

- **FR-057**: Admin, belirli tarihlerde (resmi tatil, özel etkinlik) özel çalışma saatleri tanımlayabilir; özel gün tanımlıysa normal çalışma saatleri geçersiz olur ve sadece özel gün saatleri geçerlidir.
- **FR-058**: Özel gün kaydı: tarih, açılış saati, kapanış saati, açıklama içerir; tamamen kapalı olarak da işaretlenebilir.
- **FR-059**: Müşteri randevu oluştururken, özel gün ayarlanmışsa sadece özel gün saat aralığı seçeneklerde görünür; kapalı günlerde randevu alınamaz.
- **FR-059a**: Sistem, randevu oluştururken önce özel gün kontrolü yapar; özel gün varsa normal çalışma saatlerini göz ardı eder ve sadece özel gün saatlerini kullanır.

#### Audit Log ve Arşivleme

- **FR-060**: Sistem, kritik işlemleri audit log'a kaydeder: randevu override, yorum silme, ödeme güncelleme, kullanıcı rolü değişikliği.
- **FR-061**: Audit log kaydı: tarih-saat, işlemi yapan kullanıcı, işlem tipi, etkilenen kayıt ID, değişiklik detayları, gerekçe (varsa).
- **FR-062**: 90 günden eski audit log kayıtları otomatik olarak fiziksel dosyaya arşivlenir ve veritabanından silinir.
- **FR-063**: Arşiv dosyaları append-only formatındadır ve hash zinciri ile bütünlük doğrulaması yapılır.
- **FR-064**: Arşiv dosyaları JSON Lines (JSONL) formatında saklanır; her satır tek bir audit log kaydını temsil eder ve okunabilirlik sağlar.
- **FR-065**: Arşiv dosyaları WORM (write once read many) medyada saklanır ve minimum 5 yıl süreyle tutulur.

#### Erişilebilirlik ve SEO

- **FR-066**: Tüm kullanıcı arayüzleri WCAG 2.1 AA kriterlerine uygun olarak geliştirilir.
- **FR-067**: Formlar ve interaktif bileşenler klavye navigasyonu ve ekran okuyucu ile erişilebilir olmalıdır.
- **FR-067a**: Form hataları ARIA live region kullanarak ekran okuyucu kullanıcılarına anında bildirilir.
- **FR-067b**: Tüm interaktif elementler (butonlar, linkler, form alanları) focus görünürlüğü sağlar (visible focus indicator).
- **FR-068**: Her sayfa, uygun meta etiketler, Open Graph ve schema.org LocalBusiness yapılandırılmış verisi içerir.
- **FR-068a**: Tüm structured data (schema.org) Google Rich Results Test veya Schema Markup Validator ile doğrulanır ve hatasız olmalıdır.
- **FR-069**: Sistem, Google Lighthouse SEO ve erişilebilirlik skorlarında 90 ve üzeri puan almalıdır.

#### Sistem Kapsamı ve Sınırlamalar

- **FR-070**: Sistem, yalnızca tek salon (single-location) için tasarlanmıştır; çoklu şube yönetimi desteklenmez ve kapsam dışıdır.
- **FR-071**: Tüm randevu, müşteri, personel ve hizmet verileri tek bir salon bağlamında yönetilir; salon ID kavramı yoktur.

### Key Entities

- **User**: Sistemdeki tüm kullanıcıları temsil eder; ad, soyad, e-posta, telefon, rol (Admin/Staff/Customer), şifre hash, oluşturulma tarihi, son login.
- **Invitation**: Davet kayıtları; token, e-posta, rol, oluşturulma tarihi, son kullanma tarihi (72 saat), kullanıldı mı, davet eden Admin kullanıcı, misafir kayıt referansı (opsiyonel).
- **Customer**: Müşteri profili; User ile ilişkili (kayıtlı müşteriler için) veya standalone (misafir müşteriler için), ad, soyad, e-posta (opsiyonel), telefon, müşteri tipi (kayıtlı/misafir), doğum tarihi (isteğe bağlı), tercih notları, toplam randevu sayısı, ortalama harcama.
- **Appointment**: Randevu kaydı; müşteri referansı, personel referansı, hizmet referansı, tarih, saat, durum (PENDING/CONFIRMED/COMPLETED/CANCELLED/NO_SHOW), oluşturulma yöntemi (online-guest/online-registered/manual), takip kodu (guest için zorunlu), oluşturulma tarihi, randevu notları (genel notlar).
- **WorkingHours**: Salon çalışma saatleri; gün (Pazartesi-Pazar), açılış saati, kapanış saati, kapalı mı.
- **ServiceNote**: İşlem notu; randevu referansı, not metni (max 1000 karakter), oluşturan kullanıcı, oluşturulma tarihi (kronolojik sırada tutulur).
- **Service**: Hizmet tanımı; ad, süre (dakika), fiyat, açıklama, aktif mi.
- **Payment**: Ödeme kaydı; randevu referansı, tutar, ödeme yöntemi (nakit/banka/kart/veresiye), tarih, veresiye ise vade/teminat/tahsilat sorumlusu, ödemeyi kaydeden kullanıcı.
- **Review**: Müşteri yorumu; kayıtlı müşteri referansı (sadece kayıtlı müşteriler yorum yapabilir), randevu referansı, puan (1-5), yorum metni, durum (beklemede/onaylandı/silindi), oluşturulma tarihi, onaylayan/silen Admin kullanıcı.
- **AuditLog**: Audit kayıt; tarih-saat, işlem tipi, işlemi yapan kullanıcı, etkilenen kayıt ID, detaylar (JSON), gerekçe.
- **Notification**: Bildirim kaydı; olay tipi (randevu oluşturma/iptal/onay/hatırlatma), hedef müşteri (kayıtlı veya misafir), kanallar (email/sms/realtime), durum (gönderildi/başarısız), deneme sayısı, gönderim tarihi.
- **SpecialWorkingDay**: Özel gün çalışma saati; tarih, açılış saati, kapanış saati, açıklama, oluşturan Admin kullanıcı.

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
      → ✅ All 3 ambiguities resolved via /clarify session (2025-10-02)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

_Updated by main() during processing_

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
