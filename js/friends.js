import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc, Timestamp, onSnapshot, addDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Global loading function for the UI
window.loadFriendsUI = function () {
    const container = document.getElementById('friends-content');
    if (!container) return;

    if (container.innerHTML === "") {
        // Build the basic structural UI
        container.innerHTML = `
            <div class="friends-wrapper" style="max-width: 800px; margin: 0 auto; padding: 20px;">
                <h1 style="color: var(--text-main); margin-bottom: 20px;">Sosyal Hub</h1>
                
                <!-- Arama Bölümü -->
                <div class="card" style="background: var(--card-bg); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 25px;">
                    <h2 style="color: var(--primary-color); font-size: 18px; margin-bottom: 15px;">Kullanıcı Bul</h2>
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <input type="text" id="friend-search-input" placeholder="Tam kullanıcı adı ile ara..." 
                               style="flex: 1; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-main); font-size: 15px;">
                        <button id="friend-search-btn" class="btn" style="white-space: nowrap; padding: 0 20px;">Ara</button>
                    </div>
                    <div id="friend-search-results"></div>
                </div>

                <!-- Gelen İstekler Bölümü -->
                <div class="card" style="background: var(--card-bg); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 25px;">
                    <h2 style="color: var(--primary-color); font-size: 18px; margin-bottom: 15px;">Gelen İstekler</h2>
                    <div id="friend-requests-list">
                        <p style="color: var(--text-muted); font-size: 14px; text-align: center; padding: 20px 0;">Bekleyen istek yok.</p>
                    </div>
                </div>

                <!-- Arkadaşlar Listesi Bölümü -->
                <div class="card" style="background: var(--card-bg); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h2 style="color: var(--primary-color); font-size: 18px; margin-bottom: 15px;">Arkadaşlarım</h2>
                    <div id="friends-list">
                        <p style="color: var(--text-muted); font-size: 14px; text-align: center; padding: 20px 0;">Henüz arkadaş eklemediniz.</p>
                    </div>
                </div>
            </div>
        `;
        setupFriendEvents();
    }

    // Her sayfa açılışında verileri yenile
    refreshFriendsData();
};

function setupFriendEvents() {
    const searchBtn = document.getElementById('friend-search-btn');
    const searchInput = document.getElementById('friend-search-input');

    if (searchBtn) {
        searchBtn.addEventListener('click', handleFriendSearch);
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleFriendSearch();
        });
    }
}

