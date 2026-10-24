import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================
const DURATION = 13.0;
let currentTime = 6.4; // Initialized in bloom stage
let isPlaying = true;
let playbackSpeed = 1.0;
let isLooping = true;
let activeCultivar = 'stargazer';
let activeShadingMode = 'realistic';
let activeCamMode = 'cinematic';
let windStrength = 1.0;
let showDewDrops = true;
let showPapillae = true;
let showPollen = true;
let showWireGlow = true;

// DOM Elements
const canvas = document.getElementById('webgl-canvas');
const topProgressBar = document.getElementById('top-progress-bar');
const topProgressFill = document.getElementById('top-progress-fill');
const controlDock = document.getElementById('control-dock');
const dockToggleBtn = document.getElementById('dock-toggle-btn');
let isScrubbing = false;

// ============================================================================
// THREE.JS SETUP & PIPELINE
// ============================================================================
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07080b);
scene.fog = new THREE.FogExp2(0x07080b, 0.08);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(0, 0.2, 5.2);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 10.0;
controls.minDistance = 1.2;
controls.target.set(0, 0.1, 0);

// Post-Processing: UnrealBloomPass
let composer, bloomPass;
function initPostProcessing() {
  const renderPass = new RenderPass(scene, camera);
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.80, // strength
    0.40, // radius
    0.85  // threshold
  );
  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
}
initPostProcessing();

// Studio Lighting Setup
let keyLight, fillLight, backLight, rimLight;
function setupLighting() {
  const ambient = new THREE.AmbientLight(0xfff5ee, 0.45);
  scene.add(ambient);

  // Key warm sun
  keyLight = new THREE.DirectionalLight(0xfff6ea, 1.8);
  keyLight.position.set(-2.2, 3.8, 3.2);
  scene.add(keyLight);

  // Fill cool botanical mist
  fillLight = new THREE.DirectionalLight(0xa5d0ff, 0.85);
  fillLight.position.set(2.8, -0.8, 2.5);
  scene.add(fillLight);

  // Rim backlight for translucent petal transmission (SSS)
  backLight = new THREE.DirectionalLight(0xffaa77, 1.6);
  backLight.position.set(0.4, 2.2, -3.5);
  scene.add(backLight);

  // Top soft hair/rim
  rimLight = new THREE.PointLight(0xffeedd, 1.2, 10);
  rimLight.position.set(0, 3.2, 0.5);
  scene.add(rimLight);
}
setupLighting();

// ============================================================================
// PROCEDURAL CANVAS TEXTURE GENERATOR FOR PETALS
// ============================================================================
const CULTIVAR_PALETTES = {
  stargazer: {
    throat: '#46a324',
    crimson: '#bf0a47',
    blush: '#f05688',
    margin: '#fefefe',
    midrib: '#990033',
    papCore: '#22000d',
    papHalo: '#78153c',
    antherPollen: 0xd96818
  },
  casablanca: {
    throat: '#4ba01e',
    crimson: '#d8e5cc',
    blush: '#eaf2e3',
    margin: '#f5faf0',
    midrib: '#a8cf8c',
    papCore: '#466c28',
    papHalo: '#8ac064',
    antherPollen: 0xc4801e
  },
  aurora: {
    throat: '#7fb800',
    crimson: '#e64a19',
    blush: '#ff8a50',
    margin: '#fff8e1',
    midrib: '#bf360c',
    papCore: '#4e1402',
    papHalo: '#b03d15',
    antherPollen: 0xefa015
  },
  black_beauty: {
    throat: '#388e3c',
    crimson: '#3e0413',
    blush: '#750b28',
    margin: '#fce4ec',
    midrib: '#26000a',
    papCore: '#100003',
    papHalo: '#500014',
    antherPollen: 0xf5b025
  }
};

