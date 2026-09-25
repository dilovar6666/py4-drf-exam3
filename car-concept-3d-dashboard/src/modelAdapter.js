import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { ComponentRegistry, createEmptyComponentBounds } from './componentRegistry.js';

function listMeshes(root) {
  const meshes = [];
  root.traverse((object) => {
    if (object.isMesh) meshes.push(object);
  });
  return meshes;
}

function objectPath(object, root) {
  const names = [];
  let cursor = object;
  while (cursor) {
    names.unshift(cursor.name || `[${cursor.type}]`);
    if (cursor === root) break;
    cursor = cursor.parent;
  }
  return names.join(' / ');
}

function findNodesByName(root, name) {
  const matches = [];
  root.traverse((object) => {
    if (object.name === name) matches.push(object);
  });
  return matches;
}

function removeNestedSelections(objects) {
  const selected = new Set(objects);
  return objects.filter((object) => {
    let parent = object.parent;
    while (parent) {
      if (selected.has(parent)) return false;
      parent = parent.parent;
    }
    return true;
  });
}

function createLogicalRoot(model, componentId, selectedObjects) {
  const roots = removeNestedSelections(selectedObjects);
  if (roots.length === 1) return roots[0];

  const commonParent = roots.every((object) => object.parent === roots[0].parent)
    ? roots[0].parent
    : model;
  if (!commonParent) return null;

  model.updateMatrixWorld(true);
  const group = new THREE.Group();
  group.name = `LogicalComponent_${componentId}`;
  commonParent.add(group);
  group.updateMatrixWorld(true);
  roots.forEach((object) => group.attach(object));
  return group;
}

function normalizeModel(model, normalization = {}) {
  const targetSize = normalization.targetSize || 3.5;
  const targetCenter = new THREE.Vector3(...(normalization.center || [0, 0, 0]));
  model.rotation.set(...(normalization.rotation || [0, 0, 0]));
  model.scale.set(1, 1, 1);
  model.position.set(0, 0, 0);
  model.updateMatrixWorld(true);

  const sourceBox = new THREE.Box3().setFromObject(model);
  const sourceCenter = sourceBox.getCenter(new THREE.Vector3());
  const sourceSize = sourceBox.getSize(new THREE.Vector3());
  const largestDimension = Math.max(sourceSize.x, sourceSize.y, sourceSize.z);
  if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
    throw new Error('[Auto Anatomy] The loaded model has no measurable geometry.');
  }

  const uniformScale = targetSize / largestDimension;
  model.scale.setScalar(uniformScale);
  model.position.copy(targetCenter).sub(sourceCenter.multiplyScalar(uniformScale));
  model.updateMatrixWorld(true);

  const normalizedBox = new THREE.Box3().setFromObject(model);
  return {
    uniformScale,
    sourceBox,
    normalizedBox,
    center: normalizedBox.getCenter(new THREE.Vector3()),
    size: normalizedBox.getSize(new THREE.Vector3())
  };
}

function explodeDirection(explode = {}, componentCenter, modelCenter) {
  if (Array.isArray(explode.direction)) {
    return new THREE.Vector3(...explode.direction).normalize();
  }
  if (explode.directionMode === 'radial-x') {
    const relativeX = componentCenter.x - modelCenter.x;
    const side = Math.sign(relativeX) || 1;
    return new THREE.Vector3(side, explode.verticalBias || 0, 0).normalize();
  }
  if (explode.directionMode === 'radial') {
    const radial = componentCenter.clone().sub(modelCenter);
    if (radial.lengthSq() > 0.000001) return radial.normalize();
  }
  return new THREE.Vector3(0, 1, 0);
}

function worldOffsetToParentDelta(object, worldOffset) {
  const parent = object.parent;
  if (!parent) return worldOffset.clone();
  parent.updateWorldMatrix(true, false);
  const worldOrigin = object.getWorldPosition(new THREE.Vector3());
  const localOrigin = parent.worldToLocal(worldOrigin.clone());
  const localTarget = parent.worldToLocal(worldOrigin.add(worldOffset));
  return localTarget.sub(localOrigin);
}

function hierarchyRecord(object, root) {
  return {
    name: object.name || `[${object.type}]`,
    type: object.type,
    parent: object.parent?.name || object.parent?.type || null,
    path: objectPath(object, root),
    mesh: Boolean(object.isMesh),
    componentId: object.userData?.componentId || null,
    children: object.children.map((child) => hierarchyRecord(child, root))
  };
}

