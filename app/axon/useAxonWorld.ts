import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import type { AxonAudio } from "./audio";
import type { Ability, ForgeMode, WorldRuntime } from "./types";
import { archivePractice, forgeResult, futureSite, landmarks, profileSite, prototypeSite, scanSites } from "./worldData";
import { createBoardBackdrop } from "./createBoardBackdrop";
import { createBoardCircuitry } from "./createBoardCircuitry";
import { createCollectibles } from "./createCollectibles";
import { createComponentField } from "./createComponentField";
import { createFutureMachine } from "./createFutureMachine";
import { createLookoutTerrace } from "./createLookoutTerrace";
import { createMachines } from "./createMachines";
import { createMirrorMaze } from "./createMirrorMaze";
import { createPlatformChallenge } from "./createPlatformChallenge";
import { createPortfolioDisplays } from "./createPortfolioDisplays";
import { createRobot } from "./createRobot";
import { createSceneFactories } from "./createSceneFactories";
import { createTraversalFactories } from "./createTraversalFactories";

/**
 * Owns the Three.js scene lifecycle, player physics, camera, scanning, moving
 * platforms, collectible animation, and teardown. React retains UI state only.
 */
export function useAxonWorld({
  progressionHydrated,
  audioRef,
  abilitiesRef,
  completedMachinesRef,
  collectedMachineRewardsRef,
  prototypeOpenRef,
  setAbilities,
  setCollectedMachineRewards,
  setNearest,
  setPanel,
  setPowerPieces,
  setPrototypeOpen,
  setScanning,
  setSystemNotice,
  setUnlockCard,
  setZone,
  setChallengeNotice,
  setRelayTarget,
  setRelayNodes,
  setLoopMode,
  setLoopLimit,
  setLoopChoices,
  setLoopResult,
  setLoopStep,
  setArchivePrompt,
  setArchiveAnswer,
  setArchiveOrder,
  onCoreRewardStart,
  onCoreRewardComplete,
}: {
  progressionHydrated: boolean;
  audioRef: RefObject<AxonAudio>;
  abilitiesRef: RefObject<Set<Ability>>;
  completedMachinesRef: RefObject<Set<string>>;
  collectedMachineRewardsRef: RefObject<Set<string>>;
  prototypeOpenRef: RefObject<boolean>;
  setAbilities: Dispatch<SetStateAction<Ability[]>>;
  setCollectedMachineRewards: Dispatch<SetStateAction<string[]>>;
  setNearest: Dispatch<SetStateAction<string | null>>;
  setPanel: Dispatch<SetStateAction<string | null>>;
  setPowerPieces: Dispatch<SetStateAction<number>>;
  setPrototypeOpen: Dispatch<SetStateAction<boolean>>;
  setScanning: Dispatch<SetStateAction<string | null>>;
  setSystemNotice: Dispatch<SetStateAction<string>>;
  setUnlockCard: Dispatch<SetStateAction<Ability | null>>;
  setZone: Dispatch<SetStateAction<string>>;
  setChallengeNotice: Dispatch<SetStateAction<string | null>>;
  setRelayTarget: Dispatch<SetStateAction<number>>;
  setRelayNodes: Dispatch<SetStateAction<boolean[]>>;
  setLoopMode: Dispatch<SetStateAction<ForgeMode>>;
  setLoopLimit: Dispatch<SetStateAction<number>>;
  setLoopChoices: Dispatch<SetStateAction<number[]>>;
  setLoopResult: Dispatch<SetStateAction<string | null>>;
  setLoopStep: Dispatch<SetStateAction<number>>;
  setArchivePrompt: Dispatch<SetStateAction<number>>;
  setArchiveAnswer: Dispatch<SetStateAction<number | null>>;
  setArchiveOrder: Dispatch<SetStateAction<number[]>>;
  onCoreRewardStart: () => void;
  onCoreRewardComplete: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const runtime = useRef<WorldRuntime | null>(null);
  const nearestRef = useRef<string | null>(null);
  const [galleryHud, setGalleryHud] = useState({
    active: false,
    score: 0,
    time: 30,
    best: 0,
  });

  const shuffle = <T,>(items: T[]) => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  };

  useEffect(() => {
    if (!progressionHydrated) return;
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1814);
    scene.fog = new THREE.Fog(0x0d1814, 72, 172);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 280);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.42;
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const compactFx = matchMedia(
      "(max-width: 820px), (pointer: coarse)",
    ).matches;
    const bokeh = new BokehPass(scene, camera, {
      focus: 15,
      aperture: compactFx ? 0.000012 : 0.000045,
      maxblur: compactFx ? 0.0008 : 0.0028,
    });
    composer.addPass(bokeh);
    scene.add(new THREE.HemisphereLight(0xe0fff3, 0x173228, 2.65));
    scene.add(new THREE.AmbientLight(0x79a994, 0.7));
    const sun = new THREE.DirectionalLight(0xfff3d4, 4.2);
    sun.position.set(-18, 28, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -45;
    sun.shadow.camera.right = 45;
    sun.shadow.camera.top = 45;
    sun.shadow.camera.bottom = -45;
    scene.add(sun);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x102d24,
      roughness: 0.82,
      metalness: 0.18,
    });
    const geo = new THREE.PlaneGeometry(180, 180);
    geo.rotateX(-Math.PI / 2);
    const terrain = new THREE.Mesh(geo, groundMat);
    terrain.receiveShadow = true;
    scene.add(terrain);
    const groundSurfaces: THREE.Object3D[] = [terrain];
    const groundRay = new THREE.Raycaster();
    let groundCeiling = 40;
    const groundAt = (x: number, z: number, maxY = groundCeiling) => {
      groundRay.set(new THREE.Vector3(x, maxY, z), new THREE.Vector3(0, -1, 0));
      return groundRay.intersectObjects(groundSurfaces, false)[0]?.point.y ?? 0;
    };
    const grid = new THREE.GridHelper(180, 90, 0x4f806f, 0x234c3e);
    grid.position.y = 0.025;
    (grid.material as THREE.Material).opacity = 0.28;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);
    const {
      makeBox,
      dark,
      deckMat,
      copper,
      addTopBorder,
      createBatteryModel,
    } = createSceneFactories(scene);
    const controlsCanvas = document.createElement("canvas");
    controlsCanvas.width = 718;
    controlsCanvas.height = 512;
    const controlsTexture = new THREE.CanvasTexture(controlsCanvas);
    controlsTexture.colorSpace = THREE.SRGBColorSpace;
    const drawControlDisplay = () => {
      const ctx = controlsCanvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#07110d";
      ctx.fillRect(0, 0, 718, 512);
      ctx.strokeStyle = "#38e6ff";
      ctx.lineWidth = 5;
      ctx.strokeRect(18, 18, 682, 476);
      ctx.fillStyle = "#38e6ff";
      ctx.font = "700 31px monospace";
      ctx.fillText("SHELL CONTROL MAP", 42, 68);
      ctx.fillStyle = "#7fa396";
      ctx.font = "20px monospace";
      ctx.fillText(
        compactFx ? "TOUCH CONTROL INTERFACE" : "LIVE MODIFICATION INTERFACE",
        42,
        104,
      );
      const rows: [string, string, Ability | "prism" | null][] = compactFx
        ? [
            ["MOVE / STEER", "LEFT STICK", null],
            ["CAMERA ORBIT", "RIGHT STICK", null],
            ["OVERCLOCK", "BOOST TOGGLE", "sprint"],
            ["ACTUATOR", "JUMP BUTTON", "jump"],
            ["OPTICAL SCAN", "TAP PROMPT // NEAR", "scan"],
            ["EYE PULSE", "PULSE // WORLD + RANGE", "prism"],
          ]
        : [
            ["MOVE / STEER", "W S / A D", null],
            ["CAMERA ORBIT", "LEFT MOUSE DRAG", null],
            ["OVERCLOCK", "SHIFT", "sprint"],
            ["ACTUATOR", "SPACE", "jump"],
            ["OPTICAL SCAN", "E // NEAR MACHINES", "scan"],
            ["EYE PULSE", "F // WORLD + RANGE", "prism"],
          ];
      rows.forEach(([label, key, ability], i) => {
        const y = 150 + i * 57,
          online = !ability ||
            (ability === "prism"
              ? localStorage.getItem("axon-core-reward-v1") === "1"
              : abilitiesRef.current.has(ability));
        ctx.fillStyle = online ? "#d8e8df" : "#56665e";
        ctx.font = "700 25px monospace";
        ctx.fillText(label, 42, y);
        ctx.fillStyle = online ? "#c8ff55" : "#526158";
        ctx.textAlign = "right";
        ctx.font =
          key.length > 18
            ? "700 15px monospace"
            : key.length > 12
              ? "700 18px monospace"
              : "700 23px monospace";
        ctx.fillText(online ? key : "LOCKED", 676, y);
        ctx.textAlign = "left";
        ctx.strokeStyle = online ? "#254c3d" : "#1b2822";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(42, y + 20);
        ctx.lineTo(676, y + 20);
        ctx.stroke();
      });
      controlsTexture.needsUpdate = true;
    };
    drawControlDisplay();
    const controlScreenShell = makeBox(8.1, 5.8, 0.5, dark, -12, 3.05, 0.2);
    addTopBorder(controlScreenShell, 8.1, 5.8, 0.5);
    const screenGeometry = new THREE.PlaneGeometry(7.3, 5),
      screenMaterial = new THREE.MeshBasicMaterial({
        map: controlsTexture,
        toneMapped: false,
      });
    const controlScreenFront = new THREE.Mesh(screenGeometry, screenMaterial);
    controlScreenFront.position.set(-12, 3.1, 0.46);
    scene.add(controlScreenFront);
    const controlScreenBack = new THREE.Mesh(screenGeometry, screenMaterial);
    controlScreenBack.position.set(-12, 3.1, -0.06);
    controlScreenBack.rotation.y = Math.PI;
    scene.add(controlScreenBack);
    makeBox(0.35, 2.1, 0.35, dark, -15.15, 1.05, 0.2);
    makeBox(0.35, 2.1, 0.35, dark, -8.85, 1.05, 0.2);
    const { fanRigs, stars, skyGlow } = createBoardBackdrop(scene, { makeBox, dark });
    createBoardCircuitry(
      scene,
      { makeBox, dark, copper, addTopBorder },
      skyGlow,
      renderer.capabilities.getMaxAnisotropy(),
    );
    const { hologramMaterial } = createPortfolioDisplays(scene, skyGlow, { makeBox });
    const vias = new THREE.MeshStandardMaterial({
      color: 0xbfc9bd,
      emissive: 0x31473d,
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.25,
    });
    for (let z = -70; z <= 70; z += 14) {
      [-58, 58].forEach((x) => {
        const v = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.55, 0.12, 20),
          vias,
        );
        v.position.set(x, 0.08, z);
        scene.add(v);
      });
    }
    const { componentSolids, addDeck } = createTraversalFactories(
      scene,
      groundSurfaces,
      { makeBox, deckMat, addTopBorder },
    );
    const { fireworkBursts, laserBeams, lookoutButtonMaterial } = createLookoutTerrace(
      scene,
      groundSurfaces,
      componentSolids,
      addDeck,
      { makeBox, addTopBorder },
    );
    let lightShowStart = -20;
    let lookoutLatched = false;
    let pieceCollected = localStorage.getItem("axon-platform-cmos-v1") === "1";
    const { movingPlatforms, movingBases, goalPlatform, powerPiece } =
      createPlatformChallenge(
        scene,
        groundSurfaces,
        pieceCollected,
        { makeBox, deckMat, addTopBorder, createBatteryModel },
      );
    let transistorBatteryCollected =
      localStorage.getItem("axon-transistor-cmos-v1") === "1";
    const { transistorBattery, finalTransistorStep } = createComponentField(
      scene,
      groundSurfaces,
      componentSolids,
      transistorBatteryCollected,
      { copper, createBatteryModel },
    );
    let mazeBatteryCollected = localStorage.getItem("axon-maze-cmos-v1") === "1";
    const { mazeBattery, mazeOriginX, mazeOriginZ, mazeCols, mazeRows, mazeCell } =
      createMirrorMaze(
        scene,
        groundSurfaces,
        componentSolids,
        vias,
        skyGlow,
        mazeBatteryCollected,
        { makeBox, dark, copper, addTopBorder, createBatteryModel },
      );
    const gallery = createFutureMachine(
      localStorage.getItem("axon-core-reward-v1") === "1",
    );
    scene.add(gallery.group);
    scene.add(gallery.entranceMarker);
    let galleryRise = gallery.initiallyRaised ? 1 : 0;
    let galleryRising = false;
    let galleryCollisionsAdded = gallery.initiallyRaised;
    if (galleryCollisionsAdded) componentSolids.push(...gallery.collisionSolids);
    let galleryActive = false;
    let galleryStart = 0;
    let galleryScore = 0;
    let galleryBest = Number(localStorage.getItem("axon-gallery-best-v1")) || 0;
    let galleryLastSecond = 30;
    const galleryAim = new THREE.Vector2(0, 0);
    const galleryRay = new THREE.Raycaster();
    const reticleMaterial = new THREE.MeshBasicMaterial({
      color: 0xc8ff55,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthTest: false,
      toneMapped: false,
    });
    const galleryReticle = new THREE.Mesh(
      new THREE.RingGeometry(0.045, 0.065, 32),
      reticleMaterial,
    );
    galleryReticle.visible = false;
    galleryReticle.renderOrder = 100;
    scene.add(galleryReticle);
    const pulseProjectileGeometry = new THREE.SphereGeometry(0.095, 12, 8);
    const pulseProjectileMaterials = [0x54eaff, 0xc56cff].map(
      (color) => new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    const pulseProjectiles: {
      mesh: THREE.Mesh;
      start: THREE.Vector3;
      end: THREE.Vector3;
      started: number;
      duration: number;
      target: (typeof gallery.targets)[number] | null;
      award: boolean;
    }[] = [];
    const { machineRings, machineGlowMats, machineLights } = createMachines(
      scene,
      componentSolids,
      abilitiesRef.current.has("scan"),
      { makeBox, dark },
    );
    let machineBootStart = -1;
    const {
      bot, accent, eyeAccent, wheelRig, wheelRadius,
      scanGrid, scanBeamGeometry, scanBeam, waveMaterial,
      scanUnlockWave, activatePrismCore,
    } = createRobot(scene, dark);
    const prismStage = new THREE.Group();
    prismStage.visible = false;
    scene.add(prismStage);
    const prismFloorMaterial = new THREE.MeshBasicMaterial({
      color: 0x101019,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    const prismFloor = new THREE.Mesh(
      new THREE.CircleGeometry(6.5, 72),
      prismFloorMaterial,
    );
    prismFloor.rotation.x = -Math.PI / 2;
    prismFloor.position.y = 0.02;
    prismStage.add(prismFloor);
    const energyCount = 180;
    const energySeeds = Array.from({ length: energyCount }, (_, index) => ({
      angle: (index / energyCount) * Math.PI * 8 + Math.random() * 0.8,
      radius: 3.2 + Math.random() * 6.8,
      height: 0.3 + Math.random() * 4.8,
      speed: 0.65 + Math.random() * 0.85,
    }));
    const energyPositions = new Float32Array(energyCount * 3);
    const energyGeometry = new THREE.BufferGeometry();
    energyGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(energyPositions, 3),
    );
    const energyMaterial = new THREE.PointsMaterial({
      color: 0x54eaff,
      size: 0.085,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const energyParticles = new THREE.Points(energyGeometry, energyMaterial);
    prismStage.add(energyParticles);
    const pulseColors = [0x54eaff, 0xc56cff, 0xc8ff55];
    const prismPulses = pulseColors.map((color, index) => {
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 96), material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.12 + index * 0.04;
      mesh.visible = false;
      prismStage.add(mesh);
      return { mesh, material };
    });
    const prismKeyLight = new THREE.PointLight(0x755cff, 0, 16);
    prismKeyLight.position.set(2.5, 4.2, 3);
    prismStage.add(prismKeyLight);
    const prismFillLight = new THREE.PointLight(0x54eaff, 0, 13);
    prismFillLight.position.set(-3, 2.4, -2);
    prismStage.add(prismFillLight);
    let prismCutsceneActive = false;
    let prismCutsceneStart = 0;
    let prismIgnited = false;
    let prismGalleryReveal = false;
    let savedBackground: THREE.Color | THREE.Texture | null = null;
    let savedFog: THREE.Fog | THREE.FogExp2 | null = null;
    const savedVisibility = new Map<THREE.Object3D, boolean>();
    let scanTarget: (typeof scanSites)[number] | null = null;
    let scanProgress = 0;
    let scanWaveProgress = 0;
    const { batteryData, batteryMeshes, machineRewardStations } = createCollectibles(
      scene,
      abilitiesRef.current,
      completedMachinesRef.current,
      collectedMachineRewardsRef.current,
      { createBatteryModel },
    );
    const solids: {
      x: number;
      z: number;
      hx: number;
      hz: number;
      top: number;
      bottom?: number;
    }[] = [
      ...landmarks.map((l, i) => ({
        x: l.x,
        z: l.z,
        hx: (i === 1 ? 6.5 : 5) / 2 + 0.65,
        hz: (i === 1 ? 4 : 5) / 2 + 0.65,
        top: i === 1 ? 6.2 : 5.8,
      })),
      ...componentSolids,
      { x: -36, z: 19.08, hx: 10, hz: 0.2, bottom: 10.35, top: 12.1 },
      { x: -45.92, z: 28, hx: 0.2, hz: 9, bottom: 10.35, top: 12.1 },
      { x: -26.08, z: 28, hx: 0.2, hz: 9, bottom: 10.35, top: 12.1 },
      { x: -42, z: 36.92, hx: 4, hz: 0.2, bottom: 10.35, top: 12.1 },
      { x: -30, z: 36.92, hx: 4, hz: 0.2, bottom: 10.35, top: 12.1 },
      { x: -12, z: 0.2, hx: 4.35, hz: 0.65, top: 5.95 },
      { x: profileSite.x, z: profileSite.z, hx: 0.75, hz: 4.1, top: 6.3 },
      { x: prototypeSite.x, z: prototypeSite.z, hx: 5.1, hz: 0.9, top: 6.2 },
    ];
    const blocked = (x: number, z: number, playerY = bot.position.y) =>
      solids.some(
        (s) =>
          playerY >= (s.bottom ?? -Infinity) &&
          playerY < s.top - 0.05 &&
          Math.abs(x - s.x) < s.hx &&
          Math.abs(z - s.z) < s.hz,
      );
    const worldPulses: { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number }[] = [];
    const pulseBursts: { group: THREE.Group; material: THREE.MeshBasicMaterial; life: number }[] = [];
    let lastWorldPulse = -1;
    const makePulseBurst = (position: THREE.Vector3) => {
      const material = new THREE.MeshBasicMaterial({
        color: 0xc56cff,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const group = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.18, 20), material);
      ring.quaternion.copy(camera.quaternion);
      group.add(ring);
      for (let index = 0; index < 7; index++) {
        const spark = new THREE.Mesh(pulseProjectileGeometry, material);
        const angle = (index / 7) * Math.PI * 2;
        spark.position.set(Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, 0);
        group.add(spark);
      }
      group.position.copy(position);
      scene.add(group);
      pulseBursts.push({ group, material, life: 0 });
    };
    const fireWorldPulse = () => {
      if (
        localStorage.getItem("axon-core-reward-v1") !== "1" ||
        galleryActive || prismCutsceneActive || prototypeOpenRef.current ||
        clock.elapsedTime - lastWorldPulse < 0.18
      ) return;
      lastWorldPulse = clock.elapsedTime;
      const forward = new THREE.Vector3(Math.sin(bot.rotation.y), 0, Math.cos(bot.rotation.y));
      const right = new THREE.Vector3(Math.cos(bot.rotation.y), 0, -Math.sin(bot.rotation.y));
      [-0.18, 0.18].forEach((offset, index) => {
        const mesh = new THREE.Mesh(pulseProjectileGeometry, pulseProjectileMaterials[index]);
        mesh.position.copy(bot.position)
          .add(new THREE.Vector3(0, 2.35, 0))
          .add(forward.clone().multiplyScalar(0.55))
          .add(right.clone().multiplyScalar(offset));
        scene.add(mesh);
        worldPulses.push({ mesh, velocity: forward.clone().multiplyScalar(36), life: 0 });
      });
      audioRef.current?.pulse();
    };
    const keys = new Set<string>();
    let ax = 0,
      ay = 0,
      lookX = 0,
      lookY = 0,
      mobileBoost = false,
      vy = 0,
      onGround = true,
      cameraYaw = 0,
      cameraPitch = 0,
      cameraDistance = 12,
      jumpBuffer = 0,
      coyoteTime = 0.12;
    bot.position.set(0, groundAt(0, 18) + 0.06, 18);
    bot.rotation.y = Math.PI;
    const unlockAbility = (ability: Ability) => {
      if (abilitiesRef.current.has(ability)) return;
      audioRef.current?.unlock();
      abilitiesRef.current.add(ability);
      drawControlDisplay();
      const next = [...abilitiesRef.current];
      setAbilities(next);
      setUnlockCard(ability);
      localStorage.setItem("axon-progress-v1", JSON.stringify(next));
      if (ability === "sprint")
        setSystemNotice(
          "OVERCLOCK ONLINE // Hold Shift to sprint. Locate CMOS-02.",
        );
      if (ability === "jump")
        setSystemNotice("ACTUATOR ONLINE // Space to jump. Reach CMOS-03.");
      if (ability === "scan")
        setSystemNotice(
          "OPTICAL ARRAY RESTORED // Awaiting network initialization.",
        );
    };
    const beginGalleryReveal = () => {
      if (prismGalleryReveal) return;
      prismGalleryReveal = true;
      prismStage.visible = false;
      savedVisibility.forEach((visible, object) => {
        object.visible = visible;
      });
      scene.background = savedBackground;
      scene.fog = savedFog;
      bot.visible = false;
      galleryRising = true;
      gallery.drawSign(true);
      audioRef.current?.network();
    };
    const finishPrismCutscene = () => {
      if (!prismCutsceneActive) return;
      if (!prismIgnited) {
        prismIgnited = true;
        activatePrismCore();
      }
      prismCutsceneActive = false;
      if (!prismGalleryReveal || galleryRise < 1) {
        galleryRise = 1;
        gallery.group.position.y = 0;
        gallery.trimMaterial.emissiveIntensity = 1.7;
        gallery.cautionMaterial.emissiveIntensity = 1.15;
        gallery.workLights.forEach((light) => (light.intensity = 5));
        if (!galleryCollisionsAdded) {
          componentSolids.push(...gallery.collisionSolids);
          galleryCollisionsAdded = true;
        }
        gallery.entranceMarker.visible = false;
      }
      gallery.drawSign(true);
      prismStage.visible = false;
      savedVisibility.forEach((visible, object) => {
        object.visible = visible;
      });
      savedVisibility.clear();
      scene.background = savedBackground;
      scene.fog = savedFog;
      accent.emissiveIntensity = 1.45;
      eyeAccent.emissiveIntensity = 2.15;
      prismPulses.forEach(({ mesh, material }) => {
        mesh.visible = false;
        material.opacity = 0;
      });
      energyMaterial.opacity = 0;
      prismKeyLight.intensity = 0;
      prismFillLight.intensity = 0;
      drawControlDisplay();
      setSystemNotice("EYE PULSE ONLINE // Scan the southeast Prism Pulse Range.");
      onCoreRewardComplete();
    };
    const beginPrismCutscene = () => {
      if (prismCutsceneActive) return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        activatePrismCore();
        galleryRise = 1;
        gallery.group.position.y = 0;
        gallery.drawSign(true);
        gallery.entranceMarker.visible = false;
        if (!galleryCollisionsAdded) {
          componentSolids.push(...gallery.collisionSolids);
          galleryCollisionsAdded = true;
        }
        drawControlDisplay();
        audioRef.current?.success();
        onCoreRewardComplete();
        return;
      }
      prismCutsceneActive = true;
      onCoreRewardStart();
      prismIgnited = false;
      prismGalleryReveal = false;
      prismCutsceneStart = clock.elapsedTime;
      savedBackground = scene.background;
      savedFog = scene.fog;
      savedVisibility.clear();
      scene.children.forEach((object) => {
        savedVisibility.set(object, object.visible);
        if (object !== bot && object !== prismStage) object.visible = false;
      });
      bot.visible = true;
      prismStage.position.copy(bot.position);
      prismStage.visible = true;
      scene.background = new THREE.Color(0x000000);
      scene.fog = null;
      keys.clear();
      ax = 0;
      ay = 0;
      lookX = 0;
      lookY = 0;
      mobileBoost = false;
      accent.emissiveIntensity = 1.45;
      eyeAccent.emissiveIntensity = 2.15;
      audioRef.current?.unlock();
      audioRef.current?.success();
    };
    const finishGallery = () => {
      if (!galleryActive) return;
      galleryActive = false;
      galleryBest = Math.max(galleryBest, galleryScore);
      localStorage.setItem("axon-gallery-best-v1", String(galleryBest));
      gallery.targets.forEach((target) => {
        target.active = false;
        target.group.visible = false;
      });
      galleryReticle.visible = false;
      pulseProjectiles.splice(0).forEach((projectile) => scene.remove(projectile.mesh));
      renderer.domElement.classList.remove("gallery-active");
      bot.visible = true;
      camera.fov = 55;
      camera.updateProjectionMatrix();
      setGalleryHud({ active: false, score: galleryScore, time: 0, best: galleryBest });
      setSystemNotice(`PULSE RANGE COMPLETE // SCORE ${galleryScore} // BEST ${galleryBest}`);
      audioRef.current?.success();
    };
    const startGallery = () => {
      if (localStorage.getItem("axon-core-reward-v1") !== "1") {
        setSystemNotice("PRISM PULSE RANGE OFFLINE // PRISM CORE REQUIRED.");
        return;
      }
      galleryActive = true;
      galleryStart = clock.elapsedTime;
      galleryScore = 0;
      galleryLastSecond = 30;
      galleryBest = Number(localStorage.getItem("axon-gallery-best-v1")) || 0;
      galleryAim.set(0, 0);
      camera.fov = compactFx ? 72 : 58;
      camera.updateProjectionMatrix();
      gallery.targets.forEach((target, index) => {
        target.active = false;
        target.group.visible = false;
        target.respawnAt = index * 0.1;
      });
      keys.clear();
      ax = 0;
      ay = 0;
      bot.visible = false;
      setPanel(null);
      setNearest(null);
      setZone("PRISM PULSE RANGE");
      renderer.domElement.classList.add("gallery-active");
      galleryReticle.visible = true;
      setGalleryHud({ active: true, score: 0, time: 30, best: galleryBest });
      audioRef.current?.network();
    };
    const aimGallery = (clientX: number, clientY: number) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      galleryAim.set(
        ((clientX - bounds.left) / bounds.width) * 2 - 1,
        -((clientY - bounds.top) / bounds.height) * 2 + 1,
      );
    };
    const fireGalleryPulse = () => {
      if (!galleryActive) return;
      galleryRay.setFromCamera(galleryAim, camera);
      const candidates = gallery.targets
        .filter((target) => target.active)
        .map((target) => target.hitMesh);
      const hit = galleryRay.intersectObjects(candidates, false)[0];
      const end = hit
        ? hit.point
        : galleryRay.ray.origin.clone().add(galleryRay.ray.direction.clone().multiplyScalar(60));
      audioRef.current?.pulse();
      const target = hit
        ? gallery.targets.find((item) => item.hitMesh === hit.object) ?? null
        : null;
      if (target) {
        target.active = false;
        target.group.visible = false;
        target.respawnAt = clock.elapsedTime - galleryStart + 0.12 + Math.random() * 0.2;
      }
      const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      [-0.13, 0.13].forEach((offset, index) => {
        const start = camera.position.clone()
          .add(cameraRight.clone().multiplyScalar(offset))
          .add(galleryRay.ray.direction.clone().multiplyScalar(0.28));
        const mesh = new THREE.Mesh(
          pulseProjectileGeometry,
          pulseProjectileMaterials[index],
        );
        mesh.position.copy(start);
        mesh.renderOrder = 98;
        scene.add(mesh);
        pulseProjectiles.push({
          mesh,
          start,
          end: end.clone(),
          started: clock.elapsedTime,
          duration: Math.max(0.18, start.distanceTo(end) / 48),
          target,
          award: index === 1,
        });
      });
    };
    runtime.current = {
      axis: (x, y) => {
        ax = x;
        ay = y;
      },
      look: (x, y) => {
        lookX = x;
        lookY = y;
      },
      boost: (active) => {
        if (prototypeOpenRef.current) return;
        mobileBoost = active && abilitiesRef.current.has("sprint");
      },
      jump: () => {
        if (prototypeOpenRef.current) return;
        if (!abilitiesRef.current.has("jump")) {
          setSystemNotice("ACTUATOR OFFLINE // Locate CMOS-02.");
          return;
        }
        audioRef.current?.jump();
        jumpBuffer = 0.16;
      },
      firePulse: fireWorldPulse,
      investigate: (id: string) => {
        if (prototypeOpenRef.current) return;
        if (!abilitiesRef.current.has("scan")) {
          setSystemNotice("OPTICAL ARRAY OFFLINE // Locate CMOS-03.");
          return;
        }
        const target = scanSites.find((site) => site.id === id);
        if (!target || scanTarget) return;
        audioRef.current?.scan();
        scanTarget = target;
        scanProgress = 0;
        scanGrid.visible = true;
        scanBeam.visible = true;
        setScanning(id);
        setPanel(null);
      },
      activateNetwork: () => {
        audioRef.current?.network();
        setSystemNotice(
          "OPTICAL ARRAY RESTORED // Initializing machine network.",
        );
        scanUnlockWave.visible = true;
        scanWaveProgress = 0;
        machineBootStart = clock.elapsedTime;
      },
      spawnMachineBattery: (id: string) => {
        const station = machineRewardStations.find((item) => item.id === id);
        if (!station) return;
        station.active = true;
        station.collected = false;
        station.rise = 0;
        station.fade = 1;
        station.pad.visible = true;
        station.outline.visible = true;
        station.battery.visible = true;
        station.padMaterial.opacity = 0.72;
        station.outlineMaterial.opacity = 0.9;
        station.battery.position.y = station.baseY + 0.3;
      },
      activateCoreReward: () => {
        beginPrismCutscene();
      },
    };
    const keydown = (e: KeyboardEvent) => {
      if (
        prismCutsceneActive &&
        ["Escape", "Enter", "Space"].includes(e.code)
      ) {
        e.preventDefault();
        finishPrismCutscene();
        return;
      }
      if (galleryActive) {
        if (e.code === "Escape") finishGallery();
        else if ((e.code === "Space" || e.key.toLowerCase() === "f") && !e.repeat)
          fireGalleryPulse();
        e.preventDefault();
        return;
      }
      keys.add(e.key.toLowerCase());
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) runtime.current?.jump();
      }
      if (e.key.toLowerCase() === "f" && !e.repeat) {
        e.preventDefault();
        runtime.current?.firePulse();
      }
      if (e.key.toLowerCase() === "e" && nearestRef.current && !e.repeat)
        runtime.current?.investigate(nearestRef.current);
    };
    const keyup = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    addEventListener("keydown", keydown);
    addEventListener("keyup", keyup);
    let mouseOrbit = false,
      lastMouseX = 0,
      lastMouseY = 0;
    const mouseDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (galleryActive) {
        aimGallery(e.clientX, e.clientY);
        fireGalleryPulse();
        e.preventDefault();
        return;
      }
      mouseOrbit = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const mouseMove = (e: PointerEvent) => {
      if (galleryActive) {
        aimGallery(e.clientX, e.clientY);
        return;
      }
      if (!mouseOrbit) return;
      const deltaX = e.clientX - lastMouseX,
        deltaY = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      cameraYaw += deltaX * 0.008;
      cameraPitch = THREE.MathUtils.clamp(
        cameraPitch - deltaY * 0.006,
        -0.3,
        0.62,
      );
    };
    const mouseUp = (e: PointerEvent) => {
      mouseOrbit = false;
      if (renderer.domElement.hasPointerCapture(e.pointerId))
        renderer.domElement.releasePointerCapture(e.pointerId);
    };
    renderer.domElement.addEventListener("pointerdown", mouseDown);
    renderer.domElement.addEventListener("pointermove", mouseMove);
    renderer.domElement.addEventListener("pointerup", mouseUp);
    renderer.domElement.addEventListener("pointercancel", mouseUp);
    const resize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      composer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    addEventListener("resize", resize);
    const clock = new THREE.Clock();
    scene.onBeforeRender = () => {
      const t = clock.elapsedTime;
      groundCeiling = bot.position.y + 0.8;
      fanRigs.forEach((fan) => (fan.rotation.z += 0.007176));
      accent.emissiveIntensity = 1.35 + Math.sin(t * 2.2) * 0.12;
      eyeAccent.emissiveIntensity = 2.05 + Math.sin(t * 2.2) * 0.12;
      hologramMaterial.opacity = 0.95 + Math.sin(t * 5.2) * 0.012;
      const onLookoutButton =
        bot.position.y > 9.8 &&
        Math.hypot(bot.position.x + 27.8, bot.position.z - 20.6) < 1.35;
      if (onLookoutButton && !lookoutLatched && t - lightShowStart > 7.5) {
        lightShowStart = t;
        audioRef.current?.celebration();
        lookoutButtonMaterial.emissiveIntensity = 4;
        setSystemNotice("LOOKOUT SPECTRUM SHOW // BOARD CELEBRATION ONLINE");
      }
      lookoutLatched = onLookoutButton;
      const showElapsed = t - lightShowStart;
      lookoutButtonMaterial.emissiveIntensity =
        showElapsed < 6.8 ? 2.2 + Math.sin(t * 9) * 1.4 : 1.8;
      fireworkBursts.forEach((burst) => {
        const local = showElapsed - burst.delay;
        if (local >= -0.95 && local < 0) {
          const launch = 1 + local / 0.95;
          const target = burst.position as [number, number, number];
          const rocketY = THREE.MathUtils.lerp(0.7, target[1], launch);
          const trailHeight = 2 + launch * 8;
          burst.rocket.visible = true;
          burst.trail.visible = true;
          burst.rocketMaterial.opacity = 0.75 + Math.sin(t * 28) * 0.2;
          burst.rocket.position.set(target[0], rocketY, target[2]);
          burst.trail.position.set(target[0], rocketY - trailHeight / 2, target[2]);
          burst.trail.scale.set(1, trailHeight, 1);
        } else {
          burst.rocket.visible = false;
          burst.trail.visible = false;
        }
        if (local >= 0 && local < 2.25) {
          const radius = Math.sin(Math.min(1, local * 1.7) * Math.PI / 2) * 12;
          burst.group.visible = true;
          burst.material.opacity = Math.max(0, 1 - local / 2.25);
          burst.light.intensity = Math.max(0, 48 * (1 - local / 1.4));
          burst.particles.forEach((particle) => {
            const direction = particle.userData.direction as THREE.Vector3;
            particle.position.copy(direction).multiplyScalar(radius);
            particle.position.y -= local * local * 1.4;
          });
        } else {
          burst.group.visible = false;
          burst.light.intensity = 0;
        }
      });
      const lasersActive = showElapsed >= 0 && showElapsed < 7;
      laserBeams.forEach((beam, index) => {
        beam.mesh.visible = lasersActive;
        if (!lasersActive) return;
        beam.material.opacity = 0.28 + Math.sin(t * 8 + beam.phase) * 0.16;
        const target = new THREE.Vector3(
          Math.sin(t * 1.7 + beam.phase) * 48,
          30 + Math.sin(t * 2.1 + index) * 10,
          Math.cos(t * 1.35 + beam.phase) * 42 - 4,
        );
        const direction = target.clone().sub(beam.origin);
        const length = direction.length();
        beam.mesh.position.copy(beam.origin).add(target).multiplyScalar(0.5);
        beam.mesh.scale.set(1, length, 1);
        beam.mesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.normalize(),
        );
      });
      if (showElapsed >= 0 && showElapsed < 7) {
        const cinematicPosition = new THREE.Vector3(-72, 52, 102);
        camera.position.lerp(cinematicPosition, 0.085);
        camera.lookAt(0, 13, -14);
      }
      const insideLift =
        Math.hypot(bot.position.x + 36, bot.position.z - 28) < 1.38;
      if (insideLift && bot.position.y < 10.32) {
        bot.position.y = Math.min(10.34, bot.position.y + 0.06);
        vy = 0;
        onGround = false;
        if (bot.position.y >= 10.32) bot.position.x = -33.55;
      }
      movingPlatforms.forEach((platform, i) => {
        const oldX = platform.position.x,
          oldY = platform.position.y,
          oldZ = platform.position.z,
          standing =
            onGround &&
            vy <= 0 &&
            Math.abs(bot.position.y - (oldY + 0.3)) < 0.32 &&
            Math.abs(bot.position.x - oldX) < 3 &&
            Math.abs(bot.position.z - oldZ) < 3,
          base = movingBases[i];
        platform.position.x = base.x;
        platform.position.z = base.z + Math.sin(t * 0.82 + base.phase) * 4.4;
        platform.position.y = 10.35 + Math.sin(t * 0.48 + base.phase) * 0.38;
        if (standing) {
          bot.position.x += platform.position.x - oldX;
          bot.position.y += platform.position.y - oldY;
          bot.position.z += platform.position.z - oldZ;
        }
      });
      powerPiece.position.set(
        goalPlatform.position.x,
        11.75 + Math.sin(t * 2) * 0.16,
        goalPlatform.position.z,
      );
      powerPiece.rotation.y = t * 1.5;
      if (
        !pieceCollected &&
        bot.position.distanceTo(powerPiece.position) < 1.65
      ) {
        audioRef.current?.pickup();
        pieceCollected = true;
        powerPiece.visible = false;
        localStorage.setItem("axon-platform-cmos-v1", "1");
        setPowerPieces((v) => v + 1);
        setChallengeNotice("PLATFORM CMOS RECOVERED // CORE CHARGE +1");
      }
      stars.rotation.y = t * 0.002;
      if (scanTarget) {
        scanProgress += 0.018;
        const deckTop =
          scanTarget.id === "relay"
            ? 2.2
            : scanTarget.id === "archive"
              ? 1.4
              : 0;
        scanGrid.position.set(
          scanTarget.x,
          deckTop + 0.15 + Math.sin(Math.min(1, scanProgress) * Math.PI) * 6,
          scanTarget.z,
        );
        const positions = scanBeamGeometry.attributes
          .position as THREE.BufferAttribute;
        positions.setXYZ(
          0,
          bot.position.x,
          bot.position.y + 2.47,
          bot.position.z,
        );
        positions.setXYZ(1, scanTarget.x, scanGrid.position.y, scanTarget.z);
        positions.needsUpdate = true;
        if (scanProgress >= 1) {
          const id = scanTarget.id;
          scanTarget = null;
          scanGrid.visible = false;
          scanBeam.visible = false;
          setScanning(null);
          if (id === "prototype") {
            prototypeOpenRef.current = true;
            setPrototypeOpen(true);
            audioRef.current?.setPrototype(true);
          } else if (id === "future") {
            startGallery();
          } else {
            openMachinePanel(id);
          }
        }
      }
    };
    const openMachinePanel = (id: string) => {
      if (id === "relay") {
        setRelayTarget(Math.floor(Math.random() * 128) + 1);
        setRelayNodes(Array(8).fill(false));
        setChallengeNotice(null);
      }
      if (id === "forge" && completedMachinesRef.current.has("forge")) {
        const modes: ForgeMode[] = ["sum", "product", "evens"];
        const mode = modes[Math.floor(Math.random() * modes.length)];
        const limit = mode === "product"
          ? Math.floor(Math.random() * 4) + 3
          : Math.floor(Math.random() * 7) + 4;
        const answer = forgeResult(mode, limit);
        setLoopMode(mode);
        setLoopLimit(limit);
        setLoopChoices(shuffle([
          Math.max(0, answer - Math.max(2, limit - 2)),
          answer,
          answer + Math.max(2, limit),
        ]));
        setLoopResult(null);
        setLoopStep(-1);
        setChallengeNotice(null);
      }
      if (id === "archive") {
        setArchivePrompt(Math.floor(Math.random() * archivePractice.length));
        setArchiveAnswer(null);
        setArchiveOrder(shuffle([0, 1, 2]));
      }
      setPanel(id);
    };
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.04);
      if (galleryRising && galleryRise < 1) {
        galleryRise = Math.min(1, galleryRise + dt * 0.16);
        const easedRise = 1 - Math.pow(1 - galleryRise, 3);
        gallery.group.position.y = -9 + easedRise * 9;
        gallery.trimMaterial.emissiveIntensity = easedRise * 1.7;
        gallery.cautionMaterial.emissiveIntensity = easedRise * 1.15;
        gallery.workLights.forEach((light, index) => {
          light.intensity = easedRise * (5 + Math.sin(clock.elapsedTime * 2.8 + index) * 0.8);
        });
        if (galleryRise >= 1 && !galleryCollisionsAdded) {
          componentSolids.push(...gallery.collisionSolids);
          galleryCollisionsAdded = true;
          gallery.entranceMarker.visible = false;
        }
      }
      if (prismCutsceneActive) {
        const elapsed = clock.elapsedTime - prismCutsceneStart;
        if (elapsed >= 7.15 && !prismGalleryReveal) beginGalleryReveal();
        if (prismGalleryReveal) {
          const revealProgress = THREE.MathUtils.clamp((elapsed - 7.15) / 6.3, 0, 1);
          camera.position.set(
            futureSite.x - 14 + revealProgress * 3.5,
            11.5 - revealProgress * 2.5,
            futureSite.z - 17 + revealProgress * 4,
          );
          camera.lookAt(futureSite.x + 22, 3.2, futureSite.z);
          camera.updateMatrixWorld();
          composer.render();
          if (elapsed >= 13.55) finishPrismCutscene();
          if (prismCutsceneActive) return;
        }
        const shutdown = THREE.MathUtils.clamp((elapsed - 0.35) / 1.25, 0, 1);
        const flicker = 0.42 + Math.abs(Math.sin(elapsed * 28)) * 0.58;
        if (!prismIgnited) {
          accent.emissiveIntensity = 1.45 * (1 - shutdown) * flicker;
          eyeAccent.emissiveIntensity = 2.15 * (1 - shutdown) * flicker;
        }
        if (elapsed >= 1.75 && !prismIgnited) {
          prismIgnited = true;
          activatePrismCore();
          accent.emissiveIntensity = 0;
          eyeAccent.emissiveIntensity = 0;
          audioRef.current?.network();
        }
        const ignition = THREE.MathUtils.smoothstep(elapsed, 1.75, 3.85);
        if (prismIgnited) {
          accent.emissiveIntensity = ignition * 1.45;
          eyeAccent.emissiveIntensity = ignition * 2.15;
          prismKeyLight.intensity = ignition * 12;
          prismFillLight.intensity = ignition * 7;
        }
        const energyEnvelope = THREE.MathUtils.smoothstep(elapsed, 0.45, 1.2) *
          (1 - THREE.MathUtils.smoothstep(elapsed, 4.1, 5.2));
        energyMaterial.opacity = energyEnvelope * 0.92;
        energyMaterial.color.lerpColors(
          new THREE.Color(0x54eaff),
          new THREE.Color(0xc56cff),
          THREE.MathUtils.clamp((elapsed - 1.3) / 2.8, 0, 1),
        );
        energySeeds.forEach((seed, index) => {
          const cycle = (elapsed * seed.speed * 0.32 + index / energyCount) % 1;
          const radius = 0.3 + seed.radius * (1 - cycle);
          const angle = seed.angle + elapsed * (0.5 + seed.speed * 0.18);
          energyPositions[index * 3] = Math.cos(angle) * radius;
          energyPositions[index * 3 + 1] =
            1.45 + (seed.height - 1.45) * (radius / (seed.radius + 0.3));
          energyPositions[index * 3 + 2] = Math.sin(angle) * radius;
        });
        (energyGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        prismPulses.forEach(({ mesh, material }, index) => {
          const progress = (elapsed - (4.15 + index * 0.72)) / 1.15;
          const active = progress >= 0 && progress <= 1;
          mesh.visible = active;
          if (active) {
            mesh.scale.setScalar(1 + progress * (12 + index * 3));
            material.opacity = Math.sin(progress * Math.PI) * (0.72 - index * 0.08);
            if (progress < 0.08) {
              prismKeyLight.intensity = 18 + index * 5;
            }
          }
        });
        prismFloorMaterial.opacity = 0.42 + ignition * 0.38;
        const orbitAngle = -0.85 + elapsed * 0.62;
        const orbitRadius = 6.3 - ignition * 0.75;
        camera.position.set(
          bot.position.x + Math.sin(orbitAngle) * orbitRadius,
          bot.position.y + 2.8 + Math.sin(elapsed * 0.55) * 0.35,
          bot.position.z + Math.cos(orbitAngle) * orbitRadius,
        );
        camera.lookAt(bot.position.x, bot.position.y + 1.55, bot.position.z);
        camera.updateMatrixWorld();
        composer.render();
        if (prismCutsceneActive) return;
      }
      if (galleryActive) {
        const elapsed = clock.elapsedTime - galleryStart;
        const remaining = Math.max(0, 30 - elapsed);
        const second = Math.ceil(remaining);
        if (second !== galleryLastSecond) {
          galleryLastSecond = second;
          setGalleryHud((current) => ({ ...current, time: second }));
        }
        gallery.targets.forEach((target) => {
          if (!target.active && elapsed >= target.respawnAt) {
            target.active = true;
            target.group.visible = true;
          }
          if (!target.active) return;
          const mobileLaneWidth = THREE.MathUtils.lerp(
            2.05,
            3.75,
            THREE.MathUtils.clamp((target.depth - 10) / 30, 0, 1),
          );
          target.group.position.set(
            target.depth,
            target.level + Math.sin(elapsed * 1.7 + target.phase) * 0.85,
            target.lane * (compactFx ? mobileLaneWidth : 4.25) +
              Math.sin(elapsed * 0.92 + target.phase) * (compactFx ? 0.75 : 1.35),
          );
          target.group.rotation.x = Math.sin(elapsed * 1.2 + target.phase) * 0.18;
          target.group.rotation.y = -Math.PI / 2 + Math.sin(elapsed + target.phase) * 0.22;
        });
        camera.position.set(futureSite.x + 1.4, 2.55, futureSite.z);
        camera.lookAt(futureSite.x + 34, 2.7, futureSite.z);
        camera.updateMatrixWorld();
        galleryRay.setFromCamera(galleryAim, camera);
        galleryReticle.position.copy(
          galleryRay.ray.origin.clone().add(galleryRay.ray.direction.clone().multiplyScalar(2.8)),
        );
        galleryReticle.quaternion.copy(camera.quaternion);
        galleryReticle.scale.setScalar(1 + Math.sin(elapsed * 5) * 0.08);
        for (let index = pulseProjectiles.length - 1; index >= 0; index--) {
          const projectile = pulseProjectiles[index];
          const progress = THREE.MathUtils.clamp(
            (clock.elapsedTime - projectile.started) / projectile.duration,
            0,
            1,
          );
          projectile.mesh.position.lerpVectors(projectile.start, projectile.end, progress);
          projectile.mesh.scale.setScalar(0.8 + Math.sin(progress * Math.PI) * 1.8);
          if (progress < 1) continue;
          scene.remove(projectile.mesh);
          pulseProjectiles.splice(index, 1);
          if (!projectile.award || !projectile.target) continue;
          galleryScore +=
            100 + Math.round(projectile.target.depth * 2.5 + projectile.target.level * 12);
          setGalleryHud((current) => ({ ...current, score: galleryScore }));
        }
        composer.render();
        if (remaining <= 0) finishGallery();
        if (galleryActive) return;
      }
      for (let index = worldPulses.length - 1; index >= 0; index--) {
        const projectile = worldPulses[index];
        projectile.life += dt;
        projectile.mesh.position.addScaledVector(projectile.velocity, dt);
        projectile.mesh.scale.setScalar(0.9 + Math.sin(projectile.life * 34) * 0.22);
        const position = projectile.mesh.position;
        const hit =
          blocked(position.x, position.z, position.y) ||
          groundAt(position.x, position.z, 40) >= position.y ||
          Math.abs(position.x) > 89 || Math.abs(position.z) > 89;
        if (!hit && projectile.life < 1.45) continue;
        scene.remove(projectile.mesh);
        worldPulses.splice(index, 1);
        if (hit) makePulseBurst(position);
      }
      for (let index = pulseBursts.length - 1; index >= 0; index--) {
        const burst = pulseBursts[index];
        burst.life += dt;
        burst.group.scale.setScalar(1 + burst.life * 5.5);
        burst.group.rotation.z += dt * 4;
        burst.material.opacity = Math.max(0, 0.9 * (1 - burst.life / 0.42));
        if (burst.life < 0.42) continue;
        scene.remove(burst.group);
        burst.material.dispose();
        pulseBursts.splice(index, 1);
      }
      const lightShowPlaying =
        clock.elapsedTime - lightShowStart >= 0 &&
        clock.elapsedTime - lightShowStart < 7;
      const worldPaused = prototypeOpenRef.current || lightShowPlaying;
      const turn = worldPaused ? 0 :
        (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
        (keys.has("a") || keys.has("arrowleft") ? 1 : 0) +
        ax;
      const drive = worldPaused ? 0 :
        (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
        (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
        ay;
      const shiftHeld =
        abilitiesRef.current.has("sprint") &&
        (mobileBoost ||
          keys.has("shift") ||
          keys.has("shiftleft") ||
          keys.has("shiftright"));
      const sprinting = shiftHeld && Math.abs(drive) > 0.08;
      const moveSpeed = sprinting ? 17 : 10;
      jumpBuffer = Math.max(0, jumpBuffer - dt);
      coyoteTime = onGround ? 0.12 : Math.max(0, coyoteTime - dt);
      if (jumpBuffer > 0 && coyoteTime > 0) {
        vy = shiftHeld ? 10.25 : 8.5;
        onGround = false;
        coyoteTime = 0;
        jumpBuffer = 0;
      }
      cameraDistance = THREE.MathUtils.lerp(
        cameraDistance,
        sprinting ? 15 : 12,
        1 - Math.exp(-5 * dt),
      );
      cameraYaw += turn * 2.15 * dt;
      cameraYaw += lookX * 2.25 * dt;
      cameraPitch = THREE.MathUtils.clamp(
        cameraPitch - lookY * 1.45 * dt,
        -0.3,
        0.62,
      );
      const fx = Math.sin(cameraYaw),
        fz = -Math.cos(cameraYaw);
      if (Math.abs(drive) > 0.08) {
        const direction = drive >= 0 ? 1 : -1,
          nx = fx * direction,
          nz = fz * direction,
          nextX = THREE.MathUtils.clamp(
            bot.position.x + nx * moveSpeed * dt,
            -82,
            82,
          ),
          nextZ = THREE.MathUtils.clamp(
            bot.position.z + nz * moveSpeed * dt,
            -82,
            82,
          ),
          nextGround = groundAt(nextX, nextZ),
          currentGround = groundAt(bot.position.x, bot.position.z);
        if (
          !blocked(nextX, nextZ) &&
          (!onGround || nextGround - currentGround < 0.65)
        ) {
          bot.position.x = nextX;
          bot.position.z = nextZ;
          wheelRig.rotation.x += (drive * moveSpeed * dt) / wheelRadius;
        }
        bot.rotation.y = Math.atan2(nx, nz);
      }
      const wasGrounded = onGround;
      vy -= 18 * dt;
      bot.position.y += vy * dt;
      const impactVelocity = vy;
      const ground = groundAt(bot.position.x, bot.position.z) + 0.06;
      if (bot.position.y <= ground) {
        bot.position.y = ground;
        vy = 0;
        onGround = true;
      } else onGround = false;
      if (!wasGrounded && onGround && impactVelocity < -2.8)
        audioRef.current?.land();
      const insideMaze =
        bot.position.x > mazeOriginX - 0.25 &&
        bot.position.x < mazeOriginX + mazeCols * mazeCell + 0.25 &&
        bot.position.z > mazeOriginZ - 0.25 &&
        bot.position.z < mazeOriginZ + mazeRows * mazeCell + 0.25;
      bot.visible = !insideMaze;
      if (insideMaze) {
        const firstPersonTarget = new THREE.Vector3(
          bot.position.x + fx * 0.22,
          bot.position.y + 2.3,
          bot.position.z + fz * 0.22,
        );
        camera.position.lerp(firstPersonTarget, 0.24);
        camera.lookAt(
          bot.position.x + fx * 12,
          bot.position.y + 2.3 + Math.tan(cameraPitch) * 8,
          bot.position.z + fz * 12,
        );
      } else {
        const cameraTarget = new THREE.Vector3(
          bot.position.x - fx * cameraDistance,
          bot.position.y + 6.2 + (cameraDistance - 12) * 0.12,
          bot.position.z - fz * cameraDistance,
        );
        camera.position.lerp(cameraTarget, 0.12);
        camera.lookAt(
          bot.position.x,
          bot.position.y + 1.4 + Math.tan(cameraPitch) * 8,
          bot.position.z,
        );
      }
      let n: string | null = null,
        best = 8;
      if (abilitiesRef.current.has("scan")) {
        scanSites.forEach((l) => {
          const d = Math.hypot(bot.position.x - l.x, bot.position.z - l.z);
          if (d < best) {
            best = d;
            n = l.id;
          }
        });
      }
      nearestRef.current = n;
      const audioMachineDistance = Math.min(
        ...scanSites.map((site) =>
          Math.hypot(bot.position.x - site.x, bot.position.z - site.z),
        ),
      );
      audioRef.current?.update(
        Math.abs(drive) * moveSpeed,
        sprinting,
        audioMachineDistance,
        Math.hypot(bot.position.x + 36, bot.position.z - 28) < 1.7,
      );
      setNearest((v) => (v === n ? v : n));
      setPanel((v) => (v && v !== n ? null : v));
      setZone(
        bot.position.x < -24 && bot.position.z > 17
          ? "CAPACITOR TERRACE"
          : bot.position.x > 23 && bot.position.z < -20
            ? "RELAY DECK"
            : bot.position.x > 30 && bot.position.z > 20
              ? "ARCHIVE MODULE"
              : "MAINBOARD // A0",
      );
      composer.render();
    };
    animate();
    const existingBeforeRender = scene.onBeforeRender;
    scene.onBeforeRender = (
      rendererArg,
      sceneArg,
      cameraArg,
      geometryArg,
      materialArg,
      groupArg,
    ) => {
      existingBeforeRender.call(
        scene,
        rendererArg,
        sceneArg,
        cameraArg,
        geometryArg,
        materialArg,
        groupArg,
      );
      if (!abilitiesRef.current.has("sprint")) {
        keys.delete("shift");
        keys.delete("shiftleft");
        keys.delete("shiftright");
      }
      batteryMeshes.forEach((battery, i) => {
        battery.rotation.y += 0.018;
        battery.position.y =
          batteryData[i].y + Math.sin(clock.elapsedTime * 2 + i) * 0.16;
        const prerequisite =
            i === 0 || abilitiesRef.current.has(batteryData[i - 1].ability),
          available =
            prerequisite && !abilitiesRef.current.has(batteryData[i].ability);
        battery.visible = available;
        if (available && bot.position.distanceTo(battery.position) < 1.55) {
          battery.visible = false;
          unlockAbility(batteryData[i].ability);
        }
      });
      if (!transistorBatteryCollected) {
        transistorBattery.rotation.y += 0.022;
        transistorBattery.position.y =
          finalTransistorStep[2] +
          1.05 +
          Math.sin(clock.elapsedTime * 2.1) * 0.14;
        if (bot.position.distanceTo(transistorBattery.position) < 1.6) {
          audioRef.current?.pickup();
          transistorBatteryCollected = true;
          transistorBattery.visible = false;
          localStorage.setItem("axon-transistor-cmos-v1", "1");
          setPowerPieces((value) => value + 1);
          setChallengeNotice("TRANSISTOR ASCENT CMOS COLLECTED // CORE CHARGE +1");
        }
      }
      if (!mazeBatteryCollected) {
        mazeBattery.rotation.y -= 0.024;
        mazeBattery.position.y = 1.3 + Math.sin(clock.elapsedTime * 2.25) * 0.14;
        if (bot.position.distanceTo(mazeBattery.position) < 1.55) {
          audioRef.current?.pickup();
          mazeBatteryCollected = true;
          mazeBattery.visible = false;
          localStorage.setItem("axon-maze-cmos-v1", "1");
          setPowerPieces((value) => value + 1);
          setChallengeNotice("MIRROR MAZE CMOS COLLECTED // CORE CHARGE +1");
        }
      }
      machineRewardStations.forEach((station, index) => {
        if (!station.active) return;
        station.rise = Math.min(1, station.rise + 0.018);
        const eased = 1 - Math.pow(1 - station.rise, 3);
        station.battery.position.y =
          station.baseY + 0.3 + eased * 1.35 + Math.sin(clock.elapsedTime * 2 + index) * 0.1;
        station.battery.rotation.y += 0.025;
        station.outline.rotation.z -= 0.008;
        if (
          !station.collected &&
          station.rise > 0.85 &&
          bot.position.distanceTo(station.battery.position) < 1.7
        ) {
          audioRef.current?.pickup();
          station.collected = true;
          station.battery.visible = false;
          collectedMachineRewardsRef.current.add(station.id);
          const collected = [...collectedMachineRewardsRef.current];
          setCollectedMachineRewards(collected);
          localStorage.setItem(
            "axon-machine-batteries-v1",
            JSON.stringify(collected),
          );
          setPowerPieces((value) => value + 1);
          setChallengeNotice("CMOS BATTERY COLLECTED // CORE CHARGE +1");
        }
        if (station.collected) {
          station.fade = Math.max(0, station.fade - 0.025);
          station.padMaterial.opacity = 0.72 * station.fade;
          station.outlineMaterial.opacity = 0.9 * station.fade;
          if (station.fade === 0) {
            station.active = false;
            station.pad.visible = false;
            station.outline.visible = false;
          }
        }
      });
      if (scanUnlockWave.visible) {
        scanWaveProgress += 0.018;
        scanUnlockWave.scale.setScalar(1 + scanWaveProgress * 72);
        waveMaterial.opacity = Math.max(0, 0.75 - scanWaveProgress * 0.75);
        if (scanWaveProgress >= 1) scanUnlockWave.visible = false;
      }
      if (machineBootStart >= 0) {
        const elapsed = clock.elapsedTime - machineBootStart;
        machineGlowMats.forEach((material, i) => {
          const raw = THREE.MathUtils.clamp((elapsed - i * 1.15) / 0.85, 0, 1),
            power = raw * raw * (3 - 2 * raw),
            color = new THREE.Color(landmarks[i].color);
          material.color.copy(new THREE.Color(0x17201d).lerp(color, power));
          material.emissiveIntensity = 2 * power;
          machineLights[i].intensity =
            (landmarks[i].id === "nexus" ? 32 : 22) * power;
          machineRings[i].visible = power > 0;
          machineRings[i].scale.setScalar(0.72 + 0.28 * power);
          (machineRings[i].material as THREE.MeshBasicMaterial).opacity =
            0.7 * power;
        });
        const focusIndex = Math.floor(elapsed / 1.15);
        if (focusIndex < landmarks.length) {
          const target = landmarks[focusIndex],
            deckTop =
              target.id === "relay" ? 2.2 : target.id === "archive" ? 1.4 : 0,
            side = focusIndex % 2 ? 1 : -1;
          camera.position.set(
            target.x + side * 8,
            deckTop + 7.5,
            target.z + 11,
          );
          camera.lookAt(target.x, deckTop + 2.4, target.z);
          camera.updateMatrixWorld();
        }
        if (elapsed > landmarks.length * 1.15 + 0.5) {
          machineBootStart = -1;
          setSystemNotice(
            "MACHINE NETWORK ONLINE // Approach a signal ring and press E.",
          );
        }
      }
    };
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("keydown", keydown);
      removeEventListener("keyup", keyup);
      renderer.domElement.removeEventListener("pointerdown", mouseDown);
      renderer.domElement.removeEventListener("pointermove", mouseMove);
      renderer.domElement.removeEventListener("pointerup", mouseUp);
      renderer.domElement.removeEventListener("pointercancel", mouseUp);
      composer.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      runtime.current = null;
    };
  }, [
    progressionHydrated,
    abilitiesRef,
    audioRef,
    collectedMachineRewardsRef,
    completedMachinesRef,
    onCoreRewardComplete,
    onCoreRewardStart,
    prototypeOpenRef,
    setAbilities,
    setArchiveAnswer,
    setArchiveOrder,
    setArchivePrompt,
    setChallengeNotice,
    setCollectedMachineRewards,
    setLoopChoices,
    setLoopLimit,
    setLoopMode,
    setLoopResult,
    setLoopStep,
    setNearest,
    setPanel,
    setPowerPieces,
    setPrototypeOpen,
    setRelayNodes,
    setRelayTarget,
    setScanning,
    setSystemNotice,
    setUnlockCard,
    setZone,
  ]);

  return { mountRef, runtime, galleryHud };
}
