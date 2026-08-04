import * as THREE from "three";
import type { CollisionSolid } from "./createTraversalFactories";
import { futureSite } from "./worldData";

export type GalleryTarget = {
  group: THREE.Group;
  hitMesh: THREE.Mesh;
  depth: number;
  lane: number;
  level: number;
  phase: number;
  active: boolean;
  respawnAt: number;
};

/**
 * Builds the Prism Pulse Range: a long carnival-style shooting lane with two
 * side walls, a backstop, animated virus targets, and a powered entrance sign.
 * The complete structure can rise from below the mainboard after Prism unlock.
 */
export function createFutureMachine(prismUnlocked: boolean) {
  const group = new THREE.Group();
  group.position.set(futureSite.x, prismUnlocked ? 0 : -9, futureSite.z);
  const entranceMarker = new THREE.Group();
  entranceMarker.position.set(futureSite.x, 0.08, futureSite.z);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x18201f,
    metalness: 0.82,
    roughness: 0.32,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a1833,
    emissive: 0xc56cff,
    emissiveIntensity: prismUnlocked ? 1.7 : 0.08,
    metalness: 0.62,
    roughness: 0.28,
  });
  const cautionMaterial = new THREE.MeshStandardMaterial({
    color: 0xffa43d,
    emissive: 0xff6a18,
    emissiveIntensity: prismUnlocked ? 1.15 : 0.05,
  });
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x111918,
    metalness: 0.58,
    roughness: 0.55,
  });
  const hatch = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.4, 0.12, 48),
    floorMaterial,
  );
  entranceMarker.add(hatch);
  const hatchRing = new THREE.Mesh(
    new THREE.RingGeometry(2.75, 3.2, 64),
    cautionMaterial,
  );
  hatchRing.rotation.x = -Math.PI / 2;
  hatchRing.position.y = 0.08;
  entranceMarker.add(hatchRing);
  const hatchBeacon = new THREE.PointLight(0xffa43d, prismUnlocked ? 0 : 6, 11);
  hatchBeacon.position.y = 1.1;
  entranceMarker.add(hatchBeacon);
  entranceMarker.visible = !prismUnlocked;
  const localBox = (
    width: number,
    height: number,
    depth: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      material,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  localBox(50, 0.34, 14, floorMaterial, 23, 0.17, 0);
  localBox(50, 8, 0.42, wallMaterial, 23, 4, -7);
  localBox(50, 8, 0.42, wallMaterial, 23, 4, 7);
  localBox(0.52, 8, 14, wallMaterial, 48, 4, 0);
  localBox(50, 0.14, 0.22, trimMaterial, 23, 7.78, -6.72);
  localBox(50, 0.14, 0.22, trimMaterial, 23, 7.78, 6.72);
  localBox(0.22, 0.14, 13.2, trimMaterial, 47.7, 7.78, 0);
  [1.3, 4, 6.7].forEach((height) => {
    localBox(49.2, 0.1, 0.13, trimMaterial, 23, height, -7.24);
    localBox(49.2, 0.1, 0.13, trimMaterial, 23, height, 7.24);
  });
  [-6.25, 6.25].forEach((z) => {
    localBox(0.16, 7.25, 0.16, trimMaterial, 47.72, 3.9, z);
    localBox(0.16, 7.25, 0.16, trimMaterial, 0.18, 3.9, z);
  });
  localBox(0.18, 7.25, 0.18, trimMaterial, 0.18, 3.9, 0);
  localBox(0.18, 0.16, 13.1, trimMaterial, 0.18, 7.55, 0);

  // Carnival-style lane dividers and alternating caution thresholds.
  [-4.65, 0, 4.65].forEach((z) => {
    localBox(45, 0.08, 0.09, trimMaterial, 24.5, 0.39, z);
  });
  for (let index = 0; index < 12; index++) {
    const material = index % 2 === 0 ? cautionMaterial : wallMaterial;
    localBox(1.15, 0.08, 0.55, material, -1.3 + index * 1.15, 0.4, -6.45);
    localBox(1.15, 0.08, 0.55, material, -1.3 + index * 1.15, 0.4, 6.45);
  }

  const signCanvas = document.createElement("canvas");
  signCanvas.width = 1024;
  signCanvas.height = 256;
  const signTexture = new THREE.CanvasTexture(signCanvas);
  signTexture.colorSpace = THREE.SRGBColorSpace;
  const drawSign = (online: boolean) => {
    const context = signCanvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#050807";
    context.fillRect(0, 0, signCanvas.width, signCanvas.height);
    context.strokeStyle = online ? "#c56cff" : "#59451e";
    context.lineWidth = 10;
    context.strokeRect(12, 12, 1000, 232);
    context.textAlign = "center";
    context.fillStyle = online ? "#e6c8ff" : "#c99842";
    context.font = "800 58px monospace";
    context.fillText("PRISM PULSE RANGE", 512, 103);
    context.font = "700 27px monospace";
    context.fillText(online ? "SCAN TO BEGIN // 30 SECOND TRIAL" : "OFFLINE // PRISM CORE REQUIRED", 512, 166);
    signTexture.needsUpdate = true;
  };
  drawSign(prismUnlocked);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(8.8, 2.2),
    new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false }),
  );
  sign.rotation.y = -Math.PI / 2;
  sign.position.set(-0.15, 4.8, 0);
  group.add(sign);

  const targetHitMaterial = new THREE.MeshBasicMaterial({
    color: 0xff3b88,
    transparent: true,
    opacity: 0.015,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const targetOutlineMaterial = new THREE.LineBasicMaterial({
    color: 0xff4f91,
    transparent: true,
    opacity: 0.96,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const targetEyeMaterial = new THREE.MeshBasicMaterial({
    color: 0xc8ff55,
    toneMapped: false,
  });
  const targets: GalleryTarget[] = Array.from({ length: 12 }, (_, index) => {
    const target = new THREE.Group();
    const hitMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.9),
      targetHitMaterial,
    );
    target.add(hitMesh);
    const outlinePoints = Array.from({ length: 24 }, (_, pointIndex) => {
      const angle = (pointIndex / 24) * Math.PI * 2;
      const radius = pointIndex % 2 === 0 ? 0.78 : 0.67;
      return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.015);
    });
    target.add(new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(outlinePoints),
      targetOutlineMaterial,
    ));
    const spikePoints: THREE.Vector3[] = [];
    for (let spike = 0; spike < 8; spike++) {
      const angle = (spike / 8) * Math.PI * 2;
      spikePoints.push(
        new THREE.Vector3(Math.cos(angle) * 0.72, Math.sin(angle) * 0.72, 0.02),
        new THREE.Vector3(Math.cos(angle) * 1.02, Math.sin(angle) * 1.02, 0.02),
      );
    }
    target.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(spikePoints),
      targetOutlineMaterial,
    ));
    [-0.27, 0.27].forEach((x) => {
      const eye = new THREE.Mesh(
        new THREE.RingGeometry(0.09, 0.16, 16),
        targetEyeMaterial,
      );
      eye.position.set(x, 0.16, 0.025);
      target.add(eye);
    });
    const mouth = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.32, -0.28, 0.025),
        new THREE.Vector3(0, -0.4, 0.025),
        new THREE.Vector3(0.32, -0.28, 0.025),
      ]),
      targetOutlineMaterial,
    );
    target.add(mouth);
    const depth = 10 + (index % 6) * 6.4;
    const lane = (index % 3) - 1;
    const level = 1.25 + (index % 4) * 1.45;
    target.position.set(depth, level, lane * 4.25);
    target.visible = false;
    group.add(target);
    return {
      group: target,
      hitMesh,
      depth,
      lane,
      level,
      phase: index * 0.83,
      active: false,
      respawnAt: index * 0.35,
    };
  });

  const workLights = [8, 22, 36, 47].map((x, index) => {
    const light = new THREE.PointLight(
      index % 2 ? 0xc56cff : 0x38e6ff,
      prismUnlocked ? 5 : 0,
      16,
    );
    light.position.set(x, 6.5, index % 2 ? 4.8 : -4.8);
    group.add(light);
    return light;
  });

  const collisionSolids: CollisionSolid[] = [
    { x: futureSite.x + 23, z: futureSite.z - 7, hx: 25, hz: 0.4, top: 8 },
    { x: futureSite.x + 23, z: futureSite.z + 7, hx: 25, hz: 0.4, top: 8 },
    { x: futureSite.x + 48, z: futureSite.z, hx: 0.4, hz: 7, top: 8 },
  ];

  return {
    group,
    entranceMarker,
    targets,
    workLights,
    trimMaterial,
    cautionMaterial,
    collisionSolids,
    drawSign,
    initiallyRaised: prismUnlocked,
  };
}