function flattenedObjectRecords(root) {
  const records = [];
  root.traverse((object) => {
    const box = object.isMesh ? new THREE.Box3().setFromObject(object) : null;
    records.push({
      name: object.name || `[${object.type}]`,
      type: object.type,
      parent: object.parent?.name || object.parent?.type || null,
      path: objectPath(object, root),
      componentId: object.userData?.componentId || null,
      bounds: box ? {
        min: box.min.toArray(),
        max: box.max.toArray()
      } : null
    });
  });
  return records;
}

function buildComponentRegistry(model, modelConfig, normalizationInfo, sourceMeshes) {
  const registry = new ComponentRegistry(model, modelConfig);
  const configuredComponents = Object.entries(modelConfig.components || {});

  configuredComponents.forEach(([componentId, componentConfig]) => {
    const configuredNodeNames = componentConfig.nodes || [];
    const foundObjects = [];
    const missingNodes = [];

    configuredNodeNames.forEach((nodeName) => {
      const matches = findNodesByName(model, nodeName);
      if (!matches.length) missingNodes.push(nodeName);
      else {
        if (matches.length > 1) {
          console.warn(`[Auto Anatomy] Component "${componentId}": node name "${nodeName}" matched ${matches.length} objects; all matches will be included.`);
        }
        foundObjects.push(...matches);
      }
    });

    console[missingNodes.length ? 'warn' : 'info'](
      `[Auto Anatomy] Component "${componentId}": ${configuredNodeNames.length - missingNodes.length} configured nodes found, ${missingNodes.length} configured nodes missing${missingNodes.length ? ` (${missingNodes.join(', ')})` : ''}.`
    );
    if (!foundObjects.length) return;

    const object3D = createLogicalRoot(model, componentId, foundObjects);
    if (!object3D) {
      console.warn(`[Auto Anatomy] Component "${componentId}" could not create a logical Object3D.`);
      return;
    }

    model.updateMatrixWorld(true);
    const meshes = listMeshes(object3D);
    if (!meshes.length) {
      console.warn(`[Auto Anatomy] Component "${componentId}" contains no Mesh objects and was skipped.`);
      return;
    }

    const bounds = createEmptyComponentBounds();
    bounds.boundingBox.setFromObject(object3D);
    bounds.boundingBox.getCenter(bounds.center);
    bounds.boundingBox.getSize(bounds.size);
    bounds.boundingBox.getBoundingSphere(bounds.boundingSphere);

    const originalTransform = {
      position: object3D.position.clone(),
      quaternion: object3D.quaternion.clone(),
      scale: object3D.scale.clone()
    };
    const explode = componentConfig.explode || {};
    const direction = explodeDirection(explode, bounds.center, normalizationInfo.center);
    const componentSpan = Math.max(bounds.size.x, bounds.size.y, bounds.size.z);
    const modelSpan = Math.max(normalizationInfo.size.x, normalizationInfo.size.y, normalizationInfo.size.z);
    const distance = modelSpan * (explode.distanceFactor || 0) + componentSpan * (explode.sizeFactor ?? 0.05);
    const localOffset = worldOffsetToParentDelta(object3D, direction.multiplyScalar(distance));

    registry.register({
      id: componentId,
      displayName: componentConfig.displayName || componentId,
      object3D,
      meshes,
      metadata: componentConfig.metadata || {},
      config: componentConfig,
      configuredNodes: configuredNodeNames,
      missingNodes,
      ...bounds,
      originalTransform,
      explodedTransform: {
        position: originalTransform.position.clone().add(localOffset),
        quaternion: originalTransform.quaternion.clone(),
        scale: originalTransform.scale.clone()
      }
    });
  });

  model.updateMatrixWorld(true);
  const currentMeshes = listMeshes(model);
  const currentIds = new Set(currentMeshes.map((mesh) => mesh.uuid));
  const assignedIds = new Set(registry.values().flatMap((component) => component.meshes.map((mesh) => mesh.uuid)));
  const unassignedMeshes = currentMeshes.filter((mesh) => !assignedIds.has(mesh.uuid));
  const typeCounts = {};
  model.traverse((object) => { typeCounts[object.type] = (typeCounts[object.type] || 0) + 1; });

  return {
    registry,
    audit: {
      totalMeshCount: sourceMeshes.length,
      currentMeshCount: currentMeshes.length,
      typeCounts,
      components: registry.summary(),
      unassignedMeshes: unassignedMeshes.map((mesh) => ({
        name: mesh.name || '[unnamed mesh]',
        parent: mesh.parent?.name || mesh.parent?.type || null,
        path: objectPath(mesh, model)
      })),
      lostMeshes: sourceMeshes.filter((mesh) => !currentIds.has(mesh.uuid)).map((mesh) => mesh.name || '[unnamed mesh]'),
      hiddenMeshes: currentMeshes.filter((mesh) => !mesh.visible).map((mesh) => mesh.name || '[unnamed mesh]'),
      hierarchy: hierarchyRecord(model, model),
      objects: flattenedObjectRecords(model)
    }
  };
}

