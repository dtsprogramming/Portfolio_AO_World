import * as THREE from "three";
import type { SceneFactories } from "./createSceneFactories";
import type { CollisionSolid } from "./createTraversalFactories";

/**
 * Builds capacitor steps, the north transistor staircase, chipset structures,
 * and the persistent CMOS reward at the top of the stepped route.
 */
export function createComponentField(
  scene: THREE.Scene,
  groundSurfaces: THREE.Object3D[],
  componentSolids: CollisionSolid[],
  transistorBatteryCollected: boolean,
  { copper, createBatteryModel }: Pick<
    SceneFactories,
    "copper" | "createBatteryModel"
  >,
) {
  // Component fields: capacitors form steps, chips and heat sinks form architecture
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x28332d,
    metalness: 0.74,
    roughness: 0.32,
  });
  [
    [-20, -30],
    [-14, -30],
    [-8, -30],
    [15, 26],
    [21, 26],
    [27, 26],
    [46, -12],
    [52, -12],
  ].forEach(([x, z], i) => {
    const h = 1 + (i % 3) * 0.45;
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.45, h, 28),
      capMat,
    );
    cap.position.set(x, h / 2, z);
    cap.castShadow = true;
    cap.receiveShadow = true;
    scene.add(cap);
    groundSurfaces.push(cap);
    const capBorder = new THREE.Mesh(
      new THREE.TorusGeometry(1.37, 0.045, 8, 40),
      new THREE.MeshBasicMaterial({
        color: 0x65efff,
        transparent: true,
        opacity: 0.82,
      }),
    );
    capBorder.rotation.x = Math.PI / 2;
    capBorder.position.set(x, h + 0.025, z);
    scene.add(capBorder);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, h + 0.05, 2.92),
      copper,
    );
    stripe.position.set(x, h / 2 + 0.03, z);
    scene.add(stripe);
    const capLight = new THREE.PointLight(0xff6a22, 2.8, 5);
    capLight.position.set(x, h + 0.35, z);
    scene.add(capLight);
    componentSolids.push({ x, z, hx: 1.55, hz: 1.55, top: h });
  });
  const transistorSteps: [number, number, number][] = [
    [-8, -36, 2.35],
    [-8, -42, 2.8],
    [-8, -48, 3.25],
    [-14, -48, 3.7],
    [-20, -48, 4.15],
    [-26, -48, 4.6],
    [-32, -48, 5.05],
    [-38, -48, 5.5],
    [-44, -48, 5.95],
    [-44, -54, 6.4],
    [-44, -60, 6.85],
    [-44, -66, 7.3],
    [-38, -66, 7.75],
    [-32, -66, 8.2],
    [-26, -66, 8.65],
    [-20, -66, 9.1],
    [-14, -66, 9.55],
    [-8, -66, 10],
  ];
  transistorSteps.forEach(([x, z, h]) => {
    const step = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.55, h, 28),
      capMat,
    );
    step.position.set(x, h / 2, z);
    step.castShadow = true;
    step.receiveShadow = true;
    scene.add(step);
    groundSurfaces.push(step);
    const border = new THREE.Mesh(
      new THREE.TorusGeometry(1.47, 0.055, 8, 40),
      new THREE.MeshBasicMaterial({
        color: 0x65efff,
        transparent: true,
        opacity: 0.82,
      }),
    );
    border.rotation.x = Math.PI / 2;
    border.position.set(x, h + 0.025, z);
    scene.add(border);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, h + 0.05, 3.12),
      copper,
    );
    stripe.position.set(x, h / 2 + 0.03, z);
    scene.add(stripe);
    const stepLight = new THREE.PointLight(0xff6a22, 2.4, 5);
    stepLight.position.set(x, h + 0.35, z);
    scene.add(stepLight);
    componentSolids.push({ x, z, hx: 1.65, hz: 1.65, top: h });
  });
  const finalTransistorStep = transistorSteps[transistorSteps.length - 1];
  const transistorBattery = createBatteryModel(0xff8a42);
  transistorBattery.position.set(
    finalTransistorStep[0],
    finalTransistorStep[2] + 1.05,
    finalTransistorStep[1],
  );
  transistorBattery.visible = !transistorBatteryCollected;
  scene.add(transistorBattery);
  return { transistorBattery, finalTransistorStep };
}