async function handleFriendSearch() {
    const queryText = document.getElementById('friend-search-input').value.trim();
    const resultsContainer = document.getElementById('friend-search-results');
    const currentUser = window.firebaseAuth?.currentUser || window.currentUser;

    if (!queryText) {
        resultsContainer.innerHTML = '<p style="color: var(--error-color); font-size: 14px;">Lütfen bir kullanıcı adı girin.</p>';
        return;
    }

    if (!currentUser || currentUser.isGuest) {
        resultsContainer.innerHTML = '<p style="color: var(--error-color); font-size: 14px;">Misafirler arkadaş ekleyemez.</p>';
        return;
    }

    resultsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">Aranıyor...</p>';

    try {
        const db = window.firestore;

        // Tam eşleşme sorgusu (Büyük/küçük harf duyarlı olabilir)
        const usersRef = collection(db, "users_public");
        const q = query(usersRef, where("name", "==", queryText));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            resultsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">Kullanıcı bulunamadı.</p>';
            return;
        }

        resultsContainer.innerHTML = '';

        querySnapshot.forEach((documentSnapshot) => {
            const userData = documentSnapshot.data();
            const targetUserId = documentSnapshot.id;

            // Kendimizi bulduysak gösterme
            if (targetUserId === currentUser.uid) return;

            // Kartı oluştur
            const userCard = document.createElement('div');
            userCard.style.cssText = `
                display: flex; align-items: center; justify-content: space-between;
                padding: 15px; background: var(--bg-color); border-radius: 8px;
                border: 1px solid var(--border-color); margin-top: 10px;
            `;

            const avatarHtml = userData.photoURL
                ? `<div style="width: 40px; height: 40px; border-radius: 50%; background-image: url('${userData.photoURL}'); background-size: cover; background-position: center;"></div>`
                : `<div style="width: 40px; height: 40px; border-radius: 50%; background-color: var(--primary-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">${userData.name.charAt(0).toUpperCase()}</div>`;

            userCard.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    ${avatarHtml}
                    <div>
                        <div style="color: var(--text-main); font-weight: bold; font-size: 16px;">${userData.name}</div>
                        <div style="color: var(--text-muted); font-size: 12px;">Seviye ${userData.level || 1} • ${userData.total_xp || userData.xp || 0} XP</div>
                    </div>
                </div>
                <button class="btn add-friend-btn" data-uid="${targetUserId}" data-name="${userData.name}" style="padding: 8px 15px; font-size: 13px;">İstek Gönder</button>
            `;

            resultsContainer.appendChild(userCard);
        });

        if (resultsContainer.innerHTML === '') {
            resultsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">Yalnızca kendinizi buldunuz.</p>';
        } else {
            // Buton eventlerini bağla
            document.querySelectorAll('.add-friend-btn').forEach(btn => {
                btn.addEventListener('click', async function () {
                    this.disabled = true;
                    this.textContent = 'Gönderiliyor...';
                    await sendFriendRequest(this.getAttribute('data-uid'), this.getAttribute('data-name'), this);
                });
            });
        }

    } catch (error) {
        console.error("Kullanıcı arama hatası:", error);
        resultsContainer.innerHTML = '<p style="color: var(--error-color); font-size: 14px;">Arama sırasında bir hata oluştu.</p>';
    }
}

async function sendFriendRequest(targetUid, targetName, btnElement) {
    const currentUser = window.firebaseAuth?.currentUser || window.currentUser;
    const db = window.firestore;

    // Güvenlik için ilişki döküman id'sini UID'leri alfabetik sıralayarak oluşturalım (tekilliği garanti eder)
    const relationId = [currentUser.uid, targetUid].sort().join('_');

    try {
        const relationRef = doc(db, "friendships", relationId);

        await setDoc(relationRef, {
            users: [currentUser.uid, targetUid],
            status: 'pending',
            senderId: currentUser.uid,
            senderName: currentUser.displayName || 'İsimsiz Kullanıcı',
            receiverId: targetUid,
            receiverName: targetName,
            createdAt: Timestamp.now()
        });

        btnElement.textContent = 'İstek Gönderildi';
        btnElement.style.backgroundColor = 'var(--success-color)';
        btnElement.style.borderColor = 'var(--success-color)';
    } catch (error) {
        console.error("İstek gönderme hatası:", error);
        btnElement.disabled = false;
        btnElement.textContent = 'Hata! Tekrar Dene';
        btnElement.style.backgroundColor = 'var(--error-color)';
    }
}

let activeUnsubscribe = null;

function refreshFriendsData() {
    const currentUser = window.firebaseAuth?.currentUser || window.currentUser;
    if (!currentUser || currentUser.isGuest) return;

    const db = window.firestore;

    if (activeUnsubscribe) {
        activeUnsubscribe(); // Önceki listener'ı kapat (birden çok sekme tıklaması için)
    }

    const friendshipsRef = collection(db, "friendships");
    const q = query(friendshipsRef, where("users", "array-contains", currentUser.uid));

    // Real-time listener
    activeUnsubscribe = onSnapshot(q, (snapshot) => {
        const requestsList = document.getElementById('friend-requests-list');
        const friendsList = document.getElementById('friends-list');

        if (!requestsList || !friendsList) return; // UI kapalıysa

        let requestsHtml = '';
        let friendsHtml = '';

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const relId = docSnap.id;

            // Eğer kabul edilidiyse, arkadaşlar listesine gider
            if (data.status === 'accepted') {
                const friendName = data.senderId === currentUser.uid ? data.receiverName : data.senderName;
                const friendId = data.senderId === currentUser.uid ? data.receiverId : data.senderId;

                friendsHtml += `
                    <div class="friend-card" data-friend-id="${friendId}" style="display: flex; align-items: center; justify-content: space-between; padding: 15px; background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                        <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="if(window.showPublicProfile) window.showPublicProfile('${friendId}')">
                            <div style="width: 45px; height: 45px; border-radius: 50%; background-color: var(--primary-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; background-size: cover; background-position: center;" 
                                 ${data.photoURL ? `style="background-image: url('${data.photoURL}')"` : ''}>
                                ${!data.photoURL ? friendName.charAt(0).toUpperCase() : ''}
                            </div>
                            <div>
                                <div style="color: var(--text-main); font-weight: bold; font-size: 16px;">${friendName}</div>
                                <div style="display: flex; align-items: center; gap: 5px;">
                                    <span class="status-dot status-offline"></span>
                                    <span class="status-text offline">Yükleniyor...</span>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn" onclick="window.openChatWindow('${friendId}', '${friendName}')" style="background-color: var(--secondary-color); border-color: var(--secondary-color); color: white; padding: 8px 15px; font-size: 13px; border-radius: 20px;">
                                💬 Mesaj
                            </button>
                            <button class="btn btn-remove-friend" data-id="${relId}" style="background-color: transparent; border-color: var(--border-color); color: var(--text-muted); padding: 8px 12px; font-size: 13px; border-radius: 20px;">Çıkar</button>
                        </div>
                    </div>
                `;
            }
            // Eğer beklemedeyse ve alıcı BİZ isek, gelen isteklere ekle
            else if (data.status === 'pending') {
                if (data.receiverId === currentUser.uid) {
                    requestsHtml += `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px; background: var(--bg-color); border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 10px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background-color: var(--secondary-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">
                                    ${data.senderName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style="color: var(--text-main); font-weight: bold; font-size: 15px;">${data.senderName}</div>
                                    <div style="color: var(--text-muted); font-size: 12px;">Sizi eklemek istiyor</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-accept-req" data-id="${relId}" style="background-color: var(--success-color); border-color: var(--success-color); color: white; padding: 8px 12px; font-size: 13px;">Kabul Et</button>
                                <button class="btn btn-reject-req" data-id="${relId}" style="background-color: var(--error-color); border-color: var(--error-color); color: white; padding: 8px 12px; font-size: 13px;">Reddet</button>
                            </div>
                        </div>
                    `;
                }
                // Eğer gönderici bizsek, bekleyen gönderilen istek olarak (isteğe bağlı UI) gösterebiliriz
                else {
                    // Gönderilen bekleyen istek olarak şimdilik arkadaşlar sekmesinde silik gösterelim
                    friendsHtml += `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px; background: var(--bg-color); border-radius: 8px; border: 1px dashed var(--border-color); margin-bottom: 10px; opacity: 0.7;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background-color: var(--border-color); color: var(--text-muted); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">
                                    ${data.receiverName.charAt(0).toUpperCase()}
                                </div>
                                <div style="color: var(--text-muted); font-size: 15px;">İstek gönderildi: ${data.receiverName}</div>
                            </div>
                            <button class="btn btn-reject-req" data-id="${relId}" style="background-color: var(--error-color); border-color: var(--error-color); padding: 5px 10px; font-size: 11px;">İptal</button>
                        </div>
                    `;
                }
            }
        });

        if (requestsHtml) {
            requestsList.innerHTML = requestsHtml;
        } else {
            requestsList.innerHTML = '<p style="color: var(--text-muted); font-size: 14px; text-align: center; padding: 20px 0;">Bekleyen istek yok.</p>';
        }

        if (friendsHtml) {
            friendsList.innerHTML = friendsHtml;
            // Arkadaşların durumlarını dinle (Presence)
            setupFriendsStatusListeners();
        } else {
            friendsList.innerHTML = '<p style="color: var(--text-muted); font-size: 14px; text-align: center; padding: 20px 0;">Henüz arkadaş eklemediniz.</p>';
        }

        // Buton Dinleyicilerini Ekle
        attachActionListeners();
    }, (error) => {
        console.error("Arkadaşlar listesini dinleme hatası:", error);
    });
}

// Arkadaşların çevrimiçi durumlarını real-time takip et
let statusListeners = {};
function setupFriendsStatusListeners() {
    const db = window.firestore;
    const friendElements = document.querySelectorAll('.friend-card');

    // Eski listener'ları temizle
    Object.values(statusListeners).forEach(unsub => unsub());
    statusListeners = {};

    friendElements.forEach(card => {
        const friendId = card.dataset.friendId;
        if (!friendId) return;

        const unsub = onSnapshot(doc(db, "users_public", friendId), (snap) => {
            if (snap.exists()) {
                const userData = snap.data();
                const isOnline = userData.onlineStatus === 'online';

                // Kalp atışını da kontrol edelim (Eğer 5 dakikadır ses gelmiyorsa offline say)
                let reallyOnline = isOnline;
                if (isOnline && userData.lastSeen) {
                    const lastSeen = userData.lastSeen.toDate();
                    const now = new Date();
                    if ((now - lastSeen) > 5 * 60 * 1000) {
                        reallyOnline = false;
                    }
                }

                const dot = card.querySelector('.status-dot');
                const text = card.querySelector('.status-text');

                if (dot && text) {
                    dot.className = `status-dot ${reallyOnline ? 'status-online' : 'status-offline'}`;
                    text.textContent = reallyOnline ? 'Çevrimiçi' : 'Çevrimdışı';
                    text.className = `status-text ${reallyOnline ? 'online' : 'offline'}`;
                }
            }
        });
        statusListeners[friendId] = unsub;
    });
}

function attachActionListeners() {
    const db = window.firestore;

    // Sohbet Dinleyicisi artik onclick ile yönetiliyor (Daha güvenilir)

    // Kabul Et
    document.querySelectorAll('.btn-accept-req').forEach(btn => {
        btn.addEventListener('click', async function () {
            const relId = this.getAttribute('data-id');
            await updateDoc(doc(db, "friendships", relId), {
                status: 'accepted'
            });
        });
    });

    // Reddet / İptal
    document.querySelectorAll('.btn-reject-req').forEach(btn => {
        btn.addEventListener('click', async function () {
            const relId = this.getAttribute('data-id');
            await deleteDoc(doc(db, "friendships", relId));
        });
    });

    // Çıkar
    document.querySelectorAll('.btn-remove-friend').forEach(btn => {
        btn.addEventListener('click', async function () {
            if (confirm("Bu kişiyi arkadaş listenizden çıkarmak istediğinize emin misiniz?")) {
                const relId = this.getAttribute('data-id');
                await deleteDoc(doc(db, "friendships", relId));
            }
        });
    });
}

// CHAT ENGINE SETTINGS
let activeChatUnsubscribe = null;
let activeChatStatusUnsubscribe = null;
let currentChatFriendId = null;

// Global as soon as possible
window.openChatWindow = function (friendId, friendName) {
    console.log("🚀 Sohbet açılıyor:", friendId, friendName);
    const widget = document.getElementById('chat-widget-container');
    const nameEl = document.getElementById('chat-friend-name');
    const avatarEl = document.getElementById('chat-friend-avatar');
    const statusEl = document.getElementById('chat-status');

    if (!widget || !nameEl || !avatarEl) {
        console.error("❌ Sohbet bileşenleri bulunamadı!");
        return;
    }

    currentChatFriendId = friendId;
    nameEl.textContent = friendName;
    avatarEl.textContent = (friendName || "?").charAt(0).toUpperCase();

    // Durum dinleyiciyi başlat
    if (activeChatStatusUnsubscribe) activeChatStatusUnsubscribe();
    const db = window.firestore;
    activeChatStatusUnsubscribe = onSnapshot(doc(db, "users_public", friendId), (snap) => {
        if (snap.exists() && statusEl) {
            const userData = snap.data();
            const isOnline = userData.onlineStatus === 'online';

            // 5dk kontrolü
            let reallyOnline = isOnline;
            if (isOnline && userData.lastSeen) {
                const lastSeen = userData.lastSeen.toDate();
                if ((new Date() - lastSeen) > 5 * 60 * 1000) reallyOnline = false;
            }

            statusEl.textContent = reallyOnline ? 'Çevrimiçi' : 'Çevrimdışı';
            statusEl.style.opacity = reallyOnline ? '1' : '0.6';
        }
    });

    widget.classList.remove('hide');
    // Force reflow
    void widget.offsetWidth;
    widget.classList.add('active');

    // Mesajları dinle
    listenForMessages(friendId);

    // Olayları bağla
    document.getElementById('close-chat-btn').onclick = closeChatWindow;
    document.getElementById('send-chat-btn').onclick = handleSendMessage;
    document.getElementById('chat-input').onkeypress = (e) => {
        if (e.key === 'Enter') handleSendMessage();
    };
}

window.closeChatWindow = closeChatWindow;
window.handleSendMessage = handleSendMessage;

function closeChatWindow() {
    const widget = document.getElementById('chat-widget-container');
    widget.classList.remove('active');
    setTimeout(() => widget.classList.add('hide'), 300);

    if (activeChatUnsubscribe) {
        activeChatUnsubscribe();
        activeChatUnsubscribe = null;
    }
    if (activeChatStatusUnsubscribe) {
        activeChatStatusUnsubscribe();
        activeChatStatusUnsubscribe = null;
    }
    currentChatFriendId = null;
}

// GÜVENLİK BOTU - KÜFÜR VE HAKARET FİLTRESİ
function checkProfanity(text) {
    if (!text) return false;

    // Kapsamlı küfür/hakaret listesi (Turkish & English)
    // Not: Bu liste daha da genişletilebilir ancak temel koruma sağlar.
    const badWords = [
        "amk", "aq", "orospu", "piç", "siktir", "sik", "ananı", "avradını", "got", "göt", "yavşak",
        "amına", "pezevenk", "kahpe", "bok", "dalyarak", "gerizekalı", "aptal", "salak", "fuck",
        "shit", "bitch", "asshole", "pussy", "dick", "cunt", "faggot", "bastard"
    ];

    // Temizlik: Noktalama işaretlerini ve boşlukları kaldırıp küçük harfe çevirelim
    // semboller yerine harf koyanları da yakalamaya çalışalım
    const cleanText = text.toLowerCase()
        .replace(/[0-9]/g, '')
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .replace(/\s+/g, '');

    // Harf değişimlerini yakalamak için (a=@, s=5 vb.)
    const normalizedText = cleanText
        .replace(/@/g, 'a')
        .replace(/0/g, 'o')
        .replace(/1/g, 'i')
        .replace(/3/g, 'e')
        .replace(/4/g, 'a')
        .replace(/5/g, 's')
        .replace(/7/g, 't')
        .replace(/!/g, 'i');

    for (const word of badWords) {
        if (normalizedText.includes(word)) return true;
        // Orijinal kelime içinde parça olarak var mı? (Geniş eşleşme)
        if (cleanText.includes(word)) return true;
    }

    return false;
}

async function handleSendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !currentChatFriendId) return;

    // GÜVENLİK BOTU KONTROLÜ
    if (checkProfanity(text)) {
        if (window.Swal) {
            Swal.fire({
                icon: 'error',
                title: 'Güvenlik Botu!',
                text: 'Mesajınız uygunsuz içerik barındırdığı için engellendi. Uygulama kurallarına uymaya özen gösterin.',
                confirmButtonColor: 'var(--primary-color)'
            });
        } else {
            alert('Güvenlik Botu: Mesajınız uygunsuz içerik barındırdığı için engellendi.');
        }
        input.value = '';
        return;
    }

    const currentUser = window.firebaseAuth?.currentUser || window.currentUser;
    const db = window.firestore;

    const chatId = [currentUser.uid, currentChatFriendId].sort().join('_');
    const messagesRef = collection(db, "chats", chatId, "messages");

    input.value = '';

    try {
        await addDoc(messagesRef, {
            senderId: currentUser.uid,
            senderName: currentUser.displayName || 'İsimsiz',
            text: text,
            timestamp: Timestamp.now()
        });

        // Dostluk dökümanını güncelle (Bildirim motoru için)
        const friendshipRef = doc(db, "friendships", chatId);
        await updateDoc(friendshipRef, {
            lastMessage: text,
            lastMessageSenderId: currentUser.uid,
            lastMessageTimestamp: Timestamp.now(),
            ['unread_' + currentChatFriendId]: true // Alıcı için okunmadı işaretle
        });

    } catch (err) {
        console.error("Mesaj gönderilemedi:", err);
    }
}

function listenForMessages(friendId) {
    const currentUser = window.firebaseAuth?.currentUser || window.currentUser;
    const db = window.firestore;
    const chatId = [currentUser.uid, friendId].sort().join('_');
    const messagesRef = collection(db, "chats", chatId, "messages");

    const q = query(messagesRef, orderBy("timestamp", "asc"));

    if (activeChatUnsubscribe) activeChatUnsubscribe();

    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = '<p style="text-align:center; font-size:12px; color:var(--text-muted);">Sohbet başlatıldı</p>';

    activeChatUnsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const data = change.doc.data();
                const isSent = data.senderId === currentUser.uid;

                const msgDiv = document.createElement('div');
                msgDiv.className = `chat-msg ${isSent ? 'sent' : 'received'}`;

                const time = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';

                msgDiv.innerHTML = `
                    <div>${data.text}</div>
                    <span class="msg-time">${time}</span>
                `;

                messagesContainer.appendChild(msgDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        });
    });
}


// Global olarak public profile açma metodunu sızdır (Leaderboard veya Arkadaşlar listesi için)
// GLOBAL BİLDİRİM MOTORU
let globalChatUnsubscribe = null;

window.setupGlobalChatListener = function () {
    const currentUser = window.firebaseAuth?.currentUser || window.currentUser;
    if (!currentUser || currentUser.isGuest) return;

    const db = window.firestore;
    const q = query(
        collection(db, "friendships"),
        where("users", "array-contains", currentUser.uid),
        where("status", "==", "accepted")
    );

    if (globalChatUnsubscribe) globalChatUnsubscribe();

    globalChatUnsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
                const data = change.doc.data();

                // Eğer son mesajı ben göndermediysem ve sohbet şu an açık değilse bildir
                const isIncoming = data.lastMessageSenderId !== currentUser.uid;
                const isChatActive = window.currentChatFriendId === data.lastMessageSenderId; // Yanlış mantık olabilir, friendId bulmalıyız

                // Göndereni bul (ben olmayan kullanıcı)
                const senderId = data.users.find(id => id !== currentUser.uid);
                const isCurrentlyChatting = currentChatFriendId === senderId && document.getElementById('chat-widget-container').classList.contains('active');

                if (isIncoming && !isCurrentlyChatting && data['unread_' + currentUser.uid]) {
                    showGlobalNotification(data.senderName || data.receiverName || "Arkadaş", data.lastMessage, senderId);
                }
            }
        });
    });
};

function showGlobalNotification(name, text, uid) {
    const bubble = document.getElementById('message-notification-bubble');
    const bName = document.getElementById('bubble-name');
    const bText = document.getElementById('bubble-text');
    const bAvatar = document.getElementById('bubble-avatar');

    if (!bubble) return;

    bName.textContent = name;
    bText.textContent = text;
    bAvatar.textContent = name.charAt(0).toUpperCase();

    // Dataset ayarla (tıklayınca doğru kişiyi açsın)
    bubble.dataset.uid = uid;
    bubble.dataset.name = name;

    bubble.classList.replace('hide-bubble', 'show-bubble');

    // 5 saniye sonra gizle
    setTimeout(() => {
        bubble.classList.replace('show-bubble', 'hide-bubble');
    }, 5000);
}

// Global dökümandaki okunmadı bilgisini temizle
async function markAsRead(friendId) {
    const currentUser = window.firebaseAuth?.currentUser || window.currentUser;
    const db = window.firestore;
    const chatId = [currentUser.uid, friendId].sort().join('_');
    const friendshipRef = doc(db, "friendships", chatId);

    try {
        await updateDoc(friendshipRef, {
            ['unread_' + currentUser.uid]: false
        });
    } catch (e) { }
}

// openChatWindow içine temizleme ekleyelim
const originalOpenChat = window.openChatWindow;
window.openChatWindow = function (id, name) {
    markAsRead(id);
    if (originalOpenChat) originalOpenChat(id, name);
};


// Initialize global listener
window.addEventListener('load', () => {
    // Oturumun hazır olmasını beklemek için app.js setupVerificationScreen sonrası veya onAuthStateChanged sonrası daha iyi
});
