import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc, Timestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Global loading function for the UI
window.loadFriendsUI = function () {
    const container = document.getElementById('friends-content');
    if (!container) return;

    if (container.innerHTML === "") {
        // Build the basic structural UI
        container.innerHTML = `
            <div class="friends-wrapper" style="max-width: 800px; margin: 0 auto; padding: 20px;">
                <h1 style="color: var(--text-main); margin-bottom: 20px;">Arkadaşlar</h1>
                
                <!-- Arama Bölümü -->
                <div class="card" style="background: var(--card-bg); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 25px;">
                    <h2 style="color: var(--primary-color); font-size: 18px; margin-bottom: 15px;">Arkadaş Bul</h2>
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
                        <div style="color: var(--text-muted); font-size: 12px;">Seviye ${userData.level || 1} • ${userData.xp || 0} XP</div>
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
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px; background: var(--bg-color); border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="showPublicProfileModal('${friendId}')">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background-color: var(--primary-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">
                                ${friendName.charAt(0).toUpperCase()}
                            </div>
                            <div style="color: var(--text-main); font-weight: bold; font-size: 16px;">${friendName}</div>
                        </div>
                        <button class="btn btn-remove-friend" data-id="${relId}" style="background-color: var(--error-color); border-color: var(--error-color); padding: 8px 12px; font-size: 13px;">Çıkar</button>
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
                                <button class="btn btn-accept-req" data-id="${relId}" style="background-color: var(--success-color); border-color: var(--success-color); padding: 8px 12px; font-size: 13px;">Kabul Et</button>
                                <button class="btn btn-reject-req" data-id="${relId}" style="background-color: var(--error-color); border-color: var(--error-color); padding: 8px 12px; font-size: 13px;">Reddet</button>
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
        } else {
            friendsList.innerHTML = '<p style="color: var(--text-muted); font-size: 14px; text-align: center; padding: 20px 0;">Henüz arkadaş eklemediniz.</p>';
        }

        // Buton Dinleyicilerini Ekle
        attachActionListeners();
    }, (error) => {
        console.error("Arkadaşlar listesini dinleme hatası:", error);
    });
}

function attachActionListeners() {
    const db = window.firestore;

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

// Global olarak public profile açma metodunu sızdır (Leaderboard veya Arkadaşlar listesi için)
window.showPublicProfileModal = async function (userId) {
    if (typeof window._showPublicProfile === 'function') {
        // Zaten app.js'de tanimlanan ayni mantigi cagirabiliriz ama yoksa buradan manuel cagirmaliyiz.
        // Eger yoksa biz basitce profile modal'i gosteririz:
        const modal = document.getElementById('public-profile-modal');
        if (!modal) return;

        try {
            const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const db = window.firestore;
            const profileRef = doc(db, "users_public", userId);
            const docSnap = await getDoc(profileRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                document.getElementById('public-profile-name').textContent = data.name || 'İsimsiz';
                document.getElementById('public-profile-level').textContent = `Seviye ${data.level || 1}`;
                document.getElementById('public-profile-streak').textContent = data.streak || 0;
                document.getElementById('public-profile-xp').textContent = data.xp || 0;

                // Profil resmi veya baş harf
                const avatarEl = document.getElementById('public-profile-avatar');
                if (data.photoURL) {
                    avatarEl.style.backgroundImage = `url('${data.photoURL}')`;
                    avatarEl.textContent = '';
                } else {
                    avatarEl.style.backgroundImage = 'none';
                    avatarEl.textContent = (data.name || 'M').charAt(0).toUpperCase();
                }

                // Diger istatistikleri cekmek icin efor (sade kullanim icin simdilik gizli veya 0)
                document.getElementById('public-profile-quizzes').textContent = 'Gizli';
                document.getElementById('public-profile-words').textContent = 'Gizli';

                modal.classList.remove('hide');

                document.getElementById('close-public-profile-btn').onclick = () => {
                    modal.classList.add('hide');
                };
            }
        } catch (err) {
            console.error(err);
        }
    } else {
        window._showPublicProfile(userId);
    }
};