function generatePetalTextures(cultivarKey) {
  const pal = CULTIVAR_PALETTES[cultivarKey] || CULTIVAR_PALETTES.stargazer;
  const size = 1024;
  
  // 1. Diffuse / Albedo Map
  const cDiff = document.createElement('canvas');
  cDiff.width = cDiff.height = size;
  const ctx = cDiff.getContext('2d');

  // Ivory Margin Background
  ctx.fillStyle = pal.margin;
  ctx.fillRect(0, 0, size, size);

  // Rich Crimson-Rose Heart Gradient (Lush 75% coverage with crisp ivory ruffled margin)
  const gradFlush = ctx.createRadialGradient(size * 0.5, size * 0.32, size * 0.04, size * 0.5, size * 0.45, size * 0.46);
  gradFlush.addColorStop(0, pal.crimson);
  gradFlush.addColorStop(0.60, pal.crimson);
  gradFlush.addColorStop(0.82, pal.blush);
  gradFlush.addColorStop(0.94, pal.margin);
  gradFlush.addColorStop(1, pal.margin);

  ctx.fillStyle = gradFlush;
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.45, size * 0.42, size * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();

  // Emerald Throat Nectar Star Guide
  const gradNectar = ctx.createRadialGradient(size * 0.5, 0, 0, size * 0.5, size * 0.12, size * 0.22);
  gradNectar.addColorStop(0, pal.throat);
  gradNectar.addColorStop(0.7, pal.throat);
  gradNectar.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradNectar;
  ctx.fillRect(0, 0, size, size * 0.26);

  // Midrib Vein Keel
  const gradMidrib = ctx.createLinearGradient(size * 0.48, 0, size * 0.52, 0);
  gradMidrib.addColorStop(0, 'rgba(0,0,0,0)');
  gradMidrib.addColorStop(0.5, pal.midrib);
  gradMidrib.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradMidrib;
  ctx.fillRect(size * 0.47, 0, size * 0.06, size * 0.88);

  // Longitudinal Parallel Venation Lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.035)';
  ctx.lineWidth = 1.2;
  for (let i = -18; i <= 18; i++) {
    if (i === 0) continue;
    ctx.beginPath();
    const xBase = size * 0.5 + i * 18;
    ctx.moveTo(size * 0.5, 0);
    ctx.bezierCurveTo(xBase * 0.9, size * 0.3, xBase, size * 0.7, xBase * 0.85, size);
    ctx.stroke();
  }

  // 3D Papillae Spots (Crimson Core with Halo)
  const rng = (seed) => {
    let s = seed;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  };
  const rand = rng(42);

  for (let i = 0; i < 220; i++) {
    const py = 0.12 + rand() * 0.55;
    const px = 0.5 + (rand() - 0.5) * (0.65 * Math.sin(py * Math.PI));
    const r = 2.0 + rand() * 3.5;

    // Halo
    ctx.fillStyle = pal.papHalo;
    ctx.beginPath();
    ctx.arc(px * size, py * size, r * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Dark Ruby Core
    ctx.fillStyle = pal.papCore;
    ctx.beginPath();
    ctx.arc(px * size, py * size, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Normal / Bump Map (Embossed Papillae & Keel)
  const cBump = document.createElement('canvas');
  cBump.width = cBump.height = size;
  const bCtx = cBump.getContext('2d');
  bCtx.fillStyle = '#8080ff';
  bCtx.fillRect(0, 0, size, size);

  // Raised Midrib Ridge
  const bGrad = bCtx.createLinearGradient(size * 0.48, 0, size * 0.52, 0);
  bGrad.addColorStop(0, '#8080ff');
  bGrad.addColorStop(0.5, '#9090ff');
  bGrad.addColorStop(1, '#8080ff');
  bCtx.fillStyle = bGrad;
  bCtx.fillRect(size * 0.47, 0, size * 0.06, size * 0.9);

  // Bump Spots
  const randB = rng(42);
  for (let i = 0; i < 220; i++) {
    const py = 0.12 + randB() * 0.55;
    const px = 0.5 + (randB() - 0.5) * (0.65 * Math.sin(py * Math.PI));
    const r = 2.0 + randB() * 3.5;

    bCtx.fillStyle = '#a0a0ff';
    bCtx.beginPath();
    bCtx.arc(px * size, py * size, r, 0, Math.PI * 2);
    bCtx.fill();
  }

  const diffTex = new THREE.CanvasTexture(cDiff);
  diffTex.colorSpace = THREE.SRGBColorSpace;
  const bumpTex = new THREE.CanvasTexture(cBump);

  return { diffTex, bumpTex, pal };
}

let petalTextures = generatePetalTextures('stargazer');

// Petal Material with Physically-Inspired Subsurface Scattering
function createPetalMaterial(textures) {
  return new THREE.MeshPhysicalMaterial({
    map: textures.diffTex,
    bumpMap: textures.bumpTex,
    bumpScale: 0.028,
    roughness: 0.44,
    metalness: 0.0,
    transmission: 0.16,        // Realistic soft translucent plant tissue
    thickness: 0.45,           // Subsurface scattering depth
    sheen: 0.85,               // Velvety organic botanical sheen
    sheenColor: new THREE.Color(0xf06292),
    clearcoat: 0.12,           // Delicate cuticle shine
    clearcoatRoughness: 0.35,
    side: THREE.DoubleSide
  });
}

let petalMat = createPetalMaterial(petalTextures);

// Stem & Leaf Materials
const stemMat = new THREE.MeshStandardMaterial({
  color: 0x386b2e,
  roughness: 0.42,
  metalness: 0.05
});

const leafMat = new THREE.MeshStandardMaterial({
  color: 0x245822,
  roughness: 0.32,
  metalness: 0.08,
  side: THREE.DoubleSide
});

const filamentMat = new THREE.MeshStandardMaterial({
  color: 0x8cd959,
  roughness: 0.35,
  metalness: 0.05
});

const antherMat = new THREE.MeshStandardMaterial({
  color: petalTextures.pal.antherPollen,
  roughness: 0.68,
  metalness: 0.02
});

const stigmaMat = new THREE.MeshStandardMaterial({
  color: 0x7a1e38,
  roughness: 0.45,
  metalness: 0.05
});

// Glowing Blueprint Wireframe Material
const wireframeMat = new THREE.LineBasicMaterial({
  color: 0x38bdf8,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending
});

// ============================================================================
// 3D PARAMETRIC BOTANICAL GEOMETRY BUILDER
// ============================================================================

function evalBezier(p0, p1, p2, p3, u) {
  const om = 1.0 - u;
  const om2 = om * om;
  const om3 = om2 * om;
  const u2 = u * u;
  const u3 = u2 * u;

  const pos = new THREE.Vector3()
    .addScaledVector(p0, om3)
    .addScaledVector(p1, 3.0 * om2 * u)
    .addScaledVector(p2, 3.0 * om * u2)
    .addScaledVector(p3, u3);

  const tan = new THREE.Vector3()
    .addScaledVector(p1.clone().sub(p0), 3.0 * om2)
    .addScaledVector(p2.clone().sub(p1), 6.0 * om * u)
    .addScaledVector(p3.clone().sub(p2), 3.0 * u2);

  return { pos, tan };
}

function computeBishopFrames(curvePositions, tangents) {
  const N = tangents.length;
  const N1 = [];
  const N2 = [];

  const t0 = tangents[0].clone().normalize();
  let ref = new THREE.Vector3(0, 0, 1);
  if (Math.abs(t0.dot(ref)) > 0.9) ref = new THREE.Vector3(1, 0, 0);

  let n1 = new THREE.Vector3().crossVectors(t0, ref).normalize();
  let n2 = new THREE.Vector3().crossVectors(t0, n1).normalize();
  N1.push(n1);
  N2.push(n2);

  for (let i = 1; i < N; i++) {
    const ti = tangents[i].clone().normalize();
    let n1_proj = n1.clone().sub(ti.clone().multiplyScalar(n1.dot(ti)));
    if (n1_proj.length() < 1e-5) {
      n1_proj = new THREE.Vector3().crossVectors(ti, n2);
    }
    n1 = n1_proj.normalize();
    n2 = new THREE.Vector3().crossVectors(ti, n1).normalize();
    N1.push(n1);
    N2.push(n2);
  }
  return { N1, N2 };
}

function createStemGeometry(p0, p1, p2, p3, rBase, rTip, Nu = 36, Nv = 14) {
  const curvePositions = [];
  const tangents = [];
  for (let i = 0; i < Nu; i++) {
    const u = i / (Nu - 1);
    const { pos, tan } = evalBezier(p0, p1, p2, p3, u);
    curvePositions.push(pos);
    tangents.push(tan);
  }
  const { N1, N2 } = computeBishopFrames(curvePositions, tangents);

  const vertices = [];
  const indices = [];
  const uvs = [];

  for (let i = 0; i < Nu; i++) {
    const u = i / (Nu - 1);
    const r = (rBase * (1.0 - u) + rTip * u) * (1.0 + (u > 0.9 ? 0.25 * ((u - 0.9) / 0.1) : 0));
    const center = curvePositions[i];
    const n1 = N1[i];
    const n2 = N2[i];

    for (let j = 0; j < Nv; j++) {
      const v = j / (Nv - 1);
      const theta = v * Math.PI * 2.0;
      const ridge = 1.0 + 0.035 * Math.cos(6.0 * theta);
      const rad = r * ridge;

      const px = center.x + rad * (Math.cos(theta) * n1.x + Math.sin(theta) * n2.x);
      const py = center.y + rad * (Math.cos(theta) * n1.y + Math.sin(theta) * n2.y);
      const pz = center.z + rad * (Math.cos(theta) * n1.z + Math.sin(theta) * n2.z);

      vertices.push(px, py, pz);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < Nu - 1; i++) {
    for (let j = 0; j < Nv - 1; j++) {
      const a = i * Nv + j;
      const b = (i + 1) * Nv + j;
      const c = (i + 1) * Nv + (j + 1);
      const d = i * Nv + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return { geom, curvePositions, tangents };
}

function createLeafGeometry(origin, stemDir, azimuth, length, width, archDrop, twist) {
  const Nu = 32, Nv = 15;
  const vertices = [];
  const indices = [];
  const uvs = [];

  const rotM = new THREE.Matrix4().makeRotationY(azimuth);

  for (let i = 0; i < Nu; i++) {
    const u = i / (Nu - 1);
    const wProf = width * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, 0.64))), 0.92) * (1.0 - 0.10 * u) + 0.08 * width * Math.pow(1.0 - u, 3);
    const reach = length * (0.92 * u + 0.08 * Math.sin(0.5 * Math.PI * u));
    const elev = length * (0.46 * u - archDrop * Math.pow(u, 2.15));

    for (let j = 0; j < Nv; j++) {
      const v = (j / (Nv - 1)) * 2.0 - 1.0;
      const fold = 0.06 * width * Math.pow(Math.abs(v), 1.35) * (1.0 - 0.40 * u);
      const twAng = twist * Math.pow(u, 1.3);

      const xLoc = wProf * v * Math.cos(twAng) - fold * Math.sin(twAng);
      const zLoc = elev + wProf * v * Math.sin(twAng) + fold * Math.cos(twAng);
      const yLoc = reach;

      const p = new THREE.Vector3(xLoc, zLoc, yLoc).applyMatrix4(rotM).add(origin);
      vertices.push(p.x, p.y, p.z);
      uvs.push(u, (v + 1.0) * 0.5);
    }
  }

  for (let i = 0; i < Nu - 1; i++) {
    for (let j = 0; j < Nv - 1; j++) {
      const a = i * Nv + j;
      const b = (i + 1) * Nv + j;
      const c = (i + 1) * Nv + (j + 1);
      const d = i * Nv + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

// Parametric Oriental Lily Tepal (Petal/Sepal)
class BotanicalTepal {
  constructor(center, basisMatrix, azimuth, isInner, scale, openness, timeStart, timeEnd) {
    this.center = center;
    this.basis = basisMatrix;
    this.azimuth = azimuth;
    this.isInner = isInner;
    this.scale = scale;
    this.targetOpenness = openness;
    this.timeStart = timeStart;
    this.timeEnd = timeEnd;

    this.Nu = 64;
    this.Nv = 32;

    this.mesh = this.buildMesh();
    this.wireframe = this.buildWireframe();
    this.dewDrops = this.buildDewDrops();
  }

  buildTepalSurface(openFactor) {
    const scale = this.scale;
    const isInner = this.isInner;
    const Nu = this.Nu;
    const Nv = this.Nv;

    const wMax = (isInner ? 0.48 : 0.40) * scale;
    const length = (isInner ? 1.28 : 1.24) * scale;

    const thetaBase = isInner ? 0.16 : 0.28;
    const thetaFlare = (isInner ? 0.76 : 0.90) * openFactor + 0.12;
    const thetaRecurve = (isInner ? 1.62 : 1.78) * Math.pow(openFactor, 1.15);

    const ds = length / (Nu - 1);
    const rMid = [ (isInner ? 0.038 : 0.080) * scale ];
    const yMid = [ (isInner ? 0.035 : 0.0) * scale ];
    const angles = [];

    for (let i = 0; i < Nu; i++) {
      const u = i / (Nu - 1);
      const s1 = u * u * (3.0 - 2.0 * u);
      const s2 = Math.pow(u, 1.5);
      angles[i] = thetaBase + thetaFlare * s1 + (thetaRecurve - thetaFlare) * s2;
    }

    for (let i = 1; i < Nu; i++) {
      const ang = 0.5 * (angles[i - 1] + angles[i]);
      rMid[i] = rMid[i - 1] + ds * Math.sin(ang);
      yMid[i] = yMid[i - 1] + ds * Math.cos(ang);
    }

    const vertices = [];
    const ca = Math.cos(this.azimuth);
    const sa = Math.sin(this.azimuth);

    for (let i = 0; i < Nu; i++) {
      const u = i / (Nu - 1);
      const envelope = Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, 0.56))), 0.70);
      const tipRound = 1.0 - 0.12 * Math.pow(u, 3);
      const wProfile = wMax * envelope * tipRound + 0.055 * scale * Math.pow(1.0 - u, 2.6);

      const outR = Math.cos(angles[i]);
      const outY = -Math.sin(angles[i]);

      for (let j = 0; j < Nv; j++) {
        const v = (j / (Nv - 1)) * 2.0 - 1.0;
        
        // Furrow + Reflex + Ruffle
        const furrow = 0.030 * scale * Math.exp(-Math.pow(v / 0.15, 2)) * (1.0 - 0.60 * u);
        const reflex = 0.048 * scale * (v * v) * (u > 0.35 ? Math.min(1.0, (u - 0.35) / 0.55) : 0);
        const ruffleAmp = (isInner ? 0.046 : 0.030) * scale * openFactor;
        const ruffleEnv = Math.sin(Math.PI * u) * Math.pow(Math.abs(v), 2.2);
        const ruffle = ruffleAmp * ruffleEnv * Math.sin(6.0 * Math.PI * u + (isInner ? 0.85 : -0.75) * Math.sign(v));

        const dispOut = furrow + reflex + ruffle;

        const wrapR = rMid[i] + 0.16 * scale;
        const phiLocal = (wProfile * v) / wrapR;
        const cylBlend = 1.0 - 0.55 * (u > 0.35 ? Math.min(1.0, (u - 0.35) / 0.5) : 0);
        const phiEff = phiLocal * cylBlend;
        const xPlanar = (wProfile * v) * (1.0 - cylBlend);

        const rBaseSurf = wrapR * Math.cos(phiEff) - 0.16 * scale + dispOut * outR;
        const xBaseSurf = wrapR * Math.sin(phiEff) + xPlanar;
        const yLocal = yMid[i] + dispOut * outY;

        const px = xBaseSurf * ca + rBaseSurf * sa;
        const pz = -xBaseSurf * sa + rBaseSurf * ca;
        const py = yLocal;

        const pVec = new THREE.Vector3(px, py, pz).applyMatrix3(this.basis).add(this.center);
        vertices.push(pVec.x, pVec.y, pVec.z);
      }
    }
    return vertices;
  }

  buildMesh() {
    const Nu = this.Nu;
    const Nv = this.Nv;
    const geom = new THREE.BufferGeometry();

    const vertices = this.buildTepalSurface(this.targetOpenness);
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const uvs = [];
    for (let i = 0; i < Nu; i++) {
      for (let j = 0; j < Nv; j++) {
        uvs.push(i / (Nu - 1), j / (Nv - 1));
      }
    }
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    const indices = [];
    for (let i = 0; i < Nu - 1; i++) {
      for (let j = 0; j < Nv - 1; j++) {
        const a = i * Nv + j;
        const b = (i + 1) * Nv + j;
        const c = (i + 1) * Nv + (j + 1);
        const d = i * Nv + (j + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const mesh = new THREE.Mesh(geom, petalMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  buildWireframe() {
    const Nu = this.Nu;
    const Nv = this.Nv;
    const lineIndices = [];

    for (let i = 0; i < Nu; i += 4) {
      for (let j = 0; j < Nv - 1; j++) {
        lineIndices.push(i * Nv + j, i * Nv + j + 1);
      }
    }
    for (let j = 0; j < Nv; j += 4) {
      for (let i = 0; i < Nu - 1; i++) {
        lineIndices.push(i * Nv + j, (i + 1) * Nv + j);
      }
    }

    const wireGeom = new THREE.BufferGeometry();
    wireGeom.setAttribute('position', this.mesh.geometry.attributes.position);
    wireGeom.setIndex(lineIndices);

    const wireMesh = new THREE.LineSegments(wireGeom, wireframeMat);
    return wireMesh;
  }

  buildDewDrops() {
    const dewGroup = new THREE.Group();
    const sphereGeom = new THREE.SphereGeometry(0.010 * this.scale, 8, 8);
    const dewMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.96,
      roughness: 0.05,
      ior: 1.333,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.85
    });

    const posAttr = this.mesh.geometry.attributes.position;
    const Nu = this.Nu;
    const Nv = this.Nv;

    for (let k = 0; k < 8; k++) {
      const uIdx = Math.floor(Nu * (0.32 + (k * 0.07)));
      const vIdx = Math.floor(Nv * (0.2 + (k % 4) * 0.2));
      const vIndex = uIdx * Nv + vIdx;

      const drop = new THREE.Mesh(sphereGeom, dewMat);
      drop.position.set(posAttr.getX(vIndex), posAttr.getY(vIndex) + 0.003, posAttr.getZ(vIndex));
      dewGroup.add(drop);
    }
    return dewGroup;
  }

  update(time, windTime) {
    const prog = Math.min(1.0, Math.max(0.0, (time - this.timeStart) / (this.timeEnd - this.timeStart)));
    const sProg = prog * prog * (3.0 - 2.0 * prog);
    const curOpenness = 0.25 + 0.75 * sProg;

    const vertices = this.buildTepalSurface(curOpenness);
    const posAttr = this.mesh.geometry.attributes.position;

    const amp = 0.012 * windStrength;
    for (let i = 0; i < this.Nu; i++) {
      const u = i / (this.Nu - 1);
      const swayX = Math.sin(windTime * 1.5 + u * 3.0) * amp * Math.pow(u, 1.5);
      const swayY = Math.cos(windTime * 1.2 + u * 2.0) * amp * 0.5;

      for (let j = 0; j < this.Nv; j++) {
        const idx = i * this.Nv + j;
        posAttr.setXYZ(idx, vertices[idx * 3] + swayX, vertices[idx * 3 + 1] + swayY, vertices[idx * 3 + 2]);
      }
    }
    posAttr.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();

    const isBlueprintMode = (activeShadingMode === 'blueprint');
    if (time < this.timeStart - 1.5) {
      this.mesh.visible = false;
      this.wireframe.visible = false;
    } else if (time < this.timeStart) {
      this.mesh.visible = false;
      this.wireframe.visible = showWireGlow;
      wireframeMat.opacity = Math.min(0.9, (time - (this.timeStart - 1.5)) / 1.5);
    } else {
      this.mesh.visible = true;
      if (isBlueprintMode) {
        this.wireframe.visible = true;
        wireframeMat.opacity = 0.95;
      } else {
        const fadeOut = Math.max(0.0, 1.0 - (time - this.timeStart) / 1.2);
        this.wireframe.visible = showWireGlow && (fadeOut > 0.02);
        wireframeMat.opacity = fadeOut * 0.8;
      }
    }

    this.dewDrops.visible = showDewDrops && (time > this.timeStart + 0.8);
  }
}

function createStamensAndPistil(center, basis, scale) {
  const group = new THREE.Group();

  // 1. Central Pistil
  const Nu_s = 24, Nv_s = 10;
  const p0 = new THREE.Vector3(0, 0, 0);
  const p1 = new THREE.Vector3(0.02, 0.36, 0.03).multiplyScalar(scale);
  const p2 = new THREE.Vector3(0.04, 0.74, 0.08).multiplyScalar(scale);
  const p3 = new THREE.Vector3(0.02, 1.05, 0.15).multiplyScalar(scale);

  const styleGeom = createStemGeometry(p0, p1, p2, p3, 0.022 * scale, 0.016 * scale, Nu_s, Nv_s).geom;
  const styleMesh = new THREE.Mesh(styleGeom, stemMat);

  const stigmaGeom = new THREE.SphereGeometry(0.042 * scale, 12, 12);
  const stigmaMesh = new THREE.Mesh(stigmaGeom, stigmaMat);
  stigmaMesh.position.copy(p3);
  stigmaMesh.scale.set(1.4, 0.9, 1.4);

  const pistilGroup = new THREE.Group();
  pistilGroup.add(styleMesh, stigmaMesh);

  // 2. Six Filaments + Anthers
  for (let k = 0; k < 6; k++) {
    const az = k * (Math.PI / 3.0) + 0.26;
    const ca = Math.cos(az);
    const sa = Math.sin(az);
    const flare = (0.28 + 0.03 * (k % 2)) * scale;
    const hTip = (0.90 + 0.04 * (k % 3)) * scale;

    const fp0 = new THREE.Vector3(0.028 * scale * ca, 0.02 * scale, 0.028 * scale * sa);
    const fp1 = new THREE.Vector3(0.075 * scale * ca, 0.35 * scale, 0.075 * scale * sa);
    const fp2 = new THREE.Vector3(0.200 * scale * ca, 0.70 * scale, 0.200 * scale * sa);
    const fp3 = new THREE.Vector3(flare * ca, hTip, flare * sa);

    const filGeom = createStemGeometry(fp0, fp1, fp2, fp3, 0.012 * scale, 0.007 * scale, 18, 8).geom;
    const filMesh = new THREE.Mesh(filGeom, filamentMat);

    const antherGeom = new THREE.CapsuleGeometry(0.022 * scale, 0.13 * scale, 8, 12);
    const antherMesh = new THREE.Mesh(antherGeom, antherMat);
    antherMesh.position.copy(fp3);
    antherMesh.rotation.set(0.6, az + 1.2, 0.3);

    pistilGroup.add(filMesh, antherMesh);
  }

  pistilGroup.applyMatrix4(new THREE.Matrix4().setFromMatrix3(basis));
  pistilGroup.position.copy(center);
  group.add(pistilGroup);

  return group;
}

// ============================================================================
// FULL BOUQUET SCENE ASSEMBLY
// ============================================================================
const bouquetGroup = new THREE.Group();
const tepalList = [];
let pollenParticles;

function assembleLilyBouquet() {
  // 1. Three Main Stems
  const stemsSpec = [
    [ new THREE.Vector3(0.03, -2.55, 0.02), new THREE.Vector3(0.09, -1.35, 0.06), new THREE.Vector3(0.14, -0.35, 0.04), new THREE.Vector3(0.10, 0.34, 0.10), 0.048, 0.034 ],
    [ new THREE.Vector3(-0.06, -2.55, -0.04), new THREE.Vector3(-0.14, -1.25, -0.05), new THREE.Vector3(-0.18, -0.10, -0.02), new THREE.Vector3(-0.14, 0.82, -0.04), 0.046, 0.032 ],
    [ new THREE.Vector3(0.00, -2.55, -0.08), new THREE.Vector3(-0.04, -1.40, -0.10), new THREE.Vector3(0.02, -0.20, -0.09), new THREE.Vector3(0.03, 1.28, -0.10), 0.042, 0.027 ]
  ];

  const stemCurves = [];
  stemsSpec.forEach(([p0, p1, p2, p3, rb, rt]) => {
    const { geom, curvePositions, tangents } = createStemGeometry(p0, p1, p2, p3, rb, rt);
    const stemMesh = new THREE.Mesh(geom, stemMat);
    bouquetGroup.add(stemMesh);
    stemCurves.push({ curvePositions, tangents });
  });

  // 2. Pedicels
  const pedicelsSpec = [
    [ new THREE.Vector3(0.12, 0.08, 0.07), new THREE.Vector3(0.19, 0.20, 0.15), new THREE.Vector3(0.24, 0.29, 0.23), new THREE.Vector3(0.27, 0.36, 0.30), 0.030, 0.025 ],
    [ new THREE.Vector3(-0.15, 0.52, -0.03), new THREE.Vector3(-0.23, 0.68, 0.04), new THREE.Vector3(-0.29, 0.80, 0.10), new THREE.Vector3(-0.34, 0.90, 0.15), 0.028, 0.024 ],
    [ new THREE.Vector3(-0.14, -0.45, -0.04), new THREE.Vector3(-0.25, -0.34, 0.05), new THREE.Vector3(-0.33, -0.25, 0.12), new THREE.Vector3(-0.38, -0.18, 0.18), 0.027, 0.023 ],
    [ new THREE.Vector3(0.02, 1.12, -0.09), new THREE.Vector3(0.05, 1.30, -0.06), new THREE.Vector3(0.07, 1.46, -0.04), new THREE.Vector3(0.08, 1.60, -0.02), 0.025, 0.021 ],
    [ new THREE.Vector3(0.10, 0.34, 0.10), new THREE.Vector3(0.28, 0.66, 0.02), new THREE.Vector3(0.42, 0.94, -0.04), new THREE.Vector3(0.50, 1.16, -0.08), 0.025, 0.021 ]
  ];

  pedicelsSpec.forEach(([p0, p1, p2, p3, rb, rt]) => {
    const { geom } = createStemGeometry(p0, p1, p2, p3, rb, rt, 20, 10);
    const pedicelMesh = new THREE.Mesh(geom, stemMat);
    bouquetGroup.add(pedicelMesh);
  });

  // 3. Lanceolate Leaves
  const leavesSpec = [
    [0, 5, 0.45, 0.92, 0.17, 0.35, 0.20],
    [0, 9, 2.35, 1.00, 0.18, 0.36, -0.16],
    [0, 14, -1.15, 1.04, 0.19, 0.33, 0.22],
    [0, 19, 0.85, 0.94, 0.17, 0.30, -0.18],
    [0, 24, -0.55, 0.84, 0.16, 0.27, 0.14],
    [1, 7, -2.25, 0.94, 0.17, 0.35, -0.20],
    [1, 12, 3.05, 1.02, 0.18, 0.34, 0.16],
    [1, 17, -1.65, 0.98, 0.18, 0.32, -0.22],
    [1, 23, 2.25, 0.88, 0.16, 0.29, 0.18],
    [2, 10, -0.25, 0.88, 0.16, 0.34, 0.15],
    [2, 16, 1.25, 0.92, 0.17, 0.31, -0.18],
    [2, 22, -2.85, 0.82, 0.15, 0.28, 0.16]
  ];

  leavesSpec.forEach(([sIdx, uIdx, az, lLen, lWid, arch, tw]) => {
    const { curvePositions, tangents } = stemCurves[sIdx];
    const origin = curvePositions[uIdx];
    const sDir = tangents[uIdx];
    const leafGeom = createLeafGeometry(origin, sDir, az, lLen, lWid, arch, tw);
    const leafMesh = new THREE.Mesh(leafGeom, leafMat);
    bouquetGroup.add(leafMesh);
  });

  // 4. Three Blooming Oriental Lilies
  const flowersSpec = [
    { center: new THREE.Vector3(0.27, 0.36, 0.30), dir: new THREE.Vector3(0.22, 0.50, 0.84).normalize(), scale: 0.92, openness: 1.0, rotOffset: 0.22, tStart: 3.8, tEnd: 7.2 },
    { center: new THREE.Vector3(-0.34, 0.90, 0.15), dir: new THREE.Vector3(-0.24, 0.58, 0.78).normalize(), scale: 0.86, openness: 0.96, rotOffset: 0.75, tStart: 4.2, tEnd: 7.8 },
    { center: new THREE.Vector3(-0.38, -0.18, 0.18), dir: new THREE.Vector3(-0.30, 0.46, 0.83).normalize(), scale: 0.78, openness: 0.84, rotOffset: -0.32, tStart: 4.6, tEnd: 8.2 }
  ];

  flowersSpec.forEach(f => {
    const yAxis = f.dir.clone();
    let upHint = new THREE.Vector3(0, 1, 0);
    if (Math.abs(yAxis.dot(upHint)) > 0.9) upHint = new THREE.Vector3(0, 0, 1);
    const xAxis = new THREE.Vector3().crossVectors(upHint, yAxis).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
    const basis = new THREE.Matrix3().set(
      xAxis.x, yAxis.x, zAxis.x,
      xAxis.y, yAxis.y, zAxis.y,
      xAxis.z, yAxis.z, zAxis.z
    );

    // 3 Outer Sepals
    for (let k = 0; k < 3; k++) {
      const az = f.rotOffset + k * (2.0 * Math.PI / 3.0);
      const tepal = new BotanicalTepal(f.center, basis, az, false, f.scale, f.openness, f.tStart + k * 0.15, f.tEnd);
      bouquetGroup.add(tepal.mesh, tepal.wireframe, tepal.dewDrops);
      tepalList.push(tepal);
    }
    // 3 Inner Petals
    for (let k = 0; k < 3; k++) {
      const az = f.rotOffset + (k + 0.5) * (2.0 * Math.PI / 3.0);
      const tepal = new BotanicalTepal(f.center, basis, az, true, f.scale, f.openness, f.tStart + 0.2 + k * 0.15, f.tEnd);
      bouquetGroup.add(tepal.mesh, tepal.wireframe, tepal.dewDrops);
      tepalList.push(tepal);
    }

    // Stamens and Pistil
    const stamens = createStamensAndPistil(f.center, basis, f.scale);
    bouquetGroup.add(stamens);
  });

  // 5. Two Lily Buds
  const budGeom = new THREE.ConeGeometry(0.12, 0.55, 16);
  const budMat = new THREE.MeshStandardMaterial({ color: 0x4d8a36, roughness: 0.35 });
  const bud1 = new THREE.Mesh(budGeom, budMat);
  bud1.position.set(0.08, 1.62, -0.02);
  bud1.rotation.set(-0.2, 0.1, -0.1);

  const bud2 = new THREE.Mesh(budGeom, budMat);
  bud2.position.set(0.50, 1.18, -0.08);
  bud2.rotation.set(0.2, -0.3, -0.4);
  bouquetGroup.add(bud1, bud2);

  // Center bouquet perfectly in 100% viewport
  bouquetGroup.position.set(0, -0.35, 0);
  scene.add(bouquetGroup);

  // 6. Floating Golden Pollen Particles
  const pCount = 380;
  const pGeom = new THREE.BufferGeometry();
  const pPositions = new Float32Array(pCount * 3);
  const pScales = new Float32Array(pCount);

  for (let i = 0; i < pCount; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 4.5;
    pPositions[i * 3 + 1] = (Math.random() - 0.5) * 4.5;
    pPositions[i * 3 + 2] = (Math.random() - 0.5) * 3.5;
    pScales[i] = 0.5 + Math.random() * 2.0;
  }
  pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  pGeom.setAttribute('scale', new THREE.BufferAttribute(pScales, 1));

  const pMat = new THREE.PointsMaterial({
    color: 0xffd170,
    size: 0.05,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending
  });
  pollenParticles = new THREE.Points(pGeom, pMat);
  scene.add(pollenParticles);
}

assembleLilyBouquet();

// ============================================================================
// ANIMATION LOOP & TIMELINE
// ============================================================================
let clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  // Continuous smooth playback loop
  currentTime += delta * playbackSpeed;
  if (currentTime > DURATION) {
    currentTime = 0; // seamlessly loop forever
  }

  // Update top progress line
  if (topProgressFill && !isScrubbing) {
    topProgressFill.style.width = `${(currentTime / DURATION) * 100}%`;
  }

  // Update Petals with bloom factor and wind flutter
  tepalList.forEach(tepal => {
    tepal.update(currentTime, elapsedTime);
  });

  // Atmospheric Pollen Drift
  if (pollenParticles) {
    pollenParticles.visible = showPollen;
    const pos = pollenParticles.geometry.attributes.position.array;
    for (let i = 0; i < pos.length / 3; i++) {
      pos[i * 3 + 1] += 0.003 + Math.sin(elapsedTime + i) * 0.001;
      if (pos[i * 3 + 1] > 2.5) pos[i * 3 + 1] = -2.5;
    }
    pollenParticles.geometry.attributes.position.needsUpdate = true;
  }

  // Camera Choreography with Mobile Responsive Framing
  const aspect = camera.aspect || (window.innerWidth / window.innerHeight);
  const isPortrait = aspect < 1.0;
  // Responsive distance multiplier on mobile screens to ensure full bouquet visibility
  const mobileDistMultiplier = isPortrait ? 1.0 + (1.0 - aspect) * 0.52 : 1.0;
  // Center bouquet vertically with breathing room on mobile
  const mobileYOffset = isPortrait ? 0.20 : 0.0;

  if (activeCamMode === 'cinematic') {
    const pAll = currentTime / DURATION;
    const sP = pAll * pAll * (3.0 - 2.0 * pAll);
    const azimuth = -0.32 + 0.62 * sP + 0.18 * Math.sin(Math.max(0, (pAll - 0.7) / 0.3) * Math.PI);
    const elevation = 0.08 + 0.10 * Math.sin(pAll * Math.PI);
    const dist = (5.2 - 0.35 * Math.sin(pAll * Math.PI * 0.8)) * mobileDistMultiplier;
    const yTarget = (-0.35 * (1.0 - sP) + 0.25 * sP) + mobileYOffset;

    camera.position.x = dist * Math.sin(azimuth) * Math.cos(elevation);
    camera.position.y = yTarget + dist * Math.sin(elevation);
    camera.position.z = dist * Math.cos(azimuth) * Math.cos(elevation);
    controls.target.set(0, yTarget, 0);
  } else if (activeCamMode === 'hero') {
    camera.position.lerp(new THREE.Vector3(0.8 * mobileDistMultiplier, 0.35 + mobileYOffset, 2.8 * mobileDistMultiplier), 0.05);
    controls.target.lerp(new THREE.Vector3(0.27, 0.26 + mobileYOffset, 0.30), 0.05);
  } else if (activeCamMode === 'macro') {
    camera.position.lerp(new THREE.Vector3(0.38, 0.32 + mobileYOffset, 1.45), 0.05);
    controls.target.lerp(new THREE.Vector3(0.25, 0.25 + mobileYOffset, 0.30), 0.05);
  } else if (activeCamMode === 'stamen') {
    camera.position.lerp(new THREE.Vector3(0.18, 0.75 + mobileYOffset, 1.55), 0.05);
    controls.target.lerp(new THREE.Vector3(0.27, 0.55 + mobileYOffset, 0.30), 0.05);
  } else if (activeCamMode === 'crown') {
    camera.position.lerp(new THREE.Vector3(0.0, 3.8 * mobileDistMultiplier, 0.2), 0.05);
    controls.target.lerp(new THREE.Vector3(0, 0.5 + mobileYOffset, 0), 0.05);
  }

  controls.update();
  composer.render();
}

requestAnimationFrame(animate);

// ============================================================================
// UI EVENT LISTENERS
// ============================================================================

// Resize handling (Full 100% Window Fit & Mobile Framing)
function handleResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const aspect = w / h;
  camera.aspect = aspect;

  // Adapt FOV on portrait/mobile so that all flowers are completely visible with padding
  if (aspect < 1.0) {
    camera.fov = 38 + (1.0 - Math.min(1.0, aspect)) * 16;
  } else {
    camera.fov = 38;
  }
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}
window.addEventListener('resize', handleResize);
handleResize();

// Top progress line scrubbing
function handleProgressScrub(e) {
  if (!topProgressBar) return;
  const rect = topProgressBar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  currentTime = ratio * DURATION;
  if (topProgressFill) {
    topProgressFill.style.width = `${ratio * 100}%`;
  }
}

if (topProgressBar) {
  topProgressBar.addEventListener('pointerdown', (e) => {
    isScrubbing = true;
    handleProgressScrub(e);
    topProgressBar.setPointerCapture(e.pointerId);
  });
  topProgressBar.addEventListener('pointermove', (e) => {
    if (isScrubbing) handleProgressScrub(e);
  });
  topProgressBar.addEventListener('pointerup', (e) => {
    if (isScrubbing) {
      isScrubbing = false;
      topProgressBar.releasePointerCapture(e.pointerId);
    }
  });
  topProgressBar.addEventListener('pointercancel', () => {
    isScrubbing = false;
  });
}

// Expandable Control Dock Toggle
if (dockToggleBtn && controlDock) {
  dockToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isCollapsed = controlDock.classList.toggle('collapsed');
    dockToggleBtn.setAttribute('aria-expanded', (!isCollapsed).toString());
  });

  // Clicking outside collapses the dock if opened
  document.addEventListener('click', (e) => {
    if (!controlDock.classList.contains('collapsed') && !controlDock.contains(e.target)) {
      controlDock.classList.add('collapsed');
      dockToggleBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

// Dock Tabs (Only Cultivar & Optics)
document.querySelectorAll('.dock-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.dock-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.dock-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const panel = document.getElementById(`panel-${tab.dataset.tab}`);
    if (panel) panel.classList.add('active');
  });
});

// Cultivar Presets
document.querySelectorAll('.cultivar-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.cultivar-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    activeCultivar = card.dataset.cultivar;
    petalTextures = generatePetalTextures(activeCultivar);
    petalMat.map = petalTextures.diffTex;
    petalMat.bumpMap = petalTextures.bumpTex;
    petalMat.needsUpdate = true;
    antherMat.color.setHex(petalTextures.pal.antherPollen);
  });
});

