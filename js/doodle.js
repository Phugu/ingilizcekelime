import { doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- State Variables ---
let canvas, ctx;
let gameLoopId;
let isPlaying = false;
let isGameOver = false;
let score = 0;
let cameraY = 0;
let platforms = [];
let particles = [];
let keys = { ArrowLeft: false, ArrowRight: false, a: false, d: false };
let touchX = null; // For mobile controls

let lastTouchTime = 0; // For double tap detection

// Player Physics
const GRAVITY = 0.25; // Daha yumuşak yerçekimi
const JUMP_FORCE = -8; // Daha kontrollü zıplama
const EXTRA_JUMP_FORCE = -11; // Çift zıplama gücü
const MAX_FALL_SPEED = 10;

// Player Object
const player = {
    x: 0,
    y: 0,
    width: 48, // Daha büyük ve belirgin
    height: 48,
    vx: 0,
    vy: 0,
    speed: 0.5, // Hızlanma miktarı (Acceleration)
    maxSpeed: 6, // Maksimum yatay hız
    friction: 0.85, // Sürtünme (1 = kaygan, 0 = anında durur - orijinal gibi hafif kaygan)
    scaleX: 1,
    scaleY: 1,
    canDoubleJump: false, // Çift zıplama hakkı
    img: new Image()
};

// Layout Constants
const PLATFORM_WIDTH = 60;
const PLATFORM_HEIGHT = 10;
const CANVAS_ASPECT = 3/4; // Responsive aspect ratio

// Initialize Game (Called from app.js / index.html)
window.openDoodleJump = function() {
    const modal = document.getElementById('doodle-modal');
    if (!modal) return;
    
    // Auth Check
    const auth = window.firebaseAuth;
    if (!auth || (!auth.currentUser && localStorage.getItem('isGuest') !== 'true')) {
        console.warn("Auth not ready or user not logged in");
        return;
    }

    modal.classList.remove('hide');
    
    // Hide UI overlays
    document.getElementById('doodle-start-overlay').style.display = 'flex';
    document.getElementById('doodle-gameover-overlay').style.display = 'none';
    
    // Wait for DOM layout to update before fetching dimensions
    setTimeout(() => {
        initCanvas();
        loadAssets();
        
        // Auto start menu rendering (not active game yet)
        isPlaying = false;
        isGameOver = false;
        renderMenuState();
    }, 50);
};

window.closeDoodleJump = function() {
    const modal = document.getElementById('doodle-modal');
    if (modal) modal.classList.add('hide');
    stopGame();
};

function initCanvas() {
    canvas = document.getElementById('doodleCanvas');
    ctx = canvas.getContext('2d');
    
    // Make canvas responsive based on container
    const container = document.getElementById('doodle-container');
    const rect = container.getBoundingClientRect();
    
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    setupInputHandlers();
}

function loadAssets() {
    // Profil resmini değil, GÖNDERİLEN ORİJİNAL KARAKTERİ kullan (Kullanıcı talebi)
    player.img.src = 'img/doodle-char.png'; 
}

// --- Input Handling (PC & Mobile) ---
function setupInputHandlers() {
    // Avoid multiple listeners
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Mobile / Touch Controls
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
}

function handleKeyDown(e) {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
}

function handleKeyUp(e) {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
}

function handleTouchStart(e) {
    if(!isPlaying) return;
    e.preventDefault();
    
    // Mobil için ekranın sağına/soluna dokunma kontrolü
    const rect = canvas.getBoundingClientRect();
    const touchXPos = e.touches[0].clientX - rect.left;
    const isRightSide = touchXPos > rect.width / 2;
    
    if (isRightSide) {
        keys.ArrowRight = true;
        keys.ArrowLeft = false;
    } else {
        keys.ArrowLeft = true;
        keys.ArrowRight = false;
    }
    
    // Double tap detection for Extra Jump
    const now = Date.now();
    if (now - lastTouchTime < 300) {
        // Çift tıklandı
        if (player.canDoubleJump) {
            player.vy = EXTRA_JUMP_FORCE;
            player.canDoubleJump = false; // Bir kez kullanılabilir
            createParticles(player.x + player.width/2, player.y + player.height);
        }
    }
    lastTouchTime = now;
}

function handleTouchMove(e) {
    if(!isPlaying) return;
    e.preventDefault();
    // Hareket ettirirken parmağın konumuna göre yönü değiştirme de yapılabilir ama tap mantığı daha iyi olur.
    // İsteğe bağlı eklenebilir. Şu an dokunma yönüne sadık kalıyoruz.
}

function handleTouchEnd(e) {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
}

// --- Game Control ---
window.startDoodleGame = function() {
    document.getElementById('doodle-start-overlay').style.display = 'none';
    document.getElementById('doodle-gameover-overlay').style.display = 'none';
    
    // Reset Game State
    score = 0;
    cameraY = 0;
    platforms = [];
    particles = [];
    
    document.getElementById('doodle-score').textContent = score;

    // Center player at bottom
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 100;
    player.vy = JUMP_FORCE; // Initial jump
    player.vx = 0;
    player.scaleX = 1;
    player.scaleY = 1;

    // Initial Platforms
    generateInitialPlatforms();

    isPlaying = true;
    isGameOver = false;
    
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoop();
};

function stopGame() {
    isPlaying = false;
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
}

// --- Generation & Physics ---
function generateInitialPlatforms() {
    // Generate platforms up to canvas height
    platforms.push({ x: player.x, y: player.y + player.height, width: PLATFORM_WIDTH, type: 'normal' });
    
    for (let i = 1; i < 7; i++) {
        addPlatform(canvas.height - i * 80);
    }
}

function addPlatform(yPos) {
    // Platformların çok uzağa spawn olmasını önle (önceki platformun X pozisyonuna göre limit koy)
    let xPos;
    if (platforms.length > 0) {
        const lastP = platforms[platforms.length - 1];
        const maxDist = 180; // Maksimum yatay mesafe
        const minX = Math.max(0, lastP.x - maxDist);
        const maxX = Math.min(canvas.width - PLATFORM_WIDTH, lastP.x + maxDist);
        xPos = minX + Math.random() * (maxX - minX);
    } else {
        xPos = Math.random() * (canvas.width - PLATFORM_WIDTH);
    }

    // 10% chance for a moving platform, 10% chance for broken (one-time jump)
    let pType = 'normal';
    const rand = Math.random();
    if(rand > 0.9) pType = 'moving';
    else if(rand > 0.8) pType = 'broken';

    platforms.push({
        x: xPos,
        y: yPos,
        width: PLATFORM_WIDTH,
        type: pType,
        direction: Math.random() > 0.5 ? 1 : -1 // For moving platforms
    });
}

function updatePhysics() {
    // Squash & Stretch decay (Esneme efekti azalarak bitmeli)
    player.scaleX += (1 - player.scaleX) * 0.15;
    player.scaleY += (1 - player.scaleY) * 0.15;

    // Extra Jump Trigger (PC Klavye Boşluk/Üst Yön Tuşu)
    if ((keys.ArrowUp || keys.w || keys[' ']) && player.canDoubleJump) {
         player.vy = EXTRA_JUMP_FORCE;
         player.canDoubleJump = false;
         keys.ArrowUp = false; // Bir defa saysın diye
         keys.w = false;
         keys[' '] = false;
         createParticles(player.x + player.width/2, player.y + player.height);
    }

    // Horizontal Movement (Acceleration tabanlı)
    if (keys.ArrowLeft || keys.a) {
        player.vx -= player.speed; // Sola ivmelenme
    } else if (keys.ArrowRight || keys.d) {
        player.vx += player.speed; // Sağa ivmelenme
    }

    // Sürtünme - tuşa basılmasa da yavaş yavaş kayarak durmasını sağlar
    player.vx *= player.friction; 

    // Maksimum hızı sınırla
    if (player.vx > player.maxSpeed) player.vx = player.maxSpeed;
    if (player.vx < -player.maxSpeed) player.vx = -player.maxSpeed;

    // Apply X Velocity
    player.x += player.vx;

    // Screen wrap
    if (player.x + player.width < 0) player.x = canvas.width;
    else if (player.x > canvas.width) player.x = -player.width;

    // Apply Gravity
    player.vy += GRAVITY;
    if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;
    player.y += player.vy;

    // Collision Detection (Only when falling)
    if (player.vy > 0) {
        for (let i = 0; i < platforms.length; i++) {
            let p = platforms[i];
            
            // Allow clipping through bottoms. Only solid on top.
            if (player.x < p.x + p.width &&
                player.x + player.width > p.x &&
                player.y + player.height > p.y &&
                player.y + player.height < p.y + PLATFORM_HEIGHT + player.vy) {
                
                // BOING! Yere çarpma
                player.vy = JUMP_FORCE;
                player.canDoubleJump = true; // Zıplama hakkı yenilendi
                player.scaleX = 0.7; // Squash (Yatay basık)
                player.scaleY = 1.4; // Stretch (Dikey uzun)
                createParticles(player.x + player.width/2, p.y);
                
                if (p.type === 'broken') {
                    platforms.splice(i, 1);
                    i--;
                }
                break; // Only bounce once per frame
            }
        }
    }

    // Camera follow (Scroll up)
    if (player.y < canvas.height / 2) {
        const diff = (canvas.height / 2) - player.y;
        player.y += diff;
        cameraY += diff;
        
        // Increase Score based on altitude
        const newScore = Math.floor(cameraY / 10);
        if (newScore > score) {
            score = newScore;
            document.getElementById('doodle-score').textContent = score;
        }

        // Move platforms down
        platforms.forEach(p => { p.y += diff; });
    }

    // Remove old platforms and generate new ones
    for (let i = platforms.length - 1; i >= 0; i--) {
        if (platforms[i].y > canvas.height) {
            platforms.splice(i, 1);
            // Generate a new platform above the screen
            const highestY = Math.min(...platforms.map(p => p.y));
            // Adaptive spacing based on score, but keep it reachable
            const spacing = 50 + Math.min(score / 50, 30); // Daha güvenli platform aralığı
            addPlatform(highestY - spacing);
        }
    }

    // Update moving platforms
    platforms.forEach(p => {
        if (p.type === 'moving') {
            p.x += p.direction * 1.5;
            if (p.x < 0 || p.x + p.width > canvas.width) {
                p.direction *= -1; // Reverse
            }
        }
    });

    // Game Over condition
    if (player.y > canvas.height) {
        gameOver();
    }
}

// --- Rendering ---
function drawPlayer() {
    ctx.save();
    
    // Scale and Translate from center for squash/stretch effect
    ctx.translate(player.x + player.width/2, player.y + player.height/2);
    ctx.scale(player.scaleX, player.scaleY);
    
    // Drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    
    // Circle Path for clipping
    ctx.beginPath();
    ctx.arc(0, 0, player.width/2, 0, Math.PI * 2);
    ctx.closePath();
    
    // Fill white background in case transparent
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.clip(); // Clip everything inside
    ctx.shadowColor = 'transparent'; // Turn off shadow for image drawing
    
    if (player.img.complete && player.img.naturalHeight !== 0) {
        ctx.drawImage(player.img, -player.width/2, -player.height/2, player.width, player.height);
    } else {
        // Fallback drawing if image not loaded
        ctx.fillStyle = '#fdcb6e';
        ctx.fillRect(-player.width/2, -player.height/2, player.width, player.height);
    }
    
    ctx.restore();
    
    // Draw the aesthetic Border ring and shine overlay (unclipped)
    ctx.save();
    ctx.translate(player.x + player.width/2, player.y + player.height/2);
    ctx.scale(player.scaleX, player.scaleY);
    
    ctx.beginPath();
    ctx.arc(0, 0, player.width/2, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffeaa7';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Cute top-left shine reflection
    ctx.beginPath();
    ctx.arc(-player.width/4, -player.height/4, player.width/5, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();
    
    ctx.restore();
}

function drawPlatforms() {
    platforms.forEach(p => {
        // Drop Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.roundRect(p.x + 4, p.y + 6, p.width, PLATFORM_HEIGHT, 7);
        ctx.fill();
        
        // Base Platform
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, PLATFORM_HEIGHT, 7);
        
        let grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + PLATFORM_HEIGHT);
        if (p.type === 'normal') {
            grad.addColorStop(0, '#55efc4');
            grad.addColorStop(1, '#00b894');
        } else if (p.type === 'moving') {
            grad.addColorStop(0, '#74b9ff');
            grad.addColorStop(1, '#0984e3');
        } else if (p.type === 'broken') {
            grad.addColorStop(0, '#ff7675');
            grad.addColorStop(1, '#d63031');
        }
        
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.closePath();
        
        // Top Highlight for a 3D Glossy look
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.roundRect(p.x + 2, p.y + 2, p.width - 4, PLATFORM_HEIGHT / 2.5, 4);
        ctx.fill();
        
        if (p.type === 'broken') {
            // Draw a crack pattern
            ctx.beginPath();
            ctx.moveTo(p.x + p.width/2, p.y);
            ctx.lineTo(p.x + p.width/2 + 5, p.y + 5);
            ctx.lineTo(p.x + p.width/2 - 2, p.y + PLATFORM_HEIGHT);
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}

function createParticles(x, y) {
    for(let i=0; i<8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: Math.random() * -5 - 1,
            life: 1,
            color: ['#ffeaa7', '#55efc4', '#74b9ff', '#ffffff'][Math.floor(Math.random()*4)],
            size: Math.random() * 4 + 2
        });
    }
}

function updateAndDrawParticles() {
    for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Add gravity to particles
        p.life -= 0.03;
        
        if(p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1; // reset
}

function renderMapBackground() {
    // Premium Space / Night Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1B1464'); // Deep purple/blue target high
    gradient.addColorStop(0.5, '#0652DD');
    gradient.addColorStop(1, '#12CBC4'); // Cyan at bottom
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Initialize background stars once
    if (!window.doodleStars) {
        window.doodleStars = Array.from({length: 40}, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2.5 + 0.5,
            alpha: Math.random()
        }));
    }
    
    // Parallax Stars
    ctx.fillStyle = '#ffffff';
    window.doodleStars.forEach(s => {
        // Move stars slightly when camera moves (parallax effect)
        s.y += (cameraY % 50) * 0.015; 
        
        if (s.y > canvas.height) {
            s.y = 0;
            s.x = Math.random() * canvas.width;
        }
        
        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
        ctx.fill();
    });
    ctx.globalAlpha = 1; // reset alpha
}

function gameLoop() {
    if (!isPlaying) return;
    
    // 1. Update Physics / Logic
    updatePhysics();
    
    // 2. Clear Screen & Draw Back
    renderMapBackground();
    
    // 3. Draw Game Objects
    drawPlatforms();
    updateAndDrawParticles();
    drawPlayer();

    // Loop
    gameLoopId = requestAnimationFrame(gameLoop);
}

function renderMenuState() {
    // Just draw a static background if not playing to avoid empty black modal
    ctx.fillStyle = '#74b9ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// --- Game Over Logic ---
async function gameOver() {
    isPlaying = false;
    isGameOver = true;
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    
    document.getElementById('doodle-gameover-overlay').style.display = 'flex';
    document.getElementById('doodle-final-score').textContent = score;
    
    // Reward XP based on score (e.g. 1 XP per 100 points)
    const earnedXp = Math.floor(score / 50); // Be a bit generous
    const earnedXpEl = document.getElementById('doodle-earned-xp');
    
    if (earnedXp > 0) {
        earnedXpEl.textContent = `+${earnedXp} XP Kazandın!`;
        earnedXpEl.style.display = 'block';
        
        // Distribute to Firebase
        try {
            const db = window.firestore;
            const auth = window.firebaseAuth;
            if (auth.currentUser && localStorage.getItem('isGuest') !== 'true') {
                 const publicRef = doc(db, "users_public", auth.currentUser.uid);
                 await updateDoc(publicRef, {
                     xp: increment(earnedXp),
                     total_xp: increment(earnedXp)
                 });
                 if (window.updateDashboard) window.updateDashboard();
            }
        } catch(e) { console.error("Doodle XP error:", e); }
    } else {
        earnedXpEl.style.display = 'none';
    }
}
