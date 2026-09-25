const FALLBACK_PARTS_DATA = {
  engine: {
    componentId: 'engine',
    title: 'Engine',
    category: 'Powertrain',
    description: 'The source model contains a dedicated engine component beneath the forward bodywork. It is shown at its authored proportions.',
    function: 'Converts stored energy into mechanical motion delivered to the driven wheels.'
  },
  wheel_front_left: {
    componentId: 'wheel_front_left',
    title: 'Front wheel',
    category: 'Running gear',
    description: 'The complete front-left wheel hierarchy remains assembled as one logical exhibit, including its tyre, rim and braking geometry.',
    function: 'Supports the vehicle and transmits driving, steering and braking forces to the road.'
  },
  steering: {
    componentId: 'steering',
    title: 'Steering assembly',
    category: 'Driver interface',
    description: 'The steering base and complete steering-wheel hierarchy are grouped together so their authored relationship is preserved.',
    function: 'Provides the driver’s primary directional input to the steering system.'
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
