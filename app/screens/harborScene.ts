import * as THREE from "three";

type Point = readonly [number, number, number];

export type HarborScene = {
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export function mountHarborScene(mount: HTMLElement, onContextLost: () => void): HarborScene {
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 90);
  camera.position.set(7.9, 4.1, 17.8);
  camera.lookAt(0, 2.7, 0);
  scene.add(new THREE.HemisphereLight(0xffe3be, 0x506b88, 1.45));
  const sun = new THREE.DirectionalLight(0xffa752, 2);
  sun.position.set(3, 5, -4);
  scene.add(sun);
  const reflectedLight = new THREE.DirectionalLight(0xb0dbff, 0.6);
  reflectedLight.position.set(-2, 3, 6);
  scene.add(reflectedLight);

  const { ship, sails, flag } = createShip();
  const water = createWater();
  scene.add(ship, water);

  let elapsed = 0;
  let previousTime = 0;
  let frameId = 0;
  let paused = false;
  let disposed = false;

  function render() {
    ship.position.set(0.78 * Math.sin(elapsed * 0.31), 0.023 + 0.095 * Math.sin(elapsed * 1.9), 0.24 * Math.sin(elapsed * 0.47));
    ship.rotation.set(0.062 * Math.sin(elapsed * 1.38), -0.15 + 0.10 * Math.sin(elapsed * 0.48), 0.032 * Math.sin(elapsed * 1.12));
    sails.forEach((sail, index) => {
      sail.scale.z = 1 + 0.13 * Math.sin(elapsed * 2.1 + index);
    });
    flag.rotation.y = 0.5 * Math.sin(elapsed * 3.4);
    water.material.uniforms.time.value = elapsed;
    water.material.uniforms.center.value.set(ship.position.x, ship.position.z);
    renderer.render(scene, camera);
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = mount;
    if (!width || !height || disposed || document.hidden) return;

    const narrow = width <= 680;
    const offsetX = width * (narrow ? -0.04 : -0.17);
    camera.setViewOffset(width, height, offsetX, height * (narrow ? 0.09 : 0.018), width, height);
    renderer.setSize(width, height, false);
    renderer.getDrawingBufferSize(water.material.uniforms.resolution.value);
    render();
  }

  function tick(timestamp: number) {
    if (previousTime) elapsed += Math.min((timestamp - previousTime) / 1000, 0.05);
    previousTime = timestamp;
    render();
    frameId = requestAnimationFrame(tick);
  }

  function syncPlayback() {
    if (paused || document.hidden || disposed) {
      cancelAnimationFrame(frameId);
      frameId = 0;
      previousTime = 0;
    } else if (!frameId) {
      frameId = requestAnimationFrame(tick);
    }
  }

  function onVisibilityChange() {
    if (!document.hidden) resize();
    syncPlayback();
  }

  const observer = new ResizeObserver(resize);

  function dispose() {
    if (disposed) return;
    disposed = true;
    syncPlayback();
    observer.disconnect();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    canvas.remove();

    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometries.add(object.geometry);
        const parts = Array.isArray(object.material) ? object.material : [object.material];
        for (const part of parts) materials.add(part);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) {
      if (material instanceof THREE.MeshLambertMaterial) material.map?.dispose();
      material.dispose();
    }
    renderer.dispose();
    renderer.forceContextLoss();
  }

  try {
    resize();
    mount.appendChild(canvas);
    observer.observe(mount);
    canvas.addEventListener("webglcontextlost", onContextLost);
    document.addEventListener("visibilitychange", onVisibilityChange);
    syncPlayback();
  } catch (error) {
    dispose();
    throw error;
  }

  return {
    setPaused(value) {
      paused = value;
      syncPlayback();
    },
    dispose,
  };
}

