// App.js - Ana uygulama dosyası (Versiyon: 19:25)
console.error("🚀 MODERASYON MOTORU AKTİF (V19:25)");
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser as firebaseDeleteUser,
    updatePassword,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    Timestamp,
    onSnapshot,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// AI Moderasyon Kara Listesi (Hassas İçerik Filtresi)
const FORBIDDEN_OBJECTS = [
    // İç Giyim & Mayo & Vücut
    'brassiere', 'underpants', 'underwear', 'lingerie', 'bikini', 'swimwear',
    'swimsuit', 'bra', 'briefs', 'nightwear', 'sleepwear', 'activewear',
    'thong', 'g-string', 'monokini', 'panties', 'undergarment', 'topless',
    // Silah & Şiddet
    'gun', 'weapon', 'pistol', 'rifle', 'handgun', 'firearm', 'weaponry',
    'ammunition', 'arm', 'revolver', 'dagger', 'knife', 'sword', 'blade',
    // Zararlı Maddeler & Diğer
    'blood', 'nudity', 'gore', 'corpse', 'drug', 'syringe', 'pills', 'smoke', 'cigarette'
];
import {
    ref,
    uploadBytesResumable,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { WordLearning } from './learning.js';

// Global değişkenler
let currentUser = null;
let wordLearningInstance = null;
const db = window.firestore; // firebase-init.js tarafından initialize edilen global örnek
const auth = window.firebaseAuth; // Already initialized in index.html

// GÜVENLİK: XSS koruması için HTML escape fonksiyonu
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// Çevrimiçi Durum Takibi (Presence)
let presenceInterval = null;
async function setupPresence(userId) {
    if (!userId || (currentUser && currentUser.isGuest)) return;

    const db = window.firestore;
    const userRef = doc(db, "users_public", userId);

    const updateStatus = async (status) => {
        try {
            await updateDoc(userRef, {
                onlineStatus: status,
                lastSeen: Timestamp.now()
            });
        } catch (e) {
            console.error("Durum güncellenemedi:", e);
        }
    };

    // İlk giriş
    await updateStatus('online');

    // Kalp atışı (Heartbeat) - Her 3 dakikada bir
    if (presenceInterval) clearInterval(presenceInterval);
    presenceInterval = setInterval(() => updateStatus('online'), 3 * 60 * 1000);

    // Sekme görünürlüğü değiştiğinde (Opsiyonel: Daha hassas takip için)
    document.onvisibilitychange = () => {
        if (document.visibilityState === 'visible') {
            updateStatus('online');
        } else {
            // Görünür değilse heartbeat devam eder ama anlık güncellenebilir
        }
    };

    // Çıkış yaparken veya pencere kapanırken
    window.addEventListener('beforeunload', () => {
        // Not: beforeunload içinde async işlemler garanti değildir ama denemekte fayda var
        updateDoc(userRef, { onlineStatus: 'offline', lastSeen: Timestamp.now() });
    });
}



// Tüm bölümleri gizle
function hideAllSections() {
    document.getElementById('auth-container').classList.add('hide');
    document.getElementById('app-container').classList.add('hide');
    document.getElementById('login-section').classList.add('hide');
    document.getElementById('register-section').classList.add('hide');
    document.getElementById('verification-section').classList.add('hide');
}

// Tüm içerik bölümlerini gizle
function hideAllContentSections() {
    document.getElementById('dashboard-content').classList.add('hide');
    document.getElementById('learn-content').classList.add('hide');
    document.getElementById('words-content').classList.add('hide');
    document.getElementById('quiz-content').classList.add('hide');
    document.getElementById('profile-content').classList.add('hide');
    document.getElementById('recent-words-content').classList.add('hide');
    document.getElementById('leaderboard-content')?.classList.add('hide');
    document.getElementById('settings-content')?.classList.add('hide');
    document.getElementById('friends-content')?.classList.add('hide');
}

// Aktif navigasyon öğesini güncelle
function updateActiveNav(clickedNav) {
    document.querySelectorAll('.main-nav a').forEach(nav => {
        nav.classList.remove('active');
    });
    clickedNav.classList.add('active');
}

// Ana navigasyon ve sayfa yönetimi
function setupMainNavigation(userId) {
    // Ana menü navigasyonu
    document.getElementById('nav-dashboard').addEventListener('click', async function () {
        hideAllContentSections();
        document.getElementById('dashboard-content').classList.remove('hide');
        updateActiveNav(this);

        // Dashboard'ı başlat
        const dashboard = new Dashboard('dashboard-content', userId);
        await dashboard.init();
    });

    document.getElementById('nav-learn').addEventListener('click', function () {
        hideAllContentSections();
        const learnContent = document.getElementById('learn-content');
        learnContent.classList.remove('hide');
        updateActiveNav(this);

        if (!wordLearningInstance) {
            wordLearningInstance = new WordLearning('learn-content', userId);
        }

        // Eğer içerik boşsa veya sadece dashboard'dan geliniyorsa menüyü göster
        if (learnContent.innerHTML === "") {
            wordLearningInstance.showLevelSelection();
        }
    });

    document.getElementById('nav-quiz').addEventListener('click', function () {
        hideAllContentSections();
        const quizContent = document.getElementById('quiz-content');
        quizContent.classList.remove('hide');
        updateActiveNav(this);

        // Eğer içerik zaten varsa (yani bir quiz menüsü veya devam eden bir quiz varsa) tekrar render etme
        if (quizContent.innerHTML !== "") return;

        // Quiz türlerini yükle
        quizContent.innerHTML = `
            <div class="quiz-container">
                <div class="quiz-description">
                    <h2>İngilizce Kelime Quizleri</h2>
                    <p>Öğrendiğiniz kelimeleri test edin ve bilginizi pekiştirin.</p>
                </div>
                <div class="quiz-types">
                    <div class="quiz-type" id="a1-quiz">
                        <h4>A1 Seviyesi</h4>
                        <p>Temel seviyede kelime bilgisi testi</p>
                    </div>
                    <div class="quiz-type" id="a2-quiz">
                        <h4>A2 Seviyesi</h4>
                        <p>Temel seviyede kelime bilgisi testi</p>
                    </div>
                    <div class="quiz-type" id="b1-quiz">
                        <h4>B1 Seviyesi</h4>
                        <p>Orta seviyede kelime bilgisi testi</p>
                    </div>
                    <div class="quiz-type" id="b2-quiz">
                        <h4>B2 Seviyesi</h4>
                        <p>İleri seviyede kelime bilgisi testi</p>
                    </div>
                    <div class="quiz-type" id="c1-quiz">
                        <h4>C1 Seviyesi</h4>
                        <p>Profesyonel seviyede kelime bilgisi testi</p>
                    </div>
                </div>
                <div id="quiz-list-container" class="hide"></div>
                <div id="quiz-question-container" class="hide"></div>
                <div id="quiz-results-container" class="hide"></div>
            </div>
        `;

        // Quiz türlerine tıklama olaylarını ekle
        ['a1', 'a2', 'b1', 'b2', 'c1'].forEach(level => {
            const quizElement = document.getElementById(`${level}-quiz`);
            if (quizElement) {
                quizElement.addEventListener('click', function () {
                    showQuizList(level);
                });
            }
        });
    });

    document.getElementById('nav-words').addEventListener('click', function (e) {
        e.preventDefault();
        updateActiveNav(this);
        hideAllContentSections();
        const wordsContent = document.getElementById('words-content');
        wordsContent.classList.remove('hide');

        if (wordsContent.innerHTML !== "") return;

        if (!wordLearningInstance) {
            wordLearningInstance = new WordLearning('learn-content', userId);
        }
        const wordListInstance = new WordLearning('words-content', userId);
        wordListInstance.showWordList();
    });

    document.getElementById('nav-recent').addEventListener('click', async function () {
        updateActiveNav(this);
        hideAllContentSections();
        const recentContent = document.getElementById('recent-words-content');
        recentContent.classList.remove('hide');

        // Eğer içerik boşsa yükle, doluysa beklet (veya arka planda güncelle)
        if (recentContent.innerHTML === "") {
            await loadRecentWords(userId, 'all');
        } else {
            // Arka planda sessizce güncelle (kullanıcı bekletilmez)
            loadRecentWords(userId, document.getElementById('recent-level-filter')?.value || 'all');
        }
    });

    document.getElementById('nav-leaderboard').addEventListener('click', async function () {
        hideAllContentSections();
        const lbContent = document.getElementById('leaderboard-content');
        lbContent.classList.remove('hide');
        updateActiveNav(this);
        await loadLeaderboard(lbContent);
    });

    document.getElementById('nav-profile').addEventListener('click', function () {
        hideAllContentSections();
        document.getElementById('profile-content').classList.remove('hide');
        updateActiveNav(this);
        loadProfileContent();
    });

    document.getElementById('nav-friends').addEventListener('click', function (e) {
        e.preventDefault();
        hideAllContentSections();
        document.getElementById('friends-content').classList.remove('hide');
        updateActiveNav(this);

        // friends.js'in global loadFriendsUI fonksiyonu çağrılır
        if (window.loadFriendsUI) {
            window.loadFriendsUI();
        }
    });
}

// Giriş sayfasını göster
function showLoginPage() {
    document.getElementById('auth-container').classList.remove('hide');
    document.getElementById('app-container').classList.add('hide');
    document.getElementById('login-section').classList.remove('hide');
    document.getElementById('register-section').classList.add('hide');
}

// Form olaylarını ayarla
function setupForms() {
    // Login form submit
    document.getElementById('login-form')?.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('Giriş başarılı:', userCredential.user.email);

            // Başarılı giriş - onAuthStateChanged (index.html'de) gerisini otomatik halleder.
            // Sayfayı yenilemeye gerek yok!

        } catch (err) {
            console.error('Giriş hatası:', err);
            const loginError = document.getElementById('login-error');
            if (loginError) {
                let message = 'Giriş yapılamadı: ';
                if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                    message += 'Hatalı e-posta veya şifre.';
                } else {
                    message += err.message;
                }
                loginError.textContent = message;
                loginError.classList.remove('hide');
            }
        }
    });

    // Google ile Giriş / Kayıt
    document.querySelectorAll('.google-login-btn').forEach(btn => {
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            const provider = new GoogleAuthProvider();
            try {
                const result = await signInWithPopup(auth, provider);
                console.log('Google ile giriş başarılı:', result.user.email);
            } catch (err) {
                console.error('Google Giriş Hatası:', err);
                alert('Google ile giriş yapılamadı. Tarayıcınız popup engelliyor olabilir veya ağ hatası var: ' + err.message);
            }
        });
    });

    document.getElementById('guest-login-btn')?.addEventListener('click', function (e) {
        e.preventDefault();
        console.log('Misafir olarak giriş yapılıyor...');
        localStorage.setItem('isGuest', 'true');

        // Başarılı misafir girişi
        window.location.reload();
    });

    // Register form submit
    document.getElementById('register-form')?.addEventListener('submit', async function (e) {
        e.preventDefault();

        // ÇİFT KAYIT ENGELİ
        if (window.isRegistering) return;
        window.isRegistering = true;

        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Kayıt Yapılıyor...';

        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const name = document.getElementById('register-name').value.trim();

        // KVKK: Açık rıza onayı kontrolü
        const kvkkConsent = document.getElementById('kvkk-consent');
        const registerError = document.getElementById('register-error');
        if (kvkkConsent && !kvkkConsent.checked) {
            registerError.textContent = 'Devam etmek için Gizlilik Politikası ve Kullanım Koşullarını kabul etmelisiniz.';
            registerError.classList.remove('hide');
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            return;
        }

        // GÜVENLİK: Şifre politikası kontrolü
        if (password.length < 8) {
            registerError.textContent = 'Şifre en az 8 karakter olmalıdır.';
            registerError.classList.remove('hide');
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            return;
        }
        if (!/[A-Z]/.test(password)) {
            registerError.textContent = 'Şifre en az 1 büyük harf içermelidir.';
            registerError.classList.remove('hide');
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            return;
        }
        if (!/[0-9]/.test(password)) {
            registerError.textContent = 'Şifre en az 1 rakam içermelidir.';
            registerError.classList.remove('hide');
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            return;
        }
        // GÜVENLİK: İsim doğrulama
        if (name.length < 2 || name.length > 50) {
            registerError.textContent = 'İsim 2-50 karakter arasında olmalıdır.';
            registerError.classList.remove('hide');
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            return;
        }

        try {
            console.log("Kayıt işlemi başlatılıyor: ", email);
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Profil ismini güncelle
            await updateProfile(user, {
                displayName: name
            });

            // Firestore'da kullanıcı dökümanlarını MİMARİ OLARAK BÖL (Public & Private)
            const publicData = {
                name: name,
                xp: 0,
                level: 1,
                total_xp: 0,
                streak: 0,
                createdAt: Timestamp.now()
            };
            const privateData = {
                email: email,
                kvkkAccepted: true,
                kvkkAcceptedAt: Timestamp.now(),
                accountStatus: 'active'
            };

            await setDoc(doc(db, "users_public", user.uid), publicData);
            await setDoc(doc(db, "users_private", user.uid), privateData);

            console.log('Kayıt başarılı, dökümanlar oluşturuldu. E-posta onayına geçiliyor...');

            // KAYIT SONRASI - MODERN ONAY KODU SİSTEMİ (Yeni)
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

            // Onay kodunu ve durumu Firestore'da sakla
            await updateDoc(doc(db, "users_private", user.uid), {
                verificationCode: verificationCode,
                isVerified: false,
                verificationSentAt: Timestamp.now()
            });

            // E-posta gönderim tetikleyicisi (Trigger Email extension için)
            await setDoc(doc(db, "mail", user.uid + "_" + Date.now()), {
                to: email,
                message: {
                    subject: 'İngilizce Kelime - Giriş Onay Kodunuz',
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                            <h2 style="color: #4CAF50;">Hoş Geldiniz!</h2>
                            <p>Kayıt işleminizi tamamlamak için aşağıdaki 6 haneli onay kodunu uygulamaya giriniz:</p>
                            <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; border-radius: 8px;">
                                ${verificationCode}
                            </div>
                            <p style="margin-top: 20px;">Bu kod tek kullanımlıktır. Eğer bu işlemi siz yapmadıysanız lütfen bu e-postayı dikkate almayınız.</p>
                        </div>
                    `
                }
            });

            console.log('Kayıt başarılı, onay kodu gönderildi.');
            window.initialVerificationSent = true;

            // Kayıt bitti bayrağı kaldır
            window.isRegistering = false;

            // onAuthStateChanged (index.html içinde) auth durumunu fark edip
            // otomatik olarak bizi doğrulama sayfasına geçirecek. Yenilemeye gerek yok.

        } catch (err) {
            console.error('Kayıt hatası:', err);

            // Kayıt işlemi başarısız olsa da bayrağı kaldırıyoruz
            window.isRegistering = false;

            const registerError = document.getElementById('register-error');
            if (registerError) {
                let message = 'Kayıt oluşturulamadı: ';
                if (err.code === 'auth/email-already-in-use') {
                    message += 'Bu e-posta adresi zaten kullanımda.';
                } else if (err.code === 'auth/weak-password') {
                    message += 'Şifre çok zayıf, en az 6 karakter olmalıdır.';
                } else if (err.code === 'auth/invalid-email') {
                    message += 'Geçersiz bir e-posta adresi girdiniz.';
                } else if (err.code === 'permission-denied' || (err.message && err.message.includes('permission'))) {
                    message += 'Yetki hatası. İşlem tamamlanamadı.';
                } else {
                    message += 'Bilinmeyen bir hata oluştu (' + (err.code || 'Bilinmiyor') + ').';
                }
                registerError.textContent = message;
                registerError.classList.remove('hide');
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });

    // Kod Doğrulama Butonunu Dinle (Yeni)
    document.getElementById('verify-code-btn')?.addEventListener('click', async function () {
        const codeInput = document.getElementById('verification-code-input');
        const errorDiv = document.getElementById('verification-error');
        const code = codeInput.value.trim();

        if (code.length !== 6 || isNaN(code)) {
            errorDiv.textContent = 'Lütfen 6 haneli geçerli bir kod giriniz.';
            errorDiv.classList.remove('hide');
            return;
        }

        try {
            this.disabled = true;
            this.textContent = 'Doğrulanıyor...';
            errorDiv.classList.add('hide');

            const userId = auth.currentUser.uid;
            const privateDoc = await getDoc(doc(db, "users_private", userId));
            const pData = privateDoc.data();

            if (pData && pData.verificationCode === code) {
                // BAŞARILI
                await updateDoc(doc(db, "users_private", userId), {
                    isVerified: true,
                    verificationCode: null // Kodu temizle
                });

                document.getElementById('verification-message').textContent = 'Başarıyla doğrulandı! Yönlendiriliyorsunuz...';
                document.getElementById('verification-message').classList.remove('hide');

                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                errorDiv.textContent = 'Hatalı kod girdiniz. Lütfen tekrar deneyin.';
                errorDiv.classList.remove('hide');
                this.disabled = false;
                this.textContent = 'Kodu Doğrula ve Giriş Yap';
            }
        } catch (err) {
            console.error('Doğrulama Hatası:', err);
            errorDiv.textContent = 'Bir hata oluştu. Lütfen tekrar deneyin.';
            errorDiv.classList.remove('hide');
            this.disabled = false;
            this.textContent = 'Kodu Doğrula ve Giriş Yap';
        }
    });

    // Kod Tekrar Gönder Butonunu Dinle (Yeni)
    document.getElementById('resend-verification-btn')?.addEventListener('click', async function () {
        try {
            this.disabled = true;
            const originalText = this.textContent;
            this.textContent = 'Gönderiliyor...';

            const user = auth.currentUser;
            const newCode = Math.floor(100000 + Math.random() * 900000).toString();

            await updateDoc(doc(db, "users_private", user.uid), {
                verificationCode: newCode,
                verificationSentAt: Timestamp.now()
            });

            await setDoc(doc(db, "mail", user.uid + "_" + Date.now()), {
                to: user.email,
                message: {
                    subject: 'İngilizce Kelime - Yeni Onay Kodunuz',
                    html: `<p>Yeni onay kodunuz: <b>${newCode}</b></p>`
                }
            });

            document.getElementById('verification-message').textContent = 'Yeni kod e-posta adresinize gönderildi.';
            document.getElementById('verification-message').classList.remove('hide');

            // 60 saniye cooldown
            let timeLeft = 60;
            const timer = setInterval(() => {
                timeLeft--;
                this.textContent = `Tekrar Gönder (${timeLeft}s)`;
                if (timeLeft <= 0) {
                    clearInterval(timer);
                    this.disabled = false;
                    this.textContent = 'Kodu Tekrar Gönder';
                }
            }, 1000);

        } catch (err) {
            console.error('Kod tekrar gönderilemedi:', err);
            alert('Kod gönderilirken bir hata oluştu.');
            this.disabled = false;
            this.textContent = 'Kodu Tekrar Gönder';
        }
    });

    // Verification Logout
    document.getElementById('verification-logout-btn')?.addEventListener('click', async function () {
        await signOut(auth);
        window.location.reload();
    });
}

// Uygulama başlatma fonksiyonu
async function initApp() {
    console.log('Uygulama başlatılıyor...');

    try {
        // Tüm bölümleri gizle
        hideAllSections();

        // Aktif oturumu kontrol et
        let user = auth.currentUser;

        if (!user && localStorage.getItem('isGuest') === 'true') {
            // GÜVENLİK: Her misafir oturumunda benzersiz ID üret
            let guestId = sessionStorage.getItem('guestSessionId');
            if (!guestId) {
                guestId = 'guest_' + crypto.randomUUID();
                sessionStorage.setItem('guestSessionId', guestId);
            }
            user = {
                uid: guestId,
                displayName: 'Misafir Kullanıcı',
                isGuest: true
            };
        }

        console.log('Session kontrolü:', user ? 'Aktif oturum var' : 'Oturum yok');

        if (!user) {
            console.log('Aktif oturum bulunamadı, giriş sayfası gösteriliyor');
            showLoginPage();
            return;
        }

        // Global currentUser'ı ayarla
        currentUser = user;
        window.currentUser = user; // Dış dosyaların erişimi için
        const userId = currentUser.uid;
        console.log('Aktif kullanıcı kimliği:', userId);

        // Küresel Sohbet Dinleyicisini Başlat (Bildirimler ve Ses için)
        if (typeof window.setupGlobalChatListener === 'function') {
            window.setupGlobalChatListener();
            console.log("💬 Sohbet dinleyicisi aktif edildi.");
        }

        // Kullanıcı adını göster (header'dan kaldırıldı, sadece profil sayfasında gösteriliyor)
        // Firebase uses displayName or we'll fetch from Firestore
        const userName = user.displayName || user.email;
        console.log('Kullanıcı adı ayarlanıyor:', userName);
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) userNameEl.textContent = userName;

        // Kullanıcı İstatistiklerini (XP, Seviye, Streak) yükle ve göster
        await loadUserStats(userId);

        // Çıkış yap butonunu ayarla
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = async function () {
                try {
                    if (user.isGuest) {
                        localStorage.removeItem('isGuest');
                    } else {
                        // Offline yap
                        try {
                            await updateDoc(doc(db, "users_public", userId), {
                                onlineStatus: 'offline',
                                lastSeen: Timestamp.now()
                            });
                        } catch (e) { }
                        await signOut(auth);
                    }
                    localStorage.removeItem('isLoggedIn');
                    window.location.reload();
                } catch (err) {
                    console.error('Çıkış yaparken hata:', err);
                    alert('Çıkış yapılırken bir hata oluştu: ' + err.message);
                }
            };
        }

        // Uygulama konteynerini göster
        document.getElementById('auth-container').classList.add('hide');
        document.getElementById('app-container').classList.remove('hide');

        // Ana navigasyonu ayarla
        setupMainNavigation(userId);

        // Global Chat Listener Başlat
        if (window.setupGlobalChatListener) {
            window.setupGlobalChatListener();
        }

        // Dashboard'ı başlat
        const dashboard = new Dashboard('dashboard-content', userId);
        await dashboard.init();

        // Dashboard'ı varsayılan olarak göster
        document.getElementById('dashboard-content').classList.remove('hide');
        document.getElementById('nav-dashboard').classList.add('active');

        // Sağ üst istatistik paneline tıklama özelliği ekle (Profil açar)
        const statsHeader = document.querySelector('.user-stats-header');
        if (statsHeader) {
            statsHeader.style.cursor = 'pointer';
            statsHeader.addEventListener('click', () => {
                const profileNav = document.getElementById('nav-profile');
                if (profileNav) profileNav.click();
            });
        }

        // Çevrimiçi durum takibi (Presence) başlat
        setupPresence(userId);

        // Çerez uyarısını göster
        setTimeout(() => {
            initCookieConsent();

            // İlk girişte tema seçim ekranını göster
            if (!localStorage.getItem('themeSelected')) {
                showThemeSelectionModal();
            }
        }, 1000);

    } catch (error) {
        console.error('Uygulama başlatma hatası:', error);
        showLoginPage();
    }
}

// Kullanıcı istatistiklerini (XP ve Seri) yükle
async function loadUserStats(userId) {
    if (currentUser && currentUser.isGuest) {
        // Misafir kullanıcı için varsayılan istatistikler
        updateXPUI(0, 1);
        updateStreakUI(0, null);
        return;
    }

    try {
        let publicDoc = await getDoc(doc(db, "users_public", userId));
        let privateDoc = await getDoc(doc(db, "users_private", userId));

        // LAZY MIGRATION: Eski "users" koleksiyonunu taşı
        if (!publicDoc.exists() || !privateDoc.exists()) {
            const oldUserDoc = await getDoc(doc(db, "users", userId));

            if (oldUserDoc.exists()) {
                console.log('Eski users koleksiyonundan Public/Private aktarımı yapılıyor...');
                const oldData = oldUserDoc.data();

                const publicData = {
                    name: currentUser.displayName || oldData.name || 'Anonim',
                    xp: oldData.xp || 0,
                    level: oldData.level || 1,
                    total_xp: oldData.total_xp || 0,
                    streak: oldData.streak || 0,
                    createdAt: oldData.createdAt || Timestamp.now()
                };

                const privateData = {
                    email: currentUser.email || oldData.email || '',
                    kvkkAccepted: oldData.kvkkAccepted || false,
                    kvkkAcceptedAt: oldData.kvkkAcceptedAt || null,
                    accountStatus: oldData.accountStatus || 'active',
                    deletionDate: oldData.deletionDate || null
                };

                await setDoc(doc(db, "users_public", userId), publicData);
                await setDoc(doc(db, "users_private", userId), privateData);

                publicDoc = { exists: () => true, data: () => publicData };
                privateDoc = { exists: () => true, data: () => privateData };
            } else {
                // Hiçbir döküman yoksa (Google Auth ile giren tamamen yeni kullanıcı)
                console.log('Kullanıcı dökümanı bulunamadı, yeni public/private oluşturuluyor...');
                const publicData = {
                    name: currentUser.displayName || 'Anonim',
                    xp: 0,
                    level: 1,
                    total_xp: 0,
                    streak: 0,
                    createdAt: Timestamp.now()
                };
                const privateData = {
                    email: currentUser.email || '',
                    kvkkAccepted: false, // Google ile girenler için modal gösterilsin
                    accountStatus: 'active'
                };

                await setDoc(doc(db, "users_public", userId), publicData);
                await setDoc(doc(db, "users_private", userId), privateData);

                publicDoc = { exists: () => true, data: () => publicData };
                privateDoc = { exists: () => true, data: () => privateData };
            }
        }

        const publicData = publicDoc.data();
        const privateData = privateDoc.data();

        // Kullanıcının tamamladığı bölüm dizisini oturuma aktar
        if (currentUser) {
            currentUser.completed_pools = publicData.completed_pools || [];
        }

        // 30 GÜNLÜK HESAP SİLME KONTROLÜ (Soft Delete)
        if (privateData && privateData.accountStatus === 'pending_deletion') {
            const now = new Date();
            const deleteAt = privateData.deletionDate ? privateData.deletionDate.toDate() : new Date();

            if (now > deleteAt) {
                // 30 gün dolmuş, kalıcı silme işlemi (Gerçek hard delete)
                try {
                    const learnedWordsQuery = query(collection(db, "learned_words"), where("user_id", "==", userId));
                    const learnedWordsSnapshot = await getDocs(learnedWordsQuery);
                    for (const docRef of learnedWordsSnapshot.docs) { await deleteDoc(docRef.ref); }

                    const quizResultsQuery = query(collection(db, "quiz_results"), where("user_id", "==", userId));
                    const quizResultsSnapshot = await getDocs(quizResultsQuery);
                    for (const docRef of quizResultsSnapshot.docs) { await deleteDoc(docRef.ref); }

                    await deleteDoc(doc(db, "user_progress", userId));
                    await deleteDoc(doc(db, "users_private", userId));
                    await deleteDoc(doc(db, "users_public", userId));
                    await deleteDoc(doc(db, "users", userId)); // Eski yedek varsa sil

                    try { await firebaseDeleteUser(currentUser); } catch (e) { console.error('Auth user silinemedi:', e); }

                    await signOut(auth);
                    alert('Hesabınızın 30 günlük silinme süresi dolmuş ve kalıcı olarak silinmiştir.');
                    window.location.reload();
                    return;
                } catch (err) {
                    console.error("Otomatik silme başarısız:", err);
                }
            } else {
                // 30 gün dolmamış, iptal etmek ister mi?
                const daysLeft = Math.ceil((deleteAt - now) / (1000 * 60 * 60 * 24));
                const restore = confirm('Hesabınız silinme aşamasında (Kalan süre: ' + daysLeft + ' gün). Silme işlemini iptal edip hesabınızı kurtarmak ister misiniz?');
                if (restore) {
                    await updateDoc(doc(db, "users_private", userId), {
                        accountStatus: "active",
                        deletionDate: null
                    });
                    alert('Hesabınız başarıyla kurtarıldı. Tekrar hoş geldiniz!');
                } else {
                    await signOut(auth);
                    window.location.reload();
                    return;
                }
            }
        }


        // KVKK ZORUNLU ONAY KONTROLÜ (Eski kullanıcılar için)
        if (privateData && privateData.kvkkAccepted !== true) {
            console.log('Kullanıcı henüz KVKK sözleşmesini onaylamamış. Modal gösteriliyor...');
            const kvkkModal = document.getElementById('kvkk-update-modal');
            if (kvkkModal) {
                kvkkModal.classList.remove('hide');

                // Onay butonunu dinle
                const submitBtn = document.getElementById('kvkk-update-submit');
                const checkbox = document.getElementById('kvkk-update-consent');
                const errorDiv = document.getElementById('kvkk-update-error');

                if (submitBtn && checkbox && errorDiv) {
                    submitBtn.onclick = async () => {
                        if (!checkbox.checked) {
                            errorDiv.textContent = 'Devam edebilmek için koşulları kabul etmelisiniz.';
                            errorDiv.classList.remove('hide');
                            return;
                        }

                        try {
                            submitBtn.disabled = true;
                            submitBtn.textContent = 'Onaylanıyor...';

                            // Kullanıcı profilini güncelle
                            await updateDoc(doc(db, "users_private", userId), {
                                kvkkAccepted: true,
                                kvkkAcceptedAt: Timestamp.now()
                            });

                            console.log('KVKK onayı başarıyla kaydedildi.');
                            kvkkModal.classList.add('hide'); // Modalı kapat
                        } catch (err) {
                            console.error('KVKK onayı kaydedilemedi:', err);
                            errorDiv.textContent = 'Bir hata oluştu. Lütfen bağlantınızı kontrol edip tekrar deneyin.';
                            errorDiv.classList.remove('hide');
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Onaylıyorum ve Devam Et';
                        }
                    };
                }
            }
        }

        // GÜNLÜK GÖREV (DAILY QUESTS) KONTROLÜ VE ÜRETİMİ
        try {
            await checkAndGenerateDailyQuests(userId, privateData);
        } catch (err) {
            console.error('Günlük görevler kontrol edilirken hata oluştu:', err);
        }

        // XP ve Level güncelle
        const xp = publicData.xp || 0;
        const level = publicData.level || 1;
        updateXPUI(xp, level);

        // Streak (Seri) güncelle - study_streak ismine de bak (geriye dönük uyum)
        let streak = publicData.streak || publicData.study_streak || 0;
        const lastActivity = publicData.last_activity_date?.toDate() || null;

        // EĞER SERİ SIFIRLANDIYSA (Daha önce vardı ama bugün/dün etkinlik yoksa)
        if ((publicData.streak > 0 || publicData.study_streak > 0) && lastActivity && !isToday(lastActivity) && !isYesterday(lastActivity)) {

            // Seri Dondurucu Kontrolü
            let hasFreeze = false;
            let inventory = privateData?.inventory || { streak_freeze: 0 };

            if (inventory.streak_freeze > 0) {
                hasFreeze = true;
                inventory.streak_freeze -= 1;

                // Envanteri güncelle ve son aktivite tarihini düne çek (böylece yarın devam edebilir)
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                const userPrivateRef = doc(db, "users_private", userId);
                const userPublicRef = doc(db, "users_public", userId);

                Promise.all([
                    updateDoc(userPrivateRef, { inventory: inventory }),
                    updateDoc(userPublicRef, { last_activity_date: Timestamp.fromDate(yesterday) })
                ]).catch(err => console.error("Seri dondurucu hatası:", err));

                // Kullanıcıya bilgi ver
                setTimeout(() => {
                    alert("❄️ Seri Dondurucu Kullanıldı! Seriniz bozulmadı ancak dondurucunuzu tekrar mağazadan almayı unutmayın.");
                }, 1500);
            }

            if (!hasFreeze) {
                streak = 0;

                // KRİTİK: Veritabanını hemen güncelle ki sayfa yenilenince tekrar tetiklenmesin
                const userPublicRef = doc(db, "users_public", userId);
                updateDoc(userPublicRef, { streak: 0 }).catch(err => console.error("Streak reset update error:", err));

                // Animasyonu login'den 2 saniye sonra başlat ki kullanıcı görsün
                setTimeout(() => {
                    if (window.showStreakResetEffect) window.showStreakResetEffect();
                }, 2000);
            }
        } else if (lastActivity && !isToday(lastActivity) && !isYesterday(lastActivity)) {
            streak = 0;
        }

        updateStreakUI(streak, lastActivity);
    } catch (error) {
        console.error('İstatistikler yüklenirken hata:', error);
    }
}

// Günlük Görev Üretici ve Kontrolcüsü
async function checkAndGenerateDailyQuests(userId, privateData) {
    if (currentUser && currentUser.isGuest) return; // Misafirler görev kullanamaz
    if (!privateData) return;

    const todayStr = new Date().toISOString().split('T')[0];

    // Görevler var mı ve bugüne mi ait?
    const hasValidQuests = privateData.dailyQuests && privateData.dailyQuests.date === todayStr;

    if (!hasValidQuests) {
        console.log('Günlük görevler yenileniyor veya ilk defa oluşturuluyor...');

        // Görev havuzu
        const allPossibleQuests = [
            { type: 'learn_words', target: 20, progress: 0, reward: 50, isClaimed: false, title: '20 Kelime Öğren', icon: '🎯' },
            { type: 'earn_xp', target: 100, progress: 0, reward: 40, isClaimed: false, title: '100 XP Kazan', icon: '⭐' },
            { type: 'take_quiz', target: 1, progress: 0, reward: 30, isClaimed: false, title: '1 Quiz Çöz', icon: '📝' },
            { type: 'learn_words', target: 10, progress: 0, reward: 25, isClaimed: false, title: '10 Kelime Öğren', icon: '🎯' },
            { type: 'earn_xp', target: 50, progress: 0, reward: 20, isClaimed: false, title: '50 XP Kazan', icon: '⭐' },
            { type: 'take_quiz', target: 2, progress: 0, reward: 50, isClaimed: false, title: '2 Quiz Çöz', icon: '📝' }
        ];

        // 3 rastgele görev seç
        const shuffled = allPossibleQuests.sort(() => 0.5 - Math.random());
        const selectedQuests = JSON.parse(JSON.stringify(shuffled.slice(0, 3))); // Deep copy

        // id'leri atama
        selectedQuests.forEach((q, i) => q.id = 'q' + (i + 1));

        const dailyQuestsObj = {
            date: todayStr,
            quests: selectedQuests
        };

        // Veritabanına kaydet
        await updateDoc(doc(db, "users_private", userId), {
            dailyQuests: dailyQuestsObj
        });

        // Bellekteki veriyi de referans olarak tazele
        privateData.dailyQuests = dailyQuestsObj;
    }
}

// Görev İlerlemesini (Progress) Günceller
export async function updateQuestProgress(type, amount = 1) {
    const activeUser = window.firebaseAuth ? window.firebaseAuth.currentUser : currentUser;
    if (!activeUser || (currentUser && currentUser.isGuest)) return;

    const userId = activeUser.uid;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
        const privateRef = doc(db, "users_private", userId);
        const privateDoc = await getDoc(privateRef);

        if (!privateDoc.exists()) return;
        const pData = privateDoc.data();

        // Görevler eskimiş veya hiç yoksa çıkış yap (sıradaki initApp'te düzelir)
        if (!pData.dailyQuests || pData.dailyQuests.date !== todayStr) return;

        let updated = false;
        const quests = pData.dailyQuests.quests.map(q => {
            if (q.type === type && !q.isClaimed && q.progress < q.target) {
                q.progress += amount;
                if (q.progress >= q.target) {
                    q.progress = q.target;
                    console.log(`Görev tamamlandı: ${q.title}`);
                }
                updated = true;
            }
            return q;
        });

        // Güncelleme varsa Firestore'a kaydet (Arka planda çalışır, UI'ı bölmez)
        if (updated) {
            await updateDoc(privateRef, {
                'dailyQuests.quests': quests
            });
            console.log(`✔️ Görev durumu güncellendi: [${type}] +${amount}`);
        }
    } catch (err) {
        console.error('Görev güncellenirken hata (updateQuestProgress):', err);
    }
}

// Tarih yardımcı fonksiyonları
function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
}

function isYesterday(date) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();
}

// Seri UI'ını güncelle
function updateStreakUI(streak, lastActivity) {
    const streakCount = document.getElementById('streak-count');
    const streakBadge = document.getElementById('user-streak');

    if (streakCount) streakCount.textContent = streak;

    if (streakBadge) {
        if (streak > 0 && lastActivity && isToday(lastActivity)) {
            streakBadge.classList.add('active');
        } else {
            streakBadge.classList.remove('active');
        }
    }
}

// GÜVENLİK BOTU - GÜNLÜK SERİ SIFIRLANMA EFEKTİ (VİDEOLU POP-UP)
window.showStreakResetEffect = function () {
    // 1. Pop-up ve Video Hazırla (Başlangıçta gizli)
    let alertBox = document.getElementById('streak-reset-alert');
    if (!alertBox) {
        alertBox = document.createElement('div');
        alertBox.id = 'streak-reset-alert';
        alertBox.className = 'streak-reset-alert';
        alertBox.innerHTML = `
            <button id="close-streak-alert" class="streak-close-btn" style="opacity: 0; pointer-events: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <div id="streak-video-wrapper" style="width: 100%; margin-bottom: 20px; border-radius: 15px; overflow: hidden; background: #000; display: flex; align-items: center; justify-content: center;">
                <video id="streak-reset-video" muted playsinline preload="auto" style="width: 100%; display: block;">
                    <source src="assets/videos/streak-reset.mp4" type="video/mp4">
                </video>
            </div>
            <h2>Günlük Serin Sıfırlandı!</h2>
            <p>Dünü boş geçtiğin için serin kırıldı. Pes etme, hemen bugün bir başarı kazan ve yeniden başla!</p>
        `;
        document.body.appendChild(alertBox);
    }

    const video = alertBox.querySelector('#streak-reset-video');
    const closeBtn = alertBox.querySelector('#close-streak-alert');

    // 2. Arka planı karart (Başlangıçta görünmez)
    let overlay = document.getElementById('streak-reset-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'streak-reset-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:10000;opacity:0;transition:opacity 0.5s;pointer-events:none;';
        document.body.appendChild(overlay);
    }

    // Kapatma fonksiyonu
    const closePopup = () => {
        alertBox.classList.remove('show');
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        setTimeout(() => {
            overlay.remove();
            alertBox.remove();
        }, 1000);
        if (window.streakAutoCloseTimer) clearTimeout(window.streakAutoCloseTimer);
    };

    if (closeBtn) closeBtn.onclick = closePopup;

    // 3. Video tamamen yüklendiğinde her şeyi göster
    const showEverything = () => {
        if (alertBox.classList.contains('show')) return; // Zaten gösterildiyse tekrar etme

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            overlay.style.pointerEvents = 'auto';
            alertBox.classList.add('show');
            video.play().catch(err => console.error("Video play error:", err));
        });

        // 3 saniye sonra kapatma butonunu göster
        setTimeout(() => {
            if (closeBtn) {
                closeBtn.style.opacity = '1';
                closeBtn.style.pointerEvents = 'auto';
            }
        }, 3000);

        // Otomatik Kapatma
        video.onended = () => {
            window.streakAutoCloseTimer = setTimeout(closePopup, 5000);
        };
    };

    if (video) {
        // Video hazır olduğunda göster
        video.oncanplaythrough = showEverything;

        // Eğer zaten hazırsa hemen göster
        if (video.readyState >= 4) {
            showEverything();
        }

        // Güvenlik: Eğer 10 saniye içinde video yüklenmezse yine de göster veya hata ver
        setTimeout(() => {
            if (!alertBox.classList.contains('show')) {
                console.warn("Video yüklenmesi gecikti, popup yine de gösteriliyor.");
                showEverything();
            }
        }, 15000);

        video.onerror = () => {
            console.error("Video hatası, popup video olmadan gösteriliyor.");
            showEverything();
        };
    }
};

// XP UI'ını güncelle
function updateXPUI(xp, level) {
    const nextLevelXP = level * 200; // Her seviye için gereken XP formülü (basit tutuldu)
    const xpPercent = (xp / nextLevelXP) * 100;

    const levelBadge = document.getElementById('user-level-badge');
    const xpText = document.getElementById('xp-text');
    const xpBarFill = document.getElementById('xp-bar-fill');

    if (levelBadge) levelBadge.textContent = `Seviye ${level}`;
    if (xpText) xpText.textContent = `${xp} / ${nextLevelXP} XP`;
    if (xpBarFill) xpBarFill.style.width = `${xpPercent}%`;
}

// XP Kazandırma Fonksiyonu
// GÜVENLİK: Rate limiting ve maks XP sınırı
let lastXPTime = 0;
const XP_COOLDOWN_MS = 2000; // 2 saniyede bir XP verilebilir
const MAX_XP_PER_CALL = 50;  // Tek seferde maksimum XP

// Dahili modül kullanımı için XP Kazandırma Fonksiyonu export edildi (Güvenlik nedeniyle window nesnesinde değil)
export async function giveXP(amount, reason = "Tebrikler!") {
    // GÜVENLİK: Rate limiting kontrolü
    const now = Date.now();
    if (now - lastXPTime < XP_COOLDOWN_MS) {
        console.warn('XP çok hızlı verilmeye çalışıldı, reddedildi.');
        return;
    }
    lastXPTime = now;

    // GÜVENLİK: Maksimum XP sınırı
    amount = Math.min(Math.max(0, Math.floor(amount)), MAX_XP_PER_CALL);
    console.log(`giveXP çağrıldı: ${amount} XP, Sebep: ${reason}`);

    if (currentUser && currentUser.isGuest) {
        console.log('Misafir kullanıcısı için XP kaydedilmiyor, sadece bildirim gösteriliyor.');
        showXPNotification(amount, reason, false);
        return;
    }

    // currentUser yerine doğrudan auth.currentUser kullan (daha güvenli)
    const activeUser = window.firebaseAuth ? window.firebaseAuth.currentUser : currentUser;

    if (!activeUser) {
        console.warn('giveXP başarısız: Aktif kullanıcı (auth.currentUser) bulunamadı.');
        return;
    }

    try {
        const userPublicRef = doc(db, "users_public", activeUser.uid);
        let publicDoc = await getDoc(userPublicRef);

        let publicData;
        if (!publicDoc.exists()) {
            // Hala eksikse fallback yap (Güvenlik)
            publicData = { xp: 0, level: 1, total_xp: 0, streak: 0 };
            await setDoc(userPublicRef, { ...publicData, createdAt: Timestamp.now(), name: activeUser.displayName || 'Anonim' });
        } else {
            publicData = publicDoc.data();
        }

        let { xp, level, total_xp, streak, last_activity_date } = publicData;
        xp = xp || 0;
        level = level || 1;
        total_xp = total_xp || 0;
        streak = streak || 0;

        const lastDate = last_activity_date?.toDate() || null;
        let streakBonus = 0;

        // Günlük Seri (Streak) Kontrolü
        if (!lastDate || !isToday(lastDate)) {
            if (lastDate && isYesterday(lastDate)) {
                streak++;
            } else {
                streak = 1;
            }

            // Günlük İlk Giriş Bonusu
            streakBonus = 20;
            xp += streakBonus;
            total_xp += streakBonus;
            last_activity_date = Timestamp.now();

            showXPNotification(streakBonus, "Günlük Seri Bonusu! 🔥", false);
        }

        xp += amount;
        total_xp += amount;

        let nextLevelXP = level * 200;
        let leveledUp = false;

        // Level atlama kontrolü
        while (xp >= nextLevelXP) {
            xp -= nextLevelXP;
            level++;
            nextLevelXP = level * 200;
            leveledUp = true;
        }

        await updateDoc(userPublicRef, {
            xp: xp,
            level: level,
            total_xp: total_xp,
            streak: streak,
            last_activity_date: last_activity_date || Timestamp.now()
        });

        updateXPUI(xp, level);
        updateStreakUI(streak, new Date()); // Şu an aktif oldu

        // Günlük Görev (Daily Quest) ilerlemesini kaydet
        await updateQuestProgress('earn_xp', amount);

        // XP Bildirimi Göster
        showXPNotification(amount, reason, leveledUp);
    } catch (error) {
        console.error('XP güncellenirken hata:', error);
    }
}

// XP Bildirimi (Popup)
function showXPNotification(amount, reason, leveledUp) {
    const notification = document.createElement('div');
    notification.className = 'xp-notification';
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--primary-color);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: center;
        animation: slideInDown 0.5s ease-out, fadeOut 0.5s ease-in 2.5s forwards;
    `;

    notification.innerHTML = `
        <span style="font-weight: bold; font-size: 18px;">+${amount} XP</span>
        <span style="font-size: 14px;">${reason}</span>
        ${leveledUp ? '<span style="color: #f1c40f; font-weight: bold; margin-top: 5px; font-size: 16px;">🎉 SEVİYE ATLADIN! 🎉</span>' : ''}
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// GÜVENLİK: Sadece gerekli fonksiyonları window'a ekle (tehlikeli olanlar hariç)
window.initApp = initApp;
// giveXP artık doğrudan window'dan çağrılamaz (hile engeli)
// window.giveXP kaldırıldı — sadece dahili kullanım için

// Çerez uyarısını başlat
function initCookieConsent() {
    const cookieConsent = document.querySelector('.cookie-consent');
    if (!cookieConsent) return;

    // Check if user already accepted cookies
    if (!localStorage.getItem('cookiesAccepted')) {
        // Show the cookie consent after a short delay
        setTimeout(() => {
            cookieConsent.classList.add('active');
        }, 1000);
    }

    // Accept button
    const acceptBtn = document.querySelector('.cookie-accept');
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
            localStorage.setItem('cookiesAccepted', 'true');
            cookieConsent.classList.remove('active');
        });
    }

    // Decline button
    const declineBtn = document.querySelector('.cookie-decline');
    if (declineBtn) {
        declineBtn.addEventListener('click', () => {
            localStorage.setItem('cookiesDeclined', 'true');
            cookieConsent.classList.remove('active');

            // Disable Google Analytics or other tracking scripts
            window['ga-disable-UA-XXXXXXXX-X'] = true;
        });
    }
}

// Temel seçim modalini göster
function showThemeSelectionModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'theme-selection-modal';

    modal.innerHTML = `
        <div class="modal-content" style="text-align: center; padding: 40px 20px;">
            <h2 style="margin-bottom: 10px; color: var(--primary-color);">Görünümünüzü Seçin</h2>
            <p style="margin-bottom: 30px; color: var(--text-color);">Aydınlık veya karanlık temayla öğrenmeye devam edin.<br><small>(Bunu daha sonra Profil sayfasından değiştirebilirsiniz.)</small></p>
            <div style="display: flex; justify-content: center; gap: 20px;">
                <button id="select-light-theme" class="btn" style="flex: 1; background: #f0f0f0; color: #333; border: 3px solid #ddd; padding: 20px 10px; font-size: 16px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                    <span style="font-size: 32px;">☀️</span>
                    Aydınlık
                </button>
                <button id="select-dark-theme" class="btn" style="flex: 1; background: #2a2c38; color: #fff; border: 3px solid #3a3c48; padding: 20px 10px; font-size: 16px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                    <span style="font-size: 32px;">🌙</span>
                    Karanlık
                </button>
            </div>
            <button id="close-theme-modal" class="btn btn-primary" style="margin-top: 30px; width: auto; padding: 10px 30px;">Kaydet ve Devam Et</button>
        </div>
    `;

    document.body.appendChild(modal);

    const updateBorders = () => {
        const isDark = document.documentElement.classList.contains('dark-theme');
        document.getElementById('select-dark-theme').style.borderColor = isDark ? 'var(--primary-color)' : '#3a3c48';
        document.getElementById('select-light-theme').style.borderColor = isDark ? '#ddd' : 'var(--primary-color)';
    };

    updateBorders();

    document.getElementById('select-light-theme').addEventListener('click', () => {
        document.documentElement.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
        updateBorders();
    });

    document.getElementById('select-dark-theme').addEventListener('click', () => {
        document.documentElement.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        updateBorders();
    });

    document.getElementById('close-theme-modal').addEventListener('click', () => {
        localStorage.setItem('themeSelected', 'true');
        modal.remove();
    });
}

// Görsel Yeni Profil Sayfasını Yükle
async function loadProfileContent() {
    try {
        hideAllContentSections();

        const profileContent = document.getElementById('profile-content');
        if (!profileContent) return;
        profileContent.classList.remove('hide');

        const isGuest = localStorage.getItem('isGuest') === 'true' || (window.currentUser && window.currentUser.isGuest);
        const guestFallback = isGuest ? {
            uid: sessionStorage.getItem('guestSessionId') || 'guest_' + crypto.randomUUID(),
            isGuest: true,
            displayName: 'Misafir Kullanıcı'
        } : null;

        const user = window.currentUser || auth.currentUser || guestFallback;
        if (!user) {
            console.error('Kullanıcı oturumu bulunamadı.');
            profileContent.innerHTML = `<div class="error-message"><p>Profil bilgileri yüklenemedi: Oturum bulunamadı.</p></div>`;
            return;
        }

        // Dashboard/Uygulama istatistiklerini alma mantığı
        let stats = { totalWords: 0, totalQuizzes: 0, studyStreak: 1, level: 1, xp: 0, totalXP: 0, inventory: { streak_freeze: 0 } };

        if (!isGuest) {
            try {
                // Öğrenilen kelimeler
                const learnedWordsQuery = query(collection(db, "learned_words"), where("user_id", "==", user.uid));
                stats.totalWords = (await getDocs(learnedWordsQuery)).size;

                // Quiz Sonuçları
                const quizResultsQuery = query(collection(db, "quiz_results"), where("user_id", "==", user.uid));
                stats.totalQuizzes = (await getDocs(quizResultsQuery)).size;

                // Genel User Data (XP, Seviye, Streak) ve Envanter
                const userDocPromise = getDoc(doc(db, "users_public", user.uid));
                const privateDocPromise = getDoc(doc(db, "users_private", user.uid));

                const [userDoc, privateDoc] = await Promise.all([userDocPromise, privateDocPromise]);

                const userData = userDoc.exists() ? userDoc.data() : { xp: 0, level: 1, total_xp: 0, streak: 0 };
                const privateData = privateDoc.exists() ? privateDoc.data() : {};

                stats.studyStreak = userData.streak || 0;
                stats.level = userData.level || 1;
                stats.xp = userData.xp || 0;
                stats.totalXP = userData.total_xp || 0;
                stats.inventory = privateData.inventory || { streak_freeze: 0 };

            } catch (err) {
                console.error("Profil istatistikleri alınamadı:", err);
            }
        }

        const nextLevelXp = stats.level * 200;
        const xpPercent = Math.min(100, Math.round((stats.xp / nextLevelXp) * 100));

        let html = `
            <div class="user-profile-wrapper">
                <div class="profile-header-banner">
                    <button class="settings-btn" title="Ayarlar" onclick="window.loadSettingsContent()">⚙️ Ayarlar</button>
                    <div class="profile-avatar-container">
                        <div class="profile-avatar" id="main-profile-avatar" ${user.photoURL ? `style="background-image: url('${user.photoURL}'); color: transparent;"` : ''}>
                            ${user.displayName ? escapeHTML(user.displayName.charAt(0).toUpperCase()) : 'M'}
                            ${!isGuest ? `
                            <div class="avatar-loading" id="avatar-loading">
                                <i class="fa-solid fa-spinner"></i>
                                <span id="avatar-upload-pct">0%</span>
                            </div>
                            ` : ''}
                        </div>
                        ${!isGuest ? `
                        <div class="avatar-edit-btn" id="avatar-edit-btn" title="Profil Fotoğrafını Değiştir">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none">
                                <path d="M12.5 6.2l5.3 5.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M4 20l3.7-.6c.5-.1 1-.3 1.3-.7L19 8.7a1.8 1.8 0 0 0 0-2.6l-1.1-1.1a1.8 1.8 0 0 0-2.6 0L5.4 14.9c-.4.4-.6.8-.7 1.3L4 20z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                                <path d="M4 20h5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <input type="file" id="avatar-upload-input" accept="image/jpeg, image/png, image/webp" style="display: none;">
                        ` : ''}
                    </div>
                </div>
                
                <div class="profile-main-info">
                    <h2 class="profile-name">${escapeHTML(user.displayName || 'İsimsiz Kullanıcı')}</h2>
                    <p class="profile-email">${escapeHTML(user.email || 'Misafir Modu')}</p>
                    
                    <div class="profile-level-badge-container">
                        <span class="profile-level-badge">Seviye ${stats.level}</span>
                    </div>
                    
                    <div class="profile-xp-progress-bar-container">
                        <div class="profile-xp-progress-bar" style="width: ${xpPercent}%"></div>
                    </div>
                    <p class="profile-xp-text">${stats.xp} / ${nextLevelXp} XP (${xpPercent}%)</p>
                </div>

                <div class="profile-stats-grid">
                    <div class="profile-stat-box">
                        <div class="stat-icon">📚</div>
                        <div class="stat-val">${stats.totalWords}</div>
                        <div class="stat-label">Öğrenilen Kelime</div>
                    </div>
                    <div class="profile-stat-box">
                        <div class="stat-icon">🎯</div>
                        <div class="stat-val">${stats.totalQuizzes}</div>
                        <div class="stat-label">Tamamlanan Quiz</div>
                    </div>
                    <div class="profile-stat-box">
                        <div class="stat-icon">🔥</div>
                        <div class="stat-val">${stats.studyStreak}</div>
                        <div class="stat-label">Günlük Seri</div>
                    </div>
                    <div class="profile-stat-box">
                        <div class="stat-icon">⭐</div>
                        <div class="stat-val">${stats.totalXP}</div>
                        <div class="stat-label">Toplam XP</div>
                    </div>
                </div>
                
                <div class="profile-inventory-section" style="margin-top: 20px; text-align: left; background: rgba(52, 152, 219, 0.1); border: 1px solid rgba(52, 152, 219, 0.3); border-radius: 12px; padding: 15px;">
                    <h3 style="margin-bottom: 10px; font-size: 18px; color: #3498db; display: flex; align-items: center; gap: 8px;">
                        🎒 Envanterim
                    </h3>
                    <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-color); padding: 10px 15px; border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 24px;">❄️</span>
                            <div>
                                <div style="font-weight: bold; color: var(--text-main);">Seri Dondurucu</div>
                                <div style="font-size: 12px; color: var(--text-muted);">Miktar: ${stats.inventory.streak_freeze}</div>
                            </div>
                        </div>
                        <button onclick="window.promptManualFreeze()" class="btn btn-sm" style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; border: none;" ${stats.inventory.streak_freeze > 0 ? '' : 'disabled'}>
                            Kullan
                        </button>
                    </div>
                </div>
                
                <div class="profile-badges-section">
                    <h3 class="section-title">Kazanılan Rozetler</h3>
                    <div class="badges-grid">
                        
                        <div class="badge-item ${stats.totalWords >= 100 ? 'unlocked' : 'locked'}" title="100 Kelime Öğren" onclick="alert('🛡️ Rozet Hedefi:\\n\\n' + this.title)">
                            <img src="assets/badges/100kelime.png" alt="100 Kelime" class="badge-img">
                            <div class="badge-name">İlk Adım</div>
                        </div>
                        
                        <div class="badge-item ${stats.totalWords >= 500 ? 'unlocked' : 'locked'}" title="500 Kelime Öğren" onclick="alert('🛡️ Rozet Hedefi:\\n\\n' + this.title)">
                            <img src="assets/badges/500kelime.png" alt="500 Kelime" class="badge-img">
                            <div class="badge-name">Kelime Avcısı</div>
                        </div>

                        <div class="badge-item ${stats.totalWords >= 1000 ? 'unlocked' : 'locked'}" title="1000 Kelime Öğren" onclick="alert('🛡️ Rozet Hedefi:\\n\\n' + this.title)">
                            <img src="assets/badges/1000kelime.png" alt="1000 Kelime" class="badge-img">
                            <div class="badge-name">Kelime Üstadı</div>
                        </div>
                        
                        <div class="badge-item ${stats.studyStreak >= 7 ? 'unlocked' : 'locked'}" title="7 Gün aralıksız uygulama girişi yap" onclick="alert('🛡️ Rozet Hedefi:\\n\\n' + this.title)">
                            <img src="assets/badges/7g%C3%BCnl%C3%BCkseri.png" alt="7 Günlük Seri" class="badge-img">
                            <div class="badge-name">Ateşli</div>
                        </div>

                        <div class="badge-item ${stats.studyStreak >= 30 ? 'unlocked' : 'locked'}" title="30 Gün aralıksız uygulama girişi yap" onclick="alert('🛡️ Rozet Hedefi:\\n\\n' + this.title)">
                            <img src="assets/badges/30g%C3%BCnl%C3%BCkseri.png" alt="30 Günlük Seri" class="badge-img">
                            <div class="badge-name">Efsanevi</div>
                        </div>

                        <div class="badge-item ${stats.totalQuizzes >= 1 ? 'unlocked' : 'locked'}" title="İstediğin zorlukta en az 1 Quiz tamamla" onclick="alert('🛡️ Rozet Hedefi:\\n\\n' + this.title)">
                            <img src="assets/badges/quiz%20100%C2%BD.png" alt="Quiz Kurdu" class="badge-img">
                            <div class="badge-name">Quiz Kurdu</div>
                        </div>

                        <div class="badge-item locked" title="Herhangi bir Quiz'i tek bir hata bile yapmadan tamamla" onclick="alert('🛡️ Rozet Hedefi:\\n\\n' + this.title)">
                            <img src="assets/badges/hatas%C4%B1z%20kul%20olmaz%20ben%20oldum%20s%C4%B1f%C4%B1r%20hata%20quiz.png%20.png" alt="Kusursuz" class="badge-img">
                            <div class="badge-name">Kusursuz</div>
                        </div>

                    </div>
                </div>
                
                ${isGuest ? `
                <div class="profile-section notification mt-20" style="background-color: rgba(243, 156, 18, 0.1); border-left-color: #f39c12;">
                    <h3 style="color: #f39c12; border-bottom: none;"><span style="font-size: 20px; margin-right: 10px;">⚠️</span>Misafir Modundasınız</h3>
                    <p class="info-message">Şu anda uygulamayı misafir olarak kullanıyorsunuz. İstatistikleriniz sadece bu oturum için geçerlidir ve veritabanına kaydedilmez. Kalıcı bir profil için hesap oluşturun.</p>
                </div>
                ` : ''}
            </div>
        `;

        profileContent.innerHTML = html;

        // Avatar Yükleme Event Listeners
        if (!isGuest) {
            setupAvatarUploadEvents(user);
        }

    } catch (error) {
        console.error('Profil sayfası yüklenirken hata:', error);
        if (profileContent) {
            profileContent.innerHTML = `<div class="error-message"><p>Profil bilgileri yüklenirken bir hata oluştu.</p></div>`;
        }
    }
}

// Avatar Yükleme Scripti
function setupAvatarUploadEvents(user) {
    const editBtn = document.getElementById('avatar-edit-btn');
    const fileInput = document.getElementById('avatar-upload-input');
    const loadingMask = document.getElementById('avatar-loading');
    const loadingPct = document.getElementById('avatar-upload-pct');
    const mainAvatar = document.getElementById('main-profile-avatar');

    // Header'da bulunan küçük avatar ikonu
    const headerAvatar = document.querySelector('.user-stats-header .profile-avatar-small');

    if (!editBtn || !fileInput) return;

    editBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Dosya türü ve boyutu kontrolü (Maksimum 2 MB)
        if (!file.type.match('image.*')) {
            alert('Lütfen geçerli bir resim dosyası seçin (JPG, PNG).');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            alert('Profil fotoğrafı boyutu en fazla 2 MB olabilir.');
            return;
        }

        try {
            // Yükleme arayüzünü aç
            editBtn.style.display = 'none';
            loadingMask.style.display = 'flex';

            // Storage referansını al ve yükleme işlemini başlat
            const storage = window.firebaseStorage;
            const storageRef = ref(storage, `profile_pictures/${user.uid}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    if (loadingPct) {
                        loadingPct.innerText = progress + '%';
                    }
                },
                (error) => {
                    console.error("❌ DEBUG: Yükleme Hatası:", error);
                    alert("Fotoğraf yüklenemedi: " + error.message);
                    loadingMask.style.display = 'none';
                    editBtn.style.display = 'flex';
                },
                async () => {
                    try {
                        console.error("🚀 DEBUG: Storage yüklemesi bitti. URL alınıyor...");
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        const cacheURL = `${downloadURL}&cb=${Date.now()}`;
                        console.error("🔗 DEBUG: Yeni URL (Zırhlı):", cacheURL);

                        // Auth Güncelle
                        await updateProfile(auth.currentUser, { photoURL: cacheURL });

                        // Firestore Güncelle
                        try {
                            await updateDoc(doc(db, "users_public", user.uid), { photoURL: cacheURL });
                        } catch (e) { console.error("⚠️ Firestore güncelleme atlandı:", e); }

                        // DOM Güncelle (Ana Profil Resmi)
                        if (mainAvatar) {
                            mainAvatar.style.backgroundImage = `url('${cacheURL}')`;
                            mainAvatar.style.backgroundSize = 'cover';
                            mainAvatar.style.backgroundPosition = 'center';
                            mainAvatar.style.color = 'transparent';
                            mainAvatar.innerHTML = '';
                            console.error("🎨 DOM: Main avatar güncellendi.");
                        }

                        // Header Avatar Güncelle
                        const headerAvatar = document.getElementById('header-profile-avatar');
                        if (headerAvatar) {
                            headerAvatar.style.backgroundImage = `url('${cacheURL}')`;
                            headerAvatar.style.backgroundSize = 'cover';
                            headerAvatar.style.backgroundPosition = 'center';
                            headerAvatar.innerHTML = '';
                            console.error("🎨 DOM: Header avatar güncellendi.");
                        }

                        loadingMask.style.display = 'none';
                        editBtn.style.display = 'flex';
                        fileInput.value = '';

                        // AI MODERASYON
                        const uploadTime = Date.now();
                        setTimeout(() => {
                            try {
                                console.error("🕵️ DEBUG: AI Taraması başladı...");
                                const storagePath = `gs://ingilizcekelime-cbeb6.firebasestorage.app/profile_pictures/${user.uid}`;
                                const firestoreDB = window.firestore || db;
                                const q = query(collection(firestoreDB, "detectedObjects"), where("file", "==", storagePath), limit(1));

                                const unsubscribe = onSnapshot(q, async (snap) => {
                                    if (!snap.empty) {
                                        const dDoc = snap.docs[0];
                                        const dData = dDoc.data();
                                        console.error("📦 RAW AI DATA:", JSON.stringify(dData)); // Teşhis için kritik

                                        const upd = dData.updated ? dData.updated.seconds * 1000 : (dDoc.updateTime ? dDoc.updateTime.seconds * 1000 : Date.now());

                                        if (upd < (uploadTime - 5000)) return; // Eski veri

                                        // Nesneleri tespit et (String ve Object Desteği)
                                        const rawObjects = dData.objects || dData.labels || dData.localizedObjectAnnotations || [];
                                        if (Array.isArray(rawObjects)) {
                                            const processedItems = rawObjects.map(o => {
                                                if (typeof o === 'string') {
                                                    return { name: o.toLowerCase(), score: 1.0 };
                                                }
                                                const name = (o.name || o.label || o.object || "").toString().toLowerCase();
                                                const score = (o.score !== undefined) ? o.score :
                                                    ((o.confidence !== undefined) ? o.confidence :
                                                        ((o.score_ !== undefined) ? o.score_ : 0.8));
                                                return { name, score };
                                            });

                                            const all = processedItems.map(o => `${o.name} (%${Math.round(o.score * 100)})`);
                                            console.error("🔍 AI Gördü:", all.join(", "));

                                            const bad = processedItems
                                                .filter(o => o.score >= 0.65)
                                                .map(o => o.name)
                                                .filter(n => FORBIDDEN_OBJECTS.some(forbidden => n.includes(forbidden)));

                                            if (bad.length > 0) {
                                                console.error("⛔ YASAKLI:", bad);
                                                unsubscribe();
                                                const fallback = "https://ui-avatars.com/api/?name=" + (user.displayName || "A") + "&background=random";
                                                await updateProfile(auth.currentUser, { photoURL: fallback });

                                                [mainAvatar, headerAvatar].forEach(el => {
                                                    if (el) {
                                                        el.style.backgroundImage = 'none';
                                                        el.innerHTML = (user.displayName || "A").charAt(0).toUpperCase();
                                                    }
                                                });

                                                Swal.fire({ icon: 'error', title: 'Yasaklı İçerik!', text: `Yapay zeka şunları tespit etti: ${bad.join(", ")}`, footer: `Rapor: ${all.join(", ")}` });
                                            } else {
                                                console.error("✅ TEMİZ");
                                                unsubscribe();
                                                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'AI: Profil Temiz', showConfirmButton: false, timer: 2000 });
                                            }
                                        }
                                    }
                                }, (err) => console.error("🚨 Snapshot hatası:", err));

                                setTimeout(() => unsubscribe(), 30000);
                            } catch (e) { console.error("🚨 AI başlatma hatası:", e); }
                        }, 1500);

                    } catch (err) {
                        console.error("🚨 Başarı callback hatası:", err);
                        loadingMask.style.display = 'none';
                        editBtn.style.display = 'flex';
                    }
                }
            );

        } catch (error) {
            console.error("Beklenmeyen yükleme hatası:", error);
            alert("Beklenmeyen bir hata oluştu.");
            loadingMask.style.display = 'none';
            editBtn.style.display = 'flex';
        }
    });
}

