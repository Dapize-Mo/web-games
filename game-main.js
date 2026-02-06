const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const speedLabel = document.getElementById("speed");
const positionLabel = document.getElementById("position");
const resetButton = document.getElementById("reset");

const world = {
  width: canvas.width,
  height: canvas.height,
  padding: 60,
  perspectiveDistance: 2000,
};

const ball = {
  radius: 22,
  x: world.width / 2,
  y: world.height * 0.35,
  vx: 0,
  vy: 0,
  maxSpeed: 6,
  accel: 0.38,
  friction: 0.88,
};

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  sprint: false,
};

// Create grass with layered depth for brute force effect - OPTIMIZED
const grassLayers = [];
const grassBlades = [];
console.log(`Rendering surface with optimized physics`);

let isActive = false;
let frameCount = 0;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function resetBall() {
  ball.x = world.width / 2;
  ball.y = world.height * 0.35;
  ball.vx = 0;
  ball.vy = 0;
}

function updateInput(event, isDown) {
  if (!isActive) return;
  const key = event.key.toLowerCase();
  
  if (["arrowup", "w"].includes(key)) input.up = isDown;
  if (["arrowdown", "s"].includes(key)) input.down = isDown;
  if (["arrowleft", "a"].includes(key)) input.left = isDown;
  if (["arrowright", "d"].includes(key)) input.right = isDown;
  if (event.key === "Shift") input.sprint = isDown;
  if (key === "r") {
    resetBall();
    event.preventDefault();
  }
}

function applyPhysics() {
  const sprintMultiplier = input.sprint ? 1.7 : 1;
  if (input.up) ball.vy -= ball.accel * sprintMultiplier;
  if (input.down) ball.vy += ball.accel * sprintMultiplier;
  if (input.left) ball.vx -= ball.accel * sprintMultiplier;
  if (input.right) ball.vx += ball.accel * sprintMultiplier;

  ball.vx *= ball.friction;
  ball.vy *= ball.friction;

  const maxSpeed = ball.maxSpeed * sprintMultiplier;
  ball.vx = clamp(ball.vx, -maxSpeed, maxSpeed);
  ball.vy = clamp(ball.vy, -maxSpeed, maxSpeed);

  ball.x += ball.vx;
  ball.y += ball.vy;

  const minX = world.padding + ball.radius;
  const maxX = world.width - world.padding - ball.radius;
  const minY = world.padding + ball.radius;
  const maxY = world.height - world.padding - ball.radius;

  if (ball.x < minX) {
    ball.x = minX;
    ball.vx *= -0.4;
  } else if (ball.x > maxX) {
    ball.x = maxX;
    ball.vx *= -0.4;
  }

  if (ball.y < minY) {
    ball.y = minY;
    ball.vy *= -0.4;
  } else if (ball.y > maxY) {
    ball.y = maxY;
    ball.vy *= -0.4;
  }
}

function drawBackground() {
  // Simple gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, world.height);
  gradient.addColorStop(0, "#1a2a3a");
  gradient.addColorStop(0.5, "#0f1820");
  gradient.addColorStop(1, "#0a0f15");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.width, world.height);

  // Draw surface/arena
  const surfaceGradient = ctx.createLinearGradient(world.padding, world.padding, world.padding, world.height - world.padding);
  surfaceGradient.addColorStop(0, "#2a3a4a");
  surfaceGradient.addColorStop(0.5, "#1f2f3f");
  surfaceGradient.addColorStop(1, "#1a2530");
  ctx.fillStyle = surfaceGradient;
  ctx.fillRect(world.padding, world.padding, world.width - world.padding * 2, world.height - world.padding * 2);

  // Border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 3;
  ctx.strokeRect(world.padding, world.padding, world.width - world.padding * 2, world.height - world.padding * 2);

  // Add some subtle grid pattern
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;
  const gridSize = 80;
  for (let x = world.padding; x < world.width - world.padding; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, world.padding);
    ctx.lineTo(x, world.height - world.padding);
    ctx.stroke();
  }
  for (let y = world.padding; y < world.height - world.padding; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(world.padding, y);
    ctx.lineTo(world.width - world.padding, y);
    ctx.stroke();
  }
}

function drawBall() {
  ctx.save();
  ctx.translate(ball.x, ball.y);

  // Multi-layer glow
  const glowGradient = ctx.createRadialGradient(-8, -8, 0, 0, 0, ball.radius + 12);
  glowGradient.addColorStop(0, "rgba(200, 230, 255, 0.4)");
  glowGradient.addColorStop(0.4, "rgba(120, 180, 255, 0.2)");
  glowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(0, 0, ball.radius + 12, 0, Math.PI * 2);
  ctx.fill();

  // Main ball
  const ballGradient = ctx.createRadialGradient(-7, -7, 6, 0, 0, ball.radius + 8);
  ballGradient.addColorStop(0, "#ffffff");
  ballGradient.addColorStop(0.5, "#a0d6ff");
  ballGradient.addColorStop(1, "#3a78a1");
  ctx.fillStyle = ballGradient;
  ctx.beginPath();
  ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.beginPath();
  ctx.arc(-5, -6, ball.radius * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function updateHud() {
  const speed = Math.hypot(ball.vx, ball.vy);
  speedLabel.textContent = speed.toFixed(2);
  positionLabel.textContent = `${Math.round(ball.x)}, ${Math.round(ball.y)}`;
}

function tick() {
  frameCount++;
  
  if (isActive) {
    applyPhysics();
  }

  drawBackground();
  drawBall();
  updateHud();
  requestAnimationFrame(tick);
}

function activate() {
  isActive = true;
  canvas.focus();
}

canvas.setAttribute("tabindex", "0");
canvas.addEventListener("click", activate);

window.addEventListener("keydown", (event) => {
  if (isActive && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
  }
  updateInput(event, true);
});
window.addEventListener("keyup", (event) => updateInput(event, false));
resetButton.addEventListener("click", resetBall);

// Start game on any key press
window.addEventListener("keydown", () => {
  if (!isActive) activate();
});

resetBall();
activate();
tick();
