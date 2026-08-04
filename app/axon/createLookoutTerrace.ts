import * as THREE from "three";
import type { SceneFactories } from "./createSceneFactories";
import type { CollisionSolid } from "./createTraversalFactories";

type AddDeck = (
  width: number, height: number, depth: number,
  x: number, y: number, z: number,
) => THREE.Mesh;

/**
 * Builds Capacitor Terrace's credential wall, vertical light lift, glass
 * lookout, celebration trigger, fireworks, and laser-show emitters.
 */
export function createLookoutTerrace(
  scene: THREE.Scene,
  groundSurfaces: THREE.Object3D[],
  componentSolids: CollisionSolid[],
  addDeck: AddDeck,
  { makeBox, addTopBorder }: Pick<SceneFactories, "makeBox" | "addTopBorder">,
) {
  // Degree credential illuminated across the east wall of Capacitor Terrace.
  const degreeCanvas = document.createElement("canvas");
  degreeCanvas.width = 1536;
  degreeCanvas.height = 384;
  const degreeContext = degreeCanvas.getContext("2d");
  if (degreeContext) {
    degreeContext.fillStyle = "#07110f";
    degreeContext.fillRect(0, 0, 1536, 384);
    degreeContext.strokeStyle = "#38e6ff";
    degreeContext.lineWidth = 8;
    degreeContext.strokeRect(18, 18, 1500, 348);
    degreeContext.fillStyle = "#38e6ff";
    degreeContext.fillRect(54, 74, 12, 236);
    degreeContext.textAlign = "left";
    degreeContext.shadowColor = "#38e6ff";
    degreeContext.shadowBlur = 24;
    degreeContext.fillStyle = "#baf8ff";
    degreeContext.font = "700 92px monospace";
    degreeContext.fillText("BS IN GAME PROGRAMMING", 108, 180);
    degreeContext.shadowBlur = 8;
    degreeContext.fillStyle = "#73cfdc";
    degreeContext.font = "38px monospace";
    degreeContext.fillText("UNIVERSITY OF ADVANCING TECHNOLOGY", 112, 258);
  }
  const degreeTexture = new THREE.CanvasTexture(degreeCanvas);
  degreeTexture.colorSpace = THREE.SRGBColorSpace;
  const degreeDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(18.8, 2.45),
    new THREE.MeshBasicMaterial({
      map: degreeTexture,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  degreeDisplay.rotation.y = Math.PI / 2;
  degreeDisplay.position.set(-23.98, 1.5, 28);
  degreeDisplay.renderOrder = 5;
  scene.add(degreeDisplay);
  // Tractor beam through a framed developer deck
  addDeck(8, 0.7, 18, -42, 10.05, 28);
  addDeck(8, 0.7, 18, -30, 10.05, 28);
  addDeck(4, 0.7, 7, -36, 10.05, 22.5);
  addDeck(4, 0.7, 7, -36, 10.05, 33.5);
  const liftLightMat = new THREE.MeshStandardMaterial({
    color: 0x74f5ff,
    emissive: 0x25dfff,
    emissiveIntensity: 1.35,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  makeBox(3.5, 0.08, 3.5, liftLightMat, -36, 0.04, 28);
  const liftColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(1.65, 1.65, 10.4, 24, 1, true),
    liftLightMat,
  );
  liftColumn.position.set(-36, 5.2, 28);
  scene.add(liftColumn);
  for (let y = 0.35; y <= 10.35; y += 1.35) {
    const liftRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.72, 0.045, 8, 32),
      liftLightMat,
    );
    liftRing.rotation.x = Math.PI / 2;
    liftRing.position.set(-36, y, 28);
    scene.add(liftRing);
  }
  const lookoutGlass = new THREE.MeshStandardMaterial({
    color: 0x56dff2,
    emissive: 0x1da9ce,
    emissiveIntensity: 1.25,
    transparent: true,
    opacity: 0.26,
    metalness: 0.18,
    roughness: 0.12,
    depthWrite: false,
  });
  const addLookoutRail = (w: number, d: number, x: number, z: number) => {
    const rail = makeBox(w, 1.65, d, lookoutGlass, x, 11.23, z);
    addTopBorder(rail, w, 1.65, d);
  };
  addLookoutRail(20, 0.18, -36, 19.08);
  addLookoutRail(0.18, 18, -45.92, 28);
  addLookoutRail(0.18, 18, -26.08, 28);
  addLookoutRail(8, 0.18, -42, 36.92);
  addLookoutRail(8, 0.18, -30, 36.92);
  const lookoutButtonMaterial = new THREE.MeshStandardMaterial({
    color: 0x263b30,
    emissive: 0xc8ff55,
    emissiveIntensity: 1.8,
    metalness: 0.7,
    roughness: 0.22,
  });
  const lookoutButton = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.25, 0.18, 32),
    lookoutButtonMaterial,
  );
  lookoutButton.position.set(-27.8, 10.49, 20.6);
  scene.add(lookoutButton);
  const fireworkColors = [0x43e5c4, 0xc8ff55, 0xc56cff, 0xff9b45];
  const fireworkBursts = [
    { position: [-5, 27, 18], delay: 0.95 },
    { position: [34, 32, -12], delay: 2.05 },
    { position: [-48, 35, -25], delay: 3.15 },
    { position: [18, 42, 38], delay: 4.25 },
  ].map((burst, burstIndex) => {
    const group = new THREE.Group();
    group.position.set(...(burst.position as [number, number, number]));
    const material = new THREE.MeshBasicMaterial({
      color: fireworkColors[burstIndex],
      transparent: true,
      opacity: 0,
      toneMapped: false,
    });
    const particles: THREE.Mesh[] = [];
    for (let i = 0; i < 30; i++) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 6, 6),
        material,
      );
      const phi = (i / 30) * Math.PI * 2;
      const rise = ((i * 7) % 15) / 14 * 1.5 - 0.4;
      particle.userData.direction = new THREE.Vector3(
        Math.cos(phi) * (0.7 + (i % 4) * 0.12),
        rise,
        Math.sin(phi) * (0.7 + ((i + 2) % 4) * 0.12),
      ).normalize();
      group.add(particle);
      particles.push(particle);
    }
    const light = new THREE.PointLight(fireworkColors[burstIndex], 0, 35);
    group.add(light);
    group.visible = false;
    scene.add(group);
    const rocketMaterial = new THREE.MeshBasicMaterial({
      color: fireworkColors[burstIndex],
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const rocket = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 10, 10),
      rocketMaterial,
    );
    const trail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.16, 1, 8),
      rocketMaterial,
    );
    rocket.visible = false;
    trail.visible = false;
    scene.add(rocket, trail);
    return { ...burst, group, particles, material, light, rocket, trail, rocketMaterial };
  });
  const laserColors = [0x43e5c4, 0xc56cff, 0xc8ff55, 0xff9b45, 0x38e6ff, 0xff4f91];
  const laserOrigins: [number, number, number][] = [
    [-72, 1, 55], [72, 1, 55], [-62, 1, -45],
    [62, 1, -45], [-20, 1, 78], [20, 1, 78],
  ];
  const laserBeams = laserOrigins.map((origin, index) => {
    const material = new THREE.MeshBasicMaterial({
      color: laserColors[index],
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.1, 1, 8),
      material,
    );
    mesh.visible = false;
    scene.add(mesh);
    return { origin: new THREE.Vector3(...origin), mesh, material, phase: index * 1.17 };
  });
  return { fireworkBursts, laserBeams, lookoutButtonMaterial };
}
