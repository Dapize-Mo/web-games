const gameContainer = document.getElementById('game-container');
const speedLabel = document.getElementById('speed');
const positionLabel = document.getElementById('position');
const resetButton = document.getElementById('reset');

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f15);
scene.fog = new THREE.Fog(0x0a0f15, 100, 300);

// Camera - positioned to see whole surface from top-right
const camera = new THREE.PerspectiveCamera(
  45,
  gameContainer.clientWidth / gameContainer.clientHeight,
  0.1,
  1000
);
camera.position.set(60, 80, 60);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(gameContainer.clientWidth, gameContainer.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowShadowMap;
gameContainer.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.far = 200;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
scene.add(directionalLight);

// Ball physics
const ball = {
  position: new THREE.Vector3(0, 1, 0),
  velocity: new THREE.Vector3(0, 0, 0),
  radius: 1,
  maxSpeed: 5.5,
  accel: 0.35,
  friction: 0.9,
  mass: 1,
  inertia: 0.4 * 1 * 1 * 1,
  angularVelocity: new THREE.Vector3(0, 0, 0),
};

// Create ball mesh
const ballGeometry = new THREE.SphereGeometry(ball.radius, 32, 32);
const ballMaterial = new THREE.MeshStandardMaterial({
  color: 0x98d6ff,
  metalness: 0.6,
  roughness: 0.4,
});
const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
ballMesh.castShadow = true;
ballMesh.receiveShadow = true;
scene.add(ballMesh);

// Create surface/arena
const surfaceGeometry = new THREE.PlaneGeometry(120, 120);
const surfaceMaterial = new THREE.MeshStandardMaterial({
  color: 0x1f2f3f,
  metalness: 0.1,
  roughness: 0.8,
});
const surfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
surfaceMesh.rotation.x = -Math.PI / 2;
surfaceMesh.receiveShadow = true;
scene.add(surfaceMesh);

// Add grid to surface
const gridHelper = new THREE.GridHelper(120, 24, 0x444444, 0x222222);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

// Add boundary walls (invisible)
const boundaries = {
  xMin: -60,
  xMax: 60,
  zMin: -60,
  zMax: 60,
};

// Input
const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  sprint: false,
};

let isActive = false;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function resetBall() {
  ball.position.set(0, ball.radius, 0);
  ball.velocity.set(0, 0, 0);
  ball.angularVelocity.set(0, 0, 0);
}

function updateInput(event, isDown) {
  const key = event.key.toLowerCase();
  if (['arrowup', 'w'].includes(key)) input.up = isDown;
  if (['arrowdown', 's'].includes(key)) input.down = isDown;
  if (['arrowleft', 'a'].includes(key)) input.left = isDown;
  if (['arrowright', 'd'].includes(key)) input.right = isDown;
  if (event.key === 'Shift') input.sprint = isDown;
  if (key === "r") {
    resetBall();
    event.preventDefault();
  }
}

function applyPhysics() {
  const sprintMultiplier = input.sprint ? 1.6 : 1;
  const moveDirection = new THREE.Vector3();

  if (input.up) moveDirection.z -= 1;
  if (input.down) moveDirection.z += 1;
  if (input.left) moveDirection.x -= 1;
  if (input.right) moveDirection.x += 1;

  if (moveDirection.length() > 0) {
    moveDirection.normalize();
    const accel = ball.accel * sprintMultiplier;
    ball.velocity.addScaledVector(moveDirection, accel);
  }

  // Friction
  ball.velocity.multiplyScalar(ball.friction);
  ball.angularVelocity.multiplyScalar(ball.friction * 0.95);

  // Max speed
  const maxSpeed = ball.maxSpeed * sprintMultiplier;
  if (ball.velocity.length() > maxSpeed) {
    ball.velocity.clampLength(0, maxSpeed);
  }

  // Apply velocity
  ball.position.add(ball.velocity);

  // Boundary collision
  if (ball.position.x - ball.radius < boundaries.xMin) {
    ball.position.x = boundaries.xMin + ball.radius;
    ball.velocity.x *= -0.35;
  } else if (ball.position.x + ball.radius > boundaries.xMax) {
    ball.position.x = boundaries.xMax - ball.radius;
    ball.velocity.x *= -0.35;
  }

  if (ball.position.z - ball.radius < boundaries.zMin) {
    ball.position.z = boundaries.zMin + ball.radius;
    ball.velocity.z *= -0.35;
  } else if (ball.position.z + ball.radius > boundaries.zMax) {
    ball.position.z = boundaries.zMax - ball.radius;
    ball.velocity.z *= -0.35;
  }

  // Gravity (keep ball on surface)
  if (ball.position.y > ball.radius) {
    ball.position.y -= 0.5;
  }
  ball.position.y = Math.max(ball.radius, ball.position.y);

  // Rolling effect: update angular velocity based on linear velocity
  const rollAxis = new THREE.Vector3(-ball.velocity.z, 0, ball.velocity.x);
  if (rollAxis.length() > 0.01) {
    const rollSpeed = ball.velocity.length() / ball.radius;
    rollAxis.normalize().multiplyScalar(rollSpeed);
    ball.angularVelocity.lerp(rollAxis, 0.1);
  }
}

function updateBallMesh() {
  ballMesh.position.copy(ball.position);
  
  // Update rotation based on angular velocity
  const quaternion = new THREE.Quaternion();
  const axis = new THREE.Vector3();
  const angle = ball.angularVelocity.length();
  
  if (angle > 0.001) {
    axis.copy(ball.angularVelocity).normalize();
    quaternion.setFromAxisAngle(axis, angle);
    ballMesh.quaternion.multiplyQuaternions(quaternion, ballMesh.quaternion);
  }
}

function updateHud() {
  const speed = ball.velocity.length();
  speedLabel.textContent = speed.toFixed(2);
  positionLabel.textContent = `${ball.position.x.toFixed(0)}, ${ball.position.z.toFixed(0)}`;
}

function onWindowResize() {
  const width = gameContainer.clientWidth;
  const height = gameContainer.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);

  if (isActive) {
    applyPhysics();
  }

  updateBallMesh();
  updateHud();
  renderer.render(scene, camera);
}

function activate() {
  isActive = true;
}

// Event listeners
window.addEventListener('keydown', (event) => {
  if (isActive && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
  }
  updateInput(event, true);
  if (!isActive) activate();
});

window.addEventListener('keyup', (event) => updateInput(event, false));
window.addEventListener('resize', onWindowResize);
resetButton.addEventListener('click', resetBall);

renderer.domElement.addEventListener('click', activate);

resetBall();
activate();
animate();

