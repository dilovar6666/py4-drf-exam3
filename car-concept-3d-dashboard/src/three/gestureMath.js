export function clampExplodePercent(value) {
  return Math.max(0, Math.min(100, value));
}

export function explodeTargetFromSpread(distance, anchorDistance, anchorPercent) {
  const delta = distance - anchorDistance;
  if (Math.abs(delta) < 0.035) return clampExplodePercent(anchorPercent);
  return clampExplodePercent(anchorPercent + delta * 160);
}

export function smoothExplodePercent(current, target, smoothing = 0.18) {
  return clampExplodePercent(current + (target - current) * Math.max(0, Math.min(1, smoothing)));
}
