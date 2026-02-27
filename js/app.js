// App.js - Ana uygulama dosyası
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser as firebaseDeleteUser,
    updatePassword,
    sendEmailVerification,
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
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { WordLearning } from './learning.js';

// Global değişkenler
let currentUser = null;
let wordLearningInstance = null;
const db = getFirestore();
const auth = window.firebaseAuth; // Already initialized in index.html

// GÜVENLİK: XSS koruması için HTML escape fonksiyonu
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
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
            // ... (Firebase create user)
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

            console.log('Kayıt başarılı (Public/Private ayrışımı tamam):', user.email);

            // Doğrulama e-postası gönder
            await sendEmailVerification(user);
            console.log('Doğrulama e-postası gönderildi.');

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
        const userId = currentUser.uid;
        console.log('Aktif kullanıcı kimliği:', userId);

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

        // Dashboard'ı başlat
        const dashboard = new Dashboard('dashboard-content', userId);
        await dashboard.init();

        // Dashboard'ı varsayılan olarak göster
        document.getElementById('dashboard-content').classList.remove('hide');
        document.getElementById('nav-dashboard').classList.add('active');

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

        if (lastActivity && !isToday(lastActivity) && !isYesterday(lastActivity)) {
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


// Profil sayfasını yükle
async function loadProfileContent() {
    try {
        hideAllContentSections();

        const profileContent = document.getElementById('profile-content');
        if (!profileContent) return;
        profileContent.classList.remove('hide');

        // GÜVENLİK: Misafir kullanıcı için benzersiz oturum ID'si kullan
        const guestFallback = localStorage.getItem('isGuest') === 'true' ? {
            uid: sessionStorage.getItem('guestSessionId') || 'guest_' + crypto.randomUUID(),
            isGuest: true,
            displayName: 'Misafir Kullanıcı'
        } : null;
        const user = window.currentUser || auth.currentUser || guestFallback;
        if (!user) {
            console.error('Kullanıcı oturumu bulunamadı.');
            profileContent.innerHTML = `<div class="error-message"><p>Profil bilgileri yüklenemedi: Kullanıcı oturumu bulunamadı.</p></div>`;
            return;
        }

        console.log('Kullanıcı bilgileri:', user);

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
                <h2>Profil Bilgileriniz</h2>
                
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

                <div class="profile-section gamification-details">
                    <h3>Gelişim</h3>
                    <div class="profile-info">
                        <div class="info-item">
                            <span class="label">Seviye:</span>
                            <span class="value">Seviye ${level}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Mevcut XP:</span>
                            <span class="value">${xp} / ${nextLevelXp} XP</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Toplam XP:</span>
                            <span class="value">${totalXp} XP</span>
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

        // Quiz sonuçları bölümü
        if (!user.isGuest) {
            try {
                const q = query(
                    collection(db, "quiz_results"),
                    where("user_id", "==", user.uid),
                    orderBy("created_at", "desc"),
                    limit(5)
                );
                const querySnapshot = await getDocs(q);
                const quizResults = querySnapshot.docs.map(doc => doc.data());

                if (quizResults.length > 0) {
                    html += `
                    <div class="profile-section recent-quizzes">
                            <h3>Quiz Sonuçları</h3>
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
                                    ${quizResults.map(result => {
                        const date = result.created_at?.toDate() ? result.created_at.toDate().toLocaleDateString('tr-TR') : 'Belirtilmemiş';
                        const successRate = Math.round((result.correct_count / result.total_questions) * 100);
                        return `
                                            <tr>
                                                <td>${escapeHTML(result.level.toUpperCase())}</td>
                                                <td>${result.correct_count}</td>
                                                <td>${result.total_questions}</td>
                                                <td>%${successRate}</td>
                                                <td>${date}</td>
                                </tr>
                                        `;
                    }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                } else {
                    html += `
                    <div class="profile-section notification">
                        <h3>Quiz Geçmişi</h3>
                        <p class="info-message">Henüz hiç quiz çözmediniz. Quiz çözmek için "Quiz" sekmesine geçebilirsiniz.</p>
                    </div>
                `;
                }
            } catch (error) {
                console.error('Quiz sonuçları yüklenirken hata:', error);
            }
        } else {
            html += `
                <div class="profile-section notification">
                    <h3>Quiz Geçmişi</h3>
                    <p class="info-message">Misafir oturumunda bulunduğunuz için quiz geçmişiniz kaydedilmiyor.</p>
                </div>
            `;
        }

        // Çıkış yapma butonu
        html += `
            <div class="profile-section logout-section">
                <button id="profile-logout-btn" class="btn btn-danger">${user.isGuest ? 'Kayıt Ol / Giriş Yap' : 'Çıkış Yap'}</button>
            </div>
        `;

        profileContent.innerHTML = html + '</div>';

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

        // İsim değiştirme formu
        const nameChangeForm = document.getElementById('name-change-form');
        if (nameChangeForm) {
            nameChangeForm.onsubmit = async (e) => {
                e.preventDefault();
                if (user.isGuest) return;
                const newName = document.getElementById('new-name').value;
                try {
                    await updateProfile(auth.currentUser, { displayName: newName });
                    await updateDoc(doc(db, "users", auth.currentUser.uid), { name: newName });

                    document.getElementById('name-modal').classList.add('hide');
                    window.location.reload();
                } catch (err) {
                    alert('İsim değiştirme başarısız: ' + err.message);
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
        console.error('Profil sayfası yüklenirken hata:', error);
        const profileContent = document.getElementById('profile-content');
        if (profileContent) {
            profileContent.innerHTML = `
                    <div class="error-message">
                        <p>Profil bilgileri yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
                    </div>
                `;
        }
    }
}

// Global scope'a ekle
window.loadProfileContent = loadProfileContent;

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

            // Özel verileri al (Günlük Görevler için)
            const privateDoc = await getDoc(doc(db, "users_private", this.userId));
            const privateData = privateDoc.exists() ? privateDoc.data() : {};
            const dailyQuests = privateData.dailyQuests || null;

            return {
                totalWords: learnedWordsCount,
                totalQuizzes: quizResultsCount,
                studyStreak: userData.streak || 0,
                level: userData.level || 1,
                xp: userData.xp || 0,
                totalXP: userData.total_xp || 0,
                dailyQuests: dailyQuests
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
                <h2>Hoş Geldiniz!</h2>
                
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
                    
                    <div class="stat-card">
                        <h3>Günlük Seri</h3>
                        <div class="stat-number">${stats.studyStreak}</div>
                        <div class="stat-label">🔥 Gün</div>
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
            const rawName = d.name || 'Anonim';
            const isMe = docSnap.id === currentUser?.uid;
            // Diğer kullanıcıların isimlerini artık maskelemiyoruz, doğrudan XSS'den temizleyip gösteriyoruz
            const displayName = escapeHTML(rawName);
            const xp = d.total_xp || d.xp || 0;
            const medal = medals[i] || `${i + 1}.`;
            return `
                <div class="leaderboard-row ${isMe ? 'leaderboard-me' : ''}">
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
// Olay dinleyicilerini sayfa her yenilendiğinde tekrar kontrol et
function setupVerificationScreen() {
    const resendBtn = document.getElementById('resend-verification-btn');
    const verifyLogoutBtn = document.getElementById('verification-logout-btn');

    if (resendBtn) {
        let countdown = 60;
        resendBtn.disabled = true;

        const timerInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                resendBtn.textContent = `Tekrar Gönder (Lütfen ${countdown}s bekleyin)`;
            } else {
                clearInterval(timerInterval);
                resendBtn.disabled = false;
                resendBtn.textContent = 'Doğrulama e-postasını tekrar gönder';
            }
        }, 1000);

        resendBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (user && !user.emailVerified) {
                try {
                    resendBtn.disabled = true;
                    resendBtn.textContent = 'Gönderiliyor...';
                    await sendEmailVerification(user);

                    const msg = document.getElementById('verification-message');
                    if (msg) {
                        msg.textContent = 'Yeni doğrulama bağlantısı e-posta adresinize gönderildi!';
                        msg.classList.remove('hide');
                        setTimeout(() => msg.classList.add('hide'), 5000);
                    }

                    // Reset 60s countdown
                    countdown = 60;
                    const resendInterval = setInterval(() => {
                        countdown--;
                        if (countdown > 0) {
                            resendBtn.textContent = `Tekrar Gönder (Lütfen ${countdown}s bekleyin)`;
                        } else {
                            clearInterval(resendInterval);
                            resendBtn.disabled = false;
                            resendBtn.textContent = 'Doğrulama e-postasını tekrar gönder';
                        }
                    }, 1000);
                } catch (error) {
                    console.error('Doğrulama e-postası gönderilemedi:', error);
                    let errText = 'E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.';
                    if (error.code === 'auth/too-many-requests') {
                        errText = 'Çok fazla istek yapıldı. Lütfen biraz bekleyip tekrar deneyin.';
                    }
                    const errMsg = document.getElementById('verification-error');
                    if (errMsg) {
                        errMsg.textContent = errText;
                        errMsg.classList.remove('hide');
                        setTimeout(() => errMsg.classList.add('hide'), 4000);
                    }
                    resendBtn.disabled = false;
                    resendBtn.textContent = 'Doğrulama e-postasını tekrar gönder';
                }
            }
        });
    }

    const checkBtn = document.getElementById('check-verification-btn');
    if (checkBtn) {
        checkBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (user) {
                checkBtn.textContent = 'Kontrol ediliyor...';
                checkBtn.disabled = true;
                try {
                    await user.reload();
                    if (user.emailVerified) {
                        window.location.reload();
                    } else {
                        checkBtn.textContent = 'Henüz onaylanmamış! (Tekrar deneyin)';
                        setTimeout(() => {
                            checkBtn.textContent = 'Onayladım, İçeri Al';
                            checkBtn.disabled = false;
                        }, 3000);
                    }
                } catch (e) {
                    console.error('Yenileme hatası:', e);
                    checkBtn.textContent = 'Bağlantı Hatası (Tekrar tıklayın)';
                    setTimeout(() => {
                        checkBtn.textContent = 'Onayladım, İçeri Al';
                        checkBtn.disabled = false;
                    }, 3000);
                }
            }
        });
    }

    if (verifyLogoutBtn) {
        verifyLogoutBtn.addEventListener('click', async () => {
            await signOut(auth);
            window.location.reload();
        });
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

