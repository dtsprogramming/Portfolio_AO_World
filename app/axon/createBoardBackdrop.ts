import * as THREE from "three";
import type { SceneFactories } from "./createSceneFactories";

/**
 * Builds the distant PC enclosure: synchronized cooling fans, circuit stars,
 * and illuminated RAM banks. Animated handles are returned to the main loop.
 */
export function createBoardBackdrop(
  scene: THREE.Scene,
  { makeBox, dark }: Pick<SceneFactories, "makeBox" | "dark">,
) {
  // Distant machine enclosure: circuit-stars, cooling fans, and RAM light banks
  const fanRigs: THREE.Group[] = [];
  const skyGlow = new THREE.MeshStandardMaterial({
    color: 0x35e7ff,
    emissive: 0x11b9e8,
    emissiveIntensity: 3.2,
    transparent: true,
    opacity: 0.82,
  });
  [-34, 34].forEach((x, index) => {
    const fan = new THREE.Group();
    fan.position.set(x, 25, -78);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(12, 0.55, 12, 64),
      skyGlow,
    );
    fan.add(rim);
    const hubMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 0.8, 24),
      skyGlow,
    );
    hubMesh.rotation.x = Math.PI / 2;
    fan.add(hubMesh);
    for (let n = 0; n < 8; n++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 8, 0.22),
        new THREE.MeshStandardMaterial({
          color: index ? 0x1b4760 : 0x203d52,
          emissive: index ? 0x0f91d1 : 0x195f96,
          emissiveIntensity: 1.4,
          transparent: true,
          opacity: 0.72,
        }),
      );
      blade.position.y = 5.1;
      blade.rotation.z = (n * Math.PI) / 4;
      const pivot = new THREE.Group();
      pivot.rotation.z = (n * Math.PI) / 4;
      pivot.add(blade);
      fan.add(pivot);
    }
    scene.add(fan);
    fanRigs.push(fan);
    const fanLight = new THREE.PointLight(
      index ? 0x38e6ff : 0x6da8ff,
      38,
      44,
    );
    fanLight.position.set(x, 25, -70);
    scene.add(fanLight);
  });
  const starPositions: number[] = [];
  for (let i = 0; i < 340; i++) {
    const side = i % 4;
    const x =
        side === 0
          ? (Math.random() - 0.5) * 160
          : side === 3
            ? (Math.random() - 0.5) * 145
            : side === 1
              ? -104
              : 104,
      z = side === 0 ? -104 : side === 3 ? 112 : (Math.random() - 0.5) * 140;
    starPositions.push(x, 8 + Math.random() * 52, z);
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starPositions, 3),
    ),
    new THREE.PointsMaterial({
      color: 0x7cf5ff,
      size: 0.28,
      transparent: true,
      opacity: 0.72,
      sizeAttenuation: true,
    }),
  );
  scene.add(stars);
  const ramGlow = new THREE.MeshStandardMaterial({
    color: 0x152b28,
    emissive: 0x28ffc5,
    emissiveIntensity: 2.4,
  });
  [-72, 72].forEach((x) => {
    for (let z = -55; z <= 50; z += 18) {
      makeBox(2.4, 15, 10, dark, x, 8, z);
      for (let y = 3; y <= 13; y += 2.5)
        makeBox(2.55, 0.35, 8.6, ramGlow, x, y, z);
    }
  });

  return { fanRigs, stars, skyGlow };
}
