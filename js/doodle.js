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

// Player Physics
const GRAVITY = 0.4;
const JUMP_FORCE = -10;
const MAX_FALL_SPEED = 12;

// Player Object
const player = {
    x: 0,
    y: 0,
    width: 40,
    height: 40,
    vx: 0,
    vy: 0,
    speed: 5,
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
    document.getElementById('doodle-start-overlay').classList.remove('hide');
    document.getElementById('doodle-gameover-overlay').classList.add('hide');
    
    initCanvas();
    loadAssets();
    
    // Auto start menu rendering (not active game yet)
    isPlaying = false;
    isGameOver = false;
    renderMenuState();
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
    // Profil resmini veya varsayılan doodle karakterini yükle
    const auth = window.firebaseAuth;
    if (auth && auth.currentUser && auth.currentUser.photoURL) {
         player.img.src = auth.currentUser.photoURL;
    } else {
         player.img.src = 'img/doodle-char.png'; 
    }
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
    touchX = e.touches[0].clientX;
}

function handleTouchMove(e) {
    if(!isPlaying) return;
    e.preventDefault();
    touchX = e.touches[0].clientX;
}

function handleTouchEnd(e) {
    touchX = null;
    player.vx = 0;
}

// --- Game Control ---
window.startDoodleGame = function() {
    document.getElementById('doodle-start-overlay').classList.add('hide');
    document.getElementById('doodle-gameover-overlay').classList.add('hide');
    
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
    const xPos = Math.random() * (canvas.width - PLATFORM_WIDTH);
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
    // Horizontal Movement (PC)
    if (keys.ArrowLeft || keys.a) player.vx = -player.speed;
    else if (keys.ArrowRight || keys.d) player.vx = player.speed;
    else if (touchX === null) player.vx = 0; // Friction

    // Horizontal Movement (Mobile)
    if (touchX !== null) {
        const rect = canvas.getBoundingClientRect();
        const screenX = touchX - rect.left;
        const middleOffset = screenX - (rect.width / 2); // - to left, + to right
        
        // Analog feeling based on distance from center
        player.vx = (middleOffset / (rect.width / 2)) * (player.speed * 1.5);
        // Clamp speed
        if(player.vx > player.speed) player.vx = player.speed;
        if(player.vx < -player.speed) player.vx = -player.speed;
    }

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
                
                // BOING!
                player.vy = JUMP_FORCE;
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
            // Adaptive spacing based on score
            const spacing = 70 + Math.min(score / 50, 40); 
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
    
    // Draw Photo/Character
    ctx.beginPath();
    ctx.arc(player.x + player.width/2, player.y + player.height/2, player.width/2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    if (player.img.complete && player.img.naturalHeight !== 0) {
        ctx.drawImage(player.img, player.x, player.y, player.width, player.height);
    } else {
        // Fallback drawing if image not loaded
        ctx.fillStyle = 'var(--primary-color)';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
    
    ctx.restore();
    
    // Add border ring for aesthetics
    ctx.beginPath();
    ctx.arc(player.x + player.width/2, player.y + player.height/2, player.width/2, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
}

function drawPlatforms() {
    platforms.forEach(p => {
        ctx.beginPath();
        
        // Rounded corners
        ctx.roundRect(p.x, p.y, p.width, PLATFORM_HEIGHT, 5);
        
        if (p.type === 'normal') {
            ctx.fillStyle = '#2ecc71'; // Green
        } else if (p.type === 'moving') {
            ctx.fillStyle = '#3498db'; // Blue
        } else if (p.type === 'broken') {
            ctx.fillStyle = '#e74c3c'; // Red
            // Draw a crack
            ctx.moveTo(p.x + p.width/2, p.y);
            ctx.lineTo(p.x + p.width/2 + 5, p.y + 5);
            ctx.lineTo(p.x + p.width/2 - 2, p.y + PLATFORM_HEIGHT);
            ctx.strokeStyle = '#c0392b';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        ctx.fill();
        ctx.closePath();
    });
}

function createParticles(x, y) {
    for(let i=0; i<5; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * -2,
            life: 1,
            color: '#fff'
        });
    }
}

function updateAndDrawParticles() {
    for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        
        if(p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        
        ctx.fillStyle = `rgba(255,255,255,${p.life})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function renderMapBackground() {
    // Gradient Background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#74b9ff');
    gradient.addColorStop(1, '#0984e3');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw some grid lines for speed context
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    const scrollOffset = cameraY % 50;
    
    for(let i=0; i<canvas.width; i+=50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for(let i=-scrollOffset; i<canvas.height; i+=50) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }
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
    
    document.getElementById('doodle-gameover-overlay').classList.remove('hide');
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
