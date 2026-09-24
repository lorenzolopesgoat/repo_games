const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Eu uso dt porque ele garante que o movimento da bola dependa do tempo real decorrido e não da velocidade do monitor (taxa de quadros), fazendo o jogo rodar na mesma velocidade em qualquer computador.

// x, y - Posição do centro da bola
// r - Raio do círculo
// vx, vy - Velocidade horizontal e vertical (pixels por segundo)
const ball = {
    x: 40,
    y: 160,
    r: 16,
    vx: 120,
    vy: 120
};

let last = 0; 

function update(dt) {
    ball.x += ball.vx * dt; 
    ball.y += ball.vy * dt; 
    if (ball.x - ball.r < 0 || ball.x + ball.r > canvas.width) {
        ball.vx *= -1;
    }

    if (ball.y - ball.r < 0 || ball.y + ball.r > canvas.height) {
        ball.vy *= -1;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#4ade80"; 
    ctx.beginPath(); 
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); 
    ctx.fill();
}

function loop(ts) {
    if (!last) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000); 
    last = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);