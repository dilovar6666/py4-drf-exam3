import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, pageResults } from "../api.js";
import { FormField } from "./UI.jsx";
import { useLanguage } from "../i18n.js";
import { validateViewerActions } from "../three/aiActions.js";
import { safeExternalUrl } from "../api/externalSearch.js";

export default function AIAssistant({ carId = null, component = null, components = [], controllerRef = null, garageCarId = null, explodePercent = null, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen), [message, setMessage] = useState(""), [answer, setAnswer] = useState("");
  const [actions, setActions] = useState([]), [webSearch, setWebSearch] = useState(null), [conversationId, setConversationId] = useState(null);
  const [pending, setPending] = useState(false), [error, setError] = useState(""), [garage, setGarage] = useState([]), [selectedGarage, setSelectedGarage] = useState(garageCarId || "");
  const [answerLanguage, setAnswerLanguage] = useState("en"), [speaking, setSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(() => localStorage.getItem("aa-ai-autoplay") === "1");
  const audioRef = useRef(null), audioUrlRef = useRef(null), voiceAbortRef = useRef(null);
  const navigate = useNavigate(), { t, language } = useLanguage();
  useEffect(() => { api.garage().then((rows) => setGarage(pageResults(rows))).catch(() => {}); }, []);
  useEffect(() => () => stopVoice(), []);
  function stopVoice() {
    voiceAbortRef.current?.abort(); voiceAbortRef.current = null;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; audioRef.current = null; }
    if (audioUrlRef.current) { URL.revokeObjectURL(audioUrlRef.current); audioUrlRef.current = null; }
    setSpeaking(false);
  }
  async function listen(id = conversationId, voiceLanguage = answerLanguage) {
    if (!id) return;
    stopVoice(); setError("");
    const abort = new AbortController(); voiceAbortRef.current = abort;
    try {
      const blob = await api.speakAI(id, voiceLanguage, abort.signal);
      if (abort.signal.aborted) return;
      const url = URL.createObjectURL(blob); audioUrlRef.current = url;
      const audio = new Audio(url); audioRef.current = audio;
      audio.onended = () => stopVoice();
      audio.onerror = () => { stopVoice(); setError(t("voicePlaybackError")); };
      await audio.play(); setSpeaking(true);
    } catch (failure) {
      if (!abort.signal.aborted) { stopVoice(); setError(failure.details?.code === "AI_NOT_CONFIGURED" ? t("voiceNotConfigured") : t("voiceProviderError")); }
    }
  }
  async function submit(event) {
    event.preventDefault();
    if (!message.trim() || pending) return;
    stopVoice(); setPending(true); setError(""); setActions([]); setWebSearch(null);
    try {
      const result = await api.askAI({ message: message.trim(), language, car_id: carId || undefined, component_id: component?.component_id || undefined, available_component_ids: components.map((item) => item.component_id), garage_car_id: selectedGarage || undefined, conversation_id: conversationId || undefined, route: window.location.pathname, explode_percentage: Number.isInteger(explodePercent) ? explodePercent : undefined });
      setAnswer(result.answer); setConversationId(result.conversation_id); setAnswerLanguage(result.language || language); setMessage("");
      setActions(validateViewerActions(result.actions, carId, components));
      setWebSearch(result.external_search || null);
      if (autoPlay) void listen(result.conversation_id, result.language || language);
    } catch (failure) {
      const errorKeys = { AI_TIMEOUT: "aiTimeout", AI_QUOTA_EXCEEDED: "aiQuotaExceeded", AI_RATE_LIMITED: "aiRateLimited", AI_INVALID_API_KEY: "aiInvalidKey", AI_MODEL_UNAVAILABLE: "aiModelUnavailable", AI_PROVIDER_ACCESS_DENIED: "aiProviderAccessDenied", AI_PROVIDER_UNAVAILABLE: "aiProviderUnavailable", AI_REQUEST_REJECTED: "aiRequestRejected", AI_INVALID_RESPONSE: "aiInvalidResponse", AI_PROVIDER_ERROR: "aiProviderError", AI_NOT_CONFIGURED: "aiNotConfigured" };
      setError(errorKeys[failure.details?.code] ? t(errorKeys[failure.details.code]) : failure.message);
    } finally { setPending(false); }
  }
  function runAction(action) {
    if (["select_component", "focus_component", "open_component"].includes(action.type)) {
      if (!components.some((item) => item.component_id === action.componentId)) return;
      controllerRef?.current?.focusComponent(action.componentId);
      navigate(`/cars/${carId}/components/${encodeURIComponent(action.componentId)}`);
    } else if (action.type === "set_explode_percentage") controllerRef?.current?.setExplodeProgress(Math.max(0, Math.min(100, action.value)) / 100);
    else if (action.type === "open_store") navigate("/store");
    else if (["search_products", "filter_products"].includes(action.type)) {
      const selected = action.componentId ? components.find((item) => item.component_id === action.componentId) : component;
      navigate(`/store?car=${carId}&component=${encodeURIComponent(selected?.component_id || "")}&q=${encodeURIComponent(selected?.name || "")}`);
    }
  }
  return <>
    {!defaultOpen && <button className="ai-launcher" aria-expanded={open} onClick={() => { if (open) stopVoice(); setOpen(!open); }}>{open ? "×" : "AI"}</button>}
    {open && <aside className={defaultOpen ? "ai-panel ai-panel--page" : "ai-panel"} aria-label={t("askAI")}><header><div><span className="eyebrow">Auto Anatomy</span><h2>{t("askAI")}</h2></div>{!defaultOpen && <button aria-label={t("close")} onClick={() => { stopVoice(); setOpen(false); }}>×</button>}</header>
      {garage.length > 0 && <FormField label={t("garage")}><select value={selectedGarage} onChange={(e) => setSelectedGarage(e.target.value)}><option value="">—</option>{garage.map((row) => <option key={row.id} value={row.id}>{row.brand} {row.model} ({row.year})</option>)}</select></FormField>}
      {answer && <div className="ai-answer" aria-live="polite"><p>{answer}</p><div className="ai-voice-controls"><button onClick={speaking ? stopVoice : () => listen()}>{speaking ? t("stopVoice") : t("listen")}</button><label><input type="checkbox" checked={autoPlay} onChange={(event) => { setAutoPlay(event.target.checked); localStorage.setItem("aa-ai-autoplay", event.target.checked ? "1" : "0"); }} />{t("autoPlayVoice")}</label></div>
        {actions.map((action, index) => <button key={`${action.type}-${index}`} onClick={() => runAction(action)}>{action.type === "set_explode_percentage" ? `${action.value}%` : action.type.replaceAll("_", " ")}</button>)}
        {webSearch && <section className="ai-web-results"><h3>{t("webResults")}</h3>{!webSearch.available ? <p>{webSearch.error_code || "EXTERNAL_SEARCH_NOT_CONFIGURED"}</p> : webSearch.results?.length ? webSearch.results.map((item) => { const url = safeExternalUrl(item.url); if (!url) return null; return <a key={item.url} href={url} target="_blank" rel="noopener noreferrer"><strong>{item.title}</strong><small>{item.source}</small>{item.snippet && <span>{item.snippet}</span>}</a>; }) : <p>{t("noWebResults")}</p>}</section>}
      </div>}
      {error && <p role="alert" className="error-text">{error}</p>}
      <form onSubmit={submit}><textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} placeholder={t("aiQuestionPlaceholder")} /><button disabled={pending}>{pending ? t("thinking") : t("send")}</button></form>
    </aside>}
  </>;
}
