import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PARTS_DATA, getPartData, setBackendParts } from './partsData.js';
import { LAB_SLOTS } from './labSlots.js';
import { ACTIVE_MODEL_CONFIG, DEBUG_MODEL } from './models/index.js';
import { api, pageResults } from './api.js';
import { initializeDataApplication } from './appPanel.js';
import { getSelectedCarParts, resolveModelUrl } from './appState.js';
import { AdaptiveQualityController } from './performanceQuality.js';
import {
  loadConfiguredModel,
  applyPresentationOffset,
  applyExplosion,
  createModelDebugOverlay
} from './modelAdapter.js';
import {
  buildLabCatalog,
  createLabExhibits,
  setExhibitEmphasis,
  setExhibitHover
} from './labSystem.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

const DOM = {
  body: document.body,
  container: document.querySelector('#canvas-container'),
  loading: document.querySelector('#loading'),
  progressFill: document.querySelector('#progress-fill'),
  progressText: document.querySelector('#progress-text'),
  header: document.querySelector('#site-header'),
  story: document.querySelector('#story'),
  storyProgress: document.querySelector('#story-progress'),
  explodePercent: document.querySelector('#explode-percent'),
  enterLab: document.querySelector('#enter-lab'),
  labUi: document.querySelector('#lab-ui'),
  partsList: document.querySelector('#parts-list'),
  exploredCount: document.querySelector('#explored-count'),
  hoverLabel: document.querySelector('#hover-label'),
  controlsHint: document.querySelector('#controls-hint'),
  infoPanel: document.querySelector('#info-panel'),
  closeInfo: document.querySelector('#close-info'),
  backToLab: document.querySelector('#back-to-lab'),
  partIndex: document.querySelector('#part-index'),
  partCategory: document.querySelector('#part-category'),
  partTitle: document.querySelector('#part-title'),
  partDescription: document.querySelector('#part-description'),
  partFunction: document.querySelector('#part-function'),
  partApiDetails: document.querySelector('#part-api-details'),
  partObjectName: document.querySelector('#part-object-name'),
  shutter: document.querySelector('#transition-shutter')
};

const qualityController = new AdaptiveQualityController(applyQualityProfile);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
const initialContext = renderer.getContext();
const initialRendererInfo = initialContext.getExtension('WEBGL_debug_renderer_info');
qualityController.applyRendererHint(
  initialRendererInfo
    ? initialContext.getParameter(initialRendererInfo.UNMASKED_RENDERER_WEBGL)
    : initialContext.getParameter(initialContext.RENDERER)
);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualityController.profile.maxPixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.outputColorSpace = THREE.SRGBColorSpace;
DOM.container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060809);
scene.fog = new THREE.Fog(0x060809, 11, 28);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment(renderer);
scene.environment = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;
roomEnvironment.dispose();
pmremGenerator.dispose();

