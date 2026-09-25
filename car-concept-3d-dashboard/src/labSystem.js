import * as THREE from 'three';

const HOVER_EMISSIVE = new THREE.Color(0x35471f);

export function buildLabCatalog(registry, modelConfig, partsData, labSlots) {
  const catalog = [];

  Object.entries(modelConfig.components || {}).forEach(([componentId, componentConfig]) => {
    if (!componentConfig.lab || !registry.has(componentId)) return;
    const part = partsData[componentId];
    const slot = labSlots[componentConfig.lab.slotId];
    if (!part) {
      console.warn(`[Auto Anatomy] Lab skipped "${componentId}": no PARTS_DATA entry.`);
      return;
    }
    if (!slot) {
      console.warn(`[Auto Anatomy] Lab skipped "${componentId}": slot "${componentConfig.lab.slotId}" does not exist.`);
      return;
    }
    catalog.push({
      ...part,
      componentId,
      componentConfig,
      lab: componentConfig.lab,
      slotId: componentConfig.lab.slotId,
      slot
    });
  });

  return catalog.sort((a, b) => (a.slot.order || 0) - (b.slot.order || 0));
}

function cloneInteractiveMaterials(holder, componentId) {
  holder.traverse((object) => {
    object.userData.componentId = componentId;
    if (!object.isMesh || !object.material) return;
    const source = Array.isArray(object.material) ? object.material : [object.material];
    const cloned = source.map((material) => {
      const copy = material.clone();
      copy.userData.baseOpacity = copy.opacity;
      copy.userData.baseTransparent = copy.transparent;
      copy.userData.baseDepthWrite = copy.depthWrite;
      if (copy.emissive) {
        copy.userData.baseEmissive = copy.emissive.clone();
        copy.userData.baseEmissiveIntensity = copy.emissiveIntensity;
      }
      return copy;
    });
    object.material = Array.isArray(object.material) ? cloned : cloned[0];
  });
}

function cloneComponentInWorld(component) {
  component.object3D.updateWorldMatrix(true, true);
  const clone = component.object3D.clone(true);
  component.object3D.matrixWorld.decompose(clone.position, clone.quaternion, clone.scale);
  clone.updateMatrixWorld(true);
  return clone;
}

export function createLabExhibits(scene, model, registry, catalog) {
  model.updateMatrixWorld(true);
  const exhibits = new Map();
  const interactiveMeshes = [];
  const labAudit = {};

  catalog.forEach((entry, index) => {
    const component = registry.get(entry.componentId);
    if (!component?.meshes.length) return;

    const holder = new THREE.Group();
    const pivot = new THREE.Group();
    const clone = cloneComponentInWorld(component);
    holder.name = `Exhibit_${entry.componentId}`;
    pivot.name = `ExhibitPivot_${entry.componentId}`;
    pivot.add(clone);
    holder.add(pivot);
    scene.add(holder);
    scene.updateMatrixWorld(true);

    const sourceBox = new THREE.Box3().setFromObject(pivot);
    const sourceCenter = sourceBox.getCenter(new THREE.Vector3());
    const sourceSize = sourceBox.getSize(new THREE.Vector3());
    clone.position.sub(sourceCenter);

    const maxDimension = Math.max(sourceSize.x, sourceSize.y, sourceSize.z, 0.001);
    const targetSize = entry.lab.maxSize || 2;
    const uniformScale = THREE.MathUtils.clamp(
      targetSize / maxDimension,
      entry.lab.minScale || 0.55,
      entry.lab.maxScale || 1.8
    );
    pivot.scale.setScalar(uniformScale);
    pivot.rotation.set(...(entry.lab.rotation || [0, 0, 0]));
    holder.position.set(entry.slot.position[0], 0, entry.slot.position[2]);
    scene.updateMatrixWorld(true);

    const placedBox = new THREE.Box3().setFromObject(holder);
    const platformTop = entry.slot.position[1] + entry.slot.pedestalHeight * 0.5;
    holder.position.y += platformTop + entry.slot.clearance - placedBox.min.y;
    holder.updateMatrixWorld(true);

    const finalBox = new THREE.Box3().setFromObject(holder);
    const finalSphere = finalBox.getBoundingSphere(new THREE.Sphere());
    cloneInteractiveMaterials(holder, entry.componentId);
    holder.userData.componentId = entry.componentId;
    holder.userData.baseY = holder.position.y;
    holder.userData.idlePhase = index * 0.83;
    holder.userData.cameraTarget = finalSphere.center.clone();
    holder.userData.cameraDirection = new THREE.Vector3(...entry.slot.cameraDirection).normalize();
    holder.traverse((object) => {
      if (object.isMesh) interactiveMeshes.push(object);
    });
    exhibits.set(entry.componentId, holder);
    labAudit[entry.componentId] = {
      componentId: entry.componentId,
      meshCount: component.meshes.length,
      sourceMeshes: component.meshes.map((mesh) => mesh.name || '[unnamed mesh]'),
      uniformScale,
      center: finalSphere.center.toArray(),
      radius: finalSphere.radius,
      slotId: entry.slotId,
      visible: holder.visible && component.meshes.some((mesh) => mesh.visible)
    };
  });

  model.visible = false;
  console.info('[Auto Anatomy] Lab audit', labAudit);
  return { exhibits, interactiveMeshes, labAudit };
}

export function setExhibitEmphasis(exhibits, selectedComponentId = null) {
  exhibits.forEach((holder, componentId) => {
    holder.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        const dimmed = selectedComponentId && componentId !== selectedComponentId;
        material.opacity = dimmed ? Math.min(material.userData.baseOpacity ?? 1, 0.16) : (material.userData.baseOpacity ?? 1);
        material.transparent = dimmed || (material.userData.baseTransparent ?? false);
        material.depthWrite = dimmed ? false : (material.userData.baseDepthWrite ?? true);
      });
    });
  });
}

export function setExhibitHover(holder, active, intensity = 0.08) {
  if (!holder) return;
  holder.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (!material.emissive || !material.userData.baseEmissive) return;
      material.emissive.copy(active ? HOVER_EMISSIVE : material.userData.baseEmissive);
      material.emissiveIntensity = active ? intensity : material.userData.baseEmissiveIntensity;
    });
  });
}
