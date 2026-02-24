// Çerez Bildirimi Yönetimi
document.addEventListener('DOMContentLoaded', function() {
    // Çerez kontrolü
    if (!localStorage.getItem('cookieConsent')) {
        setTimeout(function() {
            showCookieConsent();
        }, 1000); // 1 saniye sonra göster
    }
    
    // Çerez bildirimini göster
    function showCookieConsent() {
        const cookieConsent = document.getElementById('cookie-consent');
        if (cookieConsent) {
            cookieConsent.classList.add('active');
        }
    }
    
    // Çerez kabul et
    document.getElementById('accept-cookies').addEventListener('click', function() {
        localStorage.setItem('cookieConsent', 'accepted');
        hideCookieConsent();
    });
    
    // Çerez reddet
    document.getElementById('decline-cookies').addEventListener('click', function() {
        localStorage.setItem('cookieConsent', 'declined');
        // Analitik ve takip kodlarını devre dışı bırak
        disableTracking();
        hideCookieConsent();
    });
    
    // Çerez bildirimini gizle
    function hideCookieConsent() {
        const cookieConsent = document.getElementById('cookie-consent');
        if (cookieConsent) {
            cookieConsent.classList.remove('active');
            
            // Animasyon tamamlandıktan sonra kaldır
            setTimeout(function() {
                cookieConsent.style.display = 'none';
            }, 500);
        }
    }
    
    // Takip kodlarını devre dışı bırak
    function disableTracking() {
        // Google Analytics'i devre dışı bırak
        window['ga-disable-G-L999D4076P'] = true;
        
        // Diğer takip kodları varsa buraya eklenebilir
        console.log('Çerezler reddedildi, analitik takibi devre dışı bırakıldı.');
    }
}); 