const camera = new THREE.PerspectiveCamera(43, window.innerWidth / window.innerHeight, 0.08, 80);
camera.position.set(6.7, 2.4, 7.5);
camera.lookAt(0, 0.15, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false;
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.enablePan = false;
controls.minPolarAngle = 0.25;
controls.maxPolarAngle = Math.PI * 0.82;
controls.minDistance = 2;
controls.maxDistance = 15;
controls.target.set(0, 0.2, -3.8);

const ambientLight = new THREE.HemisphereLight(0xdce8ef, 0x101416, 0.72);
const keyLight = new THREE.DirectionalLight(0xfff3e2, 3.2);
keyLight.position.set(5, 8, 6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.setScalar(qualityController.profile.shadowMapSize);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 35;
keyLight.shadow.camera.left = -10;
keyLight.shadow.camera.right = 10;
keyLight.shadow.camera.top = 10;
keyLight.shadow.camera.bottom = -10;
keyLight.shadow.bias = -0.0001;
const fillLight = new THREE.DirectionalLight(0xa9c6d8, 1.15);
fillLight.position.set(-5, 2.5, 5);
const rimLight = new THREE.DirectionalLight(0x9fc4e8, 2.35);
rimLight.position.set(-5, 4.5, -7);
const topLight = new THREE.RectAreaLight(0xf0f5ef, 4.6, 6, 3.5);
topLight.position.set(0, 6.5, 0.5);
topLight.lookAt(0, 0, 0);
const accentLight = new THREE.PointLight(0xc9ff48, 0.22, 12, 2);
accentLight.position.set(0, -0.8, 1.5);
scene.add(ambientLight, keyLight, fillLight, rimLight, topLight, accentLight);
qualityController.start();

const introEnvironment = new THREE.Group();
const introFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(34, 34),
  new THREE.MeshStandardMaterial({ color: 0x070908, roughness: 0.72, metalness: 0.18 })
);
introFloor.rotation.x = -Math.PI / 2;
introFloor.position.y = -1.48;
introFloor.receiveShadow = true;
const introPlatform = new THREE.Mesh(
  new THREE.CylinderGeometry(3.2, 3.35, 0.12, 96),
  new THREE.MeshStandardMaterial({ color: 0x060908, roughness: 0.68, metalness: 0.28 })
);
introPlatform.position.y = -1.43;
introPlatform.receiveShadow = true;
introEnvironment.add(introFloor, introPlatform);
scene.add(introEnvironment);

let model = null;
let componentRegistry = null;
let modelAudit = null;
let labAudit = null;
let availableParts = [];
let exhibits = new Map();
let interactiveMeshes = [];
let labEnvironment = null;
let storyTrigger = null;
let storyTarget = 0;
let storyCurrent = 0;
let labActive = false;
let interactionLocked = false;
let selectedComponentId = null;
let hoveredComponentId = null;
let previousView = null;
let activeCameraTimeline = null;
const visited = new Set();
const pressedKeys = new Set();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();
const storyLookTarget = new THREE.Vector3();
const pointerStart = new THREE.Vector2();
const pointerEnd = new THREE.Vector2();
const drawingBufferSize = new THREE.Vector2();
const keyboardForward = new THREE.Vector3();
const keyboardRight = new THREE.Vector3();
const keyboardMovement = new THREE.Vector3();
const keyboardNext = new THREE.Vector3();
const focusLightOffset = new THREE.Vector3(1.4, 2.2, 2.1);
const pendingPointer = { clientX: 0, clientY: 0, pointerType: '' };
let pointerMovePending = false;
let storyInitialized = false;
let lastExplodeProgress = Number.NaN;
let lastExplodePercent = -1;
let lastStoryPercent = -1;
let resizeFrame = 0;

function applyQualityProfile(profile) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.maxPixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = profile.shadowsEnabled;
  if (keyLight.shadow.mapSize.x !== profile.shadowMapSize) {
    keyLight.shadow.map?.dispose();
    keyLight.shadow.map = null;
    keyLight.shadow.mapSize.setScalar(profile.shadowMapSize);
  }
  renderer.shadowMap.needsUpdate = true;
  DOM.body.dataset.quality = profile.id;
}

function clamp01(value) {
  return THREE.MathUtils.clamp(value, 0, 1);
}

function escapeMarkup(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function smootherStep(value) {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function mixVector(from, to, progress, target) {
  return target.set(
    THREE.MathUtils.lerp(from[0], to[0], progress),
    THREE.MathUtils.lerp(from[1], to[1], progress),
    THREE.MathUtils.lerp(from[2], to[2], progress)
  );
}

function createLabEnvironment() {
  const room = new THREE.Group();
  room.visible = false;

  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x05080a, roughness: 0.7, metalness: 0.16 });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x0b0f12, roughness: 0.86, metalness: 0.08, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 32), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -2.35, -3);
  floor.receiveShadow = true;
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), wallMaterial);
  backWall.position.set(0, 3, -11.2);
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), wallMaterial);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-9, 3, -2);
  const rightWall = leftWall.clone();
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.x = 9;
  room.add(floor, backWall, leftWall, rightWall);

  const grid = new THREE.GridHelper(28, 28, 0x253036, 0x141b1e);
  grid.position.set(0, -2.32, -3);
  const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
  gridMaterials.forEach((material) => { material.transparent = true; material.opacity = 0.26; });
  room.add(grid);

  const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x06090a, roughness: 0.58, metalness: 0.46 });
  const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x93b99d, transparent: true, opacity: 0.16 });
  availableParts.forEach((part) => {
    const { slot } = part;
    const platformGeometry = new THREE.CylinderGeometry(slot.pedestalRadius, slot.pedestalRadius * 1.035, slot.pedestalHeight, 64);
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(...slot.position);
    platform.receiveShadow = true;
    const edge = new THREE.Mesh(new THREE.TorusGeometry(slot.pedestalRadius * 0.94, 0.012, 8, 64), edgeMaterial);
    edge.rotation.x = Math.PI / 2;
    edge.position.set(slot.position[0], slot.position[1] + slot.pedestalHeight * 0.52, slot.position[2]);
    room.add(platform, edge);
  });

  const frameMaterial = new THREE.MeshBasicMaterial({ color: 0xc9ff48, transparent: true, opacity: 0.16 });
  const frameGeometry = new THREE.BoxGeometry(0.018, 6.5, 0.018);
  [-6, 0, 6].forEach((x) => {
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(x, 2, -11.05);
    room.add(frame);
  });

  scene.add(room);
  return room;
}

