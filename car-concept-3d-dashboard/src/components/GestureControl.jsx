import { useEffect, useRef, useState } from "react";
import { explodeTargetFromSpread, smoothExplodePercent } from "../three/gestureMath.js";
import { useLanguage } from "../i18n.js";

const TASKS_MODULE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm";
const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";
const HAND_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const GUIDE_KEY = "aa-gesture-guide-dismissed";
const THRESHOLD = 0.78;

export default function GestureControl({ explodePercent, onExplode, controllerRef, selectedComponentId }) {
  const { t } = useLanguage();
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);
  const [phase, setPhase] = useState("OFF");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(true);
  const [guide, setGuide] = useState(false);
  const [dismissGuide, setDismissGuide] = useState(false);
  const [feedback, setFeedback] = useState({ hands: 0, gesture: "", confidence: 0, action: "" });
  const videoRef = useRef(null), streamRef = useRef(null), landmarkerRef = useRef(null), frameRef = useRef(0);
  const generationRef = useRef(0), phaseRef = useRef("OFF"), mountedRef = useRef(true);
  const explodeRef = useRef(explodePercent), onExplodeRef = useRef(onExplode), selectedRef = useRef(selectedComponentId);
  useEffect(() => { onExplodeRef.current = onExplode; selectedRef.current = selectedComponentId; }, [onExplode, selectedComponentId]);
  useEffect(() => { explodeRef.current = explodePercent; }, [explodePercent]);
  function transition(value) { phaseRef.current = value; if (mountedRef.current) setPhase(value); }
  function release() {
    generationRef.current += 1;
    cancelAnimationFrame(frameRef.current);
    landmarkerRef.current?.close?.(); landmarkerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }
  function stop() { transition("STOPPING"); release(); setFeedback({ hands: 0, gesture: "", confidence: 0, action: "" }); transition("OFF"); }
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; release(); }; }, []);
  function fail(message) { release(); setError(message); transition("ERROR"); }
  async function start() {
    if (phaseRef.current !== "OFF" && phaseRef.current !== "ERROR") return;
    if (!navigator.mediaDevices?.getUserMedia) { setError(t("cameraUnavailable")); transition("ERROR"); return; }
    setError(""); setPreview(true); transition("REQUESTING_PERMISSION");
    const generation = ++generationRef.current;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
      if (generation !== generationRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      transition("STARTING");
      streamRef.current = stream;
      // The video element is always mounted, including while permission is pending and preview is hidden.
      const video = videoRef.current;
      if (!video) throw new Error("Camera video element is unavailable");
      video.srcObject = stream;
      stream.getVideoTracks().forEach((track) => { track.onended = () => { if (generation === generationRef.current) fail(tRef.current("cameraRevoked")); }; });
      await video.play();
      if (generation !== generationRef.current) return;
      transition("LOADING_MODEL");
      const { FilesetResolver, HandLandmarker } = await import(/* @vite-ignore */ TASKS_MODULE);
      const files = await FilesetResolver.forVisionTasks(WASM_PATH);
      const landmarker = await HandLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: HAND_MODEL, delegate: "GPU" }, runningMode: "VIDEO", numHands: 2, minHandDetectionConfidence: THRESHOLD, minHandPresenceConfidence: THRESHOLD, minTrackingConfidence: THRESHOLD });
      if (generation !== generationRef.current) { landmarker.close(); return; }
      landmarkerRef.current = landmarker;
      transition("READY");
      if (localStorage.getItem(GUIDE_KEY) !== "1") setGuide(true);
      let anchorDistance = null, anchorPercent = explodeRef.current, current = anchorPercent;
      let lastUpdate = 0, lastSwipe = 0, palmStart = null, palmStartAt = 0, pinching = false, twoHandsSince = 0, lastFeedback = 0, lastSmoothAt = 0;
      function detect() {
        if (generation !== generationRef.current || !landmarkerRef.current || !videoRef.current) return;
        const now = performance.now();
        if (videoRef.current.readyState >= 2 && now - lastUpdate >= 55) {
          lastUpdate = now;
          try {
            const result = landmarkerRef.current.detectForVideo(videoRef.current, now);
            const hands = result.landmarks || [];
            const confidence = (result.handednesses || []).map((hand) => hand?.[0]?.score ?? 0);
            const reliable = hands.filter((_, index) => confidence[index] >= THRESHOLD);
            let gesture = "", action = "";
            if (reliable.length >= 2) {
              if (!twoHandsSince) twoHandsSince = now;
              const a = reliable[0][9], b = reliable[1][9], spread = Math.hypot(a.x - b.x, a.y - b.y);
              if (anchorDistance === null) {
                anchorDistance = spread; anchorPercent = explodeRef.current; current = anchorPercent; lastSmoothAt = now;
              }
              if (now - twoHandsSince >= 220) {
                const target = explodeTargetFromSpread(spread, anchorDistance, anchorPercent);
                const alpha = Math.min(0.85, 1 - Math.exp(-(now - lastSmoothAt) / 180));
                lastSmoothAt = now;
                const next = Math.abs(target - current) < 1 ? target : smoothExplodePercent(current, target, alpha);
                if (Math.abs(next - current) >= 0.15 || (next === target && current !== target)) {
                  gesture = next > current ? tRef.current("gestureSpread") : tRef.current("gestureClose");
                  current = next; onExplodeRef.current(next);
                  action = `${tRef.current("gestureExplodeAction")} ${Math.round(next)}%`;
                }
              }
              palmStart = null; pinching = false;
            } else {
              twoHandsSince = 0; anchorDistance = null;
              const hand = reliable[0];
              if (hand) {
                const center = hand[9];
                if (!palmStart) { palmStart = { x: center.x, y: center.y }; palmStartAt = now; }
                else if (now - palmStartAt < 700 && now - lastSwipe > 850) {
                  const dx = center.x - palmStart.x, dy = center.y - palmStart.y;
                  if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
                    controllerRef?.current?.rotateCameraBy?.(-dx * 2.5, dy * 1.8);
                    gesture = tRef.current("gestureMove"); action = tRef.current("gestureRotateAction"); lastSwipe = now; palmStart = null;
                  }
                } else if (now - palmStartAt >= 700) { palmStart = { x: center.x, y: center.y }; palmStartAt = now; }
                const pinch = Math.hypot(hand[4].x - hand[8].x, hand[4].y - hand[8].y) < 0.045;
                if (pinch && !pinching && selectedRef.current && now - lastSwipe > 500) {
                  controllerRef?.current?.focusComponent?.(selectedRef.current);
                  gesture = tRef.current("gesturePinch"); action = tRef.current("gestureFocusAction"); pinching = true; lastSwipe = now;
                } else if (!pinch) pinching = false;
              } else { palmStart = null; pinching = false; }
            }
            if (now - lastFeedback > 180 || gesture) {
              setFeedback({ hands: reliable.length, gesture, confidence: reliable.length ? Math.round(Math.min(...confidence.filter((score) => score >= THRESHOLD)) * 100) : 0, action });
              lastFeedback = now;
            }
          } catch { fail(tRef.current("cameraTrackingError")); return; }
        }
        frameRef.current = requestAnimationFrame(detect);
      }
      frameRef.current = requestAnimationFrame(detect);
    } catch (failure) {
      if (generation === generationRef.current) fail(failure?.name === "NotAllowedError" ? t("cameraDenied") : t("cameraStartError"));
    }
  }
  const active = ["STARTING", "LOADING_MODEL", "READY"].includes(phase), running = phase === "READY";
  return <section className="gesture-control" aria-label={t("gestureControl")}>
    <div className="gesture-control__status"><strong>{active ? t("cameraOn") : t("cameraOff")}</strong>{running && <span>{t("gestureOn")}</span>}</div>
    <div className="gesture-control__buttons">{active || phase === "REQUESTING_PERMISSION" ? <button onClick={stop}>{t("stopCamera")}</button> : <button onClick={start}>{t("enableGestures")}</button>}<button onClick={() => setGuide(true)}>{t("gesturesHelp")}</button></div>
    <video ref={videoRef} className={active && preview ? "gesture-preview" : "gesture-preview gesture-preview--hidden"} muted playsInline aria-label={t("cameraPreview")} />
    {active && <button className="gesture-preview-toggle" onClick={() => setPreview((value) => !value)}>{preview ? t("hidePreview") : t("showPreview")}</button>}
    {phase !== "OFF" && <small role="status">{t(`cameraPhase${phase}`)}</small>}
    {running && <div className="gesture-hud"><span>{t("handsDetected")}: {feedback.hands}</span><span>{t("gestureLabel")}: {feedback.gesture || "—"}</span><span>{t("confidenceLabel")}: {feedback.confidence}%</span>{feedback.action && <span>{t("actionLabel")}: {feedback.action}</span>}</div>}
    {error && <p role="alert">{error}</p>}
    {guide && <div className="gesture-guide" role="dialog" aria-label={t("gestureGuide")}><div className="gesture-guide__head"><strong>{t("gestureGuide")}</strong><button onClick={() => { if (dismissGuide) localStorage.setItem(GUIDE_KEY, "1"); setGuide(false); }}>{t("close")}</button></div><div className="gesture-guide__grid">{[["🤏", "gesturePinch", "gestureFocusAction"], ["↔", "gestureMove", "gestureRotateAction"], ["🙌", "gestureSpread", "gestureIncrease"], ["👐", "gestureClose", "gestureDecrease"]].map(([icon, title, description]) => <div key={title}><span aria-hidden="true">{icon}</span><strong>{t(title)}</strong><small>{t(description)}</small></div>)}</div><label><input type="checkbox" checked={dismissGuide} onChange={(event) => setDismissGuide(event.target.checked)} />{t("doNotShowAgain")}</label></div>}
  </section>;
}
