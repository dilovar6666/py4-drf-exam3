export const currentCarModelConfig = {
  id: 'car_concept',
  displayName: 'Car Concept',
  modelPath: './CarConcept.glb',
  estimatedFileSize: 11778688,

  normalization: {
    targetSize: 3.5,
    center: [0, 0.2, 0],
    rotation: [0, 0, 0]
  },

  presentation: {
    desktopOffset: [0.65, 0, 0],
    mobileOffset: [0, 0, 0]
  },

  performance: {
    shadowCasterMinSizeFactor: 0.14
  },

  components: {
    hood: {
      displayName: 'Hood assembly',
      nodes: ['BodyHood'],
      explode: { direction: [0, 0.72, 0.7], distanceFactor: 0.15 },
      lab: { slotId: 'middle_left', rotation: [-0.2, 0.14, -0.03], maxSize: 2.2 }
    },
    rear_assembly: {
      displayName: 'Rear assembly',
      nodes: ['BodyRearPanelsColor1'],
      explode: { direction: [0, 0.18, -1], distanceFactor: 0.16 },
      lab: { slotId: 'rear_center', rotation: [-0.1, 0.08, 0], maxSize: 2.25 }
    },
    door_left: {
      displayName: 'Left door',
      nodes: ['BodyDoorLColor1'],
      explode: { directionMode: 'radial-x', verticalBias: 0.12, distanceFactor: 0.18 },
      lab: { slotId: 'middle_right', rotation: [0.02, -0.32, -0.06], maxSize: 2.05 }
    },
    door_right: {
      displayName: 'Right door',
      nodes: ['BodyDoorRColor1'],
      explode: { directionMode: 'radial-x', verticalBias: 0.12, distanceFactor: 0.18 }
    },
    wheel_front_left: {
      displayName: 'Front left wheel',
      nodes: ['WheelFrontL'],
      explode: { directionMode: 'radial-x', verticalBias: 0.02, distanceFactor: 0.19 },
      lab: { slotId: 'front_left', rotation: [0, 0.38, 0.04], maxSize: 1.65 }
    },
    wheel_front_right: {
      displayName: 'Front right wheel',
      nodes: ['WheelFrontR'],
      explode: { directionMode: 'radial-x', verticalBias: 0.02, distanceFactor: 0.19 }
    },
    wheel_rear_left: {
      displayName: 'Rear left wheel',
      nodes: ['WheelRearL'],
      explode: { directionMode: 'radial-x', verticalBias: 0.02, distanceFactor: 0.19 }
    },
    wheel_rear_right: {
      displayName: 'Rear right wheel',
      nodes: ['WheelRearR'],
      explode: { directionMode: 'radial-x', verticalBias: 0.02, distanceFactor: 0.19 }
    },
    engine: {
      displayName: 'Engine',
      nodes: ['Engine'],
      explode: { direction: [0, 0.72, 0.7], distanceFactor: 0.13 },
      lab: { slotId: 'front_center', rotation: [0.08, -0.18, 0], maxSize: 1.75 }
    },
    seats: {
      displayName: 'Seat assembly',
      nodes: ['InteriorSeatsColor1', 'InteriorSeatsColor2', 'InteriorSeatsFrame1', 'InteriorSeatsFrame2'],
      explode: { direction: [0, 1, 0], distanceFactor: 0.12 },
      lab: { slotId: 'middle_center', rotation: [0, -0.2, 0], maxSize: 2.05 }
    },
    steering: {
      displayName: 'Steering assembly',
      nodes: ['InteriorSteeringBase', 'InteriorSteeringCylinder'],
      explode: { directionMode: 'radial-x', verticalBias: 0.38, distanceFactor: 0.11 },
      lab: { slotId: 'front_right', rotation: [0.18, -0.35, -0.08], maxSize: 1.45 }
    },
    roof: {
      displayName: 'Roof panel',
      nodes: ['BodyRoofPanel'],
      explode: { direction: [0, 1, 0], distanceFactor: 0.13 }
    }
  }
};