function buildPartsNavigation() {
  DOM.partsList.replaceChildren();
  DOM.exploredCount.textContent = `00 / ${String(availableParts.length).padStart(2, '0')}`;
  const fragment = document.createDocumentFragment();
  availableParts.forEach((part, index) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.componentId = part.componentId;
    button.innerHTML = `<span class="num">${String(index + 1).padStart(2, '0')}</span><span class="name">${part.title.toUpperCase()}</span><i class="seen"></i>`;
    button.addEventListener('click', () => focusComponent(part.componentId));
    item.appendChild(button);
    fragment.appendChild(item);
  });
  DOM.partsList.appendChild(fragment);
}

function updateStoryScene(progress) {
  const p = clamp01(progress);
  let cameraPosition;
  let target;

  if (p <= 0.2) {
    const t = smootherStep(p / 0.2);
    cameraPosition = mixVector([5.2, 1.72, 6.15], [4.45, 1.35, 5.45], t, camera.position);
    target = mixVector([0, 0.16, 0], [0, 0.22, 0], t, storyLookTarget);
  } else if (p <= 0.4) {
    const t = smootherStep((p - 0.2) / 0.2);
    cameraPosition = mixVector([4.45, 1.35, 5.45], [3.6, 0.95, 4.25], t, camera.position);
    target = mixVector([0, 0.22, 0], [0, 0.12, 0], t, storyLookTarget);
  } else if (p <= 0.7) {
    const t = smootherStep((p - 0.4) / 0.3);
    cameraPosition = mixVector([3.6, 0.95, 4.25], [5.35, 2.0, 6.7], t, camera.position);
    target = mixVector([0, 0.12, 0], [0, 0.28, 0], t, storyLookTarget);
  } else {
    const t = smootherStep((p - 0.7) / 0.3);
    cameraPosition = mixVector([5.35, 2.0, 6.7], [-3.9, 1.35, 6.3], t, camera.position);
    target = mixVector([0, 0.28, 0], [0, 0.18, -0.15], t, storyLookTarget);
  }
  camera.position.copy(cameraPosition);
  camera.lookAt(target);

  const explode = clamp01((p - 0.4) / 0.3);
  applyExplosion(componentRegistry, explode);
  if (!Number.isFinite(lastExplodeProgress) || Math.abs(explode - lastExplodeProgress) > 0.00001) {
    lastExplodeProgress = explode;
    renderer.shadowMap.needsUpdate = true;
  }
  const explodePercent = Math.round(explode * 100);
  if (explodePercent !== lastExplodePercent) {
    lastExplodePercent = explodePercent;
    DOM.explodePercent.textContent = `${String(explodePercent).padStart(3, '0')}%`;
  }
  const storyPercent = Math.round(p * 100);
  if (storyPercent !== lastStoryPercent) {
    lastStoryPercent = storyPercent;
    DOM.storyProgress.style.width = `${storyPercent}%`;
  }
}

function initScrollStory() {
  storyTrigger = ScrollTrigger.create({
    trigger: DOM.story,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => { storyTarget = self.progress; }
  });

  gsap.to('.story-section--intro .reveal', {
    opacity: 0,
    y: -34,
    stagger: 0.025,
    ease: 'none',
    scrollTrigger: { trigger: '.story-section--intro', start: 'top top', end: 'bottom 55%', scrub: true }
  });

  document.querySelectorAll('.chapter-copy').forEach((copy) => {
    gsap.fromTo(copy, { opacity: 0, y: 55 }, {
      opacity: 1,
      y: 0,
      ease: 'none',
      scrollTrigger: { trigger: copy.closest('.story-section'), start: 'top 78%', end: 'top 38%', scrub: true }
    });
  });
  ScrollTrigger.refresh();
}

function revealIntro() {
  const introTarget = { x: 0, y: 0.15, z: 0 };
  const timeline = gsap.timeline({
    defaults: { ease: 'power3.out' },
    onComplete: () => {
      DOM.body.classList.remove('is-loading');
      initScrollStory();
    }
  });
  timeline
    .to(DOM.loading, { opacity: 0, duration: 0.75, onComplete: () => DOM.loading.remove() })
    .to(renderer, { toneMappingExposure: 0.92, duration: 1.8 }, 0.15)
    .to(ambientLight, { intensity: 0.76, duration: 1.7 }, 0.15)
    .to(keyLight, { intensity: 2.75, duration: 1.7 }, 0.15)
    .to(fillLight, { intensity: 0.95, duration: 1.7 }, 0.15)
    .to(rimLight, { intensity: 2.3, duration: 1.7 }, 0.15)
    .to(topLight, { intensity: 3.6, duration: 1.7 }, 0.15)
    .to(accentLight, { intensity: 0.2, duration: 1.7 }, 0.15)
    .to(camera.position, {
      x: 5.2, y: 1.72, z: 6.15, duration: 2.1,
      onUpdate: () => camera.lookAt(introTarget)
    }, 0.05)
    .to(DOM.header, { opacity: 1, duration: 0.8 }, 0.45)
    .fromTo('.reveal', { opacity: 0, y: 38 }, { opacity: 1, y: 0, duration: 0.95, stagger: 0.1 }, 0.55);
}

