// ===== Referências =====
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const hudScore = document.getElementById("score");
const hudLives = document.getElementById("lives");
const hudWave = document.getElementById("wave");

// ===== Dados dos inimigos (data-driven) =====
// Para criar um tipo novo, basta adicionar uma linha aqui.
// speedMul multiplica a velocidade base da onda.
const ENEMY_TYPES = {
    fast:  { w: 24, h: 24, hp: 1, speedMul: 1.5, points: 10, color: "#ff6b6b" },
    heavy: { w: 46, h: 34, hp: 2, speedMul: 0.6, points: 25, color: "#c77dff" }
};

// ===== Estado =====
const keys = {};
let ship, shots, enemies, sparks;
let score, lives, wave;
let toSpawn, spawnClock, bannerTime, hurtTime;
let mode = "playing";   // "playing" | "paused" | "over"
let lastTime = 0;

// ===== Utilidades =====
// Colisão retangular (AABB)
function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
}

// ===== Classes dos atores =====
class Ship {
    constructor() {
        this.w = 40;
        this.h = 44;
        this.x = W / 2 - this.w / 2;
        this.y = H - 70;
        this.speed = 300;
        this.cooldown = 0;
    }

    update(dt) {
        if (keys["arrowleft"] || keys["a"]) this.x -= this.speed * dt;
        if (keys["arrowright"] || keys["d"]) this.x += this.speed * dt;
        this.x = Math.max(6, Math.min(W - this.w - 6, this.x));

        this.cooldown -= dt;
        if (keys[" "] && this.cooldown <= 0) {
            shots.push(new Shot(this.x + this.w / 2 - 3, this.y - 10));
            this.cooldown = 0.22;   // tempo entre tiros, em segundos
        }
    }

    draw() {
        const cx = this.x + this.w / 2;
        const top = this.y;

        // chama do motor (muda de tamanho a cada frame)
        ctx.fillStyle = "#ff9f1c";
        ctx.beginPath();
        ctx.moveTo(cx - 6, top + 34);
        ctx.lineTo(cx, top + 46 + Math.random() * 6);
        ctx.lineTo(cx + 6, top + 34);
        ctx.fill();

        // asas
        ctx.fillStyle = "#2a9d8f";
        ctx.beginPath();
        ctx.moveTo(cx, top + 8);
        ctx.lineTo(this.x + this.w, top + 40);
        ctx.lineTo(cx, top + 32);
        ctx.lineTo(this.x, top + 40);
        ctx.closePath();
        ctx.fill();

        // fuselagem
        ctx.fillStyle = "#e9f5ef";
        ctx.beginPath();
        ctx.moveTo(cx, top);
        ctx.lineTo(cx + 9, top + 36);
        ctx.lineTo(cx - 9, top + 36);
        ctx.closePath();
        ctx.fill();

        // cabine
        ctx.fillStyle = "#264653";
        ctx.fillRect(cx - 3, top + 14, 6, 10);
    }
}

class Shot {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 6;
        this.h = 16;
        this.speed = 500;
        this.dead = false;
    }

    update(dt) {
        this.y -= this.speed * dt;
        if (this.y + this.h < 0) this.dead = true;
    }

    draw() {
        ctx.fillStyle = "#ffb703";
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
}

class Enemy {
    constructor(typeName, x, baseSpeed) {
        const t = ENEMY_TYPES[typeName];
        this.type = typeName;
        this.w = t.w;
        this.h = t.h;
        this.hp = t.hp;
        this.points = t.points;
        this.color = t.color;
        this.speed = baseSpeed * t.speedMul;
        this.x = x;
        this.y = -t.h;
        this.flash = 0;       // pisca ao levar dano sem morrer
        this.dead = false;
    }

    update(dt) {
        this.y += this.speed * dt;
        if (this.flash > 0) this.flash -= dt;
    }

    takeHit() {
        this.hp--;
        this.flash = 0.1;
        if (this.hp <= 0) this.dead = true;
    }

