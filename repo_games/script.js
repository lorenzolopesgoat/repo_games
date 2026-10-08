const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const box = 25;

let snake;
let food;
let specialFood = null;
let specialFoodTimer = null;
let direction;
let nextDirection;
let score = 0;
let highScore = localStorage.getItem("cyberserpent_highscore") || 0;
let gameRunning = false;
let gameLoopInterval = null;
let currentMap = 1;

// Configuração dos 2 mapas (Missão Extra)
const mapConfigs = {
    1: {
        name: "1: ARENA ABERTA",
        speed: 95,
        obstacles: [
            { x: 175, y: 175 }, { x: 200, y: 175 }, { x: 225, y: 175 },
            { x: 275, y: 325 }, { x: 300, y: 325 }, { x: 325, y: 325 }
        ]
    },
    2: {
        name: "2: CIRCUITO TÁTICO",
        speed: 120,
        obstacles: [
            { x: 125, y: 125 }, { x: 125, y: 150 }, { x: 125, y: 175 },
            { x: 350, y: 125 }, { x: 350, y: 150 }, { x: 350, y: 175 },
            { x: 125, y: 325 }, { x: 125, y: 350 }, { x: 125, y: 375 },
            { x: 350, y: 325 }, { x: 350, y: 350 }, { x: 350, y: 375 },
            { x: 225, y: 225 }, { x: 250, y: 225 }, { x: 225, y: 250 }, { x: 250, y: 250 }
        ]
    }
};

document.getElementById("high-score").textContent = String(highScore).padStart(4, '0');

function startGame() {
    snake = [
        { x: 250, y: 250 },
        { x: 225, y: 250 },
        { x: 200, y: 250 }
    ];

    direction = "RIGHT";
    nextDirection = "RIGHT";
    score = 0;
    gameRunning = true;

    document.getElementById("score").textContent = String(score).padStart(4, '0');
    document.getElementById("overlay-message").style.opacity = "0";
    setTimeout(() => {
        document.getElementById("overlay-message").style.display = "none";
    }, 300);

    createFood();
    if (specialFoodTimer) clearTimeout(specialFoodTimer);
    specialFood = null;

    if (gameLoopInterval) clearInterval(gameLoopInterval);
    gameLoopInterval = setInterval(() => {
        update();
        draw();
    }, mapConfigs[currentMap].speed);
}

// Garantia: Comida não nasce em cima da cobra ou obstáculo
function createFood() {
    let validPosition = false;
    while (!validPosition) {
        food = {
            x: Math.floor(Math.random() * (canvas.width / box)) * box,
            y: Math.floor(Math.random() * (canvas.height / box)) * box
        };
        validPosition = true;

        for (let part of snake) {
            if (food.x === part.x && food.y === part.y) validPosition = false;
        }
        for (let obstacle of mapConfigs[currentMap].obstacles) {
            if (food.x === obstacle.x && food.y === obstacle.y) validPosition = false;
        }
    }
}

// Comida Especial Dourada (Encounter Design: +30 pts / some em 6s)
function spawnSpecialFood() {
    if (specialFood || !gameRunning) return;

    let validPosition = false;
    let tempFood;
    while (!validPosition) {
        tempFood = {
            x: Math.floor(Math.random() * (canvas.width / box)) * box,
            y: Math.floor(Math.random() * (canvas.height / box)) * box
        };
        validPosition = true;

        if (tempFood.x === food.x && tempFood.y === food.y) validPosition = false;
        for (let part of snake) if (tempFood.x === part.x && tempFood.y === part.y) validPosition = false;
        for (let obs of mapConfigs[currentMap].obstacles) if (tempFood.x === obs.x && tempFood.y === obs.y) validPosition = false;
    }

    specialFood = tempFood;
    specialFoodTimer = setTimeout(() => {
        specialFood = null;
    }, 6000);
}

// Controles e bloqueio de inversão de 180°
document.addEventListener("keydown", function(event) {
    const key = event.key.toLowerCase();

    if (key === "1" && !gameRunning) {
        currentMap = 1;
        document.getElementById("map-name").textContent = mapConfigs[1].name;
        draw();
        return;
    }
    if (key === "2" && !gameRunning) {
        currentMap = 2;
        document.getElementById("map-name").textContent = mapConfigs[2].name;
        draw();
        return;
    }

    if ((key === "arrowup" || key === "w") && direction !== "DOWN") nextDirection = "UP";
    if ((key === "arrowdown" || key === "s") && direction !== "UP") nextDirection = "DOWN";
    if ((key === "arrowleft" || key === "a") && direction !== "RIGHT") nextDirection = "LEFT";
    if ((key === "arrowright" || key === "d") && direction !== "LEFT") nextDirection = "RIGHT";

    if (!gameRunning && (key.startsWith("arrow") || ["w","a","s","d"].includes(key))) {
        startGame();
    }
});

function update() {
    if (!gameRunning) return;

    direction = nextDirection;
    let head = { x: snake[0].x, y: snake[0].y };

    if (direction === "UP") head.y -= box;
    if (direction === "DOWN") head.y += box;
    if (direction === "LEFT") head.x -= box;
    if (direction === "RIGHT") head.x += box;

    // Colisão com parede
    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
        endGame();
        return;
    }

    // Colisão com o corpo
    for (let part of snake) {
        if (head.x === part.x && head.y === part.y) {
            endGame();
            return;
        }
    }

    // Colisão com obstáculos
    for (let obstacle of mapConfigs[currentMap].obstacles) {
        if (head.x === obstacle.x && head.y === obstacle.y) {
            endGame();
            return;
        }
    }

    snake.unshift(head);

    // Comer Comida Padrão
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        document.getElementById("score").textContent = String(score).padStart(4, '0');
        createFood();

        if (Math.random() < 0.35) {
            spawnSpecialFood();
        }
    } 
    // Comer Comida Dourada Especial
    else if (specialFood && head.x === specialFood.x && head.y === specialFood.y) {
        score += 30;
        document.getElementById("score").textContent = String(score).padStart(4, '0');
        clearTimeout(specialFoodTimer);
        specialFood = null;
    } 
    else {
        snake.pop();
    }
}