function setupLab() {
  applyExplosion(componentRegistry, 0);
  if (model) {
    model.rotation.y = 0;
    model.updateMatrixWorld(true);
  }
  if (!labEnvironment) labEnvironment = createLabEnvironment();
  labEnvironment.visible = true;
  ({ exhibits, interactiveMeshes, labAudit } = createLabExhibits(scene, model, componentRegistry, availableParts));

  introEnvironment.visible = false;
  scene.background.set(0x070a0c);
  scene.fog.color.set(0x070a0c);
  scene.fog.near = 12;
  scene.fog.far = 30;
  renderer.toneMappingExposure = 0.86;
  ambientLight.intensity = 0.72;
  keyLight.intensity = 2.35;
  keyLight.color.set(0xf7eee4);
  fillLight.intensity = 0.92;
  rimLight.intensity = 2.25;
  rimLight.color.set(0x9fcce8);
  topLight.intensity = 3.1;
  accentLight.intensity = 0.14;

  camera.position.set(0, 3.4, 10.5);
  controls.target.set(0, -0.85, -4.7);
  controls.minDistance = 2.5;
  controls.maxDistance = 17;
  controls.update();
  renderer.shadowMap.needsUpdate = true;
}

function enterLab() {
  if (!model || labActive || interactionLocked) return;
  interactionLocked = true;
  DOM.body.classList.add('is-transitioning');
  if (storyTrigger) storyTrigger.disable(false);
  ScrollTrigger.getAll().forEach((trigger) => trigger.disable(false));
  DOM.shutter.style.display = 'grid';

  const panels = DOM.shutter.querySelectorAll('span');
  const label = DOM.shutter.querySelector('p');
  const transition = gsap.timeline();
  transition
    .to(DOM.story, { opacity: 0, duration: 0.45, ease: 'power2.in' })
    .to(DOM.header, { opacity: 0, duration: 0.35 }, 0)
    .to(panels, { scaleY: 1, duration: 0.65, ease: 'power3.inOut' }, 0.05)
    .to(label, { opacity: 1, duration: 0.25 }, 0.48)
    .add(() => {
      setupLab();
      DOM.story.style.display = 'none';
      DOM.header.style.display = 'none';
      DOM.labUi.classList.add('is-active');
      DOM.labUi.setAttribute('aria-hidden', 'false');
      gsap.set(DOM.labUi, { opacity: 0 });
    }, 0.72)
    .to(label, { opacity: 0, duration: 0.25 }, 0.92)
    .to(panels, { scaleY: 0, duration: 0.8, ease: 'power3.inOut' }, 1.0)
    .to(DOM.labUi, { opacity: 1, duration: 0.65 }, 1.13)
    .to(camera.position, {
      z: 8.7,
      y: 3.05,
      duration: 1.25,
      ease: 'power2.out',
      onUpdate: () => camera.lookAt(controls.target)
    }, 0.82)
    .add(() => {
      labActive = true;
      interactionLocked = false;
      controls.enabled = true;
      DOM.body.classList.remove('is-transitioning');
      DOM.body.classList.add('is-lab');
      DOM.shutter.style.display = 'none';
    });
}

function getPanelHiddenTransform() {
  return window.innerWidth <= 900 ? 'translateY(102%)' : 'translateX(102%)';
}

function updateInfoPanel(part) {
  const index = availableParts.findIndex((item) => item.componentId === part.componentId) + 1;
  DOM.partIndex.textContent = String(index).padStart(2, '0');
  DOM.partCategory.textContent = part.category.toUpperCase();
  DOM.partTitle.textContent = part.title.toUpperCase();
  DOM.partDescription.textContent = part.description;
  DOM.partFunction.textContent = part.function;
  DOM.partObjectName.textContent = `COMPONENT ID: ${part.componentId}`;
  DOM.partApiDetails.innerHTML = part.id
    ? '<p>LOADING SPECIFICATIONS, RELATED PARTS AND SOURCES…</p>'
    : '<p>LOCAL GLB FALLBACK DATA · NO MATCHING CARPART FOR THE SELECTED CAR</p>';
  if (part.id) loadPartContext(part);
}

