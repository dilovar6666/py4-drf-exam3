import * as THREE from 'three';

export class ComponentRegistry {
  constructor(model, modelConfig) {
    this.model = model;
    this.modelConfig = modelConfig;
    this.components = new Map();
  }

  register(component) {
    component.meshes.forEach((mesh) => {
      const existingComponentId = mesh.userData.componentId;
      if (existingComponentId && existingComponentId !== component.id) {
        console.warn(`[Auto Anatomy] Mesh "${mesh.name || '[unnamed mesh]'}" is assigned to both "${existingComponentId}" and "${component.id}". Keeping the first assignment.`);
        return;
      }
      mesh.userData.componentId = component.id;
    });
    this.components.set(component.id, component);
    return component;
  }

  get(componentId) {
    return this.components.get(componentId) || null;
  }

  has(componentId) {
    return this.components.has(componentId);
  }

  values() {
    return [...this.components.values()];
  }

  ids() {
    return [...this.components.keys()];
  }

  getComponentIdForObject(object) {
    let cursor = object;
    while (cursor) {
      if (cursor.userData?.componentId) return cursor.userData.componentId;
      cursor = cursor.parent;
    }
    return null;
  }

  getForObject(object) {
    const componentId = this.getComponentIdForObject(object);
    return componentId ? this.get(componentId) : null;
  }

  refreshBounds(componentId) {
    const component = this.get(componentId);
    if (!component) return null;
    component.boundingBox.setFromObject(component.object3D);
    component.boundingBox.getCenter(component.center);
    component.boundingBox.getSize(component.size);
    component.boundingBox.getBoundingSphere(component.boundingSphere);
    return component;
  }

  refreshAllBounds() {
    this.ids().forEach((componentId) => this.refreshBounds(componentId));
    return this;
  }

  summary() {
    return this.values().map((component) => ({
      componentId: component.id,
      displayName: component.displayName,
      meshCount: component.meshes.length,
      meshNames: component.meshes.map((mesh) => mesh.name || '[unnamed mesh]'),
      configuredNodes: component.configuredNodes,
      missingNodes: component.missingNodes,
      center: component.center.toArray(),
      size: component.size.toArray(),
      boundingSphere: {
        center: component.boundingSphere.center.toArray(),
        radius: component.boundingSphere.radius
      }
    }));
  }
}

export function createEmptyComponentBounds() {
  return {
    boundingBox: new THREE.Box3(),
    boundingSphere: new THREE.Sphere(),
    center: new THREE.Vector3(),
    size: new THREE.Vector3()
  };
}