// Shading Modes
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeShadingMode = btn.dataset.mode;

    if (activeShadingMode === 'realistic') {
      petalMat.roughness = 0.44;
      petalMat.transmission = 0.16;
      petalMat.thickness = 0.45;
      bloomPass.strength = 0.80;
      wireframeMat.color.setHex(0x38bdf8);
    } else if (activeShadingMode === 'blueprint') {
      bloomPass.strength = 2.2;
      wireframeMat.color.setHex(0x00f0ff);
      showWireGlow = true;
    } else if (activeShadingMode === 'subsurface') {
      petalMat.transmission = 0.65;
      petalMat.thickness = 1.0;
      bloomPass.strength = 1.5;
    } else if (activeShadingMode === 'golden') {
      keyLight.color.setHex(0xff9933);
      fillLight.color.setHex(0xffd170);
      bloomPass.strength = 1.4;
    }
  });
});

// Toggles
const chkDew = document.getElementById('chk-dew-drops');
if (chkDew) chkDew.addEventListener('change', e => showDewDrops = e.target.checked);

const chkPap = document.getElementById('chk-papillae');
if (chkPap) chkPap.addEventListener('change', e => {
  showPapillae = e.target.checked;
  petalMat.bumpScale = showPapillae ? 0.028 : 0.005;
});

