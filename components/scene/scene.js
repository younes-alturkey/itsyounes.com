// "Mission Deck": a floating hex island in a twilight sky where a humanoid AI agent works
// at holographic stations around a central core. Rigged, animated character (Mixamo X Bot),
// real shadows, HDR bloom, environment reflections, fog, boot-up camera, particles and a HUD.
// Phone-safe: half-res bloom, capped pixel ratio, quality steps down on slow frames.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function initScene(opts) {
const { canvas, labelsEl, hud, rtl = false, t: T } = opts;
const listeners = [];
const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); listeners.push([el, ev, fn, o]); };
let raf = 0, disposed = false;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const small = () => innerWidth < 768;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
} catch (e) {
  document.body.classList.add('no-webgl');
  return { dispose() {} };
}
let maxDpr = coarse ? 1.3 : 1.75;
renderer.setPixelRatio(Math.min(devicePixelRatio, maxDpr));
renderer.setClearColor(0x050b16, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x070f22, 0.028);
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
const world = new THREE.Group();
scene.add(world);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.5, 0.96);
composer.addPass(bloom);
composer.addPass(new OutputPass());
let useBloom = true;

// ---------- helpers
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
const _m = new THREE.Matrix4(), _col = new THREE.Color();
const clamp = THREE.MathUtils.clamp;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
const rnd = (a, b) => a + Math.random() * (b - a);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; }
const sphere = (r, s = 16) => new THREE.SphereGeometry(r, s, Math.max(8, s / 2));
function glowTexture() {
  const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'), r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const glowTex = glowTexture();
function sprite(color, size, opacity, parent, x = 0, y = 0, z = 0) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size); s.position.set(x, y, z); parent.add(s); return s;
}
const CYAN = 0x5ee6ff, BLUE = 0x4f8cff, GREEN = 0x56e39f, AMBER = 0xffb86b;
const hot = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

const M = {
  dark: new THREE.MeshStandardMaterial({ color: 0x121a2c, metalness: 0.8, roughness: 0.3 }),
  body: new THREE.MeshStandardMaterial({ color: 0xe6ebf5, metalness: 0.35, roughness: 0.32, envMapIntensity: 0.6 }),
  glow: new THREE.MeshBasicMaterial({ color: hot(CYAN, 2.2) }),
  glowDim: new THREE.MeshBasicMaterial({ color: hot(CYAN, 0.6) }),
  tile: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.25, roughness: 0.7 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x1b2a4a, metalness: 0.1, roughness: 0.9 }),
  panel: new THREE.MeshBasicMaterial({ color: 0x0a1a36, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
  line: new THREE.MeshBasicMaterial({ color: hot(CYAN, 1.3), transparent: true, opacity: 0.6, depthWrite: false }),
  crystal: new THREE.MeshStandardMaterial({ color: 0x3a7cff, emissive: hot(BLUE, 0.5), roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.9 }),
};

// ---------- sky, stars, sun, distant islands
const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `varying vec3 vP; void main(){ float h = normalize(vP).y; float x = normalize(vP).x;
    vec3 top = vec3(0.003,0.006,0.016); vec3 mid = vec3(0.012,0.024,0.068); vec3 horizon = vec3(0.045,0.075,0.16); vec3 warm = vec3(0.22,0.11,0.05);
    vec3 c = mix(mid, top, smoothstep(0.05, 0.7, h)); c = mix(horizon, c, smoothstep(-0.08, 0.25, h));
    float sun = smoothstep(0.55, 1.0, x) * smoothstep(-0.25, 0.05, h) * smoothstep(0.35, -0.05, h);
    c += warm * sun; gl_FragColor = vec4(c, 1.0); }`,
}));
scene.add(sky);
const STARS = 700;
const starPos = new Float32Array(STARS * 3);
for (let i = 0; i < STARS; i++) { _a.randomDirection(); _a.y = Math.abs(_a.y) * 0.9 + 0.05; _a.normalize().multiplyScalar(80); starPos.set([_a.x, _a.y, _a.z], i * 3); }
const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ map: glowTex, color: 0xbcd0ff, size: 0.9, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
const sun = sprite(hot(AMBER, 0.8), 16, 0.16, scene, 34, -6, -40); sun.material.fog = false;
const islands = [];
for (const [x, y, z, s] of [[-14, -6, -22, 2.6], [12, -8, -26, 3.2], [-4, -11, -30, 2.0], [20, -2, -34, 1.6]]) {
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const top = mesh(new THREE.DodecahedronGeometry(s, 0), M.rock, g); top.scale.set(1, 0.35, 1);
  mesh(new THREE.ConeGeometry(s * 0.9, s * 1.6, 7), M.rock, g, 0, -s * 0.9, 0).rotation.x = Math.PI;
  islands.push({ g, y, k: rnd(0.3, 0.6), p: rnd(0, 6) });
}