function createWater() {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      time: { value: 0 },
      center: { value: new THREE.Vector2() },
      resolution: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: `
      uniform float time;
      varying vec2 surface;

      void main() {
        vec3 p = position;
        p.z = .045 * sin(p.x * 1.8 + p.y * 2.4 + time * 1.75)
            + .022 * cos(p.y * 3.5 - time * 1.13);
        vec4 world = modelMatrix * vec4(p, 1.);
        surface = world.xz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec2 center;
      uniform vec2 resolution;
      varying vec2 surface;

      void main() {
        vec2 screen = gl_FragCoord.xy / resolution;
        // Fade into the painted water and keep the distant shoreline clear.
        float mask = smoothstep(.36, .52, screen.x) * (1. - smoothstep(.31, .405, screen.y));
        float a = sin(surface.y * 5.7 + sin(surface.x * 1.2 + surface.y * .4 + time * .7) * .9 - time * 2.2);
        float b = sin(surface.x * 1.28 - surface.y * 3.1 + time * 1.12) * sin(.72 * surface.x + surface.y * 1.2);
        float streak = smoothstep(.66, .98, a) * smoothstep(.05, .76, b);
        float sunDistance = (screen.x - .76) * 5.2;
        float amber = exp(-sunDistance * sunDistance);
        vec2 local = (surface - center) * vec2(.27, .59);
        float wakeDistance = (length(local) - 1.04) * 7.;
        float wake = exp(-wakeDistance * wakeDistance) * (.24 + .76 * smoothstep(.3, .8, a * b));
        float shadow = .33 * exp(-dot(local, local) * 2.25);
        float glint = streak * (.17 + .16 * amber) + .29 * wake;
        vec3 shine = mix(vec3(.20, .73, .72), vec3(1., .70, .35), amber);
        vec3 color = mix(vec3(.03, .13, .19), shine, glint / max(.001, glint + shadow));
        gl_FragColor = vec4(color, (glint + shadow) * mask);
      }
    `,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(84, 84, 72, 72), material);
  sea.rotation.x = -Math.PI / 2;
  return sea;
}