    draw() {
        ctx.fillStyle = this.flash > 0 ? "#ffffff" : this.color;
        ctx.beginPath();
        if (this.type === "fast") {
            // losango pontudo
            ctx.moveTo(this.x + this.w / 2, this.y + this.h);
            ctx.lineTo(this.x + this.w, this.y + this.h / 2);
            ctx.lineTo(this.x + this.w / 2, this.y);
            ctx.lineTo(this.x, this.y + this.h / 2);
        } else {
            // casco largo com cantos cortados
            ctx.moveTo(this.x + 8, this.y);
            ctx.lineTo(this.x + this.w - 8, this.y);
            ctx.lineTo(this.x + this.w, this.y + this.h / 2);
            ctx.lineTo(this.x + this.w - 8, this.y + this.h);
            ctx.lineTo(this.x + 8, this.y + this.h);
            ctx.lineTo(this.x, this.y + this.h / 2);
        }
        ctx.closePath();
        ctx.fill();

        // "olho"
        ctx.fillStyle = "#07100d";
        ctx.fillRect(this.x + this.w / 2 - 4, this.y + this.h / 2 - 3, 8, 6);
    }
}

class Spark {
    constructor(x, y) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 70 + Math.random() * 160;
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 0.3 + Math.random() * 0.3;
        this.maxLife = this.life;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
    }

    draw() {
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = "#ffb703";
        ctx.fillRect(this.x, this.y, 4, 4);
        ctx.globalAlpha = 1;
    }
}

// Burst de 8 a 12 faíscas
function burst(enemy) {
    const n = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
        sparks.push(new Spark(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2));
    }
}

// ===== Ondas =====
// Os três eixos de balanceamento (wave começa em 1):
// 1) QUANTIDADE: 5 + wave * 2
//    Onda 1 = 7 inimigos, onda 5 = 15.
// 2) VELOCIDADE: 70 + wave * 10 (px/s, base)
//    Cada tipo multiplica isso: rápido x1.5, largo x0.6.
//    Onda 1: rápido = 120 px/s, largo = 48 px/s.
// 3) INTERVALO: max(0.35, 1.0 - wave * 0.07) segundos entre nascimentos
//    Onda 1 = 0.93 s. O piso de 0.35 s impede a tela de virar parede.
// Bônus: a chance de nascer um inimigo largo sobe com a onda (15% + 5% por onda, máx. 40%).
function startWave() {
    toSpawn = 5 + wave * 2;
    spawnClock = 0;
    bannerTime = 2;
}

function spawnEnemy() {
    const baseSpeed = 70 + wave * 10;
    const heavyChance = Math.min(0.4, 0.15 + wave * 0.05);
    const typeName = Math.random() < heavyChance ? "heavy" : "fast";
    const w = ENEMY_TYPES[typeName].w;
    const x = 10 + Math.random() * (W - 20 - w);
    enemies.push(new Enemy(typeName, x, baseSpeed));
}

// ===== Regras =====
function loseLife() {
    lives--;
    hurtTime = 0.25;     // pisca a tela de vermelho
    if (lives <= 0) mode = "over";
}

function startGame() {
    ship = new Ship();
    shots = [];
    enemies = [];
    sparks = [];
    score = 0;
    lives = 3;
    wave = 1;
    hurtTime = 0;
    mode = "playing";
    lastTime = 0;
    startWave();
    updateHud();
}

function updateHud() {
    hudScore.textContent = score;
    hudLives.textContent = lives;
    hudWave.textContent = wave;
}

