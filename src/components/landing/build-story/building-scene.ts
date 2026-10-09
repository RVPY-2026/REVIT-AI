import * as THREE from "three";

/**
 * Scroll-driven 3D building rendered like an architectural drawing (Revit "Hidden Line" look):
 * paper-coloured faces, hand-drafted ink edges (corner overshoot + slight wobble), dashed grids
 * with bubbles, level datums, dimension strings, landscaping, a Revit-style
 * Properties card on hover and a Clash Detective report.
 * Time `t` is measured in story steps: step s plays during [s, s + 1].
 *
 * Plain three.js (no React) so BuildStory can lazy-load it after first paint.
 */

export const STAGE_COUNT = 7;

const FLOOR = 3.6;
const FLOORS = 4;
const XS = [-10, -5, 0, 5, 10];
const ZS = [-5, 0, 5];
const GRID_X = "ABCDE";
const E = (i: number) => 0.6 + i * FLOOR; // level elevations (top of slab)
const levelName = (i: number) => (i >= FLOORS ? "Mái" : `L${i + 1}`);

type Mode = "drop" | "rise" | "grow" | "stretch" | "slide" | "pop" | "none";
type Axis = "x" | "y" | "z";

interface Piece {
  obj: THREE.Object3D;
  pos: THREE.Vector3;
  scale: THREE.Vector3;
  t0: number;
  t1: number;
  mode: Mode;
  axis: Axis;
  offset: THREE.Vector3;
}

/** What the Properties card shows for an element. */
interface ElementInfo {
  category: string;
  id: string;
  rows: [string, string][];
}

type LabelTone = "bubble" | "tag" | "dim" | "alert" | "ok";

interface Label {
  el: HTMLElement;
  tone: LabelTone;
  /** Measured box, cached once laid out (tags have fixed text). */
  box?: { w: number; h: number };
  anchor: THREE.Object3D;
  local: THREE.Vector3;
  t0: number;
  t1: number;
  /** Optional dynamic text/tone switch, used by the clash marker and dimension count-up. */
  update?: (t: number) => void;
}

const LABEL_CLASS: Record<LabelTone, string> = {
  bubble:
    "grid size-6 place-items-center rounded-full border border-foreground/70 bg-background font-mono text-[12px] leading-none text-foreground",
  tag: "whitespace-nowrap rounded-md border border-border bg-background/90 px-2 py-0.5 font-mono text-[12px] text-foreground",
  dim: "whitespace-nowrap bg-background/80 px-1 font-mono text-[12px] text-muted-foreground tabular-nums",
  alert:
    "whitespace-nowrap rounded-md border border-destructive bg-background/95 px-2 py-0.5 font-mono text-[12px] font-medium text-destructive",
  ok: "whitespace-nowrap rounded-md border border-success bg-background/95 px-2 py-0.5 font-mono text-[12px] font-medium text-success",
};

interface Palette {
  face: number;
  wall: number;
  core: number;
  site: number;
  roof: number;
  water: number;
  ink: number;
  inkOpacity: number;
  accent: number;
  glass: number;
  glassOpacity: number;
  /** Neutral glass tint for the finished-building shot. */
  glassFinal: number;
  datum: number;
  hemiGround: number;
}

// Drawing palettes: light = ink on paper, dark = blueprint on plum. Hues follow the Magenta Night tokens.
export type SceneTheme = "light" | "dark" | "blueprint";

const PALETTES: Record<SceneTheme, Palette> = {
  light: {
    face: 0xffffff,
    wall: 0xf6ebf1,
    core: 0xeddbe5,
    site: 0xf6ebf1,
    roof: 0xecd3df,
    water: 0xdde8f4,
    ink: 0x26101d,
    inkOpacity: 0.78,
    accent: 0xc2185b,
    glass: 0xc2185b,
    glassOpacity: 0.12,
    glassFinal: 0xc3d0de,
    datum: 0xc2185b,
    hemiGround: 0xe8d3de,
  },
  dark: {
    face: 0x2a1433,
    wall: 0x24112c,
    core: 0x331a3d,
    site: 0x1d0c24,
    roof: 0x3d1a45,
    water: 0x1c2440,
    ink: 0xf8edf3,
    inkOpacity: 0.72,
    accent: 0xff3d84,
    glass: 0xff3d84,
    glassOpacity: 0.16,
    glassFinal: 0x3a4766,
    datum: 0xff3d84,
    hemiGround: 0x150a1b,
  },
  // Cyanotype: white ink on blue paper, pale cyan accent (the "blueprint" easter egg).
  blueprint: {
    face: 0x14509a,
    wall: 0x114690,
    core: 0x1a5aa8,
    site: 0x0e3f84,
    roof: 0x1d62b2,
    water: 0x1a58a6,
    ink: 0xeef6ff,
    inkOpacity: 0.8,
    accent: 0x8fd8ff,
    glass: 0x8fd8ff,
    glassOpacity: 0.18,
    glassFinal: 0x4d80c4,
    datum: 0x8fd8ff,
    hemiGround: 0x0a2f66,
  },
};

// Discipline colours for MEP (illustration only, never UI state).
const MEP = { hvac: 0x4f8cff, plumbing: 0x2fbf87, fire: 0xff4d5e, power: 0xf5b544 };

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const clamp01 = (v: number) => clamp(v, 0, 1);
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
const easeBack = (k: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
};
const smooth = (t: number, a: number, b: number) => {
  const k = clamp01((t - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** 20000 → "20 000" (drawing dimension style). */
const mm = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/**
 * Hand-drafted ink: every edge overshoots its corners by a fixed world distance (like a drafter's
 * lines crossing at corners) and each vertex is nudged by a stable per-position hash so lines sit
 * a hair off true. Needs an `aAxis` attribute (outward edge direction per vertex); geometries
 * without it simply get no overshoot.
 */
function sketchInk(material: THREE.LineBasicMaterial, overshoot: number, jitter: number) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uOvershoot = { value: overshoot };
    shader.uniforms.uJitter = { value: jitter };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec3 aAxis;
        uniform float uOvershoot;
        uniform float uJitter;
        float rvpyHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float rvpyAxisLen = length(mat3(modelMatrix) * aAxis);
        if (rvpyAxisLen > 1e-5) transformed += aAxis * (uOvershoot / rvpyAxisLen);`,
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vec3 rvpyW = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position.xy += (vec2(rvpyHash(rvpyW), rvpyHash(rvpyW.zxy + 7.13)) - 0.5) * uJitter * gl_Position.w;`,
      );
  };
}

/** Adds `aAxis` to a line-segment geometry: each vertex points away from its partner. */
function withAxes<T extends THREE.BufferGeometry>(geo: T): T {
  const p = geo.attributes.position as THREE.BufferAttribute;
  const axes = new Float32Array(p.count * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 0; i + 1 < p.count; i += 2) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    const d = b.sub(a).normalize();
    axes.set([-d.x, -d.y, -d.z], i * 3);
    axes.set([d.x, d.y, d.z], (i + 1) * 3);
  }
  geo.setAttribute("aAxis", new THREE.BufferAttribute(axes, 3));
  return geo;
}

