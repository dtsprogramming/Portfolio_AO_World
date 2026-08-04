import * as THREE from "three";

/**
 * Creates the shared PCB materials and mesh helpers used by board landmarks.
 * Centralizing them keeps dimensions, borders, shadows, and CMOS models
 * visually consistent across the world.
 */
export function createSceneFactories(scene: THREE.Scene) {
  const makeBox = (
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  const dark = new THREE.MeshStandardMaterial({
    color: 0x101713,
    roughness: 0.48,
    metalness: 0.72,
  });
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x173c30,
    roughness: 0.72,
    metalness: 0.28,
  });
  const copper = new THREE.MeshStandardMaterial({
    color: 0xffa44f,
    emissive: 0xff5a12,
    emissiveIntensity: 2.2,
    roughness: 0.35,
    metalness: 0.7,
  });
  const topBorderMat = new THREE.LineBasicMaterial({
    color: 0x65efff,
    transparent: true,
    opacity: 0.78,
  });
  const addTopBorder = (
    mesh: THREE.Mesh,
    w: number,
    h: number,
    d: number,
    material = topBorderMat,
  ) => {
    const y = h / 2 + 0.025,
      points = [
        new THREE.Vector3(-w / 2, y, -d / 2),
        new THREE.Vector3(w / 2, y, -d / 2),
        new THREE.Vector3(w / 2, y, d / 2),
        new THREE.Vector3(-w / 2, y, d / 2),
      ];
    mesh.add(
      new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(points),
        material,
      ),
    );
  };
  const createBatteryModel = (color: number) => {
    const group = new THREE.Group();
    const glow = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 2.4,
      metalness: 0.55,
      roughness: 0.25,
    });
    const cell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 1.1, 18),
      new THREE.MeshStandardMaterial({
        color: 0x17201d,
        metalness: 0.82,
        roughness: 0.3,
      }),
    );
    cell.rotation.z = Math.PI / 2;
    group.add(cell);
    [-0.58, 0.58].forEach((x) => {
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.38, 0.12, 18),
        glow,
      );
      cap.rotation.z = Math.PI / 2;
      cap.position.x = x;
      group.add(cap);
    });
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.055, 8, 24),
      glow,
    );
    band.rotation.y = Math.PI / 2;
    group.add(band);
    return group;
  };

  return { makeBox, dark, deckMat, copper, addTopBorder, createBatteryModel };
}

export type SceneFactories = ReturnType<typeof createSceneFactories>;