const chkPol = document.getElementById('chk-pollen');
if (chkPol) chkPol.addEventListener('change', e => showPollen = e.target.checked);

const chkWire = document.getElementById('chk-wire-glow');
if (chkWire) chkWire.addEventListener('change', e => showWireGlow = e.target.checked);

// Sliders
const sliderWind = document.getElementById('slider-wind');
if (sliderWind) {
  sliderWind.addEventListener('input', e => {
    windStrength = parseFloat(e.target.value);
    const label = document.getElementById('wind-val');
    if (label) label.textContent = windStrength === 0 ? 'None' : windStrength < 1 ? 'Gentle' : 'Dynamic';
  });
}

const sliderBloom = document.getElementById('slider-bloom');
if (sliderBloom) {
  sliderBloom.addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    bloomPass.strength = val;
    const label = document.getElementById('bloom-val');
    if (label) label.textContent = `${val.toFixed(1)}×`;
  });
}

const sliderSSS = document.getElementById('slider-sss');
if (sliderSSS) {
  sliderSSS.addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    petalMat.transmission = Math.min(0.7, 0.16 * val);
    petalMat.thickness = 0.45 * val;
    const label = document.getElementById('sss-val');
    if (label) label.textContent = `${val.toFixed(1)}×`;
  });
}

// Camera Presets
document.querySelectorAll('.cam-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCamMode = btn.dataset.cam;
    controls.enabled = (activeCamMode === 'free');
  });
});