function createShip() {
  const ship = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: 0x6b3328 });
  const rail = new THREE.MeshLambertMaterial({ color: 0x341f24 });
  const trim = new THREE.MeshLambertMaterial({ color: 0xc0843e });
  const rope = new THREE.LineBasicMaterial({ color: 0x372730, transparent: true, opacity: 0.83 });
  const plank = new THREE.BoxGeometry(1, 1, 1);
  const rod = new THREE.CylinderGeometry(1, 1, 1, 8);
  const up = new THREE.Vector3(0, 1, 0);

  function place(geometry: THREE.BufferGeometry, material: THREE.Material, position: Point) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    ship.add(mesh);
    return mesh;
  }

  function beam(start: Point, end: Point, radius: number, material: THREE.Material) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const segment = b.clone().sub(a);
    const piece = place(rod, material, a.lerp(b, 0.5).toArray());
    piece.scale.set(radius, segment.length(), radius);
    piece.quaternion.setFromUnitVectors(up, segment.normalize());
  }

  function rig(points: Point[]) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map((point) => new THREE.Vector3(...point)));
    ship.add(new THREE.Line(geometry, rope));
  }

  // The port-side stations also define the mirrored hull, deck and rail.
  const stations: Point[] = [[-3.7, .82, 0], [-3.5, .72, 1.01], [-2.35, .48, 1.28], [-.7, .41, 1.43],
    [1.1, .44, 1.35], [2.6, .57, .93], [3.72, .87, 0]];
  const outline = stations.concat(stations.slice(1, -1).reverse().map(([x, y, z]): Point => [x, y, -z]));
  const layers = [
    outline.map(([x, , z]): Point => [x * .83, -.45, z * .47]),
    outline.map(([x, y, z]): Point => [x * .98, y * .18 - .08, z * .94]),
    outline,
  ];
  const hullVertices: number[] = [];
  for (let ring = 1; ring < layers.length; ring += 1) {
    const lower = layers[ring - 1];
    const upper = layers[ring];
    for (let index = 0; index < outline.length; index += 1) {
      const next = (index + 1) % outline.length;
      hullVertices.push(...lower[index], ...lower[next], ...upper[next], ...lower[index], ...upper[next], ...upper[index]);
    }
  }
  const hull = new THREE.MeshLambertMaterial({ color: 0x632c2c, side: THREE.DoubleSide, flatShading: true });
  place(triangles(hullVertices), hull, [0, 0, 0]);

  const deckVertices: number[] = [];
  const railOutline = outline.map(([x, y, z]): Point => [x, y + .26, z]);
  for (let index = 0; index < outline.length; index += 1) {
    const next = (index + 1) % outline.length;
    deckVertices.push(...outline[index], ...outline[next], 0, .40, 0);
    beam(outline[index], outline[next], .065, trim);
    beam(railOutline[index], railOutline[next], .065, rail);
    beam(outline[index], railOutline[index], .035, trim);
  }
  const deck = new THREE.MeshLambertMaterial({ color: 0x9a5635, side: THREE.DoubleSide });
  place(triangles(deckVertices), deck, [0, 0, 0]);
  place(plank, wood, [-2.52, .62, 0]).scale.set(1.45, .58, 1.48);
  place(plank, trim, [-2.52, .95, 0]).scale.set(1.56, .10, 1.56);
  beam([2.68, .67, 0], [4.52, 1.43, 0], .085, wood);

  const lantern = new THREE.MeshBasicMaterial({ color: 0xffcd76 });
  for (const [x, z] of [[-2.62, .76], [-2.2, .76], [2.48, .84]]) {
    place(plank, rail, [x, .70, z]).scale.set(.25, .32, .2);
    place(plank, lantern, [x, .70, z + .11]).scale.set(.14, .18, .04);
  }

  const cloth = new THREE.MeshLambertMaterial({ map: sailTexture(false), side: THREE.DoubleSide });
  const compassCloth = new THREE.MeshLambertMaterial({ map: sailTexture(true), side: THREE.DoubleSide });

  function addSail(x: number, height: number, width: number, span: number, material: THREE.Material) {
    const yaw = -.49;
    const geometry = new THREE.PlaneGeometry(width, span, 18, 13);
    const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const u = positions.getX(index);
      const v = positions.getY(index);
      const arc = Math.sin(Math.PI * (u / width + .5));
      const vRatio = v / span + .5;
      const billow = arc * (.15 + .89 * Math.sin(Math.PI * vRatio));
      positions.setXYZ(index, u * (1 - .13 * vRatio), v + .18 * arc * (1 - .5 * vRatio), billow);
    }
    geometry.computeVertexNormals();
    const sail = place(geometry, material, [x, height, .16]);
    sail.rotation.y = yaw;
    const dx = width * .49 * Math.cos(yaw);
    const dz = -width * .49 * Math.sin(yaw);
    const topY = height + span * .52;
    beam([x - dx, topY, .16 - dz], [x + dx, topY, .16 + dz], .045, wood);
    rig([[x - dx, topY, .16 - dz], [x, topY + .49, 0], [x + dx, topY, .16 + dz]]);
    return sail;
  }

  beam([-.84, .41, 0], [-.84, 6.04, 0], .104, wood);
  beam([1.9, .41, 0], [1.9, 4.67, 0], .091, wood);
  rig([[-3.38, .92, -.64], [-.84, 5.81, 0], [1.9, 4.55, 0], [4.45, 1.40, 0]]);
  rig([[-2.08, .68, 1.19], [-.84, 5.08, 0], [.52, .68, 1.36]]);
  rig([[.85, .72, -1.22], [1.9, 4.30, 0], [2.6, .85, .7]]);
  const sails = [
    addSail(-.84, 4.82, 2.58, 1.12, cloth),
    addSail(-.84, 2.96, 3.38, 2.03, compassCloth),
    addSail(1.9, 3.01, 2.18, 2.0, cloth),
  ];
  const red = new THREE.MeshLambertMaterial({ color: 0x8f352e, side: THREE.DoubleSide });
  const flag = place(triangles([0, 0, 0, -.95, -.27, .16, 0, -.36, 0]), red, [-.84, 6.03, 0]);
  return { ship, sails, flag };
}

function triangles(vertices: number[]) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function sailTexture(compass: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");

  const fade = context.createLinearGradient(0, 0, 256, 0);
  fade.addColorStop(0, "#ab794f");
  fade.addColorStop(.09, "#f5dfb8");
  fade.addColorStop(.36, "#e4c595");
  fade.addColorStop(.54, "#f2d8a7");
  fade.addColorStop(.88, "#e8cc9b");
  fade.addColorStop(1, "#ab794f");
  context.fillStyle = fade;
  context.fillRect(0, 0, 256, 256);
  context.fillStyle = "#a4483f";
  context.fillRect(0, 184, 256, 47);
  context.fillStyle = "#db9360";
  context.fillRect(0, 184, 256, 3);
  context.fillRect(0, 228, 256, 3);
  context.strokeStyle = "#93644255";
  for (let x = 16; x < 256; x += 37) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, 256);
    context.stroke();
  }
  if (compass) {
    context.translate(128, 105);
    context.strokeStyle = context.fillStyle = "#843b36";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, 0, 34, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(0, -48);
    const points = [[8, -9], [42, 0], [8, 9], [0, 48], [-8, 9], [-42, 0], [-8, -9]];
    for (const [x, y] of points) context.lineTo(x, y);
    context.closePath();
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
