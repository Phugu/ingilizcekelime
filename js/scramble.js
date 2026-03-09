import { doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Initialize Firebase references from global scope (set by firebase-init.js)
const db = window.firestore;
const auth = window.firebaseAuth;

// Game State
let currentWord = null;
let currentScore = 0;
let userGuess = [];
let availableLetters = [];
let allWordsCache = [];
let isProcessing = false;

// Element References
const modal = document.getElementById('word-scramble-modal');
const hintEl = document.getElementById('scramble-hint');
const answerSlotsEl = document.getElementById('scramble-answer-slots');
const lettersEl = document.getElementById('scramble-letters');
const scoreEl = document.getElementById('scramble-score-val');
const feedbackEl = document.getElementById('scramble-feedback');

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
window.openWordScramble = async function() {
    if (!auth.currentUser && localStorage.getItem('isGuest') !== 'true') return;
    
    // Yükleme ekranı (opsiyonel gösterge)
    if(hintEl) hintEl.textContent = "Kelimeler yükleniyor...";
    if(modal) modal.classList.remove('hide');
    userGuess = [];
    currentScore = 0;
    if(scoreEl) scoreEl.textContent = currentScore;
    if(feedbackEl) {
        feedbackEl.textContent = "";
        feedbackEl.className = "scramble-feedback";
    }
    isProcessing = false;
    
    // Eğer Element Referansları henüz alınmadıysa (veya DOM'da sonradan oluştuysa)
    if (!hintEl || !answerSlotsEl || !lettersEl || !scoreEl || !feedbackEl) {
        Object.assign(window, {
            modal: document.getElementById('word-scramble-modal'),
            hintEl: document.getElementById('scramble-hint'),
            answerSlotsEl: document.getElementById('scramble-answer-slots'),
            lettersEl: document.getElementById('scramble-letters'),
            scoreEl: document.getElementById('scramble-score-val'),
            feedbackEl: document.getElementById('scramble-feedback')
        });
    }

    await loadWords();
    nextWord();
};

window.closeWordScramble = function() {
    const modal = document.getElementById('word-scramble-modal');
    if(modal) modal.classList.add('hide');
};

async function loadWords() {
    try {
        if (allWordsCache.length === 0) {
            // Import from current data logic dynamically
            const module = await import('./oxford_words_updated.js');
            allWordsCache = module.oxford_words;
        }
    } catch (e) {
        console.error("Kelime yüklerken hata:", e);
        const hintEl = document.getElementById('scramble-hint');
        if(hintEl) hintEl.textContent = "Hata oluştu, tekrar deneyin.";
    }
}

function nextWord() {
    if(allWordsCache.length === 0) return;
    
    // Sadece uygun uzunluktaki kelimeleri seçebiliriz (ör. 3 ile 10 harf arası)
    const validWords = allWordsCache.filter(w => {
        const len = w.english.replace(/[^a-zA-Z]/g, '').length;
        return len >= 3 && len <= 12;
    });

    if(validWords.length === 0) return;

    // Pick random word
    const randomIndex = Math.floor(Math.random() * validWords.length);
    currentWord = validWords[randomIndex];
    
    // Reset state
    userGuess = [];
    
    // Remove spaces or skip multi words if possible
    const cleanWord = currentWord.english.toLowerCase().replace(/[^a-z]/g, '');
    let charArray = cleanWord.split('');
    
    // Scramble it (make sure it's actually different)
    availableLetters = shuffleArray(charArray);
    let attempts = 0;
    while(availableLetters.join('') === cleanWord && attempts < 5) {
        availableLetters = shuffleArray(charArray);
        attempts++;
    }
    
    // Generate UI
    updateHintText(false);
    renderSlots(cleanWord.length);
    renderLetters();
    
    const feedbackEl = document.getElementById('scramble-feedback');
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
            
            // Firebase XP güncelleme (+10 XP)
            await awardXP(10);
            
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

async function awardXP(amount) {
    if (!auth.currentUser || localStorage.getItem('isGuest') === 'true') return;
    try {
        const publicRef = doc(db, "users_public", auth.currentUser.uid);
        await updateDoc(publicRef, {
            xp: increment(amount),
            total_xp: increment(amount)
        });
        
        if (typeof showXPNotification === 'function') {
            showXPNotification(`+${amount} XP Word Scramble!`, true);
        }

        // Window Dashboard Update
        if(window.updateDashboard) {
            window.updateDashboard();
        }
    } catch (e) {
        console.error("XP kazandırılırken hata:", e);
    }
}

// Window actions
window.clearScramble = function() {
    if(isProcessing || !currentWord) return;
    userGuess = [];
    const cleanWord = currentWord.english.toLowerCase().replace(/[^a-z]/g, '');
    renderSlots(cleanWord.length);
    renderLetters(); // Re-render letters completely will unhide them
    const feedbackEl = document.getElementById('scramble-feedback');
    if(feedbackEl) feedbackEl.textContent = "";
};

window.showScrambleHint = function() {
    if(isProcessing || !currentWord) return;
    updateHintText(true);
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
