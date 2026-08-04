import * as THREE from "three";
import type { SceneFactories } from "./createSceneFactories";
import { futureSite } from "./worldData";

/**
 * Builds the mainboard perimeter illumination, component-to-component bus
 * network, vias, and Daniel Silva glass name plaque.
 */
export function createBoardCircuitry(
  scene: THREE.Scene,
  { makeBox, dark, copper, addTopBorder }: Pick<
    SceneFactories,
    "makeBox" | "dark" | "copper" | "addTopBorder"
  >,
  glowMaterial: THREE.Material,
  maxAnisotropy: number,
) {
  // PCB edge rails and copper trace highways
  makeBox(180, 0.7, 2, dark, 0, -0.25, -89);
  makeBox(180, 0.7, 2, dark, 0, -0.25, 89);
  makeBox(2, 0.7, 176, dark, -89, -0.25, 0);
  makeBox(2, 0.7, 176, dark, 89, -0.25, 0);
  makeBox(178, 0.12, 0.22, glowMaterial, 0, 0.14, -88.9);
  makeBox(178, 0.12, 0.22, glowMaterial, 0, 0.14, 88.9);
  makeBox(0.22, 0.12, 176, glowMaterial, -88.9, 0.14, 0);
  makeBox(0.22, 0.12, 176, glowMaterial, 88.9, 0.14, 0);
  const addTrace = (
    a: [number, number],
    b: [number, number],
    width = 0.34,
  ) => {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      length = Math.hypot(dx, dz);
    const trace = makeBox(
      width,
      0.028,
      length,
      copper,
      (a[0] + b[0]) / 2,
      0.048,
      (a[1] + b[1]) / 2,
    );
    trace.rotation.y = Math.atan2(dx, dz);
  };
  const addBus = (points: [number, number][], width = 0.34) =>
    points.slice(1).forEach((point, i) => addTrace(points[i], point, width));
  addBus(
    [
      [-38, -28],
      [-38, -8],
      [0, -8],
      [0, 0],
    ],
    0.62,
  );
  addBus(
    [
      [36, -34],
      [36, -8],
      [0, -8],
    ],
    0.62,
  );
  addBus(
    [
      [42, 30],
      [42, 8],
      [0, 8],
      [0, 0],
    ],
    0.62,
  );
  addBus(
    [
      [0, 80],
      [0, 8],
    ],
    0.7,
  );
  addBus(
    [
      [0, 72],
      [26, 72],
      [26, 76],
      [futureSite.x, 76],
      [futureSite.x, futureSite.z],
    ],
    0.48,
  );
  addBus(
    [
      [-34, 72],
      [-34, 54],
      [0, 54],
    ],
    0.34,
  );
  addBus(
    [
      [-20, -30],
      [-20, -20],
      [-38, -20],
    ],
    0.3,
  );
  addBus(
    [
      [-14, -30],
      [-14, -16],
      [-38, -16],
    ],
    0.3,
  );
  addBus(
    [
      [-8, -30],
      [-8, -12],
      [-38, -12],
    ],
    0.3,
  );
  addBus(
    [
      [15, 26],
      [15, 8],
      [42, 8],
    ],
    0.3,
  );
  addBus(
    [
      [21, 26],
      [21, 12],
      [42, 12],
    ],
    0.3,
  );
  addBus(
    [
      [27, 26],
      [27, 16],
      [42, 16],
    ],
    0.3,
  );
  addBus(
    [
      [46, -12],
      [36, -12],
      [36, -34],
    ],
    0.3,
  );
  addBus(
    [
      [52, -12],
      [52, -20],
      [36, -20],
    ],
    0.3,
  );
  addBus(
    [
      [-58, 12],
      [-38, 12],
      [-38, -8],
    ],
    0.42,
  );
  addBus(
    [
      [8, -46],
      [8, -34],
      [36, -34],
    ],
    0.42,
  );
  addBus(
    [
      [13, 45],
      [42, 45],
      [42, 30],
    ],
    0.42,
  );
  addBus(
    [
      [-48, 52],
      [-48, 8],
      [0, 8],
    ],
    0.42,
  );
  const brandCanvas = document.createElement("canvas");
  brandCanvas.width = 1536;
  brandCanvas.height = 512;
  const brandContext = brandCanvas.getContext("2d");
  if (brandContext) {
    brandContext.clearRect(0, 0, 1536, 512);
    brandContext.fillStyle = "#08130f";
    brandContext.fillRect(0, 0, 1536, 512);
    brandContext.strokeStyle = "#2b746c";
    brandContext.lineWidth = 8;
    brandContext.strokeRect(20, 20, 1496, 472);
    brandContext.textAlign = "center";
    brandContext.fillStyle = "#c8ff55";
    brandContext.shadowColor = "#6effb3";
    brandContext.shadowBlur = 34;
    brandContext.font = "800 168px sans-serif";
    brandContext.fillText("DANIEL SILVA", 768, 286);
    brandContext.shadowBlur = 0;
    brandContext.fillStyle = "#61ddeb";
    brandContext.font = "700 31px monospace";
    brandContext.letterSpacing = "12px";
    brandContext.fillText("CREATIVE DEVELOPER // SYSTEM BUILDER", 768, 382);
  }
  const brandTexture = new THREE.CanvasTexture(brandCanvas);
  brandTexture.colorSpace = THREE.SRGBColorSpace;
  brandTexture.anisotropy = maxAnisotropy;
  const plaqueBase = makeBox(25, 0.08, 9, dark, 18, 0.02, 0.2);
  const plaqueBorder = new THREE.LineBasicMaterial({
    color: 0x56edee,
    transparent: true,
    opacity: 0.9,
  });
  addTopBorder(plaqueBase, 25, 0.08, 9, plaqueBorder);
  const brandGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(23.8, 7.8),
    new THREE.MeshBasicMaterial({
      map: brandTexture,
      transparent: true,
      opacity: 0.94,
      toneMapped: false,
    }),
  );
  brandGlass.rotation.x = -Math.PI / 2;
  brandGlass.position.set(18, 0.075, 0.2);
  scene.add(brandGlass);
  [
    [18, -4.25, 24.9, 0.08],
    [18, 4.65, 24.9, 0.08],
    [5.55, 0.2, 0.08, 8.9],
    [30.45, 0.2, 0.08, 8.9],
  ].forEach(([x, z, w, d]) => makeBox(w, 0.055, d, glowMaterial, x, 0.09, z));
}
