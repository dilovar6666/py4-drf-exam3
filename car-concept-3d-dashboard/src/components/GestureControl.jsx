import { useEffect, useRef, useState } from "react";
import { MediaPipeGestureSession } from "../three/mediaPipeGestureSession.js";
import { useLanguage } from "../i18n.js";

const GUIDE_KEY = "aa-gesture-guide-dismissed";
const INITIAL_FEEDBACK = { hands: 0, detected: false, gesture: "none", action: "none", confidence: 0 };

export default function GestureControl({ explodePercent, onExplode, controllerRef }) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState("OFF");
  const [preview, setPreview] = useState(true);
  const [guide, setGuide] = useState(false);
  const [dismissGuide, setDismissGuide] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(INITIAL_FEEDBACK);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const sessionRef = useRef(null);
  const mountedRef = useRef(false);
  const explodeRef = useRef(explodePercent);
  const translateRef = useRef(t);
  useEffect(() => { explodeRef.current = explodePercent; }, [explodePercent]);
  useEffect(() => { translateRef.current = t; }, [t]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, []);

  function reportError(failure) {
    const code = failure?.name === "NotAllowedError" ? "cameraDenied"
      : failure?.message === "CAMERA_UNAVAILABLE" ? "cameraUnavailable"
        : failure?.message === "CAMERA_STREAM_ENDED" ? "cameraRevoked" : "cameraStartError";
    sessionRef.current?.stop();
    sessionRef.current = null;
    setError(translateRef.current(code));
    if (mountedRef.current) setPhase("ERROR");
  }

  async function enable() {
    if (sessionRef.current || !videoRef.current || !canvasRef.current) return;
    setError("");
    setPreview(true);
    setFeedback(INITIAL_FEEDBACK);
    if (localStorage.getItem(GUIDE_KEY) !== "1") setGuide(true);
    const session = new MediaPipeGestureSession({
      video: videoRef.current,
      canvas: canvasRef.current,
      controllerRef,
      getExplodePercent: () => explodeRef.current,
      onExplode: (value) => onExplode?.(value),
      onState: (value) => { if (mountedRef.current) setPhase(value); },
      onFrame: (value) => {
        if (mountedRef.current) setFeedback({ hands: value.hands, detected: value.detected, gesture: value.gesture, action: value.action, confidence: value.confidence });
      },
      onError: reportError,
    });
    sessionRef.current = session;
    try {
      await session.start();
    } catch (failure) {
      if (sessionRef.current === session) reportError(failure);
    }
  }

  function disable() {
    const session = sessionRef.current;
    sessionRef.current = null;
    session?.stop();
    setFeedback(INITIAL_FEEDBACK);
    setError("");
    setPhase("OFF");
  }

  const active = phase === "STARTING" || phase === "LOADING_MODEL" || phase === "READY";
  const gestureLabels = { openPalm: "gestureOpenPalm", pinch: "gesturePinch", handsApart: "gestureSpread", handsTogether: "gestureClose", none: "gestureNone" };
  const actionLabels = { rotate: "gestureRotateAction", zoom: "gestureZoomAction", explode: "gestureExplodeAction", none: "gestureNone" };
  const tutorial = [
    ["✋", "gestureMove", "gestureRotateAction"],
    ["🤏", "gesturePinch", "gestureZoomAction"],
    ["↔", "gestureSpread", "gestureExplodeAction"],
  ];

  return <section className="gesture-control" aria-label={t("gestureControl")}>
    <div className="gesture-control__status"><strong>{t(active ? "cameraOn" : "cameraOff")}</strong>{phase === "READY" && <span>{t("gestureOn")}</span>}</div>
    <div className="gesture-control__buttons">
      {active ? <button onClick={disable}>{t("stopCamera")}</button> : <button onClick={enable}>{t("enableGestures")}</button>}
      <button onClick={() => setGuide(true)}>{t("gestureGuide")}</button>
    </div>
    <div className={`gesture-preview-wrap${active && preview ? "" : " gesture-preview-wrap--hidden"}`}>
      <video ref={videoRef} className="gesture-preview" muted playsInline aria-label={t("cameraPreview")} />
      <canvas ref={canvasRef} className="gesture-preview-landmarks" aria-hidden="true" />
    </div>
    {active && <button className="gesture-preview-toggle" onClick={() => setPreview((value) => !value)}>{preview ? t("hidePreview") : t("showPreview")}</button>}
    {phase !== "OFF" && <small role="status">{t(`cameraPhase${phase}`)}</small>}
    {phase === "READY" && <div className="gesture-hud" aria-live="polite">
      <span>{t("cameraOn")}</span><span>{t("handLabel")}: {t(feedback.detected ? "handDetected" : "handNotDetected")}</span>
      <span>{t("gestureLabel")}: {t(gestureLabels[feedback.gesture] || "gestureNone")}</span>
      <span>{t("confidenceLabel")}: {feedback.confidence}%</span><span>{t("actionLabel")}: {t(actionLabels[feedback.action] || "gestureNone")}</span>
      <span>{t("explode")}: {Math.round(explodePercent)}%</span>
    </div>}
    {error && <p role="alert">{error}</p>}
    {guide && <div className="gesture-guide" role="dialog" aria-label={t("gestureGuide")}>
      <div className="gesture-guide__head"><strong>{t("gestureGuide")}</strong><button onClick={() => { if (dismissGuide) localStorage.setItem(GUIDE_KEY, "1"); setGuide(false); }}>{t("close")}</button></div>
      <div className="gesture-guide__grid">{tutorial.map(([icon, title, description]) => <div key={title}><span aria-hidden="true">{icon}</span><strong>{t(title)}</strong><small>{t(description)}</small></div>)}</div>
      <label><input type="checkbox" checked={dismissGuide} onChange={(event) => setDismissGuide(event.target.checked)} />{t("doNotShowAgain")}</label>
    </div>}
  </section>;
}
