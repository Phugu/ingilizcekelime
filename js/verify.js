import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, applyActionCode } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Protected Configuration Store
const _0x1a2b = [
    "QUl6YVN5QUh2TFhmS1R6blNYaFJCWnlKX1lVVi12OHIzblV2N0RZ",
    "aW5naWxpemNla2VsaW1lLWNiZWI2LmZpcmViYXNlYXBwLmNvbQ==",
    "aW5naWxpemNla2VsaW1lLWNiZWI2",
    "aW5naWxpemNla2VsaW1lLWNiZWI2LmZpcmViYXNlc3RvcmFnZS5hcHA=",
    "NDEzNTgyNTcxMjM2",
    "MTo0MTM1ODI1NzEyMzY6d2ViOjdiOTA4ZjY4M2JjNWUzOWY1MmRlZjE=",
    "Ry1YUjlHTUpZOEpG"
];

const _0xdec = (arr, i) => atob(arr[i]);

const _0xfbConfig = {
    apiKey: _0xdec(_0x1a2b, 0),
    authDomain: _0xdec(_0x1a2b, 1),
    projectId: _0xdec(_0x1a2b, 2),
    storageBucket: _0xdec(_0x1a2b, 3),
    messagingSenderId: _0xdec(_0x1a2b, 4),
    appId: _0xdec(_0x1a2b, 5)
};

// Firebase Başlat
const app = initializeApp(_0xfbConfig);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    // 1. URL'den oobCode'u (Doğrulama Kodunu) Al
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const actionCode = urlParams.get('oobCode');

    const verifyBtn = document.getElementById('action-verify-btn');
    const messageContainer = document.getElementById('verify-message');
    const countdownContainer = document.getElementById('countdown-container');
    const redirectCounter = document.getElementById('redirect-counter');

    // Eğer URL parametresi yoksa veya yanlış moddaysa hata ver
    if (!mode || mode !== 'verifyEmail' || !actionCode) {
        verifyBtn.style.display = 'none';
        messageContainer.textContent = "Geçersiz veya eksik bağlantı. Lütfen e-postanızı kontrol edin.";
        messageContainer.className = "message-container message-error";
        messageContainer.style.display = "block";
        return;
    }

    // 2. Tıklama ile Doğrulama (BOT ENGELLEME MANTIĞI)
    // Botlar bu butona ASLA basamaz. Sadece gerçek kullanıcılar basar.
    verifyBtn.addEventListener('click', async () => {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Doğrulanıyor, Lütfen Bekleyin...';

        try {
            // Firebase'e "Kodu Uygula" (Apply Code) komutu gönderiyoruz
            await applyActionCode(auth, actionCode);

            // Başarılı!
            verifyBtn.style.display = 'none';
            messageContainer.innerHTML = '<i class="fa-solid fa-circle-check"></i> E-postanız başarıyla doğrulandı!';
            messageContainer.className = "message-container message-success";
            messageContainer.style.display = "block";

            // Yönlendirme Geri Sayımı
            countdownContainer.classList.remove('hide');
            let counter = 3;
            const timer = setInterval(() => {
                counter--;
                redirectCounter.textContent = counter;
                if (counter <= 0) {
                    clearInterval(timer);
                    // Ana siteye geri yönlendir (Ekranda login vs. her şey hallolmuş şekilde açılır)
                    window.location.replace('/');
                }
            }, 1000);

        } catch (error) {
            console.error('Doğrulama hatası:', error);
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Tekrar Dene';

            let errorText = "Hata oluştu.";
            if (error.code === 'auth/invalid-action-code') {
                errorText = "Bu bağlantının süresi dolmuş veya daha önce kullanılmış! Eğer uygulamada hala 'onay bekliyor' görünüyorsa, yeni bir doğrulama bağlantısı istemeniz gerekir.";
            } else if (error.code === 'auth/expired-action-code') {
                errorText = "Bu bağlantının süresi dolmuş. Lütfen uygulamadan yeni bir e-posta talebi gönderin.";
            }

            messageContainer.textContent = errorText;
            messageContainer.className = "message-container message-error";
            messageContainer.style.display = "block";
        }
    });
});
