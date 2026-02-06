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

// Create grass with layered depth for brute force effect
const grassLayers = Array.from({ length: 5 }, (_, layerIdx) => {
  const layerDepth = 0.2 + (layerIdx / 5) * 0.8;
  const bladeCount = Math.floor(150 * (1 - layerDepth * 0.5));
  
  return Array.from({ length: bladeCount }, () => {
    const baseHeight = 6 + Math.random() * 14;
    return {
      x: Math.random() * world.width,
      y: world.padding + Math.random() * (world.height - world.padding * 2),
      baseHeight: baseHeight,
      height: baseHeight,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.006 + Math.random() * 0.01,
      bend: 0,
      width: 1.2 + Math.random() * 1.8,
      colorOffset: Math.random() * 0.2 - 0.1,
      segments: 4 + Math.floor(Math.random() * 3),
      depth: layerDepth,
    };
  });
});

const grassBlades = grassLayers.flat();

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
  // Perspective-based sky gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, world.height);
  gradient.addColorStop(0, "#2a5a2a");
  gradient.addColorStop(0.6, "#1f3a1f");
  gradient.addColorStop(1, "#1a2618");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.width, world.height);

  // Field boundary
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 2;
  ctx.strokeRect(world.padding, world.padding, world.width - world.padding * 2, world.height - world.padding * 2);

  // Draw grass with depth sorting
  grassBlades.sort((a, b) => a.y - b.y);

  grassBlades.forEach((blade) => {
    blade.sway += blade.swaySpeed + Math.abs(ball.vx + ball.vy) * 0.006;
    const swayOffset = Math.sin(blade.sway) * 4;
    const dx = blade.x - ball.x;
    const dy = blade.y - ball.y;
    const distance = Math.hypot(dx, dy);

    // Ball influence with stronger effect on nearby grass
    const influence = clamp(1 - distance / 100, 0, 1);
    const targetBend = influence * influence * 22;
    blade.bend += (targetBend - blade.bend) * 0.16;
    blade.height = blade.baseHeight - blade.bend * 0.65;

    const bendDirection = distance < 1 ? 0 : dx / distance;
    const bendOffset = bendDirection * blade.bend * 1.5;

    // Color variation based on depth
    const depthColor = 0.6 + blade.depth * 0.4;
    const baseGreen = Math.round(140 * depthColor + blade.colorOffset * 40);
    const baseBlue = Math.round(80 * depthColor + blade.colorOffset * 30);

    // Draw blade with segments
    const segments = blade.segments;
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const nextT = (i + 1) / segments;

      const x1 = blade.x + swayOffset * t + bendOffset * t * t;
      const y1 = blade.y - blade.baseHeight * t;
      const x2 = blade.x + swayOffset * nextT + bendOffset * nextT * nextT;
      const y2 = blade.y - blade.baseHeight * nextT;

      const widthTaper = blade.width * (1 - t * 0.6);
      const alphaGradient = 0.4 + t * 0.6;
      
      ctx.strokeStyle = `rgba(100, ${baseGreen}, ${baseBlue}, ${alphaGradient * (0.7 + blade.depth * 0.3)})`;
      ctx.lineWidth = widthTaper;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Add subtle highlight
    const highlightX = blade.x + swayOffset * 0.3 + bendOffset * 0.1;
    const highlightY = blade.y - blade.baseHeight * 0.35;
    ctx.strokeStyle = `rgba(180, 220, 140, ${0.2 * (0.5 + blade.depth)})`;
    ctx.lineWidth = blade.width * 0.3;
    ctx.beginPath();
    ctx.moveTo(highlightX - 1, highlightY);
    ctx.lineTo(highlightX + 2.5, highlightY - blade.baseHeight * 0.25);
    ctx.stroke();
  });

  // Subtle vignette
  const vignetteGradient = ctx.createRadialGradient(world.width / 2, world.height / 2, 200, world.width / 2, world.height / 2, 900);
  vignetteGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignetteGradient.addColorStop(1, "rgba(0, 0, 0, 0.15)");
  ctx.fillStyle = vignetteGradient;
  ctx.fillRect(0, 0, world.width, world.height);
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