// ---------- the workspace: low-poly floor and props modelled in Blender (workspace.glb)
const TOP = -0.62, WS = 1.55; // floor top height; Blender metres to scene units (matches the character's scale)
const ws = new THREE.Group(); ws.position.set(0, TOP - 6, 0); ws.scale.setScalar(WS); world.add(ws);
const WSP = { screens: {}, leds: [], leaves: [], fan: null, lamp: null, ring: null, rim: null, ready: false };
new GLTFLoader().load('/models/workspace.glb', (gltf) => {
  const root = gltf.scene;
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = /^(Floor|Mat_|Desk_|HoloTable|Base)/.test(o.name);
    if (o.material && o.material.emissiveIntensity) o.material.emissiveIntensity *= 0.3; // Blender strengths are too hot for bloom
    const own = () => { o.material = o.material.clone(); return o.material; };
    if (/^ScreenFace_|^BoardFace/.test(o.name)) WSP.screens[o.name] = own();
    else if (/^LED_/.test(o.name)) WSP.leds.push({ m: own(), t: Math.random() * 2, on: true });
    else if (/^Leaf_/.test(o.name)) WSP.leaves.push({ o, base: o.rotation.x });
    else if (o.name === 'Fan_1') WSP.fan = o;
    else if (o.name === 'LampBulb') WSP.lamp = own();
    else if (o.name === 'HoloRing') WSP.ring = own();
    else if (o.name === 'FloorRim') WSP.rim = own();
  });
  ws.add(root); WSP.ready = true;
}, undefined, (err) => console.warn('Workspace failed to load', err));

// ---------- lights (key light casts the character's shadow onto the deck)
scene.add(new THREE.HemisphereLight(0x8fb4ff, 0x0a1020, 0.5));
const key = new THREE.DirectionalLight(0xffe2c4, 1.6); key.position.set(6, 8, 4); scene.add(key);
key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0008; key.shadow.normalBias = 0.02;
key.shadow.camera.left = -7; key.shadow.camera.right = 7; key.shadow.camera.top = 7; key.shadow.camera.bottom = -7; key.shadow.camera.near = 1; key.shadow.camera.far = 40;
scene.add(key.target);
const fill = new THREE.PointLight(CYAN, 16, 18, 2); fill.position.set(-4, 2, 4); scene.add(fill);
const rimL = new THREE.PointLight(BLUE, 22, 16, 2); rimL.position.set(2, 3, -5); scene.add(rimL);
const coreLight = new THREE.PointLight(CYAN, 3, 7, 2); coreLight.position.set(0, TOP + 1.6, 0.15); world.add(coreLight);

