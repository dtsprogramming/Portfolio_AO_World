import * as THREE from "three";
import type { SceneFactories } from "./createSceneFactories";
import { profileSite, prototypeSite } from "./worldData";

/**
 * Builds the identity hologram and archived-prototype monitor, including their
 * frames, title artwork, and local lighting. These are scan targets, not physics.
 */
export function createPortfolioDisplays(
  scene: THREE.Scene,
  glowMaterial: THREE.Material,
  { makeBox }: Pick<SceneFactories, "makeBox">,
) {
  // East-side identity hologram, positioned between the name plaque and RAM bank.
  const profileTexture = new THREE.TextureLoader().load(
    "/daniel-silva-profile.png",
  );
  profileTexture.colorSpace = THREE.SRGBColorSpace;
  const hologramMaterial = new THREE.MeshBasicMaterial({
    map: profileTexture,
    color: 0xc8f8ff,
    transparent: true,
    opacity: 0.96,
    blending: THREE.NormalBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const profileHologram = new THREE.Mesh(
    new THREE.PlaneGeometry(7.4, 4.8),
    hologramMaterial,
  );
  profileHologram.rotation.y = -Math.PI / 2;
  profileHologram.position.set(profileSite.x, 3.65, profileSite.z);
  scene.add(profileHologram);
  const hologramFrame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(7.75, 5.15)),
    new THREE.LineBasicMaterial({ color: 0x38e6ff, transparent: true, opacity: 0.9 }),
  );
  hologramFrame.rotation.y = -Math.PI / 2;
  hologramFrame.position.copy(profileHologram.position);
  scene.add(hologramFrame);
  const hologramBase = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.5, 0.35, 40),
    new THREE.MeshStandardMaterial({
      color: 0x122420,
      emissive: 0x38e6ff,
      emissiveIntensity: 1.4,
      metalness: 0.8,
      roughness: 0.25,
    }),
  );
  hologramBase.position.set(profileSite.x, 0.18, profileSite.z);
  scene.add(hologramBase);
  const profileLight = new THREE.PointLight(0x38e6ff, 18, 18);
  profileLight.position.set(profileSite.x - 2, 4, profileSite.z);
  scene.add(profileLight);
  // Playable prototype archive between the mirror maze and Power Nexus.
  const prototypeCanvas = document.createElement("canvas");
  prototypeCanvas.width = 1024;
  prototypeCanvas.height = 512;
  const prototypeContext = prototypeCanvas.getContext("2d");
  if (prototypeContext) {
    const gradient = prototypeContext.createLinearGradient(0, 0, 1024, 512);
    gradient.addColorStop(0, "#061310");
    gradient.addColorStop(1, "#0a2620");
    prototypeContext.fillStyle = gradient;
    prototypeContext.fillRect(0, 0, 1024, 512);
    // Static cartridge-era title artwork for the dormant archive screen.
    prototypeContext.fillStyle = "#16493f";
    for (let i = 0; i < 34; i++) {
      const x = (i * 197) % 1000 + 12;
      const y = (i * 83) % 235 + 18;
      prototypeContext.fillRect(x, y, i % 4 === 0 ? 5 : 3, i % 4 === 0 ? 5 : 3);
    }
    prototypeContext.strokeStyle = "#216e5e";
    prototypeContext.lineWidth = 5;
    for (let x = -80; x < 1100; x += 96) {
      prototypeContext.beginPath();
      prototypeContext.moveTo(512, 330);
      prototypeContext.lineTo(x, 512);
      prototypeContext.stroke();
    }
    for (let y = 350; y < 512; y += 38) {
      prototypeContext.beginPath();
      prototypeContext.moveTo(0, y);
      prototypeContext.lineTo(1024, y);
      prototypeContext.stroke();
    }
    prototypeContext.fillStyle = "#070d11";
    prototypeContext.fillRect(445, 294, 134, 88);
    prototypeContext.fillStyle = "#a9b8b6";
    prototypeContext.fillRect(461, 268, 102, 78);
    prototypeContext.fillStyle = "#78f4ff";
    prototypeContext.fillRect(471, 280, 82, 45);
    prototypeContext.fillStyle = "#071411";
    prototypeContext.fillRect(485, 292, 13, 13);
    prototypeContext.fillRect(526, 292, 13, 13);
    prototypeContext.fillStyle = "#43e5c4";
    prototypeContext.fillRect(489, 296, 7, 7);
    prototypeContext.fillRect(530, 296, 7, 7);
    prototypeContext.fillStyle = "#101b1c";
    prototypeContext.beginPath();
    prototypeContext.arc(512, 385, 43, 0, Math.PI * 2);
    prototypeContext.fill();
    prototypeContext.strokeStyle = "#43e5c4";
    prototypeContext.lineWidth = 8;
    prototypeContext.stroke();
    prototypeContext.textAlign = "center";
    prototypeContext.shadowColor = "#43e5c4";
    prototypeContext.shadowBlur = 22;
    prototypeContext.fillStyle = "#a5ffec";
    prototypeContext.font = "900 78px monospace";
    prototypeContext.fillText("AXON", 512, 112);
    prototypeContext.fillStyle = "#43e5c4";
    prototypeContext.font = "700 48px monospace";
    prototypeContext.fillText("OVERRIDE", 512, 164);
    prototypeContext.shadowBlur = 0;
    prototypeContext.fillStyle = "#9bbeb6";
    prototypeContext.font = "19px monospace";
    prototypeContext.fillText("PROTOTYPE CARTRIDGE // BUILD 0.1", 512, 205);
    prototypeContext.fillStyle = "#c8ff55";
    prototypeContext.font = "700 23px monospace";
    prototypeContext.fillText("[ SCAN TO PLAY ]", 512, 468);
  }
  const prototypeTexture = new THREE.CanvasTexture(prototypeCanvas);
  prototypeTexture.colorSpace = THREE.SRGBColorSpace;
  const prototypeHousing = new THREE.MeshStandardMaterial({
    color: 0x182824,
    emissive: 0x0b4036,
    emissiveIntensity: 1.35,
    metalness: 0.82,
    roughness: 0.24,
  });
  const prototypeBezel = new THREE.MeshStandardMaterial({
    color: 0x43e5c4,
    emissive: 0x43e5c4,
    emissiveIntensity: 3.2,
    metalness: 0.3,
    roughness: 0.2,
    toneMapped: false,
  });
  makeBox(9.7, 6.1, 1.05, prototypeHousing, prototypeSite.x, 3.05, prototypeSite.z);
  const prototypeScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 4.9),
    new THREE.MeshBasicMaterial({
      map: prototypeTexture,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  prototypeScreen.position.set(prototypeSite.x, 3.15, prototypeSite.z - 0.68);
  prototypeScreen.rotation.y = Math.PI;
  prototypeScreen.renderOrder = 10;
  scene.add(prototypeScreen);
  makeBox(9.05, 0.12, 0.15, prototypeBezel, prototypeSite.x, 5.72, prototypeSite.z - 0.57);
  makeBox(9.05, 0.12, 0.15, prototypeBezel, prototypeSite.x, 0.58, prototypeSite.z - 0.57);
  makeBox(0.12, 5.25, 0.15, prototypeBezel, prototypeSite.x - 4.47, 3.15, prototypeSite.z - 0.57);
  makeBox(0.12, 5.25, 0.15, prototypeBezel, prototypeSite.x + 4.47, 3.15, prototypeSite.z - 0.57);
  makeBox(4.8, 0.35, 2.8, prototypeHousing, prototypeSite.x, 0.18, prototypeSite.z);
  makeBox(3.8, 0.08, 2.25, prototypeBezel, prototypeSite.x, 0.39, prototypeSite.z - 0.2);
  const prototypeLight = new THREE.PointLight(0x59f5d6, 28, 22);
  prototypeLight.position.set(prototypeSite.x, 3, prototypeSite.z - 3);
  scene.add(prototypeLight);

  return { hologramMaterial };
}
