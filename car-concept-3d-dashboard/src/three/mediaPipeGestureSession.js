import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import { explodeTargetFromSpread, smoothExplodePercent } from "./gestureMath.js";

const WASM_PATH = "/mediapipe/wasm";
const MODEL_PATH = "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";
const CONFIDENCE_THRESHOLD = 0.62;
const DETECTION_INTERVAL_MS = 45;
const STABLE_FRAMES = 3;

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class MediaPipeGestureSession {
  constructor({ video, canvas, controllerRef, getExplodePercent, onExplode, onFrame, onState, onError }) {
    Object.assign(this, { video, canvas, controllerRef, getExplodePercent, onExplode, onFrame, onState, onError });
    this.stream = null;
    this.recognizer = null;
    this.frameId = 0;
    this.running = false;
    this.disposed = false;
    this.lastDetection = 0;
    this.lastTimestamp = 0;
    this.lastUiUpdate = 0;
    this.consecutiveFrameErrors = 0;
    this.handCount = 0;
    this.openPalmFrames = 0;
    this.pinchFrames = 0;
    this.twoHandFrames = 0;
    this.previousPalm = null;
    this.previousPinch = null;
    this.explodeAnchor = null;
    this.explodeCurrent = Number(getExplodePercent?.()) || 0;
    this.lastExplodeTime = 0;
    this.rotationDelta = { x: 0, y: 0 };
  }

  async start() {
    this.onState?.("STARTING");
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("CAMERA_UNAVAILABLE");
    this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    if (this.disposed) return this.stop();

    this.video.srcObject = this.stream;
    this.stream.getVideoTracks().forEach((track) => {
      track.addEventListener("ended", this.handleTrackEnded, { once: true });
    });
    await this.video.play();
    if (this.disposed) return this.stop();

    this.onState?.("LOADING_MODEL");
    const files = await FilesetResolver.forVisionTasks(WASM_PATH);
    if (this.disposed) return this.stop();
    this.recognizer = await GestureRecognizer.createFromOptions(files, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate: "CPU" },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.58,
      minHandPresenceConfidence: 0.58,
      minTrackingConfidence: 0.58,
      cannedGesturesClassifierOptions: { categoryAllowlist: ["Open_Palm"], scoreThreshold: CONFIDENCE_THRESHOLD },
    });
    if (this.disposed) return this.stop();

    this.running = true;
    this.onState?.("READY");
    this.frameId = requestAnimationFrame(this.detectFrame);
  }

  handleTrackEnded = () => {
    if (!this.disposed) this.onError?.(new Error("CAMERA_STREAM_ENDED"));
  };

  detectFrame = (now) => {
    if (!this.running || this.disposed) return;
    if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && now - this.lastDetection >= DETECTION_INTERVAL_MS) {
      this.lastDetection = now;
      try {
        const timestamp = Math.max(now, this.lastTimestamp + 1);
        this.lastTimestamp = timestamp;
        const result = this.recognizer.recognizeForVideo(this.video, timestamp);
        this.consecutiveFrameErrors = 0;
        this.processResult(result, now);
      } catch (error) {
        this.consecutiveFrameErrors += 1;
        if (this.consecutiveFrameErrors >= 5) this.onError?.(error);
      }
    }
    if (this.running && !this.disposed) this.frameId = requestAnimationFrame(this.detectFrame);
  };

  processResult(result, now) {
    const hands = result.landmarks || [];
    this.handCount = hands.length;
    const gestureRows = result.gestures || [];
    const openPalms = hands.map((_, index) => {
      const openPalm = gestureRows[index]?.find((item) => item.categoryName === "Open_Palm");
      return openPalm?.score >= CONFIDENCE_THRESHOLD ? openPalm : null;
    });
    const confidence = Math.round(Math.max(0, ...gestureRows.flat().map((item) => item.score || 0)) * 100);
    let gesture = "none";
    let action = "none";

    if (hands.length >= 2) {
      this.openPalmFrames = 0;
      this.pinchFrames = 0;
      this.previousPalm = null;
      this.twoHandFrames += 1;
      const spread = distance(hands[0][9], hands[1][9]);
      if (!this.explodeAnchor && this.twoHandFrames >= STABLE_FRAMES) {
        this.explodeCurrent = Math.max(0, Math.min(100, Number(this.getExplodePercent?.()) || 0));
        this.explodeAnchor = { spread, percent: this.explodeCurrent };
        this.lastExplodeTime = now;
      }
      if (this.explodeAnchor && this.twoHandFrames >= STABLE_FRAMES) {
        const target = explodeTargetFromSpread(spread, this.explodeAnchor.spread, this.explodeAnchor.percent);
        const alpha = Math.min(0.75, 1 - Math.exp(-(now - this.lastExplodeTime) / 190));
        this.lastExplodeTime = now;
        const next = smoothExplodePercent(this.explodeCurrent, target, alpha);
        if (Math.abs(next - this.explodeCurrent) >= 0.08) {
          gesture = next >= this.explodeCurrent ? "handsApart" : "handsTogether";
          action = "explode";
          this.explodeCurrent = next;
          this.onExplode?.(next);
        }
      }
    } else {
      this.twoHandFrames = 0;
      this.explodeAnchor = null;
      const hand = hands[0];
      if (!hand) {
        this.openPalmFrames = 0;
        this.pinchFrames = 0;
        this.previousPalm = null;
        this.previousPinch = null;
        this.rotationDelta = { x: 0, y: 0 };
      } else {
        const isOpenPalm = Boolean(openPalms[0]);
        this.openPalmFrames = isOpenPalm ? this.openPalmFrames + 1 : 0;
        if (isOpenPalm && this.openPalmFrames >= STABLE_FRAMES) {
          const palm = hand[9];
          if (this.previousPalm) {
            const raw = { x: (this.previousPalm.x - palm.x), y: (palm.y - this.previousPalm.y) };
            this.rotationDelta.x += (raw.x - this.rotationDelta.x) * 0.28;
            this.rotationDelta.y += (raw.y - this.rotationDelta.y) * 0.28;
            const dx = Math.abs(this.rotationDelta.x) < 0.0025 ? 0 : this.rotationDelta.x;
            const dy = Math.abs(this.rotationDelta.y) < 0.0025 ? 0 : this.rotationDelta.y;
            if (dx || dy) {
              this.controllerRef?.current?.rotateCameraBy?.(dx * 2.2, dy * 1.6);
              gesture = "openPalm";
              action = "rotate";
            }
          }
          this.previousPalm = { x: palm.x, y: palm.y };
        } else {
          this.previousPalm = null;
          this.rotationDelta = { x: 0, y: 0 };
        }

        const palmWidth = Math.max(distance(hand[5], hand[17]), 0.001);
        const pinchDistance = distance(hand[4], hand[8]) / palmWidth;
        this.pinchFrames = pinchDistance < 0.62 ? this.pinchFrames + 1 : 0;
        if (this.pinchFrames >= STABLE_FRAMES) {
          if (this.previousPinch !== null) {
            const delta = pinchDistance - this.previousPinch;
            if (Math.abs(delta) > 0.012) {
              const factor = Math.exp(Math.max(-0.1, Math.min(0.1, delta * 1.5)));
              this.controllerRef?.current?.zoomCameraBy?.(factor);
            }
          }
          this.previousPinch = pinchDistance;
          gesture = "pinch";
          action = "zoom";
        } else {
          this.previousPinch = null;
        }
      }
    }

    if (now - this.lastUiUpdate >= 100) {
      this.lastUiUpdate = now;
      this.drawLandmarks(hands);
      this.onFrame?.({ hands: hands.length, detected: hands.length > 0, gesture, action, confidence, landmarks: hands });
    }
  }

  drawLandmarks(hands) {
    const canvas = this.canvas;
    if (!canvas || !this.video.videoWidth || !this.video.videoHeight) return;
    const width = this.video.videoWidth, height = this.video.videoHeight;
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(width, 0);
    context.scale(-1, 1);
    context.lineWidth = Math.max(2, width / 180);
    context.strokeStyle = "#72f2b3";
    context.fillStyle = "#f6fbff";
    for (const landmarks of hands) {
      for (const [from, to] of GestureRecognizer.HAND_CONNECTIONS) {
        context.beginPath();
        context.moveTo(landmarks[from].x * width, landmarks[from].y * height);
        context.lineTo(landmarks[to].x * width, landmarks[to].y * height);
        context.stroke();
      }
      for (const point of landmarks) {
        context.beginPath();
        context.arc(point.x * width, point.y * height, Math.max(2.5, width / 100), 0, Math.PI * 2);
        context.fill();
      }
    }
    context.restore();
  }

  stop() {
    const wasDisposed = this.disposed;
    this.disposed = true;
    this.running = false;
    globalThis.cancelAnimationFrame?.(this.frameId);
    this.recognizer?.close();
    this.recognizer = null;
    this.stream?.getTracks().forEach((track) => {
      track.removeEventListener("ended", this.handleTrackEnded);
      track.stop();
    });
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    if (this.canvas) this.canvas.getContext("2d")?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!wasDisposed) this.onState?.("OFF");
  }
}
