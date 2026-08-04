import * as THREE from "three";

/**
 * Builds the monowheel robot, emissive shell accents, and optical scan effects.
 * The runtime receives only the animated parts and keeps movement authority.
 */
export function createRobot(
  scene: THREE.Scene,
  wheelMaterial: THREE.Material,
) {
  const bot = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({
    color: 0xaeb9b5,
    roughness: 0.28,
    metalness: 0.78,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: 0x173238,
    emissive: 0x50ddf5,
    emissiveIntensity: 1.45,
    roughness: 0.38,
    metalness: 0.62,
  });
  const eyeAccent = accent.clone();
  eyeAccent.emissiveIntensity = 2.15;
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x67e9f4,
    transparent: true,
    opacity: 0.58,
  });
  const activatePrismCore = () => {
    accent.emissive.setHex(0xc56cff);
    accent.color.setHex(0x2b1738);
    eyeAccent.emissive.setHex(0xc8ff55);
    eyeAccent.color.setHex(0x273315);
    edgeMat.color.setHex(0xffd36a);
    edgeMat.opacity = 0.92;
  };
  if (localStorage.getItem("axon-core-reward-v1") === "1") activatePrismCore();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.08, 0.64), shell);
  body.position.y = 1.65;
  body.castShadow = true;
  body.add(
    new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), edgeMat),
  );
  bot.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.52, 0.56), shell);
  head.position.y = 2.45;
  head.castShadow = true;
  head.add(
    new THREE.LineSegments(new THREE.EdgesGeometry(head.geometry), edgeMat),
  );
  bot.add(head);
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.075, 0.028),
    eyeAccent,
  );
  visor.position.set(0, 2.47, 0.298);
  bot.add(visor);
  const rearBand = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 0.045, 0.028),
    accent,
  );
  rearBand.position.set(0, 1.72, -0.338);
  bot.add(rearBand);
  const wheelRig = new THREE.Group();
  wheelRig.position.y = 0.62;
  const wheelRadius = 0.42;
  const wheel = new THREE.Mesh(
    new THREE.TorusGeometry(wheelRadius, 0.13, 10, 28),
    wheelMaterial,
  );
  wheel.rotation.y = Math.PI / 2;
  wheel.castShadow = true;
  wheelRig.add(wheel);
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.6, 12),
    accent,
  );
  hub.rotation.z = Math.PI / 2;
  wheelRig.add(hub);
  const tracker = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.11, 0.11),
    accent,
  );
  tracker.position.y = wheelRadius;
  tracker.rotation.z = Math.PI / 2;
  wheelRig.add(tracker);
  bot.add(wheelRig);
  [-0.32, 0.32].forEach((x) => {
    const fork = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.74, 0.13),
      shell,
    );
    fork.position.set(x, 1.04, 0);
    fork.rotation.z = x > 0 ? -0.25 : 0.25;
    fork.add(
      new THREE.LineSegments(new THREE.EdgesGeometry(fork.geometry), edgeMat),
    );
    bot.add(fork);
  });
  scene.add(bot);
  const scanGrid = new THREE.GridHelper(11, 14, 0x5ef2ff, 0x1b91aa);
  (scanGrid.material as THREE.Material).transparent = true;
  (scanGrid.material as THREE.Material).opacity = 0.7;
  scanGrid.visible = false;
  scene.add(scanGrid);
  const scanBeamGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(),
  ]);
  const scanBeam = new THREE.Line(
    scanBeamGeometry,
    new THREE.LineBasicMaterial({
      color: 0x77f7ff,
      transparent: true,
      opacity: 0.85,
    }),
  );
  scanBeam.visible = false;
  scene.add(scanBeam);
  const waveMaterial = new THREE.MeshBasicMaterial({
    color: 0x62f4ff,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const scanUnlockWave = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1, 96),
    waveMaterial,
  );
  scanUnlockWave.rotation.x = -Math.PI / 2;
  scanUnlockWave.position.y = 0.12;
  scanUnlockWave.visible = false;
  scene.add(scanUnlockWave);
  return {
    bot,
    accent,
    eyeAccent,
    wheelRig,
    wheelRadius,
    scanGrid,
    scanBeamGeometry,
    scanBeam,
    waveMaterial,
    scanUnlockWave,
    activatePrismCore,
  };
}
