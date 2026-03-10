import { doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Initialize Firebase and DOM elements lazily
function getFirebase() {
    return {
        db: window.firestore,
        auth: window.firebaseAuth
    };
}

function getElements() {
    return {
        modal: document.getElementById('word-scramble-modal'),
        levelSelectionEl: document.getElementById('scramble-level-selection'),
        gameAreaEl: document.getElementById('scramble-game-area'),
        hintEl: document.getElementById('scramble-hint'),
        answerSlotsEl: document.getElementById('scramble-answer-slots'),
        lettersEl: document.getElementById('scramble-letters'),
        scoreEl: document.getElementById('scramble-score-val'),
        feedbackEl: document.getElementById('scramble-feedback')
    };
}

// Game State
let currentWord = null;
let currentScore = 0;
let userGuess = [];
let availableLetters = [];
let allWordsCache = [];
let filteredWordPool = [];
let selectedLevel = null;
let isProcessing = false;

// Utility: Shuffle an array
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Main Window API Export
// Main Window API Export
window.openWordScramble = async function() {
    const { auth } = getFirebase();
    const { modal, levelSelectionEl, gameAreaEl } = getElements();

    if (!auth || (!auth.currentUser && localStorage.getItem('isGuest') !== 'true')) {
        console.warn("Auth not ready or user not logged in");
        return;
    }
    
    if(modal) modal.classList.remove('hide');
    
    // Reset to Level Selection View
    if(levelSelectionEl) levelSelectionEl.classList.remove('hide');
    if(gameAreaEl) gameAreaEl.classList.add('hide');
    
    currentScore = 0;
    renderScore();
    isProcessing = false;
    
    await loadWords();
};

window.selectScrambleLevel = function(level) {
    selectedLevel = level;
    const { levelSelectionEl, gameAreaEl, hintEl } = getElements();
    
    // Filter words for the selected level
    filteredWordPool = allWordsCache.filter(w => w.level === selectedLevel);
    
    if (filteredWordPool.length === 0) {
        if(window.Swal) {
            Swal.fire({
                icon: 'info',
                title: 'Kelime Bulunamadı',
                text: `${selectedLevel} seviyesinde uygun kelime henüz sistemde yok.`,
                confirmButtonText: 'Tamam'
            });
        }
        return;
    }
    
    // Transition to game area
    if(levelSelectionEl) levelSelectionEl.classList.add('hide');
    if(gameAreaEl) gameAreaEl.classList.remove('hide');
    if(hintEl) hintEl.textContent = "Kelime hazırlanıyor...";
    
    nextWord();
};

function renderScore() {
    const { scoreEl } = getElements();
    if(scoreEl) scoreEl.textContent = currentScore;
}

window.closeWordScramble = function() {
    const { modal } = getElements();
    if(modal) modal.classList.add('hide');
};

async function loadWords() {
    try {
        if (allWordsCache.length === 0) {
            // Import from current data logic dynamically
            const module = await import('./oxford_words_updated.js');
            const pools = module.oxfordPools;
            if (pools) {
                // Flatten all pools into a single array
                allWordsCache = Object.values(pools).flat();
            } else {
                console.error("oxfordPools bulunamadı");
                const { hintEl } = getElements();
                if(hintEl) hintEl.textContent = "Kelime listesi yüklenemedi.";
            }
        }
    } catch (e) {
        console.error("Kelime yüklerken hata:", e);
        const { hintEl } = getElements();
        if(hintEl) hintEl.textContent = "Hata oluştu, tekrar deneyin.";
    }
}

function nextWord() {
    if(filteredWordPool.length === 0) return;
    
    // Filter by length for better gameplay (3-12 letters)
    const playableWords = filteredWordPool.filter(w => {
        const len = w.english.replace(/[^a-zA-Z]/g, '').length;
        return len >= 3 && len <= 12;
    });

    if(playableWords.length === 0) {
        playableWords.push(...filteredWordPool);
    }

    // Pick random word
    const randomIndex = Math.floor(Math.random() * playableWords.length);
    currentWord = playableWords[randomIndex];
    
    // Reset state
    userGuess = [];
    
    // Create clean version for game
    const cleanWord = currentWord.english.toLowerCase().replace(/[^a-z]/g, '');
    let charArray = cleanWord.split('');
    
    // Scramble it
    availableLetters = shuffleArray(charArray);
    let attempts = 0;
    while(availableLetters.join('') === cleanWord && attempts < 5 && cleanWord.length > 1) {
        availableLetters = shuffleArray(charArray);
        attempts++;
    }
    
    // Generate UI
    updateHintText(false);
    renderSlots(cleanWord.length);
    renderLetters();
    
    const { feedbackEl } = getElements();
    if(feedbackEl) {
        feedbackEl.textContent = "";
        feedbackEl.className = "scramble-feedback";
    }
}

function updateHintText(revealEnglish = false) {
    const hintEl = document.getElementById('scramble-hint');
    if(!hintEl) return;

    if (revealEnglish) {
        hintEl.textContent = "İngilizce: " + currentWord.english;
        return;
    }
    
    // Başlangıçta Türkçe
    const tr = currentWord.turkish || "Bilinmiyor";
    hintEl.textContent = "Anlam: " + tr;
}

function renderSlots(length) {
    const answerSlotsEl = document.getElementById('scramble-answer-slots');
    if(!answerSlotsEl) return;

    answerSlotsEl.innerHTML = '';
    for(let i = 0; i < length; i++) {
        const slot = document.createElement('div');
        slot.className = 'scramble-slot';
        
        // Eğer harf tahmin edildiyse
        if(userGuess[i]) {
            slot.textContent = userGuess[i].char;
            slot.classList.add('filled');
            
            // Allow un-picking by clicking the slot
            slot.onclick = () => {
                if(isProcessing) return;
                const letterObj = userGuess[i];
                userGuess.splice(i, 1); // Remove from guess
                
                // Unhide the original button
                const btn = document.getElementById(`scramble-btn-${letterObj.id}`);
                if(btn) btn.classList.remove('used');
                
                renderSlots(length); // Re-render this part
            };
        } else {
            slot.textContent = '';
        }
        
        answerSlotsEl.appendChild(slot);
    }
}

function renderLetters() {
    const lettersEl = document.getElementById('scramble-letters');
    if(!lettersEl) return;

    lettersEl.innerHTML = '';
    availableLetters.forEach((char, index) => {
        const btn = document.createElement('button');
        btn.className = 'scramble-letter-btn';
        btn.id = `scramble-btn-${index}`;
        btn.textContent = char;
        
        btn.onclick = () => {
            if(isProcessing) return;
            // Ekleme işlemi
            const cleanWord = currentWord.english.toLowerCase().replace(/[^a-z]/g, '');
            if(userGuess.length < cleanWord.length) {
                userGuess.push({ char: char, id: index });
                btn.classList.add('used');
                renderSlots(cleanWord.length);
                checkAnswer();
            }
        };
        
        lettersEl.appendChild(btn);
    });
}

async function checkAnswer() {
    const cleanWord = currentWord.english.toLowerCase().replace(/[^a-z]/g, '');
    const feedbackEl = document.getElementById('scramble-feedback');
    const scoreEl = document.getElementById('scramble-score-val');

    if(userGuess.length === cleanWord.length) {
        isProcessing = true;
        const guessStr = userGuess.map(obj => obj.char).join('');
        
        if(guessStr === cleanWord) {
            // Doğru Cevap
            if(feedbackEl) {
                feedbackEl.textContent = "Tebrikler! Doğru Bildiniz 🎉";
                feedbackEl.className = "scramble-feedback success";
            }
            
            // Konfeti
            if(window.confetti) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
            
            // Skor Artırma
            currentScore += 10;
            if(scoreEl) scoreEl.textContent = currentScore;
            
            // Firebase XP ve Scramble Skoru güncelleme (+10 XP)
            await awardXP(10, 10);
            
            setTimeout(() => {
                isProcessing = false;
                nextWord();
            }, 1500);
            
        } else {
            // Yanlış Cevap
            if(feedbackEl) {
                feedbackEl.textContent = "Hatalı, Tekrar Dene!";
                feedbackEl.className = "scramble-feedback error";
            }
            
            // Biraz sarsılma animasyonu süresi sonrasında feedback'i sil
            setTimeout(() => {
                if(feedbackEl) feedbackEl.className = "scramble-feedback";
                // Optionally clear slots automatically?
                // window.clearScramble();
                isProcessing = false;
            }, 1000);
        }
    }
}

async function awardXP(amount, scramblePoints = 0) {
    const { db, auth } = getFirebase();
    if (!auth || !auth.currentUser || localStorage.getItem('isGuest') === 'true') return;
    try {
        const publicRef = doc(db, "users_public", auth.currentUser.uid);
        const updates = {
            xp: increment(amount),
            total_xp: increment(amount)
        };
        
        if (scramblePoints > 0) {
            updates.scramble_score = increment(scramblePoints);
        }

        await updateDoc(publicRef, updates);
        
        if (typeof showXPNotification === 'function') {
            showXPNotification(`+${amount} XP Word Scramble!`, true);
        }

        // Window Dashboard Update
        if(window.updateDashboard) {
            window.updateDashboard();
        }
    } catch (e) {
        console.error("XP/Skor kazandırılırken hata:", e);
    }
}

// Window actions
window.clearScramble = function() {
    if(isProcessing || !currentWord) return;
    userGuess = [];
    const cleanWord = currentWord.english.toLowerCase().replace(/[^a-z]/g, '');
    renderSlots(cleanWord.length);
    renderLetters(); // Re-render letters completely will unhide them
    const { feedbackEl } = getElements();
    if(feedbackEl) feedbackEl.textContent = "";
};

window.showScrambleHint = function() {
    if(isProcessing || !currentWord) return;
    
    const cleanWord = currentWord.english.toLowerCase().replace(/[^a-z]/g, '');
    const currentPos = userGuess.length;
    
    if (currentPos >= cleanWord.length) return;

    // Maliyet Kontrolü
    if (currentScore < 5) {
        if(window.Swal) {
            Swal.fire({
                toast: true,
                position: 'top',
                icon: 'warning',
                title: 'Yetersiz Puan!',
                text: 'İpucu için en az 5 puanın olmalı.',
                showConfirmButton: false,
                timer: 2000
            });
        }
        return;
    }

    // Doğru harfi bul (cleanWord[currentPos])
    const targetChar = cleanWord[currentPos];
    
    // Alttaki harflerden bu harfi bul ve henüz kullanılmamış olanı seç
    let foundIndex = -1;
    for (let i = 0; i < availableLetters.length; i++) {
        const btn = document.getElementById(`scramble-btn-${i}`);
        if (availableLetters[i] === targetChar && btn && !btn.classList.contains('used')) {
            foundIndex = i;
            break;
        }
    }

    if (foundIndex !== -1) {
        // Puan düşür
        currentScore -= 5;
        renderScore();
        
        // Harfi "tıkla" (yerleştir)
        const targetBtn = document.getElementById(`scramble-btn-${foundIndex}`);
        if (targetBtn) targetBtn.click();
        
        // Opsiyonel: Anlamı da göster (isteğe bağlı ama kullanıcı "seçsin" dediği için asıl iş harf yerleştirmek)
        // updateHintText(true); 
    }
};

window.skipScramble = function() {
    if(isProcessing || !currentWord) return;
    nextWord();
};

// Klavye desteği
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('word-scramble-modal');
    if (modal && !modal.classList.contains('hide') && !isProcessing && currentWord) {
        const key = e.key.toLowerCase();
        
        if (/^[a-zıöçşğü]$/.test(key) && key.length === 1) { // Turkish or English letter
            // To be safe, ensure it only accepts standard a-z for the scramble game
            // If the game includes turkish characters, the regex should match them.
            // Since oxford words are english, a-z is enough.
        }

        if (/^[a-z]$/.test(key)) {
            // Find an available letter that matches
            const cleanWord = currentWord.english.toLowerCase().replace(/[^a-z]/g, '');
            if(userGuess.length >= cleanWord.length) return;
            
            // availableLetters index'lerinde iterate edelim
            for (let i = 0; i < availableLetters.length; i++) {
                const btn = document.getElementById(`scramble-btn-${i}`);
                if (availableLetters[i] === key && btn && !btn.classList.contains('used')) {
                    btn.click();
                    break;
                }
            }
        } 
        else if (key === 'backspace') {
            // Remove last guess
            if (userGuess.length > 0) {
                const lastObj = userGuess[userGuess.length - 1];
                userGuess.pop();
                
                const btn = document.getElementById(`scramble-btn-${lastObj.id}`);
                if (btn) btn.classList.remove('used');
                
                const cleanWord = currentWord.english.toLowerCase().replace(/[^a-z]/g, '');
                renderSlots(cleanWord.length);
            }
        } 
    }
});
