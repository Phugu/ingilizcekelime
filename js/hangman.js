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
        modal: document.getElementById('hangman-modal'),
        levelSelectionEl: document.getElementById('hangman-level-selection'),
        gameAreaEl: document.getElementById('hangman-game-area'),
        hintEl: document.getElementById('hangman-hint'),
        wordDisplayEl: document.getElementById('hangman-word-display'),
        keyboardEl: document.getElementById('hangman-keyboard'),
        drawingEl: document.getElementById('hangman-drawing'),
        scoreEl: document.getElementById('hangman-score-val'),
        livesEl: document.getElementById('hangman-lives-val'),
        feedbackEl: document.getElementById('hangman-feedback')
    };
}

// Game State
let currentWord = null;
let currentScore = 0;
let guessedLetters = [];
let remainingLives = 6;
let allWordsCache = [];
let filteredWordPool = [];
let selectedLevel = null;
let isProcessing = false;

// Main Window API Export
window.openHangman = async function() {
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
    remainingLives = 6;
    renderStats();
    isProcessing = false;
    
    await loadWords();
};

window.selectHangmanLevel = function(level) {
    selectedLevel = level;
    const { levelSelectionEl, gameAreaEl } = getElements();
    
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
    
    nextWord();
};

window.closeHangman = function() {
    const { modal } = getElements();
    if(modal) modal.classList.add('hide');
};

async function loadWords() {
    try {
        if (allWordsCache.length === 0) {
            const module = await import('./oxford_words_updated.js');
            const pools = module.oxfordPools;
            if (pools) {
                allWordsCache = Object.values(pools).flat();
            } else {
                console.error("oxfordPools bulunamadı");
            }
        }
    } catch (e) {
        console.error("Kelime yüklerken hata:", e);
    }
}

function nextWord() {
    if(filteredWordPool.length === 0) return;
    
    // Pick random word (filter for length)
    const playableWords = filteredWordPool.filter(w => {
        const len = w.english.replace(/[^a-zA-Z]/g, '').length;
        return len >= 3 && len <= 12;
    });

    if(playableWords.length === 0) playableWords.push(...filteredWordPool);

    const randomIndex = Math.floor(Math.random() * playableWords.length);
    currentWord = playableWords[randomIndex];
    
    // Reset word state
    guessedLetters = [];
    remainingLives = 6;
    isProcessing = false;
    
    renderGame();
    renderStats();
    drawHangman();
    
    const { feedbackEl } = getElements();
    if(feedbackEl) {
        feedbackEl.textContent = "";
        feedbackEl.className = "hangman-feedback";
    }
}

function renderStats() {
    const { scoreEl, livesEl } = getElements();
    if(scoreEl) scoreEl.textContent = currentScore;
    if(livesEl) livesEl.textContent = remainingLives;
}

function renderGame() {
    const { wordDisplayEl, keyboardEl, hintEl } = getElements();
    if(!currentWord) return;

    // Hint
    if(hintEl) hintEl.textContent = "Anlam: " + (currentWord.turkish || "Bilinmiyor");

    // Word Display
    if(wordDisplayEl) {
        const wordArr = currentWord.english.toLowerCase().split('');
        wordDisplayEl.innerHTML = wordArr.map(char => {
            if (char === ' ') return '<div class="hangman-space"></div>';
            if (/[^a-z]/.test(char)) return `<div class="hangman-char">${char}</div>`;
            const isGuessed = guessedLetters.includes(char);
            return `<div class="hangman-char">${isGuessed ? char : '_'}</div>`;
        }).join('');
    }

    // Keyboard
    if(keyboardEl) {
        keyboardEl.innerHTML = '';
        const alphabet = "abcdefghijklmnopqrstuvwxyz".split('');
        alphabet.forEach(char => {
            const btn = document.createElement('button');
            btn.className = 'hangman-key';
            btn.textContent = char.toUpperCase();
            if (guessedLetters.includes(char)) {
                btn.disabled = true;
                const isCorrect = currentWord.english.toLowerCase().includes(char);
                btn.classList.add(isCorrect ? 'correct' : 'wrong');
            }
            btn.onclick = () => makeGuess(char);
            keyboardEl.appendChild(btn);
        });
    }
}

async function makeGuess(char) {
    if (isProcessing || remainingLives <= 0 || guessedLetters.includes(char)) return;

    guessedLetters.push(char);
    const isCorrect = currentWord.english.toLowerCase().includes(char);

    if (!isCorrect) {
        remainingLives--;
        drawHangman();
    }

    renderGame();
    renderStats();

    // Check Win/Loss
    const cleanWord = currentWord.english.toLowerCase().replace(/[^a-z]/g, '');
    const isWon = cleanWord.split('').every(c => guessedLetters.includes(c));

    if (isWon) {
        handleWin();
    } else if (remainingLives <= 0) {
        handleLoss();
    }
}

