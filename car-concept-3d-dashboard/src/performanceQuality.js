const QUALITY_ORDER = ['low', 'medium', 'high'];

export const QUALITY_PROFILES = Object.freeze({
  high: Object.freeze({
    id: 'high',
    maxPixelRatio: 1.5,
    shadowMapSize: 1024,
    shadowsEnabled: true
  }),
  medium: Object.freeze({
    id: 'medium',
    maxPixelRatio: 1.25,
    shadowMapSize: 768,
    shadowsEnabled: true
  }),
  low: Object.freeze({
    id: 'low',
    maxPixelRatio: 1,
    shadowMapSize: 512,
    shadowsEnabled: true
  })
});

function initialQualityName() {
  const query = new URLSearchParams(window.location.search).get('quality');
  if (QUALITY_PROFILES[query]) return query;

  const isCompact = window.matchMedia('(max-width: 900px)').matches;
  const memory = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  if (memory <= 4 || cores <= 4 || (isCompact && window.devicePixelRatio >= 2.5)) return 'low';
  if (isCompact || memory <= 6 || cores <= 6) return 'medium';
  return 'high';
}

export class AdaptiveQualityController {
  constructor(onChange) {
    this.onChange = onChange;
    this.profileName = initialQualityName();
    this.samples = new Float32Array(18);
    this.sampleIndex = 0;
    this.sampleCount = 0;
    this.startedAt = performance.now();
    this.lastChangeAt = this.startedAt;
  }

  get profile() {
    return QUALITY_PROFILES[this.profileName];
  }

  applyRendererHint(rendererName = '') {
    const renderer = rendererName.toLowerCase();
    if (/swiftshader|intel|mali|adreno|powervr/.test(renderer)) {
      this.profileName = 'low';
    } else if (window.devicePixelRatio >= 2 && this.profileName === 'high') {
      this.profileName = 'medium';
    }
  }

  start() {
    this.onChange(this.profile, 'initial');
  }

  recordFrame(deltaMilliseconds) {
    const now = performance.now();
    if (document.hidden || deltaMilliseconds <= 0 || deltaMilliseconds > 250) return;
    if (now - this.startedAt < 900 || now - this.lastChangeAt < 650) return;

    this.samples[this.sampleIndex] = deltaMilliseconds;
    this.sampleIndex = (this.sampleIndex + 1) % this.samples.length;
    this.sampleCount = Math.min(this.sampleCount + 1, this.samples.length);
    if (this.sampleCount < this.samples.length) return;

    let total = 0;
    for (let index = 0; index < this.sampleCount; index += 1) total += this.samples[index];
    const average = total / this.sampleCount;
    this.sampleCount = 0;
    this.sampleIndex = 0;

    if (average > 25) this.downgrade(`average frame time ${average.toFixed(1)}ms`);
  }

  downgrade(reason) {
    const currentIndex = QUALITY_ORDER.indexOf(this.profileName);
    if (currentIndex <= 0) return;
    this.profileName = QUALITY_ORDER[currentIndex - 1];
    this.lastChangeAt = performance.now();
    this.onChange(this.profile, reason);
    console.info(`[Auto Anatomy] Adaptive quality: ${this.profileName.toUpperCase()} (${reason}).`);
  }

  state() {
    return {
      profile: this.profileName,
      ...this.profile,
      devicePixelRatio: window.devicePixelRatio
    };
  }
}
