# 📚 İngilizce Kelime Öğrenme

**Ücretsiz, gamification destekli İngilizce kelime öğrenme platformu.**

🌐 **Canlı Site:** [ingilizcekelime.com](https://ingilizcekelime.com)

---

## ✨ Özellikler

### 📖 Kelime Öğrenme
- **A1, A2, B1, B2, C1** seviyelerinde kelime kartları
- Her kelime için İngilizce, Türkçe çeviri ve örnek cümle
- Animasyonlu kart geçişleri

### 🎯 Quiz Sistemi
- Her seviye için ayrı quiz setleri
- Çoktan seçmeli sorular
- Anlık doğru/yanlış geri bildirimi
- Quiz geçmişi ve başarı oranı takibi

### 🏆 Gamification (Oyunlaştırma)
- **XP Sistemi:** Kelime öğrenince +10, doğru cevap +5, mükemmel quiz +50 XP
- **Seviye Sistemi:** XP kazandıkça seviye atla
- **🔥 Günlük Seri (Streak):** Her gün platform kullanımını takip et
- **Liderlik Tablosu:** En iyi kullanıcılar sıralaması
- **Animasyonlu bildirimler:** XP kazanınca popup

### 👤 Profil Yönetimi
- İsim ve şifre değiştirme
- Quiz geçmişini görüntüleme
- Gelişim istatistikleri (Seviye, XP, Toplam XP)

### 🎨 Tasarım
- **Dark / Light tema** desteği (tercih kaydedilir)
- Responsive tasarım (mobil & masaüstü)
- Smooth animasyonlar ve micro-interactions

---

## 🛠️ Teknoloji

| Katman | Teknoloji |
|---|---|
| Frontend | Vanilla HTML + CSS + JavaScript (ES Modules) |
| Authentication | Firebase Auth |
| Veritabanı | Firebase Firestore |
| Analytics | Google Analytics |
| Hosting | Netlify |

---

## 🚀 Kurulum

Bu proje tamamen frontend tabanlıdır, backend gerektirmez.

```bash
# Repoyu klonla
git clone https://github.com/Phugu/ingilizcekelime.git

# Klasöre gir
cd ingilizcekelime

# Bir local server ile çalıştır (örnek: VS Code Live Server)
# veya direkt index.html'i tarayıcıda aç
```

> **Not:** Firebase bağlantısı için kendi Firebase projenizi oluşturup `index.html` içindeki `firebaseConfig` değerlerini güncellemeniz gerekir.

---

## 📁 Proje Yapısı

```
ingilizcekelime/
├── index.html          # Ana uygulama (SPA)
├── css/
│   └── style.css       # Tüm stiller (dark/light tema dahil)
├── js/
│   ├── app.js          # Ana uygulama mantığı
│   ├── learning.js     # Kelime öğrenme & quiz motoru
│   ├── config.js       # Güvenlik katmanı
│   └── cookie-consent.js
├── gizlilik-politikasi.html
├── robots.txt
└── sitemap.xml
```

---

## 🗺️ Yol Haritası

- [x] XP ve Seviye Sistemi
- [x] Günlük Seri (Streak) Sistemi
- [x] Liderlik Tablosu (top 10, altın/gümüş/bronz sıralama)
- [x] Profil yönetimi
- [x] Modern navigasyon (pill butonlar, emoji ikonlar)
- [x] Quiz seviye filtreleme (A1-C1 her seviye kendi soruları)
- [ ] Başarı Rozetleri (🎖️ 100 Kelime, 7 Günlük Seri vb.)
- [ ] Aralıklı Tekrar Sistemi (SRS / Leitner)
- [ ] Hata Havuzu (yanlış kelimelere özel pratik)
- [ ] Kelime seslendirme (telaffuz)
- [ ] Haftalık ilerleme grafikleri

---

## 🔒 Telif Hakkı

© 2026 [ingilizcekelime.com](https://ingilizcekelime.com) — Tüm hakları saklıdır.

Bu projenin kaynak kodu izinsiz kopyalanamaz, dağıtılamaz veya ticari amaçla kullanılamaz.
Detaylar için [LICENSE](LICENSE) dosyasına bakınız.