async function handleWin() {
    isProcessing = true;
    const { feedbackEl } = getElements();
    if(feedbackEl) {
        feedbackEl.textContent = "Tebrikler! Doğru Bildiniz 🎉";
        feedbackEl.className = "hangman-feedback success";
    }

    if(window.confetti) {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }

    currentScore += 15; // Hangman is harder
    renderStats();
    await awardXP(15);

    setTimeout(() => {
        nextWord();
    }, 2000);
}

function handleLoss() {
    isProcessing = true;
    const { feedbackEl, wordDisplayEl } = getElements();
    if(feedbackEl) {
        feedbackEl.textContent = "Adam asıldı! Kelime: " + currentWord.english;
        feedbackEl.className = "hangman-feedback error";
    }

    // Reveal the word
    if(wordDisplayEl) {
        const wordArr = currentWord.english.toLowerCase().split('');
        wordDisplayEl.innerHTML = wordArr.map(char => {
            if (char === ' ') return '<div class="hangman-space"></div>';
            return `<div class="hangman-char revealed">${char}</div>`;
        }).join('');
    }

    setTimeout(() => {
        nextWord();
    }, 3000);
}

async function awardXP(amount) {
    const { db, auth } = getFirebase();
    if (!auth || !auth.currentUser || localStorage.getItem('isGuest') === 'true') return;
    try {
        const publicRef = doc(db, "users_public", auth.currentUser.uid);
        await updateDoc(publicRef, {
            xp: increment(amount),
            total_xp: increment(amount)
        });
        
        if (typeof showXPNotification === 'function') {
            showXPNotification(`+${amount} XP Adam Asmaca!`, true);
        }

        if(window.updateDashboard) window.updateDashboard();
    } catch (e) {
        console.error("XP kazandırılırken hata:", e);
    }
}

function drawHangman() {
    const { drawingEl } = getElements();
    if (!drawingEl) return;

    const isDark = document.body.classList.contains('dark-theme');
    const color = isDark ? '#ffffff' : '#2d3436';
    const strokeProps = `stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"`;
    
    // Use SVG for drawing
    const parts = [
        `<line x1="20" y1="220" x2="220" y2="220" ${strokeProps} />`, // Base
        `<line x1="60" y1="220" x2="60" y2="20" ${strokeProps} />`,  // Post
        `<line x1="60" y1="20" x2="160" y2="20" ${strokeProps} />`,   // Beam
        `<line x1="160" y1="20" x2="160" y2="50" stroke="${color}" stroke-width="3" stroke-linecap="round" />`, // Rope
        `<circle cx="160" cy="80" r="25" stroke="${color}" stroke-width="5" fill="none" />`, // Head
        `<line x1="160" y1="105" x2="160" y2="170" ${strokeProps} />`, // Body
        `<line x1="160" y1="120" x2="120" y2="150" ${strokeProps} />`,  // Left Arm
        `<line x1="160" y1="120" x2="200" y2="150" ${strokeProps} />`, // Right Arm
        `<line x1="160" y1="170" x2="130" y2="210" ${strokeProps} />`, // Left Leg
        `<line x1="160" y1="170" x2="190" y2="210" ${strokeProps} />` // Right Leg
    ];

    // Show parts based on remaining lives
    // Lives 6: Base, Post, Beam, Rope (index 0,1,2,3)
    // Lives 5: index 4 (Head)
    // Lives 4: index 5 (Body)
    // Lives 3: index 6 (L-Arm)
    // Lives 2: index 7 (R-Arm)
    // Lives 1: index 8 (L-Leg)
    // Lives 0: index 9 (R-Leg)
    
    let visibleParts = parts.slice(0, 4); // Always show scaffold
    if (remainingLives <= 5) visibleParts.push(parts[4]);
    if (remainingLives <= 4) visibleParts.push(parts[5]);
    if (remainingLives <= 3) visibleParts.push(parts[6]);
    if (remainingLives <= 2) visibleParts.push(parts[7]);
    if (remainingLives <= 1) visibleParts.push(parts[8]);
    if (remainingLives <= 0) visibleParts.push(parts[9]);

    drawingEl.innerHTML = `<svg width="240" height="240" viewBox="0 0 240 240">${visibleParts.join('')}</svg>`;
}

window.skipHangman = function() {
    if(isProcessing || !currentWord) return;
    nextWord();
};

// Keyboard support
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('hangman-modal');
    if (modal && !modal.classList.contains('hide') && !isProcessing && currentWord) {
        const key = e.key.toLowerCase();
        if (/^[a-z]$/.test(key)) {
            makeGuess(key);
        }
    }
});
