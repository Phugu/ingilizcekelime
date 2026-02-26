# Proje Yol Haritası (Roadmap) & İlerleme Takibi

Bu dosya, platformun eğitim ve oyunlaştırma (gamification) özelliklerinin gelişim sürecini takip etmek için oluşturulmuştur.

## 🟢 Tamamlanan Özellikler

### 🏆 XP ve Seviye Sistemi
- [x] **Firebase Entegrasyonu:** Kullanıcı profillerine `xp`, `level` ve `total_xp` alanları eklendi.
- [x] **Header UI:** Sağ üst köşeye seviye rozeti (badge) ve XP ilerleme çubuğu eklendi.
- [x] **Dashboard Entegrasyonu:** Ana sayfada (Dashboard) seviye, XP ve toplam puan bilgileri kart olarak eklendi.
- [x] **Puanlama Mantığı:** Kelime öğrenme (+10), doğru cevap (+5), %100 başarı (+50).
- [x] **Bildirim Sistemi:** XP kazanıldığında sağ alt köşede çıkan animasyonlu popup.
- [x] **Profil Entegrasyonu:** Profil sayfasında detaylı gelişim istatistikleri.

### 🔥 Günlük Seri (Streak) Sistemi
- [x] **Aktivite Takibi:** Her gün giriş yapma ve çalışma takibi (Firebase `streak` ve `last_activity_date`).
- [x] **Header UI:** 🔥 (Ateş) ikonu ve gün sayısı gösterimi.
- [x] **Bonus XP:** Günlük ilk çalışma için +20 XP bonusu eklendi.
- [x] **Seri Mantığı:** 24 saatten fazla ara verildiğinde serinin sıfırlanması.

### 🛠️ İyileştirmeler ve Hata Düzeltmeleri
- [x] **Kelime Kartı Tasarımı:** Kartlardaki seviye (A1/A2), kategori ve soru sayısı çakışmaları düzeltildi.
- [x] **Badge Estetiği:** Kategori ve seviye rozetleri birbirinden farklı renklerle (Mavi/Yeşil) netleştirildi.

### 🌓 Tema ve Görünüm (Onboarding)
- [x] **Tema Seçim Ekranı:** İlk girişte kullanıcıya Aydınlık/Karanlık tema seçimi sunan karşılama ekranı.
- [x] **Profil Entegrasyonu:** Tema değiştirme butonu header'dan kaldırılarak profil ayarları sayfasına taşındı.
- [x] **Yerel Depolama (Local Storage):** Seçilen temanın cihazda hatırlanması (`themeSelected`).

### 👤 Misafir Oturumu (Guest Mode)
- [x] **Misafir Girişi:** Üye olmadan uygulamayı deneme imkânı sunan "Misafir Olarak Devam Et" butonu.
- [x] **Gelişmiş Veri Koruması:** Misafir oturumunda veritabanına yazma (kelime öğrenme, quiz sonuçları, XP) işlemleri engellendi.
- [x] **Misafir Uyarı Sistemi:** Puan kazanma animasyonları çalışırken ilerlemenin kaydedilmediğine dair Dashboard, Profil, Liderlik ve Kelime Listesi ekranlarında sarı uyarı mesajları.
- [x] **Güvenlik Kısıtlamaları:** Profil sayfasındaki şifre değiştirme ve hesap silme gibi alanlar misafirlerden gizlendi.

---

## 🟡 Devam Eden / Sıradaki İşlemler

### 📊 Liderlik Tablosu (Leaderboard) - (Tamamlandı ✅)
- [x] **En İyiler Listesi:** En çok XP kazanan ilk 10 kullanıcının listelenmesi.
- [x] **Kullanıcı Sıralaması:** Kullanıcının kendi yerini ve puanını listede vurgulu bir şekilde görmesi.
- [x] **Görsel Tasarım:** Premium avatar ve rütbe ikonları ile şık bir tablo görünümü.
- [x] **Misafir Modu Uyumu:** Misafir kullanıcılarda tablonun yüklenmesini engelleyip giriş yapmaya teşvik eden uyarı mekanizması eklendi.

### 🎯 Günlük Görevler (Daily Quests) - 🚧 (Şu an Üzerinde Çalışılıyor)
- [ ] **Görev Havuzu:** "Bugün 20 kelime öğren", "A1 Quizinden %100 başarı sağla", "Toplam 100 XP kazan" gibi rastgele günlük görevlerin oluşturulması.
- [ ] **Arayüz (UI):** Dashboard (Ana Sayfa) üzerinde görevlerin durumunu ve ilerlemesini gösteren bir "Günlük Görevler" kartı tasarımı.
- [ ] **Ödül Sistemi:** Görevler tamamlandığında otomatik ekstra XP kazandırma ve seriyi artırma yeteneği.
- [ ] **Veritabanı (Firestore):** Kullanıcıların o anki günlük görev ilerlemelerinin `users_private` veya yeni bir alana saatlik/günlük olarak kaydedilip gece 00:00'da sıfırlanması.

### 🎖️ Başarı Rozetleri (Badges)
- [ ] "100 Kelime Öğrendin", "7 Günlük Seri", "İlk Mükemmel Quiz" gibi özel rozetlerin tasarımı ve kazanım mantığı.

> **Eklenebilecek Onlarca Yeni Fikir** için proje kök dizinine `future_features.md` adlı özel doküman yaratılmış ve saklanmıştır.

---

## 🔵 Akıllı Öğrenme Sistemleri (Smart Learning)

### 🧠 Aralıklı Tekrar Sistemi (SRS - Spaced Repetition)
- [ ] Kelimelerin öğrenilme düzeyine göre tekrar zamanlaması (Leitner Sistemi).
- [ ] "Bugün Tekrar Etmen Gereken Kelimeler" bölümü.

### ❌ Hata Havuzu (Mistakes Pool)
- [ ] Quizlerde yanlış cevaplanan kelimelerin otomatik olarak özel bir havuzda toplanması.
- [ ] Yanlış yapılan kelimelere yönelik özel pratik seansları.

---

## 🚀 Gelecek Planları
- [ ] **Seslendirme:** Kelimelerin telaffuzları için ses motoru entegrasyonu.
- [ ] **Grafikler:** İlerleme sayfasına haftalık çalışma grafikleri.
- [ ] **Çoklu Dil Desteği:** Diğer diller için de kelime setleri.
