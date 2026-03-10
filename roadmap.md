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
- [x] **Seri Dondurucu (Streak Freeze):** Çalışma kaçırıldığında seriyi koruyan market eşyası. Artik sınırsız sayıda biriktirilebilir (stackable).

### 🛠️ İyileştirmeler ve Hata Düzeltmeleri
- [x] **Kelime Kartı Tasarımı:** Kartlardaki seviye (A1/A2), kategori ve soru sayısı çakışmaları düzeltildi.
- [x] **Badge Estetiği:** Kategori ve seviye rozetleri birbirinden farklı renklerle (Mavi/Yeşil) netleştirildi.
- [x] **Seslendirme Sistemi:** Kelime kartlarına normal ve yavaş hızda telaffuz butonları eklendi. SVG ikonlar ve tema uyumlu tasarım uygulandı.
- [x] **Mesaj Bildirim Sesi:** Yeni mesaj geldiğinde ve sekme arka plandayken çalan 'ringtonee.m4a' sesli uyarı sistemi eklendi.
- [x] **XP Suistimal Koruması:** Akıllı tekrar (Smart Review) seanslarında XP kazancı suiistimali önlemek için sınırlandırıldı.

### 🌓 Tema ve Görünüm (Onboarding)
- [x] **Tema Seçim Ekranı:** İlk girişte kullanıcıya Aydınlık/Karanlık tema seçimi sunan karşılama ekranı.
- [x] **Profil Entegrasyonu:** Tema değiştirme butonu header'dan kaldırılarak profil ayarları sayfasına taşındı.
- [x] **Yerel Depolama (Local Storage):** Seçilen temanın cihazda hatırlanması (`themeSelected`).

### 👤 Misafir Oturumu (Guest Mode)
- [x] **Misafir Girişi:** Üye olmadan uygulamayı deneme imkânı sunan "Misafir Olarak Devam Et" butonu.
- [x] **Gelişmiş Veri Koruması:** Misafir oturumunda veritabanına yazma (kelime öğrenme, quiz sonuçları, XP) işlemleri engellendi.
- [x] **Misafir Uyarı Sistemi:** Puan kazanma animasyonları çalışırken ilerlemenin kaydedilmediğine dair Dashboard, Profil, Liderlik ve Kelime Listesi ekranlarında sarı uyarı mesajları.
- [x] **Güvenlik Kısıtlamaları:** Profil sayfasındaki şifre değiştirme ve hesap silme gibi alanlar misafirlerden gizlendi.

### 🚨 Kullanıcı Şikayet Sistemi
- [x] **Raporlama Mekanizması:** Uygunsuz, spam vb. profillerin raporlanabilmesi ve veritabanında loglanması (Admin Paneli uyumlu).
- [x] **Otomatik Ban Sistemi:** 10+ şikayet alan veya admin tarafından yasaklanan kullanıcıların uygulamaya erişiminin otomatik engellenmesi.

---

## 🟡 Devam Eden / Sıradaki İşlemler

### 📊 Liderlik Tablosu (Leaderboard) - (Tamamlandı ✅)
- [x] **En İyiler Listesi:** En çok XP kazanan ilk 10 kullanıcının listelenmesi.
- [x] **Kullanıcı Sıralaması:** Kullanıcının kendi yerini ve puanını listede vurgulu bir şekilde görmesi.
- [x] **Görsel Tasarım:** Premium avatar ve rütbe ikonları ile şık bir tablo görünümü.
- [x] **Misafir Modu Uyumu:** Misafir kullanıcılarda tablonun yüklenmesini engelleyip giriş yapmaya teşvik eden uyarı mekanizması eklendi.

### 🎯 Günlük Görevler (Daily Quests) - (Tamamlandı ✅)
- [x] **Görev Havuzu:** "Bugün 20 kelime öğren", "A1 Quizinden %100 başarı sağla", "Toplam 100 XP kazan" gibi rastgele günlük görevlerin oluşturulması.
- [x] **Arayüz (UI):** Dashboard (Ana Sayfa) üzerinde görevlerin durumunu ve ilerlemesini gösteren bir "Günlük Görevler" kartı tasarımı.
- [x] **Ödül Sistemi:** Görevler tamamlandığında otomatik ekstra XP kazandırma ve seriyi artırma yeteneği.
- [x] **Veritabanı (Firestore):** Kullanıcıların o anki günlük görev ilerlemelerinin `users_private` veya yeni bir alana saatlik/günlük olarak kaydedilip gece 00:00'da sıfırlanması.
- [x] **Dinamik Quiz Sistemi:** Tüm seviyeler (A1-C1) için binlerce kelimelik devasa havuzdan beslenen dinamik quiz yapısı kuruldu.
- [x] **Akıllı Çeldiriciler:** Şıkların sorulan kelimeyle aynı kategoriden seçilerek zorlaştırılması sağlandı.

### 🎖️ Başarı Rozetleri (Badges)
- [ ] "100 Kelime Öğrendin", "7 Günlük Seri", "İlk Mükemmel Quiz" gibi özel rozetlerin tasarımı ve kazanım mantığı.

### 🧩 Mini Kelime Oyunları - (Tamamlandı ✅)
- [x] **Word Scramble:** Türkçe anlamı verilen karıştırılmış İngilizce kelimeyi bulma oyunu.
- [x] **Zorluk Seviyeleri:** Word Scramble için A1-C2 seviye seçim ekranı ve seviye bazlı kelime havuzu entegrasyonu.
- [ ] **Hangman:** Klasik adam asmaca oyunu eklentisi.

> **Eklenebilecek Onlarca Yeni Fikir** için proje kök dizinine `future_features.md` adlı özel doküman yaratılmış ve saklanmıştır.

---

## 🔵 Akıllı Öğrenme Sistemleri (Smart Learning)

### 🧠 Aralıklı Tekrar Sistemi (SRS - Spaced Repetition) - (Tamamlandı ✅)
- [x] Kelimelerin öğrenilme düzeyine göre tekrar zamanlaması (Leitner Sistemi).
- [x] "Bugün Tekrar Etmen Gereken Kelimeler" bölümü.

### 🧠 Eksikleri Gider (Smart Review) - (Tamamlandı ✅)
- [x] **Hata Havuzu:** Quizlerde yanlış cevaplanan kelimelerin otomatik olarak `weak_words` koleksiyonunda toplanması.
- [x] **Akıllı Pratik:** Zayıf kelimelere yönelik özel "Eksikleri Gider" seansları.
- [x] **Dinamik Temizlik:** Doğru cevaplanan zayıf kelimelerin otomatik olarak havuzdan silinmesi.

---

## 🚀 Gelecek Planları
- [x] **Seslendirme:** Kelimelerin telaffuzları için ses motoru entegrasyonu (Web Speech API).
- [ ] **Grafikler:** İlerleme sayfasına haftalık çalışma grafikleri.
- [ ] **Çoklu Dil Desteği:** Diğer diller için de kelime setleri.