// Global'e çıkart
window.loadProfileContent = loadProfileContent;

// Ayarlar sayfasını yükle
async function loadSettingsContent() {
    try {
        hideAllContentSections();

        const settingsContent = document.getElementById('settings-content');
        if (!settingsContent) return;
        settingsContent.classList.remove('hide');

        // GÜVENLİK: Misafir kullanıcı için benzersiz oturum ID'si kullan
        const guestFallback = localStorage.getItem('isGuest') === 'true' ? {
            uid: sessionStorage.getItem('guestSessionId') || 'guest_' + crypto.randomUUID(),
            isGuest: true,
            displayName: 'Misafir Kullanıcı'
        } : null;
        const user = window.currentUser || auth.currentUser || guestFallback;
        if (!user) {
            console.error('Kullanıcı oturumu bulunamadı.');
            settingsContent.innerHTML = `<div class="error-message"><p>Ayarlar bilgileri yüklenemedi: Kullanıcı oturumu bulunamadı.</p></div>`;
            return;
        }


        // Kullanıcı XP ve Level bilgisini al
        let userData = { xp: 0, level: 1, total_xp: 0 };
        if (!user.isGuest) {
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                userData = userDoc.exists() ? userDoc.data() : { xp: 0, level: 1, total_xp: 0 };
            } catch (err) {
                console.error('Kullanıcı verisi alınamadı:', err);
            }
        }
        const xp = userData.xp || 0;
        const level = userData.level || 1;
        const totalXp = userData.total_xp || 0;
        const nextLevelXp = level * 200;

        let html = `
            <div class="profile-container">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                    <h2 style="margin: 0;">⚙️ Ayarlar</h2>
                    <button class="btn btn-small" onclick="document.getElementById('nav-profile').click()" style="background-color: transparent; color: var(--text-muted); border: 1px solid var(--border-color);">< Geri Dön</button>
                </div>
                
                ${user.isGuest ? `
                <div class="profile-section notification" style="background-color: rgba(243, 156, 18, 0.1); border-left-color: #f39c12;">
                    <h3 style="color: #f39c12; border-bottom: none;"><span style="font-size: 20px; margin-right: 10px;">⚠️</span>Misafir Modundasınız</h3>
                    <p class="info-message">Şu anda uygulamayı misafir olarak kullanıyorsunuz. Öğrendiğiniz kelimeler, XP'leriniz, serileriniz ve quiz geçmişiniz <strong>kaydedilmez.</strong> İlerlemenizi kaybetmemek için giriş yapın veya kayıt olun.</p>
                </div>
                ` : ''}
                
                <div class="profile-section user-details">
                    <h3>Kullanıcı Bilgileri</h3>
                    <div class="profile-info">
                        <div class="info-item">
                            <span class="label">İsim:</span>
                            <span class="value">${escapeHTML(user.displayName || 'Belirtilmemiş')}</span>
                            <button class="btn btn-small" id="change-name-btn">Değiştir</button>
                        </div>
                        <div class="info-item">
                            <span class="label">E-posta:</span>
                            <span class="value">${escapeHTML(user.email || '')}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Üyelik Tarihi:</span>
                            <span class="value">${user.metadata && user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</span>
                        </div>
                    </div>
                </div>

                    </div>
                </div>

                <div class="profile-section theme-settings">
                    <h3>Görünüm Ayarları</h3>
                    <div class="profile-info">
                        <div class="info-item" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <span class="label" style="margin-bottom: 0;">Uygulama Teması:</span>
                            <button class="theme-toggle" id="profile-theme-toggle" title="Temayı Değiştir" style="position: relative; right: auto; top: auto; transform: none; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: var(--input-bg); border: 2px solid var(--border-color); border-radius: 50%;">
                                <span class="dark-icon">🌙</span>
                                <span class="light-icon">☀️</span>
                            </button>
                        </div>
                    </div>
                </div>

                ${!user.isGuest ? `
                <div class="profile-section security">
                    <h3>Güvenlik</h3>
                    <div class="security-actions">
                        <button id="change-password-btn" class="btn btn-primary">Şifre Değiştir</button>
                        <button id="delete-account-btn" class="btn btn-danger">Hesabı Sil</button>
                    </div>
                </div>
                ` : ''}

                <!-- İsim Değiştirme Modal -->
                <div id="name-modal" class="modal hide">
                    <div class="modal-content">
                        <h3>İsim Değiştir</h3>
                        <form id="name-change-form">
                            <div class="form-group">
                                <label for="new-name">Yeni İsim:</label>
                                <input type="text" id="new-name" required>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Kaydet</button>
                                <button type="button" class="btn" onclick="document.getElementById('name-modal').classList.add('hide')">İptal</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Şifre Değiştirme Modal -->
                <div id="password-modal" class="modal hide">
                    <div class="modal-content">
                        <h3>Şifre Değiştir</h3>
                        <form id="password-change-form">
                            <div class="form-group">
                                <label for="current-password">Mevcut Şifre:</label>
                                <input type="password" id="current-password" required>
                            </div>
                            <div class="form-group">
                                <label for="new-password">Yeni Şifre:</label>
                                <input type="password" id="new-password" required>
                            </div>
                            <div class="form-group">
                                <label for="confirm-password">Yeni Şifre (Tekrar):</label>
                                <input type="password" id="confirm-password" required>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Değiştir</button>
                                <button type="button" class="btn" onclick="document.getElementById('password-modal').classList.add('hide')">İptal</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Hesap Silme Modal -->
                <div id="delete-modal" class="modal hide">
                    <div class="modal-content">
                        <h3>Hesabı Sil</h3>
                        <p class="warning-text">Bu işlem geri alınamaz! Hesabınız ve tüm verileriniz kalıcı olarak silinecektir.</p>
                        <form id="delete-account-form">
                            <div class="form-group">
                                <label for="delete-confirm">Onaylamak için şifrenizi girin:</label>
                                <input type="password" id="delete-confirm" required>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-danger">Hesabı Sil</button>
                                <button type="button" class="btn" onclick="document.getElementById('delete-modal').classList.add('hide')">İptal</button>
                            </div>
                        </form>
                    </div>
                </div>
        `;

        // Çıkış yapma butonu
        html += `
            <div class="profile-section logout-section">
                <button id="profile-logout-btn" class="btn btn-danger">${user.isGuest ? 'Kayıt Ol / Giriş Yap' : 'Hesaptan Çıkış Yap'}</button>
            </div>
        `;

        settingsContent.innerHTML = html + '</div>';

        // Event Listeners (Only bind if buttons exist)
        const changeNameBtn = document.getElementById('change-name-btn');
        if (changeNameBtn) {
            changeNameBtn.onclick = () => {
                if (user.isGuest) {
                    alert('İsim değiştirmek için normal üye olmalısınız.');
                    return;
                }
                document.getElementById('name-modal').classList.remove('hide');
            };
        }

        const changePasswordBtn = document.getElementById('change-password-btn');
        if (changePasswordBtn) {
            changePasswordBtn.onclick = () => {
                document.getElementById('password-modal').classList.remove('hide');
            };
        }

        const deleteAccountBtn = document.getElementById('delete-account-btn');
        if (deleteAccountBtn) {
            deleteAccountBtn.onclick = () => {
                document.getElementById('delete-modal').classList.remove('hide');
            };
        }

        const nameChangeForm = document.getElementById('name-change-form');
        if (nameChangeForm) {
            nameChangeForm.onsubmit = async (e) => {
                e.preventDefault();
                if (user.isGuest) return;

                const newName = document.getElementById('new-name').value.trim();

                // GÜVENLİK: İsim doğrulama (Registration ile aynı kurallar)
                if (newName.length < 2 || newName.length > 50) {
                    alert('İsim 2-50 karakter arasında olmalıdır.');
                    return;
                }

                const submitBtn = nameChangeForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.textContent;

                try {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Kaydediliyor...';

                    // 1. Auth Profilini Güncelle
                    await updateProfile(auth.currentUser, { displayName: newName });

                    // 2. Veritabanını Güncelle (Hem Public hem Private/Eski)
                    const batch = writeBatch(db);

                    const publicRef = doc(db, "users_public", auth.currentUser.uid);
                    const privateRef = doc(db, "users_private", auth.currentUser.uid);
                    const oldUserRef = doc(db, "users", auth.currentUser.uid);

                    batch.update(publicRef, {
                        displayName: newName,
                        name: newName // cross-compatibility için ikisini de tutuyoruz
                    });

                    // Eski koleksiyonu da senkronize tut (Bazı eski kodlar buradan okuyor olabilir)
                    batch.update(oldUserRef, { name: newName });

                    await batch.commit();

                    // 3. UI Başarı Geri Bildirimi
                    document.getElementById('name-modal').classList.add('hide');

                    // Header'daki ismi anında güncelle (Sayfa yenilemeye gerek kalmasın)
                    const userNameEl = document.getElementById('user-name');
                    if (userNameEl) userNameEl.textContent = newName;

                    Swal.fire({
                        icon: 'success',
                        title: 'Başarılı!',
                        text: 'Profil isminiz güncellendi.',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.reload(); // Diğer komponentlerin de yenilenmesi için güvenli yol
                    });

                } catch (err) {
                    console.error('İsim değiştirme hatası:', err);
                    alert('İsim değiştirme başarısız: ' + err.message);
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            };
        }

        // Şifre değiştirme formu
        document.getElementById('password-change-form').onsubmit = async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                alert('Yeni şifreler eşleşmiyor!');
                return;
            }

            try {
                const credential = EmailAuthProvider.credential(user.email, currentPassword);
                await reauthenticateWithCredential(auth.currentUser, credential);

                await updatePassword(auth.currentUser, newPassword);

                document.getElementById('password-modal').classList.add('hide');
                alert('Şifreniz başarıyla değiştirildi. Lütfen tekrar giriş yapın.');
                await signOut(auth);
                window.location.reload();
            } catch (err) {
                alert('Şifre değiştirme başarısız: ' + err.message);
            }
        };

        // Hesap silme formu
        document.getElementById('delete-account-form').onsubmit = async (e) => {
            e.preventDefault();
            const confirmPassword = document.getElementById('delete-confirm').value;

            if (confirm('Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
                try {
                    const credential = EmailAuthProvider.credential(user.email, confirmPassword);
                    await reauthenticateWithCredential(auth.currentUser, credential);

                    // Verileri temizle
                    const learnedWordsDocs = await getDocs(query(collection(db, "learned_words"), where("user_id", "==", user.uid)));
                    for (const docRef of learnedWordsDocs.docs) {
                        await deleteDoc(docRef.ref);
                    }

                    const quizResultsDocs = await getDocs(query(collection(db, "quiz_results"), where("user_id", "==", user.uid)));
                    for (const docRef of quizResultsDocs.docs) {
                        await deleteDoc(docRef.ref);
                    }

                    await deleteDoc(doc(db, "user_progress", user.uid));
                    await deleteDoc(doc(db, "users_public", user.uid));
                    await deleteDoc(doc(db, "users_private", user.uid));
                    await deleteDoc(doc(db, "users", user.uid));

                    // Hesabı sil
                    await firebaseDeleteUser(auth.currentUser);

                    // localStorage/sessionStorage temizle
                    localStorage.clear();
                    sessionStorage.clear();

                    alert('Hesabınız başarıyla silindi.');
                    window.location.href = '/';
                } catch (err) {
                    alert('Hesap silme başarısız. Şifrenizi doğru girdiğinizden emin olun.');
                }
            }
        };

        // Tema değiştirme butonu
        const profileThemeToggle = document.getElementById('profile-theme-toggle');
        if (profileThemeToggle) {
            profileThemeToggle.onclick = toggleTheme;
        }

        // Çıkış butonu
        document.getElementById('profile-logout-btn').onclick = async function () {
            try {
                if (user.isGuest) {
                    localStorage.removeItem('isGuest');
                } else {
                    await signOut(auth);
                }
                localStorage.removeItem('isLoggedIn');
                window.location.reload();
            } catch (err) {
                console.error('Çıkış yaparken hata:', err);
                alert('Çıkış yapılırken bir hata oluştu: ' + err.message);
            }
        };

    } catch (error) {
        console.error('Ayarlar sayfası yüklenirken hata:', error);
        const settingsContent = document.getElementById('settings-content');
        if (settingsContent) {
            settingsContent.innerHTML = `
                    <div class="error-message">
                        <p>Ayarlar bilgileri yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
                    </div>
                `;
        }
    }
}

