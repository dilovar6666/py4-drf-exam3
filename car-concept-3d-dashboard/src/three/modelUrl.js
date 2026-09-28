export function resolveVehicleModelUrl(value, origin = window.location.origin, mediaOrigin = null) {
  if (!value) return "/assets/models/AudiR8.glb";
  try {
    const url = new URL(value, origin);
    if (value.startsWith("/media/") && mediaOrigin) return new URL(value, mediaOrigin).href;
    if (
      ["127.0.0.1", "localhost"].includes(url.hostname) &&
      /^\/assets\/models\/[A-Za-z0-9_-]+\.glb$/i.test(url.pathname)
    )
      return url.pathname;
  } catch {
    /* The loader reports malformed URLs through its normal error state. */
  }
  return value;
}
