// Camera poses follow the existing Audi coordinate system. Explode remains
// delegated to the proven adapter; these poses only choreograph the exhibit.
export const STORY_STAGES = [
  {
    title: "Design",
    text: "A complete form. Explore the surfaces that shape the machine.",
    camera: [3.6, 1.5, 4.9],
    target: [0, 0.2, 0],
    explode: 0,
  },
  {
    title: "Performance",
    text: "Move beneath the surface and toward the powertrain.",
    camera: [-1.9, 1.3, -2.6],
    target: [0, 0.3, -0.65],
    explode: 0,
  },
  {
    title: "Braking",
    text: "A wheel is a system. Tire, rim, caliper and disc work together.",
    camera: [2, 0.45, 1.8],
    target: [0.75, -0.1, 0.8],
    explode: 0,
  },
  {
    title: "Engineering",
    text: "Systems begin to separate without losing their origins.",
    camera: [3.6, 2.1, 4.8],
    target: [0, 0.2, 0],
    explode: 0.18,
  },
  {
    title: "Anatomy",
    text: "Read the layers, then select the geometry directly.",
    camera: [4.6, 2.5, 5.6],
    target: [0, 0.2, 0],
    explode: 0.6,
  },
  {
    title: "Exploded vehicle",
    text: "One vehicle. Seventy-four semantic components. Explore each one.",
    camera: [4.2, 2.8, 5.6],
    target: [0, 0.2, 0],
    explode: 1,
  },
];

export function storyPose(progress, stages = STORY_STAGES) {
  const scaled = Math.max(0, Math.min(1, progress)) * (stages.length - 1);
  const index = Math.min(stages.length - 2, Math.floor(scaled));
  const t = scaled - index;
  const eased = t * t * (3 - 2 * t);
  const from = stages[index],
    to = stages[index + 1];
  const mix = (a, b) => a.map((v, i) => v + (b[i] - v) * eased);
  const framing = [0, 0.2, -0.18, 0.17, -0.1, -0.12];
  return {
    camera: mix(from.camera, to.camera),
    target: mix(from.target, to.target),
    framing: framing[index] + (framing[index + 1] - framing[index]) * eased,
    explode: from.explode + (to.explode - from.explode) * eased,
    stage: Math.round(scaled),
  };
}
