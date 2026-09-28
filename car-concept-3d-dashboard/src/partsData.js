const FALLBACK_PARTS_DATA = {
  engine: {
    componentId: 'engine',
    title: 'Engine',
    category: 'Powertrain',
    description: 'The source model contains a dedicated engine component beneath the forward bodywork. It is shown at its authored proportions.',
    function: 'Converts stored energy into mechanical motion delivered to the driven wheels.'
  },
  engine_block: {
    componentId: 'engine_block',
    title: 'Engine block and central assembly',
    category: 'Engine',
    description: 'The central engine geometry is grouped separately from its removable covers and rear panel.',
    function: 'Contains the core power-producing engine assembly represented by the source geometry.'
  },
  wheel_front_left: {
    componentId: 'wheel_front_left',
    title: 'Front wheel',
    category: 'Running gear',
    description: 'The complete front-left wheel hierarchy remains assembled as one logical exhibit, including its tyre, rim and braking geometry.',
    function: 'Supports the vehicle and transmits driving, steering and braking forces to the road.'
  },
  front_left_tire: {
    componentId: 'front_left_tire',
    title: 'Front left tire',
    category: 'Wheels',
    description: 'The front-left rubber tire is exposed independently from its rim and brake hardware.',
    function: 'Provides the vehicle contact patch and transmits steering and braking forces to the road.'
  },
  steering: {
    componentId: 'steering',
    title: 'Steering assembly',
    category: 'Driver interface',
    description: 'The steering base and complete steering-wheel hierarchy are grouped together so their authored relationship is preserved.',
    function: 'Provides the driver’s primary directional input to the steering system.'
  },
  steering_wheel: {
    componentId: 'steering_wheel',
    title: 'Steering wheel',
    category: 'Interior',
    description: 'The steering wheel is a distinct driver-control component in the Audi cabin.',
    function: 'Provides the driver\u2019s primary directional input.'
  },
  seats: {
    componentId: 'seats',
    title: 'Seat assembly',
    category: 'Interior',
    description: 'The upholstered surfaces and supporting frames form one logical seating component and move together.',
    function: 'Positions and supports occupants while maintaining their relationship to the cabin.'
  },
  hood: {
    componentId: 'hood',
    title: 'Hood assembly',
    category: 'Bodywork',
    description: 'The complete hood hierarchy keeps its outer panel, inner structures, grille, underside and integrated lighting geometry together.',
    function: 'Closes the forward compartment while providing service access to the systems beneath it.'
  },
  door_left: {
    componentId: 'door_left',
    title: 'Left door',
    category: 'Bodywork',
    description: 'The complete left-door hierarchy keeps its exterior skins, handles, mirror, glazing, gasket and interior trim together.',
    function: 'Provides cabin access while completing the exterior enclosure in its assembled position.'
  },
  lights: {
    componentId: 'lights',
    title: 'Lighting assemblies',
    category: 'Lighting',
    description: 'The front and rear lamp geometry is preserved as one logical lighting component with dedicated lens and emitter materials.',
    function: 'Illuminates the road and communicates the vehicle position and braking state.'
  },
  headlight_left_housing: {
    componentId: 'headlight_left_housing',
    title: 'Left headlight housing',
    category: 'Lighting',
    description: 'The structural lamp housing is separated from its emitters and clear outer lens.',
    function: 'Supports and locates the left headlight optical components.'
  },
  front_left_brake_disc: {
    componentId: 'front_left_brake_disc',
    title: 'Front left brake disc',
    category: 'Brakes',
    description: 'The front-left brake rotor is exposed independently from the caliper, rim and tire.',
    function: 'Provides the rotating friction surface used to slow the front-left wheel.'
  },
  rear_assembly: {
    componentId: 'rear_assembly',
    title: 'Rear assembly',
    category: 'Bodywork',
    description: 'The rear hierarchy contains the main panels, hatch interior, rear glazing, turn signals and taillight components.',
    function: 'Closes the rear body volume and integrates its glazing and lighting surfaces.'
  }
};

const backendParts = new Map();

export const PARTS_DATA = new Proxy(FALLBACK_PARTS_DATA, {
  get(target, property) {
    if (typeof property === 'string' && backendParts.has(property)) {
      return backendParts.get(property);
    }
    return target[property];
  }
});

export function setBackendParts(parts = []) {
  backendParts.clear();
  parts.forEach((part) => {
    if (!part?.component_id) return;
    backendParts.set(part.component_id, {
      ...part,
      componentId: part.component_id,
      title: part.name,
      category: part.category_name || 'Vehicle component'
    });
  });
}

export function getPartData(componentId) {
  return backendParts.get(componentId) || FALLBACK_PARTS_DATA[componentId] || null;
}