async function loadPartContext(part) {
  const requestedComponentId = part.componentId;
  try {
    const [specificationsPayload, relatedPayload, sourcesPayload] = await Promise.all([
      api.partSpecifications(part.id),
      api.relatedCarParts(part.id),
      api.partSources(part.id)
    ]);
    if (selectedComponentId !== requestedComponentId) return;
    const specifications = pageResults(specificationsPayload);
    const related = pageResults(relatedPayload);
    const sources = pageResults(sourcesPayload);
    const specificationRows = specifications.length
      ? `<dl>${specifications.map((item) => `<div><dt>${escapeMarkup(item.name)}</dt><dd>${escapeMarkup(item.value)}</dd></div>`).join('')}</dl>`
      : '<p>NO SPECIFICATIONS PUBLISHED</p>';
    const sourceRows = sources.length
      ? `<dl>${sources.map((item) => `<div><dt>SOURCE</dt><dd><a href="${escapeMarkup(item.url)}" target="_blank" rel="noreferrer">${escapeMarkup(item.title)}</a></dd></div>`).join('')}</dl>`
      : '';
    DOM.partApiDetails.innerHTML = `${specificationRows}<p>${related.length} RELATED PART${related.length === 1 ? '' : 'S'}</p>${sourceRows}`;
  } catch (error) {
    if (selectedComponentId === requestedComponentId) DOM.partApiDetails.innerHTML = `<p>${escapeMarkup(error.message)}</p>`;
  }
}

function updateVisitedUi(componentId) {
  visited.add(componentId);
  DOM.exploredCount.textContent = `${String(visited.size).padStart(2, '0')} / ${String(availableParts.length).padStart(2, '0')}`;
  DOM.partsList.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('is-visited', visited.has(button.dataset.componentId));
    button.classList.toggle('is-active', button.dataset.componentId === componentId);
  });
}

function focusComponent(componentId) {
  if (!labActive || interactionLocked || !exhibits.has(componentId)) return;
  if (selectedComponentId === componentId) return;
  if (selectedComponentId) {
    returnToLab(() => focusComponent(componentId), 0.55);
    return;
  }

  const part = getPartData(componentId);
  const holder = exhibits.get(componentId);
  if (!part || !holder) return;
  interactionLocked = true;
  selectedComponentId = componentId;
  clearHover();
  controls.enabled = false;
  previousView = { position: camera.position.clone(), target: controls.target.clone() };
  updateInfoPanel(part);
  updateVisitedUi(componentId);
  setExhibitEmphasis(exhibits, componentId);
  DOM.controlsHint.classList.add('is-hidden');
  DOM.infoPanel.setAttribute('aria-hidden', 'false');

  const box = new THREE.Box3().setFromObject(holder);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const center = holder.userData.cameraTarget?.clone() || sphere.center.clone();
  const radius = Math.max(sphere.radius, 0.15);
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  const limitingFov = Math.min(verticalFov, horizontalFov);
  const focusDistance = radius / Math.sin(limitingFov / 2) * 1.18;
  const cameraDirection = holder.userData.cameraDirection?.clone() || new THREE.Vector3(0.5, 0.22, 1).normalize();
  const destination = center.clone().addScaledVector(cameraDirection, focusDistance);
  accentLight.color.set(0xeaf4ff);
  accentLight.position.copy(center).add(focusLightOffset);
  gsap.to(accentLight, { intensity: 8, duration: 0.8, ease: 'power2.out' });
  setExhibitHover(holder, true, 0.14);

  const timeline = gsap.timeline({
    defaults: { duration: 1.35, ease: 'power3.inOut' },
    onUpdate: () => controls.update(),
    onComplete: () => {
      activeCameraTimeline = null;
      controls.target.copy(center);
      controls.minDistance = Math.max(radius * 0.85, 0.35);
      controls.maxDistance = Math.max(radius * 5, focusDistance * 1.8);
      controls.enabled = true;
      interactionLocked = false;
    }
  });
  activeCameraTimeline = timeline;
  timeline
    .to(camera.position, { x: destination.x, y: destination.y, z: destination.z }, 0)
    .to(controls.target, { x: center.x, y: center.y, z: center.z }, 0)
    .to(DOM.infoPanel, { transform: 'translate(0, 0)', duration: 0.72, ease: 'power3.out' }, 0.62);
}

