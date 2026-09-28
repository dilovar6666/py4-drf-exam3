import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { loadConfiguredModel, applyExplosion } from "../modelAdapter.js";
import { audiR8ModelConfig } from "../models/audiR8.js";
import { AdaptiveQualityController } from "../performanceQuality.js";
import { storyPose, STORY_STAGES } from "./story.js";

gsap.registerPlugin(ScrollTrigger);

export function createVehicleScene(
  container,
  {
    modelUrl,
    modelConfig = audiR8ModelConfig,
    storyElement,
    preview = false,
    onProgress,
    onReady,
    onHover,
    onSelect,
    onStory,
    onError,
  } = {},
) {
  let disposed = false,
    model,
    registry,
    audit,
    trigger,
    selected = null,
    hovered = null;
  let dirty = true,
    progress = 0,
    previousView = null,
    focusTween = null,
    storyPaused = false;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const storyStages = modelConfig.storyStages || STORY_STAGES;
  let modelOrigin;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#F7F7F5");
  scene.fog = new THREE.Fog("#F7F7F5", 15, 32);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment(renderer);
  const environment = pmrem.fromScene(room, 0.04).texture;
  scene.environment = environment;
  room.dispose();
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(43, 1, 0.08, 80);
  const controls = new OrbitControls(camera, renderer.domElement);
  // Permit vertical story scrolling on touch; taps and horizontal orbit remain available.
  renderer.domElement.style.touchAction = "pan-y";
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = 1;
  controls.maxDistance = 16;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI * 0.8;
  controls.enabled = !preview;
  const ambient = new THREE.HemisphereLight(0xffffff, 0xc7c7c1, 1.4);
  const key = new THREE.DirectionalLight(0xffffff, 2.7);
  key.position.set(5, 8, 6);
  key.castShadow = true;
  Object.assign(key.shadow.camera, {
    left: -7,
    right: 7,
    top: 7,
    bottom: -7,
    near: 0.5,
    far: 30,
  });
  key.shadow.bias = -0.0001;
  const fill = new THREE.DirectionalLight(0xffffff, 1.2);
  fill.position.set(-5, 3, -5);
  scene.add(ambient, key, fill);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({
      color: "#eeefeb",
      roughness: 0.92,
      metalness: 0,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.58;
  floor.receiveShadow = true;
  scene.add(floor);
  const quality = new AdaptiveQualityController((profile) => {
    renderer.setPixelRatio(Math.min(devicePixelRatio, profile.maxPixelRatio));
    renderer.shadowMap.enabled = profile.shadowsEnabled;
    key.shadow.mapSize.setScalar(profile.shadowMapSize);
    key.shadow.map?.dispose();
    key.shadow.map = null;
    resize();
    dirty = true;
  });
  const context = renderer.getContext(),
    gpuInfo = context.getExtension("WEBGL_debug_renderer_info");
  quality.applyRendererHint(
    gpuInfo ? context.getParameter(gpuInfo.UNMASKED_RENDERER_WEBGL) : "",
  );
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  let meshes = [],
    down = { x: 0, y: 0 };
  const baseMaterials = new Map();

  function resize() {
    const width = container.clientWidth || innerWidth,
      height = container.clientHeight || innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    dirty = true;
    if (registry && !selected && !storyPaused) setStory(progress);
  }
  quality.start();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  function highlight(id) {
    baseMaterials.forEach((base, material) => {
      material.opacity = selected ? base.opacity * 0.24 : base.opacity;
      material.transparent = selected ? true : base.transparent;
      material.depthWrite = selected ? false : base.depthWrite;
      if (material.emissive) {
        material.emissive.copy(base.color);
        material.emissiveIntensity = base.intensity;
      }
    });
    registry?.get(selected)?.meshes.forEach((mesh) => {
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(
        (material) => {
          const base = baseMaterials.get(material);
          if (base) {
            material.opacity = base.opacity;
            material.transparent = base.transparent;
            material.depthWrite = base.depthWrite;
          }
        },
      );
    });
    registry?.get(id)?.meshes.forEach((mesh) => {
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      materials.forEach((material) => {
        if (material.emissive) {
          material.emissive.set("#b6c4cd");
          material.emissiveIntensity = 0.16;
        }
      });
    });
    dirty = true;
  }
  function setStory(value) {
    progress = THREE.MathUtils.clamp(value, 0, 1);
    if (!registry || selected) return;
    if (hovered) clearHover();
    const pose = storyPose(progress, storyStages);
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = damping;
    const position = (
      reducedMotion ? storyStages[0].camera : pose.camera
    ).slice();
    if (preview)
      position.forEach((v, i) => {
        position[i] = v * 0.68;
      });
    // A portrait camera must step back to retain the complete silhouette.
    if (camera.aspect < 1)
      position.forEach((v, i) => {
        if (i !== 1) position[i] = v * 1.5;
      });
    camera.position.fromArray(position);
    controls.target.fromArray(pose.target);
    camera.lookAt(controls.target);
    if (!preview && !reducedMotion && camera.aspect >= 1) {
      camera.updateMatrixWorld();
      const right = new THREE.Vector3().setFromMatrixColumn(
        camera.matrixWorld,
        0,
      );
      const offset =
        camera.position.distanceTo(controls.target) *
        Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
        camera.aspect *
        2 *
        pose.framing;
      camera.position.addScaledVector(right, offset);
      controls.target.addScaledVector(right, offset);
    }
    model.rotation.y = reducedMotion ? 0 : -0.12 * Math.sin(progress * Math.PI);
    if (modelOrigin) {
      model.position.copy(modelOrigin);
      if (!reducedMotion)
        model.position.x += 0.18 * Math.sin(progress * Math.PI);
    }
    applyExplosion(registry, pose.explode);
    model.updateMatrixWorld(true);
    renderer.shadowMap.needsUpdate = true;
    dirty = true;
    onStory?.({ progress, ...pose });
  }
  function hit(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const object = raycaster.intersectObjects(meshes, false)[0]?.object;
    return object ? registry.getComponentIdForObject(object) : null;
  }
  function clearHover() {
    hovered = null;
    highlight(selected);
    onHover?.(null);
    renderer.domElement.style.cursor = "";
  }
  function pointerMove(event) {
    if (!registry || preview || event.pointerType === "touch" || focusTween)
      return;
    const id = hit(event);
    if (id !== hovered) {
      hovered = id;
      highlight(id || selected);
    }
    onHover?.(
      id
        ? {
            componentId: id,
            name: registry.get(id).displayName,
            x: event.clientX,
            y: event.clientY,
          }
        : null,
    );
    renderer.domElement.style.cursor = id ? "pointer" : "";
  }
  function focusComponent(id, notify = true) {
    const component = registry?.get(id);
    if (!component || preview) return false;
    if (!selected)
      previousView = {
        position: camera.position.clone(),
        target: controls.target.clone(),
      };
    focusTween?.kill();
    selected = id;
    storyPaused = true;
    clearHover();
    component.object3D.updateWorldMatrix(true, true);
    const sphere = new THREE.Box3()
      .setFromObject(component.object3D)
      .getBoundingSphere(new THREE.Sphere());
    const center = sphere.center.clone(),
      radius = Math.max(sphere.radius, 0.08);
    // Reserve the lower mobile sheet / right desktop panel without hiding geometry.
    const right = new THREE.Vector3().setFromMatrixColumn(
      camera.matrixWorld,
      0,
    );
    if (camera.aspect < 1) center.addScaledVector(camera.up, -radius * 0.9);
    else center.addScaledVector(right, radius * 0.65);
    const vFov = THREE.MathUtils.degToRad(camera.fov),
      hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const distance = (radius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.5;
    const direction = camera.position.clone().sub(controls.target).normalize();
    const destination = center
      .clone()
      .addScaledVector(direction, Math.max(distance, 0.65));
    controls.enabled = false;
    focusTween = gsap
      .timeline({
        defaults: { duration: reducedMotion ? 0 : 1.1, ease: "power3.inOut" },
        onUpdate: () => {
          camera.lookAt(controls.target);
          dirty = true;
        },
        onComplete: () => {
          focusTween = null;
          controls.enabled = true;
        },
      })
      .to(
        camera.position,
        { x: destination.x, y: destination.y, z: destination.z },
        0,
      )
      .to(controls.target, { x: center.x, y: center.y, z: center.z }, 0);
    controls.minDistance = Math.max(radius * 0.6, 0.2);
    controls.maxDistance = Math.max(distance * 4, 8);
    highlight(id);
    if (notify) onSelect?.(id);
    return true;
  }
  function reset() {
    focusTween?.kill();
    focusTween = null;
    selected = null;
    storyPaused = false;
    controls.enabled = !preview;
    controls.minDistance = 1;
    controls.maxDistance = 16;
    highlight(null);
    setStory(progress);
    previousView = null;
    onSelect?.(null);
  }
  function pointerDown(event) {
    down = { x: event.clientX, y: event.clientY };
  }
  function pointerUp(event) {
    if (Math.hypot(event.clientX - down.x, event.clientY - down.y) < 7) {
      const id = hit(event);
      if (id) focusComponent(id);
    }
  }
  function orbitStart() {
    storyPaused = true;
  }
  function orbitChange() {
    dirty = true;
  }
  function keydown(event) {
    if (event.key === "Escape" && selected) reset();
  }
  renderer.domElement.addEventListener("pointermove", pointerMove);
  renderer.domElement.addEventListener("pointerleave", clearHover);
  renderer.domElement.addEventListener("pointerdown", pointerDown);
  renderer.domElement.addEventListener("pointerup", pointerUp);
  controls.addEventListener("start", orbitStart);
  controls.addEventListener("change", orbitChange);
  window.addEventListener("keydown", keydown);
  const renderTimes = [];
  let previousTime = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now(),
      delta = now - previousTime;
    previousTime = now;
    if (document.hidden) return;
    if (controls.enabled) dirty = controls.update() || dirty;
    if (dirty || focusTween) {
      const started = performance.now();
      renderer.render(scene, camera);
      const duration = performance.now() - started;
      dirty = false;
      quality.recordFrame(delta);
      renderTimes.push(duration);
      if (renderTimes.length > 120) renderTimes.shift();
    }
  });

  const config = {
    ...modelConfig,
    modelPath: modelUrl || modelConfig.modelPath,
  };
  const ready = loadConfiguredModel(config, (event) =>
    onProgress?.(
      Math.min(
        99,
        Math.round(
          (event.loaded / (event.total || config.estimatedFileSize)) * 100,
        ),
      ),
    ),
  )
    .then((result) => {
      if (disposed) {
        disposeObject(result.model);
        return;
      }
      ({ model, registry, audit } = result);
      scene.add(model);
      modelOrigin = model.position.clone();
      meshes = registry.values().flatMap((component) => component.meshes);
      meshes.forEach((mesh) => {
        const source = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        const cloned = source.map((material) => {
          const copy = material.clone();
          copy.forceSinglePass = true;
          baseMaterials.set(copy, {
            color: copy.emissive?.clone(),
            intensity: copy.emissiveIntensity,
            opacity: copy.opacity,
            transparent: copy.transparent,
            depthWrite: copy.depthWrite,
          });
          return copy;
        });
        mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
      });
      floor.position.y = new THREE.Box3().setFromObject(model).min.y - 0.035;
      setStory(0);
      if (storyElement && !preview) {
        trigger = ScrollTrigger.create({
          trigger: storyElement,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => {
            if (!selected) {
              storyPaused = false;
              setStory(self.progress);
            }
          },
        });
        ScrollTrigger.refresh();
      }
      onProgress?.(100);
      onReady?.(controller);
      if (!preview) window.__AUTO_ANATOMY_3D__ = controller;
    })
    .catch((error) => {
      if (!disposed) onError?.(error);
    });

  function disposeObject(object) {
    object.traverse((node) => {
      if (!node.isMesh) return;
      node.geometry?.dispose();
      const materials = Array.isArray(node.material)
        ? node.material
        : [node.material];
      materials.forEach((material) => {
        if (!material) return;
        Object.values(material).forEach((v) => {
          if (v?.isTexture) v.dispose();
        });
        material.dispose();
      });
    });
  }
  const controller = {
    ready,
    modelId: config.id,
    modelPath: config.modelPath,
    get modelAudit() {
      return audit;
    },
    get components() {
      return registry?.summary() || [];
    },
    get availableComponents() {
      return registry?.ids() || [];
    },
    focusComponent,
    reset,
    setStoryProgress: setStory,
    setExplodeProgress(value) {
      if (!registry) return;
      const amount = THREE.MathUtils.clamp(value, 0, 1);
      applyExplosion(registry, amount);
      model.updateMatrixWorld(true);
      renderer.shadowMap.needsUpdate = true;
      dirty = true;
      onStory?.({
        progress,
        ...storyPose(progress, storyStages),
        stage: storyStages.findLastIndex((stage) => stage.explode <= amount),
        explode: amount,
      });
    },
    rotateCameraBy(deltaX, deltaY) {
      if (!model || preview) return;
      focusTween?.kill();
      focusTween = null;
      storyPaused = true;
      const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      spherical.theta += deltaX;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + deltaY, 0.12, Math.PI - 0.12);
      camera.position.setFromSpherical(spherical).add(controls.target);
      camera.lookAt(controls.target);
      controls.update();
      dirty = true;
    },
    getInteractionState: () => ({
      selectedComponentId: selected,
      hoveredComponentId: hovered,
      componentCount: registry?.ids().length || 0,
    }),
    getCameraState: () => ({
      position: camera.position.toArray(),
      target: controls.target.toArray(),
    }),
    getRenderDiagnostics: () => ({
      floorY: floor.position.y,
      modelBounds: model ? new THREE.Box3().setFromObject(model) : null,
      cameraQuaternion: camera.quaternion.toArray(),
      selectedBounds: selected ? new THREE.Box3().setFromObject(registry.get(selected).object3D) : null,
      selectedMaterials: registry?.get(selected)?.meshes.flatMap(mesh => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(material => ({name:material.name,opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite,side:material.side}))),
    }),
    getPerformanceSnapshot: () => ({
      render: { ...renderer.info.render },
      memory: { ...renderer.info.memory },
      quality: quality.state(),
      averageCpuRenderMs:
        renderTimes.reduce((a, b) => a + b, 0) / (renderTimes.length || 1),
      activeCanvasCount: document.querySelectorAll("canvas").length,
    }),
    getComponentTransforms: () => {
      model?.updateMatrixWorld(true);
      return registry
        ?.values()
        .map((c) => ({
          componentId: c.id,
          position: c.object3D.position.toArray(),
          worldPosition: c.object3D.getWorldPosition(new THREE.Vector3()).toArray(),
          assemblyPosition: c.config.explode?.assemblyId ? c.object3D.parent?.position.toArray() : null,
          quaternion: c.object3D.quaternion.toArray(),
          scale: c.object3D.scale.toArray(),
          originalPosition: c.originalTransform.position.toArray(),
          explodedPosition: c.explodedTransform.position.toArray(),
        })) || [];
    },
    getComponentPointerTarget(id) {
      const component = registry?.get(id);
      if (!component) return null;
      scene.updateMatrixWorld(true);
      const rect = renderer.domElement.getBoundingClientRect();
      for (const mesh of component.meshes) {
        const positions = mesh.geometry.attributes.position;
        for (
          let i = 0;
          i < positions.count;
          i += Math.max(1, Math.floor(positions.count / 160))
        ) {
          const ndc = new THREE.Vector3()
            .fromBufferAttribute(positions, i)
            .applyMatrix4(mesh.matrixWorld)
            .project(camera);
          if (
            Math.abs(ndc.x) > 0.96 ||
            Math.abs(ndc.y) > 0.96 ||
            Math.abs(ndc.z) > 1
          )
            continue;
          raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
          const found = raycaster.intersectObjects(meshes, false)[0]?.object;
          if (found && registry.getComponentIdForObject(found) === id)
            return {
              x: rect.left + (ndc.x + 1) * 0.5 * rect.width,
              y: rect.top + (1 - ndc.y) * 0.5 * rect.height,
            };
        }
      }
      return null;
    },
    dispose() {
      disposed = true;
      trigger?.kill();
      focusTween?.kill();
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerleave", clearHover);
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("keydown", keydown);
      controls.dispose();
      disposeObject(scene);
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      if (window.__AUTO_ANATOMY_3D__ === controller)
        delete window.__AUTO_ANATOMY_3D__;
    },
  };
  return controller;
}