// Global scope'a ekle
window.loadSettingsContent = loadSettingsContent;

// Quiz geçmişini yükle
async function loadQuizHistory() {
    try {
        if (!currentUser) {
            console.error('Kullanıcı oturumu bulunamadı');
            return;
        }

        const q = query(
            collection(db, "quiz_results"),
            where("user_id", "==", currentUser.uid),
            orderBy("created_at", "desc"),
            limit(5)
        );
        const querySnapshot = await getDocs(q);
        const quizResults = querySnapshot.docs.map(doc => doc.data());

        const historyContent = document.getElementById('quiz-history-content');
        if (!historyContent) return;

        if (!quizResults || quizResults.length === 0) {
            historyContent.innerHTML = 'Henüz hiç quiz çözmediniz. Bilginizi test etmek için yukarıdaki quizlerden birini seçin.';
            return;
        }

        let html = `
            <table class="quiz-history-table">
                <thead>
                    <tr>
                        <th>Seviye</th>
                        <th>Doğru</th>
                        <th>Toplam</th>
                        <th>Başarı</th>
                        <th>Tarih</th>
                    </tr>
                </thead>
                <tbody>
        `;

        quizResults.forEach(result => {
            const date = result.created_at?.toDate() ? result.created_at.toDate().toLocaleDateString('tr-TR') : 'Belirtilmemiş';
            const successRate = Math.round((result.correct_count / result.total_questions) * 100);

            html += `
                <tr>
                    <td>${result.level.toUpperCase()}</td>
                    <td>${result.correct_count}</td>
                    <td>${result.total_questions}</td>
                    <td>%${successRate}</td>
                    <td>${date}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        historyContent.innerHTML = html;

    } catch (error) {
        console.error('Quiz geçmişi yüklenirken hata:', error);
        const historyContent = document.getElementById('quiz-history-content');
        if (historyContent) {
            historyContent.innerHTML = `Hata: Quiz geçmişi yüklenemedi. Lütfen daha sonra tekrar deneyin.`;
        }
    }
}

// Global scope'a ekle
window.loadQuizHistory = loadQuizHistory;

// Öğrenilen kelimeleri yükle ve listele
async function loadWordsList() {
    try {
        const wordsContent = document.getElementById('words-content');
        if (!wordsContent) return;

        const isGuest = (typeof currentUser !== 'undefined' && currentUser && currentUser.isGuest) || localStorage.getItem('isGuest') === 'true';

        if (isGuest) {
            wordsContent.innerHTML = `
                <div class="words-list-container">
                    <h2>Kelime Listeniz</h2>
                    <div class="error-message" style="background-color: rgba(243, 156, 18, 0.1); border-left-color: #f39c12; color: #f39c12; padding: 20px;">
                        <h3 style="margin-bottom: 10px;">⚠️ Misafir Modundasınız</h3>
                        <p>Misafir oturumunda bulunduğunuz için öğrendiğiniz kelimeler kaydedilmemektedir. Kelime listenizi görebilmek için giriş yapın veya kayıt olun.</p>
                    </div>
                </div>
            `;
            return;
        }

        wordsContent.innerHTML = '<h2>Kelime Listeniz</h2><p>Kelimeleriniz yükleniyor...</p>';

        const q = query(
            collection(db, "learned_words"),
            where("user_id", "==", currentUser.uid),
            orderBy("level", "asc")
        );
        const querySnapshot = await getDocs(q);
        const words = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (!words || words.length === 0) {
            wordsContent.innerHTML = `
                <h2>Kelime Listeniz</h2>
                <p class="no-data-message">Henüz öğrendiğiniz bir kelime bulunmuyor. Kelime öğrenmeye başlamak için <a href="#" id="go-to-learn">Kelime Öğren</a> bölümüne geçebilirsiniz.</p>
            `;

            document.getElementById('go-to-learn').addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('nav-learn').click();
            });

            return;
        }

        let html = `
            <div class="words-list-container">
                <h2>Kelime Listeniz</h2>
                
                <div class="filter-controls">
                    <div class="search-box">
                        <input type="text" id="word-search" placeholder="Kelime ara...">
                        <button id="search-btn">Ara</button>
                    </div>
                    
                    <div class="filter-options">
                        <label>Seviye Filtrele:</label>
                        <select id="level-filter">
                            <option value="all">Tümü</option>
                            <option value="A1">A1</option>
                            <option value="A2">A2</option>
                            <option value="B1">B1</option>
                            <option value="B2">B2</option>
                            <option value="C1">C1</option>
                        </select>
                    </div>
                </div>
                
                <div class="word-list-stats">
                    <p>Toplam <strong>${words.length}</strong> kelime öğrendiniz.</p>
                </div>
                
                <div class="word-list" id="word-list">
                    <table class="words-table">
                        <thead>
                            <tr>
                                <th>İngilizce</th>
                                <th>Türkçe</th>
                                <th>Seviye</th>
                                <th>Son Çalışma</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                             ${words.map(word => {
            const lastReviewedRaw = word.last_reviewed_at?.toDate ? word.last_reviewed_at.toDate() : (word.last_reviewed_at ? new Date(word.last_reviewed_at) : null);
            const lastReviewed = lastReviewedRaw ? lastReviewedRaw.toLocaleDateString('tr-TR') : 'Henüz tekrar edilmedi';
            return `
                <tr data-level="${word.level}">
                    <td>${escapeHTML(word.word_english)}</td>
                    <td>${escapeHTML(word.word_turkish)}</td>
                    <td>${escapeHTML(word.level)}</td>
                    <td>${lastReviewed}</td>
                    <td>
                        <button class="action-btn review-btn" data-word-id="${word.id}">Tekrar Et</button>
                    </td>
                </tr>
            `;
        }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        wordsContent.innerHTML = html;

        // Arama ve filtreleme olaylarını ekle
        const searchInput = document.getElementById('word-search');
        const levelFilter = document.getElementById('level-filter');

        if (searchInput && levelFilter) {
            searchInput.addEventListener('input', filterWords);
            levelFilter.addEventListener('change', filterWords);
        }

    } catch (error) {
        console.error('Kelime listesi yüklenirken hata:', error);
        const wordsContent = document.getElementById('words-content');
        if (wordsContent) {
            wordsContent.innerHTML = `
                <div class="error-message">
                    <p>Kelime listesi yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
                </div>
            `;
        }
    }
}

// Global scope'a ekle
window.loadWordsList = loadWordsList;

// Dashboard sınıfı
class Dashboard {
    constructor(containerId, userId) {
        this.containerId = containerId;
        this.userId = userId;
    }

    async init() {
        try {
            // Kullanıcı verilerini al
            const stats = await this.getUserStats();
            this.render(stats);
        } catch (error) {
            console.error('Dashboard yüklenirken hata:', error);
            this.renderError(error);
        }
    }

    async getUserStats() {
        try {
            const isGuest = (typeof currentUser !== 'undefined' && currentUser && currentUser.isGuest) || localStorage.getItem('isGuest') === 'true';

            if ((this.userId && this.userId.startsWith('guest_')) || isGuest) {
                return {
                    totalWords: 0,
                    totalQuizzes: 0,
                    studyStreak: 1,
                    level: 1,
                    xp: 0,
                    totalXP: 0
                };
            }

            // Öğrenilen kelime sayısını al
            const learnedWordsQuery = query(
                collection(db, "learned_words"),
                where("user_id", "==", this.userId)
            );
            const learnedWordsSnapshot = await getDocs(learnedWordsQuery);
            const learnedWordsCount = learnedWordsSnapshot.size;

            // Quiz sonuçlarını al
            const quizResultsQuery = query(
                collection(db, "quiz_results"),
                where("user_id", "==", this.userId)
            );
            const quizResultsSnapshot = await getDocs(quizResultsQuery);
            const quizResultsCount = quizResultsSnapshot.size;

            // Kullanıcı verilerini al (XP ve Seviye için)
            const userDoc = await getDoc(doc(db, "users_public", this.userId));
            const userData = userDoc.exists() ? userDoc.data() : { xp: 0, level: 1, total_xp: 0, streak: 0 };

            // Özel verileri al (Günlük Görevler ve Envanter için)
            const privateDoc = await getDoc(doc(db, "users_private", this.userId));
            const privateData = privateDoc.exists() ? privateDoc.data() : {};
            const dailyQuests = privateData.dailyQuests || null;
            const inventory = privateData.inventory || { streak_freeze: 0 };

            return {
                totalWords: learnedWordsCount,
                totalQuizzes: quizResultsCount,
                studyStreak: userData.streak || 0,
                level: userData.level || 1,
                xp: userData.xp || 0,
                totalXP: userData.total_xp || 0,
                dailyQuests: dailyQuests,
                inventory: inventory
            };
        } catch (error) {
            console.error('Dashboard yüklenirken hata:', error);
            throw error;
        }
    }

    render(stats) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="dashboard-container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0;">Hoş Geldiniz!</h2>
                    <button onclick="window.openShopModal()" class="btn btn-secondary btn-sm" style="background: rgba(142, 68, 173, 0.2); color: #9b59b6; border: 1px solid #8e44ad; font-weight: bold; display: flex; align-items: center; gap: 5px;">
                        <span>🛒 Mağaza</span>
                    </button>
                </div>
                
                <div class="stats-overview">
                    <div class="stat-card">
                        <h3>Mevcut Seviye</h3>
                        <div class="stat-number">${stats.level}</div>
                        <div class="stat-label">${stats.xp} / ${stats.level * 200} XP</div>
                    </div>

                    <div class="stat-card">
                        <h3>Toplam XP</h3>
                        <div class="stat-number">${stats.totalXP}</div>
                    </div>

                    <div class="stat-card">
                        <h3>Öğrenilen Kelime</h3>
                        <div class="stat-number">${stats.totalWords}</div>
                    </div>
                    
                    <div class="stat-card">
                        <h3>Tamamlanan Quiz</h3>
                        <div class="stat-number">${stats.totalQuizzes}</div>
                    </div>
                    
                    <div class="stat-card" style="${stats.inventory && stats.inventory.streak_freeze > 0 ? 'border: 2px solid #3498db; box-shadow: 0 0 10px rgba(52, 152, 219, 0.3);' : ''}">
                        <h3>Günlük Seri</h3>
                        <div class="stat-number">${stats.studyStreak}</div>
                        <div class="stat-label">
                            🔥 Gün 
                            ${stats.inventory && stats.inventory.streak_freeze > 0 ? `<span style="font-size:12px; margin-left:5px; color:#3498db;" title="Seri Dondurucu Aktif">❄️ (${stats.inventory.streak_freeze})</span>` : ''}
                        </div>
                    </div>
                </div>
                
                ${stats.dailyQuests ? `
                <div class="daily-quests-section">
                    <h3 class="section-title">⭐ Günlük Görevler</h3>
                    <div class="quests-grid">
                        ${stats.dailyQuests.quests.map(quest => {
            const percent = Math.min(100, Math.round((quest.progress / quest.target) * 100));
            const isCompleted = quest.progress >= quest.target;
            const isClaimed = quest.isClaimed || false;

            return `
                                <div class="quest-card ${isCompleted ? 'completed' : ''} ${isClaimed ? 'claimed' : ''}">
                                    <div class="quest-icon">${quest.icon}</div>
                                    <div class="quest-info">
                                        <div class="quest-title">${quest.title}</div>
                                        <div class="quest-progress-container">
                                            <div class="quest-progress-bar" style="width: ${percent}%"></div>
                                        </div>
                                        <div class="quest-stats">
                                            <span>${quest.progress} / ${quest.target}</span>
                                            <span class="quest-reward">+${quest.reward} XP</span>
                                        </div>
                                    </div>
                                    <div class="quest-action">
                                        ${isClaimed ?
                    '<span class="claimed-badge">Alındı ✔️</span>' :
                    isCompleted ?
                        `<button onclick="window.claimQuestReward('${quest.id}')" class="claim-btn">Ödülü Al</button>` :
                        `<span class="pending-badge">Devam Ediyor</span>`
                }
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>
                </div>
                ` : ''}

                <div class="action-buttons">
                    <button onclick="document.getElementById('nav-learn').click()" class="action-btn">
                        Kelime Öğrenmeye Başla
                    </button>
                    <button onclick="document.getElementById('nav-quiz').click()" class="action-btn">
                        Quiz Çöz
                    </button>
                    <button onclick="window.startSmartReview()" class="action-btn" style="background: linear-gradient(135deg, #e74c3c, #c0392b);">
                        🧠 Eksiklerini Gider
                    </button>
                </div>
            </div>
        `;
    }

    renderError(error) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="dashboard-container">
                <div class="error-message">
                    <h2>Hata</h2>
                    <p>Dashboard yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</p>
                    <button onclick="window.location.reload()" class="action-btn">Sayfayı Yenile</button>
                </div>
            </div>
        `;
    }
}

// Dashboard güncelleme fonksiyonu
window.updateDashboard = async function () {
    if (currentUser) {
        const dashboard = new Dashboard('dashboard-content', currentUser.uid);
        await dashboard.init();
    }
};

let shopTimerInterval;

// Mağaza Modalı Açma
window.openShopModal = async function () {
    if (!currentUser || currentUser.isGuest) {
        showXPNotification("Mağazayı kullanmak için giriş yapmalısınız.", false);
        return;
    }

    try {
        const publicDoc = await getDoc(doc(db, "users_public", currentUser.uid));
        const privateDoc = await getDoc(doc(db, "users_private", currentUser.uid));

        const currentXp = publicDoc.exists() ? publicDoc.data().xp || 0 : 0;
        document.getElementById('shop-current-xp').textContent = currentXp + " XP";

        // Ücretsiz dondurucu mantığı (48 saatte bir)
        const privateData = privateDoc.exists() ? privateDoc.data() : {};
        const lastClaimTime = privateData.last_free_freeze_claim ? privateData.last_free_freeze_claim.toMillis() : 0;

        const claimFreeBtn = document.getElementById('claim-free-freeze-btn');
        const cooldownText = document.getElementById('free-freeze-cooldown-text');

        if (cooldownText) cooldownText.style.display = 'none';

        // Önceki intervali temizle
        if (shopTimerInterval) clearInterval(shopTimerInterval);

        function updateShopModalUI() {
            const now = Date.now();
            const timePassedMs = now - lastClaimTime;
            const msIn48Hours = 48 * 60 * 60 * 1000;

            if (!claimFreeBtn) return;

            if (timePassedMs >= msIn48Hours) {
                // 48 saat geçmiş, ücretsiz alımı aktifleştir
                claimFreeBtn.disabled = false;
                claimFreeBtn.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
                claimFreeBtn.style.cursor = 'pointer';
                claimFreeBtn.style.opacity = '1';
                claimFreeBtn.innerHTML = '🎁 Ücretsiz Al';
                if (shopTimerInterval) clearInterval(shopTimerInterval);
            } else {
                // Henüz geçmemiş, butonu deaktif et ve süreyi göster
                claimFreeBtn.disabled = true;
                claimFreeBtn.style.background = '#95a5a6'; // Gri arkaplan
                claimFreeBtn.style.cursor = 'not-allowed';
                claimFreeBtn.style.opacity = '1';

                const timeLeftMs = msIn48Hours - timePassedMs;
                const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));
                const minutesLeft = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
                const secondsLeft = Math.floor((timeLeftMs % (1000 * 60)) / 1000);

                // Saniyeyi ve dakikayı formatlayalım
                const h = String(hoursLeft).padStart(2, '0');
                const m = String(minutesLeft).padStart(2, '0');
                const s = String(secondsLeft).padStart(2, '0');

                claimFreeBtn.innerHTML = `⏳ Sonraki Hak: ${h}s ${m}d ${s}sn`;
            }
        }

        // İlk çalıştır ve interval'e bağla
        updateShopModalUI();
        shopTimerInterval = setInterval(updateShopModalUI, 1000);

        document.getElementById('shop-modal').classList.remove('hide');
    } catch (error) {
        console.error("Mağaza açılırken hata:", error);
    }
};

// Ücretsiz Seri Dondurucu Alma (48 Saatte Bir)
window.claimFreeFreeze = async function () {
    if (!currentUser || currentUser.isGuest) return;

    const claimBtn = document.getElementById('claim-free-freeze-btn');
    const originalText = claimBtn.innerHTML;

    try {
        claimBtn.disabled = true;
        claimBtn.innerHTML = 'Alınıyor...';

        const privateRef = doc(db, "users_private", currentUser.uid);
        const privateDoc = await getDoc(privateRef);

        if (!privateDoc.exists()) throw new Error("Kullanıcı verisi bulunamadı");

        const privateData = privateDoc.data();
        const inventory = privateData.inventory || { streak_freeze: 0 };
        const lastClaimTime = privateData.last_free_freeze_claim ? privateData.last_free_freeze_claim.toMillis() : 0;
        const now = Date.now();
        const hoursPassed = (now - lastClaimTime) / (1000 * 60 * 60);

        // Sunucu/istemci zaman farkına karşı çift kontrol
        if (hoursPassed < 48) {
            showXPNotification("Henüz 48 saat dolmamış! Lütfen daha sonra tekrar deneyin.", false);
            return;
        }

        if (inventory.streak_freeze >= 1) {
            showXPNotification("Zaten 1 adet Seri Dondurucun var! Aynı anda en fazla 1 tane taşıyabilirsin.", false);
            return;
        }

        // Envantere ekle ve zamanlayıcıyı sıfırla
        inventory.streak_freeze += 1;

        await updateDoc(privateRef, {
            inventory: inventory,
            last_free_freeze_claim: Timestamp.fromMillis(now)
        });

        // "Tamam" tıklandığında popup göster (Daha şık ve oyunlaştırılmış)
        if (typeof showXPNotification === 'function') {
            showXPNotification("+1 Dondurucu", true);
        } else {
            alert("🎁 Harika! Ücretsiz Seri Dondurucunuz envanterinize eklendi. (Sonraki ücretsiz hak 48 saat sonra)");
        }

        // UI Güncellemeleri
        document.getElementById('shop-modal').classList.add('hide'); // Modalı kapat
        window.openShopModal(); // Taze Timer ile yeniden aç

        await window.updateDashboard(); // Dashboardı yenile (Seri rozetinde dondurucu gözüksün)
        if (window.loadProfileContent && !document.getElementById('profile-content').classList.contains('hide')) {
            await window.loadProfileContent(); // Profil sekmesindeyse envanteri güncelle
        }

    } catch (error) {
        console.error("Bedava dondurucu alım hatası:", error);
        showXPNotification("İşlem sırasında bir hata oluştu.", false);
    } finally {
        claimBtn.disabled = false;
        claimBtn.innerHTML = originalText;
    }
};

// Manuel Seri Dondurucu Kullanımı - Tetikleyici (önce envanter kontrolü, sonra modal)
window.promptManualFreeze = async function () {
    if (!currentUser || currentUser.isGuest) return;

    try {
        const privateRef = doc(db, "users_private", currentUser.uid);
        const privateDoc = await getDoc(privateRef);

        if (!privateDoc.exists()) throw new Error("Kullanıcı verisi bulunamadı");

        const privateData = privateDoc.data();
        const inventory = privateData.inventory || { streak_freeze: 0 };

        if (inventory.streak_freeze < 1) {
            if (typeof showXPNotification === 'function') {
                showXPNotification("Seri Dondurucunuz yok! Mağazadan edinebilirsiniz.", false);
            } else {
                alert("Envanterinizde hiç Seri Dondurucu yok! Mağazadan edinebilirsiniz.");
            }
            return;
        }

        // Custom onay modalını göster
        const modal = document.getElementById('freeze-confirm-modal');
        if (modal) {
            modal.classList.remove('hide');
        } else {
            // Fallback: tarayıcı confirm
            const useIt = confirm("Seri Dondurucuyu ŞU ANKİ serinizi korumak için kullanmak istediğinize emin misiniz?");
            if (useIt) window.executeManualFreeze();
        }

    } catch (error) {
        console.error("Dondurucu kontrol hatası:", error);
    }
};

// Manuel Seri Dondurucu Kullanımı - Onaylandıktan Sonra
window.executeManualFreeze = async function () {
    const btn = document.getElementById('confirm-freeze-btn');
    if (btn) { btn.disabled = true; btn.textContent = "İşleniyor..."; }

    try {
        const privateRef = doc(db, "users_private", currentUser.uid);
        const publicRef = doc(db, "users_public", currentUser.uid);

        const privateDoc = await getDoc(privateRef);
        if (!privateDoc.exists()) throw new Error("Kullanıcı verisi bulunamadı");

        const privateData = privateDoc.data();
        const inventory = privateData.inventory || { streak_freeze: 0 };

        if (inventory.streak_freeze < 1) {
            showXPNotification("Envanterinizde Seri Dondurucu kalmamış.", false);
            if (document.getElementById('freeze-confirm-modal')) document.getElementById('freeze-confirm-modal').classList.add('hide');
            return;
        }

        // Envanterden 1 düşür
        inventory.streak_freeze -= 1;

        // Son aktivite tarihini düne çek ki bugün dondurulmuş gibi olsun
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        await Promise.all([
            updateDoc(privateRef, { inventory: inventory }),
            updateDoc(publicRef, { last_activity_date: Timestamp.fromDate(yesterday) })
        ]);

        if (document.getElementById('freeze-confirm-modal')) document.getElementById('freeze-confirm-modal').classList.add('hide');

        if (typeof showXPNotification === 'function') {
            showXPNotification("❄️ Seriniz güvende! Dondurucu kullanıldı.", true);
        }

        // UI Güncellemeleri
        await window.updateDashboard();
        if (window.loadProfileContent && !document.getElementById('profile-content').classList.contains('hide')) {
            await window.loadProfileContent();
        }

    } catch (error) {
        console.error("Manuel dondurucu kullanım hatası:", error);
        showXPNotification("İşlem sırasında bir hata oluştu.", false);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Evet, Kullan"; }
    }
};

// Seri Dondurucu Satın Alma
window.buyStreakFreeze = async function () {
    if (!currentUser || currentUser.isGuest) return;

    const COST = 500;
    const buyBtn = document.getElementById('buy-freeze-btn');
    const originalText = buyBtn.textContent;

    try {
        buyBtn.disabled = true;
        buyBtn.textContent = 'İşleniyor...';

        // 1. Kullanıcının XP ve envanterini kontrol et
        const publicRef = doc(db, "users_public", currentUser.uid);
        const privateRef = doc(db, "users_private", currentUser.uid);

        const [publicDoc, privateDoc] = await Promise.all([
            getDoc(publicRef),
            getDoc(privateRef)
        ]);

        if (!publicDoc.exists() || !privateDoc.exists()) throw new Error("Kullanıcı verisi bulunamadı");

        const xp = publicDoc.data().xp || 0;
        const privateData = privateDoc.data();
        const inventory = privateData.inventory || { streak_freeze: 0 };

        // 2. Kontroller (Yeterli XP var mı? Zaten 1 tane var mı?)
        if (inventory.streak_freeze >= 1) {
            alert("Zaten 1 adet Seri Dondurucun var! Aynı anda en fazla 1 tane taşıyabilirsin.");
            return;
        }

        if (xp < COST) {
            alert(`Yetersiz XP! Seri Dondurucu almak için ${COST} XP gerekli, sende ${xp} XP var.`);
            return;
        }

        // 3. Satın almayı gerçekleştir (XP düş, envantere ekle)
        inventory.streak_freeze += 1;

        await Promise.all([
            updateDoc(publicRef, { xp: xp - COST }),
            updateDoc(privateRef, { inventory: inventory })
        ]);

        // 4. UI Güncelleştirmeleri
        document.getElementById('shop-current-xp').textContent = (xp - COST) + " XP";
        updateXPUI(xp - COST, publicDoc.data().level || 1); // Sol üstteki menüyü güncelle
        await window.updateDashboard(); // Dashboardı yenile (Seri rozetinde dondurucu gözüksün)

        alert("Seri Dondurucu başarıyla satın alındı! Eğer bir gün çalışmayı unutursan, serin sıfırlanmayacak.");
        document.getElementById('shop-modal').classList.add('hide'); // Modalı kapat

    } catch (error) {
        console.error("Satın alma hatası:", error);
        alert("Satın alma işlemi başarısız oldu.");
    } finally {
        buyBtn.disabled = false;
        buyBtn.textContent = originalText;
    }
};

// Eksiklerini Gider (Smart Review) Başlatma
window.startSmartReview = async function () {
    if (!currentUser || currentUser.isGuest) {
        alert("Bu özelliği kullanmak için giriş yapmalısınız.");
        return;
    }

    const learnBtn = document.querySelector('button[onclick="window.startSmartReview()"]');
    const originalText = learnBtn ? learnBtn.textContent : 'Eksiklerini Gider';

    try {
        if (learnBtn) { learnBtn.disabled = true; learnBtn.textContent = 'Yükleniyor...'; }

        // Kullanıcının zayıf kelimelerini getir
        // Sadece where ile çekip, orderBy ve limit kısmını JS'te yapalım (Firestore Composite Index hatasını önlemek için)
        const weakQuery = query(
            collection(db, "weak_words"),
            where("user_id", "==", currentUser.uid)
        );
        const snapshot = await getDocs(weakQuery);

        if (snapshot.empty) {
            alert("🎉 Harika! Henüz zayıf olduğunuz bir kelime bulunmuyor. Düzenli olarak quiz çözmeye devam edin.");
            return;
        }

        let weakWords = snapshot.docs.map(doc => ({
            id: doc.id,
            english: doc.data().word_english,
            turkish: doc.data().word_turkish,
            level: doc.data().level || 'A1',
            category: doc.data().category || 'Eksik Kelimeler',
            example: doc.data().example || '',
            exampleTurkish: doc.data().exampleTurkish || '',
            last_wrong: doc.data().last_wrong ? doc.data().last_wrong.toMillis() : 0
        }));

        // Javascript tarafında sırala ve listeyi sınırla
        weakWords.sort((a, b) => b.last_wrong - a.last_wrong);
        weakWords = weakWords.slice(0, 20);

        // Ekranı Quiz'e ayarla
        document.querySelector('.content > div:not(.hide)').classList.add('hide');
        document.getElementById('quiz-content').classList.remove('hide');
        const activeNav = document.querySelector('.main-nav ul li a.active');
        if (activeNav) activeNav.classList.remove('active');
        document.getElementById('nav-quiz').classList.add('active');

        // WordLearning sınıfını başlat ve quizi tetikle
        import('./learning.js').then(module => {
            const wl = new module.WordLearning('quiz-content', currentUser.uid);
            wl.words = wl.shuffleArray(weakWords);
            wl.currentWordIndex = 0;
            wl.correctAnswers = 0;
            wl.userAnswers = [];
            wl.currentLevel = 'MIXED'; // Karışık seviye belirteci
            wl.renderWordTest();
        }).catch(err => {
            console.error("Modül yükleme hatası:", err);
            alert("Quiz modülü yüklenirken bir hata oluştu.");
        });

    } catch (error) {
        console.error("Smart Review başlatılamadı:", error);
        alert("Zayıf kelimeler yüklenirken bir hata oluştu: " + error.message);
    } finally {
        // Hata olsa da olmasa da butonu eski haline getir
        if (learnBtn) {
            learnBtn.disabled = false;
            learnBtn.textContent = originalText;
        }
    }
};

// Ödül toplama fonksiyonu
window.claimQuestReward = async function (questId) {
    if (!currentUser || currentUser.isGuest) return;

    try {
        const privateRef = doc(db, "users_private", currentUser.uid);
        const privateDoc = await getDoc(privateRef);

        if (!privateDoc.exists()) return;
        const pData = privateDoc.data();

        if (!pData.dailyQuests) return;

        const questIndex = pData.dailyQuests.quests.findIndex(q => q.id === questId);
        if (questIndex === -1) return;

        const quest = pData.dailyQuests.quests[questIndex];

        if (quest.isClaimed || quest.progress < quest.target) return;

        // Görevi 'alındı' olarak işaretle
        const updatedQuests = [...pData.dailyQuests.quests];
        updatedQuests[questIndex].isClaimed = true;

        await updateDoc(privateRef, {
            'dailyQuests.quests': updatedQuests
        });

        // XP ödülünü ver
        await giveXP(quest.reward, `"${quest.title}" görevi tamamlandı!`);

        // Dashboard'ı yenile
        await window.updateDashboard();

        // Konfeti efekti (isteğe bağlı, kütüphane varsa)
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }

    } catch (error) {
        console.error('Ödül alınırken hata:', error);
        alert('Ödül alınırken bir hata oluştu. Lütfen tekrar deneyin.');
    }
};

// Dashboard sınıfını global scope'a ekle
window.Dashboard = Dashboard;

async function loadRecentWords(userId, levelFilter = 'all') {
    try {
        const recentContent = document.getElementById('recent-words-content');
        if (!recentContent) return;

        const isGuest = (typeof currentUser !== 'undefined' && currentUser && currentUser.isGuest) || localStorage.getItem('isGuest') === 'true';

        if (isGuest) {
            recentContent.innerHTML = `
                <div class="dashboard-container">
                    <h2 class="section-title">Son Öğrenilen Kelimeler</h2>
                    <div class="no-data-message" style="background-color: rgba(243, 156, 18, 0.1); border-color: #f39c12; color: #f39c12; padding: 15px; border-radius: 8px;">
                        Misafir oturumunda bulunduğunuz için son öğrenilen kelimeler kaydedilmemektedir.
                    </div>
                </div>
             `;
            return;
        }

        let q;
        if (levelFilter !== 'all') {
            q = query(
                collection(db, "learned_words"),
                where("level", "==", levelFilter.toUpperCase()),
                where("user_id", "==", userId),
                orderBy("learned_at", "desc"),
                limit(20)
            );
        } else {
            q = query(
                collection(db, "learned_words"),
                where("user_id", "==", userId),
                orderBy("learned_at", "desc"),
                limit(20)
            );
        }

        const querySnapshot = await getDocs(q);
        const words = querySnapshot.docs.map(doc => doc.data());

        const levels = ['all', 'a1', 'a2', 'b1', 'b2', 'c1'];

        let html = `
            <div class="dashboard-container">
                <h2 class="section-title">Son Öğrenilen Kelimeler</h2>
                
                <div class="filter-controls" style="justify-content: center; margin-bottom: 30px;">
                    <div class="filter-options">
                        <label>Seviye Seçin:</label>
                        <select id="recent-level-filter" onchange="loadRecentWords('${userId}', this.value)">
                            ${levels.map(l => `<option value="${l}" ${levelFilter === l ? 'selected' : ''}>${l.toUpperCase() === 'ALL' ? 'Tümü' : l.toUpperCase()}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="words-list" style="display: flex; flex-direction: column; gap: 15px; max-width: 800px; margin: 0 auto;">
                    ${words.length > 0 ? words.map(word => `
                        <div class="level-card" style="display: flex; align-items: center; justify-content: space-between; max-width: 100%; width: 100%; margin: 0; padding: 15px 25px; text-align: left;">
                            <div style="flex: 1;">
                                <h3 style="margin-bottom: 5px; font-size: 20px;">${word.word_english}</h3>
                                <p style="margin-bottom: 0; color: #4CAF50; font-weight: 500;">${word.word_turkish}</p>
                            </div>
                            <div style="text-align: right; min-width: 120px;">
                                <div class="small-info" style="margin-bottom: 5px; font-size: 13px; color: #888;">
                                    <i class="fas fa-calendar"></i>
                                    ${word.learned_at?.toDate() ? word.learned_at.toDate().toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
                                </div>
                                <span class="badge" style="position: static; display: inline-block;">${word.level.toUpperCase()}</span>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="no-data-message">
                            <p>Bu seviyede henüz öğrenilmiş kelime bulunmuyor.</p>
                        </div>
                    `}
                </div>
            </div>
        `;

        recentContent.innerHTML = html;
    } catch (error) {
        console.error('Son öğrenilen kelimeler yüklenirken hata:', error);
        const recentContent = document.getElementById('recent-words-content');
        if (recentContent) {
            recentContent.innerHTML = `
                <div class="error-message">
                    <p>Son öğrenilen kelimeler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
                </div>
            `;
        }
    }
}

// Global scope'a ekle
window.loadRecentWords = loadRecentWords;

// Quiz listesini göster
function showQuizList(level) {
    const quizListContainer = document.getElementById('quiz-list-container');
    const quizTypes = document.querySelector('.quiz-types');
    const quizContent = document.getElementById('quiz-content');

    // Quiz türlerini gizle
    if (quizTypes) quizTypes.classList.add('hide');

    // Quiz listesini göster
    if (quizListContainer) quizListContainer.classList.remove('hide');

    // Quiz içeriğini güncelle
    quizContent.innerHTML = `
        <div class="quiz-container">
            <div class="quiz-description">
                <h2>İngilizce Kelime Quizleri</h2>
                <p>Öğrendiğiniz kelimeleri test edin ve bilginizi pekiştirin.</p>
            </div>
            <div class="level-cards">
                <div class="level-card quiz-card" onclick="startQuiz('${level}', 1)">
                    <div class="card-header">
                        <h3>Test 1</h3>
                        <span class="badge">${level.toUpperCase()}</span>
                    </div>
                    <div class="card-content">
                        <p>Temel kelimeler ve kullanımları</p>
                        <ul>
                            <li>10 soru</li>
                            <li>Çoktan seçmeli</li>
                            <li>Süre sınırı yok</li>
                        </ul>
                    </div>
                    <div class="card-footer">
                        <button class="action-btn">Testi Başlat</button>
                    </div>
                </div>

                <div class="level-card quiz-card" onclick="startQuiz('${level}', 2)">
                    <div class="card-header">
                        <h3>Test 2</h3>
                        <span class="badge">${level.toUpperCase()}</span>
                    </div>
                    <div class="card-content">
                        <p>Günlük konuşma kelimeleri</p>
                        <ul>
                            <li>15 soru</li>
                            <li>Çoktan seçmeli</li>
                            <li>Süre sınırı yok</li>
                        </ul>
                    </div>
                    <div class="card-footer">
                        <button class="action-btn">Testi Başlat</button>
                    </div>
                </div>

                <div class="level-card quiz-card" onclick="startQuiz('${level}', 3)">
                    <div class="card-header">
                        <h3>Test 3</h3>
                        <span class="badge">${level.toUpperCase()}</span>
                    </div>
                    <div class="card-content">
                        <p>Karışık kelimeler testi</p>
                        <ul>
                            <li>20 soru</li>
                            <li>Çoktan seçmeli</li>
                            <li>Süre sınırı yok</li>
                        </ul>
                    </div>
                    <div class="card-footer">
                        <button class="action-btn">Testi Başlat</button>
                    </div>
                </div>
            </div>
            <div class="quiz-navigation">
                <button class="action-btn" onclick="showQuizTypes()">
                    <i class="fas fa-arrow-left"></i> Diğer Seviyelere Dön
                </button>
            </div>
        </div>
    `;
}

// Global scope'a ekle
window.showQuizList = showQuizList;

// Quiz türlerini tekrar göster
function showQuizTypes() {
    const quizContent = document.getElementById('quiz-content');

    quizContent.innerHTML = `
        <div class="quiz-container">
            <div class="quiz-description">
                <h2>İngilizce Kelime Quizleri</h2>
                <p>Öğrendiğiniz kelimeleri test edin ve bilginizi pekiştirin.</p>
            </div>
            <div class="quiz-types">
                <div class="quiz-type" id="a1-quiz">
                    <h4>A1 Seviyesi</h4>
                    <p>Temel seviyede kelime bilgisi testi</p>
                </div>
                <div class="quiz-type" id="a2-quiz">
                    <h4>A2 Seviyesi</h4>
                    <p>Temel seviyede kelime bilgisi testi</p>
                </div>
                <div class="quiz-type" id="b1-quiz">
                    <h4>B1 Seviyesi</h4>
                    <p>Orta seviyede kelime bilgisi testi</p>
                </div>
                <div class="quiz-type" id="b2-quiz">
                    <h4>B2 Seviyesi</h4>
                    <p>İleri seviyede kelime bilgisi testi</p>
                </div>
                <div class="quiz-type" id="c1-quiz">
                    <h4>C1 Seviyesi</h4>
                    <p>Profesyonel seviyede kelime bilgisi testi</p>
                </div>
            </div>
            <div id="quiz-list-container" class="hide"></div>
            <div id="quiz-question-container" class="hide"></div>
            <div id="quiz-results-container" class="hide"></div>
        </div>
    `;

    // Quiz türlerine tıklama olaylarını ekle
    ['a1', 'a2', 'b1', 'b2', 'c1'].forEach(level => {
        const quizElement = document.getElementById(`${level}-quiz`);
        if (quizElement) {
            quizElement.addEventListener('click', function () {
                showQuizList(level);
            });
        }
    });
}

// Global scope'a ekle
window.showQuizTypes = showQuizTypes;

// Liderlik tablosunu yükle
async function loadLeaderboard(container) {
    container.innerHTML = `<div style="text-align:center;padding:40px;">⏳ Yükleniyor...</div>`;

    // Misafir kontrolü eklendi
    const isGuest = (typeof currentUser !== 'undefined' && currentUser && currentUser.isGuest) || localStorage.getItem('isGuest') === 'true';
    if (isGuest) {
        container.innerHTML = `
            <div class="leaderboard-container">
                <h2>🏆 Liderlik Tablosu</h2>
                <div class="error-message" style="background-color: rgba(243, 156, 18, 0.1); border-left-color: #f39c12; color: #f39c12; padding: 20px; text-align: left; margin-top: 20px;">
                    <h3 style="margin-bottom: 10px; border: none; color: #f39c12;">⚠️ Misafir Modundasınız</h3>
                    <p>Misafir oturumunda bulunduğunuz için liderlik tablosu görüntülenememektedir. Diğer kullanıcıların sıralamalarını görmek ve yarışa katılmak için giriş yapın veya kayıt olun.</p>
                </div>
            </div>`;
        return;
    }

    try {
        const q = query(
            collection(db, 'users_public'), // Artık public DB'yi görüyoruz, e-postalar güvende
            orderBy('total_xp', 'desc'),
            limit(10)
        );
        const snapshot = await getDocs(q);

        const medals = ['🥇', '🥈', '🥉'];
        const rows = snapshot.docs.map((docSnap, i) => {
            const d = docSnap.data();
            // GÜVENLİK: E-posta adresi ASLA gösterilmez, sadece isim kullanılır
            const rawName = d.displayName || d.name || 'Anonim';
            const isMe = docSnap.id === currentUser?.uid;
            const displayName = escapeHTML(rawName);
            const xp = d.total_xp || d.xp || 0;
            const medal = medals[i] || `${i + 1}.`;
            return `
                <div class="leaderboard-row ${isMe ? 'leaderboard-me' : ''}" onclick="window.showPublicProfile('${docSnap.id}')">
                    <span class="lb-rank">${medal}</span>
                    <span class="lb-name">${displayName}${isMe ? ' (Sen)' : ''}</span>
                    <span class="lb-xp">${xp} XP</span>
                </div>`;
        }).join('');

        container.innerHTML = `
            <div class="leaderboard-container">
                <h2>🏆 Liderlik Tablosu</h2>
                <p>En yüksek XP'ye sahip kullanıcılar</p>
                <div class="leaderboard-list">
                    ${rows || '<p>Henüz veri yok.</p>'}
                </div>
            </div>`;
    } catch (err) {
        console.error('Liderlik tablosu yüklenemedi:', err);
        container.innerHTML = `<div style="text-align:center;padding:40px;color:red;">Liderlik tablosu yüklenemedi.</div>`;
    }
}

// Liderlik Tablosundan Herkese Açık Profil (Public Profile) Gösterme
window.showPublicProfile = async function (uid) {
    if (!uid) return;

    const modal = document.getElementById('public-profile-modal');
    if (!modal) return;

    // Yükleniyor durumuna al
    document.getElementById('public-profile-name').textContent = 'Yükleniyor...';
    document.getElementById('public-profile-level').textContent = 'Seviye -';
    document.getElementById('public-profile-streak').textContent = '0';
    document.getElementById('public-profile-xp').textContent = '0';
    document.getElementById('public-profile-quizzes').textContent = '0';
    document.getElementById('public-profile-words').textContent = '0';

    const avatarEl = document.getElementById('public-profile-avatar');
    avatarEl.style.backgroundImage = 'none';
    avatarEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    // Modalı aç
    modal.classList.remove('hide');

    try {
        const userDocRef = doc(db, "users_public", uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const data = userDoc.data();

            const rawName = data.displayName || data.name || 'Anonim';
            document.getElementById('public-profile-name').textContent = escapeHTML(rawName);
            document.getElementById('public-profile-level').textContent = `Seviye ${data.level || 1}`;

            document.getElementById('public-profile-streak').textContent = data.streak || 0;
            document.getElementById('public-profile-xp').textContent = data.total_xp || data.xp || 0;

            // Quiz ve Öğrenilen Kelimeleri Diğer Koleksiyonlardan Async Olarak Çek
            try {
                const quizQuery = query(collection(db, "quiz_results"), where("user_id", "==", uid));
                const wordsQuery = query(collection(db, "learned_words"), where("user_id", "==", uid));

                const [quizSnap, wordsSnap] = await Promise.all([
                    getDocs(quizQuery),
                    getDocs(wordsQuery)
                ]);

                document.getElementById('public-profile-quizzes').textContent = quizSnap.size || 0;
                document.getElementById('public-profile-words').textContent = wordsSnap.size || 0;
            } catch (err) {
                console.error("Kullanıcının ekstara bilgileri okunamadı:", err);
                document.getElementById('public-profile-quizzes').textContent = "-";
                document.getElementById('public-profile-words').textContent = "-";
            }

            // Avatar kontrolü ve yerleşimi
            if (data.photoURL) {
                avatarEl.innerHTML = '';
                avatarEl.style.backgroundImage = `url('${data.photoURL}')`;
            } else {
                avatarEl.style.backgroundImage = 'none';
                avatarEl.innerHTML = escapeHTML(rawName.charAt(0).toUpperCase());
            }

            // ARKADAŞLIK BUTONU MANTIĞI
            const actionContainer = document.getElementById('public-profile-action-container');
            const currentUser = window.firebaseAuth?.currentUser || window.currentUser;

            if (!currentUser || currentUser.isGuest || currentUser.uid === uid) {
                actionContainer.innerHTML = ''; // Giriş yok, misafir veya kendisi ise buton gösterme
            } else {
                actionContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">Kontrol ediliyor...</p>`;

                // İlişki durumunu kontrol et
                const relationId = [currentUser.uid, uid].sort().join('_');
                const relationRef = doc(db, "friendships", relationId);
                const relSnap = await getDoc(relationRef);

                if (!relSnap.exists()) {
                    // İstek yok, buton göster
                    actionContainer.innerHTML = `
                         <button class="btn" id="modal-add-friend-btn" style="padding: 8px 16px; font-size: 14px; font-weight: bold; border-radius: 30px; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                             <span style="font-size: 18px;">👤+</span> Ekle
                         </button>`;

                    document.getElementById('modal-add-friend-btn').onclick = async function () {
                        this.disabled = true;
                        this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                        try {
                            await setDoc(relationRef, {
                                users: [currentUser.uid, uid],
                                status: 'pending',
                                senderId: currentUser.uid,
                                senderName: currentUser.displayName || 'İsimsiz Kullanıcı',
                                receiverId: uid,
                                receiverName: rawName,
                                createdAt: Timestamp.now()
                            });
                            actionContainer.innerHTML = `<button class="btn" style="background: var(--border-color); color: var(--text-muted); cursor: default; padding: 8px 16px; font-size: 14px; border-radius: 30px; pointer-events:none;">⌛ Bekliyor</button>`;
                        } catch (e) {
                            console.error(e);
                            this.disabled = false;
                            this.textContent = 'Hata!';
                        }
                    };
                } else {
                    const relData = relSnap.data();
                    if (relData.status === 'accepted') {
                        actionContainer.innerHTML = `
                        <div class="profile-actions-inner">
                            <span class="friendship-status-accepted">
                                <span style="font-size: 16px;">✓</span> Arkadaşsınız
                            </span>
                            <div style="display: flex; gap: 6px;">
                                <button class="btn" id="modal-chat-btn" style="background-color: var(--secondary-color); border-color: var(--secondary-color); padding: 8px 15px; font-size: 13px; border-radius: 15px;">
                                    💬 Mesaj
                                </button>
                                <button class="btn" id="modal-remove-friend-btn" style="background-color: transparent; border-color: var(--border-color); color: var(--text-muted); padding: 8px 10px; font-size: 11px; border-radius: 15px;">
                                    Bitir
                                </button>
                            </div>
                        </div>`;

                        document.getElementById('modal-chat-btn').onclick = function () {
                            // Profil modalini kapat (isteğe bağlı, ama sohbet altta açılacak zaten)
                            // modal.classList.add('hide'); 
                            if (window.openChatWindow) {
                                window.openChatWindow(uid, rawName);
                            }
                        };

                        document.getElementById('modal-remove-friend-btn').onclick = async function () {
                            if (confirm("Bu kişiyi arkadaşlıktan çıkarmak istediğinize emin misiniz?")) {
                                await deleteDoc(relationRef);
                                window.showPublicProfile(uid);
                            }
                        };
                    } else if (relData.status === 'pending') {
                        if (relData.senderId === currentUser.uid) {
                            actionContainer.innerHTML = `
                                 <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                                     <span style="color: var(--primary-color); font-weight: bold; font-size: 12px;">⌛ Gönderildi</span>
                                     <button class="btn" id="modal-cancel-req-btn" style="background-color: var(--error-color); border-color: var(--error-color); padding: 5px 10px; font-size: 11px; border-radius: 15px;">
                                         İptal
                                     </button>
                                 </div>`;
                            document.getElementById('modal-cancel-req-btn').onclick = async function () {
                                await deleteDoc(relationRef);
                                window.showPublicProfile(uid);
                            };
                        } else {
                            actionContainer.innerHTML = `
                                 <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                                     <span style="color: var(--primary-color); font-weight: bold; font-size: 12px;">👋 İstek Geldi</span>
                                     <div style="display: flex; gap: 5px;">
                                         <button class="btn" id="modal-accept-req-btn" style="background-color: var(--success-color); border-color: var(--success-color); padding: 6px 12px; font-size: 12px; border-radius: 15px;">Kabul</button>
                                         <button class="btn" id="modal-reject-req-btn" style="background-color: var(--error-color); border-color: var(--error-color); padding: 6px 12px; font-size: 12px; border-radius: 15px;">Red</button>
                                     </div>
                                 </div>`;

                            document.getElementById('modal-accept-req-btn').onclick = async function () {
                                await updateDoc(relationRef, { status: 'accepted' });
                                window.showPublicProfile(uid);
                            };
                            document.getElementById('modal-reject-req-btn').onclick = async function () {
                                await deleteDoc(relationRef);
                                window.showPublicProfile(uid);
                            };
                        }
                    }
                }
            }

        } else {
            document.getElementById('public-profile-name').textContent = 'Kullanıcı Bulunamadı';
            avatarEl.innerHTML = '?';
        }
    } catch (error) {
        console.error("Public profil çekilirken hata:", error);
        document.getElementById('public-profile-name').textContent = 'Bilgiler Yüklenemedi';
        avatarEl.innerHTML = '!';
    }

    // Kapatma eventlerini bir kere ekle
    const closeBtn = document.getElementById('close-public-profile-btn');
    closeBtn.onclick = () => modal.classList.add('hide');

    // Dışarı tıklayınca da kapansın
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.add('hide');
        }
    };
}

// Quiz'i başlat
function startQuiz(level, testNumber) {
    console.log('🚀 startQuiz çağrıldı:', level, testNumber);

    const wordLearning = new WordLearning('quiz-content', currentUser.uid);

    // Kelime havuzlarını direkt al
    const pools = {
        'a1': wordLearning.a1WordPools,
        'a2': wordLearning.a2WordPools,
        'b1': wordLearning.b1WordPools,
        'b2': wordLearning.b2WordPools,
        'c1': wordLearning.c1WordPools,
    };

    const levelKey = level.toLowerCase();
    const levelPools = pools[levelKey];

    if (!levelPools) {
        console.error('Geçersiz seviye:', level);
        return;
    }

    // Test numarasına göre kaynak kelime havuzunu belirle
    let sourceWords = [];
    if (testNumber === 1) {
        sourceWords = levelPools.learning1 || [];
    } else if (testNumber === 2) {
        sourceWords = levelPools.learning2 || levelPools.learning1 || [];
    } else if (testNumber === 3) {
        // Tüm alt havuzları birleştir ve tekrarları kaldır
        const allWords = Object.values(levelPools).flat();
        const seen = new Set();
        for (const w of allWords) {
            if (!seen.has(w.english)) {
                seen.add(w.english);
                sourceWords.push(w);
            }
        }
    }

    if (sourceWords.length === 0) {
        sourceWords = levelPools.learning1 || [];
    }

    // Karıştır ve soru sayısına göre kes
    const questionCounts = { 1: 10, 2: 15, 3: 20 };
    const count = Math.min(questionCounts[testNumber] || 10, sourceWords.length);
    const shuffled = [...sourceWords].sort(() => Math.random() - 0.5);
    const selectedWords = shuffled.slice(0, count);

    console.log('✅ Seçilen kelimeler:', selectedWords.map(w => w.english));

    // WordLearning instance'ını manual olarak ayarla
    wordLearning.words = selectedWords;
    wordLearning.currentLevel = levelKey.toUpperCase();
    wordLearning.currentWordIndex = 0;
    wordLearning.correctAnswers = 0;
    wordLearning.userAnswers = [];

    // Testi render et
    wordLearning.renderWordTest();
}

// Global scope'a ekle
window.startQuiz = startQuiz;

async function deleteAccount() {
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'confirm-dialog';
    confirmDialog.innerHTML = `
        <div class="confirm-dialog-content">
            <h3>Hesap Silme Onayı</h3>
            <p>Hesabınız kalıcı olarak silinecektir. Bu işlem geri alınamaz.</p>
            <p>Devam etmek için şifrenizi girin:</p>
            <div class="form-group" style="margin: 15px 0;">
                <input type="password" id="delete-password-confirm" placeholder="Şifreniz" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid var(--border-color, #ddd);">
            </div>
            <div class="confirm-dialog-buttons">
                <button class="action-btn cancel-btn" onclick="closeConfirmDialog()">İptal</button>
                <button class="action-btn delete-btn" onclick="confirmDeleteAccount()">Hesabı Sil</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmDialog);
}

// Global scope'a ekle
window.deleteAccount = deleteAccount;

function closeConfirmDialog() {
    const dialog = document.querySelector('.confirm-dialog');
    if (dialog) {
        dialog.remove();
    }
}

// Global scope'a ekle
window.closeConfirmDialog = closeConfirmDialog;

async function confirmDeleteAccount() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        // GÜVENLİK: Şifre ile re-authentication
        const passwordInput = document.getElementById('delete-password-confirm');
        if (!passwordInput || !passwordInput.value) {
            alert('Lütfen şifrenizi girin.');
            return;
        }
        const credential = EmailAuthProvider.credential(user.email, passwordInput.value);
        await reauthenticateWithCredential(user, credential);

        const deleteDate = new Date();
        deleteDate.setDate(deleteDate.getDate() + 30);

        // Kullanıcıyı pending_deletion olarak işaretle
        await updateDoc(doc(db, "users", user.uid), {
            accountStatus: "pending_deletion",
            deletionDate: Timestamp.fromDate(deleteDate)
        });

        // GÜVENLİK: Tüm yerel verileri temizle
        await signOut(auth);
        localStorage.clear();
        sessionStorage.clear();

        console.log('Hesap silinme sürecine alındı.');
        alert('Hesabınız silinme sürecine alındı. 30 gün boyunca giriş yapmazsanız kalıcı olarak silinecektir. Fikrinizi değiştirirseniz 30 gün içinde tekrar giriş yaparak işlemi iptal edebilirsiniz.');
        window.location.href = '/';
    } catch (error) {
        console.error('Hesap silme hatası:', error.message);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            alert('Şifre hatalı. Lütfen doğru şifrenizi girin.');
        } else {
            alert('Hesap silme başarısız. Lütfen tekrar deneyin.');
        }
    }
    closeConfirmDialog();
}

// Global scope'a ekle
window.confirmDeleteAccount = confirmDeleteAccount;

function filterWords() {
    const searchTerm = document.getElementById('word-search').value.toLowerCase();
    const selectedLevel = document.getElementById('level-filter').value;
    const wordRows = document.querySelectorAll('.words-table tbody tr');

    wordRows.forEach(row => {
        const english = row.querySelector('td:nth-child(1)').textContent.toLowerCase();
        const turkish = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
        const level = row.getAttribute('data-level');

        const matchesSearch = english.includes(searchTerm) || turkish.includes(searchTerm);
        const matchesLevel = selectedLevel === 'all' || level === selectedLevel;

        if (matchesSearch && matchesLevel) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}
// [Yeni] Doğrulama Ekranı Yönetimi
function setupVerificationScreen() {
    const resendBtn = document.getElementById('resend-verification-btn');
    const verifyLogoutBtn = document.getElementById('verification-logout-btn');

    // Eğer kod tekrar gönder butonu varsa, başlangıçta 60sn bekletelim
    if (resendBtn && resendBtn.disabled) {
        let timeLeft = 60;
        resendBtn.textContent = `Tekrar Gönder (${timeLeft}s)`;

        const initialTimer = setInterval(() => {
            timeLeft--;
            if (resendBtn.textContent.includes('(60s)')) { // Başka bir timer başlamışsa bunu durdur
                clearInterval(initialTimer);
                return;
            }
            resendBtn.textContent = `Tekrar Gönder (${timeLeft}s)`;
            if (timeLeft <= 0) {
                clearInterval(initialTimer);
                resendBtn.disabled = false;
                resendBtn.textContent = 'Kodu Tekrar Gönder';
            }
        }, 1000);
    }

    if (verifyLogoutBtn) {
        verifyLogoutBtn.onclick = async () => {
            await signOut(auth);
            window.location.reload();
        };
    }
}

// Sayfa yüklendiğinde form olaylarını ayarla
setupForms();
setupVerificationScreen();

// Giriş/Kayıt form geçişleri
document.getElementById('go-to-register')?.addEventListener('click', function (e) {
    e.preventDefault();
    document.getElementById('login-section').classList.add('hide');
    document.getElementById('register-section').classList.remove('hide');
});

document.getElementById('go-to-login')?.addEventListener('click', function (e) {
    e.preventDefault();
    document.getElementById('register-section').classList.add('hide');
    document.getElementById('login-section').classList.remove('hide');
});

// Dashboard istatistiklerini güncelle
async function updateDashboard() {
    if (currentUser) {
        const dashboard = new Dashboard('dashboard-content', currentUser.uid);
        await dashboard.init();
    }
}

// Tema değiştirme fonksiyonu
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    console.log('Tema değiştirildi:', isDark ? 'Karanlık' : 'Aydınlık');
}

// Olay dinleyicilerini sayfa her yenilendiğinde (özellikle app-container açıldığında) tekrar kontrol et
function setupThemeToggle() {
    document.getElementById('theme-toggle-app')?.addEventListener('click', toggleTheme);
}

// İlk kurulum
setupThemeToggle();

// Global scope'a ekle
window.filterWords = filterWords;
window.updateDashboard = updateDashboard;
window.toggleTheme = toggleTheme;