function returnToLab(afterReturn = null, duration = 1.15) {
  if (!selectedComponentId || !previousView) {
    if (afterReturn) afterReturn();
    return;
  }
  if (interactionLocked && activeCameraTimeline) {
    activeCameraTimeline.kill();
    activeCameraTimeline = null;
    interactionLocked = false;
  }
  if (interactionLocked) return;
  interactionLocked = true;
  controls.enabled = false;
  DOM.infoPanel.setAttribute('aria-hidden', 'true');
  if (exhibits.has(selectedComponentId)) setExhibitHover(exhibits.get(selectedComponentId), false);
  gsap.to(accentLight, {
    intensity: 0.14,
    duration: 0.5,
    ease: 'power2.in',
    onComplete: () => {
      accentLight.color.set(0xc9ff48);
      accentLight.position.set(0, -0.8, 1.5);
    }
  });
  DOM.partsList.querySelectorAll('button').forEach((button) => button.classList.remove('is-active'));
  const destination = previousView;
  const timeline = gsap.timeline({
    defaults: { duration, ease: 'power3.inOut' },
    onUpdate: () => controls.update(),
    onComplete: () => {
      activeCameraTimeline = null;
      setExhibitEmphasis(exhibits, null);
      selectedComponentId = null;
      previousView = null;
      controls.minDistance = 2.5;
      controls.maxDistance = 17;
      controls.enabled = true;
      interactionLocked = false;
      if (afterReturn) afterReturn();
    }
  });
  activeCameraTimeline = timeline;
  timeline
    .to(DOM.infoPanel, { transform: getPanelHiddenTransform(), duration: Math.min(duration, 0.65), ease: 'power2.in' }, 0)
    .to(camera.position, { x: destination.position.x, y: destination.position.y, z: destination.position.z }, 0)
    .to(controls.target, { x: destination.target.x, y: destination.target.y, z: destination.target.z }, 0);
}

function setPointerFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function getComponentUnderPointer(event) {
  setPointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(interactiveMeshes, false)[0];
  return hit ? componentRegistry.getComponentIdForObject(hit.object) : null;
}

function getComponentPointerTarget(componentId) {
  const holder = exhibits.get(componentId);
  if (!holder) return null;
  scene.updateMatrixWorld(true);
  const meshes = [];
  holder.traverse((object) => { if (object.isMesh) meshes.push(object); });
  const rect = renderer.domElement.getBoundingClientRect();

  for (const mesh of meshes) {
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
    const center = mesh.geometry.boundingSphere.center.clone().applyMatrix4(mesh.matrixWorld);
    const ndc = center.project(camera);
    if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1 || ndc.z < -1 || ndc.z > 1) continue;
    raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
    const hit = raycaster.intersectObjects(interactiveMeshes, false)[0];
    if (hit && componentRegistry.getComponentIdForObject(hit.object) === componentId) {
      return {
        x: rect.left + (ndc.x + 1) * 0.5 * rect.width,
        y: rect.top + (1 - ndc.y) * 0.5 * rect.height
      };
    }
  }
  return null;
}

function clearHover() {
  if (hoveredComponentId && exhibits.has(hoveredComponentId)) setExhibitHover(exhibits.get(hoveredComponentId), false);
  hoveredComponentId = null;
  DOM.hoverLabel.style.opacity = '0';
  renderer.domElement.style.cursor = '';
}

function queuePointerMove(event) {
  pendingPointer.clientX = event.clientX;
  pendingPointer.clientY = event.clientY;
  pendingPointer.pointerType = event.pointerType;
  pointerMovePending = true;
}

function processPointerMove() {
  pointerMovePending = false;
  if (!labActive || interactionLocked || selectedComponentId || pendingPointer.pointerType === 'touch') return false;
  const componentId = getComponentUnderPointer(pendingPointer);
  if (componentId !== hoveredComponentId) {
    if (hoveredComponentId && exhibits.has(hoveredComponentId)) setExhibitHover(exhibits.get(hoveredComponentId), false);
    hoveredComponentId = componentId;
    if (componentId && exhibits.has(componentId)) setExhibitHover(exhibits.get(componentId), true);
  }
  if (!componentId) {
    clearHover();
    return true;
  }
  const part = getPartData(componentId);
  DOM.hoverLabel.querySelector('strong').textContent = part.title.toUpperCase();
  DOM.hoverLabel.style.left = `${pendingPointer.clientX}px`;
  DOM.hoverLabel.style.top = `${pendingPointer.clientY}px`;
  DOM.hoverLabel.style.opacity = '1';
  renderer.domElement.style.cursor = 'pointer';
  return true;
}

function moveWithKeyboard(delta) {
  if (!labActive || selectedComponentId || interactionLocked || !pressedKeys.size) return false;
  camera.getWorldDirection(keyboardForward);
  keyboardForward.y = 0;
  keyboardForward.normalize();
  keyboardRight.crossVectors(keyboardForward, camera.up).normalize();
  keyboardMovement.set(0, 0, 0);
  if (pressedKeys.has('KeyW')) keyboardMovement.add(keyboardForward);
  if (pressedKeys.has('KeyS')) keyboardMovement.sub(keyboardForward);
  if (pressedKeys.has('KeyD')) keyboardMovement.add(keyboardRight);
  if (pressedKeys.has('KeyA')) keyboardMovement.sub(keyboardRight);
  if (!keyboardMovement.lengthSq()) return false;
  keyboardMovement.normalize().multiplyScalar(delta * 1.8);
  keyboardNext.copy(camera.position).add(keyboardMovement);
  keyboardNext.x = THREE.MathUtils.clamp(keyboardNext.x, -7.5, 7.5);
  keyboardNext.z = THREE.MathUtils.clamp(keyboardNext.z, -9.5, 8.5);
  keyboardMovement.subVectors(keyboardNext, camera.position);
  camera.position.add(keyboardMovement);
  controls.target.add(keyboardMovement);
  return true;
}

