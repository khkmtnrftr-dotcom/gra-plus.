(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreNode = document.getElementById('score');
  const timeNode = document.getElementById('time');
  const speedNode = document.getElementById('speed');
  const overlay = document.getElementById('overlay');
  const titleNode = document.getElementById('overlayTitle');
  const textNode = document.getElementById('overlayText');
  const startButton = document.getElementById('startButton');
  const soundToggle = document.getElementById('soundToggle');

  const W = canvas.width;
  const H = canvas.height;
  const keys = new Set();
  const player = { x: W / 2, y: H / 2, r: 14, speed: 245 };
  const enemy = { x: 52, y: 52, r: 17, speed: 120 };
  const coin = { x: 0, y: 0, r: 9 };
  let score = 0;
  let secondsLeft = 60;
  let running = false;
  let soundEnabled = true;
  let previousTime = 0;
  let lastTimerSecond = 0;
  let audioContext;

  function placeCoin() {
    const margin = 34;
    let safe = false;
    while (!safe) {
      coin.x = margin + Math.random() * (W - margin * 2);
      coin.y = margin + Math.random() * (H - margin * 2);
      safe = Math.hypot(coin.x - player.x, coin.y - player.y) > 100 &&
        Math.hypot(coin.x - enemy.x, coin.y - enemy.y) > 110;
    }
  }

  function playCoinSound() {
    if (!soundEnabled) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    audioContext ||= new AudioCtx();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1320, audioContext.currentTime + 0.09);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.17);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.18);
  }

  function resetGame() {
    score = 0;
    secondsLeft = 60;
    player.x = W / 2;
    player.y = H / 2;
    enemy.x = 52;
    enemy.y = 52;
    enemy.speed = 120;
    scoreNode.textContent = score;
    timeNode.textContent = secondsLeft;
    speedNode.textContent = enemy.speed;
    placeCoin();
  }

  function startGame() {
    resetGame();
    running = true;
    overlay.classList.add('hidden');
    previousTime = performance.now();
    lastTimerSecond = previousTime;
    requestAnimationFrame(frame);
  }

  function endGame(reason) {
    running = false;
    titleNode.textContent = reason === 'caught' ? 'Гру завершено!' : 'Час вийшов!';
    textNode.textContent = `${reason === 'caught' ? 'Ворог наздогнав вас.' : 'Раунд завершився.'} Зібрано монет: ${score}. Натисніть кнопку, щоб зіграти ще раз.`;
    startButton.textContent = 'Зіграти ще раз';
    overlay.classList.remove('hidden');
  }

  function update(dt, now) {
    let dx = 0;
    let dy = 0;
    if (keys.has('ArrowLeft') || keys.has('a')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('d')) dx += 1;
    if (keys.has('ArrowUp') || keys.has('w')) dy -= 1;
    if (keys.has('ArrowDown') || keys.has('s')) dy += 1;
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
    player.x = Math.max(player.r, Math.min(W - player.r, player.x + dx * player.speed * dt));
    player.y = Math.max(player.r, Math.min(H - player.r, player.y + dy * player.speed * dt));

    const toPlayerX = player.x - enemy.x;
    const toPlayerY = player.y - enemy.y;
    const distance = Math.hypot(toPlayerX, toPlayerY) || 1;
    enemy.x += (toPlayerX / distance) * enemy.speed * dt;
    enemy.y += (toPlayerY / distance) * enemy.speed * dt;

    if (distance < player.r + enemy.r) { endGame('caught'); return; }
    if (Math.hypot(player.x - coin.x, player.y - coin.y) < player.r + coin.r) {
      score += 1;
      scoreNode.textContent = score;
      if (score % 5 === 0) {
        enemy.speed += 10;
        speedNode.textContent = enemy.speed;
      }
      playCoinSound();
      placeCoin();
    }

    if (now - lastTimerSecond >= 1000) {
      const passed = Math.floor((now - lastTimerSecond) / 1000);
      secondsLeft = Math.max(0, secondsLeft - passed);
      lastTimerSecond += passed * 1000;
      timeNode.textContent = secondsLeft;
      if (secondsLeft === 0) endGame('time');
    }
  }

  function drawBackground() {
    ctx.fillStyle = '#0b1422';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(105, 145, 186, 0.09)';
    ctx.lineWidth = 1;
    for (let x = 20; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 20; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  function drawCircle(x, y, radius, color, glow) {
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function draw() {
    drawBackground();
    drawCircle(coin.x, coin.y, coin.r, '#ffc85a', '#ffc85a');
    ctx.fillStyle = '#fff3c6';
    ctx.beginPath(); ctx.arc(coin.x, coin.y, 3, 0, Math.PI * 2); ctx.fill();
    drawCircle(enemy.x, enemy.y, enemy.r, '#ff5267', '#ff5267');
    drawCircle(player.x, player.y, player.r, '#5c8cff', '#5c8cff');
    ctx.fillStyle = '#dce9ff';
    ctx.beginPath(); ctx.arc(player.x - 4, player.y - 4, 3, 0, Math.PI * 2); ctx.fill();
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - previousTime) / 1000, 0.04);
    previousTime = now;
    update(dt, now);
    draw();
    if (running) requestAnimationFrame(frame);
  }

  window.addEventListener('keydown', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) event.preventDefault();
    keys.add(key);
  });
  window.addEventListener('keyup', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    keys.delete(key);
  });
  window.addEventListener('blur', () => keys.clear());
  startButton.addEventListener('click', startGame);
  soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = `Звук: ${soundEnabled ? 'увімкнено' : 'вимкнено'}`;
    soundToggle.setAttribute('aria-pressed', String(soundEnabled));
  });

  resetGame();
  draw();
})();

