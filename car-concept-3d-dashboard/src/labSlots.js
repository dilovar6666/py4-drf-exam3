const PEDESTAL_Y = -2.28;

export const LAB_SLOTS = {
  front_left: {
    order: 2,
    position: [-3.25, PEDESTAL_Y, -2.2],
    pedestalRadius: 0.82,
    pedestalHeight: 0.12,
    clearance: 0.14,
    cameraDirection: [0.5, 0.2, 1]
  },
  front_center: {
    order: 1,
    position: [0, PEDESTAL_Y, -2.2],
    pedestalRadius: 0.9,
    pedestalHeight: 0.12,
    clearance: 0.14,
    cameraDirection: [0.5, 0.23, 1]
  },
  front_right: {
    order: 3,
    position: [3.25, PEDESTAL_Y, -2.2],
    pedestalRadius: 0.78,
    pedestalHeight: 0.12,
    clearance: 0.16,
    cameraDirection: [0.5, 0.24, 1]
  },
  middle_left: {
    order: 5,
    position: [-3.25, PEDESTAL_Y, -5.25],
    pedestalRadius: 1.08,
    pedestalHeight: 0.12,
    clearance: 0.15,
    cameraDirection: [0.5, 0.24, 1]
  },
  middle_center: {
    order: 4,
    position: [0, PEDESTAL_Y, -5.25],
    pedestalRadius: 1.02,
    pedestalHeight: 0.12,
    clearance: 0.13,
    cameraDirection: [0.5, 0.24, 1]
  },
  middle_right: {
    order: 6,
    position: [3.25, PEDESTAL_Y, -5.25],
    pedestalRadius: 1.02,
    pedestalHeight: 0.12,
    clearance: 0.14,
    cameraDirection: [0.5, 0.22, 1]
  },
  rear_center: {
    order: 7,
    position: [0, PEDESTAL_Y, -8.25],
    pedestalRadius: 1.12,
    pedestalHeight: 0.12,
    clearance: 0.14,
    cameraDirection: [0.5, 0.22, 1]
  }
};