export async function loadConfiguredModel(modelConfig, onProgress, debugModel = false) {
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  const gltf = await new Promise((resolve, reject) => {
    loader.load(modelConfig.modelPath, resolve, onProgress, reject);
  });
  draco.dispose();

  const model = gltf.scene;
  const sourceMeshes = listMeshes(model);
  const normalization = normalizeModel(model, modelConfig.normalization);
  const modelSpan = Math.max(normalization.size.x, normalization.size.y, normalization.size.z);
  const shadowThreshold = modelSpan * (modelConfig.performance?.shadowCasterMinSizeFactor ?? 0.075);
  const shadowBox = new THREE.Box3();
  const shadowSize = new THREE.Vector3();
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.receiveShadow = true;
    object.frustumCulled = true;
    shadowBox.setFromObject(object).getSize(shadowSize);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const castsVisibleShadow = materials.some((material) => material && material.opacity > 0.35 && !material.transparent);
    object.castShadow = castsVisibleShadow && Math.max(shadowSize.x, shadowSize.y, shadowSize.z) >= shadowThreshold;
  });

  const { registry, audit } = buildComponentRegistry(model, modelConfig, normalization, sourceMeshes);
  console.info('[Auto Anatomy] Model audit', audit);

  if (debugModel) {
    console.groupCollapsed(`[Auto Anatomy] MODEL INSPECTOR — ${modelConfig.displayName}`);
    console.info('GLB hierarchy', audit.hierarchy);
    console.table(audit.objects);
    console.table(audit.components);
    console.groupCollapsed(`[Auto Anatomy] UNASSIGNED MESHES (${audit.unassignedMeshes.length})`);
    console.table(audit.unassignedMeshes);
    console.groupEnd();
    console.groupEnd();
  }

  return { model, registry, audit, normalization };
}

export function applyPresentationOffset(model, modelConfig, isMobile) {
  const offset = isMobile
    ? modelConfig.presentation?.mobileOffset
    : modelConfig.presentation?.desktopOffset;
  if (offset) model.position.add(new THREE.Vector3(...offset));
  model.updateMatrixWorld(true);
}

export function applyExplosion(registry, progress) {
  const amount = THREE.MathUtils.clamp(progress, 0, 1);
  registry.values().forEach((component) => {
    const { object3D, originalTransform, explodedTransform } = component;
    object3D.position.lerpVectors(originalTransform.position, explodedTransform.position, amount);
    object3D.quaternion.slerpQuaternions(originalTransform.quaternion, explodedTransform.quaternion, amount);
    object3D.scale.lerpVectors(originalTransform.scale, explodedTransform.scale, amount);
  });
}

function createDebugLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(3, 5, 4, 0.82)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#c9ff48';
  context.font = '30px monospace';
  context.fillText(text, 20, 60);
  const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.2, 0.4, 1);
  return sprite;
}

export function createModelDebugOverlay(scene, registry, debugModel) {
  if (!debugModel) return null;
  const debugGroup = new THREE.Group();
  debugGroup.name = 'ModelDebugOverlay';
  registry.values().forEach((component, index, components) => {
    const box = new THREE.Box3().setFromObject(component.object3D);
    const color = new THREE.Color().setHSL(index / components.length, 0.78, 0.58);
    const helper = new THREE.Box3Helper(box, color);
    const center = box.getCenter(new THREE.Vector3());
    const height = box.getSize(new THREE.Vector3()).y;
    const label = createDebugLabel(`${component.id} | ${component.meshes.length} Mesh`);
    label.position.copy(center).add(new THREE.Vector3(0, height * 0.6 + 0.15, 0));
    debugGroup.add(helper, label);
  });
  scene.add(debugGroup);
  return debugGroup;
}