function render() {
  const delta = Math.min(clock.getDelta(), 0.05);
  let shouldRender = DOM.body.classList.contains('is-loading')
    || DOM.body.classList.contains('is-transitioning')
    || interactionLocked;
  if (!labActive && model && !DOM.body.classList.contains('is-loading')) {
    const difference = storyTarget - storyCurrent;
    if (Math.abs(difference) > 0.0001) {
      storyCurrent += difference * Math.min(1, delta * 5.2);
      updateStoryScene(storyCurrent);
      storyInitialized = true;
      shouldRender = true;
    } else if (!storyInitialized || storyCurrent !== storyTarget) {
      storyCurrent = storyTarget;
      updateStoryScene(storyCurrent);
      storyInitialized = true;
      shouldRender = true;
    }
  }
  if (labActive) {
    if (pointerMovePending) shouldRender = processPointerMove() || shouldRender;
    shouldRender = moveWithKeyboard(delta) || shouldRender;
    if (controls.enabled) shouldRender = controls.update() || shouldRender;
  }
  if (shouldRender) {
    renderer.render(scene, camera);
    qualityController.recordFrame(delta * 1000);
  }
}

async function loadInitialModel() {
  await initializeDataApplication();
  setBackendParts(getSelectedCarParts());
  const fallbackPath = ACTIVE_MODEL_CONFIG.modelPath;
  const requestedPath = await resolveModelUrl(fallbackPath);
  let modelConfig = { ...ACTIVE_MODEL_CONFIG, modelPath: requestedPath };
  const onProgress = (event) => {
    const total = event.total || modelConfig.estimatedFileSize;
    const percent = Math.min(99, Math.round((event.loaded / total) * 100));
    DOM.progressFill.style.width = `${percent}%`;
    DOM.progressText.textContent = `${percent}%`;
  };
  let result;
  try {
    result = await loadConfiguredModel(modelConfig, onProgress, DEBUG_MODEL);
  } catch (error) {
    if (requestedPath === fallbackPath) throw error;
    modelConfig = { ...ACTIVE_MODEL_CONFIG, modelPath: fallbackPath };
    DOM.progressText.textContent = 'LOADING FALLBACK MODEL';
    result = await loadConfiguredModel(modelConfig, onProgress, DEBUG_MODEL);
  }

  model = result.model;
  componentRegistry = result.registry;
  modelAudit = result.audit;
  applyPresentationOffset(model, modelConfig, window.innerWidth <= 900);
  componentRegistry.refreshAllBounds();
  availableParts = buildLabCatalog(componentRegistry, modelConfig, PARTS_DATA, LAB_SLOTS);
  buildPartsNavigation();
  labEnvironment = createLabEnvironment();
  scene.add(model);
  createModelDebugOverlay(scene, componentRegistry, DEBUG_MODEL);
  window.__AUTO_ANATOMY_3D__ = {
    modelAudit,
    modelId: modelConfig.id,
    modelPath: modelConfig.modelPath,
    components: componentRegistry.summary(),
    availableComponents: availableParts.map((part) => part.componentId),
    getLabAudit: () => labAudit,
    getInteractionState: () => ({ labActive, interactionLocked, selectedComponentId, hoveredComponentId }),
    getCameraState: () => ({ position: camera.position.toArray(), target: controls.target.toArray() }),
    getPerformanceSnapshot: () => {
      renderer.getDrawingBufferSize(drawingBufferSize);
      const context = renderer.getContext();
      const rendererInfo = context.getExtension('WEBGL_debug_renderer_info');
      return {
        pixelRatio: renderer.getPixelRatio(),
        drawingBuffer: drawingBufferSize.toArray(),
        render: { ...renderer.info.render },
        memory: { ...renderer.info.memory },
        programs: renderer.info.programs?.length || 0,
        gpuRenderer: rendererInfo ? context.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER),
        shadowMapSize: keyLight.shadow.mapSize.toArray(),
        shadowAutoUpdate: renderer.shadowMap.autoUpdate,
        shadowNeedsUpdate: renderer.shadowMap.needsUpdate,
        interactiveMeshCount: interactiveMeshes.length,
        shadowCasterCount: (() => {
          let count = 0;
          scene.traverse((object) => { if (object.isMesh && object.castShadow && object.visible) count += 1; });
          return count;
        })(),
        quality: qualityController.state()
      };
    },
    getLabPointerTargets: () => availableParts.map((part) => ({
      componentId: part.componentId,
      target: getComponentPointerTarget(part.componentId)
    })),
    verifyLabExhibits: () => availableParts.map((part) => {
      const holder = exhibits.get(part.componentId);
      const meshes = [];
      holder?.traverse((node) => { if (node.isMesh) meshes.push(node); });
      const box = holder ? new THREE.Box3().setFromObject(holder) : null;
      const platformTop = part.slot.position[1] + part.slot.pedestalHeight * 0.5;
      const pivotScale = holder?.children[0]?.scale;
      return {
        componentId: part.componentId,
        exists: Boolean(holder),
        meshCount: meshes.length,
        visible: Boolean(holder?.visible && meshes.length && meshes.every((mesh) => mesh.visible)),
        uniformScale: Boolean(pivotScale && Math.abs(pivotScale.x - pivotScale.y) < 1e-8 && Math.abs(pivotScale.y - pivotScale.z) < 1e-8),
        abovePedestal: Boolean(box && box.min.y >= platformTop - 0.01),
        hoverable: Boolean(meshes.length && meshes.every((mesh) => mesh.userData.componentId === part.componentId && interactiveMeshes.includes(mesh))),
        clickable: Boolean(holder && getPartData(part.componentId)),
        cameraTargetValid: Boolean(holder?.userData.cameraTarget?.toArray().every(Number.isFinite))
      };
    }),
    setExplodeProgress: (progress) => applyExplosion(componentRegistry, progress),
    getComponentTransforms: () => componentRegistry.values().map((component) => ({
      componentId: component.id,
      position: component.object3D.position.toArray(),
      quaternion: component.object3D.quaternion.toArray(),
      scale: component.object3D.scale.toArray(),
      originalPosition: component.originalTransform.position.toArray(),
      originalQuaternion: component.originalTransform.quaternion.toArray(),
      originalScale: component.originalTransform.scale.toArray(),
      explodedPosition: component.explodedTransform.position.toArray()
    }))
  };
  DOM.progressFill.style.width = '100%';
  DOM.progressText.textContent = '100%';
  revealIntro();
}