export interface BuildingScene {
  setProgress(t: number): void;
  setTheme(theme: SceneTheme): void;
  resize(width: number, height: number): void;
  start(): void;
  stop(): void;
  dispose(): void;
}

export function createBuildingScene(
  canvas: HTMLCanvasElement,
  labelLayer: HTMLElement,
  opts: { theme: SceneTheme; reducedMotion: boolean },
): BuildingScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 400);

  // Soft, flat lighting: faces differ just enough to read the volume, like a shaded drawing.
  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 2.2);
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(14, 26, 18);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-20, 8, -12);
  scene.add(hemi, sun, fill);

  // --- Materials (colours are set in applyTheme) ---
  const faceProps = {
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    transparent: true,
  };
  const mat = {
    face: new THREE.MeshLambertMaterial(faceProps),
    wall: new THREE.MeshLambertMaterial(faceProps),
    core: new THREE.MeshLambertMaterial(faceProps),
    site: new THREE.MeshLambertMaterial({ ...faceProps, opacity: 0.9 }),
    glass: new THREE.MeshLambertMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    highlight: new THREE.MeshLambertMaterial({ ...faceProps, opacity: 0.55 }),
    clash: new THREE.MeshLambertMaterial({ color: 0xff4d5e, emissive: 0x6b0010 }),
    hvac: new THREE.MeshLambertMaterial({ color: MEP.hvac }),
    plumbing: new THREE.MeshLambertMaterial({ color: MEP.plumbing }),
    fire: new THREE.MeshLambertMaterial({ color: MEP.fire }),
    power: new THREE.MeshLambertMaterial({ color: MEP.power }),
    marker: new THREE.MeshBasicMaterial({ color: 0xff4d5e, transparent: true, opacity: 0.9 }),
    ink: new THREE.LineBasicMaterial({ transparent: true }),
    accentInk: new THREE.LineBasicMaterial({ transparent: true }),
    ghost: new THREE.LineBasicMaterial({ transparent: true, depthWrite: false }),
    grid: new THREE.LineDashedMaterial({ transparent: true, dashSize: 1.4, gapSize: 0.5 }),
    datum: new THREE.LineDashedMaterial({ transparent: true, dashSize: 0.6, gapSize: 0.35 }),
    dim: new THREE.LineBasicMaterial({ transparent: true }),
    pin: new THREE.MeshBasicMaterial({}),
    roof: new THREE.MeshLambertMaterial({ ...faceProps, side: THREE.DoubleSide }),
    tile: new THREE.LineBasicMaterial({ transparent: true, opacity: 0.4 }),
    water: new THREE.MeshLambertMaterial({ ...faceProps, opacity: 0.85 }),
  };
  sketchInk(mat.ink, 0.16, 0.0035);
  sketchInk(mat.accentInk, 0.16, 0.0035);
  sketchInk(mat.ghost, 0.3, 0.005);
  sketchInk(mat.dim, 0.45, 0.002);
  sketchInk(mat.tile, 0.08, 0.002);

  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const unitEdges = withAxes(new THREE.EdgesGeometry(unitBox));
  const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 18);
  const cylEdges = new THREE.EdgesGeometry(unitCyl, 30);
  const headGeo = new THREE.SphereGeometry(0.14, 12, 8);

  const pieces: Piece[] = [];
  const ghostBoxes: THREE.Matrix4[] = [];
  const labels: Label[] = [];
  const pickables: THREE.Mesh[] = [];
  const services: THREE.Mesh[] = []; // MEP, hidden again for the finished-building shot

  // Ground group plus one group per floor, so per-floor elements stay together.
  const ground = new THREE.Group();
  const floors = Array.from({ length: FLOORS }, () => new THREE.Group());
  scene.add(ground, ...floors);

  function track(obj: THREE.Object3D, t0: number, t1: number, mode: Mode, extra: Partial<Piece> = {}) {
    pieces.push({
      obj,
      pos: obj.position.clone(),
      scale: obj.scale.clone(),
      t0,
      t1,
      mode,
      axis: "y",
      offset: new THREE.Vector3(),
      ...extra,
    });
    obj.visible = false;
  }

  function pickable(m: THREE.Mesh, info?: ElementInfo) {
    if (!info) return;
    m.userData.info = info;
    m.userData.baseMat = m.material;
    pickables.push(m);
  }

  function box(
    parent: THREE.Object3D,
    material: THREE.Material,
    p: [number, number, number],
    s: [number, number, number],
    t0: number,
    t1: number,
    mode: Mode,
    extra: Partial<Piece> & { edges?: THREE.LineBasicMaterial | null; ghost?: boolean; info?: ElementInfo } = {},
  ) {
    const { edges = mat.ink, ghost = true, info, ...pieceExtra } = extra;
    const m = new THREE.Mesh(unitBox, material);
    m.position.set(...p);
    m.scale.set(...s);
    if (edges) m.add(new THREE.LineSegments(unitEdges, edges));
    parent.add(m);
    track(m, t0, t1, mode, pieceExtra);
    if (ghost) ghostBoxes.push(new THREE.Matrix4().compose(m.position, m.quaternion, m.scale));
    pickable(m, info);
    if (material === mat.hvac || material === mat.power) services.push(m);
    return m;
  }

  /** Cylinder whose length runs along `axis`. Animated by stretching its local Y. */
  function pipe(
    parent: THREE.Object3D,
    material: THREE.Material,
    p: [number, number, number],
    radius: number,
    length: number,
    axis: Axis,
    t0: number,
    t1: number,
    info?: ElementInfo,
  ) {
    const m = new THREE.Mesh(unitCyl, material);
    m.position.set(...p);
    m.scale.set(radius, length, radius);
    if (axis === "x") m.rotation.z = Math.PI / 2;
    if (axis === "z") m.rotation.x = Math.PI / 2;
    m.add(new THREE.LineSegments(cylEdges, mat.ink));
    parent.add(m);
    track(m, t0, t1, axis === "y" ? "grow" : "stretch", { axis: "y" });
    pickable(m, info);
    services.push(m);
    return m;
  }

  function line(
    parent: THREE.Object3D,
    material: THREE.LineBasicMaterial | THREE.LineDashedMaterial,
    points: [number, number, number][],
    t0: number,
    t1: number,
    mode: Mode = "stretch",
    axis: Axis = "x",
  ) {
    // Points are given relative to their centre so stretching grows from the middle out.
    const c = points.reduce((a, q) => a.add(new THREE.Vector3(...q)), new THREE.Vector3()).divideScalar(points.length);
    const geo = withAxes(new THREE.BufferGeometry().setFromPoints(points.map((q) => new THREE.Vector3(...q).sub(c))));
    const l = new THREE.LineSegments(geo, material);
    l.computeLineDistances();
    l.position.copy(c);
    parent.add(l);
    track(l, t0, t1, mode, { axis });
    return l;
  }

  function label(
    tone: LabelTone,
    text: string,
    anchor: THREE.Object3D,
    local: [number, number, number],
    t0: number,
    t1: number,
    update?: (el: HTMLElement, t: number) => void,
  ) {
    const el = document.createElement("span");
    el.className = `pointer-events-none absolute left-0 top-0 opacity-0 transition-opacity duration-300 will-change-transform ${LABEL_CLASS[tone]}`;
    el.textContent = text;
    el.setAttribute("aria-hidden", "true");
    labelLayer.appendChild(el);
    labels.push({ el, tone, anchor, local: new THREE.Vector3(...local), t0, t1, update: update && ((t) => update(el, t)) });
  }

  /** Spread n items over [a, b] (absolute time) with each item lasting `dur`. */
  const stagger = (i: number, n: number, a: number, b: number, dur: number): [number, number] => {
    const start = n <= 1 ? a : a + ((b - a - dur) * i) / (n - 1);
    return [start, start + dur];
  };

  // ============ STEP 1 — BIM basics & positioning: site, grids, levels, base/survey point ============
  box(ground, mat.site, [0, -0.1, 0], [36, 0.2, 24], 1.05, 1.3, "rise", { ghost: false });

  const gridAnchor = new THREE.Group();
  ground.add(gridAnchor);
  XS.forEach((x, i) => {
    const [a, b] = stagger(i, XS.length, 1.15, 1.5, 0.18);
    line(
      ground,
      mat.grid,
      [
        [x, 0.02, -9.6],
        [x, 0.02, 9.6],
      ],
      a,
      b,
      "stretch",
      "z",
    );
    label("bubble", GRID_X[i], gridAnchor, [x, 0, -10.4], a + 0.1, 2.95);
  });
  ZS.forEach((z, i) => {
    const [a, b] = stagger(i, ZS.length, 1.2, 1.5, 0.18);
    line(
      ground,
      mat.grid,
      [
        [-14.6, 0.02, z],
        [14.6, 0.02, z],
      ],
      a,
      b,
      "stretch",
      "x",
    );
    label("bubble", String(i + 1), gridAnchor, [-15.4, 0, z], a + 0.1, 2.95);
  });

  // Level datums: dashed outline around the footprint at every level, with an elevation tag.
  for (let i = 0; i <= FLOORS; i++) {
    const y = E(i);
    const [a, b] = stagger(i, FLOORS + 1, 1.35, 1.75, 0.2);
    line(
      ground,
      mat.datum,
      [
        [-12, y, -6.5],
        [12, y, -6.5],
        [12, y, -6.5],
        [12, y, 6.5],
        [12, y, 6.5],
        [-12, y, 6.5],
        [-12, y, 6.5],
        [-12, y, -6.5],
      ],
      a,
      b,
      "pop",
    );
    const elev = i === 0 ? "±0.000" : `+${(i * FLOOR).toFixed(3)}`;
    label("tag", `${levelName(i)}  ${elev}`, ground, [13.2, y, -6.5], b - 0.05, 3.1);
  }

  // Base point (circle + cross) and survey point (triangle), like the Revit symbols.
  const basePin = new THREE.Group();
  basePin.position.set(-13.5, 0.05, 8.5);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 32), mat.pin);
  ring.rotation.x = -Math.PI / 2;
  basePin.add(ring);
  basePin.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(0, 0, 1),
      ]),
      mat.accentInk,
    ),
  );
  ground.add(basePin);
  track(basePin, 1.6, 1.8, "pop");
  label("tag", "Base Point", basePin, [0, 0, 1.6], 1.72, 3.1);

  const surveyPin = new THREE.Group();
  surveyPin.position.set(13.5, 0.05, -8.5);
  const tri = new THREE.Mesh(new THREE.CircleGeometry(0.85, 3), mat.pin);
  tri.rotation.x = -Math.PI / 2;
  surveyPin.add(tri);
  ground.add(surveyPin);
  track(surveyPin, 1.66, 1.86, "pop");
  label("tag", "Survey Point", surveyPin, [-1.5, 1.6, 0], 1.78, 3.1);

  // Overall dimension strings along grid A and grid 1, with architectural ticks. Values count up as they draw.
  const dims = new THREE.Group();
  ground.add(dims);
  const tick = (x: number, z: number): [number, number, number][] => [
    [x - 0.35, 0.02, z + 0.35],
    [x + 0.35, 0.02, z - 0.35],
  ];
  const dimX: [number, number, number][] = [
    [-10, 0.02, 11.6],
    [10, 0.02, 11.6],
  ];
  XS.forEach((x) => dimX.push(...tick(x, 11.6)));
  line(dims, mat.dim, dimX, 1.5, 1.75, "stretch", "x");
  const dimZ: [number, number, number][] = [
    [16.6, 0.02, -5],
    [16.6, 0.02, 5],
  ];
  ZS.forEach((z) => dimZ.push(...tick(16.6, z)));
  line(dims, mat.dim, dimZ, 1.55, 1.8, "stretch", "z");
  label("dim", "20 000", dims, [0, 0, 12.5], 1.52, 3.1, (el, t) => {
    el.textContent = mm(Math.round((20000 * easeOut(smooth(t, 1.52, 1.75))) / 50) * 50);
  });
  label("dim", "10 000", dims, [17.6, 0, 0], 1.57, 3.1, (el, t) => {
    el.textContent = mm(Math.round((10000 * easeOut(smooth(t, 1.57, 1.8))) / 50) * 50);
  });

  // ============ STEP 2 — Structure: footings, then per floor columns → beams → slab, plus core ============
  XS.forEach((x, i) =>
    ZS.forEach((z, j) => {
      const [a, b] = stagger(i * ZS.length + j, XS.length * ZS.length, 2.04, 2.2, 0.08);
      box(ground, mat.face, [x, 0.225, z], [1.8, 0.45, 1.8], a, b, "rise", {
        info: {
          category: "Móng",
          id: `M-${GRID_X[i]}${j + 1}`,
          rows: [
            ["Loại", "Móng đơn BTCT"],
            ["Kích thước", "1 800 × 1 800 × 450"],
            ["Vật liệu", "Bê tông B25"],
          ],
        },
      });
    }),
  );
  box(ground, mat.face, [0, E(0) - 0.125, 0], [20.6, 0.25, 10.6], 2.17, 2.25, "drop", {
    info: {
      category: "Sàn",
      id: "S-L1",
      rows: [
        ["Dày", "250"],
        ["Cao độ", "±0.000"],
        ["Vật liệu", "Bê tông B30"],
      ],
    },
  });

  const beams: THREE.Mesh[][] = [];
  for (let k = 0; k < FLOORS; k++) {
    const g = floors[k];
    const w0 = 2.24 + k * 0.165;
    const top = E(k + 1);
    const colH = FLOOR - 0.25;
    XS.forEach((x, i) =>
      ZS.forEach((z, j) => {
        const [a, b] = stagger(i * ZS.length + j, 15, w0, w0 + 0.08, 0.04);
        box(g, mat.face, [x, E(k) + colH / 2, z], [0.4, colH, 0.4], a, b, "grow", {
          info: {
            category: "Cột",
            id: `C-${GRID_X[i]}${j + 1}-${levelName(k)}`,
            rows: [
              ["Tiết diện", "400 × 400"],
              ["Tầng", `${levelName(k)} → ${levelName(k + 1)}`],
              ["Chiều cao", mm(colH * 1000)],
              ["Vật liệu", "Bê tông B30"],
            ],
          },
        });
      }),
    );
    const floorBeams: THREE.Mesh[] = [];
    const beamRows = (span: string): [string, string][] => [
      ["Tiết diện", "300 × 500"],
      ["Nhịp", span],
      ["Tầng", levelName(k + 1)],
      ["Vật liệu", "Bê tông B30"],
    ];
    ZS.forEach((z, j) =>
      XS.slice(0, -1).forEach((x, i) => {
        floorBeams.push(
          box(g, mat.face, [x + 2.5, top - 0.35, z], [5, 0.5, 0.3], w0 + 0.07, w0 + 0.12, "stretch", {
            axis: "x",
            info: { category: "Dầm", id: `D-${j + 1}/${GRID_X[i]}–${GRID_X[i + 1]}`, rows: beamRows("5 000") },
          }),
        );
      }),
    );
    XS.forEach((x, i) =>
      ZS.slice(0, -1).forEach((z, j) => {
        floorBeams.push(
          box(g, mat.face, [x, top - 0.35, z + 2.5], [0.3, 0.5, 5], w0 + 0.08, w0 + 0.13, "stretch", {
            axis: "z",
            info: { category: "Dầm", id: `D-${GRID_X[i]}/${j + 1}–${j + 2}`, rows: beamRows("5 000") },
          }),
        );
      }),
    );
    beams.push(floorBeams);
    box(g, mat.face, [0, top - 0.125, 0], [20.6, 0.25, 10.6], w0 + 0.12, w0 + 0.165, "drop", {
      info: {
        category: "Sàn",
        id: `S-${levelName(k + 1)}`,
        rows: [
          ["Dày", "250"],
          ["Cao độ", `+${((k + 1) * FLOOR).toFixed(3)}`],
          ["Vật liệu", "Bê tông B30"],
        ],
      },
    });
    box(g, mat.core, [-2.5, E(k) + colH / 2, -3], [3.6, colH, 3.2], w0 + 0.03, w0 + 0.1, "grow", {
      info: {
        category: "Vách lõi",
        id: `VL-${levelName(k)}`,
        rows: [
          ["Kích thước", "3 600 × 3 200"],
          ["Dày vách", "250"],
          ["Công năng", "Thang máy, thang bộ"],
        ],
      },
    });
  }

  // ============ STEP 3 — Architecture: a modern office ============
  // North (front): glazed lobby set back behind the colonnade, upper floors with staggered balconies,
  // all wrapped by a white portal frame. West: stone wall with a slit window. East: glass behind
  // full-height fins whose depth swells towards the middle. Roof: a tiled hip roof ("mái Thái").
  const curtainWall = (id: string): ElementInfo => ({
    category: "Vách kính",
    id,
    rows: [
      ["Hệ", "Curtain Wall khung nhôm"],
      ["Kính", "Low-E 8 + 12A + 8"],
    ],
  });
  for (let k = 0; k < FLOORS; k++) {
    const g = floors[k];
    const w0 = 3.05 + k * 0.14;
    const h = FLOOR - 0.25;
    const yc = E(k) + h / 2;
    const L = levelName(k);

    // West: two stone panels with a full-height slit window between them.
    [-2.95, 2.95].forEach((z) =>
      box(g, mat.wall, [-10.15, yc, z], [0.25, h, 4.1], w0, w0 + 0.07, "slide", {
        offset: new THREE.Vector3(-4, 0, 0),
        info: {
          category: "Tường",
          id: `T-A-${L}`,
          rows: [
            ["Loại", "Tường bao 250"],
            ["Hoàn thiện", "Ốp đá granite"],
            ["Tầng", L],
          ],
        },
      }),
    );
    box(g, mat.glass, [-10.15, yc, 0], [0.06, h, 1.8], w0 + 0.04, w0 + 0.09, "drop", {
      edges: mat.accentInk,
      ghost: false,
      info: curtainWall(`CS-A-${L}`),
    });

    // East: glass skin behind vertical fins of varying depth.
    box(g, mat.glass, [10.15, yc, 0], [0.06, h, 10], w0 + 0.02, w0 + 0.07, "drop", {
      edges: mat.accentInk,
      ghost: false,
      info: curtainWall(`CW-E-${L}`),
    });
    // North and south curtain walls with two mullions per bay; the lobby glass sits behind the columns.
    [k === 0 ? 3.9 : 5.15, -5.15].forEach((z) =>
      XS.slice(0, -1).forEach((x, i) => {
        const cx = x + 2.5;
        const [a, b] = stagger(i, 4, w0 + 0.03, w0 + 0.11, 0.05);
        box(g, mat.glass, [cx, yc, z], [4.8, h, 0.06], a, b, "drop", {
          edges: mat.accentInk,
          ghost: false,
          info: curtainWall(`CW-${z > 0 ? "N" : "S"}-${L}-${i + 1}`),
        });
        [-1.6, 1.6].forEach((dx) =>
          box(g, mat.face, [cx + dx, yc, z], [0.08, h, 0.14], a, b, "drop", { ghost: false }),
        );
        if (k > 0) box(g, mat.face, [cx, E(k) + 1.1, z], [4.8, 0.08, 0.12], a, b, "drop", { ghost: false });

        // Staggered balconies on the front: a checkerboard rhythm across floors.
        if (z > 0 && k > 0 && (i + k) % 2 === 1) {
          box(g, mat.face, [cx, E(k) - 0.125, 6.15], [4.8, 0.25, 1.7], a + 0.02, b + 0.02, "slide", {
            offset: new THREE.Vector3(0, 0, 3),
            info: {
              category: "Ban công",
              id: `BC-${L}-${i + 1}`,
              rows: [
                ["Kích thước", "4 800 × 1 700"],
                ["Kết cấu", "Sàn công xôn BTCT"],
              ],
            },
          });
          box(g, mat.glass, [cx, E(k) + 0.55, 6.95], [4.8, 1.1, 0.04], a + 0.04, b + 0.04, "drop", {
            edges: mat.accentInk,
            ghost: false,
            info: {
              category: "Lan can",
              id: `LC-${L}-${i + 1}`,
              rows: [
                ["Loại", "Kính cường lực 12 ly"],
                ["Cao", "1 100"],
              ],
            },
          });
          box(g, mat.face, [cx, E(k) + 1.1, 6.95], [4.8, 0.06, 0.1], a + 0.04, b + 0.04, "drop", { ghost: false });
        }
      }),
    );

    // Portal frame blades on the upper floors.
    if (k > 0) {
      const frame: ElementInfo = {
        category: "Khung bao",
        id: `KB-${L}`,
        rows: [
          ["Tiết diện", "500 × 1 400"],
          ["Hoàn thiện", "Sơn trắng mờ"],
        ],
      };
      [-10.75, 10.75].forEach((x) =>
        box(g, mat.face, [x, E(k) + FLOOR / 2 - 0.125, 6.5], [0.5, FLOOR, 1.4], w0 + 0.08, w0 + 0.14, "grow", {
          info: frame,
        }),
      );
    }
  }

  // East fins: one continuous blade per position over the full height; depth swells towards the middle.
  const FINS = 7;
  for (let f = 0; f < FINS; f++) {
    const d = 0.35 + 0.55 * Math.sin((Math.PI * f) / (FINS - 1));
    const [a, b] = stagger(f, FINS, 3.15, 3.55, 0.1);
    box(
      ground,
      mat.face,
      [10.3 + d / 2, E(0) + (FLOORS * FLOOR) / 2, -4.2 + f * 1.4],
      [d, FLOORS * FLOOR, 0.12],
      a,
      b,
      "grow",
      {
        info: {
          category: "Lam đứng",
          id: `LAM-${String(f + 1).padStart(2, "0")}`,
          rows: [
            ["Tiết diện", `120 × ${mm(d * 1000)}`],
            ["Chiều cao", mm(FLOORS * FLOOR * 1000)],
            ["Vật liệu", "Nhôm sơn tĩnh điện"],
          ],
        },
      },
    );
  }

  const roof = floors[FLOORS - 1];
  const rt = E(FLOORS);

  // Hip roof ("mái Thái"): four slopes over a 1 m eave, ridge along the long axis, hips at 45° in plan.
  const RX = 11.3; // eave half-length
  const RZ = 6.3; // eave half-depth
  const RH = 5; // ridge height above the eave (~38°)
  const ry0 = rt + 0.15;
  const ry1 = ry0 + RH;
  const rr = RX - RZ; // ridge half-length
  const roofCorners = {
    a: [-RX, ry0, -RZ],
    b: [RX, ry0, -RZ],
    c: [RX, ry0, RZ],
    d: [-RX, ry0, RZ],
    r1: [-rr, ry1, 0],
    r2: [rr, ry1, 0],
  } as const;
  const { a: ra, b: rb, c: rc, d: rd, r1, r2 } = roofCorners;
  const roofGeo = new THREE.BufferGeometry();
  roofGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        ...[rd, rc, r2, rd, r2, r1], // front slope
        ...[rb, ra, r1, rb, r1, r2], // back slope
        ...[rc, rb, r2], // east hip
        ...[ra, rd, r1], // west hip
      ].flat(),
      3,
    ),
  );
  roofGeo.computeVertexNormals();
  const roofEdges = withAxes(new THREE.EdgesGeometry(roofGeo));
  const roofMesh = new THREE.Mesh(roofGeo, mat.roof);
  roofMesh.add(new THREE.LineSegments(roofEdges, mat.ink));

  // Tile courses: the roof's contour at regular heights, parallel to the eaves.
  const courses: number[] = [];
  for (let i = 1; i < 10; i++) {
    const f = i / 10;
    const y = ry0 + RH * f;
    const x = RX - RZ * f;
    const z = RZ * (1 - f);
    courses.push(-x, y, -z, x, y, -z, x, y, -z, x, y, z, x, y, z, -x, y, z, -x, y, z, -x, y, -z);
  }
  const courseGeo = new THREE.BufferGeometry();
  courseGeo.setAttribute("position", new THREE.Float32BufferAttribute(courses, 3));
  roofMesh.add(new THREE.LineSegments(withAxes(courseGeo), mat.tile));
  roof.add(roofMesh);
  // The roof goes on last, in the handover step, so the floors stay readable until then.
  track(roofMesh, 6.05, 6.35, "drop");
  pickable(roofMesh, {
    category: "Mái",
    id: "M-01",
    rows: [
      ["Loại", "Mái Thái 4 mái"],
      ["Độ dốc", "38°"],
      ["Vật liệu", "Ngói màu, xà gồ thép"],
      ["Mái đua", "1 000"],
    ],
  });
  // Ridge cap.
  box(roof, mat.roof, [0, ry1 + 0.06, 0], [rr * 2 + 0.3, 0.16, 0.3], 6.3, 6.4, "drop", { ghost: false });

  // Entrance canopy cantilevering from the first-floor slab.
  box(floors[0], mat.face, [0, E(1) - 0.2, 7.0], [9, 0.18, 3.4], 3.62, 3.7, "slide", {
    offset: new THREE.Vector3(0, 0, 5),
    info: {
      category: "Mái sảnh",
      id: "MS-01",
      rows: [
        ["Kích thước", "9 000 × 3 400"],
        ["Kết cấu", "Thép, ốp ACP"],
      ],
    },
  });

  // ============ Landscape: walkway, reflecting pool and people for scale ============
  box(ground, mat.face, [0, 0.03, 10.2], [3.6, 0.06, 6.2], 3.62, 3.7, "rise", {
    ghost: false,
    info: {
      category: "Lối đi",
      id: "LD-01",
      rows: [
        ["Vật liệu", "Đá lát granite"],
        ["Rộng", "3 600"],
      ],
    },
  });
  box(ground, mat.water, [-7, 0.04, 9.6], [7.5, 0.08, 3.2], 3.66, 3.74, "rise", {
    edges: mat.accentInk,
    ghost: false,
    info: {
      category: "Hồ cảnh quan",
      id: "HN-01",
      rows: [
        ["Kích thước", "7 500 × 3 200"],
        ["Sâu", "300"],
      ],
    },
  });

  function person(x: number, z: number, t0: number) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const body = new THREE.Mesh(unitCyl, mat.face);
    body.scale.set(0.2, 1.3, 0.2);
    body.position.y = 0.65;
    body.add(new THREE.LineSegments(cylEdges, mat.ink));
    const head = new THREE.Mesh(headGeo, mat.face);
    head.position.y = 1.5;
    g.add(body, head);
    ground.add(g);
    track(g, t0, t0 + 0.06, "pop");
  }
  const PEOPLE: [number, number][] = [
    [0.9, 9],
    [-0.8, 11.2],
    [3.2, 8.4],
    [-4.5, 12.2],
    [7.5, 7.6],
  ];
  PEOPLE.forEach(([x, z], i) => person(x, z, 3.8 + i * 0.03));

  // ============ STEP 4 — MEP: risers + ceiling runs per floor ============
  for (let k = 0; k < FLOORS; k++) {
    const g = floors[k];
    const w0 = 4.12 + k * 0.17;
    const yc = E(k + 1) - 1.0;
    const L = levelName(k);
    const riser = (name: string, size: string): ElementInfo => ({
      category: "Trục đứng",
      id: `${name}-${L}`,
      rows: [
        ["Kích thước", size],
        ["Tầng", L],
      ],
    });
    pipe(g, mat.hvac, [-0.2, E(k) + FLOOR / 2, -4.2], 0.18, FLOOR, "y", w0, w0 + 0.06, riser("TG", "Ø360"));
    pipe(g, mat.plumbing, [0.35, E(k) + FLOOR / 2, -4.2], 0.12, FLOOR, "y", w0 + 0.01, w0 + 0.07, riser("TN", "DN100"));
    pipe(g, mat.fire, [0.8, E(k) + FLOOR / 2, -4.2], 0.1, FLOOR, "y", w0 + 0.02, w0 + 0.08, riser("PC", "DN80"));
    const duct: ElementInfo = {
      category: "Ống gió",
      id: `OG-${L}-01`,
      rows: [
        ["Kích thước", "900 × 500"],
        ["Hệ", "Cấp gió tươi"],
        ["Vật liệu", "Tôn mạ kẽm"],
      ],
    };
    box(g, mat.hvac, [0, yc, -2.2], [19, 0.5, 0.9], w0 + 0.05, w0 + 0.13, "stretch", {
      axis: "x",
      ghost: false,
      info: duct,
    });
    box(g, mat.hvac, [-6, yc, -0.3], [0.6, 0.4, 3], w0 + 0.1, w0 + 0.15, "stretch", {
      axis: "z",
      ghost: false,
      info: duct,
    });
    box(g, mat.hvac, [6, yc, -0.3], [0.6, 0.4, 3], w0 + 0.11, w0 + 0.16, "stretch", {
      axis: "z",
      ghost: false,
      info: duct,
    });
    pipe(g, mat.plumbing, [0, yc + 0.15, 2.4], 0.12, 19, "x", w0 + 0.07, w0 + 0.14, {
      category: "Ống nước",
      id: `CN-${L}-01`,
      rows: [
        ["Đường kính", "DN100"],
        ["Hệ", "Cấp nước sinh hoạt"],
        ["Vật liệu", "PPR PN20"],
      ],
    });
    box(g, mat.power, [0, yc + 0.3, 3.4], [19, 0.1, 0.45], w0 + 0.08, w0 + 0.15, "stretch", {
      axis: "x",
      ghost: false,
      info: {
        category: "Máng cáp",
        id: `MC-${L}-01`,
        rows: [
          ["Kích thước", "450 × 100"],
          ["Hệ", "Điện động lực"],
        ],
      },
    });
    pipe(g, mat.fire, [8.2, yc - 0.1, 0], 0.09, 9.4, "z", w0 + 0.09, w0 + 0.16, {
      category: "Ống PCCC",
      id: `PC-${L}-01`,
      rows: [
        ["Đường kính", "DN80"],
        ["Hệ", "Sprinkler"],
        ["Vật liệu", "Thép tráng kẽm"],
      ],
    });
  }

  // ============ STEP 5 — Coordination: a duct runs through a beam, gets flagged, then rerouted ============
  const clashFloor = floors[1];
  const clashBeam = beams[1].find((b) => b.position.x === 5 && b.position.z === 2.5)!;
  const clashY = E(2) - 0.35;
  const fixedY = E(2) - 1.25;
  const clashDuct = box(clashFloor, mat.hvac, [5, clashY, 1.6], [6, 0.45, 0.7], 5.05, 5.18, "stretch", {
    axis: "x",
    ghost: false,
    info: {
      category: "Ống gió",
      id: "OG-L2-07",
      rows: [
        ["Kích thước", "700 × 450"],
        ["Hệ", "Hồi gió"],
        ["Ghi chú", "Hạ cao độ 900 để tránh dầm"],
      ],
    },
  });
  const marker = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), mat.marker);
  marker.position.set(5, clashY, 1.6);
  clashFloor.add(marker);
  track(marker, 5.15, 5.25, "pop");
  label("alert", "Va chạm · Ống gió × Dầm", marker, [0, 1.4, 0], 5.2, 6.0, (el, t) => {
    const fixed = t > 5.6;
    el.textContent = fixed ? "Đã xử lý · hạ ống gió 900" : "Va chạm · Ống gió × Dầm";
    el.className = el.className.replace(
      fixed ? LABEL_CLASS.alert : LABEL_CLASS.ok,
      fixed ? LABEL_CLASS.ok : LABEL_CLASS.alert,
    );
  });

  // Clash Detective report (Navisworks style), shown during the coordination step.
  const report = document.createElement("div");
  report.setAttribute("aria-hidden", "true");
  report.className =
    "pointer-events-none absolute top-[92px] left-6 hidden w-[300px] rounded-lg border border-border bg-background/95 font-mono text-[12px] opacity-0 transition-opacity duration-300 sm:block lg:top-[108px] lg:left-8";
  const reportHead = document.createElement("div");
  reportHead.className = "border-b border-border px-3 py-2";
  reportHead.innerHTML =
    '<p class="tracking-[.08em] text-primary uppercase">Clash Detective</p><p class="text-muted-foreground">Test 01 · Kết cấu × Cơ điện</p>';
  report.appendChild(reportHead);
  const clashRows = [
    { no: "#01", kind: "Hard", what: "Ống gió × Dầm D/2–3", level: "L3", flag: 5.18, done: 5.6 },
    { no: "#02", kind: "Soft · hở 50/100", what: "Máng cáp × Ống PCCC", level: "L2", flag: 5.32, done: 5.82 },
  ].map((c) => {
    const row = document.createElement("div");
    row.className =
      "grid grid-cols-[auto_1fr_auto] items-start gap-x-2 border-b border-border px-3 py-2 transition-opacity duration-300";
    const status = document.createElement("span");
    row.innerHTML = `<span class="text-muted-foreground">${c.no}</span><span class="text-foreground">${c.what}<br><span class="text-muted-foreground">${c.kind} · ${c.level}</span></span>`;
    row.appendChild(status);
    report.appendChild(row);
    return { ...c, row, status };
  });
  const reportFoot = document.createElement("p");
  reportFoot.className = "px-3 py-2 text-muted-foreground";
  report.appendChild(reportFoot);
  labelLayer.appendChild(report);

  function updateReport(t: number) {
    report.style.opacity = t > 5.12 && t < 6.02 ? "1" : "0";
    let done = 0;
    for (const c of clashRows) {
      c.row.style.opacity = t >= c.flag ? "1" : "0.25";
      const state = t >= c.done ? "done" : t >= c.flag ? "open" : "wait";
      if (state === "done") done++;
      if (c.status.dataset.state !== state) {
        c.status.dataset.state = state;
        c.status.textContent =
          state === "done" ? (c.kind === "Hard" ? "Đã xử lý" : "Chấp nhận") : state === "open" ? "Mới" : "—";
        c.status.className =
          state === "done"
            ? "text-success"
            : state === "open"
              ? c.kind === "Hard"
                ? "text-destructive"
                : "text-warning"
              : "text-muted-foreground";
      }
    }
    reportFoot.textContent = `Đã xử lý ${done}/${clashRows.length}`;
  }

  // ============ Ghost: the whole building as faint linework, visible in the hero ============
  const ghostPositions: number[] = [];
  const src = unitEdges.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (const m of ghostBoxes) {
    for (let i = 0; i < src.count; i++) {
      v.fromBufferAttribute(src, i).applyMatrix4(m);
      ghostPositions.push(v.x, v.y, v.z);
    }
  }
  ghostPositions.push(...(roofEdges.attributes.position.array as Float32Array));
  const ghostGeo = new THREE.BufferGeometry();
  ghostGeo.setAttribute("position", new THREE.Float32BufferAttribute(ghostPositions, 3));
  withAxes(ghostGeo);
  const ghost = new THREE.LineSegments(ghostGeo, mat.ghost);
  scene.add(ghost);

  // ============ Properties card (hover / tap an element) ============
  const card = document.createElement("div");
  card.setAttribute("aria-hidden", "true");
  card.className =
    "pointer-events-none absolute top-0 left-0 z-10 w-[232px] rounded-lg border border-border bg-background/95 font-mono text-[12px] opacity-0 transition-opacity duration-150";
  labelLayer.appendChild(card);
  let cardFor: THREE.Mesh | null = null;

  function renderCard(info: ElementInfo) {
    card.replaceChildren();
    const head = document.createElement("div");
    head.className = "flex items-baseline justify-between gap-3 border-b border-border px-3 py-2";
    const cat = document.createElement("span");
    cat.className = "tracking-[.08em] text-primary uppercase";
    cat.textContent = info.category;
    const id = document.createElement("span");
    id.className = "text-foreground";
    id.textContent = info.id;
    head.append(cat, id);
    const dl = document.createElement("dl");
    dl.className = "grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-3 py-2";
    for (const [k, val] of info.rows) {
      const dt = document.createElement("dt");
      dt.className = "text-muted-foreground";
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.className = "text-right text-foreground";
      dd.textContent = val;
      dl.append(dt, dd);
    }
    card.append(head, dl);
  }

  // ============ Theme ============
  let palette = PALETTES[opts.theme];
  const glassTint = new THREE.Color();
  const glassFinalTint = new THREE.Color();
  function applyTheme(theme: SceneTheme) {
    palette = PALETTES[theme];
    mat.face.color.set(palette.face);
    mat.wall.color.set(palette.wall);
    mat.core.color.set(palette.core);
    mat.site.color.set(palette.site);
    mat.glass.color.set(palette.glass);
    glassTint.set(palette.glass);
    glassFinalTint.set(palette.glassFinal);
    mat.highlight.color.set(palette.accent);
    mat.highlight.emissive.set(palette.accent).multiplyScalar(0.25);
    mat.ink.color.set(palette.ink);
    mat.accentInk.color.set(palette.accent);
    mat.ghost.color.set(palette.accent);
    mat.grid.color.set(palette.accent);
    mat.datum.color.set(palette.datum);
    mat.dim.color.set(palette.ink);
    mat.pin.color.set(palette.accent);
    mat.roof.color.set(palette.roof);
    mat.tile.color.set(palette.ink);
    mat.water.color.set(palette.water);
    hemi.groundColor.set(palette.hemiGround);
  }
  applyTheme(opts.theme);

  // ============ Camera keyframes, centred on each step (t = s + 0.5) ============
  const clashFocus = new THREE.Vector3(5, clashY, 1.6);
  const keys = [
    { az: 0.72, el: 0.42, r: 70, tgt: new THREE.Vector3(0, 8, 0) }, // hero: ghost building
    { az: 0.5, el: 0.95, r: 100, tgt: new THREE.Vector3(0, 0, 0.5) }, // near-plan view of the grids
    { az: 0.82, el: 0.46, r: 74, tgt: new THREE.Vector3(0, 6, 0) }, // structure
    { az: 1.08, el: 0.34, r: 84, tgt: new THREE.Vector3(0, 8.5, 0) }, // architecture
    { az: 0.38, el: 0.3, r: 64, tgt: new THREE.Vector3(0, 7, 0) }, // MEP x-ray
    { az: 0.7, el: 0.42, r: 52, tgt: clashFocus }, // clash close-up
    { az: 0.22, el: 0.26, r: 82, tgt: new THREE.Vector3(0, 8.5, 2) }, // finished building, beauty shot
  ];
  const tgt = new THREE.Vector3();
  // Drag-to-orbit offset; springs back to the scripted view when released.
  const user = { az: 0, el: 0, dragging: false, moved: 0, lastX: 0, lastY: 0 };
  function placeCamera(t: number, time: number) {
    const f = Math.min(Math.max(t - 0.5, 0), keys.length - 1);
    const i = Math.min(Math.floor(f), keys.length - 2);
    const k = smooth(f - i, 0, 1);
    const a = keys[i];
    const b = keys[i + 1];
    // The last step slowly orbits the finished building.
    const az =
      lerp(a.az, b.az, k) +
      smooth(t, 6.0, 7.0) * 0.45 +
      user.az +
      (opts.reducedMotion ? 0 : Math.sin(time * 0.00018) * 0.05);
    const el = clamp(lerp(a.el, b.el, k) + user.el, 0.05, 1.4);
    let r = lerp(a.r, b.r, k);
    if (camera.aspect < 1) r *= 1 + (1 - camera.aspect) * 1.1;
    tgt.lerpVectors(a.tgt, b.tgt, k);
    camera.position.set(
      tgt.x + r * Math.cos(el) * Math.sin(az),
      tgt.y + r * Math.sin(el),
      tgt.z + r * Math.cos(el) * Math.cos(az),
    );
    camera.lookAt(tgt);
  }

  // ============ Per-frame update ============
  function updatePieces(t: number) {
    for (const pc of pieces) {
      const k = clamp01((t - pc.t0) / (pc.t1 - pc.t0));
      const o = pc.obj;
      o.visible = k > 0.001;
      if (!o.visible) continue;
      const e = easeOut(k);
      o.position.copy(pc.pos);
      o.scale.copy(pc.scale);
      switch (pc.mode) {
        case "drop":
          o.position.y += (1 - e) * 6;
          break;
        case "rise":
          o.position.y -= (1 - e) * 2.5;
          break;
        case "grow":
          o.scale.y = Math.max(1e-3, pc.scale.y * e);
          o.position.y = pc.pos.y - (pc.scale.y * (1 - e)) / 2;
          break;
        case "stretch":
          o.scale[pc.axis] = Math.max(1e-3, pc.scale[pc.axis] * e);
          break;
        case "slide":
          o.position.addScaledVector(pc.offset, 1 - e);
          break;
        case "pop":
          o.scale.multiplyScalar(Math.max(1e-3, easeBack(k)));
          break;
      }
    }

    // X-ray during MEP and clash steps so the services read through the envelope.
    const xray = smooth(t, 4.0, 4.3) * (1 - smooth(t, 6.0, 6.25));
    mat.face.opacity = 1 - xray * 0.72;
    mat.core.opacity = 1 - xray * 0.75;
    mat.wall.opacity = 1 - xray * 0.85;
    // Glass reads as see-through while modelling, then as a solid tinted skin in the final shot.
    const finished = smooth(t, 5.9, 6.3);
    mat.glass.opacity = lerp(palette.glassOpacity, 0.42, finished) * (1 - xray * 0.7);
    mat.glass.color.lerpColors(glassTint, glassFinalTint, finished);
    const opaque = xray < 0.01;
    mat.face.depthWrite = mat.core.depthWrite = mat.wall.depthWrite = opaque;
    mat.ink.opacity = palette.inkOpacity * (1 - xray * 0.55);
    mat.accentInk.opacity = 0.8;

    // Datums fade before the floors separate; the ghost fades as the real model fills it in.
    const datums = 1 - smooth(t, 5.9, 6.2);
    mat.grid.opacity = 0.75 * datums;
    mat.datum.opacity = 0.55 * datums;
    mat.dim.opacity = 0.6 * datums;
    mat.ghost.opacity = (opts.theme === "light" ? 0.28 : 0.32) * (1 - smooth(t, 1.0, 1.5));
    ghost.visible = mat.ghost.opacity > 0.002;

    // Clash: beam turns red, duct drops below it, marker turns green.
    const resolve = smooth(t, 5.5, 5.75);
    const flagged = t > 5.15 && t < 6.0;
    clashBeam.material = flagged && resolve < 1 ? mat.clash : mat.face;
    clashDuct.position.y = lerp(clashY, fixedY, resolve);
    mat.marker.color.set(resolve > 0.5 ? 0x2fbf87 : 0xff4d5e);
    marker.visible = marker.visible && t < 6.05;
    if (t > 6.05) for (const m of services) m.visible = false;
  }

  // ============ Picking ============
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pointerPx = { x: 0, y: 0 };
  let pointerInside = false;
  let pointerDirty = false;
  let hovered: THREE.Mesh | null = null;

  function setHovered(next: THREE.Mesh | null) {
    if (hovered === next) return;
    if (hovered) {
      hovered.material = hovered.userData.baseMat;
      hovered.children.forEach((c) => {
        if (c instanceof THREE.LineSegments && c.userData.baseInk) c.material = c.userData.baseInk;
      });
    }
    hovered = next;
    canvas.style.cursor = next ? "pointer" : "grab";
  }

  function pick() {
    if (!pointerDirty) return;
    pointerDirty = false;
    let hit: THREE.Mesh | null = null;
    if (pointerInside && !user.dragging) {
      raycaster.setFromCamera(pointer, camera);
      const candidates = pickables.filter((m) => m.visible);
      hit = (raycaster.intersectObjects(candidates, false)[0]?.object as THREE.Mesh | undefined) ?? null;
    }
    setHovered(hit);
    if (hit && hit !== cardFor) {
      renderCard(hit.userData.info as ElementInfo);
      cardFor = hit;
    }
    card.style.opacity = hit ? "1" : "0";
  }

  function applyHover() {
    if (!hovered) return;
    hovered.material = mat.highlight;
    hovered.children.forEach((c) => {
      if (c instanceof THREE.LineSegments) {
        c.userData.baseInk ??= c.material;
        c.material = mat.accentInk;
      }
    });
    // Keep the card next to the pointer and inside the sheet.
    const x = clamp(pointerPx.x + 16, 8, width - 240);
    const y = clamp(pointerPx.y + 16, 8, height - card.offsetHeight - 8);
    card.style.transform = `translate(${x}px, ${y}px)`;
  }

  function updatePointer(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    pointerPx.x = e.clientX - r.left;
    pointerPx.y = e.clientY - r.top;
    pointer.set((pointerPx.x / r.width) * 2 - 1, -(pointerPx.y / r.height) * 2 + 1);
    pointerInside = true;
    pointerDirty = true;
  }

  const onPointerDown = (e: PointerEvent) => {
    updatePointer(e);
    user.dragging = true;
    user.moved = 0;
    user.lastX = e.clientX;
    user.lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  };
  const onPointerMove = (e: PointerEvent) => {
    updatePointer(e);
    if (!user.dragging) return;
    const dx = e.clientX - user.lastX;
    const dy = e.clientY - user.lastY;
    user.lastX = e.clientX;
    user.lastY = e.clientY;
    user.moved += Math.abs(dx) + Math.abs(dy);
    user.az = clamp(user.az - dx * 0.006, -1.6, 1.6);
    user.el = clamp(user.el + dy * 0.004, -0.3, 0.5);
  };
  const onPointerUp = (e: PointerEvent) => {
    user.dragging = false;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    pointerDirty = true; // a tap (no drag) shows the card on touch screens
  };
  const onPointerLeave = () => {
    pointerInside = false;
    pointerDirty = true;
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.style.cursor = "grab";

  // ============ Labels ============
  const proj = new THREE.Vector3();
  let width = 1;
  let height = 1;
  const tags: { l: Label; x: number; y: number }[] = [];
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  function updateLabels(t: number) {
    tags.length = 0;
    for (const l of labels) {
      const on = t >= l.t0 && t <= l.t1 && l.anchor.visible;
      if (on) {
        l.update?.(t);
        proj.copy(l.local);
        l.anchor.localToWorld(proj);
        proj.project(camera);
        const visible = proj.z < 1;
        const x = ((proj.x + 1) / 2) * width;
        const y = ((1 - proj.y) / 2) * height;
        l.el.style.opacity = visible ? "1" : "0";
        l.box ??= l.tone === "tag" && l.el.offsetWidth ? { w: l.el.offsetWidth, h: l.el.offsetHeight } : undefined;
        if (l.box && visible) tags.push({ l, x, y });
        else l.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      } else if (l.el.style.opacity !== "0") {
        l.el.style.opacity = "0";
      }
    }

    // Keep tags inside the sheet and off each other: on a phone the level tags and the survey
    // point land in the same corner. Placed top to bottom, each tag only ever steps down, so the
    // level tags keep their storey order.
    placed.length = 0;
    tags.sort((a, b) => a.y - b.y);
    for (const { l, x: x0, y: y0 } of tags) {
      const { w, h } = l.box!;
      const x = Math.min(Math.max(x0, w / 2 + 8), width - w / 2 - 8);
      let y = y0;
      for (const p of placed) {
        if (Math.abs(p.x - x) < (p.w + w) / 2 + 4 && Math.abs(p.y - y) < (p.h + h) / 2 + 2) {
          y = p.y + (p.h + h) / 2 + 3;
        }
      }
      placed.push({ x, y, w, h });
      l.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    }
  }

  let target = 0;
  let current = 0;
  let running = false;
  let lastTime = 0;
  function frame(time: number) {
    // Frame-rate independent easing toward the scroll position (~150 ms time constant).
    const dt = lastTime ? Math.min(time - lastTime, 1000) : 16;
    lastTime = time;
    current += (target - current) * (opts.reducedMotion ? 1 : 1 - Math.exp(-dt / 150));
    if (Math.abs(target - current) < 1e-4) current = target;
    if (!user.dragging) {
      const decay = Math.exp(-dt / 700);
      user.az *= decay;
      user.el *= decay;
    }
    updatePieces(current);
    placeCamera(current, time);
    if (marker.visible && !opts.reducedMotion) marker.scale.multiplyScalar(1 + Math.sin(time * 0.008) * 0.18);
    scene.updateMatrixWorld();
    if (!user.dragging) pointerDirty = true; // the model moves under a still pointer while scrolling
    pick();
    applyHover();
    updateLabels(current);
    updateReport(current);
    renderer.render(scene, camera);
  }

  return {
    setProgress(t) {
      target = Math.min(Math.max(t, 0), STAGE_COUNT);
    },
    setTheme: applyTheme,
    resize(w, h) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    start() {
      if (running) return;
      running = true;
      renderer.setAnimationLoop(frame);
    },
    stop() {
      running = false;
      lastTime = 0;
      renderer.setAnimationLoop(null);
    },
    dispose() {
      renderer.setAnimationLoop(null);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) o.geometry.dispose();
      });
      Object.values(mat).forEach((m) => m.dispose());
      labels.forEach((l) => l.el.remove());
      report.remove();
      card.remove();
      renderer.dispose();
    },
  };
}
