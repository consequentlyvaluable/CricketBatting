import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("game");
const runsElement = document.getElementById("runs");
const streakElement = document.getElementById("streak");
const ballsElement = document.getElementById("balls");
const messageElement = document.getElementById("message");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 40, 120);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(-6, 4.5, 12);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableZoom = false;
controls.maxPolarAngle = Math.PI / 2.2;
controls.target.set(0, 1.2, 0);
controls.update();

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.1);
sunLight.position.set(-10, 18, 12);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 60;
sunLight.shadow.camera.left = -20;
sunLight.shadow.camera.right = 20;
sunLight.shadow.camera.top = 20;
sunLight.shadow.camera.bottom = -5;
scene.add(sunLight);

// Ground / pitch
const groundGeometry = new THREE.CircleGeometry(60, 48);
const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x3c9d3c });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const pitchGeometry = new THREE.PlaneGeometry(3, 20);
const pitchMaterial = new THREE.MeshLambertMaterial({ color: 0xf8f4d6 });
const pitch = new THREE.Mesh(pitchGeometry, pitchMaterial);
pitch.rotation.x = -Math.PI / 2;
pitch.position.set(0, 0.01, 3);
pitch.receiveShadow = true;
scene.add(pitch);

// Stumps
const stumpMaterial = new THREE.MeshPhongMaterial({ color: 0xe3dac9 });
const stumpGeometry = new THREE.CylinderGeometry(0.1, 0.08, 1.1, 16);
for (let i = 0; i < 3; i++) {
  const stump = new THREE.Mesh(stumpGeometry, stumpMaterial);
  stump.position.set(-0.35 + i * 0.35, 0.55, -0.5);
  stump.castShadow = true;
  scene.add(stump);
}

// Bat setup
const batPivot = new THREE.Group();
batPivot.position.set(-1.2, 1, 1.2);
scene.add(batPivot);

const batMaterial = new THREE.MeshPhongMaterial({ color: 0xd7a86e, flatShading: true });
const handleGeometry = new THREE.CylinderGeometry(0.18, 0.2, 1.5, 16);
const handle = new THREE.Mesh(handleGeometry, batMaterial);
handle.position.set(0, 0.75, 0);
handle.castShadow = true;
batPivot.add(handle);

const bladeGeometry = new THREE.BoxGeometry(0.5, 2.1, 0.18);
const blade = new THREE.Mesh(bladeGeometry, batMaterial);
blade.position.set(0, -0.4, 0.1);
blade.castShadow = true;
batPivot.add(blade);

const batContact = new THREE.Object3D();
batContact.position.set(0.4, -0.6, 0);
blade.add(batContact);

batPivot.rotation.z = Math.PI / 9;
batPivot.rotation.y = Math.PI / 2.4;

// Ball
const ballGeometry = new THREE.SphereGeometry(0.24, 32, 32);
const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xaa1111 });
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.castShadow = true;
ball.receiveShadow = true;
scene.add(ball);

// Stadium extras
const boundaryGeometry = new THREE.TorusGeometry(45, 0.3, 16, 128);
const boundaryMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
const boundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
boundary.rotation.x = Math.PI / 2;
boundary.position.y = 0.02;
scene.add(boundary);

const clouds = new THREE.Group();
scene.add(clouds);
for (let i = 0; i < 12; i++) {
  const puff = new THREE.Mesh(
    new THREE.SphereGeometry(1.4 + Math.random(), 16, 16),
    new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
  );
  puff.position.set(
    (Math.random() - 0.5) * 60,
    12 + Math.random() * 6,
    -15 - Math.random() * 30
  );
  clouds.add(puff);
}

// Game state
const clock = new THREE.Clock();
const ballStart = new THREE.Vector3(0, 0.75, 16);
const strikeZoneZ = 1.4;
let ballVelocity = new THREE.Vector3();
let ballInFlight = false;
let ballHit = false;
let timeSinceLastBall = 0;
let nextDeliveryDelay = THREE.MathUtils.randFloat(1.1, 1.6);
let swingTimer = 0;
let isSwinging = false;
const swingDuration = 0.45;
const maxSwingAngle = Math.PI / 3.4;
const worldContactPoint = new THREE.Vector3();
const batQuaternion = new THREE.Quaternion();

const state = {
  runs: 0,
  streak: 0,
  ballsFaced: 0,
};