loadInitialModel().catch(() => {
  DOM.progressText.textContent = 'MODEL COULD NOT BE LOADED';
  DOM.progressText.style.color = '#ff7b68';
});

window.addEventListener('auto-anatomy:selected-car', (event) => {
  setBackendParts(event.detail?.parts || []);
  if (!componentRegistry) return;
  availableParts = availableParts.map((part) => ({
    ...part,
    ...(getPartData(part.componentId) || {})
  }));
  buildPartsNavigation();
  if (selectedComponentId) {
    const selectedPart = getPartData(selectedComponentId);
    if (selectedPart) updateInfoPanel(selectedPart);
  }
});

DOM.enterLab.addEventListener('click', enterLab);
DOM.closeInfo.addEventListener('click', () => returnToLab());
DOM.backToLab.addEventListener('click', () => returnToLab());
DOM.controlsHint.querySelector('button').addEventListener('click', () => DOM.controlsHint.classList.add('is-hidden'));

renderer.domElement.addEventListener('pointermove', queuePointerMove, { passive: true });
renderer.domElement.addEventListener('pointerleave', () => { pointerMovePending = false; clearHover(); });
renderer.domElement.addEventListener('pointerdown', (event) => pointerStart.set(event.clientX, event.clientY));
renderer.domElement.addEventListener('pointerup', (event) => {
  if (!labActive || interactionLocked || selectedComponentId) return;
  const distance = pointerStart.distanceTo(pointerEnd.set(event.clientX, event.clientY));
  if (distance <= 7) {
    const componentId = getComponentUnderPointer(event);
    if (componentId) focusComponent(componentId);
  }
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && selectedComponentId) returnToLab();
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) pressedKeys.add(event.code);
});
window.addEventListener('keyup', (event) => pressedKeys.delete(event.code));
window.addEventListener('blur', () => pressedKeys.clear());
window.addEventListener('resize', () => {
  if (resizeFrame) return;
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = 0;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualityController.profile.maxPixelRatio));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.needsUpdate = true;
    if (selectedComponentId && DOM.infoPanel.getAttribute('aria-hidden') === 'true') {
      gsap.set(DOM.infoPanel, { transform: getPanelHiddenTransform() });
    }
    ScrollTrigger.refresh();
  });
}, { passive: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    renderer.setAnimationLoop(null);
    return;
  }
  clock.start();
  renderer.shadowMap.needsUpdate = true;
  renderer.setAnimationLoop(render);
});

renderer.setAnimationLoop(render);