// ===== Update =====
function update(dt) {
    ship.update(dt);

    // nascimento escalonado
    if (toSpawn > 0) {
        spawnClock -= dt;
        if (spawnClock <= 0) {
            spawnEnemy();
            toSpawn--;
            spawnClock = Math.max(0.35, 1.0 - wave * 0.07);
        }
    }

    shots.forEach(s => s.update(dt));
    sparks.forEach(p => p.update(dt));

    enemies.forEach(e => {
        e.update(dt);
        // regra de falha: escapou pela base = -1 vida
        if (e.y > H && !e.dead) {
            e.dead = true;
            loseLife();
        }
    });

    // tiro x inimigo: só marcamos, ninguém é removido aqui
    shots.forEach(s => {
        enemies.forEach(e => {
            if (!s.dead && !e.dead && overlap(s, e)) {
                s.dead = true;
                e.takeHit();
                if (e.dead) {
                    score += e.points;
                    burst(e);
                }
            }
        });
    });

    // limpeza: filtramos depois dos loops (nada de splice dentro do forEach)
    shots = shots.filter(s => !s.dead);
    enemies = enemies.filter(e => !e.dead);
    sparks = sparks.filter(p => p.life > 0);

    // onda terminou? começa a próxima
    if (toSpawn === 0 && enemies.length === 0 && mode === "playing") {
        wave++;
        startWave();
    }

    if (bannerTime > 0) bannerTime -= dt;
    if (hurtTime > 0) hurtTime -= dt;
    updateHud();
}

// ===== Desenho =====
function drawBackground() {
    ctx.fillStyle = "#07100d";
    ctx.fillRect(0, 0, W, H);

    // estrelas fixas
    ctx.fillStyle = "#2c4a3d";
    for (let i = 0; i < 40; i++) {
        ctx.fillRect((i * 97) % W, (i * 61) % H, 2, 2);
    }

    // linha de defesa
    ctx.fillStyle = "rgba(255, 107, 107, 0.5)";
    ctx.fillRect(0, H - 6, W, 6);
}

function drawOverlay(title, subtitle) {
    ctx.fillStyle = "rgba(7, 16, 13, 0.8)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#e9f5ef";
    ctx.font = "bold 34px Trebuchet MS, sans-serif";
    ctx.fillText(title, W / 2, H / 2);
    ctx.font = "16px Trebuchet MS, sans-serif";
    ctx.fillStyle = "#ffb703";
    ctx.fillText(subtitle, W / 2, H / 2 + 32);
}

function draw() {
    drawBackground();
    enemies.forEach(e => e.draw());
    shots.forEach(s => s.draw());
    sparks.forEach(p => p.draw());
    ship.draw();

    if (hurtTime > 0) {
        ctx.fillStyle = "rgba(255, 60, 60, " + (hurtTime * 1.2) + ")";
        ctx.fillRect(0, 0, W, H);
    }

    if (bannerTime > 0 && mode === "playing") {
        ctx.textAlign = "center";
        ctx.fillStyle = "#e9f5ef";
        ctx.font = "bold 30px Trebuchet MS, sans-serif";
        ctx.fillText("Onda " + wave, W / 2, H / 2 - 40);
    }

    if (mode === "paused") drawOverlay("PAUSADO", "Aperte P para continuar");
    if (mode === "over") drawOverlay("FIM DE JOGO", "Você fez " + score + " pontos. Aperte R para jogar de novo");
}

// ===== Loop principal =====
function loop(ts) {
    if (!lastTime) lastTime = ts;           // primeiro frame (ou depois da pausa): dt = 0
    const dt = Math.min(0.033, (ts - lastTime) / 1000);
    lastTime = ts;

    if (mode === "playing") update(dt);
    draw();
    requestAnimationFrame(loop);
}

// ===== Teclado =====
function togglePause() {
    if (mode === "playing") mode = "paused";
    else if (mode === "paused") {
        mode = "playing";
        lastTime = 0;                        // evita um dt gigante ao voltar
    }
}

window.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    keys[k] = true;

    if ([" ", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    if (k === "p" && !e.repeat) togglePause();
    if (k === "r" && mode === "over") startGame();
});

window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});

// trocar de aba pausa o jogo
window.addEventListener("blur", () => {
    if (mode === "playing") togglePause();
});

startGame();
requestAnimationFrame(loop);