// ---------- the AI core: projector disc with a rotating wire sphere, inner cloud and orbit rings
const core = new THREE.Group(); core.position.set(0, TOP + 0.13 * WS, 0.1 * WS); world.add(core); // on the holo table
const coreGlow = sprite(hot(CYAN, 1), 2.4, 0.18, core, 0, 0.5, 0);
const orb = new THREE.Group(); orb.position.y = 1.45; core.add(orb);
orb.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.62, 1)), new THREE.LineBasicMaterial({ color: hot(CYAN, 1.6), transparent: true, opacity: 0.85 })));
orb.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 2), new THREE.MeshStandardMaterial({ color: 0x0b1b3a, emissive: hot(BLUE, 0.6), roughness: 0.3, metalness: 0.4 })));
const CLOUD = 160, cloudPos = new Float32Array(CLOUD * 3);
for (let i = 0; i < CLOUD; i++) { _a.randomDirection().multiplyScalar(rnd(0.45, 0.6)); cloudPos.set([_a.x, _a.y, _a.z], i * 3); }
const cloudGeo = new THREE.BufferGeometry(); cloudGeo.setAttribute('position', new THREE.BufferAttribute(cloudPos, 3));
orb.add(new THREE.Points(cloudGeo, new THREE.PointsMaterial({ map: glowTex, color: hot(CYAN, 1.2), size: 0.07, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
const rings = [];
for (let i = 0; i < 3; i++) { const r = mesh(new THREE.TorusGeometry(0.85 + i * 0.18, 0.012, 6, 64), M.line.clone(), orb); r.rotation.set(rnd(0, 3), rnd(0, 3), 0); r.material.opacity = 0.45; rings.push(r); }
const beamGeo = new THREE.CylinderGeometry(0.06, 0.5, 1.5, 24, 1, true); beamGeo.translate(0, 0.75, 0);
const coreBeam = mesh(beamGeo, new THREE.MeshBasicMaterial({ color: hot(CYAN, 0.6), transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }), core, 0, 0.17, 0);

// ---------- holo panels
const PANELS = [
  { key: 'ai',    label: T.labels.ai, pos: new THREE.Vector3() },
  { key: 'lead',  label: T.labels.lead, pos: new THREE.Vector3() },
  { key: 'build', label: T.labels.build, pos: new THREE.Vector3() },
  { key: 'ship',  label: T.labels.ship, pos: new THREE.Vector3() },
];
const PANEL_WIDE = { ai: [4.6, 3.9, -2.4], lead: [-4.6, 3.9, -2.4], build: [-3.6, 2.75, -0.6], ship: [3.6, 2.75, -0.6] };
const PANEL_COMPACT = { ai: [2.9, 4.0, -2.4], lead: [-2.9, 4.0, -2.4], build: [-2.6, 2.8, -0.6], ship: [2.6, 2.8, -0.6] };
const panelGeo = new THREE.PlaneGeometry(1.5, 0.95);
const lineGeo = new THREE.PlaneGeometry(1, 0.055); lineGeo.translate(0.5, 0, 0);
const barGeo2 = new THREE.PlaneGeometry(0.08, 1); barGeo2.translate(0, 0.5, 0);
const progGeo = new THREE.PlaneGeometry(1.3, 0.05); progGeo.translate(0.65, 0, 0);
PANELS.forEach((p) => {
  const g = new THREE.Group(); world.add(g);
  g.add(new THREE.Mesh(panelGeo, M.panel));
  const border = new THREE.LineSegments(new THREE.EdgesGeometry(panelGeo), new THREE.LineBasicMaterial({ color: hot(CYAN, 1.2), transparent: true, opacity: 0.8 }));
  g.add(border);
  for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    mesh(new THREE.PlaneGeometry(0.18, 0.025), M.line, g, sx * 0.66, sy * 0.46, 0.005);
    mesh(new THREE.PlaneGeometry(0.025, 0.14), M.line, g, sx * 0.74, sy * 0.4, 0.005);
  }
  const lines = [];
  for (let i = 0; i < 4; i++) {
    const l = mesh(lineGeo, M.line.clone(), g, -0.6, 0.3 - i * 0.13, 0.01);
    l.scale.x = rnd(0.3, 1.0); l.material.opacity = i === 0 ? 0.95 : rnd(0.3, 0.7); lines.push(l);
  }
  const bars = [];
  for (let i = 0; i < 4; i++) { const b = mesh(barGeo2, M.line.clone(), g, 0.3 + i * 0.11, -0.3, 0.01); b.scale.y = rnd(0.1, 0.3); bars.push(b); }
  const progBg = mesh(progGeo, M.line.clone(), g, -0.65, -0.4, 0.01); progBg.material.opacity = 0.18;
  const prog = mesh(progGeo, new THREE.MeshBasicMaterial({ color: hot(GREEN, 1.6), transparent: true, opacity: 0.9, depthWrite: false }), g, -0.65, -0.4, 0.012); prog.scale.x = 0.001;
  p.g = g; p.border = border; p.lines = lines; p.bars = bars; p.prog = prog; p.heat = 0; p.tick = rnd(0, 0.5); p.boot = 0; p.progress = 0;
  g.scale.setScalar(0.001);
  const el = document.createElement('button');
  el.className = 'label'; el.type = 'button'; el.textContent = p.label;
  el.addEventListener('click', () => tap(p.key));
  el.addEventListener('pointerenter', () => { S.lock = true; });
  el.addEventListener('pointerleave', () => { S.lock = false; });
  labelsEl.appendChild(el);
  p.el = el;
});
const PANEL = Object.fromEntries(PANELS.map((p) => [p.key, p]));

// ---------- drone + trail
const drone = new THREE.Group(); world.add(drone);
mesh(sphere(0.13, 14), M.body, drone);
mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 24), M.glow, drone).rotation.x = Math.PI / 2;
mesh(sphere(0.05, 8), M.glow, drone, 0, -0.02, 0.12);
const droneState = { ang: 0, dart: null, dartT: 0, from: new THREE.Vector3() };
const TRAIL = 24, trailPos = new Float32Array(TRAIL * 3);
const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
world.add(new THREE.Points(trailGeo, new THREE.PointsMaterial({ map: glowTex, color: hot(CYAN, 1), size: 0.16, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })));
let trailHead = 0;

// ---------- sparks and embers
const SPARKS = 90;
const sparks = new THREE.InstancedMesh(sphere(0.035, 6), new THREE.MeshBasicMaterial({ color: hot(GREEN, 2) }), SPARKS);
sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.add(sparks);
const sparkData = [];
for (let i = 0; i < SPARKS; i++) sparkData.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0 });
function burst(at, n = 26, spread = 1.6) {
  let k = 0;
  for (const s of sparkData) {
    if (s.life > 0) continue;
    s.p.copy(at); s.v.set(rnd(-1, 1), rnd(0.6, 2.4), rnd(-1, 1)).multiplyScalar(rnd(0.8, spread)); s.life = rnd(0.5, 1.1);
    if (++k >= n) break;
  }
}
const EMBERS = coarse ? 120 : 260;
const emberPos = new Float32Array(EMBERS * 3), emberV = new Float32Array(EMBERS);
for (let i = 0; i < EMBERS; i++) { emberPos.set([rnd(-6, 6), rnd(-1, 6), rnd(-4, 3)], i * 3); emberV[i] = rnd(0.15, 0.45); }
const emberGeo = new THREE.BufferGeometry(); emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
world.add(new THREE.Points(emberGeo, new THREE.PointsMaterial({ map: glowTex, color: hot(0x9fc4ff, 1), size: 0.11, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })));

