import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getAccessToken, setTokens, clearTokens } from "../api.js";
import { useApi } from "../hooks/useApi.js";
import { getLanguage, setLanguage, useLanguage } from "../i18n.js";
import { Button, FormField, StateView } from "../components/UI.jsx";

const TABS = ["profile", "garage", "favorites", "recently", "aiHistory", "settings"];
const asArray = (value) => Array.isArray(value) ? value : value?.results || [];

export default function ProfilePage() {
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState("profile");
  const [login, setLogin] = useState({ email: "", password: "" });
  const [authMode, setAuthMode] = useState("login");
  const [verificationCode, setVerificationCode] = useState("");
  const [newCar, setNewCar] = useState({ brand: "", model: "", year: "", generation_trim: "", notes: "", photo: null });
  const [profileDraft, setProfileDraft] = useState(null);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const { t } = useLanguage();
  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1);
    window.addEventListener("auto-anatomy:auth-changed", refresh);
    return () => window.removeEventListener("auto-anatomy:auth-changed", refresh);
  }, []);
  const state = useApi(async () => {
    if (!getAccessToken()) return null;
    const [profile, garage, favorites, recently, ai] = await Promise.all([
      api.profile(), api.garage(), api.favorites(), api.recentlyViewed(), api.aiConversations(),
    ]);
    const favoriteRows = await Promise.all(asArray(favorites).map(async (row) => ({ ...row, product: await api.sparePart(row.spare_part).catch(() => null) })));
    return { profile, garage: asArray(garage), favorites: favoriteRows, recently: asArray(recently), ai: asArray(ai) };
  }, [revision]);
  useEffect(() => { if (state.data?.profile) setProfileDraft(state.data.profile); }, [state.data?.profile]);

  async function signIn(event) {
    event.preventDefault(); setPending(true); setNotice("");
    try { setTokens(await api.login(login.email, login.password)); setRevision((n) => n + 1); }
    catch (error) { setNotice(error.message); }
    finally { setPending(false); }
  }
  async function register(event) {
    event.preventDefault(); setPending(true); setNotice("");
    try { const result = await api.register(login.email, login.password); setAuthMode("verify"); setNotice(result.message || "Check your email for a verification code."); }
    catch (error) { setNotice(error.message); }
    finally { setPending(false); }
  }
  async function verify(event) {
    event.preventDefault(); setPending(true); setNotice("");
    try { await api.verifyEmail(login.email, verificationCode); setAuthMode("login"); setNotice("Account verified. Sign in to continue."); }
    catch (error) { setNotice(error.message); }
    finally { setPending(false); }
  }
  async function saveProfile(event) {
    event.preventDefault(); setPending(true); setNotice("");
    try {
      const form = new FormData();
      form.append("display_name", profileDraft.display_name || "");
      form.append("preferred_language", profileDraft.preferred_language || getLanguage());
      if (profileDraft.avatar instanceof File) form.append("avatar", profileDraft.avatar);
      const saved = await api.updateProfile(form);
      setProfileDraft(saved); setLanguage(saved.preferred_language); state.retry(); setNotice("Profile saved.");
    } catch (error) { setNotice(error.message); }
    finally { setPending(false); }
  }
  async function addCar(event) {
    event.preventDefault(); setPending(true); setNotice("");
    try {
      const form = new FormData();
      Object.entries(newCar).forEach(([key, value]) => { if (value !== null && value !== "") form.append(key, value); });
      await api.addGarageCar(form); setNewCar({ brand: "", model: "", year: "", generation_trim: "", notes: "", photo: null }); state.retry(); setNotice("Car added to your garage.");
    } catch (error) { setNotice(error.message); }
    finally { setPending(false); }
  }
  async function removeCar(id) {
    if (!window.confirm("Remove this car from your garage?")) return;
    await api.deleteGarageCar(id); state.retry();
  }

  if (!getAccessToken()) return <main className="page profile-page"><header className="page-heading"><p className="eyebrow">Auto Anatomy / Account</p><h1>{t("profileTitle")}</h1><p>Sign in to manage your profile and personal garage.</p></header><div className="auth-mode-tabs"><button className={authMode === "login" ? "is-active" : ""} onClick={() => setAuthMode("login")}>{t("signIn")}</button><button className={authMode === "register" ? "is-active" : ""} onClick={() => setAuthMode("register")}>Create account</button></div><form className="profile-form" onSubmit={authMode === "login" ? signIn : authMode === "register" ? register : verify}><FormField label="Email"><input type="email" autoComplete="username" required value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} /></FormField>{authMode !== "verify" && <FormField label="Password"><input type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} required value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} /></FormField>}{authMode === "verify" && <FormField label="Email verification code"><input inputMode="numeric" pattern="[0-9]{6}" required value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} /></FormField>}{notice && <p role="status">{notice}</p>}<Button disabled={pending}>{pending ? "…" : authMode === "verify" ? "Verify email" : authMode === "register" ? "Send verification code" : t("signIn")}</Button></form></main>;
  if (state.loading || state.error) return <main className="page"><StateView {...state} /></main>;
  const profile = state.data.profile;
  const tabs = { profile: t("profile"), garage: t("garage"), favorites: t("favorites"), recently: t("recently"), aiHistory: t("aiHistory"), settings: t("settings") };
  return <main className="page profile-page"><header className="page-heading"><p className="eyebrow">Auto Anatomy / Account</p><h1>{profile.display_name || profile.username}</h1><p>{profile.email}</p></header>
    <div className="profile-layout"><nav className="profile-tabs" aria-label="Profile sections">{TABS.map((key) => <button key={key} className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>{tabs[key]}</button>)}<button onClick={() => { clearTokens(); setRevision((n) => n + 1); }}>{t("signOut")}</button></nav>
      <section className="profile-content">
        {tab === "profile" && <form className="profile-form" onSubmit={saveProfile}><h2>{tabs.profile}</h2><FormField label="Display name"><input value={profileDraft?.display_name || ""} onChange={(e) => setProfileDraft({ ...profileDraft, display_name: e.target.value })} /></FormField><FormField label={t("language")}><select value={profileDraft?.preferred_language || "en"} onChange={(e) => setProfileDraft({ ...profileDraft, preferred_language: e.target.value })}><option value="ru">Русский</option><option value="tg">Тоҷикӣ</option><option value="en">English</option></select></FormField><FormField label="Avatar (JPEG, PNG, WebP)"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setProfileDraft({ ...profileDraft, avatar: e.target.files[0] })} /></FormField>{notice && <p role="status">{notice}</p>}<Button disabled={pending}>{t("save")}</Button></form>}
        {tab === "garage" && <><h2>{tabs.garage}</h2><div className="garage-grid">{state.data.garage.map((car) => <article className="garage-card" key={car.id}>{car.photo && <img src={car.photo} alt={`${car.brand} ${car.model}`} />}<div><h3>{car.brand} {car.model}</h3><p>{car.year} {car.generation_trim}</p>{car.notes && <p>{car.notes}</p>}<button onClick={() => removeCar(car.id)}>Remove</button></div></article>)}</div><form className="profile-form garage-form" onSubmit={addCar}><h3>{t("addCar")}</h3><div className="form-grid"><FormField label={t("brand")}><input required value={newCar.brand} onChange={(e) => setNewCar({ ...newCar, brand: e.target.value })} /></FormField><FormField label={t("model")}><input required value={newCar.model} onChange={(e) => setNewCar({ ...newCar, model: e.target.value })} /></FormField><FormField label={t("year")}><input required type="number" min="1886" max={new Date().getFullYear() + 1} value={newCar.year} onChange={(e) => setNewCar({ ...newCar, year: e.target.value })} /></FormField><FormField label="Generation / trim"><input value={newCar.generation_trim} onChange={(e) => setNewCar({ ...newCar, generation_trim: e.target.value })} /></FormField></div><FormField label="Car photo (JPEG, PNG, WebP)"><input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setNewCar({ ...newCar, photo: e.target.files[0] })} /></FormField><FormField label={t("notes")}><textarea value={newCar.notes} onChange={(e) => setNewCar({ ...newCar, notes: e.target.value })} /></FormField>{notice && <p role="status">{notice}</p>}<Button disabled={pending}>{t("save")}</Button></form></>}
        {tab === "favorites" && <><h2>{tabs.favorites}</h2>{state.data.favorites.length ? state.data.favorites.map((item) => item.product && <Link className="profile-list-row" key={item.id} to={`/store/products/${item.spare_part}`}>{item.product.name}<span>{item.product.brand}</span></Link>) : <p>No saved products yet.</p>}</>}
        {tab === "recently" && <><h2>{tabs.recently}</h2>{state.data.recently.length ? state.data.recently.map((item) => <Link className="profile-list-row" key={`${item.kind}-${item.id}`} to={item.kind === "product" ? `/store/products/${item.id}` : item.kind === "car" ? `/cars/${item.id}` : "#"}>{item.label}<span>{item.kind}</span></Link>) : <p>No recently viewed items.</p>}</>}
        {tab === "aiHistory" && <><h2>{tabs.aiHistory}</h2>{state.data.ai.length ? state.data.ai.map((conversation) => <article className="profile-list-row" key={conversation.id}>{conversation.title}<span>{new Date(conversation.updated_at).toLocaleDateString()}</span></article>) : <p>No saved AI conversations.</p>}</>}
        {tab === "settings" && <><h2>{tabs.settings}</h2><p>Account language and display settings are stored with your profile.</p><Button secondary onClick={() => setTab("profile")}>Edit profile settings</Button></>}
      </section></div></main>;
}