function updateHud(message) {
  runsElement.textContent = state.runs;
  streakElement.textContent = state.streak;
  ballsElement.textContent = state.ballsFaced;
  if (message) {
    messageElement.textContent = message;
  }
}

function readyBall() {
  ball.position.copy(ballStart);
  ballVelocity.set(0, 0, 0);
  ballInFlight = false;
  ballHit = false;
  timeSinceLastBall = 0;
  nextDeliveryDelay = THREE.MathUtils.randFloat(1.1, 1.8);
}

function launchBall() {
  ballInFlight = true;
  ballHit = false;
  state.ballsFaced += 1;
  timeSinceLastBall = 0;
  const lateralOffset = (Math.random() - 0.5) * 1.8;
  const releaseHeight = 0.8 + Math.random() * 0.25;
  ball.position.set(lateralOffset, releaseHeight, 16);

  const target = new THREE.Vector3(0, 0.7 + Math.random() * 0.2, -0.5);
  const direction = target.clone().sub(ball.position).normalize();
  const pace = THREE.MathUtils.randFloat(11, 15);
  ballVelocity.copy(direction.multiplyScalar(pace));
  updateHud();
}

function registerHit(power) {
  ballHit = true;
  state.streak += 1;
  const baseRuns = power > 16 ? 4 : 2;
  const airborneBonus = ballVelocity.y > 8 ? 2 : 0;
  const runs = Math.min(6, baseRuns + airborneBonus);
  state.runs += runs;
  updateHud(`Timed it! You scored ${runs} run${runs === 1 ? "" : "s"}.`);
}

function prepareNextDelivery(message, resetStreak = false) {
  if (resetStreak) {
    state.streak = 0;
  }
  updateHud(message);
  readyBall();
}

function registerMiss(message = "Bowled! Watch the line.") {
  prepareNextDelivery(message, true);
}

function swingBat() {
  if (isSwinging) return;
  isSwinging = true;
  swingTimer = 0;
}

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    swingBat();
  }
});

document.addEventListener("pointerdown", swingBat);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  clouds.rotation.z += delta * 0.02;

  if (isSwinging) {
    swingTimer += delta;
    const progress = Math.min(swingTimer / swingDuration, 1);
    const swingAngle = Math.sin(progress * Math.PI) * maxSwingAngle;
    batPivot.rotation.x = -swingAngle;

    if (progress >= 1) {
      isSwinging = false;
      batPivot.rotation.x = 0;
    }
  }

  if (!ballInFlight) {
    timeSinceLastBall += delta;
    if (timeSinceLastBall > nextDeliveryDelay) {
      launchBall();
    }
  } else {
    ballVelocity.y -= 18 * delta; // gravity
    ball.position.addScaledVector(ballVelocity, delta);

    if (!ballHit && isSwinging) {
      batContact.getWorldPosition(worldContactPoint);
      const distance = worldContactPoint.distanceTo(ball.position);
      if (distance < 0.65 && ball.position.z < strikeZoneZ) {
        const batForward = new THREE.Vector3(0, 0, -1);
        batPivot.getWorldQuaternion(batQuaternion);
        batForward.applyQuaternion(batQuaternion);
        const shotDirection = batForward
          .clone()
          .setY(0)
          .normalize()
          .multiplyScalar(THREE.MathUtils.randFloat(12, 17));
        shotDirection.x += THREE.MathUtils.randFloatSpread(4);
        ballVelocity.copy(shotDirection);
        ballVelocity.y = THREE.MathUtils.randFloat(8, 11);
        registerHit(ballVelocity.length());
      }
    }

    // Missed the ball
    if (!ballHit && ball.position.z < -3) {
      registerMiss();
    }

    // Ball comes to rest
    if (ballHit && ball.position.y <= 0.22) {
      ball.position.y = 0.22;
      ballVelocity.multiplyScalar(0.6);
      ballVelocity.y = Math.abs(ballVelocity.y) * 0.4;
      if (ballVelocity.length() < 1.5) {
        prepareNextDelivery("Ready for the next delivery.");
      }
    }

    // Out of bounds safety
    if (ball.position.length() > 120 || ball.position.y < -5) {
      if (ballHit) {
        prepareNextDelivery("That one is lost in the stands!");
      } else {
        registerMiss("That one is lost in the stands!");
      }
    }
  }

  renderer.render(scene, camera);
}

readyBall();
updateHud("Press spacebar or click to swing!");
animate();