// ---------- the agent: rigged humanoid
const G = (x, y) => new THREE.Vector3(x * WS, TOP, -y * WS); // Blender floor coords to scene
const CORRIDOR_Y = 1.4; // free strip behind the desks, in front of the rack
const STATIONS = [
  { key: 'build', pos: G(-2.3, 1.35), gate: G(-2.3, CORRIDOR_Y), face: G(-2.3, 0.6).add(new THREE.Vector3(0, 1.9, 0)), work: [5, 8] },
  { key: 'core',  pos: G(0, 0.95),    gate: G(0, CORRIDOR_Y),    face: G(0, -0.1).add(new THREE.Vector3(0, 1.6, 0)),  work: [4, 6] },
  { key: 'ship',  pos: G(2.3, 1.35),  gate: G(2.3, CORRIDOR_Y),  face: G(2.3, 0.6).add(new THREE.Vector3(0, 1.9, 0)),  work: [5, 8] },
  { key: 'ai',    pos: G(1.7, 1.85),  gate: G(1.7, CORRIDOR_Y),  face: G(2.5, 1.85).add(new THREE.Vector3(0, 1.5, 0)), work: [4, 6] },
];
const CH = {
  group: new THREE.Group(), model: null, mixer: null, actions: {}, current: null, head: null, neck: null, spine: null, ready: false,
  state: 'wait', t: 0, station: 1, next: 0, dur: 0, yaw: 0, tyaw: 0, scale: 1.55, grow: 0,
  lookYaw: 0, lookPitch: 0, glance: 0, greetUntil: 0, meshes: [], path: [],
};
CH.group.position.copy(STATIONS[1].pos);
world.add(CH.group);
const chShadow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }));
chShadow.scale.set(1.9, 0.8, 1); world.add(chShadow);
// data stream from the agent's hand to the station screen while working
const streamGeo = new THREE.BufferGeometry(); streamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
const stream = new THREE.Line(streamGeo, new THREE.LineBasicMaterial({ color: hot(CYAN, 1.2), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
stream.visible = false; world.add(stream);
const PK = 7, pkPos = new Float32Array(PK * 3), pkT = new Float32Array(PK);
for (let i = 0; i < PK; i++) pkT[i] = i / PK;
const pkGeo = new THREE.BufferGeometry(); pkGeo.setAttribute('position', new THREE.BufferAttribute(pkPos, 3));
const packets = new THREE.Points(pkGeo, new THREE.PointsMaterial({ map: glowTex, color: hot(CYAN, 1.6), size: 0.2, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
packets.visible = false; world.add(packets);
new GLTFLoader().load('/models/Xbot.glb', (gltf) => {
  const model = gltf.scene;
  model.scale.setScalar(0.001);
  const shell = new THREE.MeshPhysicalMaterial({ color: 0xc9d2e2, metalness: 0.2, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.4 });
  const joints = new THREE.MeshStandardMaterial({ color: 0x151c2e, metalness: 0.85, roughness: 0.35, emissive: hot(CYAN, 0.55), envMapIntensity: 0.6 });
  CH.shell = shell; CH.joints = joints;
  model.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; CH.meshes.push(o); o.material = /Joints/i.test(o.name) || /Joints/i.test(o.material && o.material.name || '') ? joints : shell; }
    if (o.isBone) {
      if (/Head$/.test(o.name)) CH.head = o;
      if (/Neck$/.test(o.name)) CH.neck = o;
      if (/Spine1$/.test(o.name)) CH.spine = o;
      if (/RightHand$/.test(o.name)) CH.hand = o;
    }
  });
  CH.group.add(model);
  CH.model = model;
  CH.mixer = new THREE.AnimationMixer(model);
  for (const clip of gltf.animations) { const a = CH.mixer.clipAction(clip); a.enabled = true; a.setEffectiveWeight(0); a.play(); CH.actions[clip.name] = a; }
  for (const k of ['agree', 'headShake']) if (CH.actions[k]) { CH.actions[k].setLoop(THREE.LoopOnce, 1); CH.actions[k].clampWhenFinished = true; }
  CH.mixer.addEventListener('finished', (e) => { if (e.action === CH.actions.agree || e.action === CH.actions.headShake) play('idle', 0.35); });
  play('idle', 0);
  CH.ready = true; CH.state = 'work'; CH.t = 0; CH.dur = rnd(4, 6);
  burst(_a.copy(CH.group.position).add(_b.set(0, 1.4, 0)), 50, 2.4);
}, undefined, (err) => { console.warn('Character failed to load', err); });

function play(name, fade = 0.3) {
  const a = CH.actions[name]; if (!a || CH.current === a) return;
  // Actions that faded out get disabled by the mixer; re-enable and restart them before fading in.
  a.enabled = true; a.paused = false; a.time = 0;
  a.setEffectiveTimeScale(1).setEffectiveWeight(1);
  if (CH.current) a.crossFadeFrom(CH.current, fade, false);
  a.play();
  CH.current = a;
}
function faceToward(p) { CH.tyaw = Math.atan2(p.x - CH.group.position.x, p.z - CH.group.position.z); }
function goTo(idx) {
  CH.next = idx; CH.state = 'walk'; CH.t = 0;
  const from = STATIONS[CH.station], to = STATIONS[idx];
  CH.path = [from.gate, to.gate, to.pos].filter((p, i, arr) => i === 0 || p.distanceTo(arr[i - 1]) > 0.05);
  faceToward(CH.path[0]);
}
function finishTask() {
  const st = STATIONS[CH.station];
  const at = st.key === 'core' ? _a.copy(core.position).add(_b.set(0, 1.6, 0)) : _a.copy(PANEL[st.key].g.position);
  burst(at, 28, 2.0);
  S.shake = 0.07;
  if (st.key !== 'core') { PANEL[st.key].heat = 1; PANEL[st.key].progress = 0; }
  onShipped();
}
function greet() {
  if (!CH.ready) return;
  CH.greetUntil = performance.now() + 2400;
  play(Math.random() < 0.6 ? 'agree' : 'headShake', 0.25);
  S.boost = Math.max(S.boost, 0.5);
}

// ---------- state
const S = {
  rotY: 0, rotX: 0.12, dragY: 0, dragX: 0, px: 0, py: 0, scroll: 0, fade: 1, lock: false,
  focus: null, focusUntil: 0, boost: 0, busy: false, dist: 10, shake: 0, intro: reduced ? 1 : 0,
  shipped: 0, xp: 0, task: 0, hover: false,
};
let drag = null;

// ---------- HUD: five role-shaped tasks; the active one fills while the agent works a station and completes with it
const TASKS = T.hud.tasks;
const hudXp = (hud && hud.querySelector('#hud-xp')), hudQuests = (hud && hud.querySelector('#hud-quests'));
const taskRows = [];
if (hudQuests) TASKS.forEach((name) => {
  const row = document.createElement('div'); row.className = 'hud-q';
  row.innerHTML = '<span class="box"></span><span class="txt"></span><i class="bar"><b></b></i>';
  row.querySelector('.txt').textContent = name;
  hudQuests.appendChild(row); taskRows.push(row);
});
function setTaskProgress(k) {
  const row = taskRows[S.task]; if (!row) return;
  row.classList.add('active');
  row.querySelector('.bar b').style.width = (k * 100).toFixed(0) + '%';
}
function onShipped() {
  S.shipped++; S.xp = (S.xp + 12) % 100;
  if (hudXp) hudXp.style.width = S.xp + '%';
  popup(_a.copy(CH.group.position).add(_b.set(0, 2.9, 0)), T.hud.popDone + TASKS[S.task]);
  const row = taskRows[S.task];
  if (row) { row.classList.remove('active'); row.classList.add('done'); row.querySelector('.bar b').style.width = '100%'; }
  S.task++;
  if (S.task >= TASKS.length) {
    setTimeout(() => { taskRows.forEach((r) => { r.classList.remove('done', 'active'); r.querySelector('.bar b').style.width = '0%'; }); S.task = 0; }, 2500);
  }
}
function popup(at, text) {
  const el = document.createElement('div'); el.className = 'popup'; el.textContent = text;
  _c.copy(at).applyMatrix4(world.matrixWorld).project(camera);
  el.style.left = ((_c.x * 0.5 + 0.5) * innerWidth).toFixed(0) + 'px';
  el.style.top = ((-_c.y * 0.5 + 0.5) * innerHeight).toFixed(0) + 'px';
  labelsEl.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.resolution.set(Math.round(w / 2), Math.round(h / 2));
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const sm = small();
  S.dist = 10.5;
  const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * S.dist;
  const halfW = halfH * camera.aspect;
  const availW = sm ? halfW * 2 : halfW * 0.95;
  const sc = clamp(availW / (sm ? 11.2 : 10.4), 0.24, 0.8);
  world.scale.setScalar(sc);
  const cx = sm ? 0 : halfW * 0.46 * (rtl ? -1 : 1);
  const cy = sm ? halfH * 0.52 : 0;
  world.position.set(cx, cy - 1.35 * sc, 0);
  const set = sm ? PANEL_COMPACT : PANEL_WIDE;
  PANELS.forEach((p) => { p.pos.fromArray(set[p.key]); p.g.position.copy(p.pos); });
  key.target.position.copy(world.position);
  requestRender();
}
on(window, 'resize', resize);

// ---------- pointer
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
on(canvas, 'pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, ry: S.dragY, rx: S.dragX }; });
let hoverCheck = 0;
on(window, 'pointermove', (e) => {
  if (!S.lock) { S.px = (e.clientX / innerWidth) * 2 - 1; S.py = (e.clientY / innerHeight) * 2 - 1; }
  if (drag) {
    S.dragY = clamp(drag.ry + (e.clientX - drag.x) * 0.005, -0.7, 0.7);
    if (e.pointerType !== 'touch') S.dragX = clamp(drag.rx + (e.clientY - drag.y) * 0.003, -0.2, 0.35); // touch keeps vertical for page scroll
  }
  if (!coarse && CH.ready && ++hoverCheck % 3 === 0) {
    ndc.set(S.px, -S.py); ray.setFromCamera(ndc, camera);
    S.hover = !!ray.intersectObjects(CH.meshes, false)[0];
    canvas.style.cursor = S.hover ? 'pointer' : '';
  }
  requestRender();
});
on(window, 'pointerup', (e) => {
  if (!drag) return;
  const moved = Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y);
  drag = null;
  if (moved > 8 || !CH.ready) return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (ray.intersectObjects(CH.meshes, false)[0]) greet();
});
on(window, 'scroll', () => {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  S.scroll = clamp(scrollY / max, 0, 1);
  S.fade = clamp(1 - (scrollY - innerHeight * 0.55) / (innerHeight * 0.45), 0.38, 1);
  requestRender();
}, { passive: true });

function tap(key) { focus(key); if (window.AGENT && typeof window.AGENT.askTopic === 'function') window.AGENT.askTopic(key); }
function focus(key) {
  const p = PANEL[key]; if (!p) return;
  S.focus = p; S.focusUntil = performance.now() + 4000; p.heat = 1;
  droneState.dart = p; droneState.dartT = 0; droneState.from.copy(drone.position);
  CH.glance = 2.2;
  requestRender();
}
window.SCENE = {
  focus,
  pulse() { S.boost = 1; requestRender(); },
  busy(on) { S.busy = !!on; requestRender(); },
  shipped() { S.boost = 1; S.shake = 0.12; burst(_a.copy(core.position).add(_b.set(0, 1.6, 0)), 44, 2.2); popup(_a, T.hud.popFile); if (CH.ready && CH.state === 'work') play('agree', 0.2); requestRender(); },
  greet,
  state() { return { ready: CH.ready, state: CH.state, station: STATIONS[CH.station].key, shipped: S.shipped, intro: S.intro, anim: CH.current && CH.current.getClip().name, pos: CH.group.position.toArray().map((v) => +v.toFixed(2)) }; },
  tick(dt) { step(dt); render(); },
};

// ---------- frame loop
const clock = new THREE.Clock();
let t = 0, needRender = true, frames = 0, slowAcc = 0, tier = 2, lastFade = -1;
function requestRender() { needRender = true; }

function stepCharacter(dt, speed) {
  if (!CH.ready) return;
  CH.grow = Math.min(1, CH.grow + dt / 0.9);
  CH.model.scale.setScalar(Math.max(0.001, easeOutBack(CH.grow)) * CH.scale);
  const greeting = performance.now() < CH.greetUntil;
  CH.t += dt;

  if (greeting) {
    CH.tyaw = 0; // face the visitor
  } else if (CH.state === 'work') {
    const st = STATIONS[CH.station];
    faceToward(st.face);
    const k = clamp(CH.t / CH.dur, 0, 1);
    if (st.key !== 'core') PANEL[st.key].progress = k;
    setTaskProgress(k);
    if (CH.current === CH.actions.idle && Math.random() < dt * 0.25) play('agree', 0.3); // small approving nods while reviewing
    if (CH.t >= CH.dur) {
      finishTask();
      play('agree', 0.2);
      CH.state = 'done'; CH.t = 0;
    }
  } else if (CH.state === 'done') {
    if (CH.t > 1.4) {
      let n; do { n = Math.floor(Math.random() * STATIONS.length); } while (n === CH.station);
      goTo(n);
    }
  } else if (CH.state === 'walk') {
    const target = CH.path[0] || STATIONS[CH.next].pos;
    _a.subVectors(target, CH.group.position); _a.y = 0;
    const d = _a.length();
    const walkSpeed = (S.busy ? 2.9 : 1.9) * speed;
    play(S.busy ? 'run' : 'walk', 0.3);
    if (d > 0.05) { faceToward(target); _a.normalize(); CH.group.position.addScaledVector(_a, Math.min(d, walkSpeed * dt)); }
    if (d < 0.08) {
      CH.path.shift();
      if (!CH.path.length) { CH.station = CH.next; CH.state = 'work'; CH.t = 0; CH.dur = rnd(STATIONS[CH.station].work[0], STATIONS[CH.station].work[1]) / (S.busy ? 1.6 : 1); play('idle', 0.35); }
    }
  }
  if ((CH.state === 'work' || CH.state === 'done') && !greeting && CH.current !== CH.actions.agree && CH.current !== CH.actions.headShake) play('idle', 0.35);

  CH.yaw += wrapAngle(CH.tyaw - CH.yaw) * Math.min(1, dt * 6);
  CH.group.rotation.y = CH.yaw;

  if (CH.mixer) { CH.mixer.timeScale = S.busy ? 1.35 : 1; CH.mixer.update(dt); }
  chShadow.position.set(CH.group.position.x, TOP + 0.03, CH.group.position.z);
  const streaming = CH.state === 'work' && !greeting && CH.hand;
  stream.visible = packets.visible = !!streaming;
  if (streaming) {
    const st = STATIONS[CH.station];
    CH.hand.getWorldPosition(_c); world.worldToLocal(_c);
    const to = st.key === 'core' ? _d.copy(core.position).add(_a.set(0, 1.55, 0)) : _d.copy(PANEL[st.key].g.position);
    const sp = streamGeo.attributes.position.array;
    sp[0] = _c.x; sp[1] = _c.y; sp[2] = _c.z; sp[3] = to.x; sp[4] = to.y; sp[5] = to.z;
    streamGeo.attributes.position.needsUpdate = true;
    stream.material.opacity = 0.2 + Math.sin(t * 9) * 0.1;
    for (let i = 0; i < PK; i++) {
      pkT[i] = (pkT[i] + dt * (0.5 + S.boost * 0.6)) % 1;
      const k = pkT[i];
      pkPos[i * 3] = _c.x + (to.x - _c.x) * k; pkPos[i * 3 + 1] = _c.y + (to.y - _c.y) * k + Math.sin(k * Math.PI) * 0.25; pkPos[i * 3 + 2] = _c.z + (to.z - _c.z) * k;
    }
    pkGeo.attributes.position.needsUpdate = true;
  }

  // procedural head look: at the station screen while working, at the visitor when glancing or greeting
  CH.glance = Math.max(0, CH.glance - dt);
  if (CH.state === 'work' && !greeting && CH.glance <= 0 && Math.random() < dt * 0.08) CH.glance = 1.8;
  let target;
  if (greeting || CH.glance > 0) target = _b.set(S.px * 6, 2.2 - S.py * 2.5, 9);
  else if (CH.state === 'work') target = _b.copy(STATIONS[CH.station].face);
  else target = _b.copy(STATIONS[CH.next].pos).add(_c.set(0, 2.0, 0));
  if (CH.head) {
    CH.head.getWorldPosition(_c); world.worldToLocal(_c);
    _d.subVectors(target, _c);
    const yaw = wrapAngle(Math.atan2(_d.x, _d.z) - CH.yaw);
    const pitch = Math.atan2(_d.y, Math.hypot(_d.x, _d.z));
    CH.lookYaw += (clamp(yaw, -1.1, 1.1) - CH.lookYaw) * Math.min(1, dt * 4);
    CH.lookPitch += (clamp(pitch, -0.5, 0.6) - CH.lookPitch) * Math.min(1, dt * 4);
    CH.head.rotation.y += CH.lookYaw * 0.55; CH.head.rotation.x -= CH.lookPitch * 0.6;
    if (CH.neck) CH.neck.rotation.y += CH.lookYaw * 0.2;
    if (CH.spine) CH.spine.rotation.y += CH.lookYaw * 0.2;
  }
}

function step(dt) {
  t += dt;
  const speed = (S.busy ? 1.4 : 1) + S.boost * 0.8;
  S.boost = Math.max(0, S.boost - dt * 0.6);
  S.shake = Math.max(0, S.shake - dt * 0.5);
  S.intro = Math.min(1, S.intro + dt / 2.6);
  const intro = easeOut(S.intro);

  const ty = S.scroll * 0.9 + S.px * 0.12 + S.dragY + Math.sin(t * 0.15) * 0.05 + (1 - intro) * -0.9;
  const tx = 0.12 + S.scroll * 0.08 + S.py * 0.06 + S.dragX + (1 - intro) * 0.5;
  if (S.focus && performance.now() > S.focusUntil) S.focus = null;
  S.rotY += (ty - S.rotY) * Math.min(1, dt * 3); S.rotX += (tx - S.rotX) * Math.min(1, dt * 3);
  world.rotation.set(S.rotX, S.rotY, 0);
  const sh = S.shake * S.shake * 2;
  camera.position.set(rnd(-sh, sh), rnd(-sh, sh) + (1 - intro) * 1.6, S.dist * (1 + (1 - intro) * 1.4));
  camera.lookAt(0, 0.1, 0);

  stepCharacter(dt, speed);

  // core
  orb.rotation.y += dt * 0.35 * speed; orb.rotation.x = Math.sin(t * 0.4) * 0.2;
  orb.position.y = 1.45 + Math.sin(t * 1.3) * 0.08;
  rings.forEach((r, i) => { r.rotation.x += dt * (0.25 + i * 0.12) * speed; r.rotation.y += dt * (0.18 - i * 0.05); });
  coreGlow.material.opacity = 0.14 + Math.sin(t * 2.5) * 0.05 + S.boost * 0.3;
  coreBeam.material.opacity = 0.1 + S.boost * 0.2 + Math.sin(t * 6) * 0.02;
  coreLight.intensity = 2.5 + Math.sin(t * 3) * 0.6 + S.boost * 5;

  // panels
  _d.setFromMatrixPosition(camera.matrixWorld);
  PANELS.forEach((p, i) => {
    p.boot = clamp(p.boot + dt * (S.intro > 0.35 + i * 0.12 ? 1.8 : 0), 0, 1);
    p.heat = Math.max(0, p.heat - dt * 0.5);
    p.g.position.y = p.pos.y + Math.sin(t * 0.8 + i) * 0.06;
    p.g.lookAt(_d);
    p.tick -= dt * speed;
    if (p.tick <= 0) {
      p.tick = rnd(0.25, 0.7);
      const l = p.lines[1 + Math.floor(Math.random() * 3)]; l.scale.x = rnd(0.3, 1.0); l.material.opacity = rnd(0.3, 0.8);
      p.bars[Math.floor(Math.random() * 4)].scale.y = rnd(0.08, 0.34);
    }
    p.prog.scale.x = Math.max(0.001, p.progress);
    p.border.material.opacity = 0.6 + p.heat * 0.4; p.border.material.color.setHex(p.heat > 0.4 ? 0xffffff : CYAN).multiplyScalar(p.heat > 0.4 ? 2 : 1.2);
    const bs = easeOutBack(p.boot);
    p.g.scale.set(Math.max(0.001, bs) * (1 + p.heat * 0.08), Math.max(0.001, bs < 0.3 ? bs * 0.1 : bs) * (1 + p.heat * 0.08), 1);
    p.el.classList.toggle('hot', p.heat > 0.35);
    p.el.style.visibility = p.boot > 0.9 ? '' : 'hidden';
  });

  // drone
  droneState.ang += dt * (0.9 + S.boost * 1.5) * (S.busy ? 1.5 : 1);
  _a.set(Math.cos(droneState.ang) * 2.4, TOP + 3.1 + Math.sin(t * 2.1) * 0.25, Math.sin(droneState.ang) * 1.6);
  if (droneState.dart) {
    droneState.dartT += dt;
    const k = droneState.dartT;
    if (k < 0.7) drone.position.lerpVectors(droneState.from, _b.copy(droneState.dart.g.position).add(_c.set(0, 0.75, 0.4)), easeInOut(k / 0.7));
    else if (k < 1.6) drone.position.y += Math.sin(t * 25) * 0.004;
    else if (k < 2.3) drone.position.lerp(_a, Math.min(1, dt * 4));
    else droneState.dart = null;
  } else drone.position.lerp(_a, Math.min(1, dt * 3));
  drone.rotation.y += dt * 4; drone.rotation.z = Math.sin(t * 3) * 0.2;
  trailPos.set([drone.position.x, drone.position.y, drone.position.z], trailHead * 3); trailHead = (trailHead + 1) % TRAIL;
  trailGeo.attributes.position.needsUpdate = true;

  // sparks and embers
  for (let i = 0; i < SPARKS; i++) {
    const s = sparkData[i];
    if (s.life > 0) { s.life -= dt; s.v.y -= dt * 3.5; s.p.addScaledVector(s.v, dt); _m.makeScale(s.life, s.life, s.life).setPosition(s.p); }
    else _m.makeScale(0, 0, 0);
    sparks.setMatrixAt(i, _m);
  }
  sparks.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < EMBERS; i++) { let y = emberPos[i * 3 + 1] + emberV[i] * dt; if (y > 6.5) y = -1; emberPos[i * 3 + 1] = y; emberPos[i * 3] += Math.sin(t + i) * dt * 0.1; }
  emberGeo.attributes.position.needsUpdate = true;

  // workspace: rises into place during the intro, then the props stay alive
  ws.position.y = TOP - (1 - easeOut(clamp(S.intro * 1.4, 0, 1))) * 6;
  if (WSP.ready) {
    const st = STATIONS[CH.station], working = CH.state === 'work';
    const hotScreen = working ? ({ build: '_L', ship: '_R', ai: null, core: 'BoardFace' })[st.key] : null;
    for (const name in WSP.screens) {
      const m = WSP.screens[name], base = hotScreen && name.endsWith(hotScreen) ? 1.3 : 0.6;
      m.emissiveIntensity = base + Math.sin(t * 17 + name.length) * 0.06 + (Math.random() < 0.015 ? 0.3 : 0);
    }
    WSP.leds.forEach((l) => { l.t -= dt * (1 + S.boost); if (l.t <= 0) { l.on = !l.on; l.t = l.on ? rnd(0.3, 2.5) : rnd(0.08, 0.4); l.m.emissiveIntensity = l.on ? 1.6 : 0.1; } });
    if (WSP.fan) WSP.fan.rotateZ(dt * (9 + S.boost * 12));
    if (WSP.lamp) WSP.lamp.emissiveIntensity = 1.1 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.05;
    if (WSP.ring) WSP.ring.emissiveIntensity = 0.9 + Math.sin(t * 2.5) * 0.2 + S.boost * 1.2;
    if (WSP.rim) WSP.rim.emissiveIntensity = 0.6 + Math.sin(t * 2) * 0.12 + S.boost * 0.6;
    WSP.leaves.forEach((l, i) => { l.o.rotation.x = l.base + Math.sin(t * 1.4 + i * 1.3) * 0.05; });
  }
  islands.forEach((is) => { is.g.position.y = is.y + Math.sin(t * is.k + is.p) * 0.4; is.g.rotation.y += dt * 0.02; });
  sky.rotation.y += dt * 0.004;

  if (hud) hud.classList.toggle('on', S.intro > 0.55 && S.fade > 0.6);
}

const LABEL_DOWN = new THREE.Vector3(0, -0.62, 0);
function placeLabels() {
  const w = innerWidth, h = innerHeight;
  PANELS.forEach((p) => {
    _a.copy(p.g.position).add(LABEL_DOWN).applyMatrix4(world.matrixWorld).project(camera);
    const x = (_a.x * 0.5 + 0.5) * w, y = (-_a.y * 0.5 + 0.5) * h;
    const depth = clamp(1 - (_a.z - 0.9) * 10, 0.4, 1);
    p.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%,-50%) scale(${(0.85 + depth * 0.2).toFixed(3)})`;
    p.el.style.opacity = (_a.z > 1 ? 0 : depth).toFixed(2);
  });
}
function applyFade() {
  const f = S.focus ? Math.max(S.fade, 0.85) : S.fade;
  if (Math.abs(f - lastFade) < 0.01) return;
  lastFade = f;
  canvas.style.opacity = f.toFixed(2);
  const show = f > 0.6;
  labelsEl.style.opacity = show ? '1' : '0';
  labelsEl.style.pointerEvents = show ? '' : 'none';
}
function degrade(ms) {
  slowAcc += ms; frames++;
  if (frames < 60) return;
  const avg = slowAcc / frames; slowAcc = 0; frames = 0;
  if (avg > 30 && tier > 0) {
    tier--;
    if (tier === 1) { maxDpr = 1.0; renderer.setPixelRatio(1); composer.setPixelRatio(1); renderer.shadowMap.enabled = false; key.castShadow = false; }
    if (tier === 0) { useBloom = false; emberGeo.setDrawRange(0, Math.floor(EMBERS / 2)); }
  }
}
function render() {
  world.updateMatrixWorld();
  if (useBloom) composer.render(); else renderer.render(scene, camera);
  placeLabels();
  applyFade();
}

let paused = false;
function loop() {
  if (disposed) return;
  raf = requestAnimationFrame(loop);
  if (paused) return;
  const dt = Math.min(0.05, clock.getDelta());
  if (reduced) {
    if (!needRender) return;
    needRender = false;
    step(0.0001);
  } else {
    const t0 = performance.now();
    step(dt);
    degrade(performance.now() - t0 + 1);
  }
  render();
}
on(document, 'visibilitychange', () => { paused = document.hidden; if (!paused) clock.getDelta(); });

resize();
step(0.016);
loop();

function dispose() {
  disposed = true;
  cancelAnimationFrame(raf);
  listeners.forEach(([el, ev, fn, o]) => el.removeEventListener(ev, fn, o));
  PANELS.forEach((p) => p.el.remove());
  labelsEl.querySelectorAll('.popup').forEach((e) => e.remove());
  composer.dispose();
  renderer.dispose();
  if (window.SCENE) delete window.SCENE;
}
return { dispose };
}
