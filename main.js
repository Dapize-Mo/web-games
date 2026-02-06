const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const speedLabel = document.getElementById("speed");
const positionLabel = document.getElementById("position");
const resetButton = document.getElementById("reset");
const expandButton = document.getElementById("expand-game");
const gameStage = document.getElementById("game-stage");

const world = {
  width: canvas.width,
  height: canvas.height,
  padding: 40,
};

const ball = {
  radius: 18,
  x: world.width / 2,
  y: world.height / 2,
  vx: 0,
  vy: 0,
  maxSpeed: 5.5,
  accel: 0.35,
  friction: 0.9,
};

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  sprint: false,
};

const grassBlades = Array.from({ length: 800 }, () => {
  const baseHeight = 8 + Math.random() * 16;
  return {
    x: Math.random() * world.width,
    y: Math.random() * world.height,
    baseHeight: baseHeight,
    height: baseHeight,
    sway: Math.random() * Math.PI * 2,
    swaySpeed: 0.008 + Math.random() * 0.012,
    bend: 0,
    width: 1 + Math.random() * 1.5,
    colorOffset: Math.random() * 0.15 - 0.075,
    segments: 3 + Math.floor(Math.random() * 3),
  };
});

let isActive = false;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function resetBall() {
  ball.x = world.width / 2;
  ball.y = world.height / 2;
  ball.vx = 0;
  ball.vy = 0;
}

function updateInput(event, isDown) {
  if (!isActive) return;
  switch (event.key) {
    case "ArrowUp":
    case "w":
    case "W":
      input.up = isDown;
      break;
    case "ArrowDown":
    case "s":
    case "S":
      input.down = isDown;
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      input.left = isDown;
      break;
    case "ArrowRight":
    case "d":
    case "D":
      input.right = isDown;
      break;
    case "Shift":
      input.sprint = isDown;
      break;
    default:
      break;
  }
}

function applyPhysics() {
  const sprintMultiplier = input.sprint ? 1.6 : 1;
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
    ball.vx *= -0.35;
  } else if (ball.x > maxX) {
    ball.x = maxX;
    ball.vx *= -0.35;
  }

  if (ball.y < minY) {
    ball.y = minY;
    ball.vy *= -0.35;
  } else if (ball.y > maxY) {
    ball.y = maxY;
    ball.vy *= -0.35;
  }
}

function drawBackground() {
  ctx.fillStyle = "#1a2618";
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = "#1f2d1c";
  ctx.fillRect(world.padding, world.padding, world.width - world.padding * 2, world.height - world.padding * 2);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(world.padding, world.padding, world.width - world.padding * 2, world.height - world.padding * 2);

  // Sort blades by y position for proper depth
  grassBlades.sort((a, b) => a.y - b.y);

  grassBlades.forEach((blade) => {
    blade.sway += blade.swaySpeed + Math.abs(ball.vx + ball.vy) * 0.008;
    const swayOffset = Math.sin(blade.sway) * 3;
    const dx = blade.x - ball.x;
    const dy = blade.y - ball.y;
    const distance = Math.hypot(dx, dy);
    
    // Ball influence on grass
    const influence = clamp(1 - distance / 120, 0, 1);
    const targetBend = influence * influence * 18;
    blade.bend += (targetBend - blade.bend) * 0.15;
    blade.height = blade.baseHeight - blade.bend * 0.6;

    const bendDirection = distance < 1 ? 0 : dx / distance;
    const bendOffset = bendDirection * blade.bend * 1.2;

    // Draw grass blade with segments for realism
    const segments = blade.segments;
    const baseColor = 131 - blade.colorOffset * 50;
    const baseGreen = 196 - blade.colorOffset * 80;
    const baseBlue = 120 + blade.colorOffset * 40;

    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const nextT = (i + 1) / segments;
      
      const x1 = blade.x + swayOffset * t + bendOffset * t * t;
      const y1 = blade.y - blade.baseHeight * t;
      const x2 = blade.x + swayOffset * nextT + bendOffset * nextT * nextT;
      const y2 = blade.y - blade.baseHeight * nextT;

      const widthTaper = blade.width * (1 - t * 0.7);
      const colorIntensity = 0.5 + t * 0.5;
      
      ctx.strokeStyle = `rgba(${Math.round(baseColor * colorIntensity)}, ${Math.round(baseGreen * colorIntensity)}, ${Math.round(baseBlue * colorIntensity)}, ${0.6 + t * 0.4})`;
      ctx.lineWidth = widthTaper;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Add subtle highlight on side
    const highlightX = blade.x + swayOffset + bendOffset * 0.3;
    const highlightY = blade.y - blade.baseHeight * 0.4;
    ctx.strokeStyle = "rgba(200, 220, 150, 0.3)";
    ctx.lineWidth = blade.width * 0.4;
    ctx.beginPath();
    ctx.moveTo(highlightX - 1, highlightY);
    ctx.lineTo(highlightX + 2, highlightY - blade.baseHeight * 0.3);
    ctx.stroke();
  });

  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  ctx.fillRect(0, 0, world.width, world.height);
}

function drawBall() {
  ctx.save();
  ctx.translate(ball.x, ball.y);
  const gradient = ctx.createRadialGradient(-6, -6, 4, 0, 0, ball.radius + 6);
  gradient.addColorStop(0, "#f7f8ff");
  gradient.addColorStop(0.6, "#98d6ff");
  gradient.addColorStop(1, "#3a78a1");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function updateHud() {
  const speed = Math.hypot(ball.vx, ball.vy);
  speedLabel.textContent = speed.toFixed(2);
  positionLabel.textContent = `${Math.round(ball.x)}, ${Math.round(ball.y)}`;
}

function tick() {
  if (isActive) {
    applyPhysics();
  }
  drawBackground();
  drawBall();
  updateHud();
  requestAnimationFrame(tick);
}

function activateGame() {
  isActive = true;
  gameStage.classList.add("active");
  expandButton.textContent = "Game active";
}

expandButton.addEventListener("click", () => {
  activateGame();
  canvas.focus();
});

canvas.setAttribute("tabindex", "0");
canvas.addEventListener("click", activateGame);

window.addEventListener("keydown", (event) => {
  if (isActive && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
  }
  updateInput(event, true);
});
window.addEventListener("keyup", (event) => updateInput(event, false));
resetButton.addEventListener("click", resetBall);

resetBall();
tick();