function draw() {
    // Fundo
    ctx.fillStyle = "#080a14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grade Sutil
    ctx.strokeStyle = "rgba(0, 255, 204, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += box) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += box) {
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Obstáculos Arredondados (Módulos de Laser)
    for (let obs of mapConfigs[currentMap].obstacles) {
        ctx.fillStyle = "#ff0055";
        ctx.shadowColor = "#ff0055";
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.roundRect(obs.x + 2, obs.y + 2, box - 4, box - 4, 6);
        ctx.fill();
    }

    // Comida Padrão (Orbe de Energia Esférico)
    ctx.fillStyle = "#00ffcc";
    ctx.shadowColor = "#00ffcc";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(food.x + box / 2, food.y + box / 2, box / 2 - 3, 0, Math.PI * 2);
    ctx.fill();

    // Comida Especial Dourada (Núcleo Quântico)
    if (specialFood) {
        ctx.fillStyle = "#ffcc00";
        ctx.shadowColor = "#ffcc00";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(specialFood.x + box / 2, specialFood.y + box / 2, box / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // RENDERIZAÇÃO DA COBRA CIRCULAR COM ANATOMIA DE SERPENTE
    snake.forEach((part, index) => {
        let centerX = part.x + box / 2;
        let centerY = part.y + box / 2;

        if (index === 0) {
            // CABEÇA DA COBRA (CÍRCULO MAIOR + OLHOS + LÍNGUA)
            let headRadius = box / 2 - 1;

            ctx.fillStyle = "#00ffcc";
            ctx.shadowColor = "#00ffcc";
            ctx.shadowBlur = 15;

            ctx.beginPath();
            ctx.arc(centerX, centerY, headRadius, 0, Math.PI * 2);
            ctx.fill();

            // Desenhar Olhos com base na direção
            ctx.fillStyle = "#05050d";
            ctx.shadowBlur = 0;
            let eyeOffset = 5;

            let eye1X = centerX, eye1Y = centerY;
            let eye2X = centerX, eye2Y = centerY;

            if (direction === "RIGHT") {
                eye1X = centerX + 3; eye1Y = centerY - eyeOffset;
                eye2X = centerX + 3; eye2Y = centerY + eyeOffset;
            } else if (direction === "LEFT") {
                eye1X = centerX - 3; eye1Y = centerY - eyeOffset;
                eye2X = centerX - 3; eye2Y = centerY + eyeOffset;
            } else if (direction === "UP") {
                eye1X = centerX - eyeOffset; eye1Y = centerY - 3;
                eye2X = centerX + eyeOffset; eye2Y = centerY - 3;
            } else if (direction === "DOWN") {
                eye1X = centerX - eyeOffset; eye1Y = centerY + 3;
                eye2X = centerX + eyeOffset; eye2Y = centerY + 3;
            }

            ctx.beginPath();
            ctx.arc(eye1X, eye1Y, 2.5, 0, Math.PI * 2);
            ctx.arc(eye2X, eye2Y, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Língua Bífida Cyberpunk
            ctx.strokeStyle = "#ff0055";
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (direction === "RIGHT") {
                ctx.moveTo(centerX + headRadius, centerY);
                ctx.lineTo(centerX + headRadius + 6, centerY);
            } else if (direction === "LEFT") {
                ctx.moveTo(centerX - headRadius, centerY);
                ctx.lineTo(centerX - headRadius - 6, centerY);
            } else if (direction === "UP") {
                ctx.moveTo(centerX, centerY - headRadius);
                ctx.lineTo(centerX, centerY - headRadius - 6);
            } else if (direction === "DOWN") {
                ctx.moveTo(centerX, centerY + headRadius);
                ctx.lineTo(centerX, centerY + headRadius + 6);
            }
            ctx.stroke();

        } else {
            // CORPO E CAUDA (CÍRCULOS DECRESCENTES CONNECTADOS)
            // Diminui gradualmente de tamanho até a cauda
            let progress = index / snake.length;
            let bodyRadius = (box / 2 - 2) * (1 - progress * 0.35);

            ctx.fillStyle = `hsl(${170 + index * 3}, 100%, 50%)`;
            ctx.shadowColor = "#00ffcc";
            ctx.shadowBlur = 6;

            ctx.beginPath();
            ctx.arc(centerX, centerY, bodyRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    ctx.shadowBlur = 0;
}

function endGame() {
    gameRunning = false;
    clearInterval(gameLoopInterval);

    if (score > highScore) {
        highScore = score;
        localStorage.setItem("cyberserpent_highscore", highScore);
        document.getElementById("high-score").textContent = String(highScore).padStart(4, '0');
    }

    const overlay = document.getElementById("overlay-message");
    document.getElementById("msg-title").textContent = "CONEXÃO PERDIDA";
    document.getElementById("message").innerHTML = `Pontuação Final: ${score}<br><br><small>Clique em RESTART SYSTEM para jogar novamente</small>`;
    overlay.style.display = "flex";
    setTimeout(() => { overlay.style.opacity = "1"; }, 10);
}

function restartGame() {
    startGame();
}

draw();