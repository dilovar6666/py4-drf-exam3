import vehicles from './vehicles.json' with { type: 'json' };
import { audiR8ModelConfig } from './audiR8.js';
import { STORY_STAGES } from '../three/story.js';

export const preparedVehicles = vehicles;
function defaultExplode(component) {
  const id = component.id || '';
  const side = ['fl', 'rl'].some(position => id.endsWith(`_${position}`)) ? 1 : -1;
  if (id === 'body_shell' || id === 'body_chassis_fused') {
    return { direction: [0, 1, 0], distanceFactor: 0.008, sizeFactor: 0 };
  }
  if (/^door_(fl|fr|rl|rr)$/.test(id)) {
    return { direction: [id.endsWith('_fl') || id.endsWith('_rl') ? 1 : -1, 0.08, 0], distanceFactor: 0.2, sizeFactor: 0 };
  }
  if (/^(tire|rim|hub|brake_disc|brake_caliper)_(fl|fr|rl|rr)$/.test(id)) {
    const factor = id.startsWith('rim_') ? 0.28 : id.startsWith('brake_') ? 0.16 : 0.21;
    return { direction: [side, 0.04, 0], distanceFactor: factor, sizeFactor: 0 };
  }
  if (id === 'hood' || id === 'front_bumper' || id === 'front_lights') {
    return { direction: [0, 0.08, 1], distanceFactor: 0.14, sizeFactor: 0 };
  }
  if (id === 'trunk_lid' || id === 'rear_bumper' || id === 'rear_lights') {
    return { direction: [0, 0.08, -1], distanceFactor: 0.14, sizeFactor: 0 };
  }
  return { directionMode: 'radial', distanceFactor: 0.13, sizeFactor: 0 };
}
export const vehicleConfigs = [audiR8ModelConfig, ...vehicles.map(vehicle => ({
  id: vehicle.id,
  displayName: `${vehicle.brand} ${vehicle.name}`,
  modelPath: `/assets/models/${vehicle.file}`,
  estimatedFileSize: 34000000,
  normalization: { targetSize: 3.5, center: [0, 0.2, 0], rotation: [0, 0, 0] },
  performance: { shadowCasterMinSizeFactor: 0.14 },
  storyStages: STORY_STAGES.map((stage,index) => ({
    ...stage,
    ...(index === 1 && vehicle.id === 'mercedes_300sl' ? {camera:[-1.9,1.3,2.6],target:[0,0.3,0.8]} : {}),
    ...(index === 2 ? {text:'Explore the wheel geometry actually present in this source model.'} : {}),
    ...(index === 5 ? {text:`One vehicle. ${vehicle.components.length} semantic assemblies. Explore each one.`} : {}),
  })),
  components: Object.fromEntries(vehicle.components.map(component => [component.id, {
    displayName: component.name,
    category: component.category,
    nodes: [`AA_${component.id}`],
    metadata: {category: component.category, description: component.description},
    explode: component.explode || defaultExplode(component),
  }])),
}))];

// Only prepared, explicitly registered assets get semantic interaction.
// A model URL never causes another vehicle's component mapping to be applied.
export function getVehicleConfig(car) {
  const path = (car?.model_url || '').split(/[?#]/)[0];
  return vehicleConfigs.find(config => path.toLowerCase().endsWith('/'+config.modelPath.split('/').pop().toLowerCase())) || null;
}

export function buildCinematicVehicleConfig(car, components, cinematic = {}) {
  if (!car || !components?.length) return null;
  const categories = new Set(components.map((item) => String(item.category_name || item.category || "UNKNOWN").toUpperCase()));
  const presets = cinematic.camera_presets || {};
  const sections = cinematic.story_sections?.length ? cinematic.story_sections : [
    { id: "intro", title: "Introduction" }, { id: "design", title: "Design" },
    ...(categories.has("ENGINE") ? [{ id: "engine", title: "Engine and performance", category: "ENGINE" }] : []),
    ...(categories.has("INTERIOR") ? [{ id: "interior", title: "Interior", category: "INTERIOR" }] : []),
    { id: "anatomy", title: "Anatomy" }, { id: "specifications", title: "Specifications" }, { id: "store", title: "Store" },
  ];
  const poses = {
    intro: STORY_STAGES[0], design: STORY_STAGES[0], engine: STORY_STAGES[1], performance: STORY_STAGES[1],
    brakes: STORY_STAGES[2], interior: { ...STORY_STAGES[1], camera: [0.1, 1.8, 2.7], target: [0, 0.45, 0] },
    anatomy: STORY_STAGES[4], specifications: STORY_STAGES[0], store: STORY_STAGES[0],
  };
  const storyStages = sections.map((section, index) => {
    const pose = poses[section.id] || STORY_STAGES[0];
    const configured = presets[section.id] || {};
    return {
      title: section.title,
      text: section.text || (section.id === "anatomy" ? "Explore the reviewed semantic components represented by this source model." : "Explore the published information and geometry for this vehicle."),
      camera: configured.camera || pose.camera,
      target: configured.target || pose.target,
      explode: Number.isFinite(configured.explode) ? configured.explode : section.id === "anatomy" ? 0.6 : 0,
    };
  });
  return {
    id: `car-${car.id}`,
    displayName: `${car.brand_name || ""} ${car.model_name || ""}`.trim(),
    modelPath: car.model_url,
    normalization: { targetSize: 3.5, center: [0, 0.2, 0], rotation: [0, 0, 0] },
    storyStages,
    components: Object.fromEntries(components.map((component) => [component.component_id, {
      displayName: component.name,
      category: component.category_name || "UNKNOWN",
      nodes: [`AA_${component.component_id}`],
      metadata: { category: component.category_name || "UNKNOWN", description: component.description || "" },
      explode: defaultExplode({ id: component.component_id }),
    }])),
  };
